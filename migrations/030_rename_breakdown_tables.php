<?php

/**
 * Migration: Rename Breakdown Tables
 * Renames breakdown_reports to vehicle_breakdown
 * Renames route_breakdowns to vehicle_breakdown_inroute
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    
    echo "Renaming breakdown tables...\n\n";
    
    // Drop old tables if they exist
    $conn->exec("DROP TABLE IF EXISTS route_breakdowns");
    $conn->exec("DROP TABLE IF EXISTS breakdown_reports");
    echo "✓ Dropped old tables\n";
    
    // Create vehicle_breakdown table
    $sql1 = "CREATE TABLE IF NOT EXISTS vehicle_breakdown (
        id INT AUTO_INCREMENT PRIMARY KEY,
        breakdown_id VARCHAR(50) UNIQUE NOT NULL,
        vehicle_id INT NOT NULL,
        driver_id INT NOT NULL,
        breakdown_date DATETIME NOT NULL,
        breakdown_time TIME NOT NULL,
        location TEXT NOT NULL,
        breakdown_type ENUM('Engine Failure', 'Brake System', 'Transmission', 'Electrical', 'Tire/Wheel', 'Fuel System', 'Cooling System', 'Suspension', 'Steering', 'Other') NOT NULL,
        severity ENUM('Critical', 'Major', 'Minor') NOT NULL DEFAULT 'Minor',
        description TEXT NOT NULL,
        immediate_action_taken TEXT,
        reported_by INT NOT NULL,
        assigned_technician INT,
        status ENUM('Reported', 'Under Repair', 'Repaired', 'Cannot Repair') NOT NULL DEFAULT 'Reported',
        repair_start_datetime DATETIME,
        repair_end_datetime DATETIME,
        downtime_hours DECIMAL(10, 2) DEFAULT 0.00,
        repair_cost DECIMAL(12, 2) DEFAULT 0.00,
        spare_parts_used TEXT,
        service_provider VARCHAR(255),
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_vehicle_id (vehicle_id),
        INDEX idx_breakdown_date (breakdown_date),
        INDEX idx_status (status),
        INDEX idx_severity (severity),
        INDEX idx_driver_id (driver_id),
        INDEX idx_reported_by (reported_by),
        INDEX idx_assigned_technician (assigned_technician),
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
        FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE RESTRICT,
        FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE RESTRICT,
        FOREIGN KEY (assigned_technician) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $conn->exec($sql1);
    echo "✓ Created vehicle_breakdown table\n";
    
    // Create vehicle_breakdown_inroute table
    $sql2 = "CREATE TABLE IF NOT EXISTS vehicle_breakdown_inroute (
        id INT AUTO_INCREMENT PRIMARY KEY,
        route_breakdown_id VARCHAR(50) UNIQUE NOT NULL,
        breakdown_id INT,
        vehicle_id INT NOT NULL,
        trip_id INT,
        driver_id INT NOT NULL,
        route_name VARCHAR(255) NOT NULL,
        start_location VARCHAR(255) NOT NULL,
        destination VARCHAR(255) NOT NULL,
        breakdown_location TEXT NOT NULL,
        breakdown_datetime DATETIME NOT NULL,
        current_mileage INT,
        passengers_onboard INT DEFAULT 0,
        cargo_type VARCHAR(255),
        cargo_weight DECIMAL(10, 2),
        weather_condition VARCHAR(100),
        road_condition VARCHAR(100),
        traffic_condition VARCHAR(100),
        breakdown_cause TEXT,
        emergency_contact_made BOOLEAN DEFAULT FALSE,
        emergency_service_type VARCHAR(100),
        towing_required BOOLEAN DEFAULT FALSE,
        towing_company VARCHAR(255),
        estimated_repair_time VARCHAR(100),
        alternative_arrangement TEXT,
        delay_duration VARCHAR(100),
        impact_on_schedule TEXT,
        recovery_status ENUM('Pending', 'In Progress', 'Completed', 'Cancelled') DEFAULT 'Pending',
        recovery_action TEXT,
        recovery_datetime DATETIME,
        additional_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_vehicle_id (vehicle_id),
        INDEX idx_driver_id (driver_id),
        INDEX idx_trip_id (trip_id),
        INDEX idx_breakdown_datetime (breakdown_datetime),
        INDEX idx_recovery_status (recovery_status),
        FOREIGN KEY (breakdown_id) REFERENCES vehicle_breakdown(id) ON DELETE SET NULL,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
        FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE SET NULL,
        FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $conn->exec($sql2);
    echo "✓ Created vehicle_breakdown_inroute table\n";
    
    echo "\n✅ Tables renamed and recreated successfully!\n";
    
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
