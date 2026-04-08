<?php

require_once __DIR__ . '/../services/FaultTicketService.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../models/FaultTicket.php';
require_once __DIR__ . '/../services/EventEmitter.php';
require_once __DIR__ . '/../events/DomainEvents.php';

/**
 * Fault Ticket Controller
 * Handles HTTP requests for fault ticket management
 */
class FaultTicketController {
    
    private $faultTicketService;
    private $eventEmitter;
    private $faultTicketModel;
    
    public function __construct() {
        $this->faultTicketService = new FaultTicketService();
        $this->eventEmitter = new EventEmitter();
        $this->faultTicketModel = new FaultTicket();
    }
    
    /**
     * Get authenticated user
     */
    private function getAuthenticatedUser() {
        return RoleMiddleware::getCurrentUser();
    }
    
    /**
     * Get all fault tickets
     * GET /fault-tickets
     */
    public function index() {
        try {
            // Get filters from query params
            $filters = [];
            
            if (isset($_GET['machine_id'])) {
                $filters['machine_id'] = $_GET['machine_id'];
            }
            
            if (isset($_GET['reported_by'])) {
                $filters['reported_by'] = $_GET['reported_by'];
            }
            
            if (isset($_GET['status'])) {
                $filters['status'] = $_GET['status'];
            }
            
            if (isset($_GET['priority'])) {
                $filters['priority'] = $_GET['priority'];
            }
            
            $tickets = $this->faultTicketService->getAll($filters);
            
            Response::success(['tickets' => $tickets]);
            
        } catch (\Exception $e) {
            Response::error('Error fetching fault tickets: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get single fault ticket
     * GET /fault-tickets/{id}
     */
    public function show() {
        try {
            // Get ID from route parameter
            $id = $_GET['id'] ?? null;
            
            if (!$id) {
                Response::error('Fault ticket ID is required', 400);
                return;
            }
            
            $ticket = $this->faultTicketService->getById($id);
            
            if (!$ticket) {
                Response::error('Fault ticket not found', 404);
                return;
            }
            
            Response::success($ticket);
            
        } catch (\Exception $e) {
            Response::error('Error fetching fault ticket: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Create new fault ticket
     * POST /fault-tickets
     */
    public function create() {
        try {
            // Get JSON data and files
            $data = $_POST;
            $files = $_FILES;
            
            // Get reported_by from authenticated user
            $user = $this->getAuthenticatedUser();
            if (!$user) {
                Response::error('Unauthorized', 401);
                return;
            }
            
            $data['reported_by'] = $user['id'];
            
            // Create fault ticket
            $result = $this->faultTicketService->create($data, $files);
            
            if (!$result['success']) {
                if (isset($result['errors'])) {
                    Response::error($result['message'] ?? 'Validation failed', 422, ['errors' => $result['errors']]);
                } else {
                    Response::error($result['message'] ?? 'Failed to create fault ticket', 400);
                }
                return;
            }

            $ticketDbId = (int) ($result['data']['id'] ?? 0);
            if ($ticketDbId > 0) {
                $ticket = $this->faultTicketModel->findById($ticketDbId);
                $this->eventEmitter->emit(
                    DomainEvents::FAULT_TICKET_CREATED,
                    [
                        'ticket_db_id' => $ticketDbId,
                        'ticket_id' => $ticket['ticket_id'] ?? null,
                        'priority' => $ticket['priority'] ?? ($data['priority'] ?? null),
                        'status' => $ticket['status'] ?? FaultTicket::STATUS_OPEN,
                    ],
                    [
                        'user_id' => $user['id'] ?? null,
                        'role' => $user['role'] ?? null,
                    ]
                );
            }
            
            Response::success($result['data'], $result['message'], 201);
            
        } catch (\Exception $e) {
            Response::error('Error creating fault ticket: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Update fault ticket
     * PUT /fault-tickets/{id}
     */
    public function update() {
        try {
            // Get ID from route parameter
            $id = $_GET['id'] ?? null;
            
            if (!$id) {
                Response::error('Fault ticket ID is required', 400);
                return;
            }
            
            // Get authenticated user
            $user = $this->getAuthenticatedUser();
            if (!$user) {
                Response::error('Unauthorized', 401);
                return;
            }
            
            // Check if FormData (multipart) or JSON
            $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
            
            if (strpos($contentType, 'multipart/form-data') !== false) {
                // PHP doesn't populate $_POST and $_FILES for PUT requests
                // We need to manually parse the request body
                $_PUT = [];
                $_FILES_PUT = [];
                
                // Parse multipart form data for PUT request
                $this->parseMultipartFormData($_PUT, $_FILES_PUT);
                
                // Update fault ticket with files - pass full user object
                $result = $this->faultTicketService->update($id, $_PUT, $_FILES_PUT, $user);
            } else {
                // Handle JSON update
                $data = json_decode(file_get_contents('php://input'), true);
                
                // Update fault ticket - pass full user object
                $result = $this->faultTicketService->update($id, $data, [], $user);
            }
            
            if (!$result['success']) {
                if (isset($result['errors'])) {
                    Response::error($result['message'] ?? 'Validation failed', 422, ['errors' => $result['errors']]);
                } else {
                    Response::error($result['message'] ?? 'Failed to update fault ticket', 400);
                }
                return;
            }
            
            Response::success(null, $result['message']);
            
        } catch (\Exception $e) {
            Response::error('Error updating fault ticket: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Assign technicians to a fault ticket
     * POST /fault-tickets/:id/assign
     */
    public function assign() {
        try {
            // Get ID from route parameter
            $id = $_GET['id'] ?? null;
            
            if (!$id) {
                Response::error('Fault ticket ID is required', 400);
                return;
            }
            
            // Get authenticated user
            $user = $this->getAuthenticatedUser();
            if (!$user) {
                Response::error('Unauthorized', 401);
                return;
            }
            
            // Get assignment data from request body
            $data = json_decode(file_get_contents('php://input'), true);
            
            // Assign technicians
            $result = $this->faultTicketService->assignTechnicians($id, $data, $user);
            
            if (!$result['success']) {
                Response::error($result['message'] ?? 'Failed to assign technicians', 400);
                return;
            }

            $ticket = $this->faultTicketModel->findById($id);
            $technicianIds = array_values(array_filter(array_map('intval', $data['technician_ids'] ?? [])));
            if (!empty($technicianIds)) {
                $this->eventEmitter->emit(
                    DomainEvents::FAULT_TICKET_ASSIGNED,
                    [
                        'ticket_db_id' => (int) $id,
                        'ticket_id' => $ticket['ticket_id'] ?? null,
                        'technician_user_ids' => $technicianIds,
                        'status' => $ticket['status'] ?? 'Assigned',
                    ],
                    [
                        'user_id' => $user['id'] ?? null,
                        'role' => $user['role'] ?? null,
                    ]
                );
            }
            
            Response::success(null, $result['message']);
            
        } catch (\Exception $e) {
            Response::error('Error assigning technicians: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Mark fault ticket as completed/resolved
     * POST /fault-tickets/:id/complete
     */
    public function complete() {
        try {
            $id = $_GET['id'] ?? null;
            
            if (!$id) {
                Response::error('Fault ticket ID is required', 400);
                return;
            }
            
            $user = $this->getAuthenticatedUser();
            if (!$user) {
                Response::error('Unauthorized', 401);
                return;
            }
            
            $data = json_decode(file_get_contents('php://input'), true) ?? [];
            
            $result = $this->faultTicketService->completeTicket($id, $data, $user);
            
            if (!$result['success']) {
                Response::error($result['message'] ?? 'Failed to complete ticket', 400);
                return;
            }
            
            Response::success(null, $result['message']);
            
        } catch (\Exception $e) {
            Response::error('Error completing fault ticket: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Parse multipart form data for PUT/PATCH requests
     * PHP only parses multipart data for POST requests by default
     */
    private function parseMultipartFormData(&$data, &$files) {
        $input = file_get_contents('php://input');
        
        // Get boundary from content type
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        preg_match('/boundary=(.*)$/', $contentType, $matches);
        
        if (!isset($matches[1])) {
            return;
        }
        
        $boundary = $matches[1];
        
        // Split by boundary
        $blocks = preg_split("/-+$boundary/", $input);
        array_pop($blocks); // Remove last empty block
        
        foreach ($blocks as $block) {
            if (empty(trim($block))) {
                continue;
            }
            
            // Parse block headers and content
            if (strpos($block, 'Content-Disposition: form-data') !== false) {
                // Split headers and content
                $parts = preg_split("/\r?\n\r?\n/", $block, 2);
                
                if (count($parts) < 2) {
                    continue;
                }
                
                $headers = $parts[0];
                $content = isset($parts[1]) ? substr($parts[1], 0, -2) : ''; // Remove trailing \r\n
                
                // Parse name and filename from headers
                preg_match('/name="([^"]*)"/', $headers, $nameMatch);
                preg_match('/filename="([^"]*)"/', $headers, $filenameMatch);
                
                $name = $nameMatch[1] ?? '';
                $filename = $filenameMatch[1] ?? '';
                
                if (!empty($filename)) {
                    // This is a file upload
                    // Get content type
                    preg_match('/Content-Type: (.*)/', $headers, $typeMatch);
                    $contentType = trim($typeMatch[1] ?? 'application/octet-stream');
                    
                    // Create temporary file
                    $tmpName = tempnam(sys_get_temp_dir(), 'php');
                    file_put_contents($tmpName, $content);
                    
                    // Handle array notation (e.g., photos[])
                    if (substr($name, -2) === '[]') {
                        $name = substr($name, 0, -2);
                        if (!isset($files[$name])) {
                            $files[$name] = [
                                'name' => [],
                                'type' => [],
                                'tmp_name' => [],
                                'error' => [],
                                'size' => []
                            ];
                        }
                        $files[$name]['name'][] = $filename;
                        $files[$name]['type'][] = $contentType;
                        $files[$name]['tmp_name'][] = $tmpName;
                        $files[$name]['error'][] = UPLOAD_ERR_OK;
                        $files[$name]['size'][] = filesize($tmpName);
                    } else {
                        $files[$name] = [
                            'name' => $filename,
                            'type' => $contentType,
                            'tmp_name' => $tmpName,
                            'error' => UPLOAD_ERR_OK,
                            'size' => filesize($tmpName)
                        ];
                    }
                } else {
                    // This is a regular field
                    // Handle array notation (e.g., delete_images[])
                    if (substr($name, -2) === '[]') {
                        $name = substr($name, 0, -2);
                        if (!isset($data[$name])) {
                            $data[$name] = [];
                        }
                        $data[$name][] = $content;
                    } else {
                        $data[$name] = $content;
                    }
                }
            }
        }
    }
    
    /**
     * Delete fault ticket
     * DELETE /fault-tickets/{id}
     */
    public function delete() {
        try {
            // Get ID from route parameter
            $id = $_GET['id'] ?? null;
            
            if (!$id) {
                Response::error('Fault ticket ID is required', 400);
                return;
            }
            
            // Get authenticated user
            $user = $this->getAuthenticatedUser();
            if (!$user) {
                Response::error('Unauthorized', 401);
                return;
            }
            
            // Delete fault ticket
            $result = $this->faultTicketService->delete($id, $user['id']);
            
            if (!$result['success']) {
                Response::error($result['message'] ?? 'Failed to delete fault ticket', 400);
                return;
            }
            
            Response::success(null, $result['message']);
            
        } catch (\Exception $e) {
            Response::error('Error deleting fault ticket: ' . $e->getMessage(), 500);
        }
    }
}
