<?php
/**
 * Migration 065: Ensure breakdown_date exists on vehicle_breakdown
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

    echo "Starting migration 065: ensure breakdown_date on vehicle_breakdown\n";
    echo str_repeat('=', 70) . "\n";

    if (!tableExists($db, 'vehicle_breakdown')) {
        throw new Exception('vehicle_breakdown table does not exist');
    }

    if (!columnExists($db, 'vehicle_breakdown', 'breakdown_date')) {
        $db->exec(
            "ALTER TABLE vehicle_breakdown
             ADD COLUMN breakdown_date DATE NULL AFTER driver_id"
        );
        echo "- vehicle_breakdown.breakdown_date: added (nullable)\n";

        $db->exec(
            "UPDATE vehicle_breakdown
             SET breakdown_date = DATE(COALESCE(created_at, NOW()))
             WHERE breakdown_date IS NULL"
        );
        echo "- vehicle_breakdown.breakdown_date: backfilled from created_at\n";

        $db->exec(
            "ALTER TABLE vehicle_breakdown
             MODIFY COLUMN breakdown_date DATE NOT NULL"
        );
        echo "- vehicle_breakdown.breakdown_date: set NOT NULL\n";
    } else {
        echo "- vehicle_breakdown.breakdown_date: already exists, skipped\n";
    }

    echo "\nMigration 065 completed successfully.\n";
} catch (Exception $e) {
    echo "\nMigration 065 failed: " . $e->getMessage() . "\n";
    exit(1);
}
