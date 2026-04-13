class SupervisorCreateTicketModal extends HTMLElement {
    constructor() {
        super();
        this._initialized = false;
        this._photos = [];
        this._driverReports = [];
        this._operatorReports = [];
        this._reportsById = new Map();
        this._onDocumentKeydown = this._onDocumentKeydown.bind(this);
    }

    connectedCallback() {
        if (this._initialized) return;
        this.render();
        this.bindEvents();
        document.addEventListener('keydown', this._onDocumentKeydown);
        this._initialized = true;
    }

    disconnectedCallback() {
        document.removeEventListener('keydown', this._onDocumentKeydown);
    }

    get modalElement() {
        return this.querySelector('#createTicketModal');
    }

    get formElement() {
        return this.querySelector('#createTicketForm');
    }

    isOpen() {
        return this.modalElement?.classList.contains('active') || false;
    }

    async open(options = {}) {
        const { prefillReportId = null } = options;

        await this.loadBreakdownReports();
        this.resetForm();

        if (prefillReportId !== null && prefillReportId !== undefined && prefillReportId !== '') {
            this.selectReport(prefillReportId);
        }

        const modal = this.modalElement;
        if (!modal) return;

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    async openFromBreakdown(report) {
        const preferredId = report?.breakdown_id || report?.route_breakdown_id || report?.report_id || report?.id || '';
        await this.open({ prefillReportId: preferredId });
        this.emitToast('Create a fault ticket from this breakdown report', 'info');
    }

    close() {
        const modal = this.modalElement;
        if (!modal) return;

        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    render() {
        this.innerHTML = `
            <div id="createTicketModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>
                            <i class="fas fa-ticket-alt"></i> Create New Fault Ticket
                        </h2>
                        <button class="btn-close" type="button" data-create-modal-close>&times;</button>
                    </div>
                    <form id="createTicketForm">
                        <div class="form-section">
                            <h3 class="form-section-title">
                                <i class="fas fa-info-circle"></i> Ticket Information
                            </h3>

                            <div class="form-group">
                                <label for="breakdownReportId">Breakdown Report</label>
                                <select id="breakdownReportId" name="breakdown_report_id" required>
                                    <option value="">Select Breakdown Report</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label for="issueTitle">Issue Title</label>
                                <input type="text" id="issueTitle" name="issue_title" placeholder="Brief description of issue" required>
                            </div>

                            <div class="form-group">
                                <label for="issueDescription">Issue Description</label>
                                <textarea id="issueDescription" name="issue_description" rows="4" placeholder="Detailed description of the fault..." required></textarea>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label for="priority">Priority</label>
                                    <select id="priority" name="priority" required>
                                        <option value="low">Low</option>
                                        <option value="medium" selected>Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div class="form-section">
                            <h3 class="form-section-title">
                                <i class="fas fa-camera"></i> Photo Documentation (Optional)
                            </h3>
                            <div class="photo-upload-area">
                                <div class="photo-upload" data-create-photo-trigger>
                                    <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; color: var(--royal-blue);"></i>
                                    <p><strong>Click to upload photos</strong></p>
                                    <p style="font-size: 0.85rem; color: var(--muted);">Maximum 5 images (JPEG, PNG, WebP)</p>
                                    <input type="file" id="ticketPhotos" name="photos[]" accept="image/jpeg,image/png,image/webp" multiple style="display: none;">
                                </div>
                                <div id="createTicketPhotoPreview" class="photo-preview-container"></div>
                            </div>
                        </div>

                        <div class="modal-actions">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-ticket-alt"></i> CREATE TICKET
                            </button>
                            <button type="button" class="btn btn-secondary" data-create-modal-close>
                                CANCEL
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const closeButton = event.target.closest('[data-create-modal-close]');
            if (closeButton) {
                this.close();
                return;
            }

            const photoTrigger = event.target.closest('[data-create-photo-trigger]');
            if (photoTrigger) {
                const photoInput = this.querySelector('#ticketPhotos');
                photoInput?.click();
                return;
            }

            const removeButton = event.target.closest('[data-remove-photo-index]');
            if (removeButton) {
                const removeIndex = Number(removeButton.dataset.removePhotoIndex);
                if (Number.isFinite(removeIndex)) {
                    this.removePhoto(removeIndex);
                }
                return;
            }

            if (event.target === this.modalElement) {
                this.close();
            }
        });

        this.addEventListener('change', (event) => {
            if (event.target.id === 'breakdownReportId') {
                this.populateTicketFromReport();
                return;
            }

            if (event.target.id === 'ticketPhotos') {
                this.handlePhotoUpload(event);
            }
        });

        this.addEventListener('submit', (event) => {
            if (event.target.id !== 'createTicketForm') return;
            this.handleSubmit(event);
        });
    }

    _onDocumentKeydown(event) {
        if (event.key !== 'Escape' || !this.isOpen()) return;
        this.close();
    }

    emitToast(message, type = 'info') {
        this.dispatchEvent(new CustomEvent('supervisor-ticket-modal:toast', {
            bubbles: true,
            detail: { message, type }
        }));
    }

    resetForm() {
        const form = this.formElement;
        form?.reset();
        this._photos = [];
        this.updatePhotoPreview();
    }

    setReportMapEntry(reportId, reportObj) {
        const stringKey = String(reportId);
        this._reportsById.set(stringKey, reportObj);

        const numericKey = Number(reportId);
        if (Number.isFinite(numericKey)) {
            this._reportsById.set(numericKey, reportObj);
        }
    }

    async loadBreakdownReports() {
        const select = this.querySelector('#breakdownReportId');
        if (!select) return;

        select.innerHTML = '<option value="">Loading reports...</option>';

        try {
            const token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);

            if (this._driverReports.length === 0 && this._operatorReports.length === 0) {
                const [vehicleResponse, routeResponse, faultResponse] = await Promise.all([
                    fetch(`${CONFIG.API_BASE_URL}/breakdown-reports`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    fetch(`${CONFIG.API_BASE_URL}/route-breakdowns`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    fetch(`${CONFIG.API_BASE_URL}/fault-tickets`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                ]);

                this._driverReports = [];
                this._operatorReports = [];
                this._reportsById = new Map();

                if (vehicleResponse.ok) {
                    const vehicleData = await vehicleResponse.json();
                    if (vehicleData.status === 'success' && vehicleData.data?.reports) {
                        vehicleData.data.reports.forEach((report) => {
                            const reportObj = {
                                ...report,
                                report_type: 'Vehicle Breakdown',
                                breakdown_type: 'vehicle_breakdown',
                                report_id: report.breakdown_id,
                                date: report.breakdown_date,
                                source: 'driver'
                            };
                            this._driverReports.push(reportObj);
                            this.setReportMapEntry(reportObj.report_id, reportObj);
                        });
                    }
                }

                if (routeResponse.ok) {
                    const routeData = await routeResponse.json();
                    if (routeData.status === 'success' && routeData.data?.breakdowns) {
                        routeData.data.breakdowns.forEach((breakdown) => {
                            const reportObj = {
                                ...breakdown,
                                report_type: 'Route Breakdown',
                                breakdown_type: 'route_breakdown',
                                report_id: breakdown.route_breakdown_id,
                                date: breakdown.breakdown_datetime,
                                source: 'driver'
                            };
                            this._driverReports.push(reportObj);
                            this.setReportMapEntry(reportObj.report_id, reportObj);
                        });
                    }
                }

                if (faultResponse.ok) {
                    const faultData = await faultResponse.json();
                    if (faultData.status === 'success' && faultData.data?.tickets) {
                        faultData.data.tickets.forEach((ticket) => {
                            const reportObj = {
                                ...ticket,
                                report_type: 'Fault Ticket',
                                breakdown_type: 'fault_ticket',
                                report_id: ticket.ticket_id,
                                date: ticket.created_at,
                                source: 'operator'
                            };
                            this._operatorReports.push(reportObj);
                            this.setReportMapEntry(reportObj.report_id, reportObj);
                        });
                    }
                }
            }

            select.innerHTML = '<option value="">Select Breakdown Report</option>';
            const allReports = [...this._driverReports, ...this._operatorReports];

            if (allReports.length === 0) {
                select.innerHTML += '<option value="" disabled>No breakdown reports available</option>';
                return;
            }

            allReports
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .forEach((report) => {
                    const option = document.createElement('option');
                    option.value = report.report_id;

                    const assetName = report.vehicle_registration_no || report.machine_name || 'N/A';
                    const source = report.source === 'driver' ? 'Driver' : 'Machine';
                    const status = report.status ? ` [${report.status.toUpperCase()}]` : '';
                    const reportDate = new Date(report.date).toLocaleDateString();
                    option.textContent = `${source} ${report.report_type} #${report.report_id} - ${assetName}${status} (${reportDate})`;

                    select.appendChild(option);
                });
        } catch (error) {
            console.error('Error loading breakdown reports:', error);
            select.innerHTML = '<option value="">Error loading reports</option>';
            this.emitToast('Failed to load breakdown reports', 'error');
        }
    }

    selectReport(reportId) {
        const select = this.querySelector('#breakdownReportId');
        if (!select) return;

        const targetValue = String(reportId);
        const option = Array.from(select.options).find((item) => String(item.value) === targetValue);
        if (!option) return;

        select.value = option.value;
        this.populateTicketFromReport();
    }

    populateTicketFromReport() {
        const select = this.querySelector('#breakdownReportId');
        const issueTitleInput = this.querySelector('#issueTitle');
        const issueDescriptionInput = this.querySelector('#issueDescription');
        const priorityInput = this.querySelector('#priority');

        if (!select || !issueTitleInput || !issueDescriptionInput || !priorityInput) {
            return;
        }

        const reportId = select.value;
        if (!reportId) {
            issueTitleInput.value = '';
            issueDescriptionInput.value = '';
            return;
        }

        const report = this._reportsById.get(reportId) || this._reportsById.get(Number(reportId));
        if (!report) {
            console.warn('Report not found for selected ID:', reportId);
            return;
        }

        const assetName = report.vehicle_registration_no || report.machine_name || 'Asset';
        issueTitleInput.value = `${report.report_type} - ${assetName}`;

        let description = report.description || report.issue_description || report.fault_description || '';
        if (report.location) description += `\n\nLocation: ${report.location}`;
        if (report.severity) description += `\nSeverity: ${report.severity}`;
        if (report.fault_type) description += `\nFault Type: ${report.fault_type}`;
        if (report.reported_by) description += `\nReported By: ${report.reported_by}`;

        issueDescriptionInput.value = description.trim();

        if (report.severity) {
            const severityLower = report.severity.toLowerCase();
            if (severityLower.includes('critical')) {
                priorityInput.value = 'critical';
            } else if (severityLower.includes('high')) {
                priorityInput.value = 'high';
            } else if (severityLower.includes('medium')) {
                priorityInput.value = 'medium';
            } else {
                priorityInput.value = 'low';
            }
        } else if (report.priority) {
            priorityInput.value = String(report.priority).toLowerCase();
        }
    }

    handlePhotoUpload(event) {
        const files = Array.from(event.target.files || []);
        const maxFiles = 5;

        if (this._photos.length + files.length > maxFiles) {
            this.emitToast(`Maximum ${maxFiles} photos allowed`, 'error');
            event.target.value = '';
            return;
        }

        this._photos.push(...files);
        this.updatePhotoPreview();
        event.target.value = '';
    }

    updatePhotoPreview() {
        const container = this.querySelector('#createTicketPhotoPreview');
        if (!container) return;

        container.innerHTML = '';
        if (this._photos.length === 0) {
            return;
        }

        this._photos.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (loadedEvent) => {
                const previewItem = document.createElement('div');
                previewItem.className = 'photo-preview-item';
                previewItem.innerHTML = `
                    <img src="${loadedEvent.target?.result || ''}" alt="${file.name}">
                    <button type="button" class="remove-photo" data-remove-photo-index="${index}">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="photo-name">${file.name}</div>
                `;
                container.appendChild(previewItem);
            };
            reader.readAsDataURL(file);
        });
    }

    removePhoto(index) {
        this._photos.splice(index, 1);
        this.updatePhotoPreview();
        this.emitToast('Photo removed', 'success');
    }

    async handleSubmit(event) {
        event.preventDefault();

        const breakdownReportId = this.querySelector('#breakdownReportId')?.value;
        const issueTitle = this.querySelector('#issueTitle')?.value || '';
        const issueDescription = this.querySelector('#issueDescription')?.value || '';
        const priority = this.querySelector('#priority')?.value || 'medium';

        if (!breakdownReportId) {
            this.emitToast('Please select a breakdown report', 'error');
            return;
        }

        const selectedReport = this._reportsById.get(breakdownReportId)
            || this._reportsById.get(Number(breakdownReportId));

        const formData = new FormData();

        if (selectedReport?.vehicle_id) {
            formData.append('vehicle_id', selectedReport.vehicle_id);
        }
        if (selectedReport?.machine_id) {
            formData.append('machine_id', selectedReport.machine_id);
        }
        if (selectedReport?.breakdown_type) {
            formData.append('breakdown_type', selectedReport.breakdown_type);
        }

        const description = `${issueTitle}\n\n${issueDescription}`;
        const capitalizedPriority = priority.charAt(0).toUpperCase() + priority.slice(1);

        formData.append('breakdown_report_id', breakdownReportId);
        formData.append('description', description);
        formData.append('priority', capitalizedPriority);

        this._photos.forEach((photo) => {
            formData.append('photos[]', photo);
        });

        try {
            const response = await API.postFormData('/fault-tickets', formData);

            if (response.status === 'success') {
                this.close();
                this.emitToast('Fault ticket created successfully', 'success');
                this.dispatchEvent(new CustomEvent('supervisor-create-ticket-modal:created', {
                    bubbles: true,
                    detail: {
                        ticketId: response.data?.id || null,
                        ticket: response.data || null
                    }
                }));
                return;
            }

            if (response.errors) {
                const errorMessages = Object.values(response.errors).join(', ');
                this.emitToast(errorMessages || response.message || 'Failed to create ticket', 'error');
            } else {
                this.emitToast(response.message || 'Failed to create ticket', 'error');
            }
        } catch (error) {
            console.error('Error creating ticket:', error);
            this.emitToast(error.message || 'Failed to create ticket', 'error');
        }
    }
}

if (!customElements.get('supervisor-create-ticket-modal')) {
    customElements.define('supervisor-create-ticket-modal', SupervisorCreateTicketModal);
}
