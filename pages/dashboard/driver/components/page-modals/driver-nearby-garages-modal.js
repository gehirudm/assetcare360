class DriverNearbyGaragesModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.render();
        this.bindEvents();

        DriverUtils.on('driver:modal-open', (event) => {
            if (event.detail?.id === 'nearbyGaragesModal') {
                this.open();
            }
        });

        DriverUtils.on('driver:modal-close', (event) => {
            if (event.detail?.id === 'nearbyGaragesModal') {
                this.close();
            }
        });
    }

    render() {
        this.innerHTML = `
            <div id="nearbyGaragesModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-store"></i> Nearby Garages</h2>
                        <button class="btn-close" type="button" data-action="close-modal"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="form-section">
                        <div style="display:grid; gap:10px;">
                            <div style="padding:10px; background:#f8f9fa; border-radius:6px;"><strong>Quick Fix Auto Service</strong> - 2.3 km away</div>
                            <div style="padding:10px; background:#f8f9fa; border-radius:6px;"><strong>City Motors Workshop</strong> - 4.7 km away</div>
                            <div style="padding:10px; background:#f8f9fa; border-radius:6px;"><strong>Roadside Rescue Center</strong> - 6.1 km away</div>
                        </div>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button class="btn btn-primary" type="button" data-action="call-garage"><i class="fas fa-phone"></i> Call</button>
                        <button class="btn btn-secondary" type="button" data-action="garage-directions"><i class="fas fa-map"></i> Directions</button>
                        <button class="btn btn-secondary" type="button" data-action="close-modal">Close</button>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#nearbyGaragesModal');

        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (event.target === modal || (actionEl && actionEl.dataset.action === 'close-modal')) {
                this.close();
                return;
            }

            if (actionEl && actionEl.dataset.action === 'call-garage') {
                DriverUtils.showToast('Calling nearby garage...');
                return;
            }

            if (actionEl && actionEl.dataset.action === 'garage-directions') {
                DriverUtils.showToast('Opening directions to nearby garage...');
            }
        });
    }

    open() {
        DriverUtils.setModalState(this.querySelector('#nearbyGaragesModal'), true);
    }

    close() {
        DriverUtils.setModalState(this.querySelector('#nearbyGaragesModal'), false);
    }
}

customElements.define('driver-nearby-garages-modal', DriverNearbyGaragesModal);
