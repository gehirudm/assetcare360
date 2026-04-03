<?php

/**
 * Seed: Add Sample Data for Simplified Tables
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    
    echo "Seeding simplified vehicle breakdown data...\n\n";
    
    // Get some user IDs and vehicles
    $drivers = $conn->query("SELECT id FROM users WHERE role = 'Driver' ORDER BY id LIMIT 5")->fetchAll();
    $vehicles = $conn->query("SELECT id FROM vehicles ORDER BY id LIMIT 10")->fetchAll();
    
    if (empty($drivers) || empty($vehicles)) {
        echo "⚠️  Need drivers and vehicles in database first!\n";
        exit(0);
    }
    
    $getVehicleId = function($index) use ($vehicles) {
        return $vehicles[$index % count($vehicles)]['id'];
    };
    
    $getDriverId = function($index) use ($drivers) {
        return $drivers[$index % count($drivers)]['id'];
    };
    
    // Sample vehicle breakdowns (matching form fields only)
    $breakdowns = [
        [
            'breakdown_id' => 'VBD-001',
            'vehicle_id' => $getVehicleId(0),
            'driver_id' => $getDriverId(0),
            'breakdown_date' => '2026-02-05',
            'breakdown_type' => 'engine',
            'severity' => 'critical',
            'description' => 'Engine overheating detected. Temperature gauge showing red. Unable to proceed.',
            'status' => 'Pending'
        ],
        [
            'breakdown_id' => 'VBD-002',
            'vehicle_id' => $getVehicleId(1),
            'driver_id' => $getDriverId(1),
            'breakdown_date' => '2026-02-06',
            'breakdown_type' => 'electrical',
            'severity' => 'high',
            'description' => 'Battery not charging. Dashboard warning lights illuminated.',
            'status' => 'Pending'
        ],
        [
            'breakdown_id' => 'VBD-003',
            'vehicle_id' => $getVehicleId(2),
            'driver_id' => $getDriverId(2),
            'breakdown_date' => '2026-02-07',
            'breakdown_type' => 'tires',
            'severity' => 'low',
            'description' => 'Front right tire puncture. Using spare tire.',
            'status' => 'Resolved'
        ],
        [
            'breakdown_id' => 'VBD-004',
            'vehicle_id' => $getVehicleId(3),
            'driver_id' => $getDriverId(3),
            'breakdown_date' => '2026-02-08',
            'breakdown_type' => 'transmission',
            'severity' => 'critical',
            'description' => 'Transmission slipping, unable to shift gears properly. Grinding noise from gearbox.',
            'status' => 'Pending'
        ],
        [
            'breakdown_id' => 'VBD-005',
            'vehicle_id' => $getVehicleId(4),
            'driver_id' => $getDriverId(4),
            'breakdown_date' => '2026-02-08',
            'breakdown_type' => 'brakes',
            'severity' => 'high',
            'description' => 'Brake system malfunction, reduced braking power, brake pedal feels soft',
            'status' => 'Pending'
        ]
    ];
    
    $stmt = $conn->prepare("INSERT INTO vehicle_breakdown 
        (breakdown_id, vehicle_id, driver_id, breakdown_date, breakdown_type, severity, description, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    
    foreach ($breakdowns as $breakdown) {
        $stmt->execute([
            $breakdown['breakdown_id'],
            $breakdown['vehicle_id'],
            $breakdown['driver_id'],
            $breakdown['breakdown_date'],
            $breakdown['breakdown_type'],
            $breakdown['severity'],
            $breakdown['description'],
            $breakdown['status']
        ]);
        echo "✓ Created breakdown: {$breakdown['breakdown_id']}\n";
    }
    
    // Get the IDs of created breakdowns
    $breakdownIds = [];
    foreach ($breakdowns as $breakdown) {
        $id = $conn->query("SELECT id FROM vehicle_breakdown WHERE breakdown_id = '{$breakdown['breakdown_id']}'")->fetchColumn();
        $breakdownIds[$breakdown['breakdown_id']] = $id;
    }
    
    // Sample route breakdowns (matching form fields only)
    $routeBreakdowns = [
        [
            'route_breakdown_id' => 'RBD-001',
            'breakdown_id' => $breakdownIds['VBD-001'],
            'vehicle_id' => $getVehicleId(0),
            'driver_id' => $getDriverId(0),
            'breakdown_location' => 'Colombo-Kandy Road, Mile Post 45, Near Kadugannawa',
            'breakdown_datetime' => '2026-02-05 08:30:00',
            'breakdown_type' => 'engine',
            'severity' => 'critical',
            'description' => 'Engine overheating on route to Kandy. Stopped safely on roadside.',
            'status' => 'Pending'
        ],
        [
            'route_breakdown_id' => 'RBD-002',
            'breakdown_id' => $breakdownIds['VBD-003'],
            'vehicle_id' => $getVehicleId(2),
            'driver_id' => $getDriverId(2),
            'breakdown_location' => 'Ratnapura Road Junction, Near Police Station',
            'breakdown_datetime' => '2026-02-07 09:00:00',
            'breakdown_type' => 'tires',
            'severity' => 'low',
            'description' => 'Flat tire on route to Ratnapura. Changed to spare tire.',
            'status' => 'Resolved'
        ],
        [
            'route_breakdown_id' => 'RBD-003',
            'breakdown_id' => $breakdownIds['VBD-004'],
            'vehicle_id' => $getVehicleId(3),
            'driver_id' => $getDriverId(3),
            'breakdown_location' => 'Negombo - Colombo Expressway, Exit 3',
            'breakdown_datetime' => '2026-02-08 06:45:00',
            'breakdown_type' => 'transmission',
            'severity' => 'critical',
            'description' => 'Transmission failure on expressway. Vehicle cannot move.',
            'status' => 'Pending'
        ]
    ];
    
    $stmt2 = $conn->prepare("INSERT INTO vehicle_breakdown_inroute 
        (route_breakdown_id, breakdown_id, vehicle_id, driver_id, breakdown_location, 
         breakdown_datetime, breakdown_type, severity, description, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    foreach ($routeBreakdowns as $route) {
        $stmt2->execute([
            $route['route_breakdown_id'],
            $route['breakdown_id'],
            $route['vehicle_id'],
            $route['driver_id'],
            $route['breakdown_location'],
            $route['breakdown_datetime'],
            $route['breakdown_type'],
            $route['severity'],
            $route['description'],
            $route['status']
        ]);
        echo "✓ Created route breakdown: {$route['route_breakdown_id']}\n";
    }
    
    echo "\n✅ Sample data created successfully!\n";
    echo "   - 5 vehicle breakdowns\n";
    echo "   - 3 route breakdowns\n";
    
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
