<?php
/**
 * Migration: Rename fault_tickets table to machine_breakdown
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    echo "Starting migration: Rename fault_tickets table to machine_breakdown\n";
    
    $db = Database::getInstance()->getConnection();
    
    // Check if fault_tickets table exists
    $checkTable = $db->query("SHOW TABLES LIKE 'fault_tickets'")->fetch();
    
    if (!$checkTable) {
        echo "✗ Table 'fault_tickets' does not exist. Nothing to rename.\n";
        exit(1);
    }
    
    // Check if machine_breakdown table already exists
    $checkNewTable = $db->query("SHOW TABLES LIKE 'machine_breakdown'")->fetch();
    
    if ($checkNewTable) {
        echo "✗ Table 'machine_breakdown' already exists. Cannot rename.\n";
        exit(1);
    }
    
    echo "✓ Table 'fault_tickets' found. Proceeding with rename...\n";
    
    // Rename the table
    $db->exec("RENAME TABLE fault_tickets TO machine_breakdown");
    
    echo "✓ Successfully renamed table from 'fault_tickets' to 'machine_breakdown'\n";
    
    // Verify the rename
    $verify = $db->query("SHOW TABLES LIKE 'machine_breakdown'")->fetch();
    
    if ($verify) {
        echo "✓ Verification successful: 'machine_breakdown' table exists\n";
        
        // Show table structure
        $columns = $db->query("SHOW COLUMNS FROM machine_breakdown")->fetchAll();
        echo "\nTable structure:\n";
        foreach ($columns as $column) {
            echo "  - {$column['Field']} ({$column['Type']})\n";
        }
        
        // Show row count
        $count = $db->query("SELECT COUNT(*) FROM machine_breakdown")->fetchColumn();
        echo "\nTotal records: $count\n";
    } else {
        echo "✗ Verification failed: 'machine_breakdown' table not found\n";
        exit(1);
    }
    
    echo "\n✅ Migration completed successfully!\n";
    
} catch (Exception $e) {
    echo "✗ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
