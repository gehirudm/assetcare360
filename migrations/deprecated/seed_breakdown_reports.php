<?php

/**
 * Seed: Add Sample Breakdown Reports Data
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    
    echo "Seeding breakdown reports data...\n\n";
    
    // Get some user IDs
    $users = $conn->query("SELECT id FROM users WHERE role IN ('Supervisor', 'Technical Officer', 'Driver') ORDER BY id LIMIT 10")->fetchAll();
    $vehicles = $conn->query("SELECT id FROM vehicles ORDER BY id LIMIT 10")->fetchAll();
    
    if (empty($users) || empty($vehicles)) {
        echo "⚠️  Need users and vehicles in database first!\n";
        exit(0);
    }
    
    // Use modulo to cycle through available vehicles if we have less than 5
    $getVehicleId = function($index) use ($vehicles) {
        return $vehicles[$index % count($vehicles)]['id'];
    };
    
    // Sample breakdown reports
    $breakdownReports = [
        [
            'report_id' => 'BDR-2026-001',
            'asset_type' => 'Vehicle',
            'asset_id' => $getVehicleId(0),
            'breakdown_date' => '2026-02-05 08:30:00',
            'location' => 'Colombo-Kandy Road, Mile Post 45',
            'breakdown_type' => 'Engine',
            'severity' => 'Critical',
            'description' => 'Engine overheating, coolant leak detected. Vehicle unable to proceed.',
            'reported_by' => $users[0]['id'],
            'assigned_technician' => $users[1]['id'],
            'status' => 'Completed',
            'downtime_hours' => 4.5,
            'repair_cost' => 25000.00,
            'parts_used' => 'Water pump, Coolant, Hose clamps',
            'resolution_notes' => 'Replaced faulty water pump and damaged coolant hoses. System tested and functioning normally.',
            'completed_date' => '2026-02-05 13:00:00'
        ],
        [
            'report_id' => 'BDR-2026-002',
            'asset_type' => 'Vehicle',
            'asset_id' => $getVehicleId(1),
            'breakdown_date' => '2026-02-06 14:15:00',
            'location' => 'Galle Face, Colombo',
            'breakdown_type' => 'Electrical',
            'severity' => 'Medium',
            'description' => 'Alternator failure, battery not charging.',
            'reported_by' => $users[2]['id'],
            'assigned_technician' => $users[3]['id'],
            'status' => 'In Progress',
            'downtime_hours' => 2.0,
            'repair_cost' => 15000.00,
            'parts_used' => 'Alternator'
        ],
        [
            'report_id' => 'BDR-2026-003',
            'asset_type' => 'Vehicle',
            'asset_id' => $getVehicleId(2),
            'breakdown_date' => '2026-02-07 09:00:00',
            'location' => 'Ratnapura Road Junction',
            'breakdown_type' => 'Tire',
            'severity' => 'Low',
            'description' => 'Flat tire, nail puncture on front right tire.',
            'reported_by' => $users[4]['id'],
            'assigned_technician' => $users[5]['id'],
            'status' => 'Completed',
            'downtime_hours' => 0.5,
            'repair_cost' => 2500.00,
            'parts_used' => 'Tire patch kit',
            'resolution_notes' => 'Tire repaired and inflated. Vehicle operational.',
            'completed_date' => '2026-02-07 09:30:00'
        ],
        [
            'report_id' => 'BDR-2026-004',
            'asset_type' => 'Vehicle',
            'asset_id' => $getVehicleId(3),
            'breakdown_date' => '2026-02-08 06:45:00',
            'location' => 'Negombo Expressway',
            'breakdown_type' => 'Transmission',
            'severity' => 'High',
            'description' => 'Transmission slipping, unable to shift gears properly.',
            'reported_by' => $users[6]['id'],
            'assigned_technician' => $users[1]['id'],
            'status' => 'Pending',
            'downtime_hours' => 0.0,
            'repair_cost' => 0.00
        ],
        [
            'report_id' => 'BDR-2026-005',
            'asset_type' => 'Vehicle',
            'asset_id' => $getVehicleId(4),
            'breakdown_date' => '2026-02-08 11:20:00',
            'location' => 'Matara Main Road',
            'breakdown_type' => 'Mechanical',
            'severity' => 'Medium',
            'description' => 'Brake system malfunction, reduced braking power.',
            'reported_by' => $users[7]['id'],
            'status' => 'Pending',
            'downtime_hours' => 0.0,
            'repair_cost' => 0.00
        ]
    ];
    
    $stmt = $conn->prepare("INSERT INTO breakdown_reports 
        (report_id, asset_type, asset_id, breakdown_date, location, breakdown_type, severity, 
         description, reported_by, assigned_technician, status, downtime_hours, repair_cost, 
         parts_used, resolution_notes, completed_date) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    foreach ($breakdownReports as $report) {
        $stmt->execute([
            $report['report_id'],
            $report['asset_type'],
            $report['asset_id'],
            $report['breakdown_date'],
            $report['location'],
            $report['breakdown_type'],
            $report['severity'],
            $report['description'],
            $report['reported_by'],
            $report['assigned_technician'] ?? null,
            $report['status'],
            $report['downtime_hours'],
            $report['repair_cost'],
            $report['parts_used'] ?? null,
            $report['resolution_notes'] ?? null,
            $report['completed_date'] ?? null
        ]);
        echo "✓ Created breakdown report: {$report['report_id']}\n";
    }
    
    // Get the IDs of the created reports
    $reportIds = [];
    foreach ($breakdownReports as $report) {
        $id = $conn->query("SELECT id FROM breakdown_reports WHERE report_id = '{$report['report_id']}'")->fetchColumn();
        $reportIds[$report['report_id']] = $id;
    }
    
    // Sample route breakdowns
    $routeBreakdowns = [
        [
            'route_id' => 'RBD-2026-001',
            'breakdown_report_id' => $reportIds['BDR-2026-001'],
            'vehicle_id' => $getVehicleId(0),
            'route_name' => 'Colombo to Kandy Delivery',
            'start_location' => 'Colombo Depot',
            'breakdown_location' => 'Colombo-Kandy Road, Mile Post 45',
            'destination' => 'Kandy Distribution Center',
            'breakdown_time' => '2026-02-05 08:30:00',
            'odometer_reading' => 125450,
            'cargo_details' => 'Industrial supplies - 2 tons',
            'driver_id' => $users[0]['id'],
            'passengers_count' => 1,
            'weather_conditions' => 'Clear',
            'road_conditions' => 'Good',
            'emergency_services_called' => 1,
            'towing_required' => 0,
            'estimated_delay_hours' => 4.5,
            'recovery_action' => 'Mobile mechanic dispatched. Repairs completed on-site.',
            'recovery_completed' => 1,
            'recovery_completed_at' => '2026-02-05 13:00:00'
        ],
        [
            'route_id' => 'RBD-2026-002',
            'breakdown_report_id' => $reportIds['BDR-2026-003'],
            'vehicle_id' => $getVehicleId(2),
            'route_name' => 'Ratnapura Supply Run',
            'start_location' => 'Colombo Main Office',
            'breakdown_location' => 'Ratnapura Road Junction',
            'destination' => 'Ratnapura Branch',
            'breakdown_time' => '2026-02-07 09:00:00',
            'odometer_reading' => 87320,
            'cargo_details' => 'Office supplies',
            'driver_id' => $users[4]['id'],
            'passengers_count' => 0,
            'weather_conditions' => 'Light rain',
            'road_conditions' => 'Fair',
            'emergency_services_called' => 0,
            'towing_required' => 0,
            'estimated_delay_hours' => 0.5,
            'recovery_action' => 'Driver changed tire using spare. Minor delay.',
            'recovery_completed' => 1,
            'recovery_completed_at' => '2026-02-07 09:30:00'
        ],
        [
            'route_id' => 'RBD-2026-003',
            'breakdown_report_id' => $reportIds['BDR-2026-004'],
            'vehicle_id' => $getVehicleId(3),
            'route_name' => 'Airport Express Route',
            'start_location' => 'City Center',
            'breakdown_location' => 'Negombo Expressway',
            'destination' => 'Bandaranaike Airport',
            'breakdown_time' => '2026-02-08 06:45:00',
            'odometer_reading' => 203450,
            'cargo_details' => 'Urgent documents',
            'driver_id' => $users[6]['id'],
            'passengers_count' => 2,
            'weather_conditions' => 'Foggy',
            'road_conditions' => 'Good',
            'emergency_services_called' => 1,
            'towing_required' => 1,
            'estimated_delay_hours' => 3.0,
            'recovery_action' => 'Vehicle towed to nearest service center. Replacement vehicle dispatched.',
            'recovery_completed' => 0
        ]
    ];
    
    $stmt2 = $conn->prepare("INSERT INTO route_breakdowns 
        (route_id, breakdown_report_id, vehicle_id, route_name, start_location, breakdown_location, 
         destination, breakdown_time, odometer_reading, cargo_details, driver_id, passengers_count,
         weather_conditions, road_conditions, emergency_services_called, towing_required,
         estimated_delay_hours, recovery_action, recovery_completed, recovery_completed_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    foreach ($routeBreakdowns as $route) {
        $stmt2->execute([
            $route['route_id'],
            $route['breakdown_report_id'],
            $route['vehicle_id'],
            $route['route_name'],
            $route['start_location'],
            $route['breakdown_location'],
            $route['destination'],
            $route['breakdown_time'],
            $route['odometer_reading'],
            $route['cargo_details'],
            $route['driver_id'],
            $route['passengers_count'],
            $route['weather_conditions'],
            $route['road_conditions'],
            $route['emergency_services_called'],
            $route['towing_required'],
            $route['estimated_delay_hours'],
            $route['recovery_action'],
            $route['recovery_completed'],
            $route['recovery_completed_at'] ?? null
        ]);
        echo "✓ Created route breakdown: {$route['route_id']}\n";
    }
    
    echo "\n✅ Sample data created successfully!\n";
    echo "   - 5 breakdown reports\n";
    echo "   - 3 route breakdowns\n";
    
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
