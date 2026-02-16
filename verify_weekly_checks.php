<?php
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/Database.php';

$db = Database::getInstance()->getConnection();

echo "=== DRIVER WEEKLY CHECK REPORTS (vehicle_checks) ===\n";
$stmt = $db->query('SELECT check_id, vehicle_registration, overall_condition, status FROM vehicle_checks LIMIT 3');
$results = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($results as $row) {
    echo "  {$row['check_id']} - {$row['vehicle_registration']} - {$row['overall_condition']} - {$row['status']}\n";
}

echo "\n=== MACHINERY OPERATOR WEEKLY CHECK REPORTS (machine_weekly_checks) ===\n";
$stmt = $db->query('SELECT check_id, machine_id, overall_condition, status FROM machine_weekly_checks LIMIT 3');
$results = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($results as $row) {
    echo "  {$row['check_id']} - Machine: {$row['machine_id']} - {$row['overall_condition']} - {$row['status']}\n";
}

echo "\n✓ Both weekly check databases are properly configured!\n";
