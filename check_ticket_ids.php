<?php
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/Database.php';

$db = Database::getInstance()->getConnection();

echo "=== Checking Ticket IDs in Database ===\n\n";

// Check what ticket_id values are stored
$stmt = $db->query('
    SELECT ft.id, ft.ticket_id, ft.breakdown_report_id, ft.breakdown_type, ft.status
    FROM fault_tickets ft
    ORDER BY ft.id DESC
    LIMIT 20
');
$tickets = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Fault Tickets in Database:\n";
foreach ($tickets as $ticket) {
    echo sprintf("  DB ID: %-3d | ticket_id: %-10s | breakdown_report_id: %-10s | breakdown_type: %-20s | status: %s\n",
        $ticket['id'],
        $ticket['ticket_id'] ?: 'NULL',
        $ticket['breakdown_report_id'] ?: 'NULL',
        $ticket['breakdown_type'] ?: 'NULL',
        $ticket['status']
    );
}

echo "\n=== Tickets Assigned to Technical Officer (ID: 4) ===\n\n";
$stmt = $db->query('
    SELECT ft.id, ft.ticket_id, ft.breakdown_report_id, ft.breakdown_type, ft.status,
           fta.assigned_to, fta.status as assignment_status
    FROM fault_tickets ft
    INNER JOIN fault_ticket_assignments fta ON ft.id = fta.fault_ticket_id
    WHERE fta.assigned_to = 4
    ORDER BY fta.assigned_at DESC
    LIMIT 15
');
$assignedTickets = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Tickets Assigned to Tech Officer:\n";
foreach ($assignedTickets as $ticket) {
    echo sprintf("  DB ID: %-3d | ticket_id: %-10s | breakdown_report_id: %-10s | Status: %-20s | Assignment: %s\n",
        $ticket['id'],
        $ticket['ticket_id'] ?: 'NULL',
        $ticket['breakdown_report_id'] ?: 'NULL',
        $ticket['status'],
        $ticket['assignment_status']
    );
}
