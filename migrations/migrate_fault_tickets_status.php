<?php

/**
 * Migration: Update Fault Tickets Status ENUM
 * Adds new statuses: Assigned, Waiting for Budget Approval, Waiting for Spare Parts
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $database = Database::getInstance();
    $db = $database->getConnection();
    
    echo "Starting fault_tickets status migration...\n\n";
    
    // Update the status column to include new statuses
    echo "Updating status ENUM column...\n";
    $sql = "ALTER TABLE `fault_tickets` 
            MODIFY COLUMN `status` ENUM(
                'Open', 
                'Assigned', 
                'Waiting for Budget Approval', 
                'Waiting for Spare Parts', 
                'In Progress', 
                'Resolved', 
                'Closed'
            ) NOT NULL DEFAULT 'Open'";
    
    $db->exec($sql);
    echo "✓ Status column updated successfully\n\n";
    
    // Verify the change
    echo "Verifying changes...\n";
    $verify = $db->query("SHOW COLUMNS FROM `fault_tickets` LIKE 'status'");
    $statusColumn = $verify->fetch(PDO::FETCH_ASSOC);
    
    echo "Status column type: " . $statusColumn['Type'] . "\n";
    echo "\n✓ Migration completed successfully!\n";
    
} catch (PDOException $e) {
    echo "❌ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
