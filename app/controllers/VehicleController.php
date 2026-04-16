<?php

require_once __DIR__ . '/../services/VehicleService.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../services/EventEmitter.php';
require_once __DIR__ . '/../events/DomainEvents.php';

/**
 * Vehicle Controller
 * Handles HTTP requests for vehicle management
 */
class VehicleController {
    private $vehicleService;
    private $eventEmitter;
    
    public function __construct() {
        $this->vehicleService = new VehicleService();
        $this->eventEmitter = new EventEmitter();
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
            $this->eventEmitter->emit(
                DomainEvents::ASSET_VEHICLE_CREATED,
                [
                    'vehicle_db_id' => $vehicle['id'] ?? null,
                    'vehicle_id' => $vehicle['vehicle_id'] ?? null,
                    'number_plate' => $vehicle['number_plate'] ?? null,
                    'status' => $vehicle['status'] ?? null,
                ],
                [
                    'user_id' => $userId,
                    'role' => $user['role'] ?? null,
                ]
            );
            
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
    
    /**
     * GET /api/vehicles/with-drivers
     * Get all vehicles with their assigned driver info
     */
    public function getVehiclesWithDrivers() {
        try {
            $filters = [];
            $search = isset($_GET['search']) ? $_GET['search'] : null;
            
            if (isset($_GET['status'])) {
                $filters['status'] = $_GET['status'];
            }
            if (isset($_GET['vehicle_type'])) {
                $filters['vehicle_type'] = $_GET['vehicle_type'];
            }
            if (isset($_GET['assignment_status'])) {
                $filters['assignment_status'] = $_GET['assignment_status'];
            }
            
            $vehicles = $this->vehicleService->getVehiclesWithDriverAssignments($filters, $search);
            
            Response::success(['vehicles' => $vehicles]);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }
    
    /**
     * GET /api/vehicles/:numberPlate/with-driver
     * Get vehicle with driver info by number plate
     */
    public function getVehicleWithDriver() {
        try {
            $numberPlate = $_GET['numberPlate'] ?? null;
            
            if (!$numberPlate) {
                Response::error('Number plate is required', 400);
                return;
            }
            
            $vehicle = $this->vehicleService->getVehicleWithDriverByNumberPlate($numberPlate);
            
            Response::success(['vehicle' => $vehicle]);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 404);
        }
    }
    
    /**
     * POST /api/vehicles/:id/assign-driver
     * Assign a driver to a vehicle
     */
    public function assignDriver() {
        try {
            $vehicleId = $_GET['id'] ?? null;
            
            if (!$vehicleId) {
                Response::error('Vehicle ID is required', 400);
                return;
            }
            
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!$data || !isset($data['driver_id'])) {
                Response::error('Driver ID is required', 400);
                return;
            }
            
            $result = $this->vehicleService->assignDriverToVehicle($vehicleId, $data['driver_id']);
            
            $message = 'Driver assigned successfully';
            if ($result['previous_vehicle']) {
                $message .= '. Driver was unassigned from ' . $result['previous_vehicle']['number_plate'];
            }
            
            Response::success($result, $message);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }
    
    /**
     * POST /api/vehicles/:id/unassign-driver
     * Unassign driver from a vehicle
     */
    public function unassignDriver() {
        try {
            $vehicleId = $_GET['id'] ?? null;
            
            if (!$vehicleId) {
                Response::error('Vehicle ID is required', 400);
                return;
            }
            
            $vehicle = $this->vehicleService->unassignDriverFromVehicle($vehicleId);
            
            Response::success(['vehicle' => $vehicle], 'Driver unassigned successfully');
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }
    
    /**
     * GET /api/vehicles/my-vehicle
     * Get the vehicle assigned to the current driver
     */
    public function getMyVehicle() {
        try {
            $user = RoleMiddleware::getCurrentUser();
            
            if (!$user || !isset($user['id'])) {
                Response::error('Authentication required', 401);
                return;
            }
            
            $vehicle = $this->vehicleService->getVehicleAssignedToDriver($user['id']);
            
            Response::success($vehicle);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }
}
