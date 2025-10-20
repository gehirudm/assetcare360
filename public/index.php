<?php

/**
 * Main Entry Point
 * All API requests are routed through this file
 */

// Load configuration first
require_once __DIR__ . '/../config/config.php';

// Handle CORS
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigin = '*';

if (CORS_ENABLED && !empty($origin)) {
    // Check if the origin is in the allowed list
    if (in_array($origin, CORS_ALLOWED_ORIGINS)) {
        $allowedOrigin = $origin;
    }
}

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . $allowedOrigin);
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true'); // Allow cookies to be sent
header('Vary: Origin'); // Important for caching

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Load database
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
require_once __DIR__ . '/../app/controllers/UserController.php';
require_once __DIR__ . '/../app/controllers/LogController.php';
require_once __DIR__ . '/../app/controllers/MachineController.php';
require_once __DIR__ . '/../app/controllers/VehicleController.php';

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
$router->post('/auth/forgot-password', 'AuthController', 'forgotPassword');
$router->post('/auth/reset-password', 'AuthController', 'resetPassword');

// User management routes (Admin only)
$router->get('/users/stats', 'UserController', 'stats');
$router->get('/users', 'UserController', 'index');
$router->post('/users', 'UserController', 'create');
$router->get('/users/:id', 'UserController', 'show');
$router->put('/users/:id', 'UserController', 'update');
$router->delete('/users/:id', 'UserController', 'delete');
$router->post('/users/:id/activate', 'UserController', 'activate');
$router->post('/users/:id/deactivate', 'UserController', 'deactivate');
$router->post('/users/:id/reset-password', 'UserController', 'resetPassword');

// System logs routes (Admin only)
$router->get('/logs/stats', 'LogController', 'stats');
$router->get('/logs/categories', 'LogController', 'categories');
$router->get('/logs/registry', 'LogController', 'registry');
$router->get('/logs/timeline', 'LogController', 'timeline');
$router->get('/logs/export', 'LogController', 'export');
$router->get('/logs/user/:id/summary', 'LogController', 'getUserActivitySummary');
$router->get('/logs/user/:id', 'LogController', 'getUserLogs');
$router->get('/logs', 'LogController', 'index');

// Machine management routes (Inventory Manager and above)
$router->get('/machines/due-service', 'MachineController', 'dueForService');
$router->get('/machines', 'MachineController', 'index');
$router->post('/machines', 'MachineController', 'store');
$router->get('/machines/:id', 'MachineController', 'show');
$router->put('/machines/:id', 'MachineController', 'update');
$router->delete('/machines/:id', 'MachineController', 'delete');

// Vehicle management routes (Inventory Manager and above)
$router->get('/vehicles/due-service', 'VehicleController', 'dueForService');
$router->get('/vehicles', 'VehicleController', 'index');
$router->post('/vehicles', 'VehicleController', 'store');
$router->get('/vehicles/:id', 'VehicleController', 'show');
$router->put('/vehicles/:id', 'VehicleController', 'update');
$router->put('/vehicles/:id/mileage', 'VehicleController', 'updateMileage');
$router->delete('/vehicles/:id', 'VehicleController', 'delete');

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
