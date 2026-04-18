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

        $serviceIntervalDays = $this->parseNullableNonNegativeInteger($data['service_interval_days'] ?? null, 'service_interval_days');
        if ($serviceIntervalDays === null || $serviceIntervalDays <= 0) {
            throw new Exception("Field 'service_interval_days' must be a positive number");
        }
        $data['service_interval_days'] = $serviceIntervalDays;

        $serviceIntervalHours = $this->parseNullableNonNegativeInteger($data['service_interval_hours'] ?? null, 'service_interval_hours');
        if ($serviceIntervalHours !== null && $serviceIntervalHours <= 0) {
            throw new Exception("Field 'service_interval_hours' must be greater than 0 when provided");
        }
        if ($serviceIntervalHours !== null) {
            $data['service_interval_hours'] = $serviceIntervalHours;
        }

        $currentOperatingHours = $this->parseNullableNonNegativeInteger($data['current_operating_hours'] ?? null, 'current_operating_hours');
        $lastServiceHours = $this->parseNullableNonNegativeInteger($data['last_service_hours'] ?? null, 'last_service_hours');

        if ($lastServiceHours !== null && $currentOperatingHours !== null && $lastServiceHours > $currentOperatingHours) {
            throw new Exception('Last service hours cannot be greater than current operating hours');
        }

        if ($currentOperatingHours !== null) {
            $data['current_operating_hours'] = $currentOperatingHours;
        }
        if ($lastServiceHours !== null) {
            $data['last_service_hours'] = $lastServiceHours;
        }
        if ($lastServiceHours !== null && $currentOperatingHours === null) {
            $data['current_operating_hours'] = $lastServiceHours;
        }
        
        // Validate last service date is not in the future
        if (!empty($data['last_service_date'])) {
            $lastServiceDate = strtotime($data['last_service_date']);
            $today = strtotime(date('Y-m-d'));
            
            if ($lastServiceDate > $today) {
                throw new Exception("Last service date cannot be in the future");
            }
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

        if (array_key_exists('service_interval_days', $data)) {
            $serviceIntervalDays = $this->parseNullableNonNegativeInteger($data['service_interval_days'], 'service_interval_days');
            if ($serviceIntervalDays !== null && $serviceIntervalDays <= 0) {
                throw new Exception("Field 'service_interval_days' must be greater than 0 when provided");
            }
            if ($serviceIntervalDays === null) {
                unset($data['service_interval_days']);
            } else {
                $data['service_interval_days'] = $serviceIntervalDays;
            }
        }

        if (array_key_exists('service_interval_hours', $data)) {
            $serviceIntervalHours = $this->parseNullableNonNegativeInteger($data['service_interval_hours'], 'service_interval_hours');
            if ($serviceIntervalHours !== null && $serviceIntervalHours <= 0) {
                throw new Exception("Field 'service_interval_hours' must be greater than 0 when provided");
            }
            $data['service_interval_hours'] = $serviceIntervalHours;
        }

        $currentOperatingHours = array_key_exists('current_operating_hours', $data)
            ? $this->parseNullableNonNegativeInteger($data['current_operating_hours'], 'current_operating_hours')
            : $this->parseNullableNonNegativeInteger($machine['current_operating_hours'] ?? null, 'current_operating_hours');

        $lastServiceHours = array_key_exists('last_service_hours', $data)
            ? $this->parseNullableNonNegativeInteger($data['last_service_hours'], 'last_service_hours')
            : $this->parseNullableNonNegativeInteger($machine['last_service_hours'] ?? null, 'last_service_hours');

        if ($lastServiceHours !== null && $currentOperatingHours !== null && $lastServiceHours > $currentOperatingHours) {
            throw new Exception('Last service hours cannot be greater than current operating hours');
        }

        if (array_key_exists('current_operating_hours', $data)) {
            if ($currentOperatingHours === null) {
                unset($data['current_operating_hours']);
            } else {
                $data['current_operating_hours'] = $currentOperatingHours;
            }
        }

        if (array_key_exists('last_service_hours', $data)) {
            $data['last_service_hours'] = $lastServiceHours;
        }
        
        // Validate last service date is not in the future
        if (!empty($data['last_service_date'])) {
            $lastServiceDate = strtotime($data['last_service_date']);
            $today = strtotime(date('Y-m-d'));
            
            if ($lastServiceDate > $today) {
                throw new Exception("Last service date cannot be in the future");
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

    /**
     * Parse optional non-negative integer input.
     */
    private function parseNullableNonNegativeInteger($value, string $field): ?int {
        if ($value === null || $value === '') {
            return null;
        }

        if (!is_numeric($value)) {
            throw new Exception("Field '$field' must be a valid number");
        }

        $normalized = (int)$value;
        if ($normalized < 0) {
            throw new Exception("Field '$field' cannot be negative");
        }

        return $normalized;
    }
    
    /**
     * Get next machine ID
     */
    public function getNextMachineId() {
        return $this->machineModel->generateMachineId();
    }
}
