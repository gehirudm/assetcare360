<?php

/**
 * Response Helper Class
 * Standardized API response formatting
 */
class Response {
    
    /**
     * Send success response
     */
    public static function success($data = null, $message = 'Success', $statusCode = 200) {
        http_response_code($statusCode);
        echo json_encode([
            'status' => 'success',
            'message' => $message,
            'data' => $data
        ]);
        exit;
    }
    
    /**
     * Send error response
     */
    public static function error($message = 'An error occurred', $statusCode = 400, $errors = null) {
        http_response_code($statusCode);
        $response = [
            'status' => 'error',
            'message' => $message
        ];
        
        if ($errors) {
            $response['errors'] = $errors;
        }
        
        echo json_encode($response);
        exit;
    }
    
    /**
     * Send unauthorized response
     */
    public static function unauthorized($message = 'Unauthorized') {
        self::error($message, 401);
    }
    
    /**
     * Send forbidden response
     */
    public static function forbidden($message = 'Forbidden') {
        self::error($message, 403);
    }
    
    /**
     * Send not found response
     */
    public static function notFound($message = 'Resource not found') {
        self::error($message, 404);
    }
    
    /**
     * Send validation error response
     */
    public static function validationError($errors, $message = 'Validation failed') {
        self::error($message, 422, $errors);
    }
    
    /**
     * Send server error response
     */
    public static function serverError($message = 'Internal server error') {
        self::error($message, 500);
    }
    
    /**
     * Send JSON response (generic)
     */
    public static function json($data, $statusCode = 200) {
        http_response_code($statusCode);
        echo json_encode($data);
        exit;
    }
}
