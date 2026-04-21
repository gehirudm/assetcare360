class MaintenanceCreateServiceTicketModal extends HTMLElement {
    constructor() {
        super();
        this._mounted = false;
        this.assets = [];
        this.technicians = [];
        this.allowedServiceTypes = new Set([
            'Preventive Maintenance',
            'Major Service',
            'Routine Check',
            'Inspection',
            'Repair',
            'Emergency Repair',
        ]);
        this.allowedPriorities = new Set(['Low', 'Medium', 'High', 'Critical']);
        this._onDocumentKeydown = this._onDocumentKeydown.bind(this);
    }

    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.render();
        this.bindEvents();
        document.addEventListener('keydown', this._onDocumentKeydown);
    }

    disconnectedCallback() {
        document.removeEventListener('keydown', this._onDocumentKeydown);
    }

    render() {
        this.innerHTML = `
            <div id="createServiceTicketModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-plus-circle"></i> Create Service Ticket</h2>
                        <button type="button" class="btn-close" data-action="close-modal">&times;</button>
                    </div>
                    <form id="createServiceTicketForm">
                        <div class="form-section">
                            <h5><i class="fas fa-cubes"></i> Asset & Service Details</h5>

                            <div class="form-group">
                                <label class="form-label" for="createServiceTicketAsset">Asset</label>
                                <select id="createServiceTicketAsset" class="form-select" name="asset_key" required></select>
                                <small id="createServiceAssetHint" class="assignment-hint">Pick the asset requiring service. Current service status is shown below.</small>
                                <input id="createServiceTicketAssetLockedValue" type="hidden" value="">
                            </div>

                            <div class="readonly-field" id="createServiceAssetSummary">
                                Select an asset to preview service status.
                            </div>

                            <div class="form-row" style="margin-top: 12px;">
                                <div class="form-group">
                                    <label class="form-label" for="createServiceType">Service Type</label>
                                    <select id="createServiceType" class="form-select" name="service_type" required>
                                        <option value="">Select Service Type</option>
                                        <option value="Preventive Maintenance">Preventive Maintenance</option>
                                        <option value="Major Service">Major Service</option>
                                        <option value="Routine Check">Routine Check</option>
                                        <option value="Inspection">Inspection</option>
                                        <option value="Repair">Repair</option>
                                        <option value="Emergency Repair">Emergency Repair</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label" for="createServicePriority">Priority</label>
                                    <select id="createServicePriority" class="form-select" name="priority" required>
                                        <option value="Medium">Medium</option>
                                        <option value="Low">Low</option>
                                        <option value="High">High</option>
                                        <option value="Critical">Critical</option>
                                    </select>
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label" for="createServiceExpectedCompletionDate">Expected Completion Date</label>
                                    <input id="createServiceExpectedCompletionDate" type="date" class="form-input" name="expected_completion_date">
                                </div>
                                <div class="form-group">
                                    <label class="form-label" for="createServiceEstimatedCost">Estimated Cost (LKR)</label>
                                    <input id="createServiceEstimatedCost" type="number" min="0" step="0.01" class="form-input" name="estimated_cost" placeholder="0.00">
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="form-label" for="createServiceDescription">Description</label>
                                <textarea id="createServiceDescription" class="form-textarea" name="description" placeholder="Describe the required service work..." required></textarea>
                            </div>

                            <div class="form-group">
                                <label class="form-label" for="createServiceMaintenanceNotes">Maintenance Notes (Optional)</label>
                                <textarea id="createServiceMaintenanceNotes" class="form-textarea" name="maintenance_notes" placeholder="Any assignment context or instructions for technicians"></textarea>
                            </div>
                        </div>

                        <div class="form-section">
                            <h5><i class="fas fa-user-cog"></i> Technician Assignment</h5>
                            <small class="assignment-hint">Select a technical officer before creating the service ticket. Technicians are sorted by workload and include expertise indicators.</small>
                            <div id="createServiceTicketTechnicians" class="checkbox-list" style="margin-top: 10px;"></div>
                        </div>

                        <div class="modal-actions">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> Create Service Ticket
                            </button>
                            <button type="button" class="btn btn-secondary" data-action="close-modal">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionNode = event.target.closest('[data-action]');
            if (actionNode && actionNode.dataset.action === 'close-modal') {
                this.close();
                return;
            }

            if (event.target.id === 'createServiceTicketModal') {
                this.close();
            }
        });

        this.addEventListener('change', (event) => {
            const assetSelect = event.target.closest('select[name="asset_key"]');
            if (!assetSelect) {
                return;
            }

            this.updateAssetSummary();
        });

        this.addEventListener('submit', async (event) => {
            const form = event.target.closest('#createServiceTicketForm');
            if (!form) {
                return;
            }

            event.preventDefault();
            await this.handleSubmit(form);
        });
    }

    _onDocumentKeydown(event) {
        if (event.key !== 'Escape') {
            return;
        }

        if (!this.isOpen()) {
            return;
        }

        this.close();
    }

    get modalElement() {
        return this.querySelector('#createServiceTicketModal');
    }

    get formElement() {
        return this.querySelector('#createServiceTicketForm');
    }

    isOpen() {
        const modal = this.modalElement;
        if (!modal) {
            return false;
        }

        return modal.classList.contains('active');
    }

    open(options = {}) {
        this.assets = Array.isArray(options.assets) ? options.assets : [];
        this.technicians = Array.isArray(options.technicians) ? options.technicians : [];

        const requestedAssetKey = String(options.defaultAssetKey || '').trim();
        const defaultAssetKey = requestedAssetKey && this.assets.some((asset) => asset.key === requestedAssetKey)
            ? requestedAssetKey
            : '';

        this.populateAssetOptions(defaultAssetKey);
        this.populateTechnicianOptions(String(options.defaultAssignedTo || '').trim());
        this.resetFormFields();
        this.applyDateConstraints();

        if (defaultAssetKey) {
            const assetSelect = this.querySelector('select[name="asset_key"]');
            if (assetSelect) {
                assetSelect.value = defaultAssetKey;
            }
        }

        this.setAssetLockState(Boolean(defaultAssetKey), defaultAssetKey);

        this.updateAssetSummary();
        this.showModal();
    }

    setAssetLockState(locked, lockedAssetKey = '') {
        const assetSelect = this.querySelector('select[name="asset_key"]');
        const lockedInput = this.querySelector('#createServiceTicketAssetLockedValue');
        const assetHint = this.querySelector('#createServiceAssetHint');

        if (!assetSelect || !lockedInput) {
            return;
        }

        if (locked && lockedAssetKey) {
            assetSelect.disabled = true;
            assetSelect.dataset.locked = 'true';

            lockedInput.name = 'asset_key';
            lockedInput.value = lockedAssetKey;

            if (assetHint) {
                assetHint.textContent = 'Asset is locked because this modal was opened from an asset row.';
            }

            return;
        }

        assetSelect.disabled = false;
        assetSelect.dataset.locked = 'false';

        lockedInput.name = '';
        lockedInput.value = '';

        if (assetHint) {
            assetHint.textContent = 'Pick the asset requiring service. Current service status is shown below.';
        }
    }

    showModal() {
        const modal = this.modalElement;
        if (!modal) {
            return;
        }

        modal.classList.add('active');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    close() {
        const modal = this.modalElement;
        if (!modal) {
            return;
        }

        modal.classList.remove('active');
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }

    resetFormFields() {
        const form = this.formElement;
        if (!form) {
            return;
        }

        form.reset();
    }

    getTodayDateString() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    applyDateConstraints() {
        const expectedDateInput = this.querySelector('input[name="expected_completion_date"]');
        if (!expectedDateInput) {
            return;
        }

        expectedDateInput.min = this.getTodayDateString();
    }

    validateCreateForm(formData, form) {
        const assetKey = String(formData.get('asset_key') || '').trim();
        if (!assetKey.includes(':')) {
            return { valid: false, message: 'Please select a valid asset.' };
        }

        const [assetType, assetIdRaw] = assetKey.split(':');
        const assetId = Number(assetIdRaw);
        if (!['vehicle', 'machine'].includes(assetType) || !Number.isInteger(assetId) || assetId <= 0) {
            return { valid: false, message: 'Please select a valid asset.' };
        }

        const serviceType = String(formData.get('service_type') || '').trim();
        if (!serviceType || !this.allowedServiceTypes.has(serviceType)) {
            return { valid: false, message: 'Please select a valid service type.' };
        }

        const priority = String(formData.get('priority') || 'Medium').trim() || 'Medium';
        if (!this.allowedPriorities.has(priority)) {
            return { valid: false, message: 'Please select a valid priority.' };
        }

        const description = String(formData.get('description') || '').trim();
        if (description.length < 10) {
            return { valid: false, message: 'Description must be at least 150 characters.' };
        }

        if (description.length > 1000) {
            return { valid: false, message: 'Description cannot exceed 1000 characters.' };
        }

        const selectedTechnician = form.querySelector('input[name="assigned_to"]:checked');
        const assignedTo = selectedTechnician ? String(selectedTechnician.value || '').trim() : '';
        if (!assignedTo || !Number.isInteger(Number(assignedTo)) || Number(assignedTo) <= 0) {
            return { valid: false, message: 'Please select a technical officer before creating the service ticket.' };
        }

        const expectedCompletionDate = String(formData.get('expected_completion_date') || '').trim();
        if (expectedCompletionDate) {
            const datePattern = /^\d{4}-\d{2}-\d{2}$/;
            if (!datePattern.test(expectedCompletionDate)) {
                return { valid: false, message: 'Please provide a valid expected completion date.' };
            }

            const today = this.getTodayDateString();
            if (expectedCompletionDate < today) {
                return { valid: false, message: 'Expected completion date cannot be in the past.' };
            }
        }

        const estimatedCostRaw = String(formData.get('estimated_cost') || '').trim();
        if (estimatedCostRaw !== '') {
            const estimatedCost = Number(estimatedCostRaw);
            if (!Number.isFinite(estimatedCost) || estimatedCost < 0) {
                return { valid: false, message: 'Estimated cost must be a non-negative number.' };
            }
        }

        const maintenanceNotes = String(formData.get('maintenance_notes') || '').trim();
        if (maintenanceNotes.length > 2000) {
            return { valid: false, message: 'Maintenance notes cannot exceed 2000 characters.' };
        }

        return {
            valid: true,
            data: {
                assetType,
                assetId,
                serviceType,
                priority,
                description,
                assignedTo,
                expectedCompletionDate: expectedCompletionDate || null,
                estimatedCost: estimatedCostRaw || null,
                maintenanceNotes: maintenanceNotes || null,
            },
        };
    }

    populateAssetOptions(defaultAssetKey = '') {
        const assetSelect = this.querySelector('select[name="asset_key"]');
        if (!assetSelect) {
            return;
        }

        const options = this.assets.map((asset) => {
            return `<option value="${this.escapeHtml(asset.key)}">${this.escapeHtml(asset.label || asset.asset_name || asset.key)}</option>`;
        }).join('');

        assetSelect.innerHTML = '<option value="">Select an asset</option>' + options;

        if (defaultAssetKey && this.assets.some((asset) => asset.key === defaultAssetKey)) {
            assetSelect.value = defaultAssetKey;
        }
    }

    populateTechnicianOptions(defaultAssignedTo = '') {
        const list = this.querySelector('#createServiceTicketTechnicians');
        if (!list) {
            return;
        }

        const sortedTechnicians = [...this.technicians].sort((first, second) => {
            const firstWorkload = Number(first.active_ticket_count || 0);
            const secondWorkload = Number(second.active_ticket_count || 0);
            if (firstWorkload !== secondWorkload) {
                return firstWorkload - secondWorkload;
            }

            return String(first.full_name || '').localeCompare(String(second.full_name || ''));
        });

        if (sortedTechnicians.length === 0) {
            list.innerHTML = `
                <div style="padding: 14px; text-align: center; color: var(--muted);">
                    No active technical officers available.
                </div>
            `;
            return;
        }

        const normalizedDefault = String(defaultAssignedTo || '').trim();
        const hasDefaultSelection = normalizedDefault !== ''
            && sortedTechnicians.some((technician) => Number(technician.id) === Number(normalizedDefault));
        const selectedTechnicianId = hasDefaultSelection
            ? Number(normalizedDefault)
            : Number(sortedTechnicians[0].id);

        const technicianRows = sortedTechnicians.map((technician) => {
            const technicianId = Number(technician.id);
            const isChecked = selectedTechnicianId === technicianId ? 'checked' : '';
            const workload = Number(technician.active_ticket_count || 0);
            const workloadClass = workload === 0 ? 'available' : workload <= 2 ? 'busy' : 'heavy';
            const workloadLabel = `${workload} active ticket${workload === 1 ? '' : 's'}`;
            const fullName = technician.full_name || technician.username || `Technical Officer #${technicianId}`;
            const expertise = String(technician.technical_expertise || 'General').trim() || 'General';

            return `
                <label class="checkbox-item">
                    <input type="radio" name="assigned_to" value="${technicianId}" ${isChecked}>
                    <span class="technician-details">
                        <span class="technician-name">${this.escapeHtml(fullName)}</span>
                        <span class="technician-expertise"><i class="fas fa-wrench"></i> ${this.escapeHtml(expertise)}</span>
                    </span>
                    <span class="technician-workload ${workloadClass}">${this.escapeHtml(workloadLabel)}</span>
                </label>
            `;
        }).join('');

        list.innerHTML = technicianRows;
    }

    updateAssetSummary() {
        const summaryNode = this.querySelector('#createServiceAssetSummary');
        const assetSelect = this.querySelector('select[name="asset_key"]');
        if (!summaryNode || !assetSelect) {
            return;
        }

        const selectedKey = String(assetSelect.value || '').trim();
        const asset = this.assets.find((item) => item.key === selectedKey);

        if (!asset) {
            summaryNode.textContent = 'Select an asset to preview service status.';
            return;
        }

        const statusLabel = this.escapeHtml(asset.service_status_label || 'Unknown');
        const statusClass = this.escapeHtml(asset.service_status_class || 'status-scheduled');
        const dueSummary = this.escapeHtml(asset.service_due_summary || 'No due schedule available.');
        const typeLabel = asset.asset_type === 'machine' ? 'Machine' : 'Vehicle';
        const reference = this.escapeHtml(asset.asset_reference || '-');

        summaryNode.innerHTML = `
            <strong>${this.escapeHtml(asset.asset_code || '')} - ${this.escapeHtml(asset.asset_name || 'Unknown Asset')}</strong>
            <div style="margin-top: 4px;">
                <span class="status-badge ${statusClass}">${statusLabel}</span>
                &nbsp;|&nbsp;
                <span>${this.escapeHtml(typeLabel)} (${reference})</span>
            </div>
            <div style="margin-top: 4px; color: var(--muted);">${dueSummary}</div>
        `;
    }

    async handleSubmit(form) {
        const formData = new FormData(form);
        const validation = this.validateCreateForm(formData, form);
        if (!validation.valid) {
            this.emitToast(validation.message || 'Please complete the form with valid values.', 'warning');
            return;
        }

        const {
            assetType,
            assetId,
            serviceType,
            description,
            priority,
            expectedCompletionDate,
            assignedTo,
            estimatedCost,
            maintenanceNotes,
        } = validation.data;

        const payload = {
            asset_type: assetType,
            asset_id: assetId,
            service_type: serviceType,
            description,
            priority,
            // Backend currently expects scheduled_date; map from the expected completion UI field.
            scheduled_date: expectedCompletionDate,
            assigned_to: assignedTo,
            estimated_cost: estimatedCost,
            maintenance_notes: maintenanceNotes,
        };

        try {
            const response = await API.post('/service-tickets', payload);
            if (!response || response.status !== 'success') {
                this.emitToast(response?.message || 'Failed to create service ticket.', 'error');
                return;
            }

            this.emitToast('Service ticket created successfully.', 'success');

            this.dispatchEvent(new CustomEvent('maintenance-service-ticket-modal:created', {
                bubbles: true,
                detail: {
                    ticket: response.data || null,
                },
            }));

            this.close();
        } catch (error) {
            console.error('Failed to create service ticket:', error);
            this.emitToast('Failed to create service ticket.', 'error');
        }
    }

    emitToast(message, type = 'info') {
        this.dispatchEvent(new CustomEvent('maintenance-ui:toast', {
            bubbles: true,
            detail: { message, type },
        }));
    }

    escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

customElements.define('maintenance-create-service-ticket-modal', MaintenanceCreateServiceTicketModal);
