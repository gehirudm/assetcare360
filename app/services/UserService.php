<?php

require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/MailhogEmailService.php';

/**
 * User Service
 * Handles user management business logic
 */
class UserService {
    private $userModel;
    private $emailService;
    
    public function __construct() {
        $this->userModel = new User();
        $this->emailService = null;
    }
    
    /**
     * Create a new user
     */
    public function createUser($data, $sendWelcomeEmail = false) {
        $this->normalizeTechnicalExpertiseData($data, $data['role'] ?? null, true);

        // Validation
        $errors = $this->validateUserData($data, null, $data['role'] ?? null);
        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $errors
            ];
        }
        
        // Check if employee ID already exists
        if ($this->userModel->employeeIdExists($data['employee_id'])) {
            return [
                'success' => false,
                'message' => 'Employee ID already exists'
            ];
        }
        
        // Check if email already exists (if provided)
        if (!empty($data['email']) && $this->userModel->emailExists($data['email'])) {
            return [
                'success' => false,
                'message' => 'Email address already exists'
            ];
        }
        
        // Always track the temporary password for first-login onboarding email.
        $temporaryPassword = isset($data['password']) ? trim((string) $data['password']) : '';
        if ($temporaryPassword === '') {
            $temporaryPassword = $this->userModel->generateRandomPassword();
            $data['password'] = $temporaryPassword;
        } else {
            $data['password'] = $temporaryPassword;
        }

        // Admin-created accounts should always change password at first login.
        $data['force_password_change'] = 1;
        
        // Create user
        $userId = $this->userModel->createUser($data);
        
        if (!$userId) {
            return [
                'success' => false,
                'message' => 'Failed to create user'
            ];
        }
        
        $user = $this->userModel->getUserById($userId);
        
        $response = [
            'success' => true,
            'message' => 'User created successfully',
            'data' => $user
        ];
        
        // Include the temporary password used so callers can relay it securely.
        $response['temporary_password'] = $temporaryPassword;
        
        // TODO: Send welcome email if requested
        if ($sendWelcomeEmail && !empty($data['email'])) {
            // Email sending logic here
            $response['email_sent'] = true;
        }
        
        return $response;
    }
    
    /**
     * Update user
     */
    public function updateUser($userId, $data) {
        // Check if user exists
        $user = $this->userModel->getUserById($userId);
        if (!$user) {
            return [
                'success' => false,
                'message' => 'User not found'
            ];
        }

        $effectiveRole = $data['role'] ?? $user['role'];
        $this->normalizeTechnicalExpertiseData($data, $effectiveRole, false);
        
        // Validation
        $errors = $this->validateUserData($data, $userId, $effectiveRole);
        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $errors
            ];
        }
        
        // Check if email exists (if being changed)
        if (isset($data['email']) && $data['email'] !== $user['email']) {
            if ($this->userModel->emailExists($data['email'], $userId)) {
                return [
                    'success' => false,
                    'message' => 'Email address already exists'
                ];
            }
        }
        
        // Update user
        $success = $this->userModel->updateUser($userId, $data);
        
        if (!$success) {
            return [
                'success' => false,
                'message' => 'Failed to update user or employee ID already exists'
            ];
        }
        
        $updatedUser = $this->userModel->getUserById($userId);
        
        return [
            'success' => true,
            'message' => 'User updated successfully',
            'data' => $updatedUser
        ];
    }
    
    /**
     * Delete user (soft delete by deactivating)
     */
    public function deleteUser($userId) {
        $user = $this->userModel->getUserById($userId);
        
        if (!$user) {
            return [
                'success' => false,
                'message' => 'User not found'
            ];
        }
        
        // Deactivate instead of hard delete
        $success = $this->userModel->deactivateUser($userId);
        
        if ($success) {
            return [
                'success' => true,
                'message' => 'User deactivated successfully'
            ];
        } else {
            return [
                'success' => false,
                'message' => 'Failed to deactivate user'
            ];
        }
    }
    
    /**
     * Get user by ID
     */
    public function getUser($userId) {
        $user = $this->userModel->getUserById($userId);
        
        if (!$user) {
            return [
                'success' => false,
                'message' => 'User not found'
            ];
        }
        
        return [
            'success' => true,
            'data' => $user
        ];
    }
    
    /**
     * Get all users with filters
     */
    public function getAllUsers($filters = [], $search = null, $page = 1, $limit = 20) {
        $offset = ($page - 1) * $limit;
        
        $users = $this->userModel->getAllUsers($filters, $search, 'full_name ASC', $limit, $offset);
        $total = $this->userModel->getUserCount($filters, $search);
        
        return [
            'success' => true,
            'data' => [
                'users' => $users,
                'pagination' => [
                    'page' => (int) $page,
                    'limit' => (int) $limit,
                    'total' => $total,
                    'pages' => ceil($total / $limit)
                ]
            ]
        ];
    }
    
    /**
     * Activate user
     */
    public function activateUser($userId) {
        $user = $this->userModel->getUserById($userId);
        
        if (!$user) {
            return [
                'success' => false,
                'message' => 'User not found'
            ];
        }
        
        $success = $this->userModel->activateUser($userId);
        
        if ($success) {
            return [
                'success' => true,
                'message' => 'User activated successfully'
            ];
        } else {
            return [
                'success' => false,
                'message' => 'Failed to activate user'
            ];
        }
    }

    /**
     * Reset user password and optionally send reset email notification
     */
    public function resetUserPassword($userId, $sendEmailNotification = true) {
        $user = $this->userModel->getUserById($userId);

        if (!$user) {
            return [
                'success' => false,
                'message' => 'User not found',
                'status_code' => 404,
            ];
        }

        $temporaryPassword = $this->userModel->generateRandomPassword();
        $passwordUpdated = $this->userModel->updatePassword($userId, $temporaryPassword);

        if (!$passwordUpdated) {
            return [
                'success' => false,
                'message' => 'Failed to reset password',
                'status_code' => 500,
            ];
        }

        $flagUpdated = $this->userModel->update($userId, ['force_password_change' => 1]);
        if (!$flagUpdated) {
            return [
                'success' => false,
                'message' => 'Password reset succeeded, but failed to enforce password change on next login',
                'status_code' => 500,
            ];
        }

        $emailSent = false;
        $emailSkippedReason = null;

        if ($sendEmailNotification) {
            $email = trim((string)($user['email'] ?? ''));
            if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $emailSkippedReason = 'User does not have a valid email address.';
            } else {
                $emailSent = $this->sendTemporaryPasswordEmail($user, $temporaryPassword);
                if (!$emailSent) {
                    $emailSkippedReason = 'Password was reset, but email notification could not be sent.';
                }
            }
        } else {
            $emailSkippedReason = 'Email notification disabled for this request.';
        }

        $message = 'Password reset successfully. User will be required to change password on next login.';
        if ($sendEmailNotification && !$emailSent) {
            $message .= ' Email delivery failed. Share the temporary password securely with the user.';
        }

        return [
            'success' => true,
            'message' => $message,
            'data' => [
                'temporary_password' => $temporaryPassword,
                'email_sent' => $emailSent,
                'email_skipped_reason' => $emailSkippedReason,
            ],
        ];
    }
    
    /**
     * Get user statistics
     */
    public function getUserStatistics() {
        return [
            'success' => true,
            'data' => $this->userModel->getUserStats()
        ];
    }

    /**
     * Send temporary password email using the MailHog email service
     */
    private function sendTemporaryPasswordEmail($user, $temporaryPassword) {
        $recipientEmail = trim((string)($user['email'] ?? ''));
        if ($recipientEmail === '' || !filter_var($recipientEmail, FILTER_VALIDATE_EMAIL)) {
            return false;
        }

        if ($this->emailService === null) {
            try {
                $this->emailService = new MailhogEmailService();
            } catch (Throwable $e) {
                error_log('Failed to initialize MailhogEmailService: ' . $e->getMessage());
                return false;
            }
        }

        $recipientName = trim((string)($user['full_name'] ?? 'User'));
        $employeeId = trim((string)($user['employee_id'] ?? 'N/A'));
        $loginUrl = rtrim(FRONTEND_BASE_URL, '/') . '/auth/login.html';

        $safeRecipientName = htmlspecialchars($recipientName, ENT_QUOTES, 'UTF-8');
        $safeEmployeeId = htmlspecialchars($employeeId, ENT_QUOTES, 'UTF-8');
        $safeTemporaryPassword = htmlspecialchars($temporaryPassword, ENT_QUOTES, 'UTF-8');
        $safeLoginUrl = htmlspecialchars($loginUrl, ENT_QUOTES, 'UTF-8');

        $subject = 'AssetCare360 - Password Reset by Administrator';
        $body = "
        <html>
        <body style='font-family: Arial, sans-serif; background: #f7f9fb; margin: 0; padding: 20px;'>
            <div style='max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;'>
                <div style='background: #1d4ed8; color: #ffffff; padding: 18px 24px;'>
                    <h2 style='margin: 0; font-size: 20px;'>AssetCare360 Password Reset</h2>
                </div>
                <div style='padding: 20px 24px;'>
                    <p style='margin-top: 0;'>Hello {$safeRecipientName},</p>
                    <p>Your password has been reset by an administrator.</p>
                    <p style='margin: 16px 0;'>
                        <strong>Employee ID:</strong> {$safeEmployeeId}<br>
                        <strong>Temporary Password:</strong> {$safeTemporaryPassword}
                    </p>
                    <p>Please sign in using the temporary password and change it immediately.</p>
                    <p>
                        <a href='{$safeLoginUrl}' style='display: inline-block; background: #2563eb; color: #ffffff; padding: 10px 14px; border-radius: 6px; text-decoration: none;'>
                            Open Login Page
                        </a>
                    </p>
                    <p style='color: #6b7280; font-size: 13px; margin-bottom: 0;'>
                        This is an automated message from AssetCare360.
                    </p>
                </div>
            </div>
        </body>
        </html>
        ";

        return $this->emailService->send($recipientEmail, $subject, $body, $recipientName);
    }

    /**
     * Get active technical officers with workload information
     */
    public function getTechniciansWithWorkload() {
        try {
            $technicians = $this->userModel->getTechnicalOfficersWithWorkload(true);

            return [
                'success' => true,
                'data' => [
                    'users' => $technicians
                ]
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to load technicians: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get active drivers with workload information (active trip count)
     */
    public function getDriversWithWorkload() {
        try {
            $drivers = $this->userModel->getDriversWithWorkload(true);

            return [
                'success' => true,
                'data' => [
                    'users' => $drivers
                ]
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to load drivers: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Validate user data
     */
    private function validateUserData($data, $userId = null, $effectiveRole = null) {
        $errors = [];
        
        // Employee ID is required for new users
        if (!$userId && empty($data['employee_id'])) {
            $errors['employee_id'] = 'Employee ID is required';
        }
        
        // Full name is required
        if (empty($data['full_name'])) {
            $errors['full_name'] = 'Full name is required';
        }
        
        // Role is required
        if (empty($data['role'])) {
            if (!$userId) {
                $errors['role'] = 'Role is required';
            }
        } else {
            $validRoles = [
                'Admin',
                'Maintenance Manager',
                'Inventory Manager',
                'Transportation Manager',
                'Technical Officer',
                'Supervisor',
                'Machinary Operator',
                'Driver',
                'Auction Officer'
            ];
            if (!in_array($data['role'], $validRoles)) {
                $errors['role'] = 'Invalid role';
            }
        }

        $resolvedRole = $effectiveRole ?? ($data['role'] ?? null);

        if ($resolvedRole === 'Technical Officer') {
            if (array_key_exists('technical_expertise', $data)) {
                $expertise = trim((string)$data['technical_expertise']);
                if ($expertise === '') {
                    $errors['technical_expertise'] = 'Technical expertise is required for Technical Officer role';
                } elseif (strlen($expertise) > 100) {
                    $errors['technical_expertise'] = 'Technical expertise must be 100 characters or less';
                }
            } elseif (!$userId) {
                $errors['technical_expertise'] = 'Technical expertise is required for Technical Officer role';
            }
        } elseif (array_key_exists('technical_expertise', $data) && $data['technical_expertise'] !== null) {
            $expertise = trim((string)$data['technical_expertise']);
            if ($expertise !== '' && strlen($expertise) > 100) {
                $errors['technical_expertise'] = 'Technical expertise must be 100 characters or less';
            }
        }
        
        // Email validation (if provided)
        if (!empty($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Invalid email address';
        }
        
        // Phone validation (if provided)
        if (!empty($data['phone']) && !preg_match('/^\+?[0-9\s\-()]+$/', $data['phone'])) {
            $errors['phone'] = 'Invalid phone number';
        }
        
        return $errors;
    }

    /**
     * Normalize technical expertise values before validation/persistence
     */
    private function normalizeTechnicalExpertiseData(&$data, $effectiveRole = null, $isCreate = false) {
        if ($effectiveRole === 'Technical Officer') {
            if (array_key_exists('technical_expertise', $data)) {
                $expertise = trim((string)$data['technical_expertise']);
                $data['technical_expertise'] = $expertise !== '' ? $expertise : 'General';
                return;
            }

            if ($isCreate || (isset($data['role']) && $data['role'] === 'Technical Officer')) {
                $data['technical_expertise'] = 'General';
            }

            return;
        }

        if (isset($data['role']) && $data['role'] !== 'Technical Officer') {
            $data['technical_expertise'] = null;
            return;
        }

        if (array_key_exists('technical_expertise', $data)) {
            $expertise = trim((string)$data['technical_expertise']);
            $data['technical_expertise'] = $expertise !== '' ? $expertise : null;
        }
    }
}
