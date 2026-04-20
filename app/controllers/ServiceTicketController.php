<?php

require_once __DIR__ . '/../services/ServiceTicketService.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';

/**
 * Service ticket HTTP endpoints.
 */
class ServiceTicketController {
    private $serviceTicketService;

    public function __construct() {
        $this->serviceTicketService = new ServiceTicketService();
    }

    private function getAuthenticatedUser() {
        return RoleMiddleware::getCurrentUser();
    }

    public function technicians() {
        try {
            RoleMiddleware::requireRole(['Maintenance Manager', 'Supervisor', 'Admin']);

            $technicians = $this->serviceTicketService->getTechnicians();
            Response::success(['users' => $technicians]);
        } catch (Exception $e) {
            Response::error('Failed to load technicians: ' . $e->getMessage(), 500);
        }
    }

    public function stats() {
        try {
            $user = $this->getAuthenticatedUser();
            if (!$user) {
                Response::unauthorized('Authentication required');
            }

            $filters = [];
            if (($user['role'] ?? '') === 'Technical Officer') {
                $filters['assigned_to'] = (int) ($user['id'] ?? 0);
                $filters['include_unassigned'] = true;
            }

            if (isset($_GET['reported_by']) && is_numeric($_GET['reported_by'])) {
                $filters['reported_by'] = (int) $_GET['reported_by'];
            }

            $result = $this->serviceTicketService->getAll($filters, $user);
            Response::success($result['counts'] ?? []);
        } catch (Exception $e) {
            Response::error('Failed to load service ticket stats: ' . $e->getMessage(), 500);
        }
    }

    public function index() {
        try {
            $user = $this->getAuthenticatedUser();
            if (!$user) {
                Response::unauthorized('Authentication required');
            }

            $filters = [];
            if (isset($_GET['status'])) {
                $filters['status'] = trim((string) $_GET['status']);
            }
            if (isset($_GET['asset_type'])) {
                $filters['asset_type'] = trim((string) $_GET['asset_type']);
            }
            if (isset($_GET['assigned_to']) && is_numeric($_GET['assigned_to'])) {
                $filters['assigned_to'] = (int) $_GET['assigned_to'];
            }
            if (isset($_GET['reported_by']) && is_numeric($_GET['reported_by'])) {
                $filters['reported_by'] = (int) $_GET['reported_by'];
            }
            if (isset($_GET['search'])) {
                $filters['search'] = trim((string) $_GET['search']);
            }
            if (isset($_GET['sort_by'])) {
                $filters['sort_by'] = trim((string) $_GET['sort_by']);
            }
            if (isset($_GET['sort_dir'])) {
                $filters['sort_dir'] = trim((string) $_GET['sort_dir']);
            }

            $result = $this->serviceTicketService->getAll($filters, $user);
            Response::success($result);
        } catch (Exception $e) {
            Response::error('Failed to load service tickets: ' . $e->getMessage(), 500);
        }
    }

    public function show() {
        try {
            $id = $_GET['id'] ?? null;
            if (!$id) {
                Response::error('Service ticket ID is required', 400);
            }

            $user = $this->getAuthenticatedUser();
            if (!$user) {
                Response::unauthorized('Authentication required');
            }

            $result = $this->serviceTicketService->getById($id, $user);
            if (!$result['success']) {
                Response::error($result['message'], (int) ($result['status'] ?? 400), $result['errors'] ?? null);
            }

            Response::success($result['data']);
        } catch (Exception $e) {
            Response::error('Failed to load service ticket: ' . $e->getMessage(), 500);
        }
    }

    public function create() {
        try {
            RoleMiddleware::requireRole(['Maintenance Manager', 'Admin']);

            $user = $this->getAuthenticatedUser();
            if (!$user) {
                Response::unauthorized('Authentication required');
            }

            $data = json_decode(file_get_contents('php://input'), true);
            if (!is_array($data)) {
                Response::error('Invalid JSON payload', 400);
            }

            $result = $this->serviceTicketService->create($data, $user);
            if (!$result['success']) {
                Response::error($result['message'], (int) ($result['status'] ?? 400), $result['errors'] ?? null);
            }

            Response::success($result['data'], $result['message'] ?? 'Service ticket created', (int) ($result['status'] ?? 201));
        } catch (Exception $e) {
            Response::error('Failed to create service ticket: ' . $e->getMessage(), 500);
        }
    }

    public function update() {
        try {
            RoleMiddleware::requireRole(['Maintenance Manager', 'Admin']);

            $id = $_GET['id'] ?? null;
            if (!$id) {
                Response::error('Service ticket ID is required', 400);
            }

            $data = json_decode(file_get_contents('php://input'), true);
            if (!is_array($data)) {
                Response::error('Invalid JSON payload', 400);
            }

            $user = $this->getAuthenticatedUser();
            if (!$user) {
                Response::unauthorized('Authentication required');
            }

            $result = $this->serviceTicketService->update($id, $data, $user);
            if (!$result['success']) {
                Response::error($result['message'], (int) ($result['status'] ?? 400), $result['errors'] ?? null);
            }

            Response::success($result['data'], $result['message'] ?? 'Service ticket updated');
        } catch (Exception $e) {
            Response::error('Failed to update service ticket: ' . $e->getMessage(), 500);
        }
    }

    public function start() {
        try {
            RoleMiddleware::requireRole(['Technical Officer', 'Maintenance Manager', 'Admin']);

            $id = $_GET['id'] ?? null;
            if (!$id) {
                Response::error('Service ticket ID is required', 400);
            }

            $user = $this->getAuthenticatedUser();
            if (!$user) {
                Response::unauthorized('Authentication required');
            }

            $payload = [];
            $rawBody = file_get_contents('php://input');
            if ($rawBody !== false && trim($rawBody) !== '') {
                $decodedBody = json_decode($rawBody, true);
                if (!is_array($decodedBody)) {
                    Response::error('Invalid JSON payload', 400);
                }
                $payload = $decodedBody;
            }

            $result = $this->serviceTicketService->start($id, $user, $payload);
            if (!$result['success']) {
                Response::error($result['message'], (int) ($result['status'] ?? 400), $result['errors'] ?? null);
            }

            Response::success($result['data'], $result['message'] ?? 'Service ticket started');
        } catch (Exception $e) {
            Response::error('Failed to start service ticket: ' . $e->getMessage(), 500);
        }
    }

    public function complete() {
        try {
            RoleMiddleware::requireRole(['Technical Officer', 'Maintenance Manager', 'Admin']);

            $id = $_GET['id'] ?? null;
            if (!$id) {
                Response::error('Service ticket ID is required', 400);
            }

            $data = json_decode(file_get_contents('php://input'), true);
            if (!is_array($data)) {
                Response::error('Invalid JSON payload', 400);
            }

            $user = $this->getAuthenticatedUser();
            if (!$user) {
                Response::unauthorized('Authentication required');
            }

            $result = $this->serviceTicketService->complete($id, $data, $user);
            if (!$result['success']) {
                Response::error($result['message'], (int) ($result['status'] ?? 400), $result['errors'] ?? null);
            }

            Response::success($result['data'], $result['message'] ?? 'Service ticket completed');
        } catch (Exception $e) {
            Response::error('Failed to complete service ticket: ' . $e->getMessage(), 500);
        }
    }

    public function updateWarranty() {
        try {
            RoleMiddleware::requireRole(['Maintenance Manager', 'Admin']);

            $assetType = $_GET['assetType'] ?? null;
            $assetId = $_GET['assetId'] ?? null;

            if (!$assetType || !$assetId) {
                Response::error('Asset type and asset ID are required', 400);
            }

            $data = json_decode(file_get_contents('php://input'), true);
            if (!is_array($data)) {
                Response::error('Invalid JSON payload', 400);
            }

            $user = $this->getAuthenticatedUser();
            if (!$user) {
                Response::unauthorized('Authentication required');
            }

            $result = $this->serviceTicketService->updateAssetWarranty(
                (string) $assetType,
                (int) $assetId,
                $data,
                $user
            );

            if (!$result['success']) {
                Response::error($result['message'], (int) ($result['status'] ?? 400), $result['errors'] ?? null);
            }

            Response::success($result['data'], 'Warranty status updated successfully');
        } catch (Exception $e) {
            Response::error('Failed to update warranty status: ' . $e->getMessage(), 500);
        }
    }
}
