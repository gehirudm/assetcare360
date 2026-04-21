<?php
/**
 * Migration 065: Add capacity_level to cargo_items
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

    echo "Starting migration 065: add capacity_level to cargo_items\n";
    echo str_repeat('=', 60) . "\n";

    if (!tableExists($db, 'cargo_items')) {
        throw new Exception('cargo_items table does not exist');
    }

    if (!columnExists($db, 'cargo_items', 'capacity_level')) {
        $db->exec(
            "ALTER TABLE cargo_items
             ADD COLUMN capacity_level ENUM('low', 'average', 'high') NOT NULL DEFAULT 'average' AFTER unit"
        );
        echo "- cargo_items.capacity_level: added\n";
    } else {
        echo "- cargo_items.capacity_level: already exists\n";
    }

    $db->exec(
        "UPDATE cargo_items
         SET capacity_level = 'average'
         WHERE capacity_level IS NULL OR capacity_level NOT IN ('low', 'average', 'high')"
    );
    echo "- cargo_items.capacity_level: normalized existing values\n";

    if (!indexExists($db, 'cargo_items', 'idx_cargo_items_capacity_level')) {
        $db->exec(
            'ALTER TABLE cargo_items ADD INDEX idx_cargo_items_capacity_level (capacity_level)'
        );
        echo "- idx_cargo_items_capacity_level: created\n";
    } else {
        echo "- idx_cargo_items_capacity_level: already exists\n";
    }

    echo "\nMigration 065 completed successfully.\n";
} catch (Exception $e) {
    echo "\nMigration 065 failed: " . $e->getMessage() . "\n";
    exit(1);
}
