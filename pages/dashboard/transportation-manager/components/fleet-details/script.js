class TMFleetDetails extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this._vehicleId = null;
        this._vehicle = null;
        this._fuelLogs = [];
        this._trips = [];
        this._chart = null;

        this.loadStyles();
        this.render();
        this.bindEvents();
    }

    disconnectedCallback() {
        this.destroyChart();
    }

    loadStyles() {
        const linkId = 'tm-fleet-details-styles';
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = './components/fleet-details/style.css';
            document.head.appendChild(link);
        }
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (!actionEl) {
                return;
            }

            const action = actionEl.dataset.action;
            if (action === 'back') {
                this.dispatchEvent(new CustomEvent('tm-fleet-details:back', { bubbles: true }));
            }

            if (action === 'refresh') {
                this.refresh();
            }

            if (action === 'open-fuel-qr') {
                const previewImage = actionEl.closest('.fleet-qr-preview')?.querySelector('.fleet-qr-image');
                const imageUrl = previewImage?.currentSrc || previewImage?.getAttribute('src') || actionEl.dataset.imageUrl;
                if (imageUrl) {
                    window.open(imageUrl, '_blank', 'noopener');
                }
            }
        });

        this.addEventListener('submit', (event) => {
            if (event.target && event.target.id === 'vehicleFuelQrForm') {
                event.preventDefault();
                this.uploadFuelQrImage();
            }
        });

        this.addEventListener('error', (event) => {
            const imageEl = event.target;
            if (!(imageEl instanceof HTMLImageElement) || !imageEl.classList.contains('fleet-qr-image')) {
                return;
            }

            const fallbackSrc = imageEl.dataset.fallbackSrc;
            if (fallbackSrc && imageEl.src !== fallbackSrc && !imageEl.dataset.fallbackApplied) {
                imageEl.dataset.fallbackApplied = '1';
                imageEl.src = fallbackSrc;

                const openButton = imageEl.closest('.fleet-qr-preview')?.querySelector('[data-action="open-fuel-qr"]');
                if (openButton) {
                    openButton.dataset.imageUrl = fallbackSrc;
                }
                return;
            }

            if (!imageEl.dataset.errorNotified) {
                imageEl.dataset.errorNotified = '1';
                TMUtils.emitToast('Unable to render the uploaded QR image. Please reopen or re-upload the file.', 'warning');
            }
        }, true);
    }

    render() {
        this.innerHTML = `
            <div class="fleet-details-subheader">
                <nav class="breadcrumb" aria-label="Breadcrumb">
                    <span class="breadcrumb-item"><i class="fas fa-truck"></i> Fleet</span>
                    <i class="breadcrumb-sep fas fa-chevron-right"></i>
                    <span class="breadcrumb-item breadcrumb-current">Vehicle Details</span>
                </nav>

                <div class="fleet-details-header-row">
                    <button class="back-icon-btn" type="button" data-action="back" aria-label="Back to fleet">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div class="fleet-details-title">
                        <h2 id="fleetDetailsTitle">Vehicle Details</h2>
                        <p id="fleetDetailsSubtitle">Select a vehicle from Fleet to inspect analytics.</p>
                    </div>
                </div>
            </div>

            <div id="fleetDetailsContent">
                <div class="empty-state">
                    <i class="fas fa-truck"></i>
                    <h3>No vehicle selected</h3>
                    <p>Open Fleet and choose a vehicle to view analytics and driver history.</p>
                </div>
            </div>
        `;
    }

    async open(vehicleId) {
        this._vehicleId = vehicleId;
        await this.refresh();
    }

    async refresh() {
        const container = this.querySelector('#fleetDetailsContent');
        if (!container) {
            return;
        }

        if (!this._vehicleId) {
            this.render();
            return;
        }

        this.destroyChart();
        container.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading vehicle analytics...</span>
            </div>
        `;

        try {
            const details = await this.loadVehicleDetails(this._vehicleId);
            this._vehicle = details.vehicle;
            this._fuelLogs = details.fuelLogs;
            this._trips = details.trips;
            this._driverInfo = details.driverInfo;

            this.renderVehicleView();
        } catch (error) {
            container.innerHTML = `
                <div class="empty-state error">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Failed to load vehicle details</h3>
                    <p>${error.message || 'Please try again later.'}</p>
                    <button class="btn btn-secondary" type="button" data-action="refresh">
                        <i class="fas fa-rotate-right"></i> Retry
                    </button>
                </div>
            `;
        }
    }

    async loadVehicleDetails(vehicleId) {
        const vehicleRes = await API.get(`/vehicles/${encodeURIComponent(vehicleId)}`);
        const vehicle = vehicleRes.data?.vehicle || vehicleRes.data || null;
        if (!vehicle) {
            throw new Error('Vehicle not found.');
        }

        const numberPlate = vehicle.number_plate || vehicle.vehicle_registration;
        if (!numberPlate) {
            throw new Error('Vehicle registration is missing.');
        }

        const [fuelRes, tripsRes, withDriverRes] = await Promise.all([
            API.get(`/fuel-logs?vehicle_registration=${encodeURIComponent(numberPlate)}`),
            API.get('/trips'),
            API.get(`/vehicles/${encodeURIComponent(numberPlate)}/with-driver`),
        ]);

        const fuelLogs = fuelRes.data?.fuel_logs || [];
        const allTrips = tripsRes.data?.trips || [];
        const trips = allTrips.filter((trip) => trip.vehicle_registration === numberPlate);
        const driverInfo = withDriverRes.data?.vehicle || null;

        return {
            vehicle,
            fuelLogs,
            trips,
            driverInfo,
        };
    }

    renderVehicleView() {
        const content = this.querySelector('#fleetDetailsContent');
        const title = this.querySelector('#fleetDetailsTitle');
        const subtitle = this.querySelector('#fleetDetailsSubtitle');
        if (!content || !this._vehicle) {
            return;
        }

        const numberPlate = this._vehicle.number_plate || this._vehicle.vehicle_registration || '—';
        const vehicleName = this._vehicle.vehicle_name || this._vehicle.make || 'Vehicle';
        const statusInfo = TMUtils.getStatusInfo(this._vehicle.status);

        if (title) {
            title.innerHTML = `<i class="fas fa-truck"></i> ${vehicleName} (${numberPlate})`;
        }
        if (subtitle) {
            subtitle.textContent = `Status: ${statusInfo.label} | Fuel type: ${this._vehicle.fuel_type || 'N/A'}`;
        }

        const metrics = this.computeMetrics(this._fuelLogs);
        const fuelQrImageUrls = this.resolveImageUrls(this._vehicle.government_fuel_qr_image);
        const fuelQrImageUrl = fuelQrImageUrls[0] || null;
        const fuelQrFallbackUrl = fuelQrImageUrls[1] || '';
        const recentLogs = [...this._fuelLogs]
            .sort((a, b) => new Date(b.log_datetime) - new Date(a.log_datetime))
            .slice(0, 8);

        const driverHistory = this.buildDriverHistory();

        content.innerHTML = `
            <div class="card" style="margin-bottom: 16px;">
                <div class="card-header">
                    <span><i class="fas fa-chart-column"></i> Vehicle Analytics</span>
                    <span class="status-badge ${statusInfo.badge}">${statusInfo.label}</span>
                </div>
                <div class="analytics-grid">
                    <div class="metric-card">
                        <span class="metric-label">Total Fuel Entries</span>
                        <div class="metric-value">${metrics.totalEntries}</div>
                    </div>
                    <div class="metric-card">
                        <span class="metric-label">Total Fuel Volume</span>
                        <div class="metric-value">${metrics.totalVolume.toFixed(2)} L</div>
                    </div>
                    <div class="metric-card">
                        <span class="metric-label">External Fuel Cost</span>
                        <div class="metric-value">${TMUtils.formatCurrency(metrics.externalCost)}</div>
                    </div>
                    <div class="metric-card">
                        <span class="metric-label">Average Fuel Efficiency</span>
                        <div class="metric-value">${metrics.avgEfficiency ? `${metrics.avgEfficiency.toFixed(2)} km/L` : '—'}</div>
                    </div>
                </div>
                <div class="fuel-source-badges">
                    <span class="status-badge badge-ok">Internal Entries: ${metrics.internalEntries}</span>
                    <span class="status-badge badge-warn">External Entries: ${metrics.externalEntries}</span>
                    <span class="status-badge badge-blue">Current Mileage: ${TMUtils.formatOdometer(this._vehicle.current_mileage)}</span>
                </div>
            </div>

            <div class="split-grid">
                <div class="card chart-shell">
                    <div class="card-header">
                        <span><i class="fas fa-chart-line"></i> Fuel Usage Trend</span>
                    </div>
                    ${this._fuelLogs.length ? '<canvas id="vehicleFuelChart"></canvas>' : `
                        <div class="empty-state" style="padding: 20px;">
                            <i class="fas fa-chart-line"></i>
                            <h3>No fuel data to chart</h3>
                            <p>Add fuel logs to view trend analytics.</p>
                        </div>
                    `}
                </div>

                <div class="card">
                    <div class="card-header">
                        <span><i class="fas fa-users"></i> Driver History</span>
                    </div>
                    <div class="driver-history-list">
                        ${driverHistory.length ? driverHistory.map((entry) => `
                            <div class="driver-history-item">
                                <strong>${entry.name}</strong>
                                <div class="driver-history-meta">${entry.meta}</div>
                            </div>
                        `).join('') : `
                            <div class="empty-state" style="padding: 20px;">
                                <i class="fas fa-user"></i>
                                <h3>No driver history</h3>
                                <p>No trips/fuel entries were linked to this vehicle yet.</p>
                            </div>
                        `}
                    </div>
                </div>
            </div>

            <div class="card" style="margin-bottom: 16px;">
                <div class="card-header">
                    <span><i class="fas fa-qrcode"></i> Government Fuel QR</span>
                </div>
                <p class="fleet-qr-description">Upload the government-issued fuel QR image required for external fuel station transactions.</p>
                <div class="fleet-qr-grid">
                    <div class="fleet-qr-preview ${fuelQrImageUrl ? '' : 'is-empty'}">
                        ${fuelQrImageUrl ? `
                            <img src="${fuelQrImageUrl}" data-fallback-src="${fuelQrFallbackUrl}" alt="Government fuel QR for ${numberPlate}" class="fleet-qr-image">
                            <button type="button" class="btn btn-secondary btn-small" data-action="open-fuel-qr" data-image-url="${fuelQrImageUrl}">
                                <i class="fas fa-up-right-from-square"></i> Open Full Image
                            </button>
                        ` : `
                            <div class="empty-state" style="padding: 20px;">
                                <i class="fas fa-qrcode"></i>
                                <h3>No QR image uploaded</h3>
                                <p>Upload the vehicle fuel QR image to make it available for drivers.</p>
                            </div>
                        `}
                    </div>
                    <form id="vehicleFuelQrForm" class="fleet-qr-form">
                        <label for="vehicleFuelQrInput" class="fleet-qr-label">Upload or Replace QR Image</label>
                        <input id="vehicleFuelQrInput" name="fuel_qr_image" type="file" accept="image/png,image/jpeg,image/webp" required>
                        <p class="fleet-qr-hint">Supported: JPG, PNG, WEBP. Maximum size: 5MB.</p>
                        <button id="vehicleFuelQrSubmit" class="btn btn-primary" type="submit">
                            <i class="fas fa-upload"></i> Save QR Image
                        </button>
                    </form>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-gas-pump"></i> Recent Fuel Records</span>
                </div>
                <div class="fuel-history-list">
                    ${recentLogs.length ? recentLogs.map((log) => {
                        const source = (log.fuel_source || 'external').toLowerCase();
                        const sourceLabel = source === 'internal' ? 'Internal' : 'External';
                        const costText = log.total_cost !== null && log.total_cost !== undefined && log.total_cost !== ''
                            ? TMUtils.formatCurrency(log.total_cost)
                            : 'N/A (Internal)';

                        return `
                            <div class="fuel-history-item">
                                <strong>${log.fuel_log_id} · ${TMUtils.formatDateTime(log.log_datetime)}</strong>
                                <div class="fuel-history-meta">
                                    ${TMUtils.formatVolume(log.fuel_volume)} · ${sourceLabel} · ${costText} · ${TMUtils.formatOdometer(log.odometer_reading)}
                                </div>
                                <div class="fuel-history-meta">
                                    Driver: ${log.driver_name || (log.driver_id ? `Driver #${log.driver_id}` : '—')} · Station: ${log.station_name || '—'}
                                </div>
                            </div>
                        `;
                    }).join('') : `
                        <div class="empty-state" style="padding: 20px;">
                            <i class="fas fa-gas-pump"></i>
                            <h3>No fuel history</h3>
                            <p>No fuel logs were found for this vehicle.</p>
                        </div>
                    `}
                </div>
            </div>
        `;

        this.renderChart();
    }

    async uploadFuelQrImage() {
        if (!this._vehicle || !this._vehicle.id) {
            TMUtils.emitToast('Vehicle context is missing.', 'error');
            return;
        }

        const fileInput = this.querySelector('#vehicleFuelQrInput');
        const submitButton = this.querySelector('#vehicleFuelQrSubmit');
        const file = fileInput?.files?.[0];

        if (!file) {
            TMUtils.emitToast('Please select a QR image file.', 'error');
            return;
        }

        if (!file.type || !file.type.startsWith('image/')) {
            TMUtils.emitToast('Please upload a valid image file.', 'error');
            return;
        }

        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            TMUtils.emitToast('QR image must be 5MB or smaller.', 'error');
            return;
        }

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        }

        try {
            const formData = new FormData();
            formData.append('fuel_qr_image', file);

            const response = await API.postFormData(`/vehicles/${encodeURIComponent(this._vehicle.id)}/fuel-qr`, formData);

            if (!(response && (response.success || response.status === 'success'))) {
                throw new Error(response?.message || 'Failed to upload fuel QR image.');
            }

            const updatedVehicle = response.data?.vehicle || response.data || null;
            if (updatedVehicle) {
                this._vehicle = updatedVehicle;
            }

            TMUtils.emitToast('Vehicle fuel QR image updated successfully.', 'success');
            this.renderVehicleView();
        } catch (error) {
            TMUtils.emitToast(error.message || 'Failed to upload fuel QR image.', 'error');
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="fas fa-upload"></i> Save QR Image';
            }
        }
    }

    resolveImageUrl(imagePath) {
        const urls = this.resolveImageUrls(imagePath);
        return urls[0] || null;
    }

    resolveImageUrls(imagePath) {
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

        const apiOrigin = this.getApiOrigin();
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

    getApiOrigin() {
        if (typeof CONFIG === 'undefined' || !CONFIG.API_BASE_URL) {
            return null;
        }

        try {
            return new URL(CONFIG.API_BASE_URL, window.location.origin).origin;
        } catch (error) {
            return null;
        }
    }

    computeMetrics(logs) {
        let totalVolume = 0;
        let externalCost = 0;
        let totalDistance = 0;
        const efficiencyValues = [];
        let internalEntries = 0;
        let externalEntries = 0;

        logs.forEach((log) => {
            const volume = parseFloat(log.fuel_volume) || 0;
            const source = (log.fuel_source || 'external').toLowerCase();
            const cost = parseFloat(log.total_cost);
            const distance = parseFloat(log.distance_since_last);
            const efficiency = parseFloat(log.fuel_efficiency);

            totalVolume += volume;
            if (source === 'internal') {
                internalEntries += 1;
            } else {
                externalEntries += 1;
                if (Number.isFinite(cost)) {
                    externalCost += cost;
                }
            }

            if (Number.isFinite(distance)) {
                totalDistance += distance;
            }

            if (Number.isFinite(efficiency) && efficiency > 0) {
                efficiencyValues.push(efficiency);
            }
        });

        let avgEfficiency = null;
        if (efficiencyValues.length) {
            const sum = efficiencyValues.reduce((acc, val) => acc + val, 0);
            avgEfficiency = sum / efficiencyValues.length;
        } else if (totalDistance > 0 && totalVolume > 0) {
            avgEfficiency = totalDistance / totalVolume;
        }

        return {
            totalEntries: logs.length,
            totalVolume,
            externalCost,
            avgEfficiency,
            internalEntries,
            externalEntries,
        };
    }

    buildDriverHistory() {
        const historyMap = new Map();

        const assignedDriverName = this._driverInfo?.driver_name;
        if (assignedDriverName) {
            historyMap.set(`assigned:${assignedDriverName}`, {
                name: assignedDriverName,
                meta: `Currently assigned (${this._driverInfo.driver_employee_id || 'No employee ID'})`,
                ts: Number.MAX_SAFE_INTEGER,
            });
        }

        this._trips.forEach((trip) => {
            const driverName = trip.driver_name || (trip.driver_id ? `Driver #${trip.driver_id}` : null);
            if (!driverName) {
                return;
            }

            const key = `trip:${driverName}`;
            const ts = new Date(trip.end_time || trip.start_time || trip.updated_at || trip.created_at || 0).getTime();
            const existing = historyMap.get(key);
            if (!existing || ts > existing.ts) {
                historyMap.set(key, {
                    name: driverName,
                    meta: `Trip ${trip.trip_id || ''} · ${TMUtils.formatDateTime(trip.end_time || trip.start_time || trip.updated_at || trip.created_at)}`,
                    ts,
                });
            }
        });

        this._fuelLogs.forEach((log) => {
            const driverName = log.driver_name || (log.driver_id ? `Driver #${log.driver_id}` : null);
            if (!driverName) {
                return;
            }

            const key = `fuel:${driverName}`;
            const ts = new Date(log.log_datetime || 0).getTime();
            const existing = historyMap.get(key);
            if (!existing || ts > existing.ts) {
                historyMap.set(key, {
                    name: driverName,
                    meta: `Fuel log ${log.fuel_log_id || ''} · ${TMUtils.formatDateTime(log.log_datetime)}`,
                    ts,
                });
            }
        });

        return Array.from(historyMap.values())
            .sort((a, b) => b.ts - a.ts)
            .slice(0, 8);
    }

    renderChart() {
        const canvas = this.querySelector('#vehicleFuelChart');
        if (!canvas || !Array.isArray(this._fuelLogs) || !this._fuelLogs.length) {
            return;
        }

        if (typeof window.Chart === 'undefined') {
            const chartShell = canvas.closest('.chart-shell');
            if (chartShell) {
                chartShell.innerHTML = `
                    <div class="empty-state" style="padding: 20px;">
                        <i class="fas fa-chart-line"></i>
                        <h3>Chart unavailable</h3>
                        <p>Chart.js is not loaded. Refresh the page to retry.</p>
                    </div>
                `;
            }
            return;
        }

        this.destroyChart();

        const chartLogs = [...this._fuelLogs]
            .sort((a, b) => new Date(a.log_datetime) - new Date(b.log_datetime))
            .slice(-12);

        const labels = chartLogs.map((log) => TMUtils.formatDateTime(log.log_datetime));
        const volumeData = chartLogs.map((log) => parseFloat(log.fuel_volume) || 0);
        const efficiencyData = chartLogs.map((log) => {
            const efficiency = parseFloat(log.fuel_efficiency);
            return Number.isFinite(efficiency) ? efficiency : null;
        });

        this._chart = new window.Chart(canvas, {
            data: {
                labels,
                datasets: [
                    {
                        type: 'bar',
                        label: 'Fuel Volume (L)',
                        data: volumeData,
                        backgroundColor: 'rgba(37, 99, 235, 0.35)',
                        borderColor: 'rgba(37, 99, 235, 0.9)',
                        borderWidth: 1,
                        yAxisID: 'yVolume',
                    },
                    {
                        type: 'line',
                        label: 'Fuel Efficiency (km/L)',
                        data: efficiencyData,
                        borderColor: 'rgba(16, 185, 129, 1)',
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        borderWidth: 2,
                        tension: 0.25,
                        spanGaps: true,
                        yAxisID: 'yEfficiency',
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                },
                scales: {
                    yVolume: {
                        type: 'linear',
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Litres',
                        },
                        beginAtZero: true,
                    },
                    yEfficiency: {
                        type: 'linear',
                        position: 'right',
                        title: {
                            display: true,
                            text: 'km/L',
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    },
                },
            },
        });
    }

    destroyChart() {
        if (this._chart && typeof this._chart.destroy === 'function') {
            this._chart.destroy();
            this._chart = null;
        }
    }
}

customElements.define('tm-fleet-details', TMFleetDetails);
