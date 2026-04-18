const AC_BREAKDOWN_DETAIL_VIEW_BASE = new URL('./', document.currentScript ? document.currentScript.src : window.location.href);

class ACBreakdownDetailView extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this._breakdownType = '';
        this._breakdownId = null;
        this._returnSection = this.defaultReturnSection;

        this.loadStyles();
        this.render();
        this.bindEvents();
    }

    static get observedAttributes() {
        return ['list-label', 'dashboard-label'];
    }

    attributeChangedCallback() {
        if (!this._mounted) {
            return;
        }

        this.updateHeader();
    }

    get roleContext() {
        return String(this.getAttribute('role-context') || '').trim().toLowerCase();
    }

    get defaultReturnSection() {
        return String(this.getAttribute('default-return-section') || 'fault-tickets').trim();
    }

    get listLabel() {
        return String(this.getAttribute('list-label') || 'Fault Tickets').trim();
    }

    get dashboardLabel() {
        if (this.hasAttribute('dashboard-label')) {
            return String(this.getAttribute('dashboard-label') || '').trim() || 'Dashboard';
        }

        if (this.roleContext === 'supervisor') {
            return 'Supervisor Dashboard';
        }

        return 'Dashboard';
    }

    get breakdownTypeLabel() {
        if (this._breakdownType === 'route_breakdown') {
            return 'Route Breakdown';
        }

        if (this._breakdownType === 'machine_breakdown') {
            return 'Machine Breakdown';
        }

        if (this._breakdownType === 'vehicle_breakdown') {
            return 'Vehicle Breakdown';
        }

        return 'Breakdown';
    }

    loadStyles() {
        const linkId = 'ac-breakdown-detail-view-styles';
        if (document.getElementById(linkId)) {
            return;
        }

        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = new URL('ac-breakdown-detail-view.css', AC_BREAKDOWN_DETAIL_VIEW_BASE).toString();
        document.head.appendChild(link);
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (!actionEl) {
                return;
            }

            const action = actionEl.dataset.action;
            if (action === 'back') {
                this.dispatchBack();
            }

            if (action === 'refresh') {
                this.refresh();
            }
        });
    }

    render() {
        this.innerHTML = `
            <div class="ac-breakdown-detail-view-shell">
                <div class="ac-breakdown-detail-view-subheader">
                    <nav class="breadcrumb" aria-label="Breadcrumb">
                        <span class="breadcrumb-item">
                            <i class="fas fa-ticket-alt"></i>
                            <span id="acBreakdownDetailDashboardLabel"></span>
                        </span>
                        <i class="breadcrumb-sep fas fa-chevron-right"></i>
                        <span class="breadcrumb-item" id="acBreakdownDetailListLabel"></span>
                        <i class="breadcrumb-sep fas fa-chevron-right"></i>
                        <span class="breadcrumb-item breadcrumb-current">Breakdown Detail</span>
                    </nav>

                    <div class="ac-breakdown-detail-view-header-row">
                        <button class="back-icon-btn" type="button" data-action="back" aria-label="Back to breakdown list">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                        <div class="ac-breakdown-detail-view-title">
                            <h2 id="acBreakdownDetailTitle"><i class="fas fa-info-circle"></i> Breakdown Detail</h2>
                            <p id="acBreakdownDetailSubtitle">Select a breakdown report to inspect full details.</p>
                        </div>
                    </div>
                </div>

                <div class="ac-breakdown-detail-view-body">
                    <div id="acBreakdownDetailEmpty" class="ac-breakdown-detail-view-empty">
                        <i class="fas fa-clipboard-list"></i>
                        <h3>No breakdown selected</h3>
                        <p>Open a breakdown report from the list to view full details.</p>
                    </div>

                    <div id="acBreakdownDetailLoading" class="ac-breakdown-detail-view-loading" style="display:none;">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Loading breakdown details...</p>
                    </div>

                    <div id="acBreakdownDetailContent" class="ac-breakdown-detail-view-content is-hidden"></div>
                </div>
            </div>
        `;

        this.updateHeader();
    }

    updateHeader() {
        const dashboardLabelEl = this.querySelector('#acBreakdownDetailDashboardLabel');
        if (dashboardLabelEl) {
            dashboardLabelEl.textContent = this.dashboardLabel;
        }

        const listLabelEl = this.querySelector('#acBreakdownDetailListLabel');
        if (listLabelEl) {
            listLabelEl.textContent = this.listLabel;
        }

        const titleEl = this.querySelector('#acBreakdownDetailTitle');
        if (titleEl) {
            const idSuffix = this._breakdownId ? ` #${this._breakdownId}` : '';
            titleEl.innerHTML = `<i class="fas fa-info-circle"></i> ${this.breakdownTypeLabel} Detail${idSuffix}`;
        }

        const subtitleEl = this.querySelector('#acBreakdownDetailSubtitle');
        if (subtitleEl) {
            if (this._breakdownType) {
                subtitleEl.textContent = `Viewing ${this.breakdownTypeLabel.toLowerCase()} report details.`;
            } else {
                subtitleEl.textContent = 'Select a breakdown report to inspect full details.';
            }
        }
    }

    scrollHostToTop() {
        try {
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        } catch (_error) {
            window.scrollTo(0, 0);
        }
    }

    normalizeBreakdownType(type) {
        const normalized = String(type || '').trim().toLowerCase();

        if (normalized === 'route' || normalized === 'route_breakdown') {
            return 'route_breakdown';
        }

        if (normalized === 'vehicle' || normalized === 'breakdown_report' || normalized === 'vehicle_breakdown') {
            return 'vehicle_breakdown';
        }

        if (normalized === 'machine' || normalized === 'machine_breakdown') {
            return 'machine_breakdown';
        }

        return '';
    }

    async open(type, breakdownId, options = {}) {
        const normalizedType = this.normalizeBreakdownType(type);
        const numericBreakdownId = Number(breakdownId);

        if (!normalizedType || !Number.isFinite(numericBreakdownId) || numericBreakdownId <= 0) {
            return;
        }

        this._breakdownType = normalizedType;
        this._breakdownId = numericBreakdownId;
        this._returnSection = String(options.returnSection || this.defaultReturnSection || 'fault-tickets').trim();

        this.scrollHostToTop();
        this.updateHeader();
        this.setLoadingState();

        try {
            const breakdown = await this.loadBreakdownRecord();
            this.renderBreakdownRecord(breakdown);
        } catch (error) {
            this.renderErrorState(error.message || 'Failed to load breakdown details');
            this.dispatchEvent(new CustomEvent('ac-breakdown-detail-view:toast', {
                bubbles: true,
                detail: {
                    message: error.message || 'Failed to load breakdown details',
                    type: 'error',
                },
            }));
        }
    }

    refresh() {
        if (!this._breakdownType || !this._breakdownId) {
            return;
        }

        this.open(this._breakdownType, this._breakdownId, {
            returnSection: this._returnSection,
        });
    }

    closeView() {
        this._breakdownType = '';
        this._breakdownId = null;

        const loadingState = this.querySelector('#acBreakdownDetailLoading');
        const emptyState = this.querySelector('#acBreakdownDetailEmpty');
        const content = this.querySelector('#acBreakdownDetailContent');

        if (loadingState) {
            loadingState.style.display = 'none';
        }

        if (content) {
            content.classList.add('is-hidden');
            content.innerHTML = '';
        }

        if (emptyState) {
            emptyState.style.display = 'flex';
        }

        this.updateHeader();
    }

    setLoadingState() {
        const loadingState = this.querySelector('#acBreakdownDetailLoading');
        const emptyState = this.querySelector('#acBreakdownDetailEmpty');
        const content = this.querySelector('#acBreakdownDetailContent');

        if (emptyState) {
            emptyState.style.display = 'none';
        }

        if (content) {
            content.classList.add('is-hidden');
            content.innerHTML = '';
        }

        if (loadingState) {
            loadingState.style.display = 'flex';
        }
    }

    setContentState(contentHtml) {
        const loadingState = this.querySelector('#acBreakdownDetailLoading');
        const emptyState = this.querySelector('#acBreakdownDetailEmpty');
        const content = this.querySelector('#acBreakdownDetailContent');

        if (loadingState) {
            loadingState.style.display = 'none';
        }

        if (emptyState) {
            emptyState.style.display = 'none';
        }

        if (content) {
            content.innerHTML = contentHtml;
            content.classList.remove('is-hidden');
        }
    }

    renderErrorState(message) {
        const safeMessage = this.escapeHtml(message || 'Failed to load breakdown details');

        this.setContentState(`
            <div class="ac-breakdown-detail-view-empty" style="min-height: 280px;">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Unable to load details</h3>
                <p>${safeMessage}</p>
            </div>
        `);
    }

    getRequestConfig() {
        if (this._breakdownType === 'route_breakdown') {
            return {
                endpoint: `/route-breakdowns/${this._breakdownId}`,
                pickData: (response) => response?.data?.breakdown || response?.data,
            };
        }

        if (this._breakdownType === 'machine_breakdown') {
            return {
                endpoint: `/machine-breakdowns/${this._breakdownId}`,
                pickData: (response) => response?.data?.report || response?.data,
            };
        }

        return {
            endpoint: `/breakdown-reports/${this._breakdownId}`,
            pickData: (response) => response?.data?.report || response?.data,
        };
    }

    async loadBreakdownRecord() {
        if (typeof API === 'undefined' || typeof API.get !== 'function') {
            throw new Error('API client is not available');
        }

        const config = this.getRequestConfig();
        const response = await API.get(config.endpoint);

        if (!response || response.status !== 'success') {
            const message = response?.message || 'Failed to fetch breakdown details';
            throw new Error(message);
        }

        const record = config.pickData(response);
        if (!record || typeof record !== 'object') {
            throw new Error('Breakdown details are unavailable');
        }

        return record;
    }

    renderBreakdownRecord(record) {
        const badges = this.renderBreakdownBadges(record);
        const linkedTicket = this.renderLinkedTicket(record);

        let detailsSection = this.renderVehicleBreakdownDetails(record);
        if (this._breakdownType === 'route_breakdown') {
            detailsSection = this.renderRouteBreakdownDetails(record);
        } else if (this._breakdownType === 'machine_breakdown') {
            detailsSection = this.renderMachineBreakdownDetails(record);
        }

        this.setContentState(`
            <div class="ac-breakdown-detail-badges">${badges}</div>
            <div class="ac-breakdown-detail-grid">
                ${detailsSection}
            </div>
            ${linkedTicket}
        `);
    }

    renderBreakdownBadges(record) {
        const typeClass = this._breakdownType === 'route_breakdown'
            ? 'type-route'
            : (this._breakdownType === 'machine_breakdown' ? 'type-machine' : 'type-vehicle');

        const status = this.normalizeStatus(record.ticket_status || record.status || 'Pending');
        const severity = this.normalizeSeverity(record.severity || 'Medium');

        return [
            `<span class="ac-breakdown-detail-badge ${typeClass}"><i class="fas fa-layer-group"></i> ${this.escapeHtml(this.breakdownTypeLabel)}</span>`,
            `<span class="ac-breakdown-detail-badge status-${status}"><i class="fas fa-info-circle"></i> ${this.escapeHtml(this.toDisplayLabel(record.ticket_status || record.status || 'Pending'))}</span>`,
            `<span class="ac-breakdown-detail-badge severity-${severity}"><i class="fas fa-exclamation-triangle"></i> ${this.escapeHtml(this.toDisplayLabel(record.severity || 'Medium'))}</span>`,
        ].join('');
    }

    renderLinkedTicket(record) {
        const linkedTicketNumber = String(record.fault_ticket_number || '').trim();
        const linkedTicketId = Number(record.fault_ticket_id || 0);

        if (!linkedTicketNumber && (!Number.isFinite(linkedTicketId) || linkedTicketId <= 0)) {
            return '';
        }

        const ticketLabel = linkedTicketNumber || `Ticket #${linkedTicketId}`;

        return `
            <div class="ac-breakdown-detail-linked-ticket">
                <i class="fas fa-link"></i> Linked Fault Ticket: ${this.escapeHtml(ticketLabel)}
            </div>
        `;
    }

    renderRouteBreakdownDetails(record) {
        const reportId = record.route_breakdown_id || `RBD-${this._breakdownId}`;
        const breakdownDate = this.formatDateTime(record.breakdown_datetime || record.created_at);
        const garageStatus = this.toDisplayLabel(record.garage_workflow_status || record?.garage_workflow?.status || 'N/A');
        const approvedGarage = record.approved_garage_name || record?.garage_workflow?.approved_garage?.name || 'Not approved yet';

        return `
            <section class="ac-breakdown-detail-card">
                <h4><i class="fas fa-road"></i> Breakdown Information</h4>
                ${this.renderRow('Report ID', reportId)}
                ${this.renderRow('Breakdown Type', record.breakdown_type || 'N/A')}
                ${this.renderRow('Location', record.breakdown_location || 'N/A')}
                ${this.renderRow('Reported On', breakdownDate)}
            </section>

            <section class="ac-breakdown-detail-card">
                <h4><i class="fas fa-truck"></i> Vehicle & Driver</h4>
                ${this.renderRow('Vehicle', record.number_plate || 'N/A')}
                ${this.renderRow('Driver', record.driver_name || 'N/A')}
                ${this.renderRow('Phone', record.driver_phone || 'N/A')}
                ${this.renderRow('Vehicle Make', record.make || 'N/A')}
                ${this.renderRow('Vehicle Model', record.model || 'N/A')}
            </section>

            <section class="ac-breakdown-detail-card">
                <h4><i class="fas fa-warehouse"></i> Garage Workflow</h4>
                ${this.renderRow('Workflow Status', garageStatus)}
                ${this.renderRow('Approved Garage', approvedGarage)}
                ${this.renderRow('Completion Remarks', record.completion_remarks || 'N/A')}
            </section>

            <section class="ac-breakdown-detail-card full-width">
                <h4><i class="fas fa-clipboard-list"></i> Description</h4>
                <p class="ac-breakdown-detail-description">${this.escapeHtml(record.description || 'No description provided.')}</p>
            </section>
        `;
    }

    renderVehicleBreakdownDetails(record) {
        const reportId = record.breakdown_id || `VBD-${this._breakdownId}`;
        const breakdownDate = this.formatDateTime(record.breakdown_date || record.created_at);

        return `
            <section class="ac-breakdown-detail-card">
                <h4><i class="fas fa-car-crash"></i> Breakdown Information</h4>
                ${this.renderRow('Report ID', reportId)}
                ${this.renderRow('Breakdown Type', record.breakdown_type || 'N/A')}
                ${this.renderRow('Reported On', breakdownDate)}
            </section>

            <section class="ac-breakdown-detail-card">
                <h4><i class="fas fa-truck"></i> Vehicle & Driver</h4>
                ${this.renderRow('Vehicle', record.number_plate || 'N/A')}
                ${this.renderRow('Driver', record.driver_name || 'N/A')}
                ${this.renderRow('Employee ID', record.driver_employee_id || 'N/A')}
                ${this.renderRow('Phone', record.driver_phone || 'N/A')}
            </section>

            <section class="ac-breakdown-detail-card full-width">
                <h4><i class="fas fa-clipboard-list"></i> Description</h4>
                <p class="ac-breakdown-detail-description">${this.escapeHtml(record.description || 'No description provided.')}</p>
            </section>
        `;
    }

    renderMachineBreakdownDetails(record) {
        const reportId = record.breakdown_id || `MBD-${this._breakdownId}`;
        const breakdownDate = this.formatDateTime(record.breakdown_date || record.created_at);

        return `
            <section class="ac-breakdown-detail-card">
                <h4><i class="fas fa-cogs"></i> Breakdown Information</h4>
                ${this.renderRow('Report ID', reportId)}
                ${this.renderRow('Breakdown Type', record.breakdown_type || 'N/A')}
                ${this.renderRow('Reported On', breakdownDate)}
            </section>

            <section class="ac-breakdown-detail-card">
                <h4><i class="fas fa-industry"></i> Machine & Operator</h4>
                ${this.renderRow('Machine', record.machine_name || record.machine_model || 'N/A')}
                ${this.renderRow('Model', record.machine_model || 'N/A')}
                ${this.renderRow('Operator', record.operator_name || 'N/A')}
                ${this.renderRow('Operator ID', record.operator_employee_id || 'N/A')}
            </section>

            <section class="ac-breakdown-detail-card full-width">
                <h4><i class="fas fa-clipboard-list"></i> Description</h4>
                <p class="ac-breakdown-detail-description">${this.escapeHtml(record.description || 'No description provided.')}</p>
            </section>
        `;
    }

    renderRow(label, value) {
        return `
            <div class="ac-breakdown-detail-row">
                <span class="ac-breakdown-detail-label">${this.escapeHtml(label)}</span>
                <span class="ac-breakdown-detail-value">${this.escapeHtml(value || 'N/A')}</span>
            </div>
        `;
    }

    dispatchBack() {
        this.dispatchEvent(new CustomEvent('ac-breakdown-detail-view:back', {
            bubbles: true,
            detail: {
                returnSection: this._returnSection || this.defaultReturnSection,
                breakdownType: this._breakdownType,
                breakdownId: this._breakdownId,
            },
        }));
    }

    normalizeStatus(value) {
        return String(value || 'pending').trim().toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-');
    }

    normalizeSeverity(value) {
        return String(value || 'medium').trim().toLowerCase();
    }

    toDisplayLabel(value) {
        return String(value || '')
            .replace(/_/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    formatDateTime(value) {
        if (!value) {
            return 'N/A';
        }

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return 'N/A';
        }

        return parsed.toLocaleString();
    }

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

if (!customElements.get('ac-breakdown-detail-view')) {
    customElements.define('ac-breakdown-detail-view', ACBreakdownDetailView);
}
