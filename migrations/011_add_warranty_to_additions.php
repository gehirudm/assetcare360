<?php
/**
 * Migration to add warranty columns to sparepart_additions table
 * Run this script to update the database structure
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $pdo = Database::getInstance()->getConnection();
    
    echo "Starting migration: Add warranty columns to sparepart_additions table\n";
    echo "======================================================================\n\n";
    
    // Check if warranty columns exist
    $checkColumn1 = $pdo->query("SHOW COLUMNS FROM sparepart_additions LIKE 'warranty_period'");
    $warrantyPeriodExists = $checkColumn1->rowCount() > 0;
    
    if (!$warrantyPeriodExists) {
        echo "Adding 'warranty_period' column...\n";
        $pdo->exec("ALTER TABLE sparepart_additions ADD COLUMN warranty_period INT NULL AFTER supplier_address");
        echo "✓ 'warranty_period' column added successfully\n";
    } else {
        echo "- 'warranty_period' column already exists (skipping)\n";
    }
    
    $checkColumn2 = $pdo->query("SHOW COLUMNS FROM sparepart_additions LIKE 'warranty_start'");
    $warrantyStartExists = $checkColumn2->rowCount() > 0;
    
    if (!$warrantyStartExists) {
        echo "Adding 'warranty_start' column...\n";
        $pdo->exec("ALTER TABLE sparepart_additions ADD COLUMN warranty_start DATE NULL AFTER warranty_period");
        echo "✓ 'warranty_start' column added successfully\n";
    } else {
        echo "- 'warranty_start' column already exists (skipping)\n";
    }
    
    $checkColumn3 = $pdo->query("SHOW COLUMNS FROM sparepart_additions LIKE 'warranty_terms'");
    $warrantyTermsExists = $checkColumn3->rowCount() > 0;
    
    if (!$warrantyTermsExists) {
        echo "Adding 'warranty_terms' column...\n";
        $pdo->exec("ALTER TABLE sparepart_additions ADD COLUMN warranty_terms TEXT NULL AFTER warranty_start");
        echo "✓ 'warranty_terms' column added successfully\n";
    } else {
        echo "- 'warranty_terms' column already exists (skipping)\n";
    }
    
    echo "\n======================================================================\n";
    echo "Migration completed successfully!\n";
    echo "Warranty columns have been added to the sparepart_additions table.\n";
    
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
