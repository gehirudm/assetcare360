<?php
/**
 * Clear spare_part_request_items table and related records for RBD-001 and MBD-001
 */

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/Database.php';

echo "=== Clearing Spare Part Request Items and Related Records ===\n\n";

try {
    $db = Database::getInstance()->getConnection();
    
    // Step 1: Count records in spare_part_request_items
    echo "1. Checking spare_part_request_items table...\n";
    $stmt = $db->query("SELECT COUNT(*) as count FROM spare_part_request_items");
    $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    echo "   Found $count record(s) in spare_part_request_items\n\n";
    
    // Step 2: Find records related to RBD-001 and MBD-001
    echo "2. Finding records related to RBD-001 and MBD-001...\n";
    
    // Check vehicle_breakdown for RBD-001
    $stmt = $db->query("SELECT id, breakdown_id FROM vehicle_breakdown WHERE breakdown_id = 'RBD-001'");
    $rbdRecords = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "   vehicle_breakdown: " . count($rbdRecords) . " record(s) with RBD-001\n";
    
    // Check machine_breakdown for MBD-001
    $stmt = $db->query("SELECT id, breakdown_id FROM machine_breakdown WHERE breakdown_id = 'MBD-001'");
    $mbdRecords = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "   machine_breakdown: " . count($mbdRecords) . " record(s) with MBD-001\n";
    
    // Check fault_tickets for these breakdown IDs
    $stmt = $db->query("SELECT id, ticket_id, breakdown_report_id FROM fault_tickets WHERE breakdown_report_id IN ('RBD-001', 'MBD-001')");
    $ticketRecords = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "   fault_tickets: " . count($ticketRecords) . " record(s) referencing RBD-001 or MBD-001\n";
    
    // Check spare_part_requests for these tickets
    if (!empty($ticketRecords)) {
        $ticketIds = array_column($ticketRecords, 'id');
        $placeholders = str_repeat('?,', count($ticketIds) - 1) . '?';
        $stmt = $db->prepare("SELECT id, fault_ticket_id FROM spare_part_requests WHERE fault_ticket_id IN ($placeholders)");
        $stmt->execute($ticketIds);
        $sparepartRequests = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo "   spare_part_requests: " . count($sparepartRequests) . " record(s) for these tickets\n\n";
    } else {
        $sparepartRequests = [];
        echo "   spare_part_requests: 0 record(s) for these tickets\n\n";
    }
    
    // Step 3: Disable foreign key checks
    echo "3. Disabling foreign key checks...\n";
    $db->exec("SET FOREIGN_KEY_CHECKS = 0");
    
    // Step 4: Clear spare_part_request_items table
    echo "\n4. Clearing spare_part_request_items table...\n";
    $db->exec("TRUNCATE TABLE spare_part_request_items");
    echo "   ✓ Cleared spare_part_request_items table\n";
    
    // Step 5: Delete spare_part_requests for RBD-001 and MBD-001 tickets
    if (!empty($sparepartRequests)) {
        echo "\n5. Deleting spare_part_requests for RBD-001 and MBD-001...\n";
        $requestIds = array_column($sparepartRequests, 'id');
        $placeholders = str_repeat('?,', count($requestIds) - 1) . '?';
        $stmt = $db->prepare("DELETE FROM spare_part_requests WHERE id IN ($placeholders)");
        $stmt->execute($requestIds);
        echo "   ✓ Deleted " . count($requestIds) . " spare part request(s)\n";
    }
    
    // Step 6: Delete fault_tickets for RBD-001 and MBD-001
    if (!empty($ticketRecords)) {
        echo "\n6. Deleting fault tickets for RBD-001 and MBD-001...\n";
        foreach ($ticketRecords as $ticket) {
            // Delete related records first
            $db->prepare("DELETE FROM ticket_work_updates WHERE ticket_id = ?")->execute([$ticket['id']]);
            $db->prepare("DELETE FROM fault_ticket_assignments WHERE fault_ticket_id = ?")->execute([$ticket['id']]);
            $db->prepare("DELETE FROM fault_ticket_images WHERE fault_ticket_id = ?")->execute([$ticket['id']]);
            
            // Delete the ticket
            $db->prepare("DELETE FROM fault_tickets WHERE id = ?")->execute([$ticket['id']]);
            echo "   ✓ Deleted ticket {$ticket['ticket_id']} (breakdown: {$ticket['breakdown_report_id']})\n";
        }
    }
    
    // Step 7: Delete breakdown records
    echo "\n7. Deleting breakdown records...\n";
    if (!empty($rbdRecords)) {
        $db->exec("DELETE FROM vehicle_breakdown WHERE breakdown_id = 'RBD-001'");
        echo "   ✓ Deleted vehicle breakdown RBD-001\n";
    }
    if (!empty($mbdRecords)) {
        $db->exec("DELETE FROM machine_breakdown WHERE breakdown_id = 'MBD-001'");
        echo "   ✓ Deleted machine breakdown MBD-001\n";
    }
    
    // Step 8: Re-enable foreign key checks
    echo "\n8. Re-enabling foreign key checks...\n";
    $db->exec("SET FOREIGN_KEY_CHECKS = 1");
    
    // Step 9: Verify deletion
    echo "\n9. Verifying deletion...\n";
    $stmt = $db->query("SELECT COUNT(*) as count FROM spare_part_request_items");
    $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    echo "   spare_part_request_items: $count record(s)\n";
    
    $stmt = $db->query("SELECT COUNT(*) as count FROM vehicle_breakdown WHERE breakdown_id = 'RBD-001'");
    $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    echo "   vehicle_breakdown (RBD-001): $count record(s)\n";
    
    $stmt = $db->query("SELECT COUNT(*) as count FROM machine_breakdown WHERE breakdown_id = 'MBD-001'");
    $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    echo "   machine_breakdown (MBD-001): $count record(s)\n";
    
    echo "\n✅ Cleanup completed successfully!\n";
    
} catch (Exception $e) {
    echo "\n❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
