#!/usr/bin/env php
<?php

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../app/models/Machine.php';
require_once __DIR__ . '/../app/models/Vehicle.php';
require_once __DIR__ . '/../app/events/DomainEvents.php';
require_once __DIR__ . '/../app/services/EventPublisher.php';

if (!EVENTS_ENABLED) {
    echo "Events are disabled. Set EVENTS_ENABLED=true to publish service-due reminders.\n";
    exit(0);
}

$db = Database::getInstance()->getConnection();
$machineModel = new Machine();
$vehicleModel = new Vehicle();
$publisher = new EventPublisher();

$insertLock = $db->prepare('INSERT INTO service_due_event_locks (lock_key, asset_type, asset_id, due_date) VALUES (?, ?, ?, ?)');
$checkLock = $db->prepare('SELECT COUNT(*) FROM service_due_event_locks WHERE lock_key = ?');

$published = 0;
$skipped = 0;

$publishAsset = function (string $assetType, array $asset) use (&$published, &$skipped, $checkLock, $insertLock, $publisher) {
    $assetId = (int)($asset['id'] ?? 0);
    if ($assetId <= 0) {
        $skipped++;
        return;
    }

    $dueDate = $asset['next_service_date'] ?? null;
    $lockKey = sprintf('%s:%d:%s', $assetType, $assetId, $dueDate ?: 'none');

    $checkLock->execute([$lockKey]);
    if ((int)$checkLock->fetchColumn() > 0) {
        $skipped++;
        return;
    }

    $daysUntilDue = null;
    if ($dueDate) {
        $target = new DateTime($dueDate);
        $today = new DateTime(date('Y-m-d'));
        $daysUntilDue = (int)$today->diff($target)->format('%r%a');
    }

    $eventData = [
        'asset_type' => $assetType,
        'asset_id' => $assetId,
        'asset_code' => $asset['machine_id'] ?? $asset['vehicle_id'] ?? null,
        'asset_name' => $asset['machine_name'] ?? $asset['vehicle_name'] ?? $asset['model_number'] ?? null,
        'due_date' => $dueDate,
        'days_until_due' => $daysUntilDue,
    ];

    $ok = $publisher->publish(DomainEvents::ASSET_SERVICE_DUE_SOON, $eventData, ['source' => 'cron:check_service_due']);
    if ($ok) {
        $insertLock->execute([$lockKey, $assetType, $assetId, $dueDate]);
        $published++;
    } else {
        error_log(sprintf(
            '[service-due] publish failed for %s asset_id=%d due_date=%s',
            $assetType,
            $assetId,
            (string)($dueDate ?? 'null')
        ));
        $skipped++;
    }
};

$machines = $machineModel->getMachinesDueForService();
foreach ($machines as $machine) {
    $publishAsset('machine', $machine);
}

$vehicles = $vehicleModel->getVehiclesDueForService();
foreach ($vehicles as $vehicle) {
    $publishAsset('vehicle', $vehicle);
}

echo sprintf("Service-due producer complete. published=%d skipped=%d\n", $published, $skipped);
