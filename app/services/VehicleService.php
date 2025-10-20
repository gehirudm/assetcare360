<?php

require_once __DIR__ . '/../models/Vehicle.php';

/**
 * Vehicle Service
 * Business logic for vehicle management
 */
class VehicleService {
    private $vehicleModel;
    
    public function __construct() {
        $this->vehicleModel = new Vehicle();
    }
    
    /**
     * Create a new vehicle
     */
    public function createVehicle($data, $userId) {
        // Validate required fields
        $required = ['vehicle_name', 'model_number', 'chassis_number', 'number_plate', 
                     'vehicle_type', 'fuel_type', 'supplier_name', 'service_interval_type'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                throw new Exception("Field '$field' is required");
            }
        }
        
        // Validate service intervals based on type
        if (in_array($data['service_interval_type'], ['Time-Based', 'Both']) && empty($data['service_interval_days'])) {
            throw new Exception("Service interval in days is required for time-based service");
        }
        
        if (in_array($data['service_interval_type'], ['Mileage-Based', 'Both']) && empty($data['service_interval_km'])) {
            throw new Exception("Service interval in kilometers is required for mileage-based service");
        }
        
        // Check if chassis number already exists
        $existing = $this->vehicleModel->findByChassisNumber($data['chassis_number']);
        if ($existing) {
            throw new Exception("Vehicle with chassis number '{$data['chassis_number']}' already exists");
        }
        
        // Check if number plate already exists
        $existing = $this->vehicleModel->findByNumberPlate($data['number_plate']);
        if ($existing) {
            throw new Exception("Vehicle with number plate '{$data['number_plate']}' already exists");
        }
        
        // Add created_by
        $data['created_by'] = $userId;
        
        $id = $this->vehicleModel->createVehicle($data);
        
        if (!$id) {
            throw new Exception("Failed to create vehicle");
        }
        
        return $this->vehicleModel->findById($id);
    }
    
    /**
     * Update vehicle
     */
    public function updateVehicle($id, $data, $userId) {
        $vehicle = $this->vehicleModel->findById($id);
        if (!$vehicle) {
            throw new Exception("Vehicle not found");
        }
        
        // Check if chassis number is being changed and if it conflicts
        if (isset($data['chassis_number']) && $data['chassis_number'] !== $vehicle['chassis_number']) {
            $existing = $this->vehicleModel->findByChassisNumber($data['chassis_number']);
            if ($existing) {
                throw new Exception("Vehicle with chassis number '{$data['chassis_number']}' already exists");
            }
        }
        
        // Check if number plate is being changed and if it conflicts
        if (isset($data['number_plate']) && $data['number_plate'] !== $vehicle['number_plate']) {
            $existing = $this->vehicleModel->findByNumberPlate($data['number_plate']);
            if ($existing) {
                throw new Exception("Vehicle with number plate '{$data['number_plate']}' already exists");
            }
        }
        
        // Add updated_by
        $data['updated_by'] = $userId;
        
        $success = $this->vehicleModel->updateVehicle($id, $data);
        
        if (!$success) {
            throw new Exception("Failed to update vehicle");
        }
        
        return $this->vehicleModel->findById($id);
    }
    
    /**
     * Delete vehicle
     */
    public function deleteVehicle($id) {
        $vehicle = $this->vehicleModel->findById($id);
        if (!$vehicle) {
            throw new Exception("Vehicle not found");
        }
        
        $success = $this->vehicleModel->delete($id);
        
        if (!$success) {
            throw new Exception("Failed to delete vehicle");
        }
        
        return true;
    }
    
    /**
     * Get vehicle by ID
     */
    public function getVehicleById($id) {
        $vehicle = $this->vehicleModel->findById($id);
        if (!$vehicle) {
            throw new Exception("Vehicle not found");
        }
        
        return $vehicle;
    }
    
    /**
     * Get all vehicles with pagination and filters
     */
    public function getAllVehicles($page = 1, $perPage = 20, $filters = [], $search = null, $orderBy = 'vehicle_name ASC') {
        $offset = ($page - 1) * $perPage;
        
        $vehicles = $this->vehicleModel->getAllVehicles($filters, $search, $orderBy, $perPage, $offset);
        $total = $this->vehicleModel->getVehicleCount($filters, $search);
        
        return [
            'data' => $vehicles,
            'pagination' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => ceil($total / $perPage)
            ]
        ];
    }
    
    /**
     * Update vehicle mileage
     */
    public function updateMileage($id, $mileage) {
        $vehicle = $this->vehicleModel->findById($id);
        if (!$vehicle) {
            throw new Exception("Vehicle not found");
        }
        
        if ($mileage < $vehicle['current_mileage']) {
            throw new Exception("New mileage cannot be less than current mileage");
        }
        
        $success = $this->vehicleModel->updateMileage($id, $mileage);
        
        if (!$success) {
            throw new Exception("Failed to update mileage");
        }
        
        return $this->vehicleModel->findById($id);
    }
    
    /**
     * Get vehicles due for service
     */
    public function getVehiclesDueForService() {
        return $this->vehicleModel->getVehiclesDueForService();
    }
}
