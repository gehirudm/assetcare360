<?php

require_once __DIR__ . '/../helpers/Response.php';

/**
 * File Controller
 * Handles serving uploaded files
 */
class FileController {
    
    /**
     * Serve fault ticket image
     * GET /uploads/fault-tickets/{filename}
     */
    public function serveFaultTicketImage() {
        try {
            // Get filename from route parameter
            $filename = $_GET['filename'] ?? null;
            
            if (!$filename) {
                Response::error('Filename is required', 400);
                return;
            }
            
            // Validate filename (security check)
            if (!preg_match('/^[a-f0-9\-]+\.(jpg|jpeg|png|webp)$/i', $filename)) {
                Response::error('Invalid filename format', 400);
                return;
            }
            
            // Construct file path
            $uploadsDir = __DIR__ . '/../../uploads/fault-tickets/';
            $filePath = $uploadsDir . $filename;
            
            // Check if file exists
            if (!file_exists($filePath)) {
                Response::error('File not found', 404);
                return;
            }
            
            // Get MIME type
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mimeType = finfo_file($finfo, $filePath);
            finfo_close($finfo);
            
            // Validate MIME type is an image
            if (!in_array($mimeType, ['image/jpeg', 'image/png', 'image/webp'])) {
                Response::error('Invalid file type', 400);
                return;
            }
            
            // Set headers and serve file
            header('Content-Type: ' . $mimeType);
            header('Content-Length: ' . filesize($filePath));
            header('Cache-Control: public, max-age=31536000'); // Cache for 1 year
            
            // Output file
            readfile($filePath);
            exit;
            
        } catch (\Exception $e) {
            Response::error('Error serving file: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Serve route breakdown image
     * GET /uploads/route-breakdowns/{folder}/{filename}
     */
    public function serveRouteBreakdownImage() {
        try {
            $folder = $_GET['folder'] ?? null;
            $filename = $_GET['filename'] ?? null;

            if (!$folder || !$filename) {
                Response::error('Folder and filename are required', 400);
                return;
            }

            if (!in_array($folder, ['progress', 'bills'], true)) {
                Response::error('Invalid folder', 400);
                return;
            }

            if (!preg_match('/^[a-zA-Z0-9_\-\.]+\.(jpg|jpeg|png|webp)$/i', $filename)) {
                Response::error('Invalid filename format', 400);
                return;
            }

            $uploadsDir = __DIR__ . '/../../uploads/route-breakdowns/' . $folder . '/';
            $filePath = $uploadsDir . $filename;

            if (!file_exists($filePath)) {
                Response::error('File not found', 404);
                return;
            }

            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mimeType = finfo_file($finfo, $filePath);
            finfo_close($finfo);

            if (!in_array($mimeType, ['image/jpeg', 'image/png', 'image/webp'], true)) {
                Response::error('Invalid file type', 400);
                return;
            }

            header('Content-Type: ' . $mimeType);
            header('Content-Length: ' . filesize($filePath));
            header('Cache-Control: public, max-age=31536000');

            readfile($filePath);
            exit;
        } catch (\Exception $e) {
            Response::error('Error serving file: ' . $e->getMessage(), 500);
        }
    }
}
