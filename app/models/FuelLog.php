<?php

require_once __DIR__ . '/BaseModel.php';

class FuelLog extends BaseModel {
    protected $table = 'fuel_logs';

    protected $fillable = [
        'fuel_log_id',
        'vehicle_registration',
        'driver_id',
        'log_datetime',
        'fuel_volume',
        'total_cost',
        'odometer_reading',
        'station_name',
        'bill_image',
        'fuel_type',
        'fuel_source',
        'distance_since_last',
        'fuel_efficiency',
    ];

    protected function getSchema() {
        return [
            'id'                   => 'INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY',
            'fuel_log_id'         => 'VARCHAR(20) NOT NULL',
            'vehicle_registration' => 'VARCHAR(50) NOT NULL',
            'driver_id'           => 'INT(11) DEFAULT NULL',
            'log_datetime'        => 'DATETIME NOT NULL',
            'fuel_volume'         => 'DECIMAL(10,2) NOT NULL',
            'total_cost'          => 'DECIMAL(12,2) DEFAULT NULL',
            'odometer_reading'    => 'INT(11) NOT NULL',
            'station_name'        => 'VARCHAR(255) DEFAULT NULL',
            'bill_image'          => 'VARCHAR(500) DEFAULT NULL',
            'fuel_type'           => 'VARCHAR(50) NOT NULL',
            'fuel_source'         => "ENUM('internal','external') NOT NULL DEFAULT 'external'",
            'distance_since_last' => 'DECIMAL(10,2) DEFAULT NULL',
            'fuel_efficiency'     => 'DECIMAL(10,2) DEFAULT NULL',
            'created_at'          => 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP',
            'updated_at'          => 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
        ];
    }

    protected function getIndexes() {
        return [
            'idx_fuel_log_id'          => 'fuel_log_id',
            'idx_vehicle_registration' => 'vehicle_registration',
            'idx_driver_id'            => 'driver_id',
            'idx_log_datetime'         => 'log_datetime',
        ];
    }

    public function getAllLogs($filters = []) {
        $query = "SELECT fl.*, u.full_name AS driver_name
                  FROM {$this->table} fl
                  LEFT JOIN users u ON fl.driver_id = u.id
                  WHERE 1=1";
        $params = [];

        if (!empty($filters['vehicle_registration'])) {
            $query .= " AND fl.vehicle_registration = :vehicle_registration";
            $params[':vehicle_registration'] = $filters['vehicle_registration'];
        }

        if (!empty($filters['driver_id'])) {
            $query .= " AND fl.driver_id = :driver_id";
            $params[':driver_id'] = $filters['driver_id'];
        }

        $query .= " ORDER BY fl.log_datetime DESC";

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getLogByFuelLogId($fuel_log_id) {
        $query = "SELECT fl.*, u.full_name AS driver_name
                  FROM {$this->table} fl
                  LEFT JOIN users u ON fl.driver_id = u.id
                  WHERE fl.fuel_log_id = :fuel_log_id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':fuel_log_id', $fuel_log_id);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function getLastOdometerForVehicle($vehicle_registration) {
        $query = "SELECT odometer_reading, log_datetime
                  FROM {$this->table}
                  WHERE vehicle_registration = :vehicle_registration
                  ORDER BY log_datetime DESC LIMIT 1";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':vehicle_registration', $vehicle_registration);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function createLog($data) {
        $query = "INSERT INTO {$this->table}
                  (fuel_log_id, vehicle_registration, driver_id, log_datetime,
                   fuel_volume, total_cost, odometer_reading, station_name,
                   bill_image, fuel_type, fuel_source, distance_since_last, fuel_efficiency)
                  VALUES
                  (:fuel_log_id, :vehicle_registration, :driver_id, :log_datetime,
                   :fuel_volume, :total_cost, :odometer_reading, :station_name,
                   :bill_image, :fuel_type, :fuel_source, :distance_since_last, :fuel_efficiency)";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            ':fuel_log_id'          => $data['fuel_log_id'],
            ':vehicle_registration' => $data['vehicle_registration'],
            ':driver_id'            => $data['driver_id'] ?? null,
            ':log_datetime'         => $data['log_datetime'],
            ':fuel_volume'          => $data['fuel_volume'],
            ':total_cost'           => $data['total_cost'],
            ':odometer_reading'     => $data['odometer_reading'],
            ':station_name'         => $data['station_name'] ?? null,
            ':bill_image'           => $data['bill_image'] ?? null,
            ':fuel_type'            => $data['fuel_type'],
            ':fuel_source'          => $data['fuel_source'] ?? 'external',
            ':distance_since_last'  => $data['distance_since_last'] ?? null,
            ':fuel_efficiency'      => $data['fuel_efficiency'] ?? null,
        ]);

        return $this->getLogByFuelLogId($data['fuel_log_id']);
    }

    public function updateLog($fuel_log_id, $data) {
        $query = "UPDATE {$this->table} SET
                  vehicle_registration = :vehicle_registration,
                  driver_id            = :driver_id,
                  log_datetime         = :log_datetime,
                  fuel_volume          = :fuel_volume,
                  total_cost           = :total_cost,
                  odometer_reading     = :odometer_reading,
                  station_name         = :station_name,
                  bill_image           = :bill_image,
                  fuel_type            = :fuel_type,
                  fuel_source          = :fuel_source,
                  distance_since_last  = :distance_since_last,
                  fuel_efficiency      = :fuel_efficiency
                  WHERE fuel_log_id = :fuel_log_id";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            ':fuel_log_id'          => $fuel_log_id,
            ':vehicle_registration' => $data['vehicle_registration'],
            ':driver_id'            => $data['driver_id'] ?? null,
            ':log_datetime'         => $data['log_datetime'],
            ':fuel_volume'          => $data['fuel_volume'],
            ':total_cost'           => $data['total_cost'],
            ':odometer_reading'     => $data['odometer_reading'],
            ':station_name'         => $data['station_name'] ?? null,
            ':bill_image'           => $data['bill_image'] ?? null,
            ':fuel_type'            => $data['fuel_type'],
            ':fuel_source'          => $data['fuel_source'] ?? 'external',
            ':distance_since_last'  => $data['distance_since_last'] ?? null,
            ':fuel_efficiency'      => $data['fuel_efficiency'] ?? null,
        ]);

        return $this->getLogByFuelLogId($fuel_log_id);
    }

    public function deleteLog($fuel_log_id) {
        $query = "DELETE FROM {$this->table} WHERE fuel_log_id = :fuel_log_id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':fuel_log_id', $fuel_log_id);
        return $stmt->execute();
    }

    public function getLastFuelLogId() {
        $query = "SELECT fuel_log_id FROM {$this->table} ORDER BY id DESC LIMIT 1";
        $stmt = $this->db->query($query);
        return $stmt ? $stmt->fetchColumn() : null;
    }
}
