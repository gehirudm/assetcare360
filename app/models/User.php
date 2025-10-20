<?php

require_once __DIR__ . '/BaseModel.php';

/**
 * User Model
 * Handles user authentication and management
 */
class User extends BaseModel {
    protected $table = 'users';
    
    /**
     * Define table schema
     */
    protected function getSchema() {
        return [
            'id' => 'INT AUTO_INCREMENT PRIMARY KEY',
            'employee_id' => 'VARCHAR(100) UNIQUE NOT NULL',
            'password' => 'VARCHAR(255) NOT NULL',
            'full_name' => 'VARCHAR(255) NOT NULL',
            'role' => "ENUM('Admin', 'Inventory Manager', 'Machinary Operator', 'Driver', 'Supervisor') NOT NULL",
            'email' => 'VARCHAR(255) NULL',
            'phone' => 'VARCHAR(20) NULL',
            'is_active' => 'TINYINT(1) DEFAULT 1',
            'last_login' => 'TIMESTAMP NULL',
            'created_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
            'updated_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        ];
    }
    
    /**
     * Find user by employee ID
     */
    public function findByEmployeeId($employeeId) {
        return $this->findOne(['employee_id' => $employeeId]);
    }
    
    /**
     * Verify user password
     */
    public function verifyPassword($password, $hashedPassword) {
        return password_verify($password, $hashedPassword);
    }
    
    /**
     * Hash password
     */
    public function hashPassword($password) {
        return password_hash($password, PASSWORD_DEFAULT);
    }
    
    /**
     * Create a new user
     */
    public function createUser($data) {
        // Hash password before storing
        if (isset($data['password'])) {
            $data['password'] = $this->hashPassword($data['password']);
        }
        
        return $this->create($data);
    }
    
    /**
     * Update user's last login timestamp
     */
    public function updateLastLogin($userId) {
        $sql = "UPDATE `{$this->table}` SET last_login = NOW() WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$userId]);
    }
    
    /**
     * Get user by ID without password
     */
    public function getUserById($id) {
        $user = $this->findById($id);
        if ($user) {
            unset($user['password']);
        }
        return $user;
    }
    
    /**
     * Get all active users
     */
    public function getActiveUsers() {
        $users = $this->findAll(['is_active' => 1], 'full_name ASC');
        // Remove passwords from results
        return array_map(function($user) {
            unset($user['password']);
            return $user;
        }, $users);
    }
    
    /**
     * Deactivate user
     */
    public function deactivateUser($userId) {
        return $this->update($userId, ['is_active' => 0]);
    }
    
    /**
     * Activate user
     */
    public function activateUser($userId) {
        return $this->update($userId, ['is_active' => 1]);
    }
    
    /**
     * Update user password
     */
    public function updatePassword($userId, $newPassword) {
        $hashedPassword = $this->hashPassword($newPassword);
        return $this->update($userId, ['password' => $hashedPassword]);
    }
    
    /**
     * Check if employee ID exists
     */
    public function employeeIdExists($employeeId, $excludeUserId = null) {
        $sql = "SELECT COUNT(*) as count FROM `{$this->table}` WHERE employee_id = ?";
        $params = [$employeeId];
        
        if ($excludeUserId) {
            $sql .= " AND id != ?";
            $params[] = $excludeUserId;
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch();
        
        return $result['count'] > 0;
    }
}
