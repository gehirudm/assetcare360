<?php
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/Database.php';

$db = Database::getInstance()->getConnection();

echo "=== Current Database State ===\n\n";

echo "Last 5 breakdowns:\n";
$stmt = $db->query('SELECT breakdown_id, severity, breakdown_type, created_at FROM vehicle_breakdown ORDER BY id DESC LIMIT 5');
while ($row = $stmt->fetch()) {
    echo "  {$row['breakdown_id']} - {$row['severity']} - {$row['breakdown_type']} - {$row['created_at']}\n";
}

echo "\nFault tickets linked to breakdowns:\n";
$stmt = $db->query('SELECT ticket_id, breakdown_report_id, priority, status, created_at FROM fault_tickets WHERE breakdown_report_id IS NOT NULL ORDER BY id DESC LIMIT 5');
while ($row = $stmt->fetch()) {
    echo "  {$row['ticket_id']} -> {$row['breakdown_report_id']} ({$row['priority']}, {$row['status']}) - {$row['created_at']}\n";
}

echo "\nBreakdowns WITHOUT fault tickets:\n";
$stmt = $db->query('
    SELECT vb.breakdown_id, vb.severity, vb.created_at
    FROM vehicle_breakdown vb
    LEFT JOIN fault_tickets ft ON ft.breakdown_report_id = vb.breakdown_id
    WHERE ft.id IS NULL
');
$missing = $stmt->fetchAll();
if (count($missing) > 0) {
    foreach ($missing as $row) {
        echo "  ❌ {$row['breakdown_id']} - {$row['severity']} - {$row['created_at']}\n";
    }
} else {
    echo "  ✅ All breakdowns have fault tickets!\n";
}
