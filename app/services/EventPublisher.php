<?php

require_once __DIR__ . '/../events/EventEnvelope.php';

class EventPublisher {
    private bool $enabled;

    public function __construct() {
        $this->enabled = EVENTS_ENABLED;
    }

    public function publish(string $eventName, array $data, array $meta = []): bool {
        if (!$this->enabled) {
            return false;
        }

        $envelope = EventEnvelope::build($eventName, $data, $meta);
        $validation = EventEnvelope::validate($envelope);
        if (!$validation['valid']) {
            error_log('Event publish rejected: ' . $validation['message']);
            return false;
        }

        try {
            $this->loadAutoload();

            if (!class_exists(\PhpAmqpLib\Connection\AMQPStreamConnection::class)) {
                throw new RuntimeException('php-amqplib is not available. Run composer install.');
            }

            $connection = new \PhpAmqpLib\Connection\AMQPStreamConnection(
                RABBITMQ_HOST,
                RABBITMQ_PORT,
                RABBITMQ_USER,
                RABBITMQ_PASS,
                RABBITMQ_VHOST
            );

            $channel = $connection->channel();
            $channel->exchange_declare(
                RABBITMQ_EXCHANGE,
                RABBITMQ_EXCHANGE_TYPE,
                false,
                true,
                false
            );

            if (RABBITMQ_DLX_EXCHANGE !== '') {
                $channel->exchange_declare(
                    RABBITMQ_DLX_EXCHANGE,
                    'topic',
                    false,
                    true,
                    false
                );
            }

            $routingKey = strtolower(str_replace('_', '.', $eventName));
            $messageBody = json_encode($envelope, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

            $message = new \PhpAmqpLib\Message\AMQPMessage($messageBody, [
                'content_type' => 'application/json',
                'delivery_mode' => 2,
                'message_id' => $envelope['id'],
                'timestamp' => time(),
                'type' => $eventName,
            ]);

            $channel->basic_publish($message, RABBITMQ_EXCHANGE, $routingKey, true);

            $channel->close();
            $connection->close();

            return true;
        } catch (Throwable $e) {
            error_log('Event publish error: ' . $e->getMessage());
            return false;
        }
    }

    private function loadAutoload(): void {
        $autoload = __DIR__ . '/../../vendor/autoload.php';
        if (file_exists($autoload)) {
            require_once $autoload;
        }
    }
}
