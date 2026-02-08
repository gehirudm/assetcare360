<?php

require_once __DIR__ . '/../services/SparepartUsageService.php';
require_once __DIR__ . '/../helpers/Response.php';

class SparepartUsageController {
    private $service;
    
    public function __construct() {
        $this->service = new SparepartUsageService();
    }
    
    public function create() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            session_start();
            if (isset($_SESSION['user_id'])) {
                $data['issued_by'] = $_SESSION['user_id'];
            }
            $result = $this->service->issuePart($data);
            if ($result['status'] === 'success') {
                return Response::json($result, 201);
            } else {
                return Response::json($result, 400);
            }
        } catch (Exception $e) {
            error_log("Error creating usage record: " . $e->getMessage());
            return Response::json([
                'status' => 'error',
                'message' => 'Failed to create usage record: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function getAll() {
        try {
            $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
            $perPage = isset($_GET['per_page']) ? (int)$_GET['per_page'] : 50;
            $result = $this->service->getAllUsage($page, $perPage);
            return Response::json($result);
        } catch (Exception $e) {
            error_log("Error fetching usage records: " . $e->getMessage());
            return Response::json([
                'status' => 'error',
                'message' => 'Failed to fetch usage records'
            ], 500);
        }
    }
    
    public function getHistory() {
        try {
            $sparepartId = $_GET['id'] ?? $_GET['sparepart_id'] ?? null;
            if (!$sparepartId) {
                return Response::json([
                    'status' => 'error',
                    'message' => 'Sparepart ID is required'
                ], 400);
            }
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
            $result = $this->service->getUsageHistory($sparepartId, $limit);
            return Response::json($result);
        } catch (Exception $e) {
            error_log("Error fetching usage history: " . $e->getMessage());
            return Response::json([
                'status' => 'error',
                'message' => 'Failed to fetch usage history'
            ], 500);
        }
    }
    
    public function getStats() {
        try {
            $sparepartId = $_GET['id'] ?? $_GET['sparepart_id'] ?? null;
            if (!$sparepartId) {
                return Response::json([
                    'status' => 'error',
                    'message' => 'Sparepart ID is required'
                ], 400);
            }
            $result = $this->service->getUsageHistory($sparepartId, 1);
            if ($result['status'] === 'success' && isset($result['data']['stats'])) {
                return Response::json([
                    'status' => 'success',
                    'data' => $result['data']['stats']
                ]);
            }
            return Response::json($result);
        } catch (Exception $e) {
            error_log("Error fetching usage stats: " . $e->getMessage());
            return Response::json([
                'status' => 'error',
                'message' => 'Failed to fetch usage stats'
            ], 500);
        }
    }
    
    public function getAvailableQuantity() {
        try {
            $sparepartId = $_GET['id'] ?? $_GET['sparepart_id'] ?? null;
            if (!$sparepartId) {
                return Response::json([
                    'status' => 'error',
                    'message' => 'Sparepart ID is required'
                ], 400);
            }
            $result = $this->service->getAvailableQuantity($sparepartId);
            return Response::json($result);
        } catch (Exception $e) {
            error_log("Error getting available quantity: " . $e->getMessage());
            return Response::json([
                'status' => 'error',
                'message' => 'Failed to get available quantity'
            ], 500);
        }
    }
}
