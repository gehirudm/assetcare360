class SupervisorAnalyticsHub extends HTMLElement {
    constructor() {
        super();
        this._activeView = 'tickets';
        this._views = ['tickets', 'breakdowns', 'checks', 'budgets', 'technicians'];
        this._charts = new Map();
        this._refreshToken = 0;
        this._generatedReport = null;
        this._onRootClick = this._onRootClick.bind(this);
    }

    connectedCallback() {
        if (this._initialized) {
            return;
        }

        this._initialized = true;
        this.loadStyles();
        this.render();
        this.addEventListener('click', this._onRootClick);
        this.setDefaultReportPeriod();
        this.setReportStatus('Choose a period and generate a downloadable report.', 'info');
        this.updateDownloadButtonState(false);
        this.activateView(this.getInitialView(), { refresh: false });
        this.refresh();
    }

    disconnectedCallback() {
        this.removeEventListener('click', this._onRootClick);
        this.destroyAllCharts();
    }

    loadStyles() {
        const linkId = 'supervisor-analytics-hub-styles';
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
                <h2 class="page-title"><i class="fas fa-chart-pie"></i> Supervisor Analytics</h2>
                <p class="page-subtitle">Track fault flow, breakdown pressure, checks, budgets, and technician workload in one place.</p>
            </div>

            <div class="sv-analytics-hub-nav" role="tablist" aria-label="Supervisor analytics sections">
                <button type="button" class="sv-analytics-tab" role="tab" data-view="tickets">Fault Tickets</button>
                <button type="button" class="sv-analytics-tab" role="tab" data-view="breakdowns">Breakdowns</button>
                <button type="button" class="sv-analytics-tab" role="tab" data-view="checks">Weekly Checks</button>
                <button type="button" class="sv-analytics-tab" role="tab" data-view="budgets">Budget Queue</button>
                <button type="button" class="sv-analytics-tab" role="tab" data-view="technicians">Technicians</button>
            </div>

            <div class="sv-report-toolbar">
                <div class="report-toolbar-group">
                    <label class="report-toolbar-label" for="svReportFromDate">From Date</label>
                    <input id="svReportFromDate" class="report-toolbar-field" type="date">
                </div>
                <div class="report-toolbar-group">
                    <label class="report-toolbar-label" for="svReportToDate">To Date</label>
                    <input id="svReportToDate" class="report-toolbar-field" type="date">
                </div>
                <div class="report-toolbar-group">
                    <label class="report-toolbar-label" for="svReportScope">Report Type</label>
                    <select id="svReportScope" class="report-toolbar-field">
                        <option value="active">Active Analytics View</option>
                        <option value="tickets">Fault Ticket Analytics</option>
                        <option value="breakdowns">Breakdown Analytics</option>
                        <option value="checks">Weekly Check Analytics</option>
                        <option value="budgets">Budget Queue Analytics</option>
                        <option value="technicians">Technician Analytics</option>
                        <option value="all">All Analytics Summary</option>
                    </select>
                </div>
                <div class="report-toolbar-actions">
                    <button type="button" class="btn btn-primary" data-action="generate-report">
                        <i class="fas fa-file-lines"></i> Generate Report
                    </button>
                    <button type="button" class="btn btn-secondary" data-action="download-report" id="svReportDownloadBtn" disabled>
                        <i class="fas fa-download"></i> Download CSV
                    </button>
                </div>
            </div>

            <div id="svReportStatus" class="sv-report-status"></div>
            <div id="svReportPreview" class="sv-report-preview"></div>

            <div id="svAnalyticsStatus" class="sv-analytics-status" aria-live="polite"></div>

            <div class="sv-analytics-panel" data-view="tickets" role="tabpanel" aria-hidden="true">
                <div id="svSummaryTickets" class="sv-analytics-summary"></div>
                <div class="sv-chart-grid">
                    ${this.renderChartCard('Fault Ticket Status Mix', 'Distribution of current ticket statuses.', 'svTicketStatusChart')}
                    ${this.renderChartCard('Priority Distribution', 'Current urgency profile across all fault tickets.', 'svTicketPriorityChart')}
                </div>
            </div>

            <div class="sv-analytics-panel" data-view="breakdowns" role="tabpanel" aria-hidden="true">
                <div id="svSummaryBreakdowns" class="sv-analytics-summary"></div>
                <div class="sv-chart-grid">
                    ${this.renderChartCard('Breakdown Source Split', 'How breakdown reports are distributed by source type.', 'svBreakdownSourceChart')}
                    ${this.renderChartCard('Severity Distribution', 'Severity spread across all current breakdown reports.', 'svBreakdownSeverityChart')}
                </div>
            </div>

            <div class="sv-analytics-panel" data-view="checks" role="tabpanel" aria-hidden="true">
                <div id="svSummaryChecks" class="sv-analytics-summary"></div>
                <div class="sv-chart-grid">
                    ${this.renderChartCard('Vehicle vs Machine Status', 'Review outcomes grouped by check source.', 'svCheckStatusChart')}
                    ${this.renderChartCard('Weekly Submission Trend', 'Recent weekly submission volume by source.', 'svCheckTrendChart')}
                </div>
            </div>

            <div class="sv-analytics-panel" data-view="budgets" role="tabpanel" aria-hidden="true">
                <div id="svSummaryBudgets" class="sv-analytics-summary"></div>
                <div class="sv-chart-grid">
                    ${this.renderChartCard('Pending Budget Priority', 'Priority profile of pending budget requests.', 'svBudgetPriorityChart')}
                    ${this.renderChartCard('Top Pending Requests', 'Highest pending requests by budget amount.', 'svBudgetAmountChart')}
                </div>
            </div>

            <div class="sv-analytics-panel" data-view="technicians" role="tabpanel" aria-hidden="true">
                <div id="svSummaryTechnicians" class="sv-analytics-summary"></div>
                <div class="sv-chart-grid">
                    ${this.renderChartCard('Workload by Technician', 'Active assignment load per technical officer.', 'svTechnicianWorkloadChart')}
                    ${this.renderChartCard('Expertise Distribution', 'Specialization mix across active technicians.', 'svTechnicianExpertiseChart')}
                </div>
            </div>
        `;
    }

    renderChartCard(title, subtitle, canvasId) {
        return `
            <article class="sv-chart-card">
                <h3 class="sv-chart-title">${title}</h3>
                <p class="sv-chart-subtitle">${subtitle}</p>
                <div class="sv-chart-canvas-wrap">
                    <canvas id="${canvasId}"></canvas>
                    <p class="sv-chart-empty" data-empty-for="${canvasId}" hidden>No chart data available for this section.</p>
                </div>
            </article>
        `;
    }

    _onRootClick(event) {
        const actionBtn = event.target.closest('[data-action]');
        if (actionBtn) {
            const action = actionBtn.dataset.action;
            if (action === 'generate-report') {
                this.generateReport();
                return;
            }

            if (action === 'download-report') {
                this.downloadReportCsv();
                return;
            }
        }

        const tab = event.target.closest('.sv-analytics-tab[data-view]');
        if (!tab) {
            return;
        }

        this.activateView(tab.dataset.view || '', { refresh: true });
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

        this.querySelectorAll('.sv-analytics-tab').forEach((button) => {
            const isActive = button.dataset.view === view;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        this.querySelectorAll('.sv-analytics-panel').forEach((panel) => {
            const isActive = panel.dataset.view === view;
            panel.classList.toggle('active', isActive);
            panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
        });

        if (refresh) {
            this.refresh();
        }
    }

    setDefaultReportPeriod() {
        const fromInput = this.querySelector('#svReportFromDate');
        const toInput = this.querySelector('#svReportToDate');
        if (!fromInput || !toInput) {
            return;
        }

        const toDate = new Date();
        const fromDate = new Date();
        fromDate.setDate(toDate.getDate() - 30);

        fromInput.value = this.toInputDate(fromDate);
        toInput.value = this.toInputDate(toDate);
    }

    async refresh() {
        const token = ++this._refreshToken;
        const view = this._activeView;
        this.setStatus(`Loading ${this.getViewLabel(view)} analytics...`, 'info');

        try {
            if (view === 'tickets') {
                await this.loadTicketAnalytics();
            } else if (view === 'breakdowns') {
                await this.loadBreakdownAnalytics();
            } else if (view === 'checks') {
                await this.loadCheckAnalytics();
            } else if (view === 'budgets') {
                await this.loadBudgetAnalytics();
            } else if (view === 'technicians') {
                await this.loadTechnicianAnalytics();
            }

            if (token !== this._refreshToken) {
                return;
            }

            this.setStatus(
                `${this.getViewLabel(view)} analytics updated at ${this.formatTime(new Date())}.`,
                'success'
            );
        } catch (error) {
            if (token !== this._refreshToken) {
                return;
            }

            const message = error?.message || `Unable to load ${this.getViewLabel(view).toLowerCase()} analytics.`;
            this.setStatus(message, 'error');
            this.emitToast(message, 'error');
        }
    }

    async loadTicketAnalytics() {
        const response = await this.safeGet('/fault-tickets', 'Failed to load fault tickets');
        const tickets = this.extractArrayFromResponse(response, ['data.tickets', 'data']);

        const statusCounts = this.aggregateCounts(
            tickets.map((ticket) => this.toTitle(ticket.status || 'Open'))
        );

        const priorityCounts = this.aggregateCounts(
            tickets.map((ticket) => this.toTitle(ticket.priority || 'Medium'))
        );

        const activeStatuses = new Set([
            'open',
            'assigned',
            'waiting-for-budget-approval',
            'waiting-for-spare-parts',
            'parts-approved',
            'in-progress',
            'garage-approved',
            'garage-entry-logged',
            'repair-in-progress'
        ]);
        const closedStatuses = new Set(['resolved', 'closed', 'completed', 'insurance-claimed']);

        let activeCount = 0;
        let closedCount = 0;
        let criticalCount = 0;

        tickets.forEach((ticket) => {
            const statusKey = this.normalizeKey(ticket.status);
            const priorityKey = this.normalizeKey(ticket.priority);

            if (activeStatuses.has(statusKey)) {
                activeCount += 1;
            }

            if (closedStatuses.has(statusKey)) {
                closedCount += 1;
            }

            if (priorityKey === 'critical') {
                criticalCount += 1;
            }
        });

        this.renderSummary('svSummaryTickets', [
            { label: 'Total Tickets', value: tickets.length },
            { label: 'Active Flow', value: activeCount },
            { label: 'Closed / Resolved', value: closedCount },
            { label: 'Critical Priority', value: criticalCount },
        ]);

        const statusEntries = this.sortEntriesDesc(statusCounts);
        this.renderDoughnutChart('svTicketStatusChart', statusEntries, 'Tickets');

        const priorityEntries = this.sortEntriesDesc(priorityCounts);
        this.renderBarChart('svTicketPriorityChart', priorityEntries, 'Tickets');
    }

    async loadBreakdownAnalytics() {
        const [vehicleResult, routeResult, machineResult] = await Promise.allSettled([
            this.safeGet('/breakdown-reports', 'Failed to load breakdown reports'),
            this.safeGet('/route-breakdowns', 'Failed to load route breakdowns'),
            this.safeGet('/machine-breakdowns', 'Failed to load machine breakdowns'),
        ]);

        const vehicleReports = this.extractArrayFromSettled(vehicleResult, ['data.reports', 'data']);
        const routeReports = this.extractArrayFromSettled(routeResult, ['data.breakdowns', 'data']);
        const machineReports = this.extractArrayFromSettled(machineResult, ['data.reports', 'data']);

        const successfulCalls = [vehicleResult, routeResult, machineResult]
            .filter((result) => result.status === 'fulfilled' && this.isSuccessResponse(result.value)).length;

        if (successfulCalls === 0) {
            throw new Error('Failed to load breakdown analytics data');
        }

        const combinedReports = [
            ...vehicleReports.map((report) => ({ ...report, sourceType: 'Vehicle' })),
            ...routeReports.map((report) => ({ ...report, sourceType: 'Route' })),
            ...machineReports.map((report) => ({ ...report, sourceType: 'Machine' })),
        ];

        const sourceCounts = {
            Vehicle: vehicleReports.length,
            Route: routeReports.length,
            Machine: machineReports.length,
        };

        const severityCounts = this.aggregateCounts(
            combinedReports.map((report) => this.toTitle(report.severity || 'Medium'))
        );

        const closedStatuses = new Set(['resolved', 'closed', 'completed']);
        const activeCount = combinedReports.filter((report) => !closedStatuses.has(this.normalizeKey(report.status))).length;
        const criticalCount = combinedReports.filter((report) => this.normalizeKey(report.severity) === 'critical').length;
        const linkedTicketCount = combinedReports.filter((report) => Number(report.fault_ticket_id) > 0).length;

        this.renderSummary('svSummaryBreakdowns', [
            { label: 'Total Reports', value: combinedReports.length },
            { label: 'Active Reports', value: activeCount },
            { label: 'Critical Severity', value: criticalCount },
            { label: 'Linked Tickets', value: linkedTicketCount },
        ]);

        this.renderDoughnutChart('svBreakdownSourceChart', this.entriesFromObject(sourceCounts), 'Reports');
        this.renderBarChart('svBreakdownSeverityChart', this.sortEntriesDesc(severityCounts), 'Reports');
    }

    async loadCheckAnalytics() {
        const [vehicleResult, machineResult] = await Promise.allSettled([
            this.safeGet('/vehicle-checks', 'Failed to load vehicle checks'),
            this.safeGet('/machine-weekly-checks', 'Failed to load machine weekly checks'),
        ]);

        const vehicleChecks = this.extractArrayFromSettled(vehicleResult, ['data', 'data.checks']);
        const machineChecks = this.extractArrayFromSettled(machineResult, ['data.checks', 'data']);

        const successfulCalls = [vehicleResult, machineResult]
            .filter((result) => result.status === 'fulfilled' && this.isSuccessResponse(result.value)).length;

        if (successfulCalls === 0) {
            throw new Error('Failed to load weekly check analytics data');
        }

        const vehicleStatusCounts = this.aggregateCounts(
            vehicleChecks.map((check) => this.toTitle(check.status || 'Pending'))
        );
        const machineStatusCounts = this.aggregateCounts(
            machineChecks.map((check) => this.toTitle(check.status || 'Pending'))
        );

        const statusLabels = this.mergeLabels([
            ...Object.keys(vehicleStatusCounts),
            ...Object.keys(machineStatusCounts),
        ]);

        const groupedStatusEntries = statusLabels.map((label) => ({
            label,
            vehicle: vehicleStatusCounts[label] || 0,
            machine: machineStatusCounts[label] || 0,
        }));

        const trendData = this.buildWeeklySubmissionSeries(vehicleChecks, machineChecks, 8);

        const totalChecks = vehicleChecks.length + machineChecks.length;
        const pendingCount = groupedStatusEntries.reduce((sum, item) => {
            return sum + (this.normalizeKey(item.label) === 'pending' ? item.vehicle + item.machine : 0);
        }, 0);
        const approvedCount = groupedStatusEntries.reduce((sum, item) => {
            return sum + (this.normalizeKey(item.label) === 'approved' ? item.vehicle + item.machine : 0);
        }, 0);
        const approvalRate = totalChecks > 0 ? (approvedCount / totalChecks) * 100 : 0;

        this.renderSummary('svSummaryChecks', [
            { label: 'Total Checks', value: totalChecks },
            { label: 'Pending Reviews', value: pendingCount },
            { label: 'Approved Checks', value: approvedCount },
            { label: 'Approval Rate', value: this.formatPercent(approvalRate) },
        ]);

        this.renderGroupedBarChart(
            'svCheckStatusChart',
            groupedStatusEntries,
            'Vehicle Checks',
            'Machine Checks'
        );

        this.renderLineChart('svCheckTrendChart', trendData);
    }

    async loadBudgetAnalytics() {
        const response = await this.safeGet('/budget-reports/pending', 'Failed to load pending budget reports');
        const reports = this.extractArrayFromResponse(response, ['data.reports', 'data']);

        const priorityCounts = this.aggregateCounts(
            reports.map((report) => this.toTitle(report.ticket_priority || 'Medium'))
        );

        const amountEntries = reports
            .map((report) => {
                const amount = this.toNumber(report.total_amount);
                const ticketLabel = report.ticket_display_id || `Ticket #${report.fault_ticket_id || report.id || 'N/A'}`;

                return {
                    label: String(ticketLabel),
                    value: amount,
                };
            })
            .filter((entry) => entry.value > 0)
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);

        const totalAmount = reports.reduce((sum, report) => sum + this.toNumber(report.total_amount), 0);
        const urgentRequests = reports.filter((report) => {
            const priority = this.normalizeKey(report.ticket_priority);
            return priority === 'high' || priority === 'critical';
        }).length;
        const averageAmount = reports.length > 0 ? totalAmount / reports.length : 0;

        this.renderSummary('svSummaryBudgets', [
            { label: 'Pending Requests', value: reports.length },
            { label: 'Pending Total', value: this.formatCurrency(totalAmount) },
            { label: 'Urgent Requests', value: urgentRequests },
            { label: 'Average Amount', value: this.formatCurrency(averageAmount) },
        ]);

        this.renderDoughnutChart('svBudgetPriorityChart', this.sortEntriesDesc(priorityCounts), 'Requests');
        this.renderBarChart('svBudgetAmountChart', amountEntries, 'LKR');
    }

    async loadTechnicianAnalytics() {
        const [technicianResult, ticketResult] = await Promise.allSettled([
            this.safeGet('/technicians', 'Failed to load technicians'),
            this.safeGet('/fault-tickets', 'Failed to load fault tickets'),
        ]);

        const technicians = this.extractArrayFromSettled(technicianResult, ['data.users', 'data']);
        if (technicianResult.status !== 'fulfilled' || !this.isSuccessResponse(technicianResult.value)) {
            throw new Error('Failed to load technician analytics data');
        }

        const tickets = this.extractArrayFromSettled(ticketResult, ['data.tickets', 'data']);
        const assignmentCounts = this.buildAssignmentCountMap(tickets);

        const technicianWorkloads = technicians.map((technician) => {
            const technicianId = Number(technician.id);
            const backendCount = Number(technician.active_ticket_count);
            const derivedCount = assignmentCounts.get(technicianId) || 0;
            const activeAssignments = Number.isFinite(backendCount) ? backendCount : derivedCount;

            return {
                id: technicianId,
                name: technician.full_name || `Technician #${technicianId}`,
                expertise: technician.technical_expertise || 'General',
                activeAssignments: Math.max(activeAssignments, 0),
            };
        });

        const workloadEntries = technicianWorkloads
            .slice()
            .sort((a, b) => b.activeAssignments - a.activeAssignments)
            .slice(0, 8)
            .map((item) => ({ label: item.name, value: item.activeAssignments }));

        const expertiseCounts = this.aggregateCounts(
            technicianWorkloads.map((item) => this.toTitle(item.expertise || 'General'))
        );

        const totalAssignments = technicianWorkloads.reduce((sum, item) => sum + item.activeAssignments, 0);
        const overloaded = technicianWorkloads.filter((item) => item.activeAssignments >= 4).length;
        const idle = technicianWorkloads.filter((item) => item.activeAssignments === 0).length;

        this.renderSummary('svSummaryTechnicians', [
            { label: 'Active Technicians', value: technicianWorkloads.length },
            { label: 'Active Assignments', value: totalAssignments },
            { label: 'Overloaded (4+)', value: overloaded },
            { label: 'Idle (No Assignments)', value: idle },
        ]);

        this.renderBarChart('svTechnicianWorkloadChart', workloadEntries, 'Assignments');
        this.renderDoughnutChart('svTechnicianExpertiseChart', this.sortEntriesDesc(expertiseCounts), 'Technicians');
    }

    async generateReport() {
        try {
            this.setGeneratingState(true);
            this.setReportStatus('Generating report...', 'info');

            const period = this.getReportPeriod();
            const selectedScope = String(this.querySelector('#svReportScope')?.value || 'active').trim();
            const scope = selectedScope === 'active' ? this._activeView : selectedScope;

            const report = await this.buildReportForScope(scope, period, selectedScope);
            this._generatedReport = report;

            this.renderReportPreview(report);
            this.updateDownloadButtonState(true);

            const rowCount = Array.isArray(report.rows) ? report.rows.length : 0;
            this.setReportStatus(`Report generated successfully (${rowCount} rows).`, 'success');
        } catch (error) {
            console.error('Supervisor analytics report generation failed:', error);
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

        if (scope === 'checks') {
            return this.buildChecksReport(period, selectedScope);
        }

        if (scope === 'budgets') {
            return this.buildBudgetsReport(period, selectedScope);
        }

        if (scope === 'technicians') {
            return this.buildTechniciansReport(period, selectedScope);
        }

        if (scope === 'all') {
            return this.buildAllAnalyticsReport(period, selectedScope);
        }

        throw new Error('Unsupported report type selected.');
    }

    async buildTicketsReport(period, selectedScope) {
        const response = await this.safeGet('/fault-tickets', 'Failed to load fault tickets');
        const tickets = this.extractArrayFromResponse(response, ['data.tickets', 'data'])
            .filter((ticket) => this.isWithinPeriod(this.extractDate(ticket?.created_at, ticket?.updated_at), period));

        const rows = tickets.map((ticket) => ({
            ticket_id: ticket.ticket_id || ticket.id || '',
            status: this.toTitle(ticket.status || 'Open'),
            priority: this.toTitle(ticket.priority || 'Medium'),
            location: ticket.location || '',
            created_at: ticket.created_at || '',
            assigned_to: this.extractTicketAssignees(ticket),
        }));

        const summary = {
            total_tickets: rows.length,
            active_flow: rows.filter((row) => {
                const status = this.normalizeKey(row.status);
                return status !== 'resolved' && status !== 'closed' && status !== 'completed';
            }).length,
            critical_priority: rows.filter((row) => this.normalizeKey(row.priority) === 'critical').length,
            closed_or_resolved: rows.filter((row) => {
                const status = this.normalizeKey(row.status);
                return status === 'resolved' || status === 'closed' || status === 'completed';
            }).length,
        };

        return {
            scope: selectedScope,
            reportType: 'Fault Ticket Analytics',
            generatedAt: new Date().toISOString(),
            period,
            summary,
            columns: [
                { key: 'ticket_id', label: 'Ticket ID' },
                { key: 'status', label: 'Status' },
                { key: 'priority', label: 'Priority' },
                { key: 'location', label: 'Location' },
                { key: 'created_at', label: 'Created At' },
                { key: 'assigned_to', label: 'Assigned To' },
            ],
            rows,
        };
    }

    async buildBreakdownsReport(period, selectedScope) {
        const [vehicleResult, routeResult, machineResult] = await Promise.all([
            this.safeGet('/breakdown-reports', 'Failed to load breakdown reports'),
            this.safeGet('/route-breakdowns', 'Failed to load route breakdowns'),
            this.safeGet('/machine-breakdowns', 'Failed to load machine breakdowns'),
        ]);

        const vehicleRows = this.extractArrayFromResponse(vehicleResult, ['data.reports', 'data'])
            .filter((row) => this.isWithinPeriod(this.extractDate(row?.created_at, row?.breakdown_date), period))
            .map((row) => ({ ...row, _source: 'Vehicle' }));

        const routeRows = this.extractArrayFromResponse(routeResult, ['data.breakdowns', 'data'])
            .filter((row) => this.isWithinPeriod(this.extractDate(row?.breakdown_datetime, row?.created_at), period))
            .map((row) => ({ ...row, _source: 'Route' }));

        const machineRows = this.extractArrayFromResponse(machineResult, ['data.reports', 'data'])
            .filter((row) => this.isWithinPeriod(this.extractDate(row?.created_at, row?.breakdown_date), period))
            .map((row) => ({ ...row, _source: 'Machine' }));

        const combined = [...vehicleRows, ...routeRows, ...machineRows];

        const rows = combined.map((row) => ({
            source: row._source,
            breakdown_id: row.breakdown_id || row.route_breakdown_id || row.id || '',
            severity: this.toTitle(row.severity || 'Medium'),
            status: this.toTitle(row.status || row.ticket_status || 'Open'),
            ticket_id: row.fault_ticket_number || row.fault_ticket_id || '',
            asset: row.machine_name || row.vehicle_registration || row.vehicle_id || row.machine_id || '',
            reported_at: row.created_at || row.breakdown_datetime || row.breakdown_date || '',
        }));

        const summary = {
            total_reports: rows.length,
            vehicle_reports: rows.filter((row) => row.source === 'Vehicle').length,
            route_reports: rows.filter((row) => row.source === 'Route').length,
            machine_reports: rows.filter((row) => row.source === 'Machine').length,
            critical_or_high: rows.filter((row) => {
                const severity = this.normalizeKey(row.severity);
                return severity === 'critical' || severity === 'high';
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
                { key: 'severity', label: 'Severity' },
                { key: 'status', label: 'Status' },
                { key: 'ticket_id', label: 'Linked Ticket' },
                { key: 'asset', label: 'Asset' },
                { key: 'reported_at', label: 'Reported At' },
            ],
            rows,
        };
    }

    async buildChecksReport(period, selectedScope) {
        const [vehicleResult, machineResult] = await Promise.all([
            this.safeGet('/vehicle-checks', 'Failed to load vehicle checks'),
            this.safeGet('/machine-weekly-checks', 'Failed to load machine weekly checks'),
        ]);

        const vehicleChecks = this.extractArrayFromResponse(vehicleResult, ['data', 'data.checks'])
            .filter((row) => this.isWithinPeriod(this.extractDate(row?.submitted_date, row?.created_at), period));
        const machineChecks = this.extractArrayFromResponse(machineResult, ['data.checks', 'data'])
            .filter((row) => this.isWithinPeriod(this.extractDate(row?.submitted_date, row?.created_at), period));

        const rows = [
            ...vehicleChecks.map((row) => ({
                source: 'Vehicle',
                check_id: row.check_id || row.id || '',
                status: this.toTitle(row.status || 'Pending'),
                asset: row.vehicle_id || row.vehicle_registration || '',
                submitted_date: row.submitted_date || row.created_at || '',
                reviewer: row.reviewed_by_name || '',
            })),
            ...machineChecks.map((row) => ({
                source: 'Machine',
                check_id: row.check_id || row.id || '',
                status: this.toTitle(row.status || 'Pending'),
                asset: row.machine_id || row.machine_name || '',
                submitted_date: row.submitted_date || row.created_at || '',
                reviewer: row.reviewed_by_name || '',
            })),
        ];

        const approvedCount = rows.filter((row) => this.normalizeKey(row.status) === 'approved').length;

        const summary = {
            total_checks: rows.length,
            vehicle_checks: rows.filter((row) => row.source === 'Vehicle').length,
            machine_checks: rows.filter((row) => row.source === 'Machine').length,
            approved_checks: approvedCount,
            approval_rate: rows.length > 0 ? `${((approvedCount / rows.length) * 100).toFixed(1)}%` : '0.0%',
        };

        return {
            scope: selectedScope,
            reportType: 'Weekly Check Analytics',
            generatedAt: new Date().toISOString(),
            period,
            summary,
            columns: [
                { key: 'source', label: 'Source' },
                { key: 'check_id', label: 'Check ID' },
                { key: 'status', label: 'Status' },
                { key: 'asset', label: 'Asset' },
                { key: 'submitted_date', label: 'Submitted Date' },
                { key: 'reviewer', label: 'Reviewer' },
            ],
            rows,
        };
    }

    async buildBudgetsReport(period, selectedScope) {
        const response = await this.safeGet('/budget-reports/pending', 'Failed to load pending budget reports');
        const reports = this.extractArrayFromResponse(response, ['data.reports', 'data'])
            .filter((row) => this.isWithinPeriod(this.extractDate(row?.created_at, row?.updated_at), period));

        const rows = reports.map((row) => ({
            budget_report_id: row.id || '',
            ticket_id: row.ticket_display_id || row.fault_ticket_id || '',
            ticket_priority: this.toTitle(row.ticket_priority || 'Medium'),
            approval_level: this.toTitle(row.approval_level || 'Unknown'),
            total_amount: this.toNumber(row.total_amount),
            created_at: row.created_at || '',
        }));

        const totalAmount = rows.reduce((sum, row) => sum + this.toNumber(row.total_amount), 0);
        const summary = {
            pending_requests: rows.length,
            pending_total_lkr: Number(totalAmount.toFixed(2)),
            urgent_requests: rows.filter((row) => {
                const priority = this.normalizeKey(row.ticket_priority);
                return priority === 'high' || priority === 'critical';
            }).length,
            average_amount_lkr: rows.length > 0 ? Number((totalAmount / rows.length).toFixed(2)) : 0,
        };

        return {
            scope: selectedScope,
            reportType: 'Budget Queue Analytics',
            generatedAt: new Date().toISOString(),
            period,
            summary,
            columns: [
                { key: 'budget_report_id', label: 'Budget Report ID' },
                { key: 'ticket_id', label: 'Ticket ID' },
                { key: 'ticket_priority', label: 'Ticket Priority' },
                { key: 'approval_level', label: 'Approval Level' },
                { key: 'total_amount', label: 'Total Amount (LKR)' },
                { key: 'created_at', label: 'Created At' },
            ],
            rows,
        };
    }

    async buildTechniciansReport(period, selectedScope) {
        const [technicianResponse, ticketResponse] = await Promise.all([
            this.safeGet('/technicians', 'Failed to load technicians'),
            this.safeGet('/fault-tickets', 'Failed to load fault tickets'),
        ]);

        const technicians = this.extractArrayFromResponse(technicianResponse, ['data.users', 'data']);
        const tickets = this.extractArrayFromResponse(ticketResponse, ['data.tickets', 'data'])
            .filter((ticket) => this.isWithinPeriod(this.extractDate(ticket?.created_at, ticket?.updated_at), period));

        const assignmentCounts = this.buildAssignmentCountMap(tickets);

        const rows = technicians.map((technician) => {
            const technicianId = Number(technician.id);
            const backendCount = Number(technician.active_ticket_count);
            const derivedCount = assignmentCounts.get(technicianId) || 0;
            const activeAssignments = Number.isFinite(backendCount) ? backendCount : derivedCount;

            return {
                technician_id: technician.employee_id || technician.id || '',
                name: technician.full_name || '',
                expertise: technician.technical_expertise || 'General',
                active_assignments: Math.max(activeAssignments, 0),
            };
        });

        const summary = {
            active_technicians: rows.length,
            active_assignments: rows.reduce((sum, row) => sum + row.active_assignments, 0),
            overloaded_4_plus: rows.filter((row) => row.active_assignments >= 4).length,
            idle_technicians: rows.filter((row) => row.active_assignments === 0).length,
        };

        return {
            scope: selectedScope,
            reportType: 'Technician Analytics',
            generatedAt: new Date().toISOString(),
            period,
            summary,
            columns: [
                { key: 'technician_id', label: 'Technician ID' },
                { key: 'name', label: 'Name' },
                { key: 'expertise', label: 'Expertise' },
                { key: 'active_assignments', label: 'Active Assignments' },
            ],
            rows,
        };
    }

    async buildAllAnalyticsReport(period, selectedScope) {
        const [tickets, breakdowns, checks, budgets, technicians] = await Promise.all([
            this.buildTicketsReport(period, 'tickets'),
            this.buildBreakdownsReport(period, 'breakdowns'),
            this.buildChecksReport(period, 'checks'),
            this.buildBudgetsReport(period, 'budgets'),
            this.buildTechniciansReport(period, 'technicians'),
        ]);

        const reports = [tickets, breakdowns, checks, budgets, technicians];
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

    getReportPeriod() {
        const fromRaw = String(this.querySelector('#svReportFromDate')?.value || '').trim();
        const toRaw = String(this.querySelector('#svReportToDate')?.value || '').trim();

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

    extractDate(...values) {
        for (const value of values) {
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

    extractTicketAssignees(ticket) {
        const assignments = Array.isArray(ticket?.assignments) ? ticket.assignments : [];
        const names = assignments
            .map((assignment) => assignment.assignee_name || assignment.assigned_to_name || assignment.technician_name || '')
            .filter(Boolean);

        if (names.length > 0) {
            return names.join(', ');
        }

        if (ticket?.assigned_to_name) {
            return String(ticket.assigned_to_name);
        }

        return '';
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
        const button = this.querySelector('#svReportDownloadBtn');
        if (!button) {
            return;
        }

        button.disabled = !enabled;
    }

    setReportStatus(message, type = 'info') {
        const statusEl = this.querySelector('#svReportStatus');
        if (!statusEl) {
            return;
        }

        statusEl.className = `sv-report-status ${type}`;
        statusEl.textContent = message;
    }

    renderReportPreview(report) {
        const previewEl = this.querySelector('#svReportPreview');
        if (!previewEl) {
            return;
        }

        const summaryHtml = Object.entries(report.summary || {})
            .map(([key, value]) => {
                const label = this.toLabel(key);
                return `
                    <div class="sv-report-summary-item">
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
            ? `<div class="sv-report-truncated-note">Showing first ${previewRows.length} rows out of ${rows.length}.</div>`
            : '';

        const tableSection = columns.length > 0
            ? `
                <div class="sv-report-table-wrap">
                    <table class="sv-report-table" id="svReportTable">
                        <thead><tr>${tableHeader}</tr></thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>
                ${truncatedNote}
            `
            : '<div class="sv-report-empty">No tabular rows available for this report.</div>';

        previewEl.innerHTML = `
            <div class="sv-report-preview-card">
                <div class="sv-report-meta">
                    <h3>${this.escapeHtml(report.reportType)}</h3>
                    <p>Period: ${this.escapeHtml(periodText)} | Generated: ${this.escapeHtml(this.formatDateTime(report.generatedAt))}</p>
                </div>
                <div class="sv-report-summary-grid">${summaryHtml || '<div class="sv-report-empty">No summary metrics found.</div>'}</div>
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
        anchor.download = `supervisor-${scopeLabel}-report-${fileStamp}.csv`;
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

    async safeGet(endpoint, fallbackMessage) {
        if (!window.API || typeof window.API.get !== 'function') {
            throw new Error('API client is not available on this page');
        }

        const response = await window.API.get(endpoint);
        if (!this.isSuccessResponse(response)) {
            throw new Error(response?.message || fallbackMessage);
        }

        return response;
    }

    isSuccessResponse(response) {
        if (!response || typeof response !== 'object') {
            return false;
        }

        return response.status === 'success' || response.success === true;
    }

    extractArrayFromResponse(response, candidatePaths) {
        for (const path of candidatePaths) {
            const value = this.readPath(response, path);
            if (Array.isArray(value)) {
                return value;
            }
        }

        return [];
    }

    extractArrayFromSettled(result, candidatePaths) {
        if (!result || result.status !== 'fulfilled' || !this.isSuccessResponse(result.value)) {
            return [];
        }

        return this.extractArrayFromResponse(result.value, candidatePaths);
    }

    readPath(source, path) {
        if (!source || !path) {
            return undefined;
        }

        return path.split('.').reduce((value, key) => {
            if (value && Object.prototype.hasOwnProperty.call(value, key)) {
                return value[key];
            }
            return undefined;
        }, source);
    }

    buildAssignmentCountMap(tickets) {
        const counts = new Map();

        tickets.forEach((ticket) => {
            const assignments = Array.isArray(ticket.assignments) ? ticket.assignments : [];
            assignments.forEach((assignment) => {
                const technicianId = Number(
                    assignment.assigned_to
                    || assignment.assigned_to_id
                    || assignment.technician_id
                    || assignment.user_id
                );

                if (!Number.isFinite(technicianId)) {
                    return;
                }

                const current = counts.get(technicianId) || 0;
                counts.set(technicianId, current + 1);
            });
        });

        return counts;
    }

    buildWeeklySubmissionSeries(vehicleChecks, machineChecks, maxWeeks = 8) {
        const weekMap = new Map();

        const recordWeek = (dateValue, sourceKey) => {
            const weekKey = this.getWeekStart(dateValue);
            if (!weekKey) {
                return;
            }

            const current = weekMap.get(weekKey) || { vehicle: 0, machine: 0 };
            current[sourceKey] += 1;
            weekMap.set(weekKey, current);
        };

        vehicleChecks.forEach((check) => {
            recordWeek(check.submitted_date || check.created_at, 'vehicle');
        });

        machineChecks.forEach((check) => {
            recordWeek(check.submitted_date || check.created_at, 'machine');
        });

        const sortedWeekKeys = Array.from(weekMap.keys()).sort();
        const selectedWeekKeys = sortedWeekKeys.slice(-Math.max(maxWeeks, 1));

        return {
            labels: selectedWeekKeys.map((key) => this.formatWeekLabel(key)),
            vehicleData: selectedWeekKeys.map((key) => weekMap.get(key)?.vehicle || 0),
            machineData: selectedWeekKeys.map((key) => weekMap.get(key)?.machine || 0),
        };
    }

    getWeekStart(value) {
        if (!value) {
            return null;
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return null;
        }

        const start = new Date(date);
        start.setHours(0, 0, 0, 0);

        const day = start.getDay();
        const dayOffset = day === 0 ? -6 : 1 - day;
        start.setDate(start.getDate() + dayOffset);

        const year = start.getFullYear();
        const month = String(start.getMonth() + 1).padStart(2, '0');
        const dayOfMonth = String(start.getDate()).padStart(2, '0');

        return `${year}-${month}-${dayOfMonth}`;
    }

    formatWeekLabel(weekKey) {
        const date = new Date(`${weekKey}T00:00:00`);
        if (Number.isNaN(date.getTime())) {
            return weekKey;
        }

        return date.toLocaleDateString('en-LK', {
            month: 'short',
            day: 'numeric'
        });
    }

    renderSummary(containerId, metrics) {
        const container = this.querySelector(`#${containerId}`);
        if (!container) {
            return;
        }

        container.innerHTML = metrics.map((metric) => {
            return `
                <div class="sv-kpi-card">
                    <span class="sv-kpi-label">${this.escapeHtml(metric.label)}</span>
                    <span class="sv-kpi-value">${this.escapeHtml(String(metric.value))}</span>
                </div>
            `;
        }).join('');
    }

    renderDoughnutChart(canvasId, entries, valueLabel) {
        const labels = entries.map((entry) => entry.label);
        const values = entries.map((entry) => entry.value);

        this.renderChart(canvasId, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    label: valueLabel,
                    data: values,
                    backgroundColor: this.createColors(values.length, 0.85),
                    borderColor: '#ffffff',
                    borderWidth: 2,
                }],
            },
            options: {
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    },
                },
            },
        });
    }

    renderBarChart(canvasId, entries, valueLabel) {
        const labels = entries.map((entry) => entry.label);
        const values = entries.map((entry) => entry.value);

        this.renderChart(canvasId, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: valueLabel,
                    data: values,
                    backgroundColor: this.createColors(values.length, 0.75),
                    borderColor: this.createColors(values.length, 1),
                    borderWidth: 1,
                    borderRadius: 8,
                    maxBarThickness: 36,
                }],
            },
            options: {
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0,
                        },
                    },
                },
                plugins: {
                    legend: {
                        display: false,
                    },
                },
            },
        });
    }

    renderGroupedBarChart(canvasId, entries, vehicleLabel, machineLabel) {
        const labels = entries.map((entry) => entry.label);

        this.renderChart(canvasId, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: vehicleLabel,
                        data: entries.map((entry) => entry.vehicle),
                        backgroundColor: 'rgba(37, 99, 235, 0.75)',
                        borderColor: 'rgba(37, 99, 235, 1)',
                        borderWidth: 1,
                        borderRadius: 8,
                        maxBarThickness: 32,
                    },
                    {
                        label: machineLabel,
                        data: entries.map((entry) => entry.machine),
                        backgroundColor: 'rgba(16, 185, 129, 0.75)',
                        borderColor: 'rgba(16, 185, 129, 1)',
                        borderWidth: 1,
                        borderRadius: 8,
                        maxBarThickness: 32,
                    },
                ],
            },
            options: {
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0,
                        },
                    },
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                    },
                },
            },
        });
    }

    renderLineChart(canvasId, trendData) {
        this.renderChart(canvasId, {
            type: 'line',
            data: {
                labels: trendData.labels,
                datasets: [
                    {
                        label: 'Vehicle Checks',
                        data: trendData.vehicleData,
                        borderColor: 'rgba(37, 99, 235, 1)',
                        backgroundColor: 'rgba(37, 99, 235, 0.16)',
                        tension: 0.3,
                        fill: true,
                    },
                    {
                        label: 'Machine Checks',
                        data: trendData.machineData,
                        borderColor: 'rgba(245, 158, 11, 1)',
                        backgroundColor: 'rgba(245, 158, 11, 0.16)',
                        tension: 0.3,
                        fill: true,
                    },
                ],
            },
            options: {
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0,
                        },
                    },
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                    },
                },
            },
        });
    }

    renderChart(canvasId, config) {
        const canvas = this.querySelector(`#${canvasId}`);
        if (!canvas) {
            return;
        }

        if (typeof window.Chart !== 'function') {
            this.showChartEmptyState(canvasId, 'Chart rendering library is unavailable.');
            return;
        }

        const hasData = this.hasChartData(config?.data?.datasets || []);
        if (!hasData) {
            this.destroyChart(canvasId);
            this.showChartEmptyState(canvasId, 'No chart data available for this section.');
            return;
        }

        this.hideChartEmptyState(canvasId);
        this.destroyChart(canvasId);

        const context = canvas.getContext('2d');
        const chart = new window.Chart(context, config);
        this._charts.set(canvasId, chart);
    }

    hasChartData(datasets) {
        return datasets.some((dataset) => {
            const values = Array.isArray(dataset?.data) ? dataset.data : [];
            return values.some((value) => Number(value) > 0);
        });
    }

    showChartEmptyState(canvasId, message) {
        const canvas = this.querySelector(`#${canvasId}`);
        const emptyState = this.querySelector(`[data-empty-for="${canvasId}"]`);

        if (canvas) {
            canvas.style.display = 'none';
        }

        if (emptyState) {
            emptyState.hidden = false;
            emptyState.textContent = message;
        }
    }

    hideChartEmptyState(canvasId) {
        const canvas = this.querySelector(`#${canvasId}`);
        const emptyState = this.querySelector(`[data-empty-for="${canvasId}"]`);

        if (canvas) {
            canvas.style.display = 'block';
        }

        if (emptyState) {
            emptyState.hidden = true;
        }
    }

    destroyChart(canvasId) {
        const existing = this._charts.get(canvasId);
        if (!existing) {
            return;
        }

        existing.destroy();
        this._charts.delete(canvasId);
    }

    destroyAllCharts() {
        this._charts.forEach((chart) => {
            chart.destroy();
        });
        this._charts.clear();
    }

    createColors(count, alpha = 1) {
        const palette = [
            [37, 99, 235],
            [14, 165, 233],
            [16, 185, 129],
            [245, 158, 11],
            [239, 68, 68],
            [99, 102, 241],
            [20, 184, 166],
            [217, 119, 6],
            [236, 72, 153],
            [107, 114, 128],
        ];

        return Array.from({ length: Math.max(count, 1) }, (_, index) => {
            const [r, g, b] = palette[index % palette.length];
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        });
    }

    aggregateCounts(values) {
        return values.reduce((accumulator, value) => {
            const normalized = String(value || 'Unknown').trim() || 'Unknown';
            accumulator[normalized] = (accumulator[normalized] || 0) + 1;
            return accumulator;
        }, {});
    }

    sortEntriesDesc(countMap) {
        return Object.entries(countMap)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value);
    }

    entriesFromObject(source) {
        return Object.entries(source).map(([label, value]) => ({ label, value }));
    }

    mergeLabels(labels) {
        const deduped = Array.from(new Set(labels));
        return deduped.sort((a, b) => a.localeCompare(b));
    }

    normalizeKey(value) {
        return String(value || '')
            .trim()
            .toLowerCase()
            .replace(/[_\s]+/g, '-')
            .replace(/[^a-z0-9-]/g, '');
    }

    toTitle(value) {
        const raw = String(value || '').trim();
        if (!raw) {
            return 'Unknown';
        }

        return raw
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/\b\w/g, (letter) => letter.toUpperCase());
    }

    toNumber(value) {
        const numeric = Number.parseFloat(value);
        return Number.isFinite(numeric) ? numeric : 0;
    }

    formatCurrency(amount) {
        const value = Number.isFinite(amount) ? amount : 0;
        return `LKR ${value.toLocaleString('en-LK', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    }

    formatPercent(value) {
        if (!Number.isFinite(value)) {
            return '0%';
        }

        return `${value.toFixed(1)}%`;
    }

    formatTime(value) {
        if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
            return 'N/A';
        }

        return value.toLocaleTimeString('en-LK', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    getViewLabel(view) {
        const labels = {
            tickets: 'Fault Ticket',
            breakdowns: 'Breakdown',
            checks: 'Weekly Check',
            budgets: 'Budget Queue',
            technicians: 'Technician',
        };

        return labels[view] || 'Analytics';
    }

    setStatus(message, type = 'info') {
        const statusEl = this.querySelector('#svAnalyticsStatus');
        if (!statusEl) {
            return;
        }

        statusEl.textContent = message;
        statusEl.className = 'sv-analytics-status';

        if (type) {
            statusEl.classList.add(type);
        }
    }

    emitToast(message, type = 'info') {
        this.dispatchEvent(new CustomEvent('supervisor-analytics-hub:toast', {
            bubbles: true,
            detail: {
                message,
                type,
            },
        }));
    }

    escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

if (!customElements.get('supervisor-analytics-hub')) {
    customElements.define('supervisor-analytics-hub', SupervisorAnalyticsHub);
}
