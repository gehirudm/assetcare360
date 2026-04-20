<?php

require_once __DIR__ . '/../models/ServiceTicket.php';
require_once __DIR__ . '/../models/Vehicle.php';
require_once __DIR__ . '/../models/Machine.php';
require_once __DIR__ . '/../models/User.php';

/**
 * Service ticket business logic.
 */
class ServiceTicketService {
    private $serviceTicketModel;
    private $vehicleModel;
    private $machineModel;
    private $userModel;

    public function __construct() {
        $this->serviceTicketModel = new ServiceTicket();
        $this->vehicleModel = new Vehicle();
        $this->machineModel = new Machine();
        $this->userModel = new User();
    }

    public function getTechnicians() {
        return $this->userModel->getTechnicalOfficersWithWorkload(true);
    }

    public function getAll(array $filters, array $currentUser) {
        $role = $currentUser['role'] ?? '';
        if ($role === 'Technical Officer') {
            $filters['assigned_to'] = (int) ($currentUser['id'] ?? 0);
            // Technical Officers should see their own queue plus unassigned tickets awaiting pickup.
            $filters['include_unassigned'] = true;
        }

        $sortBy = strtolower(trim((string) ($filters['sort_by'] ?? 'created')));
        $sortDir = strtolower(trim((string) ($filters['sort_dir'] ?? 'desc')));
        $orderBy = 'st.created_at DESC';

        if ($sortBy === 'priority') {
            $orderBy = 'st.priority ' . ($sortDir === 'asc' ? 'ASC' : 'DESC');
        } elseif ($sortBy === 'scheduled_date') {
            $orderBy = 'st.scheduled_date ' . ($sortDir === 'asc' ? 'ASC' : 'DESC');
        } elseif ($sortDir === 'asc') {
            $orderBy = 'st.created_at ASC';
        }

        $tickets = $this->serviceTicketModel->getAllServiceTickets($filters, $orderBy);
        $counts = $this->serviceTicketModel->getStatusCounts([
            'assigned_to' => $filters['assigned_to'] ?? null,
            'include_unassigned' => !empty($filters['include_unassigned']),
            'reported_by' => $filters['reported_by'] ?? null,
        ]);

        return [
            'tickets' => $tickets,
            'counts' => $counts,
        ];
    }

    public function getById($id, array $currentUser) {
        $ticket = $this->serviceTicketModel->getServiceTicketById($id);
        if (!$ticket) {
            return [
                'success' => false,
                'status' => 404,
                'message' => 'Service ticket not found',
            ];
        }

        $role = $currentUser['role'] ?? '';
        $userId = (int) ($currentUser['id'] ?? 0);

        $assignedTo = (int) ($ticket['assigned_to'] ?? 0);
        if ($role === 'Technical Officer' && $assignedTo > 0 && $assignedTo !== $userId) {
            return [
                'success' => false,
                'status' => 403,
                'message' => 'You can only view your assigned or unassigned service tickets',
            ];
        }

        return [
            'success' => true,
            'data' => $ticket,
        ];
    }

    public function create(array $data, array $currentUser) {
        $errors = $this->validateCreatePayload($data);
        if (!empty($errors)) {
            return [
                'success' => false,
                'status' => 422,
                'message' => 'Validation failed',
                'errors' => $errors,
            ];
        }

        $asset = $this->resolveAsset($data['asset_type'], (int) $data['asset_id']);
        if (!$asset) {
            return [
                'success' => false,
                'status' => 404,
                'message' => 'Selected asset not found',
            ];
        }

        $assignedTo = $this->normalizeNullableInt($data['assigned_to'] ?? null);
        if (($data['assigned_to'] ?? null) !== null && ($data['assigned_to'] ?? '') !== '' && $assignedTo === false) {
            return [
                'success' => false,
                'status' => 422,
                'message' => 'Validation failed',
                'errors' => ['assigned_to' => 'Assigned technical officer must be a valid integer ID'],
            ];
        }

        if ($assignedTo !== null) {
            $technician = $this->validateTechnician($assignedTo);
            if (!$technician['success']) {
                return $technician;
            }
        }

        $estimatedCost = $this->normalizeNullableDecimal($data['estimated_cost'] ?? null);
        if ($estimatedCost === false) {
            return [
                'success' => false,
                'status' => 422,
                'message' => 'Validation failed',
                'errors' => ['estimated_cost' => 'Estimated cost must be a valid number'],
            ];
        }

        $title = trim((string) ($data['title'] ?? ''));
        if ($title === '') {
            $title = sprintf('%s - %s', $asset['asset_name'], trim((string) $data['service_type']));
        }

        $ticketData = [
            'asset_type' => strtolower((string) $data['asset_type']),
            'asset_id' => (int) $data['asset_id'],
            'title' => $title,
            'description' => trim((string) $data['description']),
            'service_type' => trim((string) $data['service_type']),
            'priority' => $this->normalizePriority($data['priority'] ?? ServiceTicket::PRIORITY_MEDIUM),
            'status' => $assignedTo ? ServiceTicket::STATUS_ASSIGNED : ServiceTicket::STATUS_PENDING_ASSIGNMENT,
            'scheduled_date' => $this->normalizeDate($data['scheduled_date'] ?? null),
            'reported_by' => (int) ($currentUser['id'] ?? 0),
            'assigned_to' => $assignedTo,
            'assigned_by' => $assignedTo ? (int) ($currentUser['id'] ?? 0) : null,
            'maintenance_notes' => $this->normalizeNullableString($data['maintenance_notes'] ?? null),
            'estimated_cost' => $estimatedCost,
        ];

        $ticketId = $this->serviceTicketModel->createServiceTicket($ticketData);
        if (!$ticketId) {
            return [
                'success' => false,
                'status' => 500,
                'message' => 'Failed to create service ticket',
            ];
        }

        $ticket = $this->serviceTicketModel->getServiceTicketById((int) $ticketId);

        return [
            'success' => true,
            'status' => 201,
            'message' => 'Service ticket created successfully',
            'data' => $ticket,
        ];
    }

    public function update($id, array $data, array $currentUser) {
        $ticket = $this->serviceTicketModel->getServiceTicketById($id);
        if (!$ticket) {
            return [
                'success' => false,
                'status' => 404,
                'message' => 'Service ticket not found',
            ];
        }

        $updateData = [];

        if (array_key_exists('title', $data)) {
            $title = trim((string) $data['title']);
            if ($title === '') {
                return [
                    'success' => false,
                    'status' => 422,
                    'message' => 'Validation failed',
                    'errors' => ['title' => 'Title cannot be empty'],
                ];
            }
            $updateData['title'] = $title;
        }

        if (array_key_exists('description', $data)) {
            $description = trim((string) $data['description']);
            if ($description === '') {
                return [
                    'success' => false,
                    'status' => 422,
                    'message' => 'Validation failed',
                    'errors' => ['description' => 'Description cannot be empty'],
                ];
            }
            $updateData['description'] = $description;
        }

        if (array_key_exists('service_type', $data)) {
            $serviceType = trim((string) $data['service_type']);
            if ($serviceType === '') {
                return [
                    'success' => false,
                    'status' => 422,
                    'message' => 'Validation failed',
                    'errors' => ['service_type' => 'Service type is required'],
                ];
            }
            $updateData['service_type'] = $serviceType;
        }

        if (array_key_exists('priority', $data)) {
            $priority = $this->normalizePriority($data['priority']);
            if (!$priority) {
                return [
                    'success' => false,
                    'status' => 422,
                    'message' => 'Validation failed',
                    'errors' => ['priority' => 'Invalid priority value'],
                ];
            }
            $updateData['priority'] = $priority;
        }

        if (array_key_exists('scheduled_date', $data)) {
            $scheduledDate = $this->normalizeDate($data['scheduled_date']);
            if ($data['scheduled_date'] !== null && $data['scheduled_date'] !== '' && $scheduledDate === null) {
                return [
                    'success' => false,
                    'status' => 422,
                    'message' => 'Validation failed',
                    'errors' => ['scheduled_date' => 'Scheduled date must be in YYYY-MM-DD format'],
                ];
            }
            $updateData['scheduled_date'] = $scheduledDate;
        }

        if (array_key_exists('maintenance_notes', $data)) {
            $updateData['maintenance_notes'] = $this->normalizeNullableString($data['maintenance_notes']);
        }

        if (array_key_exists('estimated_cost', $data)) {
            $estimate = $this->normalizeNullableDecimal($data['estimated_cost']);
            if ($estimate === false) {
                return [
                    'success' => false,
                    'status' => 422,
                    'message' => 'Validation failed',
                    'errors' => ['estimated_cost' => 'Estimated cost must be a valid number'],
                ];
            }
            $updateData['estimated_cost'] = $estimate;
        }

        if (array_key_exists('status', $data)) {
            $status = $this->normalizeStatus($data['status']);
            if (!$status) {
                return [
                    'success' => false,
                    'status' => 422,
                    'message' => 'Validation failed',
                    'errors' => ['status' => 'Invalid status value'],
                ];
            }
            $updateData['status'] = $status;
        }

        if (array_key_exists('assigned_to', $data)) {
            $assignedTo = $this->normalizeNullableInt($data['assigned_to']);
            if (($data['assigned_to'] ?? null) !== null && ($data['assigned_to'] ?? '') !== '' && $assignedTo === false) {
                return [
                    'success' => false,
                    'status' => 422,
                    'message' => 'Validation failed',
                    'errors' => ['assigned_to' => 'Assigned technical officer must be a valid integer ID'],
                ];
            }

            if ($assignedTo !== null) {
                $technician = $this->validateTechnician($assignedTo);
                if (!$technician['success']) {
                    return $technician;
                }

                $updateData['assigned_to'] = $assignedTo;
                $updateData['assigned_by'] = (int) ($currentUser['id'] ?? 0);

                $status = $updateData['status'] ?? (string) ($ticket['status'] ?? ServiceTicket::STATUS_PENDING_ASSIGNMENT);
                if (in_array($status, [ServiceTicket::STATUS_PENDING_ASSIGNMENT, ServiceTicket::STATUS_ASSIGNED], true)) {
                    $updateData['status'] = ServiceTicket::STATUS_ASSIGNED;
                }
            } else {
                $updateData['assigned_to'] = null;
                $updateData['assigned_by'] = null;

                $status = $updateData['status'] ?? (string) ($ticket['status'] ?? ServiceTicket::STATUS_PENDING_ASSIGNMENT);
                if (in_array($status, [ServiceTicket::STATUS_PENDING_ASSIGNMENT, ServiceTicket::STATUS_ASSIGNED], true)) {
                    $updateData['status'] = ServiceTicket::STATUS_PENDING_ASSIGNMENT;
                }
            }
        }

        if (empty($updateData)) {
            return [
                'success' => false,
                'status' => 400,
                'message' => 'No valid fields provided for update',
            ];
        }

        $updated = $this->serviceTicketModel->updateServiceTicket((int) $ticket['id'], $updateData);
        if (!$updated) {
            return [
                'success' => false,
                'status' => 500,
                'message' => 'Failed to update service ticket',
            ];
        }

        $serviceTicket = $this->serviceTicketModel->getServiceTicketById((int) $ticket['id']);

        return [
            'success' => true,
            'message' => 'Service ticket updated successfully',
            'data' => $serviceTicket,
        ];
    }

    public function start($id, array $currentUser, array $data = []) {
        $ticket = $this->serviceTicketModel->getServiceTicketById($id);
        if (!$ticket) {
            return [
                'success' => false,
                'status' => 404,
                'message' => 'Service ticket not found',
            ];
        }

        $role = $currentUser['role'] ?? '';
        $userId = (int) ($currentUser['id'] ?? 0);
        $assignedTo = (int) ($ticket['assigned_to'] ?? 0);

        if ($role === 'Technical Officer' && $assignedTo !== $userId) {
            return [
                'success' => false,
                'status' => 403,
                'message' => 'You can only start service tickets assigned to you',
            ];
        }

        if ($assignedTo <= 0) {
            return [
                'success' => false,
                'status' => 400,
                'message' => 'Service ticket must be assigned before work can start',
            ];
        }

        $expectedCompletionDateInput = $data['expected_completion_date'] ?? null;
        $expectedCompletionDate = $this->normalizeDate($expectedCompletionDateInput);

        if ($expectedCompletionDateInput !== null && $expectedCompletionDateInput !== '' && $expectedCompletionDate === null) {
            return [
                'success' => false,
                'status' => 422,
                'message' => 'Validation failed',
                'errors' => ['expected_completion_date' => 'Expected completion date must be in YYYY-MM-DD format'],
            ];
        }

        if ($role === 'Technical Officer' && !$expectedCompletionDate) {
            return [
                'success' => false,
                'status' => 422,
                'message' => 'Validation failed',
                'errors' => ['expected_completion_date' => 'Expected completion date is required when starting a service ticket'],
            ];
        }

        if ($expectedCompletionDate) {
            $expectedTimestamp = strtotime($expectedCompletionDate . ' 00:00:00');
            $todayTimestamp = strtotime(date('Y-m-d') . ' 00:00:00');

            if ($expectedTimestamp !== false && $todayTimestamp !== false && $expectedTimestamp < $todayTimestamp) {
                return [
                    'success' => false,
                    'status' => 422,
                    'message' => 'Validation failed',
                    'errors' => ['expected_completion_date' => 'Expected completion date cannot be in the past'],
                ];
            }
        }

        $currentStatus = (string) ($ticket['status'] ?? '');
        if (!in_array($currentStatus, [ServiceTicket::STATUS_ASSIGNED, ServiceTicket::STATUS_IN_PROGRESS], true)) {
            return [
                'success' => false,
                'status' => 400,
                'message' => 'Only assigned service tickets can be started',
            ];
        }

        $startPayload = [
            'status' => ServiceTicket::STATUS_IN_PROGRESS,
            'started_at' => date('Y-m-d H:i:s'),
        ];

        if ($expectedCompletionDate) {
            // We reuse scheduled_date as expected completion date throughout service-ticket detail views.
            $startPayload['scheduled_date'] = $expectedCompletionDate;
        }

        $updated = $this->serviceTicketModel->updateServiceTicket((int) $ticket['id'], $startPayload);

        if (!$updated) {
            return [
                'success' => false,
                'status' => 500,
                'message' => 'Failed to start service ticket',
            ];
        }

        return [
            'success' => true,
            'message' => 'Service ticket moved to In Progress',
            'data' => $this->serviceTicketModel->getServiceTicketById((int) $ticket['id']),
        ];
    }

    public function complete($id, array $data, array $currentUser) {
        $ticket = $this->serviceTicketModel->getServiceTicketById($id);
        if (!$ticket) {
            return [
                'success' => false,
                'status' => 404,
                'message' => 'Service ticket not found',
            ];
        }

        $role = $currentUser['role'] ?? '';
        $userId = (int) ($currentUser['id'] ?? 0);
        $assignedTo = (int) ($ticket['assigned_to'] ?? 0);

        if ($role === 'Technical Officer' && $assignedTo !== $userId) {
            return [
                'success' => false,
                'status' => 403,
                'message' => 'You can only complete service tickets assigned to you',
            ];
        }

        $completionNotes = trim((string) ($data['completion_notes'] ?? ''));
        if ($completionNotes === '') {
            return [
                'success' => false,
                'status' => 422,
                'message' => 'Validation failed',
                'errors' => ['completion_notes' => 'Completion notes are required'],
            ];
        }

        $actualCost = $this->normalizeNullableDecimal($data['actual_cost'] ?? null);
        if ($actualCost === false) {
            return [
                'success' => false,
                'status' => 422,
                'message' => 'Validation failed',
                'errors' => ['actual_cost' => 'Actual cost must be a valid number'],
            ];
        }

        $nextServiceDate = $this->normalizeDate($data['next_service_date'] ?? null);
        if (($data['next_service_date'] ?? null) !== null && ($data['next_service_date'] ?? '') !== '' && $nextServiceDate === null) {
            return [
                'success' => false,
                'status' => 422,
                'message' => 'Validation failed',
                'errors' => ['next_service_date' => 'Next service date must be in YYYY-MM-DD format'],
            ];
        }

        $serviceMeterReading = $this->normalizeNullableInt($data['service_meter_reading'] ?? null);
        if (($data['service_meter_reading'] ?? null) !== null && ($data['service_meter_reading'] ?? '') !== '' && $serviceMeterReading === false) {
            return [
                'success' => false,
                'status' => 422,
                'message' => 'Validation failed',
                'errors' => ['service_meter_reading' => 'Service meter reading must be a valid integer'],
            ];
        }

        $warrantyAction = strtolower(trim((string) ($data['warranty_action'] ?? 'none')));
        if (!in_array($warrantyAction, ['none', 'covered', 'voided'], true)) {
            return [
                'success' => false,
                'status' => 422,
                'message' => 'Validation failed',
                'errors' => ['warranty_action' => 'Warranty action must be one of none, covered, or voided'],
            ];
        }

        $warrantyVoidReason = $this->normalizeNullableString($data['warranty_void_reason'] ?? null);
        if ($warrantyAction === 'voided' && !$warrantyVoidReason) {
            return [
                'success' => false,
                'status' => 422,
                'message' => 'Validation failed',
                'errors' => ['warranty_void_reason' => 'Warranty void reason is required when warranty action is voided'],
            ];
        }

        $componentComments = $this->normalizeComponentComments($data['component_comments'] ?? null);
        if ($componentComments === false) {
            return [
                'success' => false,
                'status' => 422,
                'message' => 'Validation failed',
                'errors' => ['component_comments' => 'Component comments must be an array of { component, comment } objects'],
            ];
        }

        $componentCommentsPayload = null;
        if (!empty($componentComments)) {
            $encodedComments = json_encode($componentComments, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if ($encodedComments === false) {
                return [
                    'success' => false,
                    'status' => 500,
                    'message' => 'Failed to serialize component comments',
                ];
            }

            $componentCommentsPayload = $encodedComments;
        }

        $updateData = [
            'status' => ServiceTicket::STATUS_COMPLETED,
            'completed_at' => date('Y-m-d H:i:s'),
            'completion_notes' => $completionNotes,
            'component_comments' => $componentCommentsPayload,
            'actual_cost' => $actualCost,
            'next_service_date' => $nextServiceDate,
            'service_meter_reading' => $serviceMeterReading,
            'warranty_action' => $warrantyAction,
            'warranty_void_reason' => $warrantyAction === 'voided' ? $warrantyVoidReason : null,
            'warranty_voided_at' => $warrantyAction === 'voided' ? date('Y-m-d H:i:s') : null,
        ];

        $updated = $this->serviceTicketModel->updateServiceTicket((int) $ticket['id'], $updateData);
        if (!$updated) {
            return [
                'success' => false,
                'status' => 500,
                'message' => 'Failed to complete service ticket',
            ];
        }

        $assetUpdate = [
            'updated_by' => $userId,
            'last_service_date' => date('Y-m-d'),
        ];

        if ($nextServiceDate) {
            $assetUpdate['next_service_date'] = $nextServiceDate;
        }

        if ($serviceMeterReading !== null) {
            if ($ticket['asset_type'] === 'vehicle') {
                $assetUpdate['current_mileage'] = $serviceMeterReading;
                $assetUpdate['last_service_mileage'] = $serviceMeterReading;
            } else {
                $assetUpdate['current_operating_hours'] = $serviceMeterReading;
                $assetUpdate['last_service_hours'] = $serviceMeterReading;
            }
        }

        if ($warrantyAction === 'voided') {
            $assetUpdate['warranty_status'] = 'Voided';
            $assetUpdate['warranty_void_reason'] = $warrantyVoidReason;
            $assetUpdate['warranty_voided_at'] = date('Y-m-d H:i:s');
            $assetUpdate['warranty_voided_by'] = $userId;
        } elseif ($warrantyAction === 'covered') {
            $assetUpdate['warranty_status'] = 'Active';
            $assetUpdate['warranty_void_reason'] = null;
            $assetUpdate['warranty_voided_at'] = null;
            $assetUpdate['warranty_voided_by'] = null;
        }

        $assetResult = $this->updateAsset((string) $ticket['asset_type'], (int) $ticket['asset_id'], $assetUpdate);
        if (!$assetResult['success']) {
            return $assetResult;
        }

        return [
            'success' => true,
            'message' => 'Service ticket completed successfully',
            'data' => $this->serviceTicketModel->getServiceTicketById((int) $ticket['id']),
        ];
    }

    public function updateAssetWarranty(string $assetType, int $assetId, array $data, array $currentUser) {
        $normalizedAssetType = strtolower(trim($assetType));
        if (!in_array($normalizedAssetType, ['vehicle', 'machine'], true)) {
            return [
                'success' => false,
                'status' => 422,
                'message' => 'Validation failed',
                'errors' => ['asset_type' => 'Asset type must be vehicle or machine'],
            ];
        }

        if ($assetId <= 0) {
            return [
                'success' => false,
                'status' => 422,
                'message' => 'Validation failed',
                'errors' => ['asset_id' => 'Invalid asset ID'],
            ];
        }

        $status = trim((string) ($data['status'] ?? ''));
        if (!in_array($status, ['Active', 'Expired', 'Voided'], true)) {
            return [
                'success' => false,
                'status' => 422,
                'message' => 'Validation failed',
                'errors' => ['status' => 'Warranty status must be Active, Expired, or Voided'],
            ];
        }

        $reason = $this->normalizeNullableString($data['reason'] ?? null);
        if ($status === 'Voided' && !$reason) {
            return [
                'success' => false,
                'status' => 422,
                'message' => 'Validation failed',
                'errors' => ['reason' => 'Reason is required when voiding warranty'],
            ];
        }

        $updateData = [
            'updated_by' => (int) ($currentUser['id'] ?? 0),
            'warranty_status' => $status,
            'warranty_void_reason' => $status === 'Voided' ? $reason : null,
            'warranty_voided_at' => $status === 'Voided' ? date('Y-m-d H:i:s') : null,
            'warranty_voided_by' => $status === 'Voided' ? (int) ($currentUser['id'] ?? 0) : null,
        ];

        return $this->updateAsset($normalizedAssetType, $assetId, $updateData);
    }

    private function validateCreatePayload(array $data) {
        $errors = [];

        $assetType = strtolower(trim((string) ($data['asset_type'] ?? '')));
        if (!in_array($assetType, ['vehicle', 'machine'], true)) {
            $errors['asset_type'] = 'Asset type must be vehicle or machine';
        }

        if (empty($data['asset_id']) || !is_numeric($data['asset_id']) || (int) $data['asset_id'] <= 0) {
            $errors['asset_id'] = 'A valid asset ID is required';
        }

        $description = trim((string) ($data['description'] ?? ''));
        if ($description === '') {
            $errors['description'] = 'Description is required';
        }

        $serviceType = trim((string) ($data['service_type'] ?? ''));
        if ($serviceType === '') {
            $errors['service_type'] = 'Service type is required';
        }

        if (!empty($data['priority'])) {
            $priority = $this->normalizePriority($data['priority']);
            if (!$priority) {
                $errors['priority'] = 'Invalid priority value';
            }
        }

        if (array_key_exists('scheduled_date', $data) && $data['scheduled_date'] !== null && $data['scheduled_date'] !== '') {
            if ($this->normalizeDate($data['scheduled_date']) === null) {
                $errors['scheduled_date'] = 'Scheduled date must be in YYYY-MM-DD format';
            }
        }

        return $errors;
    }

    private function resolveAsset(string $assetType, int $assetId) {
        if ($assetType === 'vehicle') {
            $vehicle = $this->vehicleModel->findById($assetId);
            if (!$vehicle) {
                return null;
            }

            return [
                'asset_name' => $vehicle['vehicle_name'] ?? ('Vehicle #' . $assetId),
                'asset_code' => $vehicle['vehicle_id'] ?? ('Vehicle #' . $assetId),
            ];
        }

        $machine = $this->machineModel->findById($assetId);
        if (!$machine) {
            return null;
        }

        return [
            'asset_name' => $machine['machine_name'] ?? ('Machine #' . $assetId),
            'asset_code' => $machine['machine_id'] ?? ('Machine #' . $assetId),
        ];
    }

    private function validateTechnician(int $technicianId) {
        $technician = $this->userModel->findById($technicianId);
        if (!$technician) {
            return [
                'success' => false,
                'status' => 404,
                'message' => 'Selected technician not found',
            ];
        }

        if (($technician['role'] ?? '') !== 'Technical Officer') {
            return [
                'success' => false,
                'status' => 422,
                'message' => 'Assigned user must be a Technical Officer',
            ];
        }

        if ((int) ($technician['is_active'] ?? 0) !== 1) {
            return [
                'success' => false,
                'status' => 422,
                'message' => 'Assigned Technical Officer is inactive',
            ];
        }

        return ['success' => true];
    }

    private function updateAsset(string $assetType, int $assetId, array $updateData) {
        try {
            if ($assetType === 'vehicle') {
                $asset = $this->vehicleModel->findById($assetId);
                if (!$asset) {
                    return [
                        'success' => false,
                        'status' => 404,
                        'message' => 'Vehicle not found',
                    ];
                }

                $success = $this->vehicleModel->updateVehicle($assetId, $updateData);
                if (!$success) {
                    return [
                        'success' => false,
                        'status' => 500,
                        'message' => 'Failed to update vehicle warranty/service details',
                    ];
                }

                return [
                    'success' => true,
                    'data' => $this->vehicleModel->findById($assetId),
                ];
            }

            $asset = $this->machineModel->findById($assetId);
            if (!$asset) {
                return [
                    'success' => false,
                    'status' => 404,
                    'message' => 'Machine not found',
                ];
            }

            $success = $this->machineModel->updateMachine($assetId, $updateData);
            if (!$success) {
                return [
                    'success' => false,
                    'status' => 500,
                    'message' => 'Failed to update machine warranty/service details',
                ];
            }

            return [
                'success' => true,
                'data' => $this->machineModel->findById($assetId),
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'status' => 500,
                'message' => 'Failed to update asset data: ' . $e->getMessage(),
            ];
        }
    }

    private function normalizePriority($value) {
        $priority = trim((string) $value);
        foreach (ServiceTicket::getValidPriorities() as $validPriority) {
            if (strcasecmp($priority, $validPriority) === 0) {
                return $validPriority;
            }
        }

        return null;
    }

    private function normalizeStatus($value) {
        $status = trim((string) $value);
        foreach (ServiceTicket::getValidStatuses() as $validStatus) {
            if (strcasecmp($status, $validStatus) === 0) {
                return $validStatus;
            }
        }

        return null;
    }

    private function normalizeDate($value) {
        if ($value === null || $value === '') {
            return null;
        }

        $date = trim((string) $value);
        $parsed = DateTime::createFromFormat('Y-m-d', $date);
        if (!$parsed || $parsed->format('Y-m-d') !== $date) {
            return null;
        }

        return $date;
    }

    private function normalizeNullableString($value) {
        if ($value === null) {
            return null;
        }

        $normalized = trim((string) $value);
        return $normalized !== '' ? $normalized : null;
    }

    private function normalizeNullableDecimal($value) {
        if ($value === null || $value === '') {
            return null;
        }

        if (!is_numeric($value)) {
            return false;
        }

        return (float) $value;
    }

    private function normalizeNullableInt($value) {
        if ($value === null || $value === '') {
            return null;
        }

        if (filter_var($value, FILTER_VALIDATE_INT) === false) {
            return false;
        }

        return (int) $value;
    }

    private function normalizeComponentComments($value) {
        if ($value === null || $value === '') {
            return [];
        }

        if (!is_array($value)) {
            return false;
        }

        $normalized = [];

        foreach ($value as $entry) {
            if (is_string($entry)) {
                $comment = trim($entry);
                if ($comment !== '') {
                    $normalized[] = [
                        'component' => 'General',
                        'comment' => $comment,
                    ];
                }
                continue;
            }

            if (!is_array($entry)) {
                continue;
            }

            $component = '';
            foreach (['component', 'name', 'label', 'part_name', 'part'] as $key) {
                if (!empty($entry[$key])) {
                    $component = trim((string) $entry[$key]);
                    break;
                }
            }

            $comment = '';
            foreach (['comment', 'notes', 'note'] as $key) {
                if (!empty($entry[$key])) {
                    $comment = trim((string) $entry[$key]);
                    break;
                }
            }

            if ($comment === '') {
                continue;
            }

            $normalized[] = [
                'component' => $component !== '' ? $component : 'General',
                'comment' => $comment,
            ];
        }

        return $normalized;
    }
}
