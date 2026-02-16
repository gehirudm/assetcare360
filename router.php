<?php
/**
 * Router for PHP Built-in Server
 * Handles API routing through public/index.php and serves static files
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = urldecode($uri);

// Handle API requests - route through public/index.php
if (strpos($uri, '/api/') === 0) {
    $_SERVER['SCRIPT_NAME'] = '/public/index.php';
    require __DIR__ . '/public/index.php';
    return true;
}

// Root request - serve landing page
if ($uri === '/' || $uri === '') {
    require __DIR__ . '/pages/index.html';
    return true;
}

// Serve static files from pages directory with /pages/ prefix
if (strpos($uri, '/pages/') === 0) {
    $file = __DIR__ . $uri;
    if (file_exists($file) && is_file($file)) {
        return false; // Let PHP serve the file
    }
}

// Handle requests without /pages/ prefix - try to serve from pages directory
$file = __DIR__ . '/pages' . $uri;
if (file_exists($file) && is_file($file)) {
    // Serve the file with correct content type
    $ext = pathinfo($file, PATHINFO_EXTENSION);
    $contentTypes = [
        'html' => 'text/html',
        'css' => 'text/css',
        'js' => 'application/javascript',
        'json' => 'application/json',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif' => 'image/gif',
        'svg' => 'image/svg+xml'
    ];
    
    if (isset($contentTypes[$ext])) {
        header('Content-Type: ' . $contentTypes[$ext]);
    }
    
    readfile($file);
    return true;
}

// Let PHP's built-in server handle the request
return false;
