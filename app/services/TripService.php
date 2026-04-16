<?php

require_once __DIR__ . '/../models/Trip.php';
require_once __DIR__ . '/../models/Vehicle.php';
require_once __DIR__ . '/../../config/Database.php';

class TripService {
    private $tripModel;
    private $vehicleModel;
    private array $schemaCheckCache = [];
    
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
    
    public function createTrip($data, $actor = null) {
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
        
        if (empty($data['vehicle_registration']) && empty($data['vehicle_id'])) {
            throw new Exception("Vehicle registration or vehicle ID is required");
        }

        // Resolve vehicle by registration first, then by ID fallback.
        $vehicle = null;
        if (!empty($data['vehicle_registration'])) {
            $vehicle = $this->vehicleModel->findByNumberPlate($data['vehicle_registration']);
            if (!$vehicle) {
                throw new Exception("Vehicle not found");
            }
        } elseif (!empty($data['vehicle_id'])) {
            $vehicle = $this->vehicleModel->findById((int)$data['vehicle_id']);
            if (!$vehicle) {
                throw new Exception("Vehicle not found");
            }
            $data['vehicle_registration'] = $vehicle['number_plate'] ?? null;
            if (empty($data['vehicle_registration'])) {
                throw new Exception("Selected vehicle does not have a valid registration number");
            }
        }

        if (!empty($data['vehicle_id']) && !empty($vehicle['id']) && intval($data['vehicle_id']) !== intval($vehicle['id'])) {
            throw new Exception("Vehicle ID does not match the selected vehicle registration");
        }

        $actorId = isset($actor['id']) ? intval($actor['id']) : null;
        $actorRole = strtolower((string)($actor['role'] ?? ''));

        // Do not allow trip assignment while the vehicle has an ongoing breakdown ticket.
        $ongoingTicket = $this->getOngoingFaultTicketForVehicle((int)$vehicle['id']);
        if ($ongoingTicket) {
            $ticketId = $ongoingTicket['ticket_id'] ?? ('#' . $ongoingTicket['id']);
            throw new Exception("Cannot create trip. Vehicle has an ongoing breakdown ticket ({$ticketId}).");
        }
        
        // Driver-created transport tickets always belong to the authenticated driver.
        if ($actorRole === 'driver' && $actorId > 0) {
            if (!empty($vehicle['assigned_driver_id']) && intval($vehicle['assigned_driver_id']) !== $actorId) {
                throw new Exception("Selected vehicle is assigned to another driver.");
            }

            if (!empty($data['driver_id']) && intval($data['driver_id']) !== $actorId) {
                throw new Exception("Drivers can only create trips for themselves.");
            }

            $data['driver_id'] = $actorId;
        } elseif (empty($data['driver_id'])) {
            // Transportation Manager/Admin flow defaults to vehicle assignment.
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

    private function getOngoingFaultTicketForVehicle($vehicleId) {
        $db = Database::getInstance()->getConnection();

        // 1) Preferred path for schemas that still keep vehicle_id on fault_tickets.
        if ($this->columnExists($db, 'fault_tickets', 'vehicle_id')) {
            $stmt = $db->prepare(
                "SELECT id, ticket_id, status
                 FROM fault_tickets
                 WHERE vehicle_id = ?
                   AND status NOT IN ('Resolved', 'Closed')
                 ORDER BY updated_at DESC
                 LIMIT 1"
            );
            $stmt->execute([$vehicleId]);
            $ticket = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($ticket) {
                return $ticket;
            }
        }

        // 2) Fallback path for machine-only fault_tickets schemas using breakdown link fields.
        if (
            !$this->columnExists($db, 'fault_tickets', 'breakdown_report_id')
            || !$this->columnExists($db, 'fault_tickets', 'breakdown_type')
        ) {
            return null;
        }

        // Check vehicle breakdown linked tickets.
        if (
            $this->tableExists($db, 'vehicle_breakdown')
            && $this->columnExists($db, 'vehicle_breakdown', 'breakdown_id')
            && $this->columnExists($db, 'vehicle_breakdown', 'vehicle_id')
        ) {
            $stmt = $db->prepare(
                "SELECT ft.id, ft.ticket_id, ft.status
                 FROM fault_tickets ft
                 INNER JOIN vehicle_breakdown vb
                     ON ft.breakdown_type = 'vehicle_breakdown'
                    AND ft.breakdown_report_id = vb.breakdown_id
                 WHERE vb.vehicle_id = ?
                   AND ft.status NOT IN ('Resolved', 'Closed')
                 ORDER BY ft.updated_at DESC
                 LIMIT 1"
            );
            $stmt->execute([$vehicleId]);
            $ticket = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($ticket) {
                return $ticket;
            }
        }

        // Check route breakdown linked tickets.
        if (
            $this->tableExists($db, 'vehicle_breakdown_inroute')
            && $this->columnExists($db, 'vehicle_breakdown_inroute', 'route_breakdown_id')
            && $this->columnExists($db, 'vehicle_breakdown_inroute', 'vehicle_id')
        ) {
            $stmt = $db->prepare(
                "SELECT ft.id, ft.ticket_id, ft.status
                 FROM fault_tickets ft
                 INNER JOIN vehicle_breakdown_inroute rb
                     ON ft.breakdown_type = 'route_breakdown'
                    AND ft.breakdown_report_id = rb.route_breakdown_id
                 WHERE rb.vehicle_id = ?
                   AND ft.status NOT IN ('Resolved', 'Closed')
                 ORDER BY ft.updated_at DESC
                 LIMIT 1"
            );
            $stmt->execute([$vehicleId]);
            $ticket = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($ticket) {
                return $ticket;
            }
        }

        return null;
    }

    private function tableExists(PDO $db, string $table): bool {
        $cacheKey = "table:{$table}";
        if (array_key_exists($cacheKey, $this->schemaCheckCache)) {
            return $this->schemaCheckCache[$cacheKey];
        }

        $stmt = $db->prepare(
            'SELECT COUNT(*)
             FROM information_schema.tables
             WHERE table_schema = DATABASE()
               AND table_name = ?'
        );
        $stmt->execute([$table]);
        $exists = ((int) $stmt->fetchColumn()) > 0;
        $this->schemaCheckCache[$cacheKey] = $exists;

        return $exists;
    }

    private function columnExists(PDO $db, string $table, string $column): bool {
        $cacheKey = "column:{$table}.{$column}";
        if (array_key_exists($cacheKey, $this->schemaCheckCache)) {
            return $this->schemaCheckCache[$cacheKey];
        }

        if (!$this->tableExists($db, $table)) {
            $this->schemaCheckCache[$cacheKey] = false;
            return false;
        }

        $stmt = $db->prepare(
            'SELECT COUNT(*)
             FROM information_schema.columns
             WHERE table_schema = DATABASE()
               AND table_name = ?
               AND column_name = ?'
        );
        $stmt->execute([$table, $column]);
        $exists = ((int) $stmt->fetchColumn()) > 0;
        $this->schemaCheckCache[$cacheKey] = $exists;

        return $exists;
    }
}
