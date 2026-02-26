<?php
/**
 * Migration to remove warranty columns from sparepart_additions table
 * Run this script to update the database structure
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $pdo = Database::getInstance()->getConnection();
    
    echo "Starting migration: Remove warranty columns from sparepart_additions table\n";
    echo "==========================================================================\n\n";
    
    // Check if warranty columns exist
    $checkColumn1 = $pdo->query("SHOW COLUMNS FROM sparepart_additions LIKE 'warranty_period'");
    $warrantyPeriodExists = $checkColumn1->rowCount() > 0;
    
    $checkColumn2 = $pdo->query("SHOW COLUMNS FROM sparepart_additions LIKE 'warranty_start'");
    $warrantyStartExists = $checkColumn2->rowCount() > 0;
    
    $checkColumn3 = $pdo->query("SHOW COLUMNS FROM sparepart_additions LIKE 'warranty_terms'");
    $warrantyTermsExists = $checkColumn3->rowCount() > 0;
    
    if ($warrantyPeriodExists) {
        echo "Removing 'warranty_period' column...\n";
        $pdo->exec("ALTER TABLE sparepart_additions DROP COLUMN warranty_period");
        echo "✓ 'warranty_period' column removed successfully\n";
    } else {
        echo "- 'warranty_period' column does not exist (skipping)\n";
    }
    
    if ($warrantyStartExists) {
        echo "Removing 'warranty_start' column...\n";
        $pdo->exec("ALTER TABLE sparepart_additions DROP COLUMN warranty_start");
        echo "✓ 'warranty_start' column removed successfully\n";
    } else {
        echo "- 'warranty_start' column does not exist (skipping)\n";
    }
    
    if ($warrantyTermsExists) {
        echo "Removing 'warranty_terms' column...\n";
        $pdo->exec("ALTER TABLE sparepart_additions DROP COLUMN warranty_terms");
        echo "✓ 'warranty_terms' column removed successfully\n";
    } else {
        echo "- 'warranty_terms' column does not exist (skipping)\n";
    }
    
    echo "\n==========================================================================\n";
    echo "Migration completed successfully!\n";
    echo "Warranty columns have been removed from the sparepart_additions table.\n";
    
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
