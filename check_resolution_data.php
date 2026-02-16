<?php
require_once 'config/config.php';
require_once 'config/Database.php';

$conn = Database::getInstance()->getConnection();

// Check fault_tickets structure
echo "=== Fault Tickets Table Structure ===\n";
$stmt = $conn->prepare("SHOW COLUMNS FROM fault_tickets");
$stmt->execute();
$cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach($cols as $c) {
    echo $c['Field'] . " - " . $c['Type'] . "\n";
}

// Check if any fault tickets have resolution notes
echo "\n=== Fault Tickets with Resolution Notes ===\n";
$stmt = $conn->prepare("SELECT id, ticket_id, status, resolution_notes, resolved_at FROM fault_tickets WHERE resolution_notes IS NOT NULL AND resolution_notes != '' LIMIT 5");
$stmt->execute();
$tickets = $stmt->fetchAll(PDO::FETCH_ASSOC);
print_r($tickets);

// Check machine breakdown data
echo "\n=== Machine Breakdown with Fault Ticket Data ===\n";
$stmt = $conn->prepare("
    SELECT mb.id, mb.breakdown_id, mb.status, ft.resolution_notes, ft.resolved_at
    FROM machine_breakdown mb
    LEFT JOIN fault_tickets ft ON ft.breakdown_report_id COLLATE utf8mb4_general_ci = mb.breakdown_id COLLATE utf8mb4_general_ci AND ft.breakdown_type = 'machine_breakdown'
    LIMIT 5
");
$stmt->execute();
$breakdowns = $stmt->fetchAll(PDO::FETCH_ASSOC);
print_r($breakdowns);

// Check vehicle breakdown data
echo "\n=== Vehicle Breakdown with Fault Ticket Data ===\n";
$stmt = $conn->prepare("
    SELECT vb.id, vb.breakdown_id, vb.status, ft.resolution_notes, ft.resolved_at
    FROM vehicle_breakdown vb
    LEFT JOIN fault_tickets ft ON ft.breakdown_report_id COLLATE utf8mb4_general_ci = vb.breakdown_id COLLATE utf8mb4_general_ci AND ft.breakdown_type = 'vehicle_breakdown'
    LIMIT 5
");
$stmt->execute();
$breakdowns = $stmt->fetchAll(PDO::FETCH_ASSOC);
print_r($breakdowns);
