<?php

require_once __DIR__ . '/../services/FuelLogService.php';
require_once __DIR__ . '/../helpers/Response.php';

class FuelLogController {
    private $fuelLogService;

    public function __construct() {
        $this->fuelLogService = new FuelLogService();
    }

    public function index() {
        try {
            $filters = [];

            if (isset($_GET['vehicle_registration'])) {
                $filters['vehicle_registration'] = $_GET['vehicle_registration'];
            }

            if (isset($_GET['driver_id'])) {
                $filters['driver_id'] = $_GET['driver_id'];
            }

            $logs = $this->fuelLogService->getAllLogs($filters);

            Response::json([
                'success' => true,
                'data'    => ['fuel_logs' => $logs],
                'count'   => count($logs),
            ]);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    public function show() {
        try {
            $fuel_log_id = $_GET['id'] ?? null;

            if (!$fuel_log_id) {
                Response::error('Fuel log ID is required', 400);
                return;
            }

            $log = $this->fuelLogService->getLogById($fuel_log_id);

            Response::json([
                'success' => true,
                'data'    => ['fuel_log' => $log],
            ]);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 404);
        }
    }

    public function create() {
        try {
            // Handle both JSON and FormData with file uploads
            $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
            
            if (strpos($contentType, 'multipart/form-data') !== false) {
                // FormData submission with potential file upload
                $data = $_POST;
                $files = $_FILES;
                
                // Handle bill image upload
                if (!empty($files['bill_image']) && isset($files['bill_image']['error'])) {
                    if ($files['bill_image']['error'] !== UPLOAD_ERR_NO_FILE) {
                        if ($files['bill_image']['error'] !== UPLOAD_ERR_OK) {
                            throw new Exception('Failed to upload bill image');
                        }

                        $uploadDir = __DIR__ . '/../../uploads/fuel-bills/';
                        if (!is_dir($uploadDir)) {
                            mkdir($uploadDir, 0755, true);
                        }

                        $extension = pathinfo($files['bill_image']['name'], PATHINFO_EXTENSION);
                        $filename = 'bill_' . uniqid() . '_' . time() . '.' . $extension;
                        $filePath = $uploadDir . $filename;

                        if (!move_uploaded_file($files['bill_image']['tmp_name'], $filePath)) {
                            throw new Exception('Unable to store bill image');
                        }

                        $data['bill_image'] = 'uploads/fuel-bills/' . $filename;
                    }
                }
            } else {
                // JSON submission
                $data = json_decode(file_get_contents('php://input'), true);
            }

            if (!$data) {
                Response::error('Invalid request data', 400);
                return;
            }

            $log = $this->fuelLogService->createLog($data);

            Response::json([
                'success' => true,
                'message' => 'Fuel log created successfully',
                'data'    => ['fuel_log' => $log],
            ], 201);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }

    public function update() {
        try {
            $fuel_log_id = $_GET['id'] ?? null;

            if (!$fuel_log_id) {
                Response::error('Fuel log ID is required', 400);
                return;
            }

            $data = json_decode(file_get_contents('php://input'), true);

            if (!$data) {
                Response::error('Invalid request data', 400);
                return;
            }

            $log = $this->fuelLogService->updateLog($fuel_log_id, $data);

            Response::json([
                'success' => true,
                'message' => 'Fuel log updated successfully',
                'data'    => ['fuel_log' => $log],
            ]);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }

    public function delete() {
        try {
            $fuel_log_id = $_GET['id'] ?? null;

            if (!$fuel_log_id) {
                Response::error('Fuel log ID is required', 400);
                return;
            }

            $this->fuelLogService->deleteLog($fuel_log_id);

            Response::json([
                'success' => true,
                'message' => 'Fuel log deleted successfully',
            ]);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }
}
