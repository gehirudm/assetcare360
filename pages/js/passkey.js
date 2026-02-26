/**
 * Passkey (WebAuthn) Helper for AssetCare360
 * Handles WebAuthn credential creation and authentication
 */

const Passkey = {
    /**
     * Check if WebAuthn is supported in this browser
     */
    isSupported() {
        return !!(
            window.PublicKeyCredential &&
            navigator.credentials &&
            navigator.credentials.create &&
            navigator.credentials.get
        );
    },

    /**
     * Check if platform authenticator (Touch ID, Face ID, Windows Hello) is available
     */
    async isPlatformAuthenticatorAvailable() {
        if (!this.isSupported()) {
            return false;
        }
        try {
            return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        } catch (e) {
            console.error('Error checking platform authenticator:', e);
            return false;
        }
    },

    /**
     * Base64URL encode
     */
    base64UrlEncode(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    },

    /**
     * Base64URL decode
     */
    base64UrlDecode(str) {
        // Add padding if needed
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        const padding = str.length % 4;
        if (padding) {
            str += '='.repeat(4 - padding);
        }
        const binary = atob(str);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    },

    /**
     * Register a new passkey
     * @param {Object} options - Registration options from server
     * @returns {Promise<Object>} - Credential response to send to server
     */
    async register(options) {
        if (!this.isSupported()) {
            throw new Error('WebAuthn is not supported in this browser');
        }

        // Convert base64url encoded values to ArrayBuffer
        const publicKeyCredentialCreationOptions = {
            challenge: this.base64UrlDecode(options.challenge),
            rp: {
                id: options.rp.id,
                name: options.rp.name
            },
            user: {
                id: this.base64UrlDecode(options.user.id),
                name: options.user.name,
                displayName: options.user.displayName
            },
            pubKeyCredParams: options.pubKeyCredParams,
            timeout: options.timeout,
            attestation: options.attestation || 'none',
            authenticatorSelection: options.authenticatorSelection || {
                authenticatorAttachment: 'platform',
                residentKey: 'preferred',
                userVerification: 'preferred'
            },
            excludeCredentials: (options.excludeCredentials || []).map(cred => ({
                type: cred.type,
                id: this.base64UrlDecode(cred.id),
                transports: cred.transports
            }))
        };

        // Create credential
        const credential = await navigator.credentials.create({
            publicKey: publicKeyCredentialCreationOptions
        });

        // Get transports if available
        let transports = [];
        if (credential.response.getTransports) {
            transports = credential.response.getTransports();
        }

        // Format response for server
        return {
            credentialId: this.base64UrlEncode(credential.rawId),
            clientDataJSON: this.base64UrlEncode(credential.response.clientDataJSON),
            attestationObject: this.base64UrlEncode(credential.response.attestationObject),
            transports: transports
        };
    },

    /**
     * Authenticate with a passkey
     * @param {Object} options - Authentication options from server
     * @returns {Promise<Object>} - Credential response to send to server
     */
    async authenticate(options) {
        if (!this.isSupported()) {
            throw new Error('WebAuthn is not supported in this browser');
        }

        // Convert base64url encoded values to ArrayBuffer
        const publicKeyCredentialRequestOptions = {
            challenge: this.base64UrlDecode(options.challenge),
            rpId: options.rpId,
            timeout: options.timeout,
            userVerification: options.userVerification || 'preferred',
            allowCredentials: (options.allowCredentials || []).map(cred => ({
                type: cred.type,
                id: this.base64UrlDecode(cred.id),
                transports: cred.transports
            }))
        };

        // Get credential
        const credential = await navigator.credentials.get({
            publicKey: publicKeyCredentialRequestOptions
        });

        // Format response for server
        return {
            credentialId: this.base64UrlEncode(credential.rawId),
            clientDataJSON: this.base64UrlEncode(credential.response.clientDataJSON),
            authenticatorData: this.base64UrlEncode(credential.response.authenticatorData),
            signature: this.base64UrlEncode(credential.response.signature),
            userHandle: credential.response.userHandle
                ? this.base64UrlEncode(credential.response.userHandle)
                : null
        };
    },

    /**
     * Get user-friendly error message
     */
    getErrorMessage(error) {
        if (error.name === 'NotAllowedError') {
            return 'Authentication was cancelled or denied. Please try again.';
        }
        if (error.name === 'SecurityError') {
            return 'Security error. Make sure you are using a secure connection (HTTPS).';
        }
        if (error.name === 'NotSupportedError') {
            return 'Your device does not support this authentication method.';
        }
        if (error.name === 'InvalidStateError') {
            return 'This passkey is already registered.';
        }
        if (error.name === 'AbortError') {
            return 'Authentication was aborted. Please try again.';
        }
        return error.message || 'An unknown error occurred.';
    }
};
