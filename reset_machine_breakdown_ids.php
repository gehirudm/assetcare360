<?php
/**
 * Reset Machine Breakdown IDs to start from MBD-001
 * This script renumbers all machine breakdown records sequentially starting from MBD-001
 */

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/Database.php';

try {
    $database = Database::getInstance();
    $db = $database->getConnection();
    
    echo "=== Resetting Machine Breakdown IDs to Start from MBD-001 ===\n\n";
    
    // Get all machine breakdowns ordered by id (creation order)
    $stmt = $db->query("SELECT id, breakdown_id, machine_id, operator_id, description FROM machine_breakdown ORDER BY id");
    $breakdowns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($breakdowns)) {
        echo "No machine breakdown records found. The next breakdown will be MBD-001.\n";
        exit(0);
    }
    
    echo "Found " . count($breakdowns) . " machine breakdown record(s).\n\n";
    echo "Current IDs:\n";
    foreach ($breakdowns as $breakdown) {
        echo "  - {$breakdown['breakdown_id']}: {$breakdown['description']}\n";
    }
    echo "\n";
    
    // Use a temporary prefix to avoid unique constraint conflicts
    $tempPrefix = 'TEMP_MBD_';
    
    // First pass: Change all IDs to temporary IDs
    echo "Step 1: Assigning temporary IDs...\n";
    $counter = 1;
    foreach ($breakdowns as $breakdown) {
        $tempId = $tempPrefix . $counter;
        $stmt = $db->prepare("UPDATE machine_breakdown SET breakdown_id = ? WHERE id = ?");
        $stmt->execute([$tempId, $breakdown['id']]);
        echo "  - Changed {$breakdown['breakdown_id']} to {$tempId}\n";
        $counter++;
    }
    
    // Second pass: Change temp IDs to new MBD-XXX format
    echo "\nStep 2: Assigning final IDs starting from MBD-001...\n";
    $counter = 1;
    foreach ($breakdowns as $index => $breakdown) {
        $oldId = $breakdown['breakdown_id'];
        $tempId = $tempPrefix . ($index + 1);
        $newId = 'MBD-' . str_pad($counter, 3, '0', STR_PAD_LEFT);
        
        // Update machine_breakdown table
        $stmt = $db->prepare("UPDATE machine_breakdown SET breakdown_id = ? WHERE breakdown_id = ?");
        $stmt->execute([$newId, $tempId]);
        
        // Update fault_tickets references
        $stmt = $db->prepare("UPDATE fault_tickets SET breakdown_report_id = ? WHERE breakdown_report_id = ? AND breakdown_type = 'machine_breakdown'");
        $stmt->execute([$newId, $oldId]);
        
        echo "  - Changed {$tempId} to {$newId} (was {$oldId})\n";
        $counter++;
    }
    
    echo "\n=== Successfully renumbered all machine breakdown IDs! ===\n\n";
    
    // Show new IDs
    echo "New IDs:\n";
    $stmt = $db->query("SELECT id, breakdown_id, description FROM machine_breakdown ORDER BY id");
    $updated = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($updated as $record) {
        echo "  - {$record['breakdown_id']}: {$record['description']}\n";
    }
    
    echo "\nThe next machine breakdown will be MBD-" . str_pad(count($updated) + 1, 3, '0', STR_PAD_LEFT) . "\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
