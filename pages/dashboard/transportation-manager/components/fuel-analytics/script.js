class TMFuelAnalytics extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this._logs = [];
        this._selectedVehicle = 'all';
        this._charts = {
            costTrend: null,
            benchmark: null,
        };

        this.loadStyles();
        this.render();
        this.bindEvents();
        this.refresh();
    }

    disconnectedCallback() {
        this.destroyCharts();
    }

    loadStyles() {
        const linkId = 'tm-analytics-pages-styles';
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = './components/analytics-pages/style.css';
            document.head.appendChild(link);
        }
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-gas-pump"></i> Fuel Analytics</h2>
                <p class="page-subtitle">Track fuel cost efficiency, consumption behavior, and benchmark performance.</p>
            </div>

            <div class="tm-analytics-toolbar">
                <div class="toolbar-group">
                    <label class="toolbar-label" for="tmFuelVehicleFilter">Vehicle</label>
                    <select id="tmFuelVehicleFilter" class="toolbar-field">
                        <option value="all">All Vehicles</option>
                    </select>
                </div>
                <button type="button" class="btn btn-secondary" data-action="refresh">
                    <i class="fas fa-rotate-right"></i> Refresh Charts
                </button>
            </div>

            <div class="tm-analytics-summary">
                <div class="tm-analytics-pill">
                    <div class="pill-label">Fuel Entries</div>
                    <div class="pill-value" id="tmFuelEntryCount">0</div>
                </div>
                <div class="tm-analytics-pill">
                    <div class="pill-label">Tracked Vehicles</div>
                    <div class="pill-value" id="tmFuelVehicleCount">0</div>
                </div>
                <div class="tm-analytics-pill">
                    <div class="pill-label">Avg Efficiency (km/L)</div>
                    <div class="pill-value" id="tmFuelAvgEfficiency">0.00</div>
                </div>
                <div class="tm-analytics-pill">
                    <div class="pill-label">Avg Cost per KM (LKR)</div>
                    <div class="pill-value" id="tmFuelAvgCostPerKm">0.00</div>
                </div>
            </div>

            <div class="tm-chart-status" id="tmFuelAnalyticsStatus"></div>

            <div class="tm-analytics-grid two-up">
                <div class="tm-chart-card">
                    <div class="chart-header">
                        <span class="chart-title">Fuel Cost per KM Trend (Monthly)</span>
                        <span class="chart-subtitle">Monthly cost efficiency per vehicle based on logged cost and distance.</span>
                    </div>
                    <div class="tm-chart-canvas-wrap">
                        <canvas id="tmFuelCostTrendChart"></canvas>
                        <div class="tm-chart-empty" id="tmFuelCostTrendChartEmpty"></div>
                    </div>
                    <div class="tm-chart-meta">
                        <span>Decision use: detect high-cost routes or vehicle inefficiency.</span>
                    </div>
                </div>

                <div class="tm-chart-card">
                    <div class="chart-header">
                        <span class="chart-title">Fuel Volume vs Efficiency Benchmark</span>
                        <span class="chart-subtitle">Last 12 log entries with benchmark efficiency line.</span>
                    </div>
                    <div class="tm-chart-canvas-wrap">
                        <canvas id="tmFuelBenchmarkChart"></canvas>
                        <div class="tm-chart-empty" id="tmFuelBenchmarkChartEmpty"></div>
                    </div>
                    <div class="tm-chart-meta">
                        <span>Decision use: identify sudden fuel efficiency drops quickly.</span>
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

            if (actionEl.dataset.action === 'refresh') {
                this.refresh();
            }
        });

        const vehicleFilter = this.querySelector('#tmFuelVehicleFilter');
        if (vehicleFilter) {
            vehicleFilter.addEventListener('change', () => {
                this._selectedVehicle = vehicleFilter.value || 'all';
                this.updateSummary();
                this.renderCharts();
            });
        }
    }

    async refresh() {
        const statusEl = this.querySelector('#tmFuelAnalyticsStatus');
        if (statusEl) {
            statusEl.className = 'tm-chart-status';
            statusEl.textContent = 'Loading fuel analytics...';
        }

        try {
            const response = await API.get('/fuel-logs');
            if (!this.isSuccessResponse(response)) {
                throw new Error(response?.message || 'Failed to load fuel analytics');
            }

            this._logs = this.extractFuelLogs(response);
            this.populateVehicleFilter();
            this.updateSummary();
            this.renderCharts();

            if (statusEl) {
                statusEl.textContent = `Updated from ${this._logs.length} fuel records.`;
            }
        } catch (error) {
            console.error('TM fuel analytics refresh failed:', error);
            this._logs = [];
            this.populateVehicleFilter();
            this.updateSummary();
            this.renderCharts();

            if (statusEl) {
                statusEl.className = 'tm-chart-status error';
                statusEl.textContent = error?.message || 'Failed to load fuel analytics.';
            }
        }
    }

    populateVehicleFilter() {
        const select = this.querySelector('#tmFuelVehicleFilter');
        if (!select) {
            return;
        }

        const uniqueVehicles = Array.from(new Set(
            this._logs
                .map((log) => String(log.vehicle_registration || '').trim())
                .filter((registration) => registration !== '')
        )).sort((a, b) => a.localeCompare(b));

        const currentValue = this._selectedVehicle;
        select.innerHTML = '<option value="all">All Vehicles</option>';

        uniqueVehicles.forEach((registration) => {
            const option = document.createElement('option');
            option.value = registration;
            option.textContent = registration;
            select.appendChild(option);
        });

        if (currentValue !== 'all' && uniqueVehicles.includes(currentValue)) {
            select.value = currentValue;
            this._selectedVehicle = currentValue;
            return;
        }

        this._selectedVehicle = 'all';
        select.value = 'all';
    }

    getFilteredLogs() {
        if (this._selectedVehicle === 'all') {
            return [...this._logs];
        }

        return this._logs.filter((log) => {
            return String(log.vehicle_registration || '').trim() === this._selectedVehicle;
        });
    }

    updateSummary() {
        const filteredLogs = this.getFilteredLogs();
        const vehicles = new Set(filteredLogs.map((log) => String(log.vehicle_registration || '').trim()).filter(Boolean));

        const efficiencyValues = filteredLogs
            .map((log) => Number.parseFloat(log.fuel_efficiency))
            .filter((value) => Number.isFinite(value) && value > 0);

        const avgEfficiency = efficiencyValues.length
            ? efficiencyValues.reduce((sum, value) => sum + value, 0) / efficiencyValues.length
            : 0;

        let totalCost = 0;
        let totalDistance = 0;
        filteredLogs.forEach((log) => {
            const cost = Number.parseFloat(log.total_cost);
            const distance = Number.parseFloat(log.distance_since_last);
            if (Number.isFinite(cost) && cost > 0 && Number.isFinite(distance) && distance > 0) {
                totalCost += cost;
                totalDistance += distance;
            }
        });

        const avgCostPerKm = totalDistance > 0 ? totalCost / totalDistance : 0;

        this.setText('#tmFuelEntryCount', String(filteredLogs.length));
        this.setText('#tmFuelVehicleCount', String(vehicles.size));
        this.setText('#tmFuelAvgEfficiency', avgEfficiency.toFixed(2));
        this.setText('#tmFuelAvgCostPerKm', avgCostPerKm.toFixed(2));
    }

    renderCharts() {
        this.renderCostTrendChart();
        this.renderBenchmarkChart();
    }

    renderCostTrendChart() {
        const canvas = this.querySelector('#tmFuelCostTrendChart');
        if (!canvas || !this.isChartReady('#tmFuelCostTrendChartEmpty')) {
            return;
        }

        const filteredLogs = this.getFilteredLogs();
        if (!filteredLogs.length) {
            this.showEmpty('#tmFuelCostTrendChartEmpty', 'fa-gas-pump', 'No fuel logs available for cost trend analytics.');
            this.destroyChart('costTrend');
            return;
        }

        const vehicleCounts = new Map();
        filteredLogs.forEach((log) => {
            const registration = String(log.vehicle_registration || '').trim();
            vehicleCounts.set(registration, (vehicleCounts.get(registration) || 0) + 1);
        });

        const selectedVehicles = this._selectedVehicle === 'all'
            ? Array.from(vehicleCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4).map((entry) => entry[0])
            : [this._selectedVehicle];

        const monthlyByVehicle = new Map();
        const monthSet = new Set();

        filteredLogs.forEach((log) => {
            const registration = String(log.vehicle_registration || '').trim();
            if (!selectedVehicles.includes(registration)) {
                return;
            }

            const date = new Date(log.log_datetime || 0);
            if (Number.isNaN(date.getTime())) {
                return;
            }

            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const cost = Number.parseFloat(log.total_cost);
            const distance = Number.parseFloat(log.distance_since_last);

            if (!(Number.isFinite(cost) && cost > 0 && Number.isFinite(distance) && distance > 0)) {
                return;
            }

            monthSet.add(monthKey);

            if (!monthlyByVehicle.has(registration)) {
                monthlyByVehicle.set(registration, new Map());
            }

            const vehicleMonths = monthlyByVehicle.get(registration);
            const current = vehicleMonths.get(monthKey) || { totalCost: 0, totalDistance: 0 };
            current.totalCost += cost;
            current.totalDistance += distance;
            vehicleMonths.set(monthKey, current);
        });

        const monthLabels = Array.from(monthSet).sort().slice(-6);
        if (!monthLabels.length) {
            this.showEmpty('#tmFuelCostTrendChartEmpty', 'fa-money-bill-wave', 'Not enough cost and distance data to compute monthly cost per km.');
            this.destroyChart('costTrend');
            return;
        }

        const colorPalette = [
            'rgba(37, 99, 235, 1)',
            'rgba(16, 185, 129, 1)',
            'rgba(220, 38, 38, 1)',
            'rgba(139, 92, 246, 1)',
        ];

        const datasets = selectedVehicles.map((registration, index) => {
            const vehicleMonths = monthlyByVehicle.get(registration) || new Map();
            return {
                label: registration,
                data: monthLabels.map((month) => {
                    const entry = vehicleMonths.get(month);
                    if (!entry || entry.totalDistance <= 0) {
                        return null;
                    }
                    return Number((entry.totalCost / entry.totalDistance).toFixed(3));
                }),
                borderColor: colorPalette[index % colorPalette.length],
                backgroundColor: colorPalette[index % colorPalette.length],
                tension: 0.25,
                spanGaps: true,
                yAxisID: 'yCostPerKm',
            };
        });

        const hasAnyPoint = datasets.some((dataset) => dataset.data.some((value) => value !== null));
        if (!hasAnyPoint) {
            this.showEmpty('#tmFuelCostTrendChartEmpty', 'fa-money-bill-wave', 'Not enough cost and distance data to build cost per km trend.');
            this.destroyChart('costTrend');
            return;
        }

        this.hideEmpty('#tmFuelCostTrendChartEmpty');
        this.destroyChart('costTrend');

        this._charts.costTrend = new window.Chart(canvas, {
            type: 'line',
            data: {
                labels: monthLabels,
                datasets,
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
                    yCostPerKm: {
                        type: 'linear',
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'LKR per km',
                        },
                    },
                },
            },
        });
    }

    renderBenchmarkChart() {
        const canvas = this.querySelector('#tmFuelBenchmarkChart');
        if (!canvas || !this.isChartReady('#tmFuelBenchmarkChartEmpty')) {
            return;
        }

        const filteredLogs = this.getFilteredLogs()
            .filter((log) => {
                const date = new Date(log.log_datetime || 0);
                return !Number.isNaN(date.getTime());
            })
            .sort((a, b) => new Date(a.log_datetime) - new Date(b.log_datetime))
            .slice(-12);

        if (!filteredLogs.length) {
            this.showEmpty('#tmFuelBenchmarkChartEmpty', 'fa-chart-line', 'No fuel logs available for benchmark analysis.');
            this.destroyChart('benchmark');
            return;
        }

        const labels = filteredLogs.map((log) => {
            const date = new Date(log.log_datetime);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });

        const volumeData = filteredLogs.map((log) => {
            const value = Number.parseFloat(log.fuel_volume);
            return Number.isFinite(value) ? value : 0;
        });

        const efficiencyData = filteredLogs.map((log) => {
            const value = Number.parseFloat(log.fuel_efficiency);
            return Number.isFinite(value) && value > 0 ? value : null;
        });

        const validEfficiencies = efficiencyData.filter((value) => Number.isFinite(value));
        const benchmark = validEfficiencies.length
            ? validEfficiencies.reduce((sum, value) => sum + value, 0) / validEfficiencies.length
            : null;

        this.hideEmpty('#tmFuelBenchmarkChartEmpty');
        this.destroyChart('benchmark');

        this._charts.benchmark = new window.Chart(canvas, {
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
                    {
                        type: 'line',
                        label: 'Efficiency Benchmark',
                        data: labels.map(() => benchmark),
                        borderColor: 'rgba(220, 38, 38, 0.9)',
                        borderDash: [6, 6],
                        borderWidth: 2,
                        pointRadius: 0,
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
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Litres',
                        },
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

    isSuccessResponse(response) {
        return !!response && (response.success === true || response.status === 'success');
    }

    extractFuelLogs(response) {
        const logs = response?.data?.fuel_logs;
        return Array.isArray(logs) ? logs : [];
    }

    isChartReady(emptySelector) {
        if (typeof window.Chart === 'undefined') {
            this.showEmpty(emptySelector, 'fa-chart-line', 'Chart.js is not available. Refresh the page and retry.');
            return false;
        }

        this.hideEmpty(emptySelector);
        return true;
    }

    showEmpty(selector, icon, message) {
        const emptyEl = this.querySelector(selector);
        if (!emptyEl) {
            return;
        }

        emptyEl.classList.add('visible');
        emptyEl.innerHTML = `
            <i class="fas ${icon}"></i>
            <p>${this.escapeHtml(message)}</p>
        `;
    }

    hideEmpty(selector) {
        const emptyEl = this.querySelector(selector);
        if (!emptyEl) {
            return;
        }

        emptyEl.classList.remove('visible');
        emptyEl.innerHTML = '';
    }

    destroyChart(name) {
        const chart = this._charts[name];
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
        this._charts[name] = null;
    }

    destroyCharts() {
        this.destroyChart('costTrend');
        this.destroyChart('benchmark');
    }

    setText(selector, value) {
        const el = this.querySelector(selector);
        if (el) {
            el.textContent = value;
        }
    }

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

customElements.define('tm-fuel-analytics', TMFuelAnalytics);
