<?php
/**
 * Migration 046: Create system_settings table and add approval_level to budget_reports
 * 
 * - Creates system_settings key-value table for admin-configurable settings
 * - Seeds default petty_cash_limit setting
 * - Adds approval_level column to budget_reports for routing approvals
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

function tableExists(PDO $db, string $table): bool {
    $stmt = $db->prepare(
        'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?'
    );
    $stmt->execute([$table]);
    return (bool) $stmt->fetchColumn();
}

function columnExists(PDO $db, string $table, string $column): bool {
    $stmt = $db->prepare(
        'SELECT COUNT(*) FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?'
    );
    $stmt->execute([$table, $column]);
    return (bool) $stmt->fetchColumn();
}

try {
    $db = Database::getInstance()->getConnection();

    echo "Starting migration 046: Create system_settings and budget approval_level\n";
    echo str_repeat('=', 50) . "\n";

    // 1. Create system_settings table
    if (!tableExists($db, 'system_settings')) {
        $db->exec("CREATE TABLE system_settings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            setting_key VARCHAR(100) NOT NULL UNIQUE,
            setting_value TEXT NOT NULL,
            data_type ENUM('string', 'integer', 'decimal', 'boolean', 'json') NOT NULL DEFAULT 'string',
            description TEXT NULL,
            updated_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_settings_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        echo "- system_settings: created\n";
    } else {
        echo "- system_settings: already exists, skipped\n";
    }

    // 2. Seed default petty_cash_limit
    $stmt = $db->prepare("SELECT COUNT(*) FROM system_settings WHERE setting_key = ?");
    $stmt->execute(['petty_cash_limit']);
    if (!(bool) $stmt->fetchColumn()) {
        $db->exec("INSERT INTO system_settings (setting_key, setting_value, data_type, description)
                    VALUES ('petty_cash_limit', '50000.00', 'decimal', 'Maximum budget amount that a Supervisor can approve. Amounts exceeding this require Maintenance Manager approval.')");
        echo "- petty_cash_limit: seeded with default value 50000.00\n";
    } else {
        echo "- petty_cash_limit: already exists, skipped\n";
    }

    // 3. Add approval_level column to budget_reports
    if (!columnExists($db, 'budget_reports', 'approval_level')) {
        $db->exec("ALTER TABLE budget_reports 
                    ADD COLUMN approval_level ENUM('supervisor', 'maintenance_manager') NOT NULL DEFAULT 'supervisor' 
                    AFTER total_amount");
        echo "- budget_reports.approval_level: added\n";

        // Back-fill existing pending budget reports based on a default petty cash limit
        // Existing reports with amount > 50000 get maintenance_manager level
        $db->exec("UPDATE budget_reports 
                    SET approval_level = 'maintenance_manager' 
                    WHERE total_amount > 50000.00");
        $count = $db->query("SELECT ROW_COUNT()")->fetchColumn();
        echo "- budget_reports: back-filled {$count} rows to maintenance_manager level\n";
    } else {
        echo "- budget_reports.approval_level: already exists, skipped\n";
    }

    echo "\nMigration 046 completed successfully.\n";
} catch (Exception $e) {
    echo "\nMigration 046 failed: " . $e->getMessage() . "\n";
    exit(1);
}
