<?php

require_once __DIR__ . '/../models/VehicleCheck.php';
require_once __DIR__ . '/../models/Vehicle.php';

class VehicleCheckService {
    private $vehicleCheckModel;
    private $vehicleModel;
    
    public function __construct($db) {
        $this->vehicleCheckModel = new VehicleCheck($db);
        $this->vehicleModel = new Vehicle();
    }
    
    /**
     * Get all vehicle checks with optional filters
     */
    public function getAllChecks($filters = []) {
        return $this->vehicleCheckModel->getAllChecks($filters);
    }
    
    /**
     * Get a specific check by check_id
     */
    public function getCheckByCheckId($checkId) {
        $check = $this->vehicleCheckModel->getCheckByCheckId($checkId);
        
        if (!$check) {
            throw new Exception("Vehicle check not found: {$checkId}");
        }
        
        return $check;
    }
    
    /**
     * Create a new vehicle check
     */
    public function createCheck($data) {
        // Validate required fields
        $required = ['vehicle_registration', 'odometer_reading', 'week_end_date'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                throw new Exception("Missing required field: {$field}");
            }
        }
        
        // Validate odometer reading
        if (!is_numeric($data['odometer_reading']) || $data['odometer_reading'] <= 0) {
            throw new Exception("Invalid odometer reading");
        }

        $data['week_end_date'] = $this->normalizeWeekEndDate($data['week_end_date']);
        
        // Validate odometer against vehicle's current mileage
        $vehicle = $this->vehicleModel->findByNumberPlate($data['vehicle_registration']);
        if ($vehicle && intval($data['odometer_reading']) < intval($vehicle['current_mileage'])) {
            throw new Exception("Odometer reading ({$data['odometer_reading']}) cannot be less than vehicle's current mileage ({$vehicle['current_mileage']})");
        }
        
        // Calculate week start date (6 days before week end)
        $weekEndDate = new DateTime($data['week_end_date']);
        $weekStartDate = clone $weekEndDate;
        $weekStartDate->modify('-6 days');
        
        $data['week_start_date'] = $weekStartDate->format('Y-m-d');
        
        // Check if check already exists for this week
        if ($this->vehicleCheckModel->checkExistsForWeek(
            $data['vehicle_registration'],
            $data['week_end_date'],
            $data['driver_id'] ?? null
        )) {
            throw new Exception("A vehicle check already exists for this week");
        }
        
        // Generate check ID if not provided
        if (!isset($data['check_id'])) {
            $data['check_id'] = $this->vehicleCheckModel->getNextCheckId();
        }
        
        // Set default checklist values if not provided
        $checklistItems = ['engine_oil', 'brakes', 'lights', 'tires', 'coolant', 'wipers'];
        foreach ($checklistItems as $item) {
            if (!isset($data[$item])) {
                $data[$item] = true;
            }
        }
        
        $check = $this->vehicleCheckModel->createCheck($data);
        
        if (!$check) {
            throw new Exception("Failed to create vehicle check");
        }
        
        // Update vehicle mileage if the odometer reading is higher
        if ($vehicle && intval($data['odometer_reading']) > intval($vehicle['current_mileage'])) {
            $this->vehicleModel->updateMileage($vehicle['id'], intval($data['odometer_reading']));
        }
        
        return $check;
    }
    
    /**
     * Approve a vehicle check
     */
    public function approveCheck($checkId, $reviewedBy, $notes = null) {
        $check = $this->vehicleCheckModel->getCheckByCheckId($checkId);
        
        if (!$check) {
            throw new Exception("Vehicle check not found: {$checkId}");
        }
        
        if ($check['status'] !== 'pending') {
            throw new Exception("Only pending checks can be approved");
        }
        
        $updatedCheck = $this->vehicleCheckModel->updateCheckStatus(
            $checkId,
            'approved',
            $reviewedBy,
            $notes
        );
        
        if (!$updatedCheck) {
            throw new Exception("Failed to approve vehicle check");
        }
        
        return $updatedCheck;
    }
    
    /**
     * Reject a vehicle check
     */
    public function rejectCheck($checkId, $reviewedBy, $rejectionReason, $notes = null) {
        if (empty($rejectionReason)) {
            throw new Exception("Rejection reason is required");
        }
        
        $check = $this->vehicleCheckModel->getCheckByCheckId($checkId);
        
        if (!$check) {
            throw new Exception("Vehicle check not found: {$checkId}");
        }
        
        if ($check['status'] !== 'pending') {
            throw new Exception("Only pending checks can be rejected");
        }
        
        $updatedCheck = $this->vehicleCheckModel->updateCheckStatus(
            $checkId,
            'rejected',
            $reviewedBy,
            $notes,
            $rejectionReason
        );
        
        if (!$updatedCheck) {
            throw new Exception("Failed to reject vehicle check");
        }
        
        return $updatedCheck;
    }
    
    /**
     * Get next check ID
     */
    public function getNextCheckId() {
        return $this->vehicleCheckModel->getNextCheckId();
    }

    private function normalizeWeekEndDate($value): string {
        $raw = trim((string) ($value ?? ''));
        if ($raw === '') {
            throw new Exception('week_end_date is required');
        }

        $date = DateTime::createFromFormat('Y-m-d', $raw);
        if (!$date || $date->format('Y-m-d') !== $raw) {
            throw new Exception('week_end_date must be in YYYY-MM-DD format');
        }

        $today = new DateTime(date('Y-m-d'));
        if ($date > $today) {
            throw new Exception('week_end_date cannot be in the future');
        }

        return $date->format('Y-m-d');
    }
}
