<?php
/**
 * Test script to verify ticket_work_updates table and API endpoint
 */

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/Database.php';

echo "=== Testing Ticket Work Updates ===\n\n";

// Test 1: Check if table exists
echo "1. Checking if ticket_work_updates table exists...\n";
$db = Database::getInstance()->getConnection();
$stmt = $db->query("SHOW TABLES LIKE 'ticket_work_updates'");
$tableExists = $stmt->rowCount() > 0;
echo $tableExists ? "✓ Table exists\n\n" : "✗ Table does NOT exist\n\n";

if (!$tableExists) {
    die("Please run the migration first: php migrations/create_ticket_work_updates_table.php\n");
}

// Test 2: Check table structure
echo "2. Table structure:\n";
$stmt = $db->query("DESCRIBE ticket_work_updates");
$columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($columns as $column) {
    echo "   - {$column['Field']}: {$column['Type']}\n";
}
echo "\n";

// Test 3: Check if there are any fault tickets to test with
echo "3. Checking for available fault tickets...\n";
$stmt = $db->query("SELECT id, ticket_id, status FROM fault_tickets LIMIT 5");
$tickets = $stmt->fetchAll(PDO::FETCH_ASSOC);
if (empty($tickets)) {
    echo "   ✗ No fault tickets found in database\n\n";
} else {
    echo "   ✓ Found " . count($tickets) . " tickets:\n";
    foreach ($tickets as $ticket) {
        echo "      ID: {$ticket['id']}, Ticket: {$ticket['ticket_id']}, Status: {$ticket['status']}\n";
    }
    echo "\n";
}

// Test 4: Check if there are any technical officers
echo "4. Checking for technical officers...\n";
$stmt = $db->query("SELECT id, full_name, employee_id FROM users WHERE role = 'Technical Officer' AND is_active = 1");
$officers = $stmt->fetchAll(PDO::FETCH_ASSOC);
if (empty($officers)) {
    echo "   ✗ No active technical officers found\n\n";
} else {
    echo "   ✓ Found " . count($officers) . " technical officer(s):\n";
    foreach ($officers as $officer) {
        echo "      ID: {$officer['id']}, Name: {$officer['full_name']}, Employee ID: {$officer['employee_id']}\n";
    }
    echo "\n";
}

// Test 5: Try to insert a test record
if (!empty($tickets) && !empty($officers)) {
    echo "5. Testing INSERT into ticket_work_updates...\n";
    try {
        $testTicketId = $tickets[0]['id'];
        $testOfficerId = $officers[0]['id'];
        
        $sql = "INSERT INTO ticket_work_updates 
                (ticket_id, technical_officer_id, parts_used, time_spent, machine_description, work_status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())";
        
        $stmt = $db->prepare($sql);
        $result = $stmt->execute([
            $testTicketId,
            $testOfficerId,
            'Test Part 1, Test Part 2',
            2.5,
            'Test machine description for verification',
            'Completed'
        ]);
        
        if ($result) {
            $insertId = $db->lastInsertId();
            echo "   ✓ Successfully inserted test record with ID: $insertId\n";
            
            // Clean up test record
            $db->query("DELETE FROM ticket_work_updates WHERE id = $insertId");
            echo "   ✓ Test record cleaned up\n\n";
        } else {
            echo "   ✗ Failed to insert test record\n";
            print_r($stmt->errorInfo());
            echo "\n";
        }
    } catch (Exception $e) {
        echo "   ✗ Error: " . $e->getMessage() . "\n\n";
    }
} else {
    echo "5. Skipping INSERT test (no tickets or officers available)\n\n";
}

// Test 6: Check existing work updates
echo "6. Checking for existing work updates...\n";
$stmt = $db->query("SELECT COUNT(*) as count FROM ticket_work_updates");
$count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
echo "   Found $count work update(s) in the database\n";

if ($count > 0) {
    $stmt = $db->query("SELECT twu.*, u.full_name, ft.ticket_id 
                        FROM ticket_work_updates twu
                        LEFT JOIN users u ON twu.technical_officer_id = u.id
                        LEFT JOIN fault_tickets ft ON twu.ticket_id = ft.id
                        ORDER BY twu.created_at DESC
                        LIMIT 3");
    $updates = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "\n   Recent updates:\n";
    foreach ($updates as $update) {
        echo "      Ticket: {$update['ticket_id']}, Officer: {$update['full_name']}, Time: {$update['time_spent']}h, Status: {$update['work_status']}\n";
    }
}

echo "\n=== Test Complete ===\n";
