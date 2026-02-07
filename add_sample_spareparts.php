<?php
/**
 * Add sample spare parts data to test frontend
 */

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/Database.php';
require_once __DIR__ . '/app/services/ProductService.php';

echo "Adding Sample Spare Parts Data\n";
echo "================================\n\n";

$productService = new ProductService();

$sampleParts = [
    [
        'name' => 'Brake Pads',
        'category' => 'vehicles',
        'quantity' => 45,
        'location' => 'LOCATION 1',
        'supplier' => 'Auto Parts Inc.',
        'supplier_contact' => '+94-77-123-4567',
        'supplier_address' => '123 Brake Street, Colombo',
        'warranty' => 'Active until Dec 2026',
        'warranty_terms' => '12-month warranty against defects',
        'compatible_machines' => json_encode([]),
        'compatible_vehicles' => json_encode(['Delivery Van', 'Staff Car', 'Pickup Truck']),
        'unit_price' => 4500.00,
        'reorder_level' => 10
    ],
    [
        'name' => 'Oil Filter',
        'category' => 'vehicles',
        'quantity' => 30,
        'location' => 'LOCATION 2',
        'supplier' => 'FilterMax Ltd.',
        'supplier_contact' => '+94-77-234-5678',
        'supplier_address' => '456 Filter Ave, Colombo',
        'warranty' => 'Active until Jun 2026',
        'warranty_terms' => '6-month warranty',
        'compatible_machines' => json_encode(['Forklift']),
        'compatible_vehicles' => json_encode(['Tanker Lorry', 'Distribution Truck']),
        'unit_price' => 1250.00,
        'reorder_level' => 15
    ],
    [
        'name' => 'Filling Valve',
        'category' => 'machines',
        'quantity' => 8,
        'location' => 'LOCATION 1',
        'supplier' => 'Industrial Parts Co.',
        'supplier_contact' => '+94-77-345-6789',
        'supplier_address' => '789 Industrial Road, Colombo',
        'warranty' => 'Active until Dec 2027',
        'warranty_terms' => '24-month warranty with free service',
        'compatible_machines' => json_encode(['LPG Cylinder Filling Machine', 'Cylinder Carousel System']),
        'compatible_vehicles' => json_encode([]),
        'unit_price' => 25500.00,
        'reorder_level' => 5
    ],
    [
        'name' => 'Pressure Gauge',
        'category' => 'machines',
        'quantity' => 15,
        'location' => 'LOCATION 3',
        'supplier' => 'Precision Instruments Ltd.',
        'supplier_contact' => '+94-77-456-7890',
        'supplier_address' => '321 Gauge Street, Colombo',
        'warranty' => 'Active until Sep 2026',
        'warranty_terms' => '12-month warranty',
        'compatible_machines' => json_encode(['Gas Compressor', 'LPG Storage Tank', 'Vaporizer']),
        'compatible_vehicles' => json_encode([]),
        'unit_price' => 8900.00,
        'reorder_level' => 8
    ],
    [
        'name' => 'Hydraulic Pump',
        'category' => 'machines',
        'quantity' => 3,
        'location' => 'LOCATION 2',
        'supplier' => 'Hydraulic Systems Pro',
        'supplier_contact' => '+94-77-567-8901',
        'supplier_address' => '654 Hydraulic Blvd, Colombo',
        'warranty' => 'Active until Mar 2027',
        'warranty_terms' => '18-month warranty with free installation',
        'compatible_machines' => json_encode(['Gas Cylinder Testing Machine', 'Valve Crimping Machine', 'Forklift']),
        'compatible_vehicles' => json_encode([]),
        'unit_price' => 45000.00,
        'reorder_level' => 3
    ]
];

$addedCount = 0;

foreach ($sampleParts as $part) {
    $result = $productService->createProduct($part);
    if ($result['status'] === 'success') {
        echo "✓ Added: {$part['name']} ({$result['data']['product_id']})\n";
        $addedCount++;
    } else {
        echo "✗ Failed to add {$part['name']}: {$result['message']}\n";
    }
}

echo "\n================================\n";
echo "Added {$addedCount} sample spare parts\n";
echo "You can now view them in the frontend\n";
