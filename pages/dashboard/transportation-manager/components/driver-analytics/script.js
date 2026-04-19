class TMDriverAnalytics extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this._trips = [];
        this._charts = {
            workload: null,
            completionRate: null,
            weeklyActive: null,
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
                <h2 class="page-title"><i class="fas fa-users"></i> Driver Analytics</h2>
                <p class="page-subtitle">Evaluate driver workload balance, completion reliability, and weekly activity trends.</p>
            </div>

            <div class="tm-analytics-toolbar">
                <button type="button" class="btn btn-secondary" data-action="refresh">
                    <i class="fas fa-rotate-right"></i> Refresh Charts
                </button>
            </div>

            <div class="tm-analytics-summary">
                <div class="tm-analytics-pill">
                    <div class="pill-label">Drivers With Trips</div>
                    <div class="pill-value" id="tmDriverCount">0</div>
                </div>
                <div class="tm-analytics-pill">
                    <div class="pill-label">Drivers Currently Active</div>
                    <div class="pill-value" id="tmDriverActiveCount">0</div>
                </div>
                <div class="tm-analytics-pill">
                    <div class="pill-label">Avg Trips per Driver</div>
                    <div class="pill-value" id="tmDriverAvgTrips">0.00</div>
                </div>
                <div class="tm-analytics-pill">
                    <div class="pill-label">Overall Completion Rate</div>
                    <div class="pill-value" id="tmDriverCompletionRate">0.0%</div>
                </div>
            </div>

            <div class="tm-chart-status" id="tmDriverAnalyticsStatus"></div>

            <div class="tm-analytics-grid">
                <div class="tm-chart-card">
                    <div class="chart-header">
                        <span class="chart-title">Driver Workload & Status Mix (Top 10)</span>
                        <span class="chart-subtitle">Queued, in-progress, completed, and interrupted trips by driver.</span>
                    </div>
                    <div class="tm-chart-canvas-wrap">
                        <canvas id="tmDriverWorkloadChart"></canvas>
                        <div class="tm-chart-empty" id="tmDriverWorkloadChartEmpty"></div>
                    </div>
                    <div class="tm-chart-meta">
                        <span>Decision use: rebalance workload when queue pressure concentrates on a few drivers.</span>
                    </div>
                </div>

                <div class="tm-chart-card">
                    <div class="chart-header">
                        <span class="chart-title">Driver Completion Rate (Top 10 by Trip Count)</span>
                        <span class="chart-subtitle">Completion percentage by driver with average benchmark reference.</span>
                    </div>
                    <div class="tm-chart-canvas-wrap">
                        <canvas id="tmDriverCompletionChart"></canvas>
                        <div class="tm-chart-empty" id="tmDriverCompletionChartEmpty"></div>
                    </div>
                    <div class="tm-chart-meta">
                        <span>Decision use: identify coaching opportunities for drivers with low completion consistency.</span>
                    </div>
                </div>

                <div class="tm-chart-card">
                    <div class="chart-header">
                        <span class="chart-title">Weekly Active Drivers Trend (Last 10 Weeks)</span>
                        <span class="chart-subtitle">Unique active drivers compared against completed trip volume.</span>
                    </div>
                    <div class="tm-chart-canvas-wrap">
                        <canvas id="tmDriverWeeklyTrendChart"></canvas>
                        <div class="tm-chart-empty" id="tmDriverWeeklyTrendChartEmpty"></div>
                    </div>
                    <div class="tm-chart-meta">
                        <span>Decision use: match staffing levels to trip throughput over time.</span>
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
        const statusEl = this.querySelector('#tmDriverAnalyticsStatus');
        if (statusEl) {
            statusEl.className = 'tm-chart-status';
            statusEl.textContent = 'Loading driver analytics...';
        }

        try {
            const response = await API.get('/trips');
            if (!this.isSuccessResponse(response)) {
                throw new Error(response?.message || 'Failed to load driver analytics');
            }

            this._trips = this.extractTrips(response);
            this.updateSummary();
            this.renderCharts();

            if (statusEl) {
                statusEl.textContent = `Updated from ${this._trips.length} trip records.`;
            }
        } catch (error) {
            console.error('TM driver analytics refresh failed:', error);
            this._trips = [];
            this.updateSummary();
            this.renderCharts();

            if (statusEl) {
                statusEl.className = 'tm-chart-status error';
                statusEl.textContent = error?.message || 'Failed to load driver analytics.';
            }
        }
    }

    updateSummary() {
        const drivers = this.buildDriverStats();
        const driverList = Array.from(drivers.values());

        const activeDrivers = driverList.filter((driver) => {
            return driver.queued + driver.inProgress > 0;
        }).length;

        const totalTrips = driverList.reduce((sum, driver) => sum + driver.totalTrips, 0);
        const completedTrips = driverList.reduce((sum, driver) => sum + driver.completed, 0);
        const avgTrips = driverList.length > 0 ? totalTrips / driverList.length : 0;
        const completionRate = totalTrips > 0 ? (completedTrips / totalTrips) * 100 : 0;

        this.setText('#tmDriverCount', String(driverList.length));
        this.setText('#tmDriverActiveCount', String(activeDrivers));
        this.setText('#tmDriverAvgTrips', avgTrips.toFixed(2));
        this.setText('#tmDriverCompletionRate', `${completionRate.toFixed(1)}%`);
    }

    renderCharts() {
        const drivers = this.buildDriverStats();
        this.renderWorkloadChart(drivers);
        this.renderCompletionRateChart(drivers);
        this.renderWeeklyTrendChart(drivers);
    }

    buildDriverStats() {
        const map = new Map();

        this._trips.forEach((trip) => {
            const driver = this.getDriverInfo(trip);
            if (!driver) {
                return;
            }

            if (!map.has(driver.key)) {
                map.set(driver.key, {
                    key: driver.key,
                    label: driver.label,
                    totalTrips: 0,
                    queued: 0,
                    inProgress: 0,
                    completed: 0,
                    interrupted: 0,
                    datePoints: [],
                });
            }

            const item = map.get(driver.key);
            item.totalTrips += 1;

            const status = this.normalizeStatus(trip.status);
            if (status === 'Pending' || status === 'Accepted') {
                item.queued += 1;
            } else if (status === 'In Progress') {
                item.inProgress += 1;
            } else if (status === 'Completed') {
                item.completed += 1;
            } else {
                item.interrupted += 1;
            }

            const date = this.extractTripDate(trip);
            if (date) {
                item.datePoints.push({
                    date,
                    status,
                });
            }
        });

        return map;
    }

    renderWorkloadChart(drivers) {
        const canvas = this.querySelector('#tmDriverWorkloadChart');
        if (!canvas || !this.isChartReady('#tmDriverWorkloadChartEmpty')) {
            return;
        }

        const top = Array.from(drivers.values())
            .sort((a, b) => b.totalTrips - a.totalTrips)
            .slice(0, 10);

        if (!top.length) {
            this.showEmpty('#tmDriverWorkloadChartEmpty', 'fa-users-slash', 'No driver trip records available yet.');
            this.destroyChart('workload');
            return;
        }

        this.hideEmpty('#tmDriverWorkloadChartEmpty');
        this.destroyChart('workload');

        this._charts.workload = new window.Chart(canvas, {
            type: 'bar',
            data: {
                labels: top.map((item) => item.label),
                datasets: [
                    {
                        label: 'Queued',
                        data: top.map((item) => item.queued),
                        backgroundColor: 'rgba(245, 158, 11, 0.85)',
                        stack: 'mix',
                    },
                    {
                        label: 'In Progress',
                        data: top.map((item) => item.inProgress),
                        backgroundColor: 'rgba(59, 130, 246, 0.8)',
                        stack: 'mix',
                    },
                    {
                        label: 'Completed',
                        data: top.map((item) => item.completed),
                        backgroundColor: 'rgba(16, 185, 129, 0.85)',
                        stack: 'mix',
                    },
                    {
                        label: 'Interrupted (Rejected/Cancelled)',
                        data: top.map((item) => item.interrupted),
                        backgroundColor: 'rgba(220, 38, 38, 0.82)',
                        stack: 'mix',
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

    renderCompletionRateChart(drivers) {
        const canvas = this.querySelector('#tmDriverCompletionChart');
        if (!canvas || !this.isChartReady('#tmDriverCompletionChartEmpty')) {
            return;
        }

        const ranked = Array.from(drivers.values())
            .sort((a, b) => b.totalTrips - a.totalTrips)
            .slice(0, 10);

        if (!ranked.length) {
            this.showEmpty('#tmDriverCompletionChartEmpty', 'fa-percent', 'No driver records available to compute completion rates.');
            this.destroyChart('completionRate');
            return;
        }

        const rates = ranked.map((driver) => {
            if (driver.totalTrips <= 0) {
                return 0;
            }
            return Number(((driver.completed / driver.totalTrips) * 100).toFixed(1));
        });

        const avgRate = rates.length
            ? rates.reduce((sum, value) => sum + value, 0) / rates.length
            : 0;

        this.hideEmpty('#tmDriverCompletionChartEmpty');
        this.destroyChart('completionRate');

        this._charts.completionRate = new window.Chart(canvas, {
            data: {
                labels: ranked.map((driver) => driver.label),
                datasets: [
                    {
                        type: 'bar',
                        label: 'Completion Rate (%)',
                        data: rates,
                        backgroundColor: rates.map((rate) => {
                            if (rate >= 85) {
                                return 'rgba(16, 185, 129, 0.82)';
                            }
                            if (rate >= 60) {
                                return 'rgba(245, 158, 11, 0.82)';
                            }
                            return 'rgba(220, 38, 38, 0.82)';
                        }),
                    },
                    {
                        type: 'line',
                        label: 'Average Benchmark',
                        data: rates.map(() => Number(avgRate.toFixed(1))),
                        borderColor: 'rgba(37, 99, 235, 0.95)',
                        borderWidth: 2,
                        borderDash: [6, 6],
                        pointRadius: 0,
                        tension: 0,
                    },
                ],
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: (value) => `${value}%`,
                        },
                    },
                },
            },
        });
    }

    renderWeeklyTrendChart(drivers) {
        const canvas = this.querySelector('#tmDriverWeeklyTrendChart');
        if (!canvas || !this.isChartReady('#tmDriverWeeklyTrendChartEmpty')) {
            return;
        }

        const weekMap = new Map();

        Array.from(drivers.values()).forEach((driver) => {
            driver.datePoints.forEach((point) => {
                const weekKey = this.getIsoWeekKey(point.date);
                if (!weekMap.has(weekKey)) {
                    weekMap.set(weekKey, {
                        drivers: new Set(),
                        completed: 0,
                    });
                }

                const entry = weekMap.get(weekKey);
                entry.drivers.add(driver.key);
                if (point.status === 'Completed') {
                    entry.completed += 1;
                }
            });
        });

        const weekKeys = Array.from(weekMap.keys()).sort().slice(-10);
        if (!weekKeys.length) {
            this.showEmpty('#tmDriverWeeklyTrendChartEmpty', 'fa-calendar-week', 'No dated trip records found for weekly trend analysis.');
            this.destroyChart('weeklyActive');
            return;
        }

        this.hideEmpty('#tmDriverWeeklyTrendChartEmpty');
        this.destroyChart('weeklyActive');

        this._charts.weeklyActive = new window.Chart(canvas, {
            data: {
                labels: weekKeys,
                datasets: [
                    {
                        type: 'line',
                        label: 'Active Drivers',
                        data: weekKeys.map((key) => weekMap.get(key).drivers.size),
                        borderColor: 'rgba(37, 99, 235, 0.95)',
                        backgroundColor: 'rgba(37, 99, 235, 0.2)',
                        borderWidth: 2,
                        tension: 0.25,
                        yAxisID: 'yDrivers',
                    },
                    {
                        type: 'bar',
                        label: 'Completed Trips',
                        data: weekKeys.map((key) => weekMap.get(key).completed),
                        backgroundColor: 'rgba(16, 185, 129, 0.72)',
                        yAxisID: 'yCompleted',
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
                    yDrivers: {
                        type: 'linear',
                        position: 'left',
                        beginAtZero: true,
                        ticks: {
                            precision: 0,
                        },
                        title: {
                            display: true,
                            text: 'Drivers',
                        },
                    },
                    yCompleted: {
                        type: 'linear',
                        position: 'right',
                        beginAtZero: true,
                        ticks: {
                            precision: 0,
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                        title: {
                            display: true,
                            text: 'Completed Trips',
                        },
                    },
                },
            },
        });
    }

    getDriverInfo(trip) {
        const driverName = String(trip?.driver_name || '').trim();
        const driverId = Number(trip?.driver_id || 0);

        if (driverName) {
            return {
                key: `name:${driverName.toLowerCase()}`,
                label: driverName,
            };
        }

        if (driverId > 0) {
            return {
                key: `id:${driverId}`,
                label: `Driver #${driverId}`,
            };
        }

        return null;
    }

    getIsoWeekKey(date) {
        const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = target.getUTCDay() || 7;
        target.setUTCDate(target.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
        return `${target.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
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

    normalizeStatus(value) {
        const status = String(value || '').toLowerCase();
        if (status.includes('progress')) return 'In Progress';
        if (status.includes('reject')) return 'Rejected';
        if (status.includes('cancel')) return 'Cancelled';
        if (status.includes('complete') || status.includes('resolve')) return 'Completed';
        if (status.includes('accept')) return 'Accepted';
        return 'Pending';
    }

    isSuccessResponse(response) {
        return !!response && (response.success === true || response.status === 'success');
    }

    extractTrips(response) {
        const trips = response?.data?.trips;
        return Array.isArray(trips) ? trips : [];
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
        this.destroyChart('workload');
        this.destroyChart('completionRate');
        this.destroyChart('weeklyActive');
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

customElements.define('tm-driver-analytics', TMDriverAnalytics);
