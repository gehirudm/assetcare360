class DriverTicketDetailsModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.render();
        this.bindEvents();

        DriverUtils.on('driver:modal-open', (event) => {
            if (event.detail?.id === 'ticketDetailsModal') {
                this.open(event.detail?.payload || {});
            }
        });

        DriverUtils.on('driver:modal-close', (event) => {
            if (event.detail?.id === 'ticketDetailsModal') {
                this.close();
            }
        });
    }

    render() {
        this.innerHTML = `
            <div id="ticketDetailsModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-ticket-alt"></i> Transport Ticket Details</h2>
                        <button class="btn-close" type="button" data-action="close-modal"><i class="fas fa-times"></i></button>
                    </div>
                    <div id="ticketDetailsContent"></div>
                    <div style="display:flex; gap:10px; margin-top: 15px;">
                        <button class="btn btn-primary" type="button" data-action="print-ticket"><i class="fas fa-print"></i> Print Ticket</button>
                        <button class="btn btn-secondary" type="button" data-action="close-modal">Close</button>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#ticketDetailsModal');

        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (event.target === modal || (actionEl && actionEl.dataset.action === 'close-modal')) {
                this.close();
                return;
            }

            if (actionEl && actionEl.dataset.action === 'print-ticket') {
                DriverUtils.showToast('Printing transport ticket...');
            }
        });
    }

    open(payload) {
        const ticket = payload?.ticket || null;
        const content = this.querySelector('#ticketDetailsContent');

        if (!ticket) {
            content.innerHTML = '<p style="color: var(--muted);">Ticket details are not available.</p>';
            DriverUtils.setModalState(this.querySelector('#ticketDetailsModal'), true);
            return;
        }

        const ticketDate = ticket.date || DriverUtils.formatDateTime(ticket.created_at);
        const route = ticket.route || `${ticket.origin || 'N/A'} → ${ticket.destination || 'N/A'}`;
        const tripId = ticket.trip || ticket.tripId || ticket.trip_id || 'N/A';
        const cargo = ticket.cargo || ticket.cargo_description || 'N/A';
        const status = ticket.status || 'Pending';
        const vehicleRegistration = ticket.vehicleRegistration || ticket.vehicle_registration || 'N/A';
        const recipient = ticket.recipient || ticket.driver_name || 'N/A';
        const destination = ticket.destination || 'N/A';
        const instructions = ticket.instructions || 'No instructions provided.';
        const rejectionReason = ticket.rejectionReason || ticket.rejection_reason || null;

        content.innerHTML = `
            <div class="form-section">
                <div style="display:grid; gap:10px;">
                    <div style="display:flex; justify-content:space-between; padding:10px; background:#f8f9fa; border-radius:6px;"><strong>Ticket ID:</strong><span>${ticket.id || ('TT-' + tripId)}</span></div>
                    <div style="display:flex; justify-content:space-between; padding:10px; background:#f8f9fa; border-radius:6px;"><strong>Date:</strong><span>${ticketDate}</span></div>
                    <div style="display:flex; justify-content:space-between; padding:10px; background:#f8f9fa; border-radius:6px;"><strong>Route:</strong><span>${route}</span></div>
                    <div style="display:flex; justify-content:space-between; padding:10px; background:#f8f9fa; border-radius:6px;"><strong>Trip:</strong><span>${tripId}</span></div>
                    <div style="display:flex; justify-content:space-between; padding:10px; background:#f8f9fa; border-radius:6px;"><strong>Status:</strong><span>${status}</span></div>
                    <div style="display:flex; justify-content:space-between; padding:10px; background:#f8f9fa; border-radius:6px;"><strong>Vehicle:</strong><span>${vehicleRegistration}</span></div>
                </div>
            </div>
            <div class="form-section">
                <h5><i class="fas fa-box"></i> Cargo & Recipient</h5>
                <div style="padding:12px; background:#f8f9fa; border-radius:6px;">
                    <p style="margin: 0 0 8px 0;"><strong>Cargo:</strong> ${cargo}</p>
                    <p style="margin: 0 0 8px 0;"><strong>Driver:</strong> ${recipient}</p>
                    <p style="margin: 0;"><strong>Destination:</strong> ${destination}</p>
                </div>
            </div>
            <div class="form-section">
                <h5><i class="fas fa-sticky-note"></i> Instructions</h5>
                <div style="padding:12px; background:#f8f9fa; border-radius:6px;">${instructions}</div>
            </div>
            ${rejectionReason ? `
                <div class="form-section">
                    <h5 style="color: var(--danger);"><i class="fas fa-exclamation-triangle"></i> Rejection Reason</h5>
                    <div style="padding:12px; background:#fef2f2; border-radius:6px; color:#991b1b;">${rejectionReason}</div>
                </div>
            ` : ''}
        `;

        DriverUtils.setModalState(this.querySelector('#ticketDetailsModal'), true);
    }

    close() {
        DriverUtils.setModalState(this.querySelector('#ticketDetailsModal'), false);
    }
}

customElements.define('driver-ticket-details-modal', DriverTicketDetailsModal);
