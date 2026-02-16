<?php
require_once 'config/config.php';
require_once 'config/Database.php';

$conn = Database::getInstance()->getConnection();

echo "=== All Fault Tickets from Machinary Operators ===\n\n";
$stmt = $conn->query('
    SELECT 
        ft.id,
        ft.ticket_id, 
        ft.machine_id,
        ft.status, 
        ft.priority,
        ft.created_at,
        u.id as reporter_id,
        u.full_name as reporter_name,
        m.model_number as machine_model
    FROM fault_tickets ft
    JOIN users u ON ft.reported_by = u.id
    LEFT JOIN machines m ON ft.machine_id = m.id
    WHERE u.role = "Machinary Operator"
    ORDER BY ft.created_at DESC
');

$tickets = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (count($tickets) > 0) {
    echo "Total tickets: " . count($tickets) . "\n\n";
    foreach ($tickets as $ticket) {
        echo "Ticket ID: {$ticket['ticket_id']}\n";
        echo "  Machine: " . ($ticket['machine_model'] ?? "Machine #{$ticket['machine_id']}") . "\n";
        echo "  Status: {$ticket['status']}\n";
        echo "  Priority: {$ticket['priority']}\n";
        echo "  Reporter: {$ticket['reporter_name']} (ID: {$ticket['reporter_id']})\n";
        echo "  Created: {$ticket['created_at']}\n";
        
        // Check assignments
        $assignStmt = $conn->prepare('
            SELECT fta.*, u.full_name as tech_name
            FROM fault_ticket_assignments fta
            LEFT JOIN users u ON fta.assigned_to = u.id
            WHERE fta.fault_ticket_id = ?
        ');
        $assignStmt->execute([$ticket['id']]);
        $assignments = $assignStmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (count($assignments) > 0) {
            echo "  Assignments:\n";
            foreach ($assignments as $assign) {
                echo "    - {$assign['tech_name']} (Status: {$assign['status']})\n";
            }
        } else {
            echo "  Assignments: None\n";
        }
        echo "\n";
    }
} else {
    echo "No fault tickets found from machinary operators\n";
}
