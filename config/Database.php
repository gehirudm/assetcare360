<?php

/**
 * Database Singleton Class
 */
class Database {
    private static $instance = null;
    private $connection;

    private function __construct() {
        try {
            // Support both "host:port" in DB_HOST (legacy) and separate DB_PORT constant (new)
            $host = DB_HOST;
            $port = defined('DB_PORT') ? DB_PORT : '3306';
            if (strpos($host, ':') !== false) {
                [$host, $port] = explode(':', $host, 2);
            }

            $dsn = "mysql:host={$host};port={$port};dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];
            if (defined('DB_SSL_CA') && DB_SSL_CA !== '') {
                $caPath = DB_SSL_CA;
                if (substr($caPath, 0, 1) !== '/') {
                    $caPath = realpath(__DIR__ . '/../' . $caPath);
                }
                if ($caPath !== false) {
                    $options[PDO::MYSQL_ATTR_SSL_CA]                 = $caPath;
                    $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = true;
                }
            }
            $this->connection = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            die("Database connection failed: " . $e->getMessage());
        }
    }

    public static function getInstance(): self {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection(): PDO {
        return $this->connection;
    }

    private function __clone() {}
    public function __wakeup() {}
}
