<?php
/**
 * Migration: Create tec_fault_repair_ticket table
 * This table handles fault and repair tickets for technical officers
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

$conn = Database::getInstance()->getConnection();

// Create the tec_fault_repair_ticket table
$sql = "CREATE TABLE IF NOT EXISTS tec_fault_repair_ticket (
    id INT AUTO_INCREMENT PRIMARY KEY,
    repair_ticket_id VARCHAR(50) NOT NULL UNIQUE,
    fault_ticket_id INT NOT NULL,
    assignment_id INT NOT NULL,
    technician_id INT NOT NULL,
    
    original_ticket_id VARCHAR(50) NOT NULL,
    machine_id INT NULL,
    breakdown_report_id VARCHAR(50) NULL,
    breakdown_type VARCHAR(50) NULL,
    fault_description TEXT NOT NULL,
    fault_priority ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL DEFAULT 'Medium',
    fault_location VARCHAR(255) NULL,
    
    repair_status ENUM('Pending', 'Diagnosed', 'Parts Ordered', 'In Repair', 'Testing', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
    diagnosis TEXT NULL,
    repair_notes TEXT NULL,
    parts_used TEXT NULL,
    labor_hours DECIMAL(5,2) NULL,
    estimated_cost DECIMAL(10,2) NULL,
    actual_cost DECIMAL(10,2) NULL,
    
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diagnosis_at DATETIME NULL,
    repair_started_at DATETIME NULL,
    repair_completed_at DATETIME NULL,
    expected_completion_date DATE NULL,
    
    FOREIGN KEY (fault_ticket_id) REFERENCES fault_tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (assignment_id) REFERENCES fault_ticket_assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE SET NULL,
    
    INDEX idx_technician_id (technician_id),
    INDEX idx_fault_ticket_id (fault_ticket_id),
    INDEX idx_repair_status (repair_status),
    INDEX idx_repair_ticket_id (repair_ticket_id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

try {
    $conn->exec($sql);
    echo "✓ Created tec_fault_repair_ticket table successfully\n";
    
    // Show table structure
    $stmt = $conn->query('SHOW COLUMNS FROM tec_fault_repair_ticket');
    echo "\nTable columns:\n";
    while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "  - " . $row['Field'] . " (" . $row['Type'] . ")\n";
    }
    
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
