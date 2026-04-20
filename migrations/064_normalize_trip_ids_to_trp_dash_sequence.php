<?php
/**
 * Migration 064: Normalize trip IDs to TRP-### sequence
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

    echo "Starting migration 064: normalize trip IDs to TRP-### sequence\n";
    echo str_repeat('=', 72) . "\n";

    if (!tableExists($db, 'trips') || !columnExists($db, 'trips', 'trip_id')) {
        echo "- trips.trip_id not found, skipped\n";
        echo "\nMigration 064 completed successfully.\n";
        return;
    }

    $db->beginTransaction();

    $tripRows = $db->query('SELECT id, trip_id FROM trips ORDER BY id ASC')->fetchAll(PDO::FETCH_ASSOC);
    if (empty($tripRows)) {
        $db->commit();
        echo "- no trips found, nothing to normalize\n";
        echo "\nMigration 064 completed successfully.\n";
        return;
    }

    $updates = [];
    $occupiedTargets = [];
    $maxSequence = 0;

    foreach ($tripRows as $row) {
        $currentTripId = trim((string) ($row['trip_id'] ?? ''));
        if (preg_match('/^TRP-(\d+)$/', $currentTripId, $matches)) {
            $sequence = (int) $matches[1];
            if ($sequence > $maxSequence) {
                $maxSequence = $sequence;
            }
            $occupiedTargets[$currentTripId] = true;
        }
    }

    $nextSequence = max(1, $maxSequence + 1);
    foreach ($tripRows as $row) {
        $tripDbId = (int) ($row['id'] ?? 0);
        if ($tripDbId <= 0) {
            continue;
        }

        $currentTripId = trim((string) ($row['trip_id'] ?? ''));
        if (preg_match('/^TRP-\d+$/', $currentTripId)) {
            continue;
        }

        do {
            $normalizedTripId = 'TRP-' . str_pad((string) $nextSequence, 3, '0', STR_PAD_LEFT);
            $nextSequence++;
        } while (isset($occupiedTargets[$normalizedTripId]));

        $occupiedTargets[$normalizedTripId] = true;
        $updates[] = [
            'id' => $tripDbId,
            'old' => $currentTripId,
            'new' => $normalizedTripId,
        ];
    }

    if (empty($updates)) {
        $db->commit();
        echo "- all trip IDs already in TRP-### format\n";
        echo "\nMigration 064 completed successfully.\n";
        return;
    }

    $toTemporaryStmt = $db->prepare('UPDATE trips SET trip_id = :temporary_id WHERE id = :trip_db_id');
    foreach ($updates as $update) {
        $toTemporaryStmt->execute([
            ':temporary_id' => '__TMP_TRIP__' . $update['id'],
            ':trip_db_id' => $update['id'],
        ]);
    }

    $toFinalStmt = $db->prepare('UPDATE trips SET trip_id = :normalized_id WHERE id = :trip_db_id');
    foreach ($updates as $update) {
        $toFinalStmt->execute([
            ':normalized_id' => $update['new'],
            ':trip_db_id' => $update['id'],
        ]);
    }

    $referenceUpdates = 0;
    if (tableExists($db, 'vehicle_breakdown_inroute') && columnExists($db, 'vehicle_breakdown_inroute', 'dangerous_cargo_trip_id')) {
        $updateRefStmt = $db->prepare('UPDATE vehicle_breakdown_inroute SET dangerous_cargo_trip_id = :new_trip_id WHERE dangerous_cargo_trip_id = :old_trip_id');
        foreach ($updates as $update) {
            $updateRefStmt->execute([
                ':new_trip_id' => $update['new'],
                ':old_trip_id' => $update['old'],
            ]);
            $referenceUpdates += $updateRefStmt->rowCount();
        }
    }

    $db->commit();

    echo "- normalized trip IDs: " . count($updates) . " row(s)\n";
    echo "- updated dangerous cargo trip references: {$referenceUpdates} row(s)\n";
    echo "\nMigration 064 completed successfully.\n";
} catch (Exception $e) {
    if (isset($db) && $db instanceof PDO && $db->inTransaction()) {
        $db->rollBack();
    }

    echo "\nMigration 064 failed: " . $e->getMessage() . "\n";
    exit(1);
}
