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

            if (isset($_GET['limit'])) {
                $filters['limit'] = $_GET['limit'];
            }

            $logs = $this->fuelLogService->getAllLogs($filters);

            Response::json([
                'success' => true,
                'data' => ['fuel_logs' => $logs],
                'count' => count($logs)
            ]);
        } catch (Exception $e) {
            Response::json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function show() {
        try {
            $fuelLogId = $_GET['id'] ?? null;
            if (!$fuelLogId) {
                Response::json([
                    'success' => false,
                    'message' => 'Fuel log ID is required'
                ], 400);
                return;
            }

            $log = $this->fuelLogService->getByFuelLogId($fuelLogId);

            Response::json([
                'success' => true,
                'data' => ['fuel_log' => $log]
            ]);
        } catch (Exception $e) {
            Response::json([
                'success' => false,
                'message' => $e->getMessage()
            ], 404);
        }
    }

    public function store() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            if (!$data) {
                Response::json([
                    'success' => false,
                    'message' => 'Invalid request data'
                ], 400);
                return;
            }

            $log = $this->fuelLogService->createLog($data);

            Response::json([
                'success' => true,
                'message' => 'Fuel log created successfully',
                'data' => ['fuel_log' => $log]
            ], 201);
        } catch (Exception $e) {
            Response::json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    public function nextId() {
        try {
            $nextId = $this->fuelLogService->getNextFuelLogId();

            Response::json([
                'success' => true,
                'data' => ['next_fuel_log_id' => $nextId]
            ]);
        } catch (Exception $e) {
            Response::json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
