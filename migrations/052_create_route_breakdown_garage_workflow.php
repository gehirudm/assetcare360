<?php
/**
 * Migration 052: Create route breakdown garage workflow tables
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

function seedGarageIfMissing(PDO $db, array $garage): void {
    $stmt = $db->prepare('SELECT id FROM garages WHERE name = ? LIMIT 1');
    $stmt->execute([$garage['name']]);
    $exists = $stmt->fetchColumn();

    if ($exists) {
        echo "  * {$garage['name']}: already seeded\n";
        return;
    }

    $insert = $db->prepare(
        'INSERT INTO garages (name, address, city, latitude, longitude, phone, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)'
    );

    $insert->execute([
        $garage['name'],
        $garage['address'],
        $garage['city'],
        $garage['latitude'],
        $garage['longitude'],
        $garage['phone'],
    ]);

    echo "  * {$garage['name']}: seeded\n";
}

try {
    $db = Database::getInstance()->getConnection();

    echo "Starting migration 052: route breakdown garage workflow\n";
    echo str_repeat('=', 58) . "\n";

    createTableIfMissing($db, 'garages', "
        CREATE TABLE garages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            address VARCHAR(500) NOT NULL,
            city VARCHAR(100) NULL,
            latitude DECIMAL(10,7) NULL,
            longitude DECIMAL(10,7) NULL,
            phone VARCHAR(50) NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_garages_active (is_active),
            INDEX idx_garages_city (city)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    createTableIfMissing($db, 'route_breakdown_garage_workflow', "
        CREATE TABLE route_breakdown_garage_workflow (
            id INT AUTO_INCREMENT PRIMARY KEY,
            route_breakdown_id INT NOT NULL,
            workflow_status ENUM(
                'awaiting_supervisor_approval',
                'garage_approved',
                'garage_entry_logged',
                'repair_in_progress',
                'completed'
            ) NOT NULL DEFAULT 'awaiting_supervisor_approval',
            approved_garage_id INT NULL,
            approved_by INT NULL,
            approval_notes TEXT NULL,
            approved_at DATETIME NULL,
            garage_entry_notes TEXT NULL,
            garage_entry_at DATETIME NULL,
            completed_by INT NULL,
            completed_at DATETIME NULL,
            bill_amount DECIMAL(10,2) NULL,
            bill_image_path VARCHAR(500) NULL,
            completion_remarks TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_rgf_route_breakdown (route_breakdown_id),
            INDEX idx_rgf_status (workflow_status),
            INDEX idx_rgf_approved_garage (approved_garage_id),
            INDEX idx_rgf_approved_by (approved_by),
            INDEX idx_rgf_completed_by (completed_by),
            CONSTRAINT fk_rgf_route_breakdown FOREIGN KEY (route_breakdown_id) REFERENCES vehicle_breakdown_inroute(id) ON DELETE CASCADE,
            CONSTRAINT fk_rgf_approved_garage FOREIGN KEY (approved_garage_id) REFERENCES garages(id) ON DELETE SET NULL,
            CONSTRAINT fk_rgf_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
            CONSTRAINT fk_rgf_completed_by FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    createTableIfMissing($db, 'route_breakdown_garage_updates', "
        CREATE TABLE route_breakdown_garage_updates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            route_breakdown_id INT NOT NULL,
            updated_by INT NOT NULL,
            update_type ENUM('approval', 'entry', 'progress', 'completion') NOT NULL DEFAULT 'progress',
            note TEXT NOT NULL,
            progress_images_json LONGTEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_rgu_route_breakdown (route_breakdown_id),
            INDEX idx_rgu_updated_by (updated_by),
            INDEX idx_rgu_type (update_type),
            CONSTRAINT fk_rgu_route_breakdown FOREIGN KEY (route_breakdown_id) REFERENCES vehicle_breakdown_inroute(id) ON DELETE CASCADE,
            CONSTRAINT fk_rgu_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    echo "\nSeeding default garages\n";

    $defaultGarages = [
        [
            'name' => 'AutoCare Service Center',
            'address' => '123 Galle Road, Colombo 03',
            'city' => 'Colombo',
            'latitude' => 6.9032034,
            'longitude' => 79.8501262,
            'phone' => '+94 11 234 5678',
        ],
        [
            'name' => 'Reliable Motors',
            'address' => '456 Kandy Road, Kadawatha',
            'city' => 'Kadawatha',
            'latitude' => 7.0014357,
            'longitude' => 79.9496213,
            'phone' => '+94 11 345 6789',
        ],
        [
            'name' => 'Quick Fix Auto',
            'address' => '789 High Level Road, Nugegoda',
            'city' => 'Nugegoda',
            'latitude' => 6.8651111,
            'longitude' => 79.8992918,
            'phone' => '+94 11 456 7890',
        ],
        [
            'name' => 'Roadside Rescue Center',
            'address' => '45 Negombo Road, Wattala',
            'city' => 'Wattala',
            'latitude' => 6.9902447,
            'longitude' => 79.8921642,
            'phone' => '+94 11 552 4400',
        ],
        [
            'name' => 'City Motors Workshop',
            'address' => '88 Parliament Road, Battaramulla',
            'city' => 'Battaramulla',
            'latitude' => 6.9021510,
            'longitude' => 79.9178705,
            'phone' => '+94 11 552 1199',
        ],
    ];

    foreach ($defaultGarages as $garage) {
        seedGarageIfMissing($db, $garage);
    }

    echo "\nMigration 052 completed successfully.\n";
} catch (Exception $e) {
    echo "\nMigration 052 failed: " . $e->getMessage() . "\n";
    exit(1);
}
