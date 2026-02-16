<?php
/**
 * Migration: Remove orphan MBD fault tickets
 * 
 * Removes MBD-prefix fault tickets that were seeded directly without being 
 * created from the machinery operator fault reporting flow.
 * Only MBD tickets with a valid breakdown_report_id (linked to machine_breakdown) are kept.
 */
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

$conn = Database::getInstance()->getConnection();

try {
    $conn->beginTransaction();
    
    // Find orphan MBD fault tickets (no breakdown_report_id)
    $stmt = $conn->query("SELECT id, ticket_id FROM fault_tickets WHERE ticket_id LIKE 'MBD%' AND (breakdown_report_id IS NULL OR breakdown_report_id = '')");
    $orphans = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($orphans)) {
        echo "No orphan MBD fault tickets found. Nothing to do." . PHP_EOL;
        exit(0);
    }
    
    $orphanIds = array_column($orphans, 'id');
    $orphanTicketIds = array_column($orphans, 'ticket_id');
    $placeholders = implode(',', array_fill(0, count($orphanIds), '?'));
    
    echo "Found " . count($orphans) . " orphan MBD fault tickets to remove:" . PHP_EOL;
    foreach ($orphans as $o) {
        echo "  - {$o['ticket_id']} (id={$o['id']})" . PHP_EOL;
    }
    
    // Step 1: Delete related fault_ticket_assignments
    $stmt = $conn->prepare("DELETE FROM fault_ticket_assignments WHERE fault_ticket_id IN ($placeholders)");
    $stmt->execute($orphanIds);
    $deletedAssignments = $stmt->rowCount();
    echo PHP_EOL . "✓ Deleted $deletedAssignments fault_ticket_assignments" . PHP_EOL;
    
    // Step 2: Delete related fault_ticket_images (if any)
    $stmt = $conn->prepare("DELETE FROM fault_ticket_images WHERE fault_ticket_id IN ($placeholders)");
    $stmt->execute($orphanIds);
    $deletedImages = $stmt->rowCount();
    echo "✓ Deleted $deletedImages fault_ticket_images" . PHP_EOL;
    
    // Step 3: Delete the orphan fault tickets
    $stmt = $conn->prepare("DELETE FROM fault_tickets WHERE id IN ($placeholders)");
    $stmt->execute($orphanIds);
    $deletedTickets = $stmt->rowCount();
    echo "✓ Deleted $deletedTickets orphan MBD fault tickets" . PHP_EOL;
    
    $conn->commit();
    
    // Verify remaining MBD tickets
    echo PHP_EOL . "=== Remaining MBD fault tickets ===" . PHP_EOL;
    $stmt = $conn->query("SELECT id, ticket_id, breakdown_report_id, breakdown_type, status FROM fault_tickets WHERE ticket_id LIKE 'MBD%' OR breakdown_type = 'machine_breakdown' ORDER BY ticket_id");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo implode(' | ', $row) . PHP_EOL;
    }
    
    echo PHP_EOL . "=== machine_breakdown table (source of truth) ===" . PHP_EOL;
    $stmt = $conn->query('SELECT breakdown_id, status FROM machine_breakdown ORDER BY breakdown_id');
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo implode(' | ', $row) . PHP_EOL;
    }
    
    echo PHP_EOL . "Done! Supervisor will now only see MBD tickets created from machinery operator fault reporting." . PHP_EOL;
    
} catch (Exception $e) {
    $conn->rollBack();
    echo "ERROR: " . $e->getMessage() . PHP_EOL;
    exit(1);
}
