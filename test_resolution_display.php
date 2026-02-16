<?php
require_once 'config/config.php';
require_once 'config/Database.php';

$conn = Database::getInstance()->getConnection();

// Simulate a resolved breakdown by adding resolution notes to MBD-001
$conn->exec("
    UPDATE fault_tickets 
    SET resolution_notes = 'Hydraulic pump replaced and system pressure tested. All functions verified working correctly.',
        resolved_at = NOW(),
        status = 'Resolved'
    WHERE breakdown_report_id = 'MBD-001'
");

// Also update the machine_breakdown status
$conn->exec("
    UPDATE machine_breakdown 
    SET status = 'Resolved'
    WHERE breakdown_id = 'MBD-001'
");

echo "MBD-001 has been marked as Resolved with test resolution notes.\n";
echo "Now check the machinery operator dashboard to see the finishing details.\n";
