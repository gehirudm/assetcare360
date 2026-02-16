<?php
require_once 'config/config.php';
require_once 'config/Database.php';

$db = Database::getInstance();
$conn = $db->getConnection();

echo "=== Vehicle Breakdowns WITHOUT Fault Tickets ===\n";
$sql = "SELECT vb.* 
        FROM vehicle_breakdown vb
        LEFT JOIN fault_tickets ft ON ft.breakdown_report_id = vb.breakdown_id
        WHERE ft.id IS NULL
        ORDER BY vb.created_at DESC
        LIMIT 5";
$stmt = $conn->query($sql);
$breakdowns = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (count($breakdowns) > 0) {
    foreach ($breakdowns as $bd) {
        echo "ID: {$bd['id']}, breakdown_id: {$bd['breakdown_id']}, Status: {$bd['status']}, Date: {$bd['breakdown_date']}\n";
    }
} else {
    echo "No unlinked breakdowns found\n";
}

echo "\n=== Vehicle Breakdowns WITH Fault Tickets ===\n";
$sql2 = "SELECT vb.breakdown_id, vb.status as bd_status, ft.ticket_id, ft.status as ft_status 
         FROM vehicle_breakdown vb
         INNER JOIN fault_tickets ft ON ft.breakdown_report_id = vb.breakdown_id
         ORDER BY vb.created_at DESC
         LIMIT 5";
$stmt2 = $conn->query($sql2);
$linked = $stmt2->fetchAll(PDO::FETCH_ASSOC);

if (count($linked) > 0) {
    foreach ($linked as $item) {
        echo "Breakdown: {$item['breakdown_id']} ({$item['bd_status']}) -> Ticket: {$item['ticket_id']} ({$item['ft_status']})\n";
    }
} else {
    echo "No linked breakdowns found\n";
}
