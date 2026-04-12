class DriverTransportTicket extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.tickets = this.getTickets();
        this.render();
        this.bindEvents();
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-ticket-alt"></i> Transport Ticket</h2>
                <p class="page-subtitle">Create and manage cargo transport documentation</p>
            </div>

            <div style="margin-bottom: 20px;">
                <button class="btn btn-primary" type="button" data-action="open-transport-ticket-modal">Create Transport Ticket</button>
            </div>

            <div class="card">
                <div class="card-header"><i class="fas fa-ticket-alt"></i> My Transport Tickets</div>
                ${this.tickets.map((ticket) => this.renderTicket(ticket)).join('')}
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
            if (action === 'open-transport-ticket-modal') {
                DriverUtils.openModal('transportTicketModal');
                return;
            }

            const ticketId = actionEl.dataset.ticketId;
            const ticket = this.tickets.find((item) => item.id === ticketId);

            if (action === 'view-ticket' && ticket) {
                DriverUtils.openModal('ticketDetailsModal', { ticket });
                return;
            }

            if (action === 'print-ticket' && ticketId) {
                DriverUtils.showToast(`Preparing ticket ${ticketId} for printing.`);
                return;
            }

            if (action === 'export-ticket' && ticketId) {
                DriverUtils.showToast(`Exporting ticket ${ticketId}.`);
                return;
            }

            if (action === 'update-ticket-status' && ticketId) {
                DriverUtils.showToast(`Updating delivery status for ${ticketId}.`);
            }
        });
    }

    renderTicket(ticket) {
        const statusColor = ticket.status === 'COMPLETED' ? 'var(--success)' : '#f39c12';
        return `
            <div class="inventory-item">
                <div class="item-details">
                    <strong><i class="fas fa-ticket-alt"></i> ${ticket.id}</strong>
                    <div class="item-meta"><i class="fas fa-route"></i> ${ticket.route} | <i class="fas fa-calendar"></i> ${ticket.date}</div>
                    <div class="item-description">
                        <span class="status-text" style="color: ${statusColor};">${ticket.status}</span> | <i class="fas fa-box"></i> ${ticket.cargo} | Trip: ${ticket.trip}
                    </div>
                </div>
                <div class="item-actions">
                    <div class="action-buttons">
                        <button class="btn btn-small btn-primary" type="button" data-action="view-ticket" data-ticket-id="${ticket.id}">
                            <i class="fas fa-eye"></i> VIEW
                        </button>
                        <button class="btn btn-small btn-secondary" type="button" data-action="print-ticket" data-ticket-id="${ticket.id}">
                            <i class="fas fa-print"></i> PRINT
                        </button>
                        ${ticket.status !== 'COMPLETED' ? `
                            <button class="btn btn-small btn-secondary" type="button" data-action="update-ticket-status" data-ticket-id="${ticket.id}">
                                <i class="fas fa-check"></i> UPDATE
                            </button>
                        ` : `
                            <button class="btn btn-small btn-secondary" type="button" data-action="export-ticket" data-ticket-id="${ticket.id}">
                                <i class="fas fa-download"></i> EXPORT
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    getTickets() {
        return [
            {
                id: 'TT-001',
                date: 'Aug 25, 2024',
                route: 'Colombo → Kandy',
                cargo: 'Spare parts crates (350 kg)',
                trip: 'TRP-001',
                status: 'COMPLETED',
                recipient: 'Mr. Sunil Fernando',
                destination: 'Kandy Industrial Supplies',
                instructions: 'Handle with care. Keep crates upright.',
            },
            {
                id: 'TT-002',
                date: 'Aug 25, 2024',
                route: 'Kandy → Galle',
                cargo: 'Machinery components (500 kg)',
                trip: 'TRP-002',
                status: 'IN TRANSIT',
                recipient: 'Ms. Nadeeka Silva',
                destination: 'Southern Engineering Works',
                instructions: 'Secure properly and avoid stacking.',
            },
        ];
    }

    refresh() {
        // Static section.
    }
}

customElements.define('driver-transport-ticket', DriverTransportTicket);
