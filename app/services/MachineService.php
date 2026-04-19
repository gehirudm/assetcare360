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
        
        if (array_key_exists('last_service_date', $data)) {
            $lastServiceDate = $this->normalizeDateInput($data['last_service_date'], 'last_service_date', false);
            $this->ensureDateNotFuture($lastServiceDate, 'last_service_date');
            $data['last_service_date'] = $lastServiceDate;
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
        
        if (array_key_exists('last_service_date', $data)) {
            $lastServiceDate = $this->normalizeDateInput($data['last_service_date'], 'last_service_date', false);
            $this->ensureDateNotFuture($lastServiceDate, 'last_service_date');
            $data['last_service_date'] = $lastServiceDate;
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
        $date = DateTime::createFromFormat('Y-m-d', $normalized);
        if (!$date || $date->format('Y-m-d') !== $normalized) {
            throw new Exception("Field '{$field}' must be a valid date (YYYY-MM-DD)");
        }

        $today = new DateTime(date('Y-m-d'));
        if ($date > $today) {
            throw new Exception("Field '{$field}' cannot be in the future");
        }
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
