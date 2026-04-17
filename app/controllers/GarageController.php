<?php

require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';

/**
 * Garage Controller
 * Provides garage listing APIs for route breakdown workflows.
 */
class GarageController {
    private $conn;

    public function __construct() {
        $db = Database::getInstance();
        $this->conn = $db->getConnection();
    }

    /**
     * Get all garages
     * GET /api/garages
     */
    public function index() {
        RoleMiddleware::requireMinRole('Driver');

        $search = trim((string) ($_GET['q'] ?? ''));
        $city = trim((string) ($_GET['city'] ?? ''));
        $includeInactiveRequested = isset($_GET['include_inactive']) && filter_var($_GET['include_inactive'], FILTER_VALIDATE_BOOLEAN);
        $includeInactive = false;

        if ($includeInactiveRequested) {
            $currentUser = RoleMiddleware::getCurrentUser();
            $currentRole = $currentUser['role'] ?? '';

            if (!in_array($currentRole, ['Transportation Manager', 'Admin'], true)) {
                Response::forbidden('include_inactive is only available for Transportation Manager and Admin');
            }

            $includeInactive = true;
        }

        $where = [];
        $params = [];

        if (!$includeInactive) {
            $where[] = 'g.is_active = 1';
        }

        if ($search !== '') {
            $where[] = '(g.name LIKE ? OR g.address LIKE ? OR g.city LIKE ?)';
            $params[] = '%' . $search . '%';
            $params[] = '%' . $search . '%';
            $params[] = '%' . $search . '%';
        }

        if ($city !== '') {
            $where[] = 'g.city = ?';
            $params[] = $city;
        }

        $sql = 'SELECT g.id, g.name, g.address, g.city, g.latitude, g.longitude, g.phone, g.is_active FROM garages g';
        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY g.name ASC';

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        $garages = $stmt->fetchAll();

        Response::success([
            'garages' => $garages,
            'count' => count($garages),
        ]);
    }

    /**
     * Get single garage
     * GET /api/garages/:id
     */
    public function show() {
        RoleMiddleware::requireMinRole('Driver');

        $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
        if ($id <= 0) {
            Response::error('Garage ID required', 400);
        }

        $stmt = $this->conn->prepare('SELECT id, name, address, city, latitude, longitude, phone, is_active FROM garages WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $garage = $stmt->fetch();

        if (!$garage) {
            Response::error('Garage not found', 404);
        }

        Response::success(['garage' => $garage]);
    }

    /**
     * Create a garage
     * POST /api/garages
     */
    public function create() {
        RoleMiddleware::requireRole(['Transportation Manager', 'Admin']);

        $payload = json_decode(file_get_contents('php://input'), true) ?? [];

        $name = trim((string) ($payload['name'] ?? ''));
        $address = trim((string) ($payload['address'] ?? ''));
        $city = trim((string) ($payload['city'] ?? ''));
        $phone = trim((string) ($payload['phone'] ?? ''));

        if ($name === '' || strlen($name) > 255) {
            Response::error('name is required and must be 255 characters or fewer', 400);
        }

        if ($address === '' || strlen($address) > 500) {
            Response::error('address is required and must be 500 characters or fewer', 400);
        }

        if ($city !== '' && strlen($city) > 100) {
            Response::error('city must be 100 characters or fewer', 400);
        }

        if ($phone !== '' && strlen($phone) > 50) {
            Response::error('phone must be 50 characters or fewer', 400);
        }

        $latitude = $payload['latitude'] ?? null;
        $longitude = $payload['longitude'] ?? null;

        if ($latitude === '') {
            $latitude = null;
        }

        if ($longitude === '') {
            $longitude = null;
        }

        if (($latitude === null) xor ($longitude === null)) {
            Response::error('Both latitude and longitude are required when providing map coordinates', 400);
        }

        if ($latitude !== null) {
            if (!is_numeric($latitude)) {
                Response::error('latitude must be a valid number', 400);
            }

            $latitude = (float) $latitude;
            if ($latitude < -90 || $latitude > 90) {
                Response::error('latitude must be between -90 and 90', 400);
            }
        }

        if ($longitude !== null) {
            if (!is_numeric($longitude)) {
                Response::error('longitude must be a valid number', 400);
            }

            $longitude = (float) $longitude;
            if ($longitude < -180 || $longitude > 180) {
                Response::error('longitude must be between -180 and 180', 400);
            }
        }

        $isActive = 1;
        if (array_key_exists('is_active', $payload)) {
            $raw = $payload['is_active'];

            if (is_bool($raw)) {
                $isActive = $raw ? 1 : 0;
            } elseif (is_int($raw) || is_float($raw)) {
                if ((float) $raw === 1.0) {
                    $isActive = 1;
                } elseif ((float) $raw === 0.0) {
                    $isActive = 0;
                } else {
                    Response::error('is_active must be a boolean value', 400);
                }
            } else {
                $rawString = strtolower(trim((string) $raw));
                if (in_array($rawString, ['1', 'true', 'yes', 'on'], true)) {
                    $isActive = 1;
                } elseif (in_array($rawString, ['0', 'false', 'no', 'off'], true)) {
                    $isActive = 0;
                } else {
                    Response::error('is_active must be a boolean value', 400);
                }
            }
        }

        $dupStmt = $this->conn->prepare('SELECT id FROM garages WHERE LOWER(name) = LOWER(?) AND LOWER(address) = LOWER(?) LIMIT 1');
        $dupStmt->execute([$name, $address]);
        if ($dupStmt->fetch()) {
            Response::error('A garage with the same name and address already exists', 409);
        }

        $insert = $this->conn->prepare(
            'INSERT INTO garages (name, address, city, latitude, longitude, phone, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );

        $insert->execute([
            $name,
            $address,
            $city !== '' ? $city : null,
            $latitude,
            $longitude,
            $phone !== '' ? $phone : null,
            $isActive,
        ]);

        $garageId = (int) $this->conn->lastInsertId();
        $select = $this->conn->prepare('SELECT id, name, address, city, latitude, longitude, phone, is_active FROM garages WHERE id = ? LIMIT 1');
        $select->execute([$garageId]);
        $garage = $select->fetch();

        Response::success([
            'garage' => $garage,
        ], 'Garage created successfully', 201);
    }
}
