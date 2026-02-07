<?php
/**
 * Test script to verify products database setup
 * This will create the products table and test the API
 */

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/Database.php';
require_once __DIR__ . '/app/models/Product.php';

echo "Testing Products Database Setup\n";
echo "================================\n\n";

try {
    // Create Product model instance - this will auto-create the table
    $product = new Product();
    echo "✓ Product model initialized\n";
    
    // Check if table exists
    $db = Database::getInstance()->getConnection();
    $tableCheck = $db->query("SHOW TABLES LIKE 'products'");
    
    if ($tableCheck->rowCount() > 0) {
        echo "✓ Products table exists\n\n";
        
        // Show table structure
        echo "Table Structure:\n";
        $columns = $db->query("DESCRIBE products");
        while ($col = $columns->fetch(PDO::FETCH_ASSOC)) {
            echo "  - {$col['Field']}: {$col['Type']}\n";
        }
        echo "\n";
        
        // Test product ID generation
        $nextId = $product->generateProductId();
        echo "✓ Next Product ID: {$nextId}\n\n";
        
        // Count existing products
        $count = $db->query("SELECT COUNT(*) FROM products WHERE is_active = 1")->fetchColumn();
        echo "✓ Current active products: {$count}\n\n";
        
        echo "================================\n";
        echo "Database is ready for spare parts!\n";
        echo "You can now add spare parts through the frontend.\n";
        
    } else {
        echo "✗ Products table not created\n";
        echo "Please ensure BaseModel is properly configured.\n";
    }
    
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
