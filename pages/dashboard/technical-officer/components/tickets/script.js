class TOTickets extends HTMLElement {
    constructor() {
        super();
        this._tickets = [];
        this._activeFilter = 'all';
        this._onRootClick = this._onRootClick.bind(this);
    }

    connectedCallback() {
        if (this._initialized) return;

        this.render();
        this.addEventListener('click', this._onRootClick);
        this._initialized = true;
    }

    disconnectedCallback() {
        this.removeEventListener('click', this._onRootClick);
    }

    _onRootClick(event) {
        const filterButton = event.target.closest('button[data-ticket-filter]');
        if (filterButton) {
            const status = filterButton.dataset.ticketFilter || 'all';
            this.applyFilter(status, filterButton);
            this.dispatchEvent(new CustomEvent('technical-officer-tickets:filter', {
                bubbles: true,
                detail: {
                    status,
                    button: filterButton
                }
            }));
            return;
        }

        const actionButton = event.target.closest('button[data-ticket-action]');
        if (actionButton) {
            event.stopPropagation();

            const ticketId = Number(actionButton.dataset.ticketId);
            const action = actionButton.dataset.ticketAction;

            if (!ticketId || !action) return;

            this.dispatchEvent(new CustomEvent(`technical-officer-tickets:${action}`, {
                bubbles: true,
                detail: {
                    ticketId
                }
            }));
            return;
        }

        const ticketItem = event.target.closest('.ticket-item[data-ticket-id]');
        if (!ticketItem) return;

        const ticketId = Number(ticketItem.dataset.ticketId);
        if (!ticketId) return;

        this.dispatchEvent(new CustomEvent('technical-officer-tickets:view-ticket', {
            bubbles: true,
            detail: {
                ticketId
            }
        }));
    }

    setLoading(message = 'Loading tickets...') {
        const ticketsList = this.querySelector('#allTicketsList');
        const ticketCount = this.querySelector('#ticketCount');
        const noTicketsMessage = this.querySelector('#noTicketsMessage');

        if (ticketsList) {
            ticketsList.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--muted);"><i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i><p style="margin-top: 15px;">${message}</p></div>`;
        }

        if (ticketCount) {
            ticketCount.textContent = 'Loading...';
        }

        if (noTicketsMessage) {
            noTicketsMessage.style.display = 'none';
        }
    }

    setError(message = 'Error loading tickets. Please try again.') {
        const ticketsList = this.querySelector('#allTicketsList');
        const ticketCount = this.querySelector('#ticketCount');
        const noTicketsMessage = this.querySelector('#noTicketsMessage');

        if (ticketsList) {
            ticketsList.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--danger);"><i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 15px;"></i><p>${message}</p></div>`;
        }

        if (ticketCount) {
            ticketCount.textContent = '0 tickets';
        }

        if (noTicketsMessage) {
            noTicketsMessage.style.display = 'none';
        }
    }

    setEmpty(message = 'No tickets assigned to you yet') {
        const ticketsList = this.querySelector('#allTicketsList');
        const ticketCount = this.querySelector('#ticketCount');
        const noTicketsMessage = this.querySelector('#noTicketsMessage');

        this._tickets = [];

        if (ticketsList) {
            ticketsList.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--muted);"><i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 15px;"></i><p>${message}</p></div>`;
        }

        if (ticketCount) {
            ticketCount.textContent = '0 tickets';
        }

        if (noTicketsMessage) {
            noTicketsMessage.style.display = 'none';
        }
    }

    renderTickets(tickets) {
        this._tickets = Array.isArray(tickets) ? tickets : [];

        const ticketsList = this.querySelector('#allTicketsList');
        if (!ticketsList) return;

        if (this._tickets.length === 0) {
            this.setEmpty('No tickets found');
            return;
        }

        ticketsList.innerHTML = this._tickets.map(ticket => {
            const ticketIdFormatted = this._getDisplayTicketId(ticket);

            // Map Open/Assigned to Pending for display.
            let ticketStatus = ticket.status || 'Pending';
            if (ticketStatus.toLowerCase() === 'open' || ticketStatus.toLowerCase() === 'assigned') {
                ticketStatus = 'Pending';
            }

            const status = ticketStatus.toLowerCase().replace(/\s+/g, '-');
            const statusDisplay = ticketStatus.toUpperCase();
            const priority = (ticket.priority || 'Medium').toLowerCase();
            const priorityDisplay = (ticket.priority || 'Medium').toUpperCase();
            const assetName = ticket.machine_model_number || ticket.machine_name || `Machine #${ticket.machine_id}`;
            const reporterName = ticket.reported_by_name || ticket.reporter_full_name || 'Unknown';
            const description = ticket.description || 'No description';

            // Get assignment details.
            const assignment = ticket.assignments && ticket.assignments.length > 0 ? ticket.assignments[0] : null;
            const assignedBy = assignment ? (assignment.assigned_by_name || 'Supervisor') : 'Unknown';

            return `
                <div class="ticket-item" data-ticket-id="${ticket.id}" data-status="${status}" style="cursor:pointer;">
                    <div class="ticket-details">
                        <strong>${ticketIdFormatted}</strong>
                        <div class="ticket-meta">
                            Equipment: ${assetName} | Reporter: ${reporterName}
                        </div>
                        <div class="ticket-issue">${description}</div>
                        <div class="ticket-meta">
                            Assigned by: ${assignedBy} |
                            <span class="status-text status-${priority}">${priorityDisplay}</span> |
                            <span class="status-text status-${status}">${statusDisplay}</span>
                        </div>
                    </div>
                    <div class="ticket-actions">
                        <div class="action-buttons">
                            ${this._renderActionButton(status, ticket.id)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.applyFilter(this._activeFilter);
    }

    applyFilter(status = 'all', clickedButton = null) {
        const tickets = this.querySelectorAll('#allTicketsList .ticket-item');
        const noTicketsMessage = this.querySelector('#noTicketsMessage');
        const ticketCount = this.querySelector('#ticketCount');
        const filterButtons = this.querySelectorAll('#ticketFilterTabs .filter-btn');
        let visibleCount = 0;

        this._activeFilter = status;

        filterButtons.forEach(btn => {
            btn.classList.remove('active');
        });

        const targetButton = clickedButton || this.querySelector(`#ticketFilterTabs .filter-btn[data-ticket-filter="${status}"]`) || filterButtons[0];
        if (targetButton) {
            targetButton.classList.add('active');
        }

        tickets.forEach(ticket => {
            const ticketStatus = ticket.getAttribute('data-status');
            if (status === 'all' || ticketStatus === status) {
                ticket.style.display = '';
                visibleCount++;
            } else {
                ticket.style.display = 'none';
            }
        });

        if (noTicketsMessage) {
            noTicketsMessage.style.display = visibleCount === 0 && tickets.length > 0 ? 'block' : 'none';
        }

        if (ticketCount) {
            ticketCount.textContent = `${visibleCount} ticket${visibleCount !== 1 ? 's' : ''}`;
        }
    }

    _getDisplayTicketId(ticket) {
        if (ticket.breakdown_report_id) {
            return ticket.breakdown_report_id;
        }

        return ticket.ticket_id || 'N/A';
    }

    _renderActionButton(status, ticketId) {
        if (status === 'pending') {
            return `
                <button type="button" class="btn btn-mini" data-ticket-action="request-spare-parts" data-ticket-id="${ticketId}" style="background: var(--tang-blue); color: white;">
                    <i class="fas fa-tools"></i> Request Spare Parts
                </button>
                <button type="button" class="btn btn-mini" data-ticket-action="add-budget" data-ticket-id="${ticketId}" style="background: var(--kelly-green); color: white;">
                    <i class="fas fa-file-invoice-dollar"></i> Add Budget
                </button>
            `;
        }

        if (status === 'waiting-for-spare-parts') {
            return `
                <span class="btn btn-mini" style="background: #f59e0b; color: #000; cursor: default;">
                    <i class="fas fa-hourglass-half"></i> Awaiting Approval
                </span>
            `;
        }

        if (status === 'parts-approved') {
            return `
                <button type="button" class="btn btn-mini" data-ticket-action="start-work" data-ticket-id="${ticketId}" style="background: var(--kelly-green); color: white;">
                    <i class="fas fa-play"></i> START
                </button>
            `;
        }

        if (status === 'in-progress') {
            return `
                <button type="button" class="btn btn-warning btn-mini" data-ticket-action="update-work" data-ticket-id="${ticketId}">
                    <i class="fas fa-edit"></i> UPDATE
                </button>
            `;
        }

        if (status === 'parts-rejected') {
            return `
                <button type="button" class="btn btn-mini" data-ticket-action="request-spare-parts" data-ticket-id="${ticketId}" style="background: var(--tang-blue); color: white;">
                    <i class="fas fa-redo"></i> Re-request Parts
                </button>
            `;
        }

        if (status === 'resolved' || status === 'completed' || status === 'closed') {
            return `
                <span class="btn btn-mini" style="background: #10b981; color: white; cursor: default;">
                    <i class="fas fa-check-circle"></i> Done
                </span>
            `;
        }

        return '';
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Fault & Repair Tickets</h1>
                <p class="page-subtitle">Manage tickets assigned by supervisors</p>
            </div>

            <create-fault-ticket></create-fault-ticket>

            <div class="filter-controls" id="ticketFilterTabs">
                <button type="button" class="filter-btn active" data-ticket-filter="all">All Tickets</button>
                <button type="button" class="filter-btn" data-ticket-filter="pending">Pending</button>
                <button type="button" class="filter-btn" data-ticket-filter="waiting-for-spare-parts">Waiting for Parts</button>
                <button type="button" class="filter-btn" data-ticket-filter="parts-approved">Parts Approved</button>
                <button type="button" class="filter-btn" data-ticket-filter="parts-rejected">Parts Rejected</button>
                <button type="button" class="filter-btn" data-ticket-filter="in-progress">In Progress</button>
                <button type="button" class="filter-btn" data-ticket-filter="completed">Completed</button>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-ticket-alt"></i> Tickets</span>
                    <span id="ticketCount" class="status-badge status-normal">Loading...</span>
                </div>
                <div id="allTicketsList" class="inventory-list">
                    <!-- Tickets will be loaded dynamically -->
                </div>
                <div id="noTicketsMessage" style="display: none; text-align: center; color: var(--muted); padding: 20px;">
                    No tickets found for this filter
                </div>
            </div>
        `;
    }
}

if (!customElements.get('to-tickets')) {
    customElements.define('to-tickets', TOTickets);
}
