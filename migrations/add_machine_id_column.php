<?php
/**
 * Migration: Add machine_id column to machines table
 * This migration adds the machine_id column and auto-generates IDs for existing machines
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

echo "Starting migration: Add machine_id column to machines table\n";
echo "=================================================================\n\n";

try {
    $db = Database::getInstance()->getConnection();
    
    // Step 1: Check if machine_id column already exists
    echo "Step 1: Checking if machine_id column exists...\n";
    $checkColumn = $db->query("SHOW COLUMNS FROM machines LIKE 'machine_id'");
    $columnExists = $checkColumn->fetch();
    
    if ($columnExists) {
        echo "✓ machine_id column already exists. Skipping column addition.\n\n";
    } else {
        echo "✓ machine_id column does not exist. Adding column...\n";
        
        // Add machine_id column (allow NULL initially for existing rows)
        $db->exec("ALTER TABLE machines ADD COLUMN machine_id VARCHAR(50) NULL AFTER id");
        echo "✓ machine_id column added successfully.\n\n";
    }
    
    // Step 2: Generate machine_id for existing machines that don't have one
    echo "Step 2: Generating machine_id for existing machines...\n";
    $stmt = $db->query("SELECT id FROM machines WHERE machine_id IS NULL ORDER BY id ASC");
    $machinesWithoutId = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($machinesWithoutId) === 0) {
        echo "✓ All machines already have machine_id. No updates needed.\n\n";
    } else {
        echo "Found " . count($machinesWithoutId) . " machines without machine_id.\n";
        
        // Get the highest existing machine_id number
        $maxIdStmt = $db->query("SELECT machine_id FROM machines WHERE machine_id IS NOT NULL ORDER BY machine_id DESC LIMIT 1");
        $maxIdRow = $maxIdStmt->fetch(PDO::FETCH_ASSOC);
        
        $startNumber = 1;
        if ($maxIdRow && $maxIdRow['machine_id']) {
            preg_match('/MCH-(\d+)/', $maxIdRow['machine_id'], $matches);
            if (!empty($matches[1])) {
                $startNumber = intval($matches[1]) + 1;
            }
        }
        
        // Generate and update machine_id for each machine
        $updateStmt = $db->prepare("UPDATE machines SET machine_id = ? WHERE id = ?");
        
        foreach ($machinesWithoutId as $index => $machine) {
            $machineId = 'MCH-' . str_pad($startNumber + $index, 3, '0', STR_PAD_LEFT);
            $updateStmt->execute([$machineId, $machine['id']]);
            echo "  Generated {$machineId} for machine ID {$machine['id']}\n";
        }
        
        echo "✓ Generated machine_id for " . count($machinesWithoutId) . " machines.\n\n";
    }
    
    // Step 3: Make machine_id column NOT NULL and add unique constraint
    echo "Step 3: Setting machine_id as NOT NULL and UNIQUE...\n";
    
    // Check if unique constraint already exists
    $checkConstraint = $db->query("SHOW INDEXES FROM machines WHERE Column_name = 'machine_id' AND Non_unique = 0");
    $constraintExists = $checkConstraint->fetch();
    
    if (!$constraintExists) {
        $db->exec("ALTER TABLE machines MODIFY COLUMN machine_id VARCHAR(50) NOT NULL");
        $db->exec("ALTER TABLE machines ADD UNIQUE KEY unique_machine_id (machine_id)");
        echo "✓ machine_id set as NOT NULL and UNIQUE.\n\n";
    } else {
        echo "✓ machine_id is already UNIQUE. Skipping.\n\n";
    }
    
    // Step 4: Make serial_number nullable (optional field now)
    echo "Step 4: Making serial_number nullable...\n";
    $checkSerialColumn = $db->query("SHOW COLUMNS FROM machines LIKE 'serial_number'");
    $serialColumn = $checkSerialColumn->fetch(PDO::FETCH_ASSOC);
    
    if ($serialColumn && $serialColumn['Null'] === 'NO') {
        // Remove unique constraint from serial_number if it exists
        $checkSerialUnique = $db->query("SHOW INDEXES FROM machines WHERE Column_name = 'serial_number' AND Key_name != 'PRIMARY'");
        $serialUnique = $checkSerialUnique->fetch();
        if ($serialUnique) {
            $indexName = $serialUnique['Key_name'];
            $db->exec("ALTER TABLE machines DROP INDEX `{$indexName}`");
            echo "✓ Removed constraint '{$indexName}' from serial_number.\n";
        }
        
        $db->exec("ALTER TABLE machines MODIFY COLUMN serial_number VARCHAR(100) NULL");
        echo "✓ serial_number is now nullable.\n\n";
    } else {
        echo "✓ serial_number is already nullable. Skipping.\n\n";
    }
    
    echo "=================================================================\n";
    echo "Migration completed successfully!\n\n";
    
    // Display summary
    echo "Summary:\n";
    $totalMachines = $db->query("SELECT COUNT(*) as count FROM machines")->fetch(PDO::FETCH_ASSOC);
    echo "- Total machines in database: {$totalMachines['count']}\n";
    
    $withMachineId = $db->query("SELECT COUNT(*) as count FROM machines WHERE machine_id IS NOT NULL")->fetch(PDO::FETCH_ASSOC);
    echo "- Machines with machine_id: {$withMachineId['count']}\n";
    
    echo "\n✓ All machines now have unique machine_id!\n";
    
} catch (Exception $e) {
    echo "\n✗ Migration failed with error:\n";
    echo $e->getMessage() . "\n";
    echo "\nStack trace:\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}
