class DriverTripDetailsModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.render();
        this.bindEvents();

        DriverUtils.on('driver:modal-open', (event) => {
            if (event.detail?.id === 'tripDetailsModal') {
                this.open(event.detail?.payload || {});
            }
        });

        DriverUtils.on('driver:modal-close', (event) => {
            if (event.detail?.id === 'tripDetailsModal') {
                this.close();
            }
        });
    }

    render() {
        this.innerHTML = `
            <div id="tripDetailsModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-clipboard-list"></i> Trip Details</h2>
                        <button class="btn-close" type="button" data-action="close-modal"><i class="fas fa-times"></i></button>
                    </div>
                    <div id="tripDetailsModalContent"></div>
                    <button class="btn btn-secondary" type="button" data-action="close-modal">Close</button>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#tripDetailsModal');
        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (event.target === modal || (actionEl && actionEl.dataset.action === 'close-modal')) {
                this.close();
            }
        });
    }

    open(payload) {
        const trip = payload?.trip || null;
        const content = this.querySelector('#tripDetailsModalContent');

        if (!trip) {
            content.innerHTML = '<p style="color: var(--muted);">Trip details are not available.</p>';
            DriverUtils.setModalState(this.querySelector('#tripDetailsModal'), true);
            return;
        }

        content.innerHTML = `
            <div class="form-section">
                <div style="display:grid; gap:10px;">
                    <div style="display:flex; justify-content:space-between; padding:10px; background:#f8f9fa; border-radius:6px;"><strong>Trip ID:</strong><span>${trip.trip_id || trip.id}</span></div>
                    <div style="display:flex; justify-content:space-between; padding:10px; background:#f8f9fa; border-radius:6px;"><strong>Status:</strong><span>${trip.status || 'N/A'}</span></div>
                    <div style="display:flex; justify-content:space-between; padding:10px; background:#f8f9fa; border-radius:6px;"><strong>Route:</strong><span>${trip.origin || 'N/A'} → ${trip.destination || 'N/A'}</span></div>
                    <div style="display:flex; justify-content:space-between; padding:10px; background:#f8f9fa; border-radius:6px;"><strong>Start Odometer:</strong><span>${trip.starting_odometer || 'N/A'}</span></div>
                    <div style="display:flex; justify-content:space-between; padding:10px; background:#f8f9fa; border-radius:6px;"><strong>Final Odometer:</strong><span>${trip.final_odometer || 'N/A'}</span></div>
                </div>
            </div>
        `;

        DriverUtils.setModalState(this.querySelector('#tripDetailsModal'), true);
    }

    close() {
        DriverUtils.setModalState(this.querySelector('#tripDetailsModal'), false);
    }
}

customElements.define('driver-trip-details-modal', DriverTripDetailsModal);
