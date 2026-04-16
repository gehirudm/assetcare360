<?php

require_once __DIR__ . '/BaseModel.php';

/**
 * Vehicle Model
 * Handles vehicle inventory management
 */
class Vehicle extends BaseModel {
    protected $table = 'vehicles';
    private array $schemaCheckCache = [];
    
    /**
     * Define table schema
     */
    protected function getSchema() {
        return [
            'id' => 'INT AUTO_INCREMENT PRIMARY KEY',
            'vehicle_id' => 'VARCHAR(50) UNIQUE NOT NULL',
            'vehicle_name' => 'VARCHAR(255) NOT NULL',
            'model_number' => 'VARCHAR(100) NULL',
            'chassis_number' => 'VARCHAR(100) NULL',
            'number_plate' => 'VARCHAR(20) UNIQUE NOT NULL',
            'vehicle_type' => "ENUM('Truck', 'Van', 'Car', 'Bus', 'Bike', 'Three-Wheeler', 'Lorry', 'Tanker', 'Other') NOT NULL",
            'fuel_type' => "ENUM('Petrol', 'Diesel', 'Electric', 'Hybrid', 'LPG', 'CNG') NOT NULL",
            'government_fuel_qr_image' => 'VARCHAR(500) NULL COMMENT "Path to government-issued fuel QR image"',
            'warranty_expiry' => 'DATE NULL',
            'warranty_provider' => 'VARCHAR(255) NULL',
            'supplier_name' => 'VARCHAR(255) NOT NULL',
            'supplier_contact' => 'VARCHAR(100) NULL',
            'service_interval_type' => "ENUM('Time-Based', 'Mileage-Based', 'Both') DEFAULT 'Both'",
            'service_interval_days' => 'INT NULL COMMENT "Service interval in days"',
            'service_interval_km' => 'INT NULL COMMENT "Service interval in kilometers"',
            'current_mileage' => 'INT NOT NULL DEFAULT 0 COMMENT "Current odometer reading in km"',
            'last_service_date' => 'DATE NULL',
            'last_service_mileage' => 'INT NULL',
            'next_service_date' => 'DATE NULL',
            'next_service_mileage' => 'INT NULL',
            'status' => "ENUM('Active', 'Inactive', 'Under Maintenance', 'Decommissioned', 'For Auction') DEFAULT 'Active'",
            'components' => 'TEXT NULL COMMENT "JSON array of vehicle components"',
            'notes' => 'TEXT NULL',
            'created_by' => 'INT NULL',
            'updated_by' => 'INT NULL',
            'created_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
            'updated_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        ];
    }
    
    /**
     * Get additional indexes
     */
    protected function getIndexes() {
        return [
            'idx_status' => 'status',
            'idx_vehicle_type' => 'vehicle_type',
            'idx_next_service_date' => 'next_service_date',
            'idx_next_service_mileage' => 'next_service_mileage'
        ];
    }
    
    /**
     * Generate next vehicle ID in format VEH-001, VEH-002, etc.\n     */
    public function generateVehicleId() {
        $sql = "SELECT vehicle_id FROM `{$this->table}` ORDER BY id DESC LIMIT 1";
        $stmt = $this->db->query($sql);
        $lastVehicle = $stmt->fetch();
        
        if (!$lastVehicle || empty($lastVehicle['vehicle_id'])) {
            return 'VEH-001';
        }
        
        // Extract the numeric part from VEH-XXX format
        $lastId = $lastVehicle['vehicle_id'];
        preg_match('/VEH-(\\d+)/', $lastId, $matches);
        
        if (!empty($matches[1])) {
            $nextNumber = intval($matches[1]) + 1;
            return 'VEH-' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);
        }
        
        return 'VEH-001';
    }
    
    /**
     * Create vehicle
     */
    public function createVehicle($data) {
        // Auto-generate vehicle_id if not provided
        if (empty($data['vehicle_id'])) {
            $data['vehicle_id'] = $this->generateVehicleId();
        }
        
        // Encode components if provided as array
        if (isset($data['components']) && is_array($data['components'])) {
            $data['components'] = json_encode($data['components']);
        }
        
        // Calculate next service date if applicable
        if (!empty($data['last_service_date']) && !empty($data['service_interval_days'])) {
            $lastService = new DateTime($data['last_service_date']);
            $lastService->modify("+{$data['service_interval_days']} days");
            $data['next_service_date'] = $lastService->format('Y-m-d');
        }
        
        // Calculate next service mileage if applicable
        if (isset($data['last_service_mileage']) && !empty($data['service_interval_km'])) {
            $data['next_service_mileage'] = $data['last_service_mileage'] + $data['service_interval_km'];
        }
        
        return $this->create($data);
    }
    
    /**
     * Update vehicle
     */
    public function updateVehicle($id, $data) {
        // Encode components if provided as array
        if (isset($data['components']) && is_array($data['components'])) {
            $data['components'] = json_encode($data['components']);
        }
        
        $current = $this->findById($id);
        
        // Recalculate next service date if needed
        if (isset($data['last_service_date']) || isset($data['service_interval_days'])) {
            $lastServiceDate = $data['last_service_date'] ?? $current['last_service_date'];
            $intervalDays = $data['service_interval_days'] ?? $current['service_interval_days'];
            
            if ($lastServiceDate && $intervalDays) {
                $date = new DateTime($lastServiceDate);
                $date->modify("+{$intervalDays} days");
                $data['next_service_date'] = $date->format('Y-m-d');
            }
        }
        
        // Recalculate next service mileage if needed
        if (isset($data['last_service_mileage']) || isset($data['service_interval_km'])) {
            $lastServiceMileage = $data['last_service_mileage'] ?? $current['last_service_mileage'];
            $intervalKm = $data['service_interval_km'] ?? $current['service_interval_km'];
            
            if ($lastServiceMileage !== null && $intervalKm) {
                $data['next_service_mileage'] = $lastServiceMileage + $intervalKm;
            }
        }
        
        return $this->update($id, $data);
    }
    
    /**
     * Update vehicle mileage
     */
    public function updateMileage($id, $mileage) {
        return $this->update($id, ['current_mileage' => $mileage]);
    }
    
    /**
     * Get all vehicles with filters
     */
    public function getAllVehicles($filters = [], $search = null, $orderBy = 'vehicle_name ASC', $limit = null, $offset = 0) {
        $sql = "SELECT * FROM `{$this->table}` WHERE 1=1";
        $params = [];
        
        // Apply filters
        if (!empty($filters['status'])) {
            $sql .= " AND status = ?";
            $params[] = $filters['status'];
        }
        
        if (!empty($filters['vehicle_type'])) {
            $sql .= " AND vehicle_type = ?";
            $params[] = $filters['vehicle_type'];
        }
        
        if (!empty($filters['fuel_type'])) {
            $sql .= " AND fuel_type = ?";
            $params[] = $filters['fuel_type'];
        }
        
        // Apply search
        if ($search) {
            $sql .= " AND (vehicle_name LIKE ? OR model_number LIKE ? OR chassis_number LIKE ? OR number_plate LIKE ?)";
            $searchTerm = "%{$search}%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }
        
        // Apply ordering
        $sql .= " ORDER BY {$orderBy}";
        
        // Apply pagination
        if ($limit) {
            $sql .= " LIMIT ? OFFSET ?";
            $params[] = $limit;
            $params[] = $offset;
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $vehicles = $stmt->fetchAll();
        
        // Decode components JSON
        foreach ($vehicles as &$vehicle) {
            if (isset($vehicle['components'])) {
                $vehicle['components'] = json_decode($vehicle['components'], true) ?: [];
            }
        }
        
        return $vehicles;
    }
    
    /**
     * Get count of vehicles
     */
    public function getVehicleCount($filters = [], $search = null) {
        $sql = "SELECT COUNT(*) as count FROM `{$this->table}` WHERE 1=1";
        $params = [];
        
        if (!empty($filters['status'])) {
            $sql .= " AND status = ?";
            $params[] = $filters['status'];
        }
        
        if (!empty($filters['vehicle_type'])) {
            $sql .= " AND vehicle_type = ?";
            $params[] = $filters['vehicle_type'];
        }
        
        if (!empty($filters['fuel_type'])) {
            $sql .= " AND fuel_type = ?";
            $params[] = $filters['fuel_type'];
        }
        
        if ($search) {
            $sql .= " AND (vehicle_name LIKE ? OR model_number LIKE ? OR chassis_number LIKE ? OR number_plate LIKE ?)";
            $searchTerm = "%{$search}%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch();
        
        return (int) $result['count'];
    }
    
    /**
     * Get vehicles due for service (by date or mileage)
     */
    public function getVehiclesDueForService() {
        $sql = "SELECT * FROM `{$this->table}` 
                WHERE status = 'Active' 
                AND (
                    (next_service_date IS NOT NULL AND next_service_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY))
                    OR 
                    (next_service_mileage IS NOT NULL AND current_mileage >= next_service_mileage - 500)
                )
                ORDER BY next_service_date ASC, next_service_mileage ASC";
        
        $stmt = $this->db->query($sql);
        return $stmt->fetchAll();
    }
    
    /**
     * Get vehicle by number plate
     */
    public function findByNumberPlate($numberPlate) {
        return $this->findOne(['number_plate' => $numberPlate]);
    }
    
    /**
     * Get vehicle by chassis number
     */
    public function findByChassisNumber($chassisNumber) {
        return $this->findOne(['chassis_number' => $chassisNumber]);
    }
    
    /**
     * Override findById to decode JSON components
     */
    public function findById($id) {
        $vehicle = parent::findById($id);
        
        if ($vehicle && isset($vehicle['components'])) {
            $vehicle['components'] = json_decode($vehicle['components'], true) ?: [];
        }
        
        return $vehicle;
    }
    
    /**
     * Assign a driver to a vehicle
     */
    public function assignDriver($vehicleId, $driverId) {
        if (!$this->columnExists('assigned_driver_id')) {
            return false;
        }

        $sql = $this->columnExists('driver_assigned_at')
            ? "UPDATE `{$this->table}` SET assigned_driver_id = ?, driver_assigned_at = NOW() WHERE id = ?"
            : "UPDATE `{$this->table}` SET assigned_driver_id = ? WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$driverId, $vehicleId]);
    }
    
    /**
     * Unassign driver from a vehicle
     */
    public function unassignDriver($vehicleId) {
        if (!$this->columnExists('assigned_driver_id')) {
            return false;
        }

        $sql = $this->columnExists('driver_assigned_at')
            ? "UPDATE `{$this->table}` SET assigned_driver_id = NULL, driver_assigned_at = NULL WHERE id = ?"
            : "UPDATE `{$this->table}` SET assigned_driver_id = NULL WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$vehicleId]);
    }
    
    /**
     * Unassign driver from any vehicle they're assigned to
     */
    public function unassignDriverFromAllVehicles($driverId) {
        if (!$this->columnExists('assigned_driver_id')) {
            return false;
        }

        $sql = $this->columnExists('driver_assigned_at')
            ? "UPDATE `{$this->table}` SET assigned_driver_id = NULL, driver_assigned_at = NULL WHERE assigned_driver_id = ?"
            : "UPDATE `{$this->table}` SET assigned_driver_id = NULL WHERE assigned_driver_id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$driverId]);
    }
    
    /**
     * Get vehicle that a driver is currently assigned to
     */
    public function getVehicleByAssignedDriver($driverId) {
        if (!$this->columnExists('assigned_driver_id')) {
            return null;
        }

        return $this->findOne(['assigned_driver_id' => $driverId]);
    }
    
    /**
     * Get all vehicles with their assigned driver info (joined with users table)
     */
    public function getAllVehiclesWithDrivers($filters = [], $search = null, $orderBy = 'vehicle_name ASC') {
        $hasAssignedDriverColumn = $this->columnExists('assigned_driver_id');
        $driverSelect = $hasAssignedDriverColumn
            ? "u.id as driver_user_id, u.full_name as driver_name, u.employee_id as driver_employee_id, u.phone as driver_phone"
            : "NULL as driver_user_id, NULL as driver_name, NULL as driver_employee_id, NULL as driver_phone";
        $driverJoin = $hasAssignedDriverColumn ? "LEFT JOIN users u ON v.assigned_driver_id = u.id" : "";

        $sql = "SELECT v.*, {$driverSelect}
                FROM `{$this->table}` v
                {$driverJoin}
                WHERE 1=1";
        $params = [];
        
        // Apply filters
        if (!empty($filters['status'])) {
            $sql .= " AND v.status = ?";
            $params[] = $filters['status'];
        }
        
        if (!empty($filters['vehicle_type'])) {
            $sql .= " AND v.vehicle_type = ?";
            $params[] = $filters['vehicle_type'];
        }
        
        if (!empty($filters['assignment_status']) && $hasAssignedDriverColumn) {
            if ($filters['assignment_status'] === 'assigned') {
                $sql .= " AND v.assigned_driver_id IS NOT NULL";
            } elseif ($filters['assignment_status'] === 'unassigned') {
                $sql .= " AND v.assigned_driver_id IS NULL";
            }
        } elseif (!empty($filters['assignment_status']) && $filters['assignment_status'] === 'assigned') {
            return [];
        }
        
        // Apply search
        if ($search && $hasAssignedDriverColumn) {
            $sql .= " AND (v.vehicle_name LIKE ? OR v.number_plate LIKE ? OR u.full_name LIKE ?)";
            $searchTerm = "%{$search}%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        } elseif ($search) {
            $sql .= " AND (v.vehicle_name LIKE ? OR v.number_plate LIKE ?)";
            $searchTerm = "%{$search}%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }
        
        $sql .= " ORDER BY {$orderBy}";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $vehicles = $stmt->fetchAll();
        
        // Decode components JSON
        foreach ($vehicles as &$vehicle) {
            if (isset($vehicle['components'])) {
                $vehicle['components'] = json_decode($vehicle['components'], true) ?: [];
            }
        }
        
        return $vehicles;
    }
    
    /**
     * Get vehicle with driver info by number plate
     */
    public function getVehicleWithDriverByNumberPlate($numberPlate) {
        $hasAssignedDriverColumn = $this->columnExists('assigned_driver_id');
        $driverSelect = $hasAssignedDriverColumn
            ? "u.id as driver_user_id, u.full_name as driver_name, u.employee_id as driver_employee_id, u.phone as driver_phone"
            : "NULL as driver_user_id, NULL as driver_name, NULL as driver_employee_id, NULL as driver_phone";
        $driverJoin = $hasAssignedDriverColumn ? "LEFT JOIN users u ON v.assigned_driver_id = u.id" : "";

        $sql = "SELECT v.*, {$driverSelect}
                FROM `{$this->table}` v
                {$driverJoin}
                WHERE v.number_plate = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$numberPlate]);
        $vehicle = $stmt->fetch();
        
        if ($vehicle && isset($vehicle['components'])) {
            $vehicle['components'] = json_decode($vehicle['components'], true) ?: [];
        }
        
        return $vehicle ?: null;
    }

    private function tableExists(string $table): bool {
        $cacheKey = "table:{$table}";
        if (array_key_exists($cacheKey, $this->schemaCheckCache)) {
            return $this->schemaCheckCache[$cacheKey];
        }

        $stmt = $this->db->prepare(
            'SELECT COUNT(*)
             FROM information_schema.tables
             WHERE table_schema = DATABASE()
               AND table_name = ?'
        );
        $stmt->execute([$table]);
        $exists = ((int) $stmt->fetchColumn()) > 0;
        $this->schemaCheckCache[$cacheKey] = $exists;

        return $exists;
    }

    private function columnExists(string $column): bool {
        $cacheKey = "column:{$this->table}.{$column}";
        if (array_key_exists($cacheKey, $this->schemaCheckCache)) {
            return $this->schemaCheckCache[$cacheKey];
        }

        if (!$this->tableExists($this->table)) {
            $this->schemaCheckCache[$cacheKey] = false;
            return false;
        }

        $stmt = $this->db->prepare(
            'SELECT COUNT(*)
             FROM information_schema.columns
             WHERE table_schema = DATABASE()
               AND table_name = ?
               AND column_name = ?'
        );
        $stmt->execute([$this->table, $column]);
        $exists = ((int) $stmt->fetchColumn()) > 0;
        $this->schemaCheckCache[$cacheKey] = $exists;

        return $exists;
    }
}
