class TMCargoAnalytics extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this._analytics = {
            totals: {
                total_quantity_transported: 0,
                dangerous_quantity_transported: 0,
                trips_with_cargo: 0,
                dangerous_trips: 0,
            },
            monthly: [],
            by_item: [],
        };
        this._charts = {
            monthlyMix: null,
            topItems: null,
        };

        this.loadStyles();
        this.render();
        this.bindEvents();
        this.setDefaultDateFilter();
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
                <h2 class="page-title"><i class="fas fa-boxes-stacked"></i> Cargo Analytics</h2>
                <p class="page-subtitle">Monitor dangerous cargo share, transported volume, and high-demand cargo items.</p>
            </div>

            <div class="tm-analytics-toolbar">
                <div class="toolbar-group">
                    <label class="toolbar-label" for="tmCargoFromDate">From Date</label>
                    <input id="tmCargoFromDate" class="toolbar-field" type="date">
                </div>
                <div class="toolbar-group">
                    <label class="toolbar-label" for="tmCargoToDate">To Date</label>
                    <input id="tmCargoToDate" class="toolbar-field" type="date">
                </div>
                <button type="button" class="btn btn-primary" data-action="apply-filter">
                    <i class="fas fa-filter"></i> Apply Filter
                </button>
                <button type="button" class="btn btn-secondary" data-action="reset-filter">
                    <i class="fas fa-rotate-left"></i> Reset
                </button>
            </div>

            <div class="tm-analytics-summary">
                <div class="tm-analytics-pill">
                    <div class="pill-label">Total Quantity Transported</div>
                    <div class="pill-value" id="tmCargoTotalQty">0</div>
                </div>
                <div class="tm-analytics-pill">
                    <div class="pill-label">Dangerous Quantity</div>
                    <div class="pill-value" id="tmCargoDangerousQty">0</div>
                </div>
                <div class="tm-analytics-pill">
                    <div class="pill-label">Trips with Cargo</div>
                    <div class="pill-value" id="tmCargoTripsWithCargo">0</div>
                </div>
                <div class="tm-analytics-pill">
                    <div class="pill-label">Dangerous Trips</div>
                    <div class="pill-value" id="tmCargoDangerousTrips">0</div>
                </div>
            </div>

            <div class="tm-chart-status" id="tmCargoAnalyticsStatus"></div>

            <div class="tm-analytics-grid two-up">
                <div class="tm-chart-card">
                    <div class="chart-header">
                        <span class="chart-title">Monthly Dangerous vs Non-Dangerous Cargo Mix</span>
                        <span class="chart-subtitle">Dangerous and non-dangerous transported quantities with trip count overlay.</span>
                    </div>
                    <div class="tm-chart-canvas-wrap">
                        <canvas id="tmCargoMonthlyMixChart"></canvas>
                        <div class="tm-chart-empty" id="tmCargoMonthlyMixChartEmpty"></div>
                    </div>
                    <div class="tm-chart-meta">
                        <span>Decision use: assess risk load trends in transport operations.</span>
                    </div>
                </div>

                <div class="tm-chart-card">
                    <div class="chart-header">
                        <span class="chart-title">Top Cargo Items by Quantity</span>
                        <span class="chart-subtitle">Highest transported cargo items (dangerous items highlighted).</span>
                    </div>
                    <div class="tm-chart-canvas-wrap">
                        <canvas id="tmCargoTopItemsChart"></canvas>
                        <div class="tm-chart-empty" id="tmCargoTopItemsChartEmpty"></div>
                    </div>
                    <div class="tm-chart-meta">
                        <span>Decision use: prioritize handling capacity and planning per cargo type.</span>
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

            if (actionEl.dataset.action === 'apply-filter') {
                this.refresh();
                return;
            }

            if (actionEl.dataset.action === 'reset-filter') {
                this.setDefaultDateFilter();
                this.refresh();
            }
        });
    }

    setDefaultDateFilter() {
        const fromInput = this.querySelector('#tmCargoFromDate');
        const toInput = this.querySelector('#tmCargoToDate');
        if (!fromInput || !toInput) {
            return;
        }

        const toDate = new Date();
        const fromDate = new Date();
        fromDate.setMonth(toDate.getMonth() - 5);

        fromInput.value = this.toInputDate(fromDate);
        toInput.value = this.toInputDate(toDate);
    }

    async refresh() {
        const statusEl = this.querySelector('#tmCargoAnalyticsStatus');
        if (statusEl) {
            statusEl.className = 'tm-chart-status';
            statusEl.textContent = 'Loading cargo analytics...';
        }

        try {
            const query = this.buildQuery();
            const response = await API.get(`/trips/cargo-analytics${query}`);
            if (!this.isSuccessResponse(response)) {
                throw new Error(response?.message || 'Failed to load cargo analytics');
            }

            this._analytics = this.extractAnalytics(response);
            this.updateSummary();
            this.renderCharts();

            if (statusEl) {
                statusEl.textContent = 'Cargo analytics updated successfully.';
            }
        } catch (error) {
            console.error('TM cargo analytics refresh failed:', error);
            this._analytics = this.extractAnalytics(null);
            this.updateSummary();
            this.renderCharts();

            if (statusEl) {
                statusEl.className = 'tm-chart-status error';
                statusEl.textContent = error?.message || 'Failed to load cargo analytics.';
            }
        }
    }

    buildQuery() {
        const fromDate = String(this.querySelector('#tmCargoFromDate')?.value || '').trim();
        const toDate = String(this.querySelector('#tmCargoToDate')?.value || '').trim();
        const params = new URLSearchParams();

        if (fromDate) {
            params.set('from_date', fromDate);
        }

        if (toDate) {
            params.set('to_date', toDate);
        }

        const query = params.toString();
        return query ? `?${query}` : '';
    }

    updateSummary() {
        const totals = this._analytics.totals || {};

        this.setText('#tmCargoTotalQty', this.formatNumber(totals.total_quantity_transported));
        this.setText('#tmCargoDangerousQty', this.formatNumber(totals.dangerous_quantity_transported));
        this.setText('#tmCargoTripsWithCargo', String(totals.trips_with_cargo || 0));
        this.setText('#tmCargoDangerousTrips', String(totals.dangerous_trips || 0));
    }

    renderCharts() {
        this.renderMonthlyMixChart();
        this.renderTopItemsChart();
    }

    renderMonthlyMixChart() {
        const canvas = this.querySelector('#tmCargoMonthlyMixChart');
        if (!canvas || !this.isChartReady('#tmCargoMonthlyMixChartEmpty')) {
            return;
        }

        const monthly = Array.isArray(this._analytics.monthly) ? this._analytics.monthly : [];
        if (!monthly.length) {
            this.showEmpty('#tmCargoMonthlyMixChartEmpty', 'fa-calendar-days', 'No monthly cargo records available for selected dates.');
            this.destroyChart('monthlyMix');
            return;
        }

        const labels = monthly.map((row) => this.formatMonth(row.month));
        const dangerous = monthly.map((row) => Number(row.dangerous_quantity || 0));
        const total = monthly.map((row) => Number(row.total_quantity || 0));
        const nonDangerous = total.map((value, index) => Math.max(value - dangerous[index], 0));
        const trips = monthly.map((row) => Number(row.trips_count || 0));

        this.hideEmpty('#tmCargoMonthlyMixChartEmpty');
        this.destroyChart('monthlyMix');

        this._charts.monthlyMix = new window.Chart(canvas, {
            data: {
                labels,
                datasets: [
                    {
                        type: 'bar',
                        label: 'Non-Dangerous Quantity',
                        data: nonDangerous,
                        backgroundColor: 'rgba(37, 99, 235, 0.8)',
                        stack: 'cargo',
                        yAxisID: 'yQuantity',
                    },
                    {
                        type: 'bar',
                        label: 'Dangerous Quantity',
                        data: dangerous,
                        backgroundColor: 'rgba(220, 38, 38, 0.85)',
                        stack: 'cargo',
                        yAxisID: 'yQuantity',
                    },
                    {
                        type: 'line',
                        label: 'Trips Count',
                        data: trips,
                        borderColor: 'rgba(16, 185, 129, 1)',
                        backgroundColor: 'rgba(16, 185, 129, 0.18)',
                        borderWidth: 2,
                        tension: 0.25,
                        yAxisID: 'yTrips',
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
                        position: 'left',
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Quantity',
                        },
                    },
                    yTrips: {
                        type: 'linear',
                        position: 'right',
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Trips',
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                        ticks: {
                            precision: 0,
                        },
                    },
                },
            },
        });
    }

    renderTopItemsChart() {
        const canvas = this.querySelector('#tmCargoTopItemsChart');
        if (!canvas || !this.isChartReady('#tmCargoTopItemsChartEmpty')) {
            return;
        }

        const byItem = Array.isArray(this._analytics.by_item) ? this._analytics.by_item : [];
        const topItems = byItem.slice(0, 10);

        if (!topItems.length) {
            this.showEmpty('#tmCargoTopItemsChartEmpty', 'fa-box-open', 'No cargo item usage data available for selected dates.');
            this.destroyChart('topItems');
            return;
        }

        const labels = topItems.map((item) => String(item.name || item.cargo_item_id || 'Cargo Item'));
        const quantities = topItems.map((item) => Number(item.total_quantity || 0));
        const colors = topItems.map((item) => Number(item.is_dangerous) === 1
            ? 'rgba(220, 38, 38, 0.82)'
            : 'rgba(37, 99, 235, 0.82)');

        this.hideEmpty('#tmCargoTopItemsChartEmpty');
        this.destroyChart('topItems');

        this._charts.topItems = new window.Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Total Quantity',
                        data: quantities,
                        backgroundColor: colors,
                        borderWidth: 0,
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
                    },
                },
            },
        });
    }

    extractAnalytics(response) {
        if (!this.isSuccessResponse(response)) {
            return {
                totals: {
                    total_quantity_transported: 0,
                    dangerous_quantity_transported: 0,
                    trips_with_cargo: 0,
                    dangerous_trips: 0,
                },
                monthly: [],
                by_item: [],
            };
        }

        const data = response?.data || {};
        return {
            totals: data.totals || {
                total_quantity_transported: 0,
                dangerous_quantity_transported: 0,
                trips_with_cargo: 0,
                dangerous_trips: 0,
            },
            monthly: Array.isArray(data.monthly) ? data.monthly : [],
            by_item: Array.isArray(data.by_item) ? data.by_item : [],
        };
    }

    isSuccessResponse(response) {
        return !!response && (response.success === true || response.status === 'success');
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
        this.destroyChart('monthlyMix');
        this.destroyChart('topItems');
    }

    toInputDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    formatMonth(monthKey) {
        const parts = String(monthKey || '').split('-');
        if (parts.length !== 2) {
            return String(monthKey || 'Unknown');
        }

        const year = Number(parts[0]);
        const month = Number(parts[1]);
        if (!Number.isFinite(year) || !Number.isFinite(month)) {
            return String(monthKey || 'Unknown');
        }

        const date = new Date(year, month - 1, 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }

    formatNumber(value) {
        const number = Number(value || 0);
        if (!Number.isFinite(number)) {
            return '0';
        }

        return number.toLocaleString('en-US', {
            maximumFractionDigits: 2,
        });
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

customElements.define('tm-cargo-analytics', TMCargoAnalytics);
