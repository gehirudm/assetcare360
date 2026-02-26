<?php

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $database = Database::getInstance();
    $db = $database->getConnection();
    
    echo "Creating vehicle_checks table...\n";
    
    $sql = "CREATE TABLE IF NOT EXISTS vehicle_checks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        check_id VARCHAR(20) UNIQUE NOT NULL,
        vehicle_registration VARCHAR(20) NOT NULL,
        driver_id INT,
        odometer_reading INT NOT NULL,
        week_start_date DATE NOT NULL,
        week_end_date DATE NOT NULL,
        engine_oil BOOLEAN DEFAULT TRUE,
        brakes BOOLEAN DEFAULT TRUE,
        lights BOOLEAN DEFAULT TRUE,
        tires BOOLEAN DEFAULT TRUE,
        coolant BOOLEAN DEFAULT TRUE,
        wipers BOOLEAN DEFAULT TRUE,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        notes TEXT,
        rejection_reason TEXT,
        submitted_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        reviewed_date DATETIME,
        reviewed_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_check_id (check_id),
        INDEX idx_vehicle (vehicle_registration),
        INDEX idx_status (status),
        INDEX idx_week_end (week_end_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
    
    $db->exec($sql);
    echo "✓ vehicle_checks table created successfully\n";
    
    // Check if table has data
    $stmt = $db->query("SELECT COUNT(*) as count FROM vehicle_checks");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($result['count'] == 0) {
        echo "\nSeeding sample vehicle checks...\n";
        
        $sampleChecks = [
            [
                'check_id' => 'CHK-001',
                'vehicle_registration' => 'LKA-1234',
                'driver_id' => 1,
                'odometer_reading' => 45230,
                'week_start_date' => '2024-08-19',
                'week_end_date' => '2024-08-25',
                'status' => 'approved',
                'notes' => 'All systems operational - No issues detected. Vehicle is in excellent condition and ready for operation.',
                'reviewed_date' => '2024-08-26 10:30:00',
                'reviewed_by' => 2
            ],
            [
                'check_id' => 'CHK-002',
                'vehicle_registration' => 'LKA-1234',
                'driver_id' => 1,
                'odometer_reading' => 45010,
                'week_start_date' => '2024-08-12',
                'week_end_date' => '2024-08-18',
                'status' => 'approved',
                'notes' => 'Minor tire pressure issue noted - Corrected before departure. Front left tire was at 28 PSI, inflated to recommended 32 PSI.',
                'reviewed_date' => '2024-08-19 09:15:00',
                'reviewed_by' => 2
            ],
            [
                'check_id' => 'CHK-003',
                'vehicle_registration' => 'LKA-1234',
                'driver_id' => 1,
                'odometer_reading' => 44890,
                'week_start_date' => '2024-08-05',
                'week_end_date' => '2024-08-11',
                'status' => 'rejected',
                'notes' => 'Brake system check failed. Unusual noise detected during brake test. Pedal resistance felt abnormal.',
                'rejection_reason' => 'Brake system check failed - Vehicle not cleared for operation. Requires immediate inspection by maintenance team. Do not operate vehicle until repairs are completed and re-inspected.',
                'reviewed_date' => '2024-08-12 08:45:00',
                'reviewed_by' => 2
            ]
        ];
        
        $insertSql = "INSERT INTO vehicle_checks 
            (check_id, vehicle_registration, driver_id, odometer_reading, week_start_date, week_end_date, 
             engine_oil, brakes, lights, tires, coolant, wipers, status, notes, rejection_reason, reviewed_date, reviewed_by)
            VALUES 
            (:check_id, :vehicle_registration, :driver_id, :odometer_reading, :week_start_date, :week_end_date,
             1, 1, 1, 1, 1, 1, :status, :notes, :rejection_reason, :reviewed_date, :reviewed_by)";
        
        $stmt = $db->prepare($insertSql);
        
        foreach ($sampleChecks as $check) {
            $stmt->execute([
                ':check_id' => $check['check_id'],
                ':vehicle_registration' => $check['vehicle_registration'],
                ':driver_id' => $check['driver_id'],
                ':odometer_reading' => $check['odometer_reading'],
                ':week_start_date' => $check['week_start_date'],
                ':week_end_date' => $check['week_end_date'],
                ':status' => $check['status'],
                ':notes' => $check['notes'],
                ':rejection_reason' => $check['rejection_reason'] ?? null,
                ':reviewed_date' => $check['reviewed_date'],
                ':reviewed_by' => $check['reviewed_by']
            ]);
            echo "  ✓ Seeded check: {$check['check_id']}\n";
        }
        
        echo "\n✓ Sample data seeded successfully\n";
    } else {
        echo "\nTable already contains data. Skipping seed.\n";
    }
    
    echo "\n=== Migration completed successfully ===\n";
    
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
