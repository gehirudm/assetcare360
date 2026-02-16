<?php
/**
 * Migration: Seed tec_fault_repair_ticket with existing assigned tickets
 * Populates the table with all currently assigned fault tickets
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

$conn = Database::getInstance()->getConnection();

// Get all active assignments with their fault ticket details
$sql = "SELECT 
            fta.id as assignment_id,
            fta.fault_ticket_id,
            fta.assigned_to as technician_id,
            fta.expected_completion_date,
            fta.assigned_at,
            ft.ticket_id as original_ticket_id,
            ft.machine_id,
            ft.breakdown_report_id,
            ft.breakdown_type,
            ft.description as fault_description,
            ft.priority as fault_priority,
            ft.location as fault_location,
            ft.status as ticket_status
        FROM fault_ticket_assignments fta
        JOIN fault_tickets ft ON fta.fault_ticket_id = ft.id
        WHERE fta.status = 'Active'
        ORDER BY fta.assigned_at DESC";

$stmt = $conn->query($sql);
$assignments = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Found " . count($assignments) . " active assignments to migrate\n\n";

$inserted = 0;
$skipped = 0;

foreach ($assignments as $assignment) {
    // Check if already exists
    $checkSql = "SELECT id FROM tec_fault_repair_ticket WHERE assignment_id = ?";
    $checkStmt = $conn->prepare($checkSql);
    $checkStmt->execute([$assignment['assignment_id']]);
    
    if ($checkStmt->fetch()) {
        $skipped++;
        continue;
    }
    
    // Generate repair ticket ID (RPT-XXX format)
    $repairTicketId = 'RPT-' . str_pad($assignment['assignment_id'], 3, '0', STR_PAD_LEFT);
    
    // Map ticket status to repair status
    $repairStatus = 'Pending';
    if ($assignment['ticket_status'] === 'In Progress') {
        $repairStatus = 'In Repair';
    } elseif ($assignment['ticket_status'] === 'Resolved' || $assignment['ticket_status'] === 'Closed') {
        $repairStatus = 'Completed';
    }
    
    $insertSql = "INSERT INTO tec_fault_repair_ticket 
        (repair_ticket_id, fault_ticket_id, assignment_id, technician_id,
         original_ticket_id, machine_id, breakdown_report_id, breakdown_type,
         fault_description, fault_priority, fault_location, repair_status,
         expected_completion_date, received_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    try {
        $insertStmt = $conn->prepare($insertSql);
        $insertStmt->execute([
            $repairTicketId,
            $assignment['fault_ticket_id'],
            $assignment['assignment_id'],
            $assignment['technician_id'],
            $assignment['original_ticket_id'],
            $assignment['machine_id'],
            $assignment['breakdown_report_id'],
            $assignment['breakdown_type'],
            $assignment['fault_description'],
            $assignment['fault_priority'],
            $assignment['fault_location'],
            $repairStatus,
            $assignment['expected_completion_date'],
            $assignment['assigned_at']
        ]);
        $inserted++;
        echo "✓ Created repair ticket {$repairTicketId} for {$assignment['original_ticket_id']} (Tech ID: {$assignment['technician_id']})\n";
    } catch (PDOException $e) {
        echo "✗ Failed to create repair ticket for assignment {$assignment['assignment_id']}: " . $e->getMessage() . "\n";
    }
}

echo "\n=== Summary ===\n";
echo "Inserted: {$inserted}\n";
echo "Skipped (already exists): {$skipped}\n";

// Show current data
echo "\n=== Current tec_fault_repair_ticket data ===\n";
$stmt = $conn->query("SELECT repair_ticket_id, original_ticket_id, technician_id, repair_status FROM tec_fault_repair_ticket LIMIT 10");
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo $row['repair_ticket_id'] . ' | ' . $row['original_ticket_id'] . ' | Tech: ' . $row['technician_id'] . ' | ' . $row['repair_status'] . "\n";
}
