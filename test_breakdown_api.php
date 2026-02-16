<?php
require_once 'config/config.php';
require_once 'config/Database.php';

$db = Database::getInstance();
$conn = $db->getConnection();

// Same query as BreakdownReportController->index()
$sql = "SELECT br.*, 
        u.full_name as driver_name,
        v.number_plate,
        ft.id as fault_ticket_id,
        ft.ticket_id as fault_ticket_number,
        ft.status as ticket_status
        FROM vehicle_breakdown br
        LEFT JOIN users u ON br.driver_id = u.id
        LEFT JOIN vehicles v ON br.vehicle_id = v.id
        LEFT JOIN fault_tickets ft ON ft.breakdown_report_id = br.breakdown_id
        ORDER BY br.created_at DESC";

$stmt = $conn->query($sql);
$reports = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "=== All Breakdown Reports (as returned by API) ===\n";
echo "Total: " . count($reports) . "\n\n";

foreach ($reports as $report) {
    echo "breakdown_id: {$report['breakdown_id']}, status: {$report['status']}";
    if ($report['fault_ticket_id']) {
        echo ", fault_ticket: {$report['fault_ticket_number']} ({$report['ticket_status']})";
    } else {
        echo ", fault_ticket: NONE (should appear in supervisor dashboard)";
    }
    echo "\n";
}
