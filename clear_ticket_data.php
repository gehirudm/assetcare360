<?php
/**
 * Clear data from ticket-related tables
 * This script removes all data from the specified tables to allow fresh data entry
 */

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/Database.php';

echo "=== Clearing Ticket-Related Data ===\n\n";

try {
    $db = Database::getInstance()->getConnection();
    
    // Tables to clear (in order to respect foreign key constraints)
    $tables = [
        'ticket_work_updates',
        'fault_ticket_assignments',
        'fault_ticket_images',
        'spare_part_request_items',
        'spare_part_requests',
        'tec_fault_repair_ticket',
        'vehicle_breakdown_inroute',
        'vehicle_breakdown',
        'machine_breakdown',
        'fault_tickets'
    ];
    
    echo "Tables to be cleared:\n";
    foreach ($tables as $table) {
        echo "  - $table\n";
    }
    echo "\n";
    
    // Count records before deletion
    echo "Current record counts:\n";
    $totalRecords = 0;
    foreach ($tables as $table) {
        $stmt = $db->query("SELECT COUNT(*) as count FROM `$table`");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $count = $result['count'];
        $totalRecords += $count;
        echo "  $table: $count record(s)\n";
    }
    echo "\nTotal records to delete: $totalRecords\n\n";
    
    if ($totalRecords === 0) {
        echo "✓ All tables are already empty!\n";
        exit(0);
    }
    
    // Disable foreign key checks
    echo "Disabling foreign key checks...\n";
    $db->exec("SET FOREIGN_KEY_CHECKS = 0");
    
    // Clear each table
    echo "\nClearing tables...\n";
    foreach ($tables as $table) {
        try {
            $db->exec("TRUNCATE TABLE `$table`");
            echo "  ✓ Cleared $table\n";
        } catch (Exception $e) {
            // If truncate fails, try delete
            $db->exec("DELETE FROM `$table`");
            echo "  ✓ Cleared $table (using DELETE)\n";
        }
    }
    
    // Re-enable foreign key checks
    echo "\nRe-enabling foreign key checks...\n";
    $db->exec("SET FOREIGN_KEY_CHECKS = 1");
    
    // Verify deletion
    echo "\nVerifying deletion...\n";
    $remainingRecords = 0;
    foreach ($tables as $table) {
        $stmt = $db->query("SELECT COUNT(*) as count FROM `$table`");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $count = $result['count'];
        $remainingRecords += $count;
        if ($count > 0) {
            echo "  ⚠ $table: $count record(s) remaining\n";
        }
    }
    
    if ($remainingRecords === 0) {
        echo "  ✓ All tables successfully cleared!\n";
    } else {
        echo "  ⚠ Warning: $remainingRecords record(s) still remain\n";
    }
    
    echo "\n✅ Data clearing completed successfully!\n";
    echo "You can now add fresh data to these tables.\n";
    
} catch (Exception $e) {
    echo "\n❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
