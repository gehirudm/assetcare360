<?php
/**
 * Migration 058: Add insurance fields to machines and vehicles
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

function indexExists(PDO $db, string $table, string $index): bool {
    $stmt = $db->prepare(
        'SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?'
    );
    $stmt->execute([$table, $index]);
    return (bool) $stmt->fetchColumn();
}

try {
    $db = Database::getInstance()->getConnection();

    echo "Starting migration 058: add insurance fields to machines and vehicles\n";
    echo str_repeat('=', 70) . "\n";

    if (!tableExists($db, 'machines')) {
        throw new Exception('machines table does not exist');
    }

    if (!tableExists($db, 'vehicles')) {
        throw new Exception('vehicles table does not exist');
    }

    $assetTables = ['machines', 'vehicles'];

    foreach ($assetTables as $table) {
        if (!columnExists($db, $table, 'insurance_type')) {
            $db->exec(
                "ALTER TABLE {$table} ADD COLUMN insurance_type ENUM('Full', 'Third-Party') NULL AFTER warranty_provider"
            );
            echo "- {$table}.insurance_type: added\n";
        } else {
            echo "- {$table}.insurance_type: already exists\n";
        }

        if (!columnExists($db, $table, 'insurance_provider')) {
            $db->exec(
                "ALTER TABLE {$table} ADD COLUMN insurance_provider VARCHAR(255) NULL AFTER insurance_type"
            );
            echo "- {$table}.insurance_provider: added\n";
        } else {
            echo "- {$table}.insurance_provider: already exists\n";
        }

        if (!columnExists($db, $table, 'insurance_provider_details')) {
            $db->exec(
                "ALTER TABLE {$table} ADD COLUMN insurance_provider_details TEXT NULL AFTER insurance_provider"
            );
            echo "- {$table}.insurance_provider_details: added\n";
        } else {
            echo "- {$table}.insurance_provider_details: already exists\n";
        }

        if (!columnExists($db, $table, 'insurance_renew_interval_days')) {
            $db->exec(
                "ALTER TABLE {$table} ADD COLUMN insurance_renew_interval_days INT NULL AFTER insurance_provider_details"
            );
            echo "- {$table}.insurance_renew_interval_days: added\n";
        } else {
            echo "- {$table}.insurance_renew_interval_days: already exists\n";
        }

        if (!columnExists($db, $table, 'last_insurance_renew_date')) {
            $db->exec(
                "ALTER TABLE {$table} ADD COLUMN last_insurance_renew_date DATE NULL AFTER insurance_renew_interval_days"
            );
            echo "- {$table}.last_insurance_renew_date: added\n";
        } else {
            echo "- {$table}.last_insurance_renew_date: already exists\n";
        }

        if (!columnExists($db, $table, 'last_insurance_renew_details')) {
            $db->exec(
                "ALTER TABLE {$table} ADD COLUMN last_insurance_renew_details TEXT NULL AFTER last_insurance_renew_date"
            );
            echo "- {$table}.last_insurance_renew_details: added\n";
        } else {
            echo "- {$table}.last_insurance_renew_details: already exists\n";
        }

        if (!columnExists($db, $table, 'next_insurance_renew_date')) {
            $db->exec(
                "ALTER TABLE {$table} ADD COLUMN next_insurance_renew_date DATE NULL AFTER last_insurance_renew_details"
            );
            echo "- {$table}.next_insurance_renew_date: added\n";
        } else {
            echo "- {$table}.next_insurance_renew_date: already exists\n";
        }

        $indexName = $table === 'machines'
            ? 'idx_machine_next_insurance_renew'
            : 'idx_vehicle_next_insurance_renew';

        if (!indexExists($db, $table, $indexName)) {
            $db->exec(
                "ALTER TABLE {$table} ADD INDEX {$indexName} (next_insurance_renew_date)"
            );
            echo "- {$indexName}: created\n";
        } else {
            echo "- {$indexName}: already exists\n";
        }

        $backfillSql = "
            UPDATE {$table}
            SET next_insurance_renew_date = DATE_ADD(last_insurance_renew_date, INTERVAL insurance_renew_interval_days DAY)
            WHERE last_insurance_renew_date IS NOT NULL
              AND insurance_renew_interval_days IS NOT NULL
              AND insurance_renew_interval_days > 0
              AND (next_insurance_renew_date IS NULL OR next_insurance_renew_date <> DATE_ADD(last_insurance_renew_date, INTERVAL insurance_renew_interval_days DAY))
        ";
        $updatedRows = $db->exec($backfillSql);
        echo "- {$table}.next_insurance_renew_date backfilled rows: {$updatedRows}\n";
    }

    echo "\nMigration 058 completed successfully.\n";
} catch (Exception $e) {
    echo "\nMigration 058 failed: " . $e->getMessage() . "\n";
    exit(1);
}
