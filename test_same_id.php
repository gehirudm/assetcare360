<?php
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/Database.php';

$db = Database::getInstance()->getConnection();

echo "=== Testing Same ID for Breakdown and Ticket ===\n\n";

$db->beginTransaction();
try {
    // Create test breakdown
    $count = $db->query('SELECT COUNT(*) FROM vehicle_breakdown')->fetchColumn() + 1;
    $breakdownId = 'VBD-' . str_pad($count, 3, '0', STR_PAD_LEFT);
    
    $stmt = $db->prepare('INSERT INTO vehicle_breakdown (breakdown_id, vehicle_id, driver_id, breakdown_date, breakdown_type, severity, description, status) VALUES (?, 1, 8, ?, ?, ?, ?, "Pending")');
    $stmt->execute([$breakdownId, date('Y-m-d'), 'brakes', 'medium', 'Test - brake issue']);
    
    echo "✅ Created breakdown: $breakdownId\n";
    
    // Create ticket with same ID (as the fix does)
    $ticketId = $breakdownId;
    $stmt = $db->prepare('INSERT INTO fault_tickets (ticket_id, vehicle_id, breakdown_report_id, breakdown_type, reported_by, description, priority, location, status) VALUES (?, 1, ?, ?, 8, ?, "Medium", "Vehicle: lk-1234", "Open")');
    $stmt->execute([$ticketId, $breakdownId, 'brakes', 'Vehicle Breakdown: Test - brake issue']);
    
    echo "✅ Created ticket with same ID: $ticketId\n";
    
    // Verify
    $stmt = $db->prepare('SELECT ticket_id, breakdown_report_id FROM fault_tickets WHERE ticket_id = ?');
    $stmt->execute([$ticketId]);
    $result = $stmt->fetch();
    echo "✅ Verified: Ticket ID = {$result['ticket_id']}, Linked to = {$result['breakdown_report_id']}\n\n";
    
    echo "Now both the driver and supervisor will see the same ID: $breakdownId\n";
    
    // Cleanup
    $db->prepare('DELETE FROM fault_tickets WHERE ticket_id = ?')->execute([$ticketId]);
    $db->prepare('DELETE FROM vehicle_breakdown WHERE breakdown_id = ?')->execute([$breakdownId]);
    $db->commit();
    echo "\n✅ Test complete and cleaned up\n";
} catch (Exception $e) {
    $db->rollBack();
    echo "❌ Error: " . $e->getMessage() . "\n";
}
