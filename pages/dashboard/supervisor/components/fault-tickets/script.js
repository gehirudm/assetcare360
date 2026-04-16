class SupervisorFaultTickets extends HTMLElement {
    constructor() {
        super();
        this._onRootClick = this._onRootClick.bind(this);
        this._onDocumentClick = this._onDocumentClick.bind(this);
    }

    connectedCallback() {
        if (this._initialized) return;

        this.render();
        this.addEventListener('click', this._onRootClick);
        document.addEventListener('click', this._onDocumentClick);
        this._initialized = true;
    }

    disconnectedCallback() {
        this.removeEventListener('click', this._onRootClick);
        document.removeEventListener('click', this._onDocumentClick);
    }

    _onDocumentClick(event) {
        if (this.contains(event.target)) return;
        this.closeAllDropdowns();
    }

    _onRootClick(event) {
        const dropdownTrigger = event.target.closest('button[data-dropdown-id]');
        if (dropdownTrigger) {
            event.preventDefault();
            event.stopPropagation();

            const dropdownId = dropdownTrigger.dataset.dropdownId;
            if (dropdownId) {
                this.toggleDropdown(dropdownId);
            }
            return;
        }

        const actionButton = event.target.closest('button[data-action]');
        if (actionButton) {
            const action = actionButton.dataset.action;
            if (!action) return;

            this.closeAllDropdowns();

            this.dispatchEvent(new CustomEvent('supervisor-fault-tickets:action', {
                bubbles: true,
                detail: {
                    action,
                    ticketId: this.parseNumber(actionButton.dataset.ticketId),
                    reportId: this.parseNumber(actionButton.dataset.reportId),
                    reportType: actionButton.dataset.reportType || ''
                }
            }));
            return;
        }

        const statusButton = event.target.closest('button[data-ticket-status]');
        if (statusButton) {
            const status = statusButton.dataset.ticketStatus || 'all';
            this.setStatusFilter(status);
            this.dispatchEvent(new CustomEvent('supervisor-fault-tickets:filter-status', {
                bubbles: true,
                detail: { status }
            }));
            return;
        }

        const sourceButton = event.target.closest('button[data-ticket-source]');
        if (sourceButton) {
            const source = sourceButton.dataset.ticketSource || 'all';
            this.setSourceFilter(source);
            this.dispatchEvent(new CustomEvent('supervisor-fault-tickets:filter-source', {
                bubbles: true,
                detail: { source }
            }));
            return;
        }

        const createButton = event.target.closest('button[data-ticket-action="create"]');
        if (createButton) {
            this.dispatchEvent(new CustomEvent('supervisor-fault-tickets:create-ticket', {
                bubbles: true
            }));
            return;
        }

        if (!event.target.closest('.dropdown-container')) {
            this.closeAllDropdowns();
        }
    }

    parseNumber(value) {
        if (value === undefined || value === null || value === '') return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    toggleDropdown(dropdownId) {
        const dropdown = this.querySelector(`#dropdown-${dropdownId}`);
        if (!dropdown) return;

        const shouldOpen = !dropdown.classList.contains('show');
        this.closeAllDropdowns();

        if (shouldOpen) {
            dropdown.classList.add('show');
        }
    }

    closeAllDropdowns() {
        this.querySelectorAll('.dropdown-menu.show').forEach(menu => {
            menu.classList.remove('show');
        });
    }

    setStatusFilter(status) {
        this.querySelectorAll('button[data-ticket-status]').forEach(button => {
            button.classList.toggle('active', button.dataset.ticketStatus === status);
        });
    }

    setSourceFilter(source) {
        this.querySelectorAll('button[data-ticket-source]').forEach(button => {
            button.classList.toggle('active', button.dataset.ticketSource === source);
        });
    }

    setLoading() {
        const unassignedList = this.querySelector('#unassignedTicketsList');
        const activeList = this.querySelector('#activeTicketsList');
        const resolvedList = this.querySelector('#resolvedTicketsList');

        if (unassignedList) {
            unassignedList.innerHTML = '<p style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> Loading...</p>';
        }

        if (activeList) {
            activeList.innerHTML = '<p style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> Loading tickets...</p>';
        }

        if (resolvedList) {
            resolvedList.innerHTML = '<p style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> Loading tickets...</p>';
        }
    }

    setError(message) {
        const errorMessage = message || 'Error loading tickets';
        const unassignedList = this.querySelector('#unassignedTicketsList');
        const activeList = this.querySelector('#activeTicketsList');
        const resolvedList = this.querySelector('#resolvedTicketsList');

        if (unassignedList) {
            unassignedList.innerHTML = `<p style="text-align: center; color: var(--danger);">${errorMessage}</p>`;
        }

        if (activeList) {
            activeList.innerHTML = `<p style="text-align: center; color: var(--danger);">${errorMessage}</p>`;
        }

        if (resolvedList) {
            resolvedList.innerHTML = `<p style="text-align: center; color: var(--danger);">${errorMessage}</p>`;
        }
    }

    renderFilteredTickets({ unassignedBreakdowns = [], unassignedTickets = [], assignedTickets = [], resolvedTickets = [] } = {}) {
        const unassignedList = this.querySelector('#unassignedTicketsList');
        const activeList = this.querySelector('#activeTicketsList');
        const resolvedList = this.querySelector('#resolvedTicketsList');

        if (!unassignedList || !activeList || !resolvedList) {
            return;
        }

        const breakdownHtml = unassignedBreakdowns.map(report => this.renderBreakdownItem(report)).join('');
        const unassignedTicketHtml = unassignedTickets.map(ticket => this.renderUnassignedTicket(ticket)).join('');
        const assignedTicketHtml = assignedTickets.map(ticket => this.renderAssignedTicket(ticket)).join('');
        const resolvedTicketHtml = resolvedTickets.map(ticket => this.renderResolvedTicket(ticket)).join('');

        const combinedUnassigned = breakdownHtml + unassignedTicketHtml;
        unassignedList.innerHTML = combinedUnassigned || '<p style="text-align: center; color: var(--muted); padding: 20px;">No unassigned tickets or breakdown reports match the current filters</p>';
        activeList.innerHTML = assignedTicketHtml || '<p style="text-align: center; color: var(--muted); padding: 20px;">No assigned tickets match the current filters</p>';
        resolvedList.innerHTML = resolvedTicketHtml || '<p style="text-align: center; color: var(--muted); padding: 20px;">No resolved tickets</p>';
    }

    renderBreakdownItem(report) {
        const isRoute = report.type === 'route_breakdown';
        const isMachine = report.type === 'machine_breakdown';
        const reportId = report.breakdown_id || `BD-${report.id}`;
        const severity = (report.severity || 'Medium').toLowerCase();
        const createdDate = new Date(report.created_at || report.breakdown_date);
        const formattedDate = Number.isNaN(createdDate.getTime())
            ? 'N/A'
            : createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const assetName = isMachine ? (report.machine_model || 'Unknown Machine') : (report.number_plate || 'Unknown Vehicle');
        const assetIcon = isMachine ? 'fas fa-cogs' : 'fas fa-wrench';
        const faultType = isMachine
            ? (report.breakdown_type || 'Machine Fault')
            : (report.breakdown_type || (isRoute ? 'Route Breakdown' : 'Vehicle Breakdown'));
        const sourceLabel = isMachine ? 'Machine' : (isRoute ? 'Route' : 'Vehicle');
        const sourceColor = isMachine ? '#7c3aed' : '#2563eb';
        const dropdownId = `breakdown-${report.type}-${report.id}`;

        return `
            <div class="inventory-item">
                <div class="item-details">
                    <strong><i class="fas fa-ticket-alt"></i> ${this.escapeHtml(reportId)} <span style="font-size: 10px; background: ${sourceColor}; color: white; padding: 1px 6px; border-radius: 4px; margin-left: 6px;">${sourceLabel}</span></strong>
                    <div class="item-meta">
                        <i class="${assetIcon}"></i> ${this.escapeHtml(assetName)}
                    </div>
                    <div class="item-meta">
                        <i class="fas fa-tools"></i> ${this.escapeHtml(faultType)} |
                        <span class="status-text status-${this.escapeHtml(severity)}">${this.escapeHtml(severity.toUpperCase())}</span> |
                        <i class="fas fa-calendar"></i> ${this.escapeHtml(formattedDate)}
                    </div>
                </div>
                <div class="item-actions">
                    <div class="action-buttons">
                        <button class="btn btn-primary btn-small" type="button" data-action="view-breakdown" data-report-type="${this.escapeHtml(report.type || '')}" data-report-id="${Number(report.id)}"><i class="fas fa-eye"></i> VIEW</button>
                        <div class="dropdown-container">
                            <button class="btn btn-small btn-secondary dropdown-trigger" type="button" data-dropdown-id="${this.escapeHtml(dropdownId)}">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div class="dropdown-menu" id="dropdown-${this.escapeHtml(dropdownId)}">
                                <button class="dropdown-item" type="button" data-action="assign-breakdown" data-report-type="${this.escapeHtml(report.type || '')}" data-report-id="${Number(report.id)}">
                                    <i class="fas fa-user-plus"></i> Assign Technician
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderUnassignedTicket(ticket) {
        const isMachineBreakdown = ticket.is_machine_breakdown === true;
        const isRouteBreakdown = String(ticket.breakdown_type || '').toLowerCase() === 'route_breakdown';
        const routeGarageWorkflowStatus = String(ticket.route_garage_workflow_status || '').toLowerCase();
        const hasGarageAssignment = isRouteBreakdown && ['garage_approved', 'garage_entry_logged', 'repair_in_progress', 'completed'].includes(routeGarageWorkflowStatus);
        const assetName = ticket.machine_model_number || ticket.machine_name || `Machine #${ticket.machine_id}`;
        const reporterName = ticket.reported_by_name || ticket.reporter_full_name || 'Unknown';
        const createdDate = new Date(ticket.created_at);
        const formattedDate = Number.isNaN(createdDate.getTime())
            ? 'N/A'
            : createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const priority = (ticket.priority || 'Medium').toLowerCase();
        const displayTicketId = (ticket.breakdown_type === 'machine_breakdown' && ticket.breakdown_report_id)
            ? ticket.breakdown_report_id
            : (ticket.ticket_id || ('MBD-' + String(ticket.id).padStart(3, '0')));
        const sourceTag = isMachineBreakdown
            ? '<span style="font-size: 10px; background: #7c3aed; color: white; padding: 1px 6px; border-radius: 4px; margin-left: 6px;">Machine</span>'
            : '';
        const assetIcon = isMachineBreakdown ? 'fas fa-cogs' : 'fas fa-wrench';
        const dropdownId = `ticket-${displayTicketId}`;
        const garageMeta = hasGarageAssignment
            ? `<div class="item-meta"><i class="fas fa-warehouse" style="color:#0f766e;"></i> <span style="color:#0f766e;font-weight:600;">Nearby Garage: ${this.escapeHtml(ticket.route_approved_garage_name || 'Approved')}</span></div>`
            : '';
        const assignActionHtml = hasGarageAssignment
            ? ''
            : `<button class="dropdown-item" type="button" data-action="assign-ticket" data-ticket-id="${Number(ticket.id)}">
                                    <i class="fas fa-user-plus"></i> Assign Technician
                                </button>`;
        const garageHintHtml = hasGarageAssignment
            ? `<div class="item-meta" style="margin-top:4px;color:#0f766e;font-weight:500;"><i class="fas fa-info-circle"></i> Technician assignment is not required after garage approval.</div>`
            : '';

        return `
            <div class="inventory-item">
                <div class="item-details">
                    <strong><i class="fas fa-ticket-alt"></i> ${this.escapeHtml(displayTicketId)} ${sourceTag}</strong>
                    <div class="item-meta">
                        <i class="${assetIcon}"></i> ${this.escapeHtml(assetName)}
                    </div>
                    <div class="item-meta">
                        <i class="fas fa-user"></i> ${this.escapeHtml(reporterName)} |
                        <span class="status-text status-${this.escapeHtml(priority)}">${this.escapeHtml(priority.toUpperCase())}</span> |
                        <i class="fas fa-calendar"></i> ${this.escapeHtml(formattedDate)}
                    </div>
                    ${garageMeta}
                    ${garageHintHtml}
                </div>
                <div class="item-actions">
                    <div class="action-buttons">
                        <button class="btn btn-primary btn-small" type="button" data-action="view-ticket" data-ticket-id="${Number(ticket.id)}"><i class="fas fa-eye"></i> VIEW</button>
                        <div class="dropdown-container">
                            <button class="btn btn-small btn-secondary dropdown-trigger" type="button" data-dropdown-id="${this.escapeHtml(dropdownId)}">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div class="dropdown-menu" id="dropdown-${this.escapeHtml(dropdownId)}">
                                ${assignActionHtml}
                                ${!isMachineBreakdown ? `
                                <button class="dropdown-item" type="button" data-action="edit-ticket" data-ticket-id="${Number(ticket.id)}">
                                    <i class="fas fa-edit"></i> Edit Ticket
                                </button>
                                <button class="dropdown-item danger" type="button" data-action="delete-ticket" data-ticket-id="${Number(ticket.id)}">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderAssignedTicket(ticket) {
        const assetName = ticket.machine_model_number || ticket.machine_name || `Machine #${ticket.machine_id}`;
        const isRouteBreakdown = String(ticket.breakdown_type || '').toLowerCase() === 'route_breakdown';
        const routeGarageWorkflowStatus = String(ticket.route_garage_workflow_status || '').toLowerCase();
        const hasGarageAssignment = isRouteBreakdown && ['garage_approved', 'garage_entry_logged', 'repair_in_progress', 'completed'].includes(routeGarageWorkflowStatus);
        const assignedTo = ticket.assignments && ticket.assignments.length > 0
            ? ticket.assignments.map(a => a.technician_name).join(', ')
            : (hasGarageAssignment ? (ticket.route_approved_garage_name || 'Nearby Garage') : 'Unassigned');
        const primaryAssignment = Array.isArray(ticket.assignments) && ticket.assignments.length > 0
            ? ticket.assignments[0]
            : null;
        const expectedCompletionDate = primaryAssignment?.expected_completion_date
            ? new Date(primaryAssignment.expected_completion_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : null;
        const priority = (ticket.priority || 'Medium').toLowerCase();
        const status = (ticket.status || 'open').toLowerCase().replace(' ', '-');
        const displayTicketId = (ticket.breakdown_type === 'machine_breakdown' && ticket.breakdown_report_id)
            ? ticket.breakdown_report_id
            : (ticket.ticket_id || ('MBD-' + String(ticket.id).padStart(3, '0')));
        const dropdownId = `active-${ticket.id}`;

        return `
            <div class="inventory-item">
                <div class="item-details">
                    <strong><i class="fas fa-ticket-alt"></i> ${this.escapeHtml(displayTicketId)}</strong>
                    <div class="item-meta">
                        <i class="fas fa-wrench"></i> ${this.escapeHtml(assetName)} |
                        <i class="${hasGarageAssignment ? 'fas fa-warehouse' : 'fas fa-user-cog'}"></i> ${this.escapeHtml(assignedTo)}
                    </div>
                    ${hasGarageAssignment ? `<div class="item-meta"><i class="fas fa-info-circle" style="color:#0f766e;"></i> <span style="color:#0f766e;font-weight:600;">Garage workflow is active; technician assignment is optional.</span></div>` : ''}
                    ${expectedCompletionDate ? `<div class="item-meta"><i class="fas fa-calendar-check"></i> Expected: ${this.escapeHtml(expectedCompletionDate)}</div>` : ''}
                    <div class="item-meta">
                        <span class="status-text status-${this.escapeHtml(priority)}">${this.escapeHtml((ticket.priority || 'MEDIUM').toUpperCase())}</span> |
                        <span class="status-text status-${this.escapeHtml(status)}">${this.escapeHtml((ticket.status || 'OPEN').toUpperCase().replace('-', ' '))}</span>
                    </div>
                </div>
                <div class="item-actions">
                    <div class="action-buttons">
                        <button class="btn btn-primary btn-small" type="button" data-action="view-ticket" data-ticket-id="${Number(ticket.id)}"><i class="fas fa-eye"></i> VIEW</button>
                        <div class="dropdown-container">
                            <button class="btn btn-small btn-secondary dropdown-trigger" type="button" data-dropdown-id="${this.escapeHtml(dropdownId)}">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div class="dropdown-menu" id="dropdown-${this.escapeHtml(dropdownId)}">
                                ${hasGarageAssignment ? '' : `<button class="dropdown-item" type="button" data-action="edit-assignment" data-ticket-id="${Number(ticket.id)}">
                                    <i class="fas fa-edit"></i> Edit Assignment
                                </button>
                                <button class="dropdown-item" type="button" data-action="reassign-ticket" data-ticket-id="${Number(ticket.id)}">
                                    <i class="fas fa-user-cog"></i> Reassign
                                </button>`}
                                <button class="dropdown-item" type="button" data-action="mark-complete" data-ticket-id="${Number(ticket.id)}">
                                    <i class="fas fa-check-circle"></i> Mark Complete
                                </button>
                                <button class="dropdown-item" type="button" data-action="print-ticket" data-ticket-id="${Number(ticket.id)}">
                                    <i class="fas fa-print"></i> Print
                                </button>
                                <button class="dropdown-item danger" type="button" data-action="delete-ticket" data-ticket-id="${Number(ticket.id)}">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderResolvedTicket(ticket) {
        const assetName = ticket.machine_model_number || ticket.machine_name || `Machine #${ticket.machine_id}`;
        const assignedTo = ticket.assignments && ticket.assignments.length > 0
            ? ticket.assignments.map(a => a.technician_name).join(', ')
            : 'Unassigned';
        const resolvedDate = ticket.updated_at
            ? new Date(ticket.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : null;
        const priority = (ticket.priority || 'Medium').toLowerCase();
        const displayTicketId = (ticket.breakdown_type === 'machine_breakdown' && ticket.breakdown_report_id)
            ? ticket.breakdown_report_id
            : (ticket.ticket_id || ('MBD-' + String(ticket.id).padStart(3, '0')));

        return `
            <div class="inventory-item" style="border-left: 4px solid #10b981;">
                <div class="item-details">
                    <strong><i class="fas fa-ticket-alt"></i> ${this.escapeHtml(displayTicketId)}</strong>
                    <div class="item-meta">
                        <i class="fas fa-wrench"></i> ${this.escapeHtml(assetName)} |
                        <i class="fas fa-user-cog"></i> ${this.escapeHtml(assignedTo)}
                    </div>
                    ${resolvedDate ? `<div class="item-meta"><i class="fas fa-calendar-check"></i> Resolved: ${this.escapeHtml(resolvedDate)}</div>` : ''}
                    <div class="item-meta">
                        <span class="status-text status-${this.escapeHtml(priority)}">${this.escapeHtml((ticket.priority || 'MEDIUM').toUpperCase())}</span> |
                        <span class="status-badge" style="background: #10b981; color: white; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;"><i class="fas fa-check-circle"></i> FINISHED</span>
                    </div>
                </div>
                <div class="item-actions">
                    <div class="action-buttons">
                        <button class="btn btn-primary btn-small" type="button" data-action="view-ticket" data-ticket-id="${Number(ticket.id)}"><i class="fas fa-eye"></i> VIEW</button>
                    </div>
                </div>
            </div>
        `;
    }

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    refresh() {
        // Parent script controls data loading. This keeps API parity with other section components.
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-user-cog"></i> Technician Assignment for Fault Tickets</h2>
                <p class="page-subtitle">Assign technicians and track fault ticket progress</p>
            </div>

            <div class="filter-controls" id="ticketStatusFilters">
                <button class="filter-btn active" type="button" data-ticket-status="all">All</button>
                <button class="filter-btn" type="button" data-ticket-status="unassigned">Unassigned</button>
                <button class="filter-btn" type="button" data-ticket-status="assigned">Assigned</button>
                <button class="filter-btn" type="button" data-ticket-status="in-progress">In Progress</button>
                <button class="filter-btn" type="button" data-ticket-status="completed">Completed</button>
            </div>

            <div class="filter-controls" id="ticketSourceFilters">
                <button class="filter-btn active" type="button" data-ticket-source="all">All Sources</button>
                <button class="filter-btn" type="button" data-ticket-source="driver">Driver</button>
                <button class="filter-btn" type="button" data-ticket-source="operator">Operator</button>
                <button class="filter-btn" type="button" data-ticket-source="system">System</button>
            </div>

            <button class="btn btn-primary" type="button" data-ticket-action="create" style="margin-bottom: 20px;">
                <i class="fas fa-plus"></i> Create New Ticket
            </button>

            <div class="card">
                <div class="card-header">
                    <i class="fas fa-ticket-alt"></i> Unassigned Tickets & Breakdown Reports
                </div>
                <div id="unassignedTicketsList">
                    <p style="text-align: center; color: var(--muted); padding: 20px;">No data loaded yet</p>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <i class="fas fa-tasks"></i> Assigned Tickets
                </div>
                <div id="activeTicketsList" class="inventory-list">
                    <p style="text-align: center; color: var(--muted); padding: 20px;">No data loaded yet</p>
                </div>
            </div>

            <div class="card">
                <div class="card-header" style="color: #10b981;">
                    <i class="fas fa-check-circle"></i> Resolved / Finished Tickets
                </div>
                <div id="resolvedTicketsList" class="inventory-list">
                    <p style="text-align: center; color: var(--muted); padding: 20px;">No data loaded yet</p>
                </div>
            </div>
        `;
    }
}

if (!customElements.get('supervisor-fault-tickets')) {
    customElements.define('supervisor-fault-tickets', SupervisorFaultTickets);
}
