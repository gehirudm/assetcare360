<?php

require_once __DIR__ . '/../services/TripService.php';
require_once __DIR__ . '/../services/EventEmitter.php';
require_once __DIR__ . '/../events/DomainEvents.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';

class TripController {
    private $tripService;
    private $eventEmitter;
    
    public function __construct() {
        $this->tripService = new TripService();
        $this->eventEmitter = new EventEmitter();
    }

    private function getAuthenticatedUser() {
        return RoleMiddleware::getCurrentUser();
    }

    private function normalizePositiveInt($value) {
        if ($value === null || $value === '' || !is_numeric($value)) {
            return null;
        }

        $normalized = (int)$value;
        return $normalized > 0 ? $normalized : null;
    }

    private function maybeEmitTripAssignedEvent($previousTrip, $updatedTrip, $actor, $source) {
        if (!is_array($updatedTrip)) {
            return;
        }

        $currentDriverId = $this->normalizePositiveInt($updatedTrip['driver_id'] ?? null);
        if ($currentDriverId === null) {
            return;
        }

        $previousDriverId = null;
        if (is_array($previousTrip)) {
            $previousDriverId = $this->normalizePositiveInt($previousTrip['driver_id'] ?? null);
        }

        if ($previousDriverId !== null && $previousDriverId === $currentDriverId) {
            return;
        }

        $actorId = $this->normalizePositiveInt($actor['id'] ?? null);
        $actorRole = strtolower(trim((string)($actor['role'] ?? '')));

        // Skip self-notify when a Driver creates their own trip.
        if ($previousTrip === null && $actorRole === 'driver' && $actorId !== null && $actorId === $currentDriverId) {
            return;
        }

        $tripRef = trim((string)($updatedTrip['trip_id'] ?? ''));
        if ($tripRef === '') {
            $tripRef = !empty($updatedTrip['id']) ? ('#' . (int)$updatedTrip['id']) : 'Unknown';
        }

        $this->eventEmitter->emit(
            DomainEvents::TRIP_ASSIGNED,
            [
                'trip_id' => $updatedTrip['trip_id'] ?? null,
                'trip_db_id' => isset($updatedTrip['id']) ? (int)$updatedTrip['id'] : null,
                'driver_id' => $currentDriverId,
                'driver_user_ids' => [$currentDriverId],
                'status' => $updatedTrip['status'] ?? null,
                'origin' => $updatedTrip['origin'] ?? null,
                'destination' => $updatedTrip['destination'] ?? null,
                'vehicle_registration' => $updatedTrip['vehicle_registration'] ?? null,
                'assigned_by' => $actorId,
            ],
            [
                'source' => $source,
                'actor_user_id' => $actorId,
                'actor_role' => $actor['role'] ?? null,
                'trip_ref' => $tripRef,
            ]
        );
    }

    private function emitTripAcceptedEvent($trip, $actor) {
        if (!is_array($trip)) {
            return;
        }

        $driverId = $this->normalizePositiveInt($trip['driver_id'] ?? null);
        if ($driverId === null) {
            return;
        }

        $actorId = $this->normalizePositiveInt($actor['id'] ?? null);
        if ($actorId !== null && $actorId !== $driverId) {
            return;
        }

        $tripRef = trim((string)($trip['trip_id'] ?? ''));
        if ($tripRef === '') {
            $tripRef = !empty($trip['id']) ? ('#' . (int)$trip['id']) : 'Unknown';
        }

        $this->eventEmitter->emit(
            DomainEvents::TRIP_ACCEPTED,
            [
                'trip_id' => $trip['trip_id'] ?? null,
                'trip_db_id' => isset($trip['id']) ? (int)$trip['id'] : null,
                'driver_id' => $driverId,
                'driver_name' => $trip['driver_name'] ?? ($actor['full_name'] ?? null),
                'status' => $trip['status'] ?? null,
                'origin' => $trip['origin'] ?? null,
                'destination' => $trip['destination'] ?? null,
                'vehicle_registration' => $trip['vehicle_registration'] ?? null,
                'accepted_by' => $actorId,
                'accepted_by_name' => $actor['full_name'] ?? null,
            ],
            [
                'source' => 'controller:TripController:acceptTrip',
                'actor_user_id' => $actorId,
                'actor_role' => $actor['role'] ?? null,
                'trip_ref' => $tripRef,
            ]
        );
    }

    private function emitTripCompletedEvent($trip, $actor) {
        if (!is_array($trip)) {
            return;
        }

        $driverId = $this->normalizePositiveInt($trip['driver_id'] ?? null);
        if ($driverId === null) {
            return;
        }

        $actorId = $this->normalizePositiveInt($actor['id'] ?? null);
        if ($actorId !== null && $actorId !== $driverId) {
            return;
        }

        $tripRef = trim((string)($trip['trip_id'] ?? ''));
        if ($tripRef === '') {
            $tripRef = !empty($trip['id']) ? ('#' . (int)$trip['id']) : 'Unknown';
        }

        $finalOdometer = isset($trip['final_odometer']) && is_numeric($trip['final_odometer'])
            ? (int)$trip['final_odometer']
            : null;

        $this->eventEmitter->emit(
            DomainEvents::TRIP_COMPLETED,
            [
                'trip_id' => $trip['trip_id'] ?? null,
                'trip_db_id' => isset($trip['id']) ? (int)$trip['id'] : null,
                'driver_id' => $driverId,
                'driver_name' => $trip['driver_name'] ?? ($actor['full_name'] ?? null),
                'status' => $trip['status'] ?? null,
                'origin' => $trip['origin'] ?? null,
                'destination' => $trip['destination'] ?? null,
                'vehicle_registration' => $trip['vehicle_registration'] ?? null,
                'final_odometer' => $finalOdometer,
                'completion_notes' => $trip['completion_notes'] ?? null,
                'end_time' => $trip['end_time'] ?? null,
                'completed_by' => $actorId,
                'completed_by_name' => $actor['full_name'] ?? null,
            ],
            [
                'source' => 'controller:TripController:endTrip',
                'actor_user_id' => $actorId,
                'actor_role' => $actor['role'] ?? null,
                'trip_ref' => $tripRef,
            ]
        );
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
            
            $user = $this->getAuthenticatedUser();
            $trip = $this->tripService->createTrip($data, $user);

            $this->maybeEmitTripAssignedEvent(
                null,
                $trip,
                $user,
                'controller:TripController:createTrip'
            );
            
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

            $user = $this->getAuthenticatedUser();
            $previousTrip = $this->tripService->getTripById($trip_id);
            
            $trip = $this->tripService->updateTrip($trip_id, $data);

            $this->maybeEmitTripAssignedEvent(
                $previousTrip,
                $trip,
                $user,
                'controller:TripController:updateTrip'
            );
            
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
            
            $user = $this->getAuthenticatedUser();
            $trip = $this->tripService->acceptTrip($trip_id);

            $this->emitTripAcceptedEvent($trip, $user);
            
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
            $user = $this->getAuthenticatedUser();
            
            $trip = $this->tripService->endTrip($trip_id, $data['final_odometer'], $notes);

            $this->emitTripCompletedEvent($trip, $user);
            
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
