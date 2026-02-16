<?php

require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';

/**
 * Breakdown Report Controller
 * Handles breakdown report management endpoints (simplified to match form fields)
 */
class BreakdownReportController {
    private $conn;
    
    public function __construct() {
        $db = Database::getInstance();
        $this->conn = $db->getConnection();
    }
    
    /**
     * Get all breakdown reports
     * GET /api/breakdown-reports
     */
    public function index() {
        RoleMiddleware::requireMinRole('Driver');
        
        $where = [];
        $params = [];
        
        if (isset($_GET['status'])) {
            $where[] = "br.status = ?";
            $params[] = $_GET['status'];
        }
        
        if (isset($_GET['severity'])) {
            $where[] = "br.severity = ?";
            $params[] = $_GET['severity'];
        }
        
        if (isset($_GET['breakdown_type'])) {
            $where[] = "br.breakdown_type = ?";
            $params[] = $_GET['breakdown_type'];
        }
        
        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
        
        $sql = "SELECT br.*, 
                u.full_name as driver_name,
                v.number_plate,
                ft.id as fault_ticket_id,
                ft.ticket_id as fault_ticket_number,
                ft.status as ticket_status,
                ft.resolution_notes,
                ft.resolved_at
                FROM vehicle_breakdown br
                LEFT JOIN users u ON br.driver_id = u.id
                LEFT JOIN vehicles v ON br.vehicle_id = v.id
                LEFT JOIN fault_tickets ft ON ft.breakdown_report_id = br.breakdown_id
                $whereClause
                ORDER BY br.breakdown_date DESC";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        $reports = $stmt->fetchAll();
        
        // Attach assigned technician info for each linked fault ticket
        foreach ($reports as &$report) {
            $report['assigned_technicians'] = [];
            if (!empty($report['fault_ticket_id'])) {
                $techSql = "SELECT u.full_name as technician_name, u.employee_id as technician_employee_id
                            FROM fault_ticket_assignments fta
                            LEFT JOIN users u ON fta.assigned_to = u.id
                            WHERE fta.fault_ticket_id = ? AND fta.status = 'Active'";
                $techStmt = $this->conn->prepare($techSql);
                $techStmt->execute([$report['fault_ticket_id']]);
                $report['assigned_technicians'] = $techStmt->fetchAll();
            }
        }
        unset($report);
        
        Response::success(['reports' => $reports, 'count' => count($reports)]);
    }
    
    /**
     * Get single breakdown report
     * GET /api/breakdown-reports/:id
     */
    public function show() {
        RoleMiddleware::requireMinRole('Driver');
        
        $id = $_GET['id'] ?? null;
        
        if (!$id) {
            Response::error('Report ID required', 400);
        }
        
        $sql = "SELECT br.*, 
                u.full_name as driver_name, u.employee_id as driver_employee_id,
                v.number_plate,
                ft.id as fault_ticket_id,
                ft.ticket_id as fault_ticket_number,
                ft.status as ticket_status,
                ft.resolution_notes,
                ft.resolved_at
                FROM vehicle_breakdown br
                LEFT JOIN users u ON br.driver_id = u.id
                LEFT JOIN vehicles v ON br.vehicle_id = v.id
                LEFT JOIN fault_tickets ft ON ft.breakdown_report_id = br.breakdown_id
                WHERE br.id = ?";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$id]);
        $report = $stmt->fetch();
        
        if (!$report) {
            Response::error('Report not found', 404);
        }
        
        // Attach assigned technician info
        $report['assigned_technicians'] = [];
        $report['work_updates'] = [];
        if (!empty($report['fault_ticket_id'])) {
            $techSql = "SELECT u.full_name as technician_name, u.employee_id as technician_employee_id,
                               u.phone as technician_phone
                        FROM fault_ticket_assignments fta
                        LEFT JOIN users u ON fta.assigned_to = u.id
                        WHERE fta.fault_ticket_id = ? AND fta.status = 'Active'";
            $techStmt = $this->conn->prepare($techSql);
            $techStmt->execute([$report['fault_ticket_id']]);
            $report['assigned_technicians'] = $techStmt->fetchAll();
            
            // Get work updates from technical officer
            $workSql = "SELECT twu.*, 
                               u.full_name as technician_name
                        FROM ticket_work_updates twu
                        LEFT JOIN users u ON twu.technical_officer_id = u.id
                        WHERE twu.ticket_id = ?
                        ORDER BY twu.created_at DESC";
            $workStmt = $this->conn->prepare($workSql);
            $workStmt->execute([$report['fault_ticket_id']]);
            $report['work_updates'] = $workStmt->fetchAll();
        }
        
        Response::success(['report' => $report]);
    }
    
    /**
     * Create breakdown report
     * POST /api/breakdown-reports
     */
    public function create() {
        RoleMiddleware::requireMinRole('Driver');
        
        $input = json_decode(file_get_contents('php://input'), true);
        $currentUser = RoleMiddleware::getCurrentUser();
        
        try {
            // Start transaction
            $this->conn->beginTransaction();
            
            // Generate breakdown ID
            $stmt = $this->conn->query("SELECT COUNT(*) FROM vehicle_breakdown");
            $count = $stmt->fetchColumn() + 1;
            $breakdownId = "VBD-" . str_pad($count, 3, '0', STR_PAD_LEFT);
            
            $sql = "INSERT INTO vehicle_breakdown 
                    (breakdown_id, vehicle_id, driver_id, breakdown_date, breakdown_type,
                     severity, description, status) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                $breakdownId,
                $input['vehicle_id'],
                $currentUser['id'],
                $input['breakdown_date'] ?? date('Y-m-d'),
                $input['breakdown_type'],
                $input['severity'],
                $input['description']
            ]);
            
            // Commit transaction
            $this->conn->commit();
            
            Response::success([
                'breakdown_id' => $breakdownId
            ], 'Breakdown report created successfully', 201);
            
        } catch (Exception $e) {
            // Rollback on error
            $this->conn->rollBack();
            Response::error('Failed to create breakdown report: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Update breakdown report
     * PUT /api/breakdown-reports/:id
     */
    public function update() {
        RoleMiddleware::requireMinRole('Driver');
        
        $id = $_GET['id'] ?? null;
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$id) {
            Response::error('Report ID required', 400);
        }
        
        // Check if the user is the owner or a supervisor/admin
        $currentUser = RoleMiddleware::getCurrentUser();
        $stmt = $this->conn->prepare("SELECT driver_id FROM vehicle_breakdown WHERE id = ?");
        $stmt->execute([$id]);
        $report = $stmt->fetch();
        
        if (!$report) {
            Response::error('Report not found', 404);
        }
        
        // Drivers can only edit their own reports
        if ($currentUser['role'] === 'Driver' && $report['driver_id'] != $currentUser['id']) {
            Response::error('You can only edit your own reports', 403);
        }
        
        $fields = [];
        $params = [];
        
        // Allow updating these fields
        $allowedFields = ['severity', 'breakdown_type', 'description', 'status', 'breakdown_date'];
        foreach ($allowedFields as $field) {
            if (isset($input[$field])) {
                $fields[] = "$field = ?";
                $params[] = $input[$field];
            }
        }
        
        if (empty($fields)) {
            Response::error('No fields to update', 400);
        }
        
        $params[] = $id;
        $sql = "UPDATE vehicle_breakdown SET " . implode(', ', $fields) . " WHERE id = ?";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        
        Response::success(null, 'Breakdown report updated successfully');
    }
    
    /**
     * Delete breakdown report
     * DELETE /api/breakdown-reports/:id
     */
    public function delete() {
        RoleMiddleware::requireMinRole('Driver');
        
        $id = $_GET['id'] ?? null;
        
        if (!$id) {
            Response::error('Report ID required', 400);
        }
        
        // Check if the user is the owner or a supervisor/admin
        $currentUser = RoleMiddleware::getCurrentUser();
        $stmt = $this->conn->prepare("SELECT driver_id FROM vehicle_breakdown WHERE id = ?");
        $stmt->execute([$id]);
        $report = $stmt->fetch();
        
        if (!$report) {
            Response::error('Report not found', 404);
        }
        
        // Drivers can only delete their own reports, supervisors/admins can delete any
        if ($currentUser['role'] === 'Driver' && $report['driver_id'] != $currentUser['id']) {
            Response::error('You can only delete your own reports', 403);
        }
        
        $stmt = $this->conn->prepare("DELETE FROM vehicle_breakdown WHERE id = ?");
        $stmt->execute([$id]);
        
        Response::success(null, 'Breakdown report deleted successfully');
    }
    
    /**
     * Get breakdown statistics
     * GET /api/breakdown-reports/stats
     */
    public function stats() {
        RoleMiddleware::requireMinRole('Supervisor');
        
        // Total breakdowns
        $total = $this->conn->query("SELECT COUNT(*) FROM vehicle_breakdown")->fetchColumn();
        
        // By status
        $byStatus = $this->conn->query("
            SELECT status, COUNT(*) as count 
            FROM vehicle_breakdown 
            GROUP BY status
        ")->fetchAll();
        
        // By severity
        $bySeverity = $this->conn->query("
            SELECT severity, COUNT(*) as count 
            FROM vehicle_breakdown 
            GROUP BY severity
        ")->fetchAll();
        
        // By type
        $byType = $this->conn->query("
            SELECT breakdown_type, COUNT(*) as count 
            FROM vehicle_breakdown 
            GROUP BY breakdown_type
            ORDER BY count DESC
        ")->fetchAll();
        
        Response::success([
            'total' => $total,
            'by_status' => $byStatus,
            'by_severity' => $bySeverity,
            'by_type' => $byType
        ]);
    }
}
