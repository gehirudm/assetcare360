<?php

require_once __DIR__ . '/BaseModel.php';

class SparepartAddition extends BaseModel {
    protected $table = 'sparepart_additions';

    protected function getSchema() {
        return [
            'id' => 'INT AUTO_INCREMENT PRIMARY KEY',
            'sparepart_id' => 'VARCHAR(50) NOT NULL',
            'sparepart_name' => 'VARCHAR(255) NOT NULL',
            'category' => 'VARCHAR(50) DEFAULT NULL',
            'location' => 'VARCHAR(100) DEFAULT NULL',
            'quantity_added' => 'INT NOT NULL',
            'previous_stock' => 'INT NOT NULL DEFAULT 0',
            'new_stock' => 'INT NOT NULL DEFAULT 0',
            'received_date' => 'DATE NOT NULL',
            'supplier' => 'VARCHAR(255) DEFAULT NULL',
            'supplier_contact' => 'VARCHAR(100) DEFAULT NULL',
            'supplier_address' => 'TEXT DEFAULT NULL',
            'warranty_period' => 'INT DEFAULT NULL',
            'warranty_start' => 'DATE DEFAULT NULL',
            'warranty_terms' => 'TEXT DEFAULT NULL',
            'reference' => 'VARCHAR(255) DEFAULT NULL',
            'notes' => 'TEXT DEFAULT NULL',
            'added_by' => 'VARCHAR(100) DEFAULT NULL',
            'created_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
        ];
    }

    /**
     * Get recent additions with pagination
     */
    public function getRecentAdditions($page = 1, $perPage = 20) {
        $offset = ($page - 1) * $perPage;
        
        $sql = "SELECT * FROM {$this->table} 
                ORDER BY created_at DESC 
                LIMIT :limit OFFSET :offset";
        
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get additions for a specific sparepart
     */
    public function getAdditionsBySparepart($sparepartId, $limit = 10) {
        $sql = "SELECT * FROM {$this->table} 
                WHERE sparepart_id = :sparepart_id 
                ORDER BY created_at DESC 
                LIMIT :limit";
        
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':sparepart_id', $sparepartId, PDO::PARAM_STR);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get total quantity added for a sparepart
     */
    public function getTotalAddedBySparepart($sparepartId) {
        $sql = "SELECT 
                    SUM(quantity_added) as total_added,
                    COUNT(*) as addition_count
                FROM {$this->table} 
                WHERE sparepart_id = :sparepart_id";
        
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':sparepart_id', $sparepartId, PDO::PARAM_STR);
        $stmt->execute();
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?? ['total_added' => 0, 'addition_count' => 0];
    }

    /**
     * Get a single addition by ID
     */
    public function getById($id) {
        $sql = "SELECT * FROM {$this->table} WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Update an addition by ID
     */
    public function updateById($id, $data) {
        $allowedFields = [
            'sparepart_id', 'sparepart_name', 'category', 'location',
            'quantity_added', 'received_date', 'supplier', 'supplier_contact',
            'supplier_address', 'warranty_period', 'warranty_start', 'warranty_terms',
            'reference', 'notes'
        ];
        
        $updates = [];
        $params = [':id' => $id];
        
        foreach ($data as $field => $value) {
            if (in_array($field, $allowedFields)) {
                $updates[] = "{$field} = :{$field}";
                $params[":{$field}"] = $value;
            }
        }
        
        if (empty($updates)) {
            return false;
        }
        
        $sql = "UPDATE {$this->table} SET " . implode(', ', $updates) . " WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        
        return $stmt->execute();
    }

    /**
     * Delete an addition by ID
     */
    public function deleteById($id) {
        $sql = "DELETE FROM {$this->table} WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        return $stmt->execute();
    }
}
