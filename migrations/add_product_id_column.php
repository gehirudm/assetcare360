<?php
/**
 * Migration: Add product_id column to products table
 * Date: 2026-02-07
 * Description: Adds auto-generated product_id column and makes sku nullable
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $db = Database::getInstance()->getConnection();
    
    echo "Starting migration: Add product_id to products table\n";
    echo "===================================================\n\n";
    
    // Check if products table exists
    $tableCheck = $db->query("SHOW TABLES LIKE 'products'");
    
    if ($tableCheck->rowCount() === 0) {
        echo "! products table does not exist yet. It will be created when first accessed.\n";
        echo "! No migration needed at this time.\n\n";
        exit(0);
    }
    
    // Check if product_id column already exists
    $columnCheck = $db->query("SHOW COLUMNS FROM products LIKE 'product_id'");
    
    if ($columnCheck->rowCount() > 0) {
        echo "! product_id column already exists\n\n";
        exit(0);
    }
    
    echo "Step 1: Adding product_id column...\n";
    $db->exec("ALTER TABLE products ADD COLUMN product_id VARCHAR(50) UNIQUE NULL AFTER id");
    echo "✓ product_id column added\n\n";
    
    echo "Step 2: Making sku column nullable...\n";
    $db->exec("ALTER TABLE products MODIFY COLUMN sku VARCHAR(100) NULL");
    echo "✓ sku column is now nullable\n\n";
    
    echo "Step 3: Generating product_id for existing records...\n";
    $stmt = $db->query("SELECT id FROM products ORDER BY id ASC");
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $updateStmt = $db->prepare("UPDATE products SET product_id = ? WHERE id = ?");
    
    foreach ($products as $index => $product) {
        $productId = 'SPR-' . str_pad($index + 1, 3, '0', STR_PAD_LEFT);
        $updateStmt->execute([$productId, $product['id']]);
        echo "  Generated ID: {$productId} for product ID {$product['id']}\n";
    }
    
    $count = count($products);
    echo "\n✓ Generated {$count} product IDs\n\n";
    
    echo "Step 4: Making product_id NOT NULL...\n";
    $db->exec("ALTER TABLE products MODIFY COLUMN product_id VARCHAR(50) UNIQUE NOT NULL");
    echo "✓ product_id column is now NOT NULL\n\n";
    
    echo "===================================================\n";
    echo "Migration completed successfully!\n";
    echo "Summary:\n";
    echo "  - Added product_id column (SPR-XXX format)\n";
    echo "  - Made sku column nullable\n";
    echo "  - Generated {$count} product IDs\n";
    
} catch (PDOException $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
