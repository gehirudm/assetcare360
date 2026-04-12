<?php
/**
 * Migration 050: Fix budget_reports.fault_ticket_id foreign key to reference fault_tickets.
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

function getFaultTicketForeignKeys(PDO $db): array {
    $stmt = $db->prepare(
        'SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME
         FROM information_schema.KEY_COLUMN_USAGE
         WHERE table_schema = DATABASE()
           AND table_name = ?
           AND column_name = ?
           AND REFERENCED_TABLE_NAME IS NOT NULL'
    );
    $stmt->execute(['budget_reports', 'fault_ticket_id']);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

try {
    $db = Database::getInstance()->getConnection();

    echo "Starting migration 050: fix budget_reports foreign key\n";
    echo str_repeat('=', 50) . "\n";

    if (!tableExists($db, 'budget_reports')) {
        echo "- budget_reports: table not found, skipped\n";
        echo "\nMigration 050 completed successfully.\n";
        exit(0);
    }

    if (!columnExists($db, 'budget_reports', 'fault_ticket_id')) {
        echo "- budget_reports.fault_ticket_id: column not found, skipped\n";
        echo "\nMigration 050 completed successfully.\n";
        exit(0);
    }

    $foreignKeys = getFaultTicketForeignKeys($db);
    $hasCorrectFk = false;

    foreach ($foreignKeys as $fk) {
        $constraint = $fk['CONSTRAINT_NAME'];
        $targetTable = $fk['REFERENCED_TABLE_NAME'];

        if ($targetTable === 'fault_tickets') {
            $hasCorrectFk = true;
            continue;
        }

        $db->exec("ALTER TABLE budget_reports DROP FOREIGN KEY `{$constraint}`");
        echo "- Dropped incorrect foreign key {$constraint} -> {$targetTable}\n";
    }

    // Try to remap legacy machine_breakdown-based IDs to fault_tickets IDs.
    if (tableExists($db, 'machine_breakdown') && tableExists($db, 'fault_tickets')) {
        $mapped = $db->exec("UPDATE budget_reports br
            JOIN machine_breakdown mb ON br.fault_ticket_id = mb.id
            JOIN fault_tickets ft ON ft.breakdown_report_id = mb.breakdown_id
            SET br.fault_ticket_id = ft.id
            WHERE NOT EXISTS (
                SELECT 1 FROM fault_tickets ft2 WHERE ft2.id = br.fault_ticket_id
            )");
        if ($mapped > 0) {
            echo "- Remapped {$mapped} legacy budget report row(s) to fault_tickets IDs\n";
        }
    }

    // Remove rows that still cannot be linked to a fault ticket.
    $orphanCountStmt = $db->query("SELECT COUNT(*) FROM budget_reports br
        LEFT JOIN fault_tickets ft ON ft.id = br.fault_ticket_id
        WHERE ft.id IS NULL");
    $orphanCount = (int) $orphanCountStmt->fetchColumn();

    if ($orphanCount > 0) {
        $deleted = $db->exec("DELETE br FROM budget_reports br
            LEFT JOIN fault_tickets ft ON ft.id = br.fault_ticket_id
            WHERE ft.id IS NULL");
        echo "- Removed {$deleted} orphaned budget report row(s) that had no matching fault ticket\n";
    }

    if (!$hasCorrectFk) {
        $db->exec("ALTER TABLE budget_reports
            ADD CONSTRAINT fk_budget_fault_ticket
            FOREIGN KEY (fault_ticket_id) REFERENCES fault_tickets(id) ON DELETE CASCADE");
        echo "- Added foreign key: budget_reports.fault_ticket_id -> fault_tickets.id\n";
    } else {
        echo "- Correct foreign key already present, skipped\n";
    }

    echo "\nMigration 050 completed successfully.\n";
} catch (Exception $e) {
    echo "\nMigration 050 failed: " . $e->getMessage() . "\n";
    exit(1);
}
