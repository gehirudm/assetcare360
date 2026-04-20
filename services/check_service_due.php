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
$pollIntervalSeconds = max(1, (int) env('SERVICE_DUE_POLL_INTERVAL_SECONDS', 600));

$dateWindowDays = 7;
$vehicleMileageWindow = 500;
$machineHoursWindow = 10;

$insertLock = $db->prepare('INSERT INTO service_due_event_locks (lock_key, asset_type, asset_id, due_date) VALUES (?, ?, ?, ?)');
$checkLock = $db->prepare('SELECT COUNT(*) FROM service_due_event_locks WHERE lock_key = ?');

$safeInt = static function ($value): ?int {
    if ($value === null || $value === '' || !is_numeric($value)) {
        return null;
    }

    return (int) $value;
};

$classifyUsageThreshold = static function (
    ?int $currentValue,
    ?int $thresholdValue,
    int $window,
    string $basis,
    string $unit
): ?array {
    if ($currentValue === null || $thresholdValue === null) {
        return null;
    }

    $remaining = $thresholdValue - $currentValue;
    if ($remaining <= 0) {
        return [
            'state' => 'overdue',
            'basis' => $basis,
            'remaining_value' => null,
            'remaining_unit' => $unit,
            'overdue_value' => abs($remaining),
            'overdue_unit' => $unit,
            'summary' => strtoupper($basis) . ' overdue by ' . abs($remaining) . ' ' . $unit . '.',
        ];
    }

    if ($remaining <= $window) {
        return [
            'state' => 'due_soon',
            'basis' => $basis,
            'remaining_value' => $remaining,
            'remaining_unit' => $unit,
            'overdue_value' => null,
            'overdue_unit' => $unit,
            'summary' => strtoupper($basis) . ' due in ' . $remaining . ' ' . $unit . '.',
        ];
    }

    return null;
};

$classifyAsset = function (string $assetType, array $asset) use (
    $safeInt,
    $classifyUsageThreshold,
    $dateWindowDays,
    $vehicleMileageWindow,
    $machineHoursWindow
): array {
    $signals = [];
    $daysUntilDue = null;

    $dueDateRaw = trim((string)($asset['next_service_date'] ?? ''));
    $dueDate = $dueDateRaw !== '' ? $dueDateRaw : null;

    if ($dueDate !== null) {
        try {
            $today = new DateTimeImmutable(date('Y-m-d'));
            $dueDateValue = new DateTimeImmutable($dueDate);
            $daysUntilDue = (int)$today->diff($dueDateValue)->format('%r%a');

            if ($daysUntilDue < 0) {
                $signals[] = [
                    'state' => 'overdue',
                    'basis' => 'date',
                    'remaining_value' => null,
                    'remaining_unit' => 'days',
                    'overdue_value' => abs($daysUntilDue),
                    'overdue_unit' => 'days',
                    'summary' => 'Service date overdue by ' . abs($daysUntilDue) . ' day(s).',
                ];
            } elseif ($daysUntilDue <= $dateWindowDays) {
                $signals[] = [
                    'state' => 'due_soon',
                    'basis' => 'date',
                    'remaining_value' => $daysUntilDue,
                    'remaining_unit' => 'days',
                    'overdue_value' => null,
                    'overdue_unit' => 'days',
                    'summary' => 'Service due in ' . $daysUntilDue . ' day(s).',
                ];
            }
        } catch (Throwable $dateError) {
            error_log('[service-due] Invalid next_service_date for asset ' . ($asset['id'] ?? 'unknown') . ': ' . $dateError->getMessage());
        }
    }

    if ($assetType === 'vehicle') {
        $usageSignal = $classifyUsageThreshold(
            $safeInt($asset['current_mileage'] ?? null),
            $safeInt($asset['next_service_mileage'] ?? null),
            $vehicleMileageWindow,
            'mileage',
            'km'
        );
        if ($usageSignal !== null) {
            $signals[] = $usageSignal;
        }
    } else {
        $usageSignal = $classifyUsageThreshold(
            $safeInt($asset['current_operating_hours'] ?? null),
            $safeInt($asset['next_service_hours'] ?? null),
            $machineHoursWindow,
            'hours',
            'hours'
        );
        if ($usageSignal !== null) {
            $signals[] = $usageSignal;
        }
    }

    $overdueSignals = array_values(array_filter($signals, static fn(array $signal): bool => $signal['state'] === 'overdue'));
    $dueSoonSignals = array_values(array_filter($signals, static fn(array $signal): bool => $signal['state'] === 'due_soon'));

    if (empty($overdueSignals) && empty($dueSoonSignals)) {
        return [
            'should_publish' => false,
        ];
    }

    $activeSignals = !empty($overdueSignals) ? $overdueSignals : $dueSoonSignals;
    $status = !empty($overdueSignals) ? 'overdue' : 'due_soon';
    $basisParts = array_values(array_unique(array_map(static fn(array $signal): string => $signal['basis'], $activeSignals)));
    $summary = implode(' ', array_map(static fn(array $signal): string => $signal['summary'], $activeSignals));

    $metricReferenceParts = [];
    if ($dueDate !== null) {
        $metricReferenceParts[] = 'date:' . $dueDate;
    }

    if ($assetType === 'vehicle') {
        $nextServiceMileage = $safeInt($asset['next_service_mileage'] ?? null);
        if ($nextServiceMileage !== null) {
            $metricReferenceParts[] = 'mileage:' . $nextServiceMileage;
        }
    } else {
        $nextServiceHours = $safeInt($asset['next_service_hours'] ?? null);
        if ($nextServiceHours !== null) {
            $metricReferenceParts[] = 'hours:' . $nextServiceHours;
        }
    }

    $metricReference = !empty($metricReferenceParts)
        ? implode('|', $metricReferenceParts)
        : 'none';

    $primarySignal = $activeSignals[0];

    return [
        'should_publish' => true,
        'status' => $status,
        'event_name' => $status === 'overdue'
            ? DomainEvents::ASSET_SERVICE_OVERDUE
            : DomainEvents::ASSET_SERVICE_DUE_SOON,
        'days_until_due' => $daysUntilDue,
        'service_basis' => implode('+', $basisParts),
        'status_message' => $summary,
        'remaining_value' => $primarySignal['remaining_value'] ?? null,
        'remaining_unit' => $primarySignal['remaining_unit'] ?? null,
        'overdue_value' => $primarySignal['overdue_value'] ?? null,
        'overdue_unit' => $primarySignal['overdue_unit'] ?? null,
        'metric_reference' => $metricReference,
    ];
};

$running = true;
if (function_exists('pcntl_async_signals') && function_exists('pcntl_signal')) {
    pcntl_async_signals(true);
    pcntl_signal(SIGINT, function () use (&$running) {
        $running = false;
    });
    pcntl_signal(SIGTERM, function () use (&$running) {
        $running = false;
    });
}

echo sprintf("[service-due] Starting producer loop (interval=%ds).\n", $pollIntervalSeconds);

$runIteration = function () use ($machineModel, $vehicleModel, $publisher, $checkLock, $insertLock, $classifyAsset): array {
    $publishedDue = 0;
    $publishedOverdue = 0;
    $skipped = 0;

    $publishAsset = function (string $assetType, array $asset) use (&$publishedDue, &$publishedOverdue, &$skipped, $checkLock, $insertLock, $publisher, $classifyAsset) {
        $assetId = (int)($asset['id'] ?? 0);
        if ($assetId <= 0) {
            $skipped++;
            return;
        }

        $classification = $classifyAsset($assetType, $asset);
        if (empty($classification['should_publish'])) {
            $skipped++;
            return;
        }

        $dueDate = $asset['next_service_date'] ?? null;
        $status = (string)$classification['status'];
        $lockKey = sprintf(
            '%s:%d:%s:%s',
            $assetType,
            $assetId,
            $status,
            (string)($classification['metric_reference'] ?? ($dueDate ?: 'none'))
        );

        $checkLock->execute([$lockKey]);
        if ((int)$checkLock->fetchColumn() > 0) {
            $skipped++;
            return;
        }

        $eventData = [
            'asset_type' => $assetType,
            'asset_id' => $assetId,
            'asset_code' => $asset['machine_id'] ?? $asset['vehicle_id'] ?? null,
            'asset_name' => $asset['machine_name'] ?? $asset['vehicle_name'] ?? $asset['model_number'] ?? null,
            'due_date' => $dueDate,
            'days_until_due' => $classification['days_until_due'] ?? null,
            'service_status' => $status,
            'service_basis' => $classification['service_basis'] ?? null,
            'status_message' => $classification['status_message'] ?? null,
            'remaining_value' => $classification['remaining_value'] ?? null,
            'remaining_unit' => $classification['remaining_unit'] ?? null,
            'overdue_value' => $classification['overdue_value'] ?? null,
            'overdue_unit' => $classification['overdue_unit'] ?? null,
        ];

        $eventName = (string)$classification['event_name'];
        $ok = $publisher->publish($eventName, $eventData, [
            'source' => 'service:check_service_due',
            'service_status' => $status,
        ]);

        if ($ok) {
            $insertLock->execute([$lockKey, $assetType, $assetId, $dueDate]);
            if ($status === 'overdue') {
                $publishedOverdue++;
            } else {
                $publishedDue++;
            }
        } else {
            error_log(sprintf(
                '[service-due] publish failed for %s asset_id=%d status=%s due_date=%s event=%s',
                $assetType,
                $assetId,
                $status,
                (string)($dueDate ?? 'null')
                ,$eventName
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

    return [$publishedDue, $publishedOverdue, $skipped];
};

while ($running) {
    [$publishedDue, $publishedOverdue, $skipped] = $runIteration();
    echo sprintf(
        "[%s] Service-due producer iteration complete. due_published=%d overdue_published=%d skipped=%d\n",
        date('Y-m-d H:i:s'),
        $publishedDue,
        $publishedOverdue,
        $skipped
    );

    $slept = 0;
    while ($running && $slept < $pollIntervalSeconds) {
        sleep(1);
        $slept++;
    }
}

echo "[service-due] Producer stopped.\n";
