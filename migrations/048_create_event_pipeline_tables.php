<?php
/**
 * Migration 048: Create event pipeline tables for notifications, audit, and reliability controls.
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

try {
    $db = Database::getInstance()->getConnection();

    echo "Starting migration 048: create event pipeline tables\n";
    echo str_repeat('=', 50) . "\n";

    if (!tableExists($db, 'event_audit_logs')) {
        $db->exec("CREATE TABLE event_audit_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            event_uuid VARCHAR(36) NOT NULL UNIQUE,
            event_name VARCHAR(120) NOT NULL,
            event_version VARCHAR(20) NOT NULL,
            occurred_at DATETIME NOT NULL,
            routing_key VARCHAR(160) NULL,
            exchange_name VARCHAR(120) NULL,
            payload_json LONGTEXT NOT NULL,
            processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_event_audit_name (event_name),
            INDEX idx_event_audit_occurred (occurred_at),
            INDEX idx_event_audit_processed (processed_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        echo "- event_audit_logs: created\n";
    } else {
        echo "- event_audit_logs: already exists, skipped\n";
    }

    if (!tableExists($db, 'notifications')) {
        $db->exec("CREATE TABLE notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            notification_id VARCHAR(36) NOT NULL UNIQUE,
            user_id INT NULL,
            target_role VARCHAR(50) NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            type ENUM('info','success','warning','error') NOT NULL DEFAULT 'info',
            source_event VARCHAR(120) NOT NULL,
            source_event_id VARCHAR(64) NULL,
            is_read TINYINT(1) NOT NULL DEFAULT 0,
            read_at DATETIME NULL,
            payload_json LONGTEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_notifications_user (user_id),
            INDEX idx_notifications_role (target_role),
            INDEX idx_notifications_read (is_read),
            INDEX idx_notifications_created (created_at),
            CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        echo "- notifications: created\n";
    } else {
        echo "- notifications: already exists, skipped\n";
    }

    if (!tableExists($db, 'processed_events')) {
        $db->exec("CREATE TABLE processed_events (
            id INT AUTO_INCREMENT PRIMARY KEY,
            consumer_name VARCHAR(120) NOT NULL,
            event_uuid VARCHAR(36) NOT NULL,
            processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_consumer_event (consumer_name, event_uuid),
            INDEX idx_processed_event_uuid (event_uuid)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        echo "- processed_events: created\n";
    } else {
        echo "- processed_events: already exists, skipped\n";
    }

    if (!tableExists($db, 'service_due_event_locks')) {
        $db->exec("CREATE TABLE service_due_event_locks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            lock_key VARCHAR(180) NOT NULL UNIQUE,
            asset_type ENUM('machine','vehicle') NOT NULL,
            asset_id INT NOT NULL,
            due_date DATE NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_service_due_asset (asset_type, asset_id),
            INDEX idx_service_due_date (due_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        echo "- service_due_event_locks: created\n";
    } else {
        echo "- service_due_event_locks: already exists, skipped\n";
    }

    echo "\nMigration 048 completed successfully.\n";
} catch (Exception $e) {
    echo "\nMigration 048 failed: " . $e->getMessage() . "\n";
    exit(1);
}
