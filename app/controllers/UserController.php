<?php

require_once __DIR__ . '/../services/UserService.php';
require_once __DIR__ . '/../services/EventEmitter.php';
require_once __DIR__ . '/../events/DomainEvents.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';

/**
 * User Controller
 * Handles user management endpoints (Admin only)
 */
class UserController {
    private $userService;
    private $eventEmitter;
    
    public function __construct() {
        $this->userService = new UserService();
        $this->eventEmitter = new EventEmitter();
    }
    
    /**
     * Get all users with filters
     * GET /api/users
     * Query params: role, is_active, department, search, page, limit
     */
    public function index() {
        // Only admins can view all users
        RoleMiddleware::requireRole('Admin');
        
        // Get query parameters
        $filters = [];
        if (isset($_GET['role']) && !empty($_GET['role'])) {
            $filters['role'] = $_GET['role'];
        }
        if (isset($_GET['is_active'])) {
            $filters['is_active'] = (int) $_GET['is_active'];
        }
        if (isset($_GET['department']) && !empty($_GET['department'])) {
            $filters['department'] = $_GET['department'];
        }
        
        $search = $_GET['search'] ?? null;
        $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 20;
        
        // Validate pagination
        $page = max(1, $page);
        $limit = min(100, max(1, $limit)); // Max 100 per page
        
        $result = $this->userService->getAllUsers($filters, $search, $page, $limit);
        
        if ($result['success']) {
            Response::success($result['data']);
        } else {
            Response::error($result['message'], 400);
        }
    }
    
    /**
     * Get single user
     * GET /api/users/:id
     */
    public function show() {
        RoleMiddleware::requireRole('Admin');
        
        // Get user ID from URL parameter (set by router)
        $userId = $_GET['id'] ?? null;
        
        if (!$userId) {
            Response::error('User ID is required', 400);
        }
        
        $result = $this->userService->getUser($userId);
        
        if ($result['success']) {
            Response::success($result['data']);
        } else {
            Response::notFound($result['message']);
        }
    }
    
    /**
     * Create new user
     * POST /api/users
     */
    public function create() {
        RoleMiddleware::requireRole('Admin');
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            Response::error('Invalid JSON data', 400);
        }
        
        // Check if welcome email should be sent
        $sendWelcomeEmail = $input['send_welcome_email'] ?? false;
        unset($input['send_welcome_email']);
        
        $result = $this->userService->createUser($input, $sendWelcomeEmail);
        
        if ($result['success']) {
            $createdUser = $result['data'] ?? [];
            $currentUser = RoleMiddleware::getCurrentUser();
            $temporaryPassword = $result['temporary_password'] ?? null;
            $loginUrl = rtrim(FRONTEND_BASE_URL, '/') . '/auth/login.html';

            $this->eventEmitter->emit(
                DomainEvents::USER_ACCOUNT_CREATED,
                [
                    'user_id' => $createdUser['id'] ?? null,
                    'full_name' => $createdUser['full_name'] ?? null,
                    'email' => $createdUser['email'] ?? null,
                    'employee_id' => $createdUser['employee_id'] ?? null,
                    'role' => $createdUser['role'] ?? null,
                    'temporary_password' => $temporaryPassword,
                    'force_password_change' => true,
                    'login_url' => $loginUrl,
                ],
                [
                    'source' => 'api:users.create',
                    'created_by_user_id' => $currentUser['id'] ?? null,
                    'created_by_employee_id' => $currentUser['employee_id'] ?? null,
                ]
            );

            Response::success($result['data'], $result['message'], 201);
        } else {
            if (isset($result['errors'])) {
                Response::validationError($result['errors'], $result['message']);
            } else {
                Response::error($result['message'], 400);
            }
        }
    }
    
    /**
     * Update user
     * PUT /api/users/:id
     */
    public function update() {
        RoleMiddleware::requireRole('Admin');
        
        $userId = $_GET['id'] ?? null;
        
        if (!$userId) {
            Response::error('User ID is required', 400);
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            Response::error('Invalid JSON data', 400);
        }
        
        $result = $this->userService->updateUser($userId, $input);
        
        if ($result['success']) {
            Response::success($result['data'], $result['message']);
        } else {
            if (isset($result['errors'])) {
                Response::validationError($result['errors'], $result['message']);
            } else {
                Response::error($result['message'], 400);
            }
        }
    }
    
    /**
     * Delete user (soft delete)
     * DELETE /api/users/:id
     */
    public function delete() {
        RoleMiddleware::requireRole('Admin');
        
        $userId = $_GET['id'] ?? null;
        
        if (!$userId) {
            Response::error('User ID is required', 400);
        }
        
        $result = $this->userService->deleteUser($userId);
        
        if ($result['success']) {
            Response::success(null, $result['message']);
        } else {
            Response::error($result['message'], 400);
        }
    }
    
    /**
     * Activate user
     * POST /api/users/:id/activate
     */
    public function activate() {
        RoleMiddleware::requireRole('Admin');
        
        $userId = $_GET['id'] ?? null;
        
        if (!$userId) {
            Response::error('User ID is required', 400);
        }
        
        $result = $this->userService->activateUser($userId);
        
        if ($result['success']) {
            Response::success(null, $result['message']);
        } else {
            Response::error($result['message'], 400);
        }
    }
    
    /**
     * Deactivate user
     * POST /api/users/:id/deactivate
     */
    public function deactivate() {
        RoleMiddleware::requireRole('Admin');
        
        $userId = $_GET['id'] ?? null;
        
        if (!$userId) {
            Response::error('User ID is required', 400);
        }
        
        $result = $this->userService->deleteUser($userId);
        
        if ($result['success']) {
            Response::success(null, $result['message']);
        } else {
            Response::error($result['message'], 400);
        }
    }
    
    /**
     * Get user statistics
     * GET /api/users/stats
     */
    public function stats() {
        RoleMiddleware::requireRole('Admin');
        
        $result = $this->userService->getUserStatistics();
        
        if ($result['success']) {
            Response::success($result['data']);
        } else {
            Response::error($result['message'], 400);
        }
    }
    
    /**
     * Reset user password
     * POST /api/users/:id/reset-password
     */
    public function resetPassword() {
        RoleMiddleware::requireRole('Admin');
        
        $userId = $_GET['id'] ?? null;
        
        if (!$userId) {
            Response::error('User ID is required', 400);
        }
        
        $userModel = new User();
        $user = $userModel->getUserById($userId);
        
        if (!$user) {
            Response::notFound('User not found');
        }
        
        // Generate new temporary password
        $temporaryPassword = $userModel->generateRandomPassword();
        $success = $userModel->updatePassword($userId, $temporaryPassword);
        
        if ($success) {
            // Set force password change flag
            $userModel->update($userId, ['force_password_change' => 1]);
            
            Response::success([
                'temporary_password' => $temporaryPassword,
                'message' => 'Password reset successfully. User will be required to change password on next login.'
            ]);
        } else {
            Response::serverError('Failed to reset password');
        }
    }
    
    /**
     * Get technicians (for supervisors to assign tickets)
     * GET /api/technicians
     * Accessible by Supervisor and Admin
     */
    public function getTechnicians() {
        // Allow supervisors and admins to view technicians
        RoleMiddleware::requireRole(['Supervisor', 'Admin']);

        $result = $this->userService->getTechniciansWithWorkload();
        
        if ($result['success']) {
            Response::success($result['data']);
        } else {
            Response::error($result['message'], 400);
        }
    }

    /**
     * Get drivers (for transportation managers to assign trips)
     * GET /api/drivers
     * Accessible by Transportation Manager and Admin
     */
    public function getDrivers() {
        // Allow transportation managers and admins to view drivers
        RoleMiddleware::requireRole(['Transportation Manager', 'Admin']);

        $result = $this->userService->getDriversWithWorkload();
        
        if ($result['success']) {
            Response::success($result['data']);
        } else {
            Response::error($result['message'], 400);
        }
    }
}
