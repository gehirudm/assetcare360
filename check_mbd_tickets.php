<?php
require_once 'config/config.php';
require_once 'config/Database.php';

$db = Database::getInstance();
$conn = $db->getConnection();

echo "=== Checking MBD-001 to MBD-007 Tickets ===\n\n";

$stmt = $conn->query("
    SELECT ft.ticket_id, ft.machine_id, ft.reported_by, ft.status, 
           u.full_name as reporter_name, u.role as reporter_role
    FROM fault_tickets ft
    LEFT JOIN users u ON ft.reported_by = u.id
    WHERE ft.ticket_id IN ('MBD-001', 'MBD-002', 'MBD-003', 'MBD-004', 'MBD-005', 'MBD-006', 'MBD-007')
    ORDER BY ft.ticket_id
");

$tickets = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($tickets as $ticket) {
    echo "Ticket: {$ticket['ticket_id']}\n";
    echo "  Reporter: {$ticket['reporter_name']} (Role: {$ticket['reporter_role']})\n";
    echo "  Status: {$ticket['status']}\n";
    echo "  Machine ID: {$ticket['machine_id']}\n\n";
}

echo "\nTotal tickets found: " . count($tickets) . "\n";
