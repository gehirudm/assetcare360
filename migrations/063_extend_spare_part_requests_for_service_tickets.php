<?php
/**
 * Migration 063: Extend spare part requests for service ticket linkage
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

function getForeignKeyConstraintNames(PDO $db, string $table, string $column): array {
    $stmt = $db->prepare(
        'SELECT DISTINCT constraint_name
         FROM information_schema.key_column_usage
         WHERE table_schema = DATABASE()
           AND table_name = ?
           AND column_name = ?
           AND referenced_table_name IS NOT NULL'
    );
    $stmt->execute([$table, $column]);

    return array_values(array_filter(array_map(static function ($row) {
        return $row['constraint_name'] ?? null;
    }, $stmt->fetchAll(PDO::FETCH_ASSOC))));
}

try {
    $db = Database::getInstance()->getConnection();

    echo "Starting migration 063: extend spare part requests for service ticket linkage\n";
    echo str_repeat('=', 78) . "\n";

    if (!tableExists($db, 'spare_part_requests')) {
        echo "- spare_part_requests table not found, skipped\n";
        echo "\nMigration 063 completed successfully.\n";
        return;
    }

    if (columnExists($db, 'spare_part_requests', 'fault_ticket_id')) {
        $faultConstraints = getForeignKeyConstraintNames($db, 'spare_part_requests', 'fault_ticket_id');
        foreach ($faultConstraints as $constraintName) {
            $db->exec("ALTER TABLE spare_part_requests DROP FOREIGN KEY `{$constraintName}`");
            echo "- dropped foreign key {$constraintName} on spare_part_requests.fault_ticket_id\n";
        }

        $db->exec('ALTER TABLE spare_part_requests MODIFY COLUMN fault_ticket_id INT NULL');
        echo "- spare_part_requests.fault_ticket_id changed to NULLABLE\n";
    } else {
        echo "- spare_part_requests.fault_ticket_id not found, skipped nullable update\n";
    }

    if (!columnExists($db, 'spare_part_requests', 'service_ticket_id')) {
        $db->exec('ALTER TABLE spare_part_requests ADD COLUMN service_ticket_id INT NULL AFTER fault_ticket_id');
        echo "- added spare_part_requests.service_ticket_id\n";
    } else {
        echo "- spare_part_requests.service_ticket_id already exists, skipped\n";
    }

    if (!indexExists($db, 'spare_part_requests', 'idx_spr_fault_ticket')) {
        $db->exec('ALTER TABLE spare_part_requests ADD INDEX idx_spr_fault_ticket (fault_ticket_id)');
        echo "- created index idx_spr_fault_ticket\n";
    } else {
        echo "- index idx_spr_fault_ticket already exists, skipped\n";
    }

    if (!indexExists($db, 'spare_part_requests', 'idx_spr_service_ticket')) {
        $db->exec('ALTER TABLE spare_part_requests ADD INDEX idx_spr_service_ticket (service_ticket_id)');
        echo "- created index idx_spr_service_ticket\n";
    } else {
        echo "- index idx_spr_service_ticket already exists, skipped\n";
    }

    if (tableExists($db, 'fault_tickets') && columnExists($db, 'spare_part_requests', 'fault_ticket_id')) {
        $faultConstraints = getForeignKeyConstraintNames($db, 'spare_part_requests', 'fault_ticket_id');
        if (empty($faultConstraints)) {
            $db->exec('ALTER TABLE spare_part_requests ADD CONSTRAINT fk_spr_fault_ticket FOREIGN KEY (fault_ticket_id) REFERENCES fault_tickets(id) ON DELETE CASCADE');
            echo "- added foreign key fk_spr_fault_ticket\n";
        } else {
            echo "- foreign key on spare_part_requests.fault_ticket_id already exists, skipped\n";
        }
    } else {
        echo "- fault_tickets table unavailable; skipped fault-ticket foreign key ensure\n";
    }

    if (tableExists($db, 'service_tickets') && columnExists($db, 'spare_part_requests', 'service_ticket_id')) {
        $serviceConstraints = getForeignKeyConstraintNames($db, 'spare_part_requests', 'service_ticket_id');
        if (empty($serviceConstraints)) {
            $db->exec('ALTER TABLE spare_part_requests ADD CONSTRAINT fk_spr_service_ticket FOREIGN KEY (service_ticket_id) REFERENCES service_tickets(id) ON DELETE CASCADE');
            echo "- added foreign key fk_spr_service_ticket\n";
        } else {
            echo "- foreign key on spare_part_requests.service_ticket_id already exists, skipped\n";
        }
    } else {
        echo "- service_tickets table unavailable; skipped service-ticket foreign key ensure\n";
    }

    echo "\nMigration 063 completed successfully.\n";
} catch (Exception $e) {
    echo "\nMigration 063 failed: " . $e->getMessage() . "\n";
    exit(1);
}
