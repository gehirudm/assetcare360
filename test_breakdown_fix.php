<?php
/**
 * Script to verify breakdown reports have corresponding fault tickets
 * and create missing ones
 */

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/Database.php';

$db = Database::getInstance()->getConnection();

echo "=== Breakdown Report to Fault Ticket Verification ===\n\n";

// Get all breakdown reports
$breakdowns = $db->query("
    SELECT vb.*, v.number_plate, u.full_name as driver_name
    FROM vehicle_breakdown vb
    LEFT JOIN vehicles v ON vb.vehicle_id = v.id
    LEFT JOIN users u ON vb.driver_id = u.id
    ORDER BY vb.created_at DESC
")->fetchAll();

echo "Found " . count($breakdowns) . " breakdown reports\n\n";

foreach ($breakdowns as $breakdown) {
    echo "Breakdown: {$breakdown['breakdown_id']} (Vehicle: {$breakdown['number_plate']}, Severity: {$breakdown['severity']})\n";
    
    // Check if fault ticket exists
    $ticket = $db->prepare("
        SELECT ticket_id, status 
        FROM fault_tickets 
        WHERE breakdown_report_id = ? OR breakdown_report_id = ?
    ");
    $ticket->execute([$breakdown['breakdown_id'], $breakdown['id']]);
    $existingTicket = $ticket->fetch();
    
    if ($existingTicket) {
        echo "  ✓ Has fault ticket: {$existingTicket['ticket_id']} (Status: {$existingTicket['status']})\n";
    } else {
        echo "  ✗ NO FAULT TICKET - This breakdown will not appear in supervisor dashboard\n";
        echo "  → Creating fault ticket now...\n";
        
        // Map severity to priority
        $priorityMap = [
            'critical' => 'Critical',
            'high' => 'High',
            'medium' => 'Medium',
            'low' => 'Low'
        ];
        $priority = $priorityMap[strtolower($breakdown['severity'])] ?? 'Medium';
        
        // Get location (vehicles don't have a location field, use a default)
        $location = 'Vehicle Location';
        
        // Generate ticket ID
        $ticketCount = $db->query("SELECT COUNT(*) FROM fault_tickets")->fetchColumn() + 1;
        $ticketId = "TKT-" . str_pad($ticketCount, 3, '0', STR_PAD_LEFT);
        
        // Create fault ticket
        try {
            $stmt = $db->prepare("
                INSERT INTO fault_tickets 
                (ticket_id, vehicle_id, breakdown_report_id, breakdown_type, 
                 reported_by, description, priority, location, status, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Open', ?)
            ");
            
            $stmt->execute([
                $ticketId,
                $breakdown['vehicle_id'],
                $breakdown['breakdown_id'],
                $breakdown['breakdown_type'],
                $breakdown['driver_id'],
                "Vehicle Breakdown: " . $breakdown['description'] . "\n\nBreakdown Type: " . $breakdown['breakdown_type'] . "\nSeverity: " . $breakdown['severity'],
                $priority,
                $location,
                $breakdown['breakdown_date'] . ' ' . date('H:i:s')
            ]);
            
            echo "  ✓ Created fault ticket: $ticketId\n";
        } catch (Exception $e) {
            echo "  ✗ Error creating ticket: " . $e->getMessage() . "\n";
        }
    }
    
    echo "\n";
}

echo "\n=== Verification Complete ===\n";
echo "\nAll breakdown reports should now have corresponding fault tickets.\n";
echo "Check the supervisor dashboard to verify they appear in the Fault Tickets section.\n";
