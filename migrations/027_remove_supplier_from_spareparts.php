<?php
/**
 * Migration to remove supplier columns from spareparts table
 * Run this script to update the database structure
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $pdo = Database::getInstance()->getConnection();
    
    echo "Starting migration: Remove supplier columns from spareparts table\n";
    echo "===================================================================\n\n";
    
    // Check if supplier columns exist
    $checkColumn1 = $pdo->query("SHOW COLUMNS FROM spareparts LIKE 'supplier'");
    $supplierExists = $checkColumn1->rowCount() > 0;
    
    $checkColumn2 = $pdo->query("SHOW COLUMNS FROM spareparts LIKE 'supplier_contact'");
    $supplierContactExists = $checkColumn2->rowCount() > 0;
    
    $checkColumn3 = $pdo->query("SHOW COLUMNS FROM spareparts LIKE 'supplier_address'");
    $supplierAddressExists = $checkColumn3->rowCount() > 0;
    
    if ($supplierExists) {
        echo "Removing 'supplier' column...\n";
        $pdo->exec("ALTER TABLE spareparts DROP COLUMN supplier");
        echo "✓ 'supplier' column removed successfully\n";
    } else {
        echo "- 'supplier' column does not exist (skipping)\n";
    }
    
    if ($supplierContactExists) {
        echo "Removing 'supplier_contact' column...\n";
        $pdo->exec("ALTER TABLE spareparts DROP COLUMN supplier_contact");
        echo "✓ 'supplier_contact' column removed successfully\n";
    } else {
        echo "- 'supplier_contact' column does not exist (skipping)\n";
    }
    
    if ($supplierAddressExists) {
        echo "Removing 'supplier_address' column...\n";
        $pdo->exec("ALTER TABLE spareparts DROP COLUMN supplier_address");
        echo "✓ 'supplier_address' column removed successfully\n";
    } else {
        echo "- 'supplier_address' column does not exist (skipping)\n";
    }
    
    echo "\n===================================================================\n";
    echo "Migration completed successfully!\n";
    echo "Supplier columns have been removed from the spareparts table.\n";
    echo "Supplier information is now only tracked in sparepart_additions.\n";
    
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
