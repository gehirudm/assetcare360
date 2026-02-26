<?php
/**
 * Migration: Change vehicle breakdown ticket IDs from MBD- to VBD- prefix
 * Machine breakdown tickets keep MBD- prefix
 */
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

$db = Database::getInstance();
$conn = $db->getConnection();

echo "Updating vehicle breakdown ticket IDs from MBD- to VBD-...\n\n";

// Get all tickets with vehicle_id (these are vehicle breakdowns - should be VBD-)
$stmt = $conn->query("SELECT id, ticket_id, vehicle_id, breakdown_report_id FROM fault_tickets WHERE vehicle_id IS NOT NULL AND ticket_id LIKE 'MBD-%' ORDER BY id");
$vehicleTickets = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Found " . count($vehicleTickets) . " vehicle breakdown tickets with MBD- prefix\n";

// Find the next VBD number
$maxVbd = $conn->query("SELECT ticket_id FROM fault_tickets WHERE ticket_id LIKE 'VBD-%' ORDER BY CAST(SUBSTRING(ticket_id, 5) AS UNSIGNED) DESC LIMIT 1")->fetch();
$nextVbdNum = 1;
if ($maxVbd && $maxVbd['ticket_id']) {
    $nextVbdNum = intval(substr($maxVbd['ticket_id'], 4)) + 1;
}

$updateStmt = $conn->prepare("UPDATE fault_tickets SET ticket_id = ? WHERE id = ?");

foreach ($vehicleTickets as $ticket) {
    $newId = 'VBD-' . str_pad($nextVbdNum, 3, '0', STR_PAD_LEFT);
    $updateStmt->execute([$newId, $ticket['id']]);
    echo "  {$ticket['ticket_id']} → {$newId} (vehicle_id={$ticket['vehicle_id']}, breakdown={$ticket['breakdown_report_id']})\n";
    $nextVbdNum++;
}

echo "\n✓ Updated " . count($vehicleTickets) . " vehicle tickets to VBD- prefix\n";

// Verify
echo "\n=== Current ticket IDs ===\n";
$stmt = $conn->query("SELECT id, ticket_id, machine_id, vehicle_id, breakdown_report_id FROM fault_tickets ORDER BY id");
$all = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($all as $t) {
    $type = $t['vehicle_id'] ? "vehicle={$t['vehicle_id']}" : ($t['machine_id'] ? "machine={$t['machine_id']}" : "no asset");
    echo "  id={$t['id']} ticket_id={$t['ticket_id']} {$type} breakdown={$t['breakdown_report_id']}\n";
}
