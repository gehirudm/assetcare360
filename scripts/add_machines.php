#!/usr/bin/env php
<?php

/**
 * Add 3 More Machines to Database
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

echo "==========================================\n";
echo "Adding 3 New Machines to Database\n";
echo "==========================================\n\n";

try {
    $db = Database::getInstance()->getConnection();
    
    // Get the next machine IDs
    $stmt = $db->query("SELECT machine_id FROM machines ORDER BY id DESC LIMIT 1");
    $lastMachine = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $nextNum = 4; // Start from MCH-004
    if ($lastMachine) {
        $lastId = $lastMachine['machine_id'];
        preg_match('/MCH-(\d+)/', $lastId, $matches);
        if (isset($matches[1])) {
            $nextNum = intval($matches[1]) + 1;
        }
    }
    
    // Machine data
    $machines = [
        [
            'machine_id' => 'MCH-' . str_pad($nextNum, 3, '0', STR_PAD_LEFT),
            'serial_number' => 'SN-' . str_pad($nextNum, 6, '0', STR_PAD_LEFT),
            'model_number' => 'EX-450',
            'machine_name' => 'Hydraulic Excavator',
            'location' => 'Construction Site A',
            'warranty_expiry' => date('Y-m-d', strtotime('+2 years')),
            'warranty_provider' => 'Heavy Equipment Co.',
            'supplier_name' => 'Industrial Machinery Ltd',
            'supplier_contact' => '0711234567',
            'service_interval_days' => 90,
            'last_service_date' => date('Y-m-d', strtotime('-30 days')),
            'next_service_date' => date('Y-m-d', strtotime('+60 days')),
            'components' => json_encode(['Engine', 'Hydraulic System', 'Tracks', 'Boom & Arm', 'Safety Guards']),
            'status' => 'Active',
            'notes' => '450-class excavator with 20-ton capacity',
            'created_by' => 1
        ],
        [
            'machine_id' => 'MCH-' . str_pad($nextNum + 1, 3, '0', STR_PAD_LEFT),
            'serial_number' => 'SN-' . str_pad($nextNum + 1, 6, '0', STR_PAD_LEFT),
            'model_number' => 'FL-200',
            'machine_name' => 'Forklift Truck',
            'location' => 'Warehouse B',
            'warranty_expiry' => date('Y-m-d', strtotime('+18 months')),
            'warranty_provider' => 'Forklift Solutions Inc.',
            'supplier_name' => 'Warehouse Equipment Supply',
            'supplier_contact' => '0722345678',
            'service_interval_days' => 60,
            'last_service_date' => date('Y-m-d', strtotime('-15 days')),
            'next_service_date' => date('Y-m-d', strtotime('+45 days')),
            'components' => json_encode(['Engine', 'Hydraulic System', 'Forks', 'Lifting Mechanism', 'Safety Lights']),
            'status' => 'Active',
            'notes' => '2-ton capacity electric forklift',
            'created_by' => 1
        ],
        [
            'machine_id' => 'MCH-' . str_pad($nextNum + 2, 3, '0', STR_PAD_LEFT),
            'serial_number' => 'SN-' . str_pad($nextNum + 2, 6, '0', STR_PAD_LEFT),
            'model_number' => 'BC-300',
            'machine_name' => 'Concrete Mixer',
            'location' => 'Production Plant',
            'warranty_expiry' => date('Y-m-d', strtotime('+1 year')),
            'warranty_provider' => 'Construction Equipment Warranty',
            'supplier_name' => 'Building Supplies Direct',
            'supplier_contact' => '0733456789',
            'service_interval_days' => 90,
            'last_service_date' => date('Y-m-d', strtotime('-45 days')),
            'next_service_date' => date('Y-m-d', strtotime('+45 days')),
            'components' => json_encode(['Drum', 'Motor', 'Mixing Blades', 'Chassis', 'Control Panel']),
            'status' => 'Active',
            'notes' => '300-liter drum capacity concrete mixer',
            'created_by' => 1
        ]
    ];
    
    $insertStmt = $db->prepare("
        INSERT INTO machines (
            machine_id, serial_number, model_number, machine_name, location, 
            warranty_expiry, warranty_provider, supplier_name, supplier_contact,
            service_interval_days, last_service_date, next_service_date,
            components, status, notes, created_by, created_at, updated_at
        ) VALUES (
            :machine_id, :serial_number, :model_number, :machine_name, :location,
            :warranty_expiry, :warranty_provider, :supplier_name, :supplier_contact,
            :service_interval_days, :last_service_date, :next_service_date,
            :components, :status, :notes, :created_by, NOW(), NOW()
        )
    ");
    
    $count = 0;
    foreach ($machines as $machine) {
        $insertStmt->execute($machine);
        $count++;
        echo "✅ Added: {$machine['machine_name']} ({$machine['machine_id']})\n";
    }
    
    echo "\n==========================================\n";
    echo "✅ Successfully added $count machines!\n";
    echo "==========================================\n\n";
    
    // Display all machines
    $allMachines = $db->query("SELECT machine_id, machine_name, location, status FROM machines ORDER BY machine_id")->fetchAll(PDO::FETCH_ASSOC);
    
    echo "All Machines in Database:\n";
    echo "------------------------\n";
    foreach ($allMachines as $m) {
        echo "  {$m['machine_id']} - {$m['machine_name']} ({$m['location']}) - {$m['status']}\n";
    }
    echo "\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}

exit(0);
