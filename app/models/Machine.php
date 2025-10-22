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
            'serial_number' => 'VARCHAR(100) UNIQUE NOT NULL',
            'model_number' => 'VARCHAR(100) NOT NULL',
            'machine_name' => 'VARCHAR(255) NOT NULL',
            'location' => 'VARCHAR(255) NOT NULL',
            'warranty_expiry' => 'DATE NULL',
            'warranty_provider' => 'VARCHAR(255) NULL',
            'supplier_name' => 'VARCHAR(255) NOT NULL',
            'supplier_contact' => 'VARCHAR(100) NULL',
            'service_interval_days' => 'INT NOT NULL DEFAULT 90',
            'last_service_date' => 'DATE NULL',
            'next_service_date' => 'DATE NULL',
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
            'idx_next_service' => 'next_service_date'
        ];
    }
    
    /**
     * Create machine with components
     */
    public function createMachine($data) {
        // Convert components array to JSON if provided
        if (isset($data['components']) && is_array($data['components'])) {
            $data['components'] = json_encode($data['components']);
        }
        
        // Calculate next service date if last service date is provided
        if (isset($data['last_service_date']) && isset($data['service_interval_days'])) {
            $lastService = new DateTime($data['last_service_date']);
            $lastService->modify("+{$data['service_interval_days']} days");
            $data['next_service_date'] = $lastService->format('Y-m-d');
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
        
        // Recalculate next service date if last service date or interval changed
        if (isset($data['last_service_date']) || isset($data['service_interval_days'])) {
            $current = $this->findById($id);
            $lastService = isset($data['last_service_date']) ? $data['last_service_date'] : $current['last_service_date'];
            $interval = isset($data['service_interval_days']) ? $data['service_interval_days'] : $current['service_interval_days'];
            
            if ($lastService && $interval) {
                $date = new DateTime($lastService);
                $date->modify("+{$interval} days");
                $data['next_service_date'] = $date->format('Y-m-d');
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
            $sql .= " AND (machine_name LIKE ? OR model_number LIKE ? OR serial_number LIKE ? OR location LIKE ?)";
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
            $sql .= " AND (machine_name LIKE ? OR model_number LIKE ? OR serial_number LIKE ? OR location LIKE ?)";
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
                AND next_service_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
                ORDER BY next_service_date ASC";
        
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
     * Find machine by serial number
     */
    public function findBySerialNumber($serialNumber) {
        return $this->findOne(['serial_number' => $serialNumber]);
    }
}
