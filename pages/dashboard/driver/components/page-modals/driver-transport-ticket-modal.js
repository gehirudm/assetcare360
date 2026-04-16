class DriverTransportTicketModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this._selectedVehicle = null;
        this._vehicleMap = new Map();
        this._assignedVehicle = null;
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
                                    <label class="form-label">Vehicle *</label>
                                    <select class="form-select" id="ticketVehicle" required>
                                        <option value="">Select vehicle...</option>
                                    </select>
                                </div>
                            </div>
                            <div id="ticketVehicleHelp" style="font-size: 12px; color: var(--muted); margin-top: -8px; margin-bottom: 8px;"></div>
                            <div class="form-group">
                                <label class="form-label">Cargo Description *</label>
                                <input type="text" class="form-input" id="ticketCargo" required>
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
        const vehicleSelect = this.querySelector('#ticketVehicle');

        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (event.target === modal || (actionEl && actionEl.dataset.action === 'close-modal')) {
                this.close();
            }
        });

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            this.submit();
        });

        if (vehicleSelect) {
            vehicleSelect.addEventListener('change', () => {
                this._selectedVehicle = this._vehicleMap.get(vehicleSelect.value) || null;
                this.updateVehicleHelp();
            });
        }
    }

    async open() {
        const form = this.querySelector('#transportTicketForm');
        form?.reset();
        this._selectedVehicle = null;
        this._vehicleMap = new Map();
        this._assignedVehicle = null;

        await this.loadVehicles();
        DriverUtils.ensureTodayDefaults(form || this);
        DriverUtils.setModalState(this.querySelector('#transportTicketModal'), true);
    }

    close() {
        DriverUtils.setModalState(this.querySelector('#transportTicketModal'), false);
    }

    async loadVehicles() {
        const vehicleSelect = this.querySelector('#ticketVehicle');
        if (!vehicleSelect) {
            return;
        }

        vehicleSelect.disabled = true;
        vehicleSelect.innerHTML = '<option value="">Loading vehicles...</option>';

        try {
            let myVehicleResponse = null;
            let vehiclesResponse = null;

            try {
                myVehicleResponse = await DriverUtils.apiGet('/vehicles/my-vehicle');
            } catch (error) {
                console.warn('Failed to load assigned vehicle, continuing with fallback vehicle list.', error);
            }

            try {
                vehiclesResponse = await DriverUtils.apiGet('/vehicles/with-drivers');
            } catch (error) {
                console.warn('Failed to load vehicles with driver assignments, falling back to base vehicles list.', error);
            }

            let allVehicles = Array.isArray(vehiclesResponse?.data?.vehicles)
                ? vehiclesResponse.data.vehicles
                : [];

            if (!allVehicles.length) {
                const fallbackVehiclesResponse = await DriverUtils.apiGet('/vehicles');
                allVehicles = Array.isArray(fallbackVehiclesResponse?.data?.vehicles)
                    ? fallbackVehiclesResponse.data.vehicles
                    : [];
            }

            const activeVehicles = allVehicles.filter((vehicle) => String(vehicle.status || '').toLowerCase() === 'active');

            this._vehicleMap = new Map(
                activeVehicles
                    .filter((vehicle) => vehicle.number_plate)
                    .map((vehicle) => [vehicle.number_plate, vehicle])
            );

            const myVehicle = myVehicleResponse?.data && typeof myVehicleResponse.data === 'object' && !Array.isArray(myVehicleResponse.data)
                ? myVehicleResponse.data
                : null;
            this._assignedVehicle = myVehicle && myVehicle.number_plate ? myVehicle : null;

            if (this._assignedVehicle) {
                const assignedVehicleIdLabel = this._assignedVehicle.vehicle_id ? `${this.escapeHtml(this._assignedVehicle.vehicle_id)} · ` : '';
                vehicleSelect.innerHTML = `<option value="${this.escapeHtml(this._assignedVehicle.number_plate)}">${assignedVehicleIdLabel}${this.escapeHtml(this._assignedVehicle.vehicle_name || this._assignedVehicle.number_plate)} (${this.escapeHtml(this._assignedVehicle.number_plate)})</option>`;
                vehicleSelect.value = this._assignedVehicle.number_plate;
                vehicleSelect.disabled = true;
                this._selectedVehicle = this._vehicleMap.get(this._assignedVehicle.number_plate) || this._assignedVehicle;
                this.updateVehicleHelp('Your assigned vehicle will be used for this transport ticket.');
                return;
            }

            const selectableVehicles = activeVehicles.filter((vehicle) => {
                const assignedDriverId = vehicle.assigned_driver_id ? Number(vehicle.assigned_driver_id) : null;
                const currentUserId = Number(DriverUtils.store.currentUser?.id || 0);
                return !assignedDriverId || (currentUserId > 0 && assignedDriverId === currentUserId);
            });

            if (!selectableVehicles.length) {
                vehicleSelect.innerHTML = '<option value="">No vehicles available</option>';
                vehicleSelect.disabled = true;
                this.updateVehicleHelp('No active vehicle is available for selection. Please contact Transportation Manager.', 'var(--danger)');
                return;
            }

            vehicleSelect.innerHTML = '<option value="">Select vehicle...</option>'
                + selectableVehicles.map((vehicle) => {
                    const assignedText = vehicle.assigned_driver_id ? 'Assigned to you' : 'No assigned driver';
                    const vehicleIdLabel = vehicle.vehicle_id ? `${this.escapeHtml(vehicle.vehicle_id)} · ` : '';
                    return `<option value="${this.escapeHtml(vehicle.number_plate)}">${vehicleIdLabel}${this.escapeHtml(vehicle.vehicle_name || vehicle.number_plate)} (${this.escapeHtml(vehicle.number_plate)}) - ${assignedText}</option>`;
                }).join('');

            vehicleSelect.disabled = false;
            this.updateVehicleHelp('No vehicle is assigned to you. Please select a vehicle to continue.');
        } catch (error) {
            console.error('Failed to load vehicles for transport ticket:', error);
            vehicleSelect.innerHTML = '<option value="">Failed to load vehicles</option>';
            vehicleSelect.disabled = true;
            this.updateVehicleHelp('Unable to load vehicle data. Please try again.', 'var(--danger)');
        }
    }

    updateVehicleHelp(message = '', color = 'var(--muted)') {
        const help = this.querySelector('#ticketVehicleHelp');
        if (!help) {
            return;
        }

        help.style.color = color;
        help.textContent = message;
    }

    async submit() {
        const origin = this.querySelector('#ticketOrigin')?.value.trim();
        const destination = this.querySelector('#ticketDestination')?.value.trim();
        const vehicleRegistration = this.querySelector('#ticketVehicle')?.value;
        const cargoDescription = this.querySelector('#ticketCargo')?.value.trim();
        const submitButton = this.querySelector('#transportTicketForm button[type="submit"]');

        if (!origin || !destination || !vehicleRegistration || !cargoDescription) {
            DriverUtils.showToast('Please fill in all required fields.', 'error');
            return;
        }

        const selectedVehicle = this._selectedVehicle || this._vehicleMap.get(vehicleRegistration) || null;
        const vehicleId = selectedVehicle?.id ? Number(selectedVehicle.id) : null;
        const currentUserId = Number(DriverUtils.store.currentUser?.id || 0);
        const assignedDriverId = selectedVehicle?.assigned_driver_id ? Number(selectedVehicle.assigned_driver_id) : null;

        if (assignedDriverId && currentUserId && assignedDriverId !== currentUserId) {
            DriverUtils.showToast('Selected vehicle is assigned to another driver.', 'error');
            return;
        }

        const payload = {
            origin,
            destination,
            vehicle_registration: vehicleRegistration,
            cargo_description: cargoDescription,
        };

        if (Number.isFinite(vehicleId) && vehicleId > 0) {
            payload.vehicle_id = vehicleId;
        }

        if (!assignedDriverId && currentUserId) {
            payload.driver_id = currentUserId;
        }

        const originalText = submitButton?.innerHTML;
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        }

        try {
            const response = await DriverUtils.apiPost('/trips', payload);
            if (!response || (!response.success && response.status !== 'success')) {
                throw new Error(response?.message || 'Failed to create transport ticket');
            }

            DriverUtils.showToast('Transport ticket created successfully.');
            this.close();
            DriverUtils.emit('driver:data-trips-changed');
        } catch (error) {
            console.error('Failed to create transport ticket:', error);
            DriverUtils.showToast(error.message || 'Failed to create transport ticket.', 'error');
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = originalText || 'Create Transport Ticket';
            }
        }
    }

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

customElements.define('driver-transport-ticket-modal', DriverTransportTicketModal);
