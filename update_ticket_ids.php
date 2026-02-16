<?php
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/Database.php';

$db = Database::getInstance()->getConnection();

echo "=== Updating Existing Tickets to Match Breakdown IDs ===\n\n";

// Find tickets that have breakdown_report_id but ticket_id doesn't match
$stmt = $db->query("
    SELECT ft.id, ft.ticket_id, ft.breakdown_report_id
    FROM fault_tickets ft
    WHERE ft.breakdown_report_id IS NOT NULL
    AND ft.ticket_id != ft.breakdown_report_id
    ORDER BY ft.id
");

$tickets = $stmt->fetchAll();

if (count($tickets) === 0) {
    echo "✅ All tickets already have matching IDs!\n";
    exit(0);
}

echo "Found " . count($tickets) . " tickets to update:\n\n";

$db->beginTransaction();
try {
    foreach ($tickets as $ticket) {
        echo "Updating ticket:\n";
        echo "  Current ID: {$ticket['ticket_id']}\n";
        echo "  New ID: {$ticket['breakdown_report_id']}\n";
        
        // Update the ticket_id to match breakdown_report_id
        $updateStmt = $db->prepare("UPDATE fault_tickets SET ticket_id = ? WHERE id = ?");
        $updateStmt->execute([$ticket['breakdown_report_id'], $ticket['id']]);
        
        echo "  ✅ Updated\n\n";
    }
    
    $db->commit();
    echo "\n✅ All tickets updated successfully!\n";
    echo "Driver and supervisor dashboards now show matching IDs.\n";
    
} catch (Exception $e) {
    $db->rollBack();
    echo "\n❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
