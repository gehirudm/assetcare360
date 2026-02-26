<?php

require_once __DIR__ . '/BaseModel.php';

/**
 * Passkey Credential Model
 * Handles WebAuthn passkey credential storage and retrieval
 */
class PasskeyCredential extends BaseModel
{
    protected $table = 'passkey_credentials';

    /**
     * Define table schema
     */
    protected function getSchema()
    {
        return [
            'id' => 'INT AUTO_INCREMENT PRIMARY KEY',
            'user_id' => 'INT NOT NULL',
            'credential_id' => 'VARCHAR(512) NOT NULL UNIQUE',
            'public_key' => 'TEXT NOT NULL',
            'name' => "VARCHAR(100) DEFAULT 'My Passkey'",
            'sign_count' => 'INT UNSIGNED DEFAULT 0',
            'transports' => 'TEXT NULL',
            'created_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
            'last_used_at' => 'TIMESTAMP NULL'
        ];
    }

    /**
     * Get additional indexes for the table
     */
    protected function getIndexes()
    {
        return [
            'idx_passkey_user_id' => 'user_id',
            'idx_credential_id' => 'credential_id(255)'
        ];
    }

    /**
     * Find all passkeys for a user
     */
    public function findByUserId($userId)
    {
        return $this->findAll(['user_id' => $userId], 'created_at DESC');
    }

    /**
     * Find passkey by credential ID
     */
    public function findByCredentialId($credentialId)
    {
        return $this->findOne(['credential_id' => $credentialId]);
    }

    /**
     * Create a new passkey credential
     */
    public function createCredential($data)
    {
        // Encode transports array as JSON if provided
        if (isset($data['transports']) && is_array($data['transports'])) {
            $data['transports'] = json_encode($data['transports']);
        }

        return $this->create($data);
    }

    /**
     * Delete a passkey by ID and user ID (ensures ownership)
     */
    public function deleteByIdAndUser($id, $userId)
    {
        $sql = "DELETE FROM `{$this->table}` WHERE id = ? AND user_id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$id, $userId]);
    }

    /**
     * Update sign count after successful authentication
     */
    public function updateSignCount($id, $signCount)
    {
        $sql = "UPDATE `{$this->table}` SET sign_count = ?, last_used_at = NOW() WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$signCount, $id]);
    }

    /**
     * Update last used timestamp
     */
    public function updateLastUsed($id)
    {
        $sql = "UPDATE `{$this->table}` SET last_used_at = NOW() WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$id]);
    }

    /**
     * Get passkey count for a user
     */
    public function getCountByUserId($userId)
    {
        $sql = "SELECT COUNT(*) as count FROM `{$this->table}` WHERE user_id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        $result = $stmt->fetch();
        return (int) $result['count'];
    }

    /**
     * Check if credential ID already exists
     */
    public function credentialExists($credentialId)
    {
        $result = $this->findByCredentialId($credentialId);
        // Check for null, false, or empty array
        return !empty($result);
    }

    /**
     * Get passkeys for display (without public key)
     */
    public function getPasskeysForDisplay($userId)
    {
        $passkeys = $this->findByUserId($userId);
        return array_map(function ($passkey) {
            return [
                'id' => $passkey['id'],
                'name' => $passkey['name'],
                'created_at' => $passkey['created_at'],
                'last_used_at' => $passkey['last_used_at']
            ];
        }, $passkeys);
    }

    /**
     * Update passkey name
     */
    public function updateName($id, $userId, $name)
    {
        $sql = "UPDATE `{$this->table}` SET name = ? WHERE id = ? AND user_id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$name, $id, $userId]);
    }
}
