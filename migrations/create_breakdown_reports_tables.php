<?php

/**
 * Migration: Create Breakdown Reports Tables
 * Creates tables for tracking breakdown reports and route breakdowns
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    
    echo "Creating breakdown reports tables...\n\n";
    
    // 1. Create breakdown_reports table (main breakdown report)
    $sql1 = "CREATE TABLE IF NOT EXISTS breakdown_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        report_id VARCHAR(50) UNIQUE NOT NULL,
        asset_type ENUM('Vehicle', 'Machine') NOT NULL,
        asset_id INT NOT NULL,
        breakdown_date DATETIME NOT NULL,
        location VARCHAR(255) NOT NULL,
        breakdown_type ENUM('Mechanical', 'Electrical', 'Hydraulic', 'Engine', 'Transmission', 'Tire', 'Other') NOT NULL,
        severity ENUM('Critical', 'High', 'Medium', 'Low') NOT NULL DEFAULT 'Medium',
        description TEXT NOT NULL,
        reported_by INT NOT NULL,
        assigned_technician INT,
        status ENUM('Pending', 'In Progress', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
        downtime_hours DECIMAL(10, 2) DEFAULT 0.00,
        repair_cost DECIMAL(10, 2) DEFAULT 0.00,
        parts_used TEXT,
        resolution_notes TEXT,
        completed_date DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_asset_type_id (asset_type, asset_id),
        INDEX idx_breakdown_date (breakdown_date),
        INDEX idx_status (status),
        INDEX idx_severity (severity),
        INDEX idx_reported_by (reported_by),
        INDEX idx_assigned_technician (assigned_technician),
        FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE RESTRICT,
        FOREIGN KEY (assigned_technician) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $conn->exec($sql1);
    echo "✓ Created breakdown_reports table\n";
    
    // 2. Create route_breakdowns table (breakdown during route/trip)
    $sql2 = "CREATE TABLE IF NOT EXISTS route_breakdowns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        route_id VARCHAR(50) UNIQUE NOT NULL,
        breakdown_report_id INT,
        vehicle_id INT NOT NULL,
        trip_id INT,
        route_name VARCHAR(255) NOT NULL,
        start_location VARCHAR(255) NOT NULL,
        breakdown_location VARCHAR(255) NOT NULL,
        destination VARCHAR(255) NOT NULL,
        breakdown_time DATETIME NOT NULL,
        odometer_reading INT,
        cargo_details TEXT,
        driver_id INT NOT NULL,
        passengers_count INT DEFAULT 0,
        weather_conditions VARCHAR(100),
        road_conditions VARCHAR(100),
        emergency_services_called BOOLEAN DEFAULT FALSE,
        towing_required BOOLEAN DEFAULT FALSE,
        estimated_delay_hours DECIMAL(5, 2),
        recovery_action TEXT,
        recovery_completed BOOLEAN DEFAULT FALSE,
        recovery_completed_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_vehicle_id (vehicle_id),
        INDEX idx_trip_id (trip_id),
        INDEX idx_driver_id (driver_id),
        INDEX idx_breakdown_time (breakdown_time),
        FOREIGN KEY (breakdown_report_id) REFERENCES breakdown_reports(id) ON DELETE SET NULL,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
        FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE SET NULL,
        FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $conn->exec($sql2);
    echo "✓ Created route_breakdowns table\n";
    
    echo "\n✅ Breakdown reports tables created successfully!\n";
    
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
