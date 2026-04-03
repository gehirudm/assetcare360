<?php
/**
 * Migration: Update vehicle_checks table to add missing fields
 * This ensures consistency with machine_weekly_checks table structure
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    
    echo "Updating vehicle_checks table...\n";
    
    // Check if overall_condition column exists
    $stmt = $conn->query("SHOW COLUMNS FROM vehicle_checks LIKE 'overall_condition'");
    $columnExists = $stmt->rowCount() > 0;
    
    if (!$columnExists) {
        echo "Adding missing columns to vehicle_checks table...\n";
        
        // Add overall_condition after week_end_date
        $conn->exec("ALTER TABLE vehicle_checks 
            ADD COLUMN overall_condition ENUM('excellent', 'good', 'fair', 'poor') DEFAULT 'good' 
            AFTER week_end_date");
        echo "  ✓ Added overall_condition column\n";
        
        // Add fuel_level after overall_condition
        $conn->exec("ALTER TABLE vehicle_checks 
            ADD COLUMN fuel_level TINYINT(1) DEFAULT 1 
            AFTER overall_condition");
        echo "  ✓ Added fuel_level column\n";
        
        // Add battery after wipers
        $conn->exec("ALTER TABLE vehicle_checks 
            ADD COLUMN battery TINYINT(1) DEFAULT 1 
            AFTER wipers");
        echo "  ✓ Added battery column\n";
        
        // Add steering after battery
        $conn->exec("ALTER TABLE vehicle_checks 
            ADD COLUMN steering TINYINT(1) DEFAULT 1 
            AFTER battery");
        echo "  ✓ Added steering column\n";
        
        // Add horn after steering
        $conn->exec("ALTER TABLE vehicle_checks 
            ADD COLUMN horn TINYINT(1) DEFAULT 1 
            AFTER steering");
        echo "  ✓ Added horn column\n";
        
        // Add mirrors after horn
        $conn->exec("ALTER TABLE vehicle_checks 
            ADD COLUMN mirrors TINYINT(1) DEFAULT 1 
            AFTER horn");
        echo "  ✓ Added mirrors column\n";
        
        // Add issues_found after notes
        $columnCheckIssues = $conn->query("SHOW COLUMNS FROM vehicle_checks LIKE 'issues_found'");
        if ($columnCheckIssues->rowCount() == 0) {
            $conn->exec("ALTER TABLE vehicle_checks 
                ADD COLUMN issues_found TEXT NULL 
                AFTER notes");
            echo "  ✓ Added issues_found column\n";
        }
        
        echo "✓ vehicle_checks table updated successfully\n";
        
        // Update existing records to set default values
        echo "\nUpdating existing records with default values...\n";
        $conn->exec("UPDATE vehicle_checks 
            SET overall_condition = 'good', 
                fuel_level = 1, 
                battery = 1, 
                steering = 1, 
                horn = 1, 
                mirrors = 1
            WHERE overall_condition IS NULL");
        echo "  ✓ Updated " . $conn->query("SELECT COUNT(*) FROM vehicle_checks")->fetchColumn() . " records\n";
        
    } else {
        echo "✓ vehicle_checks table already has the required columns\n";
    }
    
    echo "\n✓ Migration completed successfully!\n";
    
} catch (PDOException $e) {
    echo "✗ Database error: " . $e->getMessage() . "\n";
    exit(1);
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
