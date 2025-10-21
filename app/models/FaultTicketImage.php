<?php

require_once __DIR__ . '/BaseModel.php';

/**
 * Fault Ticket Image Model
 * Handles image attachments for fault tickets
 */
class FaultTicketImage extends BaseModel {
    protected $table = 'fault_ticket_images';
    
    /**
     * Define table schema - required by BaseModel
     */
    protected function getSchema() {
        return [
            'id' => 'INT AUTO_INCREMENT PRIMARY KEY',
            'fault_ticket_id' => 'INT NOT NULL',
            'image_uuid' => 'VARCHAR(36) NOT NULL UNIQUE',
            'original_filename' => 'VARCHAR(255) NOT NULL',
            'file_path' => 'VARCHAR(500) NOT NULL',
            'file_size' => 'INT NOT NULL',
            'mime_type' => 'VARCHAR(50) NOT NULL',
            'created_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
        ];
    }
    
    /**
     * Define indexes
     */
    protected function getIndexes() {
        return [
            'idx_fault_ticket_id' => 'fault_ticket_id',
            'idx_image_uuid' => 'image_uuid'
        ];
    }
    
    /**
     * Get images by fault ticket ID
     */
    public function getImagesByTicketId($ticketId) {
        $sql = "SELECT * FROM `{$this->table}` 
                WHERE fault_ticket_id = ? 
                ORDER BY created_at ASC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$ticketId]);
        return $stmt->fetchAll();
    }
    
    /**
     * Create a new fault ticket image record
     */
    public function createImage($data) {
        $sql = "INSERT INTO `{$this->table}` 
                (fault_ticket_id, image_uuid, original_filename, file_path, file_size, mime_type) 
                VALUES 
                (?, ?, ?, ?, ?, ?)";
        
        $stmt = $this->db->prepare($sql);
        $result = $stmt->execute([
            $data['fault_ticket_id'],
            $data['image_uuid'],
            $data['original_filename'],
            $data['file_path'],
            $data['file_size'],
            $data['mime_type']
        ]);
        
        return $result ? $this->db->lastInsertId() : false;
    }
    
    /**
     * Get image by ID
     */
    public function getImageById($id) {
        $sql = "SELECT * FROM `{$this->table}` WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetch();
    }
    
    /**
     * Get image by UUID
     */
    public function getImageByUuid($uuid) {
        $sql = "SELECT * FROM `{$this->table}` WHERE image_uuid = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$uuid]);
        return $stmt->fetch();
    }
    
    /**
     * Delete image by ID
     */
    public function deleteImage($id) {
        $sql = "DELETE FROM `{$this->table}` WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$id]);
    }
    
    /**
     * Delete all images for a fault ticket
     */
    public function deleteImagesByTicketId($ticketId) {
        $sql = "DELETE FROM `{$this->table}` WHERE fault_ticket_id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$ticketId]);
    }
    
    /**
     * Generate UUID v4
     */
    public static function generateUuid() {
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff)
        );
    }
}
