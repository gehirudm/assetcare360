class SupervisorViewTicketModal extends HTMLElement {
    constructor() {
        super();
        this._initialized = false;
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
        return this.querySelector('#viewTicketModal');
    }

    get titleElement() {
        return this.querySelector('#viewTicketModal .modal-header h2');
    }

    get contentElement() {
        return this.querySelector('#viewTicketContent');
    }

    isOpen() {
        const modal = this.modalElement;
        if (!modal) return false;
        return window.getComputedStyle(modal).display === 'flex';
    }

    render() {
        this.innerHTML = `
            <div id="viewTicketModal" class="modal" style="display: none;">
                <div class="modal-content modal-content-large">
                    <div class="modal-header">
                        <h2>
                            <i class="fas fa-ticket-alt"></i> Ticket Details
                        </h2>
                        <button class="btn-close" type="button" data-view-modal-close>&times;</button>
                    </div>
                    <div id="viewTicketContent">
                        <!-- Ticket details will be loaded dynamically -->
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const closeButton = event.target.closest('[data-view-modal-close]');
            if (closeButton) {
                this.close();
                return;
            }

            if (event.target === this.modalElement) {
                this.close();
            }
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

    openWithContent({ title = 'Ticket Details', iconClass = 'fas fa-ticket-alt', content = '' }) {
        const titleElement = this.titleElement;
        const contentElement = this.contentElement;
        const modal = this.modalElement;

        if (!titleElement || !contentElement || !modal) {
            return;
        }

        titleElement.innerHTML = `<i class="${iconClass}"></i> ${title}`;
        contentElement.innerHTML = content;

        modal.style.display = 'flex';
        modal.style.opacity = '0';
        document.body.style.overflow = 'hidden';

        setTimeout(() => {
            modal.style.opacity = '1';
        }, 10);
    }

    close() {
        const modal = this.modalElement;
        const contentElement = this.contentElement;
        if (!modal) return;

        modal.style.opacity = '0';

        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            if (contentElement) {
                contentElement.innerHTML = '';
            }
        }, 300);
    }

    async openTicket(ticketId) {
        try {
            const response = await API.get(`/fault-tickets/${ticketId}`);
            const ticket = response?.data;

            if (!ticket) {
                this.emitToast('Failed to load ticket details', 'error');
                return;
            }

            const assetName = ticket.machine_model_number || ticket.machine_name || `Machine #${ticket.machine_id}`;
            const createdDate = new Date(ticket.created_at).toLocaleString();
            const updatedDate = ticket.updated_at ? new Date(ticket.updated_at).toLocaleString() : 'N/A';

            let imagesHTML = '';
            if (Array.isArray(ticket.images) && ticket.images.length > 0) {
                const baseURL = CONFIG.API_BASE_URL.replace('/api', '');
                imagesHTML = `
                    <div class="form-section">
                        <h5><i class="fas fa-images"></i> Attached Images</h5>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">
                            ${ticket.images.map((img) => `
                                <div style="border: 1px solid var(--stone-200); border-radius: 8px; overflow: hidden;">
                                    <a href="${baseURL}/uploads/fault-tickets/${img.image_url}" target="_blank" rel="noopener noreferrer">
                                        <img src="${baseURL}/uploads/fault-tickets/${img.image_url}" alt="${img.original_filename}" style="width: 100%; height: 200px; object-fit: cover; cursor: pointer;">
                                    </a>
                                    <div style="padding: 8px; font-size: 0.75rem; color: var(--muted);">
                                        ${img.original_filename}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            const detailsHTML = `
                <div class="form-section">
                    <h5><i class="fas fa-info-circle"></i> Ticket Information</h5>
                    <p><strong>Ticket ID:</strong> ${ticket.ticket_id || (`MBD-${String(ticket.id).padStart(3, '0')}`)}</p>
                    <p><strong>Status:</strong> ${(ticket.status === 'Resolved' || ticket.status === 'Closed')
                        ? '<span style="background: #10b981; color: white; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;"><i class="fas fa-check-circle"></i> FINISHED</span>'
                        : `<span class="status-text status-${(ticket.status || 'open').toLowerCase().replace(' ', '-')}">${(ticket.status || 'OPEN').toUpperCase().replace('_', ' ')}</span>`
                    }</p>
                    <p><strong>Priority:</strong> <span class="status-text status-${ticket.priority ? ticket.priority.toLowerCase() : 'normal'}">${(ticket.priority || 'NORMAL').toUpperCase()}</span></p>
                    <p><strong>Machine:</strong> ${assetName}</p>
                    ${ticket.location ? `<p><strong>Location:</strong> ${ticket.location}</p>` : ''}
                </div>

                <div class="form-section">
                    <h5><i class="fas fa-clipboard-list"></i> Description</h5>
                    <p style="white-space: pre-wrap; border-left: none; padding: 12px; background: var(--background); border-radius: 6px;">${ticket.description || 'No description provided'}</p>
                </div>

                ${imagesHTML}

                <div class="form-section">
                    <h5><i class="fas fa-user-cog"></i> Assignment Details</h5>
                    <p><strong>Reported By:</strong> ${ticket.reported_by_name || ticket.reporter_full_name || 'N/A'}</p>
                    <p><strong>Assigned To:</strong> ${ticket.assignments && ticket.assignments.length > 0
                        ? ticket.assignments.map((assignment) => assignment.technician_name).join(', ')
                        : 'Unassigned'
                    }</p>
                    <p><strong>Created:</strong> ${createdDate}</p>
                    <p><strong>Last Updated:</strong> ${updatedDate}</p>
                    ${ticket.assignments && ticket.assignments.length > 0 && ticket.assignments[0].expected_completion_date ? `
                        <p><strong>Expected Completion:</strong> ${new Date(ticket.assignments[0].expected_completion_date).toLocaleDateString()}</p>
                    ` : ''}
                    ${ticket.assignments && ticket.assignments.length > 0 && ticket.assignments[0].notes ? `
                        <p><strong>Assignment Notes:</strong></p>
                        <p style="white-space: pre-wrap; border-left: none; padding: 12px; background: var(--background); border-radius: 6px;">${ticket.assignments[0].notes}</p>
                    ` : ''}
                </div>

                ${ticket.resolution_notes ? `
                    <div class="form-section">
                        <h5><i class="fas fa-check-circle"></i> Resolution Notes</h5>
                        <p style="white-space: pre-wrap; border-left: none; padding: 12px; background: var(--background); border-radius: 6px;">${ticket.resolution_notes}</p>
                    </div>
                ` : ''}

                ${(ticket.status === 'Resolved' || ticket.status === 'Finished' || ticket.status === 'Completed') && ticket.work_updates && ticket.work_updates.length > 0 ? `
                    <div class="form-section">
                        <h5><i class="fas fa-tools" style="color: #27ae60;"></i> Work Completed - Finishing Details</h5>
                        ${ticket.work_updates.map((update) => `
                            <div style="padding: 15px; background: #e8f5e9; border-radius: 6px; border-left: 4px solid #27ae60; margin-bottom: 10px;">
                                <p style="margin: 0 0 8px 0; font-weight: 600; color: #27ae60;">
                                    <i class="fas fa-user-cog"></i> ${update.technician_name || 'Technical Officer'}
                                </p>
                                <p style="margin: 0 0 8px 0; color: var(--text-700);"><strong>Work Description:</strong> ${update.machine_description || 'N/A'}</p>
                                <p style="margin: 0 0 8px 0; color: var(--text-700);"><strong>Parts Used:</strong> ${update.parts_used || 'None'}</p>
                                <p style="margin: 0 0 8px 0; color: var(--text-700);"><strong>Time Spent:</strong> ${update.time_spent ? `${update.time_spent} hours` : 'N/A'}</p>
                                <p style="margin: 0 0 8px 0; color: var(--text-700);">
                                    <strong>Status:</strong>
                                    <span style="background: ${update.work_status === 'Completed' ? '#10b981' : '#f59e0b'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">
                                        ${update.work_status}
                                    </span>
                                </p>
                                <p style="margin: 0; color: #666; font-size: 0.9em;">
                                    <i class="fas fa-calendar-check"></i> Updated: ${new Date(update.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            `;

            this.openWithContent({
                title: 'Ticket Details',
                iconClass: 'fas fa-ticket-alt',
                content: detailsHTML
            });
        } catch (error) {
            console.error('Error loading ticket details:', error);
            this.emitToast('Failed to load ticket details', 'error');
        }
    }

    async openBreakdownDetails(type, id) {
        try {
            const endpoint = type === 'route_breakdown' ? `/route-breakdowns/${id}` : `/breakdown-reports/${id}`;
            const response = await API.get(endpoint);

            const report = type === 'route_breakdown'
                ? (response.data?.breakdown || response.data)
                : (response.data?.report || response.data);

            if (!report) {
                this.emitToast('Breakdown report not found', 'error');
                return;
            }

            const isRoute = type === 'route_breakdown';
            const typeLabel = isRoute ? 'Route Breakdown' : 'Vehicle Breakdown';
            const typeBadgeColor = isRoute ? '#e67e22' : '#e74c3c';
            const reportId = isRoute
                ? (report.route_breakdown_id || `RBD-${report.id}`)
                : (report.breakdown_id || `VBD-${report.id}`);
            const createdDate = new Date(isRoute
                ? (report.breakdown_datetime || report.created_at)
                : (report.breakdown_date || report.created_at)
            );

            const detailsHTML = `
                <div class="form-section">
                    <h5><i class="fas ${isRoute ? 'fa-road' : 'fa-car-crash'}"></i> Breakdown Information</h5>
                    <p><strong>Report ID:</strong> ${reportId}</p>
                    <p><strong>Type:</strong> <span style="background: ${typeBadgeColor}; color: white; padding: 2px 10px; border-radius: 10px; font-size: 0.85rem;">${typeLabel}</span></p>
                    <p><strong>Status:</strong> <span class="status-text status-${(report.status || 'pending').toLowerCase()}">${(report.status || 'Pending').toUpperCase()}</span></p>
                    <p><strong>Severity:</strong> <span class="status-text status-${(report.severity || 'medium').toLowerCase()}">${(report.severity || 'Medium').toUpperCase()}</span></p>
                    <p><strong>Breakdown Type:</strong> ${report.breakdown_type || 'N/A'}</p>
                    ${isRoute && report.breakdown_location ? `<p><strong>Location:</strong> ${report.breakdown_location}</p>` : ''}
                </div>

                <div class="form-section">
                    <h5><i class="fas fa-truck"></i> Vehicle Details</h5>
                    <p><strong>Vehicle:</strong> ${report.number_plate || 'N/A'}</p>
                    ${report.make ? `<p><strong>Make:</strong> ${report.make}</p>` : ''}
                    ${report.model ? `<p><strong>Model:</strong> ${report.model}</p>` : ''}
                </div>

                <div class="form-section">
                    <h5><i class="fas fa-clipboard-list"></i> Description</h5>
                    <p style="white-space: pre-wrap; border-left: none; padding: 12px; background: var(--background); border-radius: 6px;">${report.description || 'No description provided'}</p>
                </div>

                <div class="form-section">
                    <h5><i class="fas fa-user"></i> Driver Details</h5>
                    <p><strong>Driver:</strong> ${report.driver_name || 'N/A'}</p>
                    ${report.driver_employee_id ? `<p><strong>Employee ID:</strong> ${report.driver_employee_id}</p>` : ''}
                    ${report.driver_phone ? `<p><strong>Phone:</strong> ${report.driver_phone}</p>` : ''}
                    <p><strong>Reported On:</strong> ${createdDate.toLocaleString()}</p>
                </div>
            `;

            this.openWithContent({
                title: 'Breakdown Report Details',
                iconClass: isRoute ? 'fas fa-road' : 'fas fa-car-crash',
                content: detailsHTML
            });
        } catch (error) {
            console.error('Error loading breakdown details:', error);
            this.emitToast('Failed to load breakdown report details', 'error');
        }
    }

    openMachineBreakdown(ticket) {
        if (!ticket) {
            this.emitToast('Machine breakdown not found', 'error');
            return;
        }

        const report = ticket.original_report || ticket;
        const createdDate = new Date(report.breakdown_date || ticket.created_at).toLocaleString();
        const machineName = report.machine_model || report.machine_name || ticket.machine_name || 'N/A';
        const operatorName = report.operator_name || ticket.reporter_full_name || 'N/A';

        const detailsHTML = `
            <div class="form-section">
                <h5><i class="fas fa-info-circle"></i> Machine Breakdown Information</h5>
                <p><strong>Breakdown ID:</strong> ${ticket.ticket_id}</p>
                <p><strong>Status:</strong> <span class="status-text status-${(ticket.status || 'open').toLowerCase().replace(' ', '-')}">${(ticket.status || 'OPEN').toUpperCase()}</span></p>
                <p><strong>Priority:</strong> <span class="status-text status-${(ticket.priority || 'medium').toLowerCase()}">${(ticket.priority || 'MEDIUM').toUpperCase()}</span></p>
                <p><strong>Machine:</strong> ${machineName}</p>
                <p><strong>Operator:</strong> ${operatorName}</p>
                <p><strong>Breakdown Type:</strong> ${report.breakdown_type || 'N/A'}</p>
                <p><strong>Date:</strong> ${createdDate}</p>
            </div>
            <div class="form-section">
                <h5><i class="fas fa-clipboard-list"></i> Description</h5>
                <p style="white-space: pre-wrap; padding: 12px; background: var(--background); border-radius: 6px;">${ticket.description || 'No description provided'}</p>
            </div>
            <div class="form-section">
                <h5><i class="fas fa-exclamation-triangle"></i> Source</h5>
                <p><span style="background: #7c3aed; color: white; padding: 2px 10px; border-radius: 12px; font-size: 12px;">Machinery Operator Fault Report</span></p>
            </div>
        `;

        this.openWithContent({
            title: 'Machine Breakdown Details',
            iconClass: 'fas fa-cogs',
            content: detailsHTML
        });
    }
}

if (!customElements.get('supervisor-view-ticket-modal')) {
    customElements.define('supervisor-view-ticket-modal', SupervisorViewTicketModal);
}
