<?php

require_once __DIR__ . '/../models/TicketWorkUpdate.php';
require_once __DIR__ . '/../models/BudgetReport.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';

/**
 * TicketWorkUpdate Controller
 * Handles work update submissions from technical officers
 */
class TicketWorkUpdateController {
    private $workUpdateModel;
    private $budgetReportModel;
    
    public function __construct() {
        $this->workUpdateModel = new TicketWorkUpdate();
        $this->budgetReportModel = new BudgetReport();
    }
    
    /**
     * Create a new work update
     * POST /api/ticket-work-updates
     */
    public function create() {
        try {
            // Get current user first (before role check)
            $currentUser = RoleMiddleware::getCurrentUser();
            
            if (!$currentUser) {
                error_log('TicketWorkUpdate create: No authenticated user');
                Response::unauthorized('Authentication required');
                return;
            }
            
            // Check role
            if ($currentUser['role'] !== 'Technical Officer') {
                error_log('TicketWorkUpdate create: User role is ' . $currentUser['role'] . ', not Technical Officer');
                Response::error('Only Technical Officers can submit work updates', 403);
                return;
            }
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                error_log('TicketWorkUpdate create: Invalid JSON input');
                Response::error('Invalid JSON data', 400);
                return;
            }
            
            error_log('TicketWorkUpdate create: Received data - ' . json_encode($input));
            
            // Validation
            if (empty($input['ticket_id'])) {
                error_log('TicketWorkUpdate create: Missing ticket_id');
                Response::error('Ticket ID is required', 400);
                return;
            }
            
            if (empty($input['time_spent']) || $input['time_spent'] <= 0) {
                error_log('TicketWorkUpdate create: Invalid time_spent - ' . ($input['time_spent'] ?? 'empty'));
                Response::error('Time spent is required and must be greater than 0', 400);
                return;
            }
            
            if (empty($input['machine_description'])) {
                error_log('TicketWorkUpdate create: Missing machine_description');
                Response::error('Machine description is required', 400);
                return;
            }
            
            // Check if ticket already has a work completion record
            if ($this->workUpdateModel->hasWorkUpdate($input['ticket_id'])) {
                error_log('TicketWorkUpdate create: Ticket already has a work completion record');
                Response::error('This ticket already has a work completion record', 400);
                return;
            }

            // Block work update submission if there is a pending budget report
            $latestBudgetReport = $this->budgetReportModel->getLatestByTicketId($input['ticket_id']);
            if ($latestBudgetReport && strtolower($latestBudgetReport['status']) === 'pending') {
                error_log('TicketWorkUpdate create: Cannot submit work update — budget report is still pending approval');
                Response::error('Cannot submit work update: the budget report for this ticket is still pending approval. Please wait for approval before starting work.', 400);
                return;
            }
            
            $data = [
                'ticket_id' => $input['ticket_id'],
                'technical_officer_id' => $currentUser['id'],
                'parts_used' => $input['parts_used'] ?? null,
                'time_spent' => $input['time_spent'],
                'machine_description' => $input['machine_description'],
                'work_status' => $input['work_status'] ?? 'Completed'
            ];
            
            error_log('TicketWorkUpdate create: Attempting to save - ' . json_encode($data));
            
            $workUpdateId = $this->workUpdateModel->createWorkUpdate($data);
            
            if ($workUpdateId) {
                error_log('TicketWorkUpdate create: Successfully saved with ID ' . $workUpdateId);
                Response::success([
                    'work_update_id' => $workUpdateId,
                    'message' => 'Work update saved successfully'
                ], 'Work update saved successfully', 201);
            } else {
                error_log('TicketWorkUpdate create: Database insert failed');
                Response::error('Failed to save work update', 500);
            }
        } catch (Exception $e) {
            error_log('TicketWorkUpdate create: Exception - ' . $e->getMessage());
            Response::error('An error occurred: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get work updates for a ticket
     * GET /api/ticket-work-updates/{ticket_id}
     */
    public function getByTicket() {
        RoleMiddleware::requireRole(['Technical Officer', 'Supervisor', 'Admin']);
        
        $ticketId = $_GET['ticket_id'] ?? null;
        
        if (!$ticketId) {
            Response::error('Ticket ID is required', 400);
        }
        
        $updates = $this->workUpdateModel->getWorkUpdatesByTicketId($ticketId);
        
        Response::success([
            'updates' => $updates,
            'total_time' => $this->workUpdateModel->getTotalTimeSpent($ticketId)
        ]);
    }
    
    /**
     * Get latest work update for a ticket
     * GET /api/ticket-work-updates/latest/{ticket_id}
     */
    public function getLatest() {
        RoleMiddleware::requireRole(['Technical Officer', 'Supervisor', 'Admin']);
        
        $ticketId = $_GET['ticket_id'] ?? null;
        
        if (!$ticketId) {
            Response::error('Ticket ID is required', 400);
        }
        
        $update = $this->workUpdateModel->getLatestWorkUpdate($ticketId);
        
        if ($update) {
            Response::success($update);
        } else {
            Response::error('No work updates found for this ticket', 404);
        }
    }
}
