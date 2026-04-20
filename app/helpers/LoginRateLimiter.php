<?php

/**
 * File-backed login rate limiter keyed by client IP.
 */
class LoginRateLimiter {

    /**
     * Check whether login attempt is allowed for the given IP.
     */
    public static function check($ip) {
        $clientIp = self::normalizeIp($ip);

        return self::mutateState(function ($state) use ($clientIp) {
            $now = time();
            $state = self::cleanupState($state, $now);
            $entry = self::normalizeEntry($state[$clientIp] ?? [], $now);

            if ($entry['blocked_until'] > $now) {
                $entry['last_attempt'] = $now;
                $state[$clientIp] = $entry;

                return [
                    $state,
                    [
                        'allowed' => false,
                        'retry_after' => $entry['blocked_until'] - $now,
                    ],
                ];
            }

            if ($entry['attempts'] >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
                $entry['blocked_until'] = $now + LOGIN_RATE_LIMIT_BLOCK_SECONDS;
                $entry['last_attempt'] = $now;
                $state[$clientIp] = $entry;

                return [
                    $state,
                    [
                        'allowed' => false,
                        'retry_after' => LOGIN_RATE_LIMIT_BLOCK_SECONDS,
                    ],
                ];
            }

            $entry['last_attempt'] = $now;
            $state[$clientIp] = $entry;

            return [
                $state,
                [
                    'allowed' => true,
                    'retry_after' => 0,
                ],
            ];
        });
    }

    /**
     * Record a failed login attempt for an IP.
     */
    public static function recordFailure($ip) {
        $clientIp = self::normalizeIp($ip);

        self::mutateState(function ($state) use ($clientIp) {
            $now = time();
            $state = self::cleanupState($state, $now);
            $entry = self::normalizeEntry($state[$clientIp] ?? [], $now);

            if ($entry['blocked_until'] > $now) {
                $entry['last_attempt'] = $now;
                $state[$clientIp] = $entry;
                return [$state, null];
            }

            $entry['attempts'] = (int) $entry['attempts'] + 1;
            $entry['last_attempt'] = $now;

            if ($entry['attempts'] >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
                $entry['blocked_until'] = $now + LOGIN_RATE_LIMIT_BLOCK_SECONDS;
            }

            $state[$clientIp] = $entry;
            return [$state, null];
        });
    }

    /**
     * Clear failed-attempt tracking for an IP after successful login.
     */
    public static function recordSuccess($ip) {
        $clientIp = self::normalizeIp($ip);

        self::mutateState(function ($state) use ($clientIp) {
            unset($state[$clientIp]);
            return [$state, null];
        });
    }

    private static function mutateState($mutator) {
        $path = self::getStoragePath();
        $handle = @fopen($path, 'c+');

        if ($handle === false) {
            $result = $mutator([]);
            return $result[1] ?? null;
        }

        try {
            if (!flock($handle, LOCK_EX)) {
                $result = $mutator([]);
                return $result[1] ?? null;
            }

            rewind($handle);
            $raw = stream_get_contents($handle);
            $decoded = json_decode($raw ?: '[]', true);
            $state = is_array($decoded) ? $decoded : [];

            $result = $mutator($state);
            $nextState = is_array($result[0] ?? null) ? $result[0] : [];

            rewind($handle);
            ftruncate($handle, 0);
            fwrite($handle, json_encode($nextState, JSON_UNESCAPED_SLASHES));
            fflush($handle);
            flock($handle, LOCK_UN);

            return $result[1] ?? null;
        } finally {
            fclose($handle);
        }
    }

    private static function normalizeEntry($entry, $now) {
        $normalized = [
            'attempts' => (int) ($entry['attempts'] ?? 0),
            'window_start' => (int) ($entry['window_start'] ?? $now),
            'blocked_until' => (int) ($entry['blocked_until'] ?? 0),
            'last_attempt' => (int) ($entry['last_attempt'] ?? $now),
        ];

        if ($normalized['window_start'] <= 0) {
            $normalized['window_start'] = $now;
        }

        if (($normalized['window_start'] + LOGIN_RATE_LIMIT_WINDOW_SECONDS) <= $now) {
            $normalized['attempts'] = 0;
            $normalized['window_start'] = $now;
            $normalized['blocked_until'] = 0;
        }

        if ($normalized['blocked_until'] <= $now) {
            $normalized['blocked_until'] = 0;
        }

        return $normalized;
    }

    private static function cleanupState($state, $now) {
        $ttl = max(LOGIN_RATE_LIMIT_BLOCK_SECONDS, LOGIN_RATE_LIMIT_WINDOW_SECONDS) * 4;

        foreach ($state as $ip => $entry) {
            $lastAttempt = (int) ($entry['last_attempt'] ?? $entry['window_start'] ?? 0);
            if ($lastAttempt <= 0 || ($now - $lastAttempt) > $ttl) {
                unset($state[$ip]);
            }
        }

        return $state;
    }

    private static function normalizeIp($ip) {
        $value = is_string($ip) ? trim($ip) : '';
        if (filter_var($value, FILTER_VALIDATE_IP)) {
            return $value;
        }

        return '0.0.0.0';
    }

    private static function getStoragePath() {
        $baseDir = defined('LOG_DIR') ? LOG_DIR : sys_get_temp_dir();

        if (!is_dir($baseDir)) {
            @mkdir($baseDir, 0755, true);
        }

        if (is_dir($baseDir) && is_writable($baseDir)) {
            return rtrim($baseDir, '/\\') . DIRECTORY_SEPARATOR . 'login_rate_limit.json';
        }

        return rtrim(sys_get_temp_dir(), '/\\') . DIRECTORY_SEPARATOR . 'assetcare360_login_rate_limit.json';
    }
}
