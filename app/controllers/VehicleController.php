<?php

require_once __DIR__ . '/../services/VehicleService.php';
require_once __DIR__ . '/../helpers/Response.php';

/**
 * Vehicle Controller
 * Handles HTTP requests for vehicle management
 */
class VehicleController {
    private $vehicleService;
    
    public function __construct() {
        $this->vehicleService = new VehicleService();
    }
    
    /**
     * GET /api/vehicles
     * Get all vehicles with pagination and filters
     */
    public function index() {
        try {
            $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
            $perPage = isset($_GET['per_page']) ? (int)$_GET['per_page'] : 20;
            $search = isset($_GET['search']) ? $_GET['search'] : null;
            $orderBy = isset($_GET['order_by']) ? $_GET['order_by'] : 'vehicle_name ASC';
            
            // Build filters
            $filters = [];
            if (isset($_GET['status'])) {
                $filters['status'] = $_GET['status'];
            }
            if (isset($_GET['vehicle_type'])) {
                $filters['vehicle_type'] = $_GET['vehicle_type'];
            }
            if (isset($_GET['fuel_type'])) {
                $filters['fuel_type'] = $_GET['fuel_type'];
            }
            
            $result = $this->vehicleService->getAllVehicles($page, $perPage, $filters, $search, $orderBy);
            
            Response::success([
                'vehicles' => $result['data'],
                'pagination' => $result['pagination']
            ]);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }
    
    /**
     * POST /api/vehicles
     * Create a new vehicle
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
            
            $vehicle = $this->vehicleService->createVehicle($data, $userId);
            
            Response::success($vehicle, 'Vehicle created successfully', 201);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }
    
    /**
     * GET /api/vehicles/:id
     * Get vehicle by ID
     */
    public function show() {
        try {
            // Get vehicle ID from URL parameter (set by router)
            $id = $_GET['id'] ?? null;
            
            if (!$id) {
                Response::error('Vehicle ID is required', 400);
                return;
            }
            
            $vehicle = $this->vehicleService->getVehicleById($id);
            
            Response::success($vehicle);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 404);
        }
    }
    
    /**
     * PUT /api/vehicles/:id
     * Update vehicle
     */
    public function update() {
        try {
            // Get vehicle ID from URL parameter (set by router)
            $id = $_GET['id'] ?? null;
            
            if (!$id) {
                Response::error('Vehicle ID is required', 400);
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
            
            $vehicle = $this->vehicleService->updateVehicle($id, $data, $userId);
            
            Response::success($vehicle, 'Vehicle updated successfully');
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }
    
    /**
     * DELETE /api/vehicles/:id
     * Delete vehicle
     */
    public function delete() {
        try {
            // Get vehicle ID from URL parameter (set by router)
            $id = $_GET['id'] ?? null;
            
            if (!$id) {
                Response::error('Vehicle ID is required', 400);
                return;
            }
            
            $this->vehicleService->deleteVehicle($id);
            
            Response::success(null, 'Vehicle deleted successfully');
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }
    
    /**
     * PATCH /api/vehicles/:id/mileage
     * Update vehicle mileage
     */
    public function updateMileage() {
        try {
            // Get vehicle ID from URL parameter (set by router)
            $id = $_GET['id'] ?? null;
            
            if (!$id) {
                Response::error('Vehicle ID is required', 400);
                return;
            }
            
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!$data || !isset($data['mileage'])) {
                Response::error('Mileage is required', 400);
                return;
            }
            
            $vehicle = $this->vehicleService->updateMileage($id, $data['mileage']);
            
            Response::success($vehicle, 'Mileage updated successfully');
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }
    
    /**
     * GET /api/vehicles/due-service
     * Get vehicles due for service
     */
    public function dueForService() {
        try {
            $vehicles = $this->vehicleService->getVehiclesDueForService();
            
            Response::success(['vehicles' => $vehicles]);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }
    
    /**
     * GET /api/vehicles/next-id
     * Get the next available vehicle ID
     */
    public function getNextId() {
        try {
            $nextId = $this->vehicleService->getNextVehicleId();
            
            Response::success(['next_id' => $nextId]);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }
}
