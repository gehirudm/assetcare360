<?php
/**
 * Migration to remove warranty columns from spareparts table
 * Run this script to update the database structure
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $pdo = Database::getInstance()->getConnection();
    
    echo "Starting migration: Remove warranty columns from spareparts table\n";
    echo "================================================================\n\n";
    
    // Check if warranty column exists
    $checkColumn = $pdo->query("SHOW COLUMNS FROM spareparts LIKE 'warranty'");
    $warrantyExists = $checkColumn->rowCount() > 0;
    
    $checkColumn2 = $pdo->query("SHOW COLUMNS FROM spareparts LIKE 'warranty_terms'");
    $warrantyTermsExists = $checkColumn2->rowCount() > 0;
    
    if ($warrantyExists) {
        echo "Removing 'warranty' column...\n";
        $pdo->exec("ALTER TABLE spareparts DROP COLUMN warranty");
        echo "✓ 'warranty' column removed successfully\n";
    } else {
        echo "- 'warranty' column does not exist (skipping)\n";
    }
    
    if ($warrantyTermsExists) {
        echo "Removing 'warranty_terms' column...\n";
        $pdo->exec("ALTER TABLE spareparts DROP COLUMN warranty_terms");
        echo "✓ 'warranty_terms' column removed successfully\n";
    } else {
        echo "- 'warranty_terms' column does not exist (skipping)\n";
    }
    
    echo "\n================================================================\n";
    echo "Migration completed successfully!\n";
    echo "Warranty columns have been removed from the spareparts table.\n";
    
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
