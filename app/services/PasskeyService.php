<?php

require_once __DIR__ . '/../models/PasskeyCredential.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../helpers/JWTHelper.php';

/**
 * Passkey Service
 * Handles WebAuthn registration and authentication
 */
class PasskeyService
{
    private $passkeyModel;
    private $userModel;

    // WebAuthn Configuration
    const RP_ID = 'assetcare360.com';
    const RP_NAME = 'AssetCare360';

    // Challenge timeout in seconds
    const CHALLENGE_TIMEOUT = 120;

    public function __construct()
    {
        $this->passkeyModel = new PasskeyCredential();
        $this->userModel = new User();
    }

    /**
     * Get the relying party ID based on environment
     */
    private function getRpId()
    {
        // For localhost development, use localhost
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        if (strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false) {
            return 'localhost';
        }
        return self::RP_ID;
    }

    /**
     * Get allowed origins for WebAuthn
     */
    private function getAllowedOrigins()
    {
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        if (strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false) {
            return [
                'http://localhost:3000',
                'http://localhost:8000',
                'http://localhost:8080',
                'http://127.0.0.1:3000',
                'http://127.0.0.1:8000',
                'http://127.0.0.1:8080'
            ];
        }
        return [
            'https://assetcare360.com',
            'https://www.assetcare360.com'
        ];
    }

    /**
     * Generate a cryptographically secure random challenge
     */
    private function generateChallenge($length = 32)
    {
        return random_bytes($length);
    }

    /**
     * Store challenge in session for verification
     */
    private function storeChallenge($challenge, $userId = null)
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $_SESSION['webauthn_challenge'] = base64_encode($challenge);
        $_SESSION['webauthn_challenge_time'] = time();
        if ($userId) {
            $_SESSION['webauthn_user_id'] = $userId;
        }
    }

    /**
     * Get and verify stored challenge
     */
    private function getStoredChallenge()
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        if (!isset($_SESSION['webauthn_challenge']) || !isset($_SESSION['webauthn_challenge_time'])) {
            return null;
        }

        // Check if challenge has expired
        if (time() - $_SESSION['webauthn_challenge_time'] > self::CHALLENGE_TIMEOUT) {
            $this->clearChallenge();
            return null;
        }

        return base64_decode($_SESSION['webauthn_challenge']);
    }

    /**
     * Clear the stored challenge
     */
    private function clearChallenge()
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        unset($_SESSION['webauthn_challenge']);
        unset($_SESSION['webauthn_challenge_time']);
        unset($_SESSION['webauthn_user_id']);
    }

    /**
     * Get registration options for WebAuthn credential creation
     */
    public function getRegistrationOptions($user)
    {
        $challenge = $this->generateChallenge();
        $this->storeChallenge($challenge, $user['id']);

        // Get existing credentials to exclude
        $existingCredentials = $this->passkeyModel->findByUserId($user['id']);
        $excludeCredentials = array_map(function ($cred) {
            return [
                'type' => 'public-key',
                'id' => $cred['credential_id'],
                'transports' => $cred['transports'] ? json_decode($cred['transports'], true) : ['internal', 'hybrid']
            ];
        }, $existingCredentials);

        return [
            'success' => true,
            'data' => [
                'challenge' => $this->base64UrlEncode($challenge),
                'rp' => [
                    'id' => $this->getRpId(),
                    'name' => self::RP_NAME
                ],
                'user' => [
                    'id' => $this->base64UrlEncode($user['id'] . '-' . $user['employee_id']),
                    'name' => $user['employee_id'],
                    'displayName' => $user['full_name']
                ],
                'pubKeyCredParams' => [
                    ['type' => 'public-key', 'alg' => -7],   // ES256
                    ['type' => 'public-key', 'alg' => -257]  // RS256
                ],
                'timeout' => self::CHALLENGE_TIMEOUT * 1000,
                'attestation' => 'none',
                'excludeCredentials' => $excludeCredentials,
                'authenticatorSelection' => [
                    'authenticatorAttachment' => 'platform',
                    'residentKey' => 'preferred',
                    'userVerification' => 'preferred'
                ]
            ]
        ];
    }

    /**
     * Verify registration response and store credential
     */
    public function verifyRegistration($user, $response, $name = 'My Passkey')
    {
        error_log("=== PASSKEY REGISTRATION START ===");
        error_log("User ID: " . $user['id']);
        error_log("Response keys: " . implode(', ', array_keys($response)));

        $storedChallenge = $this->getStoredChallenge();

        if (!$storedChallenge) {
            error_log("ERROR: Challenge expired or not found");
            return ['success' => false, 'message' => 'Challenge expired or not found'];
        }
        error_log("Challenge found and valid");

        try {
            // Decode the client data
            $clientDataJSON = $this->base64UrlDecode($response['clientDataJSON']);
            $clientData = json_decode($clientDataJSON, true);

            if (!$clientData) {
                error_log("ERROR: Invalid client data");
                return ['success' => false, 'message' => 'Invalid client data'];
            }
            error_log("Client data decoded, type: " . ($clientData['type'] ?? 'null'));

            // Verify type
            if ($clientData['type'] !== 'webauthn.create') {
                error_log("ERROR: Invalid ceremony type: " . $clientData['type']);
                return ['success' => false, 'message' => 'Invalid ceremony type'];
            }

            // Verify challenge
            $receivedChallenge = $this->base64UrlDecode($clientData['challenge']);
            if (!hash_equals($storedChallenge, $receivedChallenge)) {
                error_log("ERROR: Challenge mismatch");
                return ['success' => false, 'message' => 'Challenge mismatch'];
            }
            error_log("Challenge verified");

            // Verify origin
            $allowedOrigins = $this->getAllowedOrigins();
            if (!in_array($clientData['origin'], $allowedOrigins)) {
                error_log("ERROR: Invalid origin: " . $clientData['origin']);
                return ['success' => false, 'message' => 'Invalid origin: ' . $clientData['origin']];
            }
            error_log("Origin verified: " . $clientData['origin']);

            // Decode attestation object
            $attestationObject = $this->base64UrlDecode($response['attestationObject']);
            $attestation = $this->decodeAttestationObject($attestationObject);

            if (!$attestation) {
                error_log("ERROR: Failed to decode attestation object");
                return ['success' => false, 'message' => 'Failed to decode attestation object'];
            }
            error_log("Attestation object decoded, keys: " . implode(', ', array_keys($attestation)));

            // Extract credential ID and public key from authenticator data
            $authData = $attestation['authData'];
            error_log("AuthData length: " . strlen($authData));
            $credentialData = $this->parseAuthenticatorData($authData);

            if (!$credentialData) {
                error_log("ERROR: Failed to parse authenticator data");
                return ['success' => false, 'message' => 'Failed to parse authenticator data'];
            }
            error_log("Authenticator data parsed successfully");
            error_log("Credential data keys: " . implode(', ', array_keys($credentialData)));

            // Use the credential ID from the response (already base64url encoded)
            // instead of re-encoding from authenticator data
            $credentialId = $response['credentialId'];
            error_log("Credential ID from response: " . $credentialId);
            error_log("Credential ID length: " . strlen($credentialId));

            // Check if credential already exists
            error_log("Checking if credential exists in database...");
            $existingCredential = $this->passkeyModel->findByCredentialId($credentialId);
            error_log("Existing credential lookup result: " . ($existingCredential ? "FOUND (ID: " . $existingCredential['id'] . ")" : "NOT FOUND"));

            if ($this->passkeyModel->credentialExists($credentialId)) {
                error_log("ERROR: Credential already registered - credentialExists returned true");
                return ['success' => false, 'message' => 'Credential already registered'];
            }
            error_log("Credential does not exist, proceeding with registration");

            $passkeyId = $this->passkeyModel->createCredential([
                'user_id' => $user['id'],
                'credential_id' => $credentialId,
                'public_key' => base64_encode($credentialData['publicKey']),
                'name' => $name,
                'sign_count' => $credentialData['signCount'],
                'transports' => $response['transports'] ?? ['internal']
            ]);
            error_log("createCredential returned: " . ($passkeyId ? $passkeyId : "false/null"));

            $this->clearChallenge();

            if ($passkeyId) {
                error_log("=== PASSKEY REGISTRATION SUCCESS ===");
                return [
                    'success' => true,
                    'message' => 'Passkey registered successfully',
                    'data' => [
                        'id' => $passkeyId,
                        'name' => $name
                    ]
                ];
            }

            error_log("ERROR: Failed to store credential - createCredential returned falsy");
            return ['success' => false, 'message' => 'Failed to store credential'];

        } catch (Exception $e) {
            error_log("EXCEPTION: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            $this->clearChallenge();
            return ['success' => false, 'message' => 'Registration failed: ' . $e->getMessage()];
        }
    }

    /**
     * Get authentication options for WebAuthn credential assertion
     */
    public function getAuthenticationOptions($employeeId = null)
    {
        $challenge = $this->generateChallenge();

        $allowCredentials = [];
        $userId = null;

        if ($employeeId) {
            $user = $this->userModel->findByEmployeeId($employeeId);
            if ($user) {
                $userId = $user['id'];
                $credentials = $this->passkeyModel->findByUserId($user['id']);

                if (empty($credentials)) {
                    return ['success' => false, 'message' => 'No passkeys registered for this user'];
                }

                $allowCredentials = array_map(function ($cred) {
                    return [
                        'type' => 'public-key',
                        'id' => $cred['credential_id'],
                        'transports' => $cred['transports'] ? json_decode($cred['transports'], true) : ['internal', 'hybrid']
                    ];
                }, $credentials);
            } else {
                return ['success' => false, 'message' => 'User not found'];
            }
        }

        $this->storeChallenge($challenge, $userId);

        return [
            'success' => true,
            'data' => [
                'challenge' => $this->base64UrlEncode($challenge),
                'rpId' => $this->getRpId(),
                'timeout' => self::CHALLENGE_TIMEOUT * 1000,
                'userVerification' => 'preferred',
                'allowCredentials' => $allowCredentials
            ]
        ];
    }

    /**
     * Verify authentication response
     */
    public function verifyAuthentication($response)
    {
        $storedChallenge = $this->getStoredChallenge();

        if (!$storedChallenge) {
            return ['success' => false, 'message' => 'Challenge expired or not found'];
        }

        try {
            // Get the credential
            $credentialId = $response['credentialId'];
            $credential = $this->passkeyModel->findByCredentialId($credentialId);

            if (!$credential) {
                return ['success' => false, 'message' => 'Credential not found'];
            }

            // Get the user
            $user = $this->userModel->findById($credential['user_id']);

            if (!$user) {
                return ['success' => false, 'message' => 'User not found'];
            }

            if (!$user['is_active']) {
                return ['success' => false, 'message' => 'User account is inactive'];
            }

            // Decode the client data
            $clientDataJSON = $this->base64UrlDecode($response['clientDataJSON']);
            $clientData = json_decode($clientDataJSON, true);

            if (!$clientData) {
                return ['success' => false, 'message' => 'Invalid client data'];
            }

            // Verify type
            if ($clientData['type'] !== 'webauthn.get') {
                return ['success' => false, 'message' => 'Invalid ceremony type'];
            }

            // Verify challenge
            $receivedChallenge = $this->base64UrlDecode($clientData['challenge']);
            if (!hash_equals($storedChallenge, $receivedChallenge)) {
                return ['success' => false, 'message' => 'Challenge mismatch'];
            }

            // Verify origin
            $allowedOrigins = $this->getAllowedOrigins();
            if (!in_array($clientData['origin'], $allowedOrigins)) {
                return ['success' => false, 'message' => 'Invalid origin'];
            }

            // Decode and parse authenticator data
            $authenticatorData = $this->base64UrlDecode($response['authenticatorData']);
            $signature = $this->base64UrlDecode($response['signature']);

            // Verify signature
            $publicKey = base64_decode($credential['public_key']);
            $clientDataHash = hash('sha256', $clientDataJSON, true);
            $signedData = $authenticatorData . $clientDataHash;

            $verified = $this->verifySignature($signedData, $signature, $publicKey);

            if (!$verified) {
                return ['success' => false, 'message' => 'Signature verification failed'];
            }

            // Parse authenticator data for sign count
            $rpIdHash = substr($authenticatorData, 0, 32);
            $flags = ord($authenticatorData[32]);
            $signCount = unpack('N', substr($authenticatorData, 33, 4))[1];

            // Verify sign count to detect cloned authenticators
            $storedSignCount = (int) $credential['sign_count'];
            if ($signCount <= $storedSignCount && $storedSignCount > 0) {
                // This could indicate a cloned authenticator
                // For now, we'll log it but still allow authentication
                error_log("Warning: Sign count not increased for credential " . $credential['id']);
            }

            // Update sign count and last used
            $this->passkeyModel->updateSignCount($credential['id'], $signCount);

            // Update user last login
            $this->userModel->updateLastLogin($user['id']);

            // Generate JWT token
            $token = JWTHelper::encode([
                'id' => $user['id'],
                'employee_id' => $user['employee_id'],
                'role' => $user['role']
            ]);

            $this->clearChallenge();

            // Prepare user data without password
            unset($user['password']);
            unset($user['password_reset_token']);
            unset($user['password_reset_expires']);

            return [
                'success' => true,
                'message' => 'Authentication successful',
                'data' => [
                    'token' => $token,
                    'user' => $user,
                    'force_password_change' => (bool) $user['force_password_change']
                ]
            ];

        } catch (Exception $e) {
            $this->clearChallenge();
            return ['success' => false, 'message' => 'Authentication failed: ' . $e->getMessage()];
        }
    }

    /**
     * List user's passkeys
     */
    public function listPasskeys($userId)
    {
        $passkeys = $this->passkeyModel->getPasskeysForDisplay($userId);
        return [
            'success' => true,
            'data' => $passkeys
        ];
    }

    /**
     * Delete a passkey
     */
    public function deletePasskey($id, $userId)
    {
        $result = $this->passkeyModel->deleteByIdAndUser($id, $userId);

        if ($result) {
            return ['success' => true, 'message' => 'Passkey deleted successfully'];
        }

        return ['success' => false, 'message' => 'Failed to delete passkey'];
    }

    /**
     * Base64url encode
     */
    private function base64UrlEncode($data)
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * Base64url decode
     */
    private function base64UrlDecode($data)
    {
        $data = strtr($data, '-_', '+/');
        $padding = strlen($data) % 4;
        if ($padding) {
            $data .= str_repeat('=', 4 - $padding);
        }
        return base64_decode($data);
    }

    /**
     * Decode CBOR-encoded attestation object
     * Simplified CBOR decoder for attestation object
     */
    private function decodeAttestationObject($data)
    {
        // Simple CBOR map decoder for attestation object
        // The attestation object is a CBOR map with keys: fmt, attStmt, authData

        try {
            $pos = 0;
            $result = $this->decodeCborValue($data, $pos);
            return $result;
        } catch (Exception $e) {
            error_log("CBOR decode error: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Simplified CBOR decoder
     */
    private function decodeCborValue($data, &$pos)
    {
        $byte = ord($data[$pos]);
        $majorType = $byte >> 5;
        $additionalInfo = $byte & 0x1f;
        $pos++;

        switch ($majorType) {
            case 0: // Unsigned integer
                return $this->decodeCborUint($data, $pos, $additionalInfo);

            case 2: // Byte string
                $length = $this->decodeCborUint($data, $pos, $additionalInfo);
                $value = substr($data, $pos, $length);
                $pos += $length;
                return $value;

            case 3: // Text string
                $length = $this->decodeCborUint($data, $pos, $additionalInfo);
                $value = substr($data, $pos, $length);
                $pos += $length;
                return $value;

            case 4: // Array
                $length = $this->decodeCborUint($data, $pos, $additionalInfo);
                $array = [];
                for ($i = 0; $i < $length; $i++) {
                    $array[] = $this->decodeCborValue($data, $pos);
                }
                return $array;

            case 5: // Map
                $length = $this->decodeCborUint($data, $pos, $additionalInfo);
                $map = [];
                for ($i = 0; $i < $length; $i++) {
                    $key = $this->decodeCborValue($data, $pos);
                    $value = $this->decodeCborValue($data, $pos);
                    $map[$key] = $value;
                }
                return $map;

            case 1: // Negative integer
                $value = $this->decodeCborUint($data, $pos, $additionalInfo);
                return -1 - $value;

            default:
                throw new Exception("Unsupported CBOR major type: $majorType");
        }
    }

    /**
     * Decode CBOR unsigned integer
     */
    private function decodeCborUint($data, &$pos, $additionalInfo)
    {
        if ($additionalInfo < 24) {
            return $additionalInfo;
        } elseif ($additionalInfo === 24) {
            $value = ord($data[$pos]);
            $pos++;
            return $value;
        } elseif ($additionalInfo === 25) {
            $value = unpack('n', substr($data, $pos, 2))[1];
            $pos += 2;
            return $value;
        } elseif ($additionalInfo === 26) {
            $value = unpack('N', substr($data, $pos, 4))[1];
            $pos += 4;
            return $value;
        } elseif ($additionalInfo === 27) {
            $value = unpack('J', substr($data, $pos, 8))[1];
            $pos += 8;
            return $value;
        }
        return 0;
    }

    /**
     * Parse authenticator data
     */
    private function parseAuthenticatorData($authData)
    {
        if (strlen($authData) < 37) {
            return null;
        }

        $rpIdHash = substr($authData, 0, 32);
        $flags = ord($authData[32]);
        $signCount = unpack('N', substr($authData, 33, 4))[1];

        $result = [
            'rpIdHash' => $rpIdHash,
            'flags' => $flags,
            'signCount' => $signCount
        ];

        // Check if attested credential data is present (bit 6)
        if ($flags & 0x40) {
            $pos = 37;

            // AAGUID (16 bytes)
            $aaguid = substr($authData, $pos, 16);
            $pos += 16;

            // Credential ID length (2 bytes, big endian)
            $credIdLength = unpack('n', substr($authData, $pos, 2))[1];
            $pos += 2;

            // Credential ID
            $credentialId = substr($authData, $pos, $credIdLength);
            $pos += $credIdLength;

            // Public key (COSE format, CBOR encoded)
            $publicKeyData = substr($authData, $pos);

            $result['aaguid'] = $aaguid;
            $result['credentialId'] = $credentialId;
            $result['publicKey'] = $publicKeyData;
        }

        return $result;
    }

    /**
     * Verify signature using public key
     */
    private function verifySignature($data, $signature, $publicKeyCose)
    {
        try {
            // Parse COSE public key
            $pos = 0;
            $coseKey = $this->decodeCborValue($publicKeyCose, $pos);

            if (!is_array($coseKey)) {
                return false;
            }

            // Get key type and algorithm
            $kty = $coseKey[1] ?? null;  // Key Type
            $alg = $coseKey[3] ?? null;  // Algorithm

            if ($kty == 2) {
                // EC2 key (ECDSA)
                $crv = $coseKey[-1] ?? 1;  // Curve (1 = P-256)
                $x = $coseKey[-2] ?? null;
                $y = $coseKey[-3] ?? null;

                if (!$x || !$y) {
                    return false;
                }

                // Convert to PEM format
                $pem = $this->ecPublicKeyToPem($x, $y);

                // Verify signature
                $pubKey = openssl_pkey_get_public($pem);
                if (!$pubKey) {
                    return false;
                }

                // Convert DER signature to raw format for openssl
                $derSignature = $this->signatureToAsn1($signature);

                $result = openssl_verify($data, $derSignature, $pubKey, OPENSSL_ALGO_SHA256);

                return $result === 1;

            } elseif ($kty == 3) {
                // RSA key
                $n = $coseKey[-1] ?? null;  // Modulus
                $e = $coseKey[-2] ?? null;  // Exponent

                if (!$n || !$e) {
                    return false;
                }

                // Convert to PEM format
                $pem = $this->rsaPublicKeyToPem($n, $e);

                $pubKey = openssl_pkey_get_public($pem);
                if (!$pubKey) {
                    return false;
                }

                $result = openssl_verify($data, $signature, $pubKey, OPENSSL_ALGO_SHA256);

                return $result === 1;
            }

            return false;

        } catch (Exception $e) {
            error_log("Signature verification error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Convert EC public key coordinates to PEM format
     */
    private function ecPublicKeyToPem($x, $y)
    {
        // P-256 curve point uncompressed format: 0x04 || x || y
        $point = "\x04" . $x . $y;

        // DER encode the public key
        // SEQUENCE { SEQUENCE { OID ecPublicKey, OID prime256v1 }, BIT STRING { point } }
        $oid_ecPublicKey = "\x06\x07\x2a\x86\x48\xce\x3d\x02\x01";
        $oid_prime256v1 = "\x06\x08\x2a\x86\x48\xce\x3d\x03\x01\x07";

        $algorithmIdentifier = "\x30" . chr(strlen($oid_ecPublicKey) + strlen($oid_prime256v1)) . $oid_ecPublicKey . $oid_prime256v1;

        $bitString = "\x03" . chr(strlen($point) + 1) . "\x00" . $point;

        $der = "\x30" . chr(strlen($algorithmIdentifier) + strlen($bitString)) . $algorithmIdentifier . $bitString;

        $pem = "-----BEGIN PUBLIC KEY-----\n" .
            chunk_split(base64_encode($der), 64, "\n") .
            "-----END PUBLIC KEY-----\n";

        return $pem;
    }

    /**
     * Convert RSA public key to PEM format
     */
    private function rsaPublicKeyToPem($n, $e)
    {
        // Encode the modulus
        $modulus = $this->encodeAsn1Integer($n);
        $exponent = $this->encodeAsn1Integer($e);

        // RSA public key sequence
        $rsaPublicKey = "\x30" . $this->encodeAsn1Length(strlen($modulus) + strlen($exponent)) . $modulus . $exponent;

        // Algorithm identifier for RSA
        $oid_rsaEncryption = "\x06\x09\x2a\x86\x48\x86\xf7\x0d\x01\x01\x01";
        $null = "\x05\x00";
        $algorithmIdentifier = "\x30" . chr(strlen($oid_rsaEncryption) + strlen($null)) . $oid_rsaEncryption . $null;

        // Bit string containing the RSA public key
        $bitString = "\x03" . $this->encodeAsn1Length(strlen($rsaPublicKey) + 1) . "\x00" . $rsaPublicKey;

        // Final sequence
        $der = "\x30" . $this->encodeAsn1Length(strlen($algorithmIdentifier) + strlen($bitString)) . $algorithmIdentifier . $bitString;

        $pem = "-----BEGIN PUBLIC KEY-----\n" .
            chunk_split(base64_encode($der), 64, "\n") .
            "-----END PUBLIC KEY-----\n";

        return $pem;
    }

    /**
     * Encode ASN.1 integer
     */
    private function encodeAsn1Integer($data)
    {
        // Add leading zero if high bit is set
        if (ord($data[0]) & 0x80) {
            $data = "\x00" . $data;
        }
        return "\x02" . $this->encodeAsn1Length(strlen($data)) . $data;
    }

    /**
     * Encode ASN.1 length
     */
    private function encodeAsn1Length($length)
    {
        if ($length < 0x80) {
            return chr($length);
        } elseif ($length < 0x100) {
            return "\x81" . chr($length);
        } elseif ($length < 0x10000) {
            return "\x82" . pack('n', $length);
        }
        return "\x83" . pack('N', $length)[1] . pack('n', $length);
    }

    /**
     * Convert raw ECDSA signature (r || s) to ASN.1 DER format
     */
    private function signatureToAsn1($signature)
    {
        $length = strlen($signature);
        if ($length !== 64) {
            // Already in DER format or invalid
            return $signature;
        }

        $r = substr($signature, 0, 32);
        $s = substr($signature, 32, 32);

        // Remove leading zeros
        $r = ltrim($r, "\x00");
        $s = ltrim($s, "\x00");

        // Add leading zero if high bit is set
        if (ord($r[0]) & 0x80) {
            $r = "\x00" . $r;
        }
        if (ord($s[0]) & 0x80) {
            $s = "\x00" . $s;
        }

        $r = "\x02" . chr(strlen($r)) . $r;
        $s = "\x02" . chr(strlen($s)) . $s;

        return "\x30" . chr(strlen($r) + strlen($s)) . $r . $s;
    }
}
