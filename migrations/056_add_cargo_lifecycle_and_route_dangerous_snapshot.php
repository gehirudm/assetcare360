<?php
/**
 * Migration 056: Add cargo lifecycle tables and dangerous-cargo snapshot fields
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

function tableExists(PDO $db, string $table): bool {
    $stmt = $db->prepare(
        'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?'
    );
    $stmt->execute([$table]);
    return (bool) $stmt->fetchColumn();
}

function columnExists(PDO $db, string $table, string $column): bool {
    $stmt = $db->prepare(
        'SELECT COUNT(*) FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?'
    );
    $stmt->execute([$table, $column]);
    return (bool) $stmt->fetchColumn();
}

function indexExists(PDO $db, string $table, string $index): bool {
    $stmt = $db->prepare(
        'SELECT COUNT(*) FROM information_schema.statistics
         WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?'
    );
    $stmt->execute([$table, $index]);
    return (bool) $stmt->fetchColumn();
}

try {
    $db = Database::getInstance()->getConnection();

    echo "Starting migration 056: cargo lifecycle + dangerous snapshot\n";
    echo str_repeat('=', 70) . "\n";

    if (!tableExists($db, 'cargo_items')) {
        $db->exec(
            "CREATE TABLE cargo_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                cargo_item_id VARCHAR(20) NOT NULL,
                name VARCHAR(150) NOT NULL,
                description TEXT NULL,
                unit VARCHAR(50) NOT NULL DEFAULT 'units',
                is_dangerous TINYINT(1) NOT NULL DEFAULT 0,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_by INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_cargo_items_code (cargo_item_id),
                UNIQUE KEY uq_cargo_items_name (name),
                INDEX idx_cargo_items_active (is_active),
                INDEX idx_cargo_items_dangerous (is_dangerous),
                INDEX idx_cargo_items_created_by (created_by),
                CONSTRAINT fk_cargo_items_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
        echo "- cargo_items: created\n";
    } else {
        echo "- cargo_items: already exists\n";
    }

    if (!tableExists($db, 'trip_cargo_items')) {
        $db->exec(
            "CREATE TABLE trip_cargo_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                trip_id INT NOT NULL,
                cargo_item_id INT NOT NULL,
                quantity DECIMAL(14,3) NOT NULL,
                notes VARCHAR(255) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_trip_cargo_trip_item (trip_id, cargo_item_id),
                INDEX idx_trip_cargo_trip_id (trip_id),
                INDEX idx_trip_cargo_item_id (cargo_item_id),
                CONSTRAINT fk_trip_cargo_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
                CONSTRAINT fk_trip_cargo_item FOREIGN KEY (cargo_item_id) REFERENCES cargo_items(id) ON DELETE RESTRICT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
        echo "- trip_cargo_items: created\n";
    } else {
        echo "- trip_cargo_items: already exists\n";
    }

    if (!tableExists($db, 'vehicle_breakdown_inroute')) {
        throw new Exception('vehicle_breakdown_inroute table does not exist');
    }

    if (!columnExists($db, 'vehicle_breakdown_inroute', 'dangerous_cargo_present')) {
        $db->exec(
            "ALTER TABLE vehicle_breakdown_inroute
             ADD COLUMN dangerous_cargo_present TINYINT(1) NOT NULL DEFAULT 0 AFTER description"
        );
        echo "- vehicle_breakdown_inroute.dangerous_cargo_present: added\n";
    } else {
        echo "- vehicle_breakdown_inroute.dangerous_cargo_present: already exists\n";
    }

    if (!columnExists($db, 'vehicle_breakdown_inroute', 'dangerous_cargo_summary')) {
        $db->exec(
            "ALTER TABLE vehicle_breakdown_inroute
             ADD COLUMN dangerous_cargo_summary TEXT NULL AFTER dangerous_cargo_present"
        );
        echo "- vehicle_breakdown_inroute.dangerous_cargo_summary: added\n";
    } else {
        echo "- vehicle_breakdown_inroute.dangerous_cargo_summary: already exists\n";
    }

    if (!columnExists($db, 'vehicle_breakdown_inroute', 'dangerous_cargo_trip_id')) {
        $db->exec(
            "ALTER TABLE vehicle_breakdown_inroute
             ADD COLUMN dangerous_cargo_trip_id VARCHAR(20) NULL AFTER dangerous_cargo_summary"
        );
        echo "- vehicle_breakdown_inroute.dangerous_cargo_trip_id: added\n";
    } else {
        echo "- vehicle_breakdown_inroute.dangerous_cargo_trip_id: already exists\n";
    }

    if (!indexExists($db, 'vehicle_breakdown_inroute', 'idx_route_breakdown_dangerous_cargo')) {
        $db->exec(
            "ALTER TABLE vehicle_breakdown_inroute
             ADD INDEX idx_route_breakdown_dangerous_cargo (dangerous_cargo_present)"
        );
        echo "- idx_route_breakdown_dangerous_cargo: created\n";
    } else {
        echo "- idx_route_breakdown_dangerous_cargo: already exists\n";
    }

    echo "\nMigration 056 completed successfully.\n";
} catch (Exception $e) {
    echo "\nMigration 056 failed: " . $e->getMessage() . "\n";
    exit(1);
}
