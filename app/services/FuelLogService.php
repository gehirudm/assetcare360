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
        $vehicle = $this->validateAndPreparePayload($data);

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
        $existingLog = $this->getLogById($fuel_log_id);
        $vehicle = $this->validateAndPreparePayload($data, $existingLog);

        if (!array_key_exists('distance_since_last', $data)) {
            $data['distance_since_last'] = $existingLog['distance_since_last'] ?? null;
        }

        if (!array_key_exists('fuel_efficiency', $data)) {
            $data['fuel_efficiency'] = $existingLog['fuel_efficiency'] ?? null;
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

    private function validateAndPreparePayload(array &$data, $existingLog = null) {
        $required = ['vehicle_registration', 'log_datetime', 'fuel_volume', 'odometer_reading', 'fuel_source'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || trim((string)$data[$field]) === '') {
                throw new Exception("Missing required field: {$field}");
            }
        }

        $data['log_datetime'] = $this->normalizeLogDateTime($data['log_datetime']);

        $vehicle = $this->vehicleModel->findByNumberPlate($data['vehicle_registration']);
        if (!$vehicle) {
            throw new Exception("Vehicle not found for registration: {$data['vehicle_registration']}");
        }

        $vehicleFuelType = $vehicle['fuel_type'] ?? null;
        if (!$vehicleFuelType) {
            throw new Exception('Vehicle fuel type is not configured');
        }
        $data['fuel_type'] = $vehicleFuelType;

        $data['fuel_source'] = strtolower(trim((string)$data['fuel_source']));
        if (!in_array($data['fuel_source'], ['internal', 'external'], true)) {
            throw new Exception('Fuel source must be either internal or external');
        }

        $data['fuel_volume'] = (float)$data['fuel_volume'];
        if ($data['fuel_volume'] <= 0) {
            throw new Exception('Fuel volume must be greater than zero');
        }

        $data['odometer_reading'] = (int)$data['odometer_reading'];
        if ($data['odometer_reading'] <= 0) {
            throw new Exception('Odometer reading must be greater than zero');
        }

        if ($data['odometer_reading'] < (int)$vehicle['current_mileage']) {
            throw new Exception("Odometer reading ({$data['odometer_reading']}) cannot be less than vehicle's current mileage ({$vehicle['current_mileage']})");
        }

        if (!empty($data['driver_id']) || $data['driver_id'] === '0') {
            $data['driver_id'] = (int)$data['driver_id'];
        } else {
            $data['driver_id'] = null;
        }

        $data['station_name'] = isset($data['station_name']) && trim((string)$data['station_name']) !== ''
            ? trim((string)$data['station_name'])
            : null;

        if ($data['fuel_source'] === 'external') {
            if (!isset($data['total_cost']) || trim((string)$data['total_cost']) === '') {
                throw new Exception('Total cost is required for external fueling');
            }

            $data['total_cost'] = (float)$data['total_cost'];
            if ($data['total_cost'] <= 0) {
                throw new Exception('Total cost must be greater than zero for external fueling');
            }

            $existingBill = $existingLog['bill_image'] ?? null;
            $effectiveBill = $data['bill_image'] ?? $existingBill;
            if (!$effectiveBill) {
                throw new Exception('Bill/receipt image is required for external fueling');
            }
            $data['bill_image'] = $effectiveBill;
        } else {
            if (isset($data['total_cost']) && trim((string)$data['total_cost']) !== '') {
                $data['total_cost'] = (float)$data['total_cost'];
                if ($data['total_cost'] < 0) {
                    throw new Exception('Total cost cannot be negative');
                }
            } else {
                $data['total_cost'] = null;
            }

            if (!array_key_exists('bill_image', $data)) {
                $data['bill_image'] = null;
            }
        }

        return $vehicle;
    }

    private function normalizeLogDateTime($value): string {
        $raw = trim((string) ($value ?? ''));
        if ($raw === '') {
            throw new Exception('log_datetime is required');
        }

        $timestamp = strtotime($raw);
        if ($timestamp === false) {
            throw new Exception('log_datetime must be a valid date/time value');
        }

        if ($timestamp > time()) {
            throw new Exception('log_datetime cannot be in the future');
        }

        return date('Y-m-d H:i:s', $timestamp);
    }
}
