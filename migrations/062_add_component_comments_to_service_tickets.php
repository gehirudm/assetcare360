<?php
/**
 * Migration 062: Add component-level completion comments to service tickets
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

    echo "Starting migration 062: add component comments to service tickets\n";
    echo str_repeat('=', 66) . "\n";

    if (!tableExists($db, 'service_tickets')) {
        echo "- service_tickets table not found, skipped\n";
    } else {
        if (!columnExists($db, 'service_tickets', 'component_comments')) {
            $db->exec('ALTER TABLE service_tickets ADD COLUMN component_comments TEXT NULL AFTER completion_notes');
            echo "- service_tickets.component_comments added\n";
        } else {
            echo "- service_tickets.component_comments already exists, skipped\n";
        }
    }

    echo "\nMigration 062 completed successfully.\n";
} catch (Exception $e) {
    echo "\nMigration 062 failed: " . $e->getMessage() . "\n";
    exit(1);
}
