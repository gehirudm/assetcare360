class DriverTransportTicketModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.render();
        this.bindEvents();
        DriverUtils.ensureTodayDefaults(this);

        DriverUtils.on('driver:modal-open', (event) => {
            if (event.detail?.id === 'transportTicketModal') {
                this.open();
            }
        });

        DriverUtils.on('driver:modal-close', (event) => {
            if (event.detail?.id === 'transportTicketModal') {
                this.close();
            }
        });
    }

    render() {
        this.innerHTML = `
            <div id="transportTicketModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-ticket-alt"></i> Create Transport Ticket</h2>
                        <button class="btn-close" type="button" data-action="close-modal"><i class="fas fa-times"></i></button>
                    </div>
                    <form id="transportTicketForm">
                        <div class="form-section">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Origin *</label>
                                    <input type="text" class="form-input" id="ticketOrigin" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Destination *</label>
                                    <input type="text" class="form-input" id="ticketDestination" required>
                                </div>
                            </div>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Departure Time *</label>
                                    <input type="datetime-local" class="form-input" id="ticketDeparture" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Vehicle</label>
                                    <input type="text" class="form-input" id="ticketVehicle" value="LKA-1234" readonly>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Cargo Description *</label>
                                <input type="text" class="form-input" id="ticketCargo" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Special Handling Instructions</label>
                                <textarea class="form-textarea" id="ticketInstructions"></textarea>
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary">Create Transport Ticket</button>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#transportTicketModal');
        const form = this.querySelector('#transportTicketForm');

        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (event.target === modal || (actionEl && actionEl.dataset.action === 'close-modal')) {
                this.close();
            }
        });

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            DriverUtils.showToast('Transport ticket created successfully.');
            this.close();
            form.reset();
            DriverUtils.ensureTodayDefaults(form);
        });
    }

    open() {
        DriverUtils.setModalState(this.querySelector('#transportTicketModal'), true);
    }

    close() {
        DriverUtils.setModalState(this.querySelector('#transportTicketModal'), false);
    }
}

customElements.define('driver-transport-ticket-modal', DriverTransportTicketModal);
