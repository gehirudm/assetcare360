<?php
/**
 * Migration: Add ticket_id column to fault_tickets table
 * Adds a TKT-001 format ID column and updates existing records
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $db = Database::getInstance()->getConnection();
    
    echo "Starting migration: Add ticket_id to fault_tickets table\n";
    echo "========================================\n\n";
    
    // Step 1: Add ticket_id column if it doesn't exist
    echo "Step 1: Adding ticket_id column...\n";
    $checkColumn = $db->query("SHOW COLUMNS FROM fault_tickets LIKE 'ticket_id'")->fetch();
    
    if (!$checkColumn) {
        $db->exec("ALTER TABLE fault_tickets 
                   ADD COLUMN ticket_id VARCHAR(20) UNIQUE AFTER id");
        echo "✓ ticket_id column added\n\n";
    } else {
        echo "✓ ticket_id column already exists\n\n";
    }
    
    // Step 2: Generate ticket_id for existing records
    echo "Step 2: Generating ticket IDs for existing records...\n";
    $tickets = $db->query("SELECT id FROM fault_tickets WHERE ticket_id IS NULL ORDER BY id")->fetchAll();
    
    if (count($tickets) > 0) {
        $stmt = $db->prepare("UPDATE fault_tickets SET ticket_id = ? WHERE id = ?");
        
        foreach ($tickets as $ticket) {
            $ticketId = 'TKT-' . str_pad($ticket['id'], 3, '0', STR_PAD_LEFT);
            $stmt->execute([$ticketId, $ticket['id']]);
            echo "  Generated {$ticketId} for record ID {$ticket['id']}\n";
        }
        echo "✓ Updated " . count($tickets) . " existing records\n\n";
    } else {
        echo "✓ All records already have ticket IDs\n\n";
    }
    
    // Step 3: Make ticket_id NOT NULL
    echo "Step 3: Making ticket_id NOT NULL...\n";
    $db->exec("ALTER TABLE fault_tickets 
               MODIFY COLUMN ticket_id VARCHAR(20) NOT NULL UNIQUE");
    echo "✓ ticket_id column is now NOT NULL and UNIQUE\n\n";
    
    // Step 4: Verify the changes
    echo "Step 4: Verifying changes...\n";
    $result = $db->query("SELECT id, ticket_id, machine_id, priority, status 
                          FROM fault_tickets 
                          ORDER BY id 
                          LIMIT 10")->fetchAll();
    
    echo "Sample records:\n";
    echo str_pad("ID", 5) . str_pad("Ticket ID", 12) . str_pad("Machine", 10) . str_pad("Priority", 12) . "Status\n";
    echo str_repeat("-", 60) . "\n";
    
    foreach ($result as $row) {
        echo str_pad($row['id'], 5) . 
             str_pad($row['ticket_id'], 12) . 
             str_pad($row['machine_id'], 10) . 
             str_pad($row['priority'], 12) . 
             $row['status'] . "\n";
    }
    
    echo "\n========================================\n";
    echo "Migration completed successfully!\n";
    
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
