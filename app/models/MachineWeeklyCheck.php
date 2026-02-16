<?php

class MachineWeeklyCheck {
    protected $db;
    protected $table = 'machine_weekly_checks';
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    /**
     * Get all machine weekly checks with optional filtering
     */
    public function getAllChecks($filters = []) {
        $query = "SELECT mwc.*, m.machine_name, m.model_number, m.serial_number, m.location,
                         u.full_name as operator_name, r.full_name as reviewer_name
                  FROM {$this->table} mwc
                  LEFT JOIN machines m ON mwc.machine_id = m.id
                  LEFT JOIN users u ON mwc.operator_id = u.id
                  LEFT JOIN users r ON mwc.reviewed_by = r.id
                  WHERE 1=1";
        $params = [];
        
        if (!empty($filters['machine_id'])) {
            $query .= " AND mwc.machine_id = :machine_id";
            $params[':machine_id'] = $filters['machine_id'];
        }
        
        if (!empty($filters['status'])) {
            $query .= " AND mwc.status = :status";
            $params[':status'] = $filters['status'];
        }
        
        if (!empty($filters['operator_id'])) {
            $query .= " AND mwc.operator_id = :operator_id";
            $params[':operator_id'] = $filters['operator_id'];
        }
        
        if (!empty($filters['overall_condition'])) {
            $query .= " AND mwc.overall_condition = :overall_condition";
            $params[':overall_condition'] = $filters['overall_condition'];
        }
        
        $query .= " ORDER BY mwc.week_end_date DESC, mwc.id DESC";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Get a specific check by check_id
     */
    public function getCheckByCheckId($checkId) {
        $query = "SELECT mwc.*, m.machine_name, m.model_number, m.serial_number, m.location,
                         u.full_name as operator_name, r.full_name as reviewer_name
                  FROM {$this->table} mwc
                  LEFT JOIN machines m ON mwc.machine_id = m.id
                  LEFT JOIN users u ON mwc.operator_id = u.id
                  LEFT JOIN users r ON mwc.reviewed_by = r.id
                  WHERE mwc.check_id = :check_id LIMIT 1";
        $stmt = $this->db->prepare($query);
        $stmt->execute([':check_id' => $checkId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    /**
     * Get a specific check by ID
     */
    public function getCheckById($id) {
        $query = "SELECT mwc.*, m.machine_name, m.model_number, m.serial_number, m.location,
                         u.full_name as operator_name, r.full_name as reviewer_name
                  FROM {$this->table} mwc
                  LEFT JOIN machines m ON mwc.machine_id = m.id
                  LEFT JOIN users u ON mwc.operator_id = u.id
                  LEFT JOIN users r ON mwc.reviewed_by = r.id
                  WHERE mwc.id = :id LIMIT 1";
        $stmt = $this->db->prepare($query);
        $stmt->execute([':id' => $id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    /**
     * Generate next check ID
     */
    public function generateCheckId() {
        $query = "SELECT check_id FROM {$this->table} ORDER BY id DESC LIMIT 1";
        $stmt = $this->db->prepare($query);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result) {
            $lastNum = intval(substr($result['check_id'], 5));
            return 'MCHK-' . str_pad($lastNum + 1, 3, '0', STR_PAD_LEFT);
        }
        
        return 'MCHK-001';
    }
    
    /**
     * Create a new machine weekly check
     */
    public function createCheck($data) {
        $checkId = $this->generateCheckId();
        
        $query = "INSERT INTO {$this->table} 
            (check_id, machine_id, operator_id, week_start_date, week_end_date,
             overall_condition, engine_status, hydraulics, electrical_system, safety_equipment,
             controls, lubrication, cooling_system, filters, notes, issues_found)
            VALUES 
            (:check_id, :machine_id, :operator_id, :week_start_date, :week_end_date,
             :overall_condition, :engine_status, :hydraulics, :electrical_system, :safety_equipment,
             :controls, :lubrication, :cooling_system, :filters, :notes, :issues_found)";
        
        $stmt = $this->db->prepare($query);
        $result = $stmt->execute([
            ':check_id' => $checkId,
            ':machine_id' => $data['machine_id'],
            ':operator_id' => $data['operator_id'] ?? null,
            ':week_start_date' => $data['week_start_date'],
            ':week_end_date' => $data['week_end_date'],
            ':overall_condition' => $data['overall_condition'] ?? 'good',
            ':engine_status' => $data['engine_status'] ?? true,
            ':hydraulics' => $data['hydraulics'] ?? true,
            ':electrical_system' => $data['electrical_system'] ?? true,
            ':safety_equipment' => $data['safety_equipment'] ?? true,
            ':controls' => $data['controls'] ?? true,
            ':lubrication' => $data['lubrication'] ?? true,
            ':cooling_system' => $data['cooling_system'] ?? true,
            ':filters' => $data['filters'] ?? true,
            ':notes' => $data['notes'] ?? null,
            ':issues_found' => $data['issues_found'] ?? null
        ]);
        
        if ($result) {
            return $this->getCheckByCheckId($checkId);
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
     * Update a check
     */
    public function updateCheck($checkId, $data) {
        $fields = [];
        $params = [':check_id' => $checkId];
        
        $allowedFields = [
            'machine_id', 'week_start_date', 'week_end_date',
            'overall_condition', 'engine_status', 'hydraulics', 'electrical_system',
            'safety_equipment', 'controls', 'lubrication', 'cooling_system', 'filters',
            'notes', 'issues_found'
        ];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $fields[] = "$field = :$field";
                $params[":$field"] = $data[$field];
            }
        }
        
        if (empty($fields)) {
            return false;
        }
        
        $query = "UPDATE {$this->table} SET " . implode(', ', $fields) . " WHERE check_id = :check_id";
        
        $stmt = $this->db->prepare($query);
        $result = $stmt->execute($params);
        
        if ($result) {
            return $this->getCheckByCheckId($checkId);
        }
        
        return false;
    }
    
    /**
     * Delete a check
     */
    public function deleteCheck($checkId) {
        $query = "DELETE FROM {$this->table} WHERE check_id = :check_id";
        $stmt = $this->db->prepare($query);
        return $stmt->execute([':check_id' => $checkId]);
    }
    
    /**
     * Get checks by operator
     */
    public function getChecksByOperator($operatorId) {
        return $this->getAllChecks(['operator_id' => $operatorId]);
    }
    
    /**
     * Get checks by machine
     */
    public function getChecksByMachine($machineId) {
        return $this->getAllChecks(['machine_id' => $machineId]);
    }
    
    /**
     * Get pending checks count
     */
    public function getPendingChecksCount() {
        $query = "SELECT COUNT(*) as count FROM {$this->table} WHERE status = 'pending'";
        $stmt = $this->db->prepare($query);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result['count'] ?? 0;
    }
    
    /**
     * Get checks summary for dashboard
     */
    public function getChecksSummary() {
        $query = "SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
                    SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
                  FROM {$this->table}";
        $stmt = $this->db->prepare($query);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}
