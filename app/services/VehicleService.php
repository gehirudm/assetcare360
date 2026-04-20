<?php

require_once __DIR__ . '/../models/Vehicle.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/Trip.php';

/**
 * Vehicle Service
 * Business logic for vehicle management
 */
class VehicleService {
    private $vehicleModel;
    private $userModel;
    private $tripModel;
    
    public function __construct() {
        $this->vehicleModel = new Vehicle();
        $this->userModel = new User();
        $this->tripModel = new Trip();
    }
    
    /**
     * Create a new vehicle
     */
    public function createVehicle($data, $userId) {
        $this->normalizeVehicleTypePayload($data, true);

        // Validate required fields
        $required = ['vehicle_name', 'number_plate',
                     'vehicle_type', 'fuel_type', 'supplier_name', 'service_interval_type'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                throw new Exception("Field '$field' is required");
            }
        }

        $this->normalizeCreateInsuranceFields($data);
        $this->normalizeCreateInsuranceFields($data);
        
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
        
        if (array_key_exists('last_service_date', $data)) {
            $lastServiceDate = $this->normalizeDateInput($data['last_service_date'], 'last_service_date', false);
            $this->ensureDateNotFuture($lastServiceDate, 'last_service_date');
            $data['last_service_date'] = $lastServiceDate;
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

        $this->normalizeVehicleTypePayload($data, false);

        if (array_key_exists('insurance_type', $data)) {
            $data['insurance_type'] = $this->normalizeInsuranceType($data['insurance_type'], false);
        }

        if (array_key_exists('insurance_provider', $data)) {
            $data['insurance_provider'] = $this->normalizeOptionalString($data['insurance_provider']);
        }

        if (array_key_exists('insurance_provider_details', $data)) {
            $data['insurance_provider_details'] = $this->normalizeOptionalString($data['insurance_provider_details']);
        }

        if (array_key_exists('last_insurance_renew_details', $data)) {
            $data['last_insurance_renew_details'] = $this->normalizeOptionalString($data['last_insurance_renew_details']);
        }

        if (array_key_exists('insurance_renew_interval_days', $data)) {
            $insuranceIntervalDays = $this->parseNullableNonNegativeInteger($data['insurance_renew_interval_days'], 'insurance_renew_interval_days');
            if ($insuranceIntervalDays !== null && $insuranceIntervalDays <= 0) {
                throw new Exception("Field 'insurance_renew_interval_days' must be greater than 0 when provided");
            }
            $data['insurance_renew_interval_days'] = $insuranceIntervalDays;
        }

        if (array_key_exists('last_insurance_renew_date', $data)) {
            $lastInsuranceRenewDate = $this->normalizeDateInput($data['last_insurance_renew_date'], 'last_insurance_renew_date', false);
            $this->ensureDateNotFuture($lastInsuranceRenewDate, 'last_insurance_renew_date');
            $data['last_insurance_renew_date'] = $lastInsuranceRenewDate;
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
        
        if (array_key_exists('last_service_date', $data)) {
            $lastServiceDate = $this->normalizeDateInput($data['last_service_date'], 'last_service_date', false);
            $this->ensureDateNotFuture($lastServiceDate, 'last_service_date');
            $data['last_service_date'] = $lastServiceDate;
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

        if (!array_key_exists('assigned_driver_id', $vehicle)) {
            throw new Exception("Driver assignment columns are not available. Please run the latest database migrations.");
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
            $activeTripCount = (int) $this->tripModel->getActiveTripCount((int) $driverId);
            if ($activeTripCount > 0) {
                throw new Exception("Cannot reassign driver while they have active trips");
            }

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

        if (!array_key_exists('assigned_driver_id', $vehicle)) {
            throw new Exception("Driver assignment columns are not available. Please run the latest database migrations.");
        }
        
        if (empty($vehicle['assigned_driver_id'])) {
            throw new Exception("Vehicle has no assigned driver");
        }

        $activeTripCount = (int) $this->tripModel->getActiveTripCount((int) $vehicle['assigned_driver_id']);
        if ($activeTripCount > 0) {
            throw new Exception("Cannot unassign driver while they have active trips");
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

    private function normalizeVehicleTypePayload(array &$data, bool $isCreate): void {
        if (array_key_exists('vehicle_name', $data)) {
            $data['vehicle_name'] = trim((string)$data['vehicle_name']);
        }

        if ($isCreate && (!array_key_exists('vehicle_type', $data) || trim((string)$data['vehicle_type']) === '')) {
            if (!empty($data['vehicle_name'])) {
                $data['vehicle_type'] = $data['vehicle_name'];
            }
        }

        if (array_key_exists('vehicle_type', $data)) {
            if (trim((string)$data['vehicle_type']) === '') {
                throw new Exception("Field 'vehicle_type' cannot be empty");
            }

            $data['vehicle_type'] = $this->normalizeVehicleTypeValue($data['vehicle_type']);
        }
    }

    private function normalizeVehicleTypeValue($value): string {
        $normalized = trim((string)$value);
        if ($normalized === '') {
            throw new Exception("Field 'vehicle_type' is required");
        }

        $allowedTypes = ['Truck', 'Van', 'Car', 'Bus', 'Bike', 'Three-Wheeler', 'Lorry', 'Tanker', 'Other'];
        foreach ($allowedTypes as $allowedType) {
            if (strcasecmp($normalized, $allowedType) === 0) {
                return $allowedType;
            }
        }

        $normalizedKey = strtolower(str_replace('_', ' ', $normalized));
        $normalizedKey = preg_replace('/\s+/', ' ', $normalizedKey);

        $vehicleTypeAliases = [
            'lpg distribution truck' => 'Truck',
            'cylinder delivery van' => 'Van',
            'forklift' => 'Other',
            'tanker lorry' => 'Tanker',
            'staff car' => 'Car',
            'pickup truck' => 'Truck',
            'three wheeler' => 'Three-Wheeler',
            'three-wheeler' => 'Three-Wheeler',
            'motorcycle' => 'Bike',
        ];

        if (isset($vehicleTypeAliases[$normalizedKey])) {
            return $vehicleTypeAliases[$normalizedKey];
        }

        if (strpos($normalizedKey, 'tanker') !== false) {
            return 'Tanker';
        }
        if (strpos($normalizedKey, 'truck') !== false) {
            return 'Truck';
        }
        if (strpos($normalizedKey, 'van') !== false) {
            return 'Van';
        }
        if (strpos($normalizedKey, 'car') !== false) {
            return 'Car';
        }
        if (strpos($normalizedKey, 'bus') !== false) {
            return 'Bus';
        }
        if (strpos($normalizedKey, 'bike') !== false || strpos($normalizedKey, 'motorcycle') !== false) {
            return 'Bike';
        }
        if (strpos($normalizedKey, 'three') !== false && strpos($normalizedKey, 'wheel') !== false) {
            return 'Three-Wheeler';
        }
        if (strpos($normalizedKey, 'lorry') !== false) {
            return 'Lorry';
        }

        throw new Exception("Field 'vehicle_type' must be one of: " . implode(', ', $allowedTypes));
    }

    private function normalizeInsuranceType($value, bool $required): ?string {
        $normalized = trim((string)($value ?? ''));
        if ($normalized === '') {
            if ($required) {
                throw new Exception("Field 'insurance_type' is required");
            }
            return null;
        }

        $lower = strtolower($normalized);
        if ($lower === 'full') {
            return 'Full';
        }

        if ($lower === 'third-party' || $lower === 'third party') {
            return 'Third-Party';
        }

        throw new Exception("Field 'insurance_type' must be either 'Full' or 'Third-Party'");
    }

    private function normalizeCreateInsuranceFields(array &$data): void {
        if (!$this->hasAnyInsuranceInput($data)) {
            $data['insurance_type'] = null;
            $data['insurance_provider'] = null;
            $data['insurance_provider_details'] = null;
            $data['insurance_renew_interval_days'] = null;
            $data['last_insurance_renew_date'] = null;
            $data['last_insurance_renew_details'] = null;
            return;
        }

        $data['insurance_type'] = $this->normalizeInsuranceType($data['insurance_type'] ?? null, true);
        $data['insurance_provider'] = $this->normalizeRequiredString($data['insurance_provider'] ?? null, 'insurance_provider');
        $data['insurance_provider_details'] = $this->normalizeRequiredString($data['insurance_provider_details'] ?? null, 'insurance_provider_details');
        $data['last_insurance_renew_details'] = $this->normalizeRequiredString($data['last_insurance_renew_details'] ?? null, 'last_insurance_renew_details');

        $insuranceIntervalDays = $this->parseNullableNonNegativeInteger($data['insurance_renew_interval_days'] ?? null, 'insurance_renew_interval_days');
        if ($insuranceIntervalDays === null || $insuranceIntervalDays <= 0) {
            throw new Exception("Field 'insurance_renew_interval_days' must be a positive number");
        }
        $data['insurance_renew_interval_days'] = $insuranceIntervalDays;

        $lastInsuranceRenewDate = $this->normalizeDateInput($data['last_insurance_renew_date'] ?? null, 'last_insurance_renew_date', true);
        $this->ensureDateNotFuture($lastInsuranceRenewDate, 'last_insurance_renew_date');
        $data['last_insurance_renew_date'] = $lastInsuranceRenewDate;
    }

    private function hasAnyInsuranceInput(array $data): bool {
        $insuranceFields = [
            'insurance_type',
            'insurance_provider',
            'insurance_provider_details',
            'insurance_renew_interval_days',
            'last_insurance_renew_date',
            'last_insurance_renew_details',
        ];

        foreach ($insuranceFields as $field) {
            if (!array_key_exists($field, $data)) {
                continue;
            }

            $value = $data[$field];
            if ($value === null) {
                continue;
            }

            if (is_string($value) && trim($value) === '') {
                continue;
            }

            return true;
        }

        return false;
    }

    private function normalizeRequiredString($value, string $field): string {
        $normalized = trim((string)($value ?? ''));
        if ($normalized === '') {
            throw new Exception("Field '{$field}' is required");
        }

        return $normalized;
    }

    private function normalizeOptionalString($value): ?string {
        if ($value === null) {
            return null;
        }

        $normalized = trim((string)$value);
        return $normalized !== '' ? $normalized : null;
    }

    private function normalizeDateInput($value, string $field, bool $required): ?string {
        $normalized = trim((string)($value ?? ''));
        if ($normalized === '') {
            if ($required) {
                throw new Exception("Field '{$field}' is required");
            }
            return null;
        }

        $date = DateTime::createFromFormat('Y-m-d', $normalized);
        if (!$date || $date->format('Y-m-d') !== $normalized) {
            throw new Exception("Field '{$field}' must be a valid date (YYYY-MM-DD)");
        }

        return $normalized;
    }

    private function ensureDateNotFuture($value, string $field): void {
        if ($value === null || $value === '') {
            return;
        }

        $normalized = trim((string)$value);
        $inputDate = DateTime::createFromFormat('Y-m-d', $normalized);
        if (!$inputDate || $inputDate->format('Y-m-d') !== $normalized) {
            throw new Exception("Field '{$field}' must be a valid date (YYYY-MM-DD)");
        }

        $today = new DateTime(date('Y-m-d'));
        if ($inputDate > $today) {
            throw new Exception("Field '{$field}' cannot be in the future");
        }
    }

    private function parseNullableNonNegativeInteger($value, string $field): ?int {
        if ($value === null || $value === '') {
            return null;
        }

        if (!is_numeric($value)) {
            throw new Exception("Field '{$field}' must be a valid number");
        }

        $normalized = (int)$value;
        if ($normalized < 0) {
            throw new Exception("Field '{$field}' cannot be negative");
        }

        return $normalized;
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
