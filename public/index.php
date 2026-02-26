<?php

/**
 * Main Entry Point
 * All API requests are routed through this file
 */

// Load configuration first
require_once __DIR__ . '/../config/config.php';

// Handle CORS
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigin = '';

if (CORS_ENABLED && !empty($origin)) {
    // Check if the origin is in the allowed list
    if (in_array($origin, CORS_ALLOWED_ORIGINS)) {
        $allowedOrigin = $origin;
    }
}

// Set headers
header('Content-Type: application/json');
if (!empty($allowedOrigin)) {
    // When credentials are included, origin MUST be specific (not '*')
    header('Access-Control-Allow-Origin: ' . $allowedOrigin);
    header('Access-Control-Allow-Credentials: true');
} else {
    // For same-origin requests (no Origin header) or unknown origins, allow without credentials
    header('Access-Control-Allow-Origin: *');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
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
require_once __DIR__ . '/../app/controllers/TripController.php';
require_once __DIR__ . '/../app/controllers/ProductController.php';
require_once __DIR__ . '/../app/controllers/SparepartUsageController.php';
require_once __DIR__ . '/../app/controllers/SparepartAdditionController.php';
require_once __DIR__ . '/../app/controllers/FaultTicketController.php';
require_once __DIR__ . '/../app/controllers/TicketWorkUpdateController.php';
require_once __DIR__ . '/../app/controllers/BudgetReportController.php';
require_once __DIR__ . '/../app/controllers/FileController.php';
require_once __DIR__ . '/../app/controllers/VehicleCheckController.php';
require_once __DIR__ . '/../app/controllers/MachineWeeklyCheckController.php';
require_once __DIR__ . '/../app/controllers/BreakdownReportController.php';
require_once __DIR__ . '/../app/controllers/RouteBreakdownController.php';
require_once __DIR__ . '/../app/controllers/MachineBreakdownController.php';
require_once __DIR__ . '/../app/controllers/TecFaultRepairTicketController.php';
require_once __DIR__ . '/../app/controllers/SparePartRequestController.php';

// Initialize request logger
$requestLogger = new RequestLogger();

// Initialize router
$router = new Router();

// Define routes
// Authentication routes
$router->post('/auth/login', 'AuthController', 'login');
$router->post('/auth/logout', 'AuthController', 'logout');
$router->get('/auth/me', 'AuthController', 'me');
$router->get('/auth/profile', 'AuthController', 'getProfile');
$router->put('/auth/profile', 'AuthController', 'updateProfile');
$router->post('/auth/change-password', 'AuthController', 'changePassword');
$router->get('/auth/validate', 'AuthController', 'validateToken');
$router->post('/auth/forgot-password', 'AuthController', 'forgotPassword');
$router->post('/auth/reset-password', 'AuthController', 'resetPassword');

// Passkey authentication routes
$router->get('/auth/passkey/register-options', 'AuthController', 'passkeyRegisterOptions');
$router->post('/auth/passkey/register', 'AuthController', 'passkeyRegister');
$router->post('/auth/passkey/authenticate-options', 'AuthController', 'passkeyAuthenticateOptions');
$router->post('/auth/passkey/authenticate', 'AuthController', 'passkeyAuthenticate');
$router->get('/auth/passkey', 'AuthController', 'listPasskeys');
$router->delete('/auth/passkey/:id', 'AuthController', 'deletePasskey');

// Technicians routes (Supervisor and Admin)
$router->get('/technicians', 'UserController', 'getTechnicians');

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
$router->get('/machines/next-id', 'MachineController', 'getNextId');
$router->get('/machines/due-service', 'MachineController', 'dueForService');
$router->get('/machines', 'MachineController', 'index');
$router->post('/machines', 'MachineController', 'store');
$router->get('/machines/:id', 'MachineController', 'show');
$router->put('/machines/:id', 'MachineController', 'update');
$router->delete('/machines/:id', 'MachineController', 'delete');

// Vehicle management routes (Inventory Manager and above)
$router->get('/vehicles/next-id', 'VehicleController', 'getNextId');
$router->get('/vehicles/due-service', 'VehicleController', 'dueForService');
$router->get('/vehicles', 'VehicleController', 'index');
$router->post('/vehicles', 'VehicleController', 'store');
$router->get('/vehicles/:id', 'VehicleController', 'show');
$router->put('/vehicles/:id', 'VehicleController', 'update');
$router->patch('/vehicles/:id/mileage', 'VehicleController', 'updateMileage');
$router->delete('/vehicles/:id', 'VehicleController', 'delete');

// Trip management routes (Driver)
$router->get('/trips/active-count', 'TripController', 'getActiveTripCount');
$router->get('/trips', 'TripController', 'getAllTrips');
$router->post('/trips', 'TripController', 'createTrip');
$router->get('/trips/:id', 'TripController', 'getTripById');
$router->put('/trips/:id', 'TripController', 'updateTrip');
$router->post('/trips/:id/start', 'TripController', 'startTrip');
$router->post('/trips/:id/end', 'TripController', 'endTrip');
$router->post('/trips/:id/cancel', 'TripController', 'cancelTrip');
$router->delete('/trips/:id', 'TripController', 'deleteTrip');

// Vehicle check routes (Driver, Supervisor)
$router->get('/vehicle-checks/next-id', 'VehicleCheckController', 'nextId');
$router->get('/vehicle-checks', 'VehicleCheckController', 'index');
$router->post('/vehicle-checks', 'VehicleCheckController', 'store');
$router->get('/vehicle-checks/:id', 'VehicleCheckController', 'show');
$router->put('/vehicle-checks/:id/approve', 'VehicleCheckController', 'approve');
$router->put('/vehicle-checks/:id/reject', 'VehicleCheckController', 'reject');

// Machine weekly check routes (Machinery Operator, Supervisor)
$router->get('/machine-weekly-checks/next-id', 'MachineWeeklyCheckController', 'nextId');
$router->get('/machine-weekly-checks/summary', 'MachineWeeklyCheckController', 'summary');
$router->get('/machine-weekly-checks', 'MachineWeeklyCheckController', 'index');
$router->post('/machine-weekly-checks', 'MachineWeeklyCheckController', 'create');
$router->get('/machine-weekly-checks/:id', 'MachineWeeklyCheckController', 'show');
$router->put('/machine-weekly-checks/:id', 'MachineWeeklyCheckController', 'update');
$router->delete('/machine-weekly-checks/:id', 'MachineWeeklyCheckController', 'delete');
$router->post('/machine-weekly-checks/:id/approve', 'MachineWeeklyCheckController', 'approve');
$router->post('/machine-weekly-checks/:id/reject', 'MachineWeeklyCheckController', 'reject');

// Product/Spare parts management routes (Inventory Manager and above)
$router->get('/products/next-id', 'ProductController', 'getNextId');
$router->get('/products', 'ProductController', 'index');
$router->post('/products', 'ProductController', 'store');
$router->get('/products/:id', 'ProductController', 'show');
$router->put('/products/:id', 'ProductController', 'update');
$router->patch('/products/:id/quantity', 'ProductController', 'updateQuantity');
$router->delete('/products/:id', 'ProductController', 'destroy');

// Sparepart usage tracking routes (Inventory Manager and above)
$router->get('/usage', 'SparepartUsageController', 'getAll');
$router->post('/usage', 'SparepartUsageController', 'create');
$router->get('/usage/sparepart/:id', 'SparepartUsageController', 'getHistory');
$router->get('/usage/stats/:id', 'SparepartUsageController', 'getStats');
$router->get('/usage/available/:id', 'SparepartUsageController', 'getAvailableQuantity');

// Sparepart additions tracking routes (Inventory Manager and above)
$router->get('/additions', 'SparepartAdditionController', 'getRecent');
$router->post('/additions', 'SparepartAdditionController', 'create');
$router->get('/additions/sparepart/:id', 'SparepartAdditionController', 'getBySparepart');
$router->put('/additions/:id', 'SparepartAdditionController', 'update');
$router->delete('/additions/:id', 'SparepartAdditionController', 'delete');

// Fault ticket routes (Machinery Operator and above)
$router->get('/fault-tickets', 'FaultTicketController', 'index');
$router->get('/fault-tickets/:id', 'FaultTicketController', 'show');
$router->post('/fault-tickets', 'FaultTicketController', 'create');
$router->post('/fault-tickets/:id/assign', 'FaultTicketController', 'assign');
$router->post('/fault-tickets/:id/complete', 'FaultTicketController', 'complete');
$router->put('/fault-tickets/:id', 'FaultTicketController', 'update');
$router->patch('/fault-tickets/:id', 'FaultTicketController', 'update');
$router->delete('/fault-tickets/:id', 'FaultTicketController', 'delete');

// Ticket work update routes (Technical Officer)
$router->post('/ticket-work-updates', 'TicketWorkUpdateController', 'create');
$router->get('/ticket-work-updates/ticket/:id', 'TicketWorkUpdateController', 'getByTicket');
$router->get('/ticket-work-updates/latest/:id', 'TicketWorkUpdateController', 'getLatest');

// Budget report routes (Technical Officer and above)
$router->get('/budget-reports/pending', 'BudgetReportController', 'getPending');
$router->get('/budget-reports/ticket/:id', 'BudgetReportController', 'getByTicket');
$router->get('/budget-reports/ticket/:id/latest', 'BudgetReportController', 'getLatestByTicket');
$router->post('/budget-reports', 'BudgetReportController', 'create');
$router->put('/budget-reports/:id', 'BudgetReportController', 'update');
$router->post('/budget-reports/:id/review', 'BudgetReportController', 'review');
$router->delete('/budget-reports/:id', 'BudgetReportController', 'delete');

// File serving routes (for uploaded files)
$router->get('/uploads/fault-tickets/:filename', 'FileController', 'serveFaultTicketImage');

// Breakdown report routes (Supervisor and above)
$router->get('/breakdown-reports/stats', 'BreakdownReportController', 'stats');
$router->get('/breakdown-reports', 'BreakdownReportController', 'index');
$router->get('/breakdown-reports/:id', 'BreakdownReportController', 'show');
$router->post('/breakdown-reports', 'BreakdownReportController', 'create');
$router->put('/breakdown-reports/:id', 'BreakdownReportController', 'update');
$router->delete('/breakdown-reports/:id', 'BreakdownReportController', 'delete');

// Route breakdown routes (Supervisor and above)
$router->get('/route-breakdowns/stats', 'RouteBreakdownController', 'stats');
$router->get('/route-breakdowns', 'RouteBreakdownController', 'index');
$router->get('/route-breakdowns/:id', 'RouteBreakdownController', 'show');
$router->post('/route-breakdowns', 'RouteBreakdownController', 'create');
$router->put('/route-breakdowns/:id', 'RouteBreakdownController', 'update');
$router->delete('/route-breakdowns/:id', 'RouteBreakdownController', 'delete');

// Machine breakdown routes (Machinery Operator and above)
$router->get('/machine-breakdowns', 'MachineBreakdownController', 'index');
$router->get('/machine-breakdowns/:id', 'MachineBreakdownController', 'show');
$router->post('/machine-breakdowns', 'MachineBreakdownController', 'create');

// Technical Officer Repair Ticket routes
$router->get('/tec-repair-tickets/my', 'TecFaultRepairTicketController', 'myTickets');
$router->get('/tec-repair-tickets/stats', 'TecFaultRepairTicketController', 'stats');
$router->get('/tec-repair-tickets/status/:status', 'TecFaultRepairTicketController', 'getByStatus');
$router->get('/tec-repair-tickets', 'TecFaultRepairTicketController', 'index');
$router->get('/tec-repair-tickets/:id', 'TecFaultRepairTicketController', 'show');
$router->put('/tec-repair-tickets/:id', 'TecFaultRepairTicketController', 'update');
$router->patch('/tec-repair-tickets/:id/status', 'TecFaultRepairTicketController', 'updateStatus');

// Spare Part Request routes (Technical Officer → Inventory Manager)
$router->get('/spare-part-requests/stats', 'SparePartRequestController', 'stats');
$router->get('/spare-part-requests/ticket/:id', 'SparePartRequestController', 'getByTicket');
$router->get('/spare-part-requests', 'SparePartRequestController', 'index');
$router->get('/spare-part-requests/:id', 'SparePartRequestController', 'show');
$router->post('/spare-part-requests', 'SparePartRequestController', 'create');
$router->post('/spare-part-requests/:id/approve', 'SparePartRequestController', 'approve');
$router->post('/spare-part-requests/:id/reject', 'SparePartRequestController', 'reject');

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
