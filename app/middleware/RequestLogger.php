<?php

/**
 * Request Logger Middleware
 * Automatically logs all API requests with user information
 */
class RequestLogger {
    private $db;
    private $table = 'api_request_logs';
    
    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
        $this->createTableIfNotExists();
    }
    
    /**
     * Create request logs table if it doesn't exist
     */
    private function createTableIfNotExists() {
        $sql = "CREATE TABLE IF NOT EXISTS `{$this->table}` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `user_id` INT NULL,
            `employee_id` VARCHAR(100) NULL,
            `method` VARCHAR(10) NOT NULL,
            `endpoint` VARCHAR(255) NOT NULL,
            `action` VARCHAR(255) NULL,
            `category` VARCHAR(100) NULL,
            `request_body` TEXT NULL,
            `response_code` INT NULL,
            `ip_address` VARCHAR(45) NOT NULL,
            `user_agent` TEXT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX `idx_user_id` (`user_id`),
            INDEX `idx_category` (`category`),
            INDEX `idx_action` (`action`),
            INDEX `idx_created_at` (`created_at`),
            INDEX `idx_endpoint` (`endpoint`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
        
        try {
            $this->db->exec($sql);
        } catch (PDOException $e) {
            error_log("Error creating request logs table: " . $e->getMessage());
        }
    }
    
    /**
     * Log the API request
     */
    public function log($user = null, $responseCode = null) {
        if (!LOG_REQUESTS) {
            return;
        }
        
        $method = $_SERVER['REQUEST_METHOD'];
        $endpoint = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $requestBody = file_get_contents('php://input');
        $ipAddress = $this->getClientIp();
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;
        
        // Get endpoint metadata from registry
        require_once __DIR__ . '/../config/EndpointRegistry.php';
        $metadata = EndpointRegistry::getEndpointMetadata($method, $endpoint);
        
        // Sanitize sensitive data from request body
        $sanitizedBody = $this->sanitizeRequestBody($requestBody);
        
        $sql = "INSERT INTO `{$this->table}` 
                (`user_id`, `employee_id`, `method`, `endpoint`, `action`, `category`, `request_body`, `response_code`, `ip_address`, `user_agent`) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $user['id'] ?? null,
            $user['employee_id'] ?? null,
            $method,
            $endpoint,
            $metadata['action'],
            $metadata['category'],
            $sanitizedBody,
            $responseCode,
            $ipAddress,
            $userAgent
        ]);
    }
    
    /**
     * Get client IP address
     */
    private function getClientIp() {
        $ipKeys = ['HTTP_CLIENT_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_FORWARDED', 
                   'HTTP_FORWARDED_FOR', 'HTTP_FORWARDED', 'REMOTE_ADDR'];
        
        foreach ($ipKeys as $key) {
            if (array_key_exists($key, $_SERVER)) {
                $ip = explode(',', $_SERVER[$key])[0];
                if (filter_var($ip, FILTER_VALIDATE_IP)) {
                    return $ip;
                }
            }
        }
        
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }
    
    /**
     * Sanitize request body to remove sensitive data
     */
    private function sanitizeRequestBody($body) {
        if (empty($body)) {
            return null;
        }
        
        $data = json_decode($body, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            // Remove sensitive fields
            $sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'api_key'];
            foreach ($sensitiveFields as $field) {
                if (isset($data[$field])) {
                    $data[$field] = '***REDACTED***';
                }
            }
            return json_encode($data);
        }
        
        return $body;
    }
    
    /**
     * Get logs with optional filters
     */
    public function getLogs($filters = [], $limit = 100) {
        $sql = "SELECT * FROM `{$this->table}`";
        $params = [];
        $where = [];
        
        if (!empty($filters['user_id'])) {
            $where[] = "`user_id` = ?";
            $params[] = $filters['user_id'];
        }
        
        if (!empty($filters['method'])) {
            $where[] = "`method` = ?";
            $params[] = $filters['method'];
        }
        
        if (!empty($filters['endpoint'])) {
            $where[] = "`endpoint` LIKE ?";
            $params[] = '%' . $filters['endpoint'] . '%';
        }
        
        if (!empty($where)) {
            $sql .= " WHERE " . implode(' AND ', $where);
        }
        
        $sql .= " ORDER BY created_at DESC LIMIT ?";
        $params[] = $limit;
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }
}
