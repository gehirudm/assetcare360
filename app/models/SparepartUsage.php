<?php

require_once __DIR__ . '/BaseModel.php';

/**
 * SparepartUsage Model
 * Tracks the history of sparepart issuances
 */
class SparepartUsage extends BaseModel {
    protected $table = 'sparepart_usage';
    
    protected function getSchema() {
        return [
            'id' => 'INT AUTO_INCREMENT PRIMARY KEY',
            'sparepart_id' => 'VARCHAR(50) NOT NULL',
            'sparepart_name' => 'VARCHAR(255) NOT NULL',
            'quantity_issued' => 'INT NOT NULL',
            'issue_date' => 'DATE NOT NULL',
            'issued_by' => 'INT NULL',
            'machine_id' => 'VARCHAR(50) NULL',
            'vehicle_id' => 'VARCHAR(50) NULL',
            'notes' => 'TEXT NULL',
            'created_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
            'updated_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        ];
    }
    
    protected function getIndexes() {
        return [
            'idx_sparepart_id' => ['sparepart_id'],
            'idx_issue_date' => ['issue_date'],
            'idx_issued_by' => ['issued_by']
        ];
    }
    
    /**
     * Get usage history for a specific sparepart
     */
    public function getUsageHistory($sparepartId, $limit = 50) {
        $sql = "SELECT * FROM {$this->table} 
                WHERE sparepart_id = :sparepart_id 
                ORDER BY issue_date DESC, created_at DESC 
                LIMIT :limit";
        
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':sparepart_id', $sparepartId, PDO::PARAM_STR);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Get all usage records with pagination
     */
    public function getAllUsage($page = 1, $perPage = 50) {
        $offset = ($page - 1) * $perPage;
        
        $sql = "SELECT * FROM {$this->table} 
                ORDER BY issue_date DESC, created_at DESC 
                LIMIT :limit OFFSET :offset";
        
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Get total quantity issued per sparepart (all time, all records)
     */
    public function getIssuedTotals() {
        $sql = "SELECT sparepart_id, SUM(quantity_issued) as total_issued
                FROM {$this->table}
                GROUP BY sparepart_id";

        $stmt = $this->db->prepare($sql);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get usage statistics for a sparepart
     */
    public function getUsageStats($sparepartId) {
        $sql = "SELECT 
                    COUNT(*) as total_issuances,
                    SUM(quantity_issued) as total_quantity,
                    MAX(issue_date) as last_issue_date,
                    MIN(issue_date) as first_issue_date
                FROM {$this->table} 
                WHERE sparepart_id = :sparepart_id";
        
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':sparepart_id', $sparepartId, PDO::PARAM_STR);
        $stmt->execute();
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}
