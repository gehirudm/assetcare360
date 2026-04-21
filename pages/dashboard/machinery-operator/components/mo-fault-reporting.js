class MOFaultReporting extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.currentFilter = 'all';
        this.currentSort = 'created';
        this.allReports = [];
        this.render();
        this.bindEvents();
        this.refresh();
    }

    disconnectedCallback() {
        if (this._boundOutsideClick) {
            document.removeEventListener('click', this._boundOutsideClick);
        }
    }

    setCurrentUser(user) {
        this.currentUser = user || null;
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Fault Reporting</h1>
                <p class="page-subtitle">Submit machine fault tickets with details and photos</p>
            </div>

            <div class="mo-fault-actions">
                <button class="btn btn-primary" type="button" data-action="open-report-modal">
                    <i class="fas fa-plus"></i> Report New Fault
                </button>
            </div>

            <div class="filter-toolbar">
                <div class="filter-controls filter-toolbar__filters" id="faultReportFilterControls">
                    <button class="filter-btn active" type="button" data-action="set-filter" data-filter="all">All Reports</button>
                    <button class="filter-btn" type="button" data-action="set-filter" data-filter="open">Pending</button>
                    <button class="filter-btn" type="button" data-action="set-filter" data-filter="in-progress">In Progress</button>
                    <button class="filter-btn" type="button" data-action="set-filter" data-filter="resolved">Resolved</button>
                    <button class="filter-btn" type="button" data-action="set-filter" data-filter="closed">Closed</button>
                </div>
                <div class="filter-toolbar__sort">
                    <label class="filter-toolbar__label" for="faultReportSort">Sort by</label>
                    <select id="faultReportSort" class="filter-toolbar__select" data-action="set-sort">
                        <option value="created">Created Date</option>
                        <option value="priority">Priority</option>
                    </select>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-clipboard-list"></i> My Fault Reports</span>
                    <span class="status-text status-in-progress" data-fault-summary>Loading...</span>
                </div>
                <div id="faultReportsList" class="inventory-list"></div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (!actionEl) {
                return;
            }

            const action = actionEl.dataset.action;
            if (action === 'open-report-modal') {
                document.dispatchEvent(new CustomEvent('mo:open-report-fault-modal'));
                return;
            }

            if (action === 'set-filter') {
                this.applyFilter(actionEl.dataset.filter);
                return;
            }

            if (action === 'set-sort') {
                return;
            }

            if (action === 'view-breakdown') {
                const ticketId = Number.parseInt(actionEl.dataset.ticketId, 10);
                const breakdownId = Number.parseInt(actionEl.dataset.breakdownId, 10);

                if (Number.isFinite(ticketId) && ticketId > 0) {
                    document.dispatchEvent(new CustomEvent('mo:open-ticket-details', {
                        detail: {
                            ticketId,
                            returnSection: 'fault-reporting',
                        },
                    }));
                    return;
                }

                if (Number.isFinite(breakdownId) && breakdownId > 0) {
                    window.MOUtils.emitToast('Linked fault ticket not found yet. Showing breakdown details instead.', 'warning');
                    document.dispatchEvent(new CustomEvent('mo:open-machine-breakdown-details', {
                        detail: { breakdownId },
                    }));
                }
                return;
            }

            if (action === 'toggle-dropdown') {
                event.stopPropagation();
                this.toggleDropdown(actionEl.dataset.menuId);
                return;
            }

            if (action === 'edit-breakdown') {
                this.closeDropdownMenus();

                const isEditable = actionEl.dataset.editable === 'true';
                const ticketStatus = String(actionEl.dataset.ticketStatus || '').trim();
                const ticketId = Number.parseInt(actionEl.dataset.ticketId, 10);

                if (!isEditable) {
                    if (!Number.isFinite(ticketId) || ticketId <= 0) {
                        window.MOUtils.emitToast('Edit is unavailable because this report has no linked fault ticket yet.', 'warning');
                        return;
                    }

                    window.MOUtils.emitToast(`Edit is only available while the fault ticket is Open. Current status: ${ticketStatus || 'Unknown'}.`, 'warning');
                    return;
                }

                if (!Number.isFinite(ticketId) || ticketId <= 0) {
                    window.MOUtils.emitToast('This fault ticket cannot be edited right now.', 'warning');
                    return;
                }

                document.dispatchEvent(new CustomEvent('mo:open-edit-fault', {
                    detail: { ticketId },
                }));
                return;
            }

            if (action === 'delete-breakdown') {
                this.closeDropdownMenus();
                window.MOUtils.emitToast('Delete machine breakdown feature coming soon', 'info');
            }
        });

        this.addEventListener('change', (event) => {
            const actionEl = event.target.closest('[data-action="set-sort"]');
            if (!actionEl) {
                return;
            }

            this.currentSort = actionEl.value || 'created';
            this.renderReports();
        });

        this._boundOutsideClick = (event) => {
            if (!event.target.closest('.dropdown-container')) {
                this.closeDropdownMenus();
            }
        };

        document.addEventListener('click', this._boundOutsideClick);
    }

    async refresh() {
        const list = this.querySelector('#faultReportsList');
        if (!list || typeof API === 'undefined') {
            return;
        }

        list.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--stone-400);">Loading machine breakdown reports...</div>';

        try {
            const response = await API.get('/machine-breakdowns');
            const reports = response?.status === 'success' && response.data?.reports ? response.data.reports : [];

            this.allReports = Array.isArray(reports) ? reports : [];

            if (!this.allReports.length) {
                list.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--stone-400);">No fault reports found. Submit a new fault report to get started.</div>';
                this.updateSummary([]);
                return;
            }

            this.renderReports();
        } catch (error) {
            console.error('Error loading fault reports:', error);
            this.allReports = [];
            list.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--red-500);">Error loading fault reports. Please try again.</div>';
        }
    }

    renderReports() {
        const list = this.querySelector('#faultReportsList');
        if (!list) {
            return;
        }

        const sortedReports = this.getSortedReports(this.allReports);
        if (!sortedReports.length) {
            list.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--stone-400);">No fault reports found. Submit a new fault report to get started.</div>';
            this.updateSummary([]);
            return;
        }

        list.innerHTML = sortedReports.map((fault) => this.renderFaultCard(fault)).join('');
        this.applyFilter(this.currentFilter);
        this.updateSummary(this.allReports);
    }

    getSortedReports(reports) {
        const normalizedReports = Array.isArray(reports) ? [...reports] : [];

        if (this.currentSort === 'priority') {
            return normalizedReports.sort((first, second) => {
                const priorityDiff = this.getReportPriorityRank(second) - this.getReportPriorityRank(first);
                if (priorityDiff !== 0) {
                    return priorityDiff;
                }

                const timeDiff = this.getReportSortTime(second) - this.getReportSortTime(first);
                if (timeDiff !== 0) {
                    return timeDiff;
                }

                return this.getReportSortRank(second) - this.getReportSortRank(first);
            });
        }

        return normalizedReports.sort((first, second) => {
            const timeDiff = this.getReportSortTime(second) - this.getReportSortTime(first);
            if (timeDiff !== 0) {
                return timeDiff;
            }

            const priorityDiff = this.getReportPriorityRank(second) - this.getReportPriorityRank(first);
            if (priorityDiff !== 0) {
                return priorityDiff;
            }

            return this.getReportSortRank(second) - this.getReportSortRank(first);
        });
    }

    getReportSortTime(report) {
        const candidates = [
            report?.created_at,
            report?.updated_at,
            report?.breakdown_date,
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

    getReportSortRank(report) {
        const directId = Number.parseInt(report?.id, 10);
        if (Number.isFinite(directId) && directId > 0) {
            return directId;
        }

        const breakdownId = String(report?.breakdown_id || '');
        const numberPart = breakdownId.match(/(\d+)(?!.*\d)/);
        if (numberPart) {
            const parsed = Number.parseInt(numberPart[1], 10);
            if (Number.isFinite(parsed) && parsed > 0) {
                return parsed;
            }
        }

        return 0;
    }

    getReportPriorityRank(report) {
        const normalizedPriority = String(report?.priority || report?.severity || 'medium').trim().toLowerCase();

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

    renderFaultCard(fault) {
        const statusSource = this.getDisplayStatusSource(fault);
        const statusInfo = window.MOUtils.getStatusInfo(statusSource);
        const normalizedStatus = window.MOUtils.normalizeFilterStatus(statusSource);
        const normalizedTicketStatus = String(fault.ticket_status || fault.status || '').trim().toLowerCase();
        const ticketStatusLabel = String(fault.ticket_status || 'No Ticket').trim() || 'No Ticket';
        const safeTicketStatusLabel = ticketStatusLabel.replace(/"/g, '&quot;');
        const hasEditableTicket = Number.isFinite(Number(fault.fault_ticket_id)) && Number(fault.fault_ticket_id) > 0;
        const canEdit = hasEditableTicket && (normalizedTicketStatus === 'open' || normalizedTicketStatus === 'pending');
        const severity = fault.severity || 'Medium';
        const severityClass = severity.toLowerCase() === 'critical'
            ? 'status-danger'
            : severity.toLowerCase() === 'high'
                ? 'status-warning'
                : 'status-approved';

        const assignments = Array.isArray(fault.assignments) ? fault.assignments : [];
        const technicianInfo = assignments.length
            ? `<div style="margin-top: 5px; color: #2563eb; font-size: 12px; font-weight: 500;"><i class="fas fa-user-cog"></i> Assigned to: ${assignments.map((item) => item.technician_name).join(', ')}</div>`
            : '';

        const description = fault.description || 'No description available';

        return `
            <div class="inventory-item" data-status="${normalizedStatus}">
                <div class="item-details">
                    <strong><i class="fas fa-exclamation-triangle"></i> ${fault.breakdown_id || `MBD-${fault.id}`}</strong>
                    <div class="item-meta"><i class="fas fa-clock"></i> ${window.MOUtils.formatDate(fault.breakdown_date)}</div>
                    <div class="item-description">
                        <span class="status-text ${statusInfo.class}">${statusInfo.label}</span> |
                        <span class="status-text ${severityClass}">${String(severity).toUpperCase()}</span> |
                        <span style="color: #555; font-weight: 500;">${fault.breakdown_type || 'General Fault'}</span>
                        <br>
                        <span style="color: #6b7280;"><i class="fas fa-cogs"></i> ${fault.machine_model || fault.machine_name || `Machine #${fault.machine_id}`}</span>
                        <br>
                        ${description}
                        ${technicianInfo}
                    </div>
                </div>
                <div class="item-actions">
                    <div class="action-buttons">
                        <button class="btn btn-primary btn-small" type="button" data-action="view-breakdown" data-breakdown-id="${fault.id}" data-ticket-id="${fault.fault_ticket_id || ''}">
                            <i class="fas fa-eye"></i> VIEW
                        </button>
                        <div class="dropdown-container">
                            <button class="btn btn-small btn-secondary dropdown-trigger" type="button" data-action="toggle-dropdown" data-menu-id="fault-menu-${fault.id}">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div class="dropdown-menu" id="fault-menu-${fault.id}">
                                <button class="dropdown-item" type="button" data-action="edit-breakdown" data-ticket-id="${fault.fault_ticket_id || ''}" data-editable="${canEdit ? 'true' : 'false'}" data-ticket-status="${safeTicketStatusLabel}">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    applyFilter(filter) {
        this.currentFilter = filter || 'all';
        const list = this.querySelector('#faultReportsList');
        if (!list) {
            return;
        }

        list.querySelectorAll('.inventory-item').forEach((item) => {
            const status = item.dataset.status || 'open';
            item.style.display = this.currentFilter === 'all' || status === this.currentFilter ? 'flex' : 'none';
        });

        this.querySelectorAll('#faultReportFilterControls .filter-btn').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.filter === this.currentFilter);
        });
    }

    updateSummary(reports) {
        const summary = this.querySelector('[data-fault-summary]');
        if (!summary) {
            return;
        }

        const normalized = reports.map((item) => window.MOUtils.normalizeFilterStatus(this.getDisplayStatusSource(item)));
        const pendingCount = normalized.filter((status) => status === 'open').length;
        const inProgressCount = normalized.filter((status) => status === 'in-progress').length;
        summary.textContent = `${pendingCount} pending, ${inProgressCount} in progress`;
    }

    getDisplayStatusSource(report) {
        const ticketStatus = String(report?.ticket_status || '').trim();
        if (ticketStatus) {
            return ticketStatus;
        }

        return String(report?.status || '').trim();
    }

    toggleDropdown(menuId) {
        const menu = this.querySelector(`#${menuId}`);
        if (!menu) {
            return;
        }

        const isActive = menu.classList.contains('active');
        this.closeDropdownMenus();

        if (!isActive) {
            menu.classList.add('active');
            menu.style.display = 'block';
        }
    }

    closeDropdownMenus() {
        this.querySelectorAll('.dropdown-menu').forEach((menu) => {
            menu.classList.remove('active', 'show');
            menu.style.display = 'none';
        });
    }
}

customElements.define('mo-fault-reporting', MOFaultReporting);
