<?php
/**
 * Seed fault_tickets table with sample data
 */

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/Database.php';

try {
    echo "Starting to seed fault_tickets table...\n";
    
    $db = Database::getInstance()->getConnection();
    
    // Get existing machines
    $machines = $db->query("SELECT id, machine_name FROM machines LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($machines)) {
        echo "✗ No machines found. Please add machines first.\n";
        exit(1);
    }
    
    echo "Found " . count($machines) . " machines\n";
    
    // Get machinery operators and supervisors
    $users = $db->query("SELECT id, full_name, role FROM users WHERE role IN ('Machinery Operator', 'Supervisor') LIMIT 10")->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($users)) {
        echo "✗ No users found. Please add users first.\n";
        exit(1);
    }
    
    echo "Found " . count($users) . " users\n\n";
    
    // Sample fault tickets data
    $faultTickets = [
        [
            'machine_id' => $machines[0]['id'],
            'description' => 'Engine overheating - coolant level low. Machine stopped working during operation.',
            'priority' => 'High',
            'location' => 'Construction Site A - Zone 3',
            'status' => 'Open'
        ],
        [
            'machine_id' => $machines[min(1, count($machines)-1)]['id'],
            'description' => 'Hydraulic fluid leak detected near the main cylinder. Requires immediate attention.',
            'priority' => 'Critical',
            'location' => 'Warehouse B - Loading Bay 2',
            'status' => 'Open'
        ],
        [
            'machine_id' => $machines[min(2, count($machines)-1)]['id'],
            'description' => 'Unusual vibration and noise from the transmission system during operation.',
            'priority' => 'Medium',
            'location' => 'Factory Floor - Assembly Line 1',
            'status' => 'Assigned'
        ],
        [
            'machine_id' => $machines[0]['id'],
            'description' => 'Brake system malfunction - brakes not engaging properly. Safety concern.',
            'priority' => 'Critical',
            'location' => 'Mining Site - Section D',
            'status' => 'In Progress'
        ],
        [
            'machine_id' => $machines[min(1, count($machines)-1)]['id'],
            'description' => 'Electrical panel showing error codes. Display screen intermittently going blank.',
            'priority' => 'Medium',
            'location' => 'Production Facility - Unit 5',
            'status' => 'Open'
        ],
        [
            'machine_id' => $machines[min(2, count($machines)-1)]['id'],
            'description' => 'Air filter needs replacement - reduced engine performance observed.',
            'priority' => 'Low',
            'location' => 'Maintenance Yard',
            'status' => 'Resolved'
        ],
        [
            'machine_id' => $machines[min(3, count($machines)-1)]['id'],
            'description' => 'Tire pressure warning light on. Left rear tire appears to be losing air.',
            'priority' => 'Medium',
            'location' => 'Quarry - North Section',
            'status' => 'Open'
        ],
        [
            'machine_id' => $machines[min(4, count($machines)-1)]['id'],
            'description' => 'Fuel gauge not working properly. Shows empty even after refueling.',
            'priority' => 'Low',
            'location' => 'Construction Site C',
            'status' => 'Open'
        ]
    ];
    
    // Get current ticket count for generating IDs
    $count = $db->query("SELECT COUNT(*) FROM fault_tickets")->fetchColumn();
    
    $inserted = 0;
    foreach ($faultTickets as $ticket) {
        $count++;
        $ticketId = "MBD-" . str_pad($count, 3, '0', STR_PAD_LEFT);
        
        // Random user as reporter
        $reporter = $users[array_rand($users)];
        
        $sql = "INSERT INTO fault_tickets 
                (ticket_id, machine_id, reported_by, description, priority, location, status, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW() - INTERVAL ? DAY)";
        
        $stmt = $db->prepare($sql);
        $daysAgo = rand(0, 7); // Random date within last 7 days
        
        $stmt->execute([
            $ticketId,
            $ticket['machine_id'],
            $reporter['id'],
            $ticket['description'],
            $ticket['priority'],
            $ticket['location'],
            $ticket['status'],
            $daysAgo
        ]);
        
        $inserted++;
        echo "✓ Created ticket $ticketId - {$ticket['priority']} priority - {$ticket['status']}\n";
    }
    
    echo "\n✅ Successfully inserted $inserted fault tickets\n";
    
    // Show summary
    echo "\nDatabase Summary:\n";
    $summary = $db->query("
        SELECT status, COUNT(*) as count 
        FROM fault_tickets 
        GROUP BY status
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($summary as $row) {
        echo "  {$row['status']}: {$row['count']} tickets\n";
    }
    
    $total = $db->query("SELECT COUNT(*) FROM fault_tickets")->fetchColumn();
    echo "  Total: $total tickets\n";
    
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
