<?php

class VehicleCheck {
    protected $db;
    protected $table = 'vehicle_checks';
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    /**
     * Get all vehicle checks with optional filtering
     */
    public function getAllChecks($filters = []) {
        $query = "SELECT vc.*, 
                         u.full_name as driver_name,
                         r.full_name as reviewed_by_name
                  FROM {$this->table} vc
                  LEFT JOIN users u ON vc.driver_id = u.id
                  LEFT JOIN users r ON vc.reviewed_by = r.id
                  WHERE 1=1";
        $params = [];
        
        if (!empty($filters['vehicle_registration'])) {
            $query .= " AND vc.vehicle_registration = :vehicle_registration";
            $params[':vehicle_registration'] = $filters['vehicle_registration'];
        }
        
        if (!empty($filters['status'])) {
            $query .= " AND vc.status = :status";
            $params[':status'] = $filters['status'];
        }
        
        if (!empty($filters['driver_id'])) {
            $query .= " AND vc.driver_id = :driver_id";
            $params[':driver_id'] = $filters['driver_id'];
        }
        
        $query .= " ORDER BY vc.week_end_date DESC, vc.id DESC";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Get a specific check by check_id
     */
    public function getCheckByCheckId($checkId) {
        $query = "SELECT vc.*, 
                         u.full_name as driver_name,
                         r.full_name as reviewed_by_name
                  FROM {$this->table} vc
                  LEFT JOIN users u ON vc.driver_id = u.id
                  LEFT JOIN users r ON vc.reviewed_by = r.id
                  WHERE vc.check_id = :check_id LIMIT 1";
        $stmt = $this->db->prepare($query);
        $stmt->execute([':check_id' => $checkId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    /**
     * Create a new vehicle check
     */
    public function createCheck($data) {
        $query = "INSERT INTO {$this->table} 
            (check_id, vehicle_registration, driver_id, odometer_reading, week_start_date, week_end_date,
             engine_oil, brakes, lights, tires, coolant, wipers, notes)
            VALUES 
            (:check_id, :vehicle_registration, :driver_id, :odometer_reading, :week_start_date, :week_end_date,
             :engine_oil, :brakes, :lights, :tires, :coolant, :wipers, :notes)";
        
        $stmt = $this->db->prepare($query);
        $result = $stmt->execute([
            ':check_id' => $data['check_id'],
            ':vehicle_registration' => $data['vehicle_registration'],
            ':driver_id' => $data['driver_id'] ?? null,
            ':odometer_reading' => $data['odometer_reading'],
            ':week_start_date' => $data['week_start_date'],
            ':week_end_date' => $data['week_end_date'],
            ':engine_oil' => $data['engine_oil'] ?? true,
            ':brakes' => $data['brakes'] ?? true,
            ':lights' => $data['lights'] ?? true,
            ':tires' => $data['tires'] ?? true,
            ':coolant' => $data['coolant'] ?? true,
            ':wipers' => $data['wipers'] ?? true,
            ':notes' => $data['notes'] ?? null
        ]);
        
        if ($result) {
            return $this->getCheckByCheckId($data['check_id']);
        }
        
        return false;
    }
    
    /**
     * Update check status (approve/reject)
     */
    public function updateCheckStatus($checkId, $status, $reviewedBy, $notes = null, $rejectionReason = null) {
        $query = "UPDATE {$this->table} 
            SET status = :status,
                reviewed_by = :reviewed_by,
                reviewed_date = NOW(),
                notes = COALESCE(:notes, notes),
                rejection_reason = :rejection_reason
            WHERE check_id = :check_id";
        
        $stmt = $this->db->prepare($query);
        $result = $stmt->execute([
            ':check_id' => $checkId,
            ':status' => $status,
            ':reviewed_by' => $reviewedBy,
            ':notes' => $notes,
            ':rejection_reason' => $rejectionReason
        ]);
        
        if ($result) {
            return $this->getCheckByCheckId($checkId);
        }
        
        return false;
    }
    
    /**
     * Get the next available check ID
     */
    public function getNextCheckId() {
        $query = "SELECT check_id FROM {$this->table} 
                  WHERE check_id LIKE 'VCHK-%' 
                  ORDER BY CAST(SUBSTRING(check_id, 6) AS UNSIGNED) DESC 
                  LIMIT 1";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result) {
            $lastNumber = intval(substr($result['check_id'], 5));
            $nextNumber = $lastNumber + 1;
        } else {
            $nextNumber = 1;
        }
        
        return 'VCHK-' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);
    }
    
    /**
     * Check if a check exists for a specific week
     */
    public function checkExistsForWeek($vehicleRegistration, $weekEndDate, $driverId = null) {
        // Only block if a pending or approved check exists for this week
        // Rejected checks are allowed to be resubmitted
        $query = "SELECT COUNT(*) as count FROM {$this->table} 
                  WHERE vehicle_registration = :vehicle_registration 
                  AND week_end_date = :week_end_date
                  AND status != 'rejected'";
        
        $params = [
            ':vehicle_registration' => $vehicleRegistration,
            ':week_end_date' => $weekEndDate
        ];
        
        if ($driverId) {
            $query .= " AND driver_id = :driver_id";
            $params[':driver_id'] = $driverId;
        }
        
        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $result['count'] > 0;
    }
}
