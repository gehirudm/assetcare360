<?php

require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../helpers/JWTHelper.php';

/**
 * Authentication Service
 * Handles login logic and token generation
 */
class AuthService {
    private $userModel;
    
    public function __construct() {
        $this->userModel = new User();
    }
    
    /**
     * Authenticate user and generate JWT token
     */
    public function login($employeeId, $password) {
        // Validate inputs
        if (empty($employeeId) || empty($password)) {
            return [
                'success' => false,
                'message' => 'Employee ID and password are required'
            ];
        }
        
        // Find user by employee ID
        $user = $this->userModel->findByEmployeeId($employeeId);
        
        if (!$user) {
            return [
                'success' => false,
                'message' => 'Invalid credentials'
            ];
        }
        
        // Check if user is active
        if (!$user['is_active']) {
            return [
                'success' => false,
                'message' => 'Your account has been deactivated. Please contact administrator.'
            ];
        }
        
        // Verify password
        if (!$this->userModel->verifyPassword($password, $user['password'])) {
            return [
                'success' => false,
                'message' => 'Invalid credentials'
            ];
        }
        
        // Update last login
        $this->userModel->updateLastLogin($user['id']);
        
        // Generate JWT token
        $tokenPayload = [
            'id' => $user['id'],
            'employee_id' => $user['employee_id'],
            'role' => $user['role'],
            'full_name' => $user['full_name']
        ];
        
        $token = JWTHelper::encode($tokenPayload);
        
        // Remove password from user data
        unset($user['password']);
        
        return [
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'token' => $token,
                'user' => $user
            ]
        ];
    }
    
    /**
     * Validate JWT token
     */
    public function validateToken($token) {
        $payload = JWTHelper::decode($token);
        
        if (!$payload) {
            return [
                'success' => false,
                'message' => 'Invalid or expired token'
            ];
        }
        
        // Verify user still exists and is active
        $user = $this->userModel->findById($payload['id']);
        
        if (!$user || !$user['is_active']) {
            return [
                'success' => false,
                'message' => 'User not found or inactive'
            ];
        }
        
        unset($user['password']);
        
        return [
            'success' => true,
            'data' => $user
        ];
    }
    
    /**
     * Get current user from token
     */
    public function getCurrentUser($token) {
        $payload = JWTHelper::decode($token);
        
        if (!$payload) {
            return null;
        }
        
        $user = $this->userModel->getUserById($payload['id']);
        return $user;
    }
    
    /**
     * Change password
     */
    public function changePassword($userId, $currentPassword, $newPassword) {
        $user = $this->userModel->findById($userId);
        
        if (!$user) {
            return [
                'success' => false,
                'message' => 'User not found'
            ];
        }
        
        // Verify current password
        if (!$this->userModel->verifyPassword($currentPassword, $user['password'])) {
            return [
                'success' => false,
                'message' => 'Current password is incorrect'
            ];
        }
        
        // Validate new password
        if (strlen($newPassword) < 6) {
            return [
                'success' => false,
                'message' => 'New password must be at least 6 characters long'
            ];
        }
        
        // Update password
        $this->userModel->updatePassword($userId, $newPassword);
        
        return [
            'success' => true,
            'message' => 'Password changed successfully'
        ];
    }
}
