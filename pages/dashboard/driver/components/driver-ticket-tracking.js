class DriverTicketTracking extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.currentFilter = 'all';
        this.currentUser = null;
        this.render();
        this.bindEvents();
        this.refresh();

        this._onBreakdownsChanged = () => this.refresh();
        DriverUtils.on('driver:data-breakdowns-changed', this._onBreakdownsChanged);
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-ticket-alt"></i> Ticket Tracking</h2>
                <p class="page-subtitle">Track lifecycle progress of your route breakdown fault tickets</p>
            </div>

            <div class="filter-controls" id="driverTicketTrackingFilterControls">
                <button class="filter-btn active" type="button" data-action="set-filter" data-filter="all">All Tickets</button>
                <button class="filter-btn" type="button" data-action="set-filter" data-filter="open">Pending</button>
                <button class="filter-btn" type="button" data-action="set-filter" data-filter="in-progress">In Progress</button>
                <button class="filter-btn" type="button" data-action="set-filter" data-filter="resolved">Resolved</button>
                <button class="filter-btn" type="button" data-action="set-filter" data-filter="closed">Closed</button>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-ticket-alt"></i> Route Breakdown Tickets</span>
                    <span class="status-text status-in-progress" data-ticket-summary>Loading...</span>
                </div>
                <div id="driverTicketTrackingList" class="inventory-list"></div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (!actionEl) {
                return;
            }

            if (actionEl.dataset.action === 'set-filter') {
                this.applyFilter(actionEl.dataset.filter);
                return;
            }

            if (actionEl.dataset.action === 'view-breakdown') {
                const breakdownId = Number.parseInt(actionEl.dataset.breakdownId, 10);
                if (!breakdownId) {
                    return;
                }

                DriverUtils.openModal('breakdownDetailsModal', {
                    breakdownId,
                    itemType: 'in-route',
                });
            }
        });
    }

    async refresh() {
        const list = this.querySelector('#driverTicketTrackingList');
        if (!list) {
            return;
        }

        list.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--muted);">Loading route breakdown tickets...</div>';

        try {
            this.currentUser = DriverUtils.store.currentUser || null;
            const response = await DriverUtils.apiGet('/route-breakdowns');
            const breakdowns = DriverUtils.normalizeApiList(response, 'breakdowns');

            const filteredBreakdowns = breakdowns.filter((item) => {
                if (!this.currentUser) {
                    return true;
                }

                return Number(item.driver_id) === Number(this.currentUser.id)
                    || item.driver_name === this.currentUser.full_name;
            });

            DriverUtils.store.breakdowns.routeBreakdowns = filteredBreakdowns;

            if (!filteredBreakdowns.length) {
                list.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--muted);">No route breakdown tickets found.</div>';
                this.updateSummary([]);
                return;
            }

            list.innerHTML = filteredBreakdowns.map((breakdown) => this.renderTicketCard(breakdown)).join('');
            this.applyFilter(this.currentFilter);
            this.updateSummary(filteredBreakdowns);
        } catch (error) {
            console.error('Error loading route breakdown ticket tracking:', error);
            list.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--danger);">Error loading ticket tracking data. Please try again.</div>';
        }
    }

    renderTicketCard(breakdown) {
        const actualStatus = breakdown.ticket_status || breakdown.status;
        const statusInfo = DriverUtils.getTicketStatusInfo(actualStatus);
        const normalized = DriverUtils.normalizeTicketFilterStatus(actualStatus);
        const updateText = DriverUtils.getTicketUpdateText(actualStatus);

        const severityText = String(breakdown.severity || 'MEDIUM').toUpperCase();
        const severityClass = String(breakdown.severity || 'medium').toLowerCase();
        const breakdownDate = DriverUtils.formatDateTime(breakdown.breakdown_datetime || breakdown.created_at);

        return `
            <div class="inventory-item" data-status="${normalized}">
                <div class="item-details">
                    <strong><i class="fas fa-exclamation-triangle"></i> ${breakdown.route_breakdown_id || `RBD-${breakdown.id}`}</strong>
                    <div class="item-meta">
                        <i class="fas fa-truck"></i> ${breakdown.number_plate || `Vehicle #${breakdown.vehicle_id || 'N/A'}`} |
                        <i class="fas fa-tools"></i> ${breakdown.breakdown_type || 'General Fault'}
                    </div>
                    <div class="item-description">${breakdown.description || 'No description provided'}</div>
                    <div class="item-meta" style="margin-top: 8px;">
                        <span class="status-text ${statusInfo.class}">${statusInfo.label}</span> |
                        <span class="status-text status-${severityClass}">${severityText}</span> |
                        <i class="fas fa-calendar"></i> ${breakdownDate}
                    </div>
                    ${breakdown.fault_ticket_number ? `<div class="item-meta" style="margin-top: 4px; color: #6b7280;"><i class="fas fa-ticket-alt"></i> Ticket: ${breakdown.fault_ticket_number}</div>` : ''}
                    ${Array.isArray(breakdown.assigned_technicians) && breakdown.assigned_technicians.length
                        ? `<div class="item-meta" style="margin-top: 4px;"><i class="fas fa-user-cog" style="color: #2563eb;"></i> <span style="color: #2563eb; font-weight: 600;">Assigned to: ${breakdown.assigned_technicians.map((item) => item.technician_name).join(', ')}</span></div>`
                        : ''}
                    ${actualStatus !== 'Pending' && actualStatus !== 'Open'
                        ? `<div class="item-meta" style="margin-top: 4px; color: #059669; font-weight: 500;">${updateText}</div>`
                        : ''}
                </div>
                <div class="item-actions">
                    <button class="btn btn-primary btn-small" type="button" data-action="view-breakdown" data-breakdown-id="${breakdown.id}">
                        <i class="fas fa-eye"></i> VIEW
                    </button>
                </div>
            </div>
        `;
    }

    applyFilter(filter) {
        this.currentFilter = filter || 'all';

        this.querySelectorAll('#driverTicketTrackingList .inventory-item').forEach((item) => {
            const status = item.dataset.status || 'open';
            item.style.display = this.currentFilter === 'all' || status === this.currentFilter ? 'flex' : 'none';
        });

        this.querySelectorAll('#driverTicketTrackingFilterControls .filter-btn').forEach((button) => {
            button.classList.toggle('active', button.dataset.filter === this.currentFilter);
        });
    }

    updateSummary(items) {
        const summary = this.querySelector('[data-ticket-summary]');
        if (!summary) {
            return;
        }

        const normalized = items.map((item) => DriverUtils.normalizeTicketFilterStatus(item.ticket_status || item.status));
        const pendingCount = normalized.filter((status) => status === 'open').length;
        const inProgressCount = normalized.filter((status) => status === 'in-progress').length;
        summary.textContent = `${pendingCount} pending, ${inProgressCount} active`;
    }
}

customElements.define('driver-ticket-tracking', DriverTicketTracking);
