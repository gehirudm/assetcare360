<?php
/**
 * Migration: Fix assigned ticket and breakdown statuses
 * 
 * Updates fault tickets that have active assignments to status "Assigned"
 * Updates linked vehicle breakdowns to status "Assigned"
 * Fixes incorrect breakdown_type values
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

$db = Database::getInstance()->getConnection();

echo "=== Fixing Assigned Ticket & Breakdown Statuses ===" . PHP_EOL . PHP_EOL;

// Step 0: Add 'Assigned' to fault_tickets status ENUM if not already present
echo "Updating fault_tickets status ENUM to include 'Assigned'..." . PHP_EOL;
$db->exec("ALTER TABLE fault_tickets MODIFY COLUMN status ENUM('Open','Assigned','In Progress','Resolved','Closed') NOT NULL DEFAULT 'Open'");
echo "  ✓ ENUM updated: ('Open','Assigned','In Progress','Resolved','Closed')" . PHP_EOL . PHP_EOL;

// Step 1: Find all fault tickets that have active assignments but status is still "Open"
$stmt = $db->query("
    SELECT DISTINCT ft.id, ft.ticket_id, ft.status, ft.breakdown_report_id, ft.breakdown_type, ft.vehicle_id
    FROM fault_tickets ft
    INNER JOIN fault_ticket_assignments fta ON ft.id = fta.fault_ticket_id AND fta.status = 'Active'
    WHERE ft.status = 'Open'
");
$ticketsToFix = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Found " . count($ticketsToFix) . " fault ticket(s) with active assignments but status 'Open'" . PHP_EOL;

foreach ($ticketsToFix as $ticket) {
    // Update fault ticket status to "Assigned"
    $update = $db->prepare("UPDATE fault_tickets SET status = 'Assigned' WHERE id = ?");
    $update->execute([$ticket['id']]);
    echo "  ✓ Updated {$ticket['ticket_id']} (ID: {$ticket['id']}) status: Open → Assigned" . PHP_EOL;
    
    // Fix breakdown_type if it's not 'vehicle_breakdown' or 'route_breakdown'
    if (!empty($ticket['breakdown_report_id'])) {
        $correctType = $ticket['breakdown_type'];
        
        if (!in_array($correctType, ['vehicle_breakdown', 'route_breakdown'])) {
            // Check which table the breakdown exists in
            $checkVb = $db->prepare("SELECT COUNT(*) FROM vehicle_breakdown WHERE breakdown_id = ?");
            $checkVb->execute([$ticket['breakdown_report_id']]);
            
            if ($checkVb->fetchColumn() > 0) {
                $correctType = 'vehicle_breakdown';
            } else {
                $checkRoute = $db->prepare("SELECT COUNT(*) FROM vehicle_breakdown_inroute WHERE route_breakdown_id = ?");
                $checkRoute->execute([$ticket['breakdown_report_id']]);
                if ($checkRoute->fetchColumn() > 0) {
                    $correctType = 'route_breakdown';
                }
            }
            
            if ($correctType !== $ticket['breakdown_type']) {
                $fixType = $db->prepare("UPDATE fault_tickets SET breakdown_type = ? WHERE id = ?");
                $fixType->execute([$correctType, $ticket['id']]);
                echo "    ✓ Fixed breakdown_type: '{$ticket['breakdown_type']}' → '{$correctType}'" . PHP_EOL;
            }
        }
        
        // Update the linked breakdown report status
        if ($correctType === 'vehicle_breakdown') {
            $updateBd = $db->prepare("UPDATE vehicle_breakdown SET status = 'Assigned' WHERE breakdown_id = ? AND status = 'Pending'");
            $updateBd->execute([$ticket['breakdown_report_id']]);
            if ($updateBd->rowCount() > 0) {
                echo "    ✓ Updated vehicle_breakdown {$ticket['breakdown_report_id']} status: Pending → Assigned" . PHP_EOL;
            }
        } elseif ($correctType === 'route_breakdown') {
            $updateBd = $db->prepare("UPDATE vehicle_breakdown_inroute SET status = 'Assigned' WHERE route_breakdown_id = ? AND status = 'Pending'");
            $updateBd->execute([$ticket['breakdown_report_id']]);
            if ($updateBd->rowCount() > 0) {
                echo "    ✓ Updated route_breakdown {$ticket['breakdown_report_id']} status: Pending → Assigned" . PHP_EOL;
            }
        }
    }
}

echo PHP_EOL . "=== Verification ===" . PHP_EOL;

// Verify fault ticket statuses
$stmt = $db->query("SELECT ticket_id, status FROM fault_tickets ORDER BY id");
echo PHP_EOL . "Fault Ticket Statuses:" . PHP_EOL;
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "  {$row['ticket_id']}: {$row['status']}" . PHP_EOL;
}

// Verify vehicle breakdown statuses
$stmt = $db->query("SELECT breakdown_id, status FROM vehicle_breakdown ORDER BY id");
echo PHP_EOL . "Vehicle Breakdown Statuses:" . PHP_EOL;
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "  {$row['breakdown_id']}: {$row['status']}" . PHP_EOL;
}

// Verify route breakdown statuses
$stmt = $db->query("SELECT route_breakdown_id, status FROM vehicle_breakdown_inroute ORDER BY id");
echo PHP_EOL . "Route Breakdown Statuses:" . PHP_EOL;
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "  {$row['route_breakdown_id']}: {$row['status']}" . PHP_EOL;
}

echo PHP_EOL . "=== Migration Complete ===" . PHP_EOL;
