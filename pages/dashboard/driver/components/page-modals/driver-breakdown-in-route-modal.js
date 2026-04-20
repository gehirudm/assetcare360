class DriverBreakdownInRouteModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.editingId = null;
        this.isSubmitting = false;
        this.isSeverityLockedByDangerousCargo = false;
        this._dangerousCargoCheckToken = 0;
        this.render();
        this.bindEvents();

        DriverUtils.on('driver:modal-open', (event) => {
            if (event.detail?.id === 'breakdownInRouteModal') {
                this.open(event.detail?.payload || {});
            }
        });

        DriverUtils.on('driver:modal-close', (event) => {
            if (event.detail?.id === 'breakdownInRouteModal') {
                this.close();
            }
        });
    }

    render() {
        this.innerHTML = `
            <div id="breakdownInRouteModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="routeBreakdownTitle"><i class="fas fa-road"></i> Report Breakdown in Route</h2>
                        <button class="btn-close" type="button" data-action="close-modal"><i class="fas fa-times"></i></button>
                    </div>
                    <form id="breakdownInRouteForm">
                        <div class="form-section">
                            <div class="form-grid">
                                <div class="form-group" id="routeVehicleContainer">
                                    <label class="form-label">Vehicle *</label>
                                    <!-- Will be populated dynamically: readonly input if assigned, dropdown if not -->
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Urgency Level *</label>
                                    <select id="routeBreakdownSeverity" class="form-select" required>
                                        <option value="">Select Urgency</option>
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                    <div id="routeBreakdownPriorityLockNotice" style="display:none; margin-top:8px; padding:8px 10px; border-radius:6px; background:#fef2f2; color:#991b1b; font-size:12px; line-height:1.4; border:1px solid #fecaca;">
                                        <i class="fas fa-radiation" style="margin-right:4px;"></i>
                                        Urgency is locked to critical while transporting dangerous cargo.
                                    </div>
                                </div>
                            </div>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Current Location *</label>
                                    <input type="text" id="routeBreakdownLocation" class="form-input" required>
                                    <div style="display:flex; gap:8px; margin-top:10px; align-items:center; flex-wrap:wrap;">
                                        <button type="button" class="btn btn-secondary btn-small" data-action="capture-location">
                                            <i class="fas fa-location-dot"></i> Use Current GPS Location
                                        </button>
                                        <span id="routeBreakdownCoordinateStatus" style="font-size:12px; color:#666;">GPS location not captured yet.</span>
                                    </div>
                                    <input type="hidden" id="routeBreakdownLatitude">
                                    <input type="hidden" id="routeBreakdownLongitude">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Incident Time *</label>
                                    <input type="datetime-local" id="routeBreakdownDatetime" class="form-input" required>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Problem Category *</label>
                                <select id="routeBreakdownType" class="form-select" required>
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
                            <textarea id="routeBreakdownDescription" class="form-textarea" required></textarea>
                        </div>

                        <div class="form-section">
                            <h5><i class="fas fa-camera"></i> Breakdown Images (Optional)</h5>
                            <div class="photo-upload" data-action="open-photo-picker">
                                <div style="font-size: 2rem; margin-bottom: 10px;"><i class="fas fa-camera"></i></div>
                                <div style="font-weight: 600; margin-bottom: 5px;">Click to upload images</div>
                                <div style="font-size: 12px; color: var(--muted);">JPG, PNG, WEBP • up to 5 images • max 5MB each</div>
                                <input type="file" id="routeBreakdownImages" multiple accept="image/png,image/jpeg,image/webp" style="display: none;">
                            </div>
                            <div id="routeBreakdownImageList" style="margin-top: 10px;"></div>
                        </div>

                        <button type="submit" class="btn btn-danger" id="routeBreakdownSubmit">Submit Breakdown in Route Report</button>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#breakdownInRouteModal');
        const form = this.querySelector('#breakdownInRouteForm');
        const imageInput = this.querySelector('#routeBreakdownImages');
        const imageList = this.querySelector('#routeBreakdownImageList');

        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (event.target === modal || (actionEl && actionEl.dataset.action === 'close-modal')) {
                this.close();
                return;
            }

            if (actionEl && actionEl.dataset.action === 'capture-location') {
                this.captureCurrentLocation();
                return;
            }

            if (actionEl && actionEl.dataset.action === 'open-photo-picker') {
                imageInput?.click();
            }
        });

        imageInput?.addEventListener('change', () => {
            const selectedFiles = Array.from(imageInput.files || []);
            imageList.innerHTML = selectedFiles.map((file) => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:#f8f9fa;border-radius:6px;margin-bottom:5px;">
                    <span style="font-size:14px;">${file.name}</span>
                    <span style="font-size:12px;color:var(--muted);">${(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
            `).join('');
        });

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            if (this.isSubmitting) {
                return;
            }

            const submitButton = form.querySelector('#routeBreakdownSubmit');
            const idleLabel = this.editingId
                ? 'Update Route Breakdown Report'
                : 'Submit Breakdown in Route Report';

            const selectedVehicle = this.getSelectedVehicle();
            if (!selectedVehicle) {
                DriverUtils.showToast('Please select a vehicle.', 'error');
                return;
            }

            const payload = {
                vehicle_id: selectedVehicle.id,
                severity: form.querySelector('#routeBreakdownSeverity').value,
                breakdown_type: form.querySelector('#routeBreakdownType').value,
                breakdown_location: form.querySelector('#routeBreakdownLocation').value.trim(),
                breakdown_datetime: form.querySelector('#routeBreakdownDatetime').value,
                description: form.querySelector('#routeBreakdownDescription').value.trim(),
            };

            if (this.isSeverityLockedByDangerousCargo) {
                payload.severity = 'critical';
            }

            const latitudeRaw = form.querySelector('#routeBreakdownLatitude')?.value;
            const longitudeRaw = form.querySelector('#routeBreakdownLongitude')?.value;
            const latitude = latitudeRaw !== '' ? Number(latitudeRaw) : null;
            const longitude = longitudeRaw !== '' ? Number(longitudeRaw) : null;

            if (this.editingId == null && (!Number.isFinite(latitude) || !Number.isFinite(longitude))) {
                DriverUtils.showToast('Please capture your current GPS location before submitting the route breakdown.', 'error');
                return;
            }

            if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
                payload.breakdown_latitude = latitude;
                payload.breakdown_longitude = longitude;
            }

            const selectedImages = Array.from(imageInput?.files || []);
            if (this.editingId && selectedImages.length > 0) {
                DriverUtils.showToast('Image upload is only available when creating a new route breakdown report.', 'warning');
                return;
            }

            if (selectedImages.length > 5) {
                DriverUtils.showToast('You can upload up to 5 breakdown images.', 'error');
                return;
            }

            for (const image of selectedImages) {
                const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
                if (!allowedTypes.includes(image.type)) {
                    DriverUtils.showToast('Only JPG, PNG, and WEBP images are allowed.', 'error');
                    return;
                }

                if (image.size > 5 * 1024 * 1024) {
                    DriverUtils.showToast('Each breakdown image must be 5MB or smaller.', 'error');
                    return;
                }
            }

            try {
                this.isSubmitting = true;
                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.textContent = this.editingId ? 'Updating...' : 'Submitting...';
                }

                let response = null;
                if (this.editingId) {
                    response = await DriverUtils.apiPut(`/route-breakdowns/${encodeURIComponent(this.editingId)}`, payload);
                } else {
                    const formData = new FormData();
                    Object.entries(payload).forEach(([key, value]) => {
                        formData.append(key, value);
                    });

                    selectedImages.forEach((image) => {
                        formData.append('breakdown_images[]', image);
                    });

                    response = await DriverUtils.apiPostFormData('/route-breakdowns', formData);
                }

                if (response && (response.success || response.status === 'success')) {
                    DriverUtils.showToast(this.editingId ? 'Route breakdown updated.' : 'Route breakdown submitted.');
                    this.close();
                    form.reset();
                    this.editingId = null;
                    if (imageList) {
                        imageList.innerHTML = '';
                    }
                    DriverUtils.emit('driver:data-breakdowns-changed');
                    return;
                }

                DriverUtils.showToast(response?.message || 'Failed to submit route breakdown report.', 'error');
            } catch (error) {
                console.error('Failed to submit route breakdown report:', error);
                DriverUtils.showToast('Failed to submit route breakdown report. Please try again.', 'error');
            } finally {
                this.isSubmitting = false;
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = idleLabel;
                }
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
        const form = this.querySelector('#breakdownInRouteForm');
        const title = this.querySelector('#routeBreakdownTitle');
        const submit = this.querySelector('#routeBreakdownSubmit');
        const vehicleFieldContainer = this.querySelector('#routeVehicleContainer');
        const latitudeField = this.querySelector('#routeBreakdownLatitude');
        const longitudeField = this.querySelector('#routeBreakdownLongitude');
        const editItem = payload?.editItem || null;

        form.reset();
        DriverUtils.ensureTodayDefaults(form);
        this.assignedVehicle = null;
        this.allVehicles = [];
        this.setSeverityLockState({ locked: false });
        if (latitudeField) {
            latitudeField.value = '';
        }
        if (longitudeField) {
            longitudeField.value = '';
        }
        this.updateLocationCaptureStatus('GPS location not captured yet.', 'neutral');
        const imageInput = this.querySelector('#routeBreakdownImages');
        const imageList = this.querySelector('#routeBreakdownImageList');
        if (imageInput) {
            imageInput.value = '';
        }
        if (imageList) {
            imageList.innerHTML = '';
        }

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
            title.innerHTML = '<i class="fas fa-edit"></i> Edit Route Breakdown Report';
            submit.textContent = 'Update Route Breakdown Report';
            form.querySelector('#routeBreakdownSeverity').value = editItem.severity || '';
            form.querySelector('#routeBreakdownType').value = editItem.category || editItem.breakdown_type || '';
            form.querySelector('#routeBreakdownLocation').value = editItem.breakdown_location || '';
            form.querySelector('#routeBreakdownDescription').value = editItem.description || '';
            if (latitudeField) {
                latitudeField.value = editItem.breakdown_latitude ?? '';
            }
            if (longitudeField) {
                longitudeField.value = editItem.breakdown_longitude ?? '';
            }

            if (editItem.breakdown_latitude != null && editItem.breakdown_longitude != null) {
                this.updateLocationCaptureStatus('Using saved GPS coordinates for this report.', 'success');
            }

            if (editItem.breakdown_datetime) {
                const date = new Date(editItem.breakdown_datetime);
                date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
                form.querySelector('#routeBreakdownDatetime').value = date.toISOString().slice(0, 16);
            }
        } else {
            this.editingId = null;
            title.innerHTML = '<i class="fas fa-road"></i> Report Breakdown in Route';
            submit.textContent = 'Submit Breakdown in Route Report';
        }

        await this.syncDangerousCargoSeverityLock();

        DriverUtils.setModalState(this.querySelector('#breakdownInRouteModal'), true);
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

                const vehicleSelect = container.querySelector('#vehicleSelect');
                if (vehicleSelect) {
                    vehicleSelect.addEventListener('change', () => {
                        this.syncDangerousCargoSeverityLock();
                    });
                }
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

    async syncDangerousCargoSeverityLock() {
        const currentToken = this._dangerousCargoCheckToken + 1;
        this._dangerousCargoCheckToken = currentToken;

        const selectedVehicle = this.getSelectedVehicle();
        if (!selectedVehicle) {
            this.setSeverityLockState({ locked: false });
            return;
        }

        try {
            const response = await DriverUtils.apiGet('/trips');
            const trips = DriverUtils.normalizeApiList(response, 'trips');
            const selectedPlate = String(selectedVehicle.number_plate || '').trim().toLowerCase();

            const activeTrips = trips.filter((trip) => {
                const tripPlate = String(trip?.vehicle_registration || trip?.vehicle_registration_no || trip?.number_plate || '').trim().toLowerCase();
                if (!tripPlate || !selectedPlate || tripPlate !== selectedPlate) {
                    return false;
                }

                return this.isTripInActiveTransportState(trip?.status);
            });

            activeTrips.sort((first, second) => this.getTripStatusPriority(second?.status) - this.getTripStatusPriority(first?.status));
            const activeTrip = activeTrips[0] || null;
            const isDangerousCargo = activeTrip ? DriverUtils.hasDangerousCargo(activeTrip) : false;

            if (this._dangerousCargoCheckToken !== currentToken) {
                return;
            }

            this.setSeverityLockState({
                locked: isDangerousCargo,
                tripId: activeTrip?.trip_id || activeTrip?.id || null,
                cargoSummary: activeTrip ? DriverUtils.buildCargoSummary(activeTrip) : '',
            });
        } catch (error) {
            console.error('Failed to verify dangerous cargo context for route breakdown severity lock:', error);

            if (this._dangerousCargoCheckToken !== currentToken) {
                return;
            }

            this.setSeverityLockState({ locked: false });
        }
    }

    isTripInActiveTransportState(status) {
        const normalizedStatus = String(status || '').trim().toLowerCase().replace(/\s+/g, '_');
        return normalizedStatus === 'accepted' || normalizedStatus === 'in_progress';
    }

    getTripStatusPriority(status) {
        const normalizedStatus = String(status || '').trim().toLowerCase().replace(/\s+/g, '_');
        if (normalizedStatus === 'in_progress') {
            return 2;
        }

        if (normalizedStatus === 'accepted') {
            return 1;
        }

        return 0;
    }

    setSeverityLockState({ locked = false, tripId = null, cargoSummary = '' } = {}) {
        const severityField = this.querySelector('#routeBreakdownSeverity');
        const lockNotice = this.querySelector('#routeBreakdownPriorityLockNotice');

        if (!severityField || !lockNotice) {
            return;
        }

        this.isSeverityLockedByDangerousCargo = locked === true;

        if (this.isSeverityLockedByDangerousCargo) {
            severityField.value = 'critical';
            severityField.disabled = true;

            const details = [];
            if (tripId) {
                details.push(`Trip ${tripId}`);
            }
            if (cargoSummary) {
                details.push(cargoSummary);
            }

            const detailsText = details.length ? ` (${details.join(' | ')})` : '';
            lockNotice.textContent = `Urgency is locked to critical while transporting dangerous cargo${detailsText}.`;
            lockNotice.style.display = 'block';
            return;
        }

        severityField.disabled = false;
        lockNotice.style.display = 'none';
    }

    close() {
        DriverUtils.setModalState(this.querySelector('#breakdownInRouteModal'), false);
    }

    updateLocationCaptureStatus(message, tone = 'neutral') {
        const statusEl = this.querySelector('#routeBreakdownCoordinateStatus');
        if (!statusEl) {
            return;
        }

        const color = tone === 'success'
            ? '#166534'
            : tone === 'error'
                ? '#b91c1c'
                : '#666';

        statusEl.textContent = message;
        statusEl.style.color = color;
    }

    captureCurrentLocation() {
        if (!navigator.geolocation) {
            this.updateLocationCaptureStatus('Geolocation is not supported by this browser.', 'error');
            DriverUtils.showToast('Geolocation is not supported by this browser.', 'error');
            return;
        }

        this.updateLocationCaptureStatus('Capturing GPS coordinates...', 'neutral');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const latitude = Number(position.coords.latitude.toFixed(7));
                const longitude = Number(position.coords.longitude.toFixed(7));

                const latitudeField = this.querySelector('#routeBreakdownLatitude');
                const longitudeField = this.querySelector('#routeBreakdownLongitude');
                const locationField = this.querySelector('#routeBreakdownLocation');

                if (latitudeField) {
                    latitudeField.value = String(latitude);
                }

                if (longitudeField) {
                    longitudeField.value = String(longitude);
                }

                if (locationField && !locationField.value.trim()) {
                    locationField.value = `Lat ${latitude}, Lng ${longitude}`;
                }

                this.updateLocationCaptureStatus('GPS location captured successfully.', 'success');
                DriverUtils.showToast('Current GPS location captured.', 'success');
            },
            (error) => {
                let message = 'Unable to capture GPS location.';
                if (error && error.code === error.PERMISSION_DENIED) {
                    message = 'Location permission denied. Allow location access and try again.';
                } else if (error && error.code === error.TIMEOUT) {
                    message = 'Location request timed out. Please try again.';
                }

                this.updateLocationCaptureStatus(message, 'error');
                DriverUtils.showToast(message, 'error');
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0,
            }
        );
    }
}

customElements.define('driver-breakdown-in-route-modal', DriverBreakdownInRouteModal);
