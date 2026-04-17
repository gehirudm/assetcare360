<?php

require_once __DIR__ . '/BaseModel.php';

/**
 * SparePart Model
 * Manages spare parts inventory for machines and vehicles
 * 
 * This model uses the 'spareparts' table to store spare parts information.
 * All standard CRUD operations are inherited from BaseModel.
 */
class Product extends BaseModel {
    protected $table = 'spareparts';
    private $schemaCache = [];
    
    /**
     * Define table schema
     * The table will be automatically created with these columns
     */
    protected function getSchema() {
        return [
            'id' => 'INT AUTO_INCREMENT PRIMARY KEY',
            'sparepart_id' => 'VARCHAR(50) UNIQUE NOT NULL',
            'sku' => 'VARCHAR(100) UNIQUE NULL',
            'name' => 'VARCHAR(255) NOT NULL',
            'description' => 'TEXT NULL',
            'category' => 'VARCHAR(100) NULL',
            'quantity' => 'INT DEFAULT 0',
            'unit_price' => 'DECIMAL(10,2) DEFAULT 0.00',
            'reorder_level' => 'INT DEFAULT 10',
            'low_stock_threshold' => 'INT DEFAULT 10',
            'compatible_machines' => 'JSON NULL',
            'compatible_vehicles' => 'JSON NULL',
            'location' => 'VARCHAR(255) NULL',
            'is_active' => 'TINYINT(1) DEFAULT 1',
            'created_by' => 'INT NULL',
            'updated_by' => 'INT NULL',
            'created_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
            'updated_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
            'last_issue_date' => 'DATE NULL'
        ];
    }
    
    /**
     * Get additional indexes for the table
     */
    protected function getIndexes() {
        return [
            'idx_category' => 'category',
            'idx_active' => 'is_active',
            'idx_reorder' => 'quantity, reorder_level',
            'idx_low_stock_threshold' => 'quantity, low_stock_threshold'
        ];
    }

    private function columnExists($column) {
        if (array_key_exists($column, $this->schemaCache)) {
            return $this->schemaCache[$column];
        }

        $stmt = $this->db->prepare(
            'SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?'
        );
        $stmt->execute([$this->table, $column]);

        $exists = (int)$stmt->fetchColumn() > 0;
        $this->schemaCache[$column] = $exists;

        return $exists;
    }

    private function thresholdExpression() {
        if ($this->columnExists('low_stock_threshold')) {
            return 'COALESCE(low_stock_threshold, reorder_level, 10)';
        }

        return 'COALESCE(reorder_level, 10)';
    }

    public function supportsLowStockThreshold() {
        return $this->columnExists('low_stock_threshold');
    }
    
    /**
     * Generate next sparepart ID in format SPR-001, SPR-002, etc.
     */
    public function generateProductId() {
        $sql = "SELECT MAX(CAST(SUBSTRING(sparepart_id, 5) AS UNSIGNED)) AS max_sequence
                FROM `{$this->table}`
                WHERE sparepart_id REGEXP '^SPR-[0-9]+$'";
        $stmt = $this->db->query($sql);
        $result = $stmt->fetch();

        $maxSequence = (int)($result['max_sequence'] ?? 0);
        $nextNumber = $maxSequence + 1;

        return 'SPR-' . str_pad((string)$nextNumber, 3, '0', STR_PAD_LEFT);
    }
    
    /**
     * Find product by SKU
     */
    public function findBySku($sku) {
        return $this->findOne(['sku' => $sku]);
    }
    
    /**
     * Get all active products
     */
    public function getActiveProducts($orderBy = 'name ASC', $limit = null) {
        return $this->findAll(['is_active' => 1], $orderBy, $limit);
    }
    
    /**
     * Get products by category
     */
    public function getProductsByCategory($category) {
        return $this->findAll(['category' => $category, 'is_active' => 1], 'name ASC');
    }
    
    /**
     * Get products that need reordering
     */
    public function getProductsNeedingReorder() {
        $thresholdExpression = $this->thresholdExpression();
        $sql = "SELECT * FROM `{$this->table}` 
                WHERE is_active = 1 
            AND quantity <= {$thresholdExpression} 
                ORDER BY quantity ASC";
        $stmt = $this->query($sql);
        return $stmt->fetchAll();
    }
    
    /**
     * Update product quantity
     */
    public function updateQuantity($productId, $quantity, $operation = 'set') {
        if ($operation === 'add') {
            $sql = "UPDATE `{$this->table}` SET quantity = quantity + ? WHERE id = ?";
        } elseif ($operation === 'subtract') {
            $sql = "UPDATE `{$this->table}` SET quantity = quantity - ? WHERE id = ?";
        } else {
            $sql = "UPDATE `{$this->table}` SET quantity = ? WHERE id = ?";
        }
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$quantity, $productId]);
    }
    
    /**
     * Check if SKU exists
     */
    public function skuExists($sku, $excludeProductId = null) {
        $sql = "SELECT COUNT(*) as count FROM `{$this->table}` WHERE sku = ?";
        $params = [$sku];
        
        if ($excludeProductId) {
            $sql .= " AND id != ?";
            $params[] = $excludeProductId;
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch();
        
        return $result['count'] > 0;
    }
    
    /**
     * Get low stock products count
     */
    public function getLowStockCount() {
        $thresholdExpression = $this->thresholdExpression();
        $sql = "SELECT COUNT(*) FROM `{$this->table}`
                WHERE is_active = 1
                AND quantity <= {$thresholdExpression}";

        $stmt = $this->query($sql);
        return (int)$stmt->fetchColumn();
    }
    
    /**
     * Search products by name or SKU
     */
    public function search($searchTerm) {
        $sql = "SELECT * FROM `{$this->table}` 
                WHERE is_active = 1 
                AND (name LIKE ? OR sku LIKE ? OR description LIKE ?)
                ORDER BY name ASC";
        
        $term = "%{$searchTerm}%";
        $stmt = $this->query($sql, [$term, $term, $term]);
        return $stmt->fetchAll();
    }
    
    /**
     * Get product statistics
     */
    public function getStatistics() {
        $thresholdExpression = $this->thresholdExpression();
        $sql = "SELECT 
                    COUNT(*) as total_products,
                    SUM(quantity) as total_quantity,
                    SUM(quantity * unit_price) as total_value,
                    COUNT(CASE WHEN quantity <= {$thresholdExpression} THEN 1 END) as low_stock_count
                FROM `{$this->table}` 
                WHERE is_active = 1";
        
        $stmt = $this->query($sql);
        return $stmt->fetch();
    }
}
