<?php
/**
 * Test API endpoints for products/spare parts
 */

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/Database.php';
require_once __DIR__ . '/app/services/ProductService.php';

echo "Testing Products API\n";
echo "====================\n\n";

$productService = new ProductService();

// Test 1: Get next product ID
echo "Test 1: Get Next Product ID\n";
$result = $productService->getNextProductId();
if ($result['status'] === 'success') {
    echo "✓ Next ID: {$result['data']['next_id']}\n\n";
} else {
    echo "✗ Failed: {$result['message']}\n\n";
}

// Test 2: Create a test product
echo "Test 2: Create Test Product\n";
$testProduct = [
    'name' => 'Test Brake Pad',
    'category' => 'vehicles',
    'quantity' => 25,
    'location' => 'LOCATION 1',
    'supplier' => 'Test Supplier Inc.',
    'supplier_contact' => '+94-77-123-4567',
    'supplier_address' => '123 Test Street, Colombo',
    'warranty' => 'Active until Dec 2026',
    'warranty_terms' => '12-month warranty',
    'compatible_machines' => json_encode(['Forklift']),
    'compatible_vehicles' => json_encode(['Delivery Van', 'Staff Car']),
    'unit_price' => 150.00,
    'reorder_level' => 10
];

$result = $productService->createProduct($testProduct);
if ($result['status'] === 'success') {
    echo "✓ Product created: {$result['data']['product_id']}\n";
    $createdProductId = $result['data']['id'];
    echo "  Database ID: {$createdProductId}\n\n";
} else {
    echo "✗ Failed: {$result['message']}\n\n";
    exit(1);
}

// Test 3: Get all products
echo "Test 3: Get All Products\n";
$result = $productService->getAllProducts();
if ($result['status'] === 'success') {
    $count = count($result['data']['products']);
    echo "✓ Retrieved {$count} products\n";
    if ($count > 0) {
        $product = $result['data']['products'][0];
        echo "  First product: {$product['name']} ({$product['product_id']})\n\n";
    }
} else {
    echo "✗ Failed: {$result['message']}\n\n";
}

// Test 4: Get product by ID
echo "Test 4: Get Product by ID\n";
$result = $productService->getProductById($createdProductId);
if ($result['status'] === 'success') {
    echo "✓ Retrieved product: {$result['data']['name']}\n";
    echo "  Category: {$result['data']['category']}\n";
    echo "  Quantity: {$result['data']['quantity']}\n";
    echo "  Location: {$result['data']['location']}\n\n";
} else {
    echo "✗ Failed: {$result['message']}\n\n";
}

// Test 5: Update product
echo "Test 5: Update Product\n";
$updateData = [
    'quantity' => 30,
    'location' => 'LOCATION 2'
];
$result = $productService->updateProduct($createdProductId, $updateData);
if ($result['status'] === 'success') {
    echo "✓ Product updated successfully\n\n";
} else {
    echo "✗ Failed: {$result['message']}\n\n";
}

// Test 6: Delete product
echo "Test 6: Delete Product\n";
$result = $productService->deleteProduct($createdProductId);
if ($result['status'] === 'success') {
    echo "✓ Product deleted successfully\n\n";
} else {
    echo "✗ Failed: {$result['message']}\n\n";
}

echo "====================\n";
echo "All tests completed!\n";
