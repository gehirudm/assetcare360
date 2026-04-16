class MaintenanceFaultTickets extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.currentFilter = 'all';
        this._allBreakdowns = [];

        this.render();
        this.bindEvents();
        this.refresh();
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Fault Tickets</h1>
                <p class="page-subtitle">Breakdown reports from Drivers and Machinery Operators</p>
            </div>

            <div class="filter-controls" id="faultTicketsFilterControls">
                <button class="filter-btn active" type="button" data-action="set-filter" data-filter="all">All Breakdowns</button>
                <button class="filter-btn" type="button" data-action="set-filter" data-filter="open">Pending</button>
                <button class="filter-btn" type="button" data-action="set-filter" data-filter="in-progress">In Progress</button>
                <button class="filter-btn" type="button" data-action="set-filter" data-filter="resolved">Resolved</button>
                <button class="filter-btn" type="button" data-action="set-filter" data-filter="closed">Closed</button>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-ticket-alt"></i> Breakdown Reports</span>
                    <span class="status-text status-in-progress" data-breakdown-summary>Loading...</span>
                </div>
                <div id="breakdownReportsList" class="inventory-list"></div>
            </div>
        `;
    }

    async refresh() {
        const list = this.querySelector('#breakdownReportsList');
        if (!list) {
            return;
        }

        list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);">Loading breakdown reports...</div>';

        try {
            const [machineRes, routeRes] = await Promise.all([
                API.get('/machine-breakdowns'),
                API.get('/route-breakdowns'),
            ]);

            const machineBreakdowns = (machineRes?.status === 'success' && machineRes.data?.reports)
                ? machineRes.data.reports.map(r => this._normalizeMachine(r))
                : [];

            const routeBreakdowns = (routeRes?.status === 'success' && routeRes.data?.breakdowns)
                ? routeRes.data.breakdowns.map(r => this._normalizeRoute(r))
                : [];

            this._allBreakdowns = [...machineBreakdowns, ...routeBreakdowns].sort((a, b) => {
                return new Date(b.date || 0) - new Date(a.date || 0);
            });
        } catch (err) {
            this._allBreakdowns = [];
            list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--danger);">Error loading breakdown reports.</div>';
            return;
        }

        this._renderList();
        this._updateSummary();
    }

    _normalizeMachine(mb) {
        return {
            _source: 'machine',
            _id: mb.id,
            _raw: mb,
            breakdownId: mb.breakdown_id,
            identifier: mb.machine_name || mb.machine_model || `Machine #${mb.machine_id}`,
            reportedBy: mb.operator_name || 'Unknown',
            reporterType: 'Machinery Operator',
            description: mb.description || '',
            type: mb.breakdown_type || 'General Fault',
            severity: mb.severity || 'Medium',
            date: mb.created_at,
            effectiveStatus: mb.ticket_status || mb.status || 'Pending',
            ticketNumber: mb.fault_ticket_number || null,
            assignments: Array.isArray(mb.assignments) ? mb.assignments : [],
        };
    }

    _normalizeRoute(rb) {
        return {
            _source: 'route',
            _id: rb.id,
            _raw: rb,
            breakdownId: rb.route_breakdown_id,
            identifier: rb.number_plate || `Vehicle #${rb.vehicle_id}`,
            reportedBy: rb.driver_name || 'Unknown',
            reporterType: 'Driver',
            description: rb.description || '',
            type: rb.breakdown_type || 'Route Breakdown',
            severity: rb.severity || 'Medium',
            date: rb.breakdown_datetime,
            effectiveStatus: rb.ticket_status || rb.status || 'Pending',
            ticketNumber: rb.fault_ticket_number || null,
            assignments: Array.isArray(rb.assigned_technicians)
                ? rb.assigned_technicians.map(t => ({ technician_name: t.technician_name }))
                : [],
        };
    }

    _normalizeFilter(status) {
        const s = String(status || '').toLowerCase();
        if (s === 'open' || s === 'pending') {
            return 'open';
        }

        if (s === 'assigned' || s.includes('progress') || s.includes('spare') || s.includes('parts') || s === 'waiting for budget approval') {
            return 'in-progress';
        }

        if (s === 'resolved' || s === 'finished' || s === 'completed') {
            return 'resolved';
        }

        if (s === 'closed') {
            return 'closed';
        }

        return 'open';
    }

    _getStatusInfo(status) {
        const map = {
            Open:     { label: 'Pending',       cls: 'status-pending' },
            Pending:  { label: 'Pending',       cls: 'status-pending' },
            Assigned: { label: 'Assigned',      cls: 'status-assigned' },
            'Waiting for Spare Parts':     { label: 'Awaiting Parts',    cls: 'status-waiting-for-spare-parts' },
            'Waiting for Budget Approval': { label: 'Awaiting Approval', cls: 'status-waiting-for-budget-approval' },
            'Parts Approved':              { label: 'Parts Approved',    cls: 'status-parts-approved' },
            'In Progress': { label: 'In Progress', cls: 'status-in-progress' },
            Resolved:      { label: 'Resolved',    cls: 'status-resolved' },
            Closed:        { label: 'Closed',      cls: 'status-closed' },
        };

        return map[status] || { label: status || 'Pending', cls: 'status-pending' };
    }

    _formatDate(d) {
        if (!d) {
            return 'N/A';
        }

        const date = new Date(d);
        if (Number.isNaN(date.getTime())) {
            return 'N/A';
        }

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    _renderList() {
        const list = this.querySelector('#breakdownReportsList');
        if (!list) {
            return;
        }

        const filtered = this._allBreakdowns.filter(b => {
            if (this.currentFilter === 'all') {
                return true;
            }

            return this._normalizeFilter(b.effectiveStatus) === this.currentFilter;
        });

        if (!filtered.length) {
            list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);">No breakdown reports found.</div>';
            return;
        }

        list.innerHTML = filtered.map(b => this._renderCard(b)).join('');
    }

    _renderCard(b) {
        const statusInfo = this._getStatusInfo(b.effectiveStatus);
        const normalized = this._normalizeFilter(b.effectiveStatus);
        const severityCls = 'status-' + String(b.severity || 'medium').toLowerCase();
        const sourceIcon = b._source === 'route' ? 'fa-car' : 'fa-cogs';
        const assignedHtml = b.assignments.length
            ? `<div class="item-meta" style="margin-top:4px;"><i class="fas fa-user-cog" style="color:#2563eb;"></i> <span style="color:#2563eb;font-weight:600;">Assigned to: ${b.assignments.map(a => a.technician_name).filter(Boolean).join(', ')}</span></div>`
            : '';
        const ticketHtml = b.ticketNumber
            ? `<div class="item-meta" style="margin-top:4px;color:#6b7280;"><i class="fas fa-ticket-alt"></i> Ticket: ${b.ticketNumber}</div>`
            : '';
        const updateText = this._getUpdateText(b.effectiveStatus);
        const showUpdate = b.effectiveStatus !== 'Pending' && b.effectiveStatus !== 'Open';

        return `
            <div class="inventory-item" data-status="${normalized}" data-breakdown-idx="${this._allBreakdowns.indexOf(b)}">
                <div class="item-details">
                    <strong><i class="fas ${sourceIcon}"></i> ${b.breakdownId || '#' + b._id} <small style="font-weight:400;color:var(--muted);">(${b.reporterType})</small></strong>
                    <div class="item-meta">
                        <i class="fas ${sourceIcon}"></i> ${b.identifier} &nbsp;|&nbsp;
                        <i class="fas fa-user"></i> ${b.reportedBy} &nbsp;|&nbsp;
                        <i class="fas fa-tag"></i> ${b.type}
                    </div>
                    <div class="item-description">${b.description || 'No description provided.'}</div>
                    <div class="item-meta" style="margin-top:6px;">
                        <span class="status-text ${statusInfo.cls}">${statusInfo.label}</span> &nbsp;|&nbsp;
                        <span class="status-text ${severityCls}">${String(b.severity || 'MEDIUM').toUpperCase()}</span> &nbsp;|&nbsp;
                        <i class="fas fa-calendar"></i> ${this._formatDate(b.date)}
                    </div>
                    ${ticketHtml}
                    ${assignedHtml}
                    ${showUpdate ? `<div class="item-meta" style="margin-top:4px;color:#059669;font-weight:500;">${updateText}</div>` : ''}
                </div>
                <div class="item-actions">
                    <button class="btn btn-primary btn-small" type="button" data-action="view-breakdown" data-breakdown-idx="${this._allBreakdowns.indexOf(b)}">
                        <i class="fas fa-eye"></i> VIEW
                    </button>
                </div>
            </div>`;
    }

    _getUpdateText(status) {
        const map = {
            Open: 'Awaiting supervisor review',
            Pending: 'Awaiting supervisor review',
            Assigned: 'Technician assigned to this ticket',
            'Waiting for Spare Parts': 'Waiting for spare parts to be approved',
            'Waiting for Budget Approval': 'Awaiting budget approval',
            'Parts Approved': 'Spare parts approved — repair to begin soon',
            'In Progress': 'Being investigated and repaired',
            Resolved: 'Work completed and ticket resolved',
            Closed: 'Ticket closed',
        };

        return map[status] || 'No updates';
    }

    _updateSummary() {
        const summary = this.querySelector('[data-breakdown-summary]');
        if (!summary) {
            return;
        }

        const pending = this._allBreakdowns.filter(b => this._normalizeFilter(b.effectiveStatus) === 'open').length;
        const active = this._allBreakdowns.filter(b => this._normalizeFilter(b.effectiveStatus) === 'in-progress').length;
        summary.textContent = `${pending} pending, ${active} active`;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionNode = event.target.closest('[data-action]');
            if (!actionNode) {
                return;
            }

            const action = actionNode.dataset.action;
            if (action === 'set-filter') {
                this.applyFilter(actionNode.dataset.filter, actionNode);
                return;
            }

            if (action === 'view-breakdown') {
                this.viewBreakdownDetails(actionNode.dataset.breakdownIdx);
            }
        });
    }

    emitToast(message, type = 'info') {
        this.dispatchEvent(new CustomEvent('maintenance-ui:toast', {
            bubbles: true,
            detail: { message, type },
        }));
    }

    applyFilter(filter, button) {
        this.currentFilter = filter || 'all';

        this.querySelectorAll('#faultTicketsFilterControls .filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === this.currentFilter);
        });

        this._renderList();
    }

    viewBreakdownDetails(idx) {
        const breakdown = this._allBreakdowns[Number(idx)];
        if (!breakdown) {
            this.emitToast('Breakdown report not found.', 'warning');
            return;
        }

        const modal = document.querySelector('maintenance-ticket-details-modal');
        if (!modal) {
            this.emitToast('Details modal is unavailable.', 'error');
            return;
        }

        if (typeof modal.openWithBreakdown === 'function') {
            modal.openWithBreakdown(breakdown);
        }
    }
}

customElements.define('maintenance-fault-tickets', MaintenanceFaultTickets);
