<?php

require_once __DIR__ . '/../models/Vehicle.php';
require_once __DIR__ . '/../models/User.php';

/**
 * Vehicle Service
 * Business logic for vehicle management
 */
class VehicleService {
    private $vehicleModel;
    private $userModel;
    
    public function __construct() {
        $this->vehicleModel = new Vehicle();
        $this->userModel = new User();
    }
    
    /**
     * Create a new vehicle
     */
    public function createVehicle($data, $userId) {
        // Validate required fields
        $required = ['vehicle_name', 'number_plate', 
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
        
        // Validate last service mileage
        if (!empty($data['last_service_mileage']) && !empty($data['current_mileage'])) {
            if ($data['last_service_mileage'] > $data['current_mileage']) {
                throw new Exception("Last service mileage cannot be greater than current mileage");
            }
        }
        
        // Validate last service date
        if (!empty($data['last_service_date'])) {
            $lastServiceDate = new DateTime($data['last_service_date']);
            $currentDate = new DateTime();
            
            if ($lastServiceDate > $currentDate) {
                throw new Exception("Last service date cannot be in the future");
            }
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
        
        $createdVehicle = $this->vehicleModel->findById($id);
        return $this->ensureFuelQrImageIsPubliclyServed($createdVehicle);
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
        
        // Validate last service mileage
        $currentMileage = isset($data['current_mileage']) ? $data['current_mileage'] : $vehicle['current_mileage'];
        $lastServiceMileage = isset($data['last_service_mileage']) ? $data['last_service_mileage'] : $vehicle['last_service_mileage'];
        
        if ($lastServiceMileage !== null && $currentMileage !== null && $lastServiceMileage > $currentMileage) {
            throw new Exception("Last service mileage cannot be greater than current mileage");
        }
        
        // Validate last service date
        if (isset($data['last_service_date']) && !empty($data['last_service_date'])) {
            $lastServiceDate = new DateTime($data['last_service_date']);
            $currentDate = new DateTime();
            
            if ($lastServiceDate > $currentDate) {
                throw new Exception("Last service date cannot be in the future");
            }
        }
        
        // Add updated_by
        $data['updated_by'] = $userId;
        
        $success = $this->vehicleModel->updateVehicle($id, $data);
        
        if (!$success) {
            throw new Exception("Failed to update vehicle");
        }
        
        $updatedVehicle = $this->vehicleModel->findById($id);
        return $this->ensureFuelQrImageIsPubliclyServed($updatedVehicle);
    }

    /**
     * Upload and update government fuel QR image for a vehicle
     */
    public function updateFuelQrImage($id, $file, $userId) {
        $vehicle = $this->vehicleModel->findById($id);
        if (!$vehicle) {
            throw new Exception('Vehicle not found');
        }

        if (!is_array($file) || !isset($file['error'])) {
            throw new Exception('Fuel QR image file is required');
        }

        if ((int)$file['error'] !== UPLOAD_ERR_OK) {
            throw new Exception('Failed to upload fuel QR image');
        }

        if (empty($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
            throw new Exception('Invalid uploaded file');
        }

        $maxSize = 5 * 1024 * 1024; // 5MB
        if ((int)($file['size'] ?? 0) > $maxSize) {
            throw new Exception('Fuel QR image must be 5MB or smaller');
        }

        $imageInfo = @getimagesize($file['tmp_name']);
        if (!$imageInfo || empty($imageInfo['mime'])) {
            throw new Exception('Fuel QR image must be a valid image file');
        }

        $allowedMimes = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
        ];

        $mime = strtolower((string)$imageInfo['mime']);
        if (!isset($allowedMimes[$mime])) {
            throw new Exception('Only JPG, PNG, or WEBP images are allowed');
        }

        $uploadDir = __DIR__ . '/../../public/uploads/vehicle-fuel-qr/';
        if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true)) {
            throw new Exception('Unable to create upload directory');
        }

        $suffix = uniqid();
        if (function_exists('random_bytes')) {
            try {
                $suffix = bin2hex(random_bytes(4));
            } catch (Exception $ignored) {
                $suffix = uniqid();
            }
        }
        $filename = 'vehicle_fuel_qr_' . $id . '_' . time() . '_' . $suffix . '.' . $allowedMimes[$mime];
        $absolutePath = $uploadDir . $filename;
        $relativePath = 'uploads/vehicle-fuel-qr/' . $filename;

        if (!move_uploaded_file($file['tmp_name'], $absolutePath)) {
            throw new Exception('Unable to store fuel QR image');
        }

        $previousPath = $vehicle['government_fuel_qr_image'] ?? null;

        $success = $this->vehicleModel->updateVehicle($id, [
            'government_fuel_qr_image' => $relativePath,
            'updated_by' => $userId,
        ]);

        if (!$success) {
            @unlink($absolutePath);
            throw new Exception('Failed to update vehicle fuel QR image');
        }

        $this->deleteExistingFuelQrImage($previousPath, $relativePath);

        $updatedVehicle = $this->vehicleModel->findById($id);
        return $this->ensureFuelQrImageIsPubliclyServed($updatedVehicle);
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
        
        return $this->ensureFuelQrImageIsPubliclyServed($vehicle);
    }
    
    /**
     * Get all vehicles with pagination and filters
     */
    public function getAllVehicles($page = 1, $perPage = 20, $filters = [], $search = null, $orderBy = 'vehicle_name ASC') {
        $offset = ($page - 1) * $perPage;
        
        $vehicles = $this->vehicleModel->getAllVehicles($filters, $search, $orderBy, $perPage, $offset);
        $total = $this->vehicleModel->getVehicleCount($filters, $search);
        $vehicles = $this->ensureFuelQrImageListIsPubliclyServed($vehicles);
        
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
        
        $updatedVehicle = $this->vehicleModel->findById($id);
        return $this->ensureFuelQrImageIsPubliclyServed($updatedVehicle);
    }
    
    /**
     * Get vehicles due for service
     */
    public function getVehiclesDueForService() {
        return $this->vehicleModel->getVehiclesDueForService();
    }
    
    /**
     * Get next vehicle ID
     */
    public function getNextVehicleId() {
        return $this->vehicleModel->generateVehicleId();
    }
    
    /**
     * Assign driver to vehicle
     * Enforces one-driver-per-vehicle and one-vehicle-per-driver rules
     */
    public function assignDriverToVehicle($vehicleId, $driverId) {
        // Validate vehicle exists
        $vehicle = $this->vehicleModel->findById($vehicleId);
        if (!$vehicle) {
            throw new Exception("Vehicle not found");
        }
        
        // Validate driver exists and is active
        $driver = $this->userModel->findById($driverId);
        if (!$driver) {
            throw new Exception("Driver not found");
        }
        
        if (!$driver['is_active']) {
            throw new Exception("Driver is not active");
        }
        
        if ($driver['role'] !== 'Driver') {
            throw new Exception("User is not a driver");
        }
        
        // Check if driver is already assigned to another vehicle
        $existingVehicle = $this->vehicleModel->getVehicleByAssignedDriver($driverId);
        $previousVehicle = null;
        
        if ($existingVehicle && $existingVehicle['id'] !== $vehicleId) {
            // Unassign from the previous vehicle (driver can only be assigned to one vehicle)
            $previousVehicle = $existingVehicle;
            $this->vehicleModel->unassignDriver($existingVehicle['id']);
        }
        
        // Assign driver to the new vehicle
        $success = $this->vehicleModel->assignDriver($vehicleId, $driverId);
        
        if (!$success) {
            throw new Exception("Failed to assign driver to vehicle");
        }
        
        // Return updated vehicle with driver info
        $updatedVehicle = $this->vehicleModel->getVehicleWithDriverByNumberPlate($vehicle['number_plate']);
        $updatedVehicle = $this->ensureFuelQrImageIsPubliclyServed($updatedVehicle);
        
        return [
            'vehicle' => $updatedVehicle,
            'previous_vehicle' => $previousVehicle ? [
                'id' => $previousVehicle['id'],
                'vehicle_id' => $previousVehicle['vehicle_id'],
                'vehicle_name' => $previousVehicle['vehicle_name'],
                'number_plate' => $previousVehicle['number_plate']
            ] : null
        ];
    }
    
    /**
     * Unassign driver from vehicle
     */
    public function unassignDriverFromVehicle($vehicleId) {
        $vehicle = $this->vehicleModel->findById($vehicleId);
        if (!$vehicle) {
            throw new Exception("Vehicle not found");
        }
        
        if (!$vehicle['assigned_driver_id']) {
            throw new Exception("Vehicle has no assigned driver");
        }
        
        $success = $this->vehicleModel->unassignDriver($vehicleId);
        
        if (!$success) {
            throw new Exception("Failed to unassign driver from vehicle");
        }
        
        $updatedVehicle = $this->vehicleModel->findById($vehicleId);
        return $this->ensureFuelQrImageIsPubliclyServed($updatedVehicle);
    }
    
    /**
     * Get all vehicles with driver assignments
     */
    public function getVehiclesWithDriverAssignments($filters = [], $search = null) {
        $vehicles = $this->vehicleModel->getAllVehiclesWithDrivers($filters, $search);
        return $this->ensureFuelQrImageListIsPubliclyServed($vehicles);
    }
    
    /**
     * Get vehicle with driver info by number plate
     */
    public function getVehicleWithDriverByNumberPlate($numberPlate) {
        $vehicle = $this->vehicleModel->getVehicleWithDriverByNumberPlate($numberPlate);
        if (!$vehicle) {
            throw new Exception("Vehicle not found");
        }
        return $this->ensureFuelQrImageIsPubliclyServed($vehicle);
    }
    
    /**
     * Get vehicle assigned to a specific driver
     * Returns null if no vehicle is assigned
     */
    public function getVehicleAssignedToDriver($driverId) {
        $vehicle = $this->vehicleModel->getVehicleByAssignedDriver($driverId);
        return $this->ensureFuelQrImageIsPubliclyServed($vehicle);
    }

    private function deleteExistingFuelQrImage($previousPath, $currentPath) {
        if (!$previousPath || $previousPath === $currentPath) {
            return;
        }

        $normalized = ltrim((string)$previousPath, '/');
        if (strpos($normalized, 'uploads/vehicle-fuel-qr/') !== 0) {
            return;
        }

        $publicAbsolute = __DIR__ . '/../../public/' . $normalized;
        if (is_file($publicAbsolute)) {
            @unlink($publicAbsolute);
        }

        $legacyAbsolute = __DIR__ . '/../../' . $normalized;
        if (is_file($legacyAbsolute)) {
            @unlink($legacyAbsolute);
        }
    }

    private function ensureFuelQrImageIsPubliclyServed($vehicle) {
        if (!is_array($vehicle)) {
            return $vehicle;
        }

        $path = $vehicle['government_fuel_qr_image'] ?? null;
        if (!$path || !is_string($path)) {
            return $vehicle;
        }

        $normalized = ltrim(str_replace('\\', '/', trim($path)), '/');
        if (strpos($normalized, 'uploads/vehicle-fuel-qr/') !== 0) {
            return $vehicle;
        }

        $publicAbsolute = __DIR__ . '/../../public/' . $normalized;
        if (is_file($publicAbsolute)) {
            return $vehicle;
        }

        $legacyAbsolute = __DIR__ . '/../../' . $normalized;
        if (!is_file($legacyAbsolute)) {
            return $vehicle;
        }

        $publicDirectory = dirname($publicAbsolute);
        if (!is_dir($publicDirectory)) {
            @mkdir($publicDirectory, 0755, true);
        }

        if (is_dir($publicDirectory) && !is_file($publicAbsolute)) {
            @copy($legacyAbsolute, $publicAbsolute);
        }

        return $vehicle;
    }

    private function ensureFuelQrImageListIsPubliclyServed($vehicles) {
        if (!is_array($vehicles)) {
            return $vehicles;
        }

        foreach ($vehicles as $index => $vehicle) {
            if (is_array($vehicle)) {
                $vehicles[$index] = $this->ensureFuelQrImageIsPubliclyServed($vehicle);
            }
        }

        return $vehicles;
    }
}
