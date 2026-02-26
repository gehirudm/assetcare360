<?php
require_once 'config/config.php';
require_once 'config/Database.php';

$db = Database::getInstance();
$conn = $db->getConnection();

try {
    $conn->beginTransaction();
    
    echo "=== Creating machine_breakdown table ===\n\n";
    
    // Create machine_breakdown table similar to vehicle_breakdown
    $sql = "CREATE TABLE IF NOT EXISTS machine_breakdown (
        id INT AUTO_INCREMENT PRIMARY KEY,
        breakdown_id VARCHAR(50) UNIQUE NOT NULL,
        machine_id INT NOT NULL,
        operator_id INT NOT NULL,
        breakdown_date DATETIME NOT NULL,
        breakdown_type VARCHAR(100),
        severity ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
        description TEXT,
        status ENUM('Pending', 'Assigned', 'Resolved') DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
        FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_breakdown_id (breakdown_id),
        INDEX idx_machine_id (machine_id),
        INDEX idx_operator_id (operator_id),
        INDEX idx_status (status),
        INDEX idx_breakdown_date (breakdown_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $conn->exec($sql);
    echo "✓ Created machine_breakdown table\n\n";
    
    // Get machinery operators
    $stmt = $conn->query('SELECT id, full_name FROM users WHERE role = "Machinary Operator" ORDER BY id LIMIT 3');
    $operators = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Found " . count($operators) . " machinery operators:\n";
    foreach ($operators as $op) {
        echo "  - {$op['full_name']} (ID: {$op['id']})\n";
    }
    echo "\n";
    
    // Get machines
    $stmt = $conn->query('SELECT id, model_number FROM machines ORDER BY id');
    $machines = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Found " . count($machines) . " machines\n\n";
    
    // Define machine breakdown reports
    $breakdowns = [
        [
            'breakdown_id' => 'MBD-001',
            'machine_id' => $machines[0]['id'] ?? 1,
            'operator_id' => $operators[0]['id'],
            'breakdown_date' => '2026-02-05 09:15:00',
            'breakdown_type' => 'Hydraulic System',
            'severity' => 'High',
            'description' => 'Hydraulic pump making unusual noise and losing pressure during operation.',
            'status' => 'Resolved'
        ],
        [
            'breakdown_id' => 'MBD-002',
            'machine_id' => $machines[1]['id'] ?? 2,
            'operator_id' => $operators[1]['id'],
            'breakdown_date' => '2026-02-06 11:30:00',
            'breakdown_type' => 'Engine',
            'severity' => 'Critical',
            'description' => 'Engine overheating. Temperature gauge showing high readings.',
            'status' => 'Assigned'
        ],
        [
            'breakdown_id' => 'MBD-003',
            'machine_id' => $machines[2]['id'] ?? 3,
            'operator_id' => $operators[2]['id'],
            'breakdown_date' => '2026-02-07 08:00:00',
            'breakdown_type' => 'Electrical',
            'severity' => 'Medium',
            'description' => 'Electrical fault in control panel. Switches not responding.',
            'status' => 'Assigned'
        ],
        [
            'breakdown_id' => 'MBD-004',
            'machine_id' => $machines[3]['id'] ?? 4,
            'operator_id' => $operators[0]['id'],
            'breakdown_date' => '2026-02-07 13:45:00',
            'breakdown_type' => 'Transmission',
            'severity' => 'High',
            'description' => 'Transmission slipping during heavy load operations.',
            'status' => 'Assigned'
        ],
        [
            'breakdown_id' => 'MBD-005',
            'machine_id' => $machines[4]['id'] ?? 5,
            'operator_id' => $operators[1]['id'],
            'breakdown_date' => '2026-02-08 07:20:00',
            'breakdown_type' => 'Brake System',
            'severity' => 'Critical',
            'description' => 'Brake system malfunction. Emergency brake not engaging fully.',
            'status' => 'Assigned'
        ],
        [
            'breakdown_id' => 'MBD-006',
            'machine_id' => $machines[5]['id'] ?? 6,
            'operator_id' => $operators[2]['id'],
            'breakdown_date' => '2026-02-08 14:10:00',
            'breakdown_type' => 'Fuel System',
            'severity' => 'Critical',
            'description' => 'Fuel leak detected near the injection pump.',
            'status' => 'Assigned'
        ],
        [
            'breakdown_id' => 'MBD-007',
            'machine_id' => $machines[0]['id'] ?? 1,
            'operator_id' => $operators[0]['id'],
            'breakdown_date' => '2026-02-09 10:00:00',
            'breakdown_type' => 'Steering',
            'severity' => 'High',
            'description' => 'Steering mechanism stiff and unresponsive.',
            'status' => 'Pending'
        ],
        [
            'breakdown_id' => 'MBD-008',
            'machine_id' => $machines[1]['id'] ?? 2,
            'operator_id' => $operators[1]['id'],
            'breakdown_date' => '2026-02-09 15:30:00',
            'breakdown_type' => 'Cooling System',
            'severity' => 'Medium',
            'description' => 'Radiator leaking coolant. Needs replacement.',
            'status' => 'Pending'
        ],
        [
            'breakdown_id' => 'MBD-009',
            'machine_id' => $machines[2]['id'] ?? 3,
            'operator_id' => $operators[2]['id'],
            'breakdown_date' => '2026-02-09 16:45:00',
            'breakdown_type' => 'Tracks/Wheels',
            'severity' => 'Low',
            'description' => 'Track alignment issue. Machine pulling to one side.',
            'status' => 'Pending'
        ],
        [
            'breakdown_id' => 'MBD-010',
            'machine_id' => $machines[3]['id'] ?? 4,
            'operator_id' => $operators[0]['id'],
            'breakdown_date' => '2026-02-10 08:15:00',
            'breakdown_type' => 'Pneumatic System',
            'severity' => 'Medium',
            'description' => 'Air compressor not building pressure properly.',
            'status' => 'Pending'
        ],
        [
            'breakdown_id' => 'MBD-011',
            'machine_id' => $machines[4]['id'] ?? 5,
            'operator_id' => $operators[1]['id'],
            'breakdown_date' => '2026-02-10 09:30:00',
            'breakdown_type' => 'Exhaust System',
            'severity' => 'Low',
            'description' => 'Excessive smoke from exhaust. Possible filter issue.',
            'status' => 'Pending'
        ],
        [
            'breakdown_id' => 'MBD-012',
            'machine_id' => $machines[5]['id'] ?? 6,
            'operator_id' => $operators[2]['id'],
            'breakdown_date' => '2026-02-10 11:00:00',
            'breakdown_type' => 'Attachment',
            'severity' => 'High',
            'description' => 'Bucket/attachment not lifting properly. Hydraulic cylinder issue.',
            'status' => 'Pending'
        ],
        [
            'breakdown_id' => 'MBD-013',
            'machine_id' => $machines[0]['id'] ?? 1,
            'operator_id' => $operators[0]['id'],
            'breakdown_date' => '2026-02-10 13:20:00',
            'breakdown_type' => 'Lubrication System',
            'severity' => 'Medium',
            'description' => 'Oil pressure warning light on. Possible pump failure.',
            'status' => 'Pending'
        ]
    ];
    
    echo "=== Inserting Breakdown Reports ===\n\n";
    
    $insertedCount = 0;
    foreach ($breakdowns as $breakdown) {
        $sql = "INSERT INTO machine_breakdown 
                (breakdown_id, machine_id, operator_id, breakdown_date, breakdown_type, severity, description, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            $breakdown['breakdown_id'],
            $breakdown['machine_id'],
            $breakdown['operator_id'],
            $breakdown['breakdown_date'],
            $breakdown['breakdown_type'],
            $breakdown['severity'],
            $breakdown['description'],
            $breakdown['status']
        ]);
        
        echo "✓ Created {$breakdown['breakdown_id']} - {$breakdown['breakdown_type']} ({$breakdown['severity']}) - {$breakdown['status']}\n";
        $insertedCount++;
    }
    
    $conn->commit();
    
    echo "\n=== Summary ===\n";
    echo "Successfully created {$insertedCount} machine breakdown reports\n";
    
    // Show final count per operator
    echo "\nBreakdown reports by operator:\n";
    foreach ($operators as $op) {
        $stmt = $conn->prepare('SELECT COUNT(*) as count FROM machine_breakdown WHERE operator_id = ?');
        $stmt->execute([$op['id']]);
        $count = $stmt->fetch()['count'];
        echo "  - {$op['full_name']}: {$count} reports\n";
    }
    
} catch (Exception $e) {
    $conn->rollBack();
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
