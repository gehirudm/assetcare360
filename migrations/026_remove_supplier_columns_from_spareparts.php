<?php
/**
 * Migration: Remove supplier columns from spareparts table
 * Supplier info is now tracked per-addition in sparepart_additions table
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $db = Database::getInstance()->getConnection();
    
    $columnsToRemove = ['supplier', 'supplier_contact', 'supplier_address'];
    
    foreach ($columnsToRemove as $column) {
        $stmt = $db->query("SHOW COLUMNS FROM spareparts LIKE '{$column}'");
        if ($stmt->fetch()) {
            $db->exec("ALTER TABLE spareparts DROP COLUMN `{$column}`");
            echo "✅ Removed column '{$column}' from spareparts table\n";
        } else {
            echo "⏭️  Column '{$column}' doesn't exist, skipping\n";
        }
    }
    
    echo "\n✅ Migration complete!\n";
    
} catch (Exception $e) {
    echo "❌ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
