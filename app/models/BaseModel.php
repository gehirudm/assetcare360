<?php

/**
 * Base Model Class
 * All models should extend this class
 * Provides automatic table creation and basic CRUD operations
 */
abstract class BaseModel {
    protected $db;
    protected $table;
    protected $schema = [];
    
    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
        $this->createTableIfNotExists();
    }
    
    /**
     * Define table schema in child classes
     * Example format:
     * [
     *     'id' => 'INT AUTO_INCREMENT PRIMARY KEY',
     *     'name' => 'VARCHAR(255) NOT NULL',
     *     'created_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
     * ]
     */
    abstract protected function getSchema();
    
    /**
     * Define additional indexes (optional)
     * Override in child classes if needed
     * Example format:
     * [
     *     'idx_name' => 'column_name',
     *     'idx_multi' => 'column1, column2'
     * ]
     */
    protected function getIndexes() {
        return [];
    }
    
    /**
     * Automatically create table if it doesn't exist
     */
    protected function createTableIfNotExists() {
        $schema = $this->getSchema();
        if (empty($schema)) {
            return;
        }
        
        $columns = [];
        foreach ($schema as $column => $definition) {
            $columns[] = "`$column` $definition";
        }
        
        $columnsStr = implode(', ', $columns);
        $sql = "CREATE TABLE IF NOT EXISTS `{$this->table}` ($columnsStr) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
        
        try {
            $this->db->exec($sql);
            
            // Create indexes if defined
            $this->createIndexes();
        } catch (PDOException $e) {
            die("Error creating table {$this->table}: " . $e->getMessage());
        }
    }
    
    /**
     * Create additional indexes
     */
    protected function createIndexes() {
        $indexes = $this->getIndexes();
        if (empty($indexes)) {
            return;
        }
        
        foreach ($indexes as $indexName => $columns) {
            $sql = "CREATE INDEX IF NOT EXISTS `{$indexName}` ON `{$this->table}` ($columns)";
            try {
                $this->db->exec($sql);
            } catch (PDOException $e) {
                // Index might already exist or error in definition, log but don't fail
                error_log("Error creating index {$indexName} on {$this->table}: " . $e->getMessage());
            }
        }
    }
    
    /**
     * Find record by ID
     */
    public function findById($id) {
        $stmt = $this->db->prepare("SELECT * FROM `{$this->table}` WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }
    
    /**
     * Find one record by conditions
     */
    public function findOne($conditions) {
        $where = [];
        $params = [];
        
        foreach ($conditions as $key => $value) {
            $where[] = "`$key` = ?";
            $params[] = $value;
        }
        
        $whereStr = implode(' AND ', $where);
        $stmt = $this->db->prepare("SELECT * FROM `{$this->table}` WHERE $whereStr LIMIT 1");
        $stmt->execute($params);
        return $stmt->fetch();
    }
    
    /**
     * Find all records with optional conditions
     */
    public function findAll($conditions = [], $orderBy = null, $limit = null) {
        $sql = "SELECT * FROM `{$this->table}`";
        $params = [];
        
        if (!empty($conditions)) {
            $where = [];
            foreach ($conditions as $key => $value) {
                $where[] = "`$key` = ?";
                $params[] = $value;
            }
            $sql .= " WHERE " . implode(' AND ', $where);
        }
        
        if ($orderBy) {
            $sql .= " ORDER BY $orderBy";
        }
        
        if ($limit) {
            $sql .= " LIMIT $limit";
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }
    
    /**
     * Create a new record
     */
    public function create($data) {
        $columns = array_keys($data);
        $placeholders = array_fill(0, count($columns), '?');
        
        $columnsStr = implode('`, `', $columns);
        $placeholdersStr = implode(', ', $placeholders);
        
        $sql = "INSERT INTO `{$this->table}` (`$columnsStr`) VALUES ($placeholdersStr)";
        $stmt = $this->db->prepare($sql);
        
        if ($stmt->execute(array_values($data))) {
            return $this->db->lastInsertId();
        }
        
        return false;
    }
    
    /**
     * Update a record by ID
     */
    public function update($id, $data) {
        $set = [];
        $params = [];
        
        foreach ($data as $key => $value) {
            $set[] = "`$key` = ?";
            $params[] = $value;
        }
        
        $params[] = $id;
        $setStr = implode(', ', $set);
        
        $sql = "UPDATE `{$this->table}` SET $setStr WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        
        return $stmt->execute($params);
    }
    
    /**
     * Delete a record by ID
     */
    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM `{$this->table}` WHERE id = ?");
        return $stmt->execute([$id]);
    }
    
    /**
     * Execute custom query
     */
    protected function query($sql, $params = []) {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }
    
    /**
     * Count records with optional conditions
     */
    public function count($conditions = []) {
        $sql = "SELECT COUNT(*) as count FROM `{$this->table}`";
        $params = [];
        
        if (!empty($conditions)) {
            $where = [];
            foreach ($conditions as $key => $value) {
                $where[] = "`$key` = ?";
                $params[] = $value;
            }
            $sql .= " WHERE " . implode(' AND ', $where);
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch();
        return $result['count'];
    }
}
