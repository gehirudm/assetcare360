class TMCargoDetails extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this._cargoItemId = null;
        this._cargoItem = null;
        this._metrics = null;
        this._monthlySeries = [];
        this._usageTrips = [];
        this._chart = null;
        this._isUpdatingActiveState = false;

        this.loadStyles();
        this.render();
        this.bindEvents();
    }

    disconnectedCallback() {
        this._destroyChart();
    }

    loadStyles() {
        const linkId = 'tm-cargo-details-styles';
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = './components/cargo-details/style.css';
            document.head.appendChild(link);
        }
    }

    render() {
        this.innerHTML = `
            <div class="cargo-details-subheader">
                <nav class="breadcrumb" aria-label="Breadcrumb">
                    <span class="breadcrumb-item"><i class="fas fa-boxes-stacked"></i> Cargo Management</span>
                    <i class="breadcrumb-sep fas fa-chevron-right"></i>
                    <span class="breadcrumb-item breadcrumb-current">Cargo Details</span>
                </nav>

                <div class="cargo-details-header-row">
                    <button class="back-icon-btn" type="button" data-action="back" aria-label="Back to cargo catalogue">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div class="cargo-details-title">
                        <h2 id="cargoDetailsTitle">Cargo Details</h2>
                        <p id="cargoDetailsSubtitle">Select a cargo item from the catalogue to inspect usage analytics.</p>
                    </div>
                </div>
            </div>

            <div id="cargoDetailsContent">
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <h3>No cargo item selected</h3>
                    <p>Open Cargo Management and click View Details on a cargo item.</p>
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
            if (action === 'back') {
                this.dispatchEvent(new CustomEvent('tm-cargo-details:back', { bubbles: true }));
                return;
            }

            if (action === 'retry') {
                this.refresh();
                return;
            }

            if (action === 'deactivate-cargo-item') {
                this._setCargoItemActiveState(false);
                return;
            }

            if (action === 'activate-cargo-item') {
                this._setCargoItemActiveState(true);
            }
        });
    }

    async open(cargoItemId) {
        this._cargoItemId = Number(cargoItemId || 0) || null;
        await this.refresh();
    }

    async refresh() {
        const container = this.querySelector('#cargoDetailsContent');
        if (!container) {
            return;
        }

        if (!this._cargoItemId) {
            this.render();
            return;
        }

        this._destroyChart();
        container.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading cargo analytics...</span>
            </div>
        `;

        try {
            const details = await this._loadCargoDetails(this._cargoItemId);
            this._cargoItem = details.cargoItem;
            this._metrics = details.metrics;
            this._usageTrips = details.usageTrips;
            this._monthlySeries = details.monthlySeries;

            this._renderCargoDetailsView();
        } catch (error) {
            container.innerHTML = `
                <div class="empty-state error">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Failed to load cargo details</h3>
                    <p>${TMUtils.escapeHtml(error.message || 'Please try again later.')}</p>
                    <button class="btn btn-secondary" type="button" data-action="retry">
                        <i class="fas fa-rotate-right"></i> Retry
                    </button>
                </div>
            `;
        }
    }

    async _loadCargoDetails(cargoItemId) {
        const [cargoItemsRes, analyticsRes, tripsRes] = await Promise.all([
            API.get('/trips/cargo-items?include_inactive=1'),
            API.get('/trips/cargo-analytics'),
            API.get('/trips'),
        ]);

        this._assertSuccess(cargoItemsRes, 'Failed to load cargo catalogue');
        this._assertSuccess(analyticsRes, 'Failed to load cargo analytics');
        this._assertSuccess(tripsRes, 'Failed to load trips data');

        const cargoItems = Array.isArray(cargoItemsRes.data?.cargo_items)
            ? cargoItemsRes.data.cargo_items
            : [];

        const cargoItem = cargoItems.find((item) => Number(item.id) === Number(cargoItemId));
        if (!cargoItem) {
            throw new Error('Selected cargo item was not found.');
        }

        const byItem = Array.isArray(analyticsRes.data?.by_item)
            ? analyticsRes.data.by_item.find((item) => Number(item.id) === Number(cargoItemId))
            : null;

        const trips = Array.isArray(tripsRes.data?.trips) ? tripsRes.data.trips : [];
        const usageTrips = this._buildUsageTrips(trips, cargoItem);
        const monthlySeries = this._buildMonthlySeries(usageTrips);

        const completedTrips = usageTrips.filter((entry) => String(entry.status || '').toLowerCase() === 'completed');
        const completedQuantity = byItem
            ? Number(byItem.total_quantity || 0)
            : completedTrips.reduce((sum, trip) => sum + Number(trip.quantity || 0), 0);
        const completedTripCount = byItem
            ? Number(byItem.trips_count || 0)
            : completedTrips.length;

        const dangerousTripCount = usageTrips.filter((entry) => Number(entry.dangerousQuantity || 0) > 0).length;
        const latestTransported = byItem?.last_transported_at
            || (completedTrips[0] ? completedTrips[0].timeline : null)
            || null;

        return {
            cargoItem,
            usageTrips,
            monthlySeries,
            metrics: {
                completedQuantity,
                completedTripCount,
                dangerousTripCount,
                latestTransported,
            },
        };
    }

    _buildUsageTrips(trips, cargoItem) {
        const cargoDbId = Number(cargoItem.id || 0);
        const cargoCode = String(cargoItem.cargo_item_id || '').trim();

        const usage = [];
        trips.forEach((trip) => {
            const rows = Array.isArray(trip.cargo_items) ? trip.cargo_items : [];
            if (!rows.length) {
                return;
            }

            const matchingRows = rows.filter((row) => {
                const rowDbId = Number(row.cargo_item_db_id || row.id || 0);
                if (rowDbId > 0 && cargoDbId > 0) {
                    return rowDbId === cargoDbId;
                }

                const rowCode = String(row.cargo_item_id || '').trim();
                return cargoCode !== '' && rowCode !== '' && rowCode === cargoCode;
            });

            if (!matchingRows.length) {
                return;
            }

            const quantity = matchingRows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
            const dangerousQuantity = matchingRows.reduce((sum, row) => {
                if (Number(row.is_dangerous) === 1) {
                    return sum + Number(row.quantity || 0);
                }
                return sum;
            }, 0);

            const timeline = trip.end_time || trip.updated_at || trip.start_time || trip.created_at || null;

            usage.push({
                trip_id: trip.trip_id || 'N/A',
                origin: trip.origin || 'N/A',
                destination: trip.destination || 'N/A',
                status: trip.status || 'Unknown',
                quantity,
                dangerousQuantity,
                hasDangerousCargo: dangerousQuantity > 0,
                timeline,
            });
        });

        return usage.sort((a, b) => new Date(b.timeline || 0).getTime() - new Date(a.timeline || 0).getTime());
    }

    _buildMonthlySeries(usageTrips) {
        const completed = usageTrips.filter((entry) => String(entry.status || '').toLowerCase() === 'completed');
        const source = completed.length > 0 ? completed : usageTrips;

        const monthlyMap = new Map();
        source.forEach((entry) => {
            if (!entry.timeline) {
                return;
            }

            const date = new Date(entry.timeline);
            if (Number.isNaN(date.getTime())) {
                return;
            }

            const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const existing = monthlyMap.get(month) || {
                month,
                totalQuantity: 0,
                dangerousQuantity: 0,
                tripsCount: 0,
            };

            existing.totalQuantity += Number(entry.quantity || 0);
            existing.dangerousQuantity += Number(entry.dangerousQuantity || 0);
            existing.tripsCount += 1;
            monthlyMap.set(month, existing);
        });

        return Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));
    }

    _renderCargoDetailsView() {
        const content = this.querySelector('#cargoDetailsContent');
        const title = this.querySelector('#cargoDetailsTitle');
        const subtitle = this.querySelector('#cargoDetailsSubtitle');

        if (!content || !this._cargoItem || !this._metrics) {
            return;
        }

        const isDangerous = Number(this._cargoItem.is_dangerous) === 1;
        const isActive = Number(this._cargoItem.is_active) === 1;
        const statusInfo = TMUtils.getStatusInfo(isActive ? 'Active' : 'Inactive');
        const latestTransported = this._metrics.latestTransported
            ? TMUtils.formatDateTime(this._metrics.latestTransported)
            : 'No completed trips yet';

        if (title) {
            title.innerHTML = `<i class="fas fa-boxes-stacked"></i> ${TMUtils.escapeHtml(this._cargoItem.name || 'Cargo Item')}`;
        }

        if (subtitle) {
            subtitle.textContent = `${this._cargoItem.cargo_item_id || 'N/A'} | Unit: ${this._cargoItem.unit || 'units'} | ${isDangerous ? 'Dangerous' : 'Non-dangerous'} cargo`;
        }

        content.innerHTML = `
            <div class="card" data-cargo-analytics-root>
                <div class="card-header">
                    <span><i class="fas fa-chart-area"></i> Cargo Item Analytics</span>
                    <span class="status-badge ${statusInfo.badge}">${statusInfo.label}</span>
                </div>
                <div class="cargo-metrics-grid">
                    <div class="metric-card">
                        <span class="metric-label">Completed Quantity</span>
                        <div class="metric-value">${TMUtils.formatQuantity(this._metrics.completedQuantity)} ${TMUtils.escapeHtml(this._cargoItem.unit || 'units')}</div>
                    </div>
                    <div class="metric-card">
                        <span class="metric-label">Completed Trips</span>
                        <div class="metric-value">${Number(this._metrics.completedTripCount || 0)}</div>
                    </div>
                    <div class="metric-card ${isDangerous ? 'danger' : ''}">
                        <span class="metric-label">Trips With Dangerous Load</span>
                        <div class="metric-value">${Number(this._metrics.dangerousTripCount || 0)}</div>
                    </div>
                    <div class="metric-card">
                        <span class="metric-label">Last Transported</span>
                        <div class="metric-value metric-value-small">${TMUtils.escapeHtml(latestTransported)}</div>
                    </div>
                </div>
            </div>

            <div class="cargo-details-split-grid">
                <div class="card cargo-chart-shell">
                    <div class="card-header">
                        <span><i class="fas fa-chart-line"></i> Monthly Usage Trend</span>
                    </div>
                    ${this._monthlySeries.length > 0
                        ? '<canvas id="cargoDetailsTrendChart"></canvas>'
                        : `
                            <div class="empty-state" style="padding: 20px;">
                                <i class="fas fa-chart-line"></i>
                                <h3>No monthly trend data</h3>
                                <p>This cargo item has not been transported yet.</p>
                            </div>
                        `}
                </div>

                <div class="card cargo-profile-card">
                    <div class="card-header">
                        <span><i class="fas fa-clipboard-list"></i> Cargo Profile</span>
                    </div>
                    <div class="cargo-profile-actions">
                        ${isActive
                            ? '<button class="btn btn-danger btn-small" type="button" data-action="deactivate-cargo-item"><i class="fas fa-ban"></i> Deactivate Cargo Item</button>'
                            : '<button class="btn btn-secondary btn-small" type="button" data-action="activate-cargo-item"><i class="fas fa-rotate-left"></i> Reactivate Cargo Item</button>'}
                    </div>
                    <div class="cargo-profile-list">
                        <div class="cargo-profile-item">
                            <span class="cargo-profile-label">Cargo Code</span>
                            <strong>${TMUtils.escapeHtml(this._cargoItem.cargo_item_id || 'N/A')}</strong>
                        </div>
                        <div class="cargo-profile-item">
                            <span class="cargo-profile-label">Unit</span>
                            <strong>${TMUtils.escapeHtml(this._cargoItem.unit || 'units')}</strong>
                        </div>
                        <div class="cargo-profile-item">
                            <span class="cargo-profile-label">Cargo Type</span>
                            <strong>${isDangerous ? 'Dangerous' : 'Non-dangerous'}</strong>
                        </div>
                        <div class="cargo-profile-item">
                            <span class="cargo-profile-label">Status</span>
                            <strong>${isActive ? 'Active' : 'Inactive'}</strong>
                        </div>
                        <div class="cargo-profile-item">
                            <span class="cargo-profile-label">Created</span>
                            <strong>${TMUtils.escapeHtml(TMUtils.formatDateTime(this._cargoItem.created_at))}</strong>
                        </div>
                        <div class="cargo-profile-item">
                            <span class="cargo-profile-label">Last Updated</span>
                            <strong>${TMUtils.escapeHtml(TMUtils.formatDateTime(this._cargoItem.updated_at || this._cargoItem.created_at))}</strong>
                        </div>
                    </div>
                    <div class="cargo-description-block">
                        <span class="cargo-profile-label">Description</span>
                        <p>${TMUtils.escapeHtml(this._cargoItem.description || 'No description provided.')}</p>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-road"></i> Recent Trip Usage</span>
                </div>
                <div class="cargo-trip-list">
                    ${this._usageTrips.length
                        ? this._usageTrips.slice(0, 10).map((entry) => {
                            const status = TMUtils.getStatusInfo(entry.status);
                            return `
                                <div class="cargo-trip-item">
                                    <div class="cargo-trip-item-head">
                                        <strong>${TMUtils.escapeHtml(entry.trip_id)}</strong>
                                        <span class="status-badge ${status.badge}">${TMUtils.escapeHtml(status.label)}</span>
                                    </div>
                                    <div class="cargo-trip-meta">
                                        <span><i class="fas fa-route"></i> ${TMUtils.escapeHtml(entry.origin)} → ${TMUtils.escapeHtml(entry.destination)}</span>
                                        <span><i class="fas fa-weight-hanging"></i> ${TMUtils.formatQuantity(entry.quantity)} ${TMUtils.escapeHtml(this._cargoItem.unit || 'units')}</span>
                                        <span><i class="fas fa-calendar-day"></i> ${TMUtils.escapeHtml(TMUtils.formatDateTime(entry.timeline))}</span>
                                    </div>
                                </div>
                            `;
                        }).join('')
                        : `
                            <div class="empty-state" style="padding: 20px;">
                                <i class="fas fa-road"></i>
                                <h3>No trip usage found</h3>
                                <p>No trips currently include this cargo item.</p>
                            </div>
                        `}
                </div>
            </div>
        `;

        this._renderChart();
    }

    async _setCargoItemActiveState(shouldBeActive) {
        if (this._isUpdatingActiveState) {
            return;
        }

        const cargoItemId = Number(this._cargoItem?.id || this._cargoItemId || 0);
        if (cargoItemId <= 0 || !this._cargoItem) {
            TMUtils.emitToast('Cargo item not found', 'error');
            return;
        }

        const actionLabel = shouldBeActive ? 'reactivate' : 'deactivate';
        const confirmed = confirm(`Are you sure you want to ${actionLabel} "${this._cargoItem.name}"?`);
        if (!confirmed) {
            return;
        }

        this._isUpdatingActiveState = true;
        try {
            if (shouldBeActive) {
                const response = await API.put(`/trips/cargo-items/${cargoItemId}`, { is_active: true });
                this._assertSuccess(response, 'Failed to reactivate cargo item');
                TMUtils.emitToast('Cargo item reactivated successfully', 'success');
            } else {
                const response = await API.delete(`/trips/cargo-items/${cargoItemId}`);
                this._assertSuccess(response, 'Failed to deactivate cargo item');
                TMUtils.emitToast('Cargo item deactivated successfully', 'success');
            }

            await this.refresh();
            this.dispatchEvent(new CustomEvent('tm-cargo-details:active-state-updated', {
                bubbles: true,
                detail: {
                    itemId: cargoItemId,
                    isActive: shouldBeActive,
                },
            }));
        } catch (error) {
            TMUtils.emitToast(error.message || `Failed to ${actionLabel} cargo item`, 'error');
        } finally {
            this._isUpdatingActiveState = false;
        }
    }

    _renderChart() {
        const canvas = this.querySelector('#cargoDetailsTrendChart');
        if (!canvas) {
            return;
        }

        if (!window.Chart) {
            const chartShell = canvas.closest('.cargo-chart-shell');
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

        const labels = this._monthlySeries.map((entry) => entry.month);
        const totalValues = this._monthlySeries.map((entry) => Number(entry.totalQuantity || 0));
        const dangerousValues = this._monthlySeries.map((entry) => Number(entry.dangerousQuantity || 0));

        this._destroyChart();
        this._chart = new window.Chart(canvas, {
            data: {
                labels,
                datasets: [
                    {
                        type: 'bar',
                        label: 'Total Quantity',
                        data: totalValues,
                        backgroundColor: 'rgba(37, 99, 235, 0.35)',
                        borderColor: 'rgba(37, 99, 235, 0.9)',
                        borderWidth: 1,
                        yAxisID: 'yQuantity',
                    },
                    {
                        type: 'line',
                        label: 'Dangerous Quantity',
                        data: dangerousValues,
                        borderColor: 'rgba(220, 38, 38, 1)',
                        backgroundColor: 'rgba(220, 38, 38, 0.18)',
                        borderWidth: 2,
                        tension: 0.25,
                        yAxisID: 'yQuantity',
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
                    yQuantity: {
                        type: 'linear',
                        beginAtZero: true,
                        ticks: {
                            precision: 0,
                        },
                    },
                },
            },
        });
    }

    _destroyChart() {
        if (this._chart && typeof this._chart.destroy === 'function') {
            this._chart.destroy();
            this._chart = null;
        }
    }

    _assertSuccess(response, fallbackMessage) {
        if (response && (response.success === true || response.status === 'success')) {
            return;
        }

        const message = response?.message || fallbackMessage;
        throw new Error(message);
    }
}

customElements.define('tm-cargo-details', TMCargoDetails);
