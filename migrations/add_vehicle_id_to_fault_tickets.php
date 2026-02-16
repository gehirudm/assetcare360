<?php
/**
 * Migration: Add vehicle_id column to fault_tickets table
 * This allows fault tickets to be created for vehicles as well as machines
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

echo "Starting migration: Add vehicle_id column to fault_tickets table\n";
echo "=================================================================\n\n";

try {
    $pdo = Database::getInstance()->getConnection();
    
    // Check if column already exists
    $checkSql = "SHOW COLUMNS FROM fault_tickets LIKE 'vehicle_id'";
    $stmt = $pdo->query($checkSql);
    
    if ($stmt->rowCount() > 0) {
        echo "Column 'vehicle_id' already exists in fault_tickets table. Skipping.\n";
    } else {
        // Add vehicle_id column (nullable since tickets can be for machines or vehicles)
        $sql = "ALTER TABLE fault_tickets ADD COLUMN vehicle_id INT NULL AFTER machine_id";
        $pdo->exec($sql);
        echo "✓ Added 'vehicle_id' column to fault_tickets table.\n";
        
        // Make machine_id nullable since we now support vehicle-based tickets
        $sql2 = "ALTER TABLE fault_tickets MODIFY COLUMN machine_id INT NULL";
        $pdo->exec($sql2);
        echo "✓ Modified 'machine_id' column to be nullable.\n";
        
        // Add index for vehicle_id
        $sql3 = "ALTER TABLE fault_tickets ADD INDEX idx_vehicle_id (vehicle_id)";
        $pdo->exec($sql3);
        echo "✓ Added index on 'vehicle_id' column.\n";
    }
    
    echo "\nMigration completed successfully!\n";
    
} catch (PDOException $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
