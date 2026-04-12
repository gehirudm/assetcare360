class SACreateRoleModal extends HTMLElement {
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
            <div id="createRoleModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <button class="close" type="button" data-close-modal>&times;</button>
                    <h2 style="margin-bottom: 20px; color: var(--tang-blue);">Create New Role</h2>
                    <form id="createRoleForm">
                        <div class="form-section">
                            <h5><i class="fas fa-lock"></i> Role Information</h5>
                            <div class="form-group">
                                <label class="form-label">Role Name</label>
                                <input type="text" class="form-input" placeholder="e.g., Fleet Manager" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Role Description</label>
                                <textarea class="form-textarea" placeholder="Describe the responsibilities and scope of this role"></textarea>
                            </div>
                        </div>

                        <div class="form-section">
                            <h5><i class="fas fa-check-circle"></i> Permissions</h5>
                            <div class="form-check">
                                <input type="checkbox" id="perm-user-management">
                                <label for="perm-user-management">User Management</label>
                            </div>
                            <div class="form-check">
                                <input type="checkbox" id="perm-breakdown-tickets">
                                <label for="perm-breakdown-tickets">Breakdown Ticket Management</label>
                            </div>
                            <div class="form-check">
                                <input type="checkbox" id="perm-inventory">
                                <label for="perm-inventory">Inventory Management</label>
                            </div>
                            <div class="form-check">
                                <input type="checkbox" id="perm-service">
                                <label for="perm-service">Service Configuration</label>
                            </div>
                            <div class="form-check">
                                <input type="checkbox" id="perm-petty-cash">
                                <label for="perm-petty-cash">Petty Cash Management</label>
                            </div>
                            <div class="form-check">
                                <input type="checkbox" id="perm-reports">
                                <label for="perm-reports">Reports & Analytics</label>
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary">Create Role</button>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#createRoleModal');
        const form = this.querySelector('#createRoleForm');

        this.addEventListener('click', (event) => {
            if (event.target === modal || event.target.closest('[data-close-modal]')) {
                this.close();
            }
        });

        form?.addEventListener('submit', (event) => {
            event.preventDefault();
            this.emitToast('Role created successfully.', 'success');
            this.close();
        });
    }

    emitToast(message, type = 'success') {
        this.dispatchEvent(new CustomEvent('sa-ui:toast', {
            bubbles: true,
            detail: { message, type },
        }));
    }

    close() {
        if (typeof window.closeModal === 'function') {
            window.closeModal('createRoleModal');
            return;
        }

        const modal = this.querySelector('#createRoleModal');
        if (!modal) {
            return;
        }

        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

customElements.define('sa-create-role-modal', SACreateRoleModal);
