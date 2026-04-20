class DriverBreakdownModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.editingId = null;
        this.render();
        this.bindEvents();

        DriverUtils.on('driver:modal-open', (event) => {
            if (event.detail?.id === 'breakdownModal') {
                this.open(event.detail?.payload || {});
            }
        });

        DriverUtils.on('driver:modal-close', (event) => {
            if (event.detail?.id === 'breakdownModal') {
                this.close();
            }
        });
    }

    render() {
        this.innerHTML = `
            <div id="breakdownModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="breakdownModalTitle"><i class="fas fa-exclamation-triangle"></i> Report Vehicle Breakdown</h2>
                        <button class="btn-close" type="button" data-action="close-modal"><i class="fas fa-times"></i></button>
                    </div>
                    <form id="breakdownForm">
                        <div class="form-section">
                            <div class="form-grid">
                                <div class="form-group" id="breakdownVehicleContainer">
                                    <label class="form-label">Vehicle *</label>
                                    <!-- Will be populated dynamically: readonly input if assigned, dropdown if not -->
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Urgency Level *</label>
                                    <select id="breakdownSeverity" class="form-select" required>
                                        <option value="">Select Urgency</option>
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Problem Category *</label>
                                <select id="breakdownType" class="form-select" required>
                                    <option value="">Select Category</option>
                                    <option value="engine">Engine</option>
                                    <option value="transmission">Transmission</option>
                                    <option value="brakes">Brakes</option>
                                    <option value="electrical">Electrical</option>
                                    <option value="cooling">Cooling</option>
                                    <option value="tires">Tires</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-section">
                            <label class="form-label">Problem Description *</label>
                            <textarea id="breakdownDescription" class="form-textarea" required></textarea>
                        </div>

                        <div class="form-section">
                            <h5><i class="fas fa-camera"></i> Photo Documentation</h5>
                            <div class="photo-upload" data-action="open-photo-picker">
                                <div style="font-size: 2rem; margin-bottom: 10px;"><i class="fas fa-camera"></i></div>
                                <div style="font-weight: 600; margin-bottom: 5px;">Click to upload photos</div>
                                <input type="file" id="breakdownPhotos" multiple accept="image/*" style="display: none;">
                            </div>
                            <div id="breakdownPhotoList" style="margin-top: 10px;"></div>
                        </div>

                        <button type="submit" class="btn btn-primary" id="breakdownSubmitBtn">Submit Breakdown Report</button>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#breakdownModal');
        const form = this.querySelector('#breakdownForm');
        const photoInput = this.querySelector('#breakdownPhotos');
        const photoList = this.querySelector('#breakdownPhotoList');

        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (event.target === modal || (actionEl && actionEl.dataset.action === 'close-modal')) {
                this.close();
                return;
            }

            if (actionEl && actionEl.dataset.action === 'open-photo-picker') {
                photoInput.click();
                return;
            }

            if (actionEl && actionEl.dataset.action === 'remove-photo') {
                actionEl.closest('[data-photo-item]')?.remove();
            }
        });

        photoInput.addEventListener('change', () => {
            photoList.innerHTML = '';
            Array.from(photoInput.files || []).forEach((file) => {
                const item = document.createElement('div');
                item.setAttribute('data-photo-item', 'true');
                item.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px;background:#f8f9fa;border-radius:6px;margin-bottom:5px;';
                item.innerHTML = `
                    <span style="font-size:14px;">${file.name}</span>
                    <button type="button" class="btn btn-small btn-danger" data-action="remove-photo">Remove</button>
                `;
                photoList.appendChild(item);
            });
        });

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const selectedVehicle = this.getSelectedVehicle();
            if (!selectedVehicle) {
                DriverUtils.showToast('Please select a vehicle.', 'error');
                return;
            }

            const payload = {
                vehicle_id: selectedVehicle.id,
                severity: form.querySelector('#breakdownSeverity').value,
                breakdown_type: form.querySelector('#breakdownType').value,
                description: form.querySelector('#breakdownDescription').value.trim(),
            };

            try {
                const response = this.editingId
                    ? await DriverUtils.apiPut(`/breakdown-reports/${encodeURIComponent(this.editingId)}`, payload)
                    : await DriverUtils.apiPost('/breakdown-reports', payload);

                if (response && (response.success || response.status === 'success')) {
                    DriverUtils.showToast(this.editingId ? 'Breakdown report updated.' : 'Breakdown report submitted.');
                    this.close();
                    form.reset();
                    this.editingId = null;
                    photoList.innerHTML = '';
                    DriverUtils.emit('driver:data-breakdowns-changed');
                    return;
                }

                DriverUtils.showToast(response?.message || 'Failed to submit breakdown report.', 'error');
            } catch (error) {
                console.error('Failed to submit breakdown report:', error);
                DriverUtils.showToast('Failed to submit breakdown report. Please try again.', 'error');
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
        const form = this.querySelector('#breakdownForm');
        const title = this.querySelector('#breakdownModalTitle');
        const submit = this.querySelector('#breakdownSubmitBtn');
        const vehicleFieldContainer = this.querySelector('#breakdownVehicleContainer');
        const editItem = payload?.editItem || null;

        form.reset();
        this.querySelector('#breakdownPhotoList').innerHTML = '';
        this.assignedVehicle = null;
        this.allVehicles = [];

        // Check for assigned vehicle first
        try {
            const vehicleResponse = await DriverUtils.apiGet('/vehicles/my-vehicle');
            if (vehicleResponse && vehicleResponse.status === 'success' && vehicleResponse.data) {
                this.assignedVehicle = vehicleResponse.data;
                vehicleFieldContainer.innerHTML = `
                    <label class="form-label">Vehicle * <span style="color: #4caf50; font-size: 12px;">(Assigned)</span></label>
                    <input type="text" class="form-input" id="vehicleDisplay" 
                           value="${this.assignedVehicle.number_plate} - ${this.assignedVehicle.vehicle_name || this.assignedVehicle.vehicle_type || 'Vehicle'}" 
                           readonly style="background: #f5f5f5; cursor: not-allowed;">
                `;
            } else {
                await this.loadVehicleDropdown(vehicleFieldContainer);
            }
        } catch (error) {
            console.error('Failed to fetch assigned vehicle:', error);
            await this.loadVehicleDropdown(vehicleFieldContainer);
        }

        if (editItem) {
            this.editingId = editItem.id;
            title.innerHTML = '<i class="fas fa-edit"></i> Edit Breakdown Report';
            submit.textContent = 'Update Breakdown Report';
            form.querySelector('#breakdownSeverity').value = editItem.severity || '';
            form.querySelector('#breakdownType').value = editItem.category || editItem.breakdown_type || '';
            form.querySelector('#breakdownDescription').value = editItem.description || '';
        } else {
            this.editingId = null;
            title.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Report Vehicle Breakdown';
            submit.textContent = 'Submit Breakdown Report';
        }

        DriverUtils.setModalState(this.querySelector('#breakdownModal'), true);
    }

    async loadVehicleDropdown(container) {
        try {
            const response = await DriverUtils.apiGet('/vehicles');
            if (response && response.status === 'success' && response.data?.vehicles) {
                this.allVehicles = response.data.vehicles;
                container.innerHTML = `
                    <label class="form-label">Vehicle * <span style="color: #ff9800; font-size: 12px;">(Select from list)</span></label>
                    <select class="form-input" id="vehicleSelect" required>
                        <option value="">Select a vehicle</option>
                        ${this.allVehicles.map(v => `
                            <option value="${v.number_plate}">
                                ${v.number_plate} - ${v.vehicle_name || v.vehicle_type || 'Vehicle'}
                            </option>
                        `).join('')}
                    </select>
                `;
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
        DriverUtils.setModalState(this.querySelector('#breakdownModal'), false);
    }
}

customElements.define('driver-breakdown-modal', DriverBreakdownModal);
