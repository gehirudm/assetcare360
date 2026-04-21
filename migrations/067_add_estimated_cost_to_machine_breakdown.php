<?php

/**
 * Migration: Add estimated_cost_range to machine_breakdown table
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();

    echo "Adding estimated_cost_range column to machine_breakdown...\n";

    // Check if the column already exists to make this idempotent
    $stmt = $conn->prepare("
        SELECT COUNT(*) FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'machine_breakdown'
          AND COLUMN_NAME = 'estimated_cost_range'
    ");
    $stmt->execute();
    $exists = (int) $stmt->fetchColumn();

    if ($exists > 0) {
        echo "✓ Column estimated_cost_range already exists. Skipping.\n";
    } else {
        $conn->exec("
            ALTER TABLE machine_breakdown
            ADD COLUMN estimated_cost_range ENUM(
                'Less than LKR 50,000',
                'LKR 50,000 - 100,000',
                'More than LKR 100,000'
            ) NULL DEFAULT NULL
            AFTER description
        ");
        echo "✓ Added estimated_cost_range column to machine_breakdown\n";
    }

    echo "\n✅ Migration completed successfully!\n";

} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
