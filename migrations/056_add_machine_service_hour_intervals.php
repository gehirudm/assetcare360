<?php
/**
 * Migration 056: Add machine service hour interval fields
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

    echo "Starting migration 056: add machine service hour interval fields\n";
    echo str_repeat('=', 72) . "\n";

    if (!tableExists($db, 'machines')) {
        throw new Exception('machines table does not exist');
    }

    if (!columnExists($db, 'machines', 'service_interval_hours')) {
        $db->exec("ALTER TABLE machines ADD COLUMN service_interval_hours INT NULL COMMENT 'Service interval in operating hours' AFTER service_interval_days");
        echo "- service_interval_hours: added\n";
    } else {
        echo "- service_interval_hours: already exists\n";
    }

    if (!columnExists($db, 'machines', 'current_operating_hours')) {
        $db->exec("ALTER TABLE machines ADD COLUMN current_operating_hours INT NOT NULL DEFAULT 0 COMMENT 'Current operating hours' AFTER service_interval_hours");
        echo "- current_operating_hours: added\n";
    } else {
        echo "- current_operating_hours: already exists\n";
    }

    if (!columnExists($db, 'machines', 'last_service_hours')) {
        $db->exec("ALTER TABLE machines ADD COLUMN last_service_hours INT NULL COMMENT 'Operating hours at last service' AFTER last_service_date");
        echo "- last_service_hours: added\n";
    } else {
        echo "- last_service_hours: already exists\n";
    }

    if (!columnExists($db, 'machines', 'next_service_hours')) {
        $db->exec("ALTER TABLE machines ADD COLUMN next_service_hours INT NULL COMMENT 'Next service threshold in operating hours' AFTER next_service_date");
        echo "- next_service_hours: added\n";
    } else {
        echo "- next_service_hours: already exists\n";
    }

    if (!indexExists($db, 'machines', 'idx_next_service_hours')) {
        $db->exec('ALTER TABLE machines ADD INDEX idx_next_service_hours (next_service_hours)');
        echo "- idx_next_service_hours: created\n";
    } else {
        echo "- idx_next_service_hours: already exists\n";
    }

    echo "\nMigration 056 completed successfully.\n";
} catch (Exception $e) {
    echo "\nMigration 056 failed: " . $e->getMessage() . "\n";
    exit(1);
}
