<?php

/**
 * Load .env file if present
 */
(function () {
    $envFile = __DIR__ . '/../.env';
    if (!file_exists($envFile)) {
        return;
    }
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $key   = trim($key);
        $value = trim($value);
        if (!array_key_exists($key, $_ENV) && !array_key_exists($key, $_SERVER)) {
            putenv("{$key}={$value}");
            $_ENV[$key]    = $value;
            $_SERVER[$key] = $value;
        }
    }
})();

/**
 * Helper — reads env var, falls back to default
 */
function env(string $key, $default = null) {
    $value = getenv($key);
    return $value !== false ? $value : $default;
}

/**
 * Database Configuration
 */
define('DB_HOST',    env('DB_HOST', 'localhost'));
define('DB_PORT',    env('DB_PORT', '3306'));
define('DB_NAME',    env('DB_NAME',    'assetcare360'));
define('DB_USER',    env('DB_USER',    'root'));
define('DB_PASS',    env('DB_PASS',    ''));
define('DB_CHARSET', env('DB_CHARSET', 'utf8mb4'));
define('DB_SSL_CA',  env('DB_SSL_CA',  ''));   // Path to CA cert; empty = no SSL

/**
 * JWT Configuration
 */
define('JWT_SECRET', env('JWT_SECRET', 'your-secret-key-change-this-in-production'));
define('JWT_ALGORITHM', 'HS256');
define('JWT_EXPIRATION', 3600 * 24); // 24 hours

/**
 * Cookie Configuration
 */
define('COOKIE_NAME', 'auth_token');
define('COOKIE_HTTPONLY', true);
define('COOKIE_SECURE', filter_var(env('COOKIE_SECURE', 'false'), FILTER_VALIDATE_BOOLEAN)); // Set to true in production with HTTPS
define('COOKIE_SAMESITE', 'Lax'); // Lax, Strict, or None
define('COOKIE_PATH', '/');
define('COOKIE_DOMAIN', ''); // Leave empty for current domain

/**
 * Application Configuration
 */
define('API_PREFIX', '/api');
define('TIMEZONE', 'Asia/Colombo');

/**
 * Logging Configuration
 */
define('LOG_REQUESTS', true);
define('LOG_DIR', __DIR__ . '/../logs');

/**
 * CORS Configuration
 * When using credentials (cookies), you must specify the exact origin, not '*'
 */
define('CORS_ENABLED', true);
define('CORS_ALLOWED_ORIGINS', [
    'http://localhost:3000',
    'http://localhost:8000',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8000',
    'http://127.0.0.1:8080'
]);

/**
 * Error Reporting
 */
error_reporting(E_ALL);
ini_set('display_errors', 1);

/**
 * Timezone
 */
date_default_timezone_set(TIMEZONE);
