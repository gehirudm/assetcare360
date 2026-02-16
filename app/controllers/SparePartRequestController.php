<?php

require_once __DIR__ . '/../services/SparePartRequestService.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';

/**
 * Spare Part Request Controller
 * Handles API endpoints for spare part requests
 * - Technical Officers create requests
 * - Inventory Managers view, approve, reject requests
 */
class SparePartRequestController {
    private $service;

    public function __construct() {
        $this->service = new SparePartRequestService();
    }

    /**
     * Get authenticated user
     */
    private function getAuthenticatedUser() {
        return RoleMiddleware::getCurrentUser();
    }

    /**
     * GET /spare-part-requests
     * List all spare part requests (with optional filters)
     */
    public function index() {
        try {
            $filters = [];

            if (isset($_GET['status'])) {
                $filters['status'] = $_GET['status'];
            }
            if (isset($_GET['requested_by'])) {
                $filters['requested_by'] = $_GET['requested_by'];
            }
            if (isset($_GET['fault_ticket_id'])) {
                $filters['fault_ticket_id'] = $_GET['fault_ticket_id'];
            }

            $result = $this->service->getAll($filters);
            return Response::json($result);
        } catch (Exception $e) {
            error_log("Error in SparePartRequestController::index: " . $e->getMessage());
            return Response::json(['status' => 'error', 'message' => 'Failed to fetch spare part requests'], 500);
        }
    }

    /**
     * GET /spare-part-requests/:id
     * Get a single spare part request with items
     */
    public function show() {
        try {
            $id = $_GET['id'] ?? null;
            if (!$id) {
                return Response::json(['status' => 'error', 'message' => 'Request ID is required'], 400);
            }

            $result = $this->service->getById($id);
            if ($result['status'] === 'error') {
                return Response::json($result, 404);
            }
            return Response::json($result);
        } catch (Exception $e) {
            error_log("Error in SparePartRequestController::show: " . $e->getMessage());
            return Response::json(['status' => 'error', 'message' => 'Failed to fetch request'], 500);
        }
    }

    /**
     * GET /spare-part-requests/ticket/:id
     * Get requests for a specific fault ticket
     */
    public function getByTicket() {
        try {
            $ticketId = $_GET['id'] ?? null;
            if (!$ticketId) {
                return Response::json(['status' => 'error', 'message' => 'Fault ticket ID is required'], 400);
            }

            $result = $this->service->getByFaultTicket($ticketId);
            return Response::json($result);
        } catch (Exception $e) {
            error_log("Error in SparePartRequestController::getByTicket: " . $e->getMessage());
            return Response::json(['status' => 'error', 'message' => 'Failed to fetch requests'], 500);
        }
    }

    /**
     * GET /spare-part-requests/stats
     * Get request counts by status
     */
    public function stats() {
        try {
            $result = $this->service->getStats();
            return Response::json($result);
        } catch (Exception $e) {
            error_log("Error in SparePartRequestController::stats: " . $e->getMessage());
            return Response::json(['status' => 'error', 'message' => 'Failed to fetch stats'], 500);
        }
    }

    /**
     * POST /spare-part-requests
     * Create a new spare part request (Technical Officer)
     */
    public function create() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);

            if (!$data) {
                return Response::json(['status' => 'error', 'message' => 'Invalid JSON data'], 400);
            }

            // Try to get authenticated user
            $user = $this->getAuthenticatedUser();
            if ($user) {
                $data['requested_by'] = $user['id'];
            }

            $result = $this->service->create($data);

            if ($result['status'] === 'success') {
                return Response::json($result, 201);
            } else {
                return Response::json($result, 400);
            }
        } catch (Exception $e) {
            error_log("Error in SparePartRequestController::create: " . $e->getMessage());
            return Response::json(['status' => 'error', 'message' => 'Failed to create request: ' . $e->getMessage()], 500);
        }
    }

    /**
     * POST /spare-part-requests/:id/approve
     * Approve a spare part request (Inventory Manager)
     */
    public function approve() {
        try {
            $id = $_GET['id'] ?? null;
            if (!$id) {
                return Response::json(['status' => 'error', 'message' => 'Request ID is required'], 400);
            }

            $data = json_decode(file_get_contents('php://input'), true) ?? [];

            $user = $this->getAuthenticatedUser();
            $reviewedBy = $user ? $user['id'] : ($data['reviewed_by'] ?? null);
            $notes = $data['notes'] ?? $data['review_notes'] ?? null;

            $result = $this->service->approve($id, $reviewedBy, $notes);

            if ($result['status'] === 'success') {
                return Response::json($result);
            } else {
                return Response::json($result, 400);
            }
        } catch (Exception $e) {
            error_log("Error in SparePartRequestController::approve: " . $e->getMessage());
            return Response::json(['status' => 'error', 'message' => 'Failed to approve request'], 500);
        }
    }

    /**
     * POST /spare-part-requests/:id/reject
     * Reject a spare part request (Inventory Manager)
     */
    public function reject() {
        try {
            $id = $_GET['id'] ?? null;
            if (!$id) {
                return Response::json(['status' => 'error', 'message' => 'Request ID is required'], 400);
            }

            $data = json_decode(file_get_contents('php://input'), true) ?? [];

            $user = $this->getAuthenticatedUser();
            $reviewedBy = $user ? $user['id'] : ($data['reviewed_by'] ?? null);
            $notes = $data['notes'] ?? $data['review_notes'] ?? null;

            $result = $this->service->reject($id, $reviewedBy, $notes);

            if ($result['status'] === 'success') {
                return Response::json($result);
            } else {
                return Response::json($result, 400);
            }
        } catch (Exception $e) {
            error_log("Error in SparePartRequestController::reject: " . $e->getMessage());
            return Response::json(['status' => 'error', 'message' => 'Failed to reject request'], 500);
        }
    }
}
