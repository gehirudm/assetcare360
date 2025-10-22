<?php

require_once __DIR__ . '/../models/FaultTicket.php';
require_once __DIR__ . '/../models/FaultTicketImage.php';
require_once __DIR__ . '/../models/FaultTicketAssignment.php';

class FaultTicketService {
    private $faultTicketModel;
    private $imageModel;
    private $assignmentModel;
    
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
    }
    
    /**
     * Validate fault ticket data
     */
    public function validate($data, $files = []) {
        $errors = [];
        
        // Validate machine_id
        if (empty($data['machine_id'])) {
            $errors['machine_id'] = 'Machine is required';
        } elseif (!is_numeric($data['machine_id'])) {
            $errors['machine_id'] = 'Invalid machine ID';
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
        
        // Note: Location is no longer required from user input - will be fetched from machine
        
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
            // Fetch machine location
            require_once __DIR__ . '/../models/Machine.php';
            $machineModel = new Machine();
            $machine = $machineModel->findById($data['machine_id']);
            
            if (!$machine) {
                return [
                    'success' => false,
                    'message' => 'Machine not found'
                ];
            }
            
            // Use machine's location
            $location = $machine['location'] ?? 'Unknown Location';
            
            // Create fault ticket
            $ticketId = $this->faultTicketModel->createTicket([
                'machine_id' => $data['machine_id'],
                'reported_by' => $data['reported_by'],
                'description' => $data['description'],
                'priority' => $data['priority'],
                'location' => $location,
                'status' => FaultTicket::STATUS_OPEN
            ]);
            
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
            return $this->formatTicket($ticket);
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
            
            // Only allow editing if status is Open (Pending)
            if ($ticket['status'] !== 'Open') {
                return [
                    'success' => false,
                    'message' => 'Only pending tickets can be edited'
                ];
            }
            
            // Check ownership - allow Supervisor and Admin to update any ticket
            if ($user) {
                $userId = $user['id'];
                $userRole = $user['role'] ?? null;
                
                // Supervisors and Admins can update any ticket
                $canUpdateAnyTicket = in_array($userRole, ['Supervisor', 'Admin']);
                
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
            
            // Validate required fields
            if (empty($data['technician_ids']) || !is_array($data['technician_ids'])) {
                return [
                    'success' => false,
                    'message' => 'At least one technician must be selected'
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
            
            // Assign technicians
            $assignedCount = $this->assignmentModel->assignTechnicians(
                $ticketId,
                $data['technician_ids'],
                $user['id'],
                $data['expected_completion_date'] ?? null,
                $data['notes'] ?? null
            );
            
            // Update ticket status to "Assigned"
            $this->faultTicketModel->updateTicket($ticketId, ['status' => 'Assigned']);
            
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
