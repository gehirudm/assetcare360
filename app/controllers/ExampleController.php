<?php

require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';

/**
 * Example Controller
 * Demonstrates how to create controllers with role-based access control
 */
class ExampleController {
    
    /**
     * Example: Public endpoint (no authentication required)
     * GET /api/example/public
     */
    public function publicEndpoint() {
        Response::success([
            'message' => 'This is a public endpoint, accessible to everyone'
        ]);
    }
    
    /**
     * Example: Protected endpoint (authentication required)
     * GET /api/example/protected
     */
    public function protectedEndpoint() {
        // This requires authentication but allows any logged-in user
        $user = RoleMiddleware::authenticate();
        
        Response::success([
            'message' => 'This is a protected endpoint',
            'user' => $user
        ]);
    }
    
    /**
     * Example: Admin only endpoint
     * GET /api/example/admin-only
     */
    public function adminOnlyEndpoint() {
        // Only admins can access this
        RoleMiddleware::requireRole('Admin');
        
        $user = RoleMiddleware::getCurrentUser();
        
        Response::success([
            'message' => 'This endpoint is only accessible by Admins',
            'user' => $user
        ]);
    }
    
    /**
     * Example: Multiple roles allowed
     * GET /api/example/inventory-staff
     */
    public function inventoryStaffEndpoint() {
        // Only Admins and Inventory Managers can access this
        RoleMiddleware::requireRole(['Admin', 'Inventory Manager']);
        
        $user = RoleMiddleware::getCurrentUser();
        
        Response::success([
            'message' => 'This endpoint is accessible by Admins and Inventory Managers',
            'user' => $user
        ]);
    }
    
    /**
     * Example: Minimum role level required
     * GET /api/example/supervisors-and-above
     */
    public function supervisorsAndAboveEndpoint() {
        // Supervisors and anyone with higher permissions (Inventory Manager, Admin)
        RoleMiddleware::requireMinRole('Supervisor');
        
        $user = RoleMiddleware::getCurrentUser();
        
        Response::success([
            'message' => 'This endpoint requires Supervisor level or higher',
            'user' => $user,
            'allowed_roles' => ['Admin', 'Inventory Manager', 'Supervisor']
        ]);
    }
    
    /**
     * Example: POST endpoint with data
     * POST /api/example/create-something
     */
    public function createSomething() {
        // Require Admin or Inventory Manager roles
        RoleMiddleware::requireRole(['Admin', 'Inventory Manager']);
        
        // Get request body
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            Response::error('Invalid JSON data', 400);
        }
        
        // Validate input
        if (empty($input['name'])) {
            Response::validationError(['name' => 'Name is required']);
        }
        
        $user = RoleMiddleware::getCurrentUser();
        
        // Here you would typically create a record in the database
        // For example:
        // $model = new SomeModel();
        // $id = $model->create($input);
        
        Response::success([
            'message' => 'Resource created successfully',
            'created_by' => $user['full_name'],
            'data' => $input
        ], 'Created', 201);
    }
}
