<?php
/**
 * Migration 059: Add Insurance Claimed status to fault_tickets enum
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

function tableExists(PDO $db, string $table): bool {
    $stmt = $db->prepare(
        'SELECT COUNT(*)
         FROM information_schema.tables
         WHERE table_schema = DATABASE()
           AND table_name = ?'
    );
    $stmt->execute([$table]);
    return (bool) $stmt->fetchColumn();
}

function columnExists(PDO $db, string $table, string $column): bool {
    $stmt = $db->prepare(
        'SELECT COUNT(*)
         FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND table_name = ?
           AND column_name = ?'
    );
    $stmt->execute([$table, $column]);
    return (bool) $stmt->fetchColumn();
}

function getColumnType(PDO $db, string $table, string $column): ?string {
    $stmt = $db->prepare(
        'SELECT COLUMN_TYPE
         FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND table_name = ?
           AND column_name = ?
         LIMIT 1'
    );
    $stmt->execute([$table, $column]);
    $value = $stmt->fetchColumn();
    return $value === false ? null : (string) $value;
}

try {
    $db = Database::getInstance()->getConnection();

    echo "Starting migration 059: add Insurance Claimed status to fault_tickets enum\n";
    echo str_repeat('=', 70) . "\n";

    if (!tableExists($db, 'fault_tickets')) {
        echo "- fault_tickets: table not found, skipped\n";
        echo "\nMigration 059 completed successfully.\n";
        exit(0);
    }

    if (!columnExists($db, 'fault_tickets', 'status')) {
        echo "- fault_tickets.status: column not found, skipped\n";
        echo "\nMigration 059 completed successfully.\n";
        exit(0);
    }

    $columnType = getColumnType($db, 'fault_tickets', 'status');
    if ($columnType !== null && strpos($columnType, "'Insurance Claimed'") !== false) {
        echo "- fault_tickets.status: already includes 'Insurance Claimed', skipped\n";
        echo "\nMigration 059 completed successfully.\n";
        exit(0);
    }

    $db->exec("ALTER TABLE fault_tickets
        MODIFY COLUMN status ENUM(
            'Open',
            'Assigned',
            'Waiting for Budget Approval',
            'Waiting for Spare Parts',
            'Parts Approved',
            'Insurance Claimed',
            'In Progress',
            'Resolved',
            'Closed'
        ) NOT NULL DEFAULT 'Open'");

    echo "- fault_tickets.status: enum updated to include Insurance Claimed\n";
    echo "\nMigration 059 completed successfully.\n";
} catch (Exception $e) {
    echo "\nMigration 059 failed: " . $e->getMessage() . "\n";
    exit(1);
}
