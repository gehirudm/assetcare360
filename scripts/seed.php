<?php

/**
 * Database Seeder
 * Seeds the database with test users
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../app/models/BaseModel.php';
require_once __DIR__ . '/../app/models/User.php';

echo "========================================\n";
echo "AssetCare360 Database Seeder\n";
echo "========================================\n\n";

$userModel = new User();

// Define test users with different roles
$testUsers = [
    [
        'employee_id' => 'LITRO-ADMIN-001',
        'password' => 'password123',
        'full_name' => 'Admin User',
        'role' => 'Admin',
        'department' => 'Administration',
        'email' => 'admin@assetcare360.com',
        'phone' => '+94771234567'
    ],
    [
        'employee_id' => 'LITRO-MAINTMGR-001',
        'password' => 'password123',
        'full_name' => 'Maintenance Manager One',
        'role' => 'Maintenance Manager',
        'department' => 'Maintenance',
        'email' => 'maint.manager@assetcare360.com',
        'phone' => '+94771234577'
    ],
    [
        'employee_id' => 'LITRO-INVMGR-001',
        'password' => 'password123',
        'full_name' => 'Inventory Manager One',
        'role' => 'Inventory Manager',
        'department' => 'Inventory',
        'email' => 'inv.manager1@assetcare360.com',
        'phone' => '+94771234568'
    ],
    [
        'employee_id' => 'LITRO-INVMGR-002',
        'password' => 'password123',
        'full_name' => 'Inventory Manager Two',
        'role' => 'Inventory Manager',
        'department' => 'Inventory',
        'email' => 'inv.manager2@assetcare360.com',
        'phone' => '+94771234569'
    ],
    [
        'employee_id' => 'LITRO-TECHOFFICER-001',
        'password' => 'password123',
        'full_name' => 'Technical Officer One',
        'role' => 'Technical Officer',
        'department' => 'Technical',
        'email' => 'tech.officer@assetcare360.com',
        'phone' => '+94771234578'
    ],
    [
        'employee_id' => 'LITRO-SUPERVISOR-001',
        'password' => 'password123',
        'full_name' => 'Supervisor One',
        'role' => 'Supervisor',
        'department' => 'Operations',
        'email' => 'supervisor1@assetcare360.com',
        'phone' => '+94771234570'
    ],
    [
        'employee_id' => 'LITRO-SUPERVISOR-002',
        'password' => 'password123',
        'full_name' => 'Supervisor Two',
        'role' => 'Supervisor',
        'department' => 'Operations',
        'email' => 'supervisor2@assetcare360.com',
        'phone' => '+94771234571'
    ],
    [
        'employee_id' => 'LITRO-DRIVER-001',
        'password' => 'password123',
        'full_name' => 'Driver One',
        'role' => 'Driver',
        'department' => 'Logistics',
        'email' => 'driver1@assetcare360.com',
        'phone' => '+94771234572'
    ],
    [
        'employee_id' => 'LITRO-DRIVER-002',
        'password' => 'password123',
        'full_name' => 'Driver Two',
        'role' => 'Driver',
        'department' => 'Logistics',
        'email' => 'driver2@assetcare360.com',
        'phone' => '+94771234573'
    ],
    [
        'employee_id' => 'LITRO-MACHOPER-001',
        'password' => 'password123',
        'full_name' => 'Machinary Operator One',
        'role' => 'Machinary Operator',
        'department' => 'Production',
        'email' => 'operator1@assetcare360.com',
        'phone' => '+94771234574'
    ],
    [
        'employee_id' => 'LITRO-MACHOPER-002',
        'password' => 'password123',
        'full_name' => 'Machinary Operator Two',
        'role' => 'Machinary Operator',
        'department' => 'Production',
        'email' => 'operator2@assetcare360.com',
        'phone' => '+94771234575'
    ],
    [
        'employee_id' => 'LITRO-MACHOPER-003',
        'password' => 'password123',
        'full_name' => 'Machinary Operator Three',
        'role' => 'Machinary Operator',
        'department' => 'Production',
        'email' => 'operator3@assetcare360.com',
        'phone' => '+94771234576'
    ]
];

echo "Seeding users...\n\n";

$created = 0;
$skipped = 0;

foreach ($testUsers as $userData) {
    // Check if user already exists
    if ($userModel->employeeIdExists($userData['employee_id'])) {
        echo "⚠️  User {$userData['employee_id']} already exists. Skipping.\n";
        $skipped++;
        continue;
    }
    
    // Create user
    $userId = $userModel->createUser($userData);
    
    if ($userId) {
        echo "✅ Created user: {$userData['employee_id']} ({$userData['full_name']}) - Role: {$userData['role']}\n";
        $created++;
    } else {
        echo "❌ Failed to create user: {$userData['employee_id']}\n";
    }
}

echo "\n========================================\n";
echo "Seeding complete!\n";
echo "Created: $created users\n";
echo "Skipped: $skipped users\n";
echo "========================================\n\n";

echo "Test Credentials:\n";
echo "─────────────────────────────────────────\n";
echo "Employee ID: LITRO-ADMIN-001\n";
echo "Password: password123\n";
echo "Role: Admin\n";
echo "\nEmployee ID: LITRO-MAINTMGR-001\n";
echo "Password: password123\n";
echo "Role: Maintenance Manager\n";
echo "\nEmployee ID: LITRO-TECHOFFICER-001\n";
echo "Password: password123\n";
echo "Role: Technical Officer\n";
echo "─────────────────────────────────────────\n\n";

echo "All users use the password: password123\n\n";
