class DriverDashboardOverview extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this._assignedVehicle = null;
        this.render();
        this.bindEvents();
        this.refresh();
        this._fetchAssignedVehicle();

        DriverUtils.on('driver:data-trips-changed', () => this.refresh());
        DriverUtils.on('driver:data-checks-changed', () => this.refresh());
        DriverUtils.on('driver:data-breakdowns-changed', () => this.refresh());
    }

    _escapeHtml(str) {
        if (str == null) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    _resolveImageUrl(imagePath) {
        const urls = this._resolveImageUrls(imagePath);
        return urls[0] || null;
    }

    _resolveImageUrls(imagePath) {
        if (!imagePath || typeof imagePath !== 'string') {
            return [];
        }

        const trimmedPath = imagePath.trim();
        if (!trimmedPath) {
            return [];
        }

        if (/^https?:\/\//i.test(trimmedPath)) {
            return [trimmedPath];
        }

        const normalizedPath = trimmedPath
            .replace(/\\/g, '/')
            .replace(/^(\.\/)+/, '')
            .replace(/^\/+/, '');

        if (!normalizedPath) {
            return [];
        }

        const apiOrigin = this._getApiOrigin();
        const primaryOrigin = window.location.origin;
        const shouldPreferApiOrigin = normalizedPath.indexOf('uploads/') === 0;
        const urls = [];

        if (shouldPreferApiOrigin && apiOrigin) {
            urls.push(`${apiOrigin}/${normalizedPath}`);
            if (primaryOrigin && primaryOrigin !== apiOrigin) {
                urls.push(`${primaryOrigin}/${normalizedPath}`);
            }
            return urls;
        }

        if (primaryOrigin) {
            urls.push(`${primaryOrigin}/${normalizedPath}`);
        }

        if (apiOrigin && apiOrigin !== primaryOrigin) {
            urls.push(`${apiOrigin}/${normalizedPath}`);
        }

        return urls;
    }

    _getApiOrigin() {
        if (typeof CONFIG === 'undefined' || !CONFIG.API_BASE_URL) {
            return null;
        }

        try {
            return new URL(CONFIG.API_BASE_URL, window.location.origin).origin;
        } catch (error) {
            return null;
        }
    }

    async _fetchAssignedVehicle() {
        try {
            const response = await DriverUtils.apiGet('/vehicles/my-vehicle');
            if (response.status === 'success' && response.data) {
                this._assignedVehicle = response.data;
            } else {
                this._assignedVehicle = null;
            }
        } catch (error) {
            console.error('Failed to fetch assigned vehicle:', error);
            this._assignedVehicle = null;
        }
        this._renderAssignedVehicle();
    }

    _renderAssignedVehicle() {
        const container = this.querySelector('[data-assigned-vehicle]');
        if (!container) return;

        if (this._assignedVehicle) {
            const vehicle = this._assignedVehicle;
            const qrImageUrls = this._resolveImageUrls(vehicle.government_fuel_qr_image);
            const qrImageUrl = qrImageUrls[0] || null;
            const qrImageFallbackUrl = qrImageUrls[1] || '';
            container.innerHTML = `
                <div class="assigned-vehicle-card">
                    <div class="assigned-vehicle-header">
                        <div class="assigned-vehicle-icon">
                            <i class="fas fa-truck"></i>
                        </div>
                        <div class="assigned-vehicle-badge">Assigned Vehicle</div>
                    </div>
                    <div class="assigned-vehicle-content">
                        <div class="assigned-vehicle-primary">
                            <span class="assigned-vehicle-plate">${this._escapeHtml(vehicle.number_plate || '-')}</span>
                            <span class="assigned-vehicle-name">${this._escapeHtml(vehicle.vehicle_name || '')}</span>
                        </div>
                        <div class="assigned-vehicle-details">
                            <div class="assigned-vehicle-detail">
                                <i class="fas fa-id-badge"></i>
                                <span>${this._escapeHtml(vehicle.vehicle_id || '-')}</span>
                            </div>
                            <div class="assigned-vehicle-detail">
                                <i class="fas fa-car"></i>
                                <span>${this._escapeHtml(vehicle.vehicle_type || '-')}</span>
                            </div>
                            <div class="assigned-vehicle-detail">
                                <i class="fas fa-tachometer-alt"></i>
                                <span>${vehicle.current_mileage ? Number(vehicle.current_mileage).toLocaleString() + ' KM' : '-'}</span>
                            </div>
                            <div class="assigned-vehicle-detail">
                                <span class="status-badge status-${(vehicle.status || '').toLowerCase()}">${this._escapeHtml(vehicle.status || '-')}</span>
                            </div>
                        </div>

                        ${qrImageUrl ? `
                            <div class="assigned-vehicle-qr-box">
                                <div class="assigned-vehicle-qr-title">
                                    <i class="fas fa-qrcode"></i>
                                    <span>Government Fuel QR</span>
                                </div>
                                <div class="assigned-vehicle-qr-content">
                                    <img src="${qrImageUrl}" data-fallback-src="${qrImageFallbackUrl}" alt="Government fuel QR code" class="assigned-vehicle-qr-image">
                                    <button type="button" class="btn btn-secondary btn-small" data-action="open-fuel-qr" data-image-url="${qrImageUrl}">
                                        <i class="fas fa-up-right-from-square"></i> Open Full QR
                                    </button>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="assigned-vehicle-card assigned-vehicle-empty">
                    <div class="assigned-vehicle-icon">
                        <i class="fas fa-truck"></i>
                    </div>
                    <div class="assigned-vehicle-empty-text">
                        <span class="assigned-vehicle-empty-title">No Vehicle Assigned</span>
                        <span class="assigned-vehicle-empty-desc">Contact your Transportation Manager for vehicle assignment</span>
                    </div>
                </div>
            `;
        }
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-tachometer-alt"></i> Dashboard Overview</h2>
                <p class="page-subtitle">Welcome! Here's your daily summary</p>
            </div>

            <div class="assigned-vehicle-section" data-assigned-vehicle>
                <div class="assigned-vehicle-card assigned-vehicle-loading">
                    <div class="assigned-vehicle-icon">
                        <i class="fas fa-spinner fa-spin"></i>
                    </div>
                    <span>Loading assigned vehicle...</span>
                </div>
            </div>

            <div class="grid">
                <div class="summary-card clickable" data-action="navigate" data-section="trip-log">
                    <div class="summary-card-content">
                        <div class="summary-icon"><i class="fas fa-route"></i></div>
                        <div class="summary-details">
                            <div class="summary-title">Today's Trips</div>
                            <div class="summary-number" data-summary="trip-count">0</div>
                            <div class="summary-description">trips scheduled today</div>
                        </div>
                    </div>
                    <div class="summary-arrow"><i class="fas fa-chevron-right"></i></div>
                </div>

                <div class="summary-card clickable" data-action="navigate" data-section="vehicle-check">
                    <div class="summary-card-content">
                        <div class="summary-icon"><i class="fas fa-clipboard-check"></i></div>
                        <div class="summary-details">
                            <div class="summary-title">Weekly Checks</div>
                            <div class="summary-number" data-summary="check-count">0</div>
                            <div class="summary-description">check records available</div>
                        </div>
                    </div>
                    <div class="summary-arrow"><i class="fas fa-chevron-right"></i></div>
                </div>

                <div class="summary-card clickable" data-action="navigate" data-section="fuel-mileage">
                    <div class="summary-card-content">
                        <div class="summary-icon"><i class="fas fa-gas-pump"></i></div>
                        <div class="summary-details">
                            <div class="summary-title">Distance Today</div>
                            <div class="summary-number" data-summary="distance-count">0 KM</div>
                            <div class="summary-description">total distance covered</div>
                        </div>
                    </div>
                    <div class="summary-arrow"><i class="fas fa-chevron-right"></i></div>
                </div>

                <div class="summary-card clickable" data-action="navigate" data-section="breakdown">
                    <div class="summary-card-content">
                        <div class="summary-icon"><i class="fas fa-exclamation-triangle"></i></div>
                        <div class="summary-details">
                            <div class="summary-title">Breakdown Reports</div>
                            <div class="summary-number" data-summary="breakdown-count">0</div>
                            <div class="summary-description">active breakdown report</div>
                        </div>
                    </div>
                    <div class="summary-arrow"><i class="fas fa-chevron-right"></i></div>
                </div>
            </div>

            <div class="recent-activities">
                <div class="section-header">
                    <h3 class="section-title"><i class="fas fa-chart-line"></i> Recent Activities</h3>
                </div>
                <div class="activities-list">
                    <div class="activity-item">
                        <div class="activity-content">
                            <div class="activity-title">Daily Check Approved</div>
                            <div class="activity-meta">Vehicle: LKA-1234 | 2 hours ago</div>
                            <div class="activity-description">All safety checks passed successfully</div>
                        </div>
                        <div class="activity-status"><span class="status-badge status-approved">APPROVED</span></div>
                    </div>
                    <div class="activity-item">
                        <div class="activity-content">
                            <div class="activity-title">Trip Completed</div>
                            <div class="activity-meta">TRP-001 | Galle to Colombo | 3 hours ago</div>
                            <div class="activity-description">Successfully completed cargo delivery</div>
                        </div>
                        <div class="activity-status"><span class="status-badge status-completed">COMPLETED</span></div>
                    </div>
                    <div class="activity-item">
                        <div class="activity-content">
                            <div class="activity-title">Service Due Alert</div>
                            <div class="activity-meta">Vehicle: LKA-1234 | Due in 250 KM</div>
                            <div class="activity-description">Regular maintenance service required soon</div>
                        </div>
                        <div class="activity-status"><span class="status-badge status-pending">PENDING</span></div>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (!actionEl) {
                return;
            }

            const action = actionEl.dataset.action;
            if (action === 'navigate') {
                DriverUtils.navigateTo(actionEl.dataset.section);
                return;
            }

            if (action === 'open-fuel-qr') {
                const previewImage = actionEl.closest('.assigned-vehicle-qr-content')?.querySelector('.assigned-vehicle-qr-image');
                const imageUrl = previewImage?.currentSrc || previewImage?.getAttribute('src') || actionEl.dataset.imageUrl;
                if (imageUrl) {
                    window.open(imageUrl, '_blank', 'noopener');
                }
            }
        });

        this.addEventListener('error', (event) => {
            const imageEl = event.target;
            if (!(imageEl instanceof HTMLImageElement) || !imageEl.classList.contains('assigned-vehicle-qr-image')) {
                return;
            }

            const fallbackSrc = imageEl.dataset.fallbackSrc;
            if (fallbackSrc && imageEl.src !== fallbackSrc && !imageEl.dataset.fallbackApplied) {
                imageEl.dataset.fallbackApplied = '1';
                imageEl.src = fallbackSrc;

                const openButton = imageEl.closest('.assigned-vehicle-qr-content')?.querySelector('[data-action="open-fuel-qr"]');
                if (openButton) {
                    openButton.dataset.imageUrl = fallbackSrc;
                }
                return;
            }

            if (!imageEl.dataset.errorNotified) {
                imageEl.dataset.errorNotified = '1';
                DriverUtils.showToast('Unable to load the vehicle fuel QR image.', 'warning');
            }
        }, true);
    }

    refresh() {
        const trips = Array.from(DriverUtils.store.trips.values());
        const checks = Array.from(DriverUtils.store.checks.values());
        const allBreakdowns = [
            ...DriverUtils.store.breakdowns.reports,
            ...DriverUtils.store.breakdowns.routeBreakdowns,
        ];

        const unresolvedBreakdowns = allBreakdowns.filter((item) => {
            const status = String(item.ticket_status || item.status || '').toLowerCase();
            return !(status.includes('resolved') || status.includes('completed') || status.includes('closed'));
        }).length;

        const totalDistance = trips.reduce((sum, trip) => {
            const start = Number.parseInt(trip.starting_odometer || trip.odometer || 0, 10);
            const end = Number.parseInt(trip.final_odometer || trip.finalOdometer || 0, 10);
            if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
                return sum + (end - start);
            }
            return sum;
        }, 0);

        this.querySelector('[data-summary="trip-count"]').textContent = String(trips.length);
        this.querySelector('[data-summary="check-count"]').textContent = String(checks.length);
        this.querySelector('[data-summary="distance-count"]').textContent = `${totalDistance} KM`;
        this.querySelector('[data-summary="breakdown-count"]').textContent = String(unresolvedBreakdowns);
    }
}

customElements.define('driver-dashboard-overview', DriverDashboardOverview);
