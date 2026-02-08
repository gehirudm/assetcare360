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
                v.number_plate
                FROM vehicle_breakdown br
                LEFT JOIN users u ON br.driver_id = u.id
                LEFT JOIN vehicles v ON br.vehicle_id = v.id
                $whereClause
                ORDER BY br.breakdown_date DESC";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        $reports = $stmt->fetchAll();
        
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
                v.number_plate
                FROM vehicle_breakdown br
                LEFT JOIN users u ON br.driver_id = u.id
                LEFT JOIN vehicles v ON br.vehicle_id = v.id
                WHERE br.id = ?";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$id]);
        $report = $stmt->fetch();
        
        if (!$report) {
            Response::error('Report not found', 404);
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
            RoleMiddleware::getCurrentUser()['id'],
            $input['breakdown_date'] ?? date('Y-m-d'),
            $input['breakdown_type'],
            $input['severity'],
            $input['description']
        ]);
        
        Response::success(['breakdown_id' => $breakdownId], 'Breakdown report created successfully', 201);
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
