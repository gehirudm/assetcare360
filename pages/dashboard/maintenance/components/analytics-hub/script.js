class MaintenanceAnalyticsHub extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this._views = ['tickets', 'breakdowns', 'cost', 'service', 'notifications'];
        this._activeView = 'tickets';
        this._generatedReport = null;
        this._charts = {
            ticketStatus: null,
            ticketPriority: null,
            breakdownSource: null,
            breakdownSeverity: null,
            costLevel: null,
            costTrend: null,
            serviceAssetRisk: null,
            serviceActivity: null,
            notificationType: null,
            notificationTimeline: null,
        };
        this._data = {
            tickets: [],
            machineBreakdowns: [],
            routeBreakdowns: [],
            pendingBudgetReports: [],
            vehicles: [],
            machines: [],
            notifications: [],
            repairTickets: [],
            weeklyChecks: [],
        };

        this.loadStyles();
        this.render();
        this.bindEvents();
        this.setDefaultPeriod();
        this.setAnalyticsStatus('Select a date range and click Apply Time Filter to refresh analytics.', 'info');
        this.setReportStatus('Generate a report from the selected period and download it as CSV.', 'info');
        this.updateDownloadButtonState(false);
        this.activateView(this.getInitialView(), { refresh: false });
        this.refreshActive();
    }

    disconnectedCallback() {
        this.destroyCharts();
    }

    async refresh() {
        await this.refreshActive();
    }

    loadStyles() {
        const linkId = 'maintenance-analytics-hub-styles';
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
                <h1 class="page-title"><i class="fas fa-chart-line"></i> Maintenance Analytics</h1>
                <p class="page-subtitle">Monitor ticket pipeline, breakdown intake, budget approvals, service risk, and notifications in one view.</p>
            </div>

            <div class="maintenance-analytics-nav" role="tablist" aria-label="Maintenance analytics views">
                <button type="button" class="analytics-option-btn" role="tab" data-view="tickets">Fault Ticket Analytics</button>
                <button type="button" class="analytics-option-btn" role="tab" data-view="breakdowns">Breakdown Analytics</button>
                <button type="button" class="analytics-option-btn" role="tab" data-view="cost">Cost Approval Analytics</button>
                <button type="button" class="analytics-option-btn" role="tab" data-view="service">Service & Warranty Analytics</button>
                <button type="button" class="analytics-option-btn" role="tab" data-view="notifications">Notification Analytics</button>
            </div>

            <div class="maintenance-analytics-toolbar">
                <div class="analytics-toolbar-group">
                    <label class="analytics-toolbar-label" for="maintenanceAnalyticsFromDate">From Date</label>
                    <input id="maintenanceAnalyticsFromDate" class="analytics-toolbar-field" type="date">
                </div>
                <div class="analytics-toolbar-group">
                    <label class="analytics-toolbar-label" for="maintenanceAnalyticsToDate">To Date</label>
                    <input id="maintenanceAnalyticsToDate" class="analytics-toolbar-field" type="date">
                </div>
                <div class="analytics-toolbar-group">
                    <label class="analytics-toolbar-label" for="maintenanceReportScope">Report Type</label>
                    <select id="maintenanceReportScope" class="analytics-toolbar-field">
                        <option value="active">Active Analytics View</option>
                        <option value="tickets">Fault Ticket Analytics</option>
                        <option value="breakdowns">Breakdown Analytics</option>
                        <option value="cost">Cost Approval Analytics</option>
                        <option value="service">Service & Warranty Analytics</option>
                        <option value="notifications">Notification Analytics</option>
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
                    <button type="button" class="btn btn-secondary" data-action="download-report" id="maintenanceReportDownloadBtn" disabled>
                        <i class="fas fa-download"></i> Download CSV
                    </button>
                </div>
            </div>

            <div id="maintenanceAnalyticsStatus" class="maintenance-analytics-status"></div>
            <div id="maintenanceReportStatus" class="maintenance-report-status"></div>
            <div id="maintenanceReportPreview" class="maintenance-report-preview"></div>

            <div class="maintenance-analytics-panel" data-view="tickets" role="tabpanel">
                <div class="maintenance-summary-grid">
                    <div class="maintenance-summary-item"><span class="summary-key">Total Tickets</span><span class="summary-value" id="maintenanceTicketTotal">0</span></div>
                    <div class="maintenance-summary-item"><span class="summary-key">Critical + High</span><span class="summary-value" id="maintenanceTicketCriticalHigh">0</span></div>
                    <div class="maintenance-summary-item"><span class="summary-key">In Progress Pipeline</span><span class="summary-value" id="maintenanceTicketInProgress">0</span></div>
                    <div class="maintenance-summary-item"><span class="summary-key">Resolved + Closed</span><span class="summary-value" id="maintenanceTicketResolvedClosed">0</span></div>
                </div>
                <div class="maintenance-analytics-grid">
                    <div class="chart-card">
                        <div class="chart-header">
                            <span class="chart-title">Ticket Status Distribution</span>
                            <span class="chart-subtitle">Pipeline status spread for selected period.</span>
                        </div>
                        <div class="chart-canvas-wrap">
                            <canvas id="maintenanceTicketStatusChart"></canvas>
                            <div class="chart-empty" id="maintenanceTicketStatusChartEmpty"></div>
                        </div>
                    </div>
                    <div class="chart-card">
                        <div class="chart-header">
                            <span class="chart-title">Ticket Priority Distribution</span>
                            <span class="chart-subtitle">Priority mix across maintenance tickets.</span>
                        </div>
                        <div class="chart-canvas-wrap">
                            <canvas id="maintenanceTicketPriorityChart"></canvas>
                            <div class="chart-empty" id="maintenanceTicketPriorityChartEmpty"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="maintenance-analytics-panel" data-view="breakdowns" role="tabpanel">
                <div class="maintenance-summary-grid">
                    <div class="maintenance-summary-item"><span class="summary-key">Total Breakdown Reports</span><span class="summary-value" id="maintenanceBreakdownTotal">0</span></div>
                    <div class="maintenance-summary-item"><span class="summary-key">Machine Reports</span><span class="summary-value" id="maintenanceBreakdownMachine">0</span></div>
                    <div class="maintenance-summary-item"><span class="summary-key">Route Reports</span><span class="summary-value" id="maintenanceBreakdownRoute">0</span></div>
                    <div class="maintenance-summary-item"><span class="summary-key">Critical + High</span><span class="summary-value" id="maintenanceBreakdownCriticalHigh">0</span></div>
                </div>
                <div class="maintenance-analytics-grid">
                    <div class="chart-card">
                        <div class="chart-header">
                            <span class="chart-title">Breakdown Source Mix</span>
                            <span class="chart-subtitle">Machine vs route breakdown intake.</span>
                        </div>
                        <div class="chart-canvas-wrap">
                            <canvas id="maintenanceBreakdownSourceChart"></canvas>
                            <div class="chart-empty" id="maintenanceBreakdownSourceChartEmpty"></div>
                        </div>
                    </div>
                    <div class="chart-card">
                        <div class="chart-header">
                            <span class="chart-title">Breakdown Severity Distribution</span>
                            <span class="chart-subtitle">Severity spread of incoming reports.</span>
                        </div>
                        <div class="chart-canvas-wrap">
                            <canvas id="maintenanceBreakdownSeverityChart"></canvas>
                            <div class="chart-empty" id="maintenanceBreakdownSeverityChartEmpty"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="maintenance-analytics-panel" data-view="cost" role="tabpanel">
                <div class="maintenance-summary-grid">
                    <div class="maintenance-summary-item"><span class="summary-key">Pending Budget Requests</span><span class="summary-value" id="maintenanceCostPending">0</span></div>
                    <div class="maintenance-summary-item"><span class="summary-key">Total Pending Amount</span><span class="summary-value" id="maintenanceCostAmount">0.00</span></div>
                    <div class="maintenance-summary-item"><span class="summary-key">Manager Approval Level</span><span class="summary-value" id="maintenanceCostManagerLevel">0</span></div>
                    <div class="maintenance-summary-item"><span class="summary-key">Average Request Amount</span><span class="summary-value" id="maintenanceCostAverage">0.00</span></div>
                </div>
                <div class="maintenance-analytics-grid">
                    <div class="chart-card">
                        <div class="chart-header">
                            <span class="chart-title">Approval Level Distribution</span>
                            <span class="chart-subtitle">Supervisor vs maintenance-manager level requests.</span>
                        </div>
                        <div class="chart-canvas-wrap">
                            <canvas id="maintenanceCostLevelChart"></canvas>
                            <div class="chart-empty" id="maintenanceCostLevelChartEmpty"></div>
                        </div>
                    </div>
                    <div class="chart-card">
                        <div class="chart-header">
                            <span class="chart-title">Pending Amount Trend</span>
                            <span class="chart-subtitle">Daily total amount of pending requests.</span>
                        </div>
                        <div class="chart-canvas-wrap">
                            <canvas id="maintenanceCostTrendChart"></canvas>
                            <div class="chart-empty" id="maintenanceCostTrendChartEmpty"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="maintenance-analytics-panel" data-view="service" role="tabpanel">
                <div class="maintenance-summary-grid">
                    <div class="maintenance-summary-item"><span class="summary-key">Tracked Assets</span><span class="summary-value" id="maintenanceServiceAssets">0</span></div>
                    <div class="maintenance-summary-item"><span class="summary-key">Expiring Soon</span><span class="summary-value" id="maintenanceServiceExpiring">0</span></div>
                    <div class="maintenance-summary-item"><span class="summary-key">Expired / Overdue</span><span class="summary-value" id="maintenanceServiceExpired">0</span></div>
                    <div class="maintenance-summary-item"><span class="summary-key">Service Activities (Period)</span><span class="summary-value" id="maintenanceServiceActivities">0</span></div>
                </div>
                <div class="maintenance-analytics-grid">
                    <div class="chart-card">
                        <div class="chart-header">
                            <span class="chart-title">Asset Service Risk Distribution</span>
                            <span class="chart-subtitle">Current risk state from service and warranty dates.</span>
                        </div>
                        <div class="chart-canvas-wrap">
                            <canvas id="maintenanceServiceAssetRiskChart"></canvas>
                            <div class="chart-empty" id="maintenanceServiceAssetRiskChartEmpty"></div>
                        </div>
                    </div>
                    <div class="chart-card">
                        <div class="chart-header">
                            <span class="chart-title">Service Activity Distribution</span>
                            <span class="chart-subtitle">Repair-ticket and weekly-check activity in selected period.</span>
                        </div>
                        <div class="chart-canvas-wrap">
                            <canvas id="maintenanceServiceActivityChart"></canvas>
                            <div class="chart-empty" id="maintenanceServiceActivityChartEmpty"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="maintenance-analytics-panel" data-view="notifications" role="tabpanel">
                <div class="maintenance-summary-grid">
                    <div class="maintenance-summary-item"><span class="summary-key">Notifications</span><span class="summary-value" id="maintenanceNotificationTotal">0</span></div>
                    <div class="maintenance-summary-item"><span class="summary-key">Unread</span><span class="summary-value" id="maintenanceNotificationUnread">0</span></div>
                    <div class="maintenance-summary-item"><span class="summary-key">Warning + Error</span><span class="summary-value" id="maintenanceNotificationWarningError">0</span></div>
                    <div class="maintenance-summary-item"><span class="summary-key">Info + Success</span><span class="summary-value" id="maintenanceNotificationInfoSuccess">0</span></div>
                </div>
                <div class="maintenance-analytics-grid">
                    <div class="chart-card">
                        <div class="chart-header">
                            <span class="chart-title">Notification Type Mix</span>
                            <span class="chart-subtitle">Severity distribution of maintenance notifications.</span>
                        </div>
                        <div class="chart-canvas-wrap">
                            <canvas id="maintenanceNotificationTypeChart"></canvas>
                            <div class="chart-empty" id="maintenanceNotificationTypeChartEmpty"></div>
                        </div>
                    </div>
                    <div class="chart-card">
                        <div class="chart-header">
                            <span class="chart-title">Notification Timeline</span>
                            <span class="chart-subtitle">Daily notification volume for selected period.</span>
                        </div>
                        <div class="chart-canvas-wrap">
                            <canvas id="maintenanceNotificationTimelineChart"></canvas>
                            <div class="chart-empty" id="maintenanceNotificationTimelineChartEmpty"></div>
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
        const fromInput = this.querySelector('#maintenanceAnalyticsFromDate');
        const toInput = this.querySelector('#maintenanceAnalyticsToDate');
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

        return 'tickets';
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

        this.querySelectorAll('.maintenance-analytics-panel').forEach((panel) => {
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
            console.error('Maintenance analytics refresh failed:', error);
            this.setAnalyticsStatus(error?.message || 'Failed to refresh analytics.', 'error');
        }
    }

    async refreshData() {
        if (typeof API === 'undefined') {
            throw new Error('API client is unavailable.');
        }

        const [
            ticketsResult,
            machineBreakdownsResult,
            routeBreakdownsResult,
            pendingBudgetResult,
            vehiclesResult,
            machinesResult,
            notificationsResult,
            repairTicketsResult,
            weeklyChecksResult,
        ] = await Promise.allSettled([
            this.fetchFaultTickets(),
            this.fetchMachineBreakdowns(),
            this.fetchRouteBreakdowns(),
            this.fetchPendingBudgetReports(),
            this.fetchVehicles(),
            this.fetchMachines(),
            this.fetchNotifications(),
            this.fetchRepairTickets(),
            this.fetchMachineWeeklyChecks(),
        ]);

        const errors = [];

        if (ticketsResult.status === 'fulfilled') {
            this._data.tickets = ticketsResult.value;
        } else {
            this._data.tickets = [];
            errors.push('fault tickets');
        }

        if (machineBreakdownsResult.status === 'fulfilled') {
            this._data.machineBreakdowns = machineBreakdownsResult.value;
        } else {
            this._data.machineBreakdowns = [];
            errors.push('machine breakdowns');
        }

        if (routeBreakdownsResult.status === 'fulfilled') {
            this._data.routeBreakdowns = routeBreakdownsResult.value;
        } else {
            this._data.routeBreakdowns = [];
            errors.push('route breakdowns');
        }

        if (pendingBudgetResult.status === 'fulfilled') {
            this._data.pendingBudgetReports = pendingBudgetResult.value;
        } else {
            this._data.pendingBudgetReports = [];
            errors.push('pending budget reports');
        }

        if (vehiclesResult.status === 'fulfilled') {
            this._data.vehicles = vehiclesResult.value;
        } else {
            this._data.vehicles = [];
            errors.push('vehicles');
        }

        if (machinesResult.status === 'fulfilled') {
            this._data.machines = machinesResult.value;
        } else {
            this._data.machines = [];
            errors.push('machines');
        }

        if (notificationsResult.status === 'fulfilled') {
            this._data.notifications = notificationsResult.value;
        } else {
            this._data.notifications = [];
            errors.push('notifications');
        }

        if (repairTicketsResult.status === 'fulfilled') {
            this._data.repairTickets = repairTicketsResult.value;
        } else {
            this._data.repairTickets = [];
            errors.push('repair tickets');
        }

        if (weeklyChecksResult.status === 'fulfilled') {
            this._data.weeklyChecks = weeklyChecksResult.value;
        } else {
            this._data.weeklyChecks = [];
            errors.push('weekly checks');
        }

        if (errors.length === 9) {
            throw new Error('Failed to load analytics data from all sources.');
        }

        if (errors.length > 0) {
            this.setAnalyticsStatus(`Partial data loaded. Missing: ${errors.join(', ')}.`, 'warning');
        }
    }

    renderActiveView() {
        const period = this.getReportPeriod();

        if (this._activeView === 'tickets') {
            this.renderTicketsView(period);
            return;
        }

        if (this._activeView === 'breakdowns') {
            this.renderBreakdownsView(period);
            return;
        }

        if (this._activeView === 'cost') {
            this.renderCostView(period);
            return;
        }

        if (this._activeView === 'service') {
            this.renderServiceView(period);
            return;
        }

        if (this._activeView === 'notifications') {
            this.renderNotificationsView(period);
        }
    }

    renderTicketsView(period) {
        const rows = this.getFilteredTickets(period);

        const statusCounts = {
            open: 0,
            assigned: 0,
            waiting_budget: 0,
            waiting_parts: 0,
            parts_approved: 0,
            insurance_claimed: 0,
            in_progress: 0,
            resolved: 0,
            closed: 0,
            other: 0,
        };

        const priorityCounts = {
            Low: 0,
            Medium: 0,
            High: 0,
            Critical: 0,
        };

        rows.forEach((row) => {
            const status = this.normalizeTicketStatus(row.status);
            if (statusCounts[status] === undefined) {
                statusCounts.other += 1;
            } else {
                statusCounts[status] += 1;
            }

            const priority = this.normalizePriority(row.priority);
            priorityCounts[priority] += 1;
        });

        const inProgressPipeline = statusCounts.assigned
            + statusCounts.waiting_budget
            + statusCounts.waiting_parts
            + statusCounts.parts_approved
            + statusCounts.in_progress;

        this.setText('#maintenanceTicketTotal', String(rows.length));
        this.setText('#maintenanceTicketCriticalHigh', String(priorityCounts.Critical + priorityCounts.High));
        this.setText('#maintenanceTicketInProgress', String(inProgressPipeline));
        this.setText('#maintenanceTicketResolvedClosed', String(statusCounts.resolved + statusCounts.closed));

        const statusRows = [
            ['Open', statusCounts.open],
            ['Assigned', statusCounts.assigned],
            ['Waiting Budget', statusCounts.waiting_budget],
            ['Waiting Parts', statusCounts.waiting_parts],
            ['Parts Approved', statusCounts.parts_approved],
            ['In Progress', statusCounts.in_progress],
            ['Resolved', statusCounts.resolved],
            ['Closed', statusCounts.closed],
            ['Insurance Claimed', statusCounts.insurance_claimed],
            ['Other', statusCounts.other],
        ].filter((row) => row[1] > 0);

        this.renderChart(
            'ticketStatus',
            '#maintenanceTicketStatusChart',
            '#maintenanceTicketStatusChartEmpty',
            {
                type: 'doughnut',
                data: {
                    labels: statusRows.map((row) => row[0]),
                    datasets: [{
                        data: statusRows.map((row) => row[1]),
                        backgroundColor: ['#60a5fa', '#fbbf24', '#f97316', '#f59e0b', '#22c55e', '#2563eb', '#10b981', '#64748b', '#ef4444', '#94a3b8'],
                    }],
                },
                options: this.getSharedChartOptions(),
            },
            statusRows.length > 0,
            'No ticket status data found for selected period.'
        );

        this.renderChart(
            'ticketPriority',
            '#maintenanceTicketPriorityChart',
            '#maintenanceTicketPriorityChartEmpty',
            {
                type: 'bar',
                data: {
                    labels: ['Low', 'Medium', 'High', 'Critical'],
                    datasets: [{
                        label: 'Tickets',
                        data: [priorityCounts.Low, priorityCounts.Medium, priorityCounts.High, priorityCounts.Critical],
                        backgroundColor: ['#60a5fa', '#fbbf24', '#f97316', '#ef4444'],
                        borderRadius: 8,
                    }],
                },
                options: this.getSharedChartOptions(),
            },
            rows.length > 0,
            'No ticket priority data found for selected period.'
        );
    }

    renderBreakdownsView(period) {
        const rows = this.getFilteredBreakdowns(period);

        const sourceCounts = {
            machine: 0,
            route: 0,
        };

        const severityCounts = {
            Low: 0,
            Medium: 0,
            High: 0,
            Critical: 0,
        };

        rows.forEach((row) => {
            if (row._source === 'route') {
                sourceCounts.route += 1;
            } else {
                sourceCounts.machine += 1;
            }

            const severity = this.normalizeSeverity(row.severity);
            severityCounts[severity] += 1;
        });

        this.setText('#maintenanceBreakdownTotal', String(rows.length));
        this.setText('#maintenanceBreakdownMachine', String(sourceCounts.machine));
        this.setText('#maintenanceBreakdownRoute', String(sourceCounts.route));
        this.setText('#maintenanceBreakdownCriticalHigh', String(severityCounts.Critical + severityCounts.High));

        const sourceRows = [
            ['Machine Breakdowns', sourceCounts.machine],
            ['Route Breakdowns', sourceCounts.route],
        ].filter((row) => row[1] > 0);

        this.renderChart(
            'breakdownSource',
            '#maintenanceBreakdownSourceChart',
            '#maintenanceBreakdownSourceChartEmpty',
            {
                type: 'doughnut',
                data: {
                    labels: sourceRows.map((row) => row[0]),
                    datasets: [{
                        data: sourceRows.map((row) => row[1]),
                        backgroundColor: ['#2563eb', '#0ea5e9'],
                    }],
                },
                options: this.getSharedChartOptions(),
            },
            sourceRows.length > 0,
            'No breakdown source data found for selected period.'
        );

        this.renderChart(
            'breakdownSeverity',
            '#maintenanceBreakdownSeverityChart',
            '#maintenanceBreakdownSeverityChartEmpty',
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
            'No breakdown severity data found for selected period.'
        );
    }

    renderCostView(period) {
        const rows = this.getFilteredPendingBudgetReports(period);

        let totalAmount = 0;
        const levelCounts = {
            supervisor: 0,
            maintenance_manager: 0,
            other: 0,
        };
        const trendMap = new Map();

        rows.forEach((row) => {
            const amount = this.toNumber(row.total_amount);
            totalAmount += amount;

            const level = String(row.approval_level || '').trim().toLowerCase();
            if (level === 'supervisor') {
                levelCounts.supervisor += 1;
            } else if (level === 'maintenance_manager') {
                levelCounts.maintenance_manager += 1;
            } else {
                levelCounts.other += 1;
            }

            const date = this.extractBudgetDate(row);
            if (date) {
                const label = this.toInputDate(date);
                trendMap.set(label, (trendMap.get(label) || 0) + amount);
            }
        });

        const averageAmount = rows.length > 0 ? totalAmount / rows.length : 0;

        this.setText('#maintenanceCostPending', String(rows.length));
        this.setText('#maintenanceCostAmount', this.formatNumber(totalAmount));
        this.setText('#maintenanceCostManagerLevel', String(levelCounts.maintenance_manager));
        this.setText('#maintenanceCostAverage', this.formatNumber(averageAmount));

        const levelRows = [
            ['Supervisor', levelCounts.supervisor],
            ['Maintenance Manager', levelCounts.maintenance_manager],
            ['Other', levelCounts.other],
        ].filter((row) => row[1] > 0);

        this.renderChart(
            'costLevel',
            '#maintenanceCostLevelChart',
            '#maintenanceCostLevelChartEmpty',
            {
                type: 'doughnut',
                data: {
                    labels: levelRows.map((row) => row[0]),
                    datasets: [{
                        data: levelRows.map((row) => row[1]),
                        backgroundColor: ['#22c55e', '#2563eb', '#94a3b8'],
                    }],
                },
                options: this.getSharedChartOptions(),
            },
            levelRows.length > 0,
            'No pending approval levels found for selected period.'
        );

        const trendLabels = Array.from(trendMap.keys()).sort();
        const trendValues = trendLabels.map((label) => Number((trendMap.get(label) || 0).toFixed(2)));

        this.renderChart(
            'costTrend',
            '#maintenanceCostTrendChart',
            '#maintenanceCostTrendChartEmpty',
            {
                type: 'line',
                data: {
                    labels: trendLabels,
                    datasets: [{
                        label: 'Pending Amount',
                        data: trendValues,
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.2)',
                        fill: true,
                        tension: 0.35,
                        pointRadius: 3,
                    }],
                },
                options: this.getSharedChartOptions(),
            },
            trendLabels.length > 0,
            'No pending amount trend points available for selected period.'
        );
    }

    renderServiceView(period) {
        const assetRows = this.getAssetRows();
        const repairRows = this.getFilteredRepairTickets(period);
        const weeklyCheckRows = this.getFilteredWeeklyChecks(period);

        const assetRiskCounts = {
            active: 0,
            expiring: 0,
            expired: 0,
        };

        assetRows.forEach((asset) => {
            const risk = this.getAssetRiskState(asset);
            assetRiskCounts[risk] += 1;
        });

        const repairStatusCounts = {
            pending: 0,
            diagnosed: 0,
            parts_ordered: 0,
            in_repair: 0,
            testing: 0,
            completed: 0,
            cancelled: 0,
            other: 0,
        };

        repairRows.forEach((row) => {
            const status = this.normalizeRepairStatus(row.repair_status);
            if (repairStatusCounts[status] === undefined) {
                repairStatusCounts.other += 1;
            } else {
                repairStatusCounts[status] += 1;
            }
        });

        const serviceActivities = repairRows.length + weeklyCheckRows.length;

        this.setText('#maintenanceServiceAssets', String(assetRows.length));
        this.setText('#maintenanceServiceExpiring', String(assetRiskCounts.expiring));
        this.setText('#maintenanceServiceExpired', String(assetRiskCounts.expired));
        this.setText('#maintenanceServiceActivities', String(serviceActivities));

        const riskRows = [
            ['Active', assetRiskCounts.active],
            ['Expiring Soon', assetRiskCounts.expiring],
            ['Expired/Overdue', assetRiskCounts.expired],
        ].filter((row) => row[1] > 0);

        this.renderChart(
            'serviceAssetRisk',
            '#maintenanceServiceAssetRiskChart',
            '#maintenanceServiceAssetRiskChartEmpty',
            {
                type: 'doughnut',
                data: {
                    labels: riskRows.map((row) => row[0]),
                    datasets: [{
                        data: riskRows.map((row) => row[1]),
                        backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
                    }],
                },
                options: this.getSharedChartOptions(),
            },
            riskRows.length > 0,
            'No asset service-risk data available.'
        );

        const activityRows = [
            ['Repair Tickets', repairRows.length],
            ['Weekly Checks', weeklyCheckRows.length],
            ['Repairs Completed', repairStatusCounts.completed],
            ['Repairs In Progress', repairStatusCounts.in_repair + repairStatusCounts.diagnosed + repairStatusCounts.parts_ordered + repairStatusCounts.testing],
        ].filter((row) => row[1] > 0);

        this.renderChart(
            'serviceActivity',
            '#maintenanceServiceActivityChart',
            '#maintenanceServiceActivityChartEmpty',
            {
                type: 'bar',
                data: {
                    labels: activityRows.map((row) => row[0]),
                    datasets: [{
                        label: 'Activities',
                        data: activityRows.map((row) => row[1]),
                        backgroundColor: ['#2563eb', '#0ea5e9', '#10b981', '#f59e0b'],
                        borderRadius: 8,
                    }],
                },
                options: this.getSharedChartOptions(),
            },
            activityRows.length > 0,
            'No service activities found for selected period.'
        );
    }

    renderNotificationsView(period) {
        const rows = this.getFilteredNotifications(period);

        const typeCounts = {
            info: 0,
            success: 0,
            warning: 0,
            error: 0,
        };

        let unread = 0;
        const timelineMap = new Map();

        rows.forEach((row) => {
            const type = this.normalizeNotificationType(row.type);
            typeCounts[type] += 1;

            if (Number(row.is_read) !== 1) {
                unread += 1;
            }

            const date = this.extractNotificationDate(row);
            if (date) {
                const label = this.toInputDate(date);
                timelineMap.set(label, (timelineMap.get(label) || 0) + 1);
            }
        });

        this.setText('#maintenanceNotificationTotal', String(rows.length));
        this.setText('#maintenanceNotificationUnread', String(unread));
        this.setText('#maintenanceNotificationWarningError', String(typeCounts.warning + typeCounts.error));
        this.setText('#maintenanceNotificationInfoSuccess', String(typeCounts.info + typeCounts.success));

        const typeRows = [
            ['Info', typeCounts.info],
            ['Success', typeCounts.success],
            ['Warning', typeCounts.warning],
            ['Error', typeCounts.error],
        ].filter((row) => row[1] > 0);

        this.renderChart(
            'notificationType',
            '#maintenanceNotificationTypeChart',
            '#maintenanceNotificationTypeChartEmpty',
            {
                type: 'doughnut',
                data: {
                    labels: typeRows.map((row) => row[0]),
                    datasets: [{
                        data: typeRows.map((row) => row[1]),
                        backgroundColor: ['#60a5fa', '#10b981', '#f59e0b', '#ef4444'],
                    }],
                },
                options: this.getSharedChartOptions(),
            },
            typeRows.length > 0,
            'No notifications found for selected period.'
        );

        const timelineLabels = Array.from(timelineMap.keys()).sort();
        const timelineValues = timelineLabels.map((label) => timelineMap.get(label));

        this.renderChart(
            'notificationTimeline',
            '#maintenanceNotificationTimelineChart',
            '#maintenanceNotificationTimelineChartEmpty',
            {
                type: 'line',
                data: {
                    labels: timelineLabels,
                    datasets: [{
                        label: 'Notifications',
                        data: timelineValues,
                        borderColor: '#0ea5e9',
                        backgroundColor: 'rgba(14, 165, 233, 0.2)',
                        fill: true,
                        tension: 0.35,
                        pointRadius: 3,
                    }],
                },
                options: this.getSharedChartOptions(),
            },
            timelineLabels.length > 0,
            'No notification timeline points for selected period.'
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

    async fetchFaultTickets() {
        const response = await API.get('/fault-tickets');
        if (!this.isSuccessResponse(response)) {
            throw new Error(response?.message || 'Failed to load fault tickets.');
        }

        return this.extractList(response, 'tickets');
    }

    async fetchMachineBreakdowns() {
        const response = await API.get('/machine-breakdowns');
        if (!this.isSuccessResponse(response)) {
            throw new Error(response?.message || 'Failed to load machine breakdowns.');
        }

        return this.extractList(response, 'reports');
    }

    async fetchRouteBreakdowns() {
        const response = await API.get('/route-breakdowns');
        if (!this.isSuccessResponse(response)) {
            throw new Error(response?.message || 'Failed to load route breakdowns.');
        }

        return this.extractList(response, 'breakdowns');
    }

    async fetchPendingBudgetReports() {
        const response = await API.get('/budget-reports/pending');
        if (!this.isSuccessResponse(response)) {
            throw new Error(response?.message || 'Failed to load pending budget reports.');
        }

        return this.extractList(response, 'reports');
    }

    async fetchVehicles() {
        const response = await API.get('/vehicles?per_page=200');
        if (!this.isSuccessResponse(response)) {
            throw new Error(response?.message || 'Failed to load vehicles.');
        }

        return this.extractList(response, 'vehicles');
    }

    async fetchMachines() {
        const response = await API.get('/machines?per_page=200');
        if (!this.isSuccessResponse(response)) {
            throw new Error(response?.message || 'Failed to load machines.');
        }

        return this.extractList(response, 'machines');
    }

    async fetchNotifications() {
        const response = await API.get('/notifications?limit=100');
        if (!this.isSuccessResponse(response)) {
            throw new Error(response?.message || 'Failed to load notifications.');
        }

        return this.extractList(response, 'notifications');
    }

    async fetchRepairTickets() {
        const response = await API.get('/tec-repair-tickets');
        if (!this.isSuccessResponse(response)) {
            throw new Error(response?.message || 'Failed to load repair tickets.');
        }

        return this.extractList(response, 'tickets');
    }

    async fetchMachineWeeklyChecks() {
        const response = await API.get('/machine-weekly-checks');
        if (!this.isSuccessResponse(response)) {
            throw new Error(response?.message || 'Failed to load machine weekly checks.');
        }

        return this.extractList(response, 'checks');
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

        if (Array.isArray(response[key])) {
            return response[key];
        }

        return [];
    }

    isSuccessResponse(response) {
        return !!response && (response.success === true || response.status === 'success');
    }

    normalizeTicketStatus(value) {
        const raw = String(value || '').trim().toLowerCase();

        if (!raw || raw === 'open' || raw === 'pending') return 'open';
        if (raw.includes('assigned')) return 'assigned';
        if (raw.includes('budget')) return 'waiting_budget';
        if (raw.includes('spare parts') || raw.includes('waiting for spare parts')) return 'waiting_parts';
        if (raw.includes('parts approved')) return 'parts_approved';
        if (raw.includes('insurance')) return 'insurance_claimed';
        if (raw.includes('progress')) return 'in_progress';
        if (raw.includes('resolved')) return 'resolved';
        if (raw.includes('closed')) return 'closed';

        return 'other';
    }

    normalizePriority(value) {
        const raw = String(value || '').trim().toLowerCase();
        if (raw === 'critical') return 'Critical';
        if (raw === 'high') return 'High';
        if (raw === 'low') return 'Low';
        return 'Medium';
    }

    normalizeSeverity(value) {
        const raw = String(value || '').trim().toLowerCase();
        if (raw === 'critical') return 'Critical';
        if (raw === 'high') return 'High';
        if (raw === 'low') return 'Low';
        return 'Medium';
    }

    normalizeNotificationType(value) {
        const raw = String(value || '').trim().toLowerCase();
        if (raw === 'success') return 'success';
        if (raw === 'warning') return 'warning';
        if (raw === 'error') return 'error';
        return 'info';
    }

    normalizeRepairStatus(value) {
        const raw = String(value || '').trim().toLowerCase();
        if (raw === 'pending') return 'pending';
        if (raw === 'diagnosed') return 'diagnosed';
        if (raw.includes('parts')) return 'parts_ordered';
        if (raw.includes('repair')) return 'in_repair';
        if (raw === 'testing') return 'testing';
        if (raw === 'completed') return 'completed';
        if (raw === 'cancelled' || raw === 'canceled') return 'cancelled';
        return 'other';
    }

    getReportPeriod() {
        const fromRaw = String(this.querySelector('#maintenanceAnalyticsFromDate')?.value || '').trim();
        const toRaw = String(this.querySelector('#maintenanceAnalyticsToDate')?.value || '').trim();

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

    extractTicketDate(row) {
        return this.extractDate(row?.created_at, row?.updated_at);
    }

    extractMachineBreakdownDate(row) {
        return this.extractDate(row?.created_at, row?.breakdown_date, row?.updated_at);
    }

    extractRouteBreakdownDate(row) {
        return this.extractDate(row?.breakdown_datetime, row?.created_at, row?.updated_at);
    }

    extractBudgetDate(row) {
        return this.extractDate(row?.created_at, row?.updated_at);
    }

    extractRepairDate(row) {
        return this.extractDate(row?.received_at, row?.diagnosis_at, row?.repair_started_at, row?.repair_completed_at, row?.created_at);
    }

    extractWeeklyCheckDate(row) {
        return this.extractDate(row?.submitted_date, row?.week_end_date, row?.created_at);
    }

    extractNotificationDate(row) {
        return this.extractDate(row?.created_at);
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

    getFilteredTickets(period) {
        const rows = Array.isArray(this._data.tickets) ? this._data.tickets : [];
        return rows.filter((row) => this.isWithinPeriod(this.extractTicketDate(row), period));
    }

    getFilteredBreakdowns(period) {
        const machineRows = Array.isArray(this._data.machineBreakdowns) ? this._data.machineBreakdowns : [];
        const routeRows = Array.isArray(this._data.routeBreakdowns) ? this._data.routeBreakdowns : [];

        const normalizedMachine = machineRows
            .filter((row) => this.isWithinPeriod(this.extractMachineBreakdownDate(row), period))
            .map((row) => ({ ...row, _source: 'machine' }));

        const normalizedRoute = routeRows
            .filter((row) => this.isWithinPeriod(this.extractRouteBreakdownDate(row), period))
            .map((row) => ({ ...row, _source: 'route' }));

        return [...normalizedMachine, ...normalizedRoute];
    }

    getFilteredPendingBudgetReports(period) {
        const rows = Array.isArray(this._data.pendingBudgetReports) ? this._data.pendingBudgetReports : [];
        return rows.filter((row) => this.isWithinPeriod(this.extractBudgetDate(row), period));
    }

    getFilteredRepairTickets(period) {
        const rows = Array.isArray(this._data.repairTickets) ? this._data.repairTickets : [];
        return rows.filter((row) => this.isWithinPeriod(this.extractRepairDate(row), period));
    }

    getFilteredWeeklyChecks(period) {
        const rows = Array.isArray(this._data.weeklyChecks) ? this._data.weeklyChecks : [];
        return rows.filter((row) => this.isWithinPeriod(this.extractWeeklyCheckDate(row), period));
    }

    getFilteredNotifications(period) {
        const rows = Array.isArray(this._data.notifications) ? this._data.notifications : [];
        return rows.filter((row) => this.isWithinPeriod(this.extractNotificationDate(row), period));
    }

    getAssetRows() {
        const vehicles = Array.isArray(this._data.vehicles) ? this._data.vehicles : [];
        const machines = Array.isArray(this._data.machines) ? this._data.machines : [];

        const vehicleRows = vehicles.map((vehicle) => ({
            asset_type: 'vehicle',
            identifier: vehicle.vehicle_id || `Vehicle #${vehicle.id || ''}`,
            asset_name: vehicle.vehicle_name || vehicle.number_plate || 'Vehicle',
            next_service_date: vehicle.next_service_date || null,
            warranty_expiry: vehicle.warranty_expiry || null,
            current_threshold: this.toNullableNumber(vehicle.current_mileage),
            next_threshold: this.toNullableNumber(vehicle.next_service_mileage),
            threshold_warning: 500,
        }));

        const machineRows = machines.map((machine) => ({
            asset_type: 'machine',
            identifier: machine.machine_id || `Machine #${machine.id || ''}`,
            asset_name: machine.machine_name || machine.model_number || 'Machine',
            next_service_date: machine.next_service_date || null,
            warranty_expiry: machine.warranty_expiry || null,
            current_threshold: this.toNullableNumber(machine.current_operating_hours),
            next_threshold: this.toNullableNumber(machine.next_service_hours),
            threshold_warning: 10,
        }));

        return [...vehicleRows, ...machineRows];
    }

    getAssetRiskState(asset) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const nextServiceDate = this.toDateOrNull(asset.next_service_date);
        const warrantyExpiry = this.toDateOrNull(asset.warranty_expiry);

        let risk = 'active';

        if (nextServiceDate) {
            const diffDays = Math.ceil((nextServiceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays < 0) {
                risk = 'expired';
            } else if (diffDays <= 7 && risk !== 'expired') {
                risk = 'expiring';
            }
        }

        if (warrantyExpiry) {
            const diffDays = Math.ceil((warrantyExpiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays < 0) {
                risk = 'expired';
            } else if (diffDays <= 30 && risk !== 'expired') {
                risk = 'expiring';
            }
        }

        const nextThreshold = this.toNullableNumber(asset.next_threshold);
        const currentThreshold = this.toNullableNumber(asset.current_threshold);
        if (nextThreshold !== null && currentThreshold !== null) {
            const remaining = nextThreshold - currentThreshold;
            if (remaining < 0) {
                risk = 'expired';
            } else if (remaining <= Number(asset.threshold_warning || 0) && risk !== 'expired') {
                risk = 'expiring';
            }
        }

        return risk;
    }

    toDateOrNull(value) {
        if (!value) {
            return null;
        }

        const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
        if (Number.isNaN(date.getTime())) {
            return null;
        }

        return date;
    }

    setText(selector, value) {
        const element = this.querySelector(selector);
        if (element) {
            element.textContent = value;
        }
    }

    setAnalyticsStatus(message, type = 'info') {
        const statusEl = this.querySelector('#maintenanceAnalyticsStatus');
        if (!statusEl) {
            return;
        }

        statusEl.className = `maintenance-analytics-status ${type}`;
        statusEl.textContent = message;
    }

    setReportStatus(message, type = 'info') {
        const statusEl = this.querySelector('#maintenanceReportStatus');
        if (!statusEl) {
            return;
        }

        statusEl.className = `maintenance-report-status ${type}`;
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
        const button = this.querySelector('#maintenanceReportDownloadBtn');
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
            const selectedScope = String(this.querySelector('#maintenanceReportScope')?.value || 'active').trim();
            const scope = selectedScope === 'active' ? this._activeView : selectedScope;

            const report = await this.buildReportForScope(scope, period, selectedScope);
            this._generatedReport = report;

            this.renderReportPreview(report);
            this.updateDownloadButtonState(true);

            const rowCount = Array.isArray(report.rows) ? report.rows.length : 0;
            this.setReportStatus(`Report generated successfully (${rowCount} rows).`, 'success');
        } catch (error) {
            console.error('Maintenance analytics report generation failed:', error);
            this.setReportStatus(error?.message || 'Failed to generate report.', 'error');
            this.updateDownloadButtonState(false);
        } finally {
            this.setGeneratingState(false);
        }
    }

    async buildReportForScope(scope, period, selectedScope) {
        if (scope === 'tickets') {
            return this.buildTicketsReport(period, selectedScope);
        }

        if (scope === 'breakdowns') {
            return this.buildBreakdownsReport(period, selectedScope);
        }

        if (scope === 'cost') {
            return this.buildCostReport(period, selectedScope);
        }

        if (scope === 'service') {
            return this.buildServiceReport(period, selectedScope);
        }

        if (scope === 'notifications') {
            return this.buildNotificationsReport(period, selectedScope);
        }

        if (scope === 'all') {
            return this.buildAllAnalyticsReport(period, selectedScope);
        }

        throw new Error('Unsupported report type selected.');
    }

    async buildTicketsReport(period, selectedScope) {
        const rows = this.getFilteredTickets(period);

        const reportRows = rows.map((row) => ({
            ticket_id: row.ticket_id || row.id || '',
            priority: this.normalizePriority(row.priority),
            status: this.toLabel(this.normalizeTicketStatus(row.status)),
            location: row.location || '',
            created_at: row.created_at || '',
            description: row.description || '',
        }));

        const summary = {
            total_tickets: reportRows.length,
            critical_high: reportRows.filter((row) => row.priority === 'Critical' || row.priority === 'High').length,
            in_progress_pipeline: reportRows.filter((row) => {
                const status = row.status.toLowerCase();
                return status.includes('assigned') || status.includes('waiting') || status.includes('progress');
            }).length,
            resolved_closed: reportRows.filter((row) => row.status === 'Resolved' || row.status === 'Closed').length,
        };

        return {
            scope: selectedScope,
            reportType: 'Fault Ticket Analytics',
            generatedAt: new Date().toISOString(),
            period,
            summary,
            columns: [
                { key: 'ticket_id', label: 'Ticket ID' },
                { key: 'priority', label: 'Priority' },
                { key: 'status', label: 'Status' },
                { key: 'location', label: 'Location' },
                { key: 'created_at', label: 'Created At' },
                { key: 'description', label: 'Description' },
            ],
            rows: reportRows,
        };
    }

    async buildBreakdownsReport(period, selectedScope) {
        const rows = this.getFilteredBreakdowns(period);

        const reportRows = rows.map((row) => ({
            source: row._source === 'route' ? 'Route Breakdown' : 'Machine Breakdown',
            breakdown_id: row.breakdown_id || row.route_breakdown_id || row.id || '',
            asset: row.machine_name || row.machine_model || row.number_plate || `Asset #${row.machine_id || row.vehicle_id || ''}`,
            type: row.breakdown_type || '',
            severity: this.normalizeSeverity(row.severity),
            status: row.ticket_status || row.status || '',
            reported_at: row.created_at || row.breakdown_datetime || '',
        }));

        const summary = {
            total_breakdowns: reportRows.length,
            machine_reports: reportRows.filter((row) => row.source === 'Machine Breakdown').length,
            route_reports: reportRows.filter((row) => row.source === 'Route Breakdown').length,
            critical_high: reportRows.filter((row) => row.severity === 'Critical' || row.severity === 'High').length,
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
                { key: 'asset', label: 'Asset' },
                { key: 'type', label: 'Type' },
                { key: 'severity', label: 'Severity' },
                { key: 'status', label: 'Status' },
                { key: 'reported_at', label: 'Reported At' },
            ],
            rows: reportRows,
        };
    }

    async buildCostReport(period, selectedScope) {
        const rows = this.getFilteredPendingBudgetReports(period);

        const reportRows = rows.map((row) => ({
            budget_report_id: row.id || '',
            ticket_id: row.ticket_display_id || row.fault_ticket_id || '',
            approval_level: this.toLabel(row.approval_level || 'unknown'),
            total_amount: this.toNumber(row.total_amount),
            status: row.status || 'pending',
            submitted_by: row.submitted_by_name || '',
            created_at: row.created_at || '',
        }));

        const totalAmount = reportRows.reduce((sum, row) => sum + this.toNumber(row.total_amount), 0);
        const managerLevel = reportRows.filter((row) => String(row.approval_level).toLowerCase().includes('maintenance')).length;

        const summary = {
            pending_requests: reportRows.length,
            total_pending_amount: Number(totalAmount.toFixed(2)),
            manager_level_requests: managerLevel,
            average_request_amount: reportRows.length > 0
                ? Number((totalAmount / reportRows.length).toFixed(2))
                : 0,
        };

        return {
            scope: selectedScope,
            reportType: 'Cost Approval Analytics',
            generatedAt: new Date().toISOString(),
            period,
            summary,
            columns: [
                { key: 'budget_report_id', label: 'Budget Report ID' },
                { key: 'ticket_id', label: 'Ticket ID' },
                { key: 'approval_level', label: 'Approval Level' },
                { key: 'total_amount', label: 'Total Amount' },
                { key: 'status', label: 'Status' },
                { key: 'submitted_by', label: 'Submitted By' },
                { key: 'created_at', label: 'Created At' },
            ],
            rows: reportRows,
        };
    }

    async buildServiceReport(period, selectedScope) {
        const assets = this.getAssetRows();
        const repairRows = this.getFilteredRepairTickets(period);
        const weeklyRows = this.getFilteredWeeklyChecks(period);

        const assetRisk = {
            active: 0,
            expiring: 0,
            expired: 0,
        };

        assets.forEach((asset) => {
            assetRisk[this.getAssetRiskState(asset)] += 1;
        });

        const activityRows = [
            ...repairRows.map((row) => ({
                source: 'Repair Ticket',
                activity_id: row.repair_ticket_id || row.id || '',
                status: this.toLabel(this.normalizeRepairStatus(row.repair_status)),
                asset: row.machine_name || row.machine_serial || row.fault_ticket_id || '',
                recorded_at: row.received_at || row.repair_started_at || row.created_at || '',
                amount: this.toNumber(row.actual_cost),
            })),
            ...weeklyRows.map((row) => ({
                source: 'Weekly Check',
                activity_id: row.check_id || row.id || '',
                status: this.toLabel(String(row.status || 'pending').toLowerCase()),
                asset: row.machine_name || row.machine_id || '',
                recorded_at: row.submitted_date || row.week_end_date || row.created_at || '',
                amount: '',
            })),
        ];

        const summary = {
            tracked_assets: assets.length,
            active_assets: assetRisk.active,
            expiring_assets: assetRisk.expiring,
            expired_overdue_assets: assetRisk.expired,
            service_activities: activityRows.length,
            open_repairs: repairRows.filter((row) => {
                const status = this.normalizeRepairStatus(row.repair_status);
                return status !== 'completed' && status !== 'cancelled';
            }).length,
            completed_repairs: repairRows.filter((row) => this.normalizeRepairStatus(row.repair_status) === 'completed').length,
        };

        return {
            scope: selectedScope,
            reportType: 'Service & Warranty Analytics',
            generatedAt: new Date().toISOString(),
            period,
            summary,
            columns: [
                { key: 'source', label: 'Activity Source' },
                { key: 'activity_id', label: 'Activity ID' },
                { key: 'status', label: 'Status' },
                { key: 'asset', label: 'Asset' },
                { key: 'recorded_at', label: 'Recorded At' },
                { key: 'amount', label: 'Cost' },
            ],
            rows: activityRows,
        };
    }

    async buildNotificationsReport(period, selectedScope) {
        const rows = this.getFilteredNotifications(period);

        const reportRows = rows.map((row) => ({
            notification_id: row.notification_id || row.id || '',
            title: row.title || '',
            type: this.normalizeNotificationType(row.type),
            is_read: Number(row.is_read) === 1 ? 'Yes' : 'No',
            created_at: row.created_at || '',
            message: row.message || '',
        }));

        const summary = {
            total_notifications: reportRows.length,
            unread: reportRows.filter((row) => row.is_read === 'No').length,
            warning_error: reportRows.filter((row) => row.type === 'warning' || row.type === 'error').length,
            info_success: reportRows.filter((row) => row.type === 'info' || row.type === 'success').length,
        };

        return {
            scope: selectedScope,
            reportType: 'Notification Analytics',
            generatedAt: new Date().toISOString(),
            period,
            summary,
            columns: [
                { key: 'notification_id', label: 'Notification ID' },
                { key: 'title', label: 'Title' },
                { key: 'type', label: 'Type' },
                { key: 'is_read', label: 'Read' },
                { key: 'created_at', label: 'Created At' },
                { key: 'message', label: 'Message' },
            ],
            rows: reportRows,
        };
    }

    async buildAllAnalyticsReport(period, selectedScope) {
        const [ticketsReport, breakdownsReport, costReport, serviceReport, notificationsReport] = await Promise.all([
            this.buildTicketsReport(period, 'tickets'),
            this.buildBreakdownsReport(period, 'breakdowns'),
            this.buildCostReport(period, 'cost'),
            this.buildServiceReport(period, 'service'),
            this.buildNotificationsReport(period, 'notifications'),
        ]);

        const reports = [ticketsReport, breakdownsReport, costReport, serviceReport, notificationsReport];
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
        const previewEl = this.querySelector('#maintenanceReportPreview');
        if (!previewEl) {
            return;
        }

        const summaryHtml = Object.entries(report.summary || {})
            .map(([key, value]) => {
                const label = this.toLabel(key);
                return `
                    <div class="maintenance-report-summary-item">
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
            ? `<div class="maintenance-report-truncated-note">Showing first ${previewRows.length} rows out of ${rows.length}.</div>`
            : '';

        const tableSection = columns.length > 0
            ? `
                <div class="maintenance-report-table-wrap">
                    <table class="maintenance-report-table" id="maintenanceReportTable">
                        <thead><tr>${tableHeader}</tr></thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>
                ${truncatedNote}
            `
            : '<div class="maintenance-report-empty">No tabular rows available for this report.</div>';

        previewEl.innerHTML = `
            <div class="maintenance-report-preview-card">
                <div class="maintenance-report-meta">
                    <h3>${this.escapeHtml(report.reportType)}</h3>
                    <p>Period: ${this.escapeHtml(periodText)} | Generated: ${this.escapeHtml(this.formatDateTime(report.generatedAt))}</p>
                </div>
                <div class="maintenance-report-summary-grid">${summaryHtml || '<div class="maintenance-report-empty">No summary metrics found.</div>'}</div>
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
        anchor.download = `maintenance-${scopeLabel}-report-${fileStamp}.csv`;
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

    toNullableNumber(value) {
        if (value === null || value === undefined || value === '') {
            return null;
        }

        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
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

if (!customElements.get('maintenance-analytics-hub')) {
    customElements.define('maintenance-analytics-hub', MaintenanceAnalyticsHub);
}
