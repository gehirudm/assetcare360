<?php
/**
 * Migration: Remove fuel_efficiency column from vehicles table
 * Date: 2026-02-07
 * Description: Removes the fuel_efficiency column as it's no longer needed
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $db = Database::getInstance()->getConnection();
    
    echo "Starting migration: Remove fuel_efficiency column\n";
    echo "==============================================\n\n";
    
    // Check if fuel_efficiency column exists
    $checkColumn = $db->query("SHOW COLUMNS FROM vehicles LIKE 'fuel_efficiency'");
    
    if ($checkColumn->rowCount() > 0) {
        echo "Removing fuel_efficiency column from vehicles table...\n";
        
        // Drop the column
        $db->exec("ALTER TABLE vehicles DROP COLUMN fuel_efficiency");
        
        echo "✓ fuel_efficiency column removed successfully\n\n";
    } else {
        echo "! fuel_efficiency column does not exist, skipping removal\n\n";
    }
    
    echo "==============================================\n";
    echo "Migration completed successfully!\n";
    
} catch (PDOException $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
