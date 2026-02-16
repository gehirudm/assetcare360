<?php
/**
 * Migration: Create ticket_work_updates table
 * Stores work completion details submitted by technical officers
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $db = Database::getInstance()->getConnection();
    
    echo "Creating ticket_work_updates table...\n";
    
    $sql = "CREATE TABLE IF NOT EXISTS ticket_work_updates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticket_id INT NOT NULL COMMENT 'Foreign key to fault_tickets.id',
        technical_officer_id INT NOT NULL COMMENT 'Technical officer who performed the work',
        parts_used TEXT COMMENT 'List of parts used during repair',
        time_spent DECIMAL(5,2) NOT NULL COMMENT 'Hours spent on the work',
        machine_description TEXT NOT NULL COMMENT 'Description about the machine update and condition',
        work_status ENUM('In Progress', 'Completed') DEFAULT 'Completed' COMMENT 'Status of the work',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_ticket_id (ticket_id),
        INDEX idx_technical_officer_id (technical_officer_id),
        INDEX idx_created_at (created_at),
        
        FOREIGN KEY (ticket_id) REFERENCES fault_tickets(id) ON DELETE CASCADE,
        FOREIGN KEY (technical_officer_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
    COMMENT='Stores work completion details from technical officers'";
    
    $db->exec($sql);
    
    echo "✓ Successfully created ticket_work_updates table\n";
    
    // Display table structure
    echo "\nTable structure:\n";
    $stmt = $db->query("DESCRIBE ticket_work_updates");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($columns as $col) {
        echo sprintf("  %-25s %-20s %s\n", 
            $col['Field'], 
            $col['Type'], 
            $col['Null'] === 'NO' ? 'NOT NULL' : 'NULL'
        );
    }
    
    echo "\n✓ Migration completed successfully!\n";
    
} catch (PDOException $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
