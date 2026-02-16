<?php

require_once __DIR__ . '/../services/ProductService.php';
require_once __DIR__ . '/../helpers/Response.php';

class ProductController {
    private $productService;
    
    public function __construct() {
        $this->productService = new ProductService();
    }
    
    /**
     * Get all products
     */
    public function index() {
        $filters = [];
        
        if (isset($_GET['category'])) {
            $filters['category'] = $_GET['category'];
        }
        
        $result = $this->productService->getAllProducts($filters);
        Response::json($result);
    }
    
    /**
     * Get product by ID
     */
    public function show() {
        $id = $_GET['id'] ?? null;
        
        if (!$id) {
            Response::json([
                'status' => 'error',
                'message' => 'Product ID is required'
            ], 400);
            return;
        }
        
        $result = $this->productService->getProductById($id);
        Response::json($result);
    }
    
    /**
     * Get next product ID
     */
    public function getNextId() {
        $result = $this->productService->getNextProductId();
        Response::json($result);
    }
    
    /**
     * Create new product
     */
    public function store() {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!$data) {
            Response::json([
                'status' => 'error',
                'message' => 'Invalid JSON data'
            ], 400);
            return;
        }
        
        $result = $this->productService->createProduct($data);
        Response::json($result, $result['status'] === 'success' ? 201 : 400);
    }
    
    /**
     * Update product
     */
    public function update() {
        $id = $_GET['id'] ?? null;
        
        if (!$id) {
            Response::json([
                'status' => 'error',
                'message' => 'Product ID is required'
            ], 400);
            return;
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!$data) {
            Response::json([
                'status' => 'error',
                'message' => 'Invalid JSON data'
            ], 400);
            return;
        }
        
        $result = $this->productService->updateProduct($id, $data);
        Response::json($result);
    }
    
    /**
     * Delete product
     */
    public function destroy() {
        $id = $_GET['id'] ?? null;
        
        if (!$id) {
            Response::json([
                'status' => 'error',
                'message' => 'Product ID is required'
            ], 400);
            return;
        }
        
        $result = $this->productService->deleteProduct($id);
        Response::json($result);
    }
    
    /**
     * Update product quantity
     */
    public function updateQuantity() {
        $id = $_GET['id'] ?? null;
        
        if (!$id) {
            Response::json([
                'status' => 'error',
                'message' => 'Product ID is required'
            ], 400);
            return;
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!$data || !isset($data['quantity'])) {
            Response::json([
                'status' => 'error',
                'message' => 'Quantity is required'
            ], 400);
            return;
        }
        
        $operation = $data['operation'] ?? 'set';
        $result = $this->productService->updateQuantity($id, $data['quantity'], $operation);
        Response::json($result);
    }
}
