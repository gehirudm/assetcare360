<?php
/**
 * Migration: Update vehicle check IDs from CHK- to VCHK- format
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    
    echo "Updating vehicle check IDs from CHK- to VCHK- format...\n";
    
    // Get all existing checks with CHK- prefix
    $stmt = $conn->query("SELECT id, check_id FROM vehicle_checks WHERE check_id LIKE 'CHK-%' ORDER BY id");
    $checks = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($checks) === 0) {
        echo "✓ No records to update (already using VCHK- format)\n";
        exit(0);
    }
    
    echo "Found " . count($checks) . " records to update\n";
    
    // Update each check ID
    $updateStmt = $conn->prepare("UPDATE vehicle_checks SET check_id = :new_id WHERE id = :id");
    
    foreach ($checks as $check) {
        // Convert CHK-001 to VCHK-001
        $newId = 'VCHK-' . substr($check['check_id'], 4);
        
        $updateStmt->execute([
            ':new_id' => $newId,
            ':id' => $check['id']
        ]);
        
        echo "  ✓ Updated {$check['check_id']} → {$newId}\n";
    }
    
    echo "\n✓ Migration completed successfully!\n";
    echo "  Total records updated: " . count($checks) . "\n";
    
} catch (PDOException $e) {
    echo "✗ Database error: " . $e->getMessage() . "\n";
    exit(1);
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
