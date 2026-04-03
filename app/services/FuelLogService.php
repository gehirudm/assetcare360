<?php

require_once __DIR__ . '/../models/FuelLog.php';
require_once __DIR__ . '/../models/Trip.php';

class FuelLogService {
    private $fuelLogModel;
    private $tripModel;

    public function __construct() {
        $this->fuelLogModel = new FuelLog();
        $this->tripModel = new Trip();
    }

    public function getAllLogs($filters = []) {
        if (empty($filters['limit'])) {
            $filters['limit'] = 50;
        }

        return $this->fuelLogModel->getAllLogs($filters);
    }

    public function getByFuelLogId($fuelLogId) {
        $log = $this->fuelLogModel->getByFuelLogId($fuelLogId);
        if (!$log) {
            throw new Exception('Fuel log not found');
        }

        return $log;
    }

    public function getNextFuelLogId() {
        return $this->fuelLogModel->getNextFuelLogId();
    }

    public function createLog($data) {
        $requiredFields = [
            'vehicle_registration',
            'log_datetime',
            'fuel_volume',
            'total_cost',
            'odometer_reading',
            'fuel_type'
        ];

        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || $data[$field] === '') {
                throw new Exception("Missing required field: {$field}");
            }
        }

        $fuelVolume = floatval($data['fuel_volume']);
        $totalCost = floatval($data['total_cost']);
        $odometerReading = intval($data['odometer_reading']);

        if ($fuelVolume <= 0) {
            throw new Exception('Fuel volume must be greater than 0');
        }

        if ($totalCost <= 0) {
            throw new Exception('Total cost must be greater than 0');
        }

        if ($odometerReading < 0) {
            throw new Exception('Odometer reading must be a positive value');
        }

        $tripOdometerBaseline = $this->tripModel->getMaxRecordedOdometer(
            $data['vehicle_registration'],
            $data['driver_id'] ?? null
        );

        if ($tripOdometerBaseline !== null && $odometerReading < $tripOdometerBaseline) {
            throw new Exception(
                "Odometer reading cannot be less than current trip odometer ({$tripOdometerBaseline} km)"
            );
        }

        $data['fuel_log_id'] = $this->fuelLogModel->getNextFuelLogId();
        $data['fuel_volume'] = $fuelVolume;
        $data['total_cost'] = $totalCost;
        $data['odometer_reading'] = $odometerReading;

        $previous = $this->fuelLogModel->getPreviousLog($data['vehicle_registration'], $data['driver_id'] ?? null);

        if ($previous) {
            $previousOdometer = intval($previous['odometer_reading']);
            if ($odometerReading >= $previousOdometer) {
                $distance = $odometerReading - $previousOdometer;
                $data['distance_since_last'] = $distance;
                $data['fuel_efficiency'] = $distance > 0 ? round($distance / $fuelVolume, 2) : null;
            } else {
                $data['distance_since_last'] = null;
                $data['fuel_efficiency'] = null;
            }
        } else {
            $data['distance_since_last'] = null;
            $data['fuel_efficiency'] = null;
        }

        $log = $this->fuelLogModel->createLog($data);
        if (!$log) {
            throw new Exception('Failed to create fuel log');
        }

        return $log;
    }
}
