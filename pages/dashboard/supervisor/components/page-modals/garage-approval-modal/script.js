class SupervisorGarageApprovalModal extends HTMLElement {
    constructor() {
        super();
        this._initialized = false;
        this.currentBreakdown = null;
        this.garages = [];
        this.map = null;
        this.driverMarker = null;
        this.garageMarkers = [];
    }

    connectedCallback() {
        if (this._initialized) {
            return;
        }

        this.render();
        this.bindEvents();
        this._initialized = true;
    }

    get modalElement() {
        return this.querySelector('#garageApprovalModal');
    }

    render() {
        this.innerHTML = `
            <div id="garageApprovalModal" class="modal" style="display:none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-warehouse"></i> Approve Nearby Garage</h2>
                        <button class="btn-close" type="button" data-action="close-modal">&times;</button>
                    </div>

                    <form id="garageApprovalForm">
                        <input type="hidden" id="garageApprovalBreakdownId">

                        <div class="form-section" id="garageApprovalMeta"></div>

                        <div class="form-section">
                            <div class="form-group">
                                <label class="form-label" for="garageApprovalSelect">Select Garage *</label>
                                <select id="garageApprovalSelect" class="form-select" required>
                                    <option value="">Loading garages...</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Driver & Garage Map</label>
                                <div id="garageApprovalMap" style="height:320px; border:1px solid #dbeafe; border-radius:10px; overflow:hidden; background:#f8fafc;"></div>
                                <p id="garageApprovalMapHint" style="margin-top:8px; color:#64748b; font-size:12px;">
                                    Driver location and registered garages will be shown here. Click a garage marker to select it.
                                </p>
                            </div>

                            <div class="form-group">
                                <label class="form-label" for="garageApprovalNotes">Approval Notes</label>
                                <textarea id="garageApprovalNotes" class="form-textarea" placeholder="Optional instructions for the driver"></textarea>
                            </div>
                        </div>

                        <div style="display:flex; gap:10px; flex-wrap:wrap;">
                            <button type="submit" class="btn btn-success"><i class="fas fa-check-circle"></i> Approve Garage</button>
                            <button type="button" class="btn btn-secondary" data-action="close-modal">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (event.target === this.modalElement || (actionEl && actionEl.dataset.action === 'close-modal')) {
                this.close();
            }
        });

        const form = this.querySelector('#garageApprovalForm');
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            await this.submitApproval();
        });

        const garageSelect = this.querySelector('#garageApprovalSelect');
        if (garageSelect) {
            garageSelect.addEventListener('change', () => {
                const selectedGarageId = Number(garageSelect.value || 0);
                this.syncMapSelection(selectedGarageId);
            });
        }
    }

    async open(payload) {
        this.currentBreakdown = payload?.breakdown || null;
        if (!this.currentBreakdown) {
            this.emitToast('Breakdown details are unavailable.', 'warning');
            return;
        }

        const breakdownId = Number(this.currentBreakdown.id || 0);
        if (!breakdownId) {
            this.emitToast('Invalid route breakdown id.', 'error');
            return;
        }

        this.querySelector('#garageApprovalBreakdownId').value = String(breakdownId);
        this.querySelector('#garageApprovalNotes').value = '';
        this.renderMeta();

        this.modalElement.style.display = 'flex';
        this.modalElement.style.opacity = '0';
        document.body.style.overflow = 'hidden';

        setTimeout(() => {
            this.modalElement.style.opacity = '1';
        }, 10);

        await this.loadGarages();
        await this.renderGarageMap();
    }

    close() {
        if (!this.modalElement) {
            return;
        }

        this.modalElement.style.opacity = '0';
        setTimeout(() => {
            this.modalElement.style.display = 'none';
            document.body.style.overflow = '';
            this.destroyMap();
        }, 200);
    }

    renderMeta() {
        const meta = this.querySelector('#garageApprovalMeta');
        const breakdown = this.currentBreakdown || {};
        const locationLabel = String(breakdown.breakdown_location || breakdown.location || '').trim();

        meta.innerHTML = `
            <div style="background:#f8fafc; border:1px solid #dbeafe; border-radius:8px; padding:12px;">
                <div><strong>Route Breakdown:</strong> ${breakdown.breakdownId || breakdown.route_breakdown_id || `RBD-${breakdown.id}`}</div>
                <div><strong>Vehicle:</strong> ${breakdown.identifier || breakdown.number_plate || `Vehicle #${breakdown.vehicle_id || 'N/A'}`}</div>
                <div><strong>Driver:</strong> ${breakdown.reportedBy || breakdown.driver_name || 'N/A'}</div>
                ${locationLabel ? `<div><strong>Reported Location:</strong> ${locationLabel}</div>` : ''}
                ${breakdown.description ? `<div><strong>Description:</strong> ${breakdown.description}</div>` : ''}
            </div>
        `;
    }

    async loadGarages() {
        const select = this.querySelector('#garageApprovalSelect');
        select.innerHTML = '<option value="">Loading garages...</option>';

        try {
            const response = await API.get('/garages');
            const rawGarages = Array.isArray(response?.data?.garages)
                ? response.data.garages
                : (Array.isArray(response?.data) ? response.data : []);

            this.garages = this.rankGaragesByDistance(rawGarages, this.getDriverCoordinates());

            if (!this.garages.length) {
                select.innerHTML = '<option value="">No garages available</option>';
                return;
            }

            const preselectedId = Number(
                this.currentBreakdown?.raw?.garage_workflow?.approved_garage?.id
                || this.currentBreakdown?.raw?.approved_garage_id
                || 0
            );

            select.innerHTML = `
                <option value="">Select a garage</option>
                ${this.garages.map((garage) => `
                    <option value="${garage.id}" ${preselectedId === Number(garage.id) ? 'selected' : ''}>
                        ${garage.name} - ${garage.address}${garage.distance_km !== null ? ` (${this.formatDistanceKm(garage.distance_km)} away)` : ''}
                    </option>
                `).join('')}
            `;

            this.syncMapSelection(preselectedId);
        } catch (error) {
            console.error('Failed to load garages for approval:', error);
            select.innerHTML = '<option value="">Failed to load garages</option>';
            this.emitToast('Failed to load garages', 'error');
        }
    }

    async submitApproval() {
        const breakdownId = Number(this.querySelector('#garageApprovalBreakdownId').value || 0);
        const garageId = Number(this.querySelector('#garageApprovalSelect').value || 0);
        const approvalNotes = this.querySelector('#garageApprovalNotes').value.trim();

        if (!breakdownId) {
            this.emitToast('Route breakdown id is missing.', 'error');
            return;
        }

        if (!garageId) {
            this.emitToast('Please select a garage.', 'error');
            return;
        }

        try {
            const response = await API.post(`/route-breakdowns/${encodeURIComponent(breakdownId)}/garage-approval`, {
                garage_id: garageId,
                approval_notes: approvalNotes,
            });

            if (response && (response.success || response.status === 'success')) {
                this.emitToast('Garage approved successfully.', 'success');
                this.close();
                this.dispatchEvent(new CustomEvent('supervisor-garage-approval-modal:approved', {
                    bubbles: true,
                    detail: { breakdownId, garageId },
                }));
                return;
            }

            this.emitToast(response?.message || 'Failed to approve garage.', 'error');
        } catch (error) {
            console.error('Failed to approve garage:', error);
            this.emitToast('Failed to approve garage.', 'error');
        }
    }

    emitToast(message, type = 'info') {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
            return;
        }

        this.dispatchEvent(new CustomEvent('supervisor-ui:toast', {
            bubbles: true,
            detail: { message, type },
        }));
    }

    async renderGarageMap() {
        const mapEl = this.querySelector('#garageApprovalMap');
        const hintEl = this.querySelector('#garageApprovalMapHint');
        if (!mapEl) {
            return;
        }

        const leafletReady = await this.ensureLeafletLoaded();
        if (!leafletReady || typeof window.L === 'undefined') {
            if (hintEl) {
                hintEl.textContent = 'Unable to load map resources. You can still approve using the garage dropdown.';
            }
            return;
        }

        this.destroyMap();

        this.map = window.L.map(mapEl, {
            zoomControl: true,
        });

        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors',
        }).addTo(this.map);

        this.garageMarkers = [];
        const bounds = [];

        const driverCoordinates = this.getDriverCoordinates();
        if (driverCoordinates) {
            this.driverMarker = window.L.marker(driverCoordinates)
                .addTo(this.map)
                .bindPopup('<strong>Driver Location</strong>');
            bounds.push(driverCoordinates);
        }

        this.garages.forEach((garage) => {
            const latitude = Number(garage.latitude);
            const longitude = Number(garage.longitude);
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
                return;
            }

            const marker = window.L.circleMarker([latitude, longitude], {
                radius: 8,
                color: '#1d4ed8',
                fillColor: '#2563eb',
                fillOpacity: 0.75,
                weight: 2,
            }).addTo(this.map);

            const distanceLabel = garage.distance_km !== null
                ? `<br><span style="color:#475569;">Approx. ${this.formatDistanceKm(garage.distance_km)} from breakdown</span>`
                : '';
            marker.bindPopup(`<strong>${garage.name || 'Garage'}</strong><br>${garage.address || 'Address not available'}${distanceLabel}`);
            marker.on('click', () => {
                const select = this.querySelector('#garageApprovalSelect');
                if (select) {
                    select.value = String(garage.id);
                }
                this.syncMapSelection(Number(garage.id));
            });

            this.garageMarkers.push({
                garageId: Number(garage.id),
                marker,
            });

            bounds.push([latitude, longitude]);
        });

        if (bounds.length > 1) {
            this.map.fitBounds(bounds, { padding: [30, 30] });
        } else if (bounds.length === 1) {
            this.map.setView(bounds[0], 14);
        } else {
            this.map.setView([7.8731, 80.7718], 7);
        }

        const selectedGarageId = Number(this.querySelector('#garageApprovalSelect')?.value || 0);
        this.syncMapSelection(selectedGarageId);

        if (hintEl) {
            if (!driverCoordinates) {
                hintEl.textContent = 'Driver GPS coordinates are missing for this report. Garage markers are still selectable.';
            } else if (!this.garageMarkers.length) {
                hintEl.textContent = 'No garages with coordinates were found. Use the dropdown to select a garage.';
            } else {
                hintEl.textContent = 'Garages are sorted by distance from the reported breakdown location. Click a marker or use the dropdown to select.';
            }
        }

        setTimeout(() => {
            if (this.map) {
                this.map.invalidateSize();
            }
        }, 50);
    }

    syncMapSelection(selectedGarageId) {
        if (!Array.isArray(this.garageMarkers) || !this.garageMarkers.length) {
            return;
        }

        this.garageMarkers.forEach(({ garageId, marker }) => {
            const isSelected = selectedGarageId > 0 && garageId === selectedGarageId;
            marker.setStyle({
                color: isSelected ? '#991b1b' : '#1d4ed8',
                fillColor: isSelected ? '#dc2626' : '#2563eb',
                fillOpacity: isSelected ? 0.9 : 0.75,
                radius: isSelected ? 10 : 8,
            });

            if (isSelected && this.map) {
                this.map.panTo(marker.getLatLng());
            }
        });
    }

    getDriverCoordinates() {
        const source = this.currentBreakdown?.raw || this.currentBreakdown || {};
        const directCoordinates = this.toCoordinatePair(source.breakdown_latitude, source.breakdown_longitude)
            || this.toCoordinatePair(source.latitude, source.longitude)
            || this.toCoordinatePair(this.currentBreakdown?.breakdown_latitude, this.currentBreakdown?.breakdown_longitude);

        if (directCoordinates) {
            return directCoordinates;
        }

        return this.parseCoordinatesFromText(source.breakdown_location)
            || this.parseCoordinatesFromText(source.location)
            || this.parseCoordinatesFromText(source.description)
            || null;
    }

    toCoordinatePair(latitudeValue, longitudeValue) {
        const latitude = Number(latitudeValue);
        const longitude = Number(longitudeValue);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return null;
        }

        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            return null;
        }

        return [latitude, longitude];
    }

    parseCoordinatesFromText(value) {
        const text = String(value || '').trim();
        if (!text) {
            return null;
        }

        const labelledMatch = text.match(/lat(?:itude)?\s*[:=]?\s*(-?\d+(?:\.\d+)?)\s*[,|]\s*lng(?:itude)?\s*[:=]?\s*(-?\d+(?:\.\d+)?)/i);
        if (labelledMatch) {
            return this.toCoordinatePair(labelledMatch[1], labelledMatch[2]);
        }

        const coordinatePairMatch = text.match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
        if (coordinatePairMatch) {
            return this.toCoordinatePair(coordinatePairMatch[1], coordinatePairMatch[2]);
        }

        return null;
    }

    getGarageDistanceKm(garage, originCoordinates) {
        if (!originCoordinates || !Array.isArray(originCoordinates)) {
            return null;
        }

        const garageCoordinates = this.toCoordinatePair(garage.latitude, garage.longitude);
        if (!garageCoordinates) {
            return null;
        }

        const [originLatitude, originLongitude] = originCoordinates;
        const [garageLatitude, garageLongitude] = garageCoordinates;

        const toRadians = (degrees) => (degrees * Math.PI) / 180;
        const earthRadiusKm = 6371;

        const deltaLatitude = toRadians(garageLatitude - originLatitude);
        const deltaLongitude = toRadians(garageLongitude - originLongitude);
        const startLatitude = toRadians(originLatitude);
        const endLatitude = toRadians(garageLatitude);

        const a = Math.sin(deltaLatitude / 2) ** 2
            + Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(deltaLongitude / 2) ** 2;

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadiusKm * c;
    }

    rankGaragesByDistance(garages, originCoordinates) {
        const normalizedGarages = Array.isArray(garages) ? garages : [];

        return normalizedGarages
            .map((garage) => ({
                ...garage,
                distance_km: this.getGarageDistanceKm(garage, originCoordinates),
            }))
            .sort((first, second) => {
                const firstDistance = Number.isFinite(first.distance_km) ? first.distance_km : Number.POSITIVE_INFINITY;
                const secondDistance = Number.isFinite(second.distance_km) ? second.distance_km : Number.POSITIVE_INFINITY;

                if (firstDistance !== secondDistance) {
                    return firstDistance - secondDistance;
                }

                return String(first.name || '').localeCompare(String(second.name || ''));
            });
    }

    formatDistanceKm(distanceKm) {
        if (!Number.isFinite(distanceKm)) {
            return 'N/A';
        }

        if (distanceKm < 1) {
            return `${Math.max(50, Math.round(distanceKm * 1000))} m`;
        }

        return `${distanceKm.toFixed(1)} km`;
    }

    destroyMap() {
        if (this.map && typeof this.map.remove === 'function') {
            this.map.remove();
        }

        this.map = null;
        this.driverMarker = null;
        this.garageMarkers = [];
    }

    async ensureLeafletLoaded() {
        if (typeof window.L !== 'undefined') {
            return true;
        }

        if (!window.__assetcareLeafletPromise) {
            window.__assetcareLeafletPromise = new Promise((resolve) => {
                const existingScript = document.getElementById('leaflet-script');
                if (existingScript) {
                    existingScript.addEventListener('load', () => resolve(true), { once: true });
                    existingScript.addEventListener('error', () => resolve(false), { once: true });
                    return;
                }

                if (!document.getElementById('leaflet-stylesheet')) {
                    const leafletCss = document.createElement('link');
                    leafletCss.id = 'leaflet-stylesheet';
                    leafletCss.rel = 'stylesheet';
                    leafletCss.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                    document.head.appendChild(leafletCss);
                }

                const leafletScript = document.createElement('script');
                leafletScript.id = 'leaflet-script';
                leafletScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                leafletScript.onload = () => resolve(true);
                leafletScript.onerror = () => resolve(false);
                document.head.appendChild(leafletScript);
            });
        }

        return window.__assetcareLeafletPromise;
    }
}

if (!customElements.get('supervisor-garage-approval-modal')) {
    customElements.define('supervisor-garage-approval-modal', SupervisorGarageApprovalModal);
}
