class DriverStartTripModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.render();
        this.bindEvents();

        DriverUtils.on('driver:modal-open', (event) => {
            if (event.detail?.id === 'startTripModal') {
                this.open();
            }
        });

        DriverUtils.on('driver:modal-close', (event) => {
            if (event.detail?.id === 'startTripModal') {
                this.close();
            }
        });
    }

    render() {
        this.innerHTML = `
            <div id="startTripModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-route"></i> Start New Trip</h2>
                        <button class="btn-close" type="button" data-action="close-modal"><i class="fas fa-times"></i></button>
                    </div>
                    <form id="startTripForm">
                        <div class="form-section">
                            <h5><i class="fas fa-compass"></i> Trip Information</h5>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Origin *</label>
                                    <input type="text" class="form-input" id="tripOrigin" placeholder="Enter origin location" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Destination *</label>
                                    <input type="text" class="form-input" id="tripDestination" placeholder="Enter destination" required>
                                </div>
                            </div>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Vehicle Registration *</label>
                                    <input type="text" class="form-input" id="tripVehicle" value="LKA-1234" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Current Odometer Reading *</label>
                                    <input type="number" class="form-input" id="tripOdometer" min="0" required>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Cargo Description</label>
                                <textarea class="form-textarea" id="tripCargo" placeholder="Describe the cargo being transported..."></textarea>
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary">Create Trip</button>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#startTripModal');
        const form = this.querySelector('#startTripForm');

        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (event.target === modal || (actionEl && actionEl.dataset.action === 'close-modal')) {
                this.close();
            }
        });

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const payload = {
                origin: form.querySelector('#tripOrigin').value.trim(),
                destination: form.querySelector('#tripDestination').value.trim(),
                vehicle_registration: form.querySelector('#tripVehicle').value.trim(),
                starting_odometer: Number.parseInt(form.querySelector('#tripOdometer').value, 10),
                cargo_description: form.querySelector('#tripCargo').value.trim(),
                driver_id: DriverUtils.store.currentUser?.id || 1,
            };

            try {
                const response = await DriverUtils.apiPost('/trips', payload);
                if (response && (response.success || response.status === 'success')) {
                    DriverUtils.showToast('Trip created successfully.');
                    this.close();
                    form.reset();
                    DriverUtils.emit('driver:data-trips-changed');
                    return;
                }

                DriverUtils.showToast(response?.message || 'Failed to create trip.', 'error');
            } catch (error) {
                console.error('Failed to create trip:', error);
                DriverUtils.showToast('Failed to create trip. Please try again.', 'error');
            }
        });
    }

    open() {
        DriverUtils.setModalState(this.querySelector('#startTripModal'), true);
    }

    close() {
        DriverUtils.setModalState(this.querySelector('#startTripModal'), false);
    }
}

customElements.define('driver-start-trip-modal', DriverStartTripModal);
