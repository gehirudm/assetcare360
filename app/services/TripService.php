<?php

require_once __DIR__ . '/../models/Trip.php';
require_once __DIR__ . '/../models/Vehicle.php';
require_once __DIR__ . '/../../config/Database.php';

class TripService {
    private $tripModel;
    private $vehicleModel;
    private PDO $db;
    private array $schemaCheckCache = [];
    
    public function __construct() {
        $this->tripModel = new Trip();
        $this->vehicleModel = new Vehicle();
        $this->db = Database::getInstance()->getConnection();
    }
    
    public function getAllTrips($filters = []) {
        $trips = $this->tripModel->getAllTrips($filters);
        return $this->hydrateTripsWithCargoData($trips);
    }
    
    public function getTripById($trip_id) {
        $trip = $this->tripModel->getTripByTripId($trip_id);
        if (!$trip) {
            throw new Exception("Trip not found");
        }
        return $this->hydrateTripWithCargoData($trip);
    }
    
    public function createTrip($data, $actor = null) {
        $hasCargoAssignmentsInPayload = array_key_exists('cargo_items', $data);
        $rawCargoAssignments = $hasCargoAssignmentsInPayload ? $data['cargo_items'] : [];
        $normalizedCargoAssignments = $this->normalizeCargoAssignments($rawCargoAssignments);

        // Generate trip ID
        $counter = $this->getNextTripSequence();
        
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

        $validatedCargoAssignments = [];
        if ($hasCargoAssignmentsInPayload) {
            $this->ensureCargoSchemaAvailable();
            $validatedCargoAssignments = $this->validateCargoAssignments($normalizedCargoAssignments);

            if (!array_key_exists('cargo_description', $data) || trim((string) ($data['cargo_description'] ?? '')) === '') {
                $data['cargo_description'] = $this->buildCargoSummaryFromValidatedAssignments($validatedCargoAssignments);
            }
        }

        unset($data['cargo_items']);

        $trip = null;
        $this->db->beginTransaction();
        try {
            $trip = $this->tripModel->createTrip($data);
            if (!$trip) {
                throw new Exception("Failed to create trip");
            }

            if ($hasCargoAssignmentsInPayload) {
                $this->tripModel->replaceTripCargoItems((int) $trip['id'], $validatedCargoAssignments);
            }

            $this->db->commit();
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
        
        return $this->getTripById($trip['trip_id']);
    }

    private function getNextTripSequence(): int {
        $query = "SELECT COALESCE(MAX(
                    CASE
                        WHEN trip_id REGEXP '^TRP-[0-9]+$' THEN CAST(SUBSTRING(trip_id, 5) AS UNSIGNED)
                        ELSE 0
                    END
                  ), 0) AS max_trip_sequence
                  FROM trips";

        $stmt = $this->db->query($query);
        $row = $stmt ? $stmt->fetch(PDO::FETCH_ASSOC) : null;
        $maxSequence = (int) ($row['max_trip_sequence'] ?? 0);

        return $maxSequence + 1;
    }
    
    public function updateTrip($trip_id, $data) {
        $hasCargoAssignmentsInPayload = array_key_exists('cargo_items', $data);
        $rawCargoAssignments = $hasCargoAssignmentsInPayload ? $data['cargo_items'] : [];
        $normalizedCargoAssignments = $this->normalizeCargoAssignments($rawCargoAssignments);

        $existingTrip = $this->getTripById($trip_id);
        
        if ($existingTrip['status'] !== 'Pending') {
            throw new Exception("Only pending trips can be updated");
        }

        $validatedCargoAssignments = [];
        if ($hasCargoAssignmentsInPayload) {
            $this->ensureCargoSchemaAvailable();
            $validatedCargoAssignments = $this->validateCargoAssignments($normalizedCargoAssignments);

            if (!array_key_exists('cargo_description', $data) || trim((string) ($data['cargo_description'] ?? '')) === '') {
                $data['cargo_description'] = $this->buildCargoSummaryFromValidatedAssignments($validatedCargoAssignments);
            }
        }

        unset($data['cargo_items']);

        $trip = null;
        $this->db->beginTransaction();
        try {
            if (!empty($data)) {
                $trip = $this->tripModel->updateTrip($trip_id, $data);
                if (!$trip) {
                    throw new Exception("Failed to update trip");
                }
            }

            if ($hasCargoAssignmentsInPayload) {
                $this->tripModel->replaceTripCargoItems((int) $existingTrip['id'], $validatedCargoAssignments);
            }

            $this->db->commit();
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
        
        return $this->getTripById($trip_id);
    }
    
    public function acceptTrip($trip_id) {
        $trip = $this->tripModel->acceptTrip($trip_id);
        if (!$trip) {
            throw new Exception("Failed to accept trip. Trip may not be in pending status.");
        }
        return $this->hydrateTripWithCargoData($trip);
    }
    
    public function rejectTrip($trip_id, $reason) {
        if (empty($reason)) {
            throw new Exception("Rejection reason is required");
        }
        $trip = $this->tripModel->rejectTrip($trip_id, $reason);
        if (!$trip) {
            throw new Exception("Failed to reject trip. Trip may not be in pending status.");
        }
        return $this->hydrateTripWithCargoData($trip);
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
        
        return $this->hydrateTripWithCargoData($trip);
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
        
        return $this->hydrateTripWithCargoData($trip);
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

    public function getCargoItems($includeInactive = false) {
        $this->ensureCargoSchemaAvailable();

        $items = $this->tripModel->listCargoItems((bool) $includeInactive);
        return array_map(function ($item) {
            return $this->normalizeCargoItemPayload($item);
        }, $items);
    }

    public function createCargoItem($data, $actor = null) {
        $this->ensureCargoSchemaAvailable();

        $name = trim((string) ($data['name'] ?? ''));
        if ($name === '') {
            throw new Exception('Cargo item name is required');
        }

        $unit = trim((string) ($data['unit'] ?? 'units'));
        if ($unit === '') {
            $unit = 'units';
        }

        $existingByName = $this->tripModel->findCargoItemByName($name);
        if ($existingByName && (int) ($existingByName['is_active'] ?? 0) === 1) {
            throw new Exception('Cargo item name already exists');
        }

        $created = $this->tripModel->createCargoItem([
            'cargo_item_id' => $this->generateNextCargoItemCode(),
            'name' => $name,
            'description' => isset($data['description']) ? trim((string) $data['description']) : null,
            'unit' => $unit,
            'is_dangerous' => !empty($data['is_dangerous']) ? 1 : 0,
            'is_active' => 1,
            'created_by' => isset($actor['id']) ? (int) $actor['id'] : null,
        ]);

        if (!$created) {
            throw new Exception('Failed to create cargo item');
        }

        return $this->normalizeCargoItemPayload($created);
    }

    public function updateCargoItem($id, $data) {
        $this->ensureCargoSchemaAvailable();

        $id = (int) $id;
        if ($id <= 0) {
            throw new Exception('Cargo item ID is required');
        }

        $existing = $this->tripModel->getCargoItemById($id);
        if (!$existing) {
            throw new Exception('Cargo item not found');
        }

        $updateData = [];
        if (array_key_exists('name', $data)) {
            $name = trim((string) $data['name']);
            if ($name === '') {
                throw new Exception('Cargo item name cannot be empty');
            }

            $duplicate = $this->tripModel->findCargoItemByName($name);
            if ($duplicate && (int) $duplicate['id'] !== $id && (int) ($duplicate['is_active'] ?? 0) === 1) {
                throw new Exception('Cargo item name already exists');
            }

            $updateData['name'] = $name;
        }

        if (array_key_exists('description', $data)) {
            $updateData['description'] = $data['description'];
        }

        if (array_key_exists('unit', $data)) {
            $unit = trim((string) $data['unit']);
            if ($unit === '') {
                throw new Exception('Unit cannot be empty');
            }
            $updateData['unit'] = $unit;
        }

        if (array_key_exists('is_dangerous', $data)) {
            $updateData['is_dangerous'] = !empty($data['is_dangerous']) ? 1 : 0;
        }

        if (array_key_exists('is_active', $data)) {
            $updateData['is_active'] = !empty($data['is_active']) ? 1 : 0;
        }

        $updated = $this->tripModel->updateCargoItem($id, $updateData);
        if (!$updated) {
            throw new Exception('Failed to update cargo item');
        }

        return $this->normalizeCargoItemPayload($updated);
    }

    public function deleteCargoItem($id) {
        $this->ensureCargoSchemaAvailable();

        $id = (int) $id;
        if ($id <= 0) {
            throw new Exception('Cargo item ID is required');
        }

        $existing = $this->tripModel->getCargoItemById($id);
        if (!$existing) {
            throw new Exception('Cargo item not found');
        }

        if (!$this->tripModel->deactivateCargoItem($id)) {
            throw new Exception('Failed to deactivate cargo item');
        }

        return true;
    }

    public function getCargoAnalytics($filters = []) {
        $this->ensureCargoSchemaAvailable();

        $params = [];
        $where = ["t.status = 'Completed'"];

        $fromDate = $this->normalizeDateInput($filters['from_date'] ?? null);
        $toDate = $this->normalizeDateInput($filters['to_date'] ?? null);

        if ($fromDate !== null && $toDate !== null && strcmp($fromDate, $toDate) > 0) {
            throw new Exception('from_date must be earlier than or equal to to_date');
        }

        if ($fromDate) {
            $where[] = 'DATE(COALESCE(t.end_time, t.updated_at, t.created_at)) >= ?';
            $params[] = $fromDate;
        }

        if ($toDate) {
            $where[] = 'DATE(COALESCE(t.end_time, t.updated_at, t.created_at)) <= ?';
            $params[] = $toDate;
        }

        $whereClause = 'WHERE ' . implode(' AND ', $where);

        $totalsStmt = $this->db->prepare(
            "SELECT COALESCE(SUM(tci.quantity), 0) as total_quantity_transported,
                    COALESCE(SUM(CASE WHEN ci.is_dangerous = 1 THEN tci.quantity ELSE 0 END), 0) as dangerous_quantity_transported,
                    COUNT(DISTINCT t.id) as trips_with_cargo,
                    COUNT(DISTINCT CASE WHEN ci.is_dangerous = 1 THEN t.id END) as dangerous_trips
             FROM trips t
             INNER JOIN trip_cargo_items tci ON tci.trip_id = t.id
             INNER JOIN cargo_items ci ON ci.id = tci.cargo_item_id
             $whereClause"
        );
        $totalsStmt->execute($params);
        $totals = $totalsStmt->fetch(PDO::FETCH_ASSOC) ?: [];

        $byItemStmt = $this->db->prepare(
            "SELECT ci.id,
                    ci.cargo_item_id,
                    ci.name,
                    ci.unit,
                    ci.is_dangerous,
                    COALESCE(SUM(tci.quantity), 0) as total_quantity,
                    COUNT(DISTINCT t.id) as trips_count,
                    MAX(COALESCE(t.end_time, t.updated_at, t.created_at)) as last_transported_at
             FROM trips t
             INNER JOIN trip_cargo_items tci ON tci.trip_id = t.id
             INNER JOIN cargo_items ci ON ci.id = tci.cargo_item_id
             $whereClause
             GROUP BY ci.id, ci.cargo_item_id, ci.name, ci.unit, ci.is_dangerous
             ORDER BY total_quantity DESC, ci.name ASC"
        );
        $byItemStmt->execute($params);
        $byItem = $byItemStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $monthlyStmt = $this->db->prepare(
            "SELECT DATE_FORMAT(COALESCE(t.end_time, t.updated_at, t.created_at), '%Y-%m') as month,
                    COALESCE(SUM(tci.quantity), 0) as total_quantity,
                    COALESCE(SUM(CASE WHEN ci.is_dangerous = 1 THEN tci.quantity ELSE 0 END), 0) as dangerous_quantity,
                    COUNT(DISTINCT t.id) as trips_count
             FROM trips t
             INNER JOIN trip_cargo_items tci ON tci.trip_id = t.id
             INNER JOIN cargo_items ci ON ci.id = tci.cargo_item_id
             $whereClause
             GROUP BY DATE_FORMAT(COALESCE(t.end_time, t.updated_at, t.created_at), '%Y-%m')
             ORDER BY month ASC"
        );
        $monthlyStmt->execute($params);
        $monthly = $monthlyStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        return [
            'totals' => [
                'total_quantity_transported' => isset($totals['total_quantity_transported']) ? (float) $totals['total_quantity_transported'] : 0.0,
                'dangerous_quantity_transported' => isset($totals['dangerous_quantity_transported']) ? (float) $totals['dangerous_quantity_transported'] : 0.0,
                'trips_with_cargo' => isset($totals['trips_with_cargo']) ? (int) $totals['trips_with_cargo'] : 0,
                'dangerous_trips' => isset($totals['dangerous_trips']) ? (int) $totals['dangerous_trips'] : 0,
            ],
            'by_item' => array_map(function ($item) {
                return [
                    'id' => (int) ($item['id'] ?? 0),
                    'cargo_item_id' => $item['cargo_item_id'] ?? null,
                    'name' => $item['name'] ?? null,
                    'unit' => $item['unit'] ?? 'units',
                    'is_dangerous' => (int) ($item['is_dangerous'] ?? 0),
                    'total_quantity' => isset($item['total_quantity']) ? (float) $item['total_quantity'] : 0.0,
                    'trips_count' => isset($item['trips_count']) ? (int) $item['trips_count'] : 0,
                    'last_transported_at' => $item['last_transported_at'] ?? null,
                ];
            }, $byItem),
            'monthly' => array_map(function ($row) {
                return [
                    'month' => $row['month'] ?? null,
                    'total_quantity' => isset($row['total_quantity']) ? (float) $row['total_quantity'] : 0.0,
                    'dangerous_quantity' => isset($row['dangerous_quantity']) ? (float) $row['dangerous_quantity'] : 0.0,
                    'trips_count' => isset($row['trips_count']) ? (int) $row['trips_count'] : 0,
                ];
            }, $monthly),
        ];
    }

    public function getDangerousCargoContextForVehicle(int $vehicleId): array {
        $defaultContext = [
            'has_dangerous_cargo' => false,
            'dangerous_cargo_summary' => null,
            'dangerous_cargo_trip_id' => null,
            'dangerous_items' => [],
        ];

        if ($vehicleId <= 0 || !$this->isCargoSchemaAvailable()) {
            return $defaultContext;
        }

        $vehicle = $this->vehicleModel->findById($vehicleId);
        $vehicleRegistration = trim((string) ($vehicle['number_plate'] ?? ''));
        if ($vehicleRegistration === '') {
            return $defaultContext;
        }

        $activeTripStmt = $this->db->prepare(
            "SELECT id, trip_id, status
             FROM trips
             WHERE vehicle_registration = ?
               AND status IN ('Accepted', 'In Progress')
             ORDER BY CASE WHEN status = 'In Progress' THEN 0 ELSE 1 END, updated_at DESC
             LIMIT 1"
        );
        $activeTripStmt->execute([$vehicleRegistration]);
        $activeTrip = $activeTripStmt->fetch(PDO::FETCH_ASSOC);

        if (!$activeTrip) {
            return $defaultContext;
        }

        $cargoMap = $this->tripModel->getCargoItemsByTripIds([(int) $activeTrip['id']]);
        $cargoItems = $cargoMap[(int) $activeTrip['id']] ?? [];

        $dangerousItems = array_values(array_filter($cargoItems, function ($item) {
            return (int) ($item['is_dangerous'] ?? 0) === 1;
        }));

        if (empty($dangerousItems)) {
            return $defaultContext;
        }

        return [
            'has_dangerous_cargo' => true,
            'dangerous_cargo_summary' => $this->buildCargoSummaryFromCargoItems($dangerousItems),
            'dangerous_cargo_trip_id' => $activeTrip['trip_id'] ?? null,
            'dangerous_items' => $dangerousItems,
        ];
    }

    private function getOngoingFaultTicketForVehicle($vehicleId) {
        $db = $this->db;

        // 1) Preferred path for schemas that still keep vehicle_id on fault_tickets.
        if ($this->columnExists($db, 'fault_tickets', 'vehicle_id')) {
            $stmt = $db->prepare(
                "SELECT id, ticket_id, status
                 FROM fault_tickets
                 WHERE vehicle_id = ?
                                     AND status NOT IN ('Resolved', 'Closed', 'Insurance Claimed')
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
                                     AND ft.status NOT IN ('Resolved', 'Closed', 'Insurance Claimed')
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
                                     AND ft.status NOT IN ('Resolved', 'Closed', 'Insurance Claimed')
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

    private function normalizeCargoAssignments($cargoItems): array {
        if ($cargoItems === null || $cargoItems === '') {
            return [];
        }

        if (!is_array($cargoItems)) {
            throw new Exception('cargo_items must be an array');
        }

        $normalized = [];
        foreach ($cargoItems as $index => $item) {
            if (!is_array($item)) {
                throw new Exception('Each cargo_items entry must be an object');
            }

            $cargoItemId = isset($item['cargo_item_id']) ? (int) $item['cargo_item_id'] : 0;
            $quantity = $item['quantity'] ?? null;

            if ($cargoItemId <= 0) {
                throw new Exception('cargo_item_id is required for cargo_items[' . $index . ']');
            }

            if ($quantity === null || $quantity === '' || !is_numeric($quantity) || (float) $quantity <= 0) {
                throw new Exception('quantity must be greater than 0 for cargo_items[' . $index . ']');
            }

            $normalized[$cargoItemId] = [
                'cargo_item_id' => $cargoItemId,
                'quantity' => round((float) $quantity, 3),
                'notes' => isset($item['notes']) ? trim((string) $item['notes']) : null,
            ];
        }

        return array_values($normalized);
    }

    private function validateCargoAssignments(array $assignments): array {
        if (empty($assignments)) {
            return [];
        }

        $cargoItemIds = array_values(array_unique(array_map(function ($item) {
            return (int) $item['cargo_item_id'];
        }, $assignments)));

        $placeholders = implode(', ', array_fill(0, count($cargoItemIds), '?'));
        $stmt = $this->db->prepare(
            "SELECT id, cargo_item_id, name, unit, is_dangerous, is_active
             FROM cargo_items
             WHERE id IN ($placeholders)"
        );
        $stmt->execute($cargoItemIds);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $byId = [];
        foreach ($rows as $row) {
            $byId[(int) $row['id']] = $row;
        }

        $validated = [];
        foreach ($assignments as $item) {
            $id = (int) $item['cargo_item_id'];
            if (!isset($byId[$id])) {
                throw new Exception('One or more selected cargo items were not found');
            }

            if ((int) ($byId[$id]['is_active'] ?? 0) !== 1) {
                throw new Exception('Inactive cargo items cannot be assigned to trips');
            }

            $validated[] = [
                'cargo_item_id' => $id,
                'quantity' => round((float) $item['quantity'], 3),
                'notes' => $item['notes'] ?? null,
                'cargo_item' => [
                    'id' => $id,
                    'cargo_item_id' => $byId[$id]['cargo_item_id'] ?? null,
                    'name' => $byId[$id]['name'] ?? null,
                    'unit' => $byId[$id]['unit'] ?? 'units',
                    'is_dangerous' => (int) ($byId[$id]['is_dangerous'] ?? 0),
                ],
            ];
        }

        return $validated;
    }

    private function hydrateTripsWithCargoData($trips): array {
        if (!is_array($trips) || empty($trips)) {
            return [];
        }

        $tripDbIds = array_values(array_filter(array_map(function ($trip) {
            return isset($trip['id']) ? (int) $trip['id'] : 0;
        }, $trips), function ($id) {
            return $id > 0;
        }));

        $cargoByTrip = [];
        if (!empty($tripDbIds) && $this->isCargoSchemaAvailable()) {
            $cargoByTrip = $this->tripModel->getCargoItemsByTripIds($tripDbIds);
        }

        return array_map(function ($trip) use ($cargoByTrip) {
            $tripDbId = isset($trip['id']) ? (int) $trip['id'] : 0;
            $cargoItems = $cargoByTrip[$tripDbId] ?? [];
            return $this->applyCargoFieldsToTrip($trip, $cargoItems);
        }, $trips);
    }

    private function hydrateTripWithCargoData($trip): array {
        if (!is_array($trip) || empty($trip)) {
            return [];
        }

        $cargoItems = [];
        if (!empty($trip['id']) && $this->isCargoSchemaAvailable()) {
            $cargoMap = $this->tripModel->getCargoItemsByTripIds([(int) $trip['id']]);
            $cargoItems = $cargoMap[(int) $trip['id']] ?? [];
        }

        return $this->applyCargoFieldsToTrip($trip, $cargoItems);
    }

    private function applyCargoFieldsToTrip(array $trip, array $cargoItems): array {
        $normalizedItems = array_map(function ($item) {
            return [
                'cargo_item_db_id' => (int) ($item['cargo_item_db_id'] ?? 0),
                'cargo_item_id' => $item['cargo_item_id'] ?? null,
                'name' => $item['name'] ?? null,
                'description' => $item['description'] ?? null,
                'unit' => $item['unit'] ?? 'units',
                'is_dangerous' => (int) ($item['is_dangerous'] ?? 0),
                'is_active' => (int) ($item['is_active'] ?? 0),
                'quantity' => isset($item['quantity']) ? (float) $item['quantity'] : 0.0,
                'notes' => $item['notes'] ?? null,
            ];
        }, $cargoItems);

        $totalQuantity = 0.0;
        $dangerousQuantity = 0.0;
        $hasDangerousCargo = false;

        foreach ($normalizedItems as $item) {
            $quantity = (float) ($item['quantity'] ?? 0.0);
            $totalQuantity += $quantity;

            if ((int) ($item['is_dangerous'] ?? 0) === 1) {
                $hasDangerousCargo = true;
                $dangerousQuantity += $quantity;
            }
        }

        $trip['cargo_items'] = $normalizedItems;
        $trip['total_cargo_quantity'] = round($totalQuantity, 3);
        $trip['dangerous_cargo_quantity'] = round($dangerousQuantity, 3);
        $trip['has_dangerous_cargo'] = $hasDangerousCargo;
        $trip['cargo_summary'] = $this->buildCargoSummaryFromCargoItems($normalizedItems);

        if (trim((string) ($trip['cargo_description'] ?? '')) === '' && $trip['cargo_summary'] !== '') {
            $trip['cargo_description'] = $trip['cargo_summary'];
        }

        return $trip;
    }

    private function buildCargoSummaryFromValidatedAssignments(array $assignments): string {
        if (empty($assignments)) {
            return '';
        }

        $summaryParts = [];
        foreach ($assignments as $assignment) {
            $meta = $assignment['cargo_item'] ?? [];
            $name = trim((string) ($meta['name'] ?? 'Cargo Item'));
            $unit = trim((string) ($meta['unit'] ?? 'units'));
            $quantity = $this->formatQuantity($assignment['quantity'] ?? 0);
            $dangerousBadge = ((int) ($meta['is_dangerous'] ?? 0) === 1) ? ' [Dangerous]' : '';

            $summaryParts[] = sprintf('%s (%s %s)%s', $name, $quantity, $unit, $dangerousBadge);
        }

        return implode(', ', $summaryParts);
    }

    private function buildCargoSummaryFromCargoItems(array $cargoItems): string {
        if (empty($cargoItems)) {
            return '';
        }

        $summaryParts = [];
        foreach ($cargoItems as $item) {
            $name = trim((string) ($item['name'] ?? 'Cargo Item'));
            $unit = trim((string) ($item['unit'] ?? 'units'));
            $quantity = $this->formatQuantity($item['quantity'] ?? 0);
            $dangerousBadge = ((int) ($item['is_dangerous'] ?? 0) === 1) ? ' [Dangerous]' : '';

            $summaryParts[] = sprintf('%s (%s %s)%s', $name, $quantity, $unit, $dangerousBadge);
        }

        return implode(', ', $summaryParts);
    }

    private function formatQuantity($quantity): string {
        $number = (float) $quantity;
        $formatted = number_format($number, 3, '.', '');
        $formatted = rtrim(rtrim($formatted, '0'), '.');
        return $formatted === '' ? '0' : $formatted;
    }

    private function normalizeCargoItemPayload(array $item): array {
        return [
            'id' => (int) ($item['id'] ?? 0),
            'cargo_item_id' => $item['cargo_item_id'] ?? null,
            'name' => $item['name'] ?? null,
            'description' => $item['description'] ?? null,
            'unit' => $item['unit'] ?? 'units',
            'is_dangerous' => (int) ($item['is_dangerous'] ?? 0),
            'is_active' => (int) ($item['is_active'] ?? 0),
            'created_by' => isset($item['created_by']) ? (int) $item['created_by'] : null,
            'created_at' => $item['created_at'] ?? null,
            'updated_at' => $item['updated_at'] ?? null,
        ];
    }

    private function generateNextCargoItemCode(): string {
        $existing = $this->tripModel->listCargoItems(true);
        $highest = 0;

        foreach ($existing as $item) {
            $code = (string) ($item['cargo_item_id'] ?? '');
            if (preg_match('/CGI-(\d+)/', $code, $matches)) {
                $highest = max($highest, (int) $matches[1]);
            }
        }

        return 'CGI-' . str_pad((string) ($highest + 1), 3, '0', STR_PAD_LEFT);
    }

    private function normalizeDateInput($value): ?string {
        $date = trim((string) ($value ?? ''));
        if ($date === '') {
            return null;
        }

        $dateTime = DateTime::createFromFormat('Y-m-d', $date);
        if (!$dateTime || $dateTime->format('Y-m-d') !== $date) {
            throw new Exception('Date filters must use YYYY-MM-DD format');
        }

        return $date;
    }

    private function ensureCargoSchemaAvailable(): void {
        if (!$this->isCargoSchemaAvailable()) {
            throw new Exception('Cargo management schema is not available. Please run migrations.');
        }
    }

    private function isCargoSchemaAvailable(): bool {
        return $this->tableExists($this->db, 'cargo_items')
            && $this->tableExists($this->db, 'trip_cargo_items')
            && $this->columnExists($this->db, 'trip_cargo_items', 'trip_id')
            && $this->columnExists($this->db, 'trip_cargo_items', 'cargo_item_id')
            && $this->columnExists($this->db, 'trip_cargo_items', 'quantity');
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
