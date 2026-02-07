<?php

require_once __DIR__ . '/../models/Product.php';

class ProductService {
    private $productModel;
    
    public function __construct() {
        $this->productModel = new Product();
    }
    
    /**
     * Get all products with optional filters
     */
    public function getAllProducts($filters = []) {
        try {
            $conditions = ['is_active' => 1];
            
            if (!empty($filters['category'])) {
                $conditions['category'] = $filters['category'];
            }
            
            $products = $this->productModel->findAll($conditions, 'name ASC');
            
            return [
                'status' => 'success',
                'data' => ['products' => $products],
                'message' => 'Products retrieved successfully'
            ];
        } catch (Exception $e) {
            return [
                'status' => 'error',
                'message' => 'Failed to retrieve products: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Get product by ID (database ID or product_id like SPR-001)
     */
    public function getProductById($id) {
        try {
            // Check if it's a sparepart_id (starts with SPR-) or database ID (numeric)
            if (preg_match('/^SPR-\d+$/', $id)) {
                // It's a sparepart_id like SPR-001
                $product = $this->productModel->findOne(['sparepart_id' => $id, 'is_active' => 1]);
            } else {
                // It's a database ID
                $product = $this->productModel->findById($id);
            }
            
            if (!$product) {
                return [
                    'status' => 'error',
                    'message' => 'Product not found'
                ];
            }
            
            return [
                'status' => 'success',
                'data' => $product,
                'message' => 'Product retrieved successfully'
            ];
        } catch (Exception $e) {
            return [
                'status' => 'error',
                'message' => 'Failed to retrieve product: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Get next product ID
     */
    public function getNextProductId() {
        try {
            $nextId = $this->productModel->generateProductId();
            
            return [
                'status' => 'success',
                'data' => ['next_id' => $nextId],
                'message' => 'Next product ID generated successfully'
            ];
        } catch (Exception $e) {
            return [
                'status' => 'error',
                'message' => 'Failed to generate product ID: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Create new product
     */
    public function createProduct($data) {
        try {
            // Validate required fields
            $required = ['name', 'category', 'quantity', 'location', 'supplier'];
            foreach ($required as $field) {
                if (empty($data[$field])) {
                    return [
                        'status' => 'error',
                        'message' => ucfirst($field) . ' is required'
                    ];
                }
            }
            
            // Auto-generate sparepart_id if not provided
            if (empty($data['sparepart_id'])) {
                $data['sparepart_id'] = $this->productModel->generateProductId();
            }
            
            // Set default values
            if (!isset($data['unit_price'])) {
                $data['unit_price'] = 0.00;
            }
            if (!isset($data['reorder_level'])) {
                $data['reorder_level'] = 10;
            }
            if (!isset($data['is_active'])) {
                $data['is_active'] = 1;
            }
            
            // Create the product
            $productId = $this->productModel->create($data);
            
            if ($productId) {
                return [
                    'status' => 'success',
                    'data' => ['id' => $productId, 'sparepart_id' => $data['sparepart_id']],
                    'message' => 'Product created successfully'
                ];
            }
            
            return [
                'status' => 'error',
                'message' => 'Failed to create product'
            ];
        } catch (Exception $e) {
            return [
                'status' => 'error',
                'message' => 'Failed to create product: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Update product
     */
    public function updateProduct($id, $data) {
        try {
            $product = $this->productModel->findById($id);
            
            if (!$product) {
                return [
                    'status' => 'error',
                    'message' => 'Product not found'
                ];
            }
            
            // Don't allow updating sparepart_id
            unset($data['sparepart_id']);
            
            $success = $this->productModel->update($id, $data);
            
            if ($success) {
                return [
                    'status' => 'success',
                    'data' => ['id' => $id],
                    'message' => 'Product updated successfully'
                ];
            }
            
            return [
                'status' => 'error',
                'message' => 'Failed to update product'
            ];
        } catch (Exception $e) {
            return [
                'status' => 'error',
                'message' => 'Failed to update product: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Delete product (supports both database ID and product_id)
     */
    public function deleteProduct($id) {
        try {
            // Check if it's a product_id (starts with SPR-) or database ID (numeric)
            if (preg_match('/^SPR-\d+$/', $id)) {
                // It's a product_id like SPR-001
                $product = $this->productModel->findOne(['product_id' => $id, 'is_active' => 1]);
                if ($product) {
                    $id = $product['id']; // Use database ID for update
                }
            } else {
                // It's a database ID
                $product = $this->productModel->findById($id);
            }
            
            if (!$product) {
                return [
                    'status' => 'error',
                    'message' => 'Product not found'
                ];
            }
            
            // Soft delete by setting is_active to 0
            $success = $this->productModel->update($id, ['is_active' => 0]);
            
            if ($success) {
                return [
                    'status' => 'success',
                    'message' => 'Product deleted successfully'
                ];
            }
            
            return [
                'status' => 'error',
                'message' => 'Failed to delete product'
            ];
        } catch (Exception $e) {
            return [
                'status' => 'error',
                'message' => 'Failed to delete product: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Update product quantity
     */
    public function updateQuantity($id, $quantity, $operation = 'set') {
        try {
            $product = $this->productModel->findById($id);
            
            if (!$product) {
                return [
                    'status' => 'error',
                    'message' => 'Product not found'
                ];
            }
            
            $success = $this->productModel->updateQuantity($id, $quantity, $operation);
            
            if ($success) {
                return [
                    'status' => 'success',
                    'message' => 'Quantity updated successfully'
                ];
            }
            
            return [
                'status' => 'error',
                'message' => 'Failed to update quantity'
            ];
        } catch (Exception $e) {
            return [
                'status' => 'error',
                'message' => 'Failed to update quantity: ' . $e->getMessage()
            ];
        }
    }
}
