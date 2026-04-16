<?php
/**
 * TecFaultRepairTicketController
 * Handles API endpoints for Technical Officer repair tickets
 */

require_once __DIR__ . '/../models/TecFaultRepairTicket.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';

class TecFaultRepairTicketController {
    private $model;
    
    public function __construct() {
        $this->model = new TecFaultRepairTicket();
    }
    
    /**
     * Get all repair tickets for the logged-in technical officer
     * GET /api/tec-repair-tickets/my
     */
    public function myTickets() {
        try {
            $user = RoleMiddleware::getCurrentUser();
            if (!$user) {
                return Response::unauthorized('Please login to continue');
            }
            
            $tickets = $this->model->getByTechnicianId($user['id']);
            $counts = $this->model->getCountsByTechnician($user['id']);
            
            return Response::success([
                'tickets' => $tickets,
                'counts' => $counts
            ]);
        } catch (Exception $e) {
            error_log("Error getting my repair tickets: " . $e->getMessage());
            return Response::serverError('Failed to fetch repair tickets');
        }
    }
    
    /**
     * Get counts/stats for the logged-in technical officer
     * GET /api/tec-repair-tickets/stats
     */
    public function stats() {
        try {
            $user = RoleMiddleware::getCurrentUser();
            if (!$user) {
                return Response::unauthorized('Please login to continue');
            }
            
            $counts = $this->model->getCountsByTechnician($user['id']);
            
            return Response::success($counts);
        } catch (Exception $e) {
            error_log("Error getting repair ticket stats: " . $e->getMessage());
            return Response::serverError('Failed to fetch stats');
        }
    }
    
    /**
     * Get all repair tickets (for admin/supervisor view)
     * GET /api/tec-repair-tickets
     */
    public function index() {
        try {
            $user = RoleMiddleware::getCurrentUser();
            if (!$user) {
                return Response::unauthorized('Please login to continue');
            }
            
            // Filter by technician_id if provided in query params
            $technicianId = $_GET['technician_id'] ?? null;
            
            if ($technicianId) {
                $tickets = $this->model->getByTechnicianId($technicianId);
            } else {
                // For Technical Officers, only show their own tickets
                if ($user['role'] === 'Technical Officer') {
                    $tickets = $this->model->getByTechnicianId($user['id']);
                } else {
                    // Supervisors and Admins can see all
                    $tickets = $this->model->getAll();
                }
            }
            
            return Response::success($tickets);
        } catch (Exception $e) {
            error_log("Error getting repair tickets: " . $e->getMessage());
            return Response::serverError('Failed to fetch repair tickets');
        }
    }
    
    /**
     * Get a single repair ticket by ID
     * GET /api/tec-repair-tickets/:id
     */
    public function show() {
        try {
            $id = $_GET['id'] ?? null;
            
            if (!$id) {
                return Response::error('Repair ticket ID is required', 400);
            }
            
            $ticket = $this->model->findById($id);
            
            if (!$ticket) {
                return Response::notFound('Repair ticket not found');
            }
            
            return Response::success($ticket);
        } catch (Exception $e) {
            error_log("Error getting repair ticket: " . $e->getMessage());
            return Response::serverError('Failed to fetch repair ticket');
        }
    }
    
    /**
     * Update repair ticket (diagnosis, notes, status, etc.)
     * PUT /api/tec-repair-tickets/:id
     */
    public function update() {
        try {
            $id = $_GET['id'] ?? null;
            
            if (!$id) {
                return Response::error('Repair ticket ID is required', 400);
            }
            
            $user = RoleMiddleware::getCurrentUser();
            if (!$user) {
                return Response::unauthorized('Please login to continue');
            }
            
            $ticket = $this->model->findById($id);
            if (!$ticket) {
                return Response::notFound('Repair ticket not found');
            }
            
            // Check if user is authorized to update
            if ($user['role'] === 'Technical Officer' && $ticket['technician_id'] != $user['id']) {
                return Response::forbidden('You can only update your own tickets');
            }
            
            $data = json_decode(file_get_contents('php://input'), true);
            
            // Handle status changes with timestamp updates
            if (isset($data['repair_status'])) {
                switch ($data['repair_status']) {
                    case TecFaultRepairTicket::STATUS_DIAGNOSED:
                        if (empty($data['diagnosis_at'])) {
                            $data['diagnosis_at'] = date('Y-m-d H:i:s');
                        }
                        break;
                    case TecFaultRepairTicket::STATUS_IN_REPAIR:
                        if (empty($data['repair_started_at'])) {
                            $data['repair_started_at'] = date('Y-m-d H:i:s');
                        }
                        break;
                    case TecFaultRepairTicket::STATUS_COMPLETED:
                        if (empty($data['repair_completed_at'])) {
                            $data['repair_completed_at'] = date('Y-m-d H:i:s');
                        }
                        break;
                }
            }
            
            $result = $this->model->update($id, $data);
            
            if ($result) {
                $updatedTicket = $this->model->findById($id);
                return Response::success($updatedTicket, 'Repair ticket updated successfully');
            } else {
                return Response::error('No changes made or update failed', 400);
            }
        } catch (Exception $e) {
            error_log("Error updating repair ticket: " . $e->getMessage());
            return Response::serverError('Failed to update repair ticket');
        }
    }
    
    /**
     * Update only the status of a repair ticket
     * PATCH /api/tec-repair-tickets/:id/status
     */
    public function updateStatus() {
        try {
            $id = $_GET['id'] ?? null;
            
            if (!$id) {
                return Response::error('Repair ticket ID is required', 400);
            }
            
            $user = RoleMiddleware::getCurrentUser();
            if (!$user) {
                return Response::unauthorized('Please login to continue');
            }
            
            $ticket = $this->model->findById($id);
            if (!$ticket) {
                return Response::notFound('Repair ticket not found');
            }
            
            // Check if user is authorized
            if ($user['role'] === 'Technical Officer' && $ticket['technician_id'] != $user['id']) {
                return Response::forbidden('You can only update your own tickets');
            }
            
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['status'])) {
                return Response::error('Status is required', 400);
            }
            
            $result = $this->model->updateStatus($id, $data['status']);
            
            if ($result) {
                return Response::success(null, 'Status updated successfully');
            } else {
                return Response::serverError('Failed to update status');
            }
        } catch (Exception $e) {
            error_log("Error updating repair ticket status: " . $e->getMessage());
            return Response::serverError('Failed to update status');
        }
    }
    
    /**
     * Get repair tickets by status
     * GET /api/tec-repair-tickets/status/:status
     */
    public function getByStatus() {
        try {
            $status = $_GET['status'] ?? null;
            
            if (!$status) {
                return Response::error('Status is required', 400);
            }
            
            $tickets = $this->model->getByStatus($status);
            
            return Response::success($tickets);
        } catch (Exception $e) {
            error_log("Error getting repair tickets by status: " . $e->getMessage());
            return Response::serverError('Failed to fetch repair tickets');
        }
    }
}
