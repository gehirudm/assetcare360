<?php
/**
 * Migration: Add spare parts specific fields to products table
 * Date: 2026-02-07
 * Description: Adds supplier_contact, supplier_address, warranty, warranty_terms,
 *              compatible_machines, and compatible_vehicles columns
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $db = Database::getInstance()->getConnection();
    
    echo "Starting migration: Add spare parts fields to products table\n";
    echo "=============================================================\n\n";
    
    // Check if products table exists
    $tableCheck = $db->query("SHOW TABLES LIKE 'products'");
    
    if ($tableCheck->rowCount() === 0) {
        echo "! products table does not exist yet. Skipping migration.\n";
        exit(0);
    }
    
    $columnsToAdd = [
        'supplier_contact' => "VARCHAR(100) NULL AFTER supplier",
        'supplier_address' => "TEXT NULL AFTER supplier_contact",
        'warranty' => "VARCHAR(255) NULL AFTER supplier_address",
        'warranty_terms' => "TEXT NULL AFTER warranty",
        'compatible_machines' => "JSON NULL AFTER warranty_terms",
        'compatible_vehicles' => "JSON NULL AFTER compatible_machines"
    ];
    
    $addedCount = 0;
    
    foreach ($columnsToAdd as $columnName => $columnDef) {
        // Check if column already exists
        $columnCheck = $db->query("SHOW COLUMNS FROM products LIKE '{$columnName}'");
        
        if ($columnCheck->rowCount() > 0) {
            echo "! Column '{$columnName}' already exists, skipping\n";
            continue;
        }
        
        echo "Adding column '{$columnName}'...\n";
        $db->exec("ALTER TABLE products ADD COLUMN {$columnName} {$columnDef}");
        echo "✓ Column '{$columnName}' added\n";
        $addedCount++;
    }
    
    echo "\n=============================================================\n";
    echo "Migration completed successfully!\n";
    echo "Added {$addedCount} new columns to products table.\n";
    
} catch (PDOException $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
