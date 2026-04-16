class MOTicketTracking extends HTMLElement {
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
    }

    setCurrentUser(user) {
        this.currentUser = user || null;
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Ticket Tracking</h1>
                <p class="page-subtitle">Track the lifecycle of your submitted tickets</p>
            </div>

            <div class="filter-controls" id="ticketTrackingFilterControls">
                <button class="filter-btn active" type="button" data-action="set-filter" data-filter="all">All Tickets</button>
                <button class="filter-btn" type="button" data-action="set-filter" data-filter="open">Pending</button>
                <button class="filter-btn" type="button" data-action="set-filter" data-filter="in-progress">In Progress</button>
                <button class="filter-btn" type="button" data-action="set-filter" data-filter="resolved">Resolved</button>
                <button class="filter-btn" type="button" data-action="set-filter" data-filter="closed">Closed</button>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-ticket-alt"></i> Active Tickets</span>
                    <span class="status-text status-in-progress" data-ticket-summary>Loading...</span>
                </div>
                <div id="ticketTrackingList" class="inventory-list"></div>
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
                document.dispatchEvent(new CustomEvent('mo:open-machine-breakdown-details', {
                    detail: { breakdownId: Number.parseInt(actionEl.dataset.breakdownId, 10) },
                }));
            }
        });
    }

    async refresh() {
        const list = this.querySelector('#ticketTrackingList');
        if (!list || typeof API === 'undefined') {
            return;
        }

        list.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--stone-400);">Loading breakdown reports...</div>';

        try {
            const response = await API.get('/machine-breakdowns');
            const reports = response?.status === 'success' && response.data?.reports ? response.data.reports : [];

            const filteredReports = reports.filter((item) => {
                if (!this.currentUser) {
                    return true;
                }

                return item.operator_id === this.currentUser.id || item.operator_name === this.currentUser.full_name;
            });

            const sortedReports = [...filteredReports].sort((first, second) => {
                const firstTime = new Date(first.created_at || first.breakdown_date || 0).getTime();
                const secondTime = new Date(second.created_at || second.breakdown_date || 0).getTime();
                return secondTime - firstTime;
            });

            if (!sortedReports.length) {
                list.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--stone-400);">No breakdown reports found</div>';
                this.updateSummary([]);
                return;
            }

            list.innerHTML = sortedReports.map((breakdown) => this.renderTicketCard(breakdown)).join('');
            this.applyFilter(this.currentFilter);
            this.updateSummary(sortedReports);
        } catch (error) {
            console.error('Error loading machine breakdowns:', error);
            list.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--red-500);">Error loading breakdown reports. Please try again.</div>';
        }
    }

    renderTicketCard(breakdown) {
        const actualStatus = breakdown.ticket_status || breakdown.status;
        const statusInfo = window.MOUtils.getStatusInfo(actualStatus);
        const normalized = window.MOUtils.normalizeFilterStatus(actualStatus);
        const updateText = window.MOUtils.getUpdateText(actualStatus);

        return `
            <div class="inventory-item" data-status="${normalized}">
                <div class="item-details">
                    <strong><i class="fas fa-wrench"></i> ${breakdown.breakdown_id}</strong>
                    <div class="item-meta">
                        <i class="fas fa-cogs"></i> ${breakdown.machine_model || `Machine #${breakdown.machine_id}`} |
                        <i class="fas fa-tools"></i> ${breakdown.breakdown_type || 'General Fault'}
                    </div>
                    <div class="item-description">${breakdown.description || 'No description'}</div>
                    <div class="item-meta" style="margin-top: 8px;">
                        <span class="status-text ${statusInfo.class}">${statusInfo.label}</span> |
                        <span class="status-text status-${String(breakdown.severity || 'medium').toLowerCase()}">${String(breakdown.severity || 'MEDIUM').toUpperCase()}</span> |
                        <i class="fas fa-calendar"></i> ${window.MOUtils.formatDate(breakdown.breakdown_date)}
                    </div>
                    ${breakdown.fault_ticket_number ? `<div class="item-meta" style="margin-top: 4px; color: #6b7280;"><i class="fas fa-ticket-alt"></i> Ticket: ${breakdown.fault_ticket_number}</div>` : ''}
                    ${Array.isArray(breakdown.assignments) && breakdown.assignments.length
                        ? `<div class="item-meta" style="margin-top: 4px;"><i class="fas fa-user-cog" style="color: #2563eb;"></i> <span style="color: #2563eb; font-weight: 600;">Assigned to: ${breakdown.assignments.map((item) => item.technician_name).join(', ')}</span></div>`
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

        this.querySelectorAll('#ticketTrackingList .inventory-item').forEach((item) => {
            const status = item.dataset.status || 'open';
            item.style.display = this.currentFilter === 'all' || status === this.currentFilter ? 'flex' : 'none';
        });

        this.querySelectorAll('#ticketTrackingFilterControls .filter-btn').forEach((button) => {
            button.classList.toggle('active', button.dataset.filter === this.currentFilter);
        });
    }

    updateSummary(reports) {
        const summary = this.querySelector('[data-ticket-summary]');
        if (!summary) {
            return;
        }

        const normalized = reports.map((item) => window.MOUtils.normalizeFilterStatus(item.ticket_status || item.status));
        const pendingCount = normalized.filter((status) => status === 'open').length;
        const inProgressCount = normalized.filter((status) => status === 'in-progress').length;
        summary.textContent = `${pendingCount} pending, ${inProgressCount} active`;
    }
}

customElements.define('mo-ticket-tracking', MOTicketTracking);
