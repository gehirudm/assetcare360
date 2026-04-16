<?php

require_once __DIR__ . '/DomainEvents.php';

class EventEnvelope {
    public static function build(string $eventName, array $data, array $meta = []): array {
        return [
            'id' => self::uuidV4(),
            'event' => $eventName,
            'version' => EVENTS_SCHEMA_VERSION,
            'timestamp' => gmdate('c'),
            'data' => $data,
            'meta' => $meta,
        ];
    }

    public static function validate(array $envelope): array {
        $required = ['id', 'event', 'version', 'timestamp', 'data'];
        foreach ($required as $key) {
            if (!array_key_exists($key, $envelope)) {
                return ['valid' => false, 'message' => "Missing envelope field: {$key}"];
            }
        }

        if (!is_string($envelope['id']) || trim($envelope['id']) === '') {
            return ['valid' => false, 'message' => 'Envelope id must be a non-empty string'];
        }

        if (!in_array($envelope['event'], DomainEvents::all(), true)) {
            return ['valid' => false, 'message' => 'Unknown event name'];
        }

        if (!is_array($envelope['data'])) {
            return ['valid' => false, 'message' => 'Envelope data must be an object'];
        }

        if (strtotime($envelope['timestamp']) === false) {
            return ['valid' => false, 'message' => 'Envelope timestamp must be a valid ISO date-time'];
        }

        return ['valid' => true];
    }

    private static function uuidV4(): string {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
    }
}
