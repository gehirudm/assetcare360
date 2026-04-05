<?php
/**
 * Migration 045: Add fuel_logs table and sync users.role enum.
 *
 * Changes:
 *  - Creates fuel_logs table (pulled from remote).
 *  - Adds 'Transportation Manager' to users.role enum if not already present.
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $db = Database::getInstance()->getConnection();

    echo "Starting migration 045: create fuel_logs and sync users.role\n";
    echo str_repeat('=', 58) . "\n";

    // ── 1. fuel_logs table ────────────────────────────────────────
    $stmt = $db->prepare(
        'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?'
    );
    $stmt->execute(['fuel_logs']);
    if (!(bool) $stmt->fetchColumn()) {
        $db->exec("
            CREATE TABLE fuel_logs (
                id INT(11) NOT NULL AUTO_INCREMENT,
                fuel_log_id VARCHAR(20) NOT NULL,
                vehicle_registration VARCHAR(50) NOT NULL,
                driver_id INT(11) DEFAULT NULL,
                log_datetime DATETIME NOT NULL,
                fuel_volume DECIMAL(10,2) NOT NULL,
                total_cost DECIMAL(12,2) NOT NULL,
                odometer_reading INT(11) NOT NULL,
                station_name VARCHAR(255) DEFAULT NULL,
                fuel_type VARCHAR(50) NOT NULL,
                distance_since_last DECIMAL(10,2) DEFAULT NULL,
                fuel_efficiency DECIMAL(10,2) DEFAULT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY fuel_log_id (fuel_log_id),
                KEY idx_fuel_log_id (fuel_log_id),
                KEY idx_vehicle_registration (vehicle_registration),
                KEY idx_driver_id (driver_id),
                KEY idx_log_datetime (log_datetime)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        echo "- fuel_logs: created\n";
    } else {
        echo "- fuel_logs: already exists, skipped\n";
    }

    // ── 2. users.role — add 'Transportation Manager' if missing ───
    $stmt = $db->prepare(
        "SELECT COLUMN_TYPE FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'role'"
    );
    $stmt->execute();
    $colType = $stmt->fetchColumn();

    if ($colType && strpos($colType, 'Transportation Manager') === false) {
        $db->exec("
            ALTER TABLE users
                MODIFY COLUMN role ENUM(
                    'Admin',
                    'Maintenance Manager',
                    'Inventory Manager',
                    'Transportation Manager',
                    'Technical Officer',
                    'Supervisor',
                    'Machinary Operator',
                    'Driver',
                    'Auction Officer'
                ) NOT NULL
        ");
        echo "- users.role: added 'Transportation Manager'\n";
    } else {
        echo "- users.role: already has 'Transportation Manager', skipped\n";
    }

    echo "\nMigration 045 completed successfully.\n";
} catch (Exception $e) {
    echo "\nMigration 045 failed: " . $e->getMessage() . "\n";
    exit(1);
}
