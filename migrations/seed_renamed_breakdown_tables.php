<?php

/**
 * Seed: Add Sample Data for Renamed Tables
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    
    echo "Seeding vehicle breakdown data...\n\n";
    
    // Get some user IDs and vehicles
    $drivers = $conn->query("SELECT id FROM users WHERE role = 'Driver' ORDER BY id LIMIT 5")->fetchAll();
    $supervisors = $conn->query("SELECT id FROM users WHERE role IN ('Supervisor', 'Technical Officer') ORDER BY id LIMIT 5")->fetchAll();
    $vehicles = $conn->query("SELECT id FROM vehicles ORDER BY id LIMIT 10")->fetchAll();
    
    if (empty($drivers) || empty($supervisors) || empty($vehicles)) {
        echo "⚠️  Need drivers, supervisors, and vehicles in database first!\n";
        exit(0);
    }
    
    $getVehicleId = function($index) use ($vehicles) {
        return $vehicles[$index % count($vehicles)]['id'];
    };
    
    $getDriverId = function($index) use ($drivers) {
        return $drivers[$index % count($drivers)]['id'];
    };
    
    $getSupervisorId = function($index) use ($supervisors) {
        return $supervisors[$index % count($supervisors)]['id'];
    };
    
    // Sample vehicle breakdowns
    $breakdowns = [
        [
            'breakdown_id' => 'VBD-2026-001',
            'vehicle_id' => $getVehicleId(0),
            'driver_id' => $getDriverId(0),
            'breakdown_date' => '2026-02-05',
            'breakdown_time' => '08:30:00',
            'location' => 'Colombo-Kandy Road, Mile Post 45, Near Kadugannawa',
            'breakdown_type' => 'Engine Failure',
            'severity' => 'Critical',
            'description' => 'Engine overheating and coolant leak detected. Vehicle unable to proceed. Temperature gauge showing red.',
            'immediate_action_taken' => 'Engine turned off immediately, hazard lights activated, vehicle moved to roadside',
            'reported_by' => $getDriverId(0),
            'assigned_technician' => $getSupervisorId(0),
            'status' => 'Repaired',
            'repair_start_datetime' => '2026-02-05 09:00:00',
            'repair_end_datetime' => '2026-02-05 13:30:00',
            'downtime_hours' => 5.0,
            'repair_cost' => 35000.00,
            'spare_parts_used' => 'Water pump, Coolant (5L), Radiator hose, Hose clamps',
            'service_provider' => 'Quick Fix Auto Service - Kadugannawa',
            'remarks' => 'Water pump bearing failed causing coolant leak. All repairs completed on-site.'
        ],
        [
            'breakdown_id' => 'VBD-2026-002',
            'vehicle_id' => $getVehicleId(1),
            'driver_id' => $getDriverId(1),
            'breakdown_date' => '2026-02-06',
            'breakdown_time' => '14:15:00',
            'location' => 'Galle Road, Colombo 03, Near Town Hall',
            'breakdown_type' => 'Electrical',
            'severity' => 'Major',
            'description' => 'Alternator failure, battery not charging. Dashboard warning lights illuminated.',
            'immediate_action_taken' => 'Attempted restart, called for assistance',
            'reported_by' => $getDriverId(1),
            'assigned_technician' => $getSupervisorId(1),
            'status' => 'Under Repair',
            'repair_start_datetime' => '2026-02-06 15:00:00',
            'downtime_hours' => 2.5,
            'repair_cost' => 18500.00,
            'spare_parts_used' => 'Alternator unit',
            'service_provider' => 'City Auto Electric - Colombo',
            'remarks' => 'Alternator replacement in progress'
        ],
        [
            'breakdown_id' => 'VBD-2026-003',
            'vehicle_id' => $getVehicleId(2),
            'driver_id' => $getDriverId(2),
            'breakdown_date' => '2026-02-07',
            'breakdown_time' => '09:00:00',
            'location' => 'Ratnapura Road Junction, Near Police Station',
            'breakdown_type' => 'Tire/Wheel',
            'severity' => 'Minor',
            'description' => 'Front right tire puncture caused by nail on road',
            'immediate_action_taken' => 'Changed to spare tire',
            'reported_by' => $getDriverId(2),
            'status' => 'Repaired',
            'repair_start_datetime' => '2026-02-07 09:05:00',
            'repair_end_datetime' => '2026-02-07 09:35:00',
            'downtime_hours' => 0.5,
            'repair_cost' => 1500.00,
            'spare_parts_used' => 'Tire repair patch, Valve stem',
            'service_provider' => 'Self-service (Driver)',
            'remarks' => 'Minor puncture repaired quickly using spare tire'
        ],
        [
            'breakdown_id' => 'VBD-2026-004',
            'vehicle_id' => $getVehicleId(3),
            'driver_id' => $getDriverId(3),
            'breakdown_date' => '2026-02-08',
            'breakdown_time' => '06:45:00',
            'location' => 'Negombo - Colombo Expressway, Exit 3',
            'breakdown_type' => 'Transmission',
            'severity' => 'Critical',
            'description' => 'Transmission slipping, unable to shift gears properly. Grinding noise from gearbox.',
            'immediate_action_taken' => 'Stopped vehicle immediately, requested towing',
            'reported_by' => $getDriverId(3),
            'assigned_technician' => $getSupervisorId(2),
            'status' => 'Reported',
            'downtime_hours' => 0.0,
            'repair_cost' => 0.00,
            'remarks' => 'Requires detailed inspection at service center'
        ],
        [
            'breakdown_id' => 'VBD-2026-005',
            'vehicle_id' => $getVehicleId(4),
            'driver_id' => $getDriverId(4),
            'breakdown_date' => '2026-02-08',
            'breakdown_time' => '11:20:00',
            'location' => 'Matara Main Road, Near Bus Stand',
            'breakdown_type' => 'Brake System',
            'severity' => 'Major',
            'description' => 'Brake system malfunction, reduced braking power, brake pedal feels soft',
            'immediate_action_taken' => 'Reduced speed, used engine braking, parked safely',
            'reported_by' => $getDriverId(4),
            'status' => 'Reported',
            'downtime_hours' => 0.0,
            'repair_cost' => 0.00,
            'remarks' => 'Vehicle not safe to drive, awaiting repair'
        ]
    ];
    
    $stmt = $conn->prepare("INSERT INTO vehicle_breakdown 
        (breakdown_id, vehicle_id, driver_id, breakdown_date, breakdown_time, location, breakdown_type, 
         severity, description, immediate_action_taken, reported_by, assigned_technician, status, 
         repair_start_datetime, repair_end_datetime, downtime_hours, repair_cost, spare_parts_used, 
         service_provider, remarks) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    foreach ($breakdowns as $breakdown) {
        $stmt->execute([
            $breakdown['breakdown_id'],
            $breakdown['vehicle_id'],
            $breakdown['driver_id'],
            $breakdown['breakdown_date'],
            $breakdown['breakdown_time'],
            $breakdown['location'],
            $breakdown['breakdown_type'],
            $breakdown['severity'],
            $breakdown['description'],
            $breakdown['immediate_action_taken'],
            $breakdown['reported_by'],
            $breakdown['assigned_technician'] ?? null,
            $breakdown['status'],
            $breakdown['repair_start_datetime'] ?? null,
            $breakdown['repair_end_datetime'] ?? null,
            $breakdown['downtime_hours'],
            $breakdown['repair_cost'],
            $breakdown['spare_parts_used'] ?? null,
            $breakdown['service_provider'] ?? null,
            $breakdown['remarks'] ?? null
        ]);
        echo "✓ Created breakdown: {$breakdown['breakdown_id']}\n";
    }
    
    // Get the IDs of created breakdowns
    $breakdownIds = [];
    foreach ($breakdowns as $breakdown) {
        $id = $conn->query("SELECT id FROM vehicle_breakdown WHERE breakdown_id = '{$breakdown['breakdown_id']}'")->fetchColumn();
        $breakdownIds[$breakdown['breakdown_id']] = $id;
    }
    
    // Sample route breakdowns
    $routeBreakdowns = [
        [
            'route_breakdown_id' => 'RBD-2026-001',
            'breakdown_id' => $breakdownIds['VBD-2026-001'],
            'vehicle_id' => $getVehicleId(0),
            'driver_id' => $getDriverId(0),
            'route_name' => 'Colombo to Kandy - Delivery Route',
            'start_location' => 'Colombo Main Depot, Orugodawatta',
            'destination' => 'Kandy Distribution Center',
            'breakdown_location' => 'Colombo-Kandy Road, Mile Post 45, Near Kadugannawa',
            'breakdown_datetime' => '2026-02-05 08:30:00',
            'current_mileage' => 125450,
            'passengers_onboard' => 1,
            'cargo_type' => 'Industrial supplies and equipment',
            'cargo_weight' => 2000.00,
            'weather_condition' => 'Clear sky, good visibility',
            'road_condition' => 'Good, dry pavement',
            'traffic_condition' => 'Moderate',
            'breakdown_cause' => 'Water pump bearing failure leading to coolant system failure',
            'emergency_contact_made' => 1,
            'emergency_service_type' => 'Mobile mechanic dispatched',
            'towing_required' => 0,
            'estimated_repair_time' => '4-5 hours',
            'alternative_arrangement' => 'Cargo transferred to replacement vehicle dispatched from Colombo',
            'delay_duration' => '5 hours total',
            'impact_on_schedule' => 'Delivery delayed by 5 hours, customer notified',
            'recovery_status' => 'Completed',
            'recovery_action' => 'On-site repair completed. Water pump replaced, cooling system flushed and tested.',
            'recovery_datetime' => '2026-02-05 13:30:00',
            'additional_notes' => 'Preventive maintenance schedule updated'
        ],
        [
            'route_breakdown_id' => 'RBD-2026-002',
            'breakdown_id' => $breakdownIds['VBD-2026-003'],
            'vehicle_id' => $getVehicleId(2),
            'driver_id' => $getDriverId(2),
            'route_name' => 'Ratnapura Supply Run',
            'start_location' => 'Colombo Main Office',
            'destination' => 'Ratnapura Branch Office',
            'breakdown_location' => 'Ratnapura Road Junction, Near Police Station',
            'breakdown_datetime' => '2026-02-07 09:00:00',
            'current_mileage' => 87320,
            'passengers_onboard' => 0,
            'cargo_type' => 'Office supplies and documents',
            'cargo_weight' => 150.00,
            'weather_condition' => 'Light rain',
            'road_condition' => 'Wet, some puddles',
            'traffic_condition' => 'Light',
            'breakdown_cause' => 'Nail puncture on road',
            'emergency_contact_made' => 0,
            'towing_required' => 0,
            'estimated_repair_time' => '30 minutes',
            'alternative_arrangement' => 'None required - minor delay only',
            'delay_duration' => '30 minutes',
            'impact_on_schedule' => 'Minimal impact, arrived 30 minutes late',
            'recovery_status' => 'Completed',
            'recovery_action' => 'Driver replaced tire using spare. Continued journey safely.',
            'recovery_datetime' => '2026-02-07 09:30:00',
            'additional_notes' => 'Punctured tire sent for repair'
        ],
        [
            'route_breakdown_id' => 'RBD-2026-003',
            'breakdown_id' => $breakdownIds['VBD-2026-004'],
            'vehicle_id' => $getVehicleId(3),
            'driver_id' => $getDriverId(3),
            'route_name' => 'Airport Express Service',
            'start_location' => 'Colombo City Center Terminal',
            'destination' => 'Bandaranaike International Airport',
            'breakdown_location' => 'Negombo - Colombo Expressway, Exit 3',
            'breakdown_datetime' => '2026-02-08 06:45:00',
            'current_mileage' => 203450,
            'passengers_onboard' => 2,
            'cargo_type' => 'Urgent documents and small parcels',
            'cargo_weight' => 50.00,
            'weather_condition' => 'Foggy morning',
            'road_condition' => 'Good',
            'traffic_condition' => 'Light',
            'breakdown_cause' => 'Transmission failure - gearbox malfunction',
            'emergency_contact_made' => 1,
            'emergency_service_type' => 'Towing service and replacement vehicle',
            'towing_required' => 1,
            'towing_company' => 'Express Towing Services',
            'estimated_repair_time' => '2-3 days (workshop repair)',
            'alternative_arrangement' => 'Replacement vehicle dispatched immediately. Passengers transferred.',
            'delay_duration' => '45 minutes',
            'impact_on_schedule' => 'Passengers reached airport with 45-minute delay',
            'recovery_status' => 'In Progress',
            'recovery_action' => 'Vehicle towed to authorized service center for transmission repair',
            'additional_notes' => 'High priority repair - vehicle needed for regular service'
        ]
    ];
    
    $stmt2 = $conn->prepare("INSERT INTO vehicle_breakdown_inroute 
        (route_breakdown_id, breakdown_id, vehicle_id, driver_id, route_name, start_location, 
         destination, breakdown_location, breakdown_datetime, current_mileage, passengers_onboard,
         cargo_type, cargo_weight, weather_condition, road_condition, traffic_condition,
         breakdown_cause, emergency_contact_made, emergency_service_type, towing_required,
         towing_company, estimated_repair_time, alternative_arrangement, delay_duration,
         impact_on_schedule, recovery_status, recovery_action, recovery_datetime, additional_notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    foreach ($routeBreakdowns as $route) {
        $stmt2->execute([
            $route['route_breakdown_id'],
            $route['breakdown_id'],
            $route['vehicle_id'],
            $route['driver_id'],
            $route['route_name'],
            $route['start_location'],
            $route['destination'],
            $route['breakdown_location'],
            $route['breakdown_datetime'],
            $route['current_mileage'],
            $route['passengers_onboard'],
            $route['cargo_type'],
            $route['cargo_weight'],
            $route['weather_condition'],
            $route['road_condition'],
            $route['traffic_condition'],
            $route['breakdown_cause'],
            $route['emergency_contact_made'],
            $route['emergency_service_type'] ?? null,
            $route['towing_required'],
            $route['towing_company'] ?? null,
            $route['estimated_repair_time'],
            $route['alternative_arrangement'],
            $route['delay_duration'],
            $route['impact_on_schedule'],
            $route['recovery_status'],
            $route['recovery_action'],
            $route['recovery_datetime'] ?? null,
            $route['additional_notes'] ?? null
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
