<?php
/**
 * Migration 061: Create service tickets and warranty management persistence
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
        'SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?'
    );
    $stmt->execute([$table, $column]);
    return (bool) $stmt->fetchColumn();
}

function indexExists(PDO $db, string $table, string $index): bool {
    $stmt = $db->prepare(
        'SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?'
    );
    $stmt->execute([$table, $index]);
    return (bool) $stmt->fetchColumn();
}

try {
    $db = Database::getInstance()->getConnection();

    echo "Starting migration 061: create service tickets and warranty management persistence\n";
    echo str_repeat('=', 72) . "\n";

    if (!tableExists($db, 'service_tickets')) {
        $db->exec("CREATE TABLE service_tickets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            service_ticket_id VARCHAR(30) NOT NULL UNIQUE,
            asset_type ENUM('vehicle', 'machine') NOT NULL,
            asset_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            service_type VARCHAR(120) NOT NULL,
            priority ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL DEFAULT 'Medium',
            status ENUM('Pending Assignment', 'Assigned', 'In Progress', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending Assignment',
            scheduled_date DATE NULL,
            reported_by INT NOT NULL,
            assigned_to INT NULL,
            assigned_by INT NULL,
            started_at DATETIME NULL,
            completed_at DATETIME NULL,
            completion_notes TEXT NULL,
            maintenance_notes TEXT NULL,
            estimated_cost DECIMAL(12,2) NULL,
            actual_cost DECIMAL(12,2) NULL,
            next_service_date DATE NULL,
            service_meter_reading INT NULL,
            warranty_action ENUM('none', 'covered', 'voided') NOT NULL DEFAULT 'none',
            warranty_void_reason TEXT NULL,
            warranty_voided_at DATETIME NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_service_tickets_asset (asset_type, asset_id),
            INDEX idx_service_tickets_status (status),
            INDEX idx_service_tickets_assigned_to (assigned_to),
            INDEX idx_service_tickets_scheduled_date (scheduled_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        echo "- service_tickets table created\n";
    } else {
        echo "- service_tickets table already exists, skipped\n";
    }

    if (tableExists($db, 'vehicles')) {
        if (!columnExists($db, 'vehicles', 'warranty_status')) {
            $db->exec("ALTER TABLE vehicles ADD COLUMN warranty_status ENUM('Active', 'Expired', 'Voided') NOT NULL DEFAULT 'Active' AFTER warranty_provider");
            echo "- vehicles.warranty_status added\n";
        } else {
            echo "- vehicles.warranty_status already exists, skipped\n";
        }

        if (!columnExists($db, 'vehicles', 'warranty_void_reason')) {
            $db->exec("ALTER TABLE vehicles ADD COLUMN warranty_void_reason TEXT NULL AFTER warranty_status");
            echo "- vehicles.warranty_void_reason added\n";
        } else {
            echo "- vehicles.warranty_void_reason already exists, skipped\n";
        }

        if (!columnExists($db, 'vehicles', 'warranty_voided_at')) {
            $db->exec("ALTER TABLE vehicles ADD COLUMN warranty_voided_at DATETIME NULL AFTER warranty_void_reason");
            echo "- vehicles.warranty_voided_at added\n";
        } else {
            echo "- vehicles.warranty_voided_at already exists, skipped\n";
        }

        if (!columnExists($db, 'vehicles', 'warranty_voided_by')) {
            $db->exec("ALTER TABLE vehicles ADD COLUMN warranty_voided_by INT NULL AFTER warranty_voided_at");
            echo "- vehicles.warranty_voided_by added\n";
        } else {
            echo "- vehicles.warranty_voided_by already exists, skipped\n";
        }

        if (!indexExists($db, 'vehicles', 'idx_warranty_status')) {
            $db->exec('ALTER TABLE vehicles ADD INDEX idx_warranty_status (warranty_status)');
            echo "- vehicles idx_warranty_status created\n";
        } else {
            echo "- vehicles idx_warranty_status already exists, skipped\n";
        }

        if (columnExists($db, 'vehicles', 'warranty_status')) {
            $db->exec("UPDATE vehicles
                SET warranty_status = CASE
                    WHEN warranty_voided_at IS NOT NULL
                        OR (warranty_void_reason IS NOT NULL AND TRIM(warranty_void_reason) <> '')
                    THEN 'Voided'
                    WHEN warranty_expiry IS NOT NULL AND warranty_expiry < CURDATE()
                    THEN 'Expired'
                    ELSE 'Active'
                END");
            echo "- vehicles warranty_status backfilled from existing warranty data\n";
        }
    } else {
        echo "- vehicles table not found, skipped vehicle warranty columns\n";
    }

    if (tableExists($db, 'machines')) {
        if (!columnExists($db, 'machines', 'warranty_status')) {
            $db->exec("ALTER TABLE machines ADD COLUMN warranty_status ENUM('Active', 'Expired', 'Voided') NOT NULL DEFAULT 'Active' AFTER warranty_provider");
            echo "- machines.warranty_status added\n";
        } else {
            echo "- machines.warranty_status already exists, skipped\n";
        }

        if (!columnExists($db, 'machines', 'warranty_void_reason')) {
            $db->exec("ALTER TABLE machines ADD COLUMN warranty_void_reason TEXT NULL AFTER warranty_status");
            echo "- machines.warranty_void_reason added\n";
        } else {
            echo "- machines.warranty_void_reason already exists, skipped\n";
        }

        if (!columnExists($db, 'machines', 'warranty_voided_at')) {
            $db->exec("ALTER TABLE machines ADD COLUMN warranty_voided_at DATETIME NULL AFTER warranty_void_reason");
            echo "- machines.warranty_voided_at added\n";
        } else {
            echo "- machines.warranty_voided_at already exists, skipped\n";
        }

        if (!columnExists($db, 'machines', 'warranty_voided_by')) {
            $db->exec("ALTER TABLE machines ADD COLUMN warranty_voided_by INT NULL AFTER warranty_voided_at");
            echo "- machines.warranty_voided_by added\n";
        } else {
            echo "- machines.warranty_voided_by already exists, skipped\n";
        }

        if (!indexExists($db, 'machines', 'idx_warranty_status')) {
            $db->exec('ALTER TABLE machines ADD INDEX idx_warranty_status (warranty_status)');
            echo "- machines idx_warranty_status created\n";
        } else {
            echo "- machines idx_warranty_status already exists, skipped\n";
        }

        if (columnExists($db, 'machines', 'warranty_status')) {
            $db->exec("UPDATE machines
                SET warranty_status = CASE
                    WHEN warranty_voided_at IS NOT NULL
                        OR (warranty_void_reason IS NOT NULL AND TRIM(warranty_void_reason) <> '')
                    THEN 'Voided'
                    WHEN warranty_expiry IS NOT NULL AND warranty_expiry < CURDATE()
                    THEN 'Expired'
                    ELSE 'Active'
                END");
            echo "- machines warranty_status backfilled from existing warranty data\n";
        }
    } else {
        echo "- machines table not found, skipped machine warranty columns\n";
    }

    echo "\nMigration 061 completed successfully.\n";
} catch (Exception $e) {
    echo "\nMigration 061 failed: " . $e->getMessage() . "\n";
    exit(1);
}
