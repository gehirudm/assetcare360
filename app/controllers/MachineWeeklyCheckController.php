<?php

require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../models/MachineWeeklyCheck.php';

/**
 * Machine Weekly Check Controller
 * Handles weekly check report endpoints for machinery operators
 */
class MachineWeeklyCheckController {
    private $conn;
    private $model;
    
    public function __construct() {
        $db = Database::getInstance();
        $this->conn = $db->getConnection();
        $this->model = new MachineWeeklyCheck($this->conn);
    }
    
    /**
     * Get the next available check ID
     * GET /api/machine-weekly-checks/next-id
     */
    public function nextId() {
        RoleMiddleware::requireMinRole('Machinery Operator');
        
        $nextId = $this->model->generateCheckId();
        
        Response::success(['next_id' => $nextId]);
    }
    
    /**
     * Get all machine weekly checks
     * GET /api/machine-weekly-checks
     */
    public function index() {
        RoleMiddleware::requireMinRole('Machinery Operator');
        
        // Handle single check query by id
        if (isset($_GET['id'])) {
            return $this->show();
        }
        
        $filters = [];
        
        if (isset($_GET['status'])) {
            $filters['status'] = $_GET['status'];
        }
        
        if (isset($_GET['machine_id'])) {
            $filters['machine_id'] = $_GET['machine_id'];
        }
        
        if (isset($_GET['operator_id'])) {
            $filters['operator_id'] = $_GET['operator_id'];
        }
        
        if (isset($_GET['overall_condition'])) {
            $filters['overall_condition'] = $_GET['overall_condition'];
        }
        
        // If user is a machinery operator, only show their own checks
        $currentUser = RoleMiddleware::getCurrentUser();
        if ($currentUser['role'] === 'Machinery Operator') {
            $filters['operator_id'] = $currentUser['id'];
        }
        
        $checks = $this->model->getAllChecks($filters);
        
        Response::success(['checks' => $checks, 'count' => count($checks)]);
    }
    
    /**
     * Get single machine weekly check
     * GET /api/machine-weekly-checks/:id
     */
    public function show() {
        RoleMiddleware::requireMinRole('Machinery Operator');
        
        $id = $_GET['id'] ?? null;
        
        if (!$id) {
            Response::error('Check ID required', 400);
        }
        
        // Check if ID is numeric (database ID) or string (check_id)
        if (is_numeric($id)) {
            $check = $this->model->getCheckById($id);
        } else {
            $check = $this->model->getCheckByCheckId($id);
        }
        
        if (!$check) {
            Response::error('Check not found', 404);
        }
        
        // Verify access for machinery operators
        $currentUser = RoleMiddleware::getCurrentUser();
        if ($currentUser['role'] === 'Machinery Operator' && $check['operator_id'] != $currentUser['id']) {
            Response::error('Unauthorized access to this check', 403);
        }
        
        Response::success(['check' => $check]);
    }
    
    /**
     * Create machine weekly check
     * POST /api/machine-weekly-checks
     */
    public function create() {
        RoleMiddleware::requireMinRole('Machinery Operator');
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        // Validate required fields
        if (empty($input['machine_id'])) {
            Response::error('Machine ID is required', 400);
        }
        
        if (empty($input['week_start_date']) || empty($input['week_end_date'])) {
            Response::error('Week start and end dates are required', 400);
        }
        
        // Set operator ID to current user
        $currentUser = RoleMiddleware::getCurrentUser();
        $input['operator_id'] = $currentUser['id'];
        
        $check = $this->model->createCheck($input);
        
        if (!$check) {
            Response::error('Failed to create weekly check', 500);
        }
        
        Response::success(['check' => $check], 'Weekly check report created successfully', 201);
    }
    
    /**
     * Update machine weekly check
     * PUT /api/machine-weekly-checks/:id
     */
    public function update() {
        RoleMiddleware::requireMinRole('Machinery Operator');
        
        $id = $_GET['id'] ?? null;
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$id) {
            Response::error('Check ID required', 400);
        }
        
        // Get existing check
        $existingCheck = $this->model->getCheckByCheckId($id);
        if (!$existingCheck) {
            Response::error('Check not found', 404);
        }
        
        // Verify ownership for machinery operators
        $currentUser = RoleMiddleware::getCurrentUser();
        if ($currentUser['role'] === 'Machinery Operator' && $existingCheck['operator_id'] != $currentUser['id']) {
            Response::error('Unauthorized to update this check', 403);
        }
        
        // Cannot update if already approved/rejected (unless supervisor)
        if ($existingCheck['status'] !== 'pending' && !in_array($currentUser['role'], ['Supervisor', 'Admin'])) {
            Response::error('Cannot update a check that has been reviewed', 400);
        }
        
        $check = $this->model->updateCheck($id, $input);
        
        if (!$check) {
            Response::error('Failed to update weekly check', 500);
        }
        
        Response::success(['check' => $check], 'Weekly check updated successfully');
    }
    
    /**
     * Approve machine weekly check
     * POST /api/machine-weekly-checks/:id/approve
     */
    public function approve() {
        RoleMiddleware::requireMinRole('Supervisor');
        
        $id = $_GET['id'] ?? null;
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$id) {
            Response::error('Check ID required', 400);
        }
        
        $currentUser = RoleMiddleware::getCurrentUser();
        $notes = $input['notes'] ?? null;
        
        $check = $this->model->updateCheckStatus($id, 'approved', $currentUser['id'], $notes);
        
        if (!$check) {
            Response::error('Failed to approve weekly check', 500);
        }
        
        Response::success(['check' => $check], 'Weekly check approved successfully');
    }
    
    /**
     * Reject machine weekly check
     * POST /api/machine-weekly-checks/:id/reject
     */
    public function reject() {
        RoleMiddleware::requireMinRole('Supervisor');
        
        $id = $_GET['id'] ?? null;
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$id) {
            Response::error('Check ID required', 400);
        }
        
        if (empty($input['rejection_reason'])) {
            Response::error('Rejection reason is required', 400);
        }
        
        $currentUser = RoleMiddleware::getCurrentUser();
        $notes = $input['notes'] ?? null;
        
        $check = $this->model->updateCheckStatus($id, 'rejected', $currentUser['id'], $notes, $input['rejection_reason']);
        
        if (!$check) {
            Response::error('Failed to reject weekly check', 500);
        }
        
        Response::success(['check' => $check], 'Weekly check rejected');
    }
    
    /**
     * Delete machine weekly check
     * DELETE /api/machine-weekly-checks/:id
     */
    public function delete() {
        RoleMiddleware::requireMinRole('Machinery Operator');
        
        $id = $_GET['id'] ?? null;
        
        if (!$id) {
            Response::error('Check ID required', 400);
        }
        
        // Get existing check
        $existingCheck = $this->model->getCheckByCheckId($id);
        if (!$existingCheck) {
            Response::error('Check not found', 404);
        }
        
        // Verify ownership
        $currentUser = RoleMiddleware::getCurrentUser();
        if ($currentUser['role'] === 'Machinery Operator' && $existingCheck['operator_id'] != $currentUser['id']) {
            Response::error('Unauthorized to delete this check', 403);
        }
        
        // Cannot delete if approved (unless admin)
        if ($existingCheck['status'] === 'approved' && $currentUser['role'] !== 'Admin') {
            Response::error('Cannot delete an approved check', 400);
        }
        
        $result = $this->model->deleteCheck($id);
        
        if (!$result) {
            Response::error('Failed to delete weekly check', 500);
        }
        
        Response::success(null, 'Weekly check deleted successfully');
    }
    
    /**
     * Get summary/stats for dashboard
     * GET /api/machine-weekly-checks/summary
     */
    public function summary() {
        RoleMiddleware::requireMinRole('Machinery Operator');
        
        $summary = $this->model->getChecksSummary();
        
        Response::success(['summary' => $summary]);
    }
}
