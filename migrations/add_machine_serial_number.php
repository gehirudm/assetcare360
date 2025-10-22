<?php

/**
 * Migration: Add serial_number column to machines table
 * Date: October 22, 2025
 * 
 * This migration adds a serial_number field to the machines table
 * and makes it the unique identifier instead of model_number
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $database = Database::getInstance();
    $db = $database->getConnection();
    
    echo "Starting migration: Add serial_number to machines table\n";
    echo "========================================================\n\n";
    
    // Step 1: Check if serial_number column already exists
    echo "Step 1: Checking if serial_number column exists...\n";
    $checkColumn = $db->query("SHOW COLUMNS FROM machines LIKE 'serial_number'");
    $columnExists = $checkColumn->rowCount() > 0;
    
    if ($columnExists) {
        echo "✓ serial_number column already exists. Skipping column creation.\n\n";
    } else {
        echo "Adding serial_number column...\n";
        
        // Step 2: Add serial_number column (nullable initially)
        $db->exec("ALTER TABLE machines ADD COLUMN serial_number VARCHAR(100) NULL AFTER id");
        echo "✓ serial_number column added successfully.\n\n";
        
        // Step 3: Generate unique serial numbers for existing machines
        echo "Step 2: Generating serial numbers for existing machines...\n";
        $stmt = $db->query("SELECT id, model_number FROM machines WHERE serial_number IS NULL");
        $machines = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $updateStmt = $db->prepare("UPDATE machines SET serial_number = ? WHERE id = ?");
        
        foreach ($machines as $machine) {
            // Generate a serial number based on model_number and id
            $serialNumber = 'SN-' . strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $machine['model_number']), 0, 6)) . '-' . str_pad($machine['id'], 4, '0', STR_PAD_LEFT);
            $updateStmt->execute([$serialNumber, $machine['id']]);
            echo "  Machine ID {$machine['id']}: {$serialNumber}\n";
        }
        echo "✓ Serial numbers generated for " . count($machines) . " machines.\n\n";
        
        // Step 4: Make serial_number NOT NULL and UNIQUE
        echo "Step 3: Making serial_number column NOT NULL and UNIQUE...\n";
        $db->exec("ALTER TABLE machines MODIFY COLUMN serial_number VARCHAR(100) NOT NULL");
        $db->exec("ALTER TABLE machines ADD UNIQUE INDEX idx_serial_number (serial_number)");
        echo "✓ serial_number column is now NOT NULL and UNIQUE.\n\n";
        
        // Step 5: Remove UNIQUE constraint from model_number
        echo "Step 4: Removing UNIQUE constraint from model_number...\n";
        
        // Check if model_number has a unique constraint
        $checkIndex = $db->query("SHOW INDEX FROM machines WHERE Column_name = 'model_number' AND Non_unique = 0");
        $hasUniqueIndex = $checkIndex->rowCount() > 0;
        
        if ($hasUniqueIndex) {
            // Get the index name
            $indexInfo = $checkIndex->fetch(PDO::FETCH_ASSOC);
            $indexName = $indexInfo['Key_name'];
            
            $db->exec("ALTER TABLE machines DROP INDEX {$indexName}");
            echo "✓ UNIQUE constraint removed from model_number.\n\n";
        } else {
            echo "✓ model_number doesn't have a UNIQUE constraint. Skipping.\n\n";
        }
    }
    
    // Step 6: Verify the schema
    echo "Step 5: Verifying final schema...\n";
    $stmt = $db->query("DESCRIBE machines");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Current machines table structure:\n";
    foreach ($columns as $column) {
        if (in_array($column['Field'], ['id', 'serial_number', 'model_number', 'machine_name'])) {
            echo "  - {$column['Field']}: {$column['Type']} " . 
                 ($column['Null'] == 'NO' ? 'NOT NULL' : 'NULL') . " " .
                 ($column['Key'] ? "KEY: {$column['Key']}" : '') . "\n";
        }
    }
    
    echo "\n========================================================\n";
    echo "Migration completed successfully!\n";
    echo "✓ serial_number is now the unique identifier for machines\n";
    echo "✓ model_number can now have duplicates (same model, different serials)\n";
    
} catch (PDOException $e) {
    echo "\n❌ Migration failed!\n";
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
