<?php
require_once 'config/config.php';
require_once 'config/Database.php';

$db = Database::getInstance()->getConnection();

// Find the fault_ticket id for MBD-003
$stmt = $db->query("SELECT id, ticket_id FROM fault_tickets WHERE ticket_id = 'MBD-003'");
$ticket = $stmt->fetch(PDO::FETCH_ASSOC);
$ticketId = $ticket ? $ticket['id'] : null;

echo "Fault ticket ID: $ticketId\n";

// Delete from related tables
if ($ticketId) {
    // Delete ticket work updates
    $stmt = $db->prepare("DELETE FROM ticket_work_updates WHERE ticket_id = ?");
    $stmt->execute([$ticketId]);
    echo 'Deleted from ticket_work_updates: ' . $stmt->rowCount() . " rows\n";
    
    // Delete fault ticket images
    $stmt = $db->prepare("DELETE FROM fault_ticket_images WHERE fault_ticket_id = ?");
    $stmt->execute([$ticketId]);
    echo 'Deleted from fault_ticket_images: ' . $stmt->rowCount() . " rows\n";
    
    // Delete fault ticket assignments
    $stmt = $db->prepare("DELETE FROM fault_ticket_assignments WHERE fault_ticket_id = ?");
    $stmt->execute([$ticketId]);
    echo 'Deleted from fault_ticket_assignments: ' . $stmt->rowCount() . " rows\n";
    
    // Delete tec_fault_repair_ticket
    $stmt = $db->prepare("DELETE FROM tec_fault_repair_ticket WHERE fault_ticket_id = ?");
    $stmt->execute([$ticketId]);
    echo 'Deleted from tec_fault_repair_ticket: ' . $stmt->rowCount() . " rows\n";
    
    // Delete spare_part_requests
    $stmt = $db->prepare("DELETE FROM spare_part_requests WHERE fault_ticket_id = ?");
    $stmt->execute([$ticketId]);
    echo 'Deleted from spare_part_requests: ' . $stmt->rowCount() . " rows\n";
    
    // Delete the fault ticket itself
    $stmt = $db->prepare("DELETE FROM fault_tickets WHERE id = ?");
    $stmt->execute([$ticketId]);
    echo 'Deleted from fault_tickets: ' . $stmt->rowCount() . " rows\n";
}

// Delete from machine_breakdown
$stmt = $db->prepare("DELETE FROM machine_breakdown WHERE breakdown_id = 'MBD-003'");
$stmt->execute();
echo 'Deleted from machine_breakdown: ' . $stmt->rowCount() . " rows\n";

echo "\n=== Verification ===\n";
$stmt = $db->query("SELECT ticket_id FROM fault_tickets WHERE ticket_id = 'MBD-003'");
echo 'fault_tickets MBD-003: ' . ($stmt->fetch() ? 'EXISTS' : 'DELETED') . "\n";

$stmt = $db->query("SELECT breakdown_id FROM machine_breakdown WHERE breakdown_id = 'MBD-003'");
echo 'machine_breakdown MBD-003: ' . ($stmt->fetch() ? 'EXISTS' : 'DELETED') . "\n";

echo "\nDone!\n";
