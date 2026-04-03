<?php
/**
 * Migration: Create sparepart_usage table
 * This table tracks the history of all sparepart issuances
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $db = Database::getInstance()->getConnection();
    
    echo "Starting migration: create_sparepart_usage_table\n";
    
    // Check if table already exists
    $checkStmt = $db->prepare("SHOW TABLES LIKE 'sparepart_usage'");
    $checkStmt->execute();
    
    if ($checkStmt->rowCount() > 0) {
        echo "Table 'sparepart_usage' already exists.\n";
        exit(0);
    }
    
    // Create the table
    $sql = "CREATE TABLE sparepart_usage (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sparepart_id VARCHAR(50) NOT NULL,
        sparepart_name VARCHAR(255) NOT NULL,
        quantity_issued INT NOT NULL,
        issue_date DATE NOT NULL,
        issued_by INT NULL,
        machine_id VARCHAR(50) NULL,
        vehicle_id VARCHAR(50) NULL,
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sparepart_id (sparepart_id),
        INDEX idx_issue_date (issue_date),
        INDEX idx_issued_by (issued_by)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $db->exec($sql);
    
    echo "✓ Successfully created 'sparepart_usage' table\n";
    echo "Migration completed successfully!\n";
    
} catch (PDOException $e) {
    echo "❌ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
