<?php

/**
 * Migration: Change fault ticket ID prefix from TKT- to MBD-
 * Updates all existing ticket_id values in the fault_tickets table
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    
    echo "Changing fault ticket ID prefix from TKT- to MBD-...\n\n";
    
    // Get all tickets with TKT- prefix
    $stmt = $conn->query("SELECT id, ticket_id FROM fault_tickets WHERE ticket_id LIKE 'TKT-%'");
    $tickets = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Found " . count($tickets) . " tickets with TKT- prefix\n";
    
    if (count($tickets) === 0) {
        echo "No tickets to update. They may already have MBD- prefix.\n";
        
        // Show current state
        $stmt = $conn->query("SELECT id, ticket_id FROM fault_tickets ORDER BY id");
        $all = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo "\nCurrent tickets:\n";
        foreach ($all as $t) {
            echo "  ID: {$t['id']} => ticket_id: {$t['ticket_id']}\n";
        }
        exit;
    }
    
    // Update each ticket
    $updateStmt = $conn->prepare("UPDATE fault_tickets SET ticket_id = ? WHERE id = ?");
    
    foreach ($tickets as $ticket) {
        // Extract the number part from TKT-XXX
        $number = substr($ticket['ticket_id'], 4); // Gets "001", "002", etc.
        $newTicketId = 'MBD-' . $number;
        
        $updateStmt->execute([$newTicketId, $ticket['id']]);
        echo "  Updated: {$ticket['ticket_id']} => {$newTicketId}\n";
    }
    
    echo "\n✓ Successfully updated " . count($tickets) . " ticket IDs from TKT- to MBD- prefix\n";
    
    // Verify
    echo "\nVerification:\n";
    $stmt = $conn->query("SELECT id, ticket_id FROM fault_tickets ORDER BY id");
    $all = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($all as $t) {
        echo "  ID: {$t['id']} => ticket_id: {$t['ticket_id']}\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
