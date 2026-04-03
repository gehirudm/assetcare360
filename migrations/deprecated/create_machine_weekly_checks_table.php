<?php

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $database = Database::getInstance();
    $db = $database->getConnection();
    
    echo "Creating machine_weekly_checks table...\n";
    
    $sql = "CREATE TABLE IF NOT EXISTS machine_weekly_checks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        check_id VARCHAR(20) UNIQUE NOT NULL,
        machine_id INT NOT NULL,
        operator_id INT,
        week_start_date DATE NOT NULL,
        week_end_date DATE NOT NULL,
        operating_hours DECIMAL(10,2),
        overall_condition ENUM('excellent', 'good', 'fair', 'poor') DEFAULT 'good',
        engine_status BOOLEAN DEFAULT TRUE,
        hydraulics BOOLEAN DEFAULT TRUE,
        electrical_system BOOLEAN DEFAULT TRUE,
        safety_equipment BOOLEAN DEFAULT TRUE,
        controls BOOLEAN DEFAULT TRUE,
        lubrication BOOLEAN DEFAULT TRUE,
        cooling_system BOOLEAN DEFAULT TRUE,
        filters BOOLEAN DEFAULT TRUE,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        notes TEXT,
        issues_found TEXT,
        rejection_reason TEXT,
        submitted_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        reviewed_date DATETIME,
        reviewed_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_check_id (check_id),
        INDEX idx_machine (machine_id),
        INDEX idx_operator (operator_id),
        INDEX idx_status (status),
        INDEX idx_week_end (week_end_date),
        FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
        FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
    
    $db->exec($sql);
    echo "✓ machine_weekly_checks table created successfully\n";
    
    // Check if table has data
    $stmt = $db->query("SELECT COUNT(*) as count FROM machine_weekly_checks");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($result['count'] == 0) {
        echo "\nSeeding sample machine weekly checks...\n";
        
        // Get existing machine IDs
        $machineStmt = $db->query("SELECT id FROM machines LIMIT 5");
        $machines = $machineStmt->fetchAll(PDO::FETCH_COLUMN);
        
        if (empty($machines)) {
            echo "No machines found. Skipping seeding.\n";
        } else {
            $sampleChecks = [
                [
                    'check_id' => 'MCHK-001',
                    'machine_id' => $machines[0] ?? 1,
                    'operator_id' => 1,
                    'operating_hours' => 42.5,
                    'week_start_date' => '2024-08-19',
                    'week_end_date' => '2024-08-25',
                    'overall_condition' => 'excellent',
                    'status' => 'approved',
                    'notes' => 'All systems operational. Machine is in excellent condition and ready for operation.',
                    'reviewed_date' => '2024-08-26 10:30:00',
                    'reviewed_by' => 2
                ],
                [
                    'check_id' => 'MCHK-002',
                    'machine_id' => $machines[0] ?? 1,
                    'operator_id' => 1,
                    'operating_hours' => 38.0,
                    'week_start_date' => '2024-08-12',
                    'week_end_date' => '2024-08-18',
                    'overall_condition' => 'good',
                    'status' => 'approved',
                    'notes' => 'Minor hydraulic fluid top-up required. Completed before next shift.',
                    'reviewed_date' => '2024-08-19 09:15:00',
                    'reviewed_by' => 2
                ],
                [
                    'check_id' => 'MCHK-003',
                    'machine_id' => isset($machines[1]) ? $machines[1] : ($machines[0] ?? 1),
                    'operator_id' => 1,
                    'operating_hours' => 45.0,
                    'week_start_date' => '2024-08-19',
                    'week_end_date' => '2024-08-25',
                    'overall_condition' => 'fair',
                    'status' => 'pending',
                    'notes' => 'Electrical system showing intermittent issues. Recommend maintenance inspection.',
                    'issues_found' => 'Electrical warning light flickering occasionally'
                ],
                [
                    'check_id' => 'MCHK-004',
                    'machine_id' => isset($machines[2]) ? $machines[2] : ($machines[0] ?? 1),
                    'operator_id' => 1,
                    'operating_hours' => 50.0,
                    'week_start_date' => '2024-08-05',
                    'week_end_date' => '2024-08-11',
                    'overall_condition' => 'poor',
                    'electrical_system' => false,
                    'status' => 'rejected',
                    'notes' => 'Major electrical system failure. Machine cannot be operated safely.',
                    'issues_found' => 'Complete electrical system failure - needs urgent repair',
                    'rejection_reason' => 'Machine must be taken out of service for repairs',
                    'reviewed_date' => '2024-08-12 08:00:00',
                    'reviewed_by' => 2
                ]
            ];
            
            $insertQuery = "INSERT INTO machine_weekly_checks 
                (check_id, machine_id, operator_id, operating_hours, week_start_date, week_end_date,
                 overall_condition, engine_status, hydraulics, electrical_system, safety_equipment, 
                 controls, lubrication, cooling_system, filters, status, notes, issues_found,
                 rejection_reason, reviewed_date, reviewed_by)
                VALUES 
                (:check_id, :machine_id, :operator_id, :operating_hours, :week_start_date, :week_end_date,
                 :overall_condition, :engine_status, :hydraulics, :electrical_system, :safety_equipment,
                 :controls, :lubrication, :cooling_system, :filters, :status, :notes, :issues_found,
                 :rejection_reason, :reviewed_date, :reviewed_by)";
            
            $stmt = $db->prepare($insertQuery);
            
            foreach ($sampleChecks as $check) {
                $stmt->execute([
                    ':check_id' => $check['check_id'],
                    ':machine_id' => $check['machine_id'],
                    ':operator_id' => $check['operator_id'] ?? null,
                    ':operating_hours' => $check['operating_hours'] ?? null,
                    ':week_start_date' => $check['week_start_date'],
                    ':week_end_date' => $check['week_end_date'],
                    ':overall_condition' => $check['overall_condition'] ?? 'good',
                    ':engine_status' => $check['engine_status'] ?? true,
                    ':hydraulics' => $check['hydraulics'] ?? true,
                    ':electrical_system' => $check['electrical_system'] ?? true,
                    ':safety_equipment' => $check['safety_equipment'] ?? true,
                    ':controls' => $check['controls'] ?? true,
                    ':lubrication' => $check['lubrication'] ?? true,
                    ':cooling_system' => $check['cooling_system'] ?? true,
                    ':filters' => $check['filters'] ?? true,
                    ':status' => $check['status'] ?? 'pending',
                    ':notes' => $check['notes'] ?? null,
                    ':issues_found' => $check['issues_found'] ?? null,
                    ':rejection_reason' => $check['rejection_reason'] ?? null,
                    ':reviewed_date' => $check['reviewed_date'] ?? null,
                    ':reviewed_by' => $check['reviewed_by'] ?? null
                ]);
                echo "  ✓ Inserted check: {$check['check_id']}\n";
            }
            
            echo "✓ Sample data seeded successfully\n";
        }
    } else {
        echo "Table already has data. Skipping seeding.\n";
    }
    
    echo "\n✓ Migration completed successfully!\n";
    
} catch (PDOException $e) {
    echo "✗ Database error: " . $e->getMessage() . "\n";
    exit(1);
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
