<?php
require_once 'config/config.php';
require_once 'config/Database.php';

$conn = Database::getInstance()->getConnection();

echo "=== Machinary Operators (note the typo) ===\n";
$stmt = $conn->query('SELECT id, full_name, employee_id FROM users WHERE role = "Machinary Operator"');
$operators = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($operators as $row) {
    echo "ID: {$row['id']}, Name: {$row['full_name']}, EmpID: {$row['employee_id']}\n";
}

echo "\n=== Fault Tickets from Machinary Operators ===\n";
$stmt = $conn->query('SELECT ft.ticket_id, ft.breakdown_type, ft.status, ft.machine_id, u.full_name
                      FROM fault_tickets ft
                      JOIN users u ON ft.reported_by = u.id
                      WHERE u.role = "Machinary Operator"
                      ORDER BY ft.created_at DESC');
$tickets = $stmt->fetchAll(PDO::FETCH_ASSOC);
if (count($tickets) > 0) {
    foreach ($tickets as $t) {
        echo "Ticket: {$t['ticket_id']}, Machine: {$t['machine_id']}, Status: {$t['status']}, Reporter: {$t['full_name']}\n";
    }
} else {
    echo "No fault tickets found from machinary operators\n";
}
