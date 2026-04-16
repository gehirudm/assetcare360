class SupervisorFaultTicketTracking extends HTMLElement {
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
                <p class="page-subtitle">Track machine and route breakdown reports in one place</p>
            </div>

            <div class="filter-controls" id="supervisorFaultTicketFilterControls">
                <button class="filter-btn active" type="button" data-action="set-filter" data-filter="all">All Fault Tickets</button>
                <button class="filter-btn" type="button" data-action="set-filter" data-filter="open">Pending</button>
                <button class="filter-btn" type="button" data-action="set-filter" data-filter="in-progress">In Progress</button>
                <button class="filter-btn" type="button" data-action="set-filter" data-filter="resolved">Resolved</button>
                <button class="filter-btn" type="button" data-action="set-filter" data-filter="closed">Closed</button>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-ticket-alt"></i> Fault Ticket List</span>
                    <span class="status-text status-in-progress" data-fault-ticket-summary>Loading...</span>
                </div>
                <div id="supervisorFaultTicketList" class="inventory-list"></div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionNode = event.target.closest('[data-action]');
            if (!actionNode) {
                return;
            }

            const action = actionNode.dataset.action;

            if (action === 'set-filter') {
                this.applyFilter(actionNode.dataset.filter);
                return;
            }

            if (action === 'view-breakdown') {
                this.openDetails(actionNode.dataset.breakdownIdx);
            }
        });
    }

    async refresh() {
        const list = this.querySelector('#supervisorFaultTicketList');
        if (!list) {
            return;
        }

        if (typeof API === 'undefined' || typeof API.get !== 'function') {
            list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--danger);">API client is not available.</div>';
            return;
        }

        list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);">Loading fault tickets...</div>';

        try {
            const [machineRes, routeRes] = await Promise.all([
                API.get('/machine-breakdowns'),
                API.get('/route-breakdowns'),
            ]);

            const machineBreakdowns = (machineRes?.status === 'success' && machineRes.data?.reports)
                ? machineRes.data.reports.map((report) => this.normalizeMachineBreakdown(report))
                : [];

            const routeBreakdowns = (routeRes?.status === 'success' && routeRes.data?.breakdowns)
                ? routeRes.data.breakdowns.map((report) => this.normalizeRouteBreakdown(report))
                : [];

            this._allBreakdowns = [...machineBreakdowns, ...routeBreakdowns].sort((a, b) => {
                return new Date(b.date || 0) - new Date(a.date || 0);
            });
        } catch (error) {
            console.error('Error loading supervisor fault ticket tracking data:', error);
            this._allBreakdowns = [];
            list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--danger);">Error loading fault tickets.</div>';
            return;
        }

        this.renderList();
        this.updateSummary();
    }

    normalizeMachineBreakdown(report) {
        return {
            source: 'machine',
            id: report.id,
            raw: report,
            breakdownId: report.breakdown_id,
            identifier: report.machine_name || report.machine_model || `Machine #${report.machine_id}`,
            reportedBy: report.operator_name || 'Unknown',
            reporterType: 'Machinery Operator',
            description: report.description || '',
            type: report.breakdown_type || 'General Fault',
            severity: report.severity || 'Medium',
            date: report.created_at,
            effectiveStatus: report.ticket_status || report.status || 'Pending',
            ticketNumber: report.fault_ticket_number || null,
            faultTicketId: report.fault_ticket_id ? Number(report.fault_ticket_id) : null,
            assignments: Array.isArray(report.assignments) ? report.assignments : [],
        };
    }

    normalizeRouteBreakdown(report) {
        return {
            source: 'route',
            id: report.id,
            raw: report,
            breakdownId: report.route_breakdown_id,
            identifier: report.number_plate || `Vehicle #${report.vehicle_id}`,
            reportedBy: report.driver_name || 'Unknown',
            reporterType: 'Driver',
            description: report.description || '',
            type: report.breakdown_type || 'Route Breakdown',
            severity: report.severity || 'Medium',
            date: report.breakdown_datetime,
            effectiveStatus: report.ticket_status || report.status || 'Pending',
            ticketNumber: report.fault_ticket_number || null,
            faultTicketId: report.fault_ticket_id ? Number(report.fault_ticket_id) : null,
            assignments: Array.isArray(report.assigned_technicians)
                ? report.assigned_technicians.map((technician) => ({ technician_name: technician.technician_name }))
                : [],
        };
    }

    normalizeFilterStatus(status) {
        const normalizedStatus = String(status || '').toLowerCase();

        if (normalizedStatus === 'open' || normalizedStatus === 'pending') {
            return 'open';
        }

        if (
            normalizedStatus === 'assigned' ||
            normalizedStatus.includes('progress') ||
            normalizedStatus.includes('spare') ||
            normalizedStatus.includes('parts') ||
            normalizedStatus === 'waiting for budget approval'
        ) {
            return 'in-progress';
        }

        if (normalizedStatus === 'resolved' || normalizedStatus === 'finished' || normalizedStatus === 'completed') {
            return 'resolved';
        }

        if (normalizedStatus === 'closed') {
            return 'closed';
        }

        return 'open';
    }

    getStatusInfo(status) {
        const statusMap = {
            Open: { label: 'Pending', className: 'status-pending' },
            Pending: { label: 'Pending', className: 'status-pending' },
            Assigned: { label: 'Assigned', className: 'status-assigned' },
            'Waiting for Spare Parts': { label: 'Awaiting Parts', className: 'status-in-progress' },
            'Waiting for Budget Approval': { label: 'Awaiting Approval', className: 'status-in-progress' },
            'Parts Approved': { label: 'Parts Approved', className: 'status-in-progress' },
            'In Progress': { label: 'In Progress', className: 'status-in-progress' },
            Resolved: { label: 'Resolved', className: 'status-resolved' },
            Closed: { label: 'Closed', className: 'status-resolved' },
        };

        return statusMap[status] || { label: status || 'Pending', className: 'status-pending' };
    }

    getSeverityInfo(severity) {
        const normalizedSeverity = String(severity || 'medium').toLowerCase();

        if (normalizedSeverity === 'critical') {
            return { label: 'CRITICAL', className: 'status-critical' };
        }

        if (normalizedSeverity === 'high') {
            return { label: 'HIGH', className: 'status-urgent' };
        }

        if (normalizedSeverity === 'low') {
            return { label: 'LOW', className: 'status-normal' };
        }

        return { label: 'MEDIUM', className: 'status-warn' };
    }

    getUpdateText(status) {
        const updateMap = {
            Open: 'Awaiting supervisor review',
            Pending: 'Awaiting supervisor review',
            Assigned: 'Technician assigned to this ticket',
            'Waiting for Spare Parts': 'Waiting for spare parts to be approved',
            'Waiting for Budget Approval': 'Awaiting budget approval',
            'Parts Approved': 'Spare parts approved - repair to begin soon',
            'In Progress': 'Being investigated and repaired',
            Resolved: 'Work completed and ticket resolved',
            Closed: 'Ticket closed',
        };

        return updateMap[status] || 'No updates';
    }

    formatDate(value) {
        if (!value) {
            return 'N/A';
        }

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return 'N/A';
        }

        return parsed.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    }

    renderList() {
        const list = this.querySelector('#supervisorFaultTicketList');
        if (!list) {
            return;
        }

        const filtered = [];
        this._allBreakdowns.forEach((breakdown, index) => {
            if (this.currentFilter === 'all' || this.normalizeFilterStatus(breakdown.effectiveStatus) === this.currentFilter) {
                filtered.push({ breakdown, index });
            }
        });

        if (!filtered.length) {
            list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);">No fault tickets found.</div>';
            return;
        }

        list.innerHTML = filtered
            .map(({ breakdown, index }) => this.renderCard(breakdown, index))
            .join('');
    }

    renderCard(breakdown, index) {
        const statusInfo = this.getStatusInfo(breakdown.effectiveStatus);
        const severityInfo = this.getSeverityInfo(breakdown.severity);
        const sourceIcon = breakdown.source === 'route' ? 'fa-car' : 'fa-cogs';
        const ticketHtml = breakdown.ticketNumber
            ? `<div class="item-meta" style="margin-top:4px;color:#6b7280;"><i class="fas fa-ticket-alt"></i> Ticket: ${this.escapeHtml(breakdown.ticketNumber)}</div>`
            : '';
        const assignedHtml = breakdown.assignments.length
            ? `<div class="item-meta" style="margin-top:4px;"><i class="fas fa-user-cog" style="color:#2563eb;"></i> <span style="color:#2563eb;font-weight:600;">Assigned to: ${this.escapeHtml(breakdown.assignments.map((assignment) => assignment.technician_name).filter(Boolean).join(', '))}</span></div>`
            : '';
        const updateText = this.getUpdateText(breakdown.effectiveStatus);
        const showUpdateText = breakdown.effectiveStatus !== 'Pending' && breakdown.effectiveStatus !== 'Open';

        return `
            <div class="inventory-item" data-status="${this.escapeHtml(this.normalizeFilterStatus(breakdown.effectiveStatus))}" data-breakdown-idx="${index}">
                <div class="item-details">
                    <strong><i class="fas ${sourceIcon}"></i> ${this.escapeHtml(breakdown.breakdownId || `#${breakdown.id}`)} <small style="font-weight:400;color:var(--muted);">(${this.escapeHtml(breakdown.reporterType)})</small></strong>
                    <div class="item-meta">
                        <i class="fas ${sourceIcon}"></i> ${this.escapeHtml(breakdown.identifier)} &nbsp;|&nbsp;
                        <i class="fas fa-user"></i> ${this.escapeHtml(breakdown.reportedBy)} &nbsp;|&nbsp;
                        <i class="fas fa-tag"></i> ${this.escapeHtml(breakdown.type)}
                    </div>
                    <div class="item-description">${this.escapeHtml(breakdown.description || 'No description provided.')}</div>
                    <div class="item-meta" style="margin-top:6px;">
                        <span class="status-text ${statusInfo.className}">${this.escapeHtml(statusInfo.label)}</span> &nbsp;|&nbsp;
                        <span class="status-text ${severityInfo.className}">${this.escapeHtml(severityInfo.label)}</span> &nbsp;|&nbsp;
                        <i class="fas fa-calendar"></i> ${this.escapeHtml(this.formatDate(breakdown.date))}
                    </div>
                    ${ticketHtml}
                    ${assignedHtml}
                    ${showUpdateText ? `<div class="item-meta" style="margin-top:4px;color:#059669;font-weight:500;">${this.escapeHtml(updateText)}</div>` : ''}
                </div>
                <div class="item-actions">
                    <button class="btn btn-primary btn-small" type="button" data-action="view-breakdown" data-breakdown-idx="${index}">
                        <i class="fas fa-eye"></i> VIEW
                    </button>
                </div>
            </div>`;
    }

    applyFilter(filter) {
        this.currentFilter = filter || 'all';

        this.querySelectorAll('#supervisorFaultTicketFilterControls .filter-btn').forEach((button) => {
            button.classList.toggle('active', button.dataset.filter === this.currentFilter);
        });

        this.renderList();
    }

    updateSummary() {
        const summary = this.querySelector('[data-fault-ticket-summary]');
        if (!summary) {
            return;
        }

        const pendingCount = this._allBreakdowns
            .filter((breakdown) => this.normalizeFilterStatus(breakdown.effectiveStatus) === 'open')
            .length;
        const activeCount = this._allBreakdowns
            .filter((breakdown) => this.normalizeFilterStatus(breakdown.effectiveStatus) === 'in-progress')
            .length;

        summary.textContent = `${pendingCount} pending, ${activeCount} active`;
    }

    async openDetails(index) {
        const breakdown = this._allBreakdowns[Number(index)];
        if (!breakdown) {
            this.emitToast('Fault ticket not found.', 'warning');
            return;
        }

        if (breakdown.faultTicketId) {
            if (typeof window.viewTicketDetails === 'function') {
                window.viewTicketDetails(breakdown.faultTicketId);
                return;
            }

            const currentUrl = new URL(window.location.href);
            const currentSection = currentUrl.searchParams.get('section') || 'fault-ticket-tracking';
            const returnUrl = new URL('/dashboard/supervisor/index.html', window.location.origin);
            returnUrl.searchParams.set('section', currentSection);

            const viewTicketUrl = new URL('/view-ticket/index.html', window.location.origin);
            viewTicketUrl.searchParams.set('id', String(breakdown.faultTicketId));
            viewTicketUrl.searchParams.set('return_to', `${returnUrl.pathname}${returnUrl.search}`);

            window.location.href = `${viewTicketUrl.pathname}${viewTicketUrl.search}`;
            return;
        }

        const modal = document.querySelector('supervisor-view-ticket-modal');
        if (!modal) {
            this.emitToast('Ticket details modal is unavailable.', 'error');
            return;
        }

        if (breakdown.source === 'route' && typeof modal.openBreakdownDetails === 'function') {
            await modal.openBreakdownDetails('route_breakdown', breakdown.id);
            return;
        }

        if (breakdown.source === 'machine' && typeof modal.openMachineBreakdown === 'function') {
            modal.openMachineBreakdown(this.toMachineTicketPayload(breakdown));
            return;
        }

        this.emitToast('No details available for this item.', 'warning');
    }

    toMachineTicketPayload(breakdown) {
        const priorityBySeverity = {
            critical: 'Critical',
            high: 'High',
            medium: 'Medium',
            low: 'Low',
        };

        const normalizedSeverity = String(breakdown.severity || 'medium').toLowerCase();

        return {
            id: breakdown.id,
            ticket_id: breakdown.breakdownId,
            machine_id: breakdown.raw?.machine_id || null,
            machine_name: breakdown.raw?.machine_name || breakdown.identifier,
            priority: priorityBySeverity[normalizedSeverity] || 'Medium',
            status: breakdown.effectiveStatus || 'Open',
            created_at: breakdown.date,
            reporter_full_name: breakdown.reportedBy,
            original_report: {
                breakdown_type: breakdown.type,
                severity: breakdown.severity,
                breakdown_date: breakdown.date,
                machine_model: breakdown.raw?.machine_model || breakdown.identifier,
                machine_name: breakdown.raw?.machine_name || breakdown.identifier,
                operator_name: breakdown.reportedBy,
                description: breakdown.description,
            },
        };
    }

    emitToast(message, type = 'info') {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
            return;
        }

        this.dispatchEvent(new CustomEvent('supervisor-ui:toast', {
            bubbles: true,
            detail: { message, type },
        }));
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

if (!customElements.get('supervisor-fault-ticket-tracking')) {
    customElements.define('supervisor-fault-ticket-tracking', SupervisorFaultTicketTracking);
}
