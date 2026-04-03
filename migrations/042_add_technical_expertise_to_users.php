<?php
/**
 * Migration: Add technical_expertise column to users table
 *
 * Purpose:
 * - Store expertise/specialization for Technical Officers
 * - Backfill existing Technical Officers with a safe default (General)
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

echo "Starting migration: Add technical_expertise to users table\n";
echo "========================================================\n\n";

try {
    $db = Database::getInstance()->getConnection();

    // Add column if it doesn't exist
    $columnCheck = $db->query("SHOW COLUMNS FROM users LIKE 'technical_expertise'");
    if ($columnCheck->rowCount() === 0) {
        $db->exec("ALTER TABLE users ADD COLUMN technical_expertise VARCHAR(100) NULL AFTER role");
        echo "✓ Added 'technical_expertise' column.\n";
    } else {
        echo "✓ Column 'technical_expertise' already exists.\n";
    }

    // Add index if it doesn't exist
    $indexCheck = $db->query("SHOW INDEX FROM users WHERE Key_name = 'idx_technical_expertise'");
    if ($indexCheck->rowCount() === 0) {
        $db->exec("ALTER TABLE users ADD INDEX idx_technical_expertise (technical_expertise)");
        echo "✓ Added index 'idx_technical_expertise'.\n";
    } else {
        echo "✓ Index 'idx_technical_expertise' already exists.\n";
    }

    // Backfill existing Technical Officers to ensure assignment UI has consistent data
    $backfillStmt = $db->prepare(
        "UPDATE users
         SET technical_expertise = 'General'
         WHERE role = 'Technical Officer'
           AND (technical_expertise IS NULL OR TRIM(technical_expertise) = '')"
    );
    $backfillStmt->execute();
    echo "✓ Backfilled {$backfillStmt->rowCount()} technical officer(s) with 'General' expertise.\n";

    // Keep non-technical roles clean
    $cleanupStmt = $db->prepare(
        "UPDATE users
         SET technical_expertise = NULL
         WHERE role <> 'Technical Officer'
           AND technical_expertise IS NOT NULL"
    );
    $cleanupStmt->execute();
    echo "✓ Cleared expertise for {$cleanupStmt->rowCount()} non-technical user(s).\n";

    echo "\nMigration completed successfully!\n";
} catch (\Exception $e) {
    echo "\n❌ Migration failed!\n";
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
