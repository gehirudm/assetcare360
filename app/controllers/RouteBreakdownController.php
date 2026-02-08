<?php

require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';

/**
 * Route Breakdown Controller
 * Handles route breakdown management endpoints (simplified to match form fields)
 */
class RouteBreakdownController {
    private $conn;
    
    public function __construct() {
        $db = Database::getInstance();
        $this->conn = $db->getConnection();
    }
    
    /**
     * Get all route breakdowns
     * GET /api/route-breakdowns
     */
    public function index() {
        RoleMiddleware::requireMinRole('Driver');
        
        $sql = "SELECT rb.*, 
                v.number_plate,
                u.full_name as driver_name
                FROM vehicle_breakdown_inroute rb
                LEFT JOIN vehicles v ON rb.vehicle_id = v.id
                LEFT JOIN users u ON rb.driver_id = u.id
                ORDER BY rb.breakdown_datetime DESC";
        
        $stmt = $this->conn->query($sql);
        $breakdowns = $stmt->fetchAll();
        
        Response::success(['breakdowns' => $breakdowns, 'count' => count($breakdowns)]);
    }
    
    /**
     * Get single route breakdown
     * GET /api/route-breakdowns/:id
     */
    public function show() {
        RoleMiddleware::requireMinRole('Driver');
        
        $id = $_GET['id'] ?? null;
        
        if (!$id) {
            Response::error('Route breakdown ID required', 400);
        }
        
        $sql = "SELECT rb.*, 
                v.number_plate, v.model_number as make, v.vehicle_name as model,
                u.full_name as driver_name, u.phone as driver_phone
                FROM vehicle_breakdown_inroute rb
                LEFT JOIN vehicles v ON rb.vehicle_id = v.id
                LEFT JOIN users u ON rb.driver_id = u.id
                WHERE rb.id = ?";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$id]);
        $breakdown = $stmt->fetch();
        
        if (!$breakdown) {
            Response::error('Route breakdown not found', 404);
        }
        
        Response::success(['breakdown' => $breakdown]);
    }
    
    /**
     * Create route breakdown
     * POST /api/route-breakdowns
     */
    public function create() {
        RoleMiddleware::requireMinRole('Driver');
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        // Generate route breakdown ID
        $stmt = $this->conn->query("SELECT COUNT(*) FROM vehicle_breakdown_inroute");
        $count = $stmt->fetchColumn() + 1;
        $routeBreakdownId = "RBD-" . str_pad($count, 3, '0', STR_PAD_LEFT);
        
        $sql = "INSERT INTO vehicle_breakdown_inroute 
                (route_breakdown_id, breakdown_id, vehicle_id, driver_id, breakdown_location, 
                 breakdown_datetime, breakdown_type, severity, description, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            $routeBreakdownId,
            $input['breakdown_id'] ?? null,
            $input['vehicle_id'],
            RoleMiddleware::getCurrentUser()['id'],
            $input['breakdown_location'],
            $input['breakdown_datetime'],
            $input['breakdown_type'],
            $input['severity'],
            $input['description']
        ]);
        
        Response::success(['route_breakdown_id' => $routeBreakdownId], 'Route breakdown created successfully', 201);
    }
    
    /**
     * Update route breakdown
     * PUT /api/route-breakdowns/:id
     */
    public function update() {
        RoleMiddleware::requireMinRole('Driver');
        
        $id = $_GET['id'] ?? null;
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$id) {
            Response::error('Route breakdown ID required', 400);
        }
        
        // Check if the user is the owner or a supervisor/admin
        $currentUser = RoleMiddleware::getCurrentUser();
        $stmt = $this->conn->prepare("SELECT driver_id FROM vehicle_breakdown_inroute WHERE id = ?");
        $stmt->execute([$id]);
        $report = $stmt->fetch();
        
        if (!$report) {
            Response::error('Route breakdown not found', 404);
        }
        
        // Drivers can only edit their own reports
        if ($currentUser['role'] === 'Driver' && $report['driver_id'] != $currentUser['id']) {
            Response::error('You can only edit your own reports', 403);
        }
        
        $fields = [];
        $params = [];
        
        // Allow updating these fields
        $allowedFields = ['severity', 'breakdown_type', 'description', 'status', 'breakdown_location', 'breakdown_datetime'];
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
        $sql = "UPDATE vehicle_breakdown_inroute SET " . implode(', ', $fields) . " WHERE id = ?";
        
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
        
        $id = $_GET['id'] ?? null;
        
        if (!$id) {
            Response::error('Route breakdown ID required', 400);
        }
        
        // Check if the user is the owner or a supervisor/admin
        $currentUser = RoleMiddleware::getCurrentUser();
        $stmt = $this->conn->prepare("SELECT driver_id FROM vehicle_breakdown_inroute WHERE id = ?");
        $stmt->execute([$id]);
        $report = $stmt->fetch();
        
        if (!$report) {
            Response::error('Route breakdown not found', 404);
        }
        
        // Drivers can only delete their own reports, supervisors/admins can delete any
        if ($currentUser['role'] === 'Driver' && $report['driver_id'] != $currentUser['id']) {
            Response::error('You can only delete your own reports', 403);
        }
        
        $stmt = $this->conn->prepare("DELETE FROM vehicle_breakdown_inroute WHERE id = ?");
        $stmt->execute([$id]);
        
        Response::success(null, 'Route breakdown deleted successfully');
    }
    
    /**
     * Get route breakdown statistics
     * GET /api/route-breakdowns/stats
     */
    public function stats() {
        RoleMiddleware::requireMinRole('Supervisor');
        
        $total = $this->conn->query("SELECT COUNT(*) FROM vehicle_breakdown_inroute")->fetchColumn();
        
        $byStatus = $this->conn->query("
            SELECT status, COUNT(*) as count 
            FROM vehicle_breakdown_inroute 
            GROUP BY status
        ")->fetchAll();
        
        $bySeverity = $this->conn->query("
            SELECT severity, COUNT(*) as count 
            FROM vehicle_breakdown_inroute 
            GROUP BY severity
        ")->fetchAll();
        
        $byType = $this->conn->query("
            SELECT breakdown_type, COUNT(*) as count 
            FROM vehicle_breakdown_inroute 
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
