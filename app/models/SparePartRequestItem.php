<?php

require_once __DIR__ . '/BaseModel.php';

/**
 * Spare Part Request Item Model
 * Stores individual spare part line items within a spare part request.
 */
class SparePartRequestItem extends BaseModel {
    protected $table = 'spare_part_request_items';

    /**
     * Define table schema
     */
    protected function getSchema() {
        return [
            'id' => 'INT AUTO_INCREMENT PRIMARY KEY',
            'request_id' => 'INT NOT NULL',
            'part_code' => 'VARCHAR(50) NULL',
            'part_name' => 'VARCHAR(255) NOT NULL',
            'quantity' => 'INT NOT NULL DEFAULT 1',
            'created_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
        ];
    }

    /**
     * Define indexes
     */
    protected function getIndexes() {
        return [
            'idx_spri_request_id' => 'request_id'
        ];
    }

    /**
     * Get items for a specific request
     */
    public function getByRequestId($requestId) {
        $sql = "SELECT * FROM `{$this->table}` WHERE request_id = ? ORDER BY id ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$requestId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Create multiple items at once
     */
    public function createBulk($requestId, $items) {
        $sql = "INSERT INTO `{$this->table}` (request_id, part_code, part_name, quantity) VALUES (?, ?, ?, ?)";
        $stmt = $this->db->prepare($sql);

        foreach ($items as $item) {
            $stmt->execute([
                $requestId,
                $item['part_code'] ?? null,
                $item['part_name'],
                $item['quantity'] ?? 1
            ]);
        }

        return true;
    }

    /**
     * Delete all items for a request
     */
    public function deleteByRequestId($requestId) {
        $sql = "DELETE FROM `{$this->table}` WHERE request_id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$requestId]);
    }
}
