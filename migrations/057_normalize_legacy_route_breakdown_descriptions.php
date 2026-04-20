<?php
/**
 * Migration 057: Normalize legacy route breakdown descriptions
 *
 * Cleans converted route-breakdown payload blobs stored in description fields
 * and keeps only the actual issue text for better UI rendering.
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

try {
    $db = Database::getInstance()->getConnection();

    echo "Starting migration 057: normalize legacy route breakdown descriptions\n";
    echo str_repeat('=', 70) . "\n";

    if (!tableExists($db, 'vehicle_breakdown_inroute')) {
        throw new Exception('vehicle_breakdown_inroute table does not exist');
    }

    if (!columnExists($db, 'vehicle_breakdown_inroute', 'description')) {
        throw new Exception('vehicle_breakdown_inroute.description column does not exist');
    }

    $routeUpdateSql = "
        UPDATE vehicle_breakdown_inroute
        SET description = TRIM(
            CASE
                WHEN LOCATE('Description:', description) > 0
                    THEN SUBSTRING_INDEX(description, 'Description:', -1)
                WHEN LOCATE('Details:', description) > 0
                    THEN SUBSTRING_INDEX(SUBSTRING_INDEX(description, 'Dangerous Cargo:', 1), 'Details:', -1)
                ELSE description
            END
        )
        WHERE description LIKE '[Route Breakdown]%'
          AND (
            LOCATE('Description:', description) > 0
            OR LOCATE('Details:', description) > 0
          )
    ";

    $routeUpdated = $db->exec($routeUpdateSql);
    echo "- vehicle_breakdown_inroute descriptions normalized: {$routeUpdated}\n";

    if (tableExists($db, 'fault_tickets')
        && columnExists($db, 'fault_tickets', 'description')
        && columnExists($db, 'fault_tickets', 'breakdown_type')) {

        $ticketUpdateSql = "
            UPDATE fault_tickets
            SET description = TRIM(
                CASE
                    WHEN LOCATE('Description:', description) > 0
                        THEN SUBSTRING_INDEX(description, 'Description:', -1)
                    WHEN LOCATE('Details:', description) > 0
                        THEN SUBSTRING_INDEX(SUBSTRING_INDEX(description, 'Dangerous Cargo:', 1), 'Details:', -1)
                    ELSE description
                END
            )
            WHERE breakdown_type = 'route_breakdown'
              AND description LIKE '[Route Breakdown]%'
              AND (
                LOCATE('Description:', description) > 0
                OR LOCATE('Details:', description) > 0
              )
        ";

        $ticketsUpdated = $db->exec($ticketUpdateSql);
        echo "- fault_tickets route descriptions normalized: {$ticketsUpdated}\n";
    } else {
        echo "- fault_tickets description normalization skipped (table/columns missing)\n";
    }

    echo "\nMigration 057 completed successfully.\n";
} catch (Exception $e) {
    echo "\nMigration 057 failed: " . $e->getMessage() . "\n";
    exit(1);
}
