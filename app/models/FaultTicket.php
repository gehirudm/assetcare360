<?php

require_once __DIR__ . '/BaseModel.php';

/**
 * Fault Ticket Model
 * Handles fault ticket management for machinery
 */
class FaultTicket extends BaseModel {
    protected $table = 'fault_tickets';
    
    // Valid priority levels
    const PRIORITY_LOW = 'Low';
    const PRIORITY_MEDIUM = 'Medium';
    const PRIORITY_HIGH = 'High';
    const PRIORITY_CRITICAL = 'Critical';
    
    // Valid statuses
    const STATUS_OPEN = 'Open';
    const STATUS_ASSIGNED = 'Assigned';
    const STATUS_WAITING_BUDGET = 'Waiting for Budget Approval';
    const STATUS_WAITING_PARTS = 'Waiting for Spare Parts';
    const STATUS_IN_PROGRESS = 'In Progress';
    const STATUS_RESOLVED = 'Resolved';
    const STATUS_CLOSED = 'Closed';
    
    /**
     * Define table schema - required by BaseModel
     */
    protected function getSchema() {
        return [
            'id' => 'INT AUTO_INCREMENT PRIMARY KEY',
            'ticket_id' => 'VARCHAR(20) NOT NULL UNIQUE',
            'machine_id' => 'INT NOT NULL',
            'reported_by' => 'INT NOT NULL',
            'description' => 'TEXT NOT NULL',
            'priority' => "ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL DEFAULT 'Medium'",
            'location' => 'VARCHAR(255) NOT NULL',
            'status' => "ENUM('Open', 'Assigned', 'Waiting for Budget Approval', 'Waiting for Spare Parts', 'In Progress', 'Resolved', 'Closed') NOT NULL DEFAULT 'Open'",
            'created_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
            'updated_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        ];
    }
    
    /**
     * Define indexes
     */
    protected function getIndexes() {
        return [
            'idx_machine_id' => 'machine_id',
            'idx_reported_by' => 'reported_by',
            'idx_status' => 'status',
            'idx_priority' => 'priority',
            'idx_created_at' => 'created_at'
        ];
    }
    
    /**
     * Get all fault tickets with filters
     */
    public function getAllTickets($filters = []) {
        $sql = "SELECT ft.id, ft.ticket_id, ft.machine_id, ft.reported_by, 
                       ft.description, ft.priority, ft.location, ft.status,
                       ft.created_at, ft.updated_at,
                       m.model_number as machine_model_number,
                       m.machine_name as machine_name,
                       u.employee_id as reporter_employee_id,
                       u.full_name as reporter_full_name
                FROM `{$this->table}` ft
                LEFT JOIN machines m ON ft.machine_id = m.id
                LEFT JOIN users u ON ft.reported_by = u.id
                WHERE 1=1";
        
        $params = [];
        
        // Filter by machine_id
        if (!empty($filters['machine_id'])) {
            $sql .= " AND ft.machine_id = ?";
            $params[] = $filters['machine_id'];
        }
        
        // Filter by reported_by
        if (!empty($filters['reported_by'])) {
            $sql .= " AND ft.reported_by = ?";
            $params[] = $filters['reported_by'];
        }
        
        // Filter by status
        if (!empty($filters['status'])) {
            $sql .= " AND ft.status = ?";
            $params[] = $filters['status'];
        }
        
        // Filter by priority
        if (!empty($filters['priority'])) {
            $sql .= " AND ft.priority = ?";
            $params[] = $filters['priority'];
        }
        
        $sql .= " ORDER BY ft.created_at DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $tickets = $stmt->fetchAll();
        
        // Get images for each ticket
        if ($tickets) {
            require_once __DIR__ . '/FaultTicketImage.php';
            $imageModel = new FaultTicketImage();
            
            foreach ($tickets as &$ticket) {
                $ticket['images'] = $imageModel->getImagesByTicketId($ticket['id']);
            }
            unset($ticket); // Break reference
        }
        
        return $tickets;
    }
    
    /**
     * Get fault ticket by ID with related data
     */
    public function getTicketById($id) {
        $sql = "SELECT ft.id, ft.ticket_id, ft.machine_id, ft.reported_by, 
                       ft.description, ft.priority, ft.location, ft.status,
                       ft.created_at, ft.updated_at,
                       m.model_number as machine_model_number,
                       m.machine_name as machine_name,
                       u.employee_id as reporter_employee_id,
                       u.full_name as reporter_full_name
                FROM `{$this->table}` ft
                LEFT JOIN machines m ON ft.machine_id = m.id
                LEFT JOIN users u ON ft.reported_by = u.id
                WHERE ft.id = ?";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        $ticket = $stmt->fetch();
        
        if ($ticket) {
            // Get images
            require_once __DIR__ . '/FaultTicketImage.php';
            $imageModel = new FaultTicketImage();
            $ticket['images'] = $imageModel->getImagesByTicketId($id);
        }
        
        return $ticket;
    }
    
    /**
     * Create a new fault ticket
     */
    public function createTicket($data) {
        // Generate next ticket_id
        $ticketId = $this->generateNextTicketId();
        
        $sql = "INSERT INTO `{$this->table}` 
                (ticket_id, machine_id, reported_by, description, priority, location, status) 
                VALUES 
                (?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $this->db->prepare($sql);
        $result = $stmt->execute([
            $ticketId,
            $data['machine_id'],
            $data['reported_by'],
            $data['description'],
            $data['priority'],
            $data['location'],
            $data['status'] ?? self::STATUS_OPEN
        ]);
        
        return $result ? $this->db->lastInsertId() : false;
    }
    
    /**
     * Generate next ticket ID in format TKT-001
     */
    private function generateNextTicketId() {
        $sql = "SELECT ticket_id FROM `{$this->table}` 
                WHERE ticket_id LIKE 'TKT-%' 
                ORDER BY id DESC LIMIT 1";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        $lastTicket = $stmt->fetch();
        
        if ($lastTicket && $lastTicket['ticket_id']) {
            // Extract number from TKT-XXX format
            $lastNumber = intval(substr($lastTicket['ticket_id'], 4));
            $nextNumber = $lastNumber + 1;
        } else {
            $nextNumber = 1;
        }
        
        return 'TKT-' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);
    }
    
    /**
     * Update fault ticket
     */
    public function updateTicket($id, $data) {
        $fields = [];
        $params = [];
        
        // Build dynamic update query
        $allowedFields = ['description', 'priority', 'location', 'status'];
        foreach ($allowedFields as $field) {
            if (isset($data[$field]) && $data[$field] !== '') {
                $fields[] = "`$field` = ?";
                $params[] = $data[$field];
            }
        }
        
        // If no fields to update, return true (nothing to change is not an error)
        if (empty($fields)) {
            return true;
        }
        
        // Add ID to params
        $params[] = $id;
        
        $sql = "UPDATE `{$this->table}` 
                SET " . implode(', ', $fields) . " 
                WHERE id = ?";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }
    
    /**
     * Delete fault ticket
     */
    public function deleteTicket($id) {
        // Note: Images will be deleted via CASCADE foreign key
        $sql = "DELETE FROM `{$this->table}` WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$id]);
    }
    
    /**
     * Get valid priorities
     */
    public static function getValidPriorities() {
        return [
            self::PRIORITY_LOW,
            self::PRIORITY_MEDIUM,
            self::PRIORITY_HIGH,
            self::PRIORITY_CRITICAL
        ];
    }
    
    /**
     * Get valid statuses
     */
    public static function getValidStatuses() {
        return [
            self::STATUS_OPEN,
            self::STATUS_IN_PROGRESS,
            self::STATUS_RESOLVED,
            self::STATUS_CLOSED
        ];
    }
}
