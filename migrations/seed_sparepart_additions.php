<?php
/**
 * Migration: Seed sparepart_additions table with sample data
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $db = Database::getInstance()->getConnection();
    
    echo "Starting migration: seed_sparepart_additions\n";
    
    // Clear existing data to reseed with correct IDs
    $db->exec("DELETE FROM sparepart_additions");
    echo "Cleared existing data\n";
    
    // Sample data - matching actual spareparts from catalog
    $additions = [
        [
            'sparepart_id' => 'SPR-008',
            'sparepart_name' => 'Brake Pads',
            'category' => 'vehicles',
            'location' => 'LOCATION 1',
            'quantity_added' => 50,
            'previous_stock' => 0,
            'new_stock' => 50,
            'received_date' => '2026-01-15',
            'supplier' => 'AutoParts Lanka',
            'supplier_contact' => '+94 11 234 5678',
            'supplier_address' => '123 Galle Road, Colombo 03',
            'warranty_period' => 12,
            'warranty_start' => '2026-01-15',
            'warranty_terms' => 'Manufacturer defects covered. Installation warranty excluded.',
            'compatible_machines' => null,
            'compatible_vehicles' => json_encode(['Truck', 'Van']),
            'reference' => 'INV-2026-001',
            'notes' => 'Initial stock purchase for vehicle fleet',
            'added_by' => 'admin'
        ],
        [
            'sparepart_id' => 'SPR-009',
            'sparepart_name' => 'Oil Filter',
            'category' => 'vehicles',
            'location' => 'LOCATION 2',
            'quantity_added' => 100,
            'previous_stock' => 0,
            'new_stock' => 100,
            'received_date' => '2026-01-18',
            'supplier' => 'Industrial Supplies Co.',
            'supplier_contact' => '+94 11 567 8901',
            'supplier_address' => '456 Baseline Road, Colombo 09',
            'warranty_period' => 6,
            'warranty_start' => '2026-01-18',
            'warranty_terms' => 'Quality guarantee for 6 months',
            'compatible_machines' => null,
            'compatible_vehicles' => json_encode(['Van', 'Car', 'Lorry']),
            'reference' => 'PO-2026-015',
            'notes' => 'Bulk order for vehicle maintenance',
            'added_by' => 'admin'
        ],
        [
            'sparepart_id' => 'SPR-010',
            'sparepart_name' => 'Filling Valve',
            'category' => 'machines',
            'location' => 'LOCATION 3',
            'quantity_added' => 25,
            'previous_stock' => 0,
            'new_stock' => 25,
            'received_date' => '2026-01-22',
            'supplier' => 'Hydraulics Direct',
            'supplier_contact' => '+94 11 789 0123',
            'supplier_address' => '789 Industrial Estate, Kelaniya',
            'warranty_period' => 24,
            'warranty_start' => '2026-01-22',
            'warranty_terms' => 'Full replacement for manufacturing defects. Extended warranty available.',
            'compatible_machines' => json_encode(['Loader', 'Crane']),
            'compatible_vehicles' => null,
            'reference' => 'INV-HYD-2026-03',
            'notes' => 'Premium quality valves with extended warranty',
            'added_by' => 'admin'
        ],
        [
            'sparepart_id' => 'SPR-014',
            'sparepart_name' => 'Air Filter',
            'category' => 'vehicles',
            'location' => 'LOCATION 1',
            'quantity_added' => 75,
            'previous_stock' => 0,
            'new_stock' => 75,
            'received_date' => '2026-01-25',
            'supplier' => 'AutoParts Lanka',
            'supplier_contact' => '+94 11 234 5678',
            'supplier_address' => '123 Galle Road, Colombo 03',
            'warranty_period' => 12,
            'warranty_start' => '2026-01-25',
            'warranty_terms' => 'Standard manufacturer warranty',
            'compatible_machines' => null,
            'compatible_vehicles' => json_encode(['Van', 'Lorry', 'Truck']),
            'reference' => 'INV-2026-008',
            'notes' => 'Regular stock replenishment',
            'added_by' => 'admin'
        ],
        [
            'sparepart_id' => 'SPR-013',
            'sparepart_name' => 'Fuel Filter',
            'category' => 'vehicles',
            'location' => 'LOCATION 2',
            'quantity_added' => 60,
            'previous_stock' => 0,
            'new_stock' => 60,
            'received_date' => '2026-02-01',
            'supplier' => 'Premium Auto Parts',
            'supplier_contact' => '+94 77 345 6789',
            'supplier_address' => '321 Duplication Road, Colombo 04',
            'warranty_period' => 18,
            'warranty_start' => '2026-02-01',
            'warranty_terms' => 'Limited lifetime warranty on filter housing',
            'compatible_machines' => null,
            'compatible_vehicles' => json_encode(['Van', 'Car', 'Lorry']),
            'reference' => 'PO-2026-025',
            'notes' => 'High-quality replacement filters',
            'added_by' => 'admin'
        ],
        [
            'sparepart_id' => 'SPR-011',
            'sparepart_name' => 'Pressure Gauge',
            'category' => 'machines',
            'location' => 'LOCATION 4',
            'quantity_added' => 40,
            'previous_stock' => 0,
            'new_stock' => 40,
            'received_date' => '2026-02-03',
            'supplier' => 'Industrial Supplies Co.',
            'supplier_contact' => '+94 11 567 8901',
            'supplier_address' => '456 Baseline Road, Colombo 09',
            'warranty_period' => 12,
            'warranty_start' => '2026-02-03',
            'warranty_terms' => 'Warranty covers material defects only',
            'compatible_machines' => json_encode(['Excavator', 'Loader', 'Bulldozer']),
            'compatible_vehicles' => null,
            'reference' => 'INV-2026-012',
            'notes' => 'Critical replacement parts for scheduled maintenance',
            'added_by' => 'admin'
        ],
        [
            'sparepart_id' => 'SPR-012',
            'sparepart_name' => 'Hydraulic Pump',
            'category' => 'machines',
            'location' => 'LOCATION 3',
            'quantity_added' => 30,
            'previous_stock' => 0,
            'new_stock' => 30,
            'received_date' => '2026-02-05',
            'supplier' => 'Hydraulics Direct',
            'supplier_contact' => '+94 11 789 0123',
            'supplier_address' => '789 Industrial Estate, Kelaniya',
            'warranty_period' => 24,
            'warranty_start' => '2026-02-05',
            'warranty_terms' => 'Full warranty on pump and fittings',
            'compatible_machines' => json_encode(['Crane', 'Excavator', 'Loader']),
            'compatible_vehicles' => null,
            'reference' => 'INV-HYD-2026-05',
            'notes' => 'Complete hydraulic pump replacement units',
            'added_by' => 'admin'
        ],
        [
            'sparepart_id' => 'SPR-005',
            'sparepart_name' => 'Filling Valve',
            'category' => 'machines',
            'location' => 'LOCATION 3',
            'quantity_added' => 35,
            'previous_stock' => 0,
            'new_stock' => 35,
            'received_date' => '2026-02-07',
            'supplier' => 'Hydraulics Direct',
            'supplier_contact' => '+94 11 789 0123',
            'supplier_address' => '789 Industrial Estate, Kelaniya',
            'warranty_period' => 18,
            'warranty_start' => '2026-02-07',
            'warranty_terms' => 'Full warranty on valves and seals',
            'compatible_machines' => json_encode(['Bulldozer', 'Loader']),
            'compatible_vehicles' => null,
            'reference' => 'INV-HYD-2026-08',
            'notes' => 'High-pressure filling valves for heavy machinery',
            'added_by' => 'admin'
        ]
    ];
    
    $insertSql = "INSERT INTO sparepart_additions 
        (sparepart_id, sparepart_name, category, location, quantity_added, previous_stock, new_stock, 
         received_date, supplier, supplier_contact, supplier_address, warranty_period, warranty_start, 
         warranty_terms, compatible_machines, compatible_vehicles, reference, notes, added_by) 
        VALUES 
        (:sparepart_id, :sparepart_name, :category, :location, :quantity_added, :previous_stock, :new_stock, 
         :received_date, :supplier, :supplier_contact, :supplier_address, :warranty_period, :warranty_start, 
         :warranty_terms, :compatible_machines, :compatible_vehicles, :reference, :notes, :added_by)";
    
    $stmt = $db->prepare($insertSql);
    
    foreach ($additions as $addition) {
        $stmt->execute($addition);
    }
    
    echo "✓ Successfully added " . count($additions) . " sample records to sparepart_additions table\n";
    echo "Migration completed successfully!\n";
    
} catch (PDOException $e) {
    echo "❌ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
