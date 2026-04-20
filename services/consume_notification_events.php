#!/usr/bin/env php
<?php

require_once __DIR__ . '/bootstrap_events.php';

$debugLogging = filter_var(env('NOTIFICATION_CONSUMER_DEBUG', 'true'), FILTER_VALIDATE_BOOLEAN);

$log = static function (string $level, string $message, array $context = []) use ($debugLogging): void {
    if ($level === 'DEBUG' && !$debugLogging) {
        return;
    }

    $timestamp = date('Y-m-d H:i:s');
    $contextJson = '';
    if (!empty($context)) {
        $encoded = json_encode($context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($encoded !== false) {
            $contextJson = ' ' . $encoded;
        }
    }

    $line = sprintf('[%s] [notifications] [%s] %s%s%s', $timestamp, $level, $message, $contextJson, PHP_EOL);
    $stream = ($level === 'ERROR' || $level === 'WARN') ? STDERR : STDOUT;
    fwrite($stream, $line);
};

if (!EVENTS_ENABLED) {
    $log('WARN', 'Events are disabled. Set EVENTS_ENABLED=true to run consumers.');
    exit(0);
}

$db = Database::getInstance()->getConnection();
$consumerName = 'notification_consumer';

$connection = createRabbitConnection();
$channel = $connection->channel();
$channel->exchange_declare(RABBITMQ_EXCHANGE, RABBITMQ_EXCHANGE_TYPE, false, true, false);
declareDlx($channel);

$queueArgs = queueArguments();
$channel->queue_declare(RABBITMQ_NOTIFICATION_QUEUE, false, true, false, false, false, $queueArgs);

$routingKeys = [
    'fault.ticket.created',
    'fault.ticket.assigned',
    'fault.ticket.resolved',
    'service.ticket.assigned',
    'service.ticket.completed',
    'trip.assigned',
    'trip.accepted',
    'trip.completed',
    'budget.report.created',
    'budget.report.reviewed',
    'spare.part.request.created',
    'spare.part.request.approved',
    'spare.part.request.rejected',
    'asset.service.due.soon',
    'asset.service.overdue',
];

foreach ($routingKeys as $routingKey) {
    $channel->queue_bind(RABBITMQ_NOTIFICATION_QUEUE, RABBITMQ_EXCHANGE, $routingKey);
    $log('DEBUG', 'Bound routing key', [
        'queue' => RABBITMQ_NOTIFICATION_QUEUE,
        'routing_key' => $routingKey,
    ]);
}

if (RABBITMQ_DLX_EXCHANGE !== '') {
    $dlq = RABBITMQ_DLQ_PREFIX . '.notifications';
    $channel->queue_declare($dlq, false, true, false, false);
    $channel->queue_bind($dlq, RABBITMQ_DLX_EXCHANGE, '#');
    $log('INFO', 'DLQ binding configured', [
        'dlx_exchange' => RABBITMQ_DLX_EXCHANGE,
        'dlq' => $dlq,
    ]);
}

$channel->basic_qos(null, 20, null);

$log('INFO', 'Notification consumer started', [
    'consumer' => $consumerName,
    'exchange' => RABBITMQ_EXCHANGE,
    'exchange_type' => RABBITMQ_EXCHANGE_TYPE,
    'queue' => RABBITMQ_NOTIFICATION_QUEUE,
    'prefetch' => 20,
    'debug_logging' => $debugLogging,
]);

$log('INFO', 'Waiting for messages', ['queue' => RABBITMQ_NOTIFICATION_QUEUE]);

$notificationInsert = $db->prepare(
    'INSERT INTO notifications
        (notification_id, user_id, target_role, title, message, type, source_event, source_event_id, payload_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
);

$supervisorsBySubmittedTechStmt = $db->prepare(
        "SELECT DISTINCT fta.assigned_by
         FROM fault_ticket_assignments fta
         INNER JOIN users supervisor ON supervisor.id = fta.assigned_by
         WHERE fta.fault_ticket_id = ?
             AND fta.assigned_to = ?
             AND fta.status = 'Active'
             AND supervisor.role = 'Supervisor'
         ORDER BY fta.assigned_at DESC"
);

$supervisorsByTicketStmt = $db->prepare(
        "SELECT DISTINCT fta.assigned_by
         FROM fault_ticket_assignments fta
         INNER JOIN users supervisor ON supervisor.id = fta.assigned_by
         WHERE fta.fault_ticket_id = ?
             AND fta.status = 'Active'
             AND supervisor.role = 'Supervisor'
         ORDER BY fta.assigned_at DESC"
);

$spareRequestByIdStmt = $db->prepare(
    'SELECT id, request_id, requested_by FROM spare_part_requests WHERE id = ? LIMIT 1'
);

$spareRequestByCodeStmt = $db->prepare(
    'SELECT id, request_id, requested_by FROM spare_part_requests WHERE request_id = ? LIMIT 1'
);

$budgetReportByIdStmt = $db->prepare(
    'SELECT id, submitted_by FROM budget_reports WHERE id = ? LIMIT 1'
);

$processedInsert = $db->prepare('INSERT INTO processed_events (consumer_name, event_uuid) VALUES (?, ?)');
$processedCheck = $db->prepare('SELECT COUNT(*) FROM processed_events WHERE consumer_name = ? AND event_uuid = ?');

function deterministicUuid(string $seed): string {
    $hex = substr(hash('sha1', $seed), 0, 32);
    return sprintf(
        '%s-%s-%s-%s-%s',
        substr($hex, 0, 8),
        substr($hex, 8, 4),
        substr($hex, 12, 4),
        substr($hex, 16, 4),
        substr($hex, 20, 12)
    );
}

$resolveSparePartRequester = function (array $data) use ($spareRequestByIdStmt, $spareRequestByCodeStmt, $log): array {
    $requestDbId = isset($data['request_db_id']) ? (int)$data['request_db_id'] : 0;
    $requestId = trim((string)($data['request_id'] ?? ''));
    $requestedBy = isset($data['requested_by']) ? (int)$data['requested_by'] : 0;

    if ($requestedBy > 0) {
        return [
            'requested_by' => $requestedBy,
            'request_db_id' => $requestDbId > 0 ? $requestDbId : null,
            'request_id' => $requestId !== '' ? $requestId : null,
        ];
    }

    try {
        if ($requestDbId > 0) {
            $spareRequestByIdStmt->execute([$requestDbId]);
            $row = $spareRequestByIdStmt->fetch(PDO::FETCH_ASSOC);
            if (is_array($row)) {
                return [
                    'requested_by' => isset($row['requested_by']) ? (int)$row['requested_by'] : 0,
                    'request_db_id' => isset($row['id']) ? (int)$row['id'] : $requestDbId,
                    'request_id' => isset($row['request_id']) ? (string)$row['request_id'] : ($requestId !== '' ? $requestId : null),
                ];
            }
        }

        if ($requestId !== '') {
            $spareRequestByCodeStmt->execute([$requestId]);
            $row = $spareRequestByCodeStmt->fetch(PDO::FETCH_ASSOC);
            if (is_array($row)) {
                return [
                    'requested_by' => isset($row['requested_by']) ? (int)$row['requested_by'] : 0,
                    'request_db_id' => isset($row['id']) ? (int)$row['id'] : ($requestDbId > 0 ? $requestDbId : null),
                    'request_id' => isset($row['request_id']) ? (string)$row['request_id'] : $requestId,
                ];
            }
        }
    } catch (Throwable $lookupError) {
        $log('WARN', 'Spare-part requester lookup failed', [
            'request_db_id' => $requestDbId,
            'request_id' => $requestId,
            'error' => $lookupError->getMessage(),
        ]);
    }

    return [
        'requested_by' => 0,
        'request_db_id' => $requestDbId > 0 ? $requestDbId : null,
        'request_id' => $requestId !== '' ? $requestId : null,
    ];
};

$resolveBudgetSubmitter = function (array $data) use ($budgetReportByIdStmt, $log): array {
    $reportId = isset($data['report_id']) ? (int)$data['report_id'] : 0;
    $submittedBy = isset($data['submitted_by']) ? (int)$data['submitted_by'] : 0;

    if ($submittedBy > 0) {
        return [
            'report_id' => $reportId > 0 ? $reportId : null,
            'submitted_by' => $submittedBy,
        ];
    }

    if ($reportId <= 0) {
        return [
            'report_id' => null,
            'submitted_by' => 0,
        ];
    }

    try {
        $budgetReportByIdStmt->execute([$reportId]);
        $row = $budgetReportByIdStmt->fetch(PDO::FETCH_ASSOC);
        if (is_array($row)) {
            return [
                'report_id' => isset($row['id']) ? (int)$row['id'] : $reportId,
                'submitted_by' => isset($row['submitted_by']) ? (int)$row['submitted_by'] : 0,
            ];
        }
    } catch (Throwable $lookupError) {
        $log('WARN', 'Budget submitter lookup failed', [
            'report_id' => $reportId,
            'error' => $lookupError->getMessage(),
        ]);
    }

    return [
        'report_id' => $reportId,
        'submitted_by' => 0,
    ];
};

$buildRecords = function (array $event) use ($supervisorsBySubmittedTechStmt, $supervisorsByTicketStmt, $resolveSparePartRequester, $resolveBudgetSubmitter, $log): array {
    $data = $event['data'];
    $records = [];

    switch ($event['event']) {
        case DomainEvents::FAULT_TICKET_CREATED:
            $ticketId = $data['ticket_id'] ?? (($data['ticket_db_id'] ?? null) ? ('#' . $data['ticket_db_id']) : 'Unknown');
            $records[] = [
                'user_id' => null,
                'target_role' => 'Supervisor',
                'title' => 'New fault ticket created',
                'message' => "A new fault ticket {$ticketId} has been created and is awaiting assignment.",
                'type' => 'info',
                'source_event_id' => (string)$ticketId,
            ];
            break;

        case DomainEvents::FAULT_TICKET_ASSIGNED:
            $ticketId = $data['ticket_id'] ?? (($data['ticket_db_id'] ?? null) ? ('#' . $data['ticket_db_id']) : 'Unknown');
            $title = 'New ticket assigned';
            $message = "Ticket {$ticketId} was assigned to you.";
            $userIds = isset($data['technician_user_ids']) && is_array($data['technician_user_ids']) ? $data['technician_user_ids'] : [];
            foreach ($userIds as $userId) {
                $records[] = [
                    'user_id' => (int)$userId,
                    'target_role' => null,
                    'title' => $title,
                    'message' => $message,
                    'type' => 'info',
                    'source_event_id' => (string)$ticketId,
                ];
            }
            break;

        case DomainEvents::FAULT_TICKET_RESOLVED:
            $ticketId = $data['ticket_id'] ?? (($data['ticket_db_id'] ?? null) ? ('#' . $data['ticket_db_id']) : 'Unknown');
            $reportedByUserId = isset($data['reported_by']) ? (int)$data['reported_by'] : 0;
            if ($reportedByUserId > 0) {
                $records[] = [
                    'user_id' => $reportedByUserId,
                    'target_role' => null,
                    'title' => 'Ticket resolved',
                    'message' => "Your fault ticket {$ticketId} has been resolved.",
                    'type' => 'success',
                    'source_event_id' => (string)$ticketId,
                ];
            }
            break;

        case DomainEvents::SERVICE_TICKET_ASSIGNED:
            $ticketId = $data['service_ticket_id'] ?? (($data['ticket_db_id'] ?? null) ? ('#' . $data['ticket_db_id']) : 'Unknown');
            $userIds = isset($data['technician_user_ids']) && is_array($data['technician_user_ids']) ? $data['technician_user_ids'] : [];
            $assignedTo = isset($data['assigned_to']) ? (int)$data['assigned_to'] : 0;
            if ($assignedTo > 0) {
                $userIds[] = $assignedTo;
            }

            $userIds = array_values(array_unique(array_map(static fn($userId): int => (int)$userId, $userIds)));
            foreach ($userIds as $userId) {
                if ($userId <= 0) {
                    continue;
                }

                $records[] = [
                    'user_id' => $userId,
                    'target_role' => null,
                    'title' => 'New service ticket assigned',
                    'message' => "Service ticket {$ticketId} was assigned to you.",
                    'type' => 'info',
                    'source_event_id' => (string)$ticketId,
                ];
            }
            break;

        case DomainEvents::SERVICE_TICKET_COMPLETED:
            $ticketId = $data['service_ticket_id'] ?? (($data['ticket_db_id'] ?? null) ? ('#' . $data['ticket_db_id']) : 'Unknown');
            $serviceType = trim((string)($data['service_type'] ?? ''));
            $completedByName = trim((string)($data['completed_by_name'] ?? ''));

            $message = "Service ticket {$ticketId} was completed and service report submitted.";
            if ($serviceType !== '') {
                $message .= " Service type: {$serviceType}.";
            }
            if ($completedByName !== '') {
                $message .= " Completed by {$completedByName}.";
            }

            $records[] = [
                'user_id' => null,
                'target_role' => 'Maintenance Manager',
                'title' => 'Service ticket completed',
                'message' => $message,
                'type' => 'success',
                'source_event_id' => (string)$ticketId,
            ];
            break;

        case DomainEvents::TRIP_ASSIGNED:
            $tripId = $data['trip_id'] ?? (($data['trip_db_id'] ?? null) ? ('#' . $data['trip_db_id']) : 'Unknown');
            $origin = trim((string)($data['origin'] ?? ''));
            $destination = trim((string)($data['destination'] ?? ''));

            $message = "Trip {$tripId} has been assigned to you.";
            if ($origin !== '' || $destination !== '') {
                $routeLabel = trim($origin . (($origin !== '' && $destination !== '') ? ' to ' : '') . $destination);
                if ($routeLabel !== '') {
                    $message .= " Route: {$routeLabel}.";
                }
            }

            $userIds = isset($data['driver_user_ids']) && is_array($data['driver_user_ids']) ? $data['driver_user_ids'] : [];
            $driverId = isset($data['driver_id']) ? (int)$data['driver_id'] : 0;
            if ($driverId > 0) {
                $userIds[] = $driverId;
            }

            $userIds = array_values(array_unique(array_map(static fn($userId): int => (int)$userId, $userIds)));
            foreach ($userIds as $userId) {
                if ($userId <= 0) {
                    continue;
                }

                $records[] = [
                    'user_id' => $userId,
                    'target_role' => null,
                    'title' => 'New trip assignment',
                    'message' => $message,
                    'type' => 'info',
                    'source_event_id' => (string)$tripId,
                ];
            }
            break;

        case DomainEvents::TRIP_ACCEPTED:
            $tripId = $data['trip_id'] ?? (($data['trip_db_id'] ?? null) ? ('#' . $data['trip_db_id']) : 'Unknown');
            $driverName = trim((string)($data['driver_name'] ?? $data['accepted_by_name'] ?? ''));
            $origin = trim((string)($data['origin'] ?? ''));
            $destination = trim((string)($data['destination'] ?? ''));

            $message = "Trip {$tripId} was accepted by the driver.";
            if ($driverName !== '') {
                $message = "Trip {$tripId} was accepted by {$driverName}.";
            }
            if ($origin !== '' || $destination !== '') {
                $routeLabel = trim($origin . (($origin !== '' && $destination !== '') ? ' to ' : '') . $destination);
                if ($routeLabel !== '') {
                    $message .= " Route: {$routeLabel}.";
                }
            }

            $records[] = [
                'user_id' => null,
                'target_role' => 'Transportation Manager',
                'title' => 'Trip accepted',
                'message' => $message,
                'type' => 'info',
                'source_event_id' => (string)$tripId,
            ];
            break;

        case DomainEvents::TRIP_COMPLETED:
            $tripId = $data['trip_id'] ?? (($data['trip_db_id'] ?? null) ? ('#' . $data['trip_db_id']) : 'Unknown');
            $driverName = trim((string)($data['driver_name'] ?? $data['completed_by_name'] ?? ''));
            $origin = trim((string)($data['origin'] ?? ''));
            $destination = trim((string)($data['destination'] ?? ''));
            $finalOdometer = isset($data['final_odometer']) && is_numeric($data['final_odometer']) ? (int)$data['final_odometer'] : null;
            $completionNotes = trim((string)($data['completion_notes'] ?? ''));

            $message = "Trip {$tripId} was completed by the driver.";
            if ($driverName !== '') {
                $message = "Trip {$tripId} was completed by {$driverName}.";
            }
            if ($origin !== '' || $destination !== '') {
                $routeLabel = trim($origin . (($origin !== '' && $destination !== '') ? ' to ' : '') . $destination);
                if ($routeLabel !== '') {
                    $message .= " Route: {$routeLabel}.";
                }
            }
            if ($finalOdometer !== null) {
                $message .= " Final odometer: {$finalOdometer} km.";
            }
            if ($completionNotes !== '') {
                $noteSummary = strlen($completionNotes) > 120
                    ? substr($completionNotes, 0, 117) . '...'
                    : $completionNotes;
                $message .= " Notes: {$noteSummary}";
            }

            $records[] = [
                'user_id' => null,
                'target_role' => 'Transportation Manager',
                'title' => 'Trip completed',
                'message' => $message,
                'type' => 'success',
                'source_event_id' => (string)$tripId,
            ];
            break;

        case DomainEvents::BUDGET_REPORT_CREATED:
            $approvalRoleRaw = (string)($data['approval_role'] ?? $data['approval_level'] ?? 'Supervisor');
            $approvalRole = strtolower(str_replace([' ', '-'], '_', trim($approvalRoleRaw)));

            // Maintenance Manager can approve all budget requests, so always notify this role.
            $records[] = [
                'user_id' => null,
                'target_role' => 'Maintenance Manager',
                'title' => 'Budget review required',
                'message' => 'A budget report is waiting for your approval.',
                'type' => 'warning',
                'source_event_id' => (string)($data['report_id'] ?? ''),
            ];

            if ($approvalRole !== 'maintenance_manager') {
                $ticketId = isset($data['fault_ticket_id']) ? (int)$data['fault_ticket_id'] : 0;
                $submittedBy = isset($data['submitted_by']) ? (int)$data['submitted_by'] : null;
                $supervisorIds = [];
                $supervisorRecipientAdded = false;

                try {
                    if ($ticketId > 0 && $submittedBy !== null && $submittedBy > 0) {
                        $supervisorsBySubmittedTechStmt->execute([$ticketId, $submittedBy]);
                        $supervisorIds = array_values(array_unique(array_map(
                            static fn(array $row): int => (int)$row['assigned_by'],
                            $supervisorsBySubmittedTechStmt->fetchAll(PDO::FETCH_ASSOC)
                        )));
                    }

                    if ($ticketId > 0 && empty($supervisorIds)) {
                        $supervisorsByTicketStmt->execute([$ticketId]);
                        $supervisorIds = array_values(array_unique(array_map(
                            static fn(array $row): int => (int)$row['assigned_by'],
                            $supervisorsByTicketStmt->fetchAll(PDO::FETCH_ASSOC)
                        )));
                    }
                } catch (Throwable $routingError) {
                    $log('WARN', 'Supervisor routing lookup failed', [
                        'event' => $event['event'] ?? null,
                        'fault_ticket_id' => $ticketId,
                        'submitted_by' => $submittedBy,
                        'error' => $routingError->getMessage(),
                    ]);
                    $supervisorIds = [];
                }

                foreach ($supervisorIds as $supervisorId) {
                    if ($supervisorId <= 0) {
                        continue;
                    }

                    $records[] = [
                        'user_id' => $supervisorId,
                        'target_role' => null,
                        'title' => 'Budget review required',
                        'message' => 'A budget report is waiting for your approval.',
                        'type' => 'warning',
                        'source_event_id' => (string)($data['report_id'] ?? ''),
                    ];
                    $supervisorRecipientAdded = true;
                }

                // Safety fallback for legacy tickets with missing assignment ownership mapping.
                if (!$supervisorRecipientAdded) {
                    $records[] = [
                        'user_id' => null,
                        'target_role' => 'Supervisor',
                        'title' => 'Budget review required',
                        'message' => 'A budget report is waiting for your approval.',
                        'type' => 'warning',
                        'source_event_id' => (string)($data['report_id'] ?? ''),
                    ];
                }
            }
            break;

        case DomainEvents::BUDGET_REPORT_REVIEWED:
            $resolvedSubmitter = $resolveBudgetSubmitter($data);
            $submittedBy = (int)($resolvedSubmitter['submitted_by'] ?? 0);
            if ($submittedBy <= 0) {
                $log('WARN', 'Skipping budget review notification due to unresolved submitter', [
                    'event' => $event['event'],
                    'report_id' => $resolvedSubmitter['report_id'] ?? ($data['report_id'] ?? null),
                ]);
                break;
            }

            $records[] = [
                'user_id' => $submittedBy,
                'target_role' => null,
                'title' => 'Budget decision received',
                'message' => 'Your budget report has been reviewed: ' . strtoupper((string)($data['status'] ?? 'pending')),
                'type' => (($data['status'] ?? '') === 'approved') ? 'success' : 'warning',
                'source_event_id' => (string)($resolvedSubmitter['report_id'] ?? $data['report_id'] ?? ''),
            ];
            break;

        case DomainEvents::SPARE_PART_REQUEST_CREATED:
            $records[] = [
                'user_id' => null,
                'target_role' => 'Inventory Manager',
                'title' => 'Spare-part request submitted',
                'message' => 'A new spare-part request is pending review.',
                'type' => 'info',
                'source_event_id' => (string)($data['request_id'] ?? $data['request_db_id'] ?? ''),
            ];
            break;

        case DomainEvents::SPARE_PART_REQUEST_APPROVED:
        case DomainEvents::SPARE_PART_REQUEST_REJECTED:
            $status = $event['event'] === DomainEvents::SPARE_PART_REQUEST_APPROVED ? 'approved' : 'rejected';
            $resolvedRequester = $resolveSparePartRequester($data);
            $requestedBy = (int)($resolvedRequester['requested_by'] ?? 0);
            $requestDisplayId = (string)($resolvedRequester['request_id'] ?? '');
            if ($requestDisplayId === '' && !empty($resolvedRequester['request_db_id'])) {
                $requestDisplayId = '#' . (int)$resolvedRequester['request_db_id'];
            }

            if ($requestedBy <= 0) {
                $log('WARN', 'Skipping spare-part requester notification due to unresolved recipient', [
                    'event' => $event['event'],
                    'request_db_id' => $resolvedRequester['request_db_id'] ?? null,
                    'request_id' => $resolvedRequester['request_id'] ?? null,
                ]);
                break;
            }

            $message = $requestDisplayId !== ''
                ? "Your spare-part request {$requestDisplayId} was {$status}."
                : "Your spare-part request was {$status}.";

            $records[] = [
                'user_id' => $requestedBy,
                'target_role' => null,
                'title' => 'Spare-part request updated',
                'message' => $message,
                'type' => $status === 'approved' ? 'success' : 'warning',
                'source_event_id' => (string)($resolvedRequester['request_id'] ?? $resolvedRequester['request_db_id'] ?? ''),
            ];
            break;

        case DomainEvents::ASSET_SERVICE_DUE_SOON:
            $assetCode = $data['asset_code'] ?? ('#' . ($data['asset_id'] ?? ''));
            $statusMessage = trim((string)($data['status_message'] ?? ''));
            $dueDate = $data['due_date'] ?? null;
            if ($statusMessage === '') {
                $statusMessage = $dueDate
                    ? "Service is due on {$dueDate}."
                    : 'Service is due soon.';
            }
            $records[] = [
                'user_id' => null,
                'target_role' => 'Maintenance Manager',
                'title' => 'Asset maintenance due soon',
                'message' => "{$assetCode}: {$statusMessage}",
                'type' => 'warning',
                'source_event_id' => (string)($data['asset_code'] ?? $data['asset_id'] ?? ''),
            ];
            break;

        case DomainEvents::ASSET_SERVICE_OVERDUE:
            $assetCode = $data['asset_code'] ?? ('#' . ($data['asset_id'] ?? ''));
            $statusMessage = trim((string)($data['status_message'] ?? ''));
            if ($statusMessage === '') {
                $statusMessage = 'Service is overdue and requires immediate attention.';
            }
            $records[] = [
                'user_id' => null,
                'target_role' => 'Maintenance Manager',
                'title' => 'Asset maintenance overdue',
                'message' => "{$assetCode}: {$statusMessage}",
                'type' => 'error',
                'source_event_id' => (string)($data['asset_code'] ?? $data['asset_id'] ?? ''),
            ];
            break;
    }

    return $records;
};

$callback = function (\PhpAmqpLib\Message\AMQPMessage $msg) use ($db, $consumerName, $notificationInsert, $processedInsert, $processedCheck, $buildRecords, $log) {
    $processingStartedAt = microtime(true);
    $deliveryInfo = $msg->delivery_info ?? [];
    $deliveryTag = $deliveryInfo['delivery_tag'] ?? null;
    $routingKey = $deliveryInfo['routing_key'] ?? null;
    $eventUuid = null;
    $eventName = null;

    $log('DEBUG', 'Message received', [
        'delivery_tag' => $deliveryTag,
        'routing_key' => $routingKey,
        'body_bytes' => strlen((string) $msg->body),
    ]);

    try {
        $payload = json_decode($msg->body, true);
        if (!is_array($payload)) {
            $log('WARN', 'Invalid JSON payload', [
                'delivery_tag' => $deliveryTag,
                'routing_key' => $routingKey,
                'body_preview' => substr((string) $msg->body, 0, 240),
            ]);
            throw new RuntimeException('Invalid JSON payload');
        }

        $validation = EventEnvelope::validate($payload);
        if (!$validation['valid']) {
            $log('WARN', 'Envelope validation failed', [
                'delivery_tag' => $deliveryTag,
                'routing_key' => $routingKey,
                'validation_message' => $validation['message'] ?? 'Unknown validation error',
                'event' => $payload['event'] ?? null,
                'event_uuid' => $payload['id'] ?? null,
            ]);
            throw new RuntimeException('Invalid envelope: ' . $validation['message']);
        }

        $eventUuid = $payload['id'];
        $eventName = (string)$payload['event'];

        $log('DEBUG', 'Envelope validated', [
            'event_uuid' => $eventUuid,
            'event' => $eventName,
        ]);

        $processedCheck->execute([$consumerName, $eventUuid]);
        if ((int)$processedCheck->fetchColumn() > 0) {
            $log('INFO', 'Duplicate event skipped', [
                'event_uuid' => $eventUuid,
                'event' => $eventName,
            ]);
            $msg->ack();
            return;
        }

        $records = $buildRecords($payload);
        if (empty($records)) {
            $log('WARN', 'No notification records generated for event', [
                'event_uuid' => $eventUuid,
                'event' => $eventName,
            ]);
        }

        foreach ($records as $index => $record) {
            $recipientKey = $record['user_id'] !== null
                ? 'user:' . $record['user_id']
                : 'role:' . ($record['target_role'] ?? 'all');
            $notificationId = deterministicUuid($eventUuid . '|' . $recipientKey . '|' . $index);

            $log('DEBUG', 'Persisting notification', [
                'event_uuid' => $eventUuid,
                'event' => $eventName,
                'notification_id' => $notificationId,
                'recipient' => $recipientKey,
                'index' => $index,
            ]);

            $notificationInsert->execute([
                $notificationId,
                $record['user_id'],
                $record['target_role'],
                $record['title'],
                $record['message'],
                $record['type'],
                $eventName,
                $record['source_event_id'] ?? null,
                json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ]);
        }

        $processedInsert->execute([$consumerName, $eventUuid]);
        $msg->ack();

        $log('INFO', 'Event processed and acknowledged', [
            'event_uuid' => $eventUuid,
            'event' => $eventName,
            'records_created' => count($records),
            'processing_ms' => (int) round((microtime(true) - $processingStartedAt) * 1000),
        ]);
    } catch (Throwable $e) {
        $log('ERROR', 'Consume error, message requeued', [
            'event_uuid' => $eventUuid,
            'event' => $eventName,
            'delivery_tag' => $deliveryTag,
            'routing_key' => $routingKey,
            'error' => $e->getMessage(),
            'processing_ms' => (int) round((microtime(true) - $processingStartedAt) * 1000),
        ]);
        $msg->nack(false, true);
    }
};

$channel->basic_consume(RABBITMQ_NOTIFICATION_QUEUE, '', false, false, false, false, $callback);

while ($channel->is_consuming()) {
    $channel->wait();
}
