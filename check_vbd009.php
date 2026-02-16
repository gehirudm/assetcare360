<?php
require_once 'config/config.php';
require_once 'config/Database.php';

$db = Database::getInstance();
$conn = $db->getConnection();

echo "=== VBD-009 Breakdown Details ===\n";
$sql = "SELECT * FROM vehicle_breakdown WHERE breakdown_id = 'VBD-009'";
$stmt = $conn->query($sql);
$breakdown = $stmt->fetch(PDO::FETCH_ASSOC);

if ($breakdown) {
    print_r($breakdown);
} else {
    echo "VBD-009 not found in vehicle_breakdown table\n";
}

echo "\n=== Fault Ticket for VBD-009 ===\n";
$sql = "SELECT ft.*, u.full_name as reporter_name 
        FROM fault_tickets ft
        LEFT JOIN users u ON ft.reported_by = u.id
        WHERE ft.breakdown_report_id = 'VBD-009'";
$stmt = $conn->query($sql);
$ticket = $stmt->fetch(PDO::FETCH_ASSOC);

if ($ticket) {
    print_r($ticket);
    
    echo "\n=== Assignments for this Ticket ===\n";
    $sql = "SELECT fta.*, u.full_name as technician_name, u.role
            FROM fault_ticket_assignments fta
            LEFT JOIN users u ON fta.assigned_to = u.id
            WHERE fta.fault_ticket_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->execute([$ticket['id']]);
    $assignments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($assignments) > 0) {
        foreach ($assignments as $assignment) {
            print_r($assignment);
        }
    } else {
        echo "No assignments found for this ticket\n";
    }
} else {
    echo "No fault ticket found for VBD-009\n";
}
