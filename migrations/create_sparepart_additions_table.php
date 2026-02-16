<?php
/**
 * Migration: Create sparepart_additions table
 * This table tracks the history of all stock additions to spareparts
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $db = Database::getInstance()->getConnection();
    
    echo "Starting migration: create_sparepart_additions_table\n";
    
    // Check if table already exists
    $checkStmt = $db->prepare("SHOW TABLES LIKE 'sparepart_additions'");
    $checkStmt->execute();
    
    if ($checkStmt->rowCount() > 0) {
        echo "Table 'sparepart_additions' already exists.\n";
        exit(0);
    }
    
    // Create the table
    $sql = "CREATE TABLE sparepart_additions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sparepart_id VARCHAR(50) NOT NULL,
        sparepart_name VARCHAR(255) NOT NULL,
        quantity_added INT NOT NULL,
        previous_stock INT NOT NULL,
        new_stock INT NOT NULL,
        received_date DATE NOT NULL,
        supplier VARCHAR(255) NULL,
        reference VARCHAR(255) NULL,
        notes TEXT NULL,
        added_by VARCHAR(100) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_sparepart_id (sparepart_id),
        INDEX idx_received_date (received_date),
        INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $db->exec($sql);
    
    echo "✓ Successfully created 'sparepart_additions' table\n";
    echo "Migration completed successfully!\n";
    
} catch (PDOException $e) {
    echo "❌ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
