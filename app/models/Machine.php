<?php

require_once __DIR__ . '/BaseModel.php';

/**
 * Machine Model
 * Handles machine inventory management
 */
class Machine extends BaseModel {
    protected $table = 'machines';
    
    /**
     * Define table schema
     */
    protected function getSchema() {
        return [
            'id' => 'INT AUTO_INCREMENT PRIMARY KEY',
            'machine_id' => 'VARCHAR(50) UNIQUE NOT NULL',
            'serial_number' => 'VARCHAR(100) NULL',
            'model_number' => 'VARCHAR(100) NOT NULL',
            'machine_name' => 'VARCHAR(255) NOT NULL',
            'location' => 'VARCHAR(255) NOT NULL',
            'warranty_expiry' => 'DATE NULL',
            'warranty_provider' => 'VARCHAR(255) NULL',
            'insurance_type' => "ENUM('Full', 'Third-Party') NULL",
            'insurance_provider' => 'VARCHAR(255) NULL',
            'insurance_provider_details' => 'TEXT NULL',
            'insurance_renew_interval_days' => 'INT NULL',
            'last_insurance_renew_date' => 'DATE NULL',
            'last_insurance_renew_details' => 'TEXT NULL',
            'next_insurance_renew_date' => 'DATE NULL',
            'supplier_name' => 'VARCHAR(255) NOT NULL',
            'supplier_contact' => 'VARCHAR(100) NULL',
            'service_interval_days' => 'INT NOT NULL DEFAULT 90',
            'service_interval_hours' => 'INT NULL COMMENT "Service interval in operating hours"',
            'current_operating_hours' => 'INT NOT NULL DEFAULT 0 COMMENT "Current operating hours"',
            'last_service_date' => 'DATE NULL',
            'next_service_date' => 'DATE NULL',
            'last_service_hours' => 'INT NULL COMMENT "Operating hours at last service"',
            'next_service_hours' => 'INT NULL COMMENT "Next service threshold in operating hours"',
            'components' => 'TEXT NULL',
            'status' => "ENUM('Active', 'Inactive', 'Under Maintenance', 'Decommissioned', 'For Auction') DEFAULT 'Active'",
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
            'idx_location' => 'location',
            'idx_next_service' => 'next_service_date',
            'idx_next_service_hours' => 'next_service_hours',
            'idx_next_insurance_renew' => 'next_insurance_renew_date'
        ];
    }

    /**
     * Whether a value can be treated as a numeric value.
     */
    private function hasNumericValue($value): bool {
        return $value !== null && $value !== '' && is_numeric($value);
    }
    
    /**
     * Generate next machine ID in format MCH-001, MCH-002, etc.
     */
    public function generateMachineId() {
        $sql = "SELECT machine_id FROM `{$this->table}` ORDER BY id DESC LIMIT 1";
        $stmt = $this->db->query($sql);
        $lastMachine = $stmt->fetch();
        
        if (!$lastMachine || empty($lastMachine['machine_id'])) {
            return 'MCH-001';
        }
        
        // Extract the numeric part from MCH-XXX format
        $lastId = $lastMachine['machine_id'];
        preg_match('/MCH-(\d+)/', $lastId, $matches);
        
        if (!empty($matches[1])) {
            $nextNumber = intval($matches[1]) + 1;
            return 'MCH-' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);
        }
        
        return 'MCH-001';
    }
    
    /**
     * Create machine with components
     */
    public function createMachine($data) {
        // Auto-generate machine_id if not provided
        if (empty($data['machine_id'])) {
            $data['machine_id'] = $this->generateMachineId();
        }
        
        // Convert components array to JSON if provided
        if (isset($data['components']) && is_array($data['components'])) {
            $data['components'] = json_encode($data['components']);
        }
        
        // Calculate next service date if last service date is provided
        if (!empty($data['last_service_date']) && $this->hasNumericValue($data['service_interval_days'])) {
            $lastService = new DateTime($data['last_service_date']);
            $lastService->modify("+" . (int)$data['service_interval_days'] . " days");
            $data['next_service_date'] = $lastService->format('Y-m-d');
        }

        // Calculate next service operating-hour threshold when hour interval is configured.
        $lastServiceHours = null;
        if ($this->hasNumericValue($data['last_service_hours'] ?? null)) {
            $lastServiceHours = (int)$data['last_service_hours'];
        } elseif ($this->hasNumericValue($data['current_operating_hours'] ?? null)) {
            $lastServiceHours = (int)$data['current_operating_hours'];
            $data['last_service_hours'] = $lastServiceHours;
        }

        if ($lastServiceHours !== null && $this->hasNumericValue($data['service_interval_hours'] ?? null)) {
            $data['next_service_hours'] = $lastServiceHours + (int)$data['service_interval_hours'];
        }

        if (!empty($data['last_insurance_renew_date']) && $this->hasNumericValue($data['insurance_renew_interval_days'] ?? null) && (int)$data['insurance_renew_interval_days'] > 0) {
            $lastInsuranceRenew = new DateTime($data['last_insurance_renew_date']);
            $lastInsuranceRenew->modify('+' . (int)$data['insurance_renew_interval_days'] . ' days');
            $data['next_insurance_renew_date'] = $lastInsuranceRenew->format('Y-m-d');
        }
        
        return $this->create($data);
    }
    
    /**
     * Update machine
     */
    public function updateMachine($id, $data) {
        // Convert components array to JSON if provided
        if (isset($data['components']) && is_array($data['components'])) {
            $data['components'] = json_encode($data['components']);
        }

        $current = $this->findById($id);
        
        // Recalculate next service date if last service date or interval changed
        if (isset($data['last_service_date']) || isset($data['service_interval_days'])) {
            $lastService = isset($data['last_service_date']) ? $data['last_service_date'] : $current['last_service_date'];
            $interval = isset($data['service_interval_days']) ? $data['service_interval_days'] : $current['service_interval_days'];
            
            if (!empty($lastService) && $this->hasNumericValue($interval) && (int)$interval > 0) {
                $date = new DateTime($lastService);
                $date->modify("+" . (int)$interval . " days");
                $data['next_service_date'] = $date->format('Y-m-d');
            } elseif (isset($data['last_service_date']) || isset($data['service_interval_days'])) {
                $data['next_service_date'] = null;
            }
        }

        // Recalculate next service operating-hour threshold if hour fields change.
        if (isset($data['last_service_hours']) || isset($data['service_interval_hours']) || isset($data['current_operating_hours'])) {
            $lastServiceHours = array_key_exists('last_service_hours', $data)
                ? $data['last_service_hours']
                : $current['last_service_hours'];

            if (!$this->hasNumericValue($lastServiceHours) && $this->hasNumericValue($data['current_operating_hours'] ?? null)) {
                $lastServiceHours = $data['current_operating_hours'];
                $data['last_service_hours'] = (int)$lastServiceHours;
            }

            $intervalHours = array_key_exists('service_interval_hours', $data)
                ? $data['service_interval_hours']
                : $current['service_interval_hours'];

            if ($this->hasNumericValue($lastServiceHours) && $this->hasNumericValue($intervalHours) && (int)$intervalHours > 0) {
                $data['next_service_hours'] = (int)$lastServiceHours + (int)$intervalHours;
            } elseif (array_key_exists('service_interval_hours', $data) || array_key_exists('last_service_hours', $data)) {
                $data['next_service_hours'] = null;
            }
        }

        if (array_key_exists('last_insurance_renew_date', $data) || array_key_exists('insurance_renew_interval_days', $data)) {
            $lastInsuranceRenewDate = array_key_exists('last_insurance_renew_date', $data)
                ? $data['last_insurance_renew_date']
                : ($current['last_insurance_renew_date'] ?? null);

            $insuranceIntervalDays = array_key_exists('insurance_renew_interval_days', $data)
                ? $data['insurance_renew_interval_days']
                : ($current['insurance_renew_interval_days'] ?? null);

            if (!empty($lastInsuranceRenewDate) && $this->hasNumericValue($insuranceIntervalDays) && (int)$insuranceIntervalDays > 0) {
                $date = new DateTime($lastInsuranceRenewDate);
                $date->modify('+' . (int)$insuranceIntervalDays . ' days');
                $data['next_insurance_renew_date'] = $date->format('Y-m-d');
            } else {
                $data['next_insurance_renew_date'] = null;
            }
        }
        
        return $this->update($id, $data);
    }
    
    /**
     * Get machine with decoded components
     */
    public function getMachineById($id) {
        $machine = $this->findById($id);
        if ($machine && isset($machine['components'])) {
            $machine['components'] = json_decode($machine['components'], true);
        }
        return $machine;
    }
    
    /**
     * Get all machines with filters
     */
    public function getAllMachines($filters = [], $search = null, $orderBy = 'machine_name ASC', $limit = null, $offset = 0) {
        $sql = "SELECT * FROM `{$this->table}` WHERE 1=1";
        $params = [];
        
        // Apply filters
        if (!empty($filters['status'])) {
            $sql .= " AND status = ?";
            $params[] = $filters['status'];
        }
        
        if (!empty($filters['location'])) {
            $sql .= " AND location = ?";
            $params[] = $filters['location'];
        }
        
        // Apply search
        if ($search) {
            $sql .= " AND (machine_name LIKE ? OR model_number LIKE ? OR machine_id LIKE ? OR location LIKE ?)";
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
        $machines = $stmt->fetchAll();
        
        // Decode components for each machine
        foreach ($machines as &$machine) {
            if (isset($machine['components'])) {
                $machine['components'] = json_decode($machine['components'], true);
            }
        }
        
        return $machines;
    }
    
    /**
     * Get count of machines
     */
    public function getMachineCount($filters = [], $search = null) {
        $sql = "SELECT COUNT(*) as count FROM `{$this->table}` WHERE 1=1";
        $params = [];
        
        if (!empty($filters['status'])) {
            $sql .= " AND status = ?";
            $params[] = $filters['status'];
        }
        
        if (!empty($filters['location'])) {
            $sql .= " AND location = ?";
            $params[] = $filters['location'];
        }
        
        if ($search) {
            $sql .= " AND (machine_name LIKE ? OR model_number LIKE ? OR machine_id LIKE ? OR location LIKE ?)";
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
     * Get machines due for service
     */
    public function getMachinesDueForService() {
        $sql = "SELECT * FROM `{$this->table}` 
                WHERE status = 'Active' 
                AND (
                    (next_service_date IS NOT NULL AND next_service_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY))
                    OR
                    (
                        next_service_hours IS NOT NULL
                        AND current_operating_hours >= GREATEST(next_service_hours - 10, 0)
                    )
                )
                ORDER BY next_service_date ASC, next_service_hours ASC";
        
        $stmt = $this->db->query($sql);
        $machines = $stmt->fetchAll();
        
        foreach ($machines as &$machine) {
            if (isset($machine['components'])) {
                $machine['components'] = json_decode($machine['components'], true);
            }
        }
        
        return $machines;
    }
    
    /**
     * Find machine by machine ID
     */
    public function findByMachineId($machineId) {
        return $this->findOne(['machine_id' => $machineId]);
    }
    
    /**
     * Find machine by serial number
     */
    public function findBySerialNumber($serialNumber) {
        if (empty($serialNumber)) {
            return null;
        }
        return $this->findOne(['serial_number' => $serialNumber]);
    }
}
