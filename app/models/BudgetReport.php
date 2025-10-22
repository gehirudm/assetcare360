<?php

require_once __DIR__ . '/BaseModel.php';

/**
 * BudgetReport Model
 * Handles budget reports submitted by technical officers for fault tickets
 */
class BudgetReport extends BaseModel {
    protected $table = 'budget_reports';
    
    protected function getSchema() {
        return [
            'id' => 'INT AUTO_INCREMENT PRIMARY KEY',
            'fault_ticket_id' => 'INT NOT NULL',
            'submitted_by' => 'INT NOT NULL',
            'quotation' => 'TEXT NOT NULL COMMENT "Detailed quotation/breakdown of costs"',
            'justification' => 'TEXT NOT NULL COMMENT "Justification for the budget request"',
            'total_amount' => 'DECIMAL(10,2) NOT NULL COMMENT "Total amount from quotation"',
            'status' => "ENUM('pending', 'approved', 'rejected', 'revised') DEFAULT 'pending'",
            'reviewed_by' => 'INT DEFAULT NULL COMMENT "Supervisor who reviewed the report"',
            'review_notes' => 'TEXT DEFAULT NULL',
            'reviewed_at' => 'TIMESTAMP NULL DEFAULT NULL',
            'created_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
            'updated_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        ];
    }
    
    /**
     * Define foreign keys
     */
    protected function getForeignKeys() {
        return [
            'fk_budget_fault_ticket' => 'FOREIGN KEY (fault_ticket_id) REFERENCES fault_tickets(id) ON DELETE CASCADE',
            'fk_budget_submitted_by' => 'FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE',
            'fk_budget_reviewed_by' => 'FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL'
        ];
    }
    
    protected function getIndexes() {
        return [
            'idx_fault_ticket' => 'fault_ticket_id',
            'idx_submitted_by' => 'submitted_by',
            'idx_status' => 'status',
            'idx_created_at' => 'created_at'
        ];
    }
    
    /**
     * Create a new budget report
     */
    public function create($data) {
        $query = "INSERT INTO {$this->table} 
                  (fault_ticket_id, submitted_by, quotation, justification, total_amount) 
                  VALUES (:fault_ticket_id, :submitted_by, :quotation, :justification, :total_amount)";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':fault_ticket_id', $data['fault_ticket_id']);
        $stmt->bindParam(':submitted_by', $data['submitted_by']);
        $stmt->bindParam(':quotation', $data['quotation']);
        $stmt->bindParam(':justification', $data['justification']);
        $stmt->bindParam(':total_amount', $data['total_amount']);
        
        if ($stmt->execute()) {
            return $this->db->lastInsertId();
        }
        
        return false;
    }
    
    /**
     * Get budget report by ID
     */
    public function findById($id) {
        $query = "SELECT br.*, 
                         u.full_name as submitted_by_name,
                         u.employee_id as submitted_by_employee_id,
                         r.full_name as reviewed_by_name,
                         r.employee_id as reviewed_by_employee_id
                  FROM {$this->table} br
                  LEFT JOIN users u ON br.submitted_by = u.id
                  LEFT JOIN users r ON br.reviewed_by = r.id
                  WHERE br.id = :id";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    /**
     * Get budget reports by fault ticket ID
     */
    public function getByTicketId($ticketId) {
        $query = "SELECT br.*, 
                         u.full_name as submitted_by_name,
                         u.employee_id as submitted_by_employee_id,
                         r.full_name as reviewed_by_name,
                         r.employee_id as reviewed_by_employee_id
                  FROM {$this->table} br
                  LEFT JOIN users u ON br.submitted_by = u.id
                  LEFT JOIN users r ON br.reviewed_by = r.id
                  WHERE br.fault_ticket_id = :ticket_id
                  ORDER BY br.created_at DESC";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':ticket_id', $ticketId);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Get latest budget report for a ticket
     */
    public function getLatestByTicketId($ticketId) {
        $query = "SELECT br.*, 
                         u.full_name as submitted_by_name,
                         u.employee_id as submitted_by_employee_id,
                         r.full_name as reviewed_by_name,
                         r.employee_id as reviewed_by_employee_id
                  FROM {$this->table} br
                  LEFT JOIN users u ON br.submitted_by = u.id
                  LEFT JOIN users r ON br.reviewed_by = r.id
                  WHERE br.fault_ticket_id = :ticket_id
                  ORDER BY br.created_at DESC
                  LIMIT 1";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':ticket_id', $ticketId);
        $stmt->execute();
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    /**
     * Update budget report
     */
    public function update($id, $data) {
        $fields = [];
        $params = [':id' => $id];
        
        $allowedFields = ['quotation', 'justification', 'total_amount', 'status', 
                          'reviewed_by', 'review_notes', 'reviewed_at'];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $fields[] = "{$field} = :{$field}";
                $params[":{$field}"] = $data[$field];
            }
        }
        
        if (empty($fields)) {
            return false;
        }
        
        $query = "UPDATE {$this->table} SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $this->db->prepare($query);
        
        return $stmt->execute($params);
    }
    
    /**
     * Delete budget report
     */
    public function delete($id) {
        $query = "DELETE FROM {$this->table} WHERE id = :id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':id', $id);
        
        return $stmt->execute();
    }
    
    /**
     * Get all pending budget reports (for supervisors)
     */
    public function getPendingReports() {
        $query = "SELECT br.*, 
                         ft.id as ticket_id,
                         ft.description as ticket_description,
                         u.full_name as submitted_by_name,
                         u.employee_id as submitted_by_employee_id
                  FROM {$this->table} br
                  JOIN fault_tickets ft ON br.fault_ticket_id = ft.id
                  JOIN users u ON br.submitted_by = u.id
                  WHERE br.status = 'pending'
                  ORDER BY br.created_at DESC";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Review budget report (approve/reject)
     */
    public function review($id, $reviewerId, $status, $notes = null) {
        $query = "UPDATE {$this->table} 
                  SET status = :status, 
                      reviewed_by = :reviewed_by, 
                      review_notes = :review_notes,
                      reviewed_at = CURRENT_TIMESTAMP
                  WHERE id = :id";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->bindParam(':status', $status);
        $stmt->bindParam(':reviewed_by', $reviewerId);
        $stmt->bindParam(':review_notes', $notes);
        
        return $stmt->execute();
    }
}
