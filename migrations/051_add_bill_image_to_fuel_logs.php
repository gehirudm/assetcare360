<?php
/**
 * Migration 051: Add bill_image column to fuel_logs table
 * 
 * - Adds bill_image column to store uploaded fuel bill/receipt image path
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

    echo "Starting migration 051: Add bill_image to fuel_logs\n";
    echo str_repeat('=', 50) . "\n";

    // Add bill_image column
    if (!columnExists($db, 'fuel_logs', 'bill_image')) {
        $db->exec("ALTER TABLE fuel_logs ADD COLUMN bill_image VARCHAR(500) DEFAULT NULL AFTER station_name");
        echo "- bill_image: added\n";
    } else {
        echo "- bill_image: already exists\n";
    }

    echo str_repeat('=', 50) . "\n";
    echo "Migration 051 completed successfully.\n";

} catch (PDOException $e) {
    echo "Migration 051 failed: " . $e->getMessage() . "\n";
    exit(1);
}
