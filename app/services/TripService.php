<?php

require_once __DIR__ . '/../models/Trip.php';

class TripService {
    private $tripModel;
    
    public function __construct() {
        $this->tripModel = new Trip();
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
        $data['driver_id'] = $data['driver_id'] ?? 1; // Default driver ID
        
        // Validate required fields
        if (empty($data['origin']) || empty($data['destination']) || empty($data['starting_odometer'])) {
            throw new Exception("Missing required fields");
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
    
    public function startTrip($trip_id) {
        $trip = $this->tripModel->startTrip($trip_id);
        if (!$trip) {
            throw new Exception("Failed to start trip. Trip may not be in pending status.");
        }
        return $trip;
    }
    
    public function endTrip($trip_id, $final_odometer, $notes = '') {
        $existingTrip = $this->getTripById($trip_id);
        
        if (intval($final_odometer) <= intval($existingTrip['starting_odometer'])) {
            throw new Exception("Final odometer must be greater than starting odometer");
        }
        
        $trip = $this->tripModel->endTrip($trip_id, $final_odometer, $notes);
        if (!$trip) {
            throw new Exception("Failed to end trip. Trip may not be in progress.");
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
        if (!$this->tripModel->deleteTrip($trip_id)) {
            throw new Exception("Failed to delete trip");
        }
        return true;
    }
    
    public function getActiveTripCount($driver_id = null) {
        return $this->tripModel->getActiveTripCount($driver_id);
    }
}
