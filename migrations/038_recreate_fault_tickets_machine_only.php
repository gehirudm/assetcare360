<?php
/**
 * Migration: Recreate fault_tickets table without vehicle data
 * This creates a clean fault_tickets table for machinery only
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    echo "Starting migration: Recreate fault_tickets table without vehicle data\n";
    
    $db = Database::getInstance()->getConnection();
    
    // Drop existing fault_tickets table if it exists
    $checkTable = $db->query("SHOW TABLES LIKE 'fault_tickets'")->fetch();
    
    if ($checkTable) {
        echo "✓ Found existing fault_tickets table. Dropping it...\n";
        $db->exec("DROP TABLE fault_tickets");
        echo "✓ Dropped existing fault_tickets table\n";
    }
    
    // Create new fault_tickets table without vehicle columns
    echo "\nCreating new fault_tickets table (machinery only)...\n";
    
    $sql = "CREATE TABLE `fault_tickets` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `ticket_id` VARCHAR(50) NOT NULL UNIQUE,
        `machine_id` INT NOT NULL,
        `reported_by` INT NOT NULL,
        `description` TEXT NOT NULL,
        `priority` ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL DEFAULT 'Medium',
        `location` VARCHAR(255) NULL,
        `status` ENUM('Open', 'Assigned', 'In Progress', 'Resolved', 'Closed') NOT NULL DEFAULT 'Open',
        `resolved_at` DATETIME NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX `idx_machine_id` (`machine_id`),
        INDEX `idx_reported_by` (`reported_by`),
        INDEX `idx_status` (`status`),
        INDEX `idx_ticket_id` (`ticket_id`),
        FOREIGN KEY (`machine_id`) REFERENCES `machines`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`reported_by`) REFERENCES `users`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
    
    $db->exec($sql);
    
    echo "✓ Successfully created fault_tickets table\n";
    
    // Verify the creation
    $verify = $db->query("SHOW TABLES LIKE 'fault_tickets'")->fetch();
    
    if ($verify) {
        echo "✓ Verification successful: fault_tickets table exists\n";
        
        // Show table structure
        echo "\nTable structure:\n";
        $columns = $db->query("SHOW COLUMNS FROM fault_tickets")->fetchAll();
        foreach ($columns as $column) {
            echo "  - {$column['Field']} ({$column['Type']})\n";
        }
        
        echo "\n✅ Migration completed successfully!\n";
        echo "📋 fault_tickets table now contains ONLY machinery fault tickets\n";
        echo "🚗 Vehicle breakdown data remains in vehicle_breakdown table\n";
    } else {
        echo "✗ Verification failed: fault_tickets table not found\n";
        exit(1);
    }
    
} catch (Exception $e) {
    echo "✗ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
