<?php

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../app/events/DomainEvents.php';
require_once __DIR__ . '/../app/events/EventEnvelope.php';

$autoload = __DIR__ . '/../vendor/autoload.php';
if (file_exists($autoload)) {
    require_once $autoload;
}

function ensureAmqpAvailable(): void {
    if (!class_exists(\PhpAmqpLib\Connection\AMQPStreamConnection::class)) {
        throw new RuntimeException('php-amqplib is not installed. Run composer install.');
    }
}

function createRabbitConnection(): \PhpAmqpLib\Connection\AMQPStreamConnection {
    ensureAmqpAvailable();

    return new \PhpAmqpLib\Connection\AMQPStreamConnection(
        RABBITMQ_HOST,
        RABBITMQ_PORT,
        RABBITMQ_USER,
        RABBITMQ_PASS,
        RABBITMQ_VHOST
    );
}

function declareDlx(\PhpAmqpLib\Channel\AMQPChannel $channel): void {
    if (RABBITMQ_DLX_EXCHANGE === '') {
        return;
    }

    $channel->exchange_declare(RABBITMQ_DLX_EXCHANGE, 'topic', false, true, false);
}

function queueArguments(): ?\PhpAmqpLib\Wire\AMQPTable {
    if (RABBITMQ_DLX_EXCHANGE === '') {
        return null;
    }

    return new \PhpAmqpLib\Wire\AMQPTable([
        'x-dead-letter-exchange' => RABBITMQ_DLX_EXCHANGE,
    ]);
}
