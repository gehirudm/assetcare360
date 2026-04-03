<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $db = Database::getInstance()->getConnection();

    echo "Creating api_request_logs table...\n";

    $sql = "CREATE TABLE IF NOT EXISTS api_request_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        employee_id VARCHAR(100) NULL,
        method VARCHAR(10) NOT NULL,
        endpoint VARCHAR(255) NOT NULL,
        action VARCHAR(255) NULL,
        category VARCHAR(100) NULL,
        request_body TEXT NULL,
        response_code INT NULL,
        ip_address VARCHAR(45) NOT NULL,
        user_agent TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_category (category),
        INDEX idx_action (action),
        INDEX idx_created_at (created_at),
        INDEX idx_endpoint (endpoint)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

    $db->exec($sql);
    echo "✓ api_request_logs table created successfully!\n";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
