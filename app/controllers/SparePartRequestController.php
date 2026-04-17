<?php

require_once __DIR__ . '/../services/SparePartRequestService.php';
require_once __DIR__ . '/../models/Product.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../services/EventEmitter.php';
require_once __DIR__ . '/../events/DomainEvents.php';

/**
 * Spare Part Request Controller
 * Handles API endpoints for spare part requests
 * - Technical Officers create requests
 * - Inventory Managers view, approve, reject requests
 */
class SparePartRequestController {
    private $service;
    private $eventEmitter;
    private $productModel;

    public function __construct() {
        $this->service = new SparePartRequestService();
        $this->eventEmitter = new EventEmitter();
        $this->productModel = new Product();
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
                $this->eventEmitter->emit(
                    DomainEvents::SPARE_PART_REQUEST_CREATED,
                    [
                        'request_db_id' => (int) ($result['data']['id'] ?? 0),
                        'request_id' => $result['data']['request_id'] ?? null,
                        'fault_ticket_id' => (int) ($data['fault_ticket_id'] ?? 0),
                        'requested_by' => (int) ($data['requested_by'] ?? 0),
                    ],
                    [
                        'user_id' => $user['id'] ?? null,
                        'role' => $user['role'] ?? null,
                    ]
                );
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
                $this->eventEmitter->emit(
                    DomainEvents::SPARE_PART_REQUEST_APPROVED,
                    [
                        'request_db_id' => (int) $id,
                        'requested_by' => (int) ($result['data']['requested_by'] ?? 0),
                        'reviewed_by' => (int) ($reviewedBy ?? 0),
                    ],
                    [
                        'user_id' => $user['id'] ?? null,
                        'role' => $user['role'] ?? null,
                    ]
                );
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
                $this->eventEmitter->emit(
                    DomainEvents::SPARE_PART_REQUEST_REJECTED,
                    [
                        'request_db_id' => (int) $id,
                        'requested_by' => (int) ($result['data']['requested_by'] ?? 0),
                        'reviewed_by' => (int) ($reviewedBy ?? 0),
                    ],
                    [
                        'user_id' => $user['id'] ?? null,
                        'role' => $user['role'] ?? null,
                    ]
                );
                return Response::json($result);
            } else {
                return Response::json($result, 400);
            }
        } catch (Exception $e) {
            error_log("Error in SparePartRequestController::reject: " . $e->getMessage());
            return Response::json(['status' => 'error', 'message' => 'Failed to reject request'], 500);
        }
    }

    /**
     * POST /spare-part-requests/check-availability
     * Check availability of spare parts before creating a request
     * Request body: { "items": [{ "part_code": "SPR-001", "quantity": 5 }, ...] }
     * Response: { "items": [{ "part_code": "SPR-001", "status": "available|insufficient|not_found", "available_qty": X, "requested_qty": Y }, ...] }
     */
    public function checkAvailability() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);

            if (!$data || !isset($data['items']) || !is_array($data['items'])) {
                return Response::json(['status' => 'error', 'message' => 'Invalid request. Expected { "items": [...] }'], 400);
            }

            $results = [];
            foreach ($data['items'] as $item) {
                $partCode = $item['part_code'] ?? '';
                $requestedQty = isset($item['quantity']) ? (int)$item['quantity'] : 1;

                if (empty($partCode)) {
                    $results[] = [
                        'part_code' => $partCode,
                        'status' => 'invalid',
                        'available_qty' => 0,
                        'requested_qty' => $requestedQty,
                        'message' => 'Part code is required'
                    ];
                    continue;
                }

                // Look up the spare part in catalog
                $product = $this->productModel->findOne(['sparepart_id' => $partCode, 'is_active' => 1]);

                if (!$product) {
                    $results[] = [
                        'part_code' => $partCode,
                        'part_name' => null,
                        'status' => 'not_found',
                        'available_qty' => 0,
                        'requested_qty' => $requestedQty,
                        'message' => 'Spare part not found in catalog'
                    ];
                } else {
                    $availableQty = (int)$product['quantity'];
                    $lowStockThreshold = (int)($product['low_stock_threshold'] ?? $product['reorder_level'] ?? 10);
                    $status = 'available';
                    $message = "In stock ({$availableQty} available)";

                    if ($availableQty === 0) {
                        $status = 'out_of_stock';
                        $message = 'Out of stock';
                    } elseif ($availableQty < $requestedQty) {
                        $status = 'insufficient';
                        $message = "Low stock ({$availableQty} available, {$requestedQty} requested)";
                    }

                    $results[] = [
                        'part_code' => $partCode,
                        'part_name' => $product['name'],
                        'status' => $status,
                        'available_qty' => $availableQty,
                        'requested_qty' => $requestedQty,
                        'low_stock_threshold' => $lowStockThreshold,
                        'reorder_level' => $lowStockThreshold,
                        'message' => $message
                    ];
                }
            }

            return Response::json([
                'status' => 'success',
                'data' => ['items' => $results]
            ]);
        } catch (Exception $e) {
            error_log("Error in SparePartRequestController::checkAvailability: " . $e->getMessage());
            return Response::json(['status' => 'error', 'message' => 'Failed to check availability'], 500);
        }
    }
}
