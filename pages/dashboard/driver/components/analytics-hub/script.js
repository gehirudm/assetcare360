class DriverAnalyticsHub extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this._views = ['trip', 'checks', 'breakdown', 'fuel', 'workflow'];
        this._activeView = 'trip';
        this._generatedReport = null;
        this._charts = {
            tripStatus: null,
            tripTrend: null,
            checkStatus: null,
            checkItems: null,
            breakdownSeverity: null,
            breakdownType: null,
            fuelSource: null,
            fuelTrend: null,
            workflowStatus: null,
            workflowGarage: null,
        };
        this._data = {
            trips: [],
            checks: [],
            breakdowns: [],
            routeBreakdowns: [],
            fuelLogs: [],
            garages: [],
        };

        this.loadStyles();
        this.render();
        this.bindEvents();
        this.setDefaultPeriod();
        this.setAnalyticsStatus('Choose a period and click Apply Time Filter to refresh analytics.', 'info');
        this.setReportStatus('Generate a downloadable report for the selected period.', 'info');
        this.updateDownloadButtonState(false);
        this.activateView(this.getInitialView(), { refresh: false });
    }

    disconnectedCallback() {
        this.destroyCharts();
    }

    async refresh() {
        await this.refreshActive();
    }

    loadStyles() {
        const linkId = 'driver-analytics-hub-styles';
        if (document.getElementById(linkId)) {
            return;
        }

        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = './components/analytics-hub/style.css';
        document.head.appendChild(link);
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-chart-bar"></i> Driver Analytics</h2>
                <p class="page-subtitle">Track trips, checks, breakdowns, fuel, and route-garage workflow from one analytics hub.</p>
            </div>

            <div class="driver-analytics-nav" role="tablist" aria-label="Driver analytics views">
                <button type="button" class="analytics-option-btn" role="tab" data-view="trip">Trip Analytics</button>
                <button type="button" class="analytics-option-btn" role="tab" data-view="checks">Vehicle Check Analytics</button>
                <button type="button" class="analytics-option-btn" role="tab" data-view="breakdown">Breakdown Analytics</button>
                <button type="button" class="analytics-option-btn" role="tab" data-view="fuel">Fuel Analytics</button>
                <button type="button" class="analytics-option-btn" role="tab" data-view="workflow">Workflow Analytics</button>
            </div>

            <div class="driver-analytics-toolbar">
                <div class="analytics-toolbar-group">
                    <label class="analytics-toolbar-label" for="driverAnalyticsFromDate">From Date</label>
                    <input id="driverAnalyticsFromDate" class="analytics-toolbar-field" type="date">
                </div>
                <div class="analytics-toolbar-group">
                    <label class="analytics-toolbar-label" for="driverAnalyticsToDate">To Date</label>
                    <input id="driverAnalyticsToDate" class="analytics-toolbar-field" type="date">
                </div>
                <div class="analytics-toolbar-group">
                    <label class="analytics-toolbar-label" for="driverReportScope">Report Type</label>
                    <select id="driverReportScope" class="analytics-toolbar-field">
                        <option value="active">Active Analytics View</option>
                        <option value="trip">Trip Analytics</option>
                        <option value="checks">Vehicle Check Analytics</option>
                        <option value="breakdown">Breakdown Analytics</option>
                        <option value="fuel">Fuel Analytics</option>
                        <option value="workflow">Workflow Analytics</option>
                        <option value="all">All Analytics Summary</option>
                    </select>
                </div>
                <div class="analytics-toolbar-actions">
                    <button type="button" class="btn btn-secondary" data-action="apply-filter">
                        <i class="fas fa-filter"></i> Apply Time Filter
                    </button>
                    <button type="button" class="btn btn-primary" data-action="generate-report">
                        <i class="fas fa-file-lines"></i> Generate Report
                    </button>
                    <button type="button" class="btn btn-secondary" data-action="download-report" id="driverReportDownloadBtn" disabled>
                        <i class="fas fa-download"></i> Download CSV
                    </button>
                </div>
            </div>

            <div id="driverAnalyticsStatus" class="driver-analytics-status"></div>
            <div id="driverReportStatus" class="driver-report-status"></div>
            <div id="driverReportPreview" class="driver-report-preview"></div>

            <div class="driver-analytics-panel" data-view="trip" role="tabpanel">
                <div class="driver-summary-grid">
                    <div class="driver-summary-item"><span class="summary-key">Total Trips</span><span class="summary-value" id="driverTripTotal">0</span></div>
                    <div class="driver-summary-item"><span class="summary-key">Pending + Accepted</span><span class="summary-value" id="driverTripPendingAccepted">0</span></div>
                    <div class="driver-summary-item"><span class="summary-key">In Progress</span><span class="summary-value" id="driverTripInProgress">0</span></div>
                    <div class="driver-summary-item"><span class="summary-key">Completed + Closed</span><span class="summary-value" id="driverTripClosed">0</span></div>
                </div>
                <div class="driver-analytics-grid">
                    <div class="chart-card">
                        <div class="chart-header">
                            <span class="chart-title">Trip Status Distribution</span>
                            <span class="chart-subtitle">Trip lifecycle breakdown for the selected period.</span>
                        </div>
                        <div class="chart-canvas-wrap">
                            <canvas id="driverTripStatusChart"></canvas>
                            <div class="chart-empty" id="driverTripStatusChartEmpty"></div>
                        </div>
                    </div>
                    <div class="chart-card">
                        <div class="chart-header">
                            <span class="chart-title">Trip Trend by Day</span>
                            <span class="chart-subtitle">Daily volume of created trips.</span>
                        </div>
                        <div class="chart-canvas-wrap">
                            <canvas id="driverTripTrendChart"></canvas>
                            <div class="chart-empty" id="driverTripTrendChartEmpty"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="driver-analytics-panel" data-view="checks" role="tabpanel">
                <div class="driver-summary-grid">
                    <div class="driver-summary-item"><span class="summary-key">Total Checks</span><span class="summary-value" id="driverCheckTotal">0</span></div>
                    <div class="driver-summary-item"><span class="summary-key">Pending</span><span class="summary-value" id="driverCheckPending">0</span></div>
                    <div class="driver-summary-item"><span class="summary-key">Approved</span><span class="summary-value" id="driverCheckApproved">0</span></div>
                    <div class="driver-summary-item"><span class="summary-key">Rejected</span><span class="summary-value" id="driverCheckRejected">0</span></div>
                </div>
                <div class="driver-analytics-grid">
                    <div class="chart-card">
                        <div class="chart-header">
                            <span class="chart-title">Vehicle Check Status Mix</span>
                            <span class="chart-subtitle">Approval state distribution of submitted checks.</span>
                        </div>
                        <div class="chart-canvas-wrap">
                            <canvas id="driverCheckStatusChart"></canvas>
                            <div class="chart-empty" id="driverCheckStatusChartEmpty"></div>
                        </div>
                    </div>
                    <div class="chart-card">
                        <div class="chart-header">
                            <span class="chart-title">Inspection Item Pass Count</span>
                            <span class="chart-subtitle">How often each checklist item passed.</span>
                        </div>
                        <div class="chart-canvas-wrap">
                            <canvas id="driverCheckItemsChart"></canvas>
                            <div class="chart-empty" id="driverCheckItemsChartEmpty"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="driver-analytics-panel" data-view="breakdown" role="tabpanel">
                <div class="driver-summary-grid">
                    <div class="driver-summary-item"><span class="summary-key">Total Breakdowns</span><span class="summary-value" id="driverBreakdownTotal">0</span></div>
                    <div class="driver-summary-item"><span class="summary-key">Critical + High</span><span class="summary-value" id="driverBreakdownCriticalHigh">0</span></div>
                    <div class="driver-summary-item"><span class="summary-key">Open + In Progress</span><span class="summary-value" id="driverBreakdownOpenInProgress">0</span></div>
                    <div class="driver-summary-item"><span class="summary-key">Resolved + Closed</span><span class="summary-value" id="driverBreakdownResolvedClosed">0</span></div>
                </div>
                <div class="driver-analytics-grid">
                    <div class="chart-card">
                        <div class="chart-header">
                            <span class="chart-title">Breakdown Severity Distribution</span>
                            <span class="chart-subtitle">Severity spread across vehicle and route breakdowns.</span>
                        </div>
                        <div class="chart-canvas-wrap">
                            <canvas id="driverBreakdownSeverityChart"></canvas>
                            <div class="chart-empty" id="driverBreakdownSeverityChartEmpty"></div>
                        </div>
                    </div>
                    <div class="chart-card">
                        <div class="chart-header">
                            <span class="chart-title">Breakdown Type Distribution</span>
                            <span class="chart-subtitle">Most frequent reported breakdown categories.</span>
                        </div>
                        <div class="chart-canvas-wrap">
                            <canvas id="driverBreakdownTypeChart"></canvas>
                            <div class="chart-empty" id="driverBreakdownTypeChartEmpty"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="driver-analytics-panel" data-view="fuel" role="tabpanel">
                <div class="driver-summary-grid">
                    <div class="driver-summary-item"><span class="summary-key">Fuel Log Entries</span><span class="summary-value" id="driverFuelEntries">0</span></div>
                    <div class="driver-summary-item"><span class="summary-key">Total Fuel Volume (L)</span><span class="summary-value" id="driverFuelVolume">0.00</span></div>
                    <div class="driver-summary-item"><span class="summary-key">Total Cost</span><span class="summary-value" id="driverFuelCost">0.00</span></div>
                    <div class="driver-summary-item"><span class="summary-key">Avg Fuel Efficiency</span><span class="summary-value" id="driverFuelEfficiency">0.00</span></div>
                </div>
                <div class="driver-analytics-grid">
                    <div class="chart-card">
                        <div class="chart-header">
                            <span class="chart-title">Fuel Source Mix</span>
                            <span class="chart-subtitle">Internal vs external fueling share.</span>
                        </div>
                        <div class="chart-canvas-wrap">
                            <canvas id="driverFuelSourceChart"></canvas>
                            <div class="chart-empty" id="driverFuelSourceChartEmpty"></div>
                        </div>
                    </div>
                    <div class="chart-card">
                        <div class="chart-header">
                            <span class="chart-title">Fuel Volume Trend</span>
                            <span class="chart-subtitle">Fuel volume usage over time.</span>
                        </div>
                        <div class="chart-canvas-wrap">
                            <canvas id="driverFuelTrendChart"></canvas>
                            <div class="chart-empty" id="driverFuelTrendChartEmpty"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="driver-analytics-panel" data-view="workflow" role="tabpanel">
                <div class="driver-summary-grid">
                    <div class="driver-summary-item"><span class="summary-key">Route Breakdown Workflow Cases</span><span class="summary-value" id="driverWorkflowTotal">0</span></div>
                    <div class="driver-summary-item"><span class="summary-key">Garage Approved</span><span class="summary-value" id="driverWorkflowApproved">0</span></div>
                    <div class="driver-summary-item"><span class="summary-key">In Progress</span><span class="summary-value" id="driverWorkflowInProgress">0</span></div>
                    <div class="driver-summary-item"><span class="summary-key">Completed</span><span class="summary-value" id="driverWorkflowCompleted">0</span></div>
                </div>
                <div class="driver-analytics-grid">
                    <div class="chart-card">
                        <div class="chart-header">
                            <span class="chart-title">Garage Workflow Status</span>
                            <span class="chart-subtitle">Current status distribution of route breakdown workflow.</span>
                        </div>
                        <div class="chart-canvas-wrap">
                            <canvas id="driverWorkflowStatusChart"></canvas>
                            <div class="chart-empty" id="driverWorkflowStatusChartEmpty"></div>
                        </div>
                    </div>
                    <div class="chart-card">
                        <div class="chart-header">
                            <span class="chart-title">Top Approved Garages</span>
                            <span class="chart-subtitle">Garages most frequently approved for route breakdowns.</span>
                        </div>
                        <div class="chart-canvas-wrap">
                            <canvas id="driverWorkflowGarageChart"></canvas>
                            <div class="chart-empty" id="driverWorkflowGarageChartEmpty"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionBtn = event.target.closest('[data-action]');
            if (actionBtn) {
                const action = actionBtn.dataset.action;

                if (action === 'apply-filter') {
                    this.refreshActive();
                    return;
                }

                if (action === 'generate-report') {
                    this.generateReport();
                    return;
                }

                if (action === 'download-report') {
                    this.downloadReportCsv();
                    return;
                }
            }

            const optionBtn = event.target.closest('.analytics-option-btn[data-view]');
            if (!optionBtn) {
                return;
            }

            this.activateView(optionBtn.dataset.view || '', { refresh: true });
        });
    }

    setDefaultPeriod() {
        const fromInput = this.querySelector('#driverAnalyticsFromDate');
        const toInput = this.querySelector('#driverAnalyticsToDate');
        if (!fromInput || !toInput) {
            return;
        }

        const toDate = new Date();
        const fromDate = new Date();
        fromDate.setDate(toDate.getDate() - 30);

        fromInput.value = this.toInputDate(fromDate);
        toInput.value = this.toInputDate(toDate);
    }

    getInitialView() {
        const explicit = String(this.getAttribute('default-view') || '').trim();
        if (this._views.includes(explicit)) {
            return explicit;
        }

        return 'trip';
    }

    activateView(view, options = {}) {
        const { refresh = false } = options;
        if (!this._views.includes(view)) {
            return;
        }

        this._activeView = view;

        this.querySelectorAll('.analytics-option-btn').forEach((button) => {
            const isActive = button.dataset.view === view;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        this.querySelectorAll('.driver-analytics-panel').forEach((panel) => {
            const isActive = panel.dataset.view === view;
            panel.classList.toggle('active', isActive);
            panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
        });

        if (refresh) {
            this.refreshActive();
        }
    }

    async refreshActive() {
        try {
            this.setAnalyticsStatus('Loading analytics data...', 'info');
            await this.refreshData();
            this.renderActiveView();
            this.setAnalyticsStatus('Analytics updated for selected period.', 'success');
        } catch (error) {
            console.error('Driver analytics refresh failed:', error);
            this.setAnalyticsStatus(error?.message || 'Failed to refresh analytics.', 'error');
        }
    }

    async refreshData() {
        if (!window.DriverUtils || typeof DriverUtils.apiGet !== 'function') {
            throw new Error('Driver API utilities are unavailable.');
        }

        const userId = this.getCurrentUserId();

        const [tripsResult, checksResult, breakdownsResult, routeBreakdownsResult, fuelLogsResult, garagesResult] = await Promise.allSettled([
            this.fetchTrips(userId),
            this.fetchVehicleChecks(userId),
            this.fetchBreakdowns(),
            this.fetchRouteBreakdowns(),
            this.fetchFuelLogs(userId),
            this.fetchGarages(),
        ]);

        const errors = [];

        if (tripsResult.status === 'fulfilled') {
            this._data.trips = tripsResult.value;
        } else {
            this._data.trips = [];
            errors.push('trips');
        }

        if (checksResult.status === 'fulfilled') {
            this._data.checks = checksResult.value;
        } else {
            this._data.checks = [];
            errors.push('vehicle checks');
        }

        if (breakdownsResult.status === 'fulfilled') {
            this._data.breakdowns = breakdownsResult.value;
        } else {
            this._data.breakdowns = [];
            errors.push('breakdown reports');
        }

        if (routeBreakdownsResult.status === 'fulfilled') {
            this._data.routeBreakdowns = routeBreakdownsResult.value;
        } else {
            this._data.routeBreakdowns = [];
            errors.push('route breakdowns');
        }

        if (fuelLogsResult.status === 'fulfilled') {
            this._data.fuelLogs = fuelLogsResult.value;
        } else {
            this._data.fuelLogs = [];
            errors.push('fuel logs');
        }

        if (garagesResult.status === 'fulfilled') {
            this._data.garages = garagesResult.value;
        } else {
            this._data.garages = [];
            errors.push('garages');
        }

        if (errors.length === 6) {
            throw new Error('Failed to load analytics data from all sources.');
        }

        if (errors.length > 0) {
            this.setAnalyticsStatus(`Partial data loaded. Missing: ${errors.join(', ')}.`, 'warning');
        }
    }

    renderActiveView() {
        const period = this.getReportPeriod();

        if (this._activeView === 'trip') {
            this.renderTripView(period);
            return;
        }

        if (this._activeView === 'checks') {
            this.renderChecksView(period);
            return;
        }

        if (this._activeView === 'breakdown') {
            this.renderBreakdownView(period);
            return;
        }

        if (this._activeView === 'fuel') {
            this.renderFuelView(period);
            return;
        }

        if (this._activeView === 'workflow') {
            this.renderWorkflowView(period);
        }
    }

    renderTripView(period) {
        const rows = this.getFilteredTrips(period);

        const statusCounts = {
            pending: 0,
            accepted: 0,
            in_progress: 0,
            completed: 0,
            rejected: 0,
            cancelled: 0,
            other: 0,
        };

        const trendMap = new Map();

        rows.forEach((row) => {
            const status = this.normalizeTripStatus(row.status);
            if (statusCounts[status] === undefined) {
                statusCounts.other += 1;
            } else {
                statusCounts[status] += 1;
            }

            const date = this.extractTripDate(row);
            if (date) {
                const label = this.toInputDate(date);
                trendMap.set(label, (trendMap.get(label) || 0) + 1);
            }
        });

        this.setText('#driverTripTotal', String(rows.length));
        this.setText('#driverTripPendingAccepted', String(statusCounts.pending + statusCounts.accepted));
        this.setText('#driverTripInProgress', String(statusCounts.in_progress));
        this.setText('#driverTripClosed', String(statusCounts.completed + statusCounts.rejected + statusCounts.cancelled));

        const statusRows = [
            ['Pending', statusCounts.pending],
            ['Accepted', statusCounts.accepted],
            ['In Progress', statusCounts.in_progress],
            ['Completed', statusCounts.completed],
            ['Rejected', statusCounts.rejected],
            ['Cancelled', statusCounts.cancelled],
        ].filter((row) => row[1] > 0);

        this.renderChart(
            'tripStatus',
            '#driverTripStatusChart',
            '#driverTripStatusChartEmpty',
            {
                type: 'doughnut',
                data: {
                    labels: statusRows.map((row) => row[0]),
                    datasets: [{
                        data: statusRows.map((row) => row[1]),
                        backgroundColor: ['#f59e0b', '#22c55e', '#2563eb', '#10b981', '#ef4444', '#64748b'],
                    }],
                },
                options: this.getSharedChartOptions(),
            },
            statusRows.length > 0,
            'No trip status data found for selected period.'
        );

        const trendLabels = Array.from(trendMap.keys()).sort();
        const trendValues = trendLabels.map((label) => trendMap.get(label));

        this.renderChart(
            'tripTrend',
            '#driverTripTrendChart',
            '#driverTripTrendChartEmpty',
            {
                type: 'line',
                data: {
                    labels: trendLabels,
                    datasets: [{
                        label: 'Trips',
                        data: trendValues,
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.18)',
                        fill: true,
                        tension: 0.35,
                        pointRadius: 3,
                    }],
                },
                options: this.getSharedChartOptions(),
            },
            trendLabels.length > 0,
            'No trip trend points available for selected period.'
        );
    }

    renderChecksView(period) {
        const rows = this.getFilteredChecks(period);

        const statusCounts = {
            pending: 0,
            approved: 0,
            rejected: 0,
        };

        const itemPassCounts = {
            engine_oil: 0,
            brakes: 0,
            lights: 0,
            tires: 0,
            coolant: 0,
            wipers: 0,
        };

        rows.forEach((row) => {
            const status = this.normalizeCheckStatus(row.status);
            statusCounts[status] += 1;

            Object.keys(itemPassCounts).forEach((key) => {
                if (this.isTruthyCheckValue(row[key])) {
                    itemPassCounts[key] += 1;
                }
            });
        });

        this.setText('#driverCheckTotal', String(rows.length));
        this.setText('#driverCheckPending', String(statusCounts.pending));
        this.setText('#driverCheckApproved', String(statusCounts.approved));
        this.setText('#driverCheckRejected', String(statusCounts.rejected));

        this.renderChart(
            'checkStatus',
            '#driverCheckStatusChart',
            '#driverCheckStatusChartEmpty',
            {
                type: 'doughnut',
                data: {
                    labels: ['Pending', 'Approved', 'Rejected'],
                    datasets: [{
                        data: [statusCounts.pending, statusCounts.approved, statusCounts.rejected],
                        backgroundColor: ['#f59e0b', '#10b981', '#ef4444'],
                    }],
                },
                options: this.getSharedChartOptions(),
            },
            rows.length > 0,
            'No vehicle checks found for selected period.'
        );

        this.renderChart(
            'checkItems',
            '#driverCheckItemsChart',
            '#driverCheckItemsChartEmpty',
            {
                type: 'bar',
                data: {
                    labels: ['Engine Oil', 'Brakes', 'Lights', 'Tires', 'Coolant', 'Wipers'],
                    datasets: [{
                        label: 'Passed Checks',
                        data: [
                            itemPassCounts.engine_oil,
                            itemPassCounts.brakes,
                            itemPassCounts.lights,
                            itemPassCounts.tires,
                            itemPassCounts.coolant,
                            itemPassCounts.wipers,
                        ],
                        backgroundColor: ['#3b82f6', '#2563eb', '#0ea5e9', '#14b8a6', '#22c55e', '#84cc16'],
                        borderRadius: 8,
                    }],
                },
                options: this.getSharedChartOptions(),
            },
            rows.length > 0,
            'No checklist-item analytics available for selected period.'
        );
    }

    renderBreakdownView(period) {
        const rows = this.getFilteredBreakdowns(period);

        const severityCounts = {
            Low: 0,
            Medium: 0,
            High: 0,
            Critical: 0,
        };

        const typeCounts = new Map();
        let openInProgress = 0;
        let resolvedClosed = 0;

        rows.forEach((row) => {
            const severity = this.normalizeSeverity(row.severity);
            severityCounts[severity] += 1;

            const workflowStatus = this.normalizeTicketStatus(row.ticket_status || row.status);
            if (workflowStatus === 'open' || workflowStatus === 'assigned' || workflowStatus === 'in_progress') {
                openInProgress += 1;
            }
            if (workflowStatus === 'resolved' || workflowStatus === 'closed') {
                resolvedClosed += 1;
            }

            const type = this.normalizeBreakdownType(row.breakdown_type);
            typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
        });

        this.setText('#driverBreakdownTotal', String(rows.length));
        this.setText('#driverBreakdownCriticalHigh', String(severityCounts.Critical + severityCounts.High));
        this.setText('#driverBreakdownOpenInProgress', String(openInProgress));
        this.setText('#driverBreakdownResolvedClosed', String(resolvedClosed));

        this.renderChart(
            'breakdownSeverity',
            '#driverBreakdownSeverityChart',
            '#driverBreakdownSeverityChartEmpty',
            {
                type: 'bar',
                data: {
                    labels: ['Low', 'Medium', 'High', 'Critical'],
                    datasets: [{
                        label: 'Breakdowns',
                        data: [severityCounts.Low, severityCounts.Medium, severityCounts.High, severityCounts.Critical],
                        backgroundColor: ['#60a5fa', '#fbbf24', '#f97316', '#ef4444'],
                        borderRadius: 8,
                    }],
                },
                options: this.getSharedChartOptions(),
            },
            rows.length > 0,
            'No breakdown severity analytics found for selected period.'
        );

        const typeRows = Array.from(typeCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);

        this.renderChart(
            'breakdownType',
            '#driverBreakdownTypeChart',
            '#driverBreakdownTypeChartEmpty',
            {
                type: 'doughnut',
                data: {
                    labels: typeRows.map((row) => row[0]),
                    datasets: [{
                        data: typeRows.map((row) => row[1]),
                        backgroundColor: ['#2563eb', '#0ea5e9', '#10b981', '#22c55e', '#f59e0b', '#f97316', '#ef4444', '#64748b'],
                    }],
                },
                options: this.getSharedChartOptions(),
            },
            typeRows.length > 0,
            'No breakdown type analytics found for selected period.'
        );
    }

    renderFuelView(period) {
        const rows = this.getFilteredFuelLogs(period);

        const sourceCounts = {
            internal: 0,
            external: 0,
            unknown: 0,
        };

        const trendMap = new Map();
        let totalVolume = 0;
        let totalCost = 0;
        const efficiencies = [];

        rows.forEach((row) => {
            const source = this.normalizeFuelSource(row.fuel_source);
            sourceCounts[source] += 1;

            const volume = this.toNumber(row.fuel_volume);
            totalVolume += volume;

            const cost = this.toNumber(row.total_cost);
            totalCost += cost;

            const efficiency = this.toNumber(row.fuel_efficiency);
            if (efficiency > 0) {
                efficiencies.push(efficiency);
            }

            const date = this.extractFuelDate(row);
            if (date) {
                const label = this.toInputDate(date);
                trendMap.set(label, (trendMap.get(label) || 0) + volume);
            }
        });

        const avgEfficiency = efficiencies.length > 0
            ? efficiencies.reduce((sum, value) => sum + value, 0) / efficiencies.length
            : 0;

        this.setText('#driverFuelEntries', String(rows.length));
        this.setText('#driverFuelVolume', this.formatNumber(totalVolume));
        this.setText('#driverFuelCost', this.formatNumber(totalCost));
        this.setText('#driverFuelEfficiency', this.formatNumber(avgEfficiency));

        const sourceRows = [
            ['Internal', sourceCounts.internal],
            ['External', sourceCounts.external],
            ['Unknown', sourceCounts.unknown],
        ].filter((row) => row[1] > 0);

        this.renderChart(
            'fuelSource',
            '#driverFuelSourceChart',
            '#driverFuelSourceChartEmpty',
            {
                type: 'doughnut',
                data: {
                    labels: sourceRows.map((row) => row[0]),
                    datasets: [{
                        data: sourceRows.map((row) => row[1]),
                        backgroundColor: ['#22c55e', '#2563eb', '#64748b'],
                    }],
                },
                options: this.getSharedChartOptions(),
            },
            sourceRows.length > 0,
            'No fuel source data found for selected period.'
        );

        const trendLabels = Array.from(trendMap.keys()).sort();
        const trendValues = trendLabels.map((label) => Number((trendMap.get(label) || 0).toFixed(2)));

        this.renderChart(
            'fuelTrend',
            '#driverFuelTrendChart',
            '#driverFuelTrendChartEmpty',
            {
                type: 'line',
                data: {
                    labels: trendLabels,
                    datasets: [{
                        label: 'Fuel Volume (L)',
                        data: trendValues,
                        borderColor: '#0ea5e9',
                        backgroundColor: 'rgba(14, 165, 233, 0.2)',
                        fill: true,
                        tension: 0.35,
                        pointRadius: 3,
                    }],
                },
                options: this.getSharedChartOptions(),
            },
            trendLabels.length > 0,
            'No fuel trend points available for selected period.'
        );
    }

    renderWorkflowView(period) {
        const rows = this.getFilteredRouteBreakdowns(period);

        const statusCounts = {
            awaiting_approval: 0,
            garage_approved: 0,
            garage_entry_logged: 0,
            repair_in_progress: 0,
            completed: 0,
            other: 0,
        };

        const garages = new Map();

        rows.forEach((row) => {
            const workflowStatus = this.normalizeGarageWorkflowStatus(row.garage_workflow_status, row.ticket_status, row.status);
            if (statusCounts[workflowStatus] === undefined) {
                statusCounts.other += 1;
            } else {
                statusCounts[workflowStatus] += 1;
            }

            const garage = String(row.approved_garage_name || '').trim();
            if (garage) {
                garages.set(garage, (garages.get(garage) || 0) + 1);
            }
        });

        this.setText('#driverWorkflowTotal', String(rows.length));
        this.setText('#driverWorkflowApproved', String(statusCounts.garage_approved));
        this.setText('#driverWorkflowInProgress', String(statusCounts.garage_entry_logged + statusCounts.repair_in_progress));
        this.setText('#driverWorkflowCompleted', String(statusCounts.completed));

        const statusRows = [
            ['Awaiting Approval', statusCounts.awaiting_approval],
            ['Garage Approved', statusCounts.garage_approved],
            ['Entry Logged', statusCounts.garage_entry_logged],
            ['Repair In Progress', statusCounts.repair_in_progress],
            ['Completed', statusCounts.completed],
            ['Other', statusCounts.other],
        ].filter((row) => row[1] > 0);

        this.renderChart(
            'workflowStatus',
            '#driverWorkflowStatusChart',
            '#driverWorkflowStatusChartEmpty',
            {
                type: 'doughnut',
                data: {
                    labels: statusRows.map((row) => row[0]),
                    datasets: [{
                        data: statusRows.map((row) => row[1]),
                        backgroundColor: ['#f59e0b', '#3b82f6', '#0ea5e9', '#2563eb', '#10b981', '#64748b'],
                    }],
                },
                options: this.getSharedChartOptions(),
            },
            statusRows.length > 0,
            'No garage workflow status data found for selected period.'
        );

        const garageRows = Array.from(garages.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);

        this.renderChart(
            'workflowGarage',
            '#driverWorkflowGarageChart',
            '#driverWorkflowGarageChartEmpty',
            {
                type: 'bar',
                data: {
                    labels: garageRows.map((row) => row[0]),
                    datasets: [{
                        label: 'Approvals',
                        data: garageRows.map((row) => row[1]),
                        backgroundColor: '#2563eb',
                        borderRadius: 8,
                    }],
                },
                options: this.getSharedChartOptions(),
            },
            garageRows.length > 0,
            'No approved garage records found for selected period.'
        );
    }

    renderChart(chartKey, canvasSelector, emptySelector, config, hasData, emptyMessage) {
        const canvas = this.querySelector(canvasSelector);
        const emptyEl = this.querySelector(emptySelector);
        if (!canvas || !emptyEl) {
            return;
        }

        if (this._charts[chartKey]) {
            this._charts[chartKey].destroy();
            this._charts[chartKey] = null;
        }

        if (!hasData) {
            canvas.style.display = 'none';
            emptyEl.textContent = emptyMessage;
            emptyEl.classList.add('active');
            return;
        }

        if (typeof Chart === 'undefined') {
            canvas.style.display = 'none';
            emptyEl.textContent = 'Chart.js is unavailable. Please refresh the page.';
            emptyEl.classList.add('active');
            return;
        }

        emptyEl.classList.remove('active');
        emptyEl.textContent = '';
        canvas.style.display = 'block';

        this._charts[chartKey] = new Chart(canvas.getContext('2d'), config);
    }

    destroyCharts() {
        Object.keys(this._charts).forEach((key) => {
            if (this._charts[key]) {
                this._charts[key].destroy();
                this._charts[key] = null;
            }
        });
    }

    getSharedChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#334155',
                        boxWidth: 12,
                    },
                },
            },
            scales: {
                x: {
                    ticks: { color: '#475569' },
                    grid: { color: 'rgba(148, 163, 184, 0.18)' },
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: '#475569' },
                    grid: { color: 'rgba(148, 163, 184, 0.18)' },
                },
            },
        };
    }

    async fetchTrips(userId) {
        const query = userId ? `?driver_id=${encodeURIComponent(String(userId))}` : '';
        const response = await DriverUtils.apiGet(`/trips${query}`);
        if (!this.isSuccessResponse(response)) {
            throw new Error(response?.message || 'Failed to load trips.');
        }

        const rows = this.extractList(response, 'trips');
        return this.filterDriverOwnedRows(rows, userId);
    }

    async fetchVehicleChecks(userId) {
        const query = userId ? `?driver_id=${encodeURIComponent(String(userId))}` : '';
        const response = await DriverUtils.apiGet(`/vehicle-checks${query}`);
        if (!this.isSuccessResponse(response)) {
            throw new Error(response?.message || 'Failed to load vehicle checks.');
        }

        const rows = this.extractList(response, 'checks');
        return this.filterDriverOwnedRows(rows, userId);
    }

    async fetchBreakdowns() {
        const response = await DriverUtils.apiGet('/breakdown-reports');
        if (!this.isSuccessResponse(response)) {
            throw new Error(response?.message || 'Failed to load breakdown reports.');
        }

        return this.extractList(response, 'reports');
    }

    async fetchRouteBreakdowns() {
        const response = await DriverUtils.apiGet('/route-breakdowns');
        if (!this.isSuccessResponse(response)) {
            throw new Error(response?.message || 'Failed to load route breakdowns.');
        }

        return this.extractList(response, 'breakdowns');
    }

    async fetchFuelLogs(userId) {
        const query = userId ? `?driver_id=${encodeURIComponent(String(userId))}` : '';
        const response = await DriverUtils.apiGet(`/fuel-logs${query}`);
        if (!this.isSuccessResponse(response)) {
            throw new Error(response?.message || 'Failed to load fuel logs.');
        }

        const rows = this.extractList(response, 'fuel_logs');
        return this.filterDriverOwnedRows(rows, userId);
    }

    async fetchGarages() {
        const response = await DriverUtils.apiGet('/garages');
        if (!this.isSuccessResponse(response)) {
            throw new Error(response?.message || 'Failed to load garages.');
        }

        return this.extractList(response, 'garages');
    }

    extractList(response, key) {
        if (!response) {
            return [];
        }

        if (Array.isArray(response)) {
            return response;
        }

        if (Array.isArray(response.data)) {
            return response.data;
        }

        if (response.data && Array.isArray(response.data[key])) {
            return response.data[key];
        }

        if (response[key] && Array.isArray(response[key])) {
            return response[key];
        }

        return [];
    }

    getCurrentUserId() {
        const fromStore = DriverUtils?.store?.currentUser?.id;
        const fromAuth = window.Auth?.getCurrentUser?.()?.id;
        const raw = fromStore ?? fromAuth ?? null;
        const parsed = Number.parseInt(raw, 10);
        return Number.isFinite(parsed) ? parsed : null;
    }

    filterDriverOwnedRows(rows, userId) {
        if (!Array.isArray(rows)) {
            return [];
        }

        if (!userId) {
            return rows;
        }

        return rows.filter((row) => {
            const rowDriverId = Number.parseInt(row?.driver_id, 10);
            if (Number.isFinite(rowDriverId)) {
                return rowDriverId === userId;
            }
            return true;
        });
    }

    isSuccessResponse(response) {
        return !!response && (response.success === true || response.status === 'success');
    }

    normalizeTripStatus(value) {
        const raw = String(value || '').trim().toLowerCase();
        if (raw === 'accepted') return 'accepted';
        if (raw === 'completed') return 'completed';
        if (raw === 'rejected') return 'rejected';
        if (raw === 'cancelled' || raw === 'canceled') return 'cancelled';
        if (raw.includes('in progress') || raw.includes('in-progress')) return 'in_progress';
        if (!raw || raw === 'pending' || raw === 'open') return 'pending';
        return 'other';
    }

    normalizeCheckStatus(value) {
        const raw = String(value || '').trim().toLowerCase();
        if (raw === 'approved') return 'approved';
        if (raw === 'rejected') return 'rejected';
        return 'pending';
    }

    normalizeSeverity(value) {
        const raw = String(value || '').trim().toLowerCase();
        if (raw === 'critical') return 'Critical';
        if (raw === 'high') return 'High';
        if (raw === 'low') return 'Low';
        return 'Medium';
    }

    normalizeBreakdownType(value) {
        const raw = String(value || 'unknown').trim();
        if (!raw) {
            return 'Unknown';
        }

        return raw
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    normalizeTicketStatus(value) {
        const raw = String(value || '').trim().toLowerCase();

        if (!raw || raw.includes('open') || raw.includes('pending')) {
            return 'open';
        }

        if (raw.includes('assigned')) {
            return 'assigned';
        }

        if (
            raw.includes('progress')
            || raw.includes('waiting')
            || raw.includes('parts')
            || raw.includes('budget')
        ) {
            return 'in_progress';
        }

        if (raw.includes('resolved') || raw.includes('complete')) {
            return 'resolved';
        }

        if (raw.includes('closed')) {
            return 'closed';
        }

        return 'other';
    }

    normalizeFuelSource(value) {
        const raw = String(value || '').trim().toLowerCase();
        if (raw === 'internal') return 'internal';
        if (raw === 'external') return 'external';
        return 'unknown';
    }

    normalizeGarageWorkflowStatus(workflowStatus, ticketStatus, reportStatus) {
        const workflow = String(workflowStatus || '').trim().toLowerCase();
        const ticket = String(ticketStatus || '').trim().toLowerCase();
        const report = String(reportStatus || '').trim().toLowerCase();

        if (workflow === 'completed' || workflow.includes('completed')) {
            return 'completed';
        }

        if (workflow === 'repair_in_progress' || workflow.includes('repair') || workflow.includes('progress')) {
            return 'repair_in_progress';
        }

        if (workflow === 'garage_entry_logged' || workflow.includes('entry')) {
            return 'garage_entry_logged';
        }

        if (workflow === 'garage_approved' || workflow.includes('approved')) {
            return 'garage_approved';
        }

        if (ticket.includes('resolved') || ticket.includes('closed') || ticket.includes('complete')) {
            return 'completed';
        }

        if (report.includes('resolved') || report.includes('closed') || report.includes('complete')) {
            return 'completed';
        }

        return 'awaiting_approval';
    }

    isTruthyCheckValue(value) {
        if (typeof value === 'boolean') {
            return value;
        }

        if (value === 1 || value === '1') {
            return true;
        }

        const raw = String(value || '').trim().toLowerCase();
        return raw === 'yes' || raw === 'ok' || raw === 'pass' || raw === 'good';
    }

    getReportPeriod() {
        const fromRaw = String(this.querySelector('#driverAnalyticsFromDate')?.value || '').trim();
        const toRaw = String(this.querySelector('#driverAnalyticsToDate')?.value || '').trim();

        const from = fromRaw ? new Date(`${fromRaw}T00:00:00`) : null;
        const to = toRaw ? new Date(`${toRaw}T23:59:59`) : null;

        if (from && Number.isNaN(from.getTime())) {
            throw new Error('Invalid from-date value.');
        }

        if (to && Number.isNaN(to.getTime())) {
            throw new Error('Invalid to-date value.');
        }

        if (from && to && from.getTime() > to.getTime()) {
            throw new Error('From date must be earlier than or equal to to date.');
        }

        return { fromRaw, toRaw, from, to };
    }

    isWithinPeriod(date, period) {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
            return false;
        }

        if (period.from && date.getTime() < period.from.getTime()) {
            return false;
        }

        if (period.to && date.getTime() > period.to.getTime()) {
            return false;
        }

        return true;
    }

    extractTripDate(row) {
        return this.extractDate(row?.created_at, row?.trip_date, row?.updated_at);
    }

    extractCheckDate(row) {
        return this.extractDate(row?.submitted_date, row?.week_end_date, row?.created_at);
    }

    extractBreakdownDate(row) {
        return this.extractDate(row?.breakdown_datetime, row?.breakdown_date, row?.created_at, row?.updated_at);
    }

    extractRouteBreakdownDate(row) {
        return this.extractDate(row?.breakdown_datetime, row?.created_at, row?.updated_at);
    }

    extractFuelDate(row) {
        return this.extractDate(row?.log_datetime, row?.created_at, row?.updated_at);
    }

    extractDate(...values) {
        for (const value of values) {
            if (!value) {
                continue;
            }

            const parsed = new Date(value);
            if (!Number.isNaN(parsed.getTime())) {
                return parsed;
            }
        }

        return null;
    }

    getFilteredTrips(period) {
        const rows = Array.isArray(this._data.trips) ? this._data.trips : [];
        return rows.filter((row) => this.isWithinPeriod(this.extractTripDate(row), period));
    }

    getFilteredChecks(period) {
        const rows = Array.isArray(this._data.checks) ? this._data.checks : [];
        return rows.filter((row) => this.isWithinPeriod(this.extractCheckDate(row), period));
    }

    getFilteredBreakdowns(period) {
        const vehicleRows = Array.isArray(this._data.breakdowns) ? this._data.breakdowns : [];
        const routeRows = Array.isArray(this._data.routeBreakdowns) ? this._data.routeBreakdowns : [];

        const normalizedVehicle = vehicleRows
            .filter((row) => this.isWithinPeriod(this.extractBreakdownDate(row), period))
            .map((row) => ({ ...row, _source: 'vehicle_breakdown' }));

        const normalizedRoute = routeRows
            .filter((row) => this.isWithinPeriod(this.extractRouteBreakdownDate(row), period))
            .map((row) => ({ ...row, _source: 'route_breakdown' }));

        return [...normalizedVehicle, ...normalizedRoute];
    }

    getFilteredFuelLogs(period) {
        const rows = Array.isArray(this._data.fuelLogs) ? this._data.fuelLogs : [];
        return rows.filter((row) => this.isWithinPeriod(this.extractFuelDate(row), period));
    }

    getFilteredRouteBreakdowns(period) {
        const rows = Array.isArray(this._data.routeBreakdowns) ? this._data.routeBreakdowns : [];
        return rows.filter((row) => this.isWithinPeriod(this.extractRouteBreakdownDate(row), period));
    }

    setText(selector, value) {
        const element = this.querySelector(selector);
        if (element) {
            element.textContent = value;
        }
    }

    setAnalyticsStatus(message, type = 'info') {
        const statusEl = this.querySelector('#driverAnalyticsStatus');
        if (!statusEl) {
            return;
        }

        statusEl.className = `driver-analytics-status ${type}`;
        statusEl.textContent = message;
    }

    setReportStatus(message, type = 'info') {
        const statusEl = this.querySelector('#driverReportStatus');
        if (!statusEl) {
            return;
        }

        statusEl.className = `driver-report-status ${type}`;
        statusEl.textContent = message;
    }

    setGeneratingState(isGenerating) {
        const generateBtn = this.querySelector('[data-action="generate-report"]');
        if (!generateBtn) {
            return;
        }

        generateBtn.disabled = isGenerating;
        generateBtn.innerHTML = isGenerating
            ? '<i class="fas fa-spinner fa-spin"></i> Generating...'
            : '<i class="fas fa-file-lines"></i> Generate Report';

        if (isGenerating) {
            this.updateDownloadButtonState(false);
        }
    }

    updateDownloadButtonState(enabled) {
        const button = this.querySelector('#driverReportDownloadBtn');
        if (!button) {
            return;
        }

        button.disabled = !enabled;
    }

    async generateReport() {
        try {
            this.setGeneratingState(true);
            this.setReportStatus('Generating report...', 'info');

            await this.refreshData();
            const period = this.getReportPeriod();
            const selectedScope = String(this.querySelector('#driverReportScope')?.value || 'active').trim();
            const scope = selectedScope === 'active' ? this._activeView : selectedScope;

            const report = await this.buildReportForScope(scope, period, selectedScope);
            this._generatedReport = report;

            this.renderReportPreview(report);
            this.updateDownloadButtonState(true);

            const rowCount = Array.isArray(report.rows) ? report.rows.length : 0;
            this.setReportStatus(`Report generated successfully (${rowCount} rows).`, 'success');
        } catch (error) {
            console.error('Driver analytics report generation failed:', error);
            this.setReportStatus(error?.message || 'Failed to generate report.', 'error');
            this.updateDownloadButtonState(false);
        } finally {
            this.setGeneratingState(false);
        }
    }

    async buildReportForScope(scope, period, selectedScope) {
        if (scope === 'trip') {
            return this.buildTripReport(period, selectedScope);
        }

        if (scope === 'checks') {
            return this.buildChecksReport(period, selectedScope);
        }

        if (scope === 'breakdown') {
            return this.buildBreakdownReport(period, selectedScope);
        }

        if (scope === 'fuel') {
            return this.buildFuelReport(period, selectedScope);
        }

        if (scope === 'workflow') {
            return this.buildWorkflowReport(period, selectedScope);
        }

        if (scope === 'all') {
            return this.buildAllAnalyticsReport(period, selectedScope);
        }

        throw new Error('Unsupported report type selected.');
    }

    async buildTripReport(period, selectedScope) {
        const rows = this.getFilteredTrips(period);

        const reportRows = rows.map((row) => {
            const startOdo = this.toNumber(row.starting_odometer);
            const endOdo = this.toNumber(row.final_odometer);
            const distance = endOdo > 0 && startOdo > 0 && endOdo >= startOdo
                ? Number((endOdo - startOdo).toFixed(2))
                : '';

            return {
                trip_id: row.trip_id || row.id || '',
                origin: row.origin || '',
                destination: row.destination || '',
                vehicle_registration: row.vehicle_registration || row.number_plate || '',
                status: this.toLabel(this.normalizeTripStatus(row.status)),
                created_at: row.created_at || '',
                distance: distance,
            };
        });

        const statusSummary = {
            pending: 0,
            accepted: 0,
            in_progress: 0,
            completed: 0,
            rejected: 0,
            cancelled: 0,
        };

        reportRows.forEach((row) => {
            const key = String(row.status || '').toLowerCase().replace(/\s+/g, '_');
            if (statusSummary[key] !== undefined) {
                statusSummary[key] += 1;
            }
        });

        const summary = {
            total_trips: reportRows.length,
            pending_accepted: statusSummary.pending + statusSummary.accepted,
            in_progress: statusSummary.in_progress,
            completed: statusSummary.completed,
            rejected_cancelled: statusSummary.rejected + statusSummary.cancelled,
        };

        return {
            scope: selectedScope,
            reportType: 'Trip Analytics',
            generatedAt: new Date().toISOString(),
            period,
            summary,
            columns: [
                { key: 'trip_id', label: 'Trip ID' },
                { key: 'origin', label: 'Origin' },
                { key: 'destination', label: 'Destination' },
                { key: 'vehicle_registration', label: 'Vehicle' },
                { key: 'status', label: 'Status' },
                { key: 'created_at', label: 'Created At' },
                { key: 'distance', label: 'Distance (Odometer)' },
            ],
            rows: reportRows,
        };
    }

    async buildChecksReport(period, selectedScope) {
        const rows = this.getFilteredChecks(period);

        const reportRows = rows.map((row) => ({
            check_id: row.check_id || row.id || '',
            vehicle_registration: row.vehicle_registration || row.number_plate || '',
            week_start_date: row.week_start_date || '',
            week_end_date: row.week_end_date || '',
            status: this.toLabel(this.normalizeCheckStatus(row.status)),
            odometer_reading: row.odometer_reading ?? '',
            engine_oil: this.isTruthyCheckValue(row.engine_oil) ? 'Pass' : 'Issue',
            brakes: this.isTruthyCheckValue(row.brakes) ? 'Pass' : 'Issue',
            lights: this.isTruthyCheckValue(row.lights) ? 'Pass' : 'Issue',
            tires: this.isTruthyCheckValue(row.tires) ? 'Pass' : 'Issue',
            coolant: this.isTruthyCheckValue(row.coolant) ? 'Pass' : 'Issue',
            wipers: this.isTruthyCheckValue(row.wipers) ? 'Pass' : 'Issue',
            notes: row.notes || '',
        }));

        const summary = {
            total_checks: reportRows.length,
            pending: reportRows.filter((row) => row.status === 'Pending').length,
            approved: reportRows.filter((row) => row.status === 'Approved').length,
            rejected: reportRows.filter((row) => row.status === 'Rejected').length,
        };

        return {
            scope: selectedScope,
            reportType: 'Vehicle Check Analytics',
            generatedAt: new Date().toISOString(),
            period,
            summary,
            columns: [
                { key: 'check_id', label: 'Check ID' },
                { key: 'vehicle_registration', label: 'Vehicle' },
                { key: 'week_start_date', label: 'Week Start' },
                { key: 'week_end_date', label: 'Week End' },
                { key: 'status', label: 'Status' },
                { key: 'odometer_reading', label: 'Odometer' },
                { key: 'engine_oil', label: 'Engine Oil' },
                { key: 'brakes', label: 'Brakes' },
                { key: 'lights', label: 'Lights' },
                { key: 'tires', label: 'Tires' },
                { key: 'coolant', label: 'Coolant' },
                { key: 'wipers', label: 'Wipers' },
                { key: 'notes', label: 'Notes' },
            ],
            rows: reportRows,
        };
    }

    async buildBreakdownReport(period, selectedScope) {
        const rows = this.getFilteredBreakdowns(period);

        const reportRows = rows.map((row) => ({
            source: row._source === 'route_breakdown' ? 'Route Breakdown' : 'Vehicle Breakdown',
            breakdown_id: row.breakdown_id || row.route_breakdown_id || row.id || '',
            breakdown_type: this.normalizeBreakdownType(row.breakdown_type),
            severity: this.normalizeSeverity(row.severity),
            report_status: row.status || '',
            ticket_status: row.ticket_status || '',
            workflow_status: row.garage_workflow_status || '',
            reported_at: row.breakdown_datetime || row.breakdown_date || row.created_at || '',
            location: row.breakdown_location || row.number_plate || '',
        }));

        const summary = {
            total_breakdowns: reportRows.length,
            critical_high: reportRows.filter((row) => row.severity === 'Critical' || row.severity === 'High').length,
            open_in_progress: reportRows.filter((row) => {
                const status = this.normalizeTicketStatus(row.ticket_status || row.report_status);
                return status === 'open' || status === 'assigned' || status === 'in_progress';
            }).length,
            resolved_closed: reportRows.filter((row) => {
                const status = this.normalizeTicketStatus(row.ticket_status || row.report_status);
                return status === 'resolved' || status === 'closed';
            }).length,
        };

        return {
            scope: selectedScope,
            reportType: 'Breakdown Analytics',
            generatedAt: new Date().toISOString(),
            period,
            summary,
            columns: [
                { key: 'source', label: 'Source' },
                { key: 'breakdown_id', label: 'Breakdown ID' },
                { key: 'breakdown_type', label: 'Breakdown Type' },
                { key: 'severity', label: 'Severity' },
                { key: 'report_status', label: 'Report Status' },
                { key: 'ticket_status', label: 'Ticket Status' },
                { key: 'workflow_status', label: 'Garage Workflow' },
                { key: 'reported_at', label: 'Reported At' },
                { key: 'location', label: 'Location/Vehicle' },
            ],
            rows: reportRows,
        };
    }

    async buildFuelReport(period, selectedScope) {
        const rows = this.getFilteredFuelLogs(period);

        const reportRows = rows.map((row) => ({
            fuel_log_id: row.fuel_log_id || row.id || '',
            log_datetime: row.log_datetime || row.created_at || '',
            vehicle_registration: row.vehicle_registration || row.number_plate || '',
            fuel_volume_l: this.toNumber(row.fuel_volume),
            total_cost: this.toNumber(row.total_cost),
            fuel_source: this.toLabel(this.normalizeFuelSource(row.fuel_source)),
            distance_since_last: row.distance_since_last ?? '',
            fuel_efficiency: this.toNumber(row.fuel_efficiency),
            station_name: row.station_name || '',
        }));

        const efficiencies = reportRows
            .map((row) => this.toNumber(row.fuel_efficiency))
            .filter((value) => value > 0);

        const summary = {
            total_entries: reportRows.length,
            total_fuel_volume_l: Number(reportRows.reduce((sum, row) => sum + this.toNumber(row.fuel_volume_l), 0).toFixed(2)),
            total_cost: Number(reportRows.reduce((sum, row) => sum + this.toNumber(row.total_cost), 0).toFixed(2)),
            avg_fuel_efficiency: efficiencies.length > 0
                ? Number((efficiencies.reduce((sum, value) => sum + value, 0) / efficiencies.length).toFixed(2))
                : 0,
        };

        return {
            scope: selectedScope,
            reportType: 'Fuel Analytics',
            generatedAt: new Date().toISOString(),
            period,
            summary,
            columns: [
                { key: 'fuel_log_id', label: 'Fuel Log ID' },
                { key: 'log_datetime', label: 'Log Date/Time' },
                { key: 'vehicle_registration', label: 'Vehicle' },
                { key: 'fuel_volume_l', label: 'Fuel Volume (L)' },
                { key: 'total_cost', label: 'Total Cost' },
                { key: 'fuel_source', label: 'Fuel Source' },
                { key: 'distance_since_last', label: 'Distance Since Last' },
                { key: 'fuel_efficiency', label: 'Fuel Efficiency' },
                { key: 'station_name', label: 'Station/Source' },
            ],
            rows: reportRows,
        };
    }

    async buildWorkflowReport(period, selectedScope) {
        const rows = this.getFilteredRouteBreakdowns(period);

        const reportRows = rows.map((row) => ({
            route_breakdown_id: row.route_breakdown_id || row.id || '',
            breakdown_type: this.normalizeBreakdownType(row.breakdown_type),
            workflow_status: this.toLabel(this.normalizeGarageWorkflowStatus(row.garage_workflow_status, row.ticket_status, row.status)),
            ticket_status: row.ticket_status || '',
            approved_garage: row.approved_garage_name || '',
            bill_amount: this.toNumber(row.bill_amount),
            reported_at: row.breakdown_datetime || row.created_at || '',
        }));

        const summary = {
            workflow_cases: reportRows.length,
            garage_approved: reportRows.filter((row) => row.workflow_status === 'Garage Approved').length,
            in_progress: reportRows.filter((row) => row.workflow_status === 'Garage Entry Logged' || row.workflow_status === 'Repair In Progress').length,
            completed: reportRows.filter((row) => row.workflow_status === 'Completed').length,
        };

        return {
            scope: selectedScope,
            reportType: 'Workflow Analytics',
            generatedAt: new Date().toISOString(),
            period,
            summary,
            columns: [
                { key: 'route_breakdown_id', label: 'Route Breakdown ID' },
                { key: 'breakdown_type', label: 'Breakdown Type' },
                { key: 'workflow_status', label: 'Workflow Status' },
                { key: 'ticket_status', label: 'Ticket Status' },
                { key: 'approved_garage', label: 'Approved Garage' },
                { key: 'bill_amount', label: 'Bill Amount' },
                { key: 'reported_at', label: 'Reported At' },
            ],
            rows: reportRows,
        };
    }

    async buildAllAnalyticsReport(period, selectedScope) {
        const [tripReport, checksReport, breakdownReport, fuelReport, workflowReport] = await Promise.all([
            this.buildTripReport(period, 'trip'),
            this.buildChecksReport(period, 'checks'),
            this.buildBreakdownReport(period, 'breakdown'),
            this.buildFuelReport(period, 'fuel'),
            this.buildWorkflowReport(period, 'workflow'),
        ]);

        const reports = [tripReport, checksReport, breakdownReport, fuelReport, workflowReport];
        const rows = [];

        reports.forEach((report) => {
            Object.entries(report.summary || {}).forEach(([metric, value]) => {
                rows.push({
                    section: report.reportType,
                    metric: this.toLabel(metric),
                    value,
                });
            });
        });

        return {
            scope: selectedScope,
            reportType: 'All Analytics Summary',
            generatedAt: new Date().toISOString(),
            period,
            summary: {
                included_sections: reports.length,
                summary_rows: rows.length,
            },
            columns: [
                { key: 'section', label: 'Section' },
                { key: 'metric', label: 'Metric' },
                { key: 'value', label: 'Value' },
            ],
            rows,
        };
    }

    renderReportPreview(report) {
        const previewEl = this.querySelector('#driverReportPreview');
        if (!previewEl) {
            return;
        }

        const summaryHtml = Object.entries(report.summary || {})
            .map(([key, value]) => {
                const label = this.toLabel(key);
                return `
                    <div class="driver-report-summary-item">
                        <span class="summary-key">${this.escapeHtml(label)}</span>
                        <span class="summary-value">${this.escapeHtml(String(value))}</span>
                    </div>
                `;
            })
            .join('');

        const rows = Array.isArray(report.rows) ? report.rows : [];
        const columns = Array.isArray(report.columns) ? report.columns : [];
        const previewRows = rows.slice(0, 200);

        const tableHeader = columns
            .map((column) => `<th>${this.escapeHtml(column.label)}</th>`)
            .join('');

        const tableRows = previewRows
            .map((row) => {
                const cells = columns
                    .map((column) => `<td>${this.escapeHtml(String(row[column.key] ?? ''))}</td>`)
                    .join('');
                return `<tr>${cells}</tr>`;
            })
            .join('');

        const periodText = `${report.period.fromRaw || 'Any'} to ${report.period.toRaw || 'Any'}`;
        const truncatedNote = rows.length > previewRows.length
            ? `<div class="driver-report-truncated-note">Showing first ${previewRows.length} rows out of ${rows.length}.</div>`
            : '';

        const tableSection = columns.length > 0
            ? `
                <div class="driver-report-table-wrap">
                    <table class="driver-report-table" id="driverReportTable">
                        <thead><tr>${tableHeader}</tr></thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>
                ${truncatedNote}
            `
            : '<div class="driver-report-empty">No tabular rows available for this report.</div>';

        previewEl.innerHTML = `
            <div class="driver-report-preview-card">
                <div class="driver-report-meta">
                    <h3>${this.escapeHtml(report.reportType)}</h3>
                    <p>Period: ${this.escapeHtml(periodText)} | Generated: ${this.escapeHtml(this.formatDateTime(report.generatedAt))}</p>
                </div>
                <div class="driver-report-summary-grid">${summaryHtml || '<div class="driver-report-empty">No summary metrics found.</div>'}</div>
                ${tableSection}
            </div>
        `;
    }

    downloadReportCsv() {
        if (!this._generatedReport) {
            this.setReportStatus('Generate a report before downloading.', 'error');
            return;
        }

        const csv = this.buildCsv(this._generatedReport);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const now = new Date();
        const fileStamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
        const scopeLabel = String(this._generatedReport.scope || 'analytics').toLowerCase();

        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `driver-${scopeLabel}-report-${fileStamp}.csv`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);

        URL.revokeObjectURL(url);
        this.setReportStatus('Report downloaded successfully.', 'success');
    }

    buildCsv(report) {
        const lines = [];
        lines.push(`Report Type,${this.escapeCsv(report.reportType)}`);
        lines.push(`Generated At,${this.escapeCsv(report.generatedAt)}`);
        lines.push(`From Date,${this.escapeCsv(report.period.fromRaw || 'Any')}`);
        lines.push(`To Date,${this.escapeCsv(report.period.toRaw || 'Any')}`);
        lines.push('');
        lines.push('Summary Metric,Value');

        Object.entries(report.summary || {}).forEach(([metric, value]) => {
            lines.push(`${this.escapeCsv(this.toLabel(metric))},${this.escapeCsv(value)}`);
        });

        lines.push('');

        const columns = Array.isArray(report.columns) ? report.columns : [];
        if (columns.length > 0) {
            lines.push(columns.map((column) => this.escapeCsv(column.label)).join(','));

            const rows = Array.isArray(report.rows) ? report.rows : [];
            rows.forEach((row) => {
                const values = columns.map((column) => this.escapeCsv(row[column.key] ?? ''));
                lines.push(values.join(','));
            });
        }

        return lines.join('\n');
    }

    escapeCsv(value) {
        const raw = String(value ?? '');
        const escaped = raw.replace(/"/g, '""');
        if (/[",\n]/.test(escaped)) {
            return `"${escaped}"`;
        }
        return escaped;
    }

    toLabel(value) {
        return String(value || '')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    formatDateTime(value) {
        if (!value) {
            return 'N/A';
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    toInputDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    toNumber(value) {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    formatNumber(value) {
        return this.toNumber(value).toFixed(2);
    }

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

customElements.define('driver-analytics-hub', DriverAnalyticsHub);
