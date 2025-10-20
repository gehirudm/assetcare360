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
        
        // Check if password change is required
        $forcePasswordChange = (bool)($user['force_password_change'] ?? 0);
        
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
            'message' => $forcePasswordChange ? 'Login successful. You must change your password.' : 'Login successful',
            'data' => [
                'token' => $token,
                'user' => $user,
                'force_password_change' => $forcePasswordChange
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
        
        // Check if new password is same as current password
        if ($this->userModel->verifyPassword($newPassword, $user['password'])) {
            return [
                'success' => false,
                'message' => 'New password must be different from current password'
            ];
        }
        
        // Update password
        $this->userModel->updatePassword($userId, $newPassword);
        
        // Clear force_password_change flag if it was set
        if ($user['force_password_change']) {
            $this->userModel->update($userId, ['force_password_change' => 0]);
        }
        
        return [
            'success' => true,
            'message' => 'Password changed successfully'
        ];
    }
    
    /**
     * Request password reset (forgot password)
     * In a real application, this would send an email with a reset token
     */
    public function forgotPassword($employeeId, $email) {
        // Validate inputs
        if (empty($employeeId) || empty($email)) {
            return [
                'success' => false,
                'message' => 'Employee ID and email are required'
            ];
        }
        
        // Find user by employee ID
        $user = $this->userModel->findByEmployeeId($employeeId);
        
        if (!$user) {
            // For security, don't reveal if user exists or not
            return [
                'success' => true,
                'message' => 'If your account exists, you will receive a password reset email shortly.'
            ];
        }
        
        // Check if user is active
        if (!$user['is_active']) {
            return [
                'success' => true,
                'message' => 'If your account exists, you will receive a password reset email shortly.'
            ];
        }
        
        // Verify email matches
        if (empty($user['email']) || strcasecmp($user['email'], $email) !== 0) {
            return [
                'success' => true,
                'message' => 'If your account exists, you will receive a password reset email shortly.'
            ];
        }
        
        // Generate reset token (valid for 1 hour)
        $resetToken = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', strtotime('+1 hour'));
        
        // Store reset token in database
        $this->userModel->storePasswordResetToken($user['id'], $resetToken, $expiresAt);
        
        // Send password reset email
        $resetLink = "http://localhost:3000/auth/reset-password.html?token=$resetToken";
        $this->sendPasswordResetEmail($user['email'], $user['full_name'], $resetLink);
        
        return [
            'success' => true,
            'message' => 'If your account exists, you will receive a password reset email shortly.',
            // In development, return the token for testing (remove in production!)
            'debug_token' => $resetToken,
            'debug_link' => $resetLink
        ];
    }
    
    /**
     * Send password reset email
     */
    private function sendPasswordResetEmail($email, $fullName, $resetLink) {
        $subject = 'AssetCare360 - Password Reset Request';
        
        // Create HTML email body
        $message = "
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .header h1 { margin: 0; font-size: 28px; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                .button { display: inline-block; padding: 12px 30px; background: #4a90e2; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
                .button:hover { background: #3a7bc8; }
                .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
                .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; border-radius: 4px; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>AssetCare<span style='color: #fbbf24;'>360</span></h1>
                </div>
                <div class='content'>
                    <h2>Password Reset Request</h2>
                    <p>Hello " . htmlspecialchars($fullName) . ",</p>
                    <p>We received a request to reset your password for your AssetCare360 account. If you made this request, click the button below to reset your password:</p>
                    <div style='text-align: center;'>
                        <a href='" . htmlspecialchars($resetLink) . "' class='button'>Reset Password</a>
                    </div>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style='background: white; padding: 10px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 12px;'>" . htmlspecialchars($resetLink) . "</p>
                    <div class='warning'>
                        <strong>⚠️ Important:</strong> This link will expire in 1 hour.
                    </div>
                    <p><strong>If you didn't request a password reset,</strong> you can safely ignore this email. Your password will remain unchanged.</p>
                </div>
                <div class='footer'>
                    <p>© 2025 AssetCare360. All rights reserved.</p>
                    <p>This is an automated message, please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        ";
        
        // Set email headers for HTML
        $headers = "From: AssetCare360 <noreply@assetcare360.com>\r\n";
        $headers .= "Reply-To: support@assetcare360.com\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        
        // Send email
        $mailSent = mail($email, $subject, $message, $headers);
        
        // Log result
        if ($mailSent) {
            error_log("Password reset email sent to: $email");
        } else {
            error_log("Failed to send password reset email to: $email");
        }
        
        return $mailSent;
    }
    
    /**
     * Reset password using token
     */
    public function resetPassword($token, $newPassword) {
        if (empty($token) || empty($newPassword)) {
            return [
                'success' => false,
                'message' => 'Token and new password are required'
            ];
        }
        
        // Validate new password
        if (strlen($newPassword) < 6) {
            return [
                'success' => false,
                'message' => 'New password must be at least 6 characters long'
            ];
        }
        
        // Find user by reset token
        $user = $this->userModel->findByPasswordResetToken($token);
        
        if (!$user) {
            return [
                'success' => false,
                'message' => 'Invalid or expired reset token'
            ];
        }
        
        // Update password
        $this->userModel->updatePassword($user['id'], $newPassword);
        
        // Clear reset token
        $this->userModel->clearPasswordResetToken($user['id']);
        
        return [
            'success' => true,
            'message' => 'Password reset successfully. You can now log in with your new password.'
        ];
    }
}
