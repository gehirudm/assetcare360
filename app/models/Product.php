<?php

require_once __DIR__ . '/BaseModel.php';

/**
 * Example Product Model
 * Demonstrates how to create a new model with automatic table creation
 * 
 * This model will automatically create the 'products' table when first used.
 * All standard CRUD operations are inherited from BaseModel.
 */
class Product extends BaseModel {
    protected $table = 'products';
    
    /**
     * Define table schema
     * The table will be automatically created with these columns
     */
    protected function getSchema() {
        return [
            'id' => 'INT AUTO_INCREMENT PRIMARY KEY',
            'sku' => 'VARCHAR(100) UNIQUE NOT NULL',
            'name' => 'VARCHAR(255) NOT NULL',
            'description' => 'TEXT NULL',
            'category' => 'VARCHAR(100) NULL',
            'quantity' => 'INT DEFAULT 0',
            'unit_price' => 'DECIMAL(10,2) NOT NULL',
            'reorder_level' => 'INT DEFAULT 10',
            'supplier' => 'VARCHAR(255) NULL',
            'location' => 'VARCHAR(255) NULL',
            'is_active' => 'TINYINT(1) DEFAULT 1',
            'created_by' => 'INT NULL',
            'updated_by' => 'INT NULL',
            'created_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
            'updated_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        ];
    }
    
    /**
     * Get additional indexes for the table
     */
    protected function getIndexes() {
        return [
            'idx_category' => 'category',
            'idx_active' => 'is_active',
            'idx_reorder' => 'quantity, reorder_level'
        ];
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
        $sql = "SELECT * FROM `{$this->table}` 
                WHERE is_active = 1 
                AND quantity <= reorder_level 
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
        return $this->count([
            'is_active' => 1,
            // Custom SQL for complex conditions can be added via query() method
        ]);
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
        $sql = "SELECT 
                    COUNT(*) as total_products,
                    SUM(quantity) as total_quantity,
                    SUM(quantity * unit_price) as total_value,
                    COUNT(CASE WHEN quantity <= reorder_level THEN 1 END) as low_stock_count
                FROM `{$this->table}` 
                WHERE is_active = 1";
        
        $stmt = $this->query($sql);
        return $stmt->fetch();
    }
}
