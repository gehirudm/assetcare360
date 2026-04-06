<?php

require_once __DIR__ . '/../models/SparePartRequest.php';
require_once __DIR__ . '/../models/SparePartRequestItem.php';
require_once __DIR__ . '/../models/FaultTicket.php';
require_once __DIR__ . '/../models/Product.php';
require_once __DIR__ . '/../models/SparepartUsage.php';
require_once __DIR__ . '/../../config/Database.php';

/**
 * Spare Part Request Service
 * Business logic for creating, listing, approving/rejecting spare part requests.
 */
class SparePartRequestService {
    private $requestModel;
    private $itemModel;
    private $faultTicketModel;
    private $productModel;
    private $usageModel;

    public function __construct() {
        $this->requestModel = new SparePartRequest();
        $this->itemModel    = new SparePartRequestItem();
        $this->faultTicketModel = new FaultTicket();
        $this->productModel = new Product();
        $this->usageModel   = new SparepartUsage();
    }

    // ---------------------------------------------------------------
    // Stock helpers
    // ---------------------------------------------------------------

    /**
     * Try to find the matching sparepart record for a request item.
     * Matching order: sparepart_id = part_code  →  sku = part_code  →  name LIKE part_name
     */
    private function findSparepart($partCode, $partName) {
        if ($partCode) {
            // 1. Direct sparepart_id match
            $p = $this->productModel->findOne(['sparepart_id' => $partCode, 'is_active' => 1]);
            if ($p) return $p;

            // 2. SKU match
            $p = $this->productModel->findOne(['sku' => $partCode, 'is_active' => 1]);
            if ($p) return $p;
        }

        if ($partName) {
            // 3. Name-based match (strip code suffix like " - BP-001")
            $cleanName = trim(preg_replace('/\s*-\s*[A-Z0-9-]+$/', '', $partName));
            $db  = Database::getInstance()->getConnection();
            $sql = "SELECT * FROM spareparts WHERE is_active = 1 AND name LIKE ? LIMIT 1";
            $stmt = $db->prepare($sql);
            $stmt->execute(['%' . $cleanName . '%']);
            $p = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($p) return $p;
        }

        return null;
    }

    /**
     * Check stock availability for all items in a request.
     * Returns an array with keys:
     *   'can_approve'  bool
     *   'items'        [ { part_name, requested, available, matched, sufficient } ]
     */
    public function checkStockAvailability($requestId) {
        $items = $this->itemModel->getByRequestId($requestId);

        $result    = [];
        $canApprove = true;

        foreach ($items as $item) {
            $sparepart = $this->findSparepart($item['part_code'], $item['part_name']);
            $requested = (int)$item['quantity'];

            if (!$sparepart) {
                $result[] = [
                    'part_name'  => $item['part_name'],
                    'part_code'  => $item['part_code'],
                    'requested'  => $requested,
                    'available'  => 0,
                    'matched'    => false,
                    'sufficient' => false,  // not found in inventory → block approval
                ];
                $canApprove = false;
                continue;
            }

            $available  = (int)$sparepart['quantity'];
            $sufficient = $available >= $requested;
            if (!$sufficient) $canApprove = false;

            $result[] = [
                'part_name'      => $item['part_name'],
                'part_code'      => $item['part_code'],
                'sparepart_id'   => $sparepart['sparepart_id'],
                'sparepart_db_id'=> $sparepart['id'],
                'requested'      => $requested,
                'available'      => $available,
                'matched'        => true,
                'sufficient'     => $sufficient,
            ];
        }

        return [
            'can_approve' => $canApprove,
            'items'       => $result,
        ];
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
     * Approve a spare part request (by Inventory Manager).
     * Also deducts quantities from the spareparts inventory and records usage.
     */
    public function approve($id, $reviewedBy, $notes = null) {
        try {
            $request = $this->requestModel->getRequestById($id);
            if (!$request) {
                return ['status' => 'error', 'message' => 'Spare part request not found'];
            }

            $approvableStatuses = [SparePartRequest::STATUS_PENDING, SparePartRequest::STATUS_REJECTED];
            if (!in_array($request['status'], $approvableStatuses)) {
                return ['status' => 'error', 'message' => 'Only pending or rejected requests can be approved'];
            }

            // --- Stock check before committing ---
            $stockCheck = $this->checkStockAvailability($id);
            if (!$stockCheck['can_approve']) {
                $insufficient = array_filter($stockCheck['items'], fn($i) => !$i['sufficient']);
                $details = implode('; ', array_map(
                    fn($i) => "{$i['part_name']}: need {$i['requested']}, have {$i['available']}",
                    $insufficient
                ));
                return [
                    'status'  => 'error',
                    'code'    => 'insufficient_stock',
                    'message' => 'Insufficient stock for: ' . $details,
                    'stock_check' => $stockCheck,
                ];
            }

            $db = Database::getInstance()->getConnection();
            $db->beginTransaction();

            // Deduct inventory quantities and record usage for matched items
            $issueDate = date('Y-m-d');
            foreach ($stockCheck['items'] as $item) {
                if (!$item['matched']) continue;

                // Deduct from spareparts
                $db->exec(
                    "UPDATE spareparts
                     SET quantity = quantity - {$item['requested']},
                         last_issue_date = '{$issueDate}'
                     WHERE id = {$item['sparepart_db_id']}"
                );

                // Record usage entry
                $usageData = [
                    'sparepart_id'          => $item['sparepart_id'],
                    'sparepart_name'        => $item['part_name'],
                    'quantity_issued'       => $item['requested'],
                    'issue_date'            => $issueDate,
                    'issued_by'             => $reviewedBy,
                    'notes'                 => 'Issued via spare part request ' . ($request['request_id'] ?? $id),
                    'spare_part_request_id' => $id,
                ];
                $this->usageModel->create($usageData);
            }

            // Update request status to Approved
            $this->requestModel->update($id, [
                'status'       => SparePartRequest::STATUS_APPROVED,
                'reviewed_by'  => $reviewedBy,
                'review_notes' => $notes,
                'reviewed_at'  => date('Y-m-d H:i:s'),
            ]);

            // Update the linked fault ticket status to "Parts Approved"
            $this->faultTicketModel->update($request['fault_ticket_id'], [
                'status' => 'Parts Approved',
            ]);

            $db->commit();

            $matchedCount   = count(array_filter($stockCheck['items'], fn($i) => $i['matched']));
            $unmatchedCount = count($stockCheck['items']) - $matchedCount;
            $msg = 'Spare part request approved. Fault ticket updated to Parts Approved.';
            if ($unmatchedCount > 0) {
                $msg .= " Note: {$unmatchedCount} item(s) were not found in inventory and were not deducted.";
            }

            return ['status' => 'success', 'message' => $msg];

        } catch (Exception $e) {
            if (isset($db)) $db->rollBack();
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

            return [
                'status' => 'success',
                'message' => 'Spare part request rejected.'
            ];
        } catch (Exception $e) {
            error_log("Error rejecting spare part request: " . $e->getMessage());
            return ['status' => 'error', 'message' => 'Failed to reject request: ' . $e->getMessage()];
        }
    }

    /**
     * Get rejected requests that include a specific sparepart.
     * Returned requests also get their items attached.
     */
    public function getRejectedBySparepart($sparepartId) {
        try {
            $requests = $this->requestModel->getRejectedBySparepart($sparepartId);
            foreach ($requests as &$req) {
                $req['items'] = $this->itemModel->getByRequestId($req['id']);
            }
            return ['status' => 'success', 'data' => $requests];
        } catch (Exception $e) {
            error_log('Error in getRejectedBySparepart: ' . $e->getMessage());
            return ['status' => 'error', 'message' => 'Failed to fetch rejected requests: ' . $e->getMessage()];
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
