<?php
/**
 * Migration: Add breakdown report link columns to fault_tickets table
 * This allows tracking which breakdown report a fault ticket was created from
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

echo "Starting migration: Add breakdown link columns to fault_tickets table\n";
echo "=====================================================================\n\n";

try {
    $pdo = Database::getInstance()->getConnection();

    // Check if breakdown_report_id column already exists
    $checkSql = "SHOW COLUMNS FROM fault_tickets LIKE 'breakdown_report_id'";
    $stmt = $pdo->query($checkSql);

    if ($stmt->rowCount() > 0) {
        echo "Column 'breakdown_report_id' already exists. Skipping.\n";
    } else {
        // Add breakdown_report_id column
        $sql = "ALTER TABLE fault_tickets ADD COLUMN breakdown_report_id VARCHAR(50) NULL AFTER machine_id";
        $pdo->exec($sql);
        echo "✓ Added 'breakdown_report_id' column.\n";

        // Add breakdown_type column (vehicle_breakdown or route_breakdown)
        $sql2 = "ALTER TABLE fault_tickets ADD COLUMN breakdown_type VARCHAR(50) NULL AFTER breakdown_report_id";
        $pdo->exec($sql2);
        echo "✓ Added 'breakdown_type' column.\n";

        // Add index for breakdown_report_id
        $sql3 = "ALTER TABLE fault_tickets ADD INDEX idx_breakdown_report_id (breakdown_report_id)";
        $pdo->exec($sql3);
        echo "✓ Added index on 'breakdown_report_id' column.\n";
    }

    echo "\nMigration completed successfully!\n";

} catch (PDOException $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
