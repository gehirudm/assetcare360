<?php
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/Database.php';

$db = Database::getInstance()->getConnection();

echo "=== Cleaning Up Ticket IDs ===\n\n";

// First, let's see what we have
echo "Current situation:\n";
$stmt = $db->query("
    SELECT ft.id, ft.ticket_id, ft.breakdown_report_id, vb.breakdown_id
    FROM fault_tickets ft
    LEFT JOIN vehicle_breakdown vb ON ft.breakdown_report_id = vb.breakdown_id
    WHERE ft.breakdown_report_id IS NOT NULL
    ORDER BY ft.id
");
$tickets = $stmt->fetchAll();

foreach ($tickets as $t) {
    $match = $t['ticket_id'] === $t['breakdown_report_id'] ? '✅' : '❌';
    $exists = $t['breakdown_id'] ? '✅' : '❌ ORPHAN';
    echo "  $match Ticket: {$t['ticket_id']} -> Breakdown: {$t['breakdown_report_id']} $exists\n";
}

echo "\nFixing issues...\n\n";

$db->beginTransaction();
try {
    // Delete tickets pointing to non-existent breakdowns
    $stmt = $db->query("
        SELECT ft.id, ft.ticket_id, ft.breakdown_report_id
        FROM fault_tickets ft
        LEFT JOIN vehicle_breakdown vb ON ft.breakdown_report_id = vb.breakdown_id
        WHERE ft.breakdown_report_id IS NOT NULL AND vb.breakdown_id IS NULL
    ");
    $orphans = $stmt->fetchAll();
    
    foreach ($orphans as $orphan) {
        echo "Deleting orphan ticket {$orphan['ticket_id']} (points to non-existent {$orphan['breakdown_report_id']})\n";
        $db->prepare("DELETE FROM fault_tickets WHERE id = ?")->execute([$orphan['id']]);
    }
    
    // Find duplicates - multiple tickets for same breakdown
    $stmt = $db->query("
        SELECT breakdown_report_id, GROUP_CONCAT(id) as ids, GROUP_CONCAT(ticket_id) as ticket_ids, COUNT(*) as cnt
        FROM fault_tickets
        WHERE breakdown_report_id IS NOT NULL
        GROUP BY breakdown_report_id
        HAVING cnt > 1
    ");
    $dupes = $stmt->fetchAll();
    
    foreach ($dupes as $dupe) {
        echo "\nDuplicate tickets for {$dupe['breakdown_report_id']}: {$dupe['ticket_ids']}\n";
        $ids = explode(',', $dupe['ids']);
        // Keep the first one, delete the rest
        for ($i = 1; $i < count($ids); $i++) {
            echo "  Deleting duplicate ticket ID " . $ids[$i] . "\n";
            $db->prepare("DELETE FROM fault_tickets WHERE id = ?")->execute([$ids[$i]]);
        }
    }
    
    // Now update remaining tickets to match breakdown IDs
    echo "\nUpdating ticket IDs to match breakdown IDs...\n";
    $stmt = $db->query("
        SELECT ft.id, ft.ticket_id, ft.breakdown_report_id
        FROM fault_tickets ft
        INNER JOIN vehicle_breakdown vb ON ft.breakdown_report_id = vb.breakdown_id
        WHERE ft.ticket_id != ft.breakdown_report_id
    ");
    $toUpdate = $stmt->fetchAll();
    
    foreach ($toUpdate as $ticket) {
        echo "  {$ticket['ticket_id']} -> {$ticket['breakdown_report_id']}\n";
        $db->prepare("UPDATE fault_tickets SET ticket_id = ? WHERE id = ?")->execute([
            $ticket['breakdown_report_id'],
            $ticket['id']
        ]);
    }
    
    $db->commit();
    echo "\n✅ Cleanup complete!\n";
    
} catch (Exception $e) {
    $db->rollBack();
    echo "\n❌ Error: " . $e->getMessage() . "\n";
}
