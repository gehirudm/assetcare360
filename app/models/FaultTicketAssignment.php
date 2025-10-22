<?php

require_once __DIR__ . '/BaseModel.php';

/**
 * Fault Ticket Assignment Model
 * Manages the many-to-many relationship between fault tickets and technicians
 */
class FaultTicketAssignment extends BaseModel {
    protected $table = 'fault_ticket_assignments';
    
    /**
     * Define table schema - required by BaseModel
     */
    protected function getSchema() {
        return [
            'id' => 'INT AUTO_INCREMENT PRIMARY KEY',
            'fault_ticket_id' => 'INT NOT NULL',
            'assigned_to' => 'INT NOT NULL',
            'assigned_by' => 'INT NOT NULL',
            'assigned_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
            'expected_completion_date' => 'DATE NULL',
            'notes' => 'TEXT NULL',
            'status' => "ENUM('Active', 'Completed', 'Removed') NOT NULL DEFAULT 'Active'"
        ];
    }
    
    /**
     * Define indexes
     */
    protected function getIndexes() {
        return [
            'idx_fault_ticket_id' => 'fault_ticket_id',
            'idx_assigned_to' => 'assigned_to',
            'idx_assigned_by' => 'assigned_by',
            'idx_status' => 'status'
        ];
    }
    
    /**
     * Define foreign keys
     */
    protected function getForeignKeys() {
        return [
            'fk_assignment_ticket' => 'FOREIGN KEY (fault_ticket_id) REFERENCES fault_tickets(id) ON DELETE CASCADE',
            'fk_assignment_technician' => 'FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE CASCADE',
            'fk_assignment_supervisor' => 'FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE'
        ];
    }
    
    /**
     * Assign technicians to a fault ticket
     */
    public function assignTechnicians($faultTicketId, $technicianIds, $assignedBy, $expectedCompletionDate = null, $notes = null) {
        try {
            $this->db->beginTransaction();
            
            $assignedCount = 0;
            foreach ($technicianIds as $technicianId) {
                // Check if already assigned and active
                $existing = $this->getActiveAssignment($faultTicketId, $technicianId);
                
                if ($existing) {
                    // Update existing assignment
                    $sql = "UPDATE `{$this->table}` 
                            SET expected_completion_date = ?, 
                                notes = ?, 
                                assigned_at = CURRENT_TIMESTAMP 
                            WHERE id = ?";
                    $stmt = $this->db->prepare($sql);
                    $stmt->execute([$expectedCompletionDate, $notes, $existing['id']]);
                } else {
                    // Create new assignment
                    $sql = "INSERT INTO `{$this->table}` 
                            (fault_ticket_id, assigned_to, assigned_by, expected_completion_date, notes) 
                            VALUES (?, ?, ?, ?, ?)";
                    $stmt = $this->db->prepare($sql);
                    $stmt->execute([$faultTicketId, $technicianId, $assignedBy, $expectedCompletionDate, $notes]);
                }
                
                $assignedCount++;
            }
            
            $this->db->commit();
            return $assignedCount;
            
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
    
    /**
     * Get active assignment for a specific ticket and technician
     */
    public function getActiveAssignment($faultTicketId, $technicianId) {
        $sql = "SELECT * FROM `{$this->table}` 
                WHERE fault_ticket_id = ? 
                AND assigned_to = ? 
                AND status = 'Active' 
                LIMIT 1";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$faultTicketId, $technicianId]);
        return $stmt->fetch();
    }
    
    /**
     * Get all assignments for a fault ticket
     */
    public function getTicketAssignments($faultTicketId) {
        $sql = "SELECT fta.*, 
                       u.employee_id as technician_employee_id,
                       u.full_name as technician_name,
                       u.email as technician_email,
                       u.phone as technician_phone,
                       supervisor.full_name as assigned_by_name
                FROM `{$this->table}` fta
                LEFT JOIN users u ON fta.assigned_to = u.id
                LEFT JOIN users supervisor ON fta.assigned_by = supervisor.id
                WHERE fta.fault_ticket_id = ? 
                AND fta.status = 'Active'
                ORDER BY fta.assigned_at DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$faultTicketId]);
        return $stmt->fetchAll();
    }
    
    /**
     * Get all active tickets assigned to a technician
     */
    public function getTechnicianAssignments($technicianId) {
        $sql = "SELECT fta.*, 
                       ft.description as ticket_description,
                       ft.priority as ticket_priority,
                       ft.status as ticket_status,
                       ft.location as ticket_location,
                       ft.created_at as ticket_created_at,
                       m.machine_name,
                       m.model_number as machine_model
                FROM `{$this->table}` fta
                LEFT JOIN fault_tickets ft ON fta.fault_ticket_id = ft.id
                LEFT JOIN machines m ON ft.machine_id = m.id
                WHERE fta.assigned_to = ? 
                AND fta.status = 'Active'
                ORDER BY fta.assigned_at DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$technicianId]);
        return $stmt->fetchAll();
    }
    
    /**
     * Remove technician from a fault ticket
     */
    public function removeAssignment($faultTicketId, $technicianId) {
        $sql = "UPDATE `{$this->table}` 
                SET status = 'Removed' 
                WHERE fault_ticket_id = ? 
                AND assigned_to = ? 
                AND status = 'Active'";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$faultTicketId, $technicianId]);
    }
    
    /**
     * Complete an assignment
     */
    public function completeAssignment($faultTicketId, $technicianId) {
        $sql = "UPDATE `{$this->table}` 
                SET status = 'Completed' 
                WHERE fault_ticket_id = ? 
                AND assigned_to = ? 
                AND status = 'Active'";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$faultTicketId, $technicianId]);
    }
    
    /**
     * Get technician workload (count of active assignments)
     */
    public function getTechnicianWorkload($technicianId) {
        $sql = "SELECT COUNT(*) as active_tickets 
                FROM `{$this->table}` fta
                LEFT JOIN fault_tickets ft ON fta.fault_ticket_id = ft.id
                WHERE fta.assigned_to = ? 
                AND fta.status = 'Active'
                AND ft.status NOT IN ('Resolved', 'Closed')";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$technicianId]);
        $result = $stmt->fetch();
        return $result ? (int)$result['active_tickets'] : 0;
    }
}
