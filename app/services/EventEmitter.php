<?php

require_once __DIR__ . '/EventPublisher.php';

class EventEmitter {
    private EventPublisher $publisher;

    public function __construct() {
        $this->publisher = new EventPublisher();
    }

    public function emit(string $eventName, array $data, array $meta = []): void {
        try {
            $this->publisher->publish($eventName, $data, $meta);
        } catch (Throwable $e) {
            error_log('Event emitter error: ' . $e->getMessage());
        }
    }
}
