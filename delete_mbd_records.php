<?php
/**
 * Delete MBD-005, MBD-006, MBD-007, and MBD-008 from machine_breakdown table
 */

require_once 'config/config.php';
require_once 'config/Database.php';

$db = Database::getInstance();
$conn = $db->getConnection();

echo "=== Deleting Machine Breakdown Records ===\n\n";

try {
    $conn->beginTransaction();
    
    // First, check if these records exist
    $checkStmt = $conn->query("
        SELECT breakdown_id, machine_id, operator_id, description, status 
        FROM machine_breakdown 
        WHERE breakdown_id IN ('MBD-005', 'MBD-006', 'MBD-007', 'MBD-008')
        ORDER BY breakdown_id
    ");
    
    $existingRecords = $checkStmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($existingRecords)) {
        echo "No records found to delete.\n";
        $conn->rollBack();
        exit(0);
    }
    
    echo "Found " . count($existingRecords) . " record(s) to delete:\n\n";
    foreach ($existingRecords as $record) {
        echo "  - {$record['breakdown_id']}: {$record['description']} (Status: {$record['status']})\n";
    }
    
    echo "\n";
    
    // Delete related fault tickets first (if any)
    $deleteFaultTicketsStmt = $conn->prepare("
        DELETE FROM fault_tickets 
        WHERE breakdown_report_id IN ('MBD-005', 'MBD-006', 'MBD-007', 'MBD-008')
        AND breakdown_type = 'machine_breakdown'
    ");
    $deleteFaultTicketsStmt->execute();
    $deletedTickets = $deleteFaultTicketsStmt->rowCount();
    
    if ($deletedTickets > 0) {
        echo "Deleted {$deletedTickets} related fault ticket(s).\n";
    }
    
    // Delete the machine breakdown records
    $deleteStmt = $conn->prepare("
        DELETE FROM machine_breakdown 
        WHERE breakdown_id IN ('MBD-005', 'MBD-006', 'MBD-007', 'MBD-008')
    ");
    $deleteStmt->execute();
    $deletedCount = $deleteStmt->rowCount();
    
    $conn->commit();
    
    echo "Successfully deleted {$deletedCount} machine breakdown record(s).\n\n";
    
    // Verify deletion
    $verifyStmt = $conn->query("
        SELECT COUNT(*) as count 
        FROM machine_breakdown 
        WHERE breakdown_id IN ('MBD-005', 'MBD-006', 'MBD-007', 'MBD-008')
    ");
    $remaining = $verifyStmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    if ($remaining == 0) {
        echo "✓ Verification successful: All specified records have been deleted.\n";
    } else {
        echo "⚠ Warning: {$remaining} record(s) still remain in the database.\n";
    }
    
} catch (Exception $e) {
    $conn->rollBack();
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
