<?php

require_once __DIR__ . '/../services/VehicleCheckService.php';
require_once __DIR__ . '/../helpers/Response.php';

class VehicleCheckController {
    private $vehicleCheckService;
    
    public function __construct() {
        $db = Database::getInstance()->getConnection();
        $this->vehicleCheckService = new VehicleCheckService($db);
    }
    
    /**
     * GET /api/vehicle-checks
     * Get all vehicle checks with optional filtering
     */
    public function index() {
        try {
            $filters = [];
            
            if (isset($_GET['vehicle_registration'])) {
                $filters['vehicle_registration'] = $_GET['vehicle_registration'];
            }
            
            if (isset($_GET['status'])) {
                $filters['status'] = $_GET['status'];
            }
            
            if (isset($_GET['driver_id'])) {
                $filters['driver_id'] = $_GET['driver_id'];
            }
            
            $checks = $this->vehicleCheckService->getAllChecks($filters);
            
            Response::json([
                'success' => true,
                'data' => $checks,
                'count' => count($checks)
            ]);
        } catch (Exception $e) {
            Response::json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * GET /api/vehicle-checks/:check_id
     * Get a specific vehicle check
     */
    public function show() {
        try {
            $checkId = $_GET['id'] ?? null;
            
            if (!$checkId) {
                Response::json([
                    'success' => false,
                    'message' => 'Check ID is required'
                ], 400);
                return;
            }
            
            $check = $this->vehicleCheckService->getCheckByCheckId($checkId);
            
            Response::json([
                'success' => true,
                'data' => $check
            ]);
        } catch (Exception $e) {
            Response::json([
                'success' => false,
                'message' => $e->getMessage()
            ], 404);
        }
    }
    
    /**
     * POST /api/vehicle-checks
     * Create a new vehicle check
     */
    public function store() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!$data) {
                Response::json([
                    'success' => false,
                    'message' => 'Invalid JSON data'
                ], 400);
                return;
            }
            
            $check = $this->vehicleCheckService->createCheck($data);
            
            Response::json([
                'success' => true,
                'message' => 'Vehicle check created successfully',
                'data' => $check
            ], 201);
        } catch (Exception $e) {
            Response::json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }
    
    /**
     * PUT /api/vehicle-checks/:check_id/approve
     * Approve a vehicle check
     */
    public function approve() {
        try {
            $checkId = $_GET['id'] ?? null;
            
            if (!$checkId) {
                Response::json([
                    'success' => false,
                    'message' => 'Check ID is required'
                ], 400);
                return;
            }
            
            $data = json_decode(file_get_contents('php://input'), true);
            
            $reviewedBy = $data['reviewed_by'] ?? null;
            $notes = $data['notes'] ?? null;
            
            if (!$reviewedBy) {
                Response::json([
                    'success' => false,
                    'message' => 'Reviewer ID is required'
                ], 400);
                return;
            }
            
            $check = $this->vehicleCheckService->approveCheck($checkId, $reviewedBy, $notes);
            
            Response::json([
                'success' => true,
                'message' => 'Vehicle check approved successfully',
                'data' => $check
            ]);
        } catch (Exception $e) {
            Response::json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }
    
    /**
     * PUT /api/vehicle-checks/:check_id/reject
     * Reject a vehicle check
     */
    public function reject() {
        try {
            $checkId = $_GET['id'] ?? null;
            
            if (!$checkId) {
                Response::json([
                    'success' => false,
                    'message' => 'Check ID is required'
                ], 400);
                return;
            }
            
            $data = json_decode(file_get_contents('php://input'), true);
            
            $reviewedBy = $data['reviewed_by'] ?? null;
            $rejectionReason = $data['rejection_reason'] ?? null;
            $notes = $data['notes'] ?? null;
            
            if (!$reviewedBy) {
                Response::json([
                    'success' => false,
                    'message' => 'Reviewer ID is required'
                ], 400);
                return;
            }
            
            if (!$rejectionReason) {
                Response::json([
                    'success' => false,
                    'message' => 'Rejection reason is required'
                ], 400);
                return;
            }
            
            $check = $this->vehicleCheckService->rejectCheck($checkId, $reviewedBy, $rejectionReason, $notes);
            
            Response::json([
                'success' => true,
                'message' => 'Vehicle check rejected',
                'data' => $check
            ]);
        } catch (Exception $e) {
            Response::json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }
    
    /**
     * GET /api/vehicle-checks/next-id
     * Get the next available check ID
     */
    public function nextId() {
        try {
            $nextId = $this->vehicleCheckService->getNextCheckId();
            
            Response::json([
                'success' => true,
                'data' => ['next_check_id' => $nextId]
            ]);
        } catch (Exception $e) {
            Response::json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
