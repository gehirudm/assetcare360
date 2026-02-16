<?php
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/Database.php';

$db = Database::getInstance()->getConnection();

echo "=== Testing Vehicle Checks ===\n";
$stmt = $db->query('SELECT COUNT(*) as total FROM vehicle_checks');
$count = $stmt->fetch(PDO::FETCH_ASSOC);
echo "Total vehicle checks: {$count['total']}\n";

echo "\n=== Testing Machine Weekly Checks ===\n";
$stmt = $db->query('SELECT COUNT(*) as total FROM machine_weekly_checks');
$count = $stmt->fetch(PDO::FETCH_ASSOC);
echo "Total machine checks: {$count['total']}\n";

echo "\n=== COMBINED WEEKLY CHECK REPORTS ===\n";
$stmt = $db->query("SELECT check_id, vehicle_registration as asset, status, submitted_date, 'driver' as type FROM vehicle_checks
    UNION ALL
    SELECT check_id, CONCAT('Machine ', machine_id) as asset, status, submitted_date, 'operator' as type FROM machine_weekly_checks
    ORDER BY submitted_date DESC");
$reports = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Total combined reports: " . count($reports) . "\n";
foreach ($reports as $report) {
    echo "  {$report['check_id']} - {$report['asset']} - {$report['status']} - {$report['type']} - {$report['submitted_date']}\n";
}
