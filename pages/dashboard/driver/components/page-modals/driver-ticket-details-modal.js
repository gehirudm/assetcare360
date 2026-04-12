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

        content.innerHTML = `
            <div class="form-section">
                <div style="display:grid; gap:10px;">
                    <div style="display:flex; justify-content:space-between; padding:10px; background:#f8f9fa; border-radius:6px;"><strong>Ticket ID:</strong><span>${ticket.id}</span></div>
                    <div style="display:flex; justify-content:space-between; padding:10px; background:#f8f9fa; border-radius:6px;"><strong>Date:</strong><span>${ticket.date}</span></div>
                    <div style="display:flex; justify-content:space-between; padding:10px; background:#f8f9fa; border-radius:6px;"><strong>Route:</strong><span>${ticket.route}</span></div>
                    <div style="display:flex; justify-content:space-between; padding:10px; background:#f8f9fa; border-radius:6px;"><strong>Trip:</strong><span>${ticket.trip}</span></div>
                    <div style="display:flex; justify-content:space-between; padding:10px; background:#f8f9fa; border-radius:6px;"><strong>Status:</strong><span>${ticket.status}</span></div>
                </div>
            </div>
            <div class="form-section">
                <h5><i class="fas fa-box"></i> Cargo & Recipient</h5>
                <div style="padding:12px; background:#f8f9fa; border-radius:6px;">
                    <p style="margin: 0 0 8px 0;"><strong>Cargo:</strong> ${ticket.cargo}</p>
                    <p style="margin: 0 0 8px 0;"><strong>Recipient:</strong> ${ticket.recipient || 'N/A'}</p>
                    <p style="margin: 0;"><strong>Destination:</strong> ${ticket.destination || 'N/A'}</p>
                </div>
            </div>
            <div class="form-section">
                <h5><i class="fas fa-sticky-note"></i> Instructions</h5>
                <div style="padding:12px; background:#f8f9fa; border-radius:6px;">${ticket.instructions || 'No instructions provided.'}</div>
            </div>
        `;

        DriverUtils.setModalState(this.querySelector('#ticketDetailsModal'), true);
    }

    close() {
        DriverUtils.setModalState(this.querySelector('#ticketDetailsModal'), false);
    }
}

customElements.define('driver-ticket-details-modal', DriverTicketDetailsModal);
