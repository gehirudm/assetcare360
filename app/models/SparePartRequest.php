<?php

require_once __DIR__ . '/BaseModel.php';

/**
 * Spare Part Request Model
 * Stores spare part requests made by Technical Officers for fault or service tickets.
 * These requests go to the Inventory Manager for approval.
 */
class SparePartRequest extends BaseModel {
    protected $table = 'spare_part_requests';

    // Request statuses
    const STATUS_PENDING = 'Pending';
    const STATUS_APPROVED = 'Approved';
    const STATUS_REJECTED = 'Rejected';
    const STATUS_ISSUED = 'Issued';

    /**
     * Define table schema
     */
    protected function getSchema() {
        return [
            'id' => 'INT AUTO_INCREMENT PRIMARY KEY',
            'request_id' => 'VARCHAR(30) NOT NULL UNIQUE',
            'fault_ticket_id' => 'INT NULL',
            'service_ticket_id' => 'INT NULL',
            'ticket_id_formatted' => 'VARCHAR(30) NULL',
            'requested_by' => 'INT NOT NULL',
            'equipment_name' => 'VARCHAR(255) NULL',
            'location' => 'VARCHAR(255) NULL',
            'priority' => "VARCHAR(20) NOT NULL DEFAULT 'Medium'",
            'additional_notes' => 'TEXT NULL',
            'status' => "VARCHAR(30) NOT NULL DEFAULT 'Pending'",
            'reviewed_by' => 'INT NULL',
            'review_notes' => 'TEXT NULL',
            'reviewed_at' => 'DATETIME NULL',
            'created_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
            'updated_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        ];
    }

    /**
     * Define indexes
     */
    protected function getIndexes() {
        return [
            'idx_spr_fault_ticket' => 'fault_ticket_id',
            'idx_spr_service_ticket' => 'service_ticket_id',
            'idx_spr_requested_by' => 'requested_by',
            'idx_spr_status' => 'status',
            'idx_spr_created_at' => 'created_at'
        ];
    }

    /**
     * Generate next request ID in format SPR-001, SPR-002, etc.
     */
    public function generateRequestId() {
        $sql = "SELECT request_id FROM `{$this->table}` ORDER BY id DESC LIMIT 1";
        $stmt = $this->db->query($sql);
        $last = $stmt->fetch();

        if ($last && preg_match('/SPR-(\d+)/', $last['request_id'], $matches)) {
            $nextNum = intval($matches[1]) + 1;
        } else {
            $nextNum = 1;
        }

        return 'SPR-' . str_pad($nextNum, 3, '0', STR_PAD_LEFT);
    }

    /**
     * Get all requests with joins for user/ticket info
     */
    public function getAllRequests($filters = []) {
        $sql = "SELECT spr.*,
                       ft.ticket_id as fault_ticket_code,
                       st.service_ticket_id as service_ticket_code,
                       st.title as service_ticket_title,
                       st.priority as service_ticket_priority,
                       st.status as service_ticket_status,
                       COALESCE(ft.ticket_id, st.service_ticket_id, spr.ticket_id_formatted) as linked_ticket_code,
                       COALESCE(ft.description, st.description, st.title) as ticket_description,
                       COALESCE(ft.priority, st.priority, spr.priority) as ticket_priority,
                       COALESCE(ft.status, st.status) as ticket_status,
                       CASE
                           WHEN spr.service_ticket_id IS NOT NULL THEN 'service_ticket'
                           ELSE 'fault_ticket'
                       END as request_context,
                       u.full_name as requested_by_name,
                       u.employee_id as requested_by_employee_id,
                       reviewer.full_name as reviewed_by_name
                FROM `{$this->table}` spr
                LEFT JOIN fault_tickets ft ON spr.fault_ticket_id = ft.id
                LEFT JOIN service_tickets st ON spr.service_ticket_id = st.id
                LEFT JOIN users u ON spr.requested_by = u.id
                LEFT JOIN users reviewer ON spr.reviewed_by = reviewer.id
                WHERE 1=1";

        $params = [];

        if (!empty($filters['status'])) {
            $sql .= " AND spr.status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($filters['requested_by'])) {
            $sql .= " AND spr.requested_by = ?";
            $params[] = $filters['requested_by'];
        }

        if (!empty($filters['fault_ticket_id'])) {
            $sql .= " AND spr.fault_ticket_id = ?";
            $params[] = $filters['fault_ticket_id'];
        }

        if (!empty($filters['service_ticket_id'])) {
            $sql .= " AND spr.service_ticket_id = ?";
            $params[] = $filters['service_ticket_id'];
        }

        $sql .= " ORDER BY spr.created_at DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get a single request by ID with joins
     */
    public function getRequestById($id) {
        $sql = "SELECT spr.*,
                       ft.ticket_id as fault_ticket_code,
                       st.service_ticket_id as service_ticket_code,
                       st.title as service_ticket_title,
                       st.priority as service_ticket_priority,
                       st.status as service_ticket_status,
                       COALESCE(ft.ticket_id, st.service_ticket_id, spr.ticket_id_formatted) as linked_ticket_code,
                       COALESCE(ft.description, st.description, st.title) as ticket_description,
                       COALESCE(ft.priority, st.priority, spr.priority) as ticket_priority,
                       COALESCE(ft.status, st.status) as ticket_status,
                       CASE
                           WHEN spr.service_ticket_id IS NOT NULL THEN 'service_ticket'
                           ELSE 'fault_ticket'
                       END as request_context,
                       u.full_name as requested_by_name,
                       u.employee_id as requested_by_employee_id,
                       reviewer.full_name as reviewed_by_name
                FROM `{$this->table}` spr
                LEFT JOIN fault_tickets ft ON spr.fault_ticket_id = ft.id
                LEFT JOIN service_tickets st ON spr.service_ticket_id = st.id
                LEFT JOIN users u ON spr.requested_by = u.id
                LEFT JOIN users reviewer ON spr.reviewed_by = reviewer.id
                WHERE spr.id = ?";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Get requests for a specific fault ticket
     */
    public function getByFaultTicket($faultTicketId) {
        $sql = "SELECT spr.*,
                       u.full_name as requested_by_name
                FROM `{$this->table}` spr
                LEFT JOIN users u ON spr.requested_by = u.id
                WHERE spr.fault_ticket_id = ?
                ORDER BY spr.created_at DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$faultTicketId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get requests for a specific service ticket
     */
    public function getByServiceTicket($serviceTicketId) {
        $sql = "SELECT spr.*,
                       u.full_name as requested_by_name
                FROM `{$this->table}` spr
                LEFT JOIN users u ON spr.requested_by = u.id
                WHERE spr.service_ticket_id = ?
                ORDER BY spr.created_at DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$serviceTicketId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Count requests by status
     */
    public function countByStatus() {
        $sql = "SELECT status, COUNT(*) as count FROM `{$this->table}` GROUP BY status";
        $stmt = $this->db->query($sql);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $counts = [
            'Pending' => 0,
            'Approved' => 0,
            'Rejected' => 0,
            'Issued' => 0,
            'total' => 0
        ];

        foreach ($results as $row) {
            $counts[$row['status']] = (int)$row['count'];
            $counts['total'] += (int)$row['count'];
        }

        return $counts;
    }
}
