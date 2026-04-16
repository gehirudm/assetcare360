<?php

require_once __DIR__ . '/../models/SparepartAddition.php';
require_once __DIR__ . '/../models/Product.php';
require_once __DIR__ . '/../helpers/Response.php';

class SparepartAdditionController {
    private $model;
    private $productModel;
    
    public function __construct() {
        $this->model = new SparepartAddition();
        $this->productModel = new Product();
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
     * Also updates the spare part catalog quantity automatically
     */
    public function create() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            // Validate required fields
            $required = ['sparepart_id', 'sparepart_name', 'quantity_added', 'received_date'];
            foreach ($required as $field) {
                if (!isset($data[$field])) {
                    Response::error("Missing required field: $field", 400);
                    return;
                }
            }
            
            $sparepartId = $data['sparepart_id'];
            $quantityAdded = (int)$data['quantity_added'];

            if (!preg_match('/^SPR-\d+$/', trim((string)$sparepartId))) {
                Response::error('Invalid sparepart ID format', 400);
                return;
            }

            $data['sparepart_id'] = trim((string)$sparepartId);
            $data['sparepart_name'] = trim((string)$data['sparepart_name']);
            
            if ($quantityAdded <= 0) {
                Response::error('Quantity added must be greater than 0', 400);
                return;
            }
            
            // Check if spare part exists in catalog
            $product = $this->productModel->findOne(['sparepart_id' => $sparepartId, 'is_active' => 1]);
            
            if (!$product) {
                // Auto-create the spare part in catalog
                $newSparepartData = [
                    'sparepart_id' => $sparepartId,
                    'name' => $data['sparepart_name'],
                    'description' => $data['notes'] ?? null,
                    'category' => $data['category'] ?? 'General',
                    'quantity' => $quantityAdded,
                    'unit_price' => 0.00,
                    'reorder_level' => 10,
                    'location' => $data['location'] ?? null,
                    'is_active' => 1,
                    'compatible_machines' => $data['compatible_machines'] ?? null,
                    'compatible_vehicles' => $data['compatible_vehicles'] ?? null
                ];
                
                $productDbId = $this->productModel->create($newSparepartData);
                
                if (!$productDbId) {
                    Response::error('Failed to create spare part in catalog', 500);
                    return;
                }
                
                // Set previous and new stock for the addition record
                $data['previous_stock'] = 0;
                $data['new_stock'] = $quantityAdded;
            } else {
                // Update existing spare part quantity
                $previousStock = (int)$product['quantity'];
                $newStock = $previousStock + $quantityAdded;
                
                $updateResult = $this->productModel->updateQuantity($product['id'], $quantityAdded, 'add');
                
                if (!$updateResult) {
                    Response::error('Failed to update spare part quantity in catalog', 500);
                    return;
                }
                
                // Set previous and new stock for the addition record
                $data['previous_stock'] = $previousStock;
                $data['new_stock'] = $newStock;
            }
            
            // Set added_by from session or default
            $data['added_by'] = $_SESSION['user']['username'] ?? 'admin';
            
            $id = $this->model->create($data);
            
            if ($id) {
                Response::success([
                    'id' => $id, 
                    'message' => 'Addition recorded successfully',
                    'previous_stock' => $data['previous_stock'],
                    'new_stock' => $data['new_stock'],
                    'quantity_added' => $quantityAdded,
                    'auto_created_part' => !$product
                ]);
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
