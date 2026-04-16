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
        $includeInactive = isset($_GET['include_inactive']) && filter_var($_GET['include_inactive'], FILTER_VALIDATE_BOOLEAN);

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
}
