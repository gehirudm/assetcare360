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
    const STATUS_PARTS_APPROVED = 'Parts Approved';
    const STATUS_PARTS_REJECTED = 'Parts Rejected';
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
            'machine_id' => 'INT NULL',
            'breakdown_report_id' => 'VARCHAR(50) NULL',
            'breakdown_type' => 'VARCHAR(50) NULL',
            'reported_by' => 'INT NOT NULL',
            'description' => 'TEXT NOT NULL',
            'priority' => "ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL DEFAULT 'Medium'",
            'location' => 'VARCHAR(255) NOT NULL',
            'status' => "ENUM('Open', 'Assigned', 'Waiting for Budget Approval', 'Waiting for Spare Parts', 'Parts Approved', 'In Progress', 'Resolved', 'Closed') NOT NULL DEFAULT 'Open'",
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
            'idx_breakdown_report_id' => 'breakdown_report_id',
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
        $sql = "SELECT ft.id, ft.ticket_id, ft.machine_id, 
                       ft.breakdown_report_id, ft.breakdown_type,
                       ft.reported_by, 
                       ft.description, ft.priority, ft.location, ft.status,
                       ft.resolution_notes, ft.resolved_at,
                       ft.created_at, ft.updated_at,
                       m.model_number as machine_model_number,
                       m.machine_name as machine_name,
                       u.employee_id as reporter_employee_id,
                       u.full_name as reporter_full_name,
                       u.role as reporter_role
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
        
        // Get images and assignments for each ticket
        if ($tickets) {
            require_once __DIR__ . '/FaultTicketImage.php';
            $imageModel = new FaultTicketImage();
            
            foreach ($tickets as &$ticket) {
                $ticket['images'] = $imageModel->getImagesByTicketId($ticket['id']);
                
                // Get assignments for this ticket
                $ticket['assignments'] = $this->getAssignmentsByTicketId($ticket['id']);
            }
            unset($ticket); // Break reference
        }
        
        return $tickets;
    }
    
    /**
     * Get assignments for a ticket
     */
    private function getAssignmentsByTicketId($ticketId) {
        $sql = "SELECT fta.*, 
                       u.full_name as technician_name,
                       u.employee_id as technician_employee_id
                FROM fault_ticket_assignments fta
                LEFT JOIN users u ON fta.assigned_to = u.id
                WHERE fta.fault_ticket_id = ?
                ORDER BY fta.assigned_at DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$ticketId]);
        return $stmt->fetchAll();
    }
    
    /**
     * Get fault ticket by ID with related data
     */
    public function getTicketById($id) {
        $sql = "SELECT ft.id, ft.ticket_id, ft.machine_id, 
                       ft.breakdown_report_id, ft.breakdown_type,
                       ft.reported_by, 
                       ft.description, ft.priority, ft.location, ft.status,
                       ft.resolution_notes, ft.resolved_at,
                       ft.created_at, ft.updated_at,
                       m.model_number as machine_model_number,
                       m.machine_name as machine_name,
                       u.employee_id as reporter_employee_id,
                       u.full_name as reporter_full_name,
                       u.role as reporter_role
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
            
            // Get assignments
            $ticket['assignments'] = $this->getAssignmentsByTicketId($id);
        }
        
        return $ticket;
    }
    
    /**
     * Create a new fault ticket
     */
    public function createTicket($data) {
        // Determine ticket prefix based on breakdown type
        // MBD = Machine Breakdown, VBD = Vehicle Breakdown, RBD = Route Breakdown
        $prefix = 'MBD'; // Default for machinery
        
        if (!empty($data['breakdown_type'])) {
            if ($data['breakdown_type'] === 'vehicle_breakdown') {
                $prefix = 'VBD';
            } elseif ($data['breakdown_type'] === 'route_breakdown') {
                $prefix = 'RBD';
            }
        }
        
        $ticketId = $this->generateNextTicketId($prefix);
        
        $sql = "INSERT INTO `{$this->table}` 
                (ticket_id, machine_id, breakdown_report_id, breakdown_type, reported_by, description, priority, location, status) 
                VALUES 
                (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $this->db->prepare($sql);
        $result = $stmt->execute([
            $ticketId,
            $data['machine_id'] ?? null,
            $data['breakdown_report_id'] ?? null,
            $data['breakdown_type'] ?? null,
            $data['reported_by'],
            $data['description'],
            $data['priority'],
            $data['location'],
            $data['status'] ?? self::STATUS_OPEN
        ]);
        
        return $result ? $this->db->lastInsertId() : false;
    }
    
    /**
     * Generate next ticket ID in format VBD-001 (vehicle) or MBD-001 (machine)
     */
    private function generateNextTicketId($prefix = 'MBD') {
        $sql = "SELECT ticket_id FROM `{$this->table}` 
                WHERE ticket_id LIKE ? 
                ORDER BY CAST(SUBSTRING(ticket_id, 5) AS UNSIGNED) DESC LIMIT 1";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$prefix . '-%']);
        $lastTicket = $stmt->fetch();
        
        if ($lastTicket && $lastTicket['ticket_id']) {
            // Extract number from PREFIX-XXX format
            $lastNumber = intval(substr($lastTicket['ticket_id'], strlen($prefix) + 1));
            $nextNumber = $lastNumber + 1;
        } else {
            $nextNumber = 1;
        }
        
        return $prefix . '-' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);
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
            self::STATUS_ASSIGNED,
            self::STATUS_WAITING_BUDGET,
            self::STATUS_WAITING_PARTS,
            self::STATUS_PARTS_APPROVED,
            self::STATUS_PARTS_REJECTED,
            self::STATUS_IN_PROGRESS,
            self::STATUS_RESOLVED,
            self::STATUS_CLOSED
        ];
    }
}
