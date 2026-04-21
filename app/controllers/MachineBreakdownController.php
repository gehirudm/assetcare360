<?php

require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../services/FaultTicketService.php';
require_once __DIR__ . '/../models/FaultTicket.php';
require_once __DIR__ . '/../services/EventEmitter.php';
require_once __DIR__ . '/../events/DomainEvents.php';

/**
 * Machine Breakdown Controller
 * Handles machine breakdown report management endpoints
 */
class MachineBreakdownController {
    private $conn;
    private $faultTicketService;
    private $faultTicketModel;
    private $eventEmitter;
    
    public function __construct() {
        $db = Database::getInstance();
        $this->conn = $db->getConnection();
        $this->faultTicketService = new FaultTicketService();
        $this->faultTicketModel = new FaultTicket();
        $this->eventEmitter = new EventEmitter();
    }
    
    /**
     * Get all machine breakdown reports
     * GET /api/machine-breakdowns
     */
    public function index() {
        RoleMiddleware::requireMinRole('Machinary Operator');
        
        $where = [];
        $params = [];
        
        if (isset($_GET['status'])) {
            $where[] = "mb.status = ?";
            $params[] = $_GET['status'];
        }
        
        if (isset($_GET['severity'])) {
            $where[] = "mb.severity = ?";
            $params[] = $_GET['severity'];
        }
        
        if (isset($_GET['breakdown_type'])) {
            $where[] = "mb.breakdown_type = ?";
            $params[] = $_GET['breakdown_type'];
        }
        
        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
        
        $sql = "SELECT mb.*, 
                u.full_name as operator_name,
                m.model_number as machine_model,
                m.machine_name as machine_name,
                ft.id as fault_ticket_id,
                ft.ticket_id as fault_ticket_number,
                ft.status as ticket_status,
                ft.resolution_notes,
                ft.resolved_at
                FROM machine_breakdown mb
                LEFT JOIN users u ON mb.operator_id = u.id
                LEFT JOIN machines m ON mb.machine_id = m.id
                LEFT JOIN fault_tickets ft ON ft.breakdown_report_id COLLATE utf8mb4_general_ci = mb.breakdown_id COLLATE utf8mb4_general_ci AND ft.breakdown_type = 'machine_breakdown'
                $whereClause
                ORDER BY mb.created_at DESC";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        $reports = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get assignments for each report that has a fault ticket
        foreach ($reports as &$report) {
            if (!empty($report['fault_ticket_id'])) {
                $assignStmt = $this->conn->prepare("
                    SELECT fta.*, 
                           u.full_name as technician_name,
                           u.employee_id as technician_employee_id
                    FROM fault_ticket_assignments fta
                    LEFT JOIN users u ON fta.assigned_to = u.id
                    WHERE fta.fault_ticket_id = ? AND fta.status = 'Active'
                ");
                $assignStmt->execute([$report['fault_ticket_id']]);
                $report['assignments'] = $assignStmt->fetchAll(PDO::FETCH_ASSOC);
            }
        }
        unset($report);
        
        Response::success(['reports' => $reports]);
    }
    
    /**
     * Get single machine breakdown report
     * GET /api/machine-breakdowns/:id
     */
    public function show() {
        RoleMiddleware::requireMinRole('Machinary Operator');
        
        $id = $_GET['id'] ?? null;
        
        if (!$id) {
            Response::error('Report ID required', 400);
        }
        
        $sql = "SELECT mb.*, 
                u.full_name as operator_name,
                m.model_number as machine_model,
                m.machine_name as machine_name,
                ft.id as fault_ticket_id,
                ft.ticket_id as fault_ticket_number,
                ft.status as ticket_status,
                ft.resolution_notes,
                ft.resolved_at
                FROM machine_breakdown mb
                LEFT JOIN users u ON mb.operator_id = u.id
                LEFT JOIN machines m ON mb.machine_id = m.id
                LEFT JOIN fault_tickets ft ON ft.breakdown_report_id COLLATE utf8mb4_general_ci = mb.breakdown_id COLLATE utf8mb4_general_ci AND ft.breakdown_type = 'machine_breakdown'
                WHERE mb.id = ?";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$id]);
        $report = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$report) {
            Response::error('Report not found', 404);
        }
        
        // Get assignments if there's a fault ticket
        if (!empty($report['fault_ticket_id'])) {
            $assignStmt = $this->conn->prepare("
                SELECT fta.*, 
                       u.full_name as technician_name,
                       u.employee_id as technician_employee_id
                FROM fault_ticket_assignments fta
                LEFT JOIN users u ON fta.assigned_to = u.id
                WHERE fta.fault_ticket_id = ?
            ");
            $assignStmt->execute([$report['fault_ticket_id']]);
            $report['assignments'] = $assignStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Get work updates from technical officer
            $workStmt = $this->conn->prepare("
                SELECT twu.*, 
                       u.full_name as technician_name
                FROM ticket_work_updates twu
                LEFT JOIN users u ON twu.technical_officer_id = u.id
                WHERE twu.ticket_id = ?
                ORDER BY twu.created_at DESC
            ");
            $workStmt->execute([$report['fault_ticket_id']]);
            $report['work_updates'] = $workStmt->fetchAll(PDO::FETCH_ASSOC);
        }
        
        Response::success($report);
    }
    
    /**
     * Create new machine breakdown report
     * POST /api/machine-breakdowns
     */
    public function create() {
        RoleMiddleware::requireMinRole('Machinary Operator');
        
        $input = json_decode(file_get_contents('php://input'), true);
        if (!is_array($input)) {
            Response::error('Invalid JSON payload', 400);
        }

        // Always use server timestamp for new machine breakdown reports.
        $breakdownDate = date('Y-m-d H:i:s');
        $currentUser = RoleMiddleware::getCurrentUser();

        $validationErrors = $this->validateCreatePayload($input);
        if (!empty($validationErrors)) {
            Response::validationError($validationErrors);
        }

        $machineId = (int) $input['machine_id'];
        $breakdownType = $this->normalizeBreakdownType($input['breakdown_type'] ?? null);
        $severity = $this->normalizeSeverity($input['severity'] ?? null);
        $description = trim((string) $input['description']);
        
        try {
            $this->conn->beginTransaction();
            
            // Generate breakdown ID - start from MBD-001
            $stmt = $this->conn->query("SELECT breakdown_id FROM machine_breakdown WHERE breakdown_id LIKE 'MBD-%' ORDER BY CAST(SUBSTRING(breakdown_id, 5) AS UNSIGNED) DESC LIMIT 1");
            $lastBreakdown = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($lastBreakdown && $lastBreakdown['breakdown_id']) {
                $lastNumber = intval(substr($lastBreakdown['breakdown_id'], 4));
                $nextNumber = $lastNumber + 1;
            } else {
                $nextNumber = 1; // Start from 001 if no records exist
            }
            
            $breakdownId = "MBD-" . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);
            
            $allowedCostRanges = [
                'Less than LKR 50,000',
                'LKR 50,000 - 100,000',
                'More than LKR 100,000',
            ];
            $estimatedCostRange = isset($input['estimated_cost_range']) && in_array($input['estimated_cost_range'], $allowedCostRanges, true)
                ? $input['estimated_cost_range']
                : null;

            $sql = "INSERT INTO machine_breakdown 
                    (breakdown_id, machine_id, operator_id, breakdown_date, breakdown_type,
                     severity, description, estimated_cost_range, status) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')";
            
            $stmt = $this->conn->prepare($sql);
            
            $stmt->execute([
                $breakdownId,
                $machineId,
                $currentUser['id'],
                $breakdownDate,
                $breakdownType,
                $severity,
                $description,
                $estimatedCostRange,
            ]);

            $ticketPayload = [
                'machine_id' => $machineId,
                'reported_by' => (int) $currentUser['id'],
                'breakdown_report_id' => $breakdownId,
                'breakdown_type' => 'machine_breakdown',
                'priority' => $this->mapSeverityToPriority($severity),
                'description' => $this->buildAutoTicketDescription($breakdownId, [
                    'breakdown_type' => $breakdownType,
                    'severity' => $severity,
                    'breakdown_date' => $breakdownDate,
                    'description' => $description
                ])
            ];

            $ticketResult = $this->faultTicketService->create($ticketPayload);
            if (empty($ticketResult['success'])) {
                $ticketError = $ticketResult['message'] ?? 'Failed to auto-create linked fault ticket';
                throw new RuntimeException($ticketError);
            }

            $createdTicketDbId = empty($ticketResult['data']['existing'])
                ? (int) ($ticketResult['data']['id'] ?? 0)
                : 0;
            
            if ($this->conn->inTransaction()) {
                $this->conn->commit();
            }

            if ($createdTicketDbId > 0) {
                $ticket = $this->faultTicketModel->findById($createdTicketDbId);
                $this->eventEmitter->emit(
                    DomainEvents::FAULT_TICKET_CREATED,
                    [
                        'ticket_db_id' => $createdTicketDbId,
                        'ticket_id' => $ticket['ticket_id'] ?? null,
                        'priority' => $ticket['priority'] ?? ($ticketPayload['priority'] ?? null),
                        'status' => $ticket['status'] ?? null,
                        'breakdown_type' => $ticket['breakdown_type'] ?? ($ticketPayload['breakdown_type'] ?? null),
                    ],
                    [
                        'user_id' => $currentUser['id'] ?? null,
                        'role' => $currentUser['role'] ?? null,
                        'source' => 'controller:MachineBreakdownController::create',
                    ]
                );
            }
            
            Response::success([
                'breakdown_id' => $breakdownId
            ], 'Machine breakdown report created successfully', 201);
            
        } catch (Exception $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }
            Response::error('Failed to create breakdown report: ' . $e->getMessage(), 500);
        }
    }

    private function validateCreatePayload(array $input): array {
        $errors = [];

        $machineId = isset($input['machine_id']) ? (int) $input['machine_id'] : 0;
        if ($machineId <= 0) {
            $errors['machine_id'] = 'Machine is required';
        }

        $description = trim((string) ($input['description'] ?? ''));
        if ($description === '') {
            $errors['description'] = 'Fault description is required';
        } else {
            $descriptionLength = $this->stringLength($description);
            if ($descriptionLength < 10) {
                $errors['description'] = 'Fault description must be at least 10 characters';
            } elseif ($descriptionLength > 150) {
                $errors['description'] = 'Fault description cannot exceed 150 characters';
            }
        }

        return $errors;
    }

    private function normalizeBreakdownType($value): string {
        $normalized = trim((string) $value);
        if ($normalized === '') {
            return 'General Fault';
        }

        return $normalized;
    }

    private function normalizeSeverity($value): string {
        $normalized = strtolower(trim((string) $value));
        $allowed = [
            'low' => 'Low',
            'medium' => 'Medium',
            'high' => 'High',
            'critical' => 'Critical',
        ];

        return $allowed[$normalized] ?? 'Medium';
    }

    private function stringLength(string $value): int {
        if (function_exists('mb_strlen')) {
            return mb_strlen($value);
        }

        return strlen($value);
    }

    private function mapSeverityToPriority($severity) {
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

    private function buildAutoTicketDescription(string $breakdownId, array $input): string {
        $breakdownType = trim((string) ($input['breakdown_type'] ?? 'Machine Fault'));
        $severity = strtoupper(trim((string) ($input['severity'] ?? 'medium')));
        $reportedDate = trim((string) ($input['breakdown_date'] ?? date('Y-m-d H:i:s')));
        $details = trim((string) ($input['description'] ?? 'No description provided'));

        return "[Machine Breakdown] {$breakdownId}\n"
            . "Type: {$breakdownType}\n"
            . "Severity: {$severity}\n"
            . "Reported At: {$reportedDate}\n"
            . "Details: {$details}";
    }

    private function normalizeBreakdownDateTime($value, bool $required): string {
        $raw = trim((string) ($value ?? ''));
        if ($raw === '') {
            if ($required) {
                Response::error('breakdown_date is required', 400);
            }
            return date('Y-m-d H:i:s');
        }

        $timestamp = strtotime($raw);
        if ($timestamp === false) {
            Response::error('breakdown_date must be a valid date/time value', 400);
        }

        $now = time();
        if ($timestamp > $now) {
            Response::error('breakdown_date cannot be in the future', 400);
        }

        return date('Y-m-d H:i:s', $timestamp);
    }
}
