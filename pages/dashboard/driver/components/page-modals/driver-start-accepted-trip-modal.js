class DriverStartAcceptedTripModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.currentTripId = null;
        this.currentTrip = null;
        this.render();
        this.bindEvents();

        DriverUtils.on('driver:modal-open', (event) => {
            if (event.detail?.id === 'startAcceptedTripModal') {
                this.currentTripId = event.detail.tripId;
                this.currentTrip = event.detail.trip || null;
                this.open();
            }
        });

        DriverUtils.on('driver:modal-close', (event) => {
            if (event.detail?.id === 'startAcceptedTripModal') {
                this.close();
            }
        });
    }

    render() {
        this.innerHTML = `
            <div id="startAcceptedTripModal" class="modal">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h2><i class="fas fa-play-circle"></i> Start Trip</h2>
                        <button class="btn-close" type="button" data-action="close-modal"><i class="fas fa-times"></i></button>
                    </div>
                    <form id="startAcceptedTripForm">
                        <div class="form-section">
                            <div id="tripDetails" style="margin-bottom: 20px; padding: 15px; background: var(--surface); border-radius: 8px;">
                                <!-- Trip details will be inserted here -->
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Starting Odometer Reading *</label>
                                <input 
                                    type="number" 
                                    class="form-input" 
                                    id="startingOdometer" 
                                    placeholder="Enter current odometer reading" 
                                    min="0"
                                    required
                                >
                                <small style="color: var(--muted);">Record the current odometer reading before starting the trip.</small>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Assistant Driver Name</label>
                                <input 
                                    type="text" 
                                    class="form-input" 
                                    id="assistantDriverName" 
                                    placeholder="Enter assistant driver's name (optional)"
                                >
                                <small style="color: var(--muted);">If you have an assistant driver, enter their name here.</small>
                            </div>
                        </div>
                        <div class="modal-actions" style="display: flex; gap: 10px; justify-content: flex-end;">
                            <button type="button" class="btn btn-secondary" data-action="close-modal">Cancel</button>
                            <button type="submit" class="btn btn-success">
                                <i class="fas fa-play"></i> Start Trip
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#startAcceptedTripModal');
        const form = this.querySelector('#startAcceptedTripForm');

        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (event.target === modal || (actionEl && actionEl.dataset.action === 'close-modal')) {
                this.close();
            }
        });

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const startingOdometer = form.querySelector('#startingOdometer').value.trim();
            const assistantDriverName = form.querySelector('#assistantDriverName').value.trim();

            if (!startingOdometer) {
                DriverUtils.showToast('Please enter the starting odometer reading.', 'error');
                return;
            }

            if (!this.currentTripId) {
                DriverUtils.showToast('No trip selected.', 'error');
                return;
            }

            try {
                const payload = {
                    starting_odometer: parseInt(startingOdometer, 10)
                };

                if (assistantDriverName) {
                    payload.assistant_driver_name = assistantDriverName;
                }

                const response = await DriverUtils.apiPost(`/trips/${encodeURIComponent(this.currentTripId)}/start`, payload);

                if (response && (response.success || response.status === 'success')) {
                    DriverUtils.showToast(`Trip ${this.currentTripId} started successfully.`);
                    this.close();
                    form.reset();
                    DriverUtils.emit('driver:data-trips-changed');
                    return;
                }

                DriverUtils.showToast(response?.message || 'Failed to start trip.', 'error');
            } catch (error) {
                console.error('Failed to start trip:', error);
                DriverUtils.showToast('Failed to start trip. Please try again.', 'error');
            }
        });
    }

    async open() {
        const detailsEl = this.querySelector('#tripDetails');
        const odometerInput = this.querySelector('#startingOdometer');
        
        // Fetch current vehicle mileage
        try {
            const vehicleResponse = await DriverUtils.apiGet('/vehicles/my-vehicle');
            if (vehicleResponse && vehicleResponse.status === 'success' && vehicleResponse.data) {
                const currentMileage = parseInt(vehicleResponse.data.current_mileage, 10) || 0;
                odometerInput.min = currentMileage;
                odometerInput.placeholder = `Must be at least ${currentMileage.toLocaleString()} km`;
                odometerInput.value = currentMileage; // Pre-fill with current mileage
            }
        } catch (error) {
            console.error('Failed to fetch vehicle mileage:', error);
        }
        
        if (detailsEl && this.currentTrip) {
            const route = `${this.currentTrip.origin || 'N/A'} → ${this.currentTrip.destination || 'N/A'}`;
            detailsEl.innerHTML = `
                <h4 style="margin: 0 0 10px 0; color: var(--primary);"><i class="fas fa-route"></i> ${this.currentTripId}</h4>
                <p style="margin: 0; font-size: 14px;"><i class="fas fa-map-marker-alt"></i> <strong>Route:</strong> ${route}</p>
                ${this.currentTrip.vehicle_registration ? `<p style="margin: 5px 0 0 0; font-size: 14px;"><i class="fas fa-truck"></i> <strong>Vehicle:</strong> ${this.currentTrip.vehicle_registration}</p>` : ''}
                ${this.currentTrip.cargo_description ? `<p style="margin: 5px 0 0 0; font-size: 14px;"><i class="fas fa-box"></i> <strong>Cargo:</strong> ${this.currentTrip.cargo_description}</p>` : ''}
            `;
        } else if (detailsEl && this.currentTripId) {
            detailsEl.innerHTML = `<p style="margin: 0;"><strong>Trip ID:</strong> ${this.currentTripId}</p>`;
        }

        DriverUtils.setModalState(this.querySelector('#startAcceptedTripModal'), true);
    }

    close() {
        DriverUtils.setModalState(this.querySelector('#startAcceptedTripModal'), false);
        this.currentTripId = null;
        this.currentTrip = null;
        this.querySelector('#startAcceptedTripForm')?.reset();
    }
}

customElements.define('driver-start-accepted-trip-modal', DriverStartAcceptedTripModal);
