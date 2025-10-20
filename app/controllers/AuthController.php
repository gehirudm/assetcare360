<?php

require_once __DIR__ . '/../services/AuthService.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/CookieHelper.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';

/**
 * Authentication Controller
 * Handles authentication endpoints
 */
class AuthController {
    private $authService;
    
    public function __construct() {
        $this->authService = new AuthService();
    }
    
    /**
     * Login endpoint
     * POST /api/auth/login
     */
    public function login() {
        // Get request body
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            Response::error('Invalid JSON data', 400);
        }
        
        $employeeId = $input['employee_id'] ?? null;
        $password = $input['password'] ?? null;
        
        // Attempt login
        $result = $this->authService->login($employeeId, $password);
        
        if ($result['success']) {
            // Set auth token in HTTP-only cookie
            CookieHelper::setAuthCookie($result['data']['token']);
            
            // Still return token in response for API clients that prefer header auth
            Response::success($result['data'], $result['message']);
        } else {
            Response::error($result['message'], 401);
        }
    }
    
    /**
     * Get current user
     * GET /api/auth/me
     * Returns user info if authenticated, or null if not (doesn't throw 401)
     */
    public function me() {
        $user = RoleMiddleware::getCurrentUser();
        
        if ($user) {
            Response::success($user, 'User authenticated');
        } else {
            Response::success(null, 'No user authenticated');
        }
    }
    
    /**
     * Logout endpoint (clears auth cookie)
     * POST /api/auth/logout
     */
    public function logout() {
        RoleMiddleware::authenticate();
        
        // Clear auth cookie
        CookieHelper::deleteAuthCookie();
        
        Response::success(null, 'Logged out successfully');
    }
    
    /**
     * Change password
     * POST /api/auth/change-password
     */
    public function changePassword() {
        $user = RoleMiddleware::authenticate();
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            Response::error('Invalid JSON data', 400);
        }
        
        $currentPassword = $input['current_password'] ?? null;
        $newPassword = $input['new_password'] ?? null;
        
        if (!$currentPassword || !$newPassword) {
            Response::error('Current password and new password are required', 400);
        }
        
        $result = $this->authService->changePassword($user['id'], $currentPassword, $newPassword);
        
        if ($result['success']) {
            Response::success(null, $result['message']);
        } else {
            Response::error($result['message'], 400);
        }
    }
    
    /**
     * Validate token
     * GET /api/auth/validate
     */
    public function validateToken() {
        $token = null;
        
        // Check cookie first
        if (CookieHelper::hasAuthCookie()) {
            $token = CookieHelper::getAuthCookie();
        }
        
        // Fall back to Authorization header
        if (!$token) {
            $headers = getallheaders();
            $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? null;
            
            if ($authHeader && preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                $token = $matches[1];
            }
        }
        
        if (!$token) {
            Response::unauthorized('Token not provided');
        }
        
        $result = $this->authService->validateToken($token);
        
        if ($result['success']) {
            Response::success($result['data'], 'Token is valid');
        } else {
            Response::unauthorized($result['message']);
        }
    }
    
    /**
     * Forgot password
     * POST /api/auth/forgot-password
     */
    public function forgotPassword() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            Response::error('Invalid JSON data', 400);
        }
        
        $employeeId = $input['employee_id'] ?? null;
        $email = $input['email'] ?? null;
        
        if (!$employeeId || !$email) {
            Response::error('Employee ID and email are required', 400);
        }
        
        $result = $this->authService->forgotPassword($employeeId, $email);
        
        if ($result['success']) {
            Response::success($result, $result['message']);
        } else {
            Response::error($result['message'], 400);
        }
    }
    
    /**
     * Reset password
     * POST /api/auth/reset-password
     */
    public function resetPassword() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            Response::error('Invalid JSON data', 400);
        }
        
        $token = $input['token'] ?? null;
        $newPassword = $input['new_password'] ?? null;
        
        if (!$token || !$newPassword) {
            Response::error('Token and new password are required', 400);
        }
        
        $result = $this->authService->resetPassword($token, $newPassword);
        
        if ($result['success']) {
            Response::success(null, $result['message']);
        } else {
            Response::error($result['message'], 400);
        }
    }
}
