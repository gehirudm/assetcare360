class TMAddFuelLogModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.render();
        this.bindEvents();
    }

    render() {
        this.innerHTML = `
            <div id="addFuelLogModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-gas-pump"></i> Add Fuel Entry</h2>
                        <button class="btn-close" type="button" data-action="close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <form id="addFuelLogForm">
                        <div id="addFuelLogErrors" class="form-errors" style="display: none;"></div>

                        <div class="form-section">
                            <h5><i class="fas fa-truck"></i> Vehicle Information</h5>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Vehicle *</label>
                                    <select class="form-select" id="fuelVehicle" name="vehicle_registration" required>
                                        <option value="">Select vehicle...</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Driver</label>
                                    <select class="form-select" id="fuelDriver" name="driver_id">
                                        <option value="">Select driver (optional)...</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div class="form-section">
                            <h5><i class="fas fa-gas-pump"></i> Fuel Details</h5>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Date & Time *</label>
                                    <input type="datetime-local" class="form-input" id="fuelDatetime" name="log_datetime" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Fuel Type *</label>
                                    <select class="form-select" id="fuelType" name="fuel_type" required>
                                        <option value="">Select type...</option>
                                        <option value="diesel">Diesel</option>
                                        <option value="petrol">Petrol</option>
                                        <option value="super diesel">Super Diesel</option>
                                        <option value="super petrol">Super Petrol</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Volume (Litres) *</label>
                                    <input type="number" class="form-input" id="fuelVolume" name="fuel_volume" 
                                           min="0" step="0.01" placeholder="e.g. 45.50" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Total Cost (Rs) *</label>
                                    <input type="number" class="form-input" id="fuelTotalCost" name="total_cost" 
                                           min="0" step="0.01" placeholder="e.g. 7500.00" required>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Odometer Reading (km) *</label>
                                    <input type="number" class="form-input" id="fuelOdometer" name="odometer_reading" 
                                           min="0" placeholder="e.g. 125000" required>
                                    <small id="odometerHint" class="form-hint" style="display: none; color: #666; margin-top: 4px;"></small>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Station Name</label>
                                    <input type="text" class="form-input" id="fuelStation" name="station_name" 
                                           placeholder="e.g. IOC Colombo">
                                </div>
                            </div>
                        </div>

                        <div class="modal-actions">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> Save Entry
                            </button>
                            <button type="button" class="btn btn-secondary" data-action="close">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            
            if (event.target.id === 'addFuelLogModal') {
                this.close();
                return;
            }

            if (actionEl && actionEl.dataset.action === 'close') {
                this.close();
            }
        });

        const form = this.querySelector('#addFuelLogForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submit();
            });
        }

        const vehicleSelect = this.querySelector('#fuelVehicle');
        if (vehicleSelect) {
            vehicleSelect.addEventListener('change', () => this._onVehicleChange());
        }
    }

    _onVehicleChange() {
        const vehicleSelect = this.querySelector('#fuelVehicle');
        const odometerInput = this.querySelector('#fuelOdometer');
        const odometerHint = this.querySelector('#odometerHint');

        const vehicle = this._vehicles?.find(v => v.number_plate === vehicleSelect.value);
        if (vehicle) {
            const currentMileage = parseInt(vehicle.current_mileage, 10) || 0;
            odometerInput.min = currentMileage;
            odometerHint.textContent = `Must be ≥ ${currentMileage.toLocaleString()} km (current reading)`;
            odometerHint.style.display = 'block';
        } else {
            odometerInput.min = 0;
            odometerHint.style.display = 'none';
        }
    }

    async open() {
        const modal = this.querySelector('#addFuelLogModal');
        const form = this.querySelector('#addFuelLogForm');
        
        if (form) form.reset();
        this._hideErrors();
        
        // Set default datetime to now
        const now = new Date();
        now.setSeconds(0, 0);
        const dtField = this.querySelector('#fuelDatetime');
        if (dtField) {
            dtField.value = now.toISOString().slice(0, 16);
        }
        
        if (modal) {
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
        }

        await this._loadVehicles();
        await this._loadDrivers();
    }

    close() {
        const modal = this.querySelector('#addFuelLogModal');
        if (modal) {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    async _loadVehicles() {
        const select = this.querySelector('#fuelVehicle');
        if (!select) return;

        select.innerHTML = '<option value="">Loading vehicles...</option>';
        this._vehicles = [];
        
        try {
            const res = await API.get('/vehicles');
            const vehicles = res.data?.vehicles || [];
            this._vehicles = vehicles;
            select.innerHTML = '<option value="">Select vehicle...</option>' +
                vehicles.map(v => `<option value="${v.number_plate}">${v.vehicle_name} (${v.number_plate})</option>`).join('');
        } catch (error) {
            select.innerHTML = '<option value="">Failed to load vehicles</option>';
        }
    }

    async _loadDrivers() {
        const select = this.querySelector('#fuelDriver');
        if (!select) return;

        select.innerHTML = '<option value="">Loading drivers...</option>';
        
        try {
            const res = await API.get('/users');
            const users = res.data?.users || res.data || [];
            const drivers = users.filter(u => u.role === 'Driver');
            select.innerHTML = '<option value="">Select driver (optional)...</option>' +
                drivers.map(d => `<option value="${d.id}">${d.full_name || d.name || `Driver #${d.id}`}</option>`).join('');
        } catch (error) {
            select.innerHTML = '<option value="">Failed to load drivers</option>';
        }
    }

    _showErrors(message) {
        const errorsDiv = this.querySelector('#addFuelLogErrors');
        if (errorsDiv) {
            errorsDiv.textContent = message;
            errorsDiv.style.display = 'block';
        }
    }

    _hideErrors() {
        const errorsDiv = this.querySelector('#addFuelLogErrors');
        if (errorsDiv) {
            errorsDiv.style.display = 'none';
        }
    }

    async submit() {
        this._hideErrors();

        const vehicle_registration = this.querySelector('#fuelVehicle')?.value;
        const driver_id = this.querySelector('#fuelDriver')?.value;
        const log_datetime = this.querySelector('#fuelDatetime')?.value;
        const fuel_type = this.querySelector('#fuelType')?.value;
        const fuel_volume = this.querySelector('#fuelVolume')?.value;
        const total_cost = this.querySelector('#fuelTotalCost')?.value;
        const odometer_reading = this.querySelector('#fuelOdometer')?.value;
        const station_name = this.querySelector('#fuelStation')?.value.trim();

        if (!vehicle_registration) return this._showErrors('Please select a vehicle.');
        if (!log_datetime) return this._showErrors('Date & time is required.');
        if (!fuel_type) return this._showErrors('Please select fuel type.');
        if (!fuel_volume || parseFloat(fuel_volume) <= 0) return this._showErrors('Fuel volume must be greater than zero.');
        if (!total_cost || parseFloat(total_cost) <= 0) return this._showErrors('Total cost must be greater than zero.');
        if (!odometer_reading) return this._showErrors('Odometer reading is required.');

        // Validate odometer against vehicle's current mileage
        const vehicle = this._vehicles?.find(v => v.number_plate === vehicle_registration);
        if (vehicle && parseInt(odometer_reading) < parseInt(vehicle.current_mileage || 0)) {
            return this._showErrors(`Odometer must be ≥ ${parseInt(vehicle.current_mileage).toLocaleString()} km (vehicle's current reading).`);
        }

        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn?.innerHTML;
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            submitBtn.disabled = true;
        }

        try {
            await API.post('/fuel-logs', {
                vehicle_registration,
                driver_id: driver_id ? parseInt(driver_id) : null,
                log_datetime: log_datetime.replace('T', ' ') + ':00',
                fuel_type,
                fuel_volume: parseFloat(fuel_volume),
                total_cost: parseFloat(total_cost),
                odometer_reading: parseInt(odometer_reading),
                station_name: station_name || null,
            });

            this.close();
            TMUtils.emitToast('Fuel entry saved successfully', 'success');
            
            document.dispatchEvent(new CustomEvent('tm-modal:fuel-added', { bubbles: true }));
        } catch (error) {
            this._showErrors(error.message || 'Failed to save fuel entry.');
        } finally {
            if (submitBtn) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }
    }
}

customElements.define('tm-add-fuel-log-modal', TMAddFuelLogModal);
