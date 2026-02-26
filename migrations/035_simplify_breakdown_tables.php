<?php

/**
 * Migration: Simplify breakdown tables to match form fields only
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    
    echo "Simplifying breakdown tables to match form fields...\n\n";
    
    // Drop existing tables (child first)
    $conn->exec("DROP TABLE IF EXISTS vehicle_breakdown_inroute");
    echo "✓ Dropped vehicle_breakdown_inroute\n";
    
    $conn->exec("DROP TABLE IF EXISTS vehicle_breakdown");
    echo "✓ Dropped vehicle_breakdown\n";
    
    // Create simplified vehicle_breakdown table (matches Report Vehicle Breakdown form)
    $sql_breakdown = "CREATE TABLE vehicle_breakdown (
        id INT AUTO_INCREMENT PRIMARY KEY,
        breakdown_id VARCHAR(50) UNIQUE NOT NULL,
        vehicle_id INT NOT NULL,
        driver_id INT NOT NULL,
        breakdown_date DATE NOT NULL,
        breakdown_type VARCHAR(100) NOT NULL,
        severity VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
        FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
    
    $conn->exec($sql_breakdown);
    echo "✓ Created simplified vehicle_breakdown table (8 core fields)\n";
    
    // Create simplified vehicle_breakdown_inroute table (matches Report Breakdown in Route form)
    $sql_inroute = "CREATE TABLE vehicle_breakdown_inroute (
        id INT AUTO_INCREMENT PRIMARY KEY,
        route_breakdown_id VARCHAR(50) UNIQUE NOT NULL,
        breakdown_id INT,
        vehicle_id INT NOT NULL,
        driver_id INT NOT NULL,
        breakdown_location TEXT NOT NULL,
        breakdown_datetime DATETIME NOT NULL,
        breakdown_type VARCHAR(100) NOT NULL,
        severity VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (breakdown_id) REFERENCES vehicle_breakdown(id) ON DELETE SET NULL,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
        FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
    
    $conn->exec($sql_inroute);
    echo "✓ Created simplified vehicle_breakdown_inroute table (9 core fields)\n";
    
    echo "\n✅ Tables simplified successfully!\n";
    echo "   vehicle_breakdown: 8 fields (matching Report Vehicle Breakdown form)\n";
    echo "   vehicle_breakdown_inroute: 9 fields (matching Report Breakdown in Route form)\n";
    
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
