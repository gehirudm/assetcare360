<?php
/**
 * Renumber machine breakdown IDs to start from MBD-001
 */

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/Database.php';

echo "=== Renumbering Machine Breakdown IDs ===\n\n";

try {
    $db = Database::getInstance()->getConnection();
    
    // Get all machine breakdowns ordered by ID
    echo "1. Fetching machine breakdown records...\n";
    $stmt = $db->query("SELECT id, breakdown_id FROM machine_breakdown ORDER BY id");
    $breakdowns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($breakdowns)) {
        echo "   No records found.\n";
        exit(0);
    }
    
    echo "   Found " . count($breakdowns) . " record(s)\n\n";
    
    // Disable foreign key checks
    echo "2. Disabling foreign key checks...\n";
    $db->exec("SET FOREIGN_KEY_CHECKS = 0");
    
    // Update breakdown IDs
    echo "\n3. Renumbering breakdown IDs...\n";
    $counter = 1;
    foreach ($breakdowns as $breakdown) {
        $oldId = $breakdown['breakdown_id'];
        $newId = 'MBD-' . str_pad($counter, 3, '0', STR_PAD_LEFT);
        
        if ($oldId !== $newId) {
            // Update machine_breakdown table
            $stmt = $db->prepare("UPDATE machine_breakdown SET breakdown_id = ? WHERE id = ?");
            $stmt->execute([$newId, $breakdown['id']]);
            
            // Update fault_tickets table if any tickets reference this breakdown
            $stmt = $db->prepare("UPDATE fault_tickets SET breakdown_report_id = ? WHERE breakdown_report_id = ? AND breakdown_type = 'machine_breakdown'");
            $stmt->execute([$newId, $oldId]);
            
            echo "   ✓ Updated $oldId → $newId\n";
        } else {
            echo "   ✓ $newId already correct\n";
        }
        
        $counter++;
    }
    
    // Re-enable foreign key checks
    echo "\n4. Re-enabling foreign key checks...\n";
    $db->exec("SET FOREIGN_KEY_CHECKS = 1");
    
    // Verify changes
    echo "\n5. Verifying changes...\n";
    $stmt = $db->query("SELECT id, breakdown_id FROM machine_breakdown ORDER BY id");
    $updated = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($updated as $record) {
        echo "   ID {$record['id']}: {$record['breakdown_id']}\n";
    }
    
    echo "\n✅ Renumbering completed successfully!\n";
    
} catch (Exception $e) {
    echo "\n❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
