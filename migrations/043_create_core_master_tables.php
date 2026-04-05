<?php
/**
 * Migration 043: Create core master tables missing from migrations folder.
 *
 * This migration backfills migration coverage for tables that are already used
 * by models/services but do not currently have a dedicated create-table migration.
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

function tableExists(PDO $db, string $table): bool {
    $stmt = $db->prepare('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?');
    $stmt->execute([$table]);
    return (bool) $stmt->fetchColumn();
}

function createTableIfMissing(PDO $db, string $table, string $sql): void {
    if (tableExists($db, $table)) {
        echo "- {$table}: already exists, skipped\n";
        return;
    }

    $db->exec($sql);
    echo "- {$table}: created\n";
}

try {
    $db = Database::getInstance()->getConnection();

    echo "Starting migration 043: create core master tables\n";
    echo "================================================\n";

    createTableIfMissing($db, 'users', "
        CREATE TABLE users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            employee_id VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            full_name VARCHAR(255) NOT NULL,
            role ENUM('Admin', 'Maintenance Manager', 'Inventory Manager', 'Technical Officer', 'Supervisor', 'Machinary Operator', 'Driver', 'Auction Officer') NOT NULL,
            technical_expertise VARCHAR(100) NULL,
            department VARCHAR(100) NULL,
            email VARCHAR(255) NULL,
            phone VARCHAR(20) NULL,
            is_active TINYINT(1) DEFAULT 1,
            force_password_change TINYINT(1) DEFAULT 0,
            password_reset_token VARCHAR(255) NULL,
            password_reset_expires TIMESTAMP NULL,
            last_login TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_role (role),
            INDEX idx_technical_expertise (technical_expertise),
            INDEX idx_active (is_active),
            INDEX idx_department (department)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    createTableIfMissing($db, 'machines', "
        CREATE TABLE machines (
            id INT AUTO_INCREMENT PRIMARY KEY,
            machine_id VARCHAR(50) UNIQUE NOT NULL,
            serial_number VARCHAR(100) NULL,
            model_number VARCHAR(100) NOT NULL,
            machine_name VARCHAR(255) NOT NULL,
            location VARCHAR(255) NOT NULL,
            warranty_expiry DATE NULL,
            warranty_provider VARCHAR(255) NULL,
            supplier_name VARCHAR(255) NOT NULL,
            supplier_contact VARCHAR(100) NULL,
            service_interval_days INT NOT NULL DEFAULT 90,
            last_service_date DATE NULL,
            next_service_date DATE NULL,
            components TEXT NULL,
            status ENUM('Active', 'Inactive', 'Under Maintenance', 'Decommissioned', 'For Auction') DEFAULT 'Active',
            notes TEXT NULL,
            created_by INT NULL,
            updated_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_status (status),
            INDEX idx_location (location),
            INDEX idx_next_service (next_service_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    createTableIfMissing($db, 'vehicles', "
        CREATE TABLE vehicles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vehicle_id VARCHAR(50) UNIQUE NOT NULL,
            vehicle_name VARCHAR(255) NOT NULL,
            model_number VARCHAR(100) NULL,
            chassis_number VARCHAR(100) NULL,
            number_plate VARCHAR(20) UNIQUE NOT NULL,
            vehicle_type ENUM('Truck', 'Van', 'Car', 'Bus', 'Bike', 'Three-Wheeler', 'Lorry', 'Tanker', 'Other') NOT NULL,
            fuel_type ENUM('Petrol', 'Diesel', 'Electric', 'Hybrid', 'LPG', 'CNG') NOT NULL,
            warranty_expiry DATE NULL,
            warranty_provider VARCHAR(255) NULL,
            supplier_name VARCHAR(255) NOT NULL,
            supplier_contact VARCHAR(100) NULL,
            service_interval_type ENUM('Time-Based', 'Mileage-Based', 'Both') DEFAULT 'Both',
            service_interval_days INT NULL,
            service_interval_km INT NULL,
            current_mileage INT NOT NULL DEFAULT 0,
            last_service_date DATE NULL,
            last_service_mileage INT NULL,
            next_service_date DATE NULL,
            next_service_mileage INT NULL,
            status ENUM('Active', 'Inactive', 'Under Maintenance', 'Decommissioned', 'For Auction') DEFAULT 'Active',
            components TEXT NULL,
            notes TEXT NULL,
            created_by INT NULL,
            updated_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_status (status),
            INDEX idx_vehicle_type (vehicle_type),
            INDEX idx_next_service_date (next_service_date),
            INDEX idx_next_service_mileage (next_service_mileage)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    createTableIfMissing($db, 'spareparts', "
        CREATE TABLE spareparts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sparepart_id VARCHAR(50) UNIQUE NOT NULL,
            sku VARCHAR(100) UNIQUE NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT NULL,
            category VARCHAR(100) NULL,
            quantity INT DEFAULT 0,
            unit_price DECIMAL(10,2) DEFAULT 0.00,
            reorder_level INT DEFAULT 10,
            compatible_machines JSON NULL,
            compatible_vehicles JSON NULL,
            location VARCHAR(255) NULL,
            is_active TINYINT(1) DEFAULT 1,
            created_by INT NULL,
            updated_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            last_issue_date DATE NULL,
            INDEX idx_category (category),
            INDEX idx_active (is_active),
            INDEX idx_reorder (quantity, reorder_level)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    echo "\nMigration 043 completed successfully.\n";
} catch (Exception $e) {
    echo "\nMigration 043 failed: " . $e->getMessage() . "\n";
    exit(1);
}
