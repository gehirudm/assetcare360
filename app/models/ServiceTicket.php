<?php

require_once __DIR__ . '/BaseModel.php';

/**
 * ServiceTicket model
 * Handles service ticket persistence and read models.
 */
class ServiceTicket extends BaseModel {
    protected $table = 'service_tickets';
    private $schemaCheckCache = [];

    const PRIORITY_LOW = 'Low';
    const PRIORITY_MEDIUM = 'Medium';
    const PRIORITY_HIGH = 'High';
    const PRIORITY_CRITICAL = 'Critical';

    const STATUS_PENDING_ASSIGNMENT = 'Pending Assignment';
    const STATUS_ASSIGNED = 'Assigned';
    const STATUS_IN_PROGRESS = 'In Progress';
    const STATUS_COMPLETED = 'Completed';
    const STATUS_CANCELLED = 'Cancelled';

    protected function getSchema() {
        return [
            'id' => 'INT AUTO_INCREMENT PRIMARY KEY',
            'service_ticket_id' => 'VARCHAR(30) NOT NULL UNIQUE',
            'asset_type' => "ENUM('vehicle', 'machine') NOT NULL",
            'asset_id' => 'INT NOT NULL',
            'title' => 'VARCHAR(255) NOT NULL',
            'description' => 'TEXT NOT NULL',
            'service_type' => 'VARCHAR(120) NOT NULL',
            'priority' => "ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL DEFAULT 'Medium'",
            'status' => "ENUM('Pending Assignment', 'Assigned', 'In Progress', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending Assignment'",
            'scheduled_date' => 'DATE NULL',
            'reported_by' => 'INT NOT NULL',
            'assigned_to' => 'INT NULL',
            'assigned_by' => 'INT NULL',
            'started_at' => 'DATETIME NULL',
            'completed_at' => 'DATETIME NULL',
            'completion_notes' => 'TEXT NULL',
            'component_comments' => 'TEXT NULL',
            'maintenance_notes' => 'TEXT NULL',
            'estimated_cost' => 'DECIMAL(12,2) NULL',
            'actual_cost' => 'DECIMAL(12,2) NULL',
            'next_service_date' => 'DATE NULL',
            'service_meter_reading' => 'INT NULL',
            'warranty_action' => "ENUM('none', 'covered', 'voided') NOT NULL DEFAULT 'none'",
            'warranty_void_reason' => 'TEXT NULL',
            'warranty_voided_at' => 'DATETIME NULL',
            'created_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
            'updated_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
        ];
    }

    protected function getIndexes() {
        return [
            'idx_service_tickets_asset' => 'asset_type, asset_id',
            'idx_service_tickets_status' => 'status',
            'idx_service_tickets_assigned_to' => 'assigned_to',
            'idx_service_tickets_scheduled_date' => 'scheduled_date',
        ];
    }

    public static function getValidPriorities() {
        return [
            self::PRIORITY_LOW,
            self::PRIORITY_MEDIUM,
            self::PRIORITY_HIGH,
            self::PRIORITY_CRITICAL,
        ];
    }

    public static function getValidStatuses() {
        return [
            self::STATUS_PENDING_ASSIGNMENT,
            self::STATUS_ASSIGNED,
            self::STATUS_IN_PROGRESS,
            self::STATUS_COMPLETED,
            self::STATUS_CANCELLED,
        ];
    }

    public function createServiceTicket(array $data) {
        if (empty($data['service_ticket_id'])) {
            $data['service_ticket_id'] = $this->generateNextServiceTicketId();
        }

        return $this->create($data);
    }

    public function updateServiceTicket($id, array $data) {
        if (empty($data)) {
            return true;
        }

        return $this->update($id, $data);
    }

    public function getServiceTicketById($id) {
        $sql = $this->buildBaseQuery() . ' WHERE st.id = ? OR st.service_ticket_id = ? LIMIT 1';
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id, $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        if (!$row) {
            return null;
        }

        return $this->hydrateTicketRow($row);
    }

    public function getAllServiceTickets(array $filters = [], string $orderBy = 'st.created_at DESC') {
        $sql = $this->buildBaseQuery() . ' WHERE 1=1';
        $params = [];

        if (!empty($filters['status'])) {
            $sql .= ' AND st.status = ?';
            $params[] = $filters['status'];
        }

        if (!empty($filters['asset_type'])) {
            $sql .= ' AND st.asset_type = ?';
            $params[] = strtolower((string) $filters['asset_type']);
        }

        if (!empty($filters['assigned_to'])) {
            if (!empty($filters['include_unassigned'])) {
                $sql .= ' AND (st.assigned_to = ? OR st.assigned_to IS NULL)';
            } else {
                $sql .= ' AND st.assigned_to = ?';
            }
            $params[] = (int) $filters['assigned_to'];
        }

        if (!empty($filters['reported_by'])) {
            $sql .= ' AND st.reported_by = ?';
            $params[] = (int) $filters['reported_by'];
        }

        if (!empty($filters['search'])) {
            $term = '%' . trim((string) $filters['search']) . '%';
            $sql .= ' AND (
                st.service_ticket_id LIKE ?
                OR st.title LIKE ?
                OR st.description LIKE ?
                OR COALESCE(v.vehicle_name, m.machine_name, "") LIKE ?
                OR COALESCE(v.vehicle_id, m.machine_id, "") LIKE ?
            )';
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        $safeOrderBy = $this->sanitizeOrderBy($orderBy);
        $sql .= ' ORDER BY ' . $safeOrderBy;

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return array_map([$this, 'hydrateTicketRow'], $rows);
    }

    public function getStatusCounts(array $filters = []) {
        $sql = 'SELECT status, COUNT(*) as total FROM `service_tickets` WHERE 1=1';
        $params = [];

        if (!empty($filters['assigned_to'])) {
            if (!empty($filters['include_unassigned'])) {
                $sql .= ' AND (assigned_to = ? OR assigned_to IS NULL)';
            } else {
                $sql .= ' AND assigned_to = ?';
            }
            $params[] = (int) $filters['assigned_to'];
        }

        if (!empty($filters['reported_by'])) {
            $sql .= ' AND reported_by = ?';
            $params[] = (int) $filters['reported_by'];
        }

        $sql .= ' GROUP BY status';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $counts = [
            'total' => 0,
            'pending_assignment' => 0,
            'assigned' => 0,
            'in_progress' => 0,
            'completed' => 0,
            'cancelled' => 0,
        ];

        foreach ($rows as $row) {
            $status = (string) ($row['status'] ?? '');
            $count = (int) ($row['total'] ?? 0);
            $counts['total'] += $count;

            if ($status === self::STATUS_PENDING_ASSIGNMENT) {
                $counts['pending_assignment'] = $count;
            } elseif ($status === self::STATUS_ASSIGNED) {
                $counts['assigned'] = $count;
            } elseif ($status === self::STATUS_IN_PROGRESS) {
                $counts['in_progress'] = $count;
            } elseif ($status === self::STATUS_COMPLETED) {
                $counts['completed'] = $count;
            } elseif ($status === self::STATUS_CANCELLED) {
                $counts['cancelled'] = $count;
            }
        }

        return $counts;
    }

    private function buildBaseQuery() {
        $vehicleWarrantyStatusExpr = $this->columnExists('vehicles', 'warranty_status')
            ? 'v.warranty_status'
            : "CASE WHEN v.warranty_expiry IS NOT NULL AND v.warranty_expiry < CURDATE() THEN 'Expired' ELSE 'Active' END";

        $machineWarrantyStatusExpr = $this->columnExists('machines', 'warranty_status')
            ? 'm.warranty_status'
            : "CASE WHEN m.warranty_expiry IS NOT NULL AND m.warranty_expiry < CURDATE() THEN 'Expired' ELSE 'Active' END";

        return "SELECT st.*,
                       reporter.full_name AS reported_by_name,
                       assignee.full_name AS assigned_to_name,
                       assigner.full_name AS assigned_by_name,
                       CASE WHEN st.asset_type = 'vehicle' THEN v.vehicle_id ELSE m.machine_id END AS asset_code,
                       CASE WHEN st.asset_type = 'vehicle' THEN v.vehicle_name ELSE m.machine_name END AS asset_name,
                       CASE WHEN st.asset_type = 'vehicle' THEN v.number_plate ELSE m.location END AS asset_reference,
                       CASE WHEN st.asset_type = 'vehicle' THEN v.model_number ELSE m.model_number END AS asset_model,
                       CASE WHEN st.asset_type = 'vehicle' THEN v.warranty_expiry ELSE m.warranty_expiry END AS asset_warranty_expiry,
                       CASE WHEN st.asset_type = 'vehicle' THEN {$vehicleWarrantyStatusExpr} ELSE {$machineWarrantyStatusExpr} END AS asset_warranty_status,
                       CASE WHEN st.asset_type = 'vehicle' THEN v.warranty_provider ELSE m.warranty_provider END AS asset_warranty_provider,
                       CASE WHEN st.asset_type = 'vehicle' THEN v.components ELSE m.components END AS asset_components
                FROM `{$this->table}` st
                LEFT JOIN users reporter ON reporter.id = st.reported_by
                LEFT JOIN users assignee ON assignee.id = st.assigned_to
                LEFT JOIN users assigner ON assigner.id = st.assigned_by
                LEFT JOIN vehicles v ON st.asset_type = 'vehicle' AND v.id = st.asset_id
                LEFT JOIN machines m ON st.asset_type = 'machine' AND m.id = st.asset_id";
    }

    private function hydrateTicketRow(array $row): array {
        $row['asset_components'] = $this->normalizeComponentList($row['asset_components'] ?? null);
        $row['component_comments'] = $this->normalizeComponentCommentList($row['component_comments'] ?? null);
        return $row;
    }

    private function normalizeComponentCommentList($rawComments): array {
        if (is_array($rawComments)) {
            return array_values(array_filter(array_map([$this, 'normalizeComponentCommentItem'], $rawComments), static function ($item) {
                return $item !== null;
            }));
        }

        if ($rawComments === null) {
            return [];
        }

        $value = trim((string) $rawComments);
        if ($value === '') {
            return [];
        }

        $decoded = json_decode($value, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return array_values(array_filter(array_map([$this, 'normalizeComponentCommentItem'], $decoded), static function ($item) {
                return $item !== null;
            }));
        }

        return [];
    }

    private function normalizeComponentCommentItem($item): ?array {
        if (is_string($item)) {
            $comment = trim($item);
            if ($comment === '') {
                return null;
            }

            return [
                'component' => 'General',
                'comment' => $comment,
            ];
        }

        if (!is_array($item)) {
            return null;
        }

        $component = '';
        foreach (['component', 'name', 'label', 'part_name', 'part'] as $key) {
            if (!empty($item[$key])) {
                $component = trim((string) $item[$key]);
                break;
            }
        }

        $comment = '';
        foreach (['comment', 'notes', 'note'] as $key) {
            if (!empty($item[$key])) {
                $comment = trim((string) $item[$key]);
                break;
            }
        }

        if ($comment === '') {
            return null;
        }

        return [
            'component' => $component !== '' ? $component : 'General',
            'comment' => $comment,
        ];
    }

    private function normalizeComponentList($rawComponents): array {
        if (is_array($rawComponents)) {
            return array_values(array_filter(array_map([$this, 'normalizeComponentItem'], $rawComponents), static function ($item) {
                return $item !== '';
            }));
        }

        if ($rawComponents === null) {
            return [];
        }

        $value = trim((string) $rawComponents);
        if ($value === '') {
            return [];
        }

        $decoded = json_decode($value, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return array_values(array_filter(array_map([$this, 'normalizeComponentItem'], $decoded), static function ($item) {
                return $item !== '';
            }));
        }

        $parts = array_map('trim', explode(',', $value));
        return array_values(array_filter(array_map([$this, 'normalizeComponentItem'], $parts), static function ($item) {
            return $item !== '';
        }));
    }

    private function normalizeComponentItem($item): string {
        if (is_string($item)) {
            return trim($item);
        }

        if (is_array($item)) {
            foreach (['name', 'component', 'label', 'title', 'part_name', 'part'] as $key) {
                if (!empty($item[$key])) {
                    return trim((string) $item[$key]);
                }
            }

            $encoded = json_encode($item);
            return is_string($encoded) ? $encoded : '';
        }

        if (is_numeric($item)) {
            return (string) $item;
        }

        return '';
    }

    private function sanitizeOrderBy(string $orderBy): string {
        $normalized = strtolower(trim($orderBy));

        $allowed = [
            'st.created_at desc' => 'st.created_at DESC',
            'st.created_at asc' => 'st.created_at ASC',
            'st.scheduled_date asc' => 'st.scheduled_date ASC',
            'st.scheduled_date desc' => 'st.scheduled_date DESC',
            'st.priority desc' => 'FIELD(st.priority, "Critical", "High", "Medium", "Low") DESC, st.created_at DESC',
            'st.priority asc' => 'FIELD(st.priority, "Low", "Medium", "High", "Critical") ASC, st.created_at DESC',
        ];

        return $allowed[$normalized] ?? 'st.created_at DESC';
    }

    private function generateNextServiceTicketId() {
        $sql = "SELECT service_ticket_id
                FROM `{$this->table}`
                WHERE service_ticket_id LIKE 'SVT-%'
                ORDER BY CAST(SUBSTRING(service_ticket_id, 5) AS UNSIGNED) DESC
                LIMIT 1";
        $stmt = $this->db->query($sql);
        $lastTicket = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($lastTicket && !empty($lastTicket['service_ticket_id'])) {
            $lastNumber = (int) substr((string) $lastTicket['service_ticket_id'], 4);
            $nextNumber = $lastNumber + 1;
        } else {
            $nextNumber = 1;
        }

        return 'SVT-' . str_pad((string) $nextNumber, 3, '0', STR_PAD_LEFT);
    }

    private function columnExists(string $table, string $column): bool {
        $cacheKey = $table . '.' . $column;
        if (array_key_exists($cacheKey, $this->schemaCheckCache)) {
            return $this->schemaCheckCache[$cacheKey];
        }

        $stmt = $this->db->prepare(
            'SELECT COUNT(*)
             FROM information_schema.columns
             WHERE table_schema = DATABASE()
               AND table_name = ?
               AND column_name = ?'
        );
        $stmt->execute([$table, $column]);
        $exists = ((int) $stmt->fetchColumn()) > 0;
        $this->schemaCheckCache[$cacheKey] = $exists;

        return $exists;
    }
}
