class SAAddServiceIntervalModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.vehicles = [];
        this.machines = [];
        this.mode = 'create';
        this.render();
        this.bindEvents();
    }

    render() {
        this.innerHTML = `
            <div id="addServiceIntervalModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <button class="close" type="button" data-close-modal>&times;</button>
                    <h2 id="saIntervalModalTitle" style="margin-bottom: 20px; color: var(--tang-blue);">Add Service Interval</h2>
                    <form id="addServiceIntervalForm">
                        <div class="form-section">
                            <h5><i class="fas fa-cog"></i> Service Configuration</h5>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label" for="saIntervalAssetType">Asset Type</label>
                                    <select id="saIntervalAssetType" class="form-select" name="asset_type" required>
                                        <option value="vehicle">Vehicle</option>
                                        <option value="machine">Machine</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label" for="saIntervalAssetId">Asset</label>
                                    <select id="saIntervalAssetId" class="form-select" name="asset_id" required>
                                        <option value="">Select Asset</option>
                                    </select>
                                </div>
                            </div>

                            <div id="saIntervalAssetSummary" class="form-section" style="margin-top: 10px; margin-bottom: 10px;">
                                <h5><i class="fas fa-info-circle"></i> Current Service Details</h5>
                                <div id="saIntervalAssetSummaryContent" style="font-size: 14px; color: var(--text-700);">
                                    Select an asset to view current service details.
                                </div>
                            </div>

                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label" for="saIntervalDays">Time Interval (days)</label>
                                    <input id="saIntervalDays" type="number" class="form-input" name="service_interval_days" min="1" placeholder="e.g., 90">
                                </div>

                                <div class="form-group" id="saVehicleKmGroup">
                                    <label class="form-label" for="saIntervalKm">Mileage Interval (km)</label>
                                    <input id="saIntervalKm" type="number" class="form-input" name="service_interval_km" min="1" placeholder="e.g., 5000">
                                </div>

                                <div class="form-group" id="saMachineHoursGroup" style="display: none;">
                                    <label class="form-label" for="saIntervalHours">Operating Hour Interval (hours)</label>
                                    <input id="saIntervalHours" type="number" class="form-input" name="service_interval_hours" min="1" placeholder="e.g., 250">
                                </div>
                            </div>

                            <p style="color: var(--muted); font-size: 13px; margin: 8px 0 0 0;">
                                Vehicles can be configured with time interval, mileage interval, or both. Machines can be configured with time interval, operating-hour interval, or both.
                            </p>
                        </div>

                        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
                            <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
                            <button id="saIntervalSubmitBtn" type="submit" class="btn btn-primary">Save Service Interval</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#addServiceIntervalModal');
        const form = this.querySelector('#addServiceIntervalForm');
        const assetTypeSelect = this.querySelector('#saIntervalAssetType');
        const assetSelect = this.querySelector('#saIntervalAssetId');

        this.addEventListener('click', (event) => {
            if (event.target === modal || event.target.closest('[data-close-modal]')) {
                this.close();
            }
        });

        assetTypeSelect?.addEventListener('change', () => {
            this.populateAssetOptions();
            this.applyAssetToForm();
        });

        assetSelect?.addEventListener('change', () => {
            this.applyAssetToForm();
        });

        form?.addEventListener('submit', (event) => {
            this.handleSubmit(event);
        });
    }

    openForInterval(options = {}) {
        this.mode = options.mode === 'edit' ? 'edit' : 'create';
        this.vehicles = Array.isArray(options.vehicles) ? options.vehicles : [];
        this.machines = Array.isArray(options.machines) ? options.machines : [];

        const assetTypeSelect = this.querySelector('#saIntervalAssetType');
        const modalTitle = this.querySelector('#saIntervalModalTitle');
        const submitButton = this.querySelector('#saIntervalSubmitBtn');
        const form = this.querySelector('#addServiceIntervalForm');

        if (form) {
            form.reset();
        }

        const preferredType = options.assetType || (this.vehicles.length > 0 ? 'vehicle' : 'machine');
        if (assetTypeSelect) {
            assetTypeSelect.value = preferredType;
        }

        this.populateAssetOptions(options.assetId ? String(options.assetId) : '');
        this.applyAssetToForm();

        if (modalTitle) {
            modalTitle.textContent = this.mode === 'edit' ? 'Edit Service Interval' : 'Add Service Interval';
        }

        if (submitButton) {
            submitButton.textContent = this.mode === 'edit' ? 'Update Service Interval' : 'Save Service Interval';
        }

        this.open();
    }

    open() {
        if (typeof window.openModal === 'function') {
            window.openModal('addServiceIntervalModal');
            return;
        }

        const modal = this.querySelector('#addServiceIntervalModal');
        if (!modal) {
            return;
        }

        modal.classList.add('active');
        modal.style.display = 'flex';
    }

    populateAssetOptions(selectedAssetId = '') {
        const assetTypeSelect = this.querySelector('#saIntervalAssetType');
        const assetSelect = this.querySelector('#saIntervalAssetId');
        if (!assetTypeSelect || !assetSelect) {
            return;
        }

        const assetType = assetTypeSelect.value;
        const assets = assetType === 'machine' ? this.machines : this.vehicles;

        const options = [
            '<option value="">Select Asset</option>',
            ...assets.map((asset) => {
                const id = String(asset.id);
                const code = assetType === 'machine'
                    ? (asset.machine_id || `Machine #${id}`)
                    : (asset.vehicle_id || `Vehicle #${id}`);
                const name = assetType === 'machine'
                    ? (asset.machine_name || 'Unnamed Machine')
                    : (asset.vehicle_name || asset.number_plate || 'Unnamed Vehicle');
                const selected = selectedAssetId === id ? 'selected' : '';
                return `<option value="${id}" ${selected}>${code} - ${name}</option>`;
            }),
        ];

        assetSelect.innerHTML = options.join('');
    }

    applyAssetToForm() {
        const assetTypeSelect = this.querySelector('#saIntervalAssetType');
        const assetSelect = this.querySelector('#saIntervalAssetId');
        const intervalDaysInput = this.querySelector('#saIntervalDays');
        const intervalKmInput = this.querySelector('#saIntervalKm');
        const intervalHoursInput = this.querySelector('#saIntervalHours');
        const vehicleKmGroup = this.querySelector('#saVehicleKmGroup');
        const machineHoursGroup = this.querySelector('#saMachineHoursGroup');
        const summaryContent = this.querySelector('#saIntervalAssetSummaryContent');

        if (!assetTypeSelect || !assetSelect || !intervalDaysInput || !intervalKmInput || !intervalHoursInput || !vehicleKmGroup || !machineHoursGroup || !summaryContent) {
            return;
        }

        const assetType = assetTypeSelect.value;
        vehicleKmGroup.style.display = assetType === 'vehicle' ? 'block' : 'none';
        machineHoursGroup.style.display = assetType === 'machine' ? 'block' : 'none';

        const selectedId = assetSelect.value;
        if (!selectedId) {
            intervalDaysInput.value = '';
            intervalKmInput.value = '';
            intervalHoursInput.value = '';
            summaryContent.textContent = 'Select an asset to view current service details.';
            return;
        }

        const assets = assetType === 'machine' ? this.machines : this.vehicles;
        const selectedAsset = assets.find((asset) => String(asset.id) === String(selectedId));
        if (!selectedAsset) {
            summaryContent.textContent = 'Unable to load selected asset details.';
            return;
        }

        intervalDaysInput.value = this.toInputValue(selectedAsset.service_interval_days);
        intervalKmInput.value = assetType === 'vehicle' ? this.toInputValue(selectedAsset.service_interval_km) : '';
        intervalHoursInput.value = assetType === 'machine' ? this.toInputValue(selectedAsset.service_interval_hours) : '';

        if (assetType === 'vehicle') {
            const code = selectedAsset.vehicle_id || `Vehicle #${selectedAsset.id}`;
            const mileage = this.formatNumber(selectedAsset.current_mileage);
            const nextMileage = this.formatNumber(selectedAsset.next_service_mileage);
            const nextDate = selectedAsset.next_service_date || 'N/A';
            summaryContent.innerHTML = `
                <strong>${code}</strong><br>
                Current mileage: ${mileage}<br>
                Next service mileage: ${nextMileage}<br>
                Next service date: ${nextDate}
            `;
            return;
        }

        const code = selectedAsset.machine_id || `Machine #${selectedAsset.id}`;
        const currentHours = this.formatNumber(selectedAsset.current_operating_hours);
        const nextHours = this.formatNumber(selectedAsset.next_service_hours);
        const nextDate = selectedAsset.next_service_date || 'N/A';
        summaryContent.innerHTML = `
            <strong>${code}</strong><br>
            Current operating hours: ${currentHours}<br>
            Next service hour threshold: ${nextHours}<br>
            Next service date: ${nextDate}
        `;
    }

    toInputValue(value) {
        return value === null || value === undefined || value === '' ? '' : String(value);
    }

    formatNumber(value) {
        if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) {
            return 'N/A';
        }

        return Number(value).toLocaleString();
    }

    parseOptionalPositiveInteger(rawValue, fieldLabel) {
        if (rawValue === null || rawValue === undefined || String(rawValue).trim() === '') {
            return null;
        }

        const parsed = Number(rawValue);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            throw new Error(`${fieldLabel} must be a positive number.`);
        }

        return Math.trunc(parsed);
    }

    resolveVehicleIntervalType(days, km) {
        if (days !== null && km !== null) {
            return 'Both';
        }

        if (km !== null) {
            return 'Mileage-Based';
        }

        return 'Time-Based';
    }

    async handleSubmit(event) {
        event.preventDefault();

        const assetTypeSelect = this.querySelector('#saIntervalAssetType');
        const assetSelect = this.querySelector('#saIntervalAssetId');
        const intervalDaysInput = this.querySelector('#saIntervalDays');
        const intervalKmInput = this.querySelector('#saIntervalKm');
        const intervalHoursInput = this.querySelector('#saIntervalHours');

        if (!assetTypeSelect || !assetSelect || !intervalDaysInput || !intervalKmInput || !intervalHoursInput) {
            this.emitToast('Unable to submit: form is not ready.', 'error');
            return;
        }

        const assetType = assetTypeSelect.value;
        const assetId = assetSelect.value;

        if (!assetId) {
            this.emitToast('Please select an asset.', 'warning');
            return;
        }

        let payload = {};
        let endpoint = '';

        try {
            const intervalDays = this.parseOptionalPositiveInteger(intervalDaysInput.value, 'Time interval (days)');

            if (assetType === 'vehicle') {
                const intervalKm = this.parseOptionalPositiveInteger(intervalKmInput.value, 'Mileage interval (km)');
                if (intervalDays === null && intervalKm === null) {
                    this.emitToast('Provide time interval, mileage interval, or both for vehicles.', 'warning');
                    return;
                }

                payload = {
                    service_interval_type: this.resolveVehicleIntervalType(intervalDays, intervalKm),
                    service_interval_days: intervalDays,
                    service_interval_km: intervalKm,
                };
                endpoint = `/vehicles/${assetId}`;
            } else {
                const intervalHours = this.parseOptionalPositiveInteger(intervalHoursInput.value, 'Operating-hour interval');
                if (intervalDays === null && intervalHours === null) {
                    this.emitToast('Provide time interval, operating-hour interval, or both for machines.', 'warning');
                    return;
                }

                payload = {
                    service_interval_days: intervalDays,
                    service_interval_hours: intervalHours,
                };
                endpoint = `/machines/${assetId}`;
            }

            const response = await API.put(endpoint, payload);
            if (response.status !== 'success') {
                this.emitToast(response.message || 'Failed to save service interval.', 'error');
                return;
            }

            const successMessage = this.mode === 'edit'
                ? 'Service interval updated successfully.'
                : 'Service interval saved successfully.';
            this.emitToast(successMessage, 'success');

            document.dispatchEvent(new CustomEvent('sa-service-config:interval-saved'));
            this.close();
        } catch (error) {
            console.error('Failed to save service interval:', error);
            this.emitToast(error.message || 'Failed to save service interval.', 'error');
        }
    }

    emitToast(message, type = 'success') {
        this.dispatchEvent(new CustomEvent('sa-ui:toast', {
            bubbles: true,
            detail: { message, type },
        }));
    }

    close() {
        if (typeof window.closeModal === 'function') {
            window.closeModal('addServiceIntervalModal');
            return;
        }

        const modal = this.querySelector('#addServiceIntervalModal');
        if (!modal) {
            return;
        }

        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

customElements.define('sa-add-service-interval-modal', SAAddServiceIntervalModal);
