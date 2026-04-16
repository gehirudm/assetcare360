<?php

require_once __DIR__ . '/../models/FaultTicket.php';
require_once __DIR__ . '/../models/FaultTicketImage.php';
require_once __DIR__ . '/../models/FaultTicketAssignment.php';
require_once __DIR__ . '/../models/BudgetReport.php';
require_once __DIR__ . '/../models/SparePartRequest.php';
require_once __DIR__ . '/FaultTicketWorkflowService.php';
require_once __DIR__ . '/../../config/Database.php';

class FaultTicketService {
    private $faultTicketModel;
    private $imageModel;
    private $assignmentModel;
    private $budgetReportModel;
    private $sparePartRequestModel;
    private $workflowService;
    
    // Constants for validation
    const MAX_IMAGES = 5;
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
    const UPLOAD_DIR = __DIR__ . '/../../uploads/fault-tickets/';
    
    public function __construct() {
        $this->faultTicketModel = new FaultTicket();
        $this->imageModel = new FaultTicketImage();
        $this->assignmentModel = new FaultTicketAssignment();
        $this->budgetReportModel = new BudgetReport();
        $this->sparePartRequestModel = new SparePartRequest();
        $this->workflowService = new FaultTicketWorkflowService();
    }
    
    /**
     * Validate fault ticket data
     */
    public function validate($data, $files = []) {
        $errors = [];
        
        // Validate machine_id or vehicle_id (at least one is required)
        if (empty($data['machine_id']) && empty($data['vehicle_id'])) {
            $errors['machine_id'] = 'Machine or Vehicle is required';
        } elseif (!empty($data['machine_id']) && !is_numeric($data['machine_id'])) {
            $errors['machine_id'] = 'Invalid machine ID';
        } elseif (!empty($data['vehicle_id']) && !is_numeric($data['vehicle_id'])) {
            $errors['vehicle_id'] = 'Invalid vehicle ID';
        }
        
        // Validate description
        if (empty($data['description'])) {
            $errors['description'] = 'Description is required';
        } elseif (strlen($data['description']) < 10) {
            $errors['description'] = 'Description must be at least 10 characters';
        }
        
        // Validate priority
        if (empty($data['priority'])) {
            $errors['priority'] = 'Priority is required';
        } elseif (!in_array($data['priority'], FaultTicket::getValidPriorities())) {
            $errors['priority'] = 'Invalid priority level';
        }
        
        // Note: Location is no longer required from user input - will be fetched from machine/vehicle
        
        // Validate images if provided
        if (!empty($files) && isset($files['photos'])) {
            $imageValidation = $this->validateImages($files['photos']);
            if (!$imageValidation['valid']) {
                $errors['images'] = $imageValidation['errors'];
            }
        }
        
        return $errors;
    }
    
    /**
     * Validate uploaded images
     */
    private function validateImages($files) {
        $errors = [];
        
        // Convert to array format if single file
        if (!is_array($files['name'])) {
            $files = [
                'name' => [$files['name']],
                'type' => [$files['type']],
                'tmp_name' => [$files['tmp_name']],
                'error' => [$files['error']],
                'size' => [$files['size']]
            ];
        }
        
        // Count images (filter out empty names)
        $actualFiles = array_filter($files['name']);
        $imageCount = count($actualFiles);
        
        if ($imageCount > self::MAX_IMAGES) {
            $errors[] = 'Maximum ' . self::MAX_IMAGES . ' images allowed';
            return ['valid' => false, 'errors' => $errors];
        }
        
        // Validate each image
        for ($i = 0; $i < count($files['name']); $i++) {
            // Skip empty entries
            if (empty($files['name'][$i])) {
                continue;
            }
            
            // Check for upload errors
            if ($files['error'][$i] !== UPLOAD_ERR_OK) {
                $errors[] = 'Error uploading ' . $files['name'][$i];
                continue;
            }
            
            // Check file size
            if ($files['size'][$i] > self::MAX_FILE_SIZE) {
                $errors[] = $files['name'][$i] . ' exceeds 5MB size limit';
                continue;
            }
            
            // Check MIME type
            if (!in_array($files['type'][$i], self::ALLOWED_MIME_TYPES)) {
                $errors[] = $files['name'][$i] . ' is not a valid image type';
                continue;
            }
            
            // Check file extension
            $extension = strtolower(pathinfo($files['name'][$i], PATHINFO_EXTENSION));
            if (!in_array($extension, self::ALLOWED_EXTENSIONS)) {
                $errors[] = $files['name'][$i] . ' has invalid file extension';
                continue;
            }
            
            // Verify it's actually an image
            $imageInfo = @getimagesize($files['tmp_name'][$i]);
            if ($imageInfo === false) {
                $errors[] = $files['name'][$i] . ' is not a valid image file';
                continue;
            }
        }
        
        return [
            'valid' => empty($errors),
            'errors' => $errors
        ];
    }
    
    /**
     * Create fault ticket with images
     */
    public function create($data, $files = []) {
        // Validate data
        $errors = $this->validate($data, $files);
        if (!empty($errors)) {
            return [
                'success' => false,
                'errors' => $errors
            ];
        }
        
        try {
            $location = 'Unknown Location';
            $machineId = null;
            $vehicleId = null;
            
            // Handle machine-based tickets
            if (!empty($data['machine_id'])) {
                require_once __DIR__ . '/../models/Machine.php';
                $machineModel = new Machine();
                $machine = $machineModel->findById($data['machine_id']);
                
                if (!$machine) {
                    return [
                        'success' => false,
                        'message' => 'Machine not found'
                    ];
                }
                
                $location = $machine['location'] ?? 'Unknown Location';
                $machineId = $data['machine_id'];
            }
            
            // Handle vehicle-based tickets  
            if (!empty($data['vehicle_id'])) {
                require_once __DIR__ . '/../models/Vehicle.php';
                $vehicleModel = new Vehicle();
                $vehicle = $vehicleModel->findById($data['vehicle_id']);
                
                if (!$vehicle) {
                    return [
                        'success' => false,
                        'message' => 'Vehicle not found'
                    ];
                }
                
                $location = $vehicle['current_location'] ?? $vehicle['location'] ?? 'Unknown Location';
                $vehicleId = $data['vehicle_id'];
            }
            
            // Create fault ticket
            $ticketData = [
                'reported_by' => $data['reported_by'],
                'description' => $data['description'],
                'priority' => $data['priority'],
                'location' => $location,
                'status' => FaultTicket::STATUS_OPEN
            ];
            
            // Add machine_id if provided
            if ($machineId) {
                $ticketData['machine_id'] = $machineId;
            }
            
            // Add breakdown report link if provided
            if (!empty($data['breakdown_report_id'])) {
                $ticketData['breakdown_report_id'] = $data['breakdown_report_id'];
                $ticketData['breakdown_type'] = $data['breakdown_type'] ?? null;
            }
            
            $ticketId = $this->faultTicketModel->createTicket($ticketData);
            
            if (!$ticketId) {
                return [
                    'success' => false,
                    'message' => 'Failed to create fault ticket'
                ];
            }
            
            // Upload and save images if provided
            if (!empty($files['photos'])) {
                $this->saveImages($ticketId, $files['photos']);
            }
            
            return [
                'success' => true,
                'message' => 'Fault ticket created successfully',
                'data' => ['id' => $ticketId]
            ];
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Error creating fault ticket: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Save uploaded images
     */
    private function saveImages($ticketId, $photos) {
        // Create upload directory if it doesn't exist
        if (!file_exists(self::UPLOAD_DIR)) {
            mkdir(self::UPLOAD_DIR, 0755, true);
        }
        
        // Convert to array format if single file
        if (!is_array($photos['name'])) {
            $photos = [
                'name' => [$photos['name']],
                'type' => [$photos['type']],
                'tmp_name' => [$photos['tmp_name']],
                'error' => [$photos['error']],
                'size' => [$photos['size']]
            ];
        }
        
        // Save each image
        for ($i = 0; $i < count($photos['name']); $i++) {
            if ($photos['error'][$i] === UPLOAD_ERR_OK) {
                // Generate UUID for filename
                $uuid = FaultTicketImage::generateUuid();
                $extension = strtolower(pathinfo($photos['name'][$i], PATHINFO_EXTENSION));
                $filename = $uuid . '.' . $extension;
                $filePath = self::UPLOAD_DIR . $filename;
                
                // Check if this is a regular uploaded file or a manually created temp file
                // move_uploaded_file() only works for files uploaded via POST
                // For PUT requests with manually parsed files, use rename() or copy()
                $moveSuccess = false;
                
                if (is_uploaded_file($photos['tmp_name'][$i])) {
                    // Regular POST upload
                    $moveSuccess = move_uploaded_file($photos['tmp_name'][$i], $filePath);
                } else {
                    // Manually created temp file (from PUT request parsing)
                    if (file_exists($photos['tmp_name'][$i])) {
                        $moveSuccess = rename($photos['tmp_name'][$i], $filePath);
                        if (!$moveSuccess) {
                            // Fallback to copy if rename fails
                            $moveSuccess = copy($photos['tmp_name'][$i], $filePath);
                            if ($moveSuccess) {
                                unlink($photos['tmp_name'][$i]);
                            }
                        }
                    }
                }
                
                if ($moveSuccess) {
                    // Save to database
                    $this->imageModel->createImage([
                        'fault_ticket_id' => $ticketId,
                        'image_uuid' => $uuid,
                        'original_filename' => $photos['name'][$i],
                        'file_path' => $filePath,
                        'file_size' => $photos['size'][$i],
                        'mime_type' => $photos['type'][$i]
                    ]);
                }
            }
        }
    }
    
    /**
     * Get all fault tickets
     */
    public function getAll($filters = []) {
        $tickets = $this->faultTicketModel->getAllTickets($filters);
        
        // Format each ticket
        if (is_array($tickets)) {
            return array_map([$this, 'formatTicket'], $tickets);
        }
        
        return $tickets;
    }
    
    /**
     * Get fault ticket by ID
     */
    public function getById($id) {
        $ticket = $this->faultTicketModel->getTicketById($id);
        
        if ($ticket) {
            $formatted = $this->formatTicket($ticket);
            $formatted['workflow'] = $this->workflowService->getWorkflowIndicators((int) $ticket['id']);
            return $formatted;
        }
        
        return $ticket;
    }
    
    /**
     * Format ticket data for frontend
     */
    private function formatTicket($ticket) {
        // Use full_name from users table
        $reporterName = $ticket['reporter_full_name'] ?? 'Unknown';
        
        // Fallback to employee_id if full_name not available
        if (empty($reporterName) || $reporterName === 'Unknown') {
            $reporterName = $ticket['reporter_employee_id'] ?? 'Unknown';
        }
        
        $ticket['reported_by_name'] = $reporterName;
        
        // Get assignments for this ticket
        if (isset($ticket['id'])) {
            $ticket['assignments'] = $this->assignmentModel->getTicketAssignments($ticket['id']);
            
            // Get work updates from ticket_work_updates table
            $conn = Database::getInstance()->getConnection();
            $workStmt = $conn->prepare("
                SELECT twu.*, u.full_name as technician_name
                FROM ticket_work_updates twu
                LEFT JOIN users u ON twu.technical_officer_id = u.id
                WHERE twu.ticket_id = ?
                ORDER BY twu.created_at DESC
            ");
            $workStmt->execute([$ticket['id']]);
            $ticket['work_updates'] = $workStmt->fetchAll(\PDO::FETCH_ASSOC);
        }
        
        // Format image URLs for frontend
        if (isset($ticket['images']) && is_array($ticket['images'])) {
            foreach ($ticket['images'] as &$image) {
                // Add file extension from original filename
                $extension = pathinfo($image['original_filename'], PATHINFO_EXTENSION);
                $image['image_url'] = $image['image_uuid'] . '.' . $extension;
            }
            unset($image); // Break reference
        }
        
        return $ticket;
    }
    
    /**
     * Update fault ticket
     */
    public function update($id, $data, $files = [], $user = null) {
        // Validate update data
        $errors = [];
        
        if (isset($data['priority']) && !in_array($data['priority'], FaultTicket::getValidPriorities())) {
            $errors['priority'] = 'Invalid priority level';
        }
        
        if (isset($data['status']) && !in_array($data['status'], FaultTicket::getValidStatuses())) {
            $errors['status'] = 'Invalid status';
        }
        
        if (!empty($errors)) {
            return [
                'success' => false,
                'errors' => $errors
            ];
        }
        
        try {
            // Get current ticket to verify ownership and status
            $ticket = $this->faultTicketModel->getTicketById($id);
            
            if (!$ticket) {
                return [
                    'success' => false,
                    'message' => 'Fault ticket not found'
                ];
            }
            
            // Check if this is ONLY a status change (technical officer workflow)
            // Allow resolution_notes to be included when changing status
            $isStatusChangeOnly = isset($data['status']) && 
                (count($data) === 1 || (count($data) === 2 && isset($data['resolution_notes'])));
            
            // Define allowed status transitions for technical officer workflow
            $allowedTransitions = [
                // From Open/Assigned → Waiting for Spare Parts (request parts)
                'Open' => ['In Progress', 'Waiting for Spare Parts', 'Resolved', 'Closed'],
                'Assigned' => ['In Progress', 'Waiting for Spare Parts', 'Resolved', 'Closed'],
                // From Waiting for Spare Parts → Parts Approved (inventory manager approves)
                'Waiting for Spare Parts' => ['Parts Approved', 'Resolved', 'Closed'],
                // From Parts Approved → In Progress (tech officer starts work)
                'Parts Approved' => ['In Progress', 'Resolved', 'Closed'],
                // From In Progress → Resolved/Closed
                'In Progress' => ['Resolved', 'Closed'],
                // From Resolved → Closed
                'Resolved' => ['Closed'],
            ];
            
            $isValidStatusTransition = $isStatusChangeOnly && 
                isset($allowedTransitions[$ticket['status']]) && 
                in_array($data['status'], $allowedTransitions[$ticket['status']]);

            if ($isStatusChangeOnly && isset($data['status']) && $data['status'] === FaultTicket::STATUS_IN_PROGRESS) {
                $latestBudget = $this->budgetReportModel->getLatestByTicketId($id);
                if (!empty($latestBudget)) {
                    $budgetStatus = strtolower(trim($latestBudget['status'] ?? ''));
                    if (in_array($budgetStatus, ['pending', 'revised'], true)) {
                        return [
                            'success' => false,
                            'message' => 'Cannot start work while budget approval is pending. Please wait for approval or update the budget report.'
                        ];
                    }
                }

                $requests = $this->sparePartRequestModel->getByFaultTicket($id);
                if (!empty($requests)) {
                    $latestRequest = $requests[0];
                    $partsStatus = strtolower(trim($latestRequest['status'] ?? ''));
                    if ($partsStatus === 'pending') {
                        return [
                            'success' => false,
                            'message' => 'Cannot start work while spare part requests are pending approval.'
                        ];
                    }
                }
            }
            
            // Only allow full editing if status is Open (Pending), but allow status transitions
            if (!$isValidStatusTransition && $ticket['status'] !== 'Open') {
                return [
                    'success' => false,
                    'message' => 'Only pending tickets can be edited'
                ];
            }
            
            // Check ownership - allow Supervisor, Admin, and Technical Officer to update any ticket
            if ($user) {
                $userId = $user['id'];
                $userRole = $user['role'] ?? null;
                
                // Supervisors, Admins, and Technical Officers can update any ticket
                $canUpdateAnyTicket = in_array($userRole, ['Supervisor', 'Admin', 'Technical Officer']);
                
                // Regular users can only edit their own tickets
                if (!$canUpdateAnyTicket && $ticket['reported_by'] != $userId) {
                    return [
                        'success' => false,
                        'message' => 'You can only edit your own tickets'
                    ];
                }
            }
            
            // Handle image deletions
            if (isset($data['delete_images']) && is_array($data['delete_images'])) {
                foreach ($data['delete_images'] as $imageId) {
                    if (!empty($imageId)) {
                        $this->deleteImage($imageId);
                    }
                }
            }
            
            // Handle new image uploads
            if (!empty($files) && isset($files['photos']) && !empty($files['photos']['name'])) {
                // Convert single file to array format if needed
                if (!is_array($files['photos']['name'])) {
                    $files['photos'] = [
                        'name' => [$files['photos']['name']],
                        'type' => [$files['photos']['type']],
                        'tmp_name' => [$files['photos']['tmp_name']],
                        'error' => [$files['photos']['error']],
                        'size' => [$files['photos']['size']]
                    ];
                }
                
                // Check if there are actual files (not empty strings)
                $actualFiles = array_filter($files['photos']['name']);
                
                if (!empty($actualFiles)) {
                    // Get current image count
                    $currentImages = $this->imageModel->getImagesByTicketId($id);
                    $currentCount = count($currentImages);
                    $deleteCount = isset($data['delete_images']) ? count($data['delete_images']) : 0;
                    $newCount = count($actualFiles);
                    
                    // Check if total will exceed limit
                    if (($currentCount - $deleteCount + $newCount) > self::MAX_IMAGES) {
                        return [
                            'success' => false,
                            'message' => 'Maximum ' . self::MAX_IMAGES . ' images allowed per ticket'
                        ];
                    }
                    
                    // Validate and save new images
                    $validation = $this->validateImages($files['photos']);
                    
                    if (!$validation['valid']) {
                        return [
                            'success' => false,
                            'errors' => ['photos' => $validation['errors']]
                        ];
                    }
                    
                    $this->saveImages($id, $files['photos']);
                }
            }
            
            // Update ticket data (remove delete_images from update data)
            $updateData = $data;
            unset($updateData['delete_images']);
            
            // Only call updateTicket if there's actual data to update
            if (!empty($updateData)) {
                $result = $this->faultTicketModel->updateTicket($id, $updateData);
                
                if (!$result) {
                    return [
                        'success' => false,
                        'message' => 'Failed to update fault ticket'
                    ];
                }
                
                // If status is being changed to Resolved, sync the breakdown report status
                if (isset($data['status']) && $data['status'] === 'Resolved') {
                    $logFile = __DIR__ . '/../../logs/breakdown_sync.log';
                    file_put_contents($logFile, date('Y-m-d H:i:s') . " - update() calling updateBreakdownReportStatus\n", FILE_APPEND);
                    file_put_contents($logFile, "  Ticket breakdown_report_id: " . ($ticket['breakdown_report_id'] ?? 'NULL') . "\n", FILE_APPEND);
                    file_put_contents($logFile, "  Ticket breakdown_type: " . ($ticket['breakdown_type'] ?? 'NULL') . "\n", FILE_APPEND);
                    $this->updateBreakdownReportStatus($ticket, 'Resolved');
                }
            }
            
            return [
                'success' => true,
                'message' => 'Fault ticket updated successfully'
            ];
            
        } catch (\Exception $e) {
            error_log("FaultTicketService update error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Error updating fault ticket: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Assign technicians to a fault ticket
     */
    public function assignTechnicians($ticketId, $data, $user) {
        try {
            // Validate ticket exists
            $ticket = $this->faultTicketModel->getTicketById($ticketId);
            
            if (!$ticket) {
                return [
                    'success' => false,
                    'message' => 'Fault ticket not found'
                ];
            }
            
            // Check if user can assign tickets
            $userRole = $user['role'] ?? null;
            if (!in_array($userRole, ['Supervisor', 'Admin'])) {
                return [
                    'success' => false,
                    'message' => 'You do not have permission to assign tickets'
                ];
            }

            $routeGarageWorkflow = $this->getRouteGarageWorkflowForTicket($ticket);
            $routeGarageStatus = strtolower(trim((string)($routeGarageWorkflow['workflow_status'] ?? '')));
            $garageHandledStatuses = ['garage_approved', 'garage_entry_logged', 'repair_in_progress', 'completed'];

            if (in_array($routeGarageStatus, $garageHandledStatuses, true)) {
                $garageName = trim((string)($routeGarageWorkflow['approved_garage_name'] ?? ''));
                $message = 'Nearby garage workflow is already active for this route breakdown. Technician assignment is not required.';
                if ($garageName !== '') {
                    $message .= ' Approved garage: ' . $garageName . '.';
                }

                return [
                    'success' => false,
                    'message' => $message
                ];
            }
            
            // Check if ticket can be modified based on its current status
            $currentStatus = strtolower($ticket['status'] ?? 'open');
            
            // Allow assignment/editing only for "Open", "Pending" (unassigned) or "Assigned" status tickets
            // Prevent modification of tickets that are "In Progress", "Completed", "Resolved" or "Closed"
            $editableStatuses = ['open', 'pending', 'assigned'];
            
            if (!in_array($currentStatus, $editableStatuses)) {
                return [
                    'success' => false,
                    'message' => 'This ticket cannot be modified. Only tickets with "Open", "Pending" or "Assigned" status can be edited. Current status: ' . ucfirst($ticket['status'])
                ];
            }
            
            // Validate technician_ids is an array
            if (!isset($data['technician_ids']) || !is_array($data['technician_ids'])) {
                return [
                    'success' => false,
                    'message' => 'Invalid technician data'
                ];
            }
            
            // Update ticket priority if provided
            if (isset($data['priority'])) {
                if (!in_array($data['priority'], FaultTicket::getValidPriorities())) {
                    return [
                        'success' => false,
                        'message' => 'Invalid priority level'
                    ];
                }
                
                $this->faultTicketModel->updateTicket($ticketId, ['priority' => $data['priority']]);
            }
            
            // Check if technician_ids is empty (unassignment)
            if (empty($data['technician_ids'])) {
                // Remove all current assignments
                $this->assignmentModel->assignTechnicians(
                    $ticketId,
                    [], // Empty array will remove all assignments
                    $user['id'],
                    null,
                    null
                );
                
                // Update ticket status back to "Open" (unassigned)
                $this->faultTicketModel->updateTicket($ticketId, ['status' => 'Open']);
                $this->workflowService->syncTicketStatus((int) $ticketId);
                
                return [
                    'success' => true,
                    'message' => 'All technicians unassigned. Ticket moved to Unassigned status.'
                ];
            }
            
            // Assign technicians
            $assignmentResult = $this->assignmentModel->assignTechnicians(
                $ticketId,
                $data['technician_ids'],
                $user['id'],
                $data['expected_completion_date'] ?? null,
                $data['notes'] ?? null
            );
            
            $assignedCount = $assignmentResult['count'];
            $assignmentIds = $assignmentResult['assignment_ids'];
            
            // Create repair tickets for newly assigned technicians
            $this->createRepairTicketsForAssignments($assignmentIds, $ticketId, $ticket, $data['expected_completion_date'] ?? null);
            
            // Update ticket status to "Assigned"
            $this->faultTicketModel->updateTicket($ticketId, ['status' => 'Assigned']);
            $this->workflowService->syncTicketStatus((int) $ticketId);
            
            // Update linked breakdown report status if exists
            $this->updateBreakdownReportStatus($ticket, 'Assigned');
            
            return [
                'success' => true,
                'message' => $assignedCount . ' technician(s) assigned successfully'
            ];
            
        } catch (\Exception $e) {
            error_log("FaultTicketService assignTechnicians error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Error assigning technicians: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Complete/Finish a fault ticket
     * Updates status across fault_tickets, tec_fault_repair_ticket, and spare_part_requests
     */
    public function completeTicket($id, $data = [], $user = null) {
        try {
            $ticket = $this->faultTicketModel->getTicketById($id);
            
            if (!$ticket) {
                return [
                    'success' => false,
                    'message' => 'Fault ticket not found'
                ];
            }
            
            // Only allow completing tickets that are "In Progress"
            if ($ticket['status'] !== 'In Progress') {
                return [
                    'success' => false,
                    'message' => 'Only tickets that are In Progress can be marked as finished. Current status: ' . $ticket['status']
                ];
            }
            
            $db = Database::getInstance()->getConnection();
            $db->beginTransaction();
            
            try {
                $approvedRequestsStmt = $db->prepare("SELECT id, request_id FROM spare_part_requests WHERE fault_ticket_id = ? AND status = 'Approved'");
                $approvedRequestsStmt->execute([$id]);
                $approvedRequests = $approvedRequestsStmt->fetchAll(PDO::FETCH_ASSOC);

                if (!empty($approvedRequests)) {
                    $itemsStmt = $db->prepare("SELECT part_code, part_name, quantity FROM spare_part_request_items WHERE request_id = ?");
                    $insertUsageStmt = $db->prepare("
                        INSERT INTO sparepart_usage (
                            sparepart_id,
                            sparepart_name,
                            quantity_issued,
                            issue_date,
                            issued_by,
                            machine_id,
                            vehicle_id,
                            notes
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ");

                    $issueDate = date('Y-m-d');
                    $issuedBy = is_array($user) && !empty($user['id']) ? (int)$user['id'] : null;
                    $machineId = isset($ticket['machine_id']) ? (string)$ticket['machine_id'] : null;
                    $vehicleId = isset($ticket['vehicle_id']) ? (string)$ticket['vehicle_id'] : null;
                    $ticketCode = $ticket['ticket_id'] ?? ('#' . $id);

                    foreach ($approvedRequests as $request) {
                        $itemsStmt->execute([(int)$request['id']]);
                        $items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

                        foreach ($items as $item) {
                            $sparepartId = isset($item['part_code']) ? trim((string)$item['part_code']) : '';
                            $quantityIssued = isset($item['quantity']) ? (int)$item['quantity'] : 0;

                            if ($sparepartId === '' || $quantityIssued <= 0) {
                                continue;
                            }

                            $sparepartName = !empty($item['part_name']) ? (string)$item['part_name'] : $sparepartId;
                            $notes = sprintf(
                                'Issued via fault ticket %s (%s)',
                                $ticketCode,
                                $request['request_id'] ?? ('Request #' . (int)$request['id'])
                            );

                            $insertUsageStmt->execute([
                                $sparepartId,
                                $sparepartName,
                                $quantityIssued,
                                $issueDate,
                                $issuedBy,
                                $machineId,
                                $vehicleId,
                                $notes
                            ]);
                        }
                    }
                }

                // 1. Update fault_tickets → Resolved
                $stmt = $db->prepare("UPDATE fault_tickets SET status = 'Resolved', resolved_at = NOW(), updated_at = NOW() WHERE id = ?");
                $stmt->execute([$id]);
                
                // 2. Update all linked tec_fault_repair_ticket → Completed
                $stmt = $db->prepare("UPDATE tec_fault_repair_ticket SET repair_status = 'Completed', updated_at = NOW() WHERE fault_ticket_id = ?");
                $stmt->execute([$id]);
                
                // 3. Update linked spare_part_requests → Issued (parts have been used)
                $stmt = $db->prepare("UPDATE spare_part_requests SET status = 'Issued', updated_at = NOW() WHERE fault_ticket_id = ? AND status = 'Approved'");
                $stmt->execute([$id]);
                
                // 4. Store work summary and resolution notes if provided
                if (!empty($data['work_summary'])) {
                    $stmt = $db->prepare("UPDATE fault_tickets SET resolution_notes = ? WHERE id = ?");
                    $stmt->execute([$data['work_summary'], $id]);
                }
                
                // 5. Update linked breakdown report status
                $logFile = __DIR__ . '/../../logs/breakdown_sync.log';
                file_put_contents($logFile, date('Y-m-d H:i:s') . " - completeTicket() calling updateBreakdownReportStatus\n", FILE_APPEND);
                file_put_contents($logFile, "  Ticket ID: $id\n", FILE_APPEND);
                file_put_contents($logFile, "  breakdown_report_id: " . ($ticket['breakdown_report_id'] ?? 'NULL') . "\n", FILE_APPEND);
                file_put_contents($logFile, "  breakdown_type: " . ($ticket['breakdown_type'] ?? 'NULL') . "\n", FILE_APPEND);
                $this->updateBreakdownReportStatus($ticket, 'Resolved');
                
                $db->commit();
                
                return [
                    'success' => true,
                    'message' => 'Ticket marked as finished. Status updated to Resolved across all related records.'
                ];
                
            } catch (\Exception $e) {
                $db->rollBack();
                throw $e;
            }
            
        } catch (\Exception $e) {
            error_log("FaultTicketService completeTicket error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Error completing ticket: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Update linked breakdown report status
     */
    private function updateBreakdownReportStatus($ticket, $newStatus) {
        error_log("updateBreakdownReportStatus called - breakdown_report_id: " . ($ticket['breakdown_report_id'] ?? 'NULL') . ", breakdown_type: " . ($ticket['breakdown_type'] ?? 'NULL') . ", newStatus: " . $newStatus);
        
        if (empty($ticket['breakdown_report_id'])) {
            error_log("updateBreakdownReportStatus: No breakdown_report_id, returning early");
            return;
        }
        
        try {
            $db = Database::getInstance()->getConnection();
            $breakdownReportId = $ticket['breakdown_report_id'];
            $breakdownType = $ticket['breakdown_type'] ?? '';
            
            // Write to a file for debugging
            $logFile = __DIR__ . '/../../logs/breakdown_sync.log';
            $logDir = dirname($logFile);
            if (!is_dir($logDir)) {
                mkdir($logDir, 0777, true);
            }
            file_put_contents($logFile, date('Y-m-d H:i:s') . " - updateBreakdownReportStatus called\n", FILE_APPEND);
            file_put_contents($logFile, "  breakdownReportId: $breakdownReportId\n", FILE_APPEND);
            file_put_contents($logFile, "  breakdownType: $breakdownType\n", FILE_APPEND);
            file_put_contents($logFile, "  newStatus: $newStatus\n", FILE_APPEND);
            
            error_log("updateBreakdownReportStatus: breakdownReportId=$breakdownReportId, breakdownType=$breakdownType");
            
            // Determine which table to update based on breakdown_type
            if ($breakdownType === 'vehicle_breakdown') {
                $sql = "UPDATE vehicle_breakdown SET status = ? WHERE breakdown_id = ?";
                $stmt = $db->prepare($sql);
                $stmt->execute([$newStatus, $breakdownReportId]);
                $rowCount = $stmt->rowCount();
                file_put_contents($logFile, "  Updated vehicle_breakdown, rows affected: $rowCount\n", FILE_APPEND);
                error_log("Updated vehicle_breakdown, rows affected: " . $rowCount);
            } elseif ($breakdownType === 'route_breakdown') {
                $sql = "UPDATE vehicle_breakdown_inroute SET status = ? WHERE route_breakdown_id = ?";
                $stmt = $db->prepare($sql);
                $stmt->execute([$newStatus, $breakdownReportId]);
                $rowCount = $stmt->rowCount();
                file_put_contents($logFile, "  Updated vehicle_breakdown_inroute, rows affected: $rowCount\n", FILE_APPEND);
                error_log("Updated vehicle_breakdown_inroute, rows affected: " . $rowCount);
            } elseif ($breakdownType === 'machine_breakdown') {
                $sql = "UPDATE machine_breakdown SET status = ? WHERE breakdown_id = ?";
                $stmt = $db->prepare($sql);
                $stmt->execute([$newStatus, $breakdownReportId]);
                $rowCount = $stmt->rowCount();
                file_put_contents($logFile, "  Updated machine_breakdown, rows affected: $rowCount\n", FILE_APPEND);
                error_log("Updated machine_breakdown, rows affected: " . $rowCount);
            } else {
                // Fallback: try to find the breakdown in all tables by ID pattern
                if (strpos($breakdownReportId, 'MBD-') === 0) {
                    // Machine breakdown
                    $sql = "UPDATE machine_breakdown SET status = ? WHERE breakdown_id = ?";
                    $stmt = $db->prepare($sql);
                    $stmt->execute([$newStatus, $breakdownReportId]);
                } elseif (strpos($breakdownReportId, 'VBD-') === 0) {
                    // Vehicle breakdown
                    $sql = "UPDATE vehicle_breakdown SET status = ? WHERE breakdown_id = ?";
                    $stmt = $db->prepare($sql);
                    $stmt->execute([$newStatus, $breakdownReportId]);
                } elseif (strpos($breakdownReportId, 'RBD-') === 0) {
                    // Route breakdown
                    $sql = "UPDATE vehicle_breakdown_inroute SET status = ? WHERE route_breakdown_id = ?";
                    $stmt = $db->prepare($sql);
                    $stmt->execute([$newStatus, $breakdownReportId]);
                } else {
                    // Try vehicle_breakdown first, then machine_breakdown
                    $sql = "UPDATE vehicle_breakdown SET status = ? WHERE breakdown_id = ?";
                    $stmt = $db->prepare($sql);
                    $stmt->execute([$newStatus, $breakdownReportId]);
                    
                    if ($stmt->rowCount() === 0) {
                        $sql = "UPDATE machine_breakdown SET status = ? WHERE breakdown_id = ?";
                        $stmt = $db->prepare($sql);
                        $stmt->execute([$newStatus, $breakdownReportId]);
                    }
                    
                    if ($stmt->rowCount() === 0) {
                        $sql = "UPDATE vehicle_breakdown_inroute SET status = ? WHERE route_breakdown_id = ?";
                        $stmt = $db->prepare($sql);
                        $stmt->execute([$newStatus, $breakdownReportId]);
                    }
                }
            }
            
        } catch (\Exception $e) {
            error_log("Error updating breakdown report status: " . $e->getMessage());
        }
    }
    
    /**
     * Create repair tickets for newly assigned technicians
     */
    private function createRepairTicketsForAssignments($assignmentIds, $faultTicketId, $faultTicket, $expectedCompletionDate = null) {
        require_once __DIR__ . '/../models/TecFaultRepairTicket.php';
        
        try {
            $repairTicketModel = new TecFaultRepairTicket();
            
            foreach ($assignmentIds as $assignment) {
                // Only create repair ticket for new assignments
                if ($assignment['is_new']) {
                    // Check if repair ticket already exists for this assignment
                    $existing = $repairTicketModel->findByAssignmentId($assignment['id']);
                    
                    if (!$existing) {
                        $repairTicketModel->createFromAssignment(
                            $assignment['id'],
                            $faultTicketId,
                            $assignment['technician_id'],
                            $faultTicket,
                            $expectedCompletionDate
                        );
                    }
                }
            }
        } catch (\Exception $e) {
            error_log("Error creating repair tickets: " . $e->getMessage());
        }
    }

    private function getRouteGarageWorkflowForTicket($ticket) {
        $breakdownType = strtolower(trim((string)($ticket['breakdown_type'] ?? '')));
        $routeBreakdownCode = trim((string)($ticket['breakdown_report_id'] ?? ''));

        if ($breakdownType !== 'route_breakdown' || $routeBreakdownCode === '') {
            return null;
        }

        $conn = Database::getInstance()->getConnection();
        $stmt = $conn->prepare(
            "SELECT rgw.workflow_status,
                    rgw.approved_garage_id,
                    g.name as approved_garage_name
             FROM vehicle_breakdown_inroute rb
             LEFT JOIN route_breakdown_garage_workflow rgw ON rgw.route_breakdown_id = rb.id
             LEFT JOIN garages g ON g.id = rgw.approved_garage_id
             WHERE rb.route_breakdown_id = ?
             LIMIT 1"
        );
        $stmt->execute([$routeBreakdownCode]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row ?: null;
    }
    
    /**
     * Delete fault ticket
     */
    public function delete($id, $userId = null) {
        try {
            // Get current ticket to verify ownership and status
            $ticket = $this->faultTicketModel->getTicketById($id);
            
            if (!$ticket) {
                return [
                    'success' => false,
                    'message' => 'Fault ticket not found'
                ];
            }
            
            // Only allow deletion if status is Open (Pending)
            if ($ticket['status'] !== 'Open') {
                return [
                    'success' => false,
                    'message' => 'Only pending tickets can be deleted'
                ];
            }
            
            // If userId provided, verify ownership
            if ($userId && $ticket['reported_by'] != $userId) {
                return [
                    'success' => false,
                    'message' => 'You can only delete your own tickets'
                ];
            }
            
            // Delete all associated images
            $images = $this->imageModel->getImagesByTicketId($id);
            foreach ($images as $image) {
                $this->deleteImage($image['id']);
            }
            
            // Delete the ticket
            $result = $this->faultTicketModel->deleteTicket($id);
            
            return [
                'success' => $result,
                'message' => $result ? 'Fault ticket deleted successfully' : 'Failed to delete fault ticket'
            ];
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Error deleting fault ticket: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Delete an image
     */
    private function deleteImage($imageId) {
        // Get image details
        $image = $this->imageModel->getImageById($imageId);
        
        if ($image) {
            // Delete file from filesystem
            if (file_exists($image['file_path'])) {
                unlink($image['file_path']);
            }
            
            // Delete from database
            $this->imageModel->deleteImage($imageId);
        }
    }
}
