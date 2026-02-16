<?php
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/Database.php';

$db = Database::getInstance()->getConnection();

echo "Technical Officer user:\n";
$stmt = $db->query('SELECT id, full_name, employee_id, role FROM users WHERE role = "Technical Officer"');
$techs = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($techs as $tech) {
    echo sprintf("  ID: %d | Name: %s | EmpID: %s\n", $tech['id'], $tech['full_name'], $tech['employee_id']);
}

echo "\nFault tickets:\n";
$stmt = $db->query('SELECT id, ticket_id, status FROM fault_tickets LIMIT 10');
$tickets = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($tickets as $ticket) {
    echo sprintf("  Ticket: %s | Status: %s\n", 
        $ticket['ticket_id'], $ticket['status']);
}

echo "\nTicket assignments:\n";
$stmt = $db->query('SELECT fta.*, ft.ticket_id, ft.status as ticket_status FROM fault_ticket_assignments fta LEFT JOIN fault_tickets ft ON fta.fault_ticket_id = ft.id');
$assignments = $stmt->fetchAll(PDO::FETCH_ASSOC);
if (count($assignments) > 0) {
    foreach ($assignments as $assign) {
        echo sprintf("  Ticket: %s | Assigned To User ID: %d | Assignment Status: %s | Ticket Status: %s\n", 
            $assign['ticket_id'] ?? 'N/A', $assign['assigned_to'], $assign['status'], $assign['ticket_status']);
    }
    echo "\nTotal assignments: " . count($assignments) . "\n";
} else {
    echo "  No assignments found\n";
}
