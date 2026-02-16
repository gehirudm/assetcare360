<?php
/**
 * Migration: Drop machine_breakdown table
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    echo "Starting migration: Drop machine_breakdown table\n";
    
    $db = Database::getInstance()->getConnection();
    
    // Check if machine_breakdown table exists
    $checkTable = $db->query("SHOW TABLES LIKE 'machine_breakdown'")->fetch();
    
    if (!$checkTable) {
        echo "✗ Table 'machine_breakdown' does not exist. Nothing to drop.\n";
        exit(0);
    }
    
    echo "✓ Table 'machine_breakdown' found. Proceeding with drop...\n";
    
    // Get row count before dropping
    $count = $db->query("SELECT COUNT(*) FROM machine_breakdown")->fetchColumn();
    echo "  Current records in table: $count\n";
    
    // Drop foreign key constraints from other tables first
    echo "\nDropping foreign key constraints...\n";
    
    // Drop budget_reports foreign key if exists
    try {
        $db->exec("ALTER TABLE budget_reports DROP FOREIGN KEY fk_budget_fault_ticket");
        echo "✓ Dropped foreign key from budget_reports\n";
    } catch (Exception $e) {
        echo "  (budget_reports foreign key may not exist)\n";
    }
    
    // Drop fault_ticket_assignments foreign key if exists
    try {
        $db->exec("ALTER TABLE fault_ticket_assignments DROP FOREIGN KEY fk_assignment_ticket");
        echo "✓ Dropped foreign key from fault_ticket_assignments\n";
    } catch (Exception $e) {
        echo "  (fault_ticket_assignments foreign key may not exist)\n";
    }
    
    // Drop the table
    echo "\nDropping machine_breakdown table...\n";
    $db->exec("DROP TABLE machine_breakdown");
    
    echo "✓ Successfully dropped machine_breakdown table\n";
    
    // Verify the drop
    $verify = $db->query("SHOW TABLES LIKE 'machine_breakdown'")->fetch();
    
    if (!$verify) {
        echo "✓ Verification successful: machine_breakdown table no longer exists\n";
    } else {
        echo "✗ Verification failed: machine_breakdown table still exists\n";
        exit(1);
    }
    
    echo "\n✅ Migration completed successfully!\n";
    echo "⚠️  WARNING: $count records were deleted from machine_breakdown table\n";
    
} catch (Exception $e) {
    echo "✗ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
