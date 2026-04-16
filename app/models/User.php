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
            'role' => "ENUM('Admin', 'Maintenance Manager', 'Inventory Manager', 'Transportation Manager', 'Technical Officer', 'Supervisor', 'Machinary Operator', 'Driver', 'Auction Officer') NOT NULL",
            'technical_expertise' => 'VARCHAR(100) NULL',
            'department' => 'VARCHAR(100) NULL',
            'email' => 'VARCHAR(255) NULL',
            'phone' => 'VARCHAR(20) NULL',
            'is_active' => 'TINYINT(1) DEFAULT 1',
            'force_password_change' => 'TINYINT(1) DEFAULT 0',
            'password_reset_token' => 'VARCHAR(255) NULL',
            'password_reset_expires' => 'TIMESTAMP NULL',
            'last_login' => 'TIMESTAMP NULL',
            'created_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
            'updated_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        ];
    }
    
    /**
     * Get additional indexes for the table
     */
    protected function getIndexes() {
        return [
            'idx_role' => 'role',
            'idx_technical_expertise' => 'technical_expertise',
            'idx_active' => 'is_active',
            'idx_department' => 'department'
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
    
    /**
     * Get all users with optional filters
     * @param array $filters - ['role' => 'Admin', 'is_active' => 1, 'department' => 'IT']
     * @param string $search - Search term for full_name or employee_id
     * @param string $orderBy - Order by clause (default: 'full_name ASC')
     * @param int $limit - Limit number of results
     * @param int $offset - Offset for pagination
     */
    public function getAllUsers($filters = [], $search = null, $orderBy = 'full_name ASC', $limit = null, $offset = 0) {
        $sql = "SELECT * FROM `{$this->table}` WHERE 1=1";
        $params = [];
        
        // Apply filters
        if (!empty($filters['role'])) {
            $sql .= " AND role = ?";
            $params[] = $filters['role'];
        }
        
        if (isset($filters['is_active'])) {
            $sql .= " AND is_active = ?";
            $params[] = $filters['is_active'];
        }
        
        if (!empty($filters['department'])) {
            $sql .= " AND department = ?";
            $params[] = $filters['department'];
        }
        
        // Apply search
        if ($search) {
            $sql .= " AND (full_name LIKE ? OR employee_id LIKE ? OR email LIKE ?)";
            $searchTerm = "%{$search}%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }
        
        // Apply ordering
        $sql .= " ORDER BY {$orderBy}";
        
        // Apply pagination
        if ($limit) {
            $sql .= " LIMIT ? OFFSET ?";
            $params[] = $limit;
            $params[] = $offset;
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $users = $stmt->fetchAll();
        
        // Remove passwords from results
        return array_map(function($user) {
            unset($user['password']);
            return $user;
        }, $users);
    }
    
    /**
     * Get total count of users with filters
     */
    public function getUserCount($filters = [], $search = null) {
        $sql = "SELECT COUNT(*) as count FROM `{$this->table}` WHERE 1=1";
        $params = [];
        
        // Apply filters
        if (!empty($filters['role'])) {
            $sql .= " AND role = ?";
            $params[] = $filters['role'];
        }
        
        if (isset($filters['is_active'])) {
            $sql .= " AND is_active = ?";
            $params[] = $filters['is_active'];
        }
        
        if (!empty($filters['department'])) {
            $sql .= " AND department = ?";
            $params[] = $filters['department'];
        }
        
        // Apply search
        if ($search) {
            $sql .= " AND (full_name LIKE ? OR employee_id LIKE ? OR email LIKE ?)";
            $searchTerm = "%{$search}%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch();
        
        return (int) $result['count'];
    }
    
    /**
     * Update user (excluding password)
     */
    public function updateUser($userId, $data) {
        // Remove password from data if present (use updatePassword for that)
        if (isset($data['password'])) {
            unset($data['password']);
        }
        
        // If employee_id is being changed, check if it already exists
        if (isset($data['employee_id'])) {
            if ($this->employeeIdExists($data['employee_id'], $userId)) {
                return false;
            }
        }
        
        return $this->update($userId, $data);
    }
    
    /**
     * Generate random password
     */
    public function generateRandomPassword($length = 12) {
        $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        $password = '';
        $charLength = strlen($chars);
        
        for ($i = 0; $i < $length; $i++) {
            $password .= $chars[random_int(0, $charLength - 1)];
        }
        
        return $password;
    }
    
    /**
     * Get users by role
     */
    public function getUsersByRole($role) {
        $users = $this->findAll(['role' => $role], 'full_name ASC');
        return array_map(function($user) {
            unset($user['password']);
            return $user;
        }, $users);
    }

    /**
     * Get technical officers with active workload counts
     */
    public function getTechnicalOfficersWithWorkload($activeOnly = true) {
        try {
            $sql = "SELECT u.id,
                           u.employee_id,
                           u.full_name,
                           u.role,
                           u.technical_expertise,
                           u.department,
                           u.email,
                           u.phone,
                           u.is_active,
                           u.last_login,
                           u.created_at,
                           u.updated_at,
                           COALESCE(workload.active_ticket_count, 0) AS active_ticket_count
                    FROM `{$this->table}` u
                    LEFT JOIN (
                        SELECT fta.assigned_to,
                               COUNT(DISTINCT fta.fault_ticket_id) AS active_ticket_count
                        FROM fault_ticket_assignments fta
                        INNER JOIN fault_tickets ft ON ft.id = fta.fault_ticket_id
                        WHERE fta.status = 'Active'
                          AND ft.status NOT IN ('Resolved', 'Closed')
                        GROUP BY fta.assigned_to
                    ) workload ON workload.assigned_to = u.id
                    WHERE u.role = 'Technical Officer'";

            $params = [];
            if ($activeOnly) {
                $sql .= " AND u.is_active = ?";
                $params[] = 1;
            }

            $sql .= " ORDER BY active_ticket_count ASC, u.full_name ASC";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $users = $stmt->fetchAll();

            return array_map(function($user) {
                $expertise = trim((string)($user['technical_expertise'] ?? ''));
                $user['technical_expertise'] = $expertise !== '' ? $expertise : 'General';
                return $user;
            }, $users);
        } catch (\Exception $e) {
            $filters = ['role' => 'Technical Officer'];
            if ($activeOnly) {
                $filters['is_active'] = 1;
            }

            $users = $this->getAllUsers($filters, null, 'full_name ASC');

            return array_map(function($user) {
                $expertise = trim((string)($user['technical_expertise'] ?? ''));
                $user['technical_expertise'] = $expertise !== '' ? $expertise : 'General';
                $user['active_ticket_count'] = 0;
                return $user;
            }, $users);
        }
    }

    /**
     * Get drivers with active workload counts (active trips)
     */
    public function getDriversWithWorkload($activeOnly = true) {
        try {
            $sql = "SELECT u.id,
                           u.employee_id,
                           u.full_name,
                           u.role,
                           u.department,
                           u.email,
                           u.phone,
                           u.is_active,
                           u.last_login,
                           u.created_at,
                           u.updated_at,
                           COALESCE(workload.active_trip_count, 0) AS active_trip_count
                    FROM `{$this->table}` u
                    LEFT JOIN (
                        SELECT t.driver_id,
                               COUNT(*) AS active_trip_count
                        FROM trips t
                        WHERE t.status IN ('Pending', 'In Progress')
                        GROUP BY t.driver_id
                    ) workload ON workload.driver_id = u.id
                    WHERE u.role = 'Driver'";

            $params = [];
            if ($activeOnly) {
                $sql .= " AND u.is_active = ?";
                $params[] = 1;
            }

            $sql .= " ORDER BY active_trip_count ASC, u.full_name ASC";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchAll();
        } catch (\Exception $e) {
            $filters = ['role' => 'Driver'];
            if ($activeOnly) {
                $filters['is_active'] = 1;
            }

            $users = $this->getAllUsers($filters, null, 'full_name ASC');

            return array_map(function($user) {
                $user['active_trip_count'] = 0;
                return $user;
            }, $users);
        }
    }
    
    /**
     * Get user statistics
     */
    public function getUserStats() {
        $sql = "SELECT 
                    COUNT(*) as total_users,
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
                    SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_users,
                    role,
                    COUNT(*) as role_count
                FROM `{$this->table}`
                GROUP BY role";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        $roleStats = $stmt->fetchAll();
        
        $sql = "SELECT 
                    COUNT(*) as total_users,
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
                    SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_users
                FROM `{$this->table}`";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        $totalStats = $stmt->fetch();
        
        return [
            'total' => $totalStats,
            'by_role' => $roleStats
        ];
    }
    
    /**
     * Check if email exists
     */
    public function emailExists($email, $excludeUserId = null) {
        if (empty($email)) {
            return false;
        }
        
        $sql = "SELECT COUNT(*) as count FROM `{$this->table}` WHERE email = ?";
        $params = [$email];
        
        if ($excludeUserId) {
            $sql .= " AND id != ?";
            $params[] = $excludeUserId;
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch();
        
        return $result['count'] > 0;
    }
    
    /**
     * Store password reset token
     */
    public function storePasswordResetToken($userId, $token, $expiresAt) {
        $sql = "UPDATE `{$this->table}` 
                SET password_reset_token = ?, 
                    password_reset_expires = ? 
                WHERE id = ?";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$token, $expiresAt, $userId]);
    }
    
    /**
     * Find user by password reset token
     */
    public function findByPasswordResetToken($token) {
        $sql = "SELECT * FROM `{$this->table}` 
                WHERE password_reset_token = ? 
                AND password_reset_expires > NOW() 
                AND is_active = 1";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$token]);
        return $stmt->fetch();
    }
    
    /**
     * Clear password reset token
     */
    public function clearPasswordResetToken($userId) {
        $sql = "UPDATE `{$this->table}` 
                SET password_reset_token = NULL, 
                    password_reset_expires = NULL 
                WHERE id = ?";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$userId]);
    }
}
