<?php

require_once __DIR__ . '/../models/SparepartUsage.php';
require_once __DIR__ . '/../models/Product.php';

class SparepartUsageService {
    private $usageModel;
    private $productModel;
    
    public function __construct() {
        $this->usageModel = new SparepartUsage();
        $this->productModel = new Product();
    }
    
    /**
     * Issue spareparts and create usage record
     * This automatically reduces the quantity in the catalog
     */
    public function issuePart($data) {
        try {
            // Validate required fields
            $requiredFields = ['sparepart_id', 'sparepart_name', 'quantity_issued', 'issue_date'];
            foreach ($requiredFields as $field) {
                if (!isset($data[$field]) || $data[$field] === '' || $data[$field] === null) {
                    return [
                        'status' => 'error',
                        'message' => "Missing required field: {$field}"
                    ];
                }
            }
            
            $sparepartId = $data['sparepart_id'];
            $quantityIssued = (int)$data['quantity_issued'];
            
            if ($quantityIssued <= 0) {
                return [
                    'status' => 'error',
                    'message' => 'Quantity issued must be greater than 0'
                ];
            }
            
            // Get current product from catalog
            $product = $this->productModel->findOne(['sparepart_id' => $sparepartId, 'is_active' => 1]);
            
            if (!$product) {
                return [
                    'status' => 'error',
                    'message' => 'Sparepart not found in catalog'
                ];
            }
            
            $currentQuantity = (int)$product['quantity'];
            
            // Check if enough quantity is available
            if ($currentQuantity < $quantityIssued) {
                return [
                    'status' => 'error',
                    'message' => "Insufficient quantity. Available: {$currentQuantity}, Requested: {$quantityIssued}"
                ];
            }
            
            // Calculate new quantity
            $newQuantity = $currentQuantity - $quantityIssued;
            
            // Update product quantity and last issue date in catalog
            $updateResult = $this->productModel->update($product['id'], [
                'quantity' => $newQuantity,
                'last_issue_date' => $data['issue_date']
            ]);
            
            if (!$updateResult) {
                return [
                    'status' => 'error',
                    'message' => 'Failed to update sparepart quantity in catalog'
                ];
            }
            
            // Create usage record
            $usageData = [
                'sparepart_id' => $sparepartId,
                'sparepart_name' => $data['sparepart_name'],
                'quantity_issued' => $quantityIssued,
                'issue_date' => $data['issue_date'],
                'issued_by' => $data['issued_by'] ?? null,
                'machine_id' => $data['machine_id'] ?? null,
                'vehicle_id' => $data['vehicle_id'] ?? null,
                'notes' => $data['notes'] ?? null
            ];
            
            $usageId = $this->usageModel->create($usageData);
            
            return [
                'status' => 'success',
                'message' => "Successfully issued {$quantityIssued} unit(s). Remaining quantity: {$newQuantity}",
                'data' => [
                    'usage_id' => $usageId,
                    'previous_quantity' => $currentQuantity,
                    'new_quantity' => $newQuantity,
                    'quantity_issued' => $quantityIssued
                ]
            ];
            
        } catch (Exception $e) {
            error_log("Error in issuePart: " . $e->getMessage());
            return [
                'status' => 'error',
                'message' => 'Failed to issue sparepart: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Get all usage records with pagination
     */
    public function getAllUsage($page = 1, $perPage = 50) {
        try {
            $usage = $this->usageModel->getAllUsage($page, $perPage);
            
            return [
                'status' => 'success',
                'data' => [
                    'usage' => $usage,
                    'page' => $page,
                    'per_page' => $perPage
                ]
            ];
        } catch (Exception $e) {
            return [
                'status' => 'error',
                'message' => 'Failed to fetch usage records: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Get usage history for a specific sparepart
     */
    public function getUsageHistory($sparepartId, $limit = 50) {
        try {
            $history = $this->usageModel->getUsageHistory($sparepartId, $limit);
            $stats = $this->usageModel->getUsageStats($sparepartId);
            
            return [
                'status' => 'success',
                'data' => [
                    'history' => $history,
                    'stats' => $stats
                ]
            ];
        } catch (Exception $e) {
            return [
                'status' => 'error',
                'message' => 'Failed to fetch usage history: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Get available quantity for a sparepart
     */
    public function getAvailableQuantity($sparepartId) {
        try {
            $product = $this->productModel->findOne(['sparepart_id' => $sparepartId, 'is_active' => 1]);
            
            if (!$product) {
                return [
                    'status' => 'error',
                    'message' => 'Sparepart not found'
                ];
            }
            
            return [
                'status' => 'success',
                'data' => [
                    'sparepart_id' => $sparepartId,
                    'sparepart_name' => $product['name'],
                    'available_quantity' => (int)$product['quantity']
                ]
            ];
        } catch (Exception $e) {
            return [
                'status' => 'error',
                'message' => 'Failed to get available quantity: ' . $e->getMessage()
            ];
        }
    }
}
