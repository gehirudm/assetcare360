<?php
/**
 * Migration 066: Drop budget column from fault_ticket_assignments
 *               and add salary column to users table
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

function columnExists066(PDO $db, string $table, string $column): bool {
    $stmt = $db->prepare(
        'SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?'
    );
    $stmt->execute([$table, $column]);
    return (bool) $stmt->fetchColumn();
}

try {
    $db = Database::getInstance()->getConnection();

    // Remove budget from fault_ticket_assignments
    if (columnExists066($db, 'fault_ticket_assignments', 'budget')) {
        $db->exec("ALTER TABLE `fault_ticket_assignments` DROP COLUMN `budget`");
        echo "Dropped 'budget' column from fault_ticket_assignments.\n";
    } else {
        echo "'budget' column not found in fault_ticket_assignments — nothing to drop.\n";
    }

    // Add salary to users
    if (!columnExists066($db, 'users', 'salary')) {
        $db->exec("ALTER TABLE `users` ADD COLUMN `salary` DECIMAL(12,2) NULL AFTER `phone`");
        echo "Added 'salary' column to users.\n";
    } else {
        echo "'salary' column already exists in users.\n";
    }

    echo "Migration 066 completed successfully.\n";
} catch (Exception $e) {
    echo "Migration 066 failed: " . $e->getMessage() . "\n";
    exit(1);
}
