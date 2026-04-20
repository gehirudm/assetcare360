class DriverTicketTracking extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.currentFilter = 'all';
        this.currentSort = 'created';
        this.currentUser = null;
        this.rawTicketItems = [];
        this.ticketItems = [];
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
                <h2 class="page-title"><i class="fas fa-ticket-alt"></i> Ticket Tracking</h2>
                <p class="page-subtitle">Track vehicle and route breakdown tickets with current repair progress</p>
            </div>

            <div class="filter-toolbar">
                <div class="filter-controls filter-toolbar__filters" id="driverTicketTrackingFilterControls">
                    <button class="filter-btn active" type="button" data-action="set-filter" data-filter="all">All Tickets</button>
                    <button class="filter-btn" type="button" data-action="set-filter" data-filter="open">Pending</button>
                    <button class="filter-btn" type="button" data-action="set-filter" data-filter="in-progress">In Progress</button>
                    <button class="filter-btn" type="button" data-action="set-filter" data-filter="resolved">Resolved</button>
                    <button class="filter-btn" type="button" data-action="set-filter" data-filter="closed">Closed</button>
                </div>
                <div class="filter-toolbar__sort">
                    <label class="filter-toolbar__label" for="driverTicketSort">Sort by</label>
                    <select id="driverTicketSort" class="filter-toolbar__select" data-action="set-sort">
                        <option value="created">Created Date</option>
                        <option value="priority">Priority</option>
                    </select>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-ticket-alt"></i> Breakdown Tickets</span>
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
                DriverUtils.closeOverflowMenus(this);
                return;
            }

            const action = actionEl.dataset.action;

            if (action === 'toggle-actions-menu') {
                event.stopPropagation();
                DriverUtils.toggleOverflowMenu(actionEl, this);
                return;
            }

            if (action === 'set-filter') {
                this.applyFilter(actionEl.dataset.filter);
                return;
            }

            if (action === 'set-sort') {
                return;
            }

            DriverUtils.closeOverflowMenus(this);

            const itemKey = String(actionEl.dataset.itemKey || '').trim();
            let breakdown = itemKey
                ? this.ticketItems.find((item) => item.itemKey === itemKey)
                : null;

            if (!breakdown && actionEl.dataset.breakdownId) {
                const breakdownId = Number.parseInt(actionEl.dataset.breakdownId, 10);
                if (Number.isFinite(breakdownId)) {
                    breakdown = this.ticketItems.find((item) => item.ticket_item_type === 'in-route' && Number(item.id) === breakdownId) || null;
                }
            }

            if (!breakdown) {
                DriverUtils.showToast('Unable to find selected breakdown ticket.', 'warning');
                return;
            }

            const isRouteBreakdown = breakdown.ticket_item_type === 'in-route';

            if (action === 'view-breakdown') {
                const payload = {
                    item: breakdown,
                    itemType: isRouteBreakdown ? 'in-route' : 'breakdown',
                };

                if (isRouteBreakdown) {
                    const breakdownId = Number.parseInt(breakdown.id, 10);
                    if (Number.isFinite(breakdownId)) {
                        payload.breakdownId = breakdownId;
                    }
                }

                DriverUtils.openModal('breakdownDetailsModal', payload);
                return;
            }

            if (!isRouteBreakdown) {
                DriverUtils.showToast('Garage workflow is available only for route breakdown tickets.', 'warning');
                return;
            }

            if (action === 'view-garages') {
                DriverUtils.openModal('nearbyGaragesModal', {
                    mode: 'browse',
                    breakdown,
                });
                return;
            }

            if (action === 'log-garage-entry') {
                DriverUtils.openModal('nearbyGaragesModal', {
                    mode: 'entry',
                    breakdown,
                });
                return;
            }

            if (action === 'add-garage-progress') {
                DriverUtils.openModal('garageProgressModal', {
                    breakdown,
                });
                return;
            }

            if (action === 'complete-garage-breakdown') {
                DriverUtils.openModal('completeBreakdownModal', {
                    breakdown,
                });
            }
        });

        this.addEventListener('change', (event) => {
            const actionEl = event.target.closest('[data-action="set-sort"]');
            if (!actionEl) {
                return;
            }

            this.currentSort = actionEl.value || 'created';
            this.renderTicketItems();
        });
    }

    async refresh() {
        const list = this.querySelector('#driverTicketTrackingList');
        if (!list) {
            return;
        }

        list.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--muted);">Loading breakdown tickets...</div>';

        try {
            this.currentUser = DriverUtils.store.currentUser || null;
            const [routeResult, vehicleResult] = await Promise.allSettled([
                DriverUtils.apiGet('/route-breakdowns'),
                DriverUtils.apiGet('/breakdown-reports'),
            ]);

            const routeBreakdowns = routeResult.status === 'fulfilled'
                ? DriverUtils.normalizeApiList(routeResult.value, 'breakdowns')
                : [];
            const vehicleBreakdowns = vehicleResult.status === 'fulfilled'
                ? DriverUtils.normalizeApiList(vehicleResult.value, 'reports')
                : [];

            const filteredRouteBreakdowns = routeBreakdowns.filter((item) => {
                if (!this.currentUser) {
                    return true;
                }

                return Number(item.driver_id) === Number(this.currentUser.id)
                    || item.driver_name === this.currentUser.full_name;
            });

            const filteredVehicleBreakdowns = vehicleBreakdowns.filter((item) => {
                if (!this.currentUser) {
                    return true;
                }

                return Number(item.driver_id) === Number(this.currentUser.id)
                    || item.driver_name === this.currentUser.full_name;
            });

            const routeTicketItems = filteredRouteBreakdowns.map((item) => ({
                ...item,
                ticket_item_type: 'in-route',
                itemKey: `in-route-${item.id}`,
            }));

            const vehicleTicketItems = filteredVehicleBreakdowns.map((item) => ({
                ...item,
                ticket_item_type: 'vehicle',
                itemKey: `vehicle-${item.id}`,
            }));

            this.rawTicketItems = [...routeTicketItems, ...vehicleTicketItems];

            DriverUtils.store.breakdowns.routeBreakdowns = filteredRouteBreakdowns;
            DriverUtils.store.breakdowns.reports = filteredVehicleBreakdowns;

            if (!this.rawTicketItems.length) {
                this.ticketItems = [];
                list.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--muted);">No breakdown tickets found.</div>';
                this.updateSummary([]);
                return;
            }

            this.renderTicketItems();
        } catch (error) {
            console.error('Error loading route breakdown ticket tracking:', error);
            this.rawTicketItems = [];
            this.ticketItems = [];
            list.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--danger);">Error loading ticket tracking data. Please try again.</div>';
        }
    }

    renderTicketItems() {
        const list = this.querySelector('#driverTicketTrackingList');
        if (!list) {
            return;
        }

        const sortedItems = this.sortTicketItems(this.rawTicketItems);
        this.ticketItems = sortedItems;

        if (!sortedItems.length) {
            list.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--muted);">No breakdown tickets found.</div>';
            this.updateSummary([]);
            return;
        }

        list.innerHTML = sortedItems.map((breakdown) => this.renderTicketCard(breakdown)).join('');
        this.applyFilter(this.currentFilter);
        this.updateSummary(sortedItems);
    }

    sortTicketItems(items) {
        const normalizedItems = Array.isArray(items) ? [...items] : [];

        if (this.currentSort === 'priority') {
            return normalizedItems.sort((first, second) => {
                const priorityDiff = this.getTicketPriorityRank(second) - this.getTicketPriorityRank(first);
                if (priorityDiff !== 0) {
                    return priorityDiff;
                }

                const timeDiff = this.getTicketSortTime(second) - this.getTicketSortTime(first);
                if (timeDiff !== 0) {
                    return timeDiff;
                }

                return this.getTicketSortRank(second) - this.getTicketSortRank(first);
            });
        }

        return normalizedItems.sort((first, second) => {
            const timeDiff = this.getTicketSortTime(second) - this.getTicketSortTime(first);
            if (timeDiff !== 0) {
                return timeDiff;
            }

            const priorityDiff = this.getTicketPriorityRank(second) - this.getTicketPriorityRank(first);
            if (priorityDiff !== 0) {
                return priorityDiff;
            }

            return this.getTicketSortRank(second) - this.getTicketSortRank(first);
        });
    }

    getTicketSortTime(item) {
        const candidates = [
            item?.created_at,
            item?.updated_at,
            item?.breakdown_datetime,
            item?.breakdown_date,
        ];

        for (const value of candidates) {
            if (!value) {
                continue;
            }

            const timestamp = new Date(value).getTime();
            if (Number.isFinite(timestamp) && timestamp > 0) {
                return timestamp;
            }
        }

        return 0;
    }

    getTicketSortRank(item) {
        const directId = Number.parseInt(item?.id, 10);
        if (Number.isFinite(directId) && directId > 0) {
            return directId;
        }

        const candidates = [
            item?.fault_ticket_id,
            item?.route_breakdown_id,
            item?.breakdown_id,
        ];

        for (const value of candidates) {
            const text = String(value || '');
            const numberPart = text.match(/(\d+)(?!.*\d)/);
            if (!numberPart) {
                continue;
            }

            const parsed = Number.parseInt(numberPart[1], 10);
            if (Number.isFinite(parsed) && parsed > 0) {
                return parsed;
            }
        }

        return 0;
    }

    getTicketPriorityRank(item) {
        const normalizedPriority = String(item?.priority || item?.severity || 'medium').trim().toLowerCase();

        if (normalizedPriority === 'critical') {
            return 4;
        }

        if (normalizedPriority === 'high') {
            return 3;
        }

        if (normalizedPriority === 'low') {
            return 1;
        }

        return 2;
    }

    renderTicketCard(breakdown) {
        const actualStatus = breakdown.ticket_status || breakdown.status;
        const statusInfo = DriverUtils.getTicketStatusInfo(actualStatus);
        const normalized = DriverUtils.normalizeTicketFilterStatus(actualStatus);
        const updateText = DriverUtils.getTicketUpdateText(actualStatus);

        const severityText = String(breakdown.severity || 'MEDIUM').toUpperCase();
        const severityClass = String(breakdown.severity || 'medium').toLowerCase();
        const breakdownDate = DriverUtils.formatDateTime(breakdown.breakdown_datetime || breakdown.breakdown_date || breakdown.created_at);

        const isRouteBreakdown = breakdown.ticket_item_type === 'in-route';
        const breakdownIdentifier = breakdown.route_breakdown_id || breakdown.breakdown_id || (isRouteBreakdown ? `RBD-${breakdown.id}` : `VBD-${breakdown.id}`);
        const typeLabel = isRouteBreakdown ? 'Breakdown in Route' : 'Vehicle Breakdown';

        const workflowStatus = isRouteBreakdown ? this.getGarageWorkflowStatus(breakdown) : null;
        const workflowLabel = this.getGarageWorkflowLabel(workflowStatus);
        const workflowClass = this.getGarageWorkflowClass(workflowStatus);
        const approvedGarageName = breakdown?.garage_workflow?.approved_garage?.name || breakdown.approved_garage_name || null;
        const itemKeyAttr = `data-item-key="${breakdown.itemKey}"`;

        return `
            <div class="inventory-item" data-status="${normalized}">
                <div class="item-details">
                    <strong><i class="fas fa-exclamation-triangle"></i> ${breakdownIdentifier}</strong>
                    <div class="item-meta">
                        <i class="fas fa-truck"></i> ${breakdown.number_plate || `Vehicle #${breakdown.vehicle_id || 'N/A'}`} |
                        <i class="fas fa-tools"></i> ${breakdown.breakdown_type || 'General Fault'} |
                        <i class="fas fa-tag"></i> ${typeLabel}
                    </div>
                    <div class="item-description">${breakdown.description || 'No description provided'}</div>
                    <div class="item-meta" style="margin-top: 8px;">
                        <span class="status-text ${statusInfo.class}">${statusInfo.label}</span> |
                        <span class="status-text status-${severityClass}">${severityText}</span> |
                        <i class="fas fa-calendar"></i> ${breakdownDate}
                    </div>
                    ${breakdown.fault_ticket_number ? `<div class="item-meta" style="margin-top: 4px; color: #6b7280;"><i class="fas fa-ticket-alt"></i> Ticket: ${breakdown.fault_ticket_number}</div>` : ''}
                    ${((!isRouteBreakdown) || !['garage_approved', 'garage_entry_logged', 'repair_in_progress', 'completed'].includes(workflowStatus))
                        && Array.isArray(breakdown.assigned_technicians)
                        && breakdown.assigned_technicians.length
                        ? `<div class="item-meta" style="margin-top: 4px;"><i class="fas fa-user-cog" style="color: #2563eb;"></i> <span style="color: #2563eb; font-weight: 600;">Assigned to: ${breakdown.assigned_technicians.map((item) => item.technician_name).join(', ')}</span></div>`
                        : ''}
                    ${isRouteBreakdown ? `
                        <div class="item-meta" style="margin-top: 4px;">
                            <i class="fas fa-warehouse" style="color: #0f766e;"></i>
                            <span class="status-text ${workflowClass}">${workflowLabel}</span>
                            ${approvedGarageName ? `| <span style="font-weight: 600; color: #0f766e;">${approvedGarageName}</span>` : ''}
                        </div>
                    ` : ''}
                    ${actualStatus !== 'Pending' && actualStatus !== 'Open'
                        ? `<div class="item-meta" style="margin-top: 4px; color: #059669; font-weight: 500;">${updateText}</div>`
                        : ''}
                </div>
                <div class="item-actions">
                    <div class="action-buttons">
                        ${this.renderActionButtons(breakdown, workflowStatus, itemKeyAttr, isRouteBreakdown)}
                    </div>
                </div>
            </div>
        `;
    }

    renderActionButtons(breakdown, workflowStatus, itemKeyAttr, isRouteBreakdown) {
        const idAttr = `data-breakdown-id="${breakdown.id}"`;
        const routeActionAttr = `${itemKeyAttr} ${idAttr}`;
        const menuItems = [];

        if (workflowStatus === 'garage_entry_logged' || workflowStatus === 'repair_in_progress') {
            menuItems.push(`<button class="dropdown-item" type="button" data-action="add-garage-progress" ${routeActionAttr}><i class="fas fa-camera"></i> Add Progress</button>`);
            menuItems.push(`<button class="dropdown-item" type="button" data-action="complete-garage-breakdown" ${routeActionAttr}><i class="fas fa-check-circle"></i> Complete Repair</button>`);
        }

        const overflowMenu = menuItems.length ? `
            <div class="dropdown-container">
                <button class="btn btn-small btn-secondary dropdown-trigger" type="button" data-action="toggle-actions-menu" aria-label="More actions">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
                <div class="dropdown-menu">
                    ${menuItems.join('')}
                </div>
            </div>
        ` : '';

        return `
            <button class="btn btn-primary btn-small" type="button" data-action="view-breakdown" ${itemKeyAttr}><i class="fas fa-eye"></i> VIEW</button>
            ${overflowMenu}
        `;
    }

    getGarageWorkflowStatus(breakdown) {
        const ticketStatus = String(breakdown?.ticket_status || '').trim().toLowerCase();
        if (ticketStatus === 'insurance claimed') {
            return 'insurance_claimed';
        }

        const status = breakdown?.garage_workflow?.status || breakdown?.garage_workflow_status || null;
        if (status) {
            return status;
        }

        if (breakdown?.completed_at) {
            return 'completed';
        }

        return 'awaiting_supervisor_approval';
    }

    getGarageWorkflowLabel(status) {
        if (!status) {
            return '';
        }

        const labels = {
            awaiting_supervisor_approval: 'Awaiting Supervisor Approval',
            insurance_claimed: 'Insurance Claimed',
            garage_approved: 'Garage Approved',
            garage_entry_logged: 'Garage Entry Logged',
            repair_in_progress: 'Repair In Progress',
            completed: 'Completed',
        };

        return labels[status] || String(status).replace(/_/g, ' ');
    }

    getGarageWorkflowClass(status) {
        if (!status) {
            return '';
        }

        if (status === 'completed') {
            return 'status-resolved';
        }

        if (status === 'insurance_claimed') {
            return 'status-in-progress';
        }

        if (status === 'garage_approved' || status === 'garage_entry_logged' || status === 'repair_in_progress') {
            return 'status-in-progress';
        }

        return 'status-pending';
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
