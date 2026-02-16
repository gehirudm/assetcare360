<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

echo "=== Removing operating_hours Column from machine_weekly_checks Table ===\n\n";

try {
    $db = Database::getInstance()->getConnection();
    
    // Check if column exists
    $checkStmt = $db->query("SHOW COLUMNS FROM machine_weekly_checks LIKE 'operating_hours'");
    $columnExists = $checkStmt->fetch();
    
    if ($columnExists) {
        echo "Removing operating_hours column...\n";
        $db->exec("ALTER TABLE machine_weekly_checks DROP COLUMN operating_hours");
        echo "✓ Column removed successfully\n\n";
    } else {
        echo "✓ Column already removed\n\n";
    }
    
    // Verify the change
    echo "=== Updated Table Structure ===\n";
    $stmt = $db->query("DESCRIBE machine_weekly_checks");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo $row['Field'] . " - " . $row['Type'] . "\n";
    }
    
    echo "\n✓ Migration completed successfully!\n";
    
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
