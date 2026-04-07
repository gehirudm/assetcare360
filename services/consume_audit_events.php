#!/usr/bin/env php
<?php

require_once __DIR__ . '/bootstrap_events.php';

if (!EVENTS_ENABLED) {
    echo "Events are disabled. Set EVENTS_ENABLED=true to run consumers.\n";
    exit(0);
}

$db = Database::getInstance()->getConnection();
$consumerName = 'audit_consumer';

$connection = createRabbitConnection();
$channel = $connection->channel();
$channel->exchange_declare(RABBITMQ_EXCHANGE, RABBITMQ_EXCHANGE_TYPE, false, true, false);
declareDlx($channel);

$queueArgs = queueArguments();
$channel->queue_declare(RABBITMQ_AUDIT_QUEUE, false, true, false, false, false, $queueArgs);
$channel->queue_bind(RABBITMQ_AUDIT_QUEUE, RABBITMQ_EXCHANGE, '#');

if (RABBITMQ_DLX_EXCHANGE !== '') {
    $dlq = RABBITMQ_DLQ_PREFIX . '.audit';
    $channel->queue_declare($dlq, false, true, false, false);
    $channel->queue_bind($dlq, RABBITMQ_DLX_EXCHANGE, '#');
}

$channel->basic_qos(null, 20, null);

echo "[audit] Waiting for messages on queue '" . RABBITMQ_AUDIT_QUEUE . "'...\n";

$callback = function (\PhpAmqpLib\Message\AMQPMessage $msg) use ($db, $consumerName) {
    try {
        $payload = json_decode($msg->body, true);
        if (!is_array($payload)) {
            throw new RuntimeException('Invalid JSON payload');
        }

        $validation = EventEnvelope::validate($payload);
        if (!$validation['valid']) {
            throw new RuntimeException('Invalid envelope: ' . $validation['message']);
        }

        $eventUuid = $payload['id'];

        $dupStmt = $db->prepare('SELECT COUNT(*) FROM processed_events WHERE consumer_name = ? AND event_uuid = ?');
        $dupStmt->execute([$consumerName, $eventUuid]);
        if ((int) $dupStmt->fetchColumn() > 0) {
            $msg->ack();
            return;
        }

        $insertAudit = $db->prepare(
            'INSERT INTO event_audit_logs (event_uuid, event_name, event_version, occurred_at, routing_key, exchange_name, payload_json)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $insertAudit->execute([
            $eventUuid,
            $payload['event'],
            $payload['version'],
            date('Y-m-d H:i:s', strtotime($payload['timestamp'])),
            $msg->delivery_info['routing_key'] ?? null,
            RABBITMQ_EXCHANGE,
            json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);

        $insertProcessed = $db->prepare('INSERT INTO processed_events (consumer_name, event_uuid) VALUES (?, ?)');
        $insertProcessed->execute([$consumerName, $eventUuid]);

        $msg->ack();
    } catch (Throwable $e) {
        error_log('[audit] Consume error: ' . $e->getMessage());
        $msg->nack(false, true);
    }
};

$channel->basic_consume(RABBITMQ_AUDIT_QUEUE, '', false, false, false, false, $callback);

while ($channel->is_consuming()) {
    $channel->wait();
}
