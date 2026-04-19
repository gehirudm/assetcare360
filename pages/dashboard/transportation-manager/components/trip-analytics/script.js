class TMTripAnalytics extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this._trips = [];
        this._charts = {
            statusTrend: null,
            routeVolume: null,
            outcomeTrend: null,
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
                <h2 class="page-title"><i class="fas fa-chart-bar"></i> Trip Analytics</h2>
                <p class="page-subtitle">Operational trends for trip status, route demand, and weekly outcomes.</p>
            </div>

            <div class="tm-analytics-toolbar">
                <button type="button" class="btn btn-secondary" data-action="refresh">
                    <i class="fas fa-rotate-right"></i> Refresh Charts
                </button>
            </div>

            <div class="tm-analytics-summary">
                <div class="tm-analytics-pill">
                    <div class="pill-label">Total Trips</div>
                    <div class="pill-value" id="tmTripTotal">0</div>
                </div>
                <div class="tm-analytics-pill">
                    <div class="pill-label">Active Trips</div>
                    <div class="pill-value" id="tmTripActive">0</div>
                </div>
                <div class="tm-analytics-pill">
                    <div class="pill-label">Pending Queue</div>
                    <div class="pill-value" id="tmTripPending">0</div>
                </div>
                <div class="tm-analytics-pill">
                    <div class="pill-label">Completed Trips</div>
                    <div class="pill-value" id="tmTripCompleted">0</div>
                </div>
            </div>

            <div class="tm-chart-status" id="tmTripAnalyticsStatus"></div>

            <div class="tm-analytics-grid">
                <div class="tm-chart-card">
                    <div class="chart-header">
                        <span class="chart-title">Daily Trip Status Trend (Last 14 Days)</span>
                        <span class="chart-subtitle">Pending, accepted, in-progress, completed, rejected, and cancelled trip counts.</span>
                    </div>
                    <div class="tm-chart-canvas-wrap">
                        <canvas id="tmTripStatusTrendChart"></canvas>
                        <div class="tm-chart-empty" id="tmTripStatusTrendChartEmpty"></div>
                    </div>
                    <div class="tm-chart-meta">
                        <span>Decision use: detect queue build-up and completion consistency.</span>
                    </div>
                </div>

                <div class="tm-chart-card">
                    <div class="chart-header">
                        <span class="chart-title">Top Route Corridors by Trip Volume</span>
                        <span class="chart-subtitle">Most frequently used origin-destination corridors.</span>
                    </div>
                    <div class="tm-chart-canvas-wrap">
                        <canvas id="tmRouteVolumeChart"></canvas>
                        <div class="tm-chart-empty" id="tmRouteVolumeChartEmpty"></div>
                    </div>
                    <div class="tm-chart-meta">
                        <span>Decision use: rebalance trip allocation and route planning.</span>
                    </div>
                </div>

                <div class="tm-chart-card">
                    <div class="chart-header">
                        <span class="chart-title">Weekly Outcome Trend (Last 8 Weeks)</span>
                        <span class="chart-subtitle">Completed vs rejected vs cancelled outcomes by ISO week.</span>
                    </div>
                    <div class="tm-chart-canvas-wrap">
                        <canvas id="tmTripOutcomeTrendChart"></canvas>
                        <div class="tm-chart-empty" id="tmTripOutcomeTrendChartEmpty"></div>
                    </div>
                    <div class="tm-chart-meta">
                        <span>Decision use: monitor operational reliability over time.</span>
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
    }

    async refresh() {
        const statusEl = this.querySelector('#tmTripAnalyticsStatus');
        if (statusEl) {
            statusEl.className = 'tm-chart-status';
            statusEl.textContent = 'Loading trip analytics...';
        }

        try {
            const response = await API.get('/trips');
            if (!this.isSuccessResponse(response)) {
                throw new Error(response?.message || 'Failed to load trip analytics');
            }

            this._trips = this.extractTrips(response);
            this.updateSummary();
            this.renderCharts();

            if (statusEl) {
                statusEl.textContent = `Updated from ${this._trips.length} trip records.`;
            }
        } catch (error) {
            console.error('TM trip analytics refresh failed:', error);
            this._trips = [];
            this.updateSummary();
            this.renderCharts();

            if (statusEl) {
                statusEl.className = 'tm-chart-status error';
                statusEl.textContent = error?.message || 'Failed to load trip analytics.';
            }
        }
    }

    updateSummary() {
        const total = this._trips.length;
        const active = this._trips.filter((trip) => this.normalizeStatus(trip.status) === 'In Progress').length;
        const pending = this._trips.filter((trip) => {
            const status = this.normalizeStatus(trip.status);
            return status === 'Pending' || status === 'Accepted';
        }).length;
        const completed = this._trips.filter((trip) => this.normalizeStatus(trip.status) === 'Completed').length;

        this.setText('#tmTripTotal', String(total));
        this.setText('#tmTripActive', String(active));
        this.setText('#tmTripPending', String(pending));
        this.setText('#tmTripCompleted', String(completed));
    }

    renderCharts() {
        this.renderStatusTrendChart();
        this.renderRouteVolumeChart();
        this.renderOutcomeTrendChart();
    }

    renderStatusTrendChart() {
        const canvas = this.querySelector('#tmTripStatusTrendChart');
        if (!canvas || !this.isChartReady(canvas, '#tmTripStatusTrendChartEmpty')) {
            return;
        }

        const days = this.buildLastDays(14);
        const statuses = ['Pending', 'Accepted', 'In Progress', 'Completed', 'Rejected', 'Cancelled'];
        const counters = new Map();

        days.forEach((day) => {
            counters.set(day.key, {
                Pending: 0,
                Accepted: 0,
                'In Progress': 0,
                Completed: 0,
                Rejected: 0,
                Cancelled: 0,
            });
        });

        this._trips.forEach((trip) => {
            const date = this.extractTripDate(trip);
            if (!date) {
                return;
            }

            const key = date.toISOString().slice(0, 10);
            if (!counters.has(key)) {
                return;
            }

            const normalizedStatus = this.normalizeStatus(trip.status);
            if (statuses.includes(normalizedStatus)) {
                counters.get(key)[normalizedStatus] += 1;
            }
        });

        const datasets = [
            { key: 'Pending', color: 'rgba(245, 158, 11, 0.85)' },
            { key: 'Accepted', color: 'rgba(59, 130, 246, 0.75)' },
            { key: 'In Progress', color: 'rgba(99, 102, 241, 0.85)' },
            { key: 'Completed', color: 'rgba(16, 185, 129, 0.85)' },
            { key: 'Rejected', color: 'rgba(220, 38, 38, 0.85)' },
            { key: 'Cancelled', color: 'rgba(100, 116, 139, 0.85)' },
        ].map((entry) => ({
            label: entry.key,
            data: days.map((day) => counters.get(day.key)[entry.key]),
            backgroundColor: entry.color,
            borderRadius: 4,
            stack: 'status',
        }));

        const totalCount = datasets.reduce((sum, dataset) => {
            return sum + dataset.data.reduce((inner, value) => inner + value, 0);
        }, 0);

        if (totalCount === 0) {
            this.showEmpty('#tmTripStatusTrendChartEmpty', 'fa-chart-bar', 'No status trend data found for the last 14 days.');
            this.destroyChart('statusTrend');
            return;
        }

        this.hideEmpty('#tmTripStatusTrendChartEmpty');
        this.destroyChart('statusTrend');

        this._charts.statusTrend = new window.Chart(canvas, {
            type: 'bar',
            data: {
                labels: days.map((day) => day.label),
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
                    x: {
                        stacked: true,
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: {
                            precision: 0,
                        },
                    },
                },
            },
        });
    }

    renderRouteVolumeChart() {
        const canvas = this.querySelector('#tmRouteVolumeChart');
        if (!canvas || !this.isChartReady(canvas, '#tmRouteVolumeChartEmpty')) {
            return;
        }

        const routeMap = new Map();
        this._trips.forEach((trip) => {
            const origin = String(trip.origin || 'Unknown').trim();
            const destination = String(trip.destination || 'Unknown').trim();
            const corridor = `${origin} -> ${destination}`;
            routeMap.set(corridor, (routeMap.get(corridor) || 0) + 1);
        });

        const topRoutes = Array.from(routeMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        if (!topRoutes.length) {
            this.showEmpty('#tmRouteVolumeChartEmpty', 'fa-route', 'No route data available to build corridor analytics.');
            this.destroyChart('routeVolume');
            return;
        }

        this.hideEmpty('#tmRouteVolumeChartEmpty');
        this.destroyChart('routeVolume');

        this._charts.routeVolume = new window.Chart(canvas, {
            type: 'bar',
            data: {
                labels: topRoutes.map((item) => item[0]),
                datasets: [
                    {
                        label: 'Trips',
                        data: topRoutes.map((item) => item[1]),
                        backgroundColor: 'rgba(37, 99, 235, 0.8)',
                        borderColor: 'rgba(37, 99, 235, 1)',
                        borderWidth: 1,
                    },
                ],
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false,
                    },
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0,
                        },
                    },
                },
            },
        });
    }

    renderOutcomeTrendChart() {
        const canvas = this.querySelector('#tmTripOutcomeTrendChart');
        if (!canvas || !this.isChartReady(canvas, '#tmTripOutcomeTrendChartEmpty')) {
            return;
        }

        const outcomeMap = new Map();
        const outcomeStatuses = ['Completed', 'Rejected', 'Cancelled'];

        this._trips.forEach((trip) => {
            const status = this.normalizeStatus(trip.status);
            if (!outcomeStatuses.includes(status)) {
                return;
            }

            const date = this.extractTripDate(trip);
            if (!date) {
                return;
            }

            const weekKey = this.getIsoWeekKey(date);
            if (!outcomeMap.has(weekKey)) {
                outcomeMap.set(weekKey, {
                    Completed: 0,
                    Rejected: 0,
                    Cancelled: 0,
                });
            }

            outcomeMap.get(weekKey)[status] += 1;
        });

        const weekKeys = Array.from(outcomeMap.keys()).sort().slice(-8);
        if (!weekKeys.length) {
            this.showEmpty('#tmTripOutcomeTrendChartEmpty', 'fa-calendar-week', 'No completed, rejected, or cancelled trips available for weekly outcomes.');
            this.destroyChart('outcomeTrend');
            return;
        }

        this.hideEmpty('#tmTripOutcomeTrendChartEmpty');
        this.destroyChart('outcomeTrend');

        this._charts.outcomeTrend = new window.Chart(canvas, {
            type: 'bar',
            data: {
                labels: weekKeys,
                datasets: [
                    {
                        label: 'Completed',
                        data: weekKeys.map((key) => outcomeMap.get(key).Completed),
                        backgroundColor: 'rgba(16, 185, 129, 0.82)',
                        stack: 'outcomes',
                    },
                    {
                        label: 'Rejected',
                        data: weekKeys.map((key) => outcomeMap.get(key).Rejected),
                        backgroundColor: 'rgba(220, 38, 38, 0.82)',
                        stack: 'outcomes',
                    },
                    {
                        label: 'Cancelled',
                        data: weekKeys.map((key) => outcomeMap.get(key).Cancelled),
                        backgroundColor: 'rgba(100, 116, 139, 0.82)',
                        stack: 'outcomes',
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
                    x: {
                        stacked: true,
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: {
                            precision: 0,
                        },
                    },
                },
            },
        });
    }

    isSuccessResponse(response) {
        return !!response && (response.success === true || response.status === 'success');
    }

    extractTrips(response) {
        const trips = response?.data?.trips;
        if (Array.isArray(trips)) {
            return trips;
        }
        return [];
    }

    normalizeStatus(value) {
        const status = String(value || '').toLowerCase();
        if (status.includes('progress')) return 'In Progress';
        if (status.includes('reject')) return 'Rejected';
        if (status.includes('cancel')) return 'Cancelled';
        if (status.includes('complete') || status.includes('resolve')) return 'Completed';
        if (status.includes('accept')) return 'Accepted';
        return 'Pending';
    }

    extractTripDate(trip) {
        const candidates = [trip?.end_time, trip?.start_time, trip?.updated_at, trip?.created_at];
        for (const value of candidates) {
            if (!value) {
                continue;
            }

            const date = new Date(value);
            if (!Number.isNaN(date.getTime())) {
                return date;
            }
        }

        return null;
    }

    buildLastDays(days) {
        const result = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = days - 1; i >= 0; i -= 1) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            result.push({
                key: date.toISOString().slice(0, 10),
                label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            });
        }

        return result;
    }

    getIsoWeekKey(date) {
        const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = target.getUTCDay() || 7;
        target.setUTCDate(target.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
        return `${target.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    }

    isChartReady(canvas, emptySelector) {
        if (typeof window.Chart === 'undefined') {
            this.showEmpty(emptySelector, 'fa-chart-line', 'Chart.js is not available. Refresh the page and retry.');
            return false;
        }

        this.hideEmpty(emptySelector);
        return !!canvas;
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
        this.destroyChart('statusTrend');
        this.destroyChart('routeVolume');
        this.destroyChart('outcomeTrend');
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

customElements.define('tm-trip-analytics', TMTripAnalytics);
