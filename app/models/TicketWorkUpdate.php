<?php

require_once __DIR__ . '/BaseModel.php';

/**
 * TicketWorkUpdate Model
 * Handles work updates submitted by technical officers
 */
class TicketWorkUpdate extends BaseModel {
    protected $table = 'ticket_work_updates';
    
    /**
     * Define table schema - required by BaseModel
     */
    protected function getSchema() {
        return [
            'id' => 'INT AUTO_INCREMENT PRIMARY KEY',
            'ticket_id' => 'INT NOT NULL',
            'technical_officer_id' => 'INT NOT NULL',
            'parts_used' => 'TEXT NULL',
            'time_spent' => 'DECIMAL(5,2) NOT NULL',
            'machine_description' => 'TEXT NOT NULL',
            'work_status' => "ENUM('In Progress', 'Completed') NOT NULL DEFAULT 'Completed'",
            'created_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
            'updated_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        ];
    }
    
    /**
     * Define indexes
     */
    protected function getIndexes() {
        return [
            'idx_ticket_id' => 'ticket_id',
            'idx_technical_officer_id' => 'technical_officer_id'
        ];
    }
    
    /**
     * Define foreign keys
     */
    protected function getForeignKeys() {
        return [
            'fk_ticket_work_ticket' => 'FOREIGN KEY (ticket_id) REFERENCES fault_tickets(id) ON DELETE CASCADE',
            'fk_ticket_work_officer' => 'FOREIGN KEY (technical_officer_id) REFERENCES users(id) ON DELETE CASCADE'
        ];
    }
    
    /**
     * Check if ticket already has a work completion record
     */
    public function hasWorkUpdate($ticketId) {
        $sql = "SELECT COUNT(*) as count FROM `{$this->table}` WHERE ticket_id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$ticketId]);
        $result = $stmt->fetch();
        return $result['count'] > 0;
    }
    
    /**
     * Create a new work update
     */
    public function createWorkUpdate($data) {
        $sql = "INSERT INTO `{$this->table}` 
                (ticket_id, technical_officer_id, parts_used, time_spent, machine_description, work_status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())";
        
        $stmt = $this->db->prepare($sql);
        $result = $stmt->execute([
            $data['ticket_id'],
            $data['technical_officer_id'],
            $data['parts_used'] ?? null,
            $data['time_spent'],
            $data['machine_description'],
            $data['work_status'] ?? 'Completed'
        ]);
        
        return $result ? $this->db->lastInsertId() : false;
    }
    
    /**
     * Get all work updates for a ticket
     */
    public function getWorkUpdatesByTicketId($ticketId) {
        $sql = "SELECT twu.*, 
                       u.full_name as technician_name,
                       u.employee_id as technician_employee_id
                FROM `{$this->table}` twu
                LEFT JOIN users u ON twu.technical_officer_id = u.id
                WHERE twu.ticket_id = ?
                ORDER BY twu.created_at DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$ticketId]);
        return $stmt->fetchAll();
    }
    
    /**
     * Get work updates by technical officer
     */
    public function getWorkUpdatesByTechnician($technicianId, $limit = 50) {
        $sql = "SELECT twu.*, 
                       ft.ticket_id as ticket_number,
                       ft.status as ticket_status
                FROM `{$this->table}` twu
                LEFT JOIN fault_tickets ft ON twu.ticket_id = ft.id
                WHERE twu.technical_officer_id = ?
                ORDER BY twu.created_at DESC
                LIMIT ?";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$technicianId, $limit]);
        return $stmt->fetchAll();
    }
    
    /**
     * Get latest work update for a ticket
     */
    public function getLatestWorkUpdate($ticketId) {
        $sql = "SELECT twu.*, 
                       u.full_name as technician_name,
                       u.employee_id as technician_employee_id
                FROM `{$this->table}` twu
                LEFT JOIN users u ON twu.technical_officer_id = u.id
                WHERE twu.ticket_id = ?
                ORDER BY twu.created_at DESC
                LIMIT 1";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$ticketId]);
        return $stmt->fetch();
    }
    
    /**
     * Get total time spent on a ticket
     */
    public function getTotalTimeSpent($ticketId) {
        $sql = "SELECT SUM(time_spent) as total_hours
                FROM `{$this->table}`
                WHERE ticket_id = ?";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$ticketId]);
        $result = $stmt->fetch();
        return $result['total_hours'] ?? 0;
    }
    
    /**
     * Update work update
     */
    public function updateWorkUpdate($id, $data) {
        $fields = [];
        $params = [];
        
        if (isset($data['parts_used'])) {
            $fields[] = 'parts_used = ?';
            $params[] = $data['parts_used'];
        }
        
        if (isset($data['time_spent'])) {
            $fields[] = 'time_spent = ?';
            $params[] = $data['time_spent'];
        }
        
        if (isset($data['machine_description'])) {
            $fields[] = 'machine_description = ?';
            $params[] = $data['machine_description'];
        }
        
        if (isset($data['work_status'])) {
            $fields[] = 'work_status = ?';
            $params[] = $data['work_status'];
        }
        
        if (empty($fields)) {
            return false;
        }
        
        $params[] = $id;
        $sql = "UPDATE `{$this->table}` SET " . implode(', ', $fields) . " WHERE id = ?";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }
    
    /**
     * Delete work update
     */
    public function deleteWorkUpdate($id) {
        return $this->delete($id);
    }
}
