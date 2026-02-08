<?php

require_once __DIR__ . '/../services/TripService.php';
require_once __DIR__ . '/../helpers/Response.php';

class TripController {
    private $tripService;
    
    public function __construct() {
        $this->tripService = new TripService();
    }
    
    public function getAllTrips() {
        try {
            $filters = [];
            
            if (isset($_GET['status'])) {
                $filters['status'] = $_GET['status'];
            }
            
            if (isset($_GET['driver_id'])) {
                $filters['driver_id'] = $_GET['driver_id'];
            }
            
            $trips = $this->tripService->getAllTrips($filters);
            
            Response::json([
                'success' => true,
                'data' => ['trips' => $trips],
                'count' => count($trips)
            ]);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }
    
    public function getTripById() {
        try {
            $trip_id = $_GET['id'] ?? null;
            
            if (!$trip_id) {
                Response::error('Trip ID is required', 400);
                return;
            }
            
            $trip = $this->tripService->getTripById($trip_id);
            
            Response::json([
                'success' => true,
                'data' => ['trip' => $trip]
            ]);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 404);
        }
    }
    
    public function createTrip() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!$data) {
                Response::error('Invalid request data', 400);
                return;
            }
            
            $trip = $this->tripService->createTrip($data);
            
            Response::json([
                'success' => true,
                'message' => 'Trip created successfully',
                'data' => ['trip' => $trip]
            ], 201);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }
    
    public function updateTrip() {
        try {
            $trip_id = $_GET['id'] ?? null;
            
            if (!$trip_id) {
                Response::error('Trip ID is required', 400);
                return;
            }
            
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!$data) {
                Response::error('Invalid request data', 400);
                return;
            }
            
            $trip = $this->tripService->updateTrip($trip_id, $data);
            
            Response::json([
                'success' => true,
                'message' => 'Trip updated successfully',
                'data' => ['trip' => $trip]
            ]);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }
    
    public function startTrip() {
        try {
            $trip_id = $_GET['id'] ?? null;
            
            if (!$trip_id) {
                Response::error('Trip ID is required', 400);
                return;
            }
            
            $trip = $this->tripService->startTrip($trip_id);
            
            Response::json([
                'success' => true,
                'message' => 'Trip started successfully',
                'data' => ['trip' => $trip]
            ]);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }
    
    public function endTrip() {
        try {
            $trip_id = $_GET['id'] ?? null;
            
            if (!$trip_id) {
                Response::error('Trip ID is required', 400);
                return;
            }
            
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['final_odometer'])) {
                Response::error('Final odometer is required', 400);
                return;
            }
            
            $notes = $data['completion_notes'] ?? '';
            
            $trip = $this->tripService->endTrip($trip_id, $data['final_odometer'], $notes);
            
            Response::json([
                'success' => true,
                'message' => 'Trip completed successfully',
                'data' => ['trip' => $trip]
            ]);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }
    
    public function cancelTrip() {
        try {
            $trip_id = $_GET['id'] ?? null;
            
            if (!$trip_id) {
                Response::error('Trip ID is required', 400);
                return;
            }
            
            $this->tripService->cancelTrip($trip_id);
            
            Response::json([
                'success' => true,
                'message' => 'Trip cancelled successfully'
            ]);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }
    
    public function deleteTrip() {
        try {
            $trip_id = $_GET['id'] ?? null;
            
            if (!$trip_id) {
                Response::error('Trip ID is required', 400);
                return;
            }
            
            $this->tripService->deleteTrip($trip_id);
            
            Response::json([
                'success' => true,
                'message' => 'Trip deleted successfully'
            ]);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }
    
    public function getActiveTripCount() {
        try {
            $driver_id = $_GET['driver_id'] ?? null;
            $count = $this->tripService->getActiveTripCount($driver_id);
            
            Response::json([
                'success' => true,
                'data' => ['active_count' => $count]
            ]);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }
}
