<?php
/**
 * Quick script to check if we need to reseed assignment data
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $db = Database::getInstance()->getConnection();
    
    // Check fault_ticket_assignments count
    $stmt = $db->query("SELECT COUNT(*) as count FROM fault_ticket_assignments");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "Current assignment count: {$result['count']}\n\n";
    
    if ($result['count'] == 0) {
        echo "⚠️  No assignments found!\n";
        echo "You may need to reassign technicians to existing tickets.\n";
    } else {
        echo "✓ Assignments exist in the database\n";
    }
    
    // Check budget_reports count
    $stmt = $db->query("SELECT COUNT(*) as count FROM budget_reports");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "\nCurrent budget report count: {$result['count']}\n";
    
    if ($result['count'] == 0) {
        echo "✓ No budget reports yet (this is normal for a fresh feature)\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
