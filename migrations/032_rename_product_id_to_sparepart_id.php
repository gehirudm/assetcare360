<?php
/**
 * Migration: Rename product_id to sparepart_id
 * Date: 2026-02-07
 * Description: Renames product_id column to sparepart_id to match spareparts table
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $db = Database::getInstance()->getConnection();
    
    echo "Starting migration: Rename product_id to sparepart_id\n";
    echo "======================================================\n\n";
    
    // Check if spareparts table exists
    $tableCheck = $db->query("SHOW TABLES LIKE 'spareparts'");
    
    if ($tableCheck->rowCount() === 0) {
        echo "! spareparts table does not exist. Skipping migration.\n";
        exit(0);
    }
    
    // Check if product_id column exists
    $productIdCheck = $db->query("SHOW COLUMNS FROM spareparts LIKE 'product_id'");
    
    if ($productIdCheck->rowCount() === 0) {
        echo "! product_id column does not exist. May already be renamed.\n";
        exit(0);
    }
    
    // Check if sparepart_id already exists
    $sparepartIdCheck = $db->query("SHOW COLUMNS FROM spareparts LIKE 'sparepart_id'");
    
    if ($sparepartIdCheck->rowCount() > 0) {
        echo "! sparepart_id column already exists. Skipping migration.\n";
        exit(0);
    }
    
    echo "Renaming product_id column to sparepart_id...\n";
    $db->exec("ALTER TABLE spareparts CHANGE COLUMN product_id sparepart_id VARCHAR(50) UNIQUE NOT NULL");
    echo "✓ Column renamed successfully\n\n";
    
    echo "======================================================\n";
    echo "Migration completed successfully!\n";
    echo "Column 'product_id' has been renamed to 'sparepart_id'\n";
    
} catch (PDOException $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
