<?php
/**
 * Update ticket assignments to assign to the Technical Officer (ID: 4)
 * Currently they are assigned to Supervisor (ID: 5) or deleted user (ID: 25)
 */

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/Database.php';

try {
    $db = Database::getInstance()->getConnection();
    $db->beginTransaction();
    
    // Get the technical officer ID
    $stmt = $db->query('SELECT id FROM users WHERE role = "Technical Officer" LIMIT 1');
    $tech = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$tech) {
        echo "Error: No technical officer found!\n";
        exit(1);
    }
    
    $techId = $tech['id'];
    echo "Technical Officer ID: $techId\n\n";
    
    // Update all assignments that are not assigned to the technical officer
    echo "Updating assignments...\n";
    
    $stmt = $db->prepare('UPDATE fault_ticket_assignments SET assigned_to = ? WHERE assigned_to != ?');
    $stmt->execute([$techId, $techId]);
    $updatedCount = $stmt->rowCount();
    
    $db->commit();
    
    echo "✓ Successfully updated $updatedCount assignments to Technical Officer (ID: $techId)\n\n";
    
    // Verify the changes
    echo "Verification - Assignments for Technical Officer:\n";
    $stmt = $db->prepare('
        SELECT fta.*, ft.ticket_id, ft.status as ticket_status
        FROM fault_ticket_assignments fta
        LEFT JOIN fault_tickets ft ON fta.fault_ticket_id = ft.id
        WHERE fta.assigned_to = ?
        ORDER BY fta.assigned_at DESC
        LIMIT 10
    ');
    $stmt->execute([$techId]);
    $assignments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($assignments as $assign) {
        echo sprintf("  Ticket: %s | Status: %s | Assignment Status: %s\n", 
            $assign['ticket_id'] ?? 'N/A', $assign['ticket_status'], $assign['status']);
    }
    
    echo "\nTotal assignments: " . count($assignments) . "\n";
    
} catch (Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
