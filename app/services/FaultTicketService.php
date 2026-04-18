<?php

require_once __DIR__ . '/../models/FaultTicket.php';
require_once __DIR__ . '/../models/FaultTicketImage.php';
require_once __DIR__ . '/../models/FaultTicketAssignment.php';
require_once __DIR__ . '/../models/BudgetReport.php';
require_once __DIR__ . '/../models/SparePartRequest.php';
require_once __DIR__ . '/FaultTicketWorkflowService.php';
require_once __DIR__ . '/TripService.php';
require_once __DIR__ . '/../../config/Database.php';

class FaultTicketService {
    private $faultTicketModel;
    private $imageModel;
    private $assignmentModel;
    private $budgetReportModel;
    private $sparePartRequestModel;
    private $workflowService;
    private array $schemaCheckCache = [];
    private array $routeBreakdownDangerousCache = [];
    private array $breakdownContextCache = [];
    private array $assetInsuranceCache = [];
    
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
        $dangerousCargoContext = $this->resolveRouteBreakdownDangerousCargoContext($data);
        if (!empty($dangerousCargoContext['is_dangerous'])) {
            $data['priority'] = FaultTicket::PRIORITY_CRITICAL;
        }

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
                $machineId = (int) $data['machine_id'];
                $machine = $this->getMachineForTicket($machineId);
                
                if (!$machine) {
                    return [
                        'success' => false,
                        'message' => 'Machine not found'
                    ];
                }
                
                $location = $machine['location'] ?? 'Unknown Location';
            }
            
            // Handle vehicle-based tickets  
            if (!empty($data['vehicle_id'])) {
                $vehicleId = (int) $data['vehicle_id'];
                $vehicle = $this->getVehicleForTicket($vehicleId);
                
                if (!$vehicle) {
                    return [
                        'success' => false,
                        'message' => 'Vehicle not found'
                    ];
                }
                
                $location = !empty($vehicle['number_plate'])
                    ? 'Vehicle ' . $vehicle['number_plate']
                    : 'Unknown Location';
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

            // Add vehicle_id if provided
            if ($vehicleId) {
                $ticketData['vehicle_id'] = $vehicleId;
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
                'data' => [
                    'id' => $ticketId,
                    'is_dangerous_cargo' => !empty($dangerousCargoContext['is_dangerous']),
                    'dangerous_cargo_summary' => $dangerousCargoContext['summary'] ?? null,
                    'dangerous_cargo_trip_id' => $dangerousCargoContext['trip_id'] ?? null,
                ]
            ];
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Error creating fault ticket: ' . $e->getMessage()
            ];
        }
    }

    private function getMachineForTicket(int $machineId): ?array {
        $conn = Database::getInstance()->getConnection();
        $stmt = $conn->prepare("SELECT id, location FROM machines WHERE id = ? LIMIT 1");
        $stmt->execute([$machineId]);
        $machine = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $machine ?: null;
    }

    private function getVehicleForTicket(int $vehicleId): ?array {
        $conn = Database::getInstance()->getConnection();
        $stmt = $conn->prepare("SELECT id, number_plate FROM vehicles WHERE id = ? LIMIT 1");
        $stmt->execute([$vehicleId]);
        $vehicle = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $vehicle ?: null;
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

        $this->mergeBreakdownContextIntoTicket($ticket);

        $this->mergeRouteBreakdownDangerousContextIntoTicket($ticket);

        $ticket['insurance_claim'] = $this->buildInsuranceClaimContext($ticket);
        
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

    private function mergeBreakdownContextIntoTicket(array &$ticket): void {
        $breakdownType = strtolower(trim((string) ($ticket['breakdown_type'] ?? '')));
        $breakdownReportId = trim((string) ($ticket['breakdown_report_id'] ?? ''));

        if ($breakdownType === '' || $breakdownReportId === '') {
            return;
        }

        $cacheKey = $breakdownType . ':' . $breakdownReportId;
        if (!array_key_exists($cacheKey, $this->breakdownContextCache)) {
            $this->breakdownContextCache[$cacheKey] = $this->resolveBreakdownContext($breakdownType, $breakdownReportId);
        }

        $context = $this->breakdownContextCache[$cacheKey];
        if (!is_array($context) || empty($context)) {
            return;
        }

        $ticket['breakdown_context'] = $context;

        if (!empty($context['vehicle_id'])) {
            $ticket['vehicle_id'] = (int) $context['vehicle_id'];
        }

        if (!empty($context['number_plate'])) {
            $ticket['number_plate'] = $context['number_plate'];
        }

        if (!empty($context['equipment_label']) && empty($ticket['machine_name'])) {
            $ticket['machine_name'] = $context['equipment_label'];
        }

        if (!empty($context['equipment_model']) && empty($ticket['machine_model_number'])) {
            $ticket['machine_model_number'] = $context['equipment_model'];
        }

        if (!empty($context['location']) && (empty($ticket['location']) || $ticket['location'] === 'Unknown Location')) {
            $ticket['location'] = $context['location'];
        }

        if (!empty($context['reporter_name']) && (empty($ticket['reported_by_name']) || $ticket['reported_by_name'] === 'Unknown')) {
            $ticket['reported_by_name'] = $context['reporter_name'];
        }

        if (!empty($context['reporter_name']) && empty($ticket['reporter_full_name'])) {
            $ticket['reporter_full_name'] = $context['reporter_name'];
        }

        if (!empty($context['route_garage_workflow_status'])) {
            $ticket['route_garage_workflow_status'] = $context['route_garage_workflow_status'];
        }

        if (!empty($context['route_approved_garage_name'])) {
            $ticket['route_approved_garage_name'] = $context['route_approved_garage_name'];
        }

        if (!empty($context['route_breakdown_numeric_id'])) {
            $ticket['route_breakdown_numeric_id'] = (int) $context['route_breakdown_numeric_id'];
        }

        if (array_key_exists('dangerous_cargo_present', $context)) {
            $ticket['dangerous_cargo_present'] = (int) $context['dangerous_cargo_present'];
            $ticket['is_dangerous_cargo'] = ((int) $context['dangerous_cargo_present']) === 1;
        }

        if (array_key_exists('dangerous_cargo_summary', $context)) {
            $ticket['dangerous_cargo_summary'] = $context['dangerous_cargo_summary'];
        }

        if (array_key_exists('dangerous_cargo_trip_id', $context)) {
            $ticket['dangerous_cargo_trip_id'] = $context['dangerous_cargo_trip_id'];
        }
    }

    private function resolveBreakdownContext(string $breakdownType, string $breakdownReportId): ?array {
        if ($breakdownType === 'vehicle_breakdown') {
            return $this->getVehicleBreakdownContext($breakdownReportId);
        }

        if ($breakdownType === 'route_breakdown') {
            return $this->getRouteBreakdownContext($breakdownReportId);
        }

        if ($breakdownType === 'machine_breakdown') {
            return $this->getMachineBreakdownContext($breakdownReportId);
        }

        return null;
    }

    private function getVehicleBreakdownContext(string $breakdownReportId): ?array {
        $conn = Database::getInstance()->getConnection();
        if (!$this->tableExists($conn, 'vehicle_breakdown')) {
            return null;
        }

        $stmt = $conn->prepare(
            "SELECT br.id,
                    br.breakdown_id,
                    br.vehicle_id,
                    br.driver_id,
                    br.breakdown_date,
                    br.breakdown_type,
                    br.severity,
                    br.description,
                    br.status,
                    v.number_plate,
                    v.model_number as vehicle_model_number,
                    v.vehicle_name,
                    u.full_name as reporter_name
             FROM vehicle_breakdown br
             LEFT JOIN vehicles v ON br.vehicle_id = v.id
             LEFT JOIN users u ON br.driver_id = u.id
             WHERE br.breakdown_id = ?
             LIMIT 1"
        );
        $stmt->execute([$breakdownReportId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        $equipmentLabel = trim((string) ($row['number_plate'] ?? ''));
        if ($equipmentLabel === '') {
            $equipmentLabel = trim((string) ($row['vehicle_name'] ?? ''));
        }
        if ($equipmentLabel === '') {
            $equipmentLabel = 'Vehicle #' . (int) ($row['vehicle_id'] ?? 0);
        }

        return [
            'source' => 'vehicle_breakdown',
            'id' => (int) ($row['id'] ?? 0),
            'breakdown_id' => $row['breakdown_id'] ?? null,
            'vehicle_id' => isset($row['vehicle_id']) ? (int) $row['vehicle_id'] : null,
            'equipment_label' => $equipmentLabel,
            'equipment_model' => $row['vehicle_model_number'] ?? ($row['vehicle_name'] ?? null),
            'reporter_name' => $row['reporter_name'] ?? null,
            'breakdown_datetime' => $row['breakdown_date'] ?? null,
            'breakdown_type' => $row['breakdown_type'] ?? null,
            'severity' => $row['severity'] ?? null,
            'description' => $row['description'] ?? null,
            'status' => $row['status'] ?? null,
            'number_plate' => $row['number_plate'] ?? null,
            'location' => null,
        ];
    }

    private function getRouteBreakdownContext(string $breakdownReportId): ?array {
        $conn = Database::getInstance()->getConnection();
        if (!$this->tableExists($conn, 'vehicle_breakdown_inroute')) {
            return null;
        }

        $hasDangerousSnapshotColumns = $this->columnExists($conn, 'vehicle_breakdown_inroute', 'dangerous_cargo_present')
            && $this->columnExists($conn, 'vehicle_breakdown_inroute', 'dangerous_cargo_summary')
            && $this->columnExists($conn, 'vehicle_breakdown_inroute', 'dangerous_cargo_trip_id');

        $hasGarageWorkflowTable = $this->tableExists($conn, 'route_breakdown_garage_workflow');
        $hasGaragesTable = $this->tableExists($conn, 'garages');

        $selectParts = [
            'rb.id',
            'rb.route_breakdown_id',
            'rb.vehicle_id',
            'rb.driver_id',
            'rb.breakdown_datetime',
            'rb.breakdown_location',
            'rb.breakdown_type',
            'rb.severity',
            'rb.description',
            'rb.status',
            'v.number_plate',
            'v.model_number as vehicle_model_number',
            'v.vehicle_name',
            'u.full_name as reporter_name',
        ];

        if ($hasDangerousSnapshotColumns) {
            $selectParts[] = 'rb.dangerous_cargo_present';
            $selectParts[] = 'rb.dangerous_cargo_summary';
            $selectParts[] = 'rb.dangerous_cargo_trip_id';
        }

        if ($hasGarageWorkflowTable) {
            $selectParts[] = 'rgw.workflow_status as route_garage_workflow_status';
            $selectParts[] = 'rgw.approved_garage_id';
            $selectParts[] = 'rgw.approved_at';
            $selectParts[] = 'rgw.garage_entry_at';
            $selectParts[] = 'rgw.completed_at';

            if ($hasGaragesTable) {
                $selectParts[] = 'g.name as route_approved_garage_name';
            }
        }

        $sql = 'SELECT ' . implode(', ', $selectParts)
            . ' FROM vehicle_breakdown_inroute rb'
            . ' LEFT JOIN vehicles v ON rb.vehicle_id = v.id'
            . ' LEFT JOIN users u ON rb.driver_id = u.id';

        if ($hasGarageWorkflowTable) {
            $sql .= ' LEFT JOIN route_breakdown_garage_workflow rgw ON rgw.route_breakdown_id = rb.id';
            if ($hasGaragesTable) {
                $sql .= ' LEFT JOIN garages g ON g.id = rgw.approved_garage_id';
            }
        }

        $sql .= ' WHERE rb.route_breakdown_id = ? LIMIT 1';

        $stmt = $conn->prepare($sql);
        $stmt->execute([$breakdownReportId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        $equipmentLabel = trim((string) ($row['number_plate'] ?? ''));
        if ($equipmentLabel === '') {
            $equipmentLabel = trim((string) ($row['vehicle_name'] ?? ''));
        }
        if ($equipmentLabel === '') {
            $equipmentLabel = 'Vehicle #' . (int) ($row['vehicle_id'] ?? 0);
        }

        return [
            'source' => 'route_breakdown',
            'id' => (int) ($row['id'] ?? 0),
            'route_breakdown_id' => $row['route_breakdown_id'] ?? null,
            'route_breakdown_numeric_id' => (int) ($row['id'] ?? 0),
            'vehicle_id' => isset($row['vehicle_id']) ? (int) $row['vehicle_id'] : null,
            'equipment_label' => $equipmentLabel,
            'equipment_model' => $row['vehicle_model_number'] ?? ($row['vehicle_name'] ?? null),
            'reporter_name' => $row['reporter_name'] ?? null,
            'breakdown_datetime' => $row['breakdown_datetime'] ?? null,
            'breakdown_type' => $row['breakdown_type'] ?? null,
            'severity' => $row['severity'] ?? null,
            'description' => $row['description'] ?? null,
            'status' => $row['status'] ?? null,
            'number_plate' => $row['number_plate'] ?? null,
            'location' => $row['breakdown_location'] ?? null,
            'route_garage_workflow_status' => $row['route_garage_workflow_status'] ?? null,
            'route_approved_garage_name' => $row['route_approved_garage_name'] ?? null,
            'dangerous_cargo_present' => isset($row['dangerous_cargo_present']) ? (int) $row['dangerous_cargo_present'] : 0,
            'dangerous_cargo_summary' => $row['dangerous_cargo_summary'] ?? null,
            'dangerous_cargo_trip_id' => $row['dangerous_cargo_trip_id'] ?? null,
        ];
    }

    private function getMachineBreakdownContext(string $breakdownReportId): ?array {
        $conn = Database::getInstance()->getConnection();
        if (!$this->tableExists($conn, 'machine_breakdown')) {
            return null;
        }

        $stmt = $conn->prepare(
            "SELECT mb.id,
                    mb.breakdown_id,
                    mb.machine_id,
                    mb.operator_id,
                    mb.breakdown_date,
                    mb.breakdown_type,
                    mb.severity,
                    mb.description,
                    mb.status,
                    m.model_number as machine_model_number,
                    m.machine_name,
                    m.location as machine_location,
                    u.full_name as reporter_name
             FROM machine_breakdown mb
             LEFT JOIN machines m ON mb.machine_id = m.id
             LEFT JOIN users u ON mb.operator_id = u.id
             WHERE mb.breakdown_id = ?
             LIMIT 1"
        );
        $stmt->execute([$breakdownReportId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        $equipmentLabel = trim((string) ($row['machine_name'] ?? ''));
        if ($equipmentLabel === '') {
            $equipmentLabel = 'Machine #' . (int) ($row['machine_id'] ?? 0);
        }

        return [
            'source' => 'machine_breakdown',
            'id' => (int) ($row['id'] ?? 0),
            'breakdown_id' => $row['breakdown_id'] ?? null,
            'machine_id' => isset($row['machine_id']) ? (int) $row['machine_id'] : null,
            'equipment_label' => $equipmentLabel,
            'equipment_model' => $row['machine_model_number'] ?? ($row['machine_name'] ?? null),
            'reporter_name' => $row['reporter_name'] ?? null,
            'breakdown_datetime' => $row['breakdown_date'] ?? null,
            'breakdown_type' => $row['breakdown_type'] ?? null,
            'severity' => $row['severity'] ?? null,
            'description' => $row['description'] ?? null,
            'status' => $row['status'] ?? null,
            'location' => $row['machine_location'] ?? null,
        ];
    }

    private function mergeRouteBreakdownDangerousContextIntoTicket(array &$ticket): void {
        $ticket['is_dangerous_cargo'] = $ticket['is_dangerous_cargo'] ?? false;
        $ticket['dangerous_cargo_present'] = $ticket['dangerous_cargo_present'] ?? 0;
        $ticket['dangerous_cargo_summary'] = $ticket['dangerous_cargo_summary'] ?? null;
        $ticket['dangerous_cargo_trip_id'] = $ticket['dangerous_cargo_trip_id'] ?? null;

        $breakdownType = strtolower(trim((string) ($ticket['breakdown_type'] ?? '')));
        $routeBreakdownCode = trim((string) ($ticket['breakdown_report_id'] ?? ''));

        if ($breakdownType !== 'route_breakdown' || $routeBreakdownCode === '') {
            return;
        }

        $cacheKey = 'route:' . $routeBreakdownCode;
        if (!array_key_exists($cacheKey, $this->routeBreakdownDangerousCache)) {
            $this->routeBreakdownDangerousCache[$cacheKey] = $this->resolveRouteBreakdownDangerousCargoContext([
                'breakdown_type' => 'route_breakdown',
                'breakdown_report_id' => $routeBreakdownCode,
            ]);
        }

        $dangerousContext = $this->routeBreakdownDangerousCache[$cacheKey];
        $isDangerous = !empty($dangerousContext['is_dangerous']);

        $ticket['is_dangerous_cargo'] = $isDangerous;
        $ticket['dangerous_cargo_present'] = $isDangerous ? 1 : 0;

        if ($isDangerous) {
            $ticket['dangerous_cargo_summary'] = $dangerousContext['summary'] ?? null;
            $ticket['dangerous_cargo_trip_id'] = $dangerousContext['trip_id'] ?? null;
        } else {
            $ticket['dangerous_cargo_summary'] = null;
            $ticket['dangerous_cargo_trip_id'] = null;
        }
    }

    private function buildInsuranceClaimContext(array $ticket): array {
        $defaultContext = [
            'asset_type' => null,
            'asset_id' => null,
            'asset_label' => null,
            'insurance_type' => null,
            'insurance_provider' => null,
            'insurance_provider_details' => null,
            'insurance_renew_interval_days' => null,
            'last_insurance_renew_date' => null,
            'last_insurance_renew_details' => null,
            'next_insurance_renew_date' => null,
            'eligible' => false,
            'eligibility_reason' => 'Insurance details are unavailable for this ticket.',
        ];

        $assetContext = $this->resolveTicketAssetForInsurance($ticket);
        if ($assetContext === null) {
            return $defaultContext;
        }

        $defaultContext['asset_type'] = $assetContext['asset_type'];
        $defaultContext['asset_id'] = $assetContext['asset_id'];
        $defaultContext['asset_label'] = $assetContext['asset_label'];

        $insuranceDetails = $this->getAssetInsuranceDetails(
            $assetContext['asset_type'],
            $assetContext['asset_id']
        );

        if ($insuranceDetails === null) {
            $defaultContext['eligibility_reason'] = 'Insurance details are unavailable for the linked asset.';
            return $defaultContext;
        }

        $context = array_merge($defaultContext, $insuranceDetails);
        $eligibility = $this->evaluateInsuranceEligibility($insuranceDetails);

        $context['eligible'] = $eligibility['eligible'];
        $context['eligibility_reason'] = $eligibility['reason'];

        return $context;
    }

    private function resolveTicketAssetForInsurance(array $ticket): ?array {
        $machineId = (int) ($ticket['machine_id'] ?? 0);
        if ($machineId > 0) {
            $machineLabel = trim((string) ($ticket['machine_name'] ?? ''));
            if ($machineLabel === '') {
                $machineLabel = trim((string) ($ticket['machine_model_number'] ?? ''));
            }

            if ($machineLabel === '') {
                $machineLabel = 'Machine #' . $machineId;
            }

            return [
                'asset_type' => 'machine',
                'asset_id' => $machineId,
                'asset_label' => $machineLabel,
            ];
        }

        $vehicleId = (int) ($ticket['vehicle_id'] ?? 0);
        if ($vehicleId <= 0 && isset($ticket['breakdown_context']) && is_array($ticket['breakdown_context'])) {
            $vehicleId = (int) ($ticket['breakdown_context']['vehicle_id'] ?? 0);
        }

        if ($vehicleId <= 0) {
            return null;
        }

        $vehicleLabel = trim((string) ($ticket['number_plate'] ?? ''));
        if ($vehicleLabel === '' && isset($ticket['breakdown_context']) && is_array($ticket['breakdown_context'])) {
            $vehicleLabel = trim((string) ($ticket['breakdown_context']['number_plate'] ?? ''));

            if ($vehicleLabel === '') {
                $vehicleLabel = trim((string) ($ticket['breakdown_context']['equipment_label'] ?? ''));
            }
        }

        if ($vehicleLabel === '') {
            $vehicleLabel = trim((string) ($ticket['machine_name'] ?? ''));
        }

        if ($vehicleLabel === '') {
            $vehicleLabel = 'Vehicle #' . $vehicleId;
        }

        return [
            'asset_type' => 'vehicle',
            'asset_id' => $vehicleId,
            'asset_label' => $vehicleLabel,
        ];
    }

    private function getAssetInsuranceDetails(string $assetType, int $assetId): ?array {
        if ($assetId <= 0 || ($assetType !== 'machine' && $assetType !== 'vehicle')) {
            return null;
        }

        $cacheKey = $assetType . ':' . $assetId;
        if (array_key_exists($cacheKey, $this->assetInsuranceCache)) {
            return $this->assetInsuranceCache[$cacheKey];
        }

        $tableName = $assetType === 'machine' ? 'machines' : 'vehicles';
        $db = Database::getInstance()->getConnection();

        if (!$this->tableExists($db, $tableName)) {
            $this->assetInsuranceCache[$cacheKey] = null;
            return null;
        }

        $requiredColumns = [
            'insurance_type',
            'insurance_provider',
            'insurance_provider_details',
            'insurance_renew_interval_days',
            'last_insurance_renew_date',
            'last_insurance_renew_details',
            'next_insurance_renew_date',
        ];

        foreach ($requiredColumns as $column) {
            if (!$this->columnExists($db, $tableName, $column)) {
                $this->assetInsuranceCache[$cacheKey] = null;
                return null;
            }
        }

        $stmt = $db->prepare(
            "SELECT insurance_type,
                    insurance_provider,
                    insurance_provider_details,
                    insurance_renew_interval_days,
                    last_insurance_renew_date,
                    last_insurance_renew_details,
                    next_insurance_renew_date
             FROM {$tableName}
             WHERE id = ?
             LIMIT 1"
        );
        $stmt->execute([$assetId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            $this->assetInsuranceCache[$cacheKey] = null;
            return null;
        }

        $insuranceDetails = [
            'insurance_type' => $row['insurance_type'] ?? null,
            'insurance_provider' => $row['insurance_provider'] ?? null,
            'insurance_provider_details' => $row['insurance_provider_details'] ?? null,
            'insurance_renew_interval_days' => isset($row['insurance_renew_interval_days'])
                ? (int) $row['insurance_renew_interval_days']
                : null,
            'last_insurance_renew_date' => $row['last_insurance_renew_date'] ?? null,
            'last_insurance_renew_details' => $row['last_insurance_renew_details'] ?? null,
            'next_insurance_renew_date' => $row['next_insurance_renew_date'] ?? null,
        ];

        $this->assetInsuranceCache[$cacheKey] = $insuranceDetails;
        return $insuranceDetails;
    }

    private function evaluateInsuranceEligibility(array $insuranceDetails): array {
        $insuranceType = trim((string) ($insuranceDetails['insurance_type'] ?? ''));
        $insuranceProvider = trim((string) ($insuranceDetails['insurance_provider'] ?? ''));

        if ($insuranceType === '' || $insuranceProvider === '') {
            return [
                'eligible' => false,
                'reason' => 'Insurance type or provider is not configured for this asset.',
            ];
        }

        $nextRenewDate = $this->parseInsuranceDate($insuranceDetails['next_insurance_renew_date'] ?? null);
        $lastRenewDate = $this->parseInsuranceDate($insuranceDetails['last_insurance_renew_date'] ?? null);
        $renewIntervalDays = (int) ($insuranceDetails['insurance_renew_interval_days'] ?? 0);

        if ($nextRenewDate === null && $lastRenewDate !== null && $renewIntervalDays > 0) {
            $nextRenewDate = $lastRenewDate->modify('+' . $renewIntervalDays . ' days');
        }

        if ($nextRenewDate === null) {
            return [
                'eligible' => false,
                'reason' => 'Next insurance renewal date is unavailable for eligibility validation.',
            ];
        }

        $today = new \DateTimeImmutable('today');
        if ($nextRenewDate < $today) {
            return [
                'eligible' => false,
                'reason' => 'Insurance policy expired on ' . $nextRenewDate->format('Y-m-d') . '.',
            ];
        }

        return [
            'eligible' => true,
            'reason' => 'Insurance policy is active until ' . $nextRenewDate->format('Y-m-d') . '.',
        ];
    }

    private function parseInsuranceDate($value): ?\DateTimeImmutable {
        $raw = trim((string) ($value ?? ''));
        if ($raw === '') {
            return null;
        }

        try {
            return new \DateTimeImmutable($raw);
        } catch (\Exception $e) {
            return null;
        }
    }

    private function deactivateAssignmentsForTicket(int $ticketId): void {
        if ($ticketId <= 0) {
            return;
        }

        try {
            $conn = Database::getInstance()->getConnection();
            $stmt = $conn->prepare(
                "UPDATE fault_ticket_assignments
                 SET status = 'Removed'
                 WHERE fault_ticket_id = ?
                   AND status = 'Active'"
            );
            $stmt->execute([$ticketId]);
        } catch (\Exception $e) {
            error_log('Failed to deactivate ticket assignments for insurance claim: ' . $e->getMessage());
        }
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

            $isInsuranceClaimTransition = $isStatusChangeOnly
                && isset($data['status'])
                && $data['status'] === FaultTicket::STATUS_INSURANCE_CLAIMED;

            if ($isInsuranceClaimTransition) {
                $userRole = $user['role'] ?? null;
                if (!in_array($userRole, ['Supervisor', 'Admin'], true)) {
                    return [
                        'success' => false,
                        'message' => 'Only Supervisors and Admins can submit insurance claims.'
                    ];
                }

                $claimableStatuses = [
                    FaultTicket::STATUS_OPEN,
                    FaultTicket::STATUS_ASSIGNED,
                    FaultTicket::STATUS_WAITING_BUDGET,
                    FaultTicket::STATUS_WAITING_PARTS,
                    FaultTicket::STATUS_PARTS_APPROVED,
                ];

                if (!in_array($ticket['status'], $claimableStatuses, true)) {
                    return [
                        'success' => false,
                        'message' => 'Insurance claims can only be submitted before repair work begins.'
                    ];
                }

                $ticketForInsurance = $ticket;
                $this->mergeBreakdownContextIntoTicket($ticketForInsurance);
                $insuranceClaimContext = $this->buildInsuranceClaimContext($ticketForInsurance);

                if (empty($insuranceClaimContext['eligible'])) {
                    return [
                        'success' => false,
                        'message' => $insuranceClaimContext['eligibility_reason'] ?? 'This ticket is not eligible for insurance claim processing.'
                    ];
                }

                $isValidStatusTransition = true;
            }

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

                if (isset($updateData['status']) && $updateData['status'] === FaultTicket::STATUS_INSURANCE_CLAIMED) {
                    $this->deactivateAssignmentsForTicket((int) $id);
                }

                // Keep machine breakdown report fields in sync so MO list reflects edits immediately.
                $this->syncMachineBreakdownDetailsFromTicket($ticket, $updateData);
                
                // Keep linked breakdown status aligned when ticket reaches a terminal workflow state.
                if (
                    isset($data['status'])
                    && in_array($data['status'], [FaultTicket::STATUS_RESOLVED, FaultTicket::STATUS_INSURANCE_CLAIMED], true)
                ) {
                    $logFile = __DIR__ . '/../../logs/breakdown_sync.log';
                    file_put_contents($logFile, date('Y-m-d H:i:s') . " - update() calling updateBreakdownReportStatus\n", FILE_APPEND);
                    file_put_contents($logFile, "  Ticket breakdown_report_id: " . ($ticket['breakdown_report_id'] ?? 'NULL') . "\n", FILE_APPEND);
                    file_put_contents($logFile, "  Ticket breakdown_type: " . ($ticket['breakdown_type'] ?? 'NULL') . "\n", FILE_APPEND);
                    $this->updateBreakdownReportStatus($ticket, $data['status']);
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
     * Sync editable machine breakdown fields from fault ticket updates.
     */
    private function syncMachineBreakdownDetailsFromTicket($ticket, $updateData) {
        $breakdownReportId = trim((string) ($ticket['breakdown_report_id'] ?? ''));
        $breakdownType = strtolower(trim((string) ($ticket['breakdown_type'] ?? '')));

        if ($breakdownReportId === '') {
            return;
        }

        $isMachineBreakdown = $breakdownType === 'machine_breakdown' || strpos($breakdownReportId, 'MBD-') === 0;
        if (!$isMachineBreakdown) {
            return;
        }

        $fields = [];
        $params = [];

        if (array_key_exists('description', $updateData) && $updateData['description'] !== '') {
            $fields[] = 'description = ?';
            $params[] = $updateData['description'];
        }

        if (array_key_exists('priority', $updateData) && $updateData['priority'] !== '') {
            $fields[] = 'severity = ?';
            $params[] = $updateData['priority'];
        }

        if (empty($fields)) {
            return;
        }

        try {
            $db = Database::getInstance()->getConnection();
            $params[] = $breakdownReportId;

            $sql = 'UPDATE machine_breakdown SET ' . implode(', ', $fields) . ' WHERE breakdown_id = ?';
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
        } catch (\Exception $e) {
            error_log('Error syncing machine breakdown details from fault ticket: ' . $e->getMessage());
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

    private function resolveRouteBreakdownDangerousCargoContext(array $data): array {
        $default = [
            'is_dangerous' => false,
            'summary' => null,
            'trip_id' => null,
        ];

        $breakdownType = strtolower(trim((string) ($data['breakdown_type'] ?? '')));
        $routeBreakdownCode = trim((string) ($data['breakdown_report_id'] ?? ''));

        if ($breakdownType !== 'route_breakdown' || $routeBreakdownCode === '') {
            return $default;
        }

        $db = Database::getInstance()->getConnection();

        if (!$this->tableExists($db, 'vehicle_breakdown_inroute')) {
            return $default;
        }

        $hasDangerousSnapshotColumns = $this->columnExists($db, 'vehicle_breakdown_inroute', 'dangerous_cargo_present')
            && $this->columnExists($db, 'vehicle_breakdown_inroute', 'dangerous_cargo_summary')
            && $this->columnExists($db, 'vehicle_breakdown_inroute', 'dangerous_cargo_trip_id');

        if ($hasDangerousSnapshotColumns) {
            $stmt = $db->prepare(
                "SELECT route_breakdown_id,
                        vehicle_id,
                        dangerous_cargo_present,
                        dangerous_cargo_summary,
                        dangerous_cargo_trip_id
                 FROM vehicle_breakdown_inroute
                 WHERE route_breakdown_id = ?
                 LIMIT 1"
            );
            $stmt->execute([$routeBreakdownCode]);
            $routeBreakdown = $stmt->fetch(PDO::FETCH_ASSOC);
        } else {
            $stmt = $db->prepare(
                "SELECT route_breakdown_id, vehicle_id
                 FROM vehicle_breakdown_inroute
                 WHERE route_breakdown_id = ?
                 LIMIT 1"
            );
            $stmt->execute([$routeBreakdownCode]);
            $routeBreakdown = $stmt->fetch(PDO::FETCH_ASSOC);
        }

        if (!$routeBreakdown) {
            return $default;
        }

        if ($hasDangerousSnapshotColumns && (int) ($routeBreakdown['dangerous_cargo_present'] ?? 0) === 1) {
            return [
                'is_dangerous' => true,
                'summary' => $routeBreakdown['dangerous_cargo_summary'] ?? null,
                'trip_id' => $routeBreakdown['dangerous_cargo_trip_id'] ?? null,
            ];
        }

        $vehicleId = (int) ($routeBreakdown['vehicle_id'] ?? 0);
        if ($vehicleId <= 0) {
            return $default;
        }

        $tripService = new TripService();
        $fallbackContext = $tripService->getDangerousCargoContextForVehicle($vehicleId);

        if (!empty($fallbackContext['has_dangerous_cargo'])) {
            return [
                'is_dangerous' => true,
                'summary' => $fallbackContext['dangerous_cargo_summary'] ?? null,
                'trip_id' => $fallbackContext['dangerous_cargo_trip_id'] ?? null,
            ];
        }

        return $default;
    }

    private function tableExists(PDO $db, string $table): bool {
        $cacheKey = "table:{$table}";
        if (array_key_exists($cacheKey, $this->schemaCheckCache)) {
            return $this->schemaCheckCache[$cacheKey];
        }

        $stmt = $db->prepare(
            'SELECT COUNT(*)
             FROM information_schema.tables
             WHERE table_schema = DATABASE()
               AND table_name = ?'
        );
        $stmt->execute([$table]);
        $exists = ((int) $stmt->fetchColumn()) > 0;
        $this->schemaCheckCache[$cacheKey] = $exists;

        return $exists;
    }

    private function columnExists(PDO $db, string $table, string $column): bool {
        $cacheKey = "column:{$table}.{$column}";
        if (array_key_exists($cacheKey, $this->schemaCheckCache)) {
            return $this->schemaCheckCache[$cacheKey];
        }

        if (!$this->tableExists($db, $table)) {
            $this->schemaCheckCache[$cacheKey] = false;
            return false;
        }

        $stmt = $db->prepare(
            'SELECT COUNT(*)
             FROM information_schema.columns
             WHERE table_schema = DATABASE()
               AND table_name = ?
               AND column_name = ?'
        );
        $stmt->execute([$table, $column]);
        $exists = ((int) $stmt->fetchColumn()) > 0;
        $this->schemaCheckCache[$cacheKey] = $exists;

        return $exists;
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
