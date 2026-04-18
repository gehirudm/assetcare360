class DriverTransportTicket extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.tickets = [];
        this.render();
        this.bindEvents();
        this._cleanupOverflowAutoClose = DriverUtils.registerOverflowAutoClose(this);

        this._onTripsChanged = () => this.refresh();
        DriverUtils.on('driver:data-trips-changed', this._onTripsChanged);

        this.refresh();
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
                <h2 class="page-title"><i class="fas fa-ticket-alt"></i> Transport Ticket</h2>
                <p class="page-subtitle">Create and manage cargo transport documentation</p>
            </div>

            <div style="margin-bottom: 20px;">
                <button class="btn btn-primary" type="button" data-action="open-transport-ticket-modal">Create Transport Ticket</button>
            </div>

            <div class="card">
                <div class="card-header"><i class="fas fa-ticket-alt"></i> My Transport Tickets</div>
                <div id="driverTransportTicketList" class="inventory-list"></div>
            </div>
        `;

        this.renderTickets();
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

            if (action === 'open-transport-ticket-modal') {
                DriverUtils.closeOverflowMenus(this);
                DriverUtils.openModal('transportTicketModal');
                return;
            }

            DriverUtils.closeOverflowMenus(this);

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
                DriverUtils.navigateTo('trip-log');
                DriverUtils.showToast('Use Trip Log to accept/reject or progress this trip.');
            }
        });
    }

    renderTickets() {
        const list = this.querySelector('#driverTransportTicketList');
        if (!list) {
            return;
        }

        if (!this.tickets.length) {
            list.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--muted);">No transport tickets found. Create a transport ticket to get started.</div>';
            return;
        }

        list.innerHTML = this.tickets.map((ticket) => this.renderTicket(ticket)).join('');
    }

    renderTicket(ticket) {
        const statusColor = DriverUtils.getStatusColor(ticket.status);
        const normalizedStatus = DriverUtils.getTripFilterStatus(ticket.status);
        const dangerousBadge = ticket.hasDangerousCargo
            ? '<span class="status-badge" style="background:#dc2626;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;margin-left:8px;"><i class="fas fa-radiation"></i> Dangerous</span>'
            : '';
        const trailingAction = normalizedStatus !== 'completed' && normalizedStatus !== 'cancelled' && normalizedStatus !== 'rejected'
            ? `
                <button class="dropdown-item" type="button" data-action="update-ticket-status" data-ticket-id="${ticket.id}">
                    <i class="fas fa-route"></i> Open Trip Log
                </button>
            `
            : `
                <button class="dropdown-item" type="button" data-action="export-ticket" data-ticket-id="${ticket.id}">
                    <i class="fas fa-download"></i> Export
                </button>
            `;

        const overflowMenu = `
            <div class="dropdown-container">
                <button class="btn btn-small btn-secondary dropdown-trigger" type="button" data-action="toggle-actions-menu" aria-label="More actions">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
                <div class="dropdown-menu">
                    <button class="dropdown-item" type="button" data-action="print-ticket" data-ticket-id="${ticket.id}">
                        <i class="fas fa-print"></i> Print
                    </button>
                    ${trailingAction}
                </div>
            </div>
        `;

        return `
            <div class="inventory-item">
                <div class="item-details">
                    <strong><i class="fas fa-ticket-alt"></i> ${DriverUtils.escapeHtml(ticket.id)}</strong>
                    <div class="item-meta"><i class="fas fa-route"></i> ${DriverUtils.escapeHtml(ticket.route)} | <i class="fas fa-calendar"></i> ${DriverUtils.escapeHtml(ticket.date)}</div>
                    <div class="item-description">
                        <span class="status-text" style="color: ${statusColor};">${DriverUtils.escapeHtml(ticket.status)}</span>${dangerousBadge}
                    </div>
                    <div class="item-meta"><i class="fas fa-boxes-stacked"></i> ${DriverUtils.escapeHtml(ticket.cargo)}</div>
                    <div class="item-meta"><i class="fas fa-hashtag"></i> Trip: ${DriverUtils.escapeHtml(ticket.trip)}</div>
                    ${ticket.rejectionReason ? `<div class="item-meta" style="margin-top: 4px; color: var(--danger);"><i class="fas fa-exclamation-circle"></i> ${DriverUtils.escapeHtml(ticket.rejectionReason)}</div>` : ''}
                </div>
                <div class="item-actions">
                    <div class="action-buttons">
                        <button class="btn btn-small btn-primary" type="button" data-action="view-ticket" data-ticket-id="${ticket.id}">
                            <i class="fas fa-eye"></i> VIEW
                        </button>
                        ${overflowMenu}
                    </div>
                </div>
            </div>
        `;
    }

    async refresh() {
        try {
            const response = await DriverUtils.apiGet('/trips');
            const trips = DriverUtils.normalizeApiList(response, 'trips');
            const currentDriverId = Number(DriverUtils.store.currentUser?.id || 0);

            if (!currentDriverId) {
                this.tickets = [];
                this.renderTickets();
                return;
            }

            const filteredTrips = trips.filter((trip) => {
                return Number(trip.driver_id) === currentDriverId;
            });

            this.tickets = [...filteredTrips]
                .sort((first, second) => {
                    const timeDiff = this.getTripSortTime(second) - this.getTripSortTime(first);
                    if (timeDiff !== 0) {
                        return timeDiff;
                    }

                    return this.getTripSortRank(second) - this.getTripSortRank(first);
                })
                .map((trip) => ({
                    id: `TT-${trip.trip_id || trip.id}`,
                    trip: trip.trip_id || String(trip.id || 'N/A'),
                    tripId: trip.trip_id || String(trip.id || ''),
                    route: `${trip.origin || 'N/A'} → ${trip.destination || 'N/A'}`,
                    date: DriverUtils.formatDateTime(trip.created_at),
                    status: trip.status || 'Pending',
                    cargo: DriverUtils.buildCargoSummary(trip) || 'No cargo description',
                    cargo_items: DriverUtils.normalizeCargoItems(trip),
                    has_dangerous_cargo: DriverUtils.hasDangerousCargo(trip),
                    hasDangerousCargo: DriverUtils.hasDangerousCargo(trip),
                    recipient: trip.driver_name || 'N/A',
                    destination: trip.destination || 'N/A',
                    instructions: trip.completion_notes || '',
                    vehicleRegistration: trip.vehicle_registration || 'N/A',
                    origin: trip.origin || 'N/A',
                    rejectionReason: trip.rejection_reason || '',
                }));

            this.renderTickets();
        } catch (error) {
            console.error('Failed to load transport tickets:', error);
            this.tickets = [];
            this.renderTickets();
            DriverUtils.showToast('Unable to load transport tickets.', 'warning');
        }
    }

    getTripSortTime(trip) {
        const candidates = [
            trip?.created_at,
            trip?.updated_at,
            trip?.date,
            trip?.departure_datetime,
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

    getTripSortRank(trip) {
        const directId = Number.parseInt(trip?.id, 10);
        if (Number.isFinite(directId) && directId > 0) {
            return directId;
        }

        const tripIdText = String(trip?.trip_id || '');
        const numberPart = tripIdText.match(/(\d+)(?!.*\d)/);
        if (numberPart) {
            const parsed = Number.parseInt(numberPart[1], 10);
            if (Number.isFinite(parsed) && parsed > 0) {
                return parsed;
            }
        }

        return 0;
    }
}

customElements.define('driver-transport-ticket', DriverTransportTicket);
