class SACreateUserModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.render();
        this.bindEvents();
        this.prepareForOpen();
    }

    render() {
        this.innerHTML = `
            <div id="createUserModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-user-plus"></i> Create New User Account</h2>
                        <button class="btn-close" type="button" data-close-modal>
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <form id="createUserForm">
                        <div class="form-section">
                            <h5><i class="fas fa-user"></i> Personal Information</h5>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Full Name *</label>
                                    <input type="text" class="form-input" name="full_name" placeholder="Enter full name" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Employee ID *</label>
                                    <input type="text" class="form-input" name="employee_id" placeholder="e.g., EMP-020" required>
                                </div>
                            </div>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Email Address *</label>
                                    <input type="email" class="form-input" name="email" placeholder="user@company.com" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Phone Number</label>
                                    <input type="tel" class="form-input" name="phone_number" placeholder="+94 XX XXX XXXX">
                                </div>
                            </div>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Salary (LKR)</label>
                                    <input type="number" class="form-input" name="salary" min="0" step="0.01" placeholder="e.g. 85000.00">
                                </div>
                            </div>
                        </div>

                        <div class="form-section">
                            <h5><i class="fas fa-building"></i> Work Information</h5>
                            <div class="form-group">
                                <label class="form-label">Role *</label>
                                <select class="form-select" name="role" required>
                                    <option value="">Select Role</option>
                                    <option value="Admin">Admin</option>
                                    <option value="Maintenance Manager">Maintenance Manager</option>
                                    <option value="Inventory Manager">Inventory Manager</option>
                                    <option value="Transportation Manager">Transportation Manager</option>
                                    <option value="Technical Officer">Technical Officer</option>
                                    <option value="Supervisor">Supervisor</option>
                                    <option value="Machinary Operator">Machinary Operator</option>
                                    <option value="Driver">Driver</option>
                                    <option value="Auction Officer">Auction Officer</option>
                                </select>
                            </div>

                            <div class="form-group" id="createTechnicalExpertiseGroup" style="display: none;">
                                <label class="form-label">Technical Expertise *</label>
                                <select class="form-select" name="technical_expertise">
                                    <option value="General">General (All-Rounder)</option>
                                    <option value="Engine Specialist">Engine Specialist</option>
                                    <option value="Transmission Expert">Transmission Expert</option>
                                    <option value="Electrical Systems">Electrical Systems</option>
                                    <option value="Brake Systems">Brake Systems</option>
                                    <option value="Hydraulic Systems">Hydraulic Systems</option>
                                    <option value="Heavy Machinery">Heavy Machinery</option>
                                    <option value="General Maintenance">General Maintenance</option>
                                </select>
                                <small style="color: var(--muted);">Shown to supervisors during technician assignment.</small>
                            </div>
                        </div>

                        <div class="form-section">
                            <h5><i class="fas fa-lock"></i> Account Settings</h5>
                            <div class="form-group">
                                <label class="form-label">Temporary Password *</label>
                                <input type="text" class="form-input" name="password" placeholder="Auto-generated" autocomplete="off" readonly required>
                                <small style="color: var(--muted);">This will be auto-generated. User will be required to change it on first login.</small>
                            </div>
                        </div>

                        <div style="text-align: right; margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                            <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
                            <button type="submit" class="btn btn-primary">Create User Account</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#createUserModal');
        const form = this.querySelector('#createUserForm');

        this.addEventListener('click', (event) => {
            if (event.target === modal || event.target.closest('[data-close-modal]')) {
                this.close();
            }
        });

        form?.addEventListener('submit', () => {
            this.ensurePasswordValue();
        });
    }

    prepareForOpen() {
        this.ensurePasswordValue(true);
    }

    ensurePasswordValue(forceRegenerate = false) {
        const passwordInput = this.querySelector('#createUserForm [name="password"]');
        if (!passwordInput) {
            return '';
        }

        if (!forceRegenerate && passwordInput.value) {
            return passwordInput.value;
        }

        const generatedPassword = this.generateTemporaryPassword();
        passwordInput.value = generatedPassword;
        return generatedPassword;
    }

    generateTemporaryPassword(length = 12) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
        const randomValues = new Uint32Array(length);
        const hasCrypto = typeof window !== 'undefined' && window.crypto && typeof window.crypto.getRandomValues === 'function';

        if (hasCrypto) {
            window.crypto.getRandomValues(randomValues);
        }

        let password = '';
        for (let index = 0; index < length; index += 1) {
            const randomIndex = hasCrypto
                ? randomValues[index] % chars.length
                : Math.floor(Math.random() * chars.length);
            password += chars.charAt(randomIndex);
        }

        return password;
    }

    close() {
        if (typeof window.closeModal === 'function') {
            window.closeModal('createUserModal');
            return;
        }

        const modal = this.querySelector('#createUserModal');
        if (!modal) {
            return;
        }

        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

customElements.define('sa-create-user-modal', SACreateUserModal);
