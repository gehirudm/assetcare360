class TMEditTripModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this._trip = null;
        this._selectedVehicle = null;
        this._vehicleTripCount = 0;
        this._cargoCatalog = [];
        this._cargoRowSeed = 0;
        this.render();
        this.bindEvents();
    }

    render() {
        this.innerHTML = `
            <div id="editTripModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-edit"></i> Edit Trip</h2>
                        <button class="btn-close" type="button" data-action="close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <form id="editTripForm">
                        <div id="editTripErrors" class="form-errors" style="display: none;"></div>

                        <div class="form-section">
                            <h5><i class="fas fa-info-circle"></i> Trip Information</h5>
                            <div class="form-group">
                                <label class="form-label">Trip ID</label>
                                <input type="text" class="form-input" id="editTripId" readonly disabled>
                            </div>
                        </div>

                        <div class="form-section">
                            <h5><i class="fas fa-map-marker-alt"></i> Route Information</h5>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Origin *</label>
                                    <input type="text" class="form-input" id="editTripOrigin" name="origin" 
                                           placeholder="Departure location" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Destination *</label>
                                    <input type="text" class="form-input" id="editTripDestination" name="destination" 
                                           placeholder="Arrival location" required>
                                </div>
                            </div>
                        </div>

                        <div class="form-section">
                            <h5><i class="fas fa-truck"></i> Vehicle</h5>
                            <div class="form-group">
                                <label class="form-label">Select Vehicle *</label>
                                <select class="form-select" id="editTripVehicle" name="vehicle_registration" required>
                                    <option value="">Select vehicle...</option>
                                </select>
                            </div>
                            <div id="editVehicleDriverInfo" class="vehicle-driver-info" style="display: none;"></div>
                        </div>

                        <div class="form-section">
                            <h5><i class="fas fa-boxes-stacked"></i> Cargo Information</h5>
                            <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 10px;">
                                <p style="margin: 0; font-size: 12px; color: var(--muted);">Update structured cargo quantities for this trip.</p>
                                <button type="button" class="btn btn-secondary btn-small" data-action="add-cargo-row">
                                    <i class="fas fa-plus"></i> Add Cargo Item
                                </button>
                            </div>
                            <div id="editTripCargoItemsList" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px;"></div>
                            <div class="form-group">
                                <label class="form-label">Cargo Description / Notes</label>
                                <textarea class="form-textarea" id="editTripCargo" name="cargo_description" 
                                          placeholder="Optional free-text notes for this trip cargo..."></textarea>
                            </div>
                        </div>

                        <div class="modal-actions">
                            <button type="submit" class="btn btn-primary" id="editTripSubmit">
                                <i class="fas fa-save"></i> Save Changes
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
            
            if (event.target.id === 'editTripModal') {
                this.close();
                return;
            }

            if (actionEl && actionEl.dataset.action === 'close') {
                this.close();
                return;
            }

            if (actionEl && actionEl.dataset.action === 'add-cargo-row') {
                this._appendCargoRow();
                return;
            }

            if (actionEl && actionEl.dataset.action === 'remove-cargo-row') {
                const row = actionEl.closest('.tm-cargo-row');
                if (row) {
                    row.remove();
                }

                const rows = this.querySelectorAll('.tm-cargo-row');
                if (!rows.length) {
                    this._appendCargoRow();
                }
            }
        });

        this.addEventListener('change', (event) => {
            const cargoSelect = event.target.closest('.tm-cargo-item-select');
            if (!cargoSelect) {
                return;
            }

            const row = cargoSelect.closest('.tm-cargo-row');
            this._renderCargoDangerBadge(row);
        });

        const form = this.querySelector('#editTripForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submit();
            });
        }

        // Handle vehicle selection change
        const vehicleSelect = this.querySelector('#editTripVehicle');
        if (vehicleSelect) {
            vehicleSelect.addEventListener('change', (e) => {
                this._onVehicleChange(e.target.value);
            });
        }
    }

    async open(tripId) {
        const modal = this.querySelector('#editTripModal');
        const form = this.querySelector('#editTripForm');
        
        if (form) form.reset();
        this._trip = null;
        this._selectedVehicle = null;
        this._hideErrors();
        this._hideVehicleDriverInfo();
        
        if (modal) {
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
        }

        this._renderCargoRows();

        // Load trip data, vehicles, and cargo catalog in parallel
        await Promise.all([
            this._loadTrip(tripId),
            this._loadVehicles(),
            this._loadCargoItems(),
        ]);

        // After loading, set the vehicle and load driver info
        if (this._trip && this._trip.vehicle_registration) {
            const vehicleSelect = this.querySelector('#editTripVehicle');
            if (vehicleSelect) {
                vehicleSelect.value = this._trip.vehicle_registration;
                await this._onVehicleChange(this._trip.vehicle_registration);
            }
        }

        this._renderCargoRows(this._trip?.cargo_items || []);
    }

    close() {
        const modal = this.querySelector('#editTripModal');
        if (modal) {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        }
        this._trip = null;
        this._selectedVehicle = null;
    }

    async _loadTrip(tripId) {
        try {
            const res = await API.get(`/trips/${tripId}`);
            this._trip = res.data?.trip;
            
            if (this._trip) {
                // Populate form fields
                this.querySelector('#editTripId').value = this._trip.trip_id;
                this.querySelector('#editTripOrigin').value = this._trip.origin || '';
                this.querySelector('#editTripDestination').value = this._trip.destination || '';
                this.querySelector('#editTripCargo').value = this._trip.cargo_description || '';
            }
        } catch (error) {
            this._showErrors('Failed to load trip: ' + (error.message || 'Unknown error'));
        }
    }

    async _loadCargoItems() {
        const response = await API.get('/trips/cargo-items');
        if (!response || (!response.success && response.status !== 'success')) {
            throw new Error(response?.message || 'Failed to load cargo items');
        }

        this._cargoCatalog = Array.isArray(response.data?.cargo_items)
            ? response.data.cargo_items
            : [];
    }

    async _loadVehicles() {
        const select = this.querySelector('#editTripVehicle');
        if (!select) return;

        select.innerHTML = '<option value="">Loading vehicles...</option>';
        
        try {
            const res = await API.get('/vehicles/with-drivers');
            const vehicles = res.data?.vehicles || [];
            
            // Filter to only active vehicles
            const activeVehicles = vehicles.filter(v => v.status === 'Active');
            
            select.innerHTML = '<option value="">Select vehicle...</option>' +
                activeVehicles.map(v => {
                    const driverIndicator = v.assigned_driver_id 
                        ? `✓ ${v.driver_name}` 
                        : '⚠ No driver';
                    return `<option value="${v.number_plate}" data-vehicle-id="${v.id}">${v.vehicle_name} (${v.number_plate}) - ${driverIndicator}</option>`;
                }).join('');
        } catch (error) {
            select.innerHTML = '<option value="">Failed to load vehicles</option>';
        }
    }

    _renderCargoRows(initialRows = []) {
        const list = this.querySelector('#editTripCargoItemsList');
        if (!list) {
            return;
        }

        if (!Array.isArray(this._cargoCatalog) || this._cargoCatalog.length === 0) {
            list.innerHTML = `
                <div class="step-hint" style="display: flex; align-items: center; gap: 8px; color: var(--muted);">
                    <i class="fas fa-box-open"></i> No cargo items found. Create cargo items from the Trips page catalog first.
                </div>
            `;
            return;
        }

        const rows = Array.isArray(initialRows) && initialRows.length > 0
            ? initialRows
            : [{}];

        list.innerHTML = '';
        rows.forEach((rowData) => {
            this._appendCargoRow(rowData);
        });
    }

    _appendCargoRow(rowData = {}) {
        const list = this.querySelector('#editTripCargoItemsList');
        if (!list || !Array.isArray(this._cargoCatalog) || this._cargoCatalog.length === 0) {
            return;
        }

        this._cargoRowSeed += 1;
        const rowId = `tm-edit-cargo-row-${this._cargoRowSeed}`;
        const selectedId = Number(rowData.cargo_item_db_id || rowData.cargo_item_id || 0);
        const selectedQuantity = rowData.quantity != null ? TMUtils.formatQuantity(rowData.quantity) : '';
        const selectedNotes = rowData.notes || '';

        const row = document.createElement('div');
        row.className = 'tm-cargo-row';
        row.dataset.rowId = rowId;
        row.style.display = 'grid';
        row.style.gridTemplateColumns = '2fr 1fr 1.5fr auto';
        row.style.gap = '8px';
        row.style.alignItems = 'center';
        row.style.padding = '10px';
        row.style.border = '1px solid var(--stone-200)';
        row.style.borderRadius = '8px';
        row.style.background = '#fff';

        const options = this._cargoCatalog.map((item) => {
            const id = Number(item.id || 0);
            const isSelected = id === selectedId;
            const dangerMark = Number(item.is_dangerous) === 1 ? ' [Dangerous]' : '';
            const unit = TMUtils.formatCargoUnit(item.unit || 'units');
            const capacity = TMUtils.formatCargoCapacity(item.capacity);
            return `<option value="${id}" ${isSelected ? 'selected' : ''}>${TMUtils.escapeHtml(item.name || item.cargo_item_id || `Cargo #${id}`)} (${TMUtils.escapeHtml(unit)} | ${TMUtils.escapeHtml(capacity)})${dangerMark}</option>`;
        }).join('');

        row.innerHTML = `
            <div>
                <select class="form-select tm-cargo-item-select">
                    <option value="">Select cargo item...</option>
                    ${options}
                </select>
                <div class="tm-cargo-danger" style="display:none; margin-top: 6px; font-size: 11px; color: #b91c1c; font-weight: 600;"></div>
            </div>
            <input type="number" class="form-input tm-cargo-quantity" min="0.001" step="0.001" placeholder="Qty" value="${TMUtils.escapeHtml(selectedQuantity)}">
            <input type="text" class="form-input tm-cargo-notes" placeholder="Notes (optional)" value="${TMUtils.escapeHtml(selectedNotes)}">
            <button type="button" class="btn btn-danger btn-small" data-action="remove-cargo-row" title="Remove cargo row">
                <i class="fas fa-trash"></i>
            </button>
        `;

        list.appendChild(row);
        this._renderCargoDangerBadge(row);
    }

    _renderCargoDangerBadge(row) {
        if (!row) {
            return;
        }

        const select = row.querySelector('.tm-cargo-item-select');
        const badge = row.querySelector('.tm-cargo-danger');
        if (!select || !badge) {
            return;
        }

        const selectedId = Number(select.value || 0);
        const selectedItem = this._cargoCatalog.find((item) => Number(item.id) === selectedId);
        const isDangerous = Number(selectedItem?.is_dangerous) === 1;

        if (isDangerous) {
            badge.style.display = 'block';
            badge.innerHTML = '<i class="fas fa-radiation"></i> Dangerous cargo';
        } else {
            badge.style.display = 'none';
            badge.textContent = '';
        }
    }

    _collectCargoAssignments() {
        const rows = Array.from(this.querySelectorAll('.tm-cargo-row'));
        const mergedByItem = new Map();

        for (let index = 0; index < rows.length; index += 1) {
            const row = rows[index];
            const itemId = Number(row.querySelector('.tm-cargo-item-select')?.value || 0);
            const quantityRaw = String(row.querySelector('.tm-cargo-quantity')?.value || '').trim();
            const notes = String(row.querySelector('.tm-cargo-notes')?.value || '').trim();

            if (!itemId && !quantityRaw && !notes) {
                continue;
            }

            if (!itemId) {
                throw new Error(`Cargo row ${index + 1}: select a cargo item`);
            }

            const quantity = Number(quantityRaw);
            if (!Number.isFinite(quantity) || quantity <= 0) {
                throw new Error(`Cargo row ${index + 1}: quantity must be greater than 0`);
            }

            if (mergedByItem.has(itemId)) {
                const current = mergedByItem.get(itemId);
                current.quantity = Number((current.quantity + quantity).toFixed(3));
                if (notes) {
                    current.notes = current.notes ? `${current.notes}; ${notes}` : notes;
                }
            } else {
                mergedByItem.set(itemId, {
                    cargo_item_id: itemId,
                    quantity: Number(quantity.toFixed(3)),
                    notes: notes || null,
                });
            }
        }

        return Array.from(mergedByItem.values());
    }

    async _onVehicleChange(numberPlate) {
        const infoContainer = this.querySelector('#editVehicleDriverInfo');
        const submitBtn = this.querySelector('#editTripSubmit');
        
        if (!numberPlate) {
            this._hideVehicleDriverInfo();
            this._vehicleTripCount = 0;
            if (submitBtn) submitBtn.disabled = false;
            return;
        }

        // Show loading
        if (infoContainer) {
            infoContainer.style.display = 'block';
            infoContainer.innerHTML = `
                <div class="loading-state" style="padding: 15px; text-align: center;">
                    <i class="fas fa-spinner fa-spin"></i> Loading vehicle info...
                </div>
            `;
        }

        try {
            // Fetch vehicle with driver and trips in parallel
            const [vehicleRes, tripsRes] = await Promise.all([
                API.get(`/vehicles/${encodeURIComponent(numberPlate)}/with-driver`),
                API.get('/trips')
            ]);
            
            this._selectedVehicle = vehicleRes.data?.vehicle;
            
            // Count active trips for this vehicle (Pending, Accepted, In Progress)
            // Exclude the current trip being edited
            const allTrips = tripsRes.data?.trips || [];
            const activeStatuses = ['Pending', 'Accepted', 'In Progress'];
            this._vehicleTripCount = allTrips.filter(t => 
                t.vehicle_registration === numberPlate && 
                activeStatuses.includes(t.status) &&
                t.trip_id !== this._trip?.trip_id
            ).length;
            
            this._renderVehicleDriverInfo();
        } catch (error) {
            if (infoContainer) {
                infoContainer.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-circle"></i> 
                        Failed to load vehicle information: ${error.message}
                    </div>
                `;
            }
            if (submitBtn) submitBtn.disabled = true;
        }
    }

    _renderVehicleDriverInfo() {
        const infoContainer = this.querySelector('#editVehicleDriverInfo');
        const submitBtn = this.querySelector('#editTripSubmit');
        
        if (!infoContainer || !this._selectedVehicle) return;

        const v = this._selectedVehicle;
        const hasDriver = !!v.assigned_driver_id;
        const tripCount = this._vehicleTripCount || 0;
        
        // Trip count indicator
        const tripCountHtml = `
            <div class="vehicle-trip-count" style="margin-top: 12px; padding: 10px; background: ${tripCount > 0 ? 'rgba(59, 130, 246, 0.1)' : 'var(--stone-100)'}; border-radius: 6px; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-route" style="color: ${tripCount > 0 ? 'var(--royal-blue)' : 'var(--muted)'};"></i>
                <span style="font-size: 0.9rem; color: var(--text-700);">
                    <strong>${tripCount}</strong> other active trip${tripCount !== 1 ? 's' : ''} assigned to this vehicle
                </span>
            </div>
        `;

        if (hasDriver) {
            infoContainer.innerHTML = `
                <div class="driver-info-card success">
                    <div class="driver-info-header">
                        <i class="fas fa-user-check"></i> Assigned Driver
                    </div>
                    <div class="driver-info-body">
                        <div class="driver-name">${v.driver_name || 'Unknown'}</div>
                        <div class="driver-id"><i class="fas fa-id-badge"></i> ${v.driver_employee_id || 'N/A'}</div>
                        ${v.driver_phone ? `<div class="driver-phone"><i class="fas fa-phone"></i> ${v.driver_phone}</div>` : ''}
                    </div>
                </div>
                ${tripCountHtml}
            `;
            if (submitBtn) submitBtn.disabled = false;
        } else {
            infoContainer.innerHTML = `
                <div class="driver-info-card warning">
                    <div class="driver-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        <div>
                            <strong>No Driver Assigned</strong>
                            <p>This vehicle has no assigned driver. Please assign a driver in the <strong>Driver Assignment</strong> section before saving.</p>
                        </div>
                    </div>
                </div>
                ${tripCountHtml}
            `;
            if (submitBtn) submitBtn.disabled = true;
        }

        infoContainer.style.display = 'block';
    }

    _hideVehicleDriverInfo() {
        const infoContainer = this.querySelector('#editVehicleDriverInfo');
        if (infoContainer) {
            infoContainer.style.display = 'none';
            infoContainer.innerHTML = '';
        }
    }

    _showErrors(message) {
        const errorsDiv = this.querySelector('#editTripErrors');
        if (errorsDiv) {
            errorsDiv.textContent = message;
            errorsDiv.style.display = 'block';
        }
    }

    _hideErrors() {
        const errorsDiv = this.querySelector('#editTripErrors');
        if (errorsDiv) {
            errorsDiv.style.display = 'none';
        }
    }

    async submit() {
        this._hideErrors();

        if (!this._trip) {
            return this._showErrors('Trip data not loaded.');
        }

        const origin = this.querySelector('#editTripOrigin')?.value.trim();
        const destination = this.querySelector('#editTripDestination')?.value.trim();
        const vehicle_registration = this.querySelector('#editTripVehicle')?.value;
        const cargo_description = this.querySelector('#editTripCargo')?.value.trim();
        let cargoAssignments = [];

        if (!origin) return this._showErrors('Origin is required.');
        if (!destination) return this._showErrors('Destination is required.');
        if (!vehicle_registration) return this._showErrors('Please select a vehicle.');
        
        // Verify vehicle has assigned driver
        if (!this._selectedVehicle || !this._selectedVehicle.assigned_driver_id) {
            return this._showErrors('Selected vehicle has no assigned driver. Please assign a driver first.');
        }

        try {
            cargoAssignments = this._collectCargoAssignments();
        } catch (error) {
            return this._showErrors(error.message || 'Invalid cargo rows.');
        }

        const submitBtn = this.querySelector('#editTripSubmit');
        const originalText = submitBtn?.innerHTML;
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            submitBtn.disabled = true;
        }

        try {
            await API.put(`/trips/${this._trip.trip_id}`, {
                origin,
                destination,
                vehicle_registration,
                cargo_description,
                cargo_items: cargoAssignments,
            });

            this.close();
            TMUtils.emitToast('Trip updated successfully', 'success');
            
            document.dispatchEvent(new CustomEvent('tm-modal:trip-updated', { bubbles: true }));
        } catch (error) {
            this._showErrors(error.message || 'Failed to update trip.');
        } finally {
            if (submitBtn) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }
    }
}

customElements.define('tm-edit-trip-modal', TMEditTripModal);
