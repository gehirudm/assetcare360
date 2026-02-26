<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../app/models/User.php';
require_once __DIR__ . '/../app/models/Machine.php';
require_once __DIR__ . '/../app/models/Vehicle.php';
require_once __DIR__ . '/../app/models/Product.php';

$db = Database::getInstance()->getConnection();
$userModel = new User();
$machineModel = new Machine();
$vehicleModel = new Vehicle();

echo "Starting Database Seeding with Sri Lankan Data...\n";

// Disable foreign key checks for clean sweep
$db->exec('SET FOREIGN_KEY_CHECKS = 0');
$tables = ['users', 'machines', 'vehicles', 'spareparts', 'api_request_logs', 'budget_reports', 'fault_ticket_assignments', 'fault_ticket_images', 'machine_breakdown', 'machine_weekly_checks', 'passkey_credentials', 'spare_part_request_items', 'spare_part_requests', 'sparepart_additions', 'sparepart_usage', 'tec_fault_repair_ticket', 'ticket_work_updates', 'trips', 'vehicle_breakdown', 'vehicle_breakdown_inroute', 'vehicle_checks'];
foreach ($tables as $table) {
    try {
        $db->exec("TRUNCATE TABLE `$table`");
    } catch (Exception $e) {
        // Table might not exist, ignore
    }
}
$db->exec('SET FOREIGN_KEY_CHECKS = 1');
echo "✓ Cleared all existing data\n";

// 1. Seed Users (Sri Lankan Context)
$users = [
    // Admins
    ['LITRO-ADMIN-001', 'password123', 'Kasun Perera', 'Admin', 'IT', 'kasun.p@assetcare360.lk', '+94771234567'],
    // Maintenance Managers
    ['LITRO-MM-001', 'password123', 'Nuwan Silva', 'Maintenance Manager', 'Maintenance', 'nuwan.s@assetcare360.lk', '+94712345678'],
    // Inventory Managers
    ['LITRO-IM-001', 'password123', 'Amila Rathnayake', 'Inventory Manager', 'Inventory', 'amila.r@assetcare360.lk', '+94763456789'],
    ['LITRO-IM-002', 'password123', 'Gehiru Damnidu', 'Inventory Manager', 'Inventory', 'gehiru.d@assetcare360.lk', '+94784567890'],
    // Technical Officers
    ['LITRO-TO-001', 'password123', 'Isum Dissanayake', 'Technical Officer', 'Engineering', 'isum.d@assetcare360.lk', '+94755678901'],
    ['LITRO-TO-002', 'password123', 'Chamara Fernando', 'Technical Officer', 'Engineering', 'chamara.f@assetcare360.lk', '+94726789012'],
    // Supervisors
    ['LITRO-SUP-001', 'password123', 'Ruwan Jayasinghe', 'Supervisor', 'Operations', 'ruwan.j@assetcare360.lk', '+94707890123'],
    // Machinary Operators
    ['LITRO-OP-001', 'password123', 'Sunil Kumara', 'Machinary Operator', 'Operations', 'sunil.k@assetcare360.lk', '+94778901234'],
    ['LITRO-OP-002', 'password123', 'Senash Wijesinghe', 'Machinary Operator', 'Operations', 'senash.w@assetcare360.lk', '+94719012345'],
    ['LITRO-OP-003', 'password123', 'Kamal Bandara', 'Machinary Operator', 'Operations', 'kamal.b@assetcare360.lk', '+94760123456'],
    // Drivers
    ['LITRO-DRV-001', 'password123', 'Nimal Rajapaksha', 'Driver', 'Logistics', 'nimal.r@assetcare360.lk', '+94781234567'],
    ['LITRO-DRV-002', 'password123', 'Sandara Gunawardena', 'Driver', 'Logistics', 'sandara.g@assetcare360.lk', '+94752345678'],
];

echo "Seeding Users...\n";
foreach ($users as $u) {
    if (!$userModel->findByEmployeeId($u[0])) {
        $userModel->create([
            'employee_id' => $u[0],
            'password' => password_hash($u[1], PASSWORD_DEFAULT),
            'full_name' => $u[2],
            'role' => $u[3],
            'department' => $u[4],
            'email' => $u[5],
            'phone' => $u[6],
            'is_active' => 1,
            'force_password_change' => 0
        ]);
        echo "  - Added {$u[2]} ({$u[3]})\n";
    }
}
echo "✓ Users seeded successfully\n";

// 2. Seed Machines
$machines = [
    ['SN-EXC-001', 'CAT-320', 'Caterpillar 320 Excavator', 'Site A - Colombo', '2026-12-31', 'Access Motors', 'Diesel, Hydraulics', 'Active', 'Heavy machinery for excavations.'],
    ['SN-LDR-001', 'JCB-420', 'JCB 420 Wheel Loader', 'Site B - Kandy', '2027-06-15', 'Browns Machinery', 'Diesel, Tires', 'Under Maintenance', 'Used for material loading.'],
    ['SN-GEN-001', 'Cummins-500', 'Cummins 500kVA Generator', 'HQ - Colombo', '2025-10-10', 'McLarens Generators', 'Diesel, Alternator', 'Active', 'Backup power for HQ.'],
    ['SN-FRK-001', 'Toyota-8F', 'Toyota 8-Series Forklift', 'Warehouse C - Gampaha', '2026-03-20', 'Toyota Lanka', 'Electric, Forks', 'Active', 'Warehouse pallet moving.'],
];

echo "Seeding Machines...\n";
foreach ($machines as $m) {
    $machineModel->create([
        'machine_id' => 'MAC-' . str_pad(rand(1, 999), 3, '0', STR_PAD_LEFT),
        'serial_number' => $m[0],
        'model_number' => $m[1],
        'machine_name' => $m[2],
        'location' => $m[3],
        'warranty_expiry' => $m[4],
        'supplier_name' => $m[5],
        'components' => json_encode(explode(', ', $m[6])),
        'status' => $m[7],
        'notes' => $m[8],
        'service_interval_days' => 90,
        'next_service_date' => date('Y-m-d', strtotime('+30 days'))
    ]);
    echo "  - Added {$m[2]} ({$m[0]})\n";
}
echo "✓ Machines seeded successfully\n";

// 3. Seed Vehicles
$vehicles = [
    ['V-TRK-001', 'TATA-LPT', 'LN-4521', 'Tata LPT 1618 Truck', 'WP-LL-1234', 'Lorry', 'Diesel', '2026-05-15', 'Diesel & Motor Engineering', '["Engine", "Transmission", "Braking System"]', 'Active'],
    ['V-VAN-001', 'Toyota-Hiace', 'LN-9876', 'Toyota Hiace Commuter', 'WP-PH-5678', 'Van', 'Diesel', '2027-01-20', 'Toyota Lanka', '["Engine", "Air Conditioning", "Suspension System"]', 'Active'],
    ['V-TNK-001', 'Ashok-Leyland', 'LN-3456', 'Ashok Leyland Tanker', 'NW-LP-9012', 'Tanker', 'Diesel', '2025-11-30', 'Lanka Ashok Leyland', '["Engine", "Braking System", "Tires & Wheels"]', 'Under Maintenance'],
    ['V-BIK-001', 'Bajaj-Discover', 'LN-1122', 'Bajaj Discover 125', 'WP-BBL-4589', 'Bike', 'Petrol', '2026-08-10', 'David Pieris Motor Company', '["Engine", "Electrical System"]', 'Active'],
];

echo "Seeding Vehicles...\n";
foreach ($vehicles as $v) {
    $vehicleModel->create([
        'vehicle_id' => $v[0],
        'model_number' => $v[1],
        'chassis_number' => $v[2],
        'vehicle_name' => $v[3],
        'number_plate' => $v[4],
        'vehicle_type' => $v[5],
        'fuel_type' => $v[6],
        'warranty_expiry' => $v[7],
        'supplier_name' => $v[8],
        'components' => $v[9],
        'status' => $v[10],
        'current_mileage' => rand(10000, 150000),
        'service_interval_km' => 5000,
        'next_service_mileage' => rand(10000, 150000) + 5000
    ]);
    echo "  - Added {$v[3]} ({$v[4]})\n";
}
echo "✓ Vehicles seeded successfully\n";

// 4. Seed Spare Parts
$spareparts = [
    ['SPR-001', 'CAT Oil Filter', 'Engine Parts', 150, 20, 5, 'pcs', 12500.00, 'A2-B4'],
    ['SPR-002', 'TATA Brake Pads', 'Braking System', 50, 10, 2, 'sets', 8500.00, 'B1-C2'],
    ['SPR-003', 'CEAT Truck Tire 10.00 R20', 'Tires & Wheels', 40, 8, 4, 'pcs', 65000.00, 'C3-D1'],
    ['SPR-004', 'Exide 12V 100Ah Battery', 'Electrical System', 25, 5, 2, 'pcs', 24000.00, 'D2-A1'],
    ['SPR-005', 'H4 Headlight Bulb', 'Electrical System', 200, 30, 10, 'pcs', 1200.00, 'E1-B2'],
    ['SPR-006', 'Hydraulic Hose 2m', 'Hydraulics', 80, 15, 5, 'pcs', 4500.00, 'A1-C3'],
];

echo "Seeding Spare Parts...\n";
// Manually insert spareparts using direct query because BaseModel might miss some columns depending on the schema
$stmt = $db->prepare('INSERT INTO spareparts (sparepart_id, name, category, quantity, reorder_level, location, unit_price) VALUES (?, ?, ?, ?, ?, ?, ?)');

foreach ($spareparts as $sp) {
    // [sparepart_id, name, category, quantity, reorder_level, location, unit_price]
    $stmt->execute([
        $sp[0],
        $sp[1],
        $sp[2],
        $sp[3],
        $sp[4],
        $sp[8],
        $sp[7]
    ]);
    echo "  - Added {$sp[1]} ({$sp[0]})\n";
}
echo "✓ Spare Parts seeded successfully\n";

echo "========================================\n";
echo "Database Seeding Completed Successfully!\n";
echo "========================================\n";
echo "Test login with:\n";
echo "Employee ID: LITRO-ADMIN-001\n";
echo "Password: password123\n";
