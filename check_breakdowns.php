<?php
require 'config/config.php';
require 'config/Database.php';
$db = Database::getInstance();
$conn = $db->getConnection();

echo "=== Vehicle Breakdowns ===\n";
$stmt = $conn->query('SELECT id, breakdown_id, description, severity, status FROM vehicle_breakdown ORDER BY id');
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($rows as $r) {
    echo "id={$r['id']} breakdown_id={$r['breakdown_id']} status={$r['status']} desc=" . substr($r['description'],0,50) . "\n";
}

echo "\n=== Route Breakdowns ===\n";
$stmt = $conn->query('SELECT id, route_breakdown_id, description, severity, status FROM vehicle_breakdown_inroute ORDER BY id');
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($rows as $r) {
    echo "id={$r['id']} route_breakdown_id={$r['route_breakdown_id']} status={$r['status']} desc=" . substr($r['description'],0,50) . "\n";
}

echo "\n=== Fault Tickets with breakdown links ===\n";
$stmt = $conn->query('SELECT id, ticket_id, breakdown_report_id, breakdown_type, status FROM fault_tickets WHERE breakdown_report_id IS NOT NULL ORDER BY id');
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($rows as $r) {
    echo "id={$r['id']} ticket_id={$r['ticket_id']} breakdown_report_id={$r['breakdown_report_id']} type={$r['breakdown_type']} status={$r['status']}\n";
}
if (empty($rows)) echo "(none)\n";
