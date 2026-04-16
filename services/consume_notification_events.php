#!/usr/bin/env php
<?php

require_once __DIR__ . '/bootstrap_events.php';

if (!EVENTS_ENABLED) {
    echo "Events are disabled. Set EVENTS_ENABLED=true to run consumers.\n";
    exit(0);
}

$db = Database::getInstance()->getConnection();
$consumerName = 'notification_consumer';

$connection = createRabbitConnection();
$channel = $connection->channel();
$channel->exchange_declare(RABBITMQ_EXCHANGE, RABBITMQ_EXCHANGE_TYPE, false, true, false);
declareDlx($channel);

$queueArgs = queueArguments();
$channel->queue_declare(RABBITMQ_NOTIFICATION_QUEUE, false, true, false, false, false, $queueArgs);

$routingKeys = [
    'fault.ticket.assigned',
    'budget.report.created',
    'budget.report.reviewed',
    'spare.part.request.created',
    'spare.part.request.approved',
    'spare.part.request.rejected',
    'asset.service.due.soon',
];

foreach ($routingKeys as $routingKey) {
    $channel->queue_bind(RABBITMQ_NOTIFICATION_QUEUE, RABBITMQ_EXCHANGE, $routingKey);
}

if (RABBITMQ_DLX_EXCHANGE !== '') {
    $dlq = RABBITMQ_DLQ_PREFIX . '.notifications';
    $channel->queue_declare($dlq, false, true, false, false);
    $channel->queue_bind($dlq, RABBITMQ_DLX_EXCHANGE, '#');
}

$channel->basic_qos(null, 20, null);

echo "[notifications] Waiting for messages on queue '" . RABBITMQ_NOTIFICATION_QUEUE . "'...\n";

$notificationInsert = $db->prepare(
    'INSERT INTO notifications
        (notification_id, user_id, target_role, title, message, type, source_event, source_event_id, payload_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
);

$supervisorsBySubmittedTechStmt = $db->prepare(
        "SELECT DISTINCT fta.assigned_by
         FROM fault_ticket_assignments fta
         INNER JOIN users supervisor ON supervisor.id = fta.assigned_by
         WHERE fta.fault_ticket_id = ?
             AND fta.assigned_to = ?
             AND fta.status = 'Active'
             AND supervisor.role = 'Supervisor'
         ORDER BY fta.assigned_at DESC"
);

$supervisorsByTicketStmt = $db->prepare(
        "SELECT DISTINCT fta.assigned_by
         FROM fault_ticket_assignments fta
         INNER JOIN users supervisor ON supervisor.id = fta.assigned_by
         WHERE fta.fault_ticket_id = ?
             AND fta.status = 'Active'
             AND supervisor.role = 'Supervisor'
         ORDER BY fta.assigned_at DESC"
);

$processedInsert = $db->prepare('INSERT INTO processed_events (consumer_name, event_uuid) VALUES (?, ?)');
$processedCheck = $db->prepare('SELECT COUNT(*) FROM processed_events WHERE consumer_name = ? AND event_uuid = ?');

function deterministicUuid(string $seed): string {
    $hex = substr(hash('sha1', $seed), 0, 32);
    return sprintf(
        '%s-%s-%s-%s-%s',
        substr($hex, 0, 8),
        substr($hex, 8, 4),
        substr($hex, 12, 4),
        substr($hex, 16, 4),
        substr($hex, 20, 12)
    );
}

$buildRecords = function (array $event) use ($supervisorsBySubmittedTechStmt, $supervisorsByTicketStmt): array {
    $data = $event['data'];
    $records = [];

    switch ($event['event']) {
        case DomainEvents::FAULT_TICKET_ASSIGNED:
            $ticketId = $data['ticket_id'] ?? (($data['ticket_db_id'] ?? null) ? ('#' . $data['ticket_db_id']) : 'Unknown');
            $title = 'New ticket assigned';
            $message = "Ticket {$ticketId} was assigned to you.";
            $userIds = isset($data['technician_user_ids']) && is_array($data['technician_user_ids']) ? $data['technician_user_ids'] : [];
            foreach ($userIds as $userId) {
                $records[] = [
                    'user_id' => (int)$userId,
                    'target_role' => null,
                    'title' => $title,
                    'message' => $message,
                    'type' => 'info',
                    'source_event_id' => (string)$ticketId,
                ];
            }
            break;

        case DomainEvents::BUDGET_REPORT_CREATED:
            $approvalRole = strtolower(str_replace(' ', '_', trim((string)($data['approval_role'] ?? 'Supervisor'))));
            $targetRole = $approvalRole === 'maintenance_manager' ? 'Maintenance Manager' : 'Supervisor';

            if ($approvalRole === 'supervisor') {
                $ticketId = isset($data['fault_ticket_id']) ? (int)$data['fault_ticket_id'] : 0;
                $submittedBy = isset($data['submitted_by']) ? (int)$data['submitted_by'] : null;
                $supervisorIds = [];

                try {
                    if ($ticketId > 0 && $submittedBy !== null && $submittedBy > 0) {
                        $supervisorsBySubmittedTechStmt->execute([$ticketId, $submittedBy]);
                        $supervisorIds = array_values(array_unique(array_map(
                            static fn(array $row): int => (int)$row['assigned_by'],
                            $supervisorsBySubmittedTechStmt->fetchAll(PDO::FETCH_ASSOC)
                        )));
                    }

                    if ($ticketId > 0 && empty($supervisorIds)) {
                        $supervisorsByTicketStmt->execute([$ticketId]);
                        $supervisorIds = array_values(array_unique(array_map(
                            static fn(array $row): int => (int)$row['assigned_by'],
                            $supervisorsByTicketStmt->fetchAll(PDO::FETCH_ASSOC)
                        )));
                    }
                } catch (Throwable $routingError) {
                    error_log('[notifications] Supervisor routing lookup failed: ' . $routingError->getMessage());
                    $supervisorIds = [];
                }

                foreach ($supervisorIds as $supervisorId) {
                    if ($supervisorId <= 0) {
                        continue;
                    }

                    $records[] = [
                        'user_id' => $supervisorId,
                        'target_role' => null,
                        'title' => 'Budget review required',
                        'message' => 'A budget report is waiting for your approval.',
                        'type' => 'warning',
                        'source_event_id' => (string)($data['report_id'] ?? ''),
                    ];
                }

                // Safety fallback for legacy tickets with missing assignment ownership mapping.
                if (empty($records)) {
                    $records[] = [
                        'user_id' => null,
                        'target_role' => 'Supervisor',
                        'title' => 'Budget review required',
                        'message' => 'A budget report is waiting for your approval.',
                        'type' => 'warning',
                        'source_event_id' => (string)($data['report_id'] ?? ''),
                    ];
                }

                break;
            }

            $records[] = [
                'user_id' => null,
                'target_role' => $targetRole,
                'title' => 'Budget review required',
                'message' => 'A budget report is waiting for your approval.',
                'type' => 'warning',
                'source_event_id' => (string)($data['report_id'] ?? ''),
            ];
            break;

        case DomainEvents::BUDGET_REPORT_REVIEWED:
            $records[] = [
                'user_id' => isset($data['submitted_by']) ? (int)$data['submitted_by'] : null,
                'target_role' => null,
                'title' => 'Budget decision received',
                'message' => 'Your budget report has been reviewed: ' . strtoupper((string)($data['status'] ?? 'pending')),
                'type' => (($data['status'] ?? '') === 'approved') ? 'success' : 'warning',
                'source_event_id' => (string)($data['report_id'] ?? ''),
            ];
            break;

        case DomainEvents::SPARE_PART_REQUEST_CREATED:
            $records[] = [
                'user_id' => null,
                'target_role' => 'Inventory Manager',
                'title' => 'Spare-part request submitted',
                'message' => 'A new spare-part request is pending review.',
                'type' => 'info',
                'source_event_id' => (string)($data['request_id'] ?? $data['request_db_id'] ?? ''),
            ];
            break;

        case DomainEvents::SPARE_PART_REQUEST_APPROVED:
        case DomainEvents::SPARE_PART_REQUEST_REJECTED:
            $status = $event['event'] === DomainEvents::SPARE_PART_REQUEST_APPROVED ? 'approved' : 'rejected';
            $records[] = [
                'user_id' => isset($data['requested_by']) ? (int)$data['requested_by'] : null,
                'target_role' => null,
                'title' => 'Spare-part request updated',
                'message' => "Your spare-part request was {$status}.",
                'type' => $status === 'approved' ? 'success' : 'warning',
                'source_event_id' => (string)($data['request_id'] ?? $data['request_db_id'] ?? ''),
            ];
            break;

        case DomainEvents::ASSET_SERVICE_DUE_SOON:
            $assetCode = $data['asset_code'] ?? ('#' . ($data['asset_id'] ?? ''));
            $dueDate = $data['due_date'] ?? 'soon';
            $records[] = [
                'user_id' => null,
                'target_role' => 'Inventory Manager',
                'title' => 'Asset service due soon',
                'message' => "{$assetCode} requires service on {$dueDate}.",
                'type' => 'warning',
                'source_event_id' => (string)($data['asset_code'] ?? $data['asset_id'] ?? ''),
            ];
            break;
    }

    return $records;
};

$callback = function (\PhpAmqpLib\Message\AMQPMessage $msg) use ($db, $consumerName, $notificationInsert, $processedInsert, $processedCheck, $buildRecords) {
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
        $eventName = (string)$payload['event'];

        $processedCheck->execute([$consumerName, $eventUuid]);
        if ((int)$processedCheck->fetchColumn() > 0) {
            $msg->ack();
            return;
        }

        $records = $buildRecords($payload);
        foreach ($records as $index => $record) {
            $recipientKey = $record['user_id'] !== null
                ? 'user:' . $record['user_id']
                : 'role:' . ($record['target_role'] ?? 'all');
            $notificationId = deterministicUuid($eventUuid . '|' . $recipientKey . '|' . $index);
            $notificationInsert->execute([
                $notificationId,
                $record['user_id'],
                $record['target_role'],
                $record['title'],
                $record['message'],
                $record['type'],
                $eventName,
                $record['source_event_id'] ?? null,
                json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ]);
        }

        $processedInsert->execute([$consumerName, $eventUuid]);
        $msg->ack();
    } catch (Throwable $e) {
        error_log('[notifications] Consume error: ' . $e->getMessage());
        $msg->nack(false, true);
    }
};

$channel->basic_consume(RABBITMQ_NOTIFICATION_QUEUE, '', false, false, false, false, $callback);

while ($channel->is_consuming()) {
    $channel->wait();
}
