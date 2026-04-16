<?php
/**
 * Migration 049: Add assigned driver to vehicles
 * 
 * - Adds assigned_driver_id column (FK to users.id) for persistent driver-vehicle assignment
 * - Adds driver_assigned_at timestamp for audit trail
 * - One driver per vehicle, one vehicle per driver (reassignable when needed)
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

    echo "Starting migration 049: Add assigned driver to vehicles\n";
    echo str_repeat('=', 50) . "\n";

    // 1. Add assigned_driver_id column
    if (!columnExists($db, 'vehicles', 'assigned_driver_id')) {
        $db->exec("ALTER TABLE vehicles ADD COLUMN assigned_driver_id INT NULL AFTER status");
        echo "- assigned_driver_id: added\n";
        
        // Add foreign key constraint
        $db->exec("ALTER TABLE vehicles ADD CONSTRAINT fk_vehicles_assigned_driver 
                   FOREIGN KEY (assigned_driver_id) REFERENCES users(id) ON DELETE SET NULL");
        echo "- foreign key constraint: added\n";
    } else {
        echo "- assigned_driver_id: already exists\n";
    }

    // 2. Add driver_assigned_at timestamp
    if (!columnExists($db, 'vehicles', 'driver_assigned_at')) {
        $db->exec("ALTER TABLE vehicles ADD COLUMN driver_assigned_at TIMESTAMP NULL AFTER assigned_driver_id");
        echo "- driver_assigned_at: added\n";
    } else {
        echo "- driver_assigned_at: already exists\n";
    }

    // 3. Add index for faster lookups by assigned driver
    $indexCheck = $db->query("SHOW INDEX FROM vehicles WHERE Key_name = 'idx_assigned_driver_id'");
    if ($indexCheck->rowCount() === 0) {
        $db->exec("ALTER TABLE vehicles ADD INDEX idx_assigned_driver_id (assigned_driver_id)");
        echo "- idx_assigned_driver_id index: added\n";
    } else {
        echo "- idx_assigned_driver_id index: already exists\n";
    }

    echo str_repeat('=', 50) . "\n";
    echo "Migration 049 completed successfully!\n";

} catch(PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
