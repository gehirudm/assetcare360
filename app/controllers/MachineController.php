<?php

require_once __DIR__ . '/../services/MachineService.php';
require_once __DIR__ . '/../helpers/Response.php';

/**
 * Machine Controller
 * Handles HTTP requests for machine management
 */
class MachineController {
    private $machineService;
    
    public function __construct() {
        $this->machineService = new MachineService();
    }
    
    /**
     * GET /api/machines
     * Get all machines with pagination and filters
     */
    public function index() {
        try {
            $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
            $perPage = isset($_GET['per_page']) ? (int)$_GET['per_page'] : 20;
            $search = isset($_GET['search']) ? $_GET['search'] : null;
            $orderBy = isset($_GET['order_by']) ? $_GET['order_by'] : 'machine_name ASC';
            
            // Build filters
            $filters = [];
            if (isset($_GET['status'])) {
                $filters['status'] = $_GET['status'];
            }
            if (isset($_GET['location'])) {
                $filters['location'] = $_GET['location'];
            }
            
            $result = $this->machineService->getAllMachines($page, $perPage, $filters, $search, $orderBy);
            
            Response::success([
                'machines' => $result['data'],
                'pagination' => $result['pagination']
            ]);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }
    
    /**
     * POST /api/machines
     * Create a new machine
     */
    public function store() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!$data) {
                Response::error('Invalid JSON data', 400);
            }
            
            // Get user ID from authenticated user
            $user = RoleMiddleware::getCurrentUser();
            $userId = $user['id'] ?? null;
            
            $machine = $this->machineService->createMachine($data, $userId);
            
            Response::success($machine, 'Machine created successfully', 201);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }
    
    /**
     * GET /api/machines/:id
     * Get machine by ID
     */
    public function show() {
        try {
            // Get machine ID from URL parameter (set by router)
            $id = $_GET['id'] ?? null;
            
            if (!$id) {
                Response::error('Machine ID is required', 400);
                return;
            }
            
            $machine = $this->machineService->getMachineById($id);
            
            Response::success($machine);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 404);
        }
    }
    
    /**
     * PUT /api/machines/:id
     * Update machine
     */
    public function update() {
        try {
            // Get machine ID from URL parameter (set by router)
            $id = $_GET['id'] ?? null;
            
            if (!$id) {
                Response::error('Machine ID is required', 400);
                return;
            }
            
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!$data) {
                Response::error('Invalid JSON data', 400);
                return;
            }
            
            // Get user ID from authenticated user
            $user = RoleMiddleware::getCurrentUser();
            $userId = $user['id'] ?? null;
            
            $machine = $this->machineService->updateMachine($id, $data, $userId);
            
            Response::success($machine, 'Machine updated successfully');
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }
    
    /**
     * DELETE /api/machines/:id
     * Delete machine
     */
    public function delete() {
        try {
            // Get machine ID from URL parameter (set by router)
            $id = $_GET['id'] ?? null;
            
            if (!$id) {
                Response::error('Machine ID is required', 400);
                return;
            }
            
            $this->machineService->deleteMachine($id);
            
            Response::success(null, 'Machine deleted successfully');
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }
    
    /**
     * GET /api/machines/due-service
     * Get machines due for service
     */
    public function dueForService() {
        try {
            $machines = $this->machineService->getMachinesDueForService();
            
            Response::success(['machines' => $machines]);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }
}
