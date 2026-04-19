class DriverBreakdown extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.currentTypeFilter = 'all';
        this.currentStatusFilter = 'all';
        this.items = [];
        this.render();
        this.bindEvents();
        this.refresh();
        this._cleanupOverflowAutoClose = DriverUtils.registerOverflowAutoClose(this);

        this._onBreakdownsChanged = () => this.refresh();
        DriverUtils.on('driver:data-breakdowns-changed', this._onBreakdownsChanged);
    }

    disconnectedCallback() {
        if (typeof this._cleanupOverflowAutoClose === 'function') {
            this._cleanupOverflowAutoClose();
            this._cleanupOverflowAutoClose = null;
        }
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-exclamation-triangle"></i> Breakdown Report</h2>
                <p class="page-subtitle">Report vehicle issues and track repair status</p>
            </div>

            <div class="driver-breakdown-actions">
                <button class="btn btn-primary" type="button" data-action="open-breakdown-modal">Report Breakdown</button>
                <button class="btn btn-danger" type="button" data-action="open-route-breakdown-modal">Report Breakdown in Route</button>
            </div>

            <div class="driver-breakdown-content">
                <div class="driver-breakdown-heading">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>My Submitted Reports</span>
                </div>

                <div class="driver-breakdown-filters">
                    <div class="driver-breakdown-filter-group">
                        <span class="driver-breakdown-filter-label">Type:</span>
                        <div class="filter-controls">
                            <button class="filter-btn active" type="button" data-action="set-type-filter" data-filter="all">All</button>
                            <button class="filter-btn" type="button" data-action="set-type-filter" data-filter="breakdown">Breakdown</button>
                            <button class="filter-btn" type="button" data-action="set-type-filter" data-filter="in-route">Breakdown in Route</button>
                        </div>
                    </div>

                    <div class="driver-breakdown-filter-group">
                        <span class="driver-breakdown-filter-label">Status:</span>
                        <div class="filter-controls">
                            <button class="filter-btn active" type="button" data-action="set-status-filter" data-filter="all">All</button>
                            <button class="filter-btn" type="button" data-action="set-status-filter" data-filter="in-progress">In Progress</button>
                            <button class="filter-btn" type="button" data-action="set-status-filter" data-filter="resolved">Resolved</button>
                        </div>
                    </div>
                </div>

                <div id="driverBreakdownList" class="driver-breakdown-list"></div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (!actionEl) {
                DriverUtils.closeOverflowMenus(this);
                return;
            }

            const action = actionEl.dataset.action;

            if (action === 'toggle-actions-menu') {
                event.stopPropagation();
                DriverUtils.toggleOverflowMenu(actionEl, this);
                return;
            }

            if (action === 'open-breakdown-modal') {
                DriverUtils.closeOverflowMenus(this);
                DriverUtils.openModal('breakdownModal');
                return;
            }

            if (action === 'open-route-breakdown-modal') {
                DriverUtils.closeOverflowMenus(this);
                DriverUtils.openModal('breakdownInRouteModal');
                return;
            }

            if (action === 'set-type-filter') {
                this.currentTypeFilter = actionEl.dataset.filter;
                this.querySelectorAll('[data-action="set-type-filter"]').forEach((button) => {
                    button.classList.toggle('active', button.dataset.filter === this.currentTypeFilter);
                });
                this.renderItems();
                return;
            }

            DriverUtils.closeOverflowMenus(this);

            if (action === 'set-status-filter') {
                this.currentStatusFilter = actionEl.dataset.filter;
                this.querySelectorAll('[data-action="set-status-filter"]').forEach((button) => {
                    button.classList.toggle('active', button.dataset.filter === this.currentStatusFilter);
                });
                this.renderItems();
                return;
            }

            const id = actionEl.dataset.id;
            const item = this.items.find((entry) => String(entry.id) === String(id));

            if (action === 'view-breakdown' && item) {
                const linkedTicketId = Number.parseInt(item.fault_ticket_id, 10);
                if (Number.isFinite(linkedTicketId) && linkedTicketId > 0) {
                    this.dispatchEvent(new CustomEvent('driver:open-ticket-details', {
                        bubbles: true,
                        detail: {
                            ticketId: linkedTicketId,
                            returnSection: 'breakdown',
                        }
                    }));
                    return;
                }

                DriverUtils.showToast('Ticket is not linked yet. Showing report details instead.', 'warning');
                DriverUtils.openModal('breakdownDetailsModal', { item });
                return;
            }

            if (action === 'edit-breakdown' && item) {
                if (item.type === 'in-route') {
                    DriverUtils.openModal('breakdownInRouteModal', { editItem: item });
                } else {
                    DriverUtils.openModal('breakdownModal', { editItem: item });
                }
                return;
            }

            if (action === 'delete-breakdown' && item) {
                this.deleteItem(item);
            }
        });
    }

    async refresh() {
        const container = this.querySelector('#driverBreakdownList');
        container.innerHTML = '<div style="padding: 20px; color: var(--muted);">Loading breakdown reports...</div>';

        try {
            const [reportsResponse, routeResponse] = await Promise.all([
                DriverUtils.apiGet('/breakdown-reports'),
                DriverUtils.apiGet('/route-breakdowns'),
            ]);

            const reports = DriverUtils.normalizeApiList(reportsResponse, 'reports');
            const routeBreakdowns = DriverUtils.normalizeApiList(routeResponse, 'breakdowns');

            DriverUtils.store.breakdowns.reports = reports;
            DriverUtils.store.breakdowns.routeBreakdowns = routeBreakdowns;

            this.items = [
                ...reports.map((item) => this.normalizeItem(item, 'breakdown')),
                ...routeBreakdowns.map((item) => this.normalizeItem(item, 'in-route')),
            ].sort((a, b) => new Date(b.dateRaw) - new Date(a.dateRaw));

            if (this.items.length === 0) {
                this.items = this.getFallbackItems();
            }

            this.renderItems();
        } catch (error) {
            console.error('Failed to load breakdown reports:', error);
            this.items = this.getFallbackItems();
            this.renderItems();
            DriverUtils.showToast('Unable to load breakdown data. Showing local data.', 'warning');
        }
    }

    normalizeItem(item, type) {
        const id = item.id;
        const breakdownId = type === 'in-route' ? item.route_breakdown_id : item.breakdown_id;
        const dateRaw = type === 'in-route' ? item.breakdown_datetime : item.breakdown_date;

        return {
            ...item,
            id,
            type,
            breakdownId,
            dateRaw,
            displayDate: DriverUtils.formatDateTime(dateRaw),
            status: item.ticket_status || item.status || 'Pending',
            severity: item.severity || 'medium',
            category: item.breakdown_type || 'General',
            summary: item.description || item.breakdown_location || 'No details provided',
        };
    }

    renderItems() {
        const container = this.querySelector('#driverBreakdownList');
        const filtered = this.items.filter((item) => {
            const typeMatch = this.currentTypeFilter === 'all' || item.type === this.currentTypeFilter;
            const statusKey = this.statusToFilterValue(item.status);
            const statusMatch = this.currentStatusFilter === 'all' || statusKey === this.currentStatusFilter;
            return typeMatch && statusMatch;
        });

        if (filtered.length === 0) {
            container.innerHTML = '<div style="padding: 20px; color: var(--muted);">No breakdown reports found for the selected filters.</div>';
            DriverUtils.emit('driver:data-summary-updated');
            return;
        }

        container.innerHTML = filtered.map((item) => this.renderItem(item)).join('');
        DriverUtils.emit('driver:data-summary-updated');
    }

    renderItem(item) {
        const statusColor = DriverUtils.getStatusColor(item.status);
        const severityColor = DriverUtils.getStatusColor(item.severity);
        const overflowMenu = `
            <div class="dropdown-container">
                <button class="btn btn-small btn-secondary dropdown-trigger" type="button" data-action="toggle-actions-menu" aria-label="More actions">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
                <div class="dropdown-menu">
                    <button class="dropdown-item" type="button" data-action="edit-breakdown" data-id="${item.id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="dropdown-item danger" type="button" data-action="delete-breakdown" data-id="${item.id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;

        return `
            <div class="inventory-item" data-type="${item.type}" data-status="${this.statusToFilterValue(item.status)}">
                <div class="item-details">
                    <strong><i class="fas fa-exclamation-triangle"></i> ${item.breakdownId}</strong>
                    <div class="item-meta"><i class="fas fa-clock"></i> ${item.displayDate}</div>
                    <div class="item-description">
                        <span style="color: ${statusColor}; font-weight: 700; text-transform: uppercase;">${item.status}</span> |
                        <span style="color: ${severityColor}; font-weight: 600;">${String(item.severity).toUpperCase()}</span> |
                        <span style="color: #555; font-weight: 600;">${item.category}</span>
                        <br>
                        ${item.summary}
                    </div>
                </div>
                <div class="item-actions">
                    <div class="action-buttons">
                        <button class="btn btn-small btn-primary" type="button" data-action="view-breakdown" data-id="${item.id}">
                            <i class="fas fa-eye"></i> VIEW
                        </button>
                        ${overflowMenu}
                    </div>
                </div>
            </div>
        `;
    }

    async deleteItem(item) {
        const confirmed = window.confirm(`Delete ${item.breakdownId}?`);
        if (!confirmed) {
            return;
        }

        try {
            const endpoint = item.type === 'in-route'
                ? `/route-breakdowns/${encodeURIComponent(item.id)}`
                : `/breakdown-reports/${encodeURIComponent(item.id)}`;

            const response = await DriverUtils.apiDelete(endpoint);
            if (response && (response.success || response.status === 'success')) {
                DriverUtils.showToast(`${item.breakdownId} deleted successfully.`);
                DriverUtils.emit('driver:data-breakdowns-changed');
                return;
            }

            DriverUtils.showToast(response?.message || `Failed to delete ${item.breakdownId}.`, 'error');
        } catch (error) {
            console.error('Failed to delete breakdown item:', error);
            DriverUtils.showToast('Failed to delete report. Please try again.', 'error');
        }
    }

    statusToFilterValue(status) {
        const value = String(status || '').toLowerCase();

        if (value.includes('resolved') || value.includes('completed') || value.includes('closed')) {
            return 'resolved';
        }

        if (value.includes('progress') || value.includes('assigned') || value.includes('parts')) {
            return 'in-progress';
        }

        return 'in-progress';
    }

    getFallbackItems() {
        return [
            {
                id: 1,
                type: 'breakdown',
                breakdownId: 'BR-001',
                dateRaw: '2026-04-11T09:20:00Z',
                displayDate: DriverUtils.formatDateTime('2026-04-11T09:20:00Z'),
                status: 'Assigned',
                severity: 'high',
                category: 'Engine',
                summary: 'Engine overheating on Matara Road',
            },
            {
                id: 2,
                type: 'in-route',
                breakdownId: 'RBR-001',
                dateRaw: '2026-04-10T14:45:00Z',
                displayDate: DriverUtils.formatDateTime('2026-04-10T14:45:00Z'),
                status: 'Resolved',
                severity: 'medium',
                category: 'Tire',
                summary: 'Front tire puncture handled at roadside garage',
            },
        ];
    }
}

customElements.define('driver-breakdown', DriverBreakdown);
