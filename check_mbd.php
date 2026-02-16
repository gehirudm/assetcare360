<?php
require_once 'config/config.php';
require_once 'config/Database.php';

$db = Database::getInstance();
$conn = $db->getConnection();

echo "=== MBD-001 fault_ticket ===\n";
$stmt = $conn->query('SELECT id, ticket_id, status FROM fault_tickets WHERE ticket_id = "MBD-001"');
print_r($stmt->fetch(PDO::FETCH_ASSOC));

echo "\n=== MBD-001 machine_breakdown ===\n";
$stmt = $conn->query('SELECT id, breakdown_id, status FROM machine_breakdown WHERE breakdown_id = "MBD-001"');
print_r($stmt->fetch(PDO::FETCH_ASSOC));

echo "\n=== ticket_work_updates for MBD-001 (fault_ticket id=1) ===\n";
$stmt = $conn->query('SELECT * FROM ticket_work_updates WHERE ticket_id = 1');
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
if (empty($rows)) {
    echo "No work updates found for MBD-001\n";
} else {
    print_r($rows);
}

echo "\n=== MBD-002 machine_breakdown ===\n";
$stmt = $conn->query('SELECT id, breakdown_id, status FROM machine_breakdown WHERE breakdown_id = "MBD-002"');
print_r($stmt->fetch(PDO::FETCH_ASSOC));

echo "\n=== ticket_work_updates for MBD-002 (fault_ticket id=2) ===\n";
$stmt = $conn->query('SELECT * FROM ticket_work_updates WHERE ticket_id = 2');
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
if (empty($rows)) {
    echo "No work updates found for MBD-002\n";
} else {
    print_r($rows);
}
