<?php

require_once __DIR__ . '/../models/Product.php';

class ProductService {
    private $productModel;
    private const ALLOWED_CATEGORIES = ['machines', 'vehicles'];
    private const SPAREPART_ID_PATTERN = '/^SPR-\d+$/';
    
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
            
            $products = $this->productModel->findAll($conditions, 'sparepart_id ASC');
            
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
            $name = trim((string)($data['name'] ?? ''));
            $category = strtolower(trim((string)($data['category'] ?? '')));

            if ($name === '') {
                return [
                    'status' => 'error',
                    'message' => 'Name is required'
                ];
            }

            if (!in_array($category, self::ALLOWED_CATEGORIES, true)) {
                return [
                    'status' => 'error',
                    'message' => 'Category must be either machines or vehicles'
                ];
            }

            $thresholdInput = $data['low_stock_threshold'] ?? $data['reorder_level'] ?? null;
            $threshold = $this->normalizeThreshold($thresholdInput);

            if ($threshold === null) {
                return [
                    'status' => 'error',
                    'message' => 'Low stock threshold must be a positive integer'
                ];
            }

            $requestedSparepartId = trim((string)($data['sparepart_id'] ?? ''));
            $data['sparepart_id'] = $this->resolveNextAvailableSparepartId($requestedSparepartId);

            $data['name'] = $name;
            $data['category'] = $category;
            
            // Remove fields that don't belong to the spareparts table
            $additionOnlyFields = ['warranty_period', 'warranty_start', 'warranty_terms', 'supplier_contact', 'supplier_address', 'supplier'];
            foreach ($additionOnlyFields as $field) {
                unset($data[$field]);
            }

            // Catalog creation is metadata-only. Initial stock is always added from the additions flow.
            $data['quantity'] = 0;
            $data['reorder_level'] = $threshold;

            if ($this->productModel->supportsLowStockThreshold()) {
                $data['low_stock_threshold'] = $threshold;
            } else {
                unset($data['low_stock_threshold']);
            }

            if ($category === 'machines') {
                $data['compatible_machines'] = json_encode($this->normalizeCompatibility($data['compatible_machines'] ?? []));
                $data['compatible_vehicles'] = json_encode([]);
            } else {
                $data['compatible_vehicles'] = json_encode($this->normalizeCompatibility($data['compatible_vehicles'] ?? []));
                $data['compatible_machines'] = json_encode([]);
            }

            // Location and supplier details are tracked by stock additions, not by catalog creation.
            unset($data['location']);
            
            // Set default values
            if (!isset($data['unit_price'])) {
                $data['unit_price'] = 0.00;
            }
            if (!isset($data['is_active'])) {
                $data['is_active'] = 1;
            }

            $productId = null;
            $maxAttempts = 3;
            for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
                try {
                    $productId = $this->productModel->create($data);
                    break;
                } catch (PDOException $e) {
                    if ($this->isDuplicateSparepartIdError($e) && $attempt < $maxAttempts) {
                        // Handle concurrent creation races by rolling forward to the next ID.
                        $data['sparepart_id'] = $this->resolveNextAvailableSparepartId('');
                        continue;
                    }

                    throw $e;
                }
            }
            
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
            // Support both database ID and sparepart_id (SPR-XXX)
            if (preg_match('/^SPR-\d+$/', $id)) {
                $product = $this->productModel->findOne(['sparepart_id' => $id]);
            } else {
                $product = $this->productModel->findById($id);
            }
            
            if (!$product) {
                return [
                    'status' => 'error',
                    'message' => 'Product not found'
                ];
            }
            
            // Use the database ID for the update
            $dbId = $product['id'];
            
            // Don't allow updating sparepart_id
            unset($data['sparepart_id']);

            if (array_key_exists('name', $data)) {
                $name = trim((string)$data['name']);
                if ($name === '') {
                    return [
                        'status' => 'error',
                        'message' => 'Name is required'
                    ];
                }
                $data['name'] = $name;
            }
            
            // Remove fields that don't belong to the spareparts table
            $additionOnlyFields = ['warranty_period', 'warranty_start', 'warranty_terms', 'supplier_contact', 'supplier_address', 'supplier'];
            foreach ($additionOnlyFields as $field) {
                unset($data[$field]);
            }

            // Keep catalog metadata clean; stock movement should happen via additions/usage.
            unset($data['location']);

            $categoryChanged = false;
            if (array_key_exists('category', $data)) {
                $category = strtolower(trim((string)$data['category']));
                if (!in_array($category, self::ALLOWED_CATEGORIES, true)) {
                    return [
                        'status' => 'error',
                        'message' => 'Category must be either machines or vehicles'
                    ];
                }
                $categoryChanged = $category !== strtolower((string)($product['category'] ?? ''));
                $data['category'] = $category;
            }

            $thresholdInput = null;
            if (array_key_exists('low_stock_threshold', $data)) {
                $thresholdInput = $data['low_stock_threshold'];
            } elseif (array_key_exists('reorder_level', $data)) {
                $thresholdInput = $data['reorder_level'];
            }

            if ($thresholdInput !== null) {
                $threshold = $this->normalizeThreshold($thresholdInput);
                if ($threshold === null) {
                    return [
                        'status' => 'error',
                        'message' => 'Low stock threshold must be a positive integer'
                    ];
                }

                $data['reorder_level'] = $threshold;
                if ($this->productModel->supportsLowStockThreshold()) {
                    $data['low_stock_threshold'] = $threshold;
                } else {
                    unset($data['low_stock_threshold']);
                }
            } else {
                unset($data['low_stock_threshold']);
            }

            $effectiveCategory = $data['category'] ?? strtolower((string)($product['category'] ?? ''));
            $compatibilityTouched =
                array_key_exists('compatible_machines', $data) ||
                array_key_exists('compatible_vehicles', $data) ||
                $categoryChanged;

            if ($compatibilityTouched) {
                $existingMachines = $this->normalizeCompatibility($product['compatible_machines'] ?? []);
                $existingVehicles = $this->normalizeCompatibility($product['compatible_vehicles'] ?? []);

                if ($effectiveCategory === 'machines') {
                    $data['compatible_machines'] = json_encode(
                        array_key_exists('compatible_machines', $data)
                            ? $this->normalizeCompatibility($data['compatible_machines'])
                            : ($categoryChanged ? [] : $existingMachines)
                    );
                    $data['compatible_vehicles'] = json_encode([]);
                } else {
                    $data['compatible_vehicles'] = json_encode(
                        array_key_exists('compatible_vehicles', $data)
                            ? $this->normalizeCompatibility($data['compatible_vehicles'])
                            : ($categoryChanged ? [] : $existingVehicles)
                    );
                    $data['compatible_machines'] = json_encode([]);
                }
            }
            
            $success = $this->productModel->update($dbId, $data);
            
            if ($success) {
                return [
                    'status' => 'success',
                    'data' => ['id' => $dbId],
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
                $product = $this->productModel->findOne(['sparepart_id' => $id, 'is_active' => 1]);
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

    private function resolveNextAvailableSparepartId($candidateId = '') {
        $candidateId = strtoupper(trim((string)$candidateId));

        if ($candidateId !== '' && !preg_match(self::SPAREPART_ID_PATTERN, $candidateId)) {
            $candidateId = '';
        }

        if ($candidateId !== '') {
            $exists = $this->productModel->findOne(['sparepart_id' => $candidateId]);
            if (!$exists) {
                return $candidateId;
            }
        }

        $generated = $this->productModel->generateProductId();
        while ($this->productModel->findOne(['sparepart_id' => $generated])) {
            $generated = $this->productModel->generateProductId();
        }

        return $generated;
    }

    private function isDuplicateSparepartIdError(PDOException $e) {
        $message = strtolower((string)$e->getMessage());
        return strpos($message, 'duplicate') !== false && strpos($message, 'sparepart_id') !== false;
    }

    private function normalizeThreshold($value) {
        if ($value === null || $value === '') {
            return null;
        }

        if (!is_numeric($value)) {
            return null;
        }

        $threshold = (int)$value;
        return $threshold > 0 ? $threshold : null;
    }

    private function normalizeCompatibility($value) {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $value = $decoded;
            }
        }

        if (!is_array($value)) {
            return [];
        }

        $normalized = [];
        foreach ($value as $item) {
            $name = trim((string)$item);
            if ($name !== '') {
                $normalized[] = $name;
            }
        }

        return array_values(array_unique($normalized));
    }
}
