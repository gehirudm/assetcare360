class DriverFuelMileageModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.assignedVehicle = null;
        this.render();
        this.bindEvents();
        DriverUtils.ensureTodayDefaults(this);

        DriverUtils.on('driver:modal-open', (event) => {
            if (event.detail?.id === 'fuelMileageModal') {
                this.open();
            }
        });

        DriverUtils.on('driver:modal-close', (event) => {
            if (event.detail?.id === 'fuelMileageModal') {
                this.close();
            }
        });
    }

    render() {
        this.innerHTML = `
            <div id="fuelMileageModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-gas-pump"></i> Log Fuel & Mileage</h2>
                        <button class="btn-close" type="button" data-action="close-modal"><i class="fas fa-times"></i></button>
                    </div>
                    <form id="fuelMileageForm">
                        <div class="form-section">
                            <div class="form-grid">
                                <div class="form-group" id="vehicleFieldContainer">
                                    <label class="form-label">Vehicle *</label>
                                    <!-- Will be populated dynamically: readonly input if assigned, dropdown if not -->
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Current Odometer (km) *</label>
                                    <input type="number" class="form-input" id="fuelOdometer" min="0" required>
                                </div>
                            </div>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Fuel Volume (L) *</label>
                                    <input type="number" class="form-input" id="fuelVolume" min="0" step="0.01" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Fuel Source *</label>
                                    <select class="form-input" id="fuelSource" required>
                                        <option value="external" selected>External Fuel Station</option>
                                        <option value="internal">Internal Depot</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Date & Time *</label>
                                    <input type="datetime-local" class="form-input" id="fuelDateTime" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Fuel Type (From Vehicle)</label>
                                    <input type="text" class="form-input" id="fuelTypeDisplay" readonly placeholder="Select vehicle to derive fuel type" style="background: #f5f5f5; cursor: not-allowed;">
                                </div>
                            </div>
                            <div class="form-group" id="fuelCostGroup">
                                <label class="form-label">Total Cost (Rs) <span id="fuelCostRequiredMark">*</span></label>
                                <input type="number" class="form-input" id="fuelCost" min="0" step="0.01" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Station Name</label>
                                <input type="text" class="form-input" id="stationName" placeholder="Enter fuel station name (optional)">
                            </div>
                            <div class="form-group" id="billUploadGroup">
                                <label class="form-label"><i class="fas fa-receipt"></i> Attach Bill/Receipt <span id="billRequiredMark">*</span></label>
                                <div class="bill-upload-area" data-action="open-bill-picker" style="border: 2px dashed #ccc; border-radius: 8px; padding: 20px; text-align: center; cursor: pointer; background: #f9f9f9;">
                                    <i class="fas fa-cloud-upload-alt" style="font-size: 24px; color: #666;"></i>
                                    <p style="margin: 8px 0 0 0; color: #666;" id="billUploadHint">Click to upload bill image</p>
                                    <input type="file" id="billImage" accept="image/*" style="display: none;">
                                </div>
                                <div id="billPreview" style="display: none; margin-top: 10px; position: relative;">
                                    <img id="billPreviewImg" src="" style="max-width: 100%; max-height: 150px; border-radius: 8px;">
                                    <button type="button" data-action="remove-bill" style="position: absolute; top: 5px; right: 5px; background: rgba(255,0,0,0.8); color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer;">×</button>
                                </div>
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary">Save Fuel Log</button>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#fuelMileageModal');
        const form = this.querySelector('#fuelMileageForm');

        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (event.target === modal || (actionEl && actionEl.dataset.action === 'close-modal')) {
                this.close();
            }
            if (actionEl && actionEl.dataset.action === 'open-bill-picker') {
                this.querySelector('#billImage').click();
            }
            if (actionEl && actionEl.dataset.action === 'remove-bill') {
                this.querySelector('#billImage').value = '';
                this.querySelector('#billPreview').style.display = 'none';
            }
        });

        // Bill image preview handler
        this.querySelector('#billImage').addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.querySelector('#billPreviewImg').src = e.target.result;
                    this.querySelector('#billPreview').style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });

        const fuelSourceSelect = this.querySelector('#fuelSource');
        if (fuelSourceSelect) {
            fuelSourceSelect.addEventListener('change', () => {
                this.updateFuelRequirementUI(fuelSourceSelect.value);
            });
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            // Get selected vehicle (either assigned or from dropdown)
            const selectedVehicle = this.getSelectedVehicle();
            if (!selectedVehicle) {
                DriverUtils.showToast('Please select a vehicle.', 'error');
                return;
            }
            
            // Use FormData to support file upload
            const formData = new FormData();
            formData.append('vehicle_registration', selectedVehicle.number_plate);
            formData.append('fuel_volume', parseFloat(form.querySelector('#fuelVolume').value));
            formData.append('odometer_reading', parseInt(form.querySelector('#fuelOdometer').value, 10));
            // Convert datetime-local format to SQL datetime
            const logDateTime = form.querySelector('#fuelDateTime').value;
            formData.append('log_datetime', logDateTime.replace('T', ' ') + ':00');
            const fuelSource = form.querySelector('#fuelSource').value;
            formData.append('fuel_source', fuelSource);
            const stationName = form.querySelector('#stationName').value.trim();
            if (stationName) {
                formData.append('station_name', stationName);
            }

            if (fuelSource === 'external') {
                const totalCost = parseFloat(form.querySelector('#fuelCost').value);
                if (!Number.isFinite(totalCost) || totalCost <= 0) {
                    DriverUtils.showToast('Total cost is required for external fueling.', 'error');
                    return;
                }
                formData.append('total_cost', totalCost);
            }

            // Attach the logged-in driver's ID
            const driverId = DriverUtils.store.currentUser?.id;
            if (driverId) {
                formData.append('driver_id', driverId);
            }
            
            // Add bill image if selected
            const billImageInput = this.querySelector('#billImage');
            if (fuelSource === 'external' && (!billImageInput.files || !billImageInput.files[0])) {
                DriverUtils.showToast('Bill/receipt image is required for external fueling.', 'error');
                return;
            }
            if (billImageInput.files && billImageInput.files[0]) {
                formData.append('bill_image', billImageInput.files[0]);
            }
            
            try {
                const response = await DriverUtils.apiPostFormData('/fuel-logs', formData);
                if (response && (response.success || response.status === 'success')) {
                    DriverUtils.showToast('Fuel log saved successfully.');
                    this.close();
                    form.reset();
                    this.querySelector('#billPreview').style.display = 'none';
                    DriverUtils.ensureTodayDefaults(form);
                    DriverUtils.emit('driver:data-fuel-changed');
                    return;
                }
                
                DriverUtils.showToast(response?.message || 'Failed to save fuel log.', 'error');
            } catch (error) {
                console.error('Failed to save fuel log:', error);
                DriverUtils.showToast('Failed to save fuel log. Please try again.', 'error');
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

    async open() {
        const form = this.querySelector('#fuelMileageForm');
        const odometerInput = form.querySelector('#fuelOdometer');
        const vehicleFieldContainer = this.querySelector('#vehicleFieldContainer');
        const fuelSourceSelect = form.querySelector('#fuelSource');
        
        form.reset();
        DriverUtils.ensureTodayDefaults(form);
        this.assignedVehicle = null;
        this.allVehicles = [];
        if (fuelSourceSelect) {
            fuelSourceSelect.value = 'external';
            this.updateFuelRequirementUI('external');
        }
        this.updateFuelTypeDisplay(null);
        
        // Check for assigned vehicle first
        try {
            const vehicleResponse = await DriverUtils.apiGet('/vehicles/my-vehicle');
            if (vehicleResponse && vehicleResponse.status === 'success' && vehicleResponse.data) {
                this.assignedVehicle = vehicleResponse.data;
                const currentMileage = parseInt(this.assignedVehicle.current_mileage, 10) || 0;
                odometerInput.min = currentMileage;
                odometerInput.placeholder = `Must be at least ${currentMileage.toLocaleString()} km`;
                odometerInput.value = currentMileage;
                this.updateFuelTypeDisplay(this.assignedVehicle.fuel_type || null);
                
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
        
        DriverUtils.setModalState(this.querySelector('#fuelMileageModal'), true);
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
                            <option value="${v.number_plate}" data-mileage="${v.current_mileage || 0}" data-fuel-type="${v.fuel_type || ''}">
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
                        this.updateFuelTypeDisplay(selectedOption.dataset.fuelType || null);
                    } else {
                        odometerInput.min = 0;
                        odometerInput.placeholder = '';
                        odometerInput.value = '';
                        this.updateFuelTypeDisplay(null);
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

    updateFuelTypeDisplay(fuelType) {
        const display = this.querySelector('#fuelTypeDisplay');
        if (!display) {
            return;
        }

        display.value = fuelType || 'Auto-derived when vehicle is selected';
    }

    updateFuelRequirementUI(source) {
        const isExternal = source === 'external';
        const fuelCostGroup = this.querySelector('#fuelCostGroup');
        const fuelCostInput = this.querySelector('#fuelCost');
        const fuelCostRequiredMark = this.querySelector('#fuelCostRequiredMark');
        const billUploadGroup = this.querySelector('#billUploadGroup');
        const billRequiredMark = this.querySelector('#billRequiredMark');
        const billUploadHint = this.querySelector('#billUploadHint');

        if (fuelCostGroup) {
            fuelCostGroup.style.display = isExternal ? '' : 'none';
        }
        if (fuelCostInput) {
            fuelCostInput.required = isExternal;
            if (!isExternal) {
                fuelCostInput.value = '';
            }
        }
        if (fuelCostRequiredMark) {
            fuelCostRequiredMark.style.display = isExternal ? '' : 'none';
        }

        if (billUploadGroup) {
            billUploadGroup.style.display = isExternal ? '' : 'none';
        }
        if (billRequiredMark) {
            billRequiredMark.style.display = isExternal ? '' : 'none';
        }
        if (billUploadHint) {
            billUploadHint.textContent = isExternal
                ? 'Click to upload bill image (required for external fueling)'
                : 'Receipt is optional for internal fueling';
        }

        if (!isExternal) {
            const billInput = this.querySelector('#billImage');
            const billPreview = this.querySelector('#billPreview');
            if (billInput) {
                billInput.value = '';
            }
            if (billPreview) {
                billPreview.style.display = 'none';
            }
        }
    }

    close() {
        DriverUtils.setModalState(this.querySelector('#fuelMileageModal'), false);
    }
}

customElements.define('driver-fuel-mileage-modal', DriverFuelMileageModal);
