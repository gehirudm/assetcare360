<?php
/**
 * TecFaultRepairTicket Model
 * Handles technical officer fault repair tickets
 */

require_once __DIR__ . '/../../config/Database.php';

class TecFaultRepairTicket {
    private $db;
    private $table = 'tec_fault_repair_ticket';
    
    // Repair status constants
    const STATUS_PENDING = 'Pending';
    const STATUS_DIAGNOSED = 'Diagnosed';
    const STATUS_PARTS_ORDERED = 'Parts Ordered';
    const STATUS_IN_REPAIR = 'In Repair';
    const STATUS_TESTING = 'Testing';
    const STATUS_COMPLETED = 'Completed';
    const STATUS_CANCELLED = 'Cancelled';
    
    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }
    
    /**
     * Create a new repair ticket when a technician is assigned
     */
    public function createFromAssignment($assignmentId, $faultTicketId, $technicianId, $faultTicket, $expectedCompletionDate = null) {
        // Generate repair ticket ID
        $repairTicketId = $this->generateNextRepairTicketId();
        
        $sql = "INSERT INTO `{$this->table}` 
                (repair_ticket_id, fault_ticket_id, assignment_id, technician_id,
                 original_ticket_id, machine_id, breakdown_report_id, breakdown_type,
                 fault_description, fault_priority, fault_location, repair_status,
                 expected_completion_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $this->db->prepare($sql);
        $result = $stmt->execute([
            $repairTicketId,
            $faultTicketId,
            $assignmentId,
            $technicianId,
            $faultTicket['ticket_id'],
            $faultTicket['machine_id'] ?? null,
            $faultTicket['breakdown_report_id'] ?? null,
            $faultTicket['breakdown_type'] ?? null,
            $faultTicket['description'],
            $faultTicket['priority'],
            $faultTicket['location'] ?? null,
            self::STATUS_PENDING,
            $expectedCompletionDate
        ]);
        
        return $result ? $this->db->lastInsertId() : false;
    }
    
    /**
     * Generate next repair ticket ID in format RPT-XXX
     */
    private function generateNextRepairTicketId() {
        $sql = "SELECT repair_ticket_id FROM `{$this->table}` 
                WHERE repair_ticket_id LIKE 'RPT-%' 
                ORDER BY CAST(SUBSTRING(repair_ticket_id, 5) AS UNSIGNED) DESC LIMIT 1";
        
        $stmt = $this->db->query($sql);
        $lastTicket = $stmt->fetch();
        
        if ($lastTicket && $lastTicket['repair_ticket_id']) {
            $lastNumber = intval(substr($lastTicket['repair_ticket_id'], 4));
            $nextNumber = $lastNumber + 1;
        } else {
            $nextNumber = 1;
        }
        
        return 'RPT-' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);
    }
    
    /**
     * Get all repair tickets for a specific technician
     */
    public function getByTechnicianId($technicianId) {
        $sql = "SELECT trf.*, 
                       m.machine_name, m.serial_number as machine_serial,
                       u.full_name as technician_name
                FROM `{$this->table}` trf
                LEFT JOIN machines m ON trf.machine_id = m.id
                LEFT JOIN users u ON trf.technician_id = u.id
                WHERE trf.technician_id = ?
                ORDER BY trf.received_at DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$technicianId]);
        return $stmt->fetchAll();
    }
    
    /**
     * Get a single repair ticket by ID
     */
    public function findById($id) {
        $sql = "SELECT trf.*, 
                       m.machine_name, m.serial_number as machine_serial, m.location as machine_location,
                       u.full_name as technician_name, u.email as technician_email, u.phone as technician_phone,
                       ft.status as fault_ticket_status
                FROM `{$this->table}` trf
                LEFT JOIN machines m ON trf.machine_id = m.id
                LEFT JOIN users u ON trf.technician_id = u.id
                LEFT JOIN fault_tickets ft ON trf.fault_ticket_id = ft.id
                WHERE trf.id = ?";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetch();
    }
    
    /**
     * Get repair ticket by repair_ticket_id
     */
    public function findByRepairTicketId($repairTicketId) {
        $sql = "SELECT trf.*, 
                       m.machine_name, m.serial_number as machine_serial,
                       u.full_name as technician_name
                FROM `{$this->table}` trf
                LEFT JOIN machines m ON trf.machine_id = m.id
                LEFT JOIN users u ON trf.technician_id = u.id
                WHERE trf.repair_ticket_id = ?";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$repairTicketId]);
        return $stmt->fetch();
    }
    
    /**
     * Get repair ticket by assignment ID
     */
    public function findByAssignmentId($assignmentId) {
        $sql = "SELECT * FROM `{$this->table}` WHERE assignment_id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$assignmentId]);
        return $stmt->fetch();
    }
    
    /**
     * Update repair ticket status
     */
    public function updateStatus($id, $status) {
        $sql = "UPDATE `{$this->table}` SET repair_status = ? WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$status, $id]);
    }
    
    /**
     * Update repair ticket details
     */
    public function update($id, $data) {
        $allowedFields = [
            'repair_status', 'diagnosis', 'repair_notes', 'parts_used',
            'labor_hours', 'estimated_cost', 'actual_cost',
            'diagnosis_at', 'repair_started_at', 'repair_completed_at'
        ];
        
        $fields = [];
        $params = [];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $fields[] = "`$field` = ?";
                $params[] = $data[$field];
            }
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
     * Get all repair tickets (for admin/supervisor view)
     */
    public function getAll() {
        $sql = "SELECT trf.*, 
                       m.machine_name, m.serial_number as machine_serial,
                       u.full_name as technician_name
                FROM `{$this->table}` trf
                LEFT JOIN machines m ON trf.machine_id = m.id
                LEFT JOIN users u ON trf.technician_id = u.id
                ORDER BY trf.received_at DESC";
        
        return $this->db->query($sql)->fetchAll();
    }
    
    /**
     * Get repair tickets by status
     */
    public function getByStatus($status) {
        $sql = "SELECT trf.*, 
                       m.machine_name, m.serial_number as machine_serial,
                       u.full_name as technician_name
                FROM `{$this->table}` trf
                LEFT JOIN machines m ON trf.machine_id = m.id
                LEFT JOIN users u ON trf.technician_id = u.id
                WHERE trf.repair_status = ?
                ORDER BY trf.received_at DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$status]);
        return $stmt->fetchAll();
    }
    
    /**
     * Get count of repair tickets by status for a technician
     */
    public function getCountsByTechnician($technicianId) {
        $sql = "SELECT repair_status, COUNT(*) as count 
                FROM `{$this->table}` 
                WHERE technician_id = ?
                GROUP BY repair_status";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$technicianId]);
        
        $counts = [
            'total' => 0,
            'pending' => 0,
            'in_progress' => 0,
            'completed' => 0
        ];
        
        while ($row = $stmt->fetch()) {
            $counts['total'] += $row['count'];
            if ($row['repair_status'] === self::STATUS_PENDING) {
                $counts['pending'] = $row['count'];
            } elseif (in_array($row['repair_status'], [self::STATUS_DIAGNOSED, self::STATUS_PARTS_ORDERED, self::STATUS_IN_REPAIR, self::STATUS_TESTING])) {
                $counts['in_progress'] += $row['count'];
            } elseif ($row['repair_status'] === self::STATUS_COMPLETED) {
                $counts['completed'] = $row['count'];
            }
        }
        
        return $counts;
    }
}
