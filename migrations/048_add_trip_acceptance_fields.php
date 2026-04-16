<?php
/**
 * Migration 048: Add trip acceptance workflow fields
 * 
 * - Adds assistant_driver_name column for co-driver info
 * - Adds rejection_reason column for driver rejections
 * - Expands status ENUM to include 'Accepted' and 'Rejected'
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

function columnExists(PDO $db, string $table, string $column): bool {
    $stmt = $db->prepare(
        'SELECT COUNT(*) FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?'
    );
    $stmt->execute([$table, $column]);
    return (bool) $stmt->fetchColumn();
}

try {
    $db = Database::getInstance()->getConnection();

    echo "Starting migration 048: Add trip acceptance workflow fields\n";
    echo str_repeat('=', 50) . "\n";

    // 1. Add assistant_driver_name column
    if (!columnExists($db, 'trips', 'assistant_driver_name')) {
        $db->exec("ALTER TABLE trips ADD COLUMN assistant_driver_name VARCHAR(100) DEFAULT NULL AFTER driver_id");
        echo "- assistant_driver_name: added\n";
    } else {
        echo "- assistant_driver_name: already exists\n";
    }

    // 2. Add rejection_reason column
    if (!columnExists($db, 'trips', 'rejection_reason')) {
        $db->exec("ALTER TABLE trips ADD COLUMN rejection_reason TEXT DEFAULT NULL AFTER status");
        echo "- rejection_reason: added\n";
    } else {
        echo "- rejection_reason: already exists\n";
    }

    // 3. Expand status ENUM to include 'Accepted' and 'Rejected'
    // Note: MySQL allows MODIFY COLUMN to change ENUM values; existing data remains valid
    $db->exec("ALTER TABLE trips MODIFY COLUMN status ENUM('Pending', 'Accepted', 'Rejected', 'In Progress', 'Completed', 'Cancelled') DEFAULT 'Pending'");
    echo "- status ENUM: expanded to include 'Accepted' and 'Rejected'\n";

    // 4. Make starting_odometer nullable (will be set when trip starts, not when assigned)
    $db->exec("ALTER TABLE trips MODIFY COLUMN starting_odometer INT DEFAULT NULL");
    echo "- starting_odometer: made nullable\n";

    echo str_repeat('=', 50) . "\n";
    echo "Migration 048 completed successfully!\n";

} catch(PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
