class SAEditUserModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.render();
        this.bindEvents();
    }

    render() {
        this.innerHTML = `
            <div id="editUserModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-user-edit"></i> Edit User</h2>
                        <button class="btn-close" type="button" data-close-modal>
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <form id="editUserForm">
                        <input type="hidden" name="user_id">

                        <div class="form-group">
                            <label class="form-label">Full Name</label>
                            <input type="text" class="form-input" name="full_name" required>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Employee ID</label>
                            <input type="text" class="form-input" name="employee_id" required>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Email</label>
                            <input type="email" class="form-input" name="email" required>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Phone Number</label>
                            <input type="tel" class="form-input" name="phone_number">
                        </div>

                        <div class="form-group">
                            <label class="form-label">Role</label>
                            <select class="form-select" name="role" required>
                                <option value="Admin">Admin</option>
                                <option value="Maintenance Manager">Maintenance Manager</option>
                                <option value="Technical Officer">Technical Officer</option>
                                <option value="Supervisor">Supervisor</option>
                                <option value="Inventory Manager">Inventory Manager</option>
                                <option value="Machinary Operator">Machinary Operator</option>
                                <option value="Driver">Driver</option>
                                <option value="Auction Officer">Auction Officer</option>
                            </select>
                        </div>

                        <div class="form-group" id="editTechnicalExpertiseGroup" style="display: none;">
                            <label class="form-label">Technical Expertise</label>
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
                        </div>

                        <div style="text-align: right; margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                            <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
                            <button type="submit" class="btn btn-primary">Update User</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#editUserModal');

        this.addEventListener('click', (event) => {
            if (event.target === modal || event.target.closest('[data-close-modal]')) {
                this.close();
            }
        });
    }

    close() {
        if (typeof window.closeModal === 'function') {
            window.closeModal('editUserModal');
            return;
        }

        const modal = this.querySelector('#editUserModal');
        if (!modal) {
            return;
        }

        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

customElements.define('sa-edit-user-modal', SAEditUserModal);
