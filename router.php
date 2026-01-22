<?php
/**
 * Router for PHP Built-in Server
 * Handles API routing through public/index.php and serves static files
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Handle API requests - route through public/index.php
if (strpos($uri, '/api/') === 0) {
    $_SERVER['SCRIPT_NAME'] = '/public/index.php';
    require __DIR__ . '/public/index.php';
    return true;
}

// Serve static files from pages directory
if (strpos($uri, '/pages/') === 0) {
    // Remove /pages/ prefix and serve from pages directory
    $file = __DIR__ . $uri;
    if (file_exists($file) && is_file($file)) {
        return false; // Let PHP serve the file
    }
}

// Root request - serve landing page
if ($uri === '/' || $uri === '') {
    require __DIR__ . '/pages/index.html';
    return true;
}

// Let PHP's built-in server handle the request
return false;
