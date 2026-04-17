class TMAddGarageModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this._map = null;
        this._marker = null;
        this._mapAvailable = false;
        this._mapSelectionMade = false;
        this._defaultMapCenter = [7.8731, 80.7718];
        this._defaultMapZoom = 7;

        this.render();
        this.bindEvents();
    }

    disconnectedCallback() {
        if (this._map && typeof this._map.remove === 'function') {
            this._map.remove();
        }

        this._map = null;
        this._marker = null;

        if (this._handleKeydown) {
            document.removeEventListener('keydown', this._handleKeydown);
            this._handleKeydown = null;
        }
    }

    render() {
        this.innerHTML = `
            <div id="addGarageModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="addGarageModalTitle"><i class="fas fa-warehouse"></i> Add Connected Garage</h2>
                        <button class="btn-close" type="button" data-action="close" aria-label="Close add garage form">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <form id="tmGarageForm" novalidate>
                        <div id="tmGarageErrors" class="form-errors" style="display: none;"></div>

                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label" for="tmGarageName">Garage Name <span class="required">*</span></label>
                                <input class="form-input" id="tmGarageName" name="name" type="text" placeholder="e.g. Roadside Rescue Center" maxlength="255" required>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group full-width">
                                <label class="form-label" for="tmGarageAddress">Address <span class="required">*</span></label>
                                <textarea class="form-textarea" id="tmGarageAddress" name="address" rows="3" placeholder="Street address and locality" maxlength="500" required></textarea>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group full-width">
                                <label class="form-label" for="tmGarageMapPicker">Select Location On Map <span class="required">*</span></label>
                                <div
                                    id="tmGarageMapPicker"
                                    style="height: 280px; border: 1px solid var(--stone-200); border-radius: 10px; overflow: hidden; background: #f8fafc;"
                                ></div>
                                <div style="display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap;">
                                    <button type="button" class="btn btn-secondary btn-small" data-action="clear-map-location">
                                        <i class="fas fa-eraser"></i> Clear Selected Location
                                    </button>
                                </div>
                                <small class="form-hint" style="display: block; color: var(--muted); margin-top: 6px;">
                                    Click on the map to place a marker. Latitude and longitude are filled automatically.
                                </small>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label" for="tmGarageLatitude">Latitude <span class="required">*</span></label>
                                <input class="form-input" id="tmGarageLatitude" name="latitude" type="number" step="0.0000001" min="-90" max="90" readonly placeholder="Select from map">
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="tmGarageLongitude">Longitude <span class="required">*</span></label>
                                <input class="form-input" id="tmGarageLongitude" name="longitude" type="number" step="0.0000001" min="-180" max="180" readonly placeholder="Select from map">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label" for="tmGarageCity">City</label>
                                <input class="form-input" id="tmGarageCity" name="city" type="text" placeholder="e.g. Colombo" maxlength="100">
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="tmGaragePhone">Phone</label>
                                <input class="form-input" id="tmGaragePhone" name="phone" type="text" placeholder="e.g. +94 11 000 0000" maxlength="50">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group full-width">
                                <label class="form-label" for="tmGarageIsActive">Availability</label>
                                <label for="tmGarageIsActive" style="display: inline-flex; align-items: center; gap: 10px; color: var(--text-700); font-weight: 600; font-size: 0.9rem;">
                                    <input id="tmGarageIsActive" name="is_active" type="checkbox" checked style="width: 18px; height: 18px;">
                                    <span>Active and visible to drivers/supervisors</span>
                                </label>
                            </div>
                        </div>

                        <div class="modal-actions">
                            <button type="submit" class="btn btn-primary" id="tmGarageSubmitBtn">
                                <i class="fas fa-save"></i> Save Garage
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

            if (actionEl && actionEl.dataset.action === 'clear-map-location') {
                this.clearMapSelection();
                return;
            }

            if (event.target.id === 'addGarageModal') {
                this.close();
                return;
            }

            if (actionEl && actionEl.dataset.action === 'close') {
                this.close();
            }
        });

        const form = this.querySelector('#tmGarageForm');
        if (form) {
            form.addEventListener('submit', (event) => {
                event.preventDefault();
                this.submit();
            });
        }

        this._handleKeydown = (event) => {
            if (event.key === 'Escape' && this.isOpen()) {
                this.close();
            }
        };

        document.addEventListener('keydown', this._handleKeydown);
    }

    isOpen() {
        return !!this.querySelector('#addGarageModal')?.classList.contains('active');
    }

    open() {
        const modal = this.querySelector('#addGarageModal');
        const form = this.querySelector('#tmGarageForm');
        if (form) {
            form.reset();
        }

        this.clearMapSelection(true);

        const activeCheckbox = this.querySelector('#tmGarageIsActive');
        if (activeCheckbox) {
            activeCheckbox.checked = true;
        }

        this.hideErrors();

        if (modal) {
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
        }

        requestAnimationFrame(() => {
            this.ensureMapReady();
        });

        const nameInput = this.querySelector('#tmGarageName');
        if (nameInput) {
            nameInput.focus();
        }
    }

    close() {
        const modal = this.querySelector('#addGarageModal');
        if (modal) {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    emitToast(message, type = 'success') {
        document.dispatchEvent(new CustomEvent('tm-ui:toast', {
            detail: { message, type },
        }));
    }

    parseCoordinate(raw) {
        const value = String(raw ?? '').trim();
        if (value === '') {
            return null;
        }

        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : NaN;
    }

    ensureMapReady() {
        const mapContainer = this.querySelector('#tmGarageMapPicker');
        if (!mapContainer) {
            return;
        }

        if (!window.L || typeof window.L.map !== 'function') {
            this._mapAvailable = false;
            mapContainer.innerHTML = '<div style="height: 100%; display: flex; align-items: center; justify-content: center; padding: 12px; color: var(--muted); text-align: center;">Map failed to load. Reload the page and try again.</div>';
            return;
        }

        this._mapAvailable = true;

        if (!this._map) {
            this._map = window.L.map(mapContainer).setView(this._defaultMapCenter, this._defaultMapZoom);

            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap contributors',
            }).addTo(this._map);

            if (typeof this._map.on === 'function') {
                this._map.on('click', (event) => {
                    const latitude = Number(event?.latlng?.lat);
                    const longitude = Number(event?.latlng?.lng);
                    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
                        return;
                    }

                    this.setSelectedLocation(latitude, longitude);
                });
            }
        }

        if (typeof this._map.invalidateSize === 'function') {
            setTimeout(() => {
                this._map.invalidateSize();
            }, 60);
        }

        if (!this._mapSelectionMade && typeof this._map.setView === 'function') {
            this._map.setView(this._defaultMapCenter, this._defaultMapZoom);
        }
    }

    clearMapSelection(resetView = false) {
        if (this._map && this._marker && typeof this._map.removeLayer === 'function') {
            this._map.removeLayer(this._marker);
        }

        this._marker = null;
        this._mapSelectionMade = false;

        const latitudeInput = this.querySelector('#tmGarageLatitude');
        const longitudeInput = this.querySelector('#tmGarageLongitude');
        if (latitudeInput) {
            latitudeInput.value = '';
        }

        if (longitudeInput) {
            longitudeInput.value = '';
        }

        if (resetView && this._map && typeof this._map.setView === 'function') {
            this._map.setView(this._defaultMapCenter, this._defaultMapZoom);
        }
    }

    setSelectedLocation(latitude, longitude) {
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return;
        }

        if (this._map && this._marker && typeof this._map.removeLayer === 'function') {
            this._map.removeLayer(this._marker);
        }

        if (this._map && window.L && typeof window.L.marker === 'function') {
            this._marker = window.L.marker([latitude, longitude]).addTo(this._map);
        }

        if (this._map && typeof this._map.setView === 'function') {
            const zoom = typeof this._map.getZoom === 'function'
                ? Math.max(this._map.getZoom(), 14)
                : 14;
            this._map.setView([latitude, longitude], zoom);
        }

        const latitudeInput = this.querySelector('#tmGarageLatitude');
        const longitudeInput = this.querySelector('#tmGarageLongitude');
        if (latitudeInput) {
            latitudeInput.value = latitude.toFixed(6);
        }

        if (longitudeInput) {
            longitudeInput.value = longitude.toFixed(6);
        }

        this._mapSelectionMade = true;
        this.hideErrors();
    }

    showErrors(message) {
        const errorsDiv = this.querySelector('#tmGarageErrors');
        if (!errorsDiv) {
            return;
        }

        errorsDiv.textContent = message;
        errorsDiv.style.display = 'block';
    }

    hideErrors() {
        const errorsDiv = this.querySelector('#tmGarageErrors');
        if (!errorsDiv) {
            return;
        }

        errorsDiv.style.display = 'none';
    }

    async submit() {
        this.hideErrors();

        const name = String(this.querySelector('#tmGarageName')?.value || '').trim();
        const address = String(this.querySelector('#tmGarageAddress')?.value || '').trim();
        const city = String(this.querySelector('#tmGarageCity')?.value || '').trim();
        const phone = String(this.querySelector('#tmGaragePhone')?.value || '').trim();
        const latitude = this.parseCoordinate(this.querySelector('#tmGarageLatitude')?.value || '');
        const longitude = this.parseCoordinate(this.querySelector('#tmGarageLongitude')?.value || '');
        const isActive = !!this.querySelector('#tmGarageIsActive')?.checked;

        if (!name || !address) {
            this.showErrors('Garage name and address are required.');
            return;
        }

        if (!this._mapAvailable) {
            this.showErrors('Map is unavailable. Reload the page and try again.');
            return;
        }

        if (!this._mapSelectionMade || latitude === null || longitude === null) {
            this.showErrors('Please select the garage location from the map.');
            return;
        }

        if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
            this.showErrors('Latitude and longitude must be valid numbers.');
            return;
        }

        if (latitude < -90 || latitude > 90) {
            this.showErrors('Latitude must be between -90 and 90.');
            return;
        }

        if (longitude < -180 || longitude > 180) {
            this.showErrors('Longitude must be between -180 and 180.');
            return;
        }

        const payload = {
            name,
            address,
            city: city || null,
            phone: phone || null,
            latitude,
            longitude,
            is_active: isActive,
        };

        const submitButton = this.querySelector('#tmGarageSubmitBtn');
        const originalButtonHtml = submitButton?.innerHTML || '';

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }

        try {
            const response = await API.post('/garages', payload);
            if (response?.status !== 'success') {
                throw new Error(response?.message || 'Failed to create garage');
            }

            this.emitToast('Garage saved successfully. It is now available in breakdown flows.', 'success');
            this.close();

            document.dispatchEvent(new CustomEvent('tm-modal:garage-added', {
                detail: { garage: response?.data?.garage || null },
            }));
        } catch (error) {
            console.error('TM garage create failed:', error);
            this.showErrors(error?.message || 'Failed to create garage.');
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonHtml || '<i class="fas fa-save"></i> Save Garage';
            }
        }
    }
}

customElements.define('tm-add-garage-modal', TMAddGarageModal);
