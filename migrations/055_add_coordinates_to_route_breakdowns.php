<?php
/**
 * Migration 055: Add coordinates to route breakdown reports
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

function tableExists(PDO $db, string $table): bool {
    $stmt = $db->prepare(
        'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?'
    );
    $stmt->execute([$table]);
    return (bool)$stmt->fetchColumn();
}

function columnExists(PDO $db, string $table, string $column): bool {
    $stmt = $db->prepare(
        'SELECT COUNT(*) FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?'
    );
    $stmt->execute([$table, $column]);
    return (bool)$stmt->fetchColumn();
}

function indexExists(PDO $db, string $table, string $index): bool {
    $stmt = $db->prepare(
        'SELECT COUNT(*) FROM information_schema.statistics
         WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?'
    );
    $stmt->execute([$table, $index]);
    return (bool)$stmt->fetchColumn();
}

try {
    $db = Database::getInstance()->getConnection();

    echo "Starting migration 055: add coordinates to route breakdown reports\n";
    echo str_repeat('=', 68) . "\n";

    if (!tableExists($db, 'vehicle_breakdown_inroute')) {
        throw new Exception('vehicle_breakdown_inroute table does not exist');
    }

    if (!columnExists($db, 'vehicle_breakdown_inroute', 'breakdown_latitude')) {
        $db->exec("ALTER TABLE vehicle_breakdown_inroute ADD COLUMN breakdown_latitude DECIMAL(10,7) NULL AFTER breakdown_location");
        echo "- breakdown_latitude: added\n";
    } else {
        echo "- breakdown_latitude: already exists\n";
    }

    if (!columnExists($db, 'vehicle_breakdown_inroute', 'breakdown_longitude')) {
        $db->exec("ALTER TABLE vehicle_breakdown_inroute ADD COLUMN breakdown_longitude DECIMAL(10,7) NULL AFTER breakdown_latitude");
        echo "- breakdown_longitude: added\n";
    } else {
        echo "- breakdown_longitude: already exists\n";
    }

    if (!indexExists($db, 'vehicle_breakdown_inroute', 'idx_route_breakdown_coordinates')) {
        $db->exec("ALTER TABLE vehicle_breakdown_inroute ADD INDEX idx_route_breakdown_coordinates (breakdown_latitude, breakdown_longitude)");
        echo "- idx_route_breakdown_coordinates: created\n";
    } else {
        echo "- idx_route_breakdown_coordinates: already exists\n";
    }

    echo "\nMigration 055 completed successfully.\n";
} catch (Exception $e) {
    echo "\nMigration 055 failed: " . $e->getMessage() . "\n";
    exit(1);
}
