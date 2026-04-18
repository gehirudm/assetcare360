<?php

require_once __DIR__ . '/../models/FaultTicket.php';
require_once __DIR__ . '/../models/FaultTicketAssignment.php';
require_once __DIR__ . '/../models/BudgetReport.php';
require_once __DIR__ . '/../models/SparePartRequest.php';

/**
 * Centralized workflow state management for fault tickets.
 *
 * This service keeps ticket status aligned with budget and spare-part workflows,
 * preventing endpoint-specific status collisions.
 */
class FaultTicketWorkflowService {
    private $faultTicketModel;
    private $assignmentModel;
    private $budgetReportModel;
    private $sparePartRequestModel;

    public function __construct() {
        $this->faultTicketModel = new FaultTicket();
        $this->assignmentModel = new FaultTicketAssignment();
        $this->budgetReportModel = new BudgetReport();
        $this->sparePartRequestModel = new SparePartRequest();
    }

    /**
     * Get current workflow indicators for a ticket.
     */
    public function getWorkflowIndicators($ticketId) {
        $latestBudget = $this->budgetReportModel->getLatestByTicketId($ticketId);
        $latestParts = $this->getLatestSparePartRequest($ticketId);

        return [
            'has_budget_report' => !empty($latestBudget),
            'budget_report_status' => $latestBudget['status'] ?? null,
            'budget_report_id' => isset($latestBudget['id']) ? (int) $latestBudget['id'] : null,
            'budget_approval_level' => $latestBudget['approval_level'] ?? null,
            'has_spare_part_request' => !empty($latestParts),
            'spare_part_request_status' => $latestParts['status'] ?? null,
            'spare_part_request_id' => isset($latestParts['id']) ? (int) $latestParts['id'] : null,
        ];
    }

    /**
     * Recalculate and sync fault ticket status based on workflow artifacts.
     */
    public function syncTicketStatus($ticketId, $options = []) {
        $ticket = $this->faultTicketModel->findById($ticketId);
        if (!$ticket) {
            return [
                'success' => false,
                'message' => 'Fault ticket not found'
            ];
        }

        $currentStatus = $ticket['status'] ?? FaultTicket::STATUS_OPEN;
        $terminalStatuses = [
            FaultTicket::STATUS_INSURANCE_CLAIMED,
            FaultTicket::STATUS_IN_PROGRESS,
            FaultTicket::STATUS_RESOLVED,
            FaultTicket::STATUS_CLOSED,
        ];

        $force = !empty($options['force']);
        if (!$force && in_array($currentStatus, $terminalStatuses, true)) {
            return [
                'success' => true,
                'changed' => false,
                'status' => $currentStatus,
                'workflow' => $this->getWorkflowIndicators($ticketId),
            ];
        }

        $targetStatus = $this->deriveTargetStatus($ticketId);

        if ($targetStatus === $currentStatus) {
            return [
                'success' => true,
                'changed' => false,
                'status' => $currentStatus,
                'workflow' => $this->getWorkflowIndicators($ticketId),
            ];
        }

        $updated = $this->faultTicketModel->updateTicket($ticketId, ['status' => $targetStatus]);

        if (!$updated) {
            return [
                'success' => false,
                'message' => 'Failed to sync fault ticket status',
                'status' => $currentStatus,
                'target_status' => $targetStatus,
            ];
        }

        return [
            'success' => true,
            'changed' => true,
            'status' => $targetStatus,
            'previous_status' => $currentStatus,
            'workflow' => $this->getWorkflowIndicators($ticketId),
        ];
    }

    private function deriveTargetStatus($ticketId) {
        $assignments = $this->assignmentModel->getTicketAssignments($ticketId);
        $hasAssignments = !empty($assignments);

        $latestBudget = $this->budgetReportModel->getLatestByTicketId($ticketId);
        $budgetStatus = strtolower(trim($latestBudget['status'] ?? ''));

        $latestParts = $this->getLatestSparePartRequest($ticketId);
        $partsStatus = strtolower(trim($latestParts['status'] ?? ''));

        $baseStatus = $hasAssignments ? FaultTicket::STATUS_ASSIGNED : FaultTicket::STATUS_OPEN;

        // Budget review has highest precedence: work cannot proceed while pending/revised.
        if (in_array($budgetStatus, ['pending', 'revised'], true)) {
            return FaultTicket::STATUS_WAITING_BUDGET;
        }

        // If parts are waiting, keep ticket in spare-parts waiting state.
        if ($partsStatus === 'pending') {
            return FaultTicket::STATUS_WAITING_PARTS;
        }

        // Once parts are approved/issued, ticket can advance to Parts Approved.
        if (in_array($partsStatus, ['approved', 'issued'], true)) {
            return FaultTicket::STATUS_PARTS_APPROVED;
        }

        // If parts request was rejected, surface that clearly on the ticket.
        if ($partsStatus === 'rejected') {
            return FaultTicket::STATUS_PARTS_REJECTED;
        }

        return $baseStatus;
    }

    private function getLatestSparePartRequest($ticketId) {
        $requests = $this->sparePartRequestModel->getByFaultTicket($ticketId);
        if (empty($requests)) {
            return null;
        }

        return $requests[0];
    }
}
