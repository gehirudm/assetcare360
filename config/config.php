<?php

/**
 * Database Configuration
 */
define('DB_HOST', 'localhost:3306');
define('DB_NAME', 'assetcare360');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

/**
 * JWT Configuration
 */
define('JWT_SECRET', 'your-secret-key-change-this-in-production');
define('JWT_ALGORITHM', 'HS256');
define('JWT_EXPIRATION', 3600 * 24); // 24 hours

/**
 * Cookie Configuration
 */
define('COOKIE_NAME', 'auth_token');
define('COOKIE_HTTPONLY', true);
define('COOKIE_SECURE', false); // Set to true in production with HTTPS
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
 */
define('CORS_ENABLED', true);
define('CORS_ORIGIN', '*');

/**
 * Error Reporting
 */
error_reporting(E_ALL);
ini_set('display_errors', 1);

/**
 * Timezone
 */
date_default_timezone_set(TIMEZONE);
