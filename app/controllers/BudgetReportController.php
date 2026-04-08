<?php

require_once __DIR__ . '/../models/BudgetReport.php';
require_once __DIR__ . '/../models/FaultTicket.php';
require_once __DIR__ . '/../models/SystemSetting.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../services/EventEmitter.php';
require_once __DIR__ . '/../events/DomainEvents.php';

class BudgetReportController {
    private $budgetReportModel;
    private $faultTicketModel;
    private $settingModel;
    private $eventEmitter;
    
    public function __construct() {
        $this->budgetReportModel = new BudgetReport();
        $this->faultTicketModel = new FaultTicket();
        $this->settingModel = new SystemSetting();
        $this->eventEmitter = new EventEmitter();
    }
    
    /**
     * Get authenticated user
     */
    private function getAuthenticatedUser() {
        return RoleMiddleware::getCurrentUser();
    }
    
    /**
     * Create a new budget report
     * POST /budget-reports
     */
    public function create() {
        try {
            // Get authenticated user
            $user = $this->getAuthenticatedUser();
            
            if (!$user) {
                http_response_code(401);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Unauthorized'
                ]);
                return;
            }
            
            // Get JSON data
            $data = json_decode(file_get_contents('php://input'), true);
            
            // Validate required fields
            if (!isset($data['fault_ticket_id']) || 
                !isset($data['quotation']) || 
                !isset($data['justification']) || 
                !isset($data['total_amount'])) {
                http_response_code(400);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Missing required fields: fault_ticket_id, quotation, justification, total_amount'
                ]);
                return;
            }
            
            // Validate ticket exists
            $ticket = $this->faultTicketModel->findById($data['fault_ticket_id']);
            if (!$ticket) {
                http_response_code(404);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Fault ticket not found'
                ]);
                return;
            }
            
            // Check if ticket is in a pre-work status (budget can be submitted/resubmitted)
            $allowedStatuses = ['Open', 'Assigned', 'Waiting for Budget Approval'];
            if (!in_array($ticket['status'], $allowedStatuses)) {
                http_response_code(400);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Budget reports can only be submitted before work has started. Current status: ' . $ticket['status']
                ]);
                return;
            }
            
            // Validate total amount is numeric and greater than zero
            if (!is_numeric($data['total_amount']) || $data['total_amount'] <= 0) {
                http_response_code(400);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Total amount must be greater than zero'
                ]);
                return;
            }
            
            // Create budget report
            $pettyCashLimit = $this->settingModel->getSetting('petty_cash_limit', 50000.00);
            $totalAmount = (float) $data['total_amount'];
            $approvalLevel = $totalAmount <= $pettyCashLimit ? 'supervisor' : 'maintenance_manager';
            
            $reportData = [
                'fault_ticket_id' => $data['fault_ticket_id'],
                'submitted_by' => $user['id'],
                'quotation' => trim($data['quotation']),
                'justification' => trim($data['justification']),
                'total_amount' => number_format($data['total_amount'], 2, '.', ''),
                'approval_level' => $approvalLevel
            ];
            
            $reportId = $this->budgetReportModel->create($reportData);
            
            if ($reportId) {
                // Update ticket status to "Waiting for Budget Approval"
                $this->faultTicketModel->update($data['fault_ticket_id'], [
                    'status' => 'Waiting for Budget Approval'
                ]);
                
                $report = $this->budgetReportModel->findById($reportId);
                
                $approvalMessage = $approvalLevel === 'maintenance_manager' 
                    ? 'Budget report created. Amount exceeds petty cash limit — requires Maintenance Manager approval.' 
                    : 'Budget report created. Awaiting Supervisor approval.';

                $this->eventEmitter->emit(
                    DomainEvents::BUDGET_REPORT_CREATED,
                    [
                        'report_id' => (int) $reportId,
                        'fault_ticket_id' => (int) $data['fault_ticket_id'],
                        'submitted_by' => (int) $user['id'],
                        'total_amount' => (float) $reportData['total_amount'],
                        'approval_role' => $approvalLevel === 'maintenance_manager' ? 'Maintenance Manager' : 'Supervisor',
                    ],
                    [
                        'user_id' => $user['id'] ?? null,
                        'role' => $user['role'] ?? null,
                    ]
                );
                
                http_response_code(201);
                echo json_encode([
                    'status' => 'success',
                    'message' => $approvalMessage,
                    'data' => [
                        'report' => $report,
                        'approval_level' => $approvalLevel,
                        'petty_cash_limit' => $pettyCashLimit
                    ]
                ]);
            } else {
                throw new Exception('Failed to create budget report');
            }
            
        } catch (Exception $e) {
            error_log("Budget report creation error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'status' => 'error',
                'message' => 'Internal server error'
            ]);
        }
    }
    
    /**
     * Get budget reports for a specific ticket
     * GET /budget-reports/ticket/{ticketId}
     */
    public function getByTicket() {
        try {
            // Get ticket ID from URL parameter (set by router)
            $ticketId = $_GET['id'] ?? null;
            
            if (!$ticketId) {
                http_response_code(400);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Ticket ID is required'
                ]);
                return;
            }
            
            // Get authenticated user
            $user = $this->getAuthenticatedUser();
            
            if (!$user) {
                http_response_code(401);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Unauthorized'
                ]);
                return;
            }
            
            // Validate ticket exists
            $ticket = $this->faultTicketModel->findById($ticketId);
            if (!$ticket) {
                http_response_code(404);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Fault ticket not found'
                ]);
                return;
            }
            
            $reports = $this->budgetReportModel->getByTicketId($ticketId);
            
            echo json_encode([
                'status' => 'success',
                'data' => [
                    'reports' => $reports
                ]
            ]);
            
        } catch (Exception $e) {
            error_log("Get budget reports error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'status' => 'error',
                'message' => 'Internal server error'
            ]);
        }
    }
    
    /**
     * Get latest budget report for a specific ticket
     * GET /budget-reports/ticket/{ticketId}/latest
     */
    public function getLatestByTicket() {
        try {
            // Get ticket ID from URL parameter (set by router)
            $ticketId = $_GET['id'] ?? null;
            
            if (!$ticketId) {
                http_response_code(400);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Ticket ID is required'
                ]);
                return;
            }
            
            // Get authenticated user
            $user = $this->getAuthenticatedUser();
            
            if (!$user) {
                http_response_code(401);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Unauthorized'
                ]);
                return;
            }
            
            $report = $this->budgetReportModel->getLatestByTicketId($ticketId);
            
            echo json_encode([
                'status' => 'success',
                'data' => [
                    'report' => $report
                ]
            ]);
            
        } catch (Exception $e) {
            error_log("Get latest budget report error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'status' => 'error',
                'message' => 'Internal server error'
            ]);
        }
    }
    
    /**
     * Update budget report
     * PUT /budget-reports/{id}
     */
    public function update() {
        try {
            // Get budget report ID from URL parameter (set by router)
            $id = $_GET['id'] ?? null;
            
            if (!$id) {
                http_response_code(400);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Budget report ID is required'
                ]);
                return;
            }
            
            // Get authenticated user
            $user = $this->getAuthenticatedUser();
            
            if (!$user) {
                http_response_code(401);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Unauthorized'
                ]);
                return;
            }
            
            // Get existing report
            $existingReport = $this->budgetReportModel->findById($id);
            if (!$existingReport) {
                http_response_code(404);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Budget report not found'
                ]);
                return;
            }
            
            // Check if user is the submitter or a supervisor
            if ($existingReport['submitted_by'] != $user['id'] && 
                $user['role'] !== 'Supervisor' && 
                $user['role'] !== 'Admin') {
                http_response_code(403);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'You do not have permission to update this report'
                ]);
                return;
            }
            
            // Get the ticket to check its status
            $ticket = $this->faultTicketModel->findById($existingReport['fault_ticket_id']);
            if (!$ticket) {
                http_response_code(404);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Associated fault ticket not found'
                ]);
                return;
            }
            
            // Only allow edits if ticket hasn't reached "In Progress" status yet
            // Allowed: Open, Assigned, Waiting for Budget Approval, Waiting for Spare Parts
            $allowedStatuses = ['Open', 'Assigned', 'Waiting for Budget Approval', 'Waiting for Spare Parts'];
            if (!in_array($ticket['status'], $allowedStatuses)) {
                http_response_code(400);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Budget reports can only be edited for tickets that have not reached "In Progress" status. Current status: ' . $ticket['status']
                ]);
                return;
            }
            
            // Get JSON data
            $data = json_decode(file_get_contents('php://input'), true);
            
            // Validate total amount if provided
            if (isset($data['total_amount'])) {
                if (!is_numeric($data['total_amount']) || $data['total_amount'] <= 0) {
                    http_response_code(400);
                    echo json_encode([
                        'status' => 'error',
                        'message' => 'Total amount must be greater than zero'
                    ]);
                    return;
                }
                $data['total_amount'] = number_format($data['total_amount'], 2, '.', '');
            }
            
            $success = $this->budgetReportModel->update($id, $data);
            
            if ($success) {
                $report = $this->budgetReportModel->findById($id);

                $this->eventEmitter->emit(
                    DomainEvents::BUDGET_REPORT_REVIEWED,
                    [
                        'report_id' => (int) $id,
                        'fault_ticket_id' => (int) $existingReport['fault_ticket_id'],
                        'status' => $data['status'],
                        'reviewed_by' => (int) $user['id'],
                        'submitted_by' => (int) ($existingReport['submitted_by'] ?? 0),
                    ],
                    [
                        'user_id' => $user['id'] ?? null,
                        'role' => $user['role'] ?? null,
                    ]
                );
                
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Budget report updated successfully',
                    'data' => [
                        'report' => $report
                    ]
                ]);
            } else {
                throw new Exception('Failed to update budget report');
            }
            
        } catch (Exception $e) {
            error_log("Budget report update error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'status' => 'error',
                'message' => 'Internal server error'
            ]);
        }
    }
    
    /**
     * Review budget report (approve/reject)
     * POST /budget-reports/{id}/review
     */
    public function review() {
        try {
            // Get budget report ID from URL parameter (set by router)
            $id = $_GET['id'] ?? null;
            
            if (!$id) {
                http_response_code(400);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Budget report ID is required'
                ]);
                return;
            }
            
            // Get authenticated user
            $user = $this->getAuthenticatedUser();
            
            if (!$user) {
                http_response_code(401);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Unauthorized'
                ]);
                return;
            }
            
            // Only supervisors and maintenance managers can review
            $allowedReviewRoles = ['Supervisor', 'Maintenance Manager', 'Admin'];
            if (!in_array($user['role'], $allowedReviewRoles)) {
                http_response_code(403);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Only supervisors and maintenance managers can review budget reports'
                ]);
                return;
            }
            
            // Get existing report
            $existingReport = $this->budgetReportModel->findById($id);
            if (!$existingReport) {
                http_response_code(404);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Budget report not found'
                ]);
                return;
            }
            
            // Enforce approval level: maintenance_manager reports need Maintenance Manager or Admin
            $approvalLevel = $existingReport['approval_level'] ?? 'supervisor';
            if ($approvalLevel === 'maintenance_manager' && $user['role'] === 'Supervisor') {
                http_response_code(403);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'This budget exceeds the petty cash limit and requires Maintenance Manager approval'
                ]);
                return;
            }
            
            // Get JSON data
            $data = json_decode(file_get_contents('php://input'), true);
            
            // Validate status
            if (!isset($data['status']) || 
                !in_array($data['status'], ['approved', 'rejected', 'revised'])) {
                http_response_code(400);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Invalid status. Must be: approved, rejected, or revised'
                ]);
                return;
            }
            
            $reviewNotes = isset($data['review_notes']) ? trim($data['review_notes']) : null;
            
            $success = $this->budgetReportModel->review(
                $id,
                $user['id'],
                $data['status'],
                $reviewNotes
            );
            
            if ($success) {
                // Update fault ticket status based on review outcome
                if ($data['status'] === 'approved') {
                    // Budget approved — move ticket back to Assigned so work can proceed
                    $this->faultTicketModel->update($existingReport['fault_ticket_id'], [
                        'status' => 'Assigned'
                    ]);
                } elseif ($data['status'] === 'rejected') {
                    // Budget rejected — move ticket back to Assigned for resubmission
                    $this->faultTicketModel->update($existingReport['fault_ticket_id'], [
                        'status' => 'Assigned'
                    ]);
                }
                // 'revised' status keeps ticket in Waiting for Budget Approval
                
                $report = $this->budgetReportModel->findById($id);
                
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Budget report reviewed successfully',
                    'data' => [
                        'report' => $report
                    ]
                ]);
            } else {
                throw new Exception('Failed to review budget report');
            }
            
        } catch (Exception $e) {
            error_log("Budget report review error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'status' => 'error',
                'message' => 'Internal server error'
            ]);
        }
    }
    
    /**
     * Delete budget report
     * DELETE /budget-reports/{id}
     */
    public function delete() {
        try {
            // Get budget report ID from URL parameter (set by router)
            $id = $_GET['id'] ?? null;
            
            if (!$id) {
                http_response_code(400);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Budget report ID is required'
                ]);
                return;
            }
            
            // Get authenticated user
            $user = $this->getAuthenticatedUser();
            
            if (!$user) {
                http_response_code(401);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Unauthorized'
                ]);
                return;
            }
            
            // Get existing report
            $existingReport = $this->budgetReportModel->findById($id);
            if (!$existingReport) {
                http_response_code(404);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Budget report not found'
                ]);
                return;
            }
            
            // Check if user is the submitter or admin
            if ($existingReport['submitted_by'] != $user['id'] && $user['role'] !== 'Admin') {
                http_response_code(403);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'You do not have permission to delete this report'
                ]);
                return;
            }
            
            // Only allow deletion of pending reports
            if ($existingReport['status'] !== 'pending') {
                http_response_code(400);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Only pending reports can be deleted'
                ]);
                return;
            }
            
            // Get the ticket to check its status
            $ticket = $this->faultTicketModel->findById($existingReport['fault_ticket_id']);
            if (!$ticket) {
                http_response_code(404);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Associated fault ticket not found'
                ]);
                return;
            }
            
            // Only allow deletion if ticket hasn't reached "In Progress" status yet
            $allowedStatuses = ['Open', 'Assigned', 'Waiting for Budget Approval', 'Waiting for Spare Parts'];
            if (!in_array($ticket['status'], $allowedStatuses)) {
                http_response_code(400);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Budget reports can only be deleted for tickets that have not reached "In Progress" status. Current status: ' . $ticket['status']
                ]);
                return;
            }
            
            $success = $this->budgetReportModel->delete($id);
            
            if ($success) {
                // Revert ticket status based on current state
                // If currently "Waiting for Budget Approval", revert to "Assigned" if there are assignments, else "Open"
                $newStatus = 'Open';
                if ($ticket['status'] === 'Waiting for Budget Approval') {
                    // Check if there are active assignments
                    require_once __DIR__ . '/../models/FaultTicketAssignment.php';
                    $assignmentModel = new FaultTicketAssignment();
                    $assignments = $assignmentModel->getTicketAssignments($ticket['id']);
                    
                    if (!empty($assignments)) {
                        $newStatus = 'Assigned';
                    }
                }
                
                $this->faultTicketModel->update($existingReport['fault_ticket_id'], [
                    'status' => $newStatus
                ]);
                
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Budget report deleted successfully'
                ]);
            } else {
                throw new Exception('Failed to delete budget report');
            }
            
        } catch (Exception $e) {
            error_log("Budget report deletion error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'status' => 'error',
                'message' => 'Internal server error'
            ]);
        }
    }
    
    /**
     * Get all pending budget reports (for supervisors)
     * GET /budget-reports/pending
     */
    public function getPending() {
        try {
            // Get authenticated user
            $user = $this->getAuthenticatedUser();
            
            if (!$user) {
                http_response_code(401);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Unauthorized'
                ]);
                return;
            }
            
            // Supervisors, Maintenance Managers, and Admins can view pending reports
            $allowedRoles = ['Supervisor', 'Maintenance Manager', 'Admin'];
            if (!in_array($user['role'], $allowedRoles)) {
                http_response_code(403);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Only supervisors and maintenance managers can view pending reports'
                ]);
                return;
            }
            
            // Filter by approval level based on role
            // Supervisors see only supervisor-level reports
            // Maintenance Managers see only maintenance_manager-level reports
            // Admins see all
            $approvalLevel = null;
            if ($user['role'] === 'Supervisor') {
                $approvalLevel = 'supervisor';
            } elseif ($user['role'] === 'Maintenance Manager') {
                $approvalLevel = 'maintenance_manager';
            }
            
            $reports = $this->budgetReportModel->getPendingReports($approvalLevel);
            
            echo json_encode([
                'status' => 'success',
                'data' => [
                    'reports' => $reports
                ]
            ]);
            
        } catch (Exception $e) {
            error_log("Get pending reports error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'status' => 'error',
                'message' => 'Internal server error'
            ]);
        }
    }
}
