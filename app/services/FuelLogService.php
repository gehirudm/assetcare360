<?php

require_once __DIR__ . '/../models/FuelLog.php';
require_once __DIR__ . '/../models/Vehicle.php';

class FuelLogService {
    private $fuelLogModel;
    private $vehicleModel;

    public function __construct() {
        $this->fuelLogModel = new FuelLog();
        $this->vehicleModel = new Vehicle();
    }

    public function getAllLogs($filters = []) {
        return $this->fuelLogModel->getAllLogs($filters);
    }

    public function getLogById($fuel_log_id) {
        $log = $this->fuelLogModel->getLogByFuelLogId($fuel_log_id);
        if (!$log) {
            throw new Exception("Fuel log not found");
        }
        return $log;
    }

    public function createLog($data) {
        // Validate required fields
        $required = ['vehicle_registration', 'log_datetime', 'fuel_volume', 'total_cost', 'odometer_reading', 'fuel_type'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                throw new Exception("Missing required field: {$field}");
            }
        }

        // Validate numeric values
        if ($data['fuel_volume'] <= 0) {
            throw new Exception("Fuel volume must be greater than zero");
        }
        if ($data['total_cost'] <= 0) {
            throw new Exception("Total cost must be greater than zero");
        }
        if ($data['odometer_reading'] <= 0) {
            throw new Exception("Odometer reading must be greater than zero");
        }
        
        // Validate odometer against vehicle's current mileage
        $vehicle = $this->vehicleModel->findByNumberPlate($data['vehicle_registration']);
        if ($vehicle && intval($data['odometer_reading']) < intval($vehicle['current_mileage'])) {
            throw new Exception("Odometer reading ({$data['odometer_reading']}) cannot be less than vehicle's current mileage ({$vehicle['current_mileage']})");
        }

        // Generate fuel_log_id
        $lastId = $this->fuelLogModel->getLastFuelLogId();
        $counter = 1;
        if ($lastId) {
            preg_match('/FL-(\d+)/', $lastId, $matches);
            if (!empty($matches[1])) {
                $counter = intval($matches[1]) + 1;
            }
        }
        $data['fuel_log_id'] = 'FL-' . str_pad($counter, 3, '0', STR_PAD_LEFT);

        // Auto-compute distance and efficiency if previous odometer exists
        $prev = $this->fuelLogModel->getLastOdometerForVehicle($data['vehicle_registration']);
        if ($prev) {
            $distance = intval($data['odometer_reading']) - intval($prev['odometer_reading']);
            if ($distance > 0) {
                $data['distance_since_last'] = $distance;
                if ($data['fuel_volume'] > 0) {
                    $data['fuel_efficiency'] = round($distance / $data['fuel_volume'], 2);
                }
            }
        }

        $log = $this->fuelLogModel->createLog($data);
        if (!$log) {
            throw new Exception("Failed to create fuel log");
        }
        
        // Update vehicle mileage if the odometer reading is higher
        if ($vehicle && intval($data['odometer_reading']) > intval($vehicle['current_mileage'])) {
            $this->vehicleModel->updateMileage($vehicle['id'], intval($data['odometer_reading']));
        }
        
        return $log;
    }

    public function updateLog($fuel_log_id, $data) {
        // Ensure log exists
        $this->getLogById($fuel_log_id);

        $required = ['vehicle_registration', 'log_datetime', 'fuel_volume', 'total_cost', 'odometer_reading', 'fuel_type'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                throw new Exception("Missing required field: {$field}");
            }
        }
        
        // Validate odometer against vehicle's current mileage
        $vehicle = $this->vehicleModel->findByNumberPlate($data['vehicle_registration']);
        if ($vehicle && intval($data['odometer_reading']) < intval($vehicle['current_mileage'])) {
            throw new Exception("Odometer reading ({$data['odometer_reading']}) cannot be less than vehicle's current mileage ({$vehicle['current_mileage']})");
        }

        $log = $this->fuelLogModel->updateLog($fuel_log_id, $data);
        if (!$log) {
            throw new Exception("Failed to update fuel log");
        }
        
        // Update vehicle mileage if the odometer reading is higher
        if ($vehicle && intval($data['odometer_reading']) > intval($vehicle['current_mileage'])) {
            $this->vehicleModel->updateMileage($vehicle['id'], intval($data['odometer_reading']));
        }
        
        return $log;
    }

    public function deleteLog($fuel_log_id) {
        $this->getLogById($fuel_log_id);
        if (!$this->fuelLogModel->deleteLog($fuel_log_id)) {
            throw new Exception("Failed to delete fuel log");
        }
        return true;
    }
}
