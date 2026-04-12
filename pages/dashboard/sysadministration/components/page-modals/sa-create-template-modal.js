class SACreateTemplateModal extends HTMLElement {
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
            <div id="createTemplateModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <button class="close" type="button" data-close-modal>&times;</button>
                    <h2 style="margin-bottom: 20px; color: var(--tang-blue);">Create Notification Template</h2>
                    <form id="createTemplateForm">
                        <div class="form-section">
                            <h5><i class="fas fa-envelope"></i> Template Information</h5>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Template Name</label>
                                    <input type="text" class="form-input" placeholder="e.g., Parts Rejection Notice" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Template Type</label>
                                    <select class="form-select" required>
                                        <option value="">Select Type</option>
                                        <option value="email">Email</option>
                                        <option value="sms">SMS</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Category</label>
                                <select class="form-select" required>
                                    <option value="">Select Category</option>
                                    <option value="breakdown">Breakdown Management</option>
                                    <option value="maintenance">Maintenance</option>
                                    <option value="inventory">Inventory</option>
                                    <option value="auction">Auction Management</option>
                                    <option value="general">General</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-section">
                            <h5><i class="fas fa-envelope-open-text"></i> Email Content (if Email type)</h5>
                            <div class="form-group">
                                <label class="form-label">Subject Line</label>
                                <input type="text" class="form-input" placeholder="Use variables like {vehicle_id}, {ticket_id}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Message Body</label>
                                <textarea class="form-textarea" rows="6" placeholder="Enter message template. Use variables like {name}, {vehicle_id}, {date}, etc."></textarea>
                            </div>
                        </div>

                        <div class="form-section">
                            <h5><i class="fas fa-mobile-alt"></i> SMS Content (if SMS type)</h5>
                            <div class="form-group">
                                <label class="form-label">Message (160 characters max)</label>
                                <textarea class="form-textarea" rows="3" placeholder="Enter SMS template" maxlength="160"></textarea>
                                <small style="color: var(--muted);">Character count: 0/160</small>
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary">Create Template</button>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#createTemplateModal');
        const form = this.querySelector('#createTemplateForm');

        this.addEventListener('click', (event) => {
            if (event.target === modal || event.target.closest('[data-close-modal]')) {
                this.close();
            }
        });

        form?.addEventListener('submit', (event) => {
            event.preventDefault();
            this.emitToast('Notification template created.', 'success');
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
            window.closeModal('createTemplateModal');
            return;
        }

        const modal = this.querySelector('#createTemplateModal');
        if (!modal) {
            return;
        }

        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

customElements.define('sa-create-template-modal', SACreateTemplateModal);
