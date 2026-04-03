<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

$db = Database::getInstance();
$conn = $db->getConnection();

try {
    $conn->beginTransaction();
    
    echo "=== Adding Machinery Operator Fault Tickets (MBD-009 to MBD-015) ===\n\n";
    
    // Get machinery operators
    $stmt = $conn->query('SELECT id, full_name FROM users WHERE role = "Machinary Operator" ORDER BY id LIMIT 3');
    $operators = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($operators) < 3) {
        throw new Exception('Not enough machinery operators found. Need at least 3.');
    }
    
    echo "Found " . count($operators) . " machinery operators\n";
    foreach ($operators as $op) {
        echo "  - {$op['full_name']} (ID: {$op['id']})\n";
    }
    echo "\n";
    
    // Get machines
    $stmt = $conn->query('SELECT id, model_number FROM machines ORDER BY id LIMIT 7');
    $machines = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Found " . count($machines) . " machines\n\n";
    
    // Get supervisors and technical officers for assignments
    $stmt = $conn->query('SELECT id, full_name FROM users WHERE role = "Supervisor" LIMIT 2');
    $supervisors = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $stmt = $conn->query('SELECT id, full_name FROM users WHERE role = "Technical Officer" LIMIT 3');
    $technicians = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Define fault tickets to create (MBD-009 onwards since MBD-001 to MBD-008 exist)
    $tickets = [
        [
            'ticket_id' => 'MBD-009',
            'machine_id' => $machines[0]['id'] ?? 1,
            'reported_by' => $operators[0]['id'],
            'description' => 'Hydraulic pump making unusual noise and losing pressure during operation. Needs immediate inspection.',
            'priority' => 'High',
            'status' => 'Resolved',
            'created_at' => '2026-02-05 09:15:00',
            'resolved_at' => '2026-02-07 14:30:00'
        ],
        [
            'ticket_id' => 'MBD-010',
            'machine_id' => $machines[1]['id'] ?? 2,
            'reported_by' => $operators[1]['id'],
            'description' => 'Engine overheating issue. Temperature gauge showing high readings even after coolant top-up.',
            'priority' => 'Critical',
            'status' => 'In Progress',
            'created_at' => '2026-02-06 11:30:00',
            'resolved_at' => null
        ],
        [
            'ticket_id' => 'MBD-011',
            'machine_id' => $machines[2]['id'] ?? 3,
            'reported_by' => $operators[2]['id'],
            'description' => 'Electrical fault in control panel. Some switches not responding properly.',
            'priority' => 'Medium',
            'status' => 'Assigned',
            'created_at' => '2026-02-07 08:00:00',
            'resolved_at' => null
        ],
        [
            'ticket_id' => 'MBD-012',
            'machine_id' => $machines[3]['id'] ?? 4,
            'reported_by' => $operators[0]['id'],
            'description' => 'Transmission slipping during heavy load operations. Gears not engaging smoothly.',
            'priority' => 'High',
            'status' => 'Waiting for Spare Parts',
            'created_at' => '2026-02-07 13:45:00',
            'resolved_at' => null
        ],
        [
            'ticket_id' => 'MBD-013',
            'machine_id' => $machines[4]['id'] ?? 5,
            'reported_by' => $operators[1]['id'],
            'description' => 'Brake system malfunction. Emergency brake not engaging fully. Safety concern.',
            'priority' => 'Critical',
            'status' => 'Assigned',
            'created_at' => '2026-02-08 07:20:00',
            'resolved_at' => null
        ],
        [
            'ticket_id' => 'MBD-014',
            'machine_id' => $machines[5]['id'] ?? 6,
            'reported_by' => $operators[2]['id'],
            'description' => 'Fuel leak detected near the injection pump. Requires immediate attention.',
            'priority' => 'Critical',
            'status' => 'In Progress',
            'created_at' => '2026-02-08 14:10:00',
            'resolved_at' => null
        ],
        [
            'ticket_id' => 'MBD-015',
            'machine_id' => $machines[0]['id'] ?? 1,
            'reported_by' => $operators[0]['id'],
            'description' => 'Steering mechanism stiff and unresponsive. Difficult to maneuver the machine.',
            'priority' => 'High',
            'status' => 'Open',
            'created_at' => '2026-02-09 10:00:00',
            'resolved_at' => null
        ]
    ];
    
    // Insert fault tickets
    $insertedCount = 0;
    foreach ($tickets as $ticket) {
        // Check if ticket already exists
        $checkStmt = $conn->prepare('SELECT id FROM fault_tickets WHERE ticket_id = ?');
        $checkStmt->execute([$ticket['ticket_id']]);
        if ($checkStmt->fetch()) {
            echo "⚠ Ticket {$ticket['ticket_id']} already exists, skipping...\n";
            continue;
        }
        
        $sql = "INSERT INTO fault_tickets 
                (ticket_id, machine_id, reported_by, description, priority, location, status, created_at, resolved_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 'Workshop Area', ?, ?, ?, NOW())";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            $ticket['ticket_id'],
            $ticket['machine_id'],
            $ticket['reported_by'],
            $ticket['description'],
            $ticket['priority'],
            $ticket['status'],
            $ticket['created_at'],
            $ticket['resolved_at']
        ]);
        
        $ticketId = $conn->lastInsertId();
        echo "✓ Created ticket {$ticket['ticket_id']} (DB ID: {$ticketId})\n";
        
        // Add assignments for non-Open tickets
        if ($ticket['status'] !== 'Open' && count($technicians) > 0) {
            $techIndex = $insertedCount % count($technicians);
            $supervisorIndex = $insertedCount % count($supervisors);
            
            $assignSql = "INSERT INTO fault_ticket_assignments 
                          (fault_ticket_id, assigned_to, assigned_by, assigned_at, expected_completion_date, notes, status)
                          VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 3 DAY), 'Assigned for inspection and repair', 'Active')";
            
            $assignStmt = $conn->prepare($assignSql);
            $assignStmt->execute([
                $ticketId,
                $technicians[$techIndex]['id'],
                $supervisors[$supervisorIndex]['id'],
                $ticket['created_at']
            ]);
            
            echo "  → Assigned to {$technicians[$techIndex]['full_name']}\n";
        }
        
        $insertedCount++;
    }
    
    $conn->commit();
    
    echo "\n=== Summary ===\n";
    echo "Successfully created {$insertedCount} fault tickets\n";
    
    // Show final count
    $stmt = $conn->query('
        SELECT COUNT(*) as count 
        FROM fault_tickets ft
        JOIN users u ON ft.reported_by = u.id
        WHERE u.role = "Machinary Operator"
    ');
    $result = $stmt->fetch();
    echo "Total machinery operator tickets in database: {$result['count']}\n";
    
} catch (Exception $e) {
    $conn->rollBack();
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
