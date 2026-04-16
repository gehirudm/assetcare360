class DriverDailyCheckModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.resubmitCheckId = null;
        this.render();
        this.bindEvents();

        DriverUtils.on('driver:modal-open', (event) => {
            if (event.detail?.id === 'dailyCheckModal') {
                this.open(event.detail?.payload || {});
            }
        });

        DriverUtils.on('driver:modal-close', (event) => {
            if (event.detail?.id === 'dailyCheckModal') {
                this.close();
            }
        });
    }

    render() {
        this.innerHTML = `
            <div id="dailyCheckModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="dailyCheckTitle"><i class="fas fa-clipboard-check"></i> Submit Weekly Vehicle Check</h2>
                        <button class="btn-close" type="button" data-action="close-modal"><i class="fas fa-times"></i></button>
                    </div>
                    <form id="dailyCheckForm">
                        <div id="rejectionReasonBanner" style="display:none;"></div>
                        <div class="form-section">
                            <h5><i class="fas fa-truck"></i> Vehicle & Inspection Details</h5>
                            <div class="form-grid">
                                <div class="form-group" id="vehicleFieldContainer">
                                    <label class="form-label">Vehicle *</label>
                                    <!-- Will be populated dynamically: readonly input if assigned, dropdown if not -->
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Current Odometer Reading (km) *</label>
                                    <input type="number" class="form-input" id="weeklyCheckOdometer" min="0" required>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Week Ending Date *</label>
                                <input type="date" class="form-input" id="weekEndingDate" required>
                            </div>
                        </div>

                        <div class="form-section">
                            <h5><i class="fas fa-check-square"></i> Weekly Inspection Checklist</h5>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                ${['engineOil', 'brakes', 'lights', 'tires', 'coolant', 'wipers'].map((name) => `
                                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                                        <input type="checkbox" name="${name}" style="width: 18px; height: 18px;" required>
                                        <span>${this.getLabel(name)}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>

                        <div class="form-section">
                            <h5><i class="fas fa-sticky-note"></i> Additional Notes</h5>
                            <textarea id="weeklyCheckNotes" class="form-textarea" placeholder="Optional notes or observations about vehicle condition..."></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary"><i class="fas fa-paper-plane"></i> Submit Weekly Check</button>
                    </form>
                </div>
            </div>
        `;
    }

    getLabel(key) {
        const map = {
            engineOil: 'Engine Oil Level',
            brakes: 'Brake System',
            lights: 'All Lights & Indicators',
            tires: 'Tire Pressure & Condition',
            coolant: 'Coolant Level',
            wipers: 'Wipers & Washers',
        };

        return map[key] || key;
    }

    bindEvents() {
        const modal = this.querySelector('#dailyCheckModal');
        const form = this.querySelector('#dailyCheckForm');

        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (event.target === modal || (actionEl && actionEl.dataset.action === 'close-modal')) {
                this.close();
            }
        });

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const requiredChecks = ['engineOil', 'brakes', 'lights', 'tires', 'coolant', 'wipers'];
            const hasAllChecked = requiredChecks.every((name) => form.elements[name]?.checked);
            if (!hasAllChecked) {
                window.alert('All checklist items must be checked before submission.');
                return;
            }
            
            if (!this.assignedVehicle && !this.getSelectedVehicle()) {
                DriverUtils.showToast('Please select a vehicle.', 'error');
                return;
            }
            
            const selectedVehicle = this.getSelectedVehicle();

            const payload = {
                vehicle_registration: selectedVehicle.number_plate,
                driver_id: DriverUtils.store.currentUser?.id || 1,
                odometer_reading: Number.parseInt(form.querySelector('#weeklyCheckOdometer').value, 10),
                week_end_date: form.querySelector('#weekEndingDate').value,
                engine_oil: true,
                brakes: true,
                lights: true,
                tires: true,
                coolant: true,
                wipers: true,
                notes: form.querySelector('#weeklyCheckNotes').value.trim(),
                resubmitted_from_check_id: this.resubmitCheckId,
            };

            try {
                const response = await DriverUtils.apiPost('/vehicle-checks', payload);
                if (response && (response.success || response.status === 'success')) {
                    DriverUtils.showToast('Weekly vehicle check submitted successfully.');
                    this.close();
                    form.reset();
                    this.resubmitCheckId = null;
                    DriverUtils.emit('driver:data-checks-changed');
                    return;
                }

                DriverUtils.showToast(response?.message || 'Failed to submit weekly check.', 'error');
            } catch (error) {
                console.error('Failed to submit weekly check:', error);
                DriverUtils.showToast('Failed to submit weekly check. Please try again.', 'error');
            }
        });
    }

    getSelectedVehicle() {
        if (this.assignedVehicle) {
            return this.assignedVehicle;
        }
        const select = this.querySelector('#vehicleSelect');
        if (select && select.value) {
            return this.allVehicles?.find(v => v.number_plate === select.value) || null;
        }
        return null;
    }

    async open(payload) {
        const form = this.querySelector('#dailyCheckForm');
        const title = this.querySelector('#dailyCheckTitle');
        const rejectionBanner = this.querySelector('#rejectionReasonBanner');
        const odometerInput = form.querySelector('#weeklyCheckOdometer');
        const vehicleFieldContainer = this.querySelector('#vehicleFieldContainer');

        form.reset();
        this.resubmitCheckId = null;
        this.assignedVehicle = null;
        this.allVehicles = [];
        
        // Check for assigned vehicle first
        try {
            const vehicleResponse = await DriverUtils.apiGet('/vehicles/my-vehicle');
            if (vehicleResponse && vehicleResponse.status === 'success' && vehicleResponse.data) {
                this.assignedVehicle = vehicleResponse.data;
                const currentMileage = parseInt(this.assignedVehicle.current_mileage, 10) || 0;
                odometerInput.min = currentMileage;
                odometerInput.placeholder = `Must be at least ${currentMileage.toLocaleString()} km`;
                odometerInput.value = currentMileage;
                
                // Show readonly input with assigned vehicle
                vehicleFieldContainer.innerHTML = `
                    <label class="form-label">Vehicle * <span style="color: #4caf50; font-size: 12px;">(Assigned)</span></label>
                    <input type="text" class="form-input" id="vehicleDisplay" 
                           value="${this.assignedVehicle.number_plate} - ${this.assignedVehicle.vehicle_name || this.assignedVehicle.vehicle_type || 'Vehicle'}" 
                           readonly style="background: #f5f5f5; cursor: not-allowed;">
                `;
            } else {
                // No assigned vehicle - fetch all vehicles for dropdown
                await this.loadVehicleDropdown(vehicleFieldContainer, odometerInput);
            }
        } catch (error) {
            console.error('Failed to fetch assigned vehicle:', error);
            // Fallback to vehicle dropdown
            await this.loadVehicleDropdown(vehicleFieldContainer, odometerInput);
        }

        const sunday = new Date();
        const day = sunday.getDay();
        if (day !== 0) {
            sunday.setDate(sunday.getDate() + (7 - day));
        }
        sunday.setHours(0, 0, 0, 0);
        form.querySelector('#weekEndingDate').value = sunday.toISOString().split('T')[0];

        if (payload?.resubmitCheck) {
            const check = payload.resubmitCheck;
            this.resubmitCheckId = check.check_id;
            title.innerHTML = '<i class="fas fa-redo"></i> Resubmit Weekly Vehicle Check';
            odometerInput.value = check.odometer_reading || odometerInput.value;
            form.querySelector('#weekEndingDate').value = check.week_end_date || form.querySelector('#weekEndingDate').value;
            rejectionBanner.style.display = 'block';
            rejectionBanner.innerHTML = `
                <div style="margin-bottom: 15px; padding: 12px 16px; background: #fdecea; border-left: 4px solid #e74c3c; border-radius: 4px;">
                    <strong style="color: #c0392b;">Rejected Reason:</strong>
                    <p style="margin: 8px 0 0 0; color: #555;">${check.rejection_reason || 'No reason provided'}</p>
                </div>
            `;
        } else {
            title.innerHTML = '<i class="fas fa-clipboard-check"></i> Submit Weekly Vehicle Check';
            rejectionBanner.style.display = 'none';
            rejectionBanner.innerHTML = '';
        }

        DriverUtils.setModalState(this.querySelector('#dailyCheckModal'), true);
    }

    async loadVehicleDropdown(container, odometerInput) {
        try {
            const response = await DriverUtils.apiGet('/vehicles');
            if (response && response.status === 'success' && response.data?.vehicles) {
                this.allVehicles = response.data.vehicles;
                container.innerHTML = `
                    <label class="form-label">Vehicle * <span style="color: #ff9800; font-size: 12px;">(Select from list)</span></label>
                    <select class="form-input" id="vehicleSelect" required>
                        <option value="">Select a vehicle</option>
                        ${this.allVehicles.map(v => `
                            <option value="${v.number_plate}" data-mileage="${v.current_mileage || 0}">
                                ${v.number_plate} - ${v.vehicle_name || v.vehicle_type || 'Vehicle'}
                            </option>
                        `).join('')}
                    </select>
                `;
                
                // Update odometer when vehicle selection changes
                const select = container.querySelector('#vehicleSelect');
                select.addEventListener('change', () => {
                    const selectedOption = select.options[select.selectedIndex];
                    if (selectedOption && selectedOption.value) {
                        const mileage = parseInt(selectedOption.dataset.mileage, 10) || 0;
                        odometerInput.min = mileage;
                        odometerInput.placeholder = `Must be at least ${mileage.toLocaleString()} km`;
                        odometerInput.value = mileage;
                    } else {
                        odometerInput.min = 0;
                        odometerInput.placeholder = '';
                        odometerInput.value = '';
                    }
                });
            } else {
                container.innerHTML = `
                    <label class="form-label">Vehicle *</label>
                    <div style="padding: 10px; background: #fff3e0; border: 1px solid #ff9800; border-radius: 4px; color: #e65100;">
                        <i class="fas fa-exclamation-triangle"></i> Failed to load vehicles. Please try again.
                    </div>
                `;
            }
        } catch (error) {
            console.error('Failed to load vehicles:', error);
            container.innerHTML = `
                <label class="form-label">Vehicle *</label>
                <div style="padding: 10px; background: #fff3e0; border: 1px solid #ff9800; border-radius: 4px; color: #e65100;">
                    <i class="fas fa-exclamation-triangle"></i> Failed to load vehicles. Please try again.
                </div>
            `;
        }
    }

    close() {
        DriverUtils.setModalState(this.querySelector('#dailyCheckModal'), false);
    }
}

customElements.define('driver-daily-check-modal', DriverDailyCheckModal);
