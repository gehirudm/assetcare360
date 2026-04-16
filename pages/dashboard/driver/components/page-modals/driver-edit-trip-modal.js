class DriverEditTripModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.render();
        this.bindEvents();

        DriverUtils.on('driver:modal-open', (event) => {
            if (event.detail?.id === 'editTripModal') {
                this.open(event.detail?.payload || {});
            }
        });

        DriverUtils.on('driver:modal-close', (event) => {
            if (event.detail?.id === 'editTripModal') {
                this.close();
            }
        });
    }

    render() {
        this.innerHTML = `
            <div id="editTripModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-edit"></i> Edit Trip</h2>
                        <button class="btn-close" type="button" data-action="close-modal"><i class="fas fa-times"></i></button>
                    </div>
                    <form id="editTripForm">
                        <input type="hidden" id="editTripId">
                        <div class="form-section">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Origin *</label>
                                    <input type="text" class="form-input" id="editTripOrigin" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Destination *</label>
                                    <input type="text" class="form-input" id="editTripDestination" required>
                                </div>
                            </div>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Current Odometer Reading *</label>
                                    <input type="number" class="form-input" id="editTripOdometer" min="0" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Vehicle Registration</label>
                                    <input type="text" class="form-input" id="editTripVehicle" value="LKA-1234" readonly>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Cargo Description</label>
                                <textarea class="form-textarea" id="editTripCargo"></textarea>
                            </div>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button type="submit" class="btn btn-primary" style="flex: 1;"><i class="fas fa-save"></i> Save Changes</button>
                            <button type="button" class="btn btn-danger" style="flex: 1;" data-action="cancel-trip"><i class="fas fa-ban"></i> Cancel Trip</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#editTripModal');
        const form = this.querySelector('#editTripForm');

        this.addEventListener('click', async (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (event.target === modal || (actionEl && actionEl.dataset.action === 'close-modal')) {
                this.close();
                return;
            }

            if (actionEl && actionEl.dataset.action === 'cancel-trip') {
                const tripId = form.querySelector('#editTripId').value;
                const confirmed = window.confirm('Are you sure you want to cancel this trip?');
                if (!confirmed) {
                    return;
                }

                try {
                    const response = await DriverUtils.apiPost(`/trips/${encodeURIComponent(tripId)}/cancel`, {});
                    if (response && (response.success || response.status === 'success')) {
                        DriverUtils.showToast(`Trip ${tripId} cancelled successfully.`);
                        this.close();
                        DriverUtils.emit('driver:data-trips-changed');
                        return;
                    }

                    DriverUtils.showToast(response?.message || 'Failed to cancel trip.', 'error');
                } catch (error) {
                    console.error('Failed to cancel trip:', error);
                    DriverUtils.showToast('Failed to cancel trip. Please try again.', 'error');
                }
            }
        });

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const tripId = form.querySelector('#editTripId').value;

            const payload = {
                origin: form.querySelector('#editTripOrigin').value.trim(),
                destination: form.querySelector('#editTripDestination').value.trim(),
                starting_odometer: Number.parseInt(form.querySelector('#editTripOdometer').value, 10),
                cargo_description: form.querySelector('#editTripCargo').value.trim(),
            };

            try {
                const response = await DriverUtils.apiPut(`/trips/${encodeURIComponent(tripId)}`, payload);
                if (response && (response.success || response.status === 'success')) {
                    DriverUtils.showToast(`Trip ${tripId} updated successfully.`);
                    this.close();
                    DriverUtils.emit('driver:data-trips-changed');
                    return;
                }

                DriverUtils.showToast(response?.message || 'Failed to update trip.', 'error');
            } catch (error) {
                console.error('Failed to update trip:', error);
                DriverUtils.showToast('Failed to update trip. Please try again.', 'error');
            }
        });
    }

    open(payload) {
        const trip = payload?.trip || null;
        if (!trip) {
            return;
        }

        const form = this.querySelector('#editTripForm');
        form.querySelector('#editTripId').value = trip.trip_id || '';
        form.querySelector('#editTripOrigin').value = trip.origin || '';
        form.querySelector('#editTripDestination').value = trip.destination || '';
        form.querySelector('#editTripOdometer').value = trip.starting_odometer || 0;
        form.querySelector('#editTripCargo').value = trip.cargo_description || '';
        DriverUtils.setModalState(this.querySelector('#editTripModal'), true);
    }

    close() {
        DriverUtils.setModalState(this.querySelector('#editTripModal'), false);
    }
}

customElements.define('driver-edit-trip-modal', DriverEditTripModal);
