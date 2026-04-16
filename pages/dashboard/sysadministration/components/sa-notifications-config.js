class SANotificationsConfig extends HTMLElement {
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
            <div class="page-header">
                <h1 class="page-title">Notification Templates</h1>
                <p class="page-subtitle">Manage email and SMS notification templates</p>
            </div>

            <div style="margin-bottom: 20px;">
                <button class="btn btn-primary" type="button" data-action="open-create-template">
                    <i class="fas fa-plus"></i> Create New Template
                </button>
            </div>

            <div class="card">
                <div class="card-header"><i class="fas fa-envelope"></i> Email Templates</div>
                ${this.renderEmailTemplateItem('TPL-001', 'Breakdown Alert Notification', 'Breakdown Management', 'Urgent: Breakdown Reported - {vehicle_id}')}
                ${this.renderEmailTemplateItem('TPL-002', 'Service Reminder Notification', 'Maintenance', 'Service Due: {vehicle_id} - {service_type}')}
                ${this.renderEmailTemplateItem('TPL-003', 'Parts Approval Request', 'Inventory', 'Parts Request Pending Approval - {request_id}')}
                ${this.renderEmailTemplateItem('TPL-004', 'Auction Notice', 'Auction Management', 'New Auction Listing - {item_description}')}
            </div>

            <div class="card">
                <div class="card-header"><i class="fas fa-mobile-alt"></i> SMS Templates</div>
                ${this.renderSmsTemplateItem('TPL-SMS-001', 'Breakdown Alert SMS', 'Breakdown Management')}
                ${this.renderSmsTemplateItem('TPL-SMS-002', 'Service Reminder SMS', 'Maintenance')}
            </div>
        `;
    }

    renderEmailTemplateItem(id, name, category, subject) {
        return `
            <div class="user-item">
                <div class="user-details">
                    <strong>${name}</strong>
                    <div class="user-meta">Type: Email | Category: ${category}</div>
                    <div class="user-meta" style="margin-top: 5px;">
                        <strong>Subject:</strong> ${subject}<br>
                        <strong>Preview:</strong> Template preview for ${name}...
                    </div>
                </div>
                <div class="user-actions">
                    <span class="status-text status-active">Active</span>
                    <div style="margin-top: 5px;">
                        <button class="btn btn-secondary btn-small" type="button" data-action="preview-template" data-template-id="${id}">Preview</button>
                        <button class="btn btn-secondary btn-small" type="button" data-action="edit-template" data-template-id="${id}">Edit</button>
                        <button class="btn btn-warning btn-small" type="button" data-action="test-template" data-template-id="${id}">Test Send</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderSmsTemplateItem(id, name, category) {
        return `
            <div class="user-item">
                <div class="user-details">
                    <strong>${name}</strong>
                    <div class="user-meta">Type: SMS | Category: ${category}</div>
                    <div class="user-meta" style="margin-top: 5px;">
                        <strong>Message:</strong> Template preview text for ${name}.
                    </div>
                </div>
                <div class="user-actions">
                    <span class="status-text status-active">Active</span>
                    <div style="margin-top: 5px;">
                        <button class="btn btn-secondary btn-small" type="button" data-action="edit-template" data-template-id="${id}">Edit</button>
                        <button class="btn btn-warning btn-small" type="button" data-action="test-template" data-template-id="${id}">Test Send</button>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (!button) {
                return;
            }

            const action = button.dataset.action;
            const templateId = button.dataset.templateId;

            if (action === 'open-create-template') {
                this.openModal('createTemplateModal');
                return;
            }

            if (action === 'preview-template') {
                this.openPreview(templateId);
                return;
            }

            if (action === 'edit-template') {
                this.openEdit(templateId);
                return;
            }

            if (action === 'test-template') {
                this.openTest(templateId);
            }
        });
    }

    openModal(modalId) {
        if (typeof window.openModal === 'function') {
            window.openModal(modalId);
            return;
        }

        const modal = document.getElementById(modalId);
        if (!modal) {
            return;
        }

        modal.classList.add('active');
        modal.style.display = 'flex';
    }

    closeModal(modalId) {
        if (typeof window.closeModal === 'function') {
            window.closeModal(modalId);
            return;
        }

        const modal = document.getElementById(modalId);
        if (!modal) {
            return;
        }

        modal.classList.remove('active');
        modal.style.display = 'none';
    }

    openDetailsModal(titleText, contentHtml, onReady) {
        const title = document.getElementById('detailsTitle');
        const content = document.getElementById('detailsContent');

        if (!title || !content) {
            return;
        }

        title.textContent = titleText;
        content.innerHTML = contentHtml;

        if (typeof onReady === 'function') {
            onReady(content);
        }

        this.openModal('detailsModal');
    }

    emitToast(message, type = 'success') {
        this.dispatchEvent(new CustomEvent('sa-ui:toast', {
            bubbles: true,
            detail: { message, type },
        }));
    }

    openPreview(templateId) {
        this.openDetailsModal(
            `Preview Template: ${templateId}`,
            `
                <div class="form-section">
                    <h5>Template Preview</h5>
                    <div style="background: var(--light-bg); padding: 20px; border-radius: 8px; margin-top: 15px;">
                        <div style="margin-bottom: 10px;"><strong>Template ID:</strong> ${templateId}</div>
                        <div style="padding: 15px; background: white; border-radius: 5px; white-space: pre-wrap; font-family: monospace; font-size: 13px;">
Subject: Sample subject for ${templateId}

Hello {recipient_name},

This is a preview message body for template ${templateId}.

Regards,
AssetCare360
                        </div>
                    </div>
                </div>
                <div style="text-align: right; margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                    <button type="button" class="btn btn-secondary" data-action="close-details">Close</button>
                    <button type="button" class="btn btn-primary" data-action="edit-template">Edit Template</button>
                </div>
            `,
            (content) => {
                content.querySelector('[data-action="close-details"]')?.addEventListener('click', () => {
                    this.closeModal('detailsModal');
                });
                content.querySelector('[data-action="edit-template"]')?.addEventListener('click', () => {
                    this.closeModal('detailsModal');
                    this.openEdit(templateId);
                });
            }
        );
    }

    openEdit(templateId) {
        this.openDetailsModal(
            `Edit Template: ${templateId}`,
            `
                <form id="editTemplateForm">
                    <div class="form-section">
                        <h5>Template Information</h5>
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Template Name</label>
                                <input type="text" class="form-input" value="Template ${templateId}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Template Type</label>
                                <select class="form-select" required>
                                    <option value="email">Email</option>
                                    <option value="sms">SMS</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Message Body</label>
                            <textarea class="form-textarea" rows="6" required>Message content for ${templateId}</textarea>
                        </div>
                    </div>
                    <div style="text-align: right; margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                        <button type="button" class="btn btn-secondary" data-action="close-details">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                    </div>
                </form>
            `,
            (content) => {
                content.querySelector('[data-action="close-details"]')?.addEventListener('click', () => {
                    this.closeModal('detailsModal');
                });

                content.querySelector('#editTemplateForm')?.addEventListener('submit', (event) => {
                    event.preventDefault();
                    this.emitToast(`Template ${templateId} updated successfully!`, 'success');
                    this.closeModal('detailsModal');
                });
            }
        );
    }

    openTest(templateId) {
        this.openDetailsModal(
            `Test Template: ${templateId}`,
            `
                <form id="testTemplateForm">
                    <div class="form-section">
                        <h5>Send Test Notification</h5>
                        <div class="form-group">
                            <label class="form-label">Recipient Email/Phone</label>
                            <input type="text" class="form-input" placeholder="Enter test recipient" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Test Data (JSON format)</label>
                            <textarea class="form-textarea" rows="6" required>{
  "vehicle_id": "VEH-001",
  "priority": "High",
  "recipient_name": "Test User"
}</textarea>
                        </div>
                    </div>
                    <div style="text-align: right; margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                        <button type="button" class="btn btn-secondary" data-action="close-details">Cancel</button>
                        <button type="submit" class="btn btn-warning">Send Test</button>
                    </div>
                </form>
            `,
            (content) => {
                content.querySelector('[data-action="close-details"]')?.addEventListener('click', () => {
                    this.closeModal('detailsModal');
                });

                content.querySelector('#testTemplateForm')?.addEventListener('submit', (event) => {
                    event.preventDefault();
                    this.emitToast(`Test notification sent successfully using template ${templateId}!`, 'success');
                    this.closeModal('detailsModal');
                });
            }
        );
    }
}

customElements.define('sa-notifications-config', SANotificationsConfig);
