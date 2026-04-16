<?php

require_once __DIR__ . '/BaseModel.php';

/**
 * SystemSetting Model
 * Key-value store for admin-configurable system settings
 */
class SystemSetting extends BaseModel {
    protected $table = 'system_settings';

    protected function getSchema() {
        return [
            'id' => 'INT AUTO_INCREMENT PRIMARY KEY',
            'setting_key' => 'VARCHAR(100) NOT NULL UNIQUE',
            'setting_value' => 'TEXT NOT NULL',
            'data_type' => "ENUM('string', 'integer', 'decimal', 'boolean', 'json') NOT NULL DEFAULT 'string'",
            'description' => 'TEXT NULL',
            'updated_by' => 'INT NULL',
            'created_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
            'updated_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        ];
    }

    protected function getForeignKeys() {
        return [
            'fk_settings_updated_by' => 'FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL'
        ];
    }

    protected function getIndexes() {
        return [
            'idx_setting_key' => 'setting_key'
        ];
    }

    /**
     * Get a setting value by key, with optional default
     */
    public function getSetting($key, $default = null) {
        $row = $this->findOne(['setting_key' => $key]);
        if (!$row) {
            return $default;
        }
        return $this->castValue($row['setting_value'], $row['data_type']);
    }

    /**
     * Set a setting value
     */
    public function setSetting($key, $value, $updatedBy = null) {
        $existing = $this->findOne(['setting_key' => $key]);
        if ($existing) {
            $data = [
                'setting_value' => (string) $value,
                'updated_by' => $updatedBy
            ];
            return $this->update($existing['id'], $data);
        }
        return false;
    }

    /**
     * Get all settings with metadata
     */
    public function getAllSettings() {
        $query = "SELECT ss.*, u.full_name as updated_by_name 
                  FROM {$this->table} ss
                  LEFT JOIN users u ON ss.updated_by = u.id
                  ORDER BY ss.setting_key ASC";
        $stmt = $this->db->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get a single setting with metadata
     */
    public function getSettingByKey($key) {
        $query = "SELECT ss.*, u.full_name as updated_by_name 
                  FROM {$this->table} ss
                  LEFT JOIN users u ON ss.updated_by = u.id
                  WHERE ss.setting_key = :key";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':key', $key);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Cast stored string value to the correct PHP type
     */
    private function castValue($value, $dataType) {
        switch ($dataType) {
            case 'integer':
                return (int) $value;
            case 'decimal':
                return (float) $value;
            case 'boolean':
                return filter_var($value, FILTER_VALIDATE_BOOLEAN);
            case 'json':
                return json_decode($value, true);
            default:
                return $value;
        }
    }
}
