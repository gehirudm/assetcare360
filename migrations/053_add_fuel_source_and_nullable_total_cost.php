<?php
/**
 * Migration 053: Add fuel_source and allow nullable total_cost in fuel_logs
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

function isColumnNullable(PDO $db, string $table, string $column): bool {
    $stmt = $db->prepare(
        'SELECT is_nullable FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?'
    );
    $stmt->execute([$table, $column]);
    $value = $stmt->fetchColumn();

    return strtoupper((string)$value) === 'YES';
}

try {
    $db = Database::getInstance()->getConnection();

    echo "Starting migration 053: fuel source + nullable fuel cost\n";
    echo str_repeat('=', 60) . "\n";

    if (!tableExists($db, 'fuel_logs')) {
        throw new Exception('fuel_logs table does not exist');
    }

    if (!columnExists($db, 'fuel_logs', 'fuel_source')) {
        $db->exec("ALTER TABLE fuel_logs ADD COLUMN fuel_source ENUM('internal','external') NOT NULL DEFAULT 'external' AFTER fuel_type");
        echo "- fuel_source: added\n";
    } else {
        echo "- fuel_source: already exists\n";
    }

    $db->exec("UPDATE fuel_logs SET fuel_source = 'external' WHERE fuel_source IS NULL OR fuel_source = ''");
    echo "- fuel_source: existing records backfilled as external when missing\n";

    if (columnExists($db, 'fuel_logs', 'total_cost')) {
        if (!isColumnNullable($db, 'fuel_logs', 'total_cost')) {
            $db->exec("ALTER TABLE fuel_logs MODIFY COLUMN total_cost DECIMAL(12,2) NULL DEFAULT NULL");
            echo "- total_cost: changed to nullable\n";
        } else {
            echo "- total_cost: already nullable\n";
        }
    } else {
        throw new Exception('total_cost column does not exist in fuel_logs');
    }

    if (!indexExists($db, 'fuel_logs', 'idx_fuel_source')) {
        $db->exec("ALTER TABLE fuel_logs ADD INDEX idx_fuel_source (fuel_source)");
        echo "- idx_fuel_source: created\n";
    } else {
        echo "- idx_fuel_source: already exists\n";
    }

    echo "\nMigration 053 completed successfully.\n";
} catch (Exception $e) {
    echo "\nMigration 053 failed: " . $e->getMessage() . "\n";
    exit(1);
}
