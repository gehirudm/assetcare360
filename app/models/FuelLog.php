<?php

require_once __DIR__ . '/BaseModel.php';

class FuelLog extends BaseModel {
    protected $table = 'fuel_logs';

    protected function getSchema() {
        return [
            'id' => 'INT AUTO_INCREMENT PRIMARY KEY',
            'fuel_log_id' => 'VARCHAR(20) UNIQUE NOT NULL',
            'vehicle_registration' => 'VARCHAR(50) NOT NULL',
            'driver_id' => 'INT NULL',
            'log_datetime' => 'DATETIME NOT NULL',
            'fuel_volume' => 'DECIMAL(10,2) NOT NULL',
            'total_cost' => 'DECIMAL(12,2) NOT NULL',
            'odometer_reading' => 'INT NOT NULL',
            'station_name' => 'VARCHAR(255) NULL',
            'fuel_type' => 'VARCHAR(50) NOT NULL',
            'distance_since_last' => 'DECIMAL(10,2) NULL',
            'fuel_efficiency' => 'DECIMAL(10,2) NULL',
            'created_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
            'updated_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        ];
    }

    protected function getIndexes() {
        return [
            'idx_fuel_log_id' => 'fuel_log_id',
            'idx_vehicle_registration' => 'vehicle_registration',
            'idx_driver_id' => 'driver_id',
            'idx_log_datetime' => 'log_datetime'
        ];
    }

    public function getAllLogs($filters = []) {
        $query = "SELECT * FROM {$this->table} WHERE 1=1";
        $params = [];

        if (!empty($filters['vehicle_registration'])) {
            $query .= " AND vehicle_registration = :vehicle_registration";
            $params[':vehicle_registration'] = $filters['vehicle_registration'];
        }

        if (!empty($filters['driver_id'])) {
            $query .= " AND driver_id = :driver_id";
            $params[':driver_id'] = $filters['driver_id'];
        }

        $query .= " ORDER BY log_datetime DESC, id DESC";

        if (!empty($filters['limit']) && is_numeric($filters['limit'])) {
            $query .= " LIMIT " . intval($filters['limit']);
        }

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getByFuelLogId($fuelLogId) {
        $stmt = $this->db->prepare("SELECT * FROM {$this->table} WHERE fuel_log_id = :fuel_log_id LIMIT 1");
        $stmt->execute([':fuel_log_id' => $fuelLogId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function getPreviousLog($vehicleRegistration, $driverId = null) {
        $query = "SELECT * FROM {$this->table} WHERE vehicle_registration = :vehicle_registration";
        $params = [':vehicle_registration' => $vehicleRegistration];

        if ($driverId !== null && $driverId !== '') {
            $query .= " AND driver_id = :driver_id";
            $params[':driver_id'] = $driverId;
        }

        $query .= " ORDER BY log_datetime DESC, id DESC LIMIT 1";

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function getNextFuelLogId() {
        $stmt = $this->db->query("SELECT fuel_log_id FROM {$this->table} WHERE fuel_log_id LIKE 'FL-%' ORDER BY CAST(SUBSTRING(fuel_log_id, 4) AS UNSIGNED) DESC LIMIT 1");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($result && !empty($result['fuel_log_id'])) {
            $lastNumber = intval(substr($result['fuel_log_id'], 3));
            $nextNumber = $lastNumber + 1;
        } else {
            $nextNumber = 1;
        }

        return 'FL-' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);
    }

    public function createLog($data) {
        $query = "INSERT INTO {$this->table}
            (fuel_log_id, vehicle_registration, driver_id, log_datetime, fuel_volume, total_cost, odometer_reading, station_name, fuel_type, distance_since_last, fuel_efficiency)
            VALUES
            (:fuel_log_id, :vehicle_registration, :driver_id, :log_datetime, :fuel_volume, :total_cost, :odometer_reading, :station_name, :fuel_type, :distance_since_last, :fuel_efficiency)";

        $stmt = $this->db->prepare($query);
        $ok = $stmt->execute([
            ':fuel_log_id' => $data['fuel_log_id'],
            ':vehicle_registration' => $data['vehicle_registration'],
            ':driver_id' => $data['driver_id'] ?? null,
            ':log_datetime' => $data['log_datetime'],
            ':fuel_volume' => $data['fuel_volume'],
            ':total_cost' => $data['total_cost'],
            ':odometer_reading' => $data['odometer_reading'],
            ':station_name' => $data['station_name'] ?? null,
            ':fuel_type' => $data['fuel_type'],
            ':distance_since_last' => $data['distance_since_last'] ?? null,
            ':fuel_efficiency' => $data['fuel_efficiency'] ?? null
        ]);

        if (!$ok) {
            return false;
        }

        return $this->getByFuelLogId($data['fuel_log_id']);
    }
}
