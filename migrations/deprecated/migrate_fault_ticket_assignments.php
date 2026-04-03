<?php
/**
 * Migration script to recreate fault_ticket_assignments table
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $db = Database::getInstance()->getConnection();
    
    // Drop the old table
    echo "Dropping old fault_ticket_assignments table...\n";
    $db->exec('DROP TABLE IF EXISTS fault_ticket_assignments');
    echo "✓ Table dropped successfully\n\n";
    
    // The table will be recreated automatically when the model is instantiated
    echo "Recreating fault_ticket_assignments table with correct schema...\n";
    require_once __DIR__ . '/../app/models/FaultTicketAssignment.php';
    new FaultTicketAssignment();
    echo "✓ Table created successfully\n\n";
    
    echo "Migration completed successfully!\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
