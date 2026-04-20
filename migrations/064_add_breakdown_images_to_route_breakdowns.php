<?php
/**
 * Migration 064: Add breakdown images JSON to route breakdown reports
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
        'SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?'
    );
    $stmt->execute([$table, $column]);
    return (bool) $stmt->fetchColumn();
}

try {
    $db = Database::getInstance()->getConnection();

    echo "Starting migration 064: add route breakdown report images column\n";
    echo str_repeat('=', 70) . "\n";

    if (!tableExists($db, 'vehicle_breakdown_inroute')) {
        throw new Exception('vehicle_breakdown_inroute table does not exist');
    }

    if (!columnExists($db, 'vehicle_breakdown_inroute', 'breakdown_images_json')) {
        $db->exec(
            "ALTER TABLE vehicle_breakdown_inroute
             ADD COLUMN breakdown_images_json LONGTEXT NULL AFTER description"
        );
        echo "- vehicle_breakdown_inroute.breakdown_images_json: added\n";
    } else {
        echo "- vehicle_breakdown_inroute.breakdown_images_json: already exists, skipped\n";
    }

    echo "\nMigration 064 completed successfully.\n";
} catch (Exception $e) {
    echo "\nMigration 064 failed: " . $e->getMessage() . "\n";
    exit(1);
}
