<?php
/**
 * Verify spareparts table structure
 */

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/Database.php';

echo "Spareparts Table Structure\n";
echo "===========================\n\n";

try {
    $db = Database::getInstance()->getConnection();
    
    // Check if table exists
    $tableCheck = $db->query("SHOW TABLES LIKE 'spareparts'");
    
    if ($tableCheck->rowCount() === 0) {
        echo "✗ spareparts table does not exist!\n";
        exit(1);
    }
    
    echo "✓ spareparts table exists\n\n";
    
    // Show table structure
    $columns = $db->query("DESCRIBE spareparts");
    echo "Columns:\n";
    while ($col = $columns->fetch(PDO::FETCH_ASSOC)) {
        $null = $col['Null'] === 'YES' ? 'NULL' : 'NOT NULL';
        $default = $col['Default'] ? "DEFAULT {$col['Default']}" : '';
        echo sprintf("  %-25s %-20s %-10s %s\n", 
            $col['Field'], 
            $col['Type'], 
            $null,
            $default
        );
    }
    
    echo "\n===========================\n";
    echo "Table verification complete!\n";
    
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
