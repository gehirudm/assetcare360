<?php

require_once __DIR__ . '/../models/SparePartRequest.php';
require_once __DIR__ . '/../models/SparePartRequestItem.php';
require_once __DIR__ . '/../models/FaultTicket.php';
require_once __DIR__ . '/../models/ServiceTicket.php';
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
    private $serviceTicketModel;
    private $workflowService;
    private $productModel;

    public function __construct() {
        $this->requestModel = new SparePartRequest();
        $this->itemModel = new SparePartRequestItem();
        $this->faultTicketModel = new FaultTicket();
        $this->serviceTicketModel = new ServiceTicket();
        $this->workflowService = new FaultTicketWorkflowService();
        $this->productModel = new Product();
    }

    /**
     * Create a new spare part request with items
     */
    public function create($data) {
        $faultTicketId = isset($data['fault_ticket_id']) ? (int) $data['fault_ticket_id'] : 0;
        $serviceTicketId = isset($data['service_ticket_id']) ? (int) $data['service_ticket_id'] : 0;

        if ($faultTicketId <= 0 && $serviceTicketId <= 0) {
            return ['status' => 'error', 'message' => 'Either fault_ticket_id or service_ticket_id is required'];
        }

        if ($faultTicketId > 0 && $serviceTicketId > 0) {
            return ['status' => 'error', 'message' => 'Provide only one ticket context per spare part request'];
        }

        $requesterId = isset($data['requested_by']) ? (int) $data['requested_by'] : 0;
        if ($requesterId <= 0) {
            return ['status' => 'error', 'message' => 'Requested by user is required'];
        }

        if (empty($data['items']) || !is_array($data['items']) || count($data['items']) === 0) {
            return ['status' => 'error', 'message' => 'At least one spare part item is required'];
        }

        $requestContext = 'fault_ticket';
        $ticketIdFormatted = $data['ticket_id_formatted'] ?? null;

        if ($faultTicketId > 0) {
            $ticket = $this->faultTicketModel->findById($faultTicketId);
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

            if (empty($ticketIdFormatted)) {
                $ticketIdFormatted = $ticket['ticket_id'] ?? null;
            }
        } else {
            $requestContext = 'service_ticket';
            $serviceTicket = $this->serviceTicketModel->getServiceTicketById($serviceTicketId);
            if (!$serviceTicket) {
                return ['status' => 'error', 'message' => 'Service ticket not found'];
            }

            $allowedServiceStatuses = [
                ServiceTicket::STATUS_PENDING_ASSIGNMENT,
                ServiceTicket::STATUS_ASSIGNED,
            ];

            if (!in_array($serviceTicket['status'], $allowedServiceStatuses, true)) {
                return [
                    'status' => 'error',
                    'message' => 'Spare part requests for service tickets can only be submitted before service starts. Current status: ' . $serviceTicket['status']
                ];
            }

            if (empty($ticketIdFormatted)) {
                $ticketIdFormatted = $serviceTicket['service_ticket_id'] ?? null;
            }
        }

        try {
            $db = Database::getInstance()->getConnection();
            $db->beginTransaction();

            // Generate request ID
            $requestId = $this->requestModel->generateRequestId();

            // Create the request record
            $requestData = [
                'request_id' => $requestId,
                'fault_ticket_id' => $faultTicketId > 0 ? $faultTicketId : null,
                'service_ticket_id' => $serviceTicketId > 0 ? $serviceTicketId : null,
                'ticket_id_formatted' => $ticketIdFormatted,
                'requested_by' => $requesterId,
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

            if ($faultTicketId > 0) {
                $this->workflowService->syncTicketStatus($faultTicketId);
            }

            return [
                'status' => 'success',
                'message' => 'Spare part request created successfully',
                'data' => [
                    'id' => $id,
                    'request_id' => $requestId,
                    'fault_ticket_id' => $faultTicketId > 0 ? $faultTicketId : null,
                    'service_ticket_id' => $serviceTicketId > 0 ? $serviceTicketId : null,
                    'request_context' => $requestContext,
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
     * Get requests for a specific service ticket
     */
    public function getByServiceTicket($serviceTicketId) {
        try {
            $requests = $this->requestModel->getByServiceTicket($serviceTicketId);

            foreach ($requests as &$request) {
                $request['items'] = $this->itemModel->getByRequestId($request['id']);
            }

            return [
                'status' => 'success',
                'data' => $requests
            ];
        } catch (Exception $e) {
            error_log("Error fetching requests for service ticket: " . $e->getMessage());
            return ['status' => 'error', 'message' => 'Failed to fetch requests for this service ticket'];
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

            // Update request status to Approved
            $this->requestModel->update($id, [
                'status' => SparePartRequest::STATUS_APPROVED,
                'reviewed_by' => $reviewedBy,
                'review_notes' => $notes,
                'reviewed_at' => date('Y-m-d H:i:s')
            ]);

            // Deduct stock for each approved item and update last_issue_date
            $items = $this->itemModel->getByRequestId($id);
            foreach ($items as $item) {
                if (!empty($item['part_code'])) {
                    $product = $this->productModel->findOne([
                        'sparepart_id' => $item['part_code'],
                        'is_active'    => 1
                    ]);
                    if ($product) {
                        $this->productModel->updateQuantity(
                            $product['id'],
                            (int)$item['quantity'],
                            'subtract'
                        );
                        $this->productModel->update($product['id'], [
                            'last_issue_date' => date('Y-m-d')
                        ]);
                    }
                }
            }

            $faultTicketId = isset($request['fault_ticket_id']) ? (int) $request['fault_ticket_id'] : 0;
            if ($faultTicketId > 0) {
                $this->workflowService->syncTicketStatus($faultTicketId);
            }

            $db->commit();

            $updated = $this->requestModel->getRequestById($id);

            return [
                'status' => 'success',
                'message' => 'Spare part request approved successfully.',
                'data' => [
                    'id' => (int) $id,
                    'request_id' => $updated['request_id'] ?? null,
                    'fault_ticket_id' => isset($updated['fault_ticket_id']) ? (int) $updated['fault_ticket_id'] : null,
                    'service_ticket_id' => isset($updated['service_ticket_id']) ? (int) $updated['service_ticket_id'] : null,
                    'request_context' => !empty($updated['service_ticket_id']) ? 'service_ticket' : 'fault_ticket',
                    'requested_by' => isset($updated['requested_by']) ? (int) $updated['requested_by'] : null,
                    'status' => $updated['status'] ?? SparePartRequest::STATUS_APPROVED,
                ]
            ];
        } catch (Exception $e) {
            if (isset($db)) {
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

            $faultTicketId = isset($request['fault_ticket_id']) ? (int) $request['fault_ticket_id'] : 0;
            if ($faultTicketId > 0) {
                $this->workflowService->syncTicketStatus($faultTicketId);
            }

            $updated = $this->requestModel->getRequestById($id);

            return [
                'status' => 'success',
                'message' => 'Spare part request rejected.',
                'data' => [
                    'id' => (int) $id,
                    'request_id' => $updated['request_id'] ?? null,
                    'fault_ticket_id' => isset($updated['fault_ticket_id']) ? (int) $updated['fault_ticket_id'] : null,
                    'service_ticket_id' => isset($updated['service_ticket_id']) ? (int) $updated['service_ticket_id'] : null,
                    'request_context' => !empty($updated['service_ticket_id']) ? 'service_ticket' : 'fault_ticket',
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
