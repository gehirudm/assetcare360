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
            
            $user = RoleMiddleware::getCurrentUser();
            $trip = $this->tripService->createTrip($data, $user);
            
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
    
    public function acceptTrip() {
        try {
            $trip_id = $_GET['id'] ?? null;
            
            if (!$trip_id) {
                Response::error('Trip ID is required', 400);
                return;
            }
            
            $trip = $this->tripService->acceptTrip($trip_id);
            
            Response::json([
                'success' => true,
                'message' => 'Trip accepted successfully',
                'data' => ['trip' => $trip]
            ]);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }
    
    public function rejectTrip() {
        try {
            $trip_id = $_GET['id'] ?? null;
            
            if (!$trip_id) {
                Response::error('Trip ID is required', 400);
                return;
            }
            
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['reason']) || empty($data['reason'])) {
                Response::error('Rejection reason is required', 400);
                return;
            }
            
            $trip = $this->tripService->rejectTrip($trip_id, $data['reason']);
            
            Response::json([
                'success' => true,
                'message' => 'Trip rejected successfully',
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
            
            $data = json_decode(file_get_contents('php://input'), true) ?? [];
            
            $starting_odometer = $data['starting_odometer'] ?? null;
            $assistant_driver_name = $data['assistant_driver_name'] ?? null;
            
            $trip = $this->tripService->startTrip($trip_id, $starting_odometer, $assistant_driver_name);
            
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

    public function getCargoItems() {
        try {
            RoleMiddleware::requireMinRole('Transportation Manager');

            $includeInactive = isset($_GET['include_inactive'])
                && in_array(strtolower((string) $_GET['include_inactive']), ['1', 'true', 'yes'], true);

            $items = $this->tripService->getCargoItems($includeInactive);

            Response::json([
                'success' => true,
                'data' => ['cargo_items' => $items],
                'count' => count($items),
            ]);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }

    public function createCargoItem() {
        try {
            RoleMiddleware::requireMinRole('Transportation Manager');

            $data = json_decode(file_get_contents('php://input'), true);
            if (!is_array($data)) {
                Response::error('Invalid request data', 400);
                return;
            }

            $user = RoleMiddleware::getCurrentUser();
            $cargoItem = $this->tripService->createCargoItem($data, $user);

            Response::json([
                'success' => true,
                'message' => 'Cargo item created successfully',
                'data' => ['cargo_item' => $cargoItem],
            ], 201);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }

    public function updateCargoItem() {
        try {
            RoleMiddleware::requireMinRole('Transportation Manager');

            $cargoItemId = isset($_GET['id']) ? (int) $_GET['id'] : 0;
            if ($cargoItemId <= 0) {
                Response::error('Cargo item ID is required', 400);
                return;
            }

            $data = json_decode(file_get_contents('php://input'), true);
            if (!is_array($data)) {
                Response::error('Invalid request data', 400);
                return;
            }

            $cargoItem = $this->tripService->updateCargoItem($cargoItemId, $data);

            Response::json([
                'success' => true,
                'message' => 'Cargo item updated successfully',
                'data' => ['cargo_item' => $cargoItem],
            ]);
        } catch (Exception $e) {
            $statusCode = stripos($e->getMessage(), 'not found') !== false ? 404 : 400;
            Response::error($e->getMessage(), $statusCode);
        }
    }

    public function deleteCargoItem() {
        try {
            RoleMiddleware::requireMinRole('Transportation Manager');

            $cargoItemId = isset($_GET['id']) ? (int) $_GET['id'] : 0;
            if ($cargoItemId <= 0) {
                Response::error('Cargo item ID is required', 400);
                return;
            }

            $this->tripService->deleteCargoItem($cargoItemId);

            Response::json([
                'success' => true,
                'message' => 'Cargo item deactivated successfully',
            ]);
        } catch (Exception $e) {
            $statusCode = stripos($e->getMessage(), 'not found') !== false ? 404 : 400;
            Response::error($e->getMessage(), $statusCode);
        }
    }

    public function getCargoAnalytics() {
        try {
            RoleMiddleware::requireMinRole('Transportation Manager');

            $filters = [];
            if (isset($_GET['from_date'])) {
                $filters['from_date'] = $_GET['from_date'];
            }
            if (isset($_GET['to_date'])) {
                $filters['to_date'] = $_GET['to_date'];
            }

            $analytics = $this->tripService->getCargoAnalytics($filters);

            Response::json([
                'success' => true,
                'data' => $analytics,
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
