<?php

require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';

/**
 * Machine Breakdown Controller
 * Handles machine breakdown report management endpoints
 */
class MachineBreakdownController {
    private $conn;
    
    public function __construct() {
        $db = Database::getInstance();
        $this->conn = $db->getConnection();
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
        $currentUser = RoleMiddleware::getCurrentUser();
        
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
            
            $sql = "INSERT INTO machine_breakdown 
                    (breakdown_id, machine_id, operator_id, breakdown_date, breakdown_type,
                     severity, description, status) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')";
            
            $stmt = $this->conn->prepare($sql);
            
            // Convert ISO 8601 datetime to MySQL format
            $breakdownDate = date('Y-m-d H:i:s');
            if (!empty($input['breakdown_date'])) {
                $parsed = strtotime($input['breakdown_date']);
                if ($parsed !== false) {
                    $breakdownDate = date('Y-m-d H:i:s', $parsed);
                }
            }
            
            $stmt->execute([
                $breakdownId,
                $input['machine_id'],
                $currentUser['id'],
                $breakdownDate,
                $input['breakdown_type'],
                $input['severity'],
                $input['description']
            ]);
            
            $this->conn->commit();
            
            Response::success([
                'breakdown_id' => $breakdownId
            ], 'Machine breakdown report created successfully', 201);
            
        } catch (Exception $e) {
            $this->conn->rollBack();
            Response::error('Failed to create breakdown report: ' . $e->getMessage(), 500);
        }
    }
}
