<?php
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/Database.php';

$db = Database::getInstance()->getConnection();

echo "=== Technical Officer Check ===\n\n";

// Get technical officer
$stmt = $db->query('SELECT id, full_name, employee_id FROM users WHERE role = "Technical Officer"');
$tech = $stmt->fetch(PDO::FETCH_ASSOC);
if ($tech) {
    echo "Technical Officer:\n";
    echo "  ID: {$tech['id']}\n";
    echo "  Name: {$tech['full_name']}\n";
    echo "  Employee ID: {$tech['employee_id']}\n\n";
} else {
    echo "No technical officer found!\n";
    exit(1);
}

// Check fault ticket assignments
echo "Fault Ticket Assignments:\n";
$stmt = $db->prepare('
    SELECT fta.*, ft.ticket_id, ft.status as ticket_status, u.full_name as assigned_to_name
    FROM fault_ticket_assignments fta
    LEFT JOIN fault_tickets ft ON fta.fault_ticket_id = ft.id
    LEFT JOIN users u ON fta.assigned_to = u.id
    WHERE fta.assigned_to = ?
');
$stmt->execute([$tech['id']]);
$assignments = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (count($assignments) > 0) {
    foreach ($assignments as $assign) {
        echo sprintf("  Ticket: %s | Status: %s | Assignment Status: %s | Assigned At: %s\n", 
            $assign['ticket_id'], $assign['ticket_status'], $assign['status'], $assign['assigned_at']);
    }
    echo "\nTotal: " . count($assignments) . " assignments\n";
} else {
    echo "  No assignments found for this technical officer!\n\n";
    
    // Show all assignments
    echo "All assignments in database:\n";
    $stmt = $db->query('
        SELECT fta.*, ft.ticket_id, u.full_name as assigned_to_name
        FROM fault_ticket_assignments fta
        LEFT JOIN fault_tickets ft ON fta.fault_ticket_id = ft.id
        LEFT JOIN users u ON fta.assigned_to = u.id
    ');
    $allAssignments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($allAssignments) > 0) {
        foreach ($allAssignments as $assign) {
            echo sprintf("  Ticket: %s | Assigned To: %s (ID: %d) | Status: %s\n", 
                $assign['ticket_id'], $assign['assigned_to_name'], $assign['assigned_to'], $assign['status']);
        }
    } else {
        echo "  No assignments exist in the database at all!\n";
        echo "\n  This means supervisors haven't assigned any tickets yet.\n";
        echo "  To see tickets, a supervisor must:\n";
        echo "    1. Log in to the supervisor dashboard\n";
        echo "    2. View the fault tickets page\n";
        echo "    3. Click 'Assign Technician' on a ticket\n";
        echo "    4. Select the technical officer and submit\n";
    }
}
