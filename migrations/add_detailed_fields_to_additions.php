<?php
/**
 * Migration: Add detailed fields to sparepart_additions table
 * Adds category, location, supplier_contact, supplier_address, warranty fields
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $db = Database::getInstance()->getConnection();
    
    echo "Starting migration: add_detailed_fields_to_additions\n";
    
    // Check if columns already exist
    $checkStmt = $db->prepare("SHOW COLUMNS FROM sparepart_additions LIKE 'category'");
    $checkStmt->execute();
    
    if ($checkStmt->rowCount() > 0) {
        echo "Columns already exist.\n";
        exit(0);
    }
    
    // Add new columns
    $alterSql = "ALTER TABLE sparepart_additions
        ADD COLUMN category VARCHAR(50) NULL AFTER sparepart_name,
        ADD COLUMN location VARCHAR(100) NULL AFTER category,
        ADD COLUMN supplier_contact VARCHAR(100) NULL AFTER supplier,
        ADD COLUMN supplier_address TEXT NULL AFTER supplier_contact,
        ADD COLUMN warranty_period INT NULL AFTER supplier_address,
        ADD COLUMN warranty_start DATE NULL AFTER warranty_period,
        ADD COLUMN warranty_terms TEXT NULL AFTER warranty_start,
        ADD COLUMN compatible_machines JSON NULL AFTER warranty_terms,
        ADD COLUMN compatible_vehicles JSON NULL AFTER compatible_machines";
    
    $db->exec($alterSql);
    
    echo "✓ Successfully added detailed fields to 'sparepart_additions' table\n";
    echo "Migration completed successfully!\n";
    
} catch (PDOException $e) {
    echo "❌ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
