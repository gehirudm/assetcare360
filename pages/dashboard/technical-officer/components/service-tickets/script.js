class TOServiceTickets extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.currentFilter = 'all';
        this.currentSearch = '';
        this.currentSort = 'created';
        this.loading = false;
        this.tickets = [];

        this.render();
        this.bindEvents();
        this.refresh();
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Service Tickets</h1>
                <p class="page-subtitle">Track machine and vehicle service work assigned to you or waiting assignment</p>
            </div>

            <div class="filter-toolbar to-service-ticket-toolbar">
                <div class="filter-toolbar__group to-service-ticket-toolbar__group">
                    <label class="filter-toolbar__label">Status</label>
                    <div class="filter-controls filter-toolbar__filters" id="toServiceTicketFilters">
                        <button class="filter-btn active" type="button" data-action="set-filter" data-filter="all">All</button>
                        <button class="filter-btn" type="button" data-action="set-filter" data-filter="assigned">Assigned</button>
                        <button class="filter-btn" type="button" data-action="set-filter" data-filter="in-progress">In Progress</button>
                        <button class="filter-btn" type="button" data-action="set-filter" data-filter="completed">Completed</button>
                    </div>
                </div>

                <div class="filter-toolbar__group to-service-ticket-toolbar__group to-service-ticket-toolbar__group--search">
                    <label class="filter-toolbar__label" for="toServiceTicketSearch">Search</label>
                    <input id="toServiceTicketSearch" class="form-input to-service-ticket-toolbar__search-input" data-action="search" placeholder="Search by ticket ID, asset, or service type">
                </div>

                <div class="filter-toolbar__sort to-service-ticket-toolbar__sort">
                    <label class="filter-toolbar__label" for="toServiceTicketSort">Sort by</label>
                    <select id="toServiceTicketSort" class="filter-toolbar__select" data-action="set-sort">
                        <option value="created">Created Date</option>
                        <option value="priority">Priority</option>
                    </select>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-tools"></i> Service Ticket Queue</span>
                    <span class="status-badge status-assigned" id="toServiceTicketCount">Loading...</span>
                </div>
                <div id="toServiceTicketList" class="inventory-list">
                    <div style="text-align:center;padding:20px;color:var(--muted);">Loading service tickets...</div>
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
            this.renderTicketRows();
        });

        this.addEventListener('change', (event) => {
            const sortSelect = event.target.closest('[data-action="set-sort"]');
            if (sortSelect) {
                this.currentSort = String(sortSelect.value || 'created').trim() || 'created';
                this.renderTicketRows();
            }
        });

        this.addEventListener('click', (event) => {
            const actionNode = event.target.closest('[data-action]');
            if (!actionNode) {
                return;
            }

            const action = actionNode.dataset.action;
            if (action === 'set-filter') {
                this.currentFilter = String(actionNode.dataset.filter || 'all');
                this.setActiveFilterButton(actionNode);
                this.renderTicketRows();
                return;
            }

            if (action === 'view-ticket') {
                const ticketId = Number(actionNode.dataset.ticketId || 0);
                if (ticketId > 0) {
                    this.openTicketDetails(ticketId);
                }
            }
        });
    }

    setActiveFilterButton(activeButton) {
        this.querySelectorAll('#toServiceTicketFilters .filter-btn').forEach((button) => {
            button.classList.toggle('active', button === activeButton);
        });
    }

    async refresh() {
        this.loading = true;
        this.updateHeaderSummary();
        this.renderTicketRows();

        let errorMessage = '';

        try {
            const response = await API.get('/service-tickets');
            if (!response || response.status !== 'success') {
                throw new Error(response?.message || 'Failed to load service tickets');
            }

            const payload = response.data || {};
            this.tickets = Array.isArray(payload.tickets) ? payload.tickets : [];
        } catch (error) {
            console.error('Failed to load service tickets:', error);
            this.tickets = [];
            errorMessage = 'Failed to load service tickets.';
            this.emitToast('Failed to load service tickets.', 'error');
        }

        this.loading = false;
        this.renderTicketRows(errorMessage);
        this.updateHeaderSummary();
    }

    normalizeFilterStatus(status) {
        const normalized = String(status || '').toLowerCase();
        if (normalized.includes('assigned')) {
            return 'assigned';
        }
        if (normalized.includes('progress')) {
            return 'in-progress';
        }
        if (normalized.includes('completed')) {
            return 'completed';
        }
        if (normalized.includes('cancelled')) {
            return 'cancelled';
        }
        return 'pending';
    }

    getStatusMeta(status) {
        const normalized = this.normalizeFilterStatus(status);
        if (normalized === 'assigned') {
            return { text: 'Assigned', className: 'status-assigned' };
        }
        if (normalized === 'in-progress') {
            return { text: 'In Progress', className: 'status-in-progress' };
        }
        if (normalized === 'completed') {
            return { text: 'Completed', className: 'status-completed' };
        }
        if (normalized === 'cancelled') {
            return { text: 'Cancelled', className: 'status-closed' };
        }
        return { text: 'Pending', className: 'status-pending' };
    }

    formatDate(dateString) {
        if (!dateString) {
            return 'N/A';
        }

        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) {
            return 'N/A';
        }

        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    }

    getSortTimestamp(ticket) {
        const dateFields = ['created_at', 'updated_at', 'scheduled_date', 'started_at'];

        for (const field of dateFields) {
            const value = ticket?.[field];
            if (!value) {
                continue;
            }

            const timestamp = new Date(value).getTime();
            if (Number.isFinite(timestamp)) {
                return timestamp;
            }
        }

        const numericId = Number(ticket?.id || 0);
        return Number.isFinite(numericId) ? numericId : 0;
    }

    getPriorityRank(ticket) {
        const normalizedPriority = String(ticket?.priority || 'medium').trim().toLowerCase();

        if (normalizedPriority === 'critical') {
            return 4;
        }
        if (normalizedPriority === 'high') {
            return 3;
        }
        if (normalizedPriority === 'medium') {
            return 2;
        }
        if (normalizedPriority === 'low') {
            return 1;
        }

        return 0;
    }

    getPriorityClass(priority) {
        const normalizedPriority = String(priority || 'medium').trim().toLowerCase();
        if (normalizedPriority === 'critical') {
            return 'status-critical';
        }
        if (normalizedPriority === 'high') {
            return 'status-high';
        }
        if (normalizedPriority === 'low') {
            return 'status-low';
        }
        return 'status-medium';
    }

    renderTicketRows(errorMessage = '') {
        const list = this.querySelector('#toServiceTicketList');
        if (!list) {
            return;
        }

        if (errorMessage) {
            list.innerHTML = `<div style="text-align:center;padding:20px;color:var(--danger);">${this.escapeHtml(errorMessage)}</div>`;
            this.updateHeaderSummary(0);
            return;
        }

        if (this.loading) {
            list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);">Loading service tickets...</div>';
            return;
        }

        const sorted = [...this.tickets].sort((first, second) => {
            if (this.currentSort === 'priority') {
                const priorityDiff = this.getPriorityRank(second) - this.getPriorityRank(first);
                if (priorityDiff !== 0) {
                    return priorityDiff;
                }
            }

            const dateDiff = this.getSortTimestamp(second) - this.getSortTimestamp(first);
            if (dateDiff !== 0) {
                return dateDiff;
            }

            if (this.currentSort !== 'priority') {
                const priorityDiff = this.getPriorityRank(second) - this.getPriorityRank(first);
                if (priorityDiff !== 0) {
                    return priorityDiff;
                }
            }

            return Number(second.id || 0) - Number(first.id || 0);
        });

        const filtered = sorted.filter((ticket) => {
            const filterStatus = this.normalizeFilterStatus(ticket.status);
            const matchesFilter = this.currentFilter === 'all' || filterStatus === this.currentFilter;

            const searchText = [
                ticket.service_ticket_id,
                ticket.title,
                ticket.description,
                ticket.asset_name,
                ticket.asset_code,
                ticket.service_type,
            ].join(' ').toLowerCase();
            const matchesSearch = !this.currentSearch || searchText.includes(this.currentSearch);

            return matchesFilter && matchesSearch;
        });

        if (filtered.length === 0) {
            list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);">No service tickets found in your queue.</div>';
            this.updateHeaderSummary(0);
            return;
        }

        list.innerHTML = filtered.map((ticket) => {
            const status = this.getStatusMeta(ticket.status);
            const ticketId = Number(ticket.id || 0);

            const ticketLabel = this.escapeHtml(ticket.service_ticket_id || `#${ticketId}`);
            const title = this.escapeHtml(ticket.title || 'Untitled service ticket');
            const assetName = this.escapeHtml(ticket.asset_name || 'Unknown asset');
            const assetCode = this.escapeHtml(ticket.asset_code || '-');
            const serviceType = this.escapeHtml(ticket.service_type || '-');
            const scheduledDate = this.escapeHtml(this.formatDate(ticket.scheduled_date));
            const createdDate = this.escapeHtml(this.formatDate(ticket.created_at));
            const startedDate = this.escapeHtml(this.formatDate(ticket.started_at));
            const priorityLabel = this.escapeHtml(String(ticket.priority || 'Medium'));
            const priorityClass = this.getPriorityClass(ticket.priority);
            const warrantyStatus = this.escapeHtml(ticket.asset_warranty_status || 'Unknown');
            const description = this.escapeHtml(ticket.description || '');
            const completionNotes = this.escapeHtml(ticket.completion_notes || '');

            return `
                <div class="inventory-item" data-ticket-id="${ticketId}">
                    <div class="item-details">
                        <strong><i class="fas fa-tools"></i> ${ticketLabel} - ${title}</strong>
                        <div class="item-meta">
                            <i class="fas fa-cubes"></i> ${assetName} (${assetCode}) &nbsp;|&nbsp;
                            <i class="fas fa-tag"></i> ${serviceType}
                        </div>
                        <div class="item-description">${description}</div>
                        <div class="item-meta">
                            <span class="status-badge ${status.className}">${status.text}</span>
                            &nbsp;|&nbsp;
                            <span class="status-badge ${priorityClass}">Priority: ${priorityLabel}</span>
                            &nbsp;|&nbsp;
                            <span class="status-badge status-scheduled">Warranty: ${warrantyStatus}</span>
                            &nbsp;|&nbsp;
                            <i class="fas fa-calendar-check"></i> Scheduled: ${scheduledDate}
                        </div>
                        <div class="item-meta">
                            <i class="fas fa-clock"></i> Created: ${createdDate}
                            &nbsp;|&nbsp;
                            <i class="fas fa-play-circle"></i> Started: ${startedDate}
                        </div>
                        ${completionNotes ? `<div class="item-meta"><i class="fas fa-check-circle"></i> Completion: ${completionNotes}</div>` : ''}
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-secondary btn-small" type="button" data-action="view-ticket" data-ticket-id="${ticketId}">
                            <i class="fas fa-eye"></i> View Service
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        this.updateHeaderSummary(filtered.length);
    }

    updateHeaderSummary(visibleCount = null) {
        const summary = this.querySelector('#toServiceTicketCount');
        if (!summary) {
            return;
        }

        if (this.loading) {
            summary.textContent = 'Loading...';
            return;
        }

        const total = this.tickets.length;
        if (visibleCount === null) {
            summary.textContent = `${total} tickets`;
            return;
        }

        summary.textContent = `${visibleCount} of ${total} tickets`;
    }

    openTicketDetails(ticketId) {
        this.dispatchEvent(new CustomEvent('technical-officer-service-tickets:view-ticket', {
            bubbles: true,
            detail: {
                ticketId: Number(ticketId),
            },
        }));
    }

    emitToast(message, type = 'info') {
        this.dispatchEvent(new CustomEvent('to-ui:toast', {
            bubbles: true,
            detail: { message, type },
        }));
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

customElements.define('to-service-tickets', TOServiceTickets);
