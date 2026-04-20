<?php

require_once __DIR__ . '/../models/SparePartRequest.php';
require_once __DIR__ . '/../models/SparePartRequestItem.php';
require_once __DIR__ . '/../models/FaultTicket.php';
require_once __DIR__ . '/../models/Product.php';
require_once __DIR__ . '/FaultTicketWorkflowService.php';
require_once __DIR__ . '/../../config/Database.php';

/**
 * Spare Part Request Service
 * Business logic for creating, listing, approving/rejecting spare part requests.
 */
class SparePartRequestService {
    private $requestModel;
    private $itemModel;
    private $faultTicketModel;
    private $workflowService;
    private $productModel;

    public function __construct() {
        $this->requestModel = new SparePartRequest();
        $this->itemModel = new SparePartRequestItem();
        $this->faultTicketModel = new FaultTicket();
        $this->workflowService = new FaultTicketWorkflowService();
        $this->productModel = new Product();
    }

    /**
     * Create a new spare part request with items
     */
    public function create($data) {
        // Validate required fields
        if (empty($data['fault_ticket_id'])) {
            return ['status' => 'error', 'message' => 'Fault ticket ID is required'];
        }
        if (empty($data['items']) || !is_array($data['items']) || count($data['items']) === 0) {
            return ['status' => 'error', 'message' => 'At least one spare part item is required'];
        }

        $ticket = $this->faultTicketModel->findById($data['fault_ticket_id']);
        if (!$ticket) {
            return ['status' => 'error', 'message' => 'Fault ticket not found'];
        }

        $allowedStatuses = [
            FaultTicket::STATUS_OPEN,
            FaultTicket::STATUS_ASSIGNED,
            FaultTicket::STATUS_WAITING_BUDGET,
            FaultTicket::STATUS_WAITING_PARTS,
            FaultTicket::STATUS_PARTS_APPROVED,
        ];

        if (!in_array($ticket['status'], $allowedStatuses, true)) {
            return [
                'status' => 'error',
                'message' => 'Spare part requests can only be submitted before work starts. Current status: ' . $ticket['status']
            ];
        }

        try {
            $db = Database::getInstance()->getConnection();
            $db->beginTransaction();

            // Generate request ID
            $requestId = $this->requestModel->generateRequestId();

            // Create the request record
            $requestData = [
                'request_id' => $requestId,
                'fault_ticket_id' => $data['fault_ticket_id'],
                'ticket_id_formatted' => $data['ticket_id_formatted'] ?? null,
                'requested_by' => $data['requested_by'] ?? null,
                'equipment_name' => $data['equipment_name'] ?? null,
                'location' => $data['location'] ?? null,
                'priority' => $data['priority'] ?? 'Medium',
                'additional_notes' => $data['additional_notes'] ?? null,
                'status' => SparePartRequest::STATUS_PENDING
            ];

            $id = $this->requestModel->create($requestData);

            if (!$id) {
                $db->rollBack();
                return ['status' => 'error', 'message' => 'Failed to create spare part request'];
            }

            // Create the items
            $this->itemModel->createBulk($id, $data['items']);

            $db->commit();

            $this->workflowService->syncTicketStatus((int) $data['fault_ticket_id']);

            return [
                'status' => 'success',
                'message' => 'Spare part request created successfully',
                'data' => [
                    'id' => $id,
                    'request_id' => $requestId
                ]
            ];
        } catch (Exception $e) {
            if (isset($db)) {
                $db->rollBack();
            }
            error_log("Error creating spare part request: " . $e->getMessage());
            return ['status' => 'error', 'message' => 'Failed to create spare part request: ' . $e->getMessage()];
        }
    }

    /**
     * Get all requests, optionally filtered
     */
    public function getAll($filters = []) {
        try {
            $requests = $this->requestModel->getAllRequests($filters);

            // Attach items to each request
            foreach ($requests as &$request) {
                $request['items'] = $this->itemModel->getByRequestId($request['id']);
            }

            return [
                'status' => 'success',
                'data' => $requests
            ];
        } catch (Exception $e) {
            error_log("Error fetching spare part requests: " . $e->getMessage());
            return ['status' => 'error', 'message' => 'Failed to fetch spare part requests'];
        }
    }

    /**
     * Get a single request by ID
     */
    public function getById($id) {
        try {
            $request = $this->requestModel->getRequestById($id);
            if (!$request) {
                return ['status' => 'error', 'message' => 'Spare part request not found'];
            }

            $request['items'] = $this->itemModel->getByRequestId($id);

            return [
                'status' => 'success',
                'data' => $request
            ];
        } catch (Exception $e) {
            error_log("Error fetching spare part request: " . $e->getMessage());
            return ['status' => 'error', 'message' => 'Failed to fetch spare part request'];
        }
    }

    /**
     * Get requests for a specific fault ticket
     */
    public function getByFaultTicket($faultTicketId) {
        try {
            $requests = $this->requestModel->getByFaultTicket($faultTicketId);

            foreach ($requests as &$request) {
                $request['items'] = $this->itemModel->getByRequestId($request['id']);
            }

            return [
                'status' => 'success',
                'data' => $requests
            ];
        } catch (Exception $e) {
            error_log("Error fetching requests for ticket: " . $e->getMessage());
            return ['status' => 'error', 'message' => 'Failed to fetch requests for this ticket'];
        }
    }

    /**
     * Approve a spare part request (by Inventory Manager)
     */
    public function approve($id, $reviewedBy, $notes = null) {
        try {
            $request = $this->requestModel->getRequestById($id);
            if (!$request) {
                return ['status' => 'error', 'message' => 'Spare part request not found'];
            }

            if ($request['status'] !== SparePartRequest::STATUS_PENDING) {
                return ['status' => 'error', 'message' => 'Only pending requests can be approved'];
            }

            $db = Database::getInstance()->getConnection();
            $db->beginTransaction();

            $items = $this->itemModel->getByRequestId($id);
            $stockValidation = $this->validateApprovalStockAvailability($db, $items);

            if (!empty($stockValidation['unavailable_items'])) {
                $db->rollBack();
                return [
                    'status' => 'error',
                    'message' => 'Cannot approve request. Insufficient stock for one or more requested spare parts.',
                    'data' => [
                        'unavailable_items' => $stockValidation['unavailable_items']
                    ]
                ];
            }

            // Update request status to Approved
            $this->requestModel->update($id, [
                'status' => SparePartRequest::STATUS_APPROVED,
                'reviewed_by' => $reviewedBy,
                'review_notes' => $notes,
                'reviewed_at' => date('Y-m-d H:i:s')
            ]);

            // Deduct stock once per part code after validated availability.
            $deductionStmt = $db->prepare('UPDATE `spareparts` SET quantity = quantity - ?, last_issue_date = ? WHERE id = ?');
            $issueDate = date('Y-m-d');

            foreach ($stockValidation['deductions'] as $deduction) {
                $deductionStmt->execute([
                    $deduction['requested_qty'],
                    $issueDate,
                    $deduction['product_id']
                ]);
            }

            $this->workflowService->syncTicketStatus((int) $request['fault_ticket_id']);

            $db->commit();

            $updated = $this->requestModel->getRequestById($id);

            return [
                'status' => 'success',
                'message' => 'Spare part request approved successfully.',
                'data' => [
                    'id' => (int) $id,
                    'request_id' => $updated['request_id'] ?? null,
                    'fault_ticket_id' => isset($updated['fault_ticket_id']) ? (int) $updated['fault_ticket_id'] : null,
                    'requested_by' => isset($updated['requested_by']) ? (int) $updated['requested_by'] : null,
                    'status' => $updated['status'] ?? SparePartRequest::STATUS_APPROVED,
                ]
            ];
        } catch (Exception $e) {
            if (isset($db) && $db->inTransaction()) {
                $db->rollBack();
            }
            error_log("Error approving spare part request: " . $e->getMessage());
            return ['status' => 'error', 'message' => 'Failed to approve request: ' . $e->getMessage()];
        }
    }

    /**
     * Reject a spare part request (by Inventory Manager)
     */
    public function reject($id, $reviewedBy, $notes = null) {
        try {
            $request = $this->requestModel->getRequestById($id);
            if (!$request) {
                return ['status' => 'error', 'message' => 'Spare part request not found'];
            }

            if ($request['status'] !== SparePartRequest::STATUS_PENDING) {
                return ['status' => 'error', 'message' => 'Only pending requests can be rejected'];
            }

            $this->requestModel->update($id, [
                'status' => SparePartRequest::STATUS_REJECTED,
                'reviewed_by' => $reviewedBy,
                'review_notes' => $notes,
                'reviewed_at' => date('Y-m-d H:i:s')
            ]);

            $this->workflowService->syncTicketStatus((int) $request['fault_ticket_id']);

            $updated = $this->requestModel->getRequestById($id);

            return [
                'status' => 'success',
                'message' => 'Spare part request rejected.',
                'data' => [
                    'id' => (int) $id,
                    'request_id' => $updated['request_id'] ?? null,
                    'fault_ticket_id' => isset($updated['fault_ticket_id']) ? (int) $updated['fault_ticket_id'] : null,
                    'requested_by' => isset($updated['requested_by']) ? (int) $updated['requested_by'] : null,
                    'status' => $updated['status'] ?? SparePartRequest::STATUS_REJECTED,
                ]
            ];
        } catch (Exception $e) {
            error_log("Error rejecting spare part request: " . $e->getMessage());
            return ['status' => 'error', 'message' => 'Failed to reject request: ' . $e->getMessage()];
        }
    }

    /**
     * Validate and lock stock rows before approving a request.
     * Returns stock deductions and unavailable item list.
     */
    private function validateApprovalStockAvailability($db, $items) {
        $requestedByCode = [];
        $unavailableItems = [];

        foreach ($items as $item) {
            $partCode = trim((string) ($item['part_code'] ?? ''));
            $partName = $item['part_name'] ?? $partCode;
            $requestedQty = isset($item['quantity']) ? (int) $item['quantity'] : 1;
            if ($requestedQty < 1) {
                $requestedQty = 1;
            }

            if ($partCode === '') {
                $unavailableItems[] = [
                    'part_code' => '',
                    'part_name' => $partName,
                    'status' => 'invalid',
                    'available_qty' => 0,
                    'requested_qty' => $requestedQty,
                    'message' => 'Part code is missing in the request item.'
                ];
                continue;
            }

            if (!isset($requestedByCode[$partCode])) {
                $requestedByCode[$partCode] = [
                    'part_code' => $partCode,
                    'part_name' => $partName,
                    'requested_qty' => 0
                ];
            }

            $requestedByCode[$partCode]['requested_qty'] += $requestedQty;
        }

        $deductions = [];
        $lookupStmt = $db->prepare('SELECT id, name, quantity FROM `spareparts` WHERE sparepart_id = ? AND is_active = 1 LIMIT 1 FOR UPDATE');

        foreach ($requestedByCode as $partCode => $requestedItem) {
            $lookupStmt->execute([$partCode]);
            $product = $lookupStmt->fetch(PDO::FETCH_ASSOC);

            if (!$product) {
                $unavailableItems[] = [
                    'part_code' => $partCode,
                    'part_name' => $requestedItem['part_name'],
                    'status' => 'not_found',
                    'available_qty' => 0,
                    'requested_qty' => (int) $requestedItem['requested_qty'],
                    'message' => 'Spare part not found in catalog.'
                ];
                continue;
            }

            $availableQty = (int) $product['quantity'];
            $requestedQty = (int) $requestedItem['requested_qty'];

            if ($availableQty < $requestedQty) {
                $status = $availableQty === 0 ? 'out_of_stock' : 'insufficient';
                $message = $availableQty === 0
                    ? 'Out of stock.'
                    : "Insufficient stock ({$availableQty} available, {$requestedQty} requested).";

                $unavailableItems[] = [
                    'part_code' => $partCode,
                    'part_name' => $product['name'] ?? $requestedItem['part_name'],
                    'status' => $status,
                    'available_qty' => $availableQty,
                    'requested_qty' => $requestedQty,
                    'message' => $message
                ];
                continue;
            }

            $deductions[] = [
                'product_id' => (int) $product['id'],
                'part_code' => $partCode,
                'requested_qty' => $requestedQty
            ];
        }

        return [
            'deductions' => $deductions,
            'unavailable_items' => $unavailableItems
        ];
    }

    /**
     * Get counts by status for dashboard
     */
    public function getStats() {
        try {
            $counts = $this->requestModel->countByStatus();
            return [
                'status' => 'success',
                'data' => $counts
            ];
        } catch (Exception $e) {
            error_log("Error fetching spare part request stats: " . $e->getMessage());
            return ['status' => 'error', 'message' => 'Failed to fetch stats'];
        }
    }
}
