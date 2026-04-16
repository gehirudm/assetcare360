<?php
/**
 * Migration 054: Add government_fuel_qr_image to vehicles
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

try {
    $db = Database::getInstance()->getConnection();

    echo "Starting migration 054: add government fuel QR image field\n";
    echo str_repeat('=', 60) . "\n";

    if (!tableExists($db, 'vehicles')) {
        throw new Exception('vehicles table does not exist');
    }

    if (!columnExists($db, 'vehicles', 'government_fuel_qr_image')) {
        $db->exec(
            "ALTER TABLE vehicles
             ADD COLUMN government_fuel_qr_image VARCHAR(500) NULL
             COMMENT 'Path to government-issued fuel QR image' AFTER fuel_type"
        );
        echo "- government_fuel_qr_image: added\n";
    } else {
        echo "- government_fuel_qr_image: already exists\n";
    }

    echo "\nMigration 054 completed successfully.\n";
} catch (Exception $e) {
    echo "\nMigration 054 failed: " . $e->getMessage() . "\n";
    exit(1);
}
