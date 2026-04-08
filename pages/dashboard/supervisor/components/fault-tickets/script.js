class SupervisorFaultTickets extends HTMLElement {
    constructor() {
        super();
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
        }
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

    refresh() {
        // Parent script controls data loading. This keeps API parity with other section components.
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-exclamation-triangle"></i> Fault Ticket Management</h2>
                <p class="page-subtitle">Assign and track fault tickets</p>
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
