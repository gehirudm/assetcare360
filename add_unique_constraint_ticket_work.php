<?php
/**
 * Add unique constraint to ticket_work_updates table
 * Ensures only one work completion record per ticket
 */

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/Database.php';

echo "Adding unique constraint to ticket_work_updates table...\n\n";

try {
    $db = Database::getInstance()->getConnection();
    
    // First, check if there are any duplicate entries
    echo "1. Checking for duplicate entries...\n";
    $stmt = $db->query("
        SELECT ticket_id, COUNT(*) as count 
        FROM ticket_work_updates 
        GROUP BY ticket_id 
        HAVING count > 1
    ");
    $duplicates = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($duplicates) > 0) {
        echo "   Found " . count($duplicates) . " tickets with duplicate work records:\n";
        foreach ($duplicates as $dup) {
            echo "   - Ticket ID {$dup['ticket_id']}: {$dup['count']} records\n";
        }
        
        // Keep only the latest record for each ticket
        echo "\n2. Removing duplicate records (keeping only the latest)...\n";
        foreach ($duplicates as $dup) {
            $ticketId = $dup['ticket_id'];
            
            // Delete all but the latest record
            $db->exec("
                DELETE FROM ticket_work_updates 
                WHERE ticket_id = $ticketId 
                AND id NOT IN (
                    SELECT * FROM (
                        SELECT id FROM ticket_work_updates 
                        WHERE ticket_id = $ticketId 
                        ORDER BY created_at DESC 
                        LIMIT 1
                    ) as keep
                )
            ");
            echo "   ✓ Cleaned up ticket ID $ticketId\n";
        }
    } else {
        echo "   ✓ No duplicate entries found\n";
    }
    
    // Check if unique constraint already exists
    echo "\n3. Checking for existing unique constraint...\n";
    $stmt = $db->query("SHOW INDEX FROM ticket_work_updates WHERE Key_name = 'unique_ticket_work'");
    $indexExists = $stmt->rowCount() > 0;
    
    if ($indexExists) {
        echo "   ✓ Unique constraint already exists\n";
    } else {
        echo "   Adding unique constraint...\n";
        $db->exec("ALTER TABLE ticket_work_updates ADD UNIQUE KEY unique_ticket_work (ticket_id)");
        echo "   ✓ Unique constraint added successfully\n";
    }
    
    echo "\n✅ Migration completed successfully!\n";
    
} catch (Exception $e) {
    echo "\n❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
