<?php
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/Database.php';

echo "=== Verifying machine_weekly_checks Table ===\n\n";

$db = Database::getInstance()->getConnection();

// Show structure
echo "Table Structure:\n";
$stmt = $db->query("DESCRIBE machine_weekly_checks");
$hasOperatingHours = false;
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "- " . $row["Field"] . " (" . $row["Type"] . ")\n";
    if ($row["Field"] === "operating_hours") {
        $hasOperatingHours = true;
    }
}

echo "\n";
if (!$hasOperatingHours) {
    echo "✓ operating_hours column successfully removed!\n";
} else {
    echo "✗ operating_hours column still exists!\n";
}

echo "\n=== Sample Records ===\n";
$stmt = $db->query("SELECT check_id, machine_id, overall_condition, status, submitted_date FROM machine_weekly_checks LIMIT 3");
$records = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($records as $record) {
    echo "Check: " . $record["check_id"] . " | Machine: " . $record["machine_id"] . " | Condition: " . $record["overall_condition"] . " | Status: " . $record["status"] . "\n";
}
