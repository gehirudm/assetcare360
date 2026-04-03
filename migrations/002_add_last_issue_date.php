<?php
/**
 * Migration: Add last_issue_date column to spareparts table
 * This column tracks when a sparepart was last issued to a machine or vehicle
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $db = Database::getInstance()->getConnection();
    
    echo "Starting migration: add_last_issue_date\n";
    
    // Check if column already exists
    $checkStmt = $db->prepare("
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'spareparts' 
        AND COLUMN_NAME = 'last_issue_date'
    ");
    $checkStmt->execute();
    $result = $checkStmt->fetch(PDO::FETCH_ASSOC);
    
    if ($result['count'] > 0) {
        echo "Column 'last_issue_date' already exists in spareparts table.\n";
        exit(0);
    }
    
    // Add the column
    $db->exec("
        ALTER TABLE spareparts 
        ADD COLUMN last_issue_date DATE NULL 
        AFTER updated_at
    ");
    
    echo "✓ Successfully added 'last_issue_date' column to spareparts table\n";
    echo "Migration completed successfully!\n";
    
} catch (PDOException $e) {
    echo "❌ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
