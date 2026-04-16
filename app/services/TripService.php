<?php

require_once __DIR__ . '/../models/Trip.php';
require_once __DIR__ . '/../models/Vehicle.php';

class TripService {
    private $tripModel;
    private $vehicleModel;
    
    public function __construct() {
        $this->tripModel = new Trip();
        $this->vehicleModel = new Vehicle();
    }
    
    public function getAllTrips($filters = []) {
        return $this->tripModel->getAllTrips($filters);
    }
    
    public function getTripById($trip_id) {
        $trip = $this->tripModel->getTripByTripId($trip_id);
        if (!$trip) {
            throw new Exception("Trip not found");
        }
        return $trip;
    }
    
    public function createTrip($data) {
        // Generate trip ID
        $lastTrip = $this->tripModel->getAllTrips(['limit' => 1]);
        $counter = 1;
        
        if (!empty($lastTrip)) {
            $lastId = $lastTrip[0]['trip_id'];
            preg_match('/TRP-(\d+)/', $lastId, $matches);
            if (!empty($matches[1])) {
                $counter = intval($matches[1]) + 1;
            }
        }
        
        $data['trip_id'] = 'TRP-' . str_pad($counter, 3, '0', STR_PAD_LEFT);
        $data['status'] = 'Pending';
        
        // Validate required fields
        if (empty($data['origin']) || empty($data['destination'])) {
            throw new Exception("Missing required fields: origin and destination are required");
        }
        
        if (empty($data['vehicle_registration'])) {
            throw new Exception("Vehicle registration is required");
        }
        
        // Fetch vehicle info
        $vehicle = $this->vehicleModel->findByNumberPlate($data['vehicle_registration']);
        if (!$vehicle) {
            throw new Exception("Vehicle not found");
        }
        
        // If driver_id not provided, use vehicle's assigned driver
        if (empty($data['driver_id'])) {
            if (empty($vehicle['assigned_driver_id'])) {
                throw new Exception("No driver assigned to this vehicle. Please assign a driver first in the Driver Assignment section.");
            }
            $data['driver_id'] = $vehicle['assigned_driver_id'];
        }
        
        // If starting_odometer is not provided, get from vehicle's current mileage
        if (empty($data['starting_odometer'])) {
            $data['starting_odometer'] = $vehicle['current_mileage'] ?? 0;
        }
        
        $trip = $this->tripModel->createTrip($data);
        if (!$trip) {
            throw new Exception("Failed to create trip");
        }
        
        return $trip;
    }
    
    public function updateTrip($trip_id, $data) {
        $existingTrip = $this->getTripById($trip_id);
        
        if ($existingTrip['status'] !== 'Pending') {
            throw new Exception("Only pending trips can be updated");
        }
        
        $trip = $this->tripModel->updateTrip($trip_id, $data);
        if (!$trip) {
            throw new Exception("Failed to update trip");
        }
        
        return $trip;
    }
    
    public function acceptTrip($trip_id) {
        $trip = $this->tripModel->acceptTrip($trip_id);
        if (!$trip) {
            throw new Exception("Failed to accept trip. Trip may not be in pending status.");
        }
        return $trip;
    }
    
    public function rejectTrip($trip_id, $reason) {
        if (empty($reason)) {
            throw new Exception("Rejection reason is required");
        }
        $trip = $this->tripModel->rejectTrip($trip_id, $reason);
        if (!$trip) {
            throw new Exception("Failed to reject trip. Trip may not be in pending status.");
        }
        return $trip;
    }
    
    public function startTrip($trip_id, $starting_odometer = null, $assistant_driver_name = null) {
        // Get trip to find vehicle registration
        $existingTrip = $this->getTripById($trip_id);
        
        // Validate starting odometer against vehicle's current mileage
        if ($starting_odometer !== null && !empty($existingTrip['vehicle_registration'])) {
            $vehicle = $this->vehicleModel->findByNumberPlate($existingTrip['vehicle_registration']);
            if ($vehicle && intval($starting_odometer) < intval($vehicle['current_mileage'])) {
                throw new Exception("Starting odometer ({$starting_odometer}) cannot be less than vehicle's current mileage ({$vehicle['current_mileage']})");
            }
        }
        
        $trip = $this->tripModel->startTrip($trip_id, $starting_odometer, $assistant_driver_name);
        if (!$trip) {
            throw new Exception("Failed to start trip. Trip may not be in accepted status.");
        }
        
        // Update vehicle mileage if starting_odometer is provided
        if ($starting_odometer !== null && !empty($trip['vehicle_registration'])) {
            $vehicle = $this->vehicleModel->findByNumberPlate($trip['vehicle_registration']);
            if ($vehicle) {
                $this->vehicleModel->updateMileage($vehicle['id'], $starting_odometer);
            }
        }
        
        return $trip;
    }
    
    public function endTrip($trip_id, $final_odometer, $notes = '') {
        $existingTrip = $this->getTripById($trip_id);
        
        if (intval($final_odometer) <= intval($existingTrip['starting_odometer'])) {
            throw new Exception("Final odometer ({$final_odometer}) must be greater than starting odometer ({$existingTrip['starting_odometer']})");
        }
        
        // Also validate against vehicle's current mileage
        if (!empty($existingTrip['vehicle_registration'])) {
            $vehicle = $this->vehicleModel->findByNumberPlate($existingTrip['vehicle_registration']);
            if ($vehicle && intval($final_odometer) < intval($vehicle['current_mileage'])) {
                throw new Exception("Final odometer ({$final_odometer}) cannot be less than vehicle's current mileage ({$vehicle['current_mileage']})");
            }
        }
        
        $trip = $this->tripModel->endTrip($trip_id, $final_odometer, $notes);
        if (!$trip) {
            throw new Exception("Failed to end trip. Trip may not be in progress.");
        }
        
        // Update vehicle mileage after trip ends
        if (!empty($trip['vehicle_registration'])) {
            $vehicle = $this->vehicleModel->findByNumberPlate($trip['vehicle_registration']);
            if ($vehicle) {
                $this->vehicleModel->updateMileage($vehicle['id'], $final_odometer);
            }
        }
        
        return $trip;
    }
    
    public function cancelTrip($trip_id) {
        if (!$this->tripModel->cancelTrip($trip_id)) {
            throw new Exception("Failed to cancel trip. Trip may not be in pending status.");
        }
        return true;
    }
    
    public function deleteTrip($trip_id) {
        $existingTrip = $this->getTripById($trip_id);
        
        if ($existingTrip['status'] !== 'Pending') {
            throw new Exception("Only pending trips can be deleted");
        }
        
        if (!$this->tripModel->deleteTrip($trip_id)) {
            throw new Exception("Failed to delete trip");
        }
        return true;
    }
    
    public function getActiveTripCount($driver_id = null) {
        return $this->tripModel->getActiveTripCount($driver_id);
    }
}
