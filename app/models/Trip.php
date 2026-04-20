<?php

class Trip extends BaseModel {
    protected $table = 'trips';
    
    protected $fillable = [
        'trip_id',
        'origin',
        'destination',
        'vehicle_registration',
        'driver_id',
        'assistant_driver_name',
        'starting_odometer',
        'final_odometer',
        'cargo_description',
        'status',
        'rejection_reason',
        'start_time',
        'end_time',
        'completion_notes'
    ];
    
    protected function getSchema() {
        return [
            'id' => 'INT AUTO_INCREMENT PRIMARY KEY',
            'trip_id' => 'VARCHAR(20) UNIQUE NOT NULL',
            'origin' => 'VARCHAR(255) NOT NULL',
            'destination' => 'VARCHAR(255) NOT NULL',
            'vehicle_registration' => 'VARCHAR(50)',
            'driver_id' => 'INT',
            'starting_odometer' => 'INT DEFAULT NULL',
            'final_odometer' => 'INT',
            'cargo_description' => 'TEXT',
            'status' => "ENUM('Pending', 'Accepted', 'Rejected', 'In Progress', 'Completed', 'Cancelled') DEFAULT 'Pending'",
            'rejection_reason' => 'TEXT',
            'start_time' => 'DATETIME',
            'end_time' => 'DATETIME',
            'completion_notes' => 'TEXT',
            'created_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
            'updated_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        ];
    }
    
    protected function getIndexes() {
        return [
            'idx_trip_id' => 'trip_id',
            'idx_status' => 'status',
            'idx_driver_id' => 'driver_id'
        ];
    }
    
    public function getAllTrips($filters = []) {
        $query = "SELECT t.*, u.full_name AS driver_name
                  FROM {$this->table} t
                  LEFT JOIN users u ON t.driver_id = u.id
                  WHERE 1=1";
        $params = [];
        
        if (!empty($filters['status'])) {
            $query .= " AND t.status = :status";
            $params[':status'] = $filters['status'];
        }
        
        if (!empty($filters['driver_id'])) {
            $query .= " AND t.driver_id = :driver_id";
            $params[':driver_id'] = $filters['driver_id'];
        }

        if (!empty($filters['vehicle_registration'])) {
            $query .= " AND t.vehicle_registration = :vehicle_registration";
            $params[':vehicle_registration'] = $filters['vehicle_registration'];
        }
        
        $query .= " ORDER BY t.created_at DESC";

        if (!empty($filters['limit']) && is_numeric($filters['limit'])) {
            $query .= " LIMIT " . max(1, (int) $filters['limit']);
        }
        
        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getTripByTripId($trip_id) {
        $query = "SELECT t.*, u.full_name AS driver_name
                  FROM {$this->table} t
                  LEFT JOIN users u ON t.driver_id = u.id
                  WHERE t.trip_id = :trip_id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':trip_id', $trip_id);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public function createTrip($data) {
        $query = "INSERT INTO {$this->table} 
                  (trip_id, origin, destination, vehicle_registration, driver_id, 
                   starting_odometer, cargo_description, status) 
                  VALUES 
                  (:trip_id, :origin, :destination, :vehicle_registration, :driver_id, 
                   :starting_odometer, :cargo_description, :status)";
        
        $stmt = $this->db->prepare($query);
        
        $stmt->bindParam(':trip_id', $data['trip_id']);
        $stmt->bindParam(':origin', $data['origin']);
        $stmt->bindParam(':destination', $data['destination']);
        $stmt->bindParam(':vehicle_registration', $data['vehicle_registration']);
        $stmt->bindParam(':driver_id', $data['driver_id']);
        $stmt->bindParam(':starting_odometer', $data['starting_odometer']);
        $stmt->bindParam(':cargo_description', $data['cargo_description']);
        $stmt->bindParam(':status', $data['status']);
        
        if ($stmt->execute()) {
            return $this->getTripByTripId($data['trip_id']);
        }
        return false;
    }
    
    public function updateTrip($trip_id, $data) {
        $fields = [];
        $params = [':trip_id' => $trip_id];
        
        foreach ($data as $key => $value) {
            if (in_array($key, $this->fillable) && $key !== 'trip_id') {
                $fields[] = "$key = :$key";
                $params[":$key"] = $value;
            }
        }
        
        if (empty($fields)) {
            return false;
        }
        
        $query = "UPDATE {$this->table} SET " . implode(', ', $fields) . " WHERE trip_id = :trip_id";
        $stmt = $this->db->prepare($query);
        
        if ($stmt->execute($params)) {
            return $this->getTripByTripId($trip_id);
        }
        return false;
    }
    
    public function acceptTrip($trip_id) {
        $query = "UPDATE {$this->table} 
                  SET status = 'Accepted' 
                  WHERE trip_id = :trip_id AND status = 'Pending'";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':trip_id', $trip_id);
        
        if ($stmt->execute() && $stmt->rowCount() > 0) {
            return $this->getTripByTripId($trip_id);
        }
        return false;
    }
    
    public function rejectTrip($trip_id, $reason) {
        $query = "UPDATE {$this->table} 
                  SET status = 'Rejected', rejection_reason = :reason 
                  WHERE trip_id = :trip_id AND status = 'Pending'";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':trip_id', $trip_id);
        $stmt->bindParam(':reason', $reason);
        
        if ($stmt->execute() && $stmt->rowCount() > 0) {
            return $this->getTripByTripId($trip_id);
        }
        return false;
    }
    
    public function startTrip($trip_id, $starting_odometer = null, $assistant_driver_name = null) {
        $query = "UPDATE {$this->table} 
                  SET status = 'In Progress', start_time = NOW()";
        
        $params = [':trip_id' => $trip_id];
        
        if ($starting_odometer !== null) {
            $query .= ", starting_odometer = :starting_odometer";
            $params[':starting_odometer'] = $starting_odometer;
        }
        
        if ($assistant_driver_name !== null) {
            $query .= ", assistant_driver_name = :assistant_driver_name";
            $params[':assistant_driver_name'] = $assistant_driver_name;
        }
        
        $query .= " WHERE trip_id = :trip_id AND status = 'Accepted'";
        
        $stmt = $this->db->prepare($query);
        
        if ($stmt->execute($params) && $stmt->rowCount() > 0) {
            return $this->getTripByTripId($trip_id);
        }
        return false;
    }
    
    public function endTrip($trip_id, $final_odometer, $notes = '') {
        $query = "UPDATE {$this->table} 
                  SET status = 'Completed', 
                      final_odometer = :final_odometer, 
                      completion_notes = :notes,
                      end_time = NOW() 
                  WHERE trip_id = :trip_id AND status = 'In Progress'";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':trip_id', $trip_id);
        $stmt->bindParam(':final_odometer', $final_odometer);
        $stmt->bindParam(':notes', $notes);
        
        if ($stmt->execute() && $stmt->rowCount() > 0) {
            return $this->getTripByTripId($trip_id);
        }
        return false;
    }
    
    public function cancelTrip($trip_id) {
        $query = "UPDATE {$this->table} 
                  SET status = 'Cancelled' 
                  WHERE trip_id = :trip_id AND status = 'Pending'";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':trip_id', $trip_id);
        
        return $stmt->execute() && $stmt->rowCount() > 0;
    }
    
    public function deleteTrip($trip_id) {
        $query = "DELETE FROM {$this->table} WHERE trip_id = :trip_id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':trip_id', $trip_id);
        return $stmt->execute();
    }
    
    public function getActiveTripCount($driver_id = null) {
        $query = "SELECT COUNT(*) as count FROM {$this->table} 
                  WHERE status IN ('Pending', 'Accepted', 'In Progress')";
        $params = [];
        
        if ($driver_id) {
            $query .= " AND driver_id = :driver_id";
            $params[':driver_id'] = $driver_id;
        }
        
        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result['count'];
    }

    public function getActiveTripCountByDriverAndVehicle($driver_id, $vehicle_registration) {
        $driverId = (int) $driver_id;
        if ($driverId <= 0) {
            return 0;
        }

        $vehicleRegistration = trim((string) $vehicle_registration);
        if ($vehicleRegistration === '') {
            return $this->getActiveTripCount($driverId);
        }

        $query = "SELECT COUNT(*) as count FROM {$this->table}
                  WHERE status IN ('Pending', 'Accepted', 'In Progress')
                  AND driver_id = :driver_id
                  AND TRIM(LOWER(vehicle_registration)) = TRIM(LOWER(:vehicle_registration))";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            ':driver_id' => $driverId,
            ':vehicle_registration' => $vehicleRegistration,
        ]);

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return (int) ($result['count'] ?? 0);
    }

    public function getCargoItemsByTripIds($tripIds) {
        $tripIds = array_values(array_unique(array_map('intval', is_array($tripIds) ? $tripIds : [])));
        $tripIds = array_values(array_filter($tripIds, function ($id) {
            return $id > 0;
        }));

        if (empty($tripIds)) {
            return [];
        }

        $placeholders = implode(', ', array_fill(0, count($tripIds), '?'));

        $query = "SELECT tci.trip_id as trip_db_id,
                         tci.cargo_item_id as cargo_item_db_id,
                         tci.quantity,
                         tci.notes,
                         ci.cargo_item_id,
                         ci.name,
                         ci.description,
                         ci.unit,
                         ci.is_dangerous,
                         ci.is_active
                  FROM trip_cargo_items tci
                  INNER JOIN cargo_items ci ON ci.id = tci.cargo_item_id
                  WHERE tci.trip_id IN ($placeholders)
                  ORDER BY tci.id ASC";

        $stmt = $this->db->prepare($query);
        $stmt->execute($tripIds);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $mapped = [];
        foreach ($rows as $row) {
            $tripDbId = (int) ($row['trip_db_id'] ?? 0);
            if ($tripDbId <= 0) {
                continue;
            }

            if (!isset($mapped[$tripDbId])) {
                $mapped[$tripDbId] = [];
            }

            $mapped[$tripDbId][] = [
                'cargo_item_db_id' => (int) ($row['cargo_item_db_id'] ?? 0),
                'cargo_item_id' => $row['cargo_item_id'] ?? null,
                'name' => $row['name'] ?? null,
                'description' => $row['description'] ?? null,
                'unit' => $row['unit'] ?? 'units',
                'is_dangerous' => (int) ($row['is_dangerous'] ?? 0),
                'is_active' => (int) ($row['is_active'] ?? 0),
                'quantity' => isset($row['quantity']) ? (float) $row['quantity'] : 0.0,
                'notes' => $row['notes'] ?? null,
            ];
        }

        return $mapped;
    }

    public function replaceTripCargoItems($tripDbId, $cargoItems) {
        $tripDbId = (int) $tripDbId;
        if ($tripDbId <= 0) {
            return;
        }

        $deleteStmt = $this->db->prepare('DELETE FROM trip_cargo_items WHERE trip_id = ?');
        $deleteStmt->execute([$tripDbId]);

        if (empty($cargoItems) || !is_array($cargoItems)) {
            return;
        }

        $insertStmt = $this->db->prepare(
            'INSERT INTO trip_cargo_items (trip_id, cargo_item_id, quantity, notes) VALUES (?, ?, ?, ?)'
        );

        foreach ($cargoItems as $item) {
            if (empty($item['cargo_item_id'])) {
                continue;
            }

            $insertStmt->execute([
                $tripDbId,
                (int) $item['cargo_item_id'],
                (float) ($item['quantity'] ?? 0),
                isset($item['notes']) ? trim((string) $item['notes']) : null,
            ]);
        }
    }

    public function listCargoItems($includeInactive = false) {
        $query = "SELECT id, cargo_item_id, name, description, unit, is_dangerous, is_active, created_by, created_at, updated_at
                  FROM cargo_items";
        $params = [];

        if (!$includeInactive) {
            $query .= ' WHERE is_active = 1';
        }

        $query .= ' ORDER BY is_dangerous DESC, name ASC';

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getCargoItemById($id) {
        $stmt = $this->db->prepare(
            'SELECT id, cargo_item_id, name, description, unit, is_dangerous, is_active, created_by, created_at, updated_at
             FROM cargo_items
             WHERE id = ?
             LIMIT 1'
        );
        $stmt->execute([(int) $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    public function findCargoItemByName($name) {
        $stmt = $this->db->prepare(
            'SELECT id, cargo_item_id, name, description, unit, is_dangerous, is_active, created_by, created_at, updated_at
             FROM cargo_items
             WHERE LOWER(name) = LOWER(?)
             LIMIT 1'
        );
        $stmt->execute([trim((string) $name)]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    public function createCargoItem($data) {
        $stmt = $this->db->prepare(
            'INSERT INTO cargo_items (cargo_item_id, name, description, unit, is_dangerous, is_active, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );

        $ok = $stmt->execute([
            $data['cargo_item_id'],
            trim((string) $data['name']),
            isset($data['description']) && $data['description'] !== '' ? trim((string) $data['description']) : null,
            trim((string) ($data['unit'] ?? 'units')),
            !empty($data['is_dangerous']) ? 1 : 0,
            array_key_exists('is_active', $data) ? (!empty($data['is_active']) ? 1 : 0) : 1,
            !empty($data['created_by']) ? (int) $data['created_by'] : null,
        ]);

        if (!$ok) {
            return null;
        }

        return $this->getCargoItemById((int) $this->db->lastInsertId());
    }

    public function updateCargoItem($id, $data) {
        $id = (int) $id;
        if ($id <= 0) {
            return null;
        }

        $fields = [];
        $params = [];

        if (array_key_exists('name', $data)) {
            $fields[] = 'name = ?';
            $params[] = trim((string) $data['name']);
        }

        if (array_key_exists('description', $data)) {
            $fields[] = 'description = ?';
            $params[] = $data['description'] !== null && $data['description'] !== ''
                ? trim((string) $data['description'])
                : null;
        }

        if (array_key_exists('unit', $data)) {
            $fields[] = 'unit = ?';
            $params[] = trim((string) $data['unit']);
        }

        if (array_key_exists('is_dangerous', $data)) {
            $fields[] = 'is_dangerous = ?';
            $params[] = !empty($data['is_dangerous']) ? 1 : 0;
        }

        if (array_key_exists('is_active', $data)) {
            $fields[] = 'is_active = ?';
            $params[] = !empty($data['is_active']) ? 1 : 0;
        }

        if (!empty($fields)) {
            $params[] = $id;
            $stmt = $this->db->prepare('UPDATE cargo_items SET ' . implode(', ', $fields) . ' WHERE id = ?');
            $stmt->execute($params);
        }

        return $this->getCargoItemById($id);
    }

    public function deactivateCargoItem($id) {
        $stmt = $this->db->prepare('UPDATE cargo_items SET is_active = 0 WHERE id = ?');
        $stmt->execute([(int) $id]);
        return $stmt->rowCount() > 0;
    }
}
