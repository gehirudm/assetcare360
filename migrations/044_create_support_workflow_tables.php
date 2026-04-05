<?php
/**
 * Migration 044: Create support/workflow tables missing from migrations folder.
 *
 * This migration adds create-table coverage for workflow tables used by current
 * models/services but not currently created in the active migrations list.
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

function tableExists(PDO $db, string $table): bool {
    $stmt = $db->prepare('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?');
    $stmt->execute([$table]);
    return (bool) $stmt->fetchColumn();
}

function createTableIfMissing(PDO $db, string $table, string $sql): void {
    if (tableExists($db, $table)) {
        echo "- {$table}: already exists, skipped\n";
        return;
    }

    $db->exec($sql);
    echo "- {$table}: created\n";
}

try {
    $db = Database::getInstance()->getConnection();

    echo "Starting migration 044: create support/workflow tables\n";
    echo "=====================================================\n";

    createTableIfMissing($db, 'fault_ticket_assignments', "
        CREATE TABLE fault_ticket_assignments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            fault_ticket_id INT NOT NULL,
            assigned_to INT NOT NULL,
            assigned_by INT NOT NULL,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expected_completion_date DATE NULL,
            notes TEXT NULL,
            status ENUM('Active', 'Completed', 'Removed') NOT NULL DEFAULT 'Active',
            INDEX idx_fault_ticket_id (fault_ticket_id),
            INDEX idx_assigned_to (assigned_to),
            INDEX idx_assigned_by (assigned_by),
            INDEX idx_status (status),
            CONSTRAINT fk_assignment_ticket FOREIGN KEY (fault_ticket_id) REFERENCES fault_tickets(id) ON DELETE CASCADE,
            CONSTRAINT fk_assignment_technician FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_assignment_supervisor FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    createTableIfMissing($db, 'fault_ticket_images', "
        CREATE TABLE fault_ticket_images (
            id INT AUTO_INCREMENT PRIMARY KEY,
            fault_ticket_id INT NOT NULL,
            image_uuid VARCHAR(36) NOT NULL UNIQUE,
            original_filename VARCHAR(255) NOT NULL,
            file_path VARCHAR(500) NOT NULL,
            file_size INT NOT NULL,
            mime_type VARCHAR(50) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_fault_ticket_id (fault_ticket_id),
            INDEX idx_image_uuid (image_uuid),
            CONSTRAINT fk_fault_ticket_images_ticket FOREIGN KEY (fault_ticket_id) REFERENCES fault_tickets(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    createTableIfMissing($db, 'budget_reports', "
        CREATE TABLE budget_reports (
            id INT AUTO_INCREMENT PRIMARY KEY,
            fault_ticket_id INT NOT NULL,
            submitted_by INT NOT NULL,
            quotation TEXT NOT NULL,
            justification TEXT NOT NULL,
            total_amount DECIMAL(10,2) NOT NULL,
            status ENUM('pending', 'approved', 'rejected', 'revised') DEFAULT 'pending',
            reviewed_by INT DEFAULT NULL,
            review_notes TEXT DEFAULT NULL,
            reviewed_at TIMESTAMP NULL DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_fault_ticket (fault_ticket_id),
            INDEX idx_submitted_by (submitted_by),
            INDEX idx_status (status),
            INDEX idx_created_at (created_at),
            CONSTRAINT fk_budget_fault_ticket FOREIGN KEY (fault_ticket_id) REFERENCES fault_tickets(id) ON DELETE CASCADE,
            CONSTRAINT fk_budget_submitted_by FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_budget_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    createTableIfMissing($db, 'spare_part_requests', "
        CREATE TABLE spare_part_requests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            request_id VARCHAR(30) NOT NULL UNIQUE,
            fault_ticket_id INT NOT NULL,
            ticket_id_formatted VARCHAR(30) NULL,
            requested_by INT NOT NULL,
            equipment_name VARCHAR(255) NULL,
            location VARCHAR(255) NULL,
            priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
            additional_notes TEXT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'Pending',
            reviewed_by INT NULL,
            review_notes TEXT NULL,
            reviewed_at DATETIME NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_spr_fault_ticket (fault_ticket_id),
            INDEX idx_spr_requested_by (requested_by),
            INDEX idx_spr_status (status),
            INDEX idx_spr_created_at (created_at),
            CONSTRAINT fk_spr_fault_ticket FOREIGN KEY (fault_ticket_id) REFERENCES fault_tickets(id) ON DELETE CASCADE,
            CONSTRAINT fk_spr_requested_by FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_spr_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    createTableIfMissing($db, 'spare_part_request_items', "
        CREATE TABLE spare_part_request_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            request_id INT NOT NULL,
            part_code VARCHAR(50) NULL,
            part_name VARCHAR(255) NOT NULL,
            quantity INT NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_spri_request_id (request_id),
            CONSTRAINT fk_spri_request_id FOREIGN KEY (request_id) REFERENCES spare_part_requests(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    createTableIfMissing($db, 'machine_weekly_checks', "
        CREATE TABLE machine_weekly_checks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            check_id VARCHAR(20) UNIQUE NOT NULL,
            machine_id INT NOT NULL,
            operator_id INT NULL,
            week_start_date DATE NOT NULL,
            week_end_date DATE NOT NULL,
            operating_hours DECIMAL(10,2) NULL,
            overall_condition ENUM('excellent', 'good', 'fair', 'poor') DEFAULT 'good',
            engine_status BOOLEAN DEFAULT TRUE,
            hydraulics BOOLEAN DEFAULT TRUE,
            electrical_system BOOLEAN DEFAULT TRUE,
            safety_equipment BOOLEAN DEFAULT TRUE,
            controls BOOLEAN DEFAULT TRUE,
            lubrication BOOLEAN DEFAULT TRUE,
            cooling_system BOOLEAN DEFAULT TRUE,
            filters BOOLEAN DEFAULT TRUE,
            status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
            notes TEXT NULL,
            issues_found TEXT NULL,
            rejection_reason TEXT NULL,
            submitted_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            reviewed_date DATETIME NULL,
            reviewed_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_check_id (check_id),
            INDEX idx_machine (machine_id),
            INDEX idx_operator (operator_id),
            INDEX idx_status (status),
            INDEX idx_week_end (week_end_date),
            CONSTRAINT fk_mwc_machine FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
            CONSTRAINT fk_mwc_operator FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE SET NULL,
            CONSTRAINT fk_mwc_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    echo "\nMigration 044 completed successfully.\n";
} catch (Exception $e) {
    echo "\nMigration 044 failed: " . $e->getMessage() . "\n";
    exit(1);
}
