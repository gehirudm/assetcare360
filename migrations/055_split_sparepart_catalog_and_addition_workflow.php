<?php
/**
 * Migration 055: Split sparepart catalog and addition workflow
 * - Add low_stock_threshold to spareparts
 * - Remove compatibility columns from sparepart_additions
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

    echo "Starting migration 055: split sparepart catalog and addition workflow\n";
    echo str_repeat('=', 70) . "\n";

    if (!tableExists($db, 'spareparts')) {
        throw new Exception('spareparts table does not exist');
    }

    if (!columnExists($db, 'spareparts', 'low_stock_threshold')) {
        $db->exec(
            "ALTER TABLE spareparts
             ADD COLUMN low_stock_threshold INT NULL DEFAULT NULL AFTER reorder_level"
        );
        echo "- spareparts.low_stock_threshold: added\n";
    } else {
        echo "- spareparts.low_stock_threshold: already exists\n";
    }

    $db->exec(
        "UPDATE spareparts
         SET low_stock_threshold = COALESCE(low_stock_threshold, reorder_level, 10)"
    );
    echo "- spareparts.low_stock_threshold: backfilled from reorder_level\n";

    $db->exec(
        "ALTER TABLE spareparts
         MODIFY COLUMN low_stock_threshold INT NOT NULL DEFAULT 10"
    );
    echo "- spareparts.low_stock_threshold: enforced NOT NULL DEFAULT 10\n";

    if (!indexExists($db, 'spareparts', 'idx_low_stock_threshold')) {
        $db->exec(
            "ALTER TABLE spareparts
             ADD INDEX idx_low_stock_threshold (quantity, low_stock_threshold)"
        );
        echo "- spareparts.idx_low_stock_threshold: added\n";
    } else {
        echo "- spareparts.idx_low_stock_threshold: already exists\n";
    }

    if (!tableExists($db, 'sparepart_additions')) {
        throw new Exception('sparepart_additions table does not exist');
    }

    if (columnExists($db, 'sparepart_additions', 'compatible_machines')) {
        $db->exec('ALTER TABLE sparepart_additions DROP COLUMN compatible_machines');
        echo "- sparepart_additions.compatible_machines: dropped\n";
    } else {
        echo "- sparepart_additions.compatible_machines: already removed\n";
    }

    if (columnExists($db, 'sparepart_additions', 'compatible_vehicles')) {
        $db->exec('ALTER TABLE sparepart_additions DROP COLUMN compatible_vehicles');
        echo "- sparepart_additions.compatible_vehicles: dropped\n";
    } else {
        echo "- sparepart_additions.compatible_vehicles: already removed\n";
    }

    echo "\nMigration 055 completed successfully.\n";
} catch (Exception $e) {
    echo "\nMigration 055 failed: " . $e->getMessage() . "\n";
    exit(1);
}
