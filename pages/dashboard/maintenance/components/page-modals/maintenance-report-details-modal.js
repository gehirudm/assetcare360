class MaintenanceReportDetailsModal extends HTMLElement {
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
            <div id="reportDetailsModal" class="modal" aria-hidden="true">
                <div class="modal-content" style="max-width: 900px;">
                    <div class="modal-header">
                        <h4><i class="fas fa-clipboard-list"></i> Service Ticket Report Details</h4>
                        <button class="btn-close" type="button" data-action="close-modal">&times;</button>
                    </div>
                    <div style="padding: 30px;">
                    <div id="reportDetailsContent">
                        <!-- Content will be populated by JavaScript -->
                    </div>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            if (event.target.closest('[data-action="close-modal"]') || event.target.id === 'reportDetailsModal') {
                this.close();
            }
        });
    }

    emitToast(message, type = 'warning') {
        this.dispatchEvent(new CustomEvent('maintenance-ui:toast', {
            bubbles: true,
            detail: { message, type },
        }));
    }

    open(payload) {
        this.openWithTicket(payload);
    }

    async openWithTicket(ticketSummary) {
        const normalizedInput = this.normalizeTicketPayload(ticketSummary);
        const ticketId = this.resolveTicketId(normalizedInput || ticketSummary);

        this.openModal();
        this.renderLoading(ticketId);

        let ticket = normalizedInput;

        if (ticketId) {
            const fetchedTicket = await this.fetchTicketById(ticketId);
            if (fetchedTicket) {
                ticket = this.normalizeTicketPayload(fetchedTicket);
            }
        }

        if (!ticket) {
            this.renderError('Service ticket details are unavailable right now.');
            return;
        }

        this.renderTicket(ticket);
    }

    async openById(ticketId) {
        const normalizedId = String(ticketId || '').trim();
        if (!normalizedId) {
            this.emitToast('Service ticket ID is required to view report details.', 'warning');
            return;
        }

        this.openModal();
        this.renderLoading(normalizedId);

        const ticket = await this.fetchTicketById(normalizedId);
        if (!ticket) {
            this.renderError(`Service ticket ${this.escapeHtml(normalizedId)} not found.`);
            return;
        }

        this.renderTicket(this.normalizeTicketPayload(ticket));
    }

    async fetchTicketById(ticketId) {
        try {
            const response = await API.get(`/service-tickets/${encodeURIComponent(String(ticketId))}`);
            if (!response || response.status !== 'success' || !response.data) {
                return null;
            }

            return response.data;
        } catch (error) {
            console.error('Failed to load service ticket details:', error);
            return null;
        }
    }

    resolveTicketId(payload) {
        if (!payload || typeof payload !== 'object') {
            return '';
        }

        const candidates = [payload.id, payload.service_ticket_id, payload.ticket_id];
        const value = candidates.find((item) => item !== null && item !== undefined && String(item).trim() !== '');
        return value ? String(value).trim() : '';
    }

    normalizeTicketPayload(payload) {
        if (!payload || typeof payload !== 'object') {
            return null;
        }

        const hasServiceTicketFields = payload.service_ticket_id || payload.service_type || payload.asset_type || payload.asset_name;
        if (hasServiceTicketFields) {
            return payload;
        }

        return {
            service_ticket_id: payload.id || null,
            asset_name: payload.equipment || null,
            service_type: payload.serviceType || null,
            assigned_to_name: payload.technicalOfficer || null,
            completed_at: payload.serviceDate || null,
            actual_cost: payload.cost || null,
            description: payload.description || null,
            completion_notes: payload.description || null,
            maintenance_notes: payload.recommendations || null,
            asset_components: this.normalizeComponents(payload.partsUsed || null),
        };
    }

    renderLoading(ticketId) {
        const detailsContainer = this.querySelector('#reportDetailsContent');
        if (!detailsContainer) {
            return;
        }

        const label = ticketId ? `Loading ${this.escapeHtml(ticketId)}...` : 'Loading ticket details...';
        detailsContainer.innerHTML = `
            <div style="padding: 30px; text-align: center; color: var(--muted);">
                <i class="fas fa-spinner fa-spin"></i> ${label}
            </div>
        `;
    }

    renderError(message) {
        const detailsContainer = this.querySelector('#reportDetailsContent');
        if (!detailsContainer) {
            return;
        }

        detailsContainer.innerHTML = `
            <div class="form-section" style="text-align: center;">
                <h5><i class="fas fa-exclamation-triangle"></i> Unable to Load Details</h5>
                <p style="margin: 0;">${this.escapeHtml(message)}</p>
            </div>
        `;
    }

    renderTicket(ticket) {
        const detailsContainer = this.querySelector('#reportDetailsContent');
        if (!detailsContainer) {
            return;
        }

        detailsContainer.innerHTML = this.renderContent(ticket);
    }

    openModal() {
        if (typeof window.openModal === 'function') {
            window.openModal('reportDetailsModal');
            return;
        }

        const modal = this.querySelector('#reportDetailsModal');
        if (!modal) {
            return;
        }

        modal.classList.add('active');
    }

    close() {
        if (typeof window.closeModal === 'function') {
            window.closeModal('reportDetailsModal');
            return;
        }

        const modal = this.querySelector('#reportDetailsModal');
        if (!modal) {
            return;
        }

        modal.classList.remove('active');
    }

    getStatusMeta(status) {
        const normalized = String(status || '').toLowerCase();
        if (normalized.includes('completed')) {
            return { label: 'Completed', className: 'status-completed' };
        }
        if (normalized.includes('progress')) {
            return { label: 'In Progress', className: 'status-in-progress' };
        }
        if (normalized.includes('assigned')) {
            return { label: 'Assigned', className: 'status-assigned' };
        }
        if (normalized.includes('cancelled')) {
            return { label: 'Cancelled', className: 'status-closed' };
        }

        return { label: status || 'Pending Assignment', className: 'status-pending' };
    }

    getPriorityClass(priority) {
        const normalized = String(priority || '').toLowerCase();
        if (normalized === 'critical') {
            return 'status-critical';
        }
        if (normalized === 'high') {
            return 'status-under-review';
        }
        if (normalized === 'low') {
            return 'status-scheduled';
        }

        return 'status-assigned';
    }

    getWarrantyClass(status) {
        const normalized = String(status || '').toLowerCase();
        if (normalized === 'active') {
            return 'warranty-active';
        }
        if (normalized === 'expired') {
            return 'warranty-expired';
        }

        return 'status-critical';
    }

    normalizeComponents(rawValue) {
        if (Array.isArray(rawValue)) {
            return rawValue
                .map((item) => this.normalizeComponentItem(item))
                .filter((item) => item !== '');
        }

        if (rawValue === null || rawValue === undefined) {
            return [];
        }

        const value = String(rawValue).trim();
        if (!value) {
            return [];
        }

        try {
            const decoded = JSON.parse(value);
            if (Array.isArray(decoded)) {
                return decoded
                    .map((item) => this.normalizeComponentItem(item))
                    .filter((item) => item !== '');
            }
        } catch (error) {
            // Fall back to comma-delimited parsing below.
        }

        return value
            .split(',')
            .map((item) => this.normalizeComponentItem(item))
            .filter((item) => item !== '');
    }

    normalizeComponentItem(item) {
        if (typeof item === 'string') {
            return item.trim();
        }

        if (item && typeof item === 'object') {
            const keys = ['name', 'component', 'label', 'title', 'part_name', 'part'];
            for (const key of keys) {
                if (item[key]) {
                    return String(item[key]).trim();
                }
            }
            return JSON.stringify(item);
        }

        if (typeof item === 'number') {
            return String(item);
        }

        return '';
    }

    normalizeComponentComments(rawValue) {
        if (Array.isArray(rawValue)) {
            return rawValue
                .map((item) => this.normalizeComponentCommentItem(item))
                .filter((item) => item !== null);
        }

        if (rawValue === null || rawValue === undefined) {
            return [];
        }

        const value = String(rawValue).trim();
        if (!value) {
            return [];
        }

        try {
            const decoded = JSON.parse(value);
            if (Array.isArray(decoded)) {
                return decoded
                    .map((item) => this.normalizeComponentCommentItem(item))
                    .filter((item) => item !== null);
            }
        } catch (error) {
            // Fall through to empty list.
        }

        return [];
    }

    normalizeComponentCommentItem(item) {
        if (typeof item === 'string') {
            const comment = item.trim();
            if (!comment) {
                return null;
            }

            return {
                component: 'General',
                comment,
            };
        }

        if (!item || typeof item !== 'object') {
            return null;
        }

        const component = String(item.component || item.name || item.label || item.part_name || item.part || 'General').trim() || 'General';
        const comment = String(item.comment || item.notes || item.note || '').trim();
        if (!comment) {
            return null;
        }

        return { component, comment };
    }

    buildComponentCommentLookup(componentComments) {
        const lookup = new Map();
        (componentComments || []).forEach((entry) => {
            const component = String(entry.component || 'General').trim() || 'General';
            const comment = String(entry.comment || '').trim();
            if (!comment) {
                return;
            }

            const key = component.toLowerCase();
            if (!lookup.has(key)) {
                lookup.set(key, { component, comment });
            }
        });

        return lookup;
    }

    formatDate(value) {
        if (!value) {
            return 'N/A';
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return this.escapeHtml(value);
        }

        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    }

    formatDateTime(value) {
        if (!value) {
            return 'N/A';
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return this.escapeHtml(value);
        }

        return date.toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    formatCurrency(value) {
        if (value === null || value === undefined || value === '') {
            return 'N/A';
        }

        if (typeof value === 'string' && value.trim().toUpperCase().startsWith('LKR')) {
            return this.escapeHtml(value.trim());
        }

        const amount = Number(value);
        if (!Number.isFinite(amount)) {
            return this.escapeHtml(value);
        }

        return `LKR ${amount.toLocaleString('en-LK', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    }

    formatAssetType(assetType) {
        const normalized = String(assetType || '').toLowerCase();
        if (normalized === 'vehicle') {
            return 'Vehicle';
        }
        if (normalized === 'machine') {
            return 'Machine';
        }
        return assetType || 'N/A';
    }

    renderField(label, value, allowHtml = false) {
        const safeLabel = this.escapeHtml(label);
        const renderedValue = allowHtml
            ? value
            : this.escapeHtml(value === null || value === undefined || value === '' ? 'N/A' : value);

        return `<div><strong>${safeLabel}:</strong><br>${renderedValue}</div>`;
    }

    renderTextBlock(title, value) {
        if (!value) {
            return '';
        }

        return `
            <div style="margin-bottom: 15px;">
                <strong>${this.escapeHtml(title)}:</strong><br>
                ${this.escapeHtml(value)}
            </div>
        `;
    }

    renderComponents(components, componentComments = []) {
        if (!components.length && !componentComments.length) {
            return '<p style="margin: 0; color: var(--muted);">No component details recorded for this asset.</p>';
        }

        const commentLookup = this.buildComponentCommentLookup(componentComments);
        const componentKeySet = new Set(components.map((component) => String(component || '').trim().toLowerCase()).filter((item) => item !== ''));

        const componentCards = components.map((component) => {
            const key = String(component || '').trim().toLowerCase();
            const comment = key ? (commentLookup.get(key)?.comment || '') : '';
            return `
                <div style="padding: 8px 10px; border: 1px solid var(--stone-200); border-radius: 8px; background: #fff;">
                    <strong>${this.escapeHtml(component)}</strong>
                    ${comment
                        ? `<div style="margin-top: 6px; color: var(--text-700); white-space: pre-wrap;">${this.escapeHtml(comment)}</div>`
                        : '<div style="margin-top: 6px; color: var(--muted);">No comment provided.</div>'}
                </div>
            `;
        });

        const extraCommentCards = componentComments
            .filter((entry) => !componentKeySet.has(String(entry.component || '').trim().toLowerCase()))
            .map((entry) => `
                <div style="padding: 8px 10px; border: 1px solid var(--stone-200); border-radius: 8px; background: #fff;">
                    <strong>${this.escapeHtml(entry.component || 'General')}</strong>
                    <div style="margin-top: 6px; color: var(--text-700); white-space: pre-wrap;">${this.escapeHtml(entry.comment || '')}</div>
                </div>
            `);

        const allCards = [...componentCards, ...extraCommentCards];
        if (!allCards.length) {
            return '<p style="margin: 0; color: var(--muted);">No component comments captured for this service ticket.</p>';
        }

        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px;">
                ${allCards.join('')}
            </div>
        `;
    }

    renderContent(ticket) {
        const statusMeta = this.getStatusMeta(ticket.status);
        const priorityClass = this.getPriorityClass(ticket.priority);
        const warrantyClass = this.getWarrantyClass(ticket.asset_warranty_status);
        const components = this.normalizeComponents(ticket.asset_components);
        const componentComments = this.normalizeComponentComments(ticket.component_comments);

        const assetFields = [
            this.renderField('Asset Type', this.formatAssetType(ticket.asset_type)),
            this.renderField('Asset Name', ticket.asset_name || 'N/A'),
            this.renderField('Asset Code', ticket.asset_code || 'N/A'),
            this.renderField('Reference', ticket.asset_reference || 'N/A'),
            this.renderField('Model', ticket.asset_model || 'N/A'),
            this.renderField('Warranty Provider', ticket.asset_warranty_provider || 'N/A'),
            this.renderField('Warranty Expiry', this.formatDate(ticket.asset_warranty_expiry)),
            this.renderField(
                'Warranty Status',
                `<span class="status-badge ${this.escapeHtml(warrantyClass)}">${this.escapeHtml(ticket.asset_warranty_status || 'Unknown')}</span>`,
                true
            ),
        ].join('');

        const reportFields = [
            this.renderField('Service Ticket ID', ticket.service_ticket_id || ticket.ticket_id || ticket.id || 'N/A'),
            this.renderField('Service Type', ticket.service_type || 'N/A'),
            this.renderField('Priority', `<span class="status-badge ${this.escapeHtml(priorityClass)}">${this.escapeHtml(ticket.priority || 'Medium')}</span>`, true),
            this.renderField('Status', `<span class="status-badge ${this.escapeHtml(statusMeta.className)}">${this.escapeHtml(statusMeta.label)}</span>`, true),
            this.renderField('Reported By', ticket.reported_by_name || ticket.reported_by || 'N/A'),
            this.renderField('Assigned To', ticket.assigned_to_name || 'Unassigned'),
            this.renderField('Created At', this.formatDateTime(ticket.created_at)),
            this.renderField('Scheduled Date', this.formatDate(ticket.scheduled_date)),
            this.renderField('Started At', this.formatDateTime(ticket.started_at)),
            this.renderField('Completed At', this.formatDateTime(ticket.completed_at)),
            this.renderField('Estimated Cost', this.formatCurrency(ticket.estimated_cost)),
            this.renderField('Actual Cost', this.formatCurrency(ticket.actual_cost)),
            this.renderField('Next Service Date', this.formatDate(ticket.next_service_date)),
            this.renderField('Service Meter Reading', ticket.service_meter_reading ?? 'N/A'),
            this.renderField('Warranty Action', ticket.warranty_action || 'none'),
        ].join('');

        return `
            <div class="form-section">
                <h5><i class="fas fa-cubes"></i> Asset Details</h5>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 15px; margin-bottom: 15px;">
                    ${assetFields}
                </div>

                <h5 style="margin-top: 24px;"><i class="fas fa-clipboard-check"></i> Service Report Details</h5>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 15px; margin-bottom: 15px;">
                    ${reportFields}
                </div>
                ${this.renderTextBlock('Service Description', ticket.description || '')}
                ${this.renderTextBlock('Maintenance Notes', ticket.maintenance_notes || '')}
                ${this.renderTextBlock('Overall Asset Status Notes', ticket.completion_notes || '')}
                ${this.renderTextBlock('Warranty Void Reason', ticket.warranty_void_reason || '')}

                <h5 style="margin-top: 24px;"><i class="fas fa-microchip"></i> Individual Asset Components and Comments</h5>
                ${this.renderComponents(components, componentComments)}
            </div>
        `;
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

customElements.define('maintenance-report-details-modal', MaintenanceReportDetailsModal);
