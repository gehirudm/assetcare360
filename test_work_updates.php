<?php
require_once 'config/config.php';
require_once 'config/Database.php';

$conn = Database::getInstance()->getConnection();

// Check fault tickets
echo "=== Fault Tickets ===\n";
$stmt = $conn->query("SELECT id, ticket_id, breakdown_report_id, breakdown_type FROM fault_tickets");
$tickets = $stmt->fetchAll(PDO::FETCH_ASSOC);
print_r($tickets);

// Check work updates
echo "\n=== Work Updates ===\n";
$stmt = $conn->query("SELECT ticket_id, machine_description, parts_used, time_spent, work_status FROM ticket_work_updates");
$updates = $stmt->fetchAll(PDO::FETCH_ASSOC);
print_r($updates);

// Simulate what the API would return for MBD-002
echo "\n=== Simulating API for machine breakdown id=2 (MBD-002) ===\n";
$stmt = $conn->prepare("
    SELECT mb.*, 
        ft.id as fault_ticket_id,
        ft.ticket_id as fault_ticket_number
    FROM machine_breakdown mb
    LEFT JOIN fault_tickets ft ON ft.breakdown_report_id COLLATE utf8mb4_general_ci = mb.breakdown_id COLLATE utf8mb4_general_ci AND ft.breakdown_type = 'machine_breakdown'
    WHERE mb.id = 2
");
$stmt->execute();
$report = $stmt->fetch(PDO::FETCH_ASSOC);

if (!empty($report['fault_ticket_id'])) {
    echo "Found fault_ticket_id: " . $report['fault_ticket_id'] . "\n";
    
    // Get work updates
    $workStmt = $conn->prepare("
        SELECT twu.*, u.full_name as technician_name
        FROM ticket_work_updates twu
        LEFT JOIN users u ON twu.technical_officer_id = u.id
        WHERE twu.ticket_id = ?
        ORDER BY twu.created_at DESC
    ");
    $workStmt->execute([$report['fault_ticket_id']]);
    $report['work_updates'] = $workStmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Work Updates for this breakdown:\n";
    print_r($report['work_updates']);
} else {
    echo "No fault_ticket_id found for this breakdown\n";
}
