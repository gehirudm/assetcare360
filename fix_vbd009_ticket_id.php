<?php
require_once 'config/config.php';
require_once 'config/Database.php';

$db = Database::getInstance();
$conn = $db->getConnection();

echo "=== Current VBD-009 Ticket Info ===\n";
$sql = "SELECT id, ticket_id, breakdown_report_id, status 
        FROM fault_tickets 
        WHERE breakdown_report_id = 'VBD-009'";
$stmt = $conn->query($sql);
$ticket = $stmt->fetch(PDO::FETCH_ASSOC);

if ($ticket) {
    echo "Fault Ticket ID: {$ticket['id']}\n";
    echo "Current ticket_id: {$ticket['ticket_id']}\n";
    echo "breakdown_report_id: {$ticket['breakdown_report_id']}\n";
    echo "Status: {$ticket['status']}\n\n";
    
    echo "=== Updating ticket_id to match breakdown_id ===\n";
    $updateSql = "UPDATE fault_tickets 
                  SET ticket_id = 'VBD-009' 
                  WHERE breakdown_report_id = 'VBD-009'";
    $conn->exec($updateSql);
    
    echo "✓ Updated ticket_id from {$ticket['ticket_id']} to VBD-009\n\n";
    
    echo "=== Verification ===\n";
    $stmt = $conn->query($sql);
    $updated = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "New ticket_id: {$updated['ticket_id']}\n";
    echo "breakdown_report_id: {$updated['breakdown_report_id']}\n";
} else {
    echo "No fault ticket found for breakdown VBD-009\n";
}
