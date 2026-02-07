<?php
/**
 * Migration: Rename products table to spareparts
 * Date: 2026-02-07
 * Description: Renames the products table to spareparts
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $db = Database::getInstance()->getConnection();
    
    echo "Starting migration: Rename products table to spareparts\n";
    echo "========================================================\n\n";
    
    // Check if products table exists
    $productsTableCheck = $db->query("SHOW TABLES LIKE 'products'");
    
    if ($productsTableCheck->rowCount() === 0) {
        echo "! products table does not exist. Nothing to rename.\n";
        exit(0);
    }
    
    // Check if spareparts table already exists
    $sparepartsTableCheck = $db->query("SHOW TABLES LIKE 'spareparts'");
    
    if ($sparepartsTableCheck->rowCount() > 0) {
        echo "! spareparts table already exists. Skipping rename.\n";
        exit(0);
    }
    
    echo "Renaming products table to spareparts...\n";
    $db->exec("RENAME TABLE products TO spareparts");
    echo "✓ Table renamed successfully\n\n";
    
    echo "========================================================\n";
    echo "Migration completed successfully!\n";
    echo "Table 'products' has been renamed to 'spareparts'\n";
    
} catch (PDOException $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
