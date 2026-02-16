<?php
require_once 'config/config.php';
require_once 'config/Database.php';

$db = Database::getInstance();
$conn = $db->getConnection();

echo "=== Machine Breakdowns (actually fault tickets) ===\n";
$sql = "SELECT mb.*, u.full_name as reporter_name, u.role as reporter_role, 
               m.model_number as machine_model
        FROM machine_breakdown mb
        LEFT JOIN users u ON mb.reported_by = u.id
        LEFT JOIN machines m ON mb.machine_id = m.id
        ORDER BY mb.created_at DESC
        LIMIT 10";
$stmt = $conn->query($sql);
$breakdowns = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (count($breakdowns) > 0) {
    echo "Total records found: " . count($breakdowns) . "\n\n";
    foreach ($breakdowns as $bd) {
        echo "ticket_id: {$bd['ticket_id']}, ";
        echo "machine: " . ($bd['machine_model'] ?? 'N/A') . ", ";
        echo "reporter: {$bd['reporter_name']} ({$bd['reporter_role']}), ";
        echo "status: {$bd['status']}\n";
    }
} else {
    echo "No records found\n";
}

echo "\n=== Fault Tickets Reported by Machinery Operators ===\n";
$sql = "SELECT ft.ticket_id, ft.breakdown_report_id, ft.breakdown_type, 
               ft.status, ft.priority, u.full_name as reporter_name, u.role,
               m.model_number as machine_model
        FROM fault_tickets ft
        LEFT JOIN users u ON ft.reported_by = u.id
        LEFT JOIN machines m ON ft.machine_id = m.id
        WHERE u.role = 'Machinery Operator'
        ORDER BY ft.created_at DESC
        LIMIT 10";
$stmt = $conn->query($sql);
$tickets = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (count($tickets) > 0) {
    echo "Total fault tickets from machinery operators: " . count($tickets) . "\n\n";
    foreach ($tickets as $ticket) {
        echo "ticket_id: {$ticket['ticket_id']}, ";
        echo "machine: " . ($ticket['machine_model'] ?? 'N/A') . ", ";
        echo "reporter: {$ticket['reporter_name']}, ";
        echo "status: {$ticket['status']}, ";
        echo "breakdown_type: " . ($ticket['breakdown_type'] ?? 'N/A') . "\n";
    }
} else {
    echo "No fault tickets found from machinery operators\n";
}

echo "\n=== Machinery Operators ===\n";
$sql = "SELECT id, full_name, role FROM users WHERE role = 'Machinery Operator' LIMIT 5";
$stmt = $conn->query($sql);
$operators = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (count($operators) > 0) {
    foreach ($operators as $op) {
        echo "ID: {$op['id']}, Name: {$op['full_name']}, Role: {$op['role']}\n";
    }
} else {
    echo "No machinery operators found\n";
}
