class MOAnalyticsHub extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this._views = ['fault', 'weekly-check', 'machine-health', 'workflow', 'notifications'];
        this._activeView = 'fault';
        this._generatedReport = null;
        this._charts = {
            faultSeverity: null,
            faultTrend: null,
            checkStatus: null,
            checkCondition: null,
            machineFaults: null,
            machineStatus: null,
            workflowStatus: null,
            workflowResolution: null,
            notifType: null,
            notifTimeline: null,
        };
        this._data = {
            breakdowns: [],
            weeklyChecks: [],
            machines: [],
            notifications: [],
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

    loadStyles() {
        const linkId = 'mo-analytics-hub-styles';
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
                <h2 class="page-title"><i class="fas fa-chart-bar"></i> Machinery Operator Analytics</h2>
                <p class="page-subtitle">Track machine faults, weekly checks, workflow progress, and notifications in one place.</p>
            </div>

            <div class="mo-analytics-nav" role="tablist" aria-label="Machinery analytics views">
                <button type="button" class="analytics-option-btn" role="tab" data-view="fault">Fault Analytics</button>
                <button type="button" class="analytics-option-btn" role="tab" data-view="weekly-check">Weekly Check Analytics</button>
                <button type="button" class="analytics-option-btn" role="tab" data-view="machine-health">Machine Health Analytics</button>
                <button type="button" class="analytics-option-btn" role="tab" data-view="workflow">Workflow Analytics</button>
                <button type="button" class="analytics-option-btn" role="tab" data-view="notifications">Notification Analytics</button>
            </div>

            <div class="mo-analytics-toolbar">
                <div class="analytics-toolbar-group">
                    <label class="analytics-toolbar-label" for="moAnalyticsFromDate">From Date</label>
                    <input id="moAnalyticsFromDate" class="analytics-toolbar-field" type="date">
                </div>
                <div class="analytics-toolbar-group">
                    <label class="analytics-toolbar-label" for="moAnalyticsToDate">To Date</label>
                    <input id="moAnalyticsToDate" class="analytics-toolbar-field" type="date">
                </div>
                <div class="analytics-toolbar-group">
                    <label class="analytics-toolbar-label" for="moReportScope">Report Type</label>
                    <select id="moReportScope" class="analytics-toolbar-field">
                        <option value="active">Active Analytics View</option>
                        <option value="fault">Fault Analytics</option>
                        <option value="weekly-check">Weekly Check Analytics</option>
                        <option value="machine-health">Machine Health Analytics</option>
                        <option value="workflow">Workflow Analytics</option>
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
                    <button type="button" class="btn btn-secondary" data-action="download-report" id="moReportDownloadBtn" disabled>
                        <i class="fas fa-download"></i> Download CSV
                    </button>
                </div>
            </div>

            <div id="moAnalyticsStatus" class="mo-analytics-status"></div>
            <div id="moReportStatus" class="mo-report-status"></div>
            <div id="moReportPreview" class="mo-report-preview"></div>

            <div class="mo-analytics-panel" data-view="fault" role="tabpanel">
                <div class="mo-summary-grid">
                    <div class="mo-summary-item"><span class="summary-key">Total Fault Reports</span><span class="summary-value" id="moFaultTotal">0</span></div>
                    <div class="mo-summary-item"><span class="summary-key">Critical + High</span><span class="summary-value" id="moFaultCriticalHigh">0</span></div>
                    <div class="mo-summary-item"><span class="summary-key">Open + In Progress</span><span class="summary-value" id="moFaultOpenInProgress">0</span></div>
                    <div class="mo-summary-item"><span class="summary-key">Resolved + Closed</span><span class="summary-value" id="moFaultResolvedClosed">0</span></div>
                </div>
                <div class="mo-analytics-grid">
                    <div class="chart-card">
                        <div class="chart-header">
                            <span class="chart-title">Fault Severity Distribution</span>
                            <span class="chart-subtitle">How faults are spread across severity levels in the selected period.</span>
                        </div>
                        <div class="chart-canvas-wrap">
                            <canvas id="moFaultSeverityChart"></canvas>
                            <div class="chart-empty" id="moFaultSeverityChartEmpty"></div>
                        </div>
                    </div>
                    <div class="chart-card">
                        <div class="chart-header">
                            <span class="chart-title">Fault Reporting Trend</span>
                            <span class="chart-subtitle">Daily fault report volume over the selected period.</span>
                        </div>
                        <div class="chart-canvas-wrap">
                            <canvas id="moFaultTrendChart"></canvas>
                            <div class="chart-empty" id="moFaultTrendChartEmpty"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="mo-analytics-panel" data-view="weekly-check" role="tabpanel">
                <div class="mo-summary-grid">
                    <div class="mo-summary-item"><span class="summary-key">Total Weekly Checks</span><span class="summary-value" id="moCheckTotal">0</span></div>
                    <div class="mo-summary-item"><span class="summary-key">Pending</span><span class="summary-value" id="moCheckPending">0</span></div>
                    <div class="mo-summary-item"><span class="summary-key">Approved</span><span class="summary-value" id="moCheckApproved">0</span></div>
                    <div class="mo-summary-item"><span class="summary-key">Rejected</span><span class="summary-value" id="moCheckRejected">0</span></div>
                </div>
                <div class="mo-analytics-grid">
                    <div class="chart-card">
                        <div class="chart-header">
                            <span class="chart-title">Weekly Check Status Mix</span>
                            <span class="chart-subtitle">Approval pipeline distribution for submitted weekly check reports.</span>
                        </div>
                        <div class="chart-canvas-wrap">
                            <canvas id="moCheckStatusChart"></canvas>
                            <div class="chart-empty" id="moCheckStatusChartEmpty"></div>
                        </div>
                    </div>
                    <div class="chart-card">
                        <div class="chart-header">
                            <span class="chart-title">Condition Distribution</span>
                            <span class="chart-subtitle">Overall machine condition ratings captured in weekly checks.</span>
                        </div>
                        <div class="chart-canvas-wrap">
                            <canvas id="moCheckConditionChart"></canvas>
                            <div class="chart-empty" id="moCheckConditionChartEmpty"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="mo-analytics-panel" data-view="machine-health" role="tabpanel">
                <div class="mo-summary-grid">
                    <div class="mo-summary-item"><span class="summary-key">Tracked Machines</span><span class="summary-value" id="moMachineTotal">0</span></div>
                    <div class="mo-summary-item"><span class="summary-key">Machines With Faults</span><span class="summary-value" id="moMachineWithFaults">0</span></div>
                    <div class="mo-summary-item"><span class="summary-key">Fault Exposure Rate</span><span class="summary-value" id="moMachineFaultRate">0%</span></div>
                    <div class="mo-summary-item"><span class="summary-key">Avg Faults / Affected Machine</span><span class="summary-value" id="moMachineAvgFaults">0.00</span></div>
                </div>
                <div class="mo-analytics-grid">
                    <div class="chart-card">
                        <div class="chart-header">
                            <span class="chart-title">Top Machines by Fault Count</span>
                            <span class="chart-subtitle">Machines requiring the most attention in the selected period.</span>
                        </div>
                        <div class="chart-canvas-wrap">
                            <canvas id="moMachineFaultCountChart"></canvas>
                            <div class="chart-empty" id="moMachineFaultCountChartEmpty"></div>
                        </div>
                    </div>
                    <div class="chart-card">
                        <div class="chart-header">
                            <span class="chart-title">Machine Status Distribution</span>
                            <span class="chart-subtitle">Current status spread from machine inventory.</span>
                        </div>
                        <div class="chart-canvas-wrap">
                            <canvas id="moMachineStatusChart"></canvas>
                            <div class="chart-empty" id="moMachineStatusChartEmpty"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="mo-analytics-panel" data-view="workflow" role="tabpanel">
                <div class="mo-summary-grid">
                    <div class="mo-summary-item"><span class="summary-key">Linked Fault Tickets</span><span class="summary-value" id="moWorkflowLinked">0</span></div>
                    <div class="mo-summary-item"><span class="summary-key">Assigned Stage</span><span class="summary-value" id="moWorkflowAssigned">0</span></div>
                    <div class="mo-summary-item"><span class="summary-key">In Progress Stage</span><span class="summary-value" id="moWorkflowInProgress">0</span></div>
                    <div class="mo-summary-item"><span class="summary-key">Resolved + Closed</span><span class="summary-value" id="moWorkflowResolvedClosed">0</span></div>
                </div>
                <div class="mo-analytics-grid">
                    <div class="chart-card">
                        <div class="chart-header">
                            <span class="chart-title">Ticket Workflow Status</span>
                            <span class="chart-subtitle">Pipeline distribution for linked fault tickets.</span>
                        </div>
                        <div class="chart-canvas-wrap">
                            <canvas id="moWorkflowStatusChart"></canvas>
                            <div class="chart-empty" id="moWorkflowStatusChartEmpty"></div>
                        </div>
                    </div>
                    <div class="chart-card">
                        <div class="chart-header">
                            <span class="chart-title">Average Resolution Time by Severity</span>
                            <span class="chart-subtitle">Average hours from reported breakdown to resolved state.</span>
                        </div>
                        <div class="chart-canvas-wrap">
                            <canvas id="moWorkflowResolutionChart"></canvas>
                            <div class="chart-empty" id="moWorkflowResolutionChartEmpty"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="mo-analytics-panel" data-view="notifications" role="tabpanel">
                <div class="mo-summary-grid">
                    <div class="mo-summary-item"><span class="summary-key">Notifications</span><span class="summary-value" id="moNotifTotal">0</span></div>
                    <div class="mo-summary-item"><span class="summary-key">Unread</span><span class="summary-value" id="moNotifUnread">0</span></div>
                    <div class="mo-summary-item"><span class="summary-key">Warning + Error</span><span class="summary-value" id="moNotifWarningError">0</span></div>
                    <div class="mo-summary-item"><span class="summary-key">Success + Info</span><span class="summary-value" id="moNotifSuccessInfo">0</span></div>
                </div>
                <div class="mo-analytics-grid">
                    <div class="chart-card">
                        <div class="chart-header">
                            <span class="chart-title">Notification Type Mix</span>
                            <span class="chart-subtitle">Distribution of notification severity and categories.</span>
                        </div>
                        <div class="chart-canvas-wrap">
                            <canvas id="moNotifTypeChart"></canvas>
                            <div class="chart-empty" id="moNotifTypeChartEmpty"></div>
                        </div>
                    </div>
                    <div class="chart-card">
                        <div class="chart-header">
                            <span class="chart-title">Notification Timeline</span>
                            <span class="chart-subtitle">Daily notification volume in the selected period.</span>
                        </div>
                        <div class="chart-canvas-wrap">
                            <canvas id="moNotifTimelineChart"></canvas>
                            <div class="chart-empty" id="moNotifTimelineChartEmpty"></div>
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
        const fromInput = this.querySelector('#moAnalyticsFromDate');
        const toInput = this.querySelector('#moAnalyticsToDate');
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

        return 'fault';
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

        this.querySelectorAll('.mo-analytics-panel').forEach((panel) => {
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
            console.error('MO analytics refresh failed:', error);
            this.setAnalyticsStatus(error?.message || 'Failed to refresh analytics.', 'error');
        }
    }

    async refreshData() {
        if (typeof API === 'undefined') {
            throw new Error('API client is unavailable.');
        }

        const [breakdownsResult, checksResult, machinesResult, notificationsResult] = await Promise.allSettled([
            this.fetchBreakdowns(),
            this.fetchWeeklyChecks(),
            this.fetchMachines(),
            this.fetchNotifications(),
        ]);

        const errors = [];

        if (breakdownsResult.status === 'fulfilled') {
            this._data.breakdowns = breakdownsResult.value;
        } else {
            this._data.breakdowns = [];
            errors.push('fault reports');
        }

        if (checksResult.status === 'fulfilled') {
            this._data.weeklyChecks = checksResult.value;
        } else {
            this._data.weeklyChecks = [];
            errors.push('weekly checks');
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

        if (errors.length === 4) {
            throw new Error('Failed to load analytics data from all sources.');
        }

        if (errors.length > 0) {
            this.setAnalyticsStatus(`Partial data loaded. Missing: ${errors.join(', ')}.`, 'warning');
        }
    }

    renderActiveView() {
        const period = this.getReportPeriod();

        if (this._activeView === 'fault') {
            this.renderFaultView(period);
            return;
        }

        if (this._activeView === 'weekly-check') {
            this.renderWeeklyCheckView(period);
            return;
        }

        if (this._activeView === 'machine-health') {
            this.renderMachineHealthView(period);
            return;
        }

        if (this._activeView === 'workflow') {
            this.renderWorkflowView(period);
            return;
        }

        if (this._activeView === 'notifications') {
            this.renderNotificationsView(period);
        }
    }

    renderFaultView(period) {
        const rows = this.getFilteredBreakdowns(period);

        const severityMap = {
            Low: 0,
            Medium: 0,
            High: 0,
            Critical: 0,
        };

        let openInProgress = 0;
        let resolvedClosed = 0;

        const trendMap = new Map();

        rows.forEach((row) => {
            const severity = this.normalizeSeverity(row.severity);
            severityMap[severity] += 1;

            const stage = this.normalizeWorkflowStatus(row);
            if (stage === 'open' || stage === 'assigned' || stage === 'in_progress') {
                openInProgress += 1;
            }

            if (stage === 'resolved' || stage === 'closed') {
                resolvedClosed += 1;
            }

            const date = this.extractBreakdownDate(row);
            if (date) {
                const label = this.toInputDate(date);
                trendMap.set(label, (trendMap.get(label) || 0) + 1);
            }
        });

        this.setText('#moFaultTotal', String(rows.length));
        this.setText('#moFaultCriticalHigh', String(severityMap.Critical + severityMap.High));
        this.setText('#moFaultOpenInProgress', String(openInProgress));
        this.setText('#moFaultResolvedClosed', String(resolvedClosed));

        this.renderChart(
            'faultSeverity',
            '#moFaultSeverityChart',
            '#moFaultSeverityChartEmpty',
            {
                type: 'bar',
                data: {
                    labels: ['Low', 'Medium', 'High', 'Critical'],
                    datasets: [{
                        label: 'Fault Count',
                        data: [severityMap.Low, severityMap.Medium, severityMap.High, severityMap.Critical],
                        backgroundColor: ['#60a5fa', '#fbbf24', '#f97316', '#ef4444'],
                        borderRadius: 8,
                    }],
                },
                options: this.getSharedChartOptions(),
            },
            rows.length > 0,
            'No fault severity data found for selected period.'
        );

        const trendLabels = Array.from(trendMap.keys()).sort();
        const trendValues = trendLabels.map((label) => trendMap.get(label));

        this.renderChart(
            'faultTrend',
            '#moFaultTrendChart',
            '#moFaultTrendChartEmpty',
            {
                type: 'line',
                data: {
                    labels: trendLabels,
                    datasets: [{
                        label: 'Fault Reports',
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
            'No trend points available for selected period.'
        );
    }

    renderWeeklyCheckView(period) {
        const rows = this.getFilteredWeeklyChecks(period);

        const statusCounts = {
            pending: 0,
            approved: 0,
            rejected: 0,
        };

        const conditionCounts = {
            Excellent: 0,
            Good: 0,
            Fair: 0,
            Poor: 0,
        };

        rows.forEach((row) => {
            const status = this.normalizeCheckStatus(row.status);
            statusCounts[status] += 1;

            const condition = this.normalizeCondition(row.overall_condition);
            conditionCounts[condition] += 1;
        });

        this.setText('#moCheckTotal', String(rows.length));
        this.setText('#moCheckPending', String(statusCounts.pending));
        this.setText('#moCheckApproved', String(statusCounts.approved));
        this.setText('#moCheckRejected', String(statusCounts.rejected));

        this.renderChart(
            'checkStatus',
            '#moCheckStatusChart',
            '#moCheckStatusChartEmpty',
            {
                type: 'doughnut',
                data: {
                    labels: ['Pending', 'Approved', 'Rejected'],
                    datasets: [{
                        data: [statusCounts.pending, statusCounts.approved, statusCounts.rejected],
                        backgroundColor: ['#fbbf24', '#10b981', '#ef4444'],
                        borderWidth: 1,
                    }],
                },
                options: this.getSharedChartOptions(),
            },
            rows.length > 0,
            'No weekly checks found for selected period.'
        );

        this.renderChart(
            'checkCondition',
            '#moCheckConditionChart',
            '#moCheckConditionChartEmpty',
            {
                type: 'bar',
                data: {
                    labels: ['Excellent', 'Good', 'Fair', 'Poor'],
                    datasets: [{
                        label: 'Weekly Checks',
                        data: [conditionCounts.Excellent, conditionCounts.Good, conditionCounts.Fair, conditionCounts.Poor],
                        backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'],
                        borderRadius: 8,
                    }],
                },
                options: this.getSharedChartOptions(),
            },
            rows.length > 0,
            'No condition analytics available for selected period.'
        );
    }

    renderMachineHealthView(period) {
        const machines = Array.isArray(this._data.machines) ? this._data.machines : [];
        const rows = this.getFilteredBreakdowns(period);

        const faultsByMachine = new Map();
        rows.forEach((row) => {
            const key = String(row.machine_name || row.machine_model || row.machine_id || 'Unknown Machine').trim();
            faultsByMachine.set(key, (faultsByMachine.get(key) || 0) + 1);
        });

        const machineStatusMap = new Map();
        machines.forEach((machine) => {
            const status = String(machine.status || 'Unknown').trim() || 'Unknown';
            machineStatusMap.set(status, (machineStatusMap.get(status) || 0) + 1);
        });

        const totalMachines = machines.length;
        const machinesWithFaults = faultsByMachine.size;
        const faultRate = totalMachines > 0 ? ((machinesWithFaults / totalMachines) * 100) : 0;
        const avgFaultsPerAffected = machinesWithFaults > 0 ? (rows.length / machinesWithFaults) : 0;

        this.setText('#moMachineTotal', String(totalMachines));
        this.setText('#moMachineWithFaults', String(machinesWithFaults));
        this.setText('#moMachineFaultRate', `${faultRate.toFixed(1)}%`);
        this.setText('#moMachineAvgFaults', avgFaultsPerAffected.toFixed(2));

        const rankedMachines = Array.from(faultsByMachine.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);

        this.renderChart(
            'machineFaults',
            '#moMachineFaultCountChart',
            '#moMachineFaultCountChartEmpty',
            {
                type: 'bar',
                data: {
                    labels: rankedMachines.map((item) => item[0]),
                    datasets: [{
                        label: 'Fault Count',
                        data: rankedMachines.map((item) => item[1]),
                        backgroundColor: '#2563eb',
                        borderRadius: 8,
                    }],
                },
                options: this.getSharedChartOptions(),
            },
            rankedMachines.length > 0,
            'No machine fault data found for selected period.'
        );

        const machineStatusRows = Array.from(machineStatusMap.entries()).sort((a, b) => b[1] - a[1]);

        this.renderChart(
            'machineStatus',
            '#moMachineStatusChart',
            '#moMachineStatusChartEmpty',
            {
                type: 'doughnut',
                data: {
                    labels: machineStatusRows.map((item) => item[0]),
                    datasets: [{
                        data: machineStatusRows.map((item) => item[1]),
                        backgroundColor: ['#22c55e', '#f59e0b', '#64748b', '#ef4444', '#3b82f6'],
                    }],
                },
                options: this.getSharedChartOptions(),
            },
            machineStatusRows.length > 0,
            'No machine inventory status data available.'
        );
    }

    renderWorkflowView(period) {
        const rows = this.getFilteredBreakdowns(period);

        const statusCounts = {
            open: 0,
            assigned: 0,
            in_progress: 0,
            resolved: 0,
            closed: 0,
            other: 0,
        };

        const resolutionBySeverity = new Map();

        let linkedTickets = 0;
        let assignedStage = 0;
        let inProgressStage = 0;
        let resolvedClosed = 0;

        rows.forEach((row) => {
            if (Number.parseInt(row.fault_ticket_id, 10) > 0) {
                linkedTickets += 1;
            }

            const status = this.normalizeWorkflowStatus(row);
            if (statusCounts[status] === undefined) {
                statusCounts.other += 1;
            } else {
                statusCounts[status] += 1;
            }

            if (status === 'assigned') {
                assignedStage += 1;
            }

            if (status === 'in_progress') {
                inProgressStage += 1;
            }

            if (status === 'resolved' || status === 'closed') {
                resolvedClosed += 1;
            }

            const severity = this.normalizeSeverity(row.severity);
            const resolutionHours = this.getResolutionHours(row.breakdown_date || row.created_at, row.resolved_at || row.updated_at, status);
            if (Number.isFinite(resolutionHours) && resolutionHours >= 0) {
                if (!resolutionBySeverity.has(severity)) {
                    resolutionBySeverity.set(severity, []);
                }
                resolutionBySeverity.get(severity).push(resolutionHours);
            }
        });

        this.setText('#moWorkflowLinked', String(linkedTickets));
        this.setText('#moWorkflowAssigned', String(assignedStage));
        this.setText('#moWorkflowInProgress', String(inProgressStage));
        this.setText('#moWorkflowResolvedClosed', String(resolvedClosed));

        const statusRows = [
            ['Open', statusCounts.open],
            ['Assigned', statusCounts.assigned],
            ['In Progress', statusCounts.in_progress],
            ['Resolved', statusCounts.resolved],
            ['Closed', statusCounts.closed],
            ['Other', statusCounts.other],
        ].filter((row) => row[1] > 0);

        this.renderChart(
            'workflowStatus',
            '#moWorkflowStatusChart',
            '#moWorkflowStatusChartEmpty',
            {
                type: 'doughnut',
                data: {
                    labels: statusRows.map((row) => row[0]),
                    datasets: [{
                        data: statusRows.map((row) => row[1]),
                        backgroundColor: ['#60a5fa', '#fbbf24', '#2563eb', '#10b981', '#64748b', '#ef4444'],
                    }],
                },
                options: this.getSharedChartOptions(),
            },
            statusRows.length > 0,
            'No workflow status data found for selected period.'
        );

        const resolutionLabels = [];
        const resolutionValues = [];
        ['Low', 'Medium', 'High', 'Critical'].forEach((severity) => {
            const values = resolutionBySeverity.get(severity) || [];
            if (!values.length) {
                return;
            }

            const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
            resolutionLabels.push(severity);
            resolutionValues.push(Number(avg.toFixed(2)));
        });

        this.renderChart(
            'workflowResolution',
            '#moWorkflowResolutionChart',
            '#moWorkflowResolutionChartEmpty',
            {
                type: 'bar',
                data: {
                    labels: resolutionLabels,
                    datasets: [{
                        label: 'Avg Resolution (hours)',
                        data: resolutionValues,
                        backgroundColor: ['#60a5fa', '#fbbf24', '#f97316', '#ef4444'],
                        borderRadius: 8,
                    }],
                },
                options: this.getSharedChartOptions(),
            },
            resolutionLabels.length > 0,
            'No resolved faults available for resolution-time analytics.'
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

        const timelineMap = new Map();
        let unread = 0;

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

        this.setText('#moNotifTotal', String(rows.length));
        this.setText('#moNotifUnread', String(unread));
        this.setText('#moNotifWarningError', String(typeCounts.warning + typeCounts.error));
        this.setText('#moNotifSuccessInfo', String(typeCounts.success + typeCounts.info));

        const typeRows = [
            ['Info', typeCounts.info],
            ['Success', typeCounts.success],
            ['Warning', typeCounts.warning],
            ['Error', typeCounts.error],
        ].filter((row) => row[1] > 0);

        this.renderChart(
            'notifType',
            '#moNotifTypeChart',
            '#moNotifTypeChartEmpty',
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
            'notifTimeline',
            '#moNotifTimelineChart',
            '#moNotifTimelineChartEmpty',
            {
                type: 'line',
                data: {
                    labels: timelineLabels,
                    datasets: [{
                        label: 'Notifications',
                        data: timelineValues,
                        borderColor: '#0ea5e9',
                        backgroundColor: 'rgba(14, 165, 233, 0.18)',
                        fill: true,
                        tension: 0.35,
                        pointRadius: 3,
                    }],
                },
                options: this.getSharedChartOptions(),
            },
            timelineLabels.length > 0,
            'No timeline points available for notifications in selected period.'
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

    async fetchBreakdowns() {
        const response = await API.get('/machine-breakdowns');
        if (!this.isSuccessResponse(response)) {
            throw new Error(response?.message || 'Failed to load machine breakdowns.');
        }

        const rows = response?.data?.reports;
        return Array.isArray(rows) ? rows : [];
    }

    async fetchWeeklyChecks() {
        const response = await API.get('/machine-weekly-checks');
        if (!this.isSuccessResponse(response)) {
            throw new Error(response?.message || 'Failed to load weekly checks.');
        }

        const rows = response?.data?.checks;
        return Array.isArray(rows) ? rows : [];
    }

    async fetchMachines() {
        const response = await API.get('/machines?page=1&per_page=200&order_by=machine_name ASC');
        if (!this.isSuccessResponse(response)) {
            throw new Error(response?.message || 'Failed to load machines.');
        }

        const rows = response?.data?.machines;
        return Array.isArray(rows) ? rows : [];
    }

    async fetchNotifications() {
        const response = await API.get('/notifications?limit=100');
        if (!this.isSuccessResponse(response)) {
            throw new Error(response?.message || 'Failed to load notifications.');
        }

        const rows = response?.data?.notifications;
        return Array.isArray(rows) ? rows : [];
    }

    isSuccessResponse(response) {
        return !!response && (response.success === true || response.status === 'success');
    }

    normalizeSeverity(value) {
        const raw = String(value || '').trim().toLowerCase();
        if (raw === 'critical') return 'Critical';
        if (raw === 'high') return 'High';
        if (raw === 'low') return 'Low';
        return 'Medium';
    }

    normalizeCheckStatus(value) {
        const raw = String(value || '').trim().toLowerCase();
        if (raw === 'approved') return 'approved';
        if (raw === 'rejected') return 'rejected';
        return 'pending';
    }

    normalizeCondition(value) {
        const raw = String(value || '').trim().toLowerCase();
        if (raw === 'excellent') return 'Excellent';
        if (raw === 'fair') return 'Fair';
        if (raw === 'poor') return 'Poor';
        return 'Good';
    }

    normalizeNotificationType(value) {
        const raw = String(value || '').trim().toLowerCase();
        if (raw === 'success') return 'success';
        if (raw === 'warning') return 'warning';
        if (raw === 'error') return 'error';
        return 'info';
    }

    normalizeWorkflowStatus(row) {
        const value = String(row?.ticket_status || row?.status || '').trim().toLowerCase();

        if (!value) {
            return 'open';
        }

        if (value === 'closed') {
            return 'closed';
        }

        if (value.includes('resolved') || value.includes('complete')) {
            return 'resolved';
        }

        if (
            value.includes('in progress')
            || value.includes('progress')
            || value.includes('waiting for')
            || value.includes('parts approved')
        ) {
            return 'in_progress';
        }

        if (value.includes('assigned')) {
            return 'assigned';
        }

        if (value.includes('open') || value.includes('pending')) {
            return 'open';
        }

        return 'other';
    }

    getResolutionHours(startRaw, endRaw, status) {
        if (status !== 'resolved' && status !== 'closed') {
            return NaN;
        }

        const start = startRaw ? new Date(startRaw) : null;
        const end = endRaw ? new Date(endRaw) : null;

        if (!(start instanceof Date) || Number.isNaN(start?.getTime())) {
            return NaN;
        }

        if (!(end instanceof Date) || Number.isNaN(end?.getTime())) {
            return NaN;
        }

        const diffMs = end.getTime() - start.getTime();
        if (!Number.isFinite(diffMs) || diffMs < 0) {
            return NaN;
        }

        return diffMs / (1000 * 60 * 60);
    }

    getReportPeriod() {
        const fromRaw = String(this.querySelector('#moAnalyticsFromDate')?.value || '').trim();
        const toRaw = String(this.querySelector('#moAnalyticsToDate')?.value || '').trim();

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

    extractBreakdownDate(row) {
        const candidates = [row?.breakdown_date, row?.created_at, row?.updated_at];
        for (const value of candidates) {
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

    extractWeeklyCheckDate(row) {
        const candidates = [row?.submitted_date, row?.week_end_date, row?.created_at];
        for (const value of candidates) {
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

    extractNotificationDate(row) {
        const value = row?.created_at;
        if (!value) {
            return null;
        }

        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    getFilteredBreakdowns(period) {
        const rows = Array.isArray(this._data.breakdowns) ? this._data.breakdowns : [];
        return rows.filter((row) => this.isWithinPeriod(this.extractBreakdownDate(row), period));
    }

    getFilteredWeeklyChecks(period) {
        const rows = Array.isArray(this._data.weeklyChecks) ? this._data.weeklyChecks : [];
        return rows.filter((row) => this.isWithinPeriod(this.extractWeeklyCheckDate(row), period));
    }

    getFilteredNotifications(period) {
        const rows = Array.isArray(this._data.notifications) ? this._data.notifications : [];
        return rows.filter((row) => this.isWithinPeriod(this.extractNotificationDate(row), period));
    }

    setText(selector, value) {
        const element = this.querySelector(selector);
        if (element) {
            element.textContent = value;
        }
    }

    setAnalyticsStatus(message, type = 'info') {
        const statusEl = this.querySelector('#moAnalyticsStatus');
        if (!statusEl) {
            return;
        }

        statusEl.className = `mo-analytics-status ${type}`;
        statusEl.textContent = message;
    }

    setReportStatus(message, type = 'info') {
        const statusEl = this.querySelector('#moReportStatus');
        if (!statusEl) {
            return;
        }

        statusEl.className = `mo-report-status ${type}`;
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
        const button = this.querySelector('#moReportDownloadBtn');
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
            const selectedScope = String(this.querySelector('#moReportScope')?.value || 'active').trim();
            const scope = selectedScope === 'active' ? this._activeView : selectedScope;

            const report = await this.buildReportForScope(scope, period, selectedScope);
            this._generatedReport = report;

            this.renderReportPreview(report);
            this.updateDownloadButtonState(true);

            const rowCount = Array.isArray(report.rows) ? report.rows.length : 0;
            this.setReportStatus(`Report generated successfully (${rowCount} rows).`, 'success');
        } catch (error) {
            console.error('MO analytics report generation failed:', error);
            this.setReportStatus(error?.message || 'Failed to generate report.', 'error');
            this.updateDownloadButtonState(false);
        } finally {
            this.setGeneratingState(false);
        }
    }

    async buildReportForScope(scope, period, selectedScope) {
        if (scope === 'fault') {
            return this.buildFaultReport(period, selectedScope);
        }

        if (scope === 'weekly-check') {
            return this.buildWeeklyCheckReport(period, selectedScope);
        }

        if (scope === 'machine-health') {
            return this.buildMachineHealthReport(period, selectedScope);
        }

        if (scope === 'workflow') {
            return this.buildWorkflowReport(period, selectedScope);
        }

        if (scope === 'notifications') {
            return this.buildNotificationsReport(period, selectedScope);
        }

        if (scope === 'all') {
            return this.buildAllAnalyticsReport(period, selectedScope);
        }

        throw new Error('Unsupported report type selected.');
    }

    async buildFaultReport(period, selectedScope) {
        const rows = this.getFilteredBreakdowns(period);

        const reportRows = rows.map((row) => {
            const workflowStatus = this.normalizeWorkflowStatus(row);
            const resolutionHours = this.getResolutionHours(row.breakdown_date || row.created_at, row.resolved_at || row.updated_at, workflowStatus);

            return {
                breakdown_id: row.breakdown_id || '',
                machine: row.machine_name || row.machine_model || (row.machine_id ? `Machine #${row.machine_id}` : ''),
                breakdown_type: row.breakdown_type || '',
                severity: this.normalizeSeverity(row.severity),
                breakdown_status: row.status || '',
                ticket_status: row.ticket_status || '',
                reported_at: row.breakdown_date || row.created_at || '',
                resolved_at: row.resolved_at || '',
                resolution_hours: Number.isFinite(resolutionHours) ? Number(resolutionHours.toFixed(2)) : '',
            };
        });

        const summary = {
            total_fault_reports: reportRows.length,
            critical_high_faults: reportRows.filter((row) => row.severity === 'Critical' || row.severity === 'High').length,
            open_in_progress_faults: reportRows.filter((row) => {
                const status = String(row.ticket_status || row.breakdown_status || '').toLowerCase();
                return status.includes('open') || status.includes('assigned') || status.includes('progress') || status.includes('waiting');
            }).length,
            resolved_closed_faults: reportRows.filter((row) => {
                const status = String(row.ticket_status || row.breakdown_status || '').toLowerCase();
                return status.includes('resolved') || status.includes('closed');
            }).length,
        };

        return {
            scope: selectedScope,
            reportType: 'Fault Analytics',
            generatedAt: new Date().toISOString(),
            period,
            summary,
            columns: [
                { key: 'breakdown_id', label: 'Breakdown ID' },
                { key: 'machine', label: 'Machine' },
                { key: 'breakdown_type', label: 'Breakdown Type' },
                { key: 'severity', label: 'Severity' },
                { key: 'breakdown_status', label: 'Breakdown Status' },
                { key: 'ticket_status', label: 'Ticket Status' },
                { key: 'reported_at', label: 'Reported At' },
                { key: 'resolved_at', label: 'Resolved At' },
                { key: 'resolution_hours', label: 'Resolution Hours' },
            ],
            rows: reportRows,
        };
    }

    async buildWeeklyCheckReport(period, selectedScope) {
        const rows = this.getFilteredWeeklyChecks(period);

        const reportRows = rows.map((row) => ({
            check_id: row.check_id || '',
            machine: row.machine_name || (row.machine_id ? `Machine #${row.machine_id}` : ''),
            week_start_date: row.week_start_date || '',
            week_end_date: row.week_end_date || '',
            submitted_date: row.submitted_date || '',
            status: this.normalizeCheckStatus(row.status),
            overall_condition: this.normalizeCondition(row.overall_condition),
            issues_found: row.issues_found || '',
        }));

        const summary = {
            total_weekly_checks: reportRows.length,
            pending: reportRows.filter((row) => row.status === 'pending').length,
            approved: reportRows.filter((row) => row.status === 'approved').length,
            rejected: reportRows.filter((row) => row.status === 'rejected').length,
        };

        return {
            scope: selectedScope,
            reportType: 'Weekly Check Analytics',
            generatedAt: new Date().toISOString(),
            period,
            summary,
            columns: [
                { key: 'check_id', label: 'Check ID' },
                { key: 'machine', label: 'Machine' },
                { key: 'week_start_date', label: 'Week Start' },
                { key: 'week_end_date', label: 'Week End' },
                { key: 'submitted_date', label: 'Submitted Date' },
                { key: 'status', label: 'Status' },
                { key: 'overall_condition', label: 'Overall Condition' },
                { key: 'issues_found', label: 'Issues Found' },
            ],
            rows: reportRows,
        };
    }

    async buildMachineHealthReport(period, selectedScope) {
        const machines = Array.isArray(this._data.machines) ? this._data.machines : [];
        const faults = this.getFilteredBreakdowns(period);

        const faultCountByMachineId = new Map();
        const lastFaultDateByMachineId = new Map();

        faults.forEach((fault) => {
            const machineId = Number.parseInt(fault.machine_id, 10);
            if (!Number.isFinite(machineId)) {
                return;
            }

            faultCountByMachineId.set(machineId, (faultCountByMachineId.get(machineId) || 0) + 1);
            const faultDate = this.extractBreakdownDate(fault);
            const existingDate = lastFaultDateByMachineId.get(machineId);
            if (faultDate && (!existingDate || faultDate.getTime() > existingDate.getTime())) {
                lastFaultDateByMachineId.set(machineId, faultDate);
            }
        });

        const reportRows = machines.map((machine) => {
            const machineId = Number.parseInt(machine.id, 10);
            const faultCount = Number.isFinite(machineId) ? (faultCountByMachineId.get(machineId) || 0) : 0;
            const lastFaultDate = Number.isFinite(machineId) ? lastFaultDateByMachineId.get(machineId) : null;

            return {
                machine_id: machine.machine_id || machine.id || '',
                machine_name: machine.machine_name || machine.model_number || 'Unknown Machine',
                status: machine.status || 'Unknown',
                fault_count: faultCount,
                last_fault_date: lastFaultDate ? this.toInputDate(lastFaultDate) : '',
                next_service_date: machine.next_service_date || '',
                current_operating_hours: machine.current_operating_hours ?? '',
            };
        });

        const machinesWithFaults = reportRows.filter((row) => row.fault_count > 0).length;

        const summary = {
            tracked_machines: reportRows.length,
            machines_with_faults: machinesWithFaults,
            total_fault_reports: faults.length,
            fault_exposure_rate_percent: reportRows.length > 0
                ? Number(((machinesWithFaults / reportRows.length) * 100).toFixed(2))
                : 0,
        };

        return {
            scope: selectedScope,
            reportType: 'Machine Health Analytics',
            generatedAt: new Date().toISOString(),
            period,
            summary,
            columns: [
                { key: 'machine_id', label: 'Machine ID' },
                { key: 'machine_name', label: 'Machine Name' },
                { key: 'status', label: 'Status' },
                { key: 'fault_count', label: 'Fault Count' },
                { key: 'last_fault_date', label: 'Last Fault Date' },
                { key: 'next_service_date', label: 'Next Service Date' },
                { key: 'current_operating_hours', label: 'Operating Hours' },
            ],
            rows: reportRows,
        };
    }

    async buildWorkflowReport(period, selectedScope) {
        const rows = this.getFilteredBreakdowns(period);

        const reportRows = rows.map((row) => {
            const workflowStatus = this.normalizeWorkflowStatus(row);
            const assignedCount = Array.isArray(row.assignments) ? row.assignments.length : 0;
            const resolutionHours = this.getResolutionHours(row.breakdown_date || row.created_at, row.resolved_at || row.updated_at, workflowStatus);

            return {
                breakdown_id: row.breakdown_id || '',
                ticket_id: row.fault_ticket_number || (row.fault_ticket_id ? `#${row.fault_ticket_id}` : ''),
                workflow_status: workflowStatus,
                ticket_status: row.ticket_status || '',
                assigned_technicians: assignedCount,
                resolution_hours: Number.isFinite(resolutionHours) ? Number(resolutionHours.toFixed(2)) : '',
                reported_at: row.breakdown_date || row.created_at || '',
                resolved_at: row.resolved_at || '',
            };
        });

        const statusCount = {
            open: 0,
            assigned: 0,
            in_progress: 0,
            resolved: 0,
            closed: 0,
            other: 0,
        };

        reportRows.forEach((row) => {
            const key = row.workflow_status;
            if (statusCount[key] === undefined) {
                statusCount.other += 1;
            } else {
                statusCount[key] += 1;
            }
        });

        const summary = {
            linked_fault_tickets: reportRows.filter((row) => row.ticket_id).length,
            open_stage: statusCount.open,
            assigned_stage: statusCount.assigned,
            in_progress_stage: statusCount.in_progress,
            resolved_closed_stage: statusCount.resolved + statusCount.closed,
        };

        return {
            scope: selectedScope,
            reportType: 'Workflow Analytics',
            generatedAt: new Date().toISOString(),
            period,
            summary,
            columns: [
                { key: 'breakdown_id', label: 'Breakdown ID' },
                { key: 'ticket_id', label: 'Ticket ID' },
                { key: 'workflow_status', label: 'Workflow Status' },
                { key: 'ticket_status', label: 'Ticket Status' },
                { key: 'assigned_technicians', label: 'Assigned Technicians' },
                { key: 'resolution_hours', label: 'Resolution Hours' },
                { key: 'reported_at', label: 'Reported At' },
                { key: 'resolved_at', label: 'Resolved At' },
            ],
            rows: reportRows,
        };
    }

    async buildNotificationsReport(period, selectedScope) {
        const rows = this.getFilteredNotifications(period);

        const reportRows = rows.map((row) => ({
            notification_id: row.notification_id || '',
            title: row.title || '',
            type: this.normalizeNotificationType(row.type),
            is_read: Number(row.is_read) === 1 ? 'Yes' : 'No',
            created_at: row.created_at || '',
            message: row.message || '',
        }));

        const summary = {
            total_notifications: reportRows.length,
            unread_notifications: reportRows.filter((row) => row.is_read === 'No').length,
            warning_error_notifications: reportRows.filter((row) => row.type === 'warning' || row.type === 'error').length,
            success_info_notifications: reportRows.filter((row) => row.type === 'success' || row.type === 'info').length,
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
        const [faultReport, weeklyReport, machineReport, workflowReport, notificationsReport] = await Promise.all([
            this.buildFaultReport(period, 'fault'),
            this.buildWeeklyCheckReport(period, 'weekly-check'),
            this.buildMachineHealthReport(period, 'machine-health'),
            this.buildWorkflowReport(period, 'workflow'),
            this.buildNotificationsReport(period, 'notifications'),
        ]);

        const reports = [faultReport, weeklyReport, machineReport, workflowReport, notificationsReport];
        const rows = [];

        reports.forEach((report) => {
            Object.entries(report.summary || {}).forEach(([metric, value]) => {
                rows.push({
                    section: report.reportType,
                    metric,
                    value,
                });
            });
        });

        const summary = {
            included_sections: reports.length,
            summary_rows: rows.length,
        };

        return {
            scope: selectedScope,
            reportType: 'All Analytics Summary',
            generatedAt: new Date().toISOString(),
            period,
            summary,
            columns: [
                { key: 'section', label: 'Section' },
                { key: 'metric', label: 'Metric' },
                { key: 'value', label: 'Value' },
            ],
            rows,
        };
    }

    renderReportPreview(report) {
        const previewEl = this.querySelector('#moReportPreview');
        if (!previewEl) {
            return;
        }

        const summaryHtml = Object.entries(report.summary || {})
            .map(([key, value]) => {
                const label = this.toLabel(key);
                return `
                    <div class="mo-report-summary-item">
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
            ? `<div class="mo-report-truncated-note">Showing first ${previewRows.length} rows out of ${rows.length}.</div>`
            : '';

        const tableSection = columns.length > 0
            ? `
                <div class="mo-report-table-wrap">
                    <table class="mo-report-table">
                        <thead><tr>${tableHeader}</tr></thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>
                ${truncatedNote}
            `
            : '<div class="mo-report-empty">No tabular rows available for this report.</div>';

        previewEl.innerHTML = `
            <div class="mo-report-preview-card">
                <div class="mo-report-meta">
                    <h3>${this.escapeHtml(report.reportType)}</h3>
                    <p>Period: ${this.escapeHtml(periodText)} | Generated: ${this.escapeHtml(this.formatDateTime(report.generatedAt))}</p>
                </div>
                <div class="mo-report-summary-grid">${summaryHtml || '<div class="mo-report-empty">No summary metrics found.</div>'}</div>
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
        anchor.download = `mo-${scopeLabel}-report-${fileStamp}.csv`;
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

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

customElements.define('mo-analytics-hub', MOAnalyticsHub);
