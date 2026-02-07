<?php
/**
 * Migration: Add vehicle_id column to vehicles table
 * This migration adds the vehicle_id column and auto-generates IDs for existing vehicles
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

echo "Starting migration: Add vehicle_id column to vehicles table\n";
echo "=================================================================\n\n";

try {
    $db = Database::getInstance()->getConnection();
    
    // Step 1: Check if vehicle_id column already exists
    echo "Step 1: Checking if vehicle_id column exists...\n";
    $checkColumn = $db->query("SHOW COLUMNS FROM vehicles LIKE 'vehicle_id'");
    $columnExists = $checkColumn->fetch();
    
    if ($columnExists) {
        echo "✓ vehicle_id column already exists. Skipping column addition.\n\n";
    } else {
        echo "✓ vehicle_id column does not exist. Adding column...\n";
        
        // Add vehicle_id column (allow NULL initially for existing rows)
        $db->exec("ALTER TABLE vehicles ADD COLUMN vehicle_id VARCHAR(50) NULL AFTER id");
        echo "✓ vehicle_id column added successfully.\n\n";
    }
    
    // Step 2: Generate vehicle_id for existing vehicles that don't have one
    echo "Step 2: Generating vehicle_id for existing vehicles...\n";
    $stmt = $db->query("SELECT id FROM vehicles WHERE vehicle_id IS NULL ORDER BY id ASC");
    $vehiclesWithoutId = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($vehiclesWithoutId) === 0) {
        echo "✓ All vehicles already have vehicle_id. No updates needed.\n\n";
    } else {
        echo "Found " . count($vehiclesWithoutId) . " vehicles without vehicle_id.\n";
        
        // Get the highest existing vehicle_id number
        $maxIdStmt = $db->query("SELECT vehicle_id FROM vehicles WHERE vehicle_id IS NOT NULL ORDER BY vehicle_id DESC LIMIT 1");
        $maxIdRow = $maxIdStmt->fetch(PDO::FETCH_ASSOC);
        
        $startNumber = 1;
        if ($maxIdRow && $maxIdRow['vehicle_id']) {
            preg_match('/VEH-(\d+)/', $maxIdRow['vehicle_id'], $matches);
            if (!empty($matches[1])) {
                $startNumber = intval($matches[1]) + 1;
            }
        }
        
        // Generate and update vehicle_id for each vehicle
        $updateStmt = $db->prepare("UPDATE vehicles SET vehicle_id = ? WHERE id = ?");
        
        foreach ($vehiclesWithoutId as $index => $vehicle) {
            $vehicleId = 'VEH-' . str_pad($startNumber + $index, 3, '0', STR_PAD_LEFT);
            $updateStmt->execute([$vehicleId, $vehicle['id']]);
            echo "  Generated {$vehicleId} for vehicle ID {$vehicle['id']}\n";
        }
        
        echo "✓ Generated vehicle_id for " . count($vehiclesWithoutId) . " vehicles.\n\n";
    }
    
    // Step 3: Make vehicle_id column NOT NULL and add unique constraint
    echo "Step 3: Setting vehicle_id as NOT NULL and UNIQUE...\n";
    
    // Check if unique constraint already exists
    $checkConstraint = $db->query("SHOW INDEXES FROM vehicles WHERE Column_name = 'vehicle_id' AND Non_unique = 0");
    $constraintExists = $checkConstraint->fetch();
    
    if (!$constraintExists) {
        $db->exec("ALTER TABLE vehicles MODIFY COLUMN vehicle_id VARCHAR(50) NOT NULL");
        $db->exec("ALTER TABLE vehicles ADD UNIQUE KEY unique_vehicle_id (vehicle_id)");
        echo "✓ vehicle_id set as NOT NULL and UNIQUE.\n\n";
    } else {
        echo "✓ vehicle_id is already UNIQUE. Skipping.\n\n";
    }
    
    // Step 4: Make chassis_number nullable (optional field now)
    echo "Step 4: Making chassis_number nullable...\n";
    $checkChassisColumn = $db->query("SHOW COLUMNS FROM vehicles LIKE 'chassis_number'");
    $chassisColumn = $checkChassisColumn->fetch(PDO::FETCH_ASSOC);
    
    if ($chassisColumn && $chassisColumn['Null'] === 'NO') {
        // Remove unique constraint from chassis_number if it exists
        $checkChassisUnique = $db->query("SHOW INDEXES FROM vehicles WHERE Column_name = 'chassis_number' AND Key_name != 'PRIMARY'");
        $chassisUnique = $checkChassisUnique->fetch();
        if ($chassisUnique) {
            $indexName = $chassisUnique['Key_name'];
            $db->exec("ALTER TABLE vehicles DROP INDEX `{$indexName}`");
            echo "✓ Removed constraint '{$indexName}' from chassis_number.\n";
        }
        
        $db->exec("ALTER TABLE vehicles MODIFY COLUMN chassis_number VARCHAR(100) NULL");
        echo "✓ chassis_number is now nullable.\n\n";
    } else {
        echo "✓ chassis_number is already nullable. Skipping.\n\n";
    }
    
    echo "=================================================================\n";
    echo "Migration completed successfully!\n\n";
    
    // Display summary
    echo "Summary:\n";
    $totalVehicles = $db->query("SELECT COUNT(*) as count FROM vehicles")->fetch(PDO::FETCH_ASSOC);
    echo "- Total vehicles in database: {$totalVehicles['count']}\n";
    
    $withVehicleId = $db->query("SELECT COUNT(*) as count FROM vehicles WHERE vehicle_id IS NOT NULL")->fetch(PDO::FETCH_ASSOC);
    echo "- Vehicles with vehicle_id: {$withVehicleId['count']}\n";
    
    echo "\n✓ All vehicles now have unique vehicle_id!\n";
    
} catch (Exception $e) {
    echo "\n✗ Migration failed with error:\n";
    echo $e->getMessage() . "\n";
    echo "\nStack trace:\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}
