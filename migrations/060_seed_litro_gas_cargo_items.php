<?php
/**
 * Migration 060: Seed Litro Gas cargo items
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

    echo "Starting migration 060: seed Litro Gas cargo items\n";
    echo str_repeat('=', 60) . "\n";

    if (!tableExists($db, 'cargo_items')) {
        throw new Exception('cargo_items table does not exist');
    }

    $adminIdStmt = $db->query("SELECT id FROM users WHERE role = 'Admin' ORDER BY id ASC LIMIT 1");
    $adminId = (int) $adminIdStmt->fetchColumn();
    if ($adminId <= 0) {
        $adminId = null;
    }

    $cargoItems = [
        ['CGI-101', 'Litro 2.3kg Domestic LPG Cylinder', 'Portable domestic LPG cylinder used for low-volume household cooking.', 'Nos', 1, 1],
        ['CGI-102', 'Litro 5kg Domestic LPG Cylinder', 'Mid-size domestic LPG cylinder used for household and small business kitchens.', 'Nos', 1, 1],
        ['CGI-103', 'Litro 12.5kg Domestic LPG Cylinder', 'Standard Litro domestic LPG cylinder used in residential distribution.', 'Nos', 1, 1],
        ['CGI-104', 'Litro 37.5kg Commercial LPG Cylinder', 'Commercial LPG cylinder supplied to restaurants, hotels, and food-service outlets.', 'Nos', 1, 1],
        ['CGI-105', 'Litro 45kg Industrial LPG Cylinder', 'Industrial LPG cylinder for high-consumption industrial and manufacturing use cases.', 'Nos', 1, 1],
        ['CGI-106', 'Litro 12.5kg Empty Return Cylinder', 'Empty domestic cylinder collected from customer locations for refill rotation.', 'Nos', 1, 1],
        ['CGI-107', 'Litro 37.5kg Empty Return Cylinder', 'Empty commercial cylinder returned to depot for inspection and refill.', 'Nos', 1, 1],
        ['CGI-108', 'Litro LPG Cylinder Valve Kit', 'Cylinder valve and safety cap bundle shipped with cylinder maintenance operations.', 'Kits', 1, 1],
    ];

    $insertStmt = $db->prepare(
        'INSERT INTO cargo_items (cargo_item_id, name, description, unit, is_dangerous, is_active, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            description = VALUES(description),
            unit = VALUES(unit),
            is_dangerous = VALUES(is_dangerous),
            is_active = VALUES(is_active),
            created_by = VALUES(created_by),
            updated_at = CURRENT_TIMESTAMP'
    );

    $seeded = 0;
    foreach ($cargoItems as $item) {
        $insertStmt->execute([
            $item[0],
            $item[1],
            $item[2],
            $item[3],
            $item[4],
            $item[5],
            $adminId,
        ]);
        $seeded++;
        echo "- Upserted {$item[0]} ({$item[1]})\n";
    }

    echo "\nSeeded/updated {$seeded} Litro cargo items.\n";
    echo "Migration 060 completed successfully.\n";
} catch (Exception $e) {
    echo "\nMigration 060 failed: " . $e->getMessage() . "\n";
    exit(1);
}
