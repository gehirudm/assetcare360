<?php

require_once __DIR__ . '/../models/SparepartAddition.php';
require_once __DIR__ . '/../helpers/Response.php';

class SparepartAdditionController {
    private $model;
    
    public function __construct() {
        $this->model = new SparepartAddition();
    }
    
    /**
     * Get recent additions
     */
    public function getRecent() {
        try {
            $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
            $perPage = isset($_GET['per_page']) ? (int)$_GET['per_page'] : 20;
            
            $additions = $this->model->getRecentAdditions($page, $perPage);
            
            Response::success([
                'additions' => $additions,
                'page' => $page,
                'per_page' => $perPage
            ]);
        } catch (Exception $e) {
            Response::error('Failed to fetch additions: ' . $e->getMessage());
        }
    }
    
    /**
     * Create a new addition record
     */
    public function create() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            // Validate required fields
            $required = ['sparepart_id', 'sparepart_name', 'quantity_added', 'previous_stock', 'new_stock', 'received_date'];
            foreach ($required as $field) {
                if (!isset($data[$field])) {
                    Response::error("Missing required field: $field", 400);
                    return;
                }
            }
            
            // Set added_by from session or default
            $data['added_by'] = $_SESSION['user']['username'] ?? 'admin';
            
            $id = $this->model->create($data);
            
            if ($id) {
                Response::success(['id' => $id, 'message' => 'Addition recorded successfully']);
            } else {
                Response::error('Failed to record addition');
            }
        } catch (Exception $e) {
            Response::error('Failed to create addition: ' . $e->getMessage());
        }
    }
    
    /**
     * Get additions for a specific sparepart
     */
    public function getBySparepart() {
        try {
            $sparepartId = $_GET['id'] ?? null;
            if (!$sparepartId) {
                Response::error('Sparepart ID is required', 400);
                return;
            }

            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
            
            $additions = $this->model->getAdditionsBySparepart($sparepartId, $limit);
            $stats = $this->model->getTotalAddedBySparepart($sparepartId);
            
            Response::success([
                'additions' => $additions,
                'stats' => $stats
            ]);
        } catch (Exception $e) {
            Response::error('Failed to fetch sparepart additions: ' . $e->getMessage());
        }
    }

    /**
     * Update an addition by ID
     */
    public function update() {
        try {
            $id = $_GET['id'] ?? null;
            if (!$id) {
                Response::error('Addition ID is required', 400);
                return;
            }

            // Check if addition exists
            $addition = $this->model->findById($id);
            if (!$addition) {
                Response::error('Addition record not found', 404);
                return;
            }
            
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (empty($data)) {
                Response::error('No data provided', 400);
                return;
            }
            
            // Remove id from data to avoid updating the primary key
            unset($data['id']);
            
            $result = $this->model->update($id, $data);
            
            if ($result) {
                Response::success(['message' => 'Addition record updated successfully']);
            } else {
                Response::error('Failed to update addition record');
            }
        } catch (Exception $e) {
            Response::error('Failed to update addition: ' . $e->getMessage());
        }
    }

    /**
     * Delete an addition by ID
     */
    public function delete() {
        try {
            $id = $_GET['id'] ?? null;
            if (!$id) {
                Response::error('Addition ID is required', 400);
                return;
            }

            // Check if addition exists
            $addition = $this->model->findById($id);
            if (!$addition) {
                Response::error('Addition record not found', 404);
                return;
            }
            
            $result = $this->model->delete($id);
            
            if ($result) {
                Response::success(['message' => 'Addition record deleted successfully']);
            } else {
                Response::error('Failed to delete addition record');
            }
        } catch (Exception $e) {
            Response::error('Failed to delete addition: ' . $e->getMessage());
        }
    }
}
