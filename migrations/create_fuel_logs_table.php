<?php

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $db = Database::getInstance()->getConnection();

    echo "Creating fuel_logs table...\n";

    $sql = "CREATE TABLE IF NOT EXISTS fuel_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fuel_log_id VARCHAR(20) UNIQUE NOT NULL,
        vehicle_registration VARCHAR(50) NOT NULL,
        driver_id INT NULL,
        log_datetime DATETIME NOT NULL,
        fuel_volume DECIMAL(10,2) NOT NULL,
        total_cost DECIMAL(12,2) NOT NULL,
        odometer_reading INT NOT NULL,
        station_name VARCHAR(255) NULL,
        fuel_type VARCHAR(50) NOT NULL,
        distance_since_last DECIMAL(10,2) NULL,
        fuel_efficiency DECIMAL(10,2) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_fuel_log_id (fuel_log_id),
        INDEX idx_vehicle_registration (vehicle_registration),
        INDEX idx_driver_id (driver_id),
        INDEX idx_log_datetime (log_datetime)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

    $db->exec($sql);

    echo "✓ fuel_logs table created successfully!\n";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
