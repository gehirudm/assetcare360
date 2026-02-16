<?php

class Trip extends BaseModel {
    protected $table = 'trips';
    
    protected $fillable = [
        'trip_id',
        'origin',
        'destination',
        'vehicle_registration',
        'driver_id',
        'starting_odometer',
        'final_odometer',
        'cargo_description',
        'status',
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
            'starting_odometer' => 'INT NOT NULL',
            'final_odometer' => 'INT',
            'cargo_description' => 'TEXT',
            'status' => "ENUM('Pending', 'In Progress', 'Completed', 'Cancelled') DEFAULT 'Pending'",
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
        $query = "SELECT * FROM {$this->table} WHERE 1=1";
        $params = [];
        
        if (!empty($filters['status'])) {
            $query .= " AND status = :status";
            $params[':status'] = $filters['status'];
        }
        
        if (!empty($filters['driver_id'])) {
            $query .= " AND driver_id = :driver_id";
            $params[':driver_id'] = $filters['driver_id'];
        }
        
        $query .= " ORDER BY created_at DESC";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getTripByTripId($trip_id) {
        $query = "SELECT * FROM {$this->table} WHERE trip_id = :trip_id";
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
    
    public function startTrip($trip_id) {
        $query = "UPDATE {$this->table} 
                  SET status = 'In Progress', start_time = NOW() 
                  WHERE trip_id = :trip_id AND status = 'Pending'";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':trip_id', $trip_id);
        
        if ($stmt->execute() && $stmt->rowCount() > 0) {
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
                  WHERE status IN ('Pending', 'In Progress')";
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
}
