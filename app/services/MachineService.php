<?php

require_once __DIR__ . '/../models/Machine.php';

/**
 * Machine Service
 * Business logic for machine management
 */
class MachineService {
    private $machineModel;
    
    public function __construct() {
        $this->machineModel = new Machine();
    }
    
    /**
     * Create a new machine
     */
    public function createMachine($data, $userId) {
        // Validate required fields
        $required = ['model_number', 'machine_name', 'location', 'supplier_name', 'service_interval_days'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                throw new Exception("Field '$field' is required");
            }
        }
        
        // Check if model number already exists
        $existing = $this->machineModel->findOne(['model_number' => $data['model_number']]);
        if ($existing) {
            throw new Exception("Machine with model number '{$data['model_number']}' already exists");
        }
        
        // Add created_by
        $data['created_by'] = $userId;
        
        $id = $this->machineModel->createMachine($data);
        
        if (!$id) {
            throw new Exception("Failed to create machine");
        }
        
        return $this->machineModel->getMachineById($id);
    }
    
    /**
     * Update machine
     */
    public function updateMachine($id, $data, $userId) {
        $machine = $this->machineModel->findById($id);
        if (!$machine) {
            throw new Exception("Machine not found");
        }
        
        // Check if model number is being changed and if it conflicts
        if (isset($data['model_number']) && $data['model_number'] !== $machine['model_number']) {
            $existing = $this->machineModel->findOne(['model_number' => $data['model_number']]);
            if ($existing) {
                throw new Exception("Machine with model number '{$data['model_number']}' already exists");
            }
        }
        
        // Add updated_by
        $data['updated_by'] = $userId;
        
        $success = $this->machineModel->updateMachine($id, $data);
        
        if (!$success) {
            throw new Exception("Failed to update machine");
        }
        
        return $this->machineModel->getMachineById($id);
    }
    
    /**
     * Delete machine
     */
    public function deleteMachine($id) {
        $machine = $this->machineModel->findById($id);
        if (!$machine) {
            throw new Exception("Machine not found");
        }
        
        $success = $this->machineModel->delete($id);
        
        if (!$success) {
            throw new Exception("Failed to delete machine");
        }
        
        return true;
    }
    
    /**
     * Get machine by ID
     */
    public function getMachineById($id) {
        $machine = $this->machineModel->getMachineById($id);
        if (!$machine) {
            throw new Exception("Machine not found");
        }
        
        return $machine;
    }
    
    /**
     * Get all machines with pagination and filters
     */
    public function getAllMachines($page = 1, $perPage = 20, $filters = [], $search = null, $orderBy = 'machine_name ASC') {
        $offset = ($page - 1) * $perPage;
        
        $machines = $this->machineModel->getAllMachines($filters, $search, $orderBy, $perPage, $offset);
        $total = $this->machineModel->getMachineCount($filters, $search);
        
        return [
            'data' => $machines,
            'pagination' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => ceil($total / $perPage)
            ]
        ];
    }
    
    /**
     * Get machines due for service
     */
    public function getMachinesDueForService() {
        return $this->machineModel->getMachinesDueForService();
    }
}
