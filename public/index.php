<?php

/**
 * Main Entry Point
 * All API requests are routed through this file
 */

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . (CORS_ENABLED ? CORS_ORIGIN : '*'));
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true'); // Allow cookies to be sent

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Load configuration
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

// Load helpers
require_once __DIR__ . '/../app/helpers/Response.php';
require_once __DIR__ . '/../app/helpers/JWTHelper.php';
require_once __DIR__ . '/../app/helpers/CookieHelper.php';

// Load middleware
require_once __DIR__ . '/../app/middleware/RequestLogger.php';
require_once __DIR__ . '/../app/middleware/RoleMiddleware.php';

// Load router
require_once __DIR__ . '/../app/Router.php';

// Load controllers
require_once __DIR__ . '/../app/controllers/AuthController.php';

// Initialize request logger
$requestLogger = new RequestLogger();

// Initialize router
$router = new Router();

// Define routes
// Authentication routes
$router->post('/auth/login', 'AuthController', 'login');
$router->post('/auth/logout', 'AuthController', 'logout');
$router->get('/auth/me', 'AuthController', 'me');
$router->post('/auth/change-password', 'AuthController', 'changePassword');
$router->get('/auth/validate', 'AuthController', 'validateToken');

// Dispatch the request
try {
    $router->dispatch();
    
    // Log the request after successful processing
    $user = RoleMiddleware::getCurrentUser();
    $requestLogger->log($user, http_response_code());
    
} catch (Exception $e) {
    // Log error
    error_log("Error: " . $e->getMessage());
    
    // Log the request even if there's an error
    $user = RoleMiddleware::getCurrentUser();
    $requestLogger->log($user, 500);
    
    Response::serverError('An unexpected error occurred');
}
