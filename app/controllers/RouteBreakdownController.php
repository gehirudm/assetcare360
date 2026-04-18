<?php

require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../models/Notification.php';
require_once __DIR__ . '/../services/TripService.php';
require_once __DIR__ . '/../services/FaultTicketService.php';

/**
 * Route Breakdown Controller
 * Handles route breakdown CRUD and garage workflow endpoints.
 */
class RouteBreakdownController {
    private $conn;
    private Notification $notificationModel;
    private TripService $tripService;
    private FaultTicketService $faultTicketService;
    private ?bool $dangerousSnapshotColumnsAvailable = null;

    public function __construct() {
        $db = Database::getInstance();
        $this->conn = $db->getConnection();
        $this->notificationModel = new Notification();
        $this->tripService = new TripService();
        $this->faultTicketService = new FaultTicketService();
    }

    /**
     * Get all route breakdowns
     * GET /api/route-breakdowns
     */
    public function index() {
        RoleMiddleware::requireMinRole('Driver');

        $currentUser = RoleMiddleware::getCurrentUser();
        $where = [];
        $params = [];

        if (($currentUser['role'] ?? '') === 'Driver') {
            $where[] = 'rb.driver_id = ?';
            $params[] = (int) $currentUser['id'];
        }

        if (!empty($_GET['status'])) {
            $where[] = '(rb.status = ? OR ft.status = ? OR rgw.workflow_status = ?)';
            $params[] = $_GET['status'];
            $params[] = $_GET['status'];
            $params[] = $_GET['status'];
        }

        if (!empty($_GET['severity'])) {
            $where[] = 'rb.severity = ?';
            $params[] = $_GET['severity'];
        }

        if (!empty($_GET['breakdown_type'])) {
            $where[] = 'rb.breakdown_type = ?';
            $params[] = $_GET['breakdown_type'];
        }

        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

        $sql = "SELECT rb.*,
                       v.number_plate,
                       u.full_name as driver_name,
                       ft.ticket_id as fault_ticket_number,
                       ft.status as ticket_status,
                       ft.id as fault_ticket_id,
                       rgw.workflow_status as garage_workflow_status,
                       rgw.approved_garage_id,
                       rgw.approved_at,
                       rgw.garage_entry_at,
                       rgw.completed_at,
                       rgw.bill_amount,
                       rgw.bill_image_path,
                       rgw.completion_remarks,
                       g.name as approved_garage_name,
                       g.address as approved_garage_address,
                       g.phone as approved_garage_phone
                FROM vehicle_breakdown_inroute rb
                LEFT JOIN vehicles v ON rb.vehicle_id = v.id
                LEFT JOIN users u ON rb.driver_id = u.id
                LEFT JOIN fault_tickets ft ON ft.breakdown_report_id = rb.route_breakdown_id AND ft.breakdown_type = 'route_breakdown'
                LEFT JOIN route_breakdown_garage_workflow rgw ON rgw.route_breakdown_id = rb.id
                LEFT JOIN garages g ON rgw.approved_garage_id = g.id
                $whereClause
                ORDER BY rb.breakdown_datetime DESC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        $breakdowns = $stmt->fetchAll();

        foreach ($breakdowns as &$breakdown) {
            $breakdown['assigned_technicians'] = [];

            if (!empty($breakdown['fault_ticket_id'])) {
                $techSql = "SELECT u.full_name as technician_name, u.phone as technician_phone
                            FROM fault_ticket_assignments fta
                            JOIN users u ON fta.assigned_to = u.id
                            WHERE fta.fault_ticket_id = ? AND fta.status = 'Active'";
                $techStmt = $this->conn->prepare($techSql);
                $techStmt->execute([$breakdown['fault_ticket_id']]);
                $breakdown['assigned_technicians'] = $techStmt->fetchAll();
            }

            $breakdown['garage_workflow'] = $this->extractGarageWorkflowSummary($breakdown);
            $breakdown['has_garage_workflow'] = !empty($breakdown['garage_workflow']);
        }

        Response::success(['breakdowns' => $breakdowns, 'count' => count($breakdowns)]);
    }

    /**
     * Get single route breakdown
     * GET /api/route-breakdowns/:id
     */
    public function show() {
        RoleMiddleware::requireMinRole('Driver');

        $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
        if ($id <= 0) {
            Response::error('Route breakdown ID required', 400);
        }

        $sql = "SELECT rb.*,
                       v.number_plate,
                       v.model_number as make,
                       v.vehicle_name as model,
                       u.full_name as driver_name,
                       u.phone as driver_phone,
                       ft.ticket_id as fault_ticket_number,
                       ft.status as ticket_status,
                       ft.id as fault_ticket_id,
                       ft.resolution_notes,
                       ft.resolved_at,
                       rgw.workflow_status as garage_workflow_status,
                       rgw.approved_garage_id,
                       rgw.approval_notes,
                       rgw.approved_at,
                       rgw.garage_entry_notes,
                       rgw.garage_entry_at,
                       rgw.completed_by,
                       rgw.completed_at,
                       rgw.bill_amount,
                       rgw.bill_image_path,
                       rgw.completion_remarks,
                       g.name as approved_garage_name,
                       g.address as approved_garage_address,
                       g.phone as approved_garage_phone,
                       approver.full_name as approved_by_name,
                       completer.full_name as completed_by_name
                FROM vehicle_breakdown_inroute rb
                LEFT JOIN vehicles v ON rb.vehicle_id = v.id
                LEFT JOIN users u ON rb.driver_id = u.id
                LEFT JOIN fault_tickets ft ON ft.breakdown_report_id = rb.route_breakdown_id AND ft.breakdown_type = 'route_breakdown'
                LEFT JOIN route_breakdown_garage_workflow rgw ON rgw.route_breakdown_id = rb.id
                LEFT JOIN garages g ON rgw.approved_garage_id = g.id
                LEFT JOIN users approver ON rgw.approved_by = approver.id
                LEFT JOIN users completer ON rgw.completed_by = completer.id
                WHERE rb.id = ?";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$id]);
        $breakdown = $stmt->fetch();

        if (!$breakdown) {
            Response::error('Route breakdown not found', 404);
        }

        $currentUser = RoleMiddleware::getCurrentUser();
        if (($currentUser['role'] ?? '') === 'Driver' && (int) $breakdown['driver_id'] !== (int) $currentUser['id']) {
            Response::forbidden('You can only access your own route breakdown reports');
        }

        $breakdown['assigned_technicians'] = [];
        $breakdown['work_updates'] = [];

        if (!empty($breakdown['fault_ticket_id'])) {
            $techSql = "SELECT u.full_name as technician_name, u.phone as technician_phone
                        FROM fault_ticket_assignments fta
                        JOIN users u ON fta.assigned_to = u.id
                        WHERE fta.fault_ticket_id = ? AND fta.status = 'Active'";
            $techStmt = $this->conn->prepare($techSql);
            $techStmt->execute([$breakdown['fault_ticket_id']]);
            $breakdown['assigned_technicians'] = $techStmt->fetchAll();

            $workSql = "SELECT twu.*, u.full_name as technician_name
                        FROM ticket_work_updates twu
                        LEFT JOIN users u ON twu.technical_officer_id = u.id
                        WHERE twu.ticket_id = ?
                        ORDER BY twu.created_at DESC";
            $workStmt = $this->conn->prepare($workSql);
            $workStmt->execute([$breakdown['fault_ticket_id']]);
            $breakdown['work_updates'] = $workStmt->fetchAll();
        }

        $breakdown['garage_workflow'] = $this->extractGarageWorkflowSummary($breakdown);
        $breakdown['garage_updates'] = $this->getGarageUpdates($id);
        $breakdown['available_garages'] = $this->getActiveGarages();

        Response::success(['breakdown' => $breakdown]);
    }

    /**
     * Create route breakdown
     * POST /api/route-breakdowns
     */
    public function create() {
        RoleMiddleware::requireMinRole('Driver');

        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        if (empty($input['vehicle_id']) || empty($input['breakdown_location']) || empty($input['breakdown_datetime']) || empty($input['breakdown_type']) || empty($input['severity']) || empty($input['description'])) {
            Response::error('vehicle_id, breakdown_location, breakdown_datetime, breakdown_type, severity and description are required', 400);
        }

        $breakdownLatitude = $this->parseCoordinate($input['breakdown_latitude'] ?? null, 'breakdown_latitude', -90, 90, true);
        $breakdownLongitude = $this->parseCoordinate($input['breakdown_longitude'] ?? null, 'breakdown_longitude', -180, 180, true);
        $severity = $this->normalizeSeverityInput($input['severity']);
        $currentUser = RoleMiddleware::getCurrentUser();

        $stmt = $this->conn->query('SELECT COUNT(*) FROM vehicle_breakdown_inroute');
        $count = (int) $stmt->fetchColumn() + 1;
        $routeBreakdownId = 'RBD-' . str_pad((string) $count, 3, '0', STR_PAD_LEFT);

        $dangerousContext = $this->tripService->getDangerousCargoContextForVehicle((int) $input['vehicle_id']);
        $dangerousCargoPresent = !empty($dangerousContext['has_dangerous_cargo']) ? 1 : 0;
        $dangerousCargoSummary = !empty($dangerousContext['dangerous_cargo_summary'])
            ? trim((string) $dangerousContext['dangerous_cargo_summary'])
            : null;
        $dangerousCargoTripId = !empty($dangerousContext['dangerous_cargo_trip_id'])
            ? trim((string) $dangerousContext['dangerous_cargo_trip_id'])
            : null;

        if ($dangerousCargoPresent === 1) {
            $severity = 'critical';
        }

        try {
            $this->conn->beginTransaction();

            if ($this->hasDangerousSnapshotColumns()) {
                $sql = "INSERT INTO vehicle_breakdown_inroute
                        (route_breakdown_id, breakdown_id, vehicle_id, driver_id, breakdown_location, breakdown_latitude, breakdown_longitude,
                         breakdown_datetime, breakdown_type, severity, description, dangerous_cargo_present, dangerous_cargo_summary, dangerous_cargo_trip_id, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')";

                $stmt = $this->conn->prepare($sql);
                $stmt->execute([
                    $routeBreakdownId,
                    $input['breakdown_id'] ?? null,
                    (int) $input['vehicle_id'],
                    (int) $currentUser['id'],
                    trim((string) $input['breakdown_location']),
                    $breakdownLatitude,
                    $breakdownLongitude,
                    $input['breakdown_datetime'],
                    trim((string) $input['breakdown_type']),
                    $severity,
                    trim((string) $input['description']),
                    $dangerousCargoPresent,
                    $dangerousCargoSummary,
                    $dangerousCargoTripId,
                ]);
            } else {
                $sql = "INSERT INTO vehicle_breakdown_inroute
                        (route_breakdown_id, breakdown_id, vehicle_id, driver_id, breakdown_location, breakdown_latitude, breakdown_longitude,
                         breakdown_datetime, breakdown_type, severity, description, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')";

                $stmt = $this->conn->prepare($sql);
                $stmt->execute([
                    $routeBreakdownId,
                    $input['breakdown_id'] ?? null,
                    (int) $input['vehicle_id'],
                    (int) $currentUser['id'],
                    trim((string) $input['breakdown_location']),
                    $breakdownLatitude,
                    $breakdownLongitude,
                    $input['breakdown_datetime'],
                    trim((string) $input['breakdown_type']),
                    $severity,
                    trim((string) $input['description']),
                ]);
            }

            $ticketPayload = [
                'vehicle_id' => (int) $input['vehicle_id'],
                'reported_by' => (int) $currentUser['id'],
                'breakdown_report_id' => $routeBreakdownId,
                'breakdown_type' => 'route_breakdown',
                'priority' => $this->mapSeverityToPriority($severity),
                'description' => $this->buildAutoTicketDescription($routeBreakdownId, [
                    'breakdown_type' => $input['breakdown_type'] ?? 'Route Breakdown',
                    'severity' => $severity,
                    'breakdown_datetime' => $input['breakdown_datetime'] ?? null,
                    'breakdown_location' => $input['breakdown_location'] ?? null,
                    'description' => $input['description'] ?? '',
                    'dangerous_cargo_present' => $dangerousCargoPresent,
                    'dangerous_cargo_summary' => $dangerousCargoSummary,
                    'dangerous_cargo_trip_id' => $dangerousCargoTripId,
                ])
            ];

            $ticketResult = $this->faultTicketService->create($ticketPayload);
            if (empty($ticketResult['success'])) {
                $ticketError = $ticketResult['message'] ?? 'Failed to auto-create linked fault ticket';
                throw new RuntimeException($ticketError);
            }

            $this->conn->commit();
        } catch (Throwable $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }

            Response::error('Failed to create route breakdown report: ' . $e->getMessage(), 500);
            return;
        }

        Response::success(['route_breakdown_id' => $routeBreakdownId], 'Route breakdown created successfully', 201);
    }

    private function mapSeverityToPriority($severity): string {
        $normalized = strtolower(trim((string) $severity));

        if ($normalized === 'critical') {
            return 'Critical';
        }

        if ($normalized === 'high') {
            return 'High';
        }

        if ($normalized === 'low') {
            return 'Low';
        }

        return 'Medium';
    }

    private function buildAutoTicketDescription(string $routeBreakdownId, array $input): string {
        $details = trim((string) ($input['description'] ?? ''));
        if ($details !== '') {
            return $details;
        }

        $breakdownType = trim((string) ($input['breakdown_type'] ?? 'Route Breakdown'));
        $breakdownLocation = trim((string) ($input['breakdown_location'] ?? ''));

        $fallback = $breakdownType !== '' ? $breakdownType : 'Route breakdown reported';
        if ($breakdownLocation !== '') {
            $fallback .= ' near ' . $breakdownLocation;
        }

        return $fallback . ' (' . $routeBreakdownId . ')';
    }

    /**
     * Update route breakdown
     * PUT /api/route-breakdowns/:id
     */
    public function update() {
        RoleMiddleware::requireMinRole('Driver');

        $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        if ($id <= 0) {
            Response::error('Route breakdown ID required', 400);
        }

        $currentUser = RoleMiddleware::getCurrentUser();
        $record = $this->getRouteBreakdownRecord($id);

        if (!$record) {
            Response::error('Route breakdown not found', 404);
        }

        if (($currentUser['role'] ?? '') === 'Driver' && (int) $record['driver_id'] !== (int) $currentUser['id']) {
            Response::error('You can only edit your own reports', 403);
        }

        $fields = [];
        $params = [];
        $shouldForceCriticalSeverity = $this->shouldForceCriticalSeverity($record);

        $allowedFields = ['breakdown_type', 'description', 'status', 'breakdown_location', 'breakdown_datetime'];
        foreach ($allowedFields as $field) {
            if (isset($input[$field])) {
                $fields[] = "$field = ?";
                $params[] = is_string($input[$field]) ? trim($input[$field]) : $input[$field];
            }
        }

        if (array_key_exists('severity', $input)) {
            $requestedSeverity = $this->normalizeSeverityInput($input['severity']);
            $fields[] = 'severity = ?';
            $params[] = $shouldForceCriticalSeverity ? 'critical' : $requestedSeverity;
        } elseif ($shouldForceCriticalSeverity && !empty($fields)) {
            $fields[] = 'severity = ?';
            $params[] = 'critical';
        }

        $hasLatitude = array_key_exists('breakdown_latitude', $input);
        $hasLongitude = array_key_exists('breakdown_longitude', $input);
        if ($hasLatitude || $hasLongitude) {
            if (!$hasLatitude || !$hasLongitude) {
                Response::error('Both breakdown_latitude and breakdown_longitude must be provided together', 400);
            }

            $latitudeRaw = $input['breakdown_latitude'];
            $longitudeRaw = $input['breakdown_longitude'];

            $isClearingCoordinates = ($latitudeRaw === null || $latitudeRaw === '') && ($longitudeRaw === null || $longitudeRaw === '');
            if ($isClearingCoordinates) {
                $fields[] = 'breakdown_latitude = ?';
                $params[] = null;
                $fields[] = 'breakdown_longitude = ?';
                $params[] = null;
            } else {
                $latitude = $this->parseCoordinate($latitudeRaw, 'breakdown_latitude', -90, 90, true);
                $longitude = $this->parseCoordinate($longitudeRaw, 'breakdown_longitude', -180, 180, true);

                $fields[] = 'breakdown_latitude = ?';
                $params[] = $latitude;
                $fields[] = 'breakdown_longitude = ?';
                $params[] = $longitude;
            }
        }

        if (empty($fields)) {
            Response::error('No fields to update', 400);
        }

        $params[] = $id;
        $sql = 'UPDATE vehicle_breakdown_inroute SET ' . implode(', ', $fields) . ' WHERE id = ?';

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        Response::success(null, 'Route breakdown updated successfully');
    }

    /**
     * Delete route breakdown
     * DELETE /api/route-breakdowns/:id
     */
    public function delete() {
        RoleMiddleware::requireMinRole('Driver');

        $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
        if ($id <= 0) {
            Response::error('Route breakdown ID required', 400);
        }

        $currentUser = RoleMiddleware::getCurrentUser();
        $record = $this->getRouteBreakdownRecord($id);

        if (!$record) {
            Response::error('Route breakdown not found', 404);
        }

        if (($currentUser['role'] ?? '') === 'Driver' && (int) $record['driver_id'] !== (int) $currentUser['id']) {
            Response::error('You can only delete your own reports', 403);
        }

        $stmt = $this->conn->prepare('DELETE FROM vehicle_breakdown_inroute WHERE id = ?');
        $stmt->execute([$id]);

        Response::success(null, 'Route breakdown deleted successfully');
    }

    /**
     * Get route breakdown statistics
     * GET /api/route-breakdowns/stats
     */
    public function stats() {
        RoleMiddleware::requireMinRole('Supervisor');

        $total = $this->conn->query('SELECT COUNT(*) FROM vehicle_breakdown_inroute')->fetchColumn();

        $byStatus = $this->conn->query('
            SELECT status, COUNT(*) as count
            FROM vehicle_breakdown_inroute
            GROUP BY status
        ')->fetchAll();

        $bySeverity = $this->conn->query('
            SELECT severity, COUNT(*) as count
            FROM vehicle_breakdown_inroute
            GROUP BY severity
        ')->fetchAll();

        $byType = $this->conn->query('
            SELECT breakdown_type, COUNT(*) as count
            FROM vehicle_breakdown_inroute
            GROUP BY breakdown_type
            ORDER BY count DESC
        ')->fetchAll();

        Response::success([
            'total' => $total,
            'by_status' => $byStatus,
            'by_severity' => $bySeverity,
            'by_type' => $byType,
        ]);
    }

    /**
     * Approve a garage for route breakdown repair.
     * POST /api/route-breakdowns/:id/garage-approval
     */
    public function approveGarage() {
        RoleMiddleware::requireMinRole('Supervisor');

        $routeBreakdownId = isset($_GET['id']) ? (int) $_GET['id'] : 0;
        if ($routeBreakdownId <= 0) {
            Response::error('Route breakdown ID required', 400);
        }

        $payload = json_decode(file_get_contents('php://input'), true) ?? [];
        $garageId = isset($payload['garage_id']) ? (int) $payload['garage_id'] : (int) ($payload['approved_garage_id'] ?? 0);
        $approvalNotes = trim((string) ($payload['approval_notes'] ?? ''));

        if ($garageId <= 0) {
            Response::error('garage_id is required', 400);
        }

        $breakdown = $this->getRouteBreakdownRecord($routeBreakdownId);
        if (!$breakdown) {
            Response::error('Route breakdown not found', 404);
        }

        $garageStmt = $this->conn->prepare('SELECT id, name, address, phone FROM garages WHERE id = ? AND is_active = 1 LIMIT 1');
        $garageStmt->execute([$garageId]);
        $garage = $garageStmt->fetch();

        if (!$garage) {
            Response::error('Selected garage is not available', 404);
        }

        $currentUser = RoleMiddleware::getCurrentUser();

        try {
            $this->conn->beginTransaction();

            $existing = $this->getWorkflowRow($routeBreakdownId);
            if ($existing) {
                $update = $this->conn->prepare(
                    "UPDATE route_breakdown_garage_workflow
                     SET workflow_status = 'garage_approved',
                         approved_garage_id = ?,
                         approved_by = ?,
                         approval_notes = ?,
                         approved_at = NOW(),
                         updated_at = NOW()
                     WHERE route_breakdown_id = ?"
                );
                $update->execute([$garageId, (int) $currentUser['id'], $approvalNotes !== '' ? $approvalNotes : null, $routeBreakdownId]);
            } else {
                $insert = $this->conn->prepare(
                    "INSERT INTO route_breakdown_garage_workflow
                     (route_breakdown_id, workflow_status, approved_garage_id, approved_by, approval_notes, approved_at)
                     VALUES (?, 'garage_approved', ?, ?, ?, NOW())"
                );
                $insert->execute([$routeBreakdownId, $garageId, (int) $currentUser['id'], $approvalNotes !== '' ? $approvalNotes : null]);
            }

            $statusStmt = $this->conn->prepare(
                "UPDATE vehicle_breakdown_inroute
                  SET status = CASE WHEN status IN ('Resolved', 'Closed', 'Insurance Claimed') THEN status ELSE 'In Progress' END
                 WHERE id = ?"
            );
            $statusStmt->execute([$routeBreakdownId]);

            $approvalMessage = 'Garage approved: ' . ($garage['name'] ?? 'N/A');
            if ($approvalNotes !== '') {
                $approvalMessage .= ' | Notes: ' . $approvalNotes;
            }

            $this->insertGarageUpdate($routeBreakdownId, (int) $currentUser['id'], 'approval', $approvalMessage, []);

            $this->conn->commit();

            $this->notifyUser(
                (int) $breakdown['driver_id'],
                'Garage Approved for Route Breakdown',
                sprintf('Supervisor approved %s for breakdown %s.', $garage['name'], $breakdown['route_breakdown_id'] ?? ('#' . $routeBreakdownId)),
                'route_breakdown_garage_approved',
                [
                    'route_breakdown_id' => $routeBreakdownId,
                    'garage_id' => (int) $garage['id'],
                    'garage_name' => $garage['name'],
                ]
            );

            Response::success([
                'route_breakdown_id' => $routeBreakdownId,
                'garage' => $garage,
                'garage_workflow' => $this->getWorkflowSummaryByBreakdownId($routeBreakdownId),
            ], 'Garage approved successfully');
        } catch (Throwable $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }
            error_log('RouteBreakdownController::approveGarage error: ' . $e->getMessage());
            Response::serverError('Failed to approve garage');
        }
    }

    /**
     * Driver logs arrival at approved garage.
     * POST /api/route-breakdowns/:id/garage-entry
     */
    public function logGarageEntry() {
        RoleMiddleware::requireMinRole('Driver');

        $routeBreakdownId = isset($_GET['id']) ? (int) $_GET['id'] : 0;
        if ($routeBreakdownId <= 0) {
            Response::error('Route breakdown ID required', 400);
        }

        $payload = json_decode(file_get_contents('php://input'), true) ?? [];
        $entryNote = trim((string) ($payload['entry_notes'] ?? $payload['note'] ?? ''));

        if ($entryNote === '') {
            Response::error('entry_notes is required', 400);
        }

        $currentUser = RoleMiddleware::getCurrentUser();
        $breakdown = $this->getRouteBreakdownRecord($routeBreakdownId);

        if (!$breakdown) {
            Response::error('Route breakdown not found', 404);
        }

        if (($currentUser['role'] ?? '') === 'Driver' && (int) $breakdown['driver_id'] !== (int) $currentUser['id']) {
            Response::forbidden('You can only update your own route breakdown');
        }

        $workflow = $this->getWorkflowRow($routeBreakdownId);
        if (!$workflow) {
            Response::error('Garage must be approved before logging entry', 400);
        }

        if (($workflow['workflow_status'] ?? '') === 'completed') {
            Response::error('This garage workflow is already completed', 400);
        }

        if (!in_array($workflow['workflow_status'], ['garage_approved', 'garage_entry_logged', 'repair_in_progress'], true)) {
            Response::error('Garage entry can only be logged after approval', 400);
        }

        try {
            $this->conn->beginTransaction();

            $update = $this->conn->prepare(
                "UPDATE route_breakdown_garage_workflow
                 SET workflow_status = 'garage_entry_logged',
                     garage_entry_notes = ?,
                     garage_entry_at = NOW(),
                     updated_at = NOW()
                 WHERE route_breakdown_id = ?"
            );
            $update->execute([$entryNote, $routeBreakdownId]);

            $statusStmt = $this->conn->prepare(
                "UPDATE vehicle_breakdown_inroute
                  SET status = CASE WHEN status IN ('Resolved', 'Closed', 'Insurance Claimed') THEN status ELSE 'In Progress' END
                 WHERE id = ?"
            );
            $statusStmt->execute([$routeBreakdownId]);

            $this->insertGarageUpdate($routeBreakdownId, (int) $currentUser['id'], 'entry', $entryNote, []);

            $this->conn->commit();

            $this->notifyRole(
                'Supervisor',
                'Driver Entered Approved Garage',
                sprintf('Driver logged garage entry for breakdown %s.', $breakdown['route_breakdown_id'] ?? ('#' . $routeBreakdownId)),
                'route_breakdown_garage_entry_logged',
                ['route_breakdown_id' => $routeBreakdownId]
            );

            Response::success([
                'route_breakdown_id' => $routeBreakdownId,
                'garage_workflow' => $this->getWorkflowSummaryByBreakdownId($routeBreakdownId),
            ], 'Garage entry logged successfully');
        } catch (Throwable $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }
            error_log('RouteBreakdownController::logGarageEntry error: ' . $e->getMessage());
            Response::serverError('Failed to log garage entry');
        }
    }

    /**
     * Driver submits a garage progress update with up to 5 images.
     * POST /api/route-breakdowns/:id/garage-progress
     */
    public function addGarageProgressUpdate() {
        RoleMiddleware::requireMinRole('Driver');

        $routeBreakdownId = isset($_GET['id']) ? (int) $_GET['id'] : 0;
        if ($routeBreakdownId <= 0) {
            Response::error('Route breakdown ID required', 400);
        }

        $payload = [];
        if (!empty($_POST)) {
            $payload = $_POST;
        } else {
            $payload = json_decode(file_get_contents('php://input'), true) ?? [];
        }

        $progressNote = trim((string) ($payload['progress_note'] ?? $payload['note'] ?? ''));
        if ($progressNote === '') {
            Response::error('progress_note is required', 400);
        }

        $currentUser = RoleMiddleware::getCurrentUser();
        $breakdown = $this->getRouteBreakdownRecord($routeBreakdownId);
        if (!$breakdown) {
            Response::error('Route breakdown not found', 404);
        }

        if (($currentUser['role'] ?? '') === 'Driver' && (int) $breakdown['driver_id'] !== (int) $currentUser['id']) {
            Response::forbidden('You can only update your own route breakdown');
        }

        $workflow = $this->getWorkflowRow($routeBreakdownId);
        if (!$workflow) {
            Response::error('Garage must be approved before progress updates', 400);
        }

        if (!in_array($workflow['workflow_status'], ['garage_entry_logged', 'repair_in_progress'], true)) {
            Response::error('Progress updates are only allowed after garage entry is logged', 400);
        }

        $uploadedPaths = [];

        try {
            $uploadedFiles = $this->normalizeUploadedFileArray($_FILES['progress_images'] ?? null);
            if (count($uploadedFiles) > 5) {
                Response::error('A maximum of 5 progress images is allowed per update', 400);
            }

            if (!empty($uploadedFiles)) {
                $uploadedPaths = $this->storeUploadedImages($uploadedFiles, 'progress', 'progress');
            }

            $this->conn->beginTransaction();

            $workflowUpdate = $this->conn->prepare(
                "UPDATE route_breakdown_garage_workflow
                 SET workflow_status = 'repair_in_progress',
                     updated_at = NOW()
                 WHERE route_breakdown_id = ?"
            );
            $workflowUpdate->execute([$routeBreakdownId]);

            $statusStmt = $this->conn->prepare(
                "UPDATE vehicle_breakdown_inroute
                  SET status = CASE WHEN status IN ('Resolved', 'Closed', 'Insurance Claimed') THEN status ELSE 'In Progress' END
                 WHERE id = ?"
            );
            $statusStmt->execute([$routeBreakdownId]);

            $this->insertGarageUpdate($routeBreakdownId, (int) $currentUser['id'], 'progress', $progressNote, $uploadedPaths);

            $this->conn->commit();

            $this->notifyRole(
                'Supervisor',
                'Garage Progress Update Submitted',
                sprintf('Driver submitted a progress update for breakdown %s.', $breakdown['route_breakdown_id'] ?? ('#' . $routeBreakdownId)),
                'route_breakdown_progress_updated',
                [
                    'route_breakdown_id' => $routeBreakdownId,
                    'image_count' => count($uploadedPaths),
                ]
            );

            Response::success([
                'route_breakdown_id' => $routeBreakdownId,
                'image_paths' => $uploadedPaths,
                'garage_workflow' => $this->getWorkflowSummaryByBreakdownId($routeBreakdownId),
            ], 'Progress update submitted successfully');
        } catch (Throwable $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }
            $this->cleanupUploadedPaths($uploadedPaths);
            error_log('RouteBreakdownController::addGarageProgressUpdate error: ' . $e->getMessage());
            Response::serverError('Failed to submit progress update');
        }
    }

    /**
     * Driver completes garage repair with bill details.
     * POST /api/route-breakdowns/:id/garage-complete
     */
    public function completeGarageRepair() {
        RoleMiddleware::requireMinRole('Driver');

        $routeBreakdownId = isset($_GET['id']) ? (int) $_GET['id'] : 0;
        if ($routeBreakdownId <= 0) {
            Response::error('Route breakdown ID required', 400);
        }

        $payload = [];
        if (!empty($_POST)) {
            $payload = $_POST;
        } else {
            $payload = json_decode(file_get_contents('php://input'), true) ?? [];
        }

        $billAmount = isset($payload['bill_amount']) ? (float) $payload['bill_amount'] : null;
        $completionRemarks = trim((string) ($payload['completion_remarks'] ?? $payload['remarks'] ?? ''));

        if ($billAmount === null || $billAmount <= 0) {
            Response::error('bill_amount must be greater than 0', 400);
        }

        if ($completionRemarks === '') {
            Response::error('completion_remarks is required', 400);
        }

        $billImageFiles = $this->normalizeUploadedFileArray($_FILES['bill_image'] ?? null);
        if (empty($billImageFiles)) {
            Response::error('bill_image is required', 400);
        }

        $currentUser = RoleMiddleware::getCurrentUser();
        $breakdown = $this->getRouteBreakdownRecord($routeBreakdownId);

        if (!$breakdown) {
            Response::error('Route breakdown not found', 404);
        }

        if (($currentUser['role'] ?? '') === 'Driver' && (int) $breakdown['driver_id'] !== (int) $currentUser['id']) {
            Response::forbidden('You can only complete your own route breakdown');
        }

        $workflow = $this->getWorkflowRow($routeBreakdownId);
        if (!$workflow) {
            Response::error('Garage workflow not found for this route breakdown', 400);
        }

        if (($workflow['workflow_status'] ?? '') === 'completed') {
            Response::error('Garage workflow is already completed', 400);
        }

        if (!in_array($workflow['workflow_status'], ['garage_entry_logged', 'repair_in_progress'], true)) {
            Response::error('Breakdown can only be completed after garage entry and progress updates', 400);
        }

        $savedBillImagePaths = [];

        try {
            $savedBillImagePaths = $this->storeUploadedImages([$billImageFiles[0]], 'bills', 'bill');
            $billImagePath = $savedBillImagePaths[0];

            $this->conn->beginTransaction();

            $workflowUpdate = $this->conn->prepare(
                "UPDATE route_breakdown_garage_workflow
                 SET workflow_status = 'completed',
                     completed_by = ?,
                     completed_at = NOW(),
                     bill_amount = ?,
                     bill_image_path = ?,
                     completion_remarks = ?,
                     updated_at = NOW()
                 WHERE route_breakdown_id = ?"
            );
            $workflowUpdate->execute([
                (int) $currentUser['id'],
                $billAmount,
                $billImagePath,
                $completionRemarks,
                $routeBreakdownId,
            ]);

            $breakdownUpdate = $this->conn->prepare("UPDATE vehicle_breakdown_inroute SET status = 'Resolved' WHERE id = ?");
            $breakdownUpdate->execute([$routeBreakdownId]);

            if (!empty($breakdown['fault_ticket_id'])) {
                $ticketUpdate = $this->conn->prepare(
                    "UPDATE fault_tickets
                     SET status = CASE WHEN status = 'Closed' THEN status ELSE 'Resolved' END,
                         resolution_notes = ?,
                         resolved_at = NOW(),
                         updated_at = NOW()
                     WHERE id = ?"
                );

                $resolutionNote = 'Garage repair completed by driver.';
                if ($completionRemarks !== '') {
                    $resolutionNote .= ' Remarks: ' . $completionRemarks;
                }

                $ticketUpdate->execute([$resolutionNote, (int) $breakdown['fault_ticket_id']]);
            }

            $this->insertGarageUpdate(
                $routeBreakdownId,
                (int) $currentUser['id'],
                'completion',
                $completionRemarks,
                [$billImagePath]
            );

            $this->conn->commit();

            $this->notifyRole(
                'Supervisor',
                'Route Breakdown Marked Completed',
                sprintf('Driver completed garage repair for breakdown %s.', $breakdown['route_breakdown_id'] ?? ('#' . $routeBreakdownId)),
                'route_breakdown_garage_completed',
                [
                    'route_breakdown_id' => $routeBreakdownId,
                    'bill_amount' => $billAmount,
                ]
            );

            Response::success([
                'route_breakdown_id' => $routeBreakdownId,
                'bill_amount' => $billAmount,
                'bill_image_path' => $billImagePath,
                'garage_workflow' => $this->getWorkflowSummaryByBreakdownId($routeBreakdownId),
            ], 'Route breakdown completed successfully');
        } catch (Throwable $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }
            $this->cleanupUploadedPaths($savedBillImagePaths);
            error_log('RouteBreakdownController::completeGarageRepair error: ' . $e->getMessage());
            Response::serverError('Failed to complete route breakdown');
        }
    }

    /**
     * List all active garages.
     * GET /api/route-breakdowns/garages
     */
    public function garages() {
        RoleMiddleware::requireMinRole('Driver');
        Response::success(['garages' => $this->getActiveGarages()]);
    }

    private function getRouteBreakdownRecord(int $routeBreakdownId): ?array {
        $sql = "SELECT rb.id, rb.route_breakdown_id, rb.driver_id, rb.status, rb.vehicle_id,
                       rb.dangerous_cargo_present,
                       rb.dangerous_cargo_summary,
                       rb.dangerous_cargo_trip_id,
                       v.number_plate,
                       ft.id as fault_ticket_id,
                       ft.ticket_id as fault_ticket_number
                FROM vehicle_breakdown_inroute rb
                LEFT JOIN vehicles v ON rb.vehicle_id = v.id
                LEFT JOIN fault_tickets ft ON ft.breakdown_report_id = rb.route_breakdown_id AND ft.breakdown_type = 'route_breakdown'
                WHERE rb.id = ?
                LIMIT 1";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$routeBreakdownId]);
        $row = $stmt->fetch();

        return $row ?: null;
    }

    private function getWorkflowRow(int $routeBreakdownId): ?array {
        $stmt = $this->conn->prepare('SELECT * FROM route_breakdown_garage_workflow WHERE route_breakdown_id = ? LIMIT 1');
        $stmt->execute([$routeBreakdownId]);
        $row = $stmt->fetch();

        return $row ?: null;
    }

    private function getWorkflowSummaryByBreakdownId(int $routeBreakdownId): ?array {
        $sql = "SELECT rgw.workflow_status as garage_workflow_status,
                       rgw.approved_garage_id,
                       rgw.approval_notes,
                       rgw.approved_at,
                       rgw.garage_entry_notes,
                       rgw.garage_entry_at,
                       rgw.completed_at,
                       rgw.bill_amount,
                       rgw.bill_image_path,
                       rgw.completion_remarks,
                       g.name as approved_garage_name,
                       g.address as approved_garage_address,
                       g.phone as approved_garage_phone,
                       approver.full_name as approved_by_name,
                       completer.full_name as completed_by_name
                FROM route_breakdown_garage_workflow rgw
                LEFT JOIN garages g ON rgw.approved_garage_id = g.id
                LEFT JOIN users approver ON rgw.approved_by = approver.id
                LEFT JOIN users completer ON rgw.completed_by = completer.id
                WHERE rgw.route_breakdown_id = ?
                LIMIT 1";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$routeBreakdownId]);
        $row = $stmt->fetch();

        if (!$row) {
            return null;
        }

        return $this->extractGarageWorkflowSummary($row);
    }

    private function extractGarageWorkflowSummary(array $source): ?array {
        $status = $source['garage_workflow_status'] ?? null;
        if (!$status) {
            return null;
        }

        $summary = [
            'status' => $status,
            'approved_at' => $source['approved_at'] ?? null,
            'approved_by' => $source['approved_by_name'] ?? null,
            'approval_notes' => $source['approval_notes'] ?? null,
            'garage_entry_at' => $source['garage_entry_at'] ?? null,
            'garage_entry_notes' => $source['garage_entry_notes'] ?? null,
            'completed_at' => $source['completed_at'] ?? null,
            'completed_by' => $source['completed_by_name'] ?? null,
            'bill_amount' => isset($source['bill_amount']) && $source['bill_amount'] !== null ? (float) $source['bill_amount'] : null,
            'bill_image_path' => $source['bill_image_path'] ?? null,
            'completion_remarks' => $source['completion_remarks'] ?? null,
            'approved_garage' => null,
        ];

        if (!empty($source['approved_garage_id'])) {
            $summary['approved_garage'] = [
                'id' => (int) $source['approved_garage_id'],
                'name' => $source['approved_garage_name'] ?? null,
                'address' => $source['approved_garage_address'] ?? null,
                'phone' => $source['approved_garage_phone'] ?? null,
            ];
        }

        return $summary;
    }

    private function getActiveGarages(): array {
        $q = trim((string) ($_GET['q'] ?? ''));
        $city = trim((string) ($_GET['city'] ?? ''));

        $where = ['is_active = 1'];
        $params = [];

        if ($q !== '') {
            $where[] = '(name LIKE ? OR address LIKE ?)';
            $params[] = '%' . $q . '%';
            $params[] = '%' . $q . '%';
        }

        if ($city !== '') {
            $where[] = 'city = ?';
            $params[] = $city;
        }

        $sql = 'SELECT id, name, address, city, latitude, longitude, phone, is_active FROM garages';
        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY name ASC';

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll();
    }

    private function hasDangerousSnapshotColumns(): bool {
        if ($this->dangerousSnapshotColumnsAvailable !== null) {
            return $this->dangerousSnapshotColumnsAvailable;
        }

        try {
            $stmt = $this->conn->prepare(
                "SELECT COUNT(*)
                 FROM information_schema.columns
                 WHERE table_schema = DATABASE()
                   AND table_name = 'vehicle_breakdown_inroute'
                   AND column_name IN ('dangerous_cargo_present', 'dangerous_cargo_summary', 'dangerous_cargo_trip_id')"
            );
            $stmt->execute();
            $this->dangerousSnapshotColumnsAvailable = ((int) $stmt->fetchColumn()) === 3;
        } catch (Throwable $e) {
            $this->dangerousSnapshotColumnsAvailable = false;
        }

        return $this->dangerousSnapshotColumnsAvailable;
    }

    private function shouldForceCriticalSeverity(array $routeBreakdownRecord): bool {
        if ($this->hasDangerousSnapshotColumns() && (int) ($routeBreakdownRecord['dangerous_cargo_present'] ?? 0) === 1) {
            return true;
        }

        $vehicleId = (int) ($routeBreakdownRecord['vehicle_id'] ?? 0);
        if ($vehicleId <= 0) {
            return false;
        }

        $dangerousContext = $this->tripService->getDangerousCargoContextForVehicle($vehicleId);
        return !empty($dangerousContext['has_dangerous_cargo']);
    }

    private function normalizeSeverityInput($severity): string {
        $normalized = strtolower(trim((string) $severity));
        $allowed = ['low', 'medium', 'high', 'critical'];

        if ($normalized === '' || !in_array($normalized, $allowed, true)) {
            Response::error('severity must be one of: low, medium, high, critical', 400);
        }

        return $normalized;
    }

    private function parseCoordinate($value, string $field, float $min, float $max, bool $required): ?float {
        if ($value === null || $value === '') {
            if ($required) {
                Response::error($field . ' is required', 400);
            }
            return null;
        }

        if (!is_numeric($value)) {
            Response::error($field . ' must be numeric', 400);
        }

        $numericValue = (float)$value;
        if ($numericValue < $min || $numericValue > $max) {
            Response::error($field . ' is out of range', 400);
        }

        return round($numericValue, 7);
    }

    private function getGarageUpdates(int $routeBreakdownId): array {
        $sql = "SELECT rgu.*, u.full_name as updated_by_name
                FROM route_breakdown_garage_updates rgu
                LEFT JOIN users u ON rgu.updated_by = u.id
                WHERE rgu.route_breakdown_id = ?
                ORDER BY rgu.created_at DESC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$routeBreakdownId]);
        $updates = $stmt->fetchAll();

        foreach ($updates as &$update) {
            $update['progress_images'] = [];
            if (!empty($update['progress_images_json'])) {
                $decoded = json_decode($update['progress_images_json'], true);
                if (is_array($decoded)) {
                    $update['progress_images'] = array_values($decoded);
                }
            }
        }

        return $updates;
    }

    private function insertGarageUpdate(int $routeBreakdownId, int $updatedBy, string $updateType, string $note, array $imagePaths): void {
        $stmt = $this->conn->prepare(
            "INSERT INTO route_breakdown_garage_updates
             (route_breakdown_id, updated_by, update_type, note, progress_images_json)
             VALUES (?, ?, ?, ?, ?)"
        );

        $stmt->execute([
            $routeBreakdownId,
            $updatedBy,
            $updateType,
            $note,
            !empty($imagePaths) ? json_encode(array_values($imagePaths)) : null,
        ]);
    }

    private function normalizeUploadedFileArray(?array $fileInput): array {
        if (empty($fileInput) || !isset($fileInput['name'])) {
            return [];
        }

        if (!is_array($fileInput['name'])) {
            return [$fileInput];
        }

        $files = [];
        foreach ($fileInput['name'] as $index => $name) {
            $files[] = [
                'name' => $name,
                'type' => $fileInput['type'][$index] ?? '',
                'tmp_name' => $fileInput['tmp_name'][$index] ?? '',
                'error' => $fileInput['error'][$index] ?? UPLOAD_ERR_NO_FILE,
                'size' => $fileInput['size'][$index] ?? 0,
            ];
        }

        return array_values(array_filter($files, static function ($file) {
            return isset($file['error']) && (int) $file['error'] !== UPLOAD_ERR_NO_FILE;
        }));
    }

    private function storeUploadedImages(array $files, string $subDir, string $prefix): array {
        $allowedMimeTypes = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
        ];

        $targetDir = __DIR__ . '/../../uploads/route-breakdowns/' . trim($subDir, '/');
        if (!is_dir($targetDir) && !mkdir($targetDir, 0755, true) && !is_dir($targetDir)) {
            throw new RuntimeException('Failed to prepare upload directory');
        }

        $savedPaths = [];

        foreach ($files as $file) {
            if ((int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                throw new RuntimeException('Image upload failed');
            }

            if ((int) ($file['size'] ?? 0) > 5 * 1024 * 1024) {
                throw new RuntimeException('Each image must be 5MB or smaller');
            }

            $tmpPath = (string) ($file['tmp_name'] ?? '');
            if ($tmpPath === '' || !is_uploaded_file($tmpPath)) {
                throw new RuntimeException('Invalid uploaded file');
            }

            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mimeType = $finfo ? finfo_file($finfo, $tmpPath) : null;
            if ($finfo) {
                finfo_close($finfo);
            }

            if (!$mimeType || !isset($allowedMimeTypes[$mimeType])) {
                throw new RuntimeException('Only JPG, PNG and WEBP images are allowed');
            }

            $extension = $allowedMimeTypes[$mimeType];
            $filename = sprintf('%s_%s_%s.%s', $prefix, date('YmdHis'), bin2hex(random_bytes(6)), $extension);
            $absolutePath = $targetDir . '/' . $filename;

            if (!move_uploaded_file($tmpPath, $absolutePath)) {
                throw new RuntimeException('Failed to save uploaded image');
            }

            $savedPaths[] = 'uploads/route-breakdowns/' . trim($subDir, '/') . '/' . $filename;
        }

        return $savedPaths;
    }

    private function cleanupUploadedPaths(array $paths): void {
        foreach ($paths as $path) {
            $safePath = trim((string) $path);
            if ($safePath === '') {
                continue;
            }

            $absolutePath = __DIR__ . '/../../' . ltrim($safePath, '/');
            if (is_file($absolutePath)) {
                @unlink($absolutePath);
            }
        }
    }

    private function notifyUser(int $userId, string $title, string $message, string $sourceEvent, array $payload = []): void {
        if ($userId <= 0) {
            return;
        }

        try {
            $this->notificationModel->create([
                'notification_id' => $this->generateUuidV4(),
                'user_id' => $userId,
                'target_role' => null,
                'title' => $title,
                'message' => $message,
                'type' => 'info',
                'source_event' => $sourceEvent,
                'source_event_id' => isset($payload['route_breakdown_id']) ? (string) $payload['route_breakdown_id'] : null,
                'is_read' => 0,
                'payload_json' => !empty($payload) ? json_encode($payload) : null,
            ]);
        } catch (Throwable $e) {
            error_log('RouteBreakdownController::notifyUser error: ' . $e->getMessage());
        }
    }

    private function notifyRole(string $role, string $title, string $message, string $sourceEvent, array $payload = []): void {
        try {
            $this->notificationModel->create([
                'notification_id' => $this->generateUuidV4(),
                'user_id' => null,
                'target_role' => $role,
                'title' => $title,
                'message' => $message,
                'type' => 'info',
                'source_event' => $sourceEvent,
                'source_event_id' => isset($payload['route_breakdown_id']) ? (string) $payload['route_breakdown_id'] : null,
                'is_read' => 0,
                'payload_json' => !empty($payload) ? json_encode($payload) : null,
            ]);
        } catch (Throwable $e) {
            error_log('RouteBreakdownController::notifyRole error: ' . $e->getMessage());
        }
    }

    private function generateUuidV4(): string {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
