class MaintenanceServiceReports extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.currentFilter = 'all';
        this.currentSearch = '';
        this.loading = false;
        this.reports = [];

        this.render();
        this.bindEvents();
        this.refresh();
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Service Report Management</h1>
                <p class="page-subtitle">Submitted service reports are listed automatically and can be viewed in detail</p>
            </div>

            <div class="filter-controls" id="serviceReportFilterControls">
                <button class="filter-btn active" type="button" data-action="set-filter" data-status="all">All Assets</button>
                <button class="filter-btn" type="button" data-action="set-filter" data-status="vehicle">Vehicles</button>
                <button class="filter-btn" type="button" data-action="set-filter" data-status="machine">Machines</button>
            </div>

            <div class="search-bar" style="margin-bottom: 20px;">
                <input id="maintenanceServiceReportSearch" class="search-input" data-action="search" placeholder="Search by ticket ID, asset, technical officer, or service type">
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-clipboard-check"></i> Submitted Service Reports</span>
                    <span class="status-badge status-completed" id="maintenanceServiceReportCount">Loading...</span>
                </div>
                <div id="maintenanceServiceReportList" class="inventory-list">
                    <div style="text-align: center; color: var(--muted); padding: 20px;">Loading service reports...</div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('input', (event) => {
            const searchInput = event.target.closest('[data-action="search"]');
            if (!searchInput) {
                return;
            }

            this.currentSearch = String(searchInput.value || '').trim().toLowerCase();
            this.renderReportRows();
        });

        this.addEventListener('click', (event) => {
            const actionNode = event.target.closest('[data-action]');
            if (!actionNode) {
                return;
            }

            const action = actionNode.dataset.action;
            if (!action) {
                return;
            }

            if (action === 'set-filter') {
                this.applyFilter(actionNode.dataset.status, actionNode);
                return;
            }

            if (action === 'view-report') {
                this.viewReportDetails(actionNode.dataset.ticketId);
            }
        });
    }

    emitToast(message, type = 'success') {
        this.dispatchEvent(new CustomEvent('maintenance-ui:toast', {
            bubbles: true,
            detail: { message, type },
        }));
    }

    async refresh() {
        this.loading = true;
        this.renderReportRows();
        this.updateSummary();

        let errorMessage = '';

        try {
            const response = await API.get('/service-tickets?status=Completed&sort_by=created&sort_dir=desc');
            this.reports = this.extractTickets(response);
        } catch (error) {
            console.error('Failed to load submitted service reports:', error);
            this.reports = [];
            errorMessage = 'Failed to load submitted service reports.';
            this.emitToast('Failed to load submitted service reports.', 'error');
        }

        this.loading = false;
        this.renderReportRows(errorMessage);
        this.updateSummary();
    }

    extractTickets(response) {
        if (!response || response.status !== 'success') {
            return [];
        }

        const payload = response.data || {};
        if (Array.isArray(payload.tickets)) {
            return payload.tickets;
        }

        if (Array.isArray(payload)) {
            return payload;
        }

        return [];
    }

    setActiveFilterButton(button) {
        this.querySelectorAll('#serviceReportFilterControls .filter-btn').forEach((item) => {
            item.classList.remove('active');
        });

        if (button) {
            button.classList.add('active');
        }
    }

    applyFilter(status, button) {
        const nextStatus = status || this.currentFilter || 'all';
        this.currentFilter = nextStatus;

        if (button) {
            this.setActiveFilterButton(button);
        } else {
            const activeButton = this.querySelector(`#serviceReportFilterControls [data-status="${nextStatus}"]`);
            this.setActiveFilterButton(activeButton);
        }

        this.renderReportRows();
    }

    getStatusMeta(status) {
        const normalized = String(status || '').toLowerCase();
        if (normalized.includes('completed')) {
            return { text: 'Completed', className: 'status-completed' };
        }
        if (normalized.includes('progress')) {
            return { text: 'In Progress', className: 'status-in-progress' };
        }
        if (normalized.includes('assigned')) {
            return { text: 'Assigned', className: 'status-assigned' };
        }

        return { text: status || 'Submitted', className: 'status-scheduled' };
    }

    formatDateTime(value) {
        if (!value) {
            return 'N/A';
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return 'N/A';
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

    renderReportRows(errorMessage = '') {
        const list = this.querySelector('#maintenanceServiceReportList');
        if (!list) {
            return;
        }

        if (errorMessage) {
            list.innerHTML = `<div style="text-align: center; color: var(--danger); padding: 20px;">${this.escapeHtml(errorMessage)}</div>`;
            this.updateSummary(0);
            return;
        }

        if (this.loading) {
            list.innerHTML = '<div style="text-align: center; color: var(--muted); padding: 20px;">Loading service reports...</div>';
            return;
        }

        const filteredReports = this.reports.filter((report) => {
            const matchesFilter = this.currentFilter === 'all' || String(report.asset_type || '').toLowerCase() === this.currentFilter;

            const searchText = [
                report.service_ticket_id,
                report.title,
                report.service_type,
                report.asset_name,
                report.asset_code,
                report.assigned_to_name,
                report.reported_by_name,
                report.completion_notes,
            ].join(' ').toLowerCase();
            const matchesSearch = !this.currentSearch || searchText.includes(this.currentSearch);

            return matchesFilter && matchesSearch;
        });

        if (filteredReports.length === 0) {
            list.innerHTML = '<div style="text-align: center; color: var(--muted); padding: 20px;">No submitted service reports found.</div>';
            this.updateSummary(0);
            return;
        }

        list.innerHTML = filteredReports.map((report) => {
            const statusMeta = this.getStatusMeta(report.status);
            const ticketId = this.escapeHtml(report.service_ticket_id || `#${report.id}`);
            const title = this.escapeHtml(report.title || 'Submitted service report');
            const assetType = this.escapeHtml(String(report.asset_type || '').toLowerCase() === 'machine' ? 'Machine' : 'Vehicle');
            const assetName = this.escapeHtml(report.asset_name || 'Unknown asset');
            const assetCode = this.escapeHtml(report.asset_code || '-');
            const serviceType = this.escapeHtml(report.service_type || '-');
            const technicalOfficer = this.escapeHtml(report.assigned_to_name || 'Unassigned');
            const reportedBy = this.escapeHtml(report.reported_by_name || 'N/A');
            const completedAt = this.escapeHtml(this.formatDateTime(report.completed_at || report.updated_at || report.created_at));
            const actualCost = this.formatCurrency(report.actual_cost);
            const notes = this.escapeHtml(report.completion_notes || report.description || 'No completion notes provided');

            return `
                <div class="inventory-item" data-ticket-id="${Number(report.id)}">
                    <div class="item-details">
                        <strong><i class="fas fa-clipboard-check"></i> ${ticketId} - ${title}</strong>
                        <div class="item-meta">
                            <i class="fas fa-cubes"></i> ${assetType}: ${assetName} (${assetCode})
                            &nbsp;|&nbsp;
                            <i class="fas fa-tag"></i> ${serviceType}
                        </div>
                        <div class="item-description">${notes}</div>
                        <div class="item-meta">
                            <span class="status-badge ${statusMeta.className}">${statusMeta.text}</span>
                            &nbsp;|&nbsp;
                            <i class="fas fa-user-cog"></i> Technical Officer: ${technicalOfficer}
                            &nbsp;|&nbsp;
                            <i class="fas fa-user"></i> Submitted By: ${reportedBy}
                        </div>
                        <div class="item-meta">
                            <i class="fas fa-calendar-check"></i> Completed: ${completedAt}
                            &nbsp;|&nbsp;
                            <i class="fas fa-money-bill-wave"></i> Actual Cost: ${actualCost}
                        </div>
                    </div>
                    <div class="item-actions" style="min-width: 180px;">
                        <button class="btn btn-secondary btn-small" type="button" data-action="view-report" data-ticket-id="${Number(report.id)}">
                            <i class="fas fa-eye"></i> View Report
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        this.updateSummary(filteredReports.length);
    }

    updateSummary(visibleCount = null) {
        const countNode = this.querySelector('#maintenanceServiceReportCount');
        if (!countNode) {
            return;
        }

        if (this.loading) {
            countNode.textContent = 'Loading...';
            return;
        }

        const total = this.reports.length;
        if (visibleCount === null) {
            countNode.textContent = `${total} reports`;
            return;
        }

        countNode.textContent = `${visibleCount} of ${total} reports`;
    }

    viewReportDetails(ticketId) {
        const normalizedTicketId = String(ticketId || '').trim();
        if (!normalizedTicketId) {
            this.emitToast('Service report not found.', 'warning');
            return;
        }

        if (typeof window.viewServiceTicketDetails === 'function') {
            window.viewServiceTicketDetails(normalizedTicketId, {
                returnSection: 'service-reports',
            });
            return;
        }

        const detailView = document.querySelector('maintenance-service-ticket-detail-view');
        if (!detailView || typeof detailView.open !== 'function') {
            this.emitToast('Service report details view is unavailable.', 'error');
            return;
        }

        void detailView.open(normalizedTicketId, {
            returnSection: 'service-reports',
        });
    }

    approveReport(reportId) {
        this.emitToast('Service reports do not require manager approval. You can view submitted details directly.', 'info');
        this.viewReportDetails(reportId);
    }

    reviewReport(reportId) {
        this.viewReportDetails(reportId);
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

customElements.define('maintenance-service-reports', MaintenanceServiceReports);
