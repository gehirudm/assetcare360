class TOAnalyticsHub extends HTMLElement {
    constructor() {
        super();
        this._activeView = 'tickets';
        this._views = ['tickets', 'spare-parts', 'work-updates', 'assets', 'notifications'];
        this._charts = new Map();
        this._refreshToken = 0;
        this._currentUser = null;
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

    setCurrentUser(user) {
        this._currentUser = user || null;
    }

    loadStyles() {
        const linkId = 'to-analytics-hub-styles';
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
                <h2 class="page-title"><i class="fas fa-chart-pie"></i> Technical Officer Analytics</h2>
                <p class="page-subtitle">Monitor assigned tickets, spare-part flow, work updates, assets, and notifications in one page.</p>
            </div>

            <div class="toa-analytics-hub-nav" role="tablist" aria-label="Technical Officer analytics sections">
                <button type="button" class="toa-analytics-tab" role="tab" data-view="tickets">Tickets</button>
                <button type="button" class="toa-analytics-tab" role="tab" data-view="spare-parts">Spare Parts</button>
                <button type="button" class="toa-analytics-tab" role="tab" data-view="work-updates">Work Updates</button>
                <button type="button" class="toa-analytics-tab" role="tab" data-view="assets">Assets</button>
                <button type="button" class="toa-analytics-tab" role="tab" data-view="notifications">Notifications</button>
            </div>

            <div class="toa-report-toolbar">
                <div class="report-toolbar-group">
                    <label class="report-toolbar-label" for="toReportFromDate">From Date</label>
                    <input id="toReportFromDate" class="report-toolbar-field" type="date">
                </div>
                <div class="report-toolbar-group">
                    <label class="report-toolbar-label" for="toReportToDate">To Date</label>
                    <input id="toReportToDate" class="report-toolbar-field" type="date">
                </div>
                <div class="report-toolbar-group">
                    <label class="report-toolbar-label" for="toReportScope">Report Type</label>
                    <select id="toReportScope" class="report-toolbar-field">
                        <option value="active">Active Analytics View</option>
                        <option value="tickets">Ticket Analytics</option>
                        <option value="spare-parts">Spare Part Analytics</option>
                        <option value="work-updates">Work Update Analytics</option>
                        <option value="assets">Asset Analytics</option>
                        <option value="notifications">Notification Analytics</option>
                        <option value="all">All Analytics Summary</option>
                    </select>
                </div>
                <div class="report-toolbar-actions">
                    <button type="button" class="btn btn-primary" data-action="generate-report">
                        <i class="fas fa-file-lines"></i> Generate Report
                    </button>
                    <button type="button" class="btn btn-secondary" data-action="download-report" id="toReportDownloadBtn" disabled>
                        <i class="fas fa-download"></i> Download CSV
                    </button>
                </div>
            </div>

            <div id="toReportStatus" class="toa-report-status"></div>
            <div id="toReportPreview" class="toa-report-preview"></div>

            <div id="toAnalyticsStatus" class="toa-analytics-status" aria-live="polite"></div>

            <div class="toa-analytics-panel" data-view="tickets" role="tabpanel" aria-hidden="true">
                <div id="toSummaryTickets" class="toa-analytics-summary"></div>
                <div class="toa-chart-grid">
                    ${this.renderChartCard('Assigned Ticket Status Mix', 'Distribution of statuses across your assigned tickets.', 'toTicketStatusChart')}
                    ${this.renderChartCard('Priority Distribution', 'Urgency spread for tickets under your scope.', 'toTicketPriorityChart')}
                </div>
            </div>

            <div class="toa-analytics-panel" data-view="spare-parts" role="tabpanel" aria-hidden="true">
                <div id="toSummarySpareParts" class="toa-analytics-summary"></div>
                <div class="toa-chart-grid">
                    ${this.renderChartCard('Request Status Mix', 'Current status distribution of your spare-part requests.', 'toSpareStatusChart')}
                    ${this.renderChartCard('Top Requested Parts', 'Most frequently requested spare parts by quantity.', 'toSpareTopPartsChart')}
                </div>
            </div>

            <div class="toa-analytics-panel" data-view="work-updates" role="tabpanel" aria-hidden="true">
                <div id="toSummaryWorkUpdates" class="toa-analytics-summary"></div>
                <div class="toa-chart-grid">
                    ${this.renderChartCard('Hours Logged by Ticket', 'Total logged work hours grouped by ticket.', 'toWorkHoursChart')}
                    ${this.renderChartCard('Weekly Work Update Trend', 'Hours and update count trend over recent weeks.', 'toWorkTrendChart')}
                </div>
            </div>

            <div class="toa-analytics-panel" data-view="assets" role="tabpanel" aria-hidden="true">
                <div id="toSummaryAssets" class="toa-analytics-summary"></div>
                <div class="toa-chart-grid">
                    ${this.renderChartCard('Asset Type Split', 'Current inventory split between vehicles and machines.', 'toAssetTypeChart')}
                    ${this.renderChartCard('Asset Status Distribution', 'Combined status distribution across all assets.', 'toAssetStatusChart')}
                </div>
            </div>

            <div class="toa-analytics-panel" data-view="notifications" role="tabpanel" aria-hidden="true">
                <div id="toSummaryNotifications" class="toa-analytics-summary"></div>
                <div class="toa-chart-grid">
                    ${this.renderChartCard('Read vs Unread', 'Overview of your notification read state.', 'toNotificationReadChart')}
                    ${this.renderChartCard('Notification Types', 'Distribution of notifications by type.', 'toNotificationTypeChart')}
                </div>
            </div>
        `;
    }

    renderChartCard(title, subtitle, canvasId) {
        return `
            <article class="toa-chart-card">
                <h3 class="toa-chart-title">${title}</h3>
                <p class="toa-chart-subtitle">${subtitle}</p>
                <div class="toa-chart-canvas-wrap">
                    <canvas id="${canvasId}"></canvas>
                    <p class="toa-chart-empty" data-empty-for="${canvasId}" hidden>No chart data available for this section.</p>
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

        const tab = event.target.closest('.toa-analytics-tab[data-view]');
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

        this.querySelectorAll('.toa-analytics-tab').forEach((button) => {
            const isActive = button.dataset.view === view;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        this.querySelectorAll('.toa-analytics-panel').forEach((panel) => {
            const isActive = panel.dataset.view === view;
            panel.classList.toggle('active', isActive);
            panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
        });

        if (refresh) {
            this.refresh();
        }
    }

    setDefaultReportPeriod() {
        const fromInput = this.querySelector('#toReportFromDate');
        const toInput = this.querySelector('#toReportToDate');
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
            } else if (view === 'spare-parts') {
                await this.loadSparePartsAnalytics();
            } else if (view === 'work-updates') {
                await this.loadWorkUpdateAnalytics();
            } else if (view === 'assets') {
                await this.loadAssetAnalytics();
            } else if (view === 'notifications') {
                await this.loadNotificationAnalytics();
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
        const allTickets = this.extractArrayFromResponse(response, ['data.tickets', 'data']);
        const tickets = this.filterTicketsForCurrentOfficer(allTickets);

        const statusCounts = this.aggregateCounts(
            tickets.map((ticket) => this.toTitle(ticket.status || 'Pending'))
        );
        const priorityCounts = this.aggregateCounts(
            tickets.map((ticket) => this.toTitle(ticket.priority || 'Medium'))
        );

        const activeStatuses = new Set([
            'open',
            'assigned',
            'pending',
            'waiting-for-spare-parts',
            'parts-approved',
            'in-progress',
            'repair-in-progress',
            'waiting-for-budget-approval',
            'garage-approved',
            'garage-entry-logged'
        ]);
        const resolvedStatuses = new Set(['resolved', 'completed', 'closed', 'insurance-claimed']);

        let activeCount = 0;
        let resolvedCount = 0;
        let waitingPartsCount = 0;

        tickets.forEach((ticket) => {
            const statusKey = this.normalizeKey(ticket.status);
            if (activeStatuses.has(statusKey)) {
                activeCount += 1;
            }

            if (resolvedStatuses.has(statusKey)) {
                resolvedCount += 1;
            }

            if (statusKey === 'waiting-for-spare-parts') {
                waitingPartsCount += 1;
            }
        });

        this.renderSummary('toSummaryTickets', [
            { label: 'Assigned Tickets', value: tickets.length },
            { label: 'Active Flow', value: activeCount },
            { label: 'Waiting for Parts', value: waitingPartsCount },
            { label: 'Resolved / Closed', value: resolvedCount },
        ]);

        this.renderDoughnutChart('toTicketStatusChart', this.sortEntriesDesc(statusCounts), 'Tickets');
        this.renderBarChart('toTicketPriorityChart', this.sortEntriesDesc(priorityCounts), 'Tickets');
    }

    async loadSparePartsAnalytics() {
        const response = await this.safeGet('/spare-part-requests', 'Failed to load spare part requests');
        const rawRequests = this.extractArrayFromResponse(response, ['data.requests', 'data']);
        const requests = this.filterRequestsForCurrentOfficer(rawRequests);

        const statusCounts = this.aggregateCounts(
            requests.map((request) => this.toTitle(request.status || 'Pending'))
        );

        const partDemand = {};
        let pendingCount = 0;
        let approvedOrIssuedCount = 0;
        let rejectedCount = 0;

        requests.forEach((request) => {
            const statusKey = this.normalizeKey(request.status);
            if (statusKey === 'pending') {
                pendingCount += 1;
            }

            if (statusKey === 'approved' || statusKey === 'issued') {
                approvedOrIssuedCount += 1;
            }

            if (statusKey === 'rejected') {
                rejectedCount += 1;
            }

            const items = Array.isArray(request.items) ? request.items : [];
            items.forEach((item) => {
                const label = String(item.part_name || item.part_code || 'Unknown Part').trim() || 'Unknown Part';
                const quantity = Math.max(this.toNumber(item.quantity), 0) || 1;
                partDemand[label] = (partDemand[label] || 0) + quantity;
            });
        });

        const topParts = this.sortEntriesDesc(partDemand).slice(0, 8);

        this.renderSummary('toSummarySpareParts', [
            { label: 'Total Requests', value: requests.length },
            { label: 'Pending', value: pendingCount },
            { label: 'Approved / Issued', value: approvedOrIssuedCount },
            { label: 'Rejected', value: rejectedCount },
        ]);

        this.renderDoughnutChart('toSpareStatusChart', this.sortEntriesDesc(statusCounts), 'Requests');
        this.renderBarChart('toSpareTopPartsChart', topParts, 'Quantity');
    }

    async loadWorkUpdateAnalytics() {
        const response = await this.safeGet('/fault-tickets', 'Failed to load fault tickets');
        const allTickets = this.extractArrayFromResponse(response, ['data.tickets', 'data']);
        const tickets = this.filterTicketsForCurrentOfficer(allTickets);

        let totalUpdates = 0;
        let totalHours = 0;
        let ticketsWithUpdates = 0;
        const ticketHoursMap = {};
        const updateTimeline = [];

        tickets.forEach((ticket) => {
            const updates = Array.isArray(ticket.work_updates) ? ticket.work_updates : [];
            if (updates.length > 0) {
                ticketsWithUpdates += 1;
            }

            const ticketLabel = this.getTicketDisplayId(ticket);
            let ticketHours = 0;

            updates.forEach((update) => {
                const hours = Math.max(this.toNumber(update.time_spent), 0);
                totalUpdates += 1;
                totalHours += hours;
                ticketHours += hours;

                updateTimeline.push({
                    date: update.created_at || update.updated_at || null,
                    hours,
                });
            });

            if (ticketHours > 0) {
                ticketHoursMap[ticketLabel] = (ticketHoursMap[ticketLabel] || 0) + ticketHours;
            }
        });

        const averageHours = ticketsWithUpdates > 0 ? totalHours / ticketsWithUpdates : 0;
        const hoursByTicketEntries = this.sortEntriesDesc(ticketHoursMap).slice(0, 8);
        const trendSeries = this.buildWeeklyWorkSeries(updateTimeline, 8);

        this.renderSummary('toSummaryWorkUpdates', [
            { label: 'Total Updates', value: totalUpdates },
            { label: 'Hours Logged', value: `${totalHours.toFixed(1)} h` },
            { label: 'Tickets Updated', value: ticketsWithUpdates },
            { label: 'Avg Hours / Ticket', value: `${averageHours.toFixed(1)} h` },
        ]);

        this.renderBarChart('toWorkHoursChart', hoursByTicketEntries, 'Hours');
        this.renderDualLineChart('toWorkTrendChart', trendSeries);
    }

    async loadAssetAnalytics() {
        const [vehicleResult, machineResult] = await Promise.allSettled([
            this.safeGet('/vehicles', 'Failed to load vehicles'),
            this.safeGet('/machines', 'Failed to load machines'),
        ]);

        const vehicles = this.extractArrayFromSettled(vehicleResult, ['data.vehicles', 'data']);
        const machines = this.extractArrayFromSettled(machineResult, ['data.machines', 'data']);

        if (vehicles.length === 0 && machines.length === 0) {
            throw new Error('Failed to load asset analytics data');
        }

        const typeSplit = {
            Vehicles: vehicles.length,
            Machines: machines.length,
        };

        const statusCounts = this.aggregateCounts([
            ...vehicles.map((vehicle) => this.toTitle(vehicle.status || 'Active')),
            ...machines.map((machine) => this.toTitle(machine.status || 'Active')),
        ]);

        const activeStates = new Set(['active', 'available', 'operational', 'in-service', 'serviceable']);
        let activeAssets = 0;

        [...vehicles, ...machines].forEach((asset) => {
            if (activeStates.has(this.normalizeKey(asset.status))) {
                activeAssets += 1;
            }
        });

        this.renderSummary('toSummaryAssets', [
            { label: 'Total Assets', value: vehicles.length + machines.length },
            { label: 'Vehicles', value: vehicles.length },
            { label: 'Machines', value: machines.length },
            { label: 'Active Assets', value: activeAssets },
        ]);

        this.renderDoughnutChart('toAssetTypeChart', this.entriesFromObject(typeSplit), 'Assets');
        this.renderBarChart('toAssetStatusChart', this.sortEntriesDesc(statusCounts), 'Assets');
    }

    async loadNotificationAnalytics() {
        const response = await this.safeGet('/notifications?limit=100', 'Failed to load notifications');
        const notifications = this.extractArrayFromResponse(response, ['data.notifications', 'data']);

        const unreadCountFromApi = this.toNumber(this.readPath(response, 'data.unread_count'));
        const unreadCountComputed = notifications.filter((item) => Number(item?.is_read) !== 1).length;
        const unreadCount = unreadCountFromApi > 0 ? unreadCountFromApi : unreadCountComputed;
        const readCount = Math.max(notifications.length - unreadCount, 0);

        const typeCounts = this.aggregateCounts(
            notifications.map((notification) => this.toTitle(notification.type || 'Info'))
        );

        this.renderSummary('toSummaryNotifications', [
            { label: 'Total Notifications', value: notifications.length },
            { label: 'Unread', value: unreadCount },
            { label: 'Read', value: readCount },
            { label: 'Types', value: Object.keys(typeCounts).length },
        ]);

        this.renderDoughnutChart('toNotificationReadChart', [
            { label: 'Unread', value: unreadCount },
            { label: 'Read', value: readCount },
        ], 'Notifications');

        this.renderBarChart('toNotificationTypeChart', this.sortEntriesDesc(typeCounts), 'Notifications');
    }

    async generateReport() {
        try {
            this.setGeneratingState(true);
            this.setReportStatus('Generating report...', 'info');

            const period = this.getReportPeriod();
            const selectedScope = String(this.querySelector('#toReportScope')?.value || 'active').trim();
            const scope = selectedScope === 'active' ? this._activeView : selectedScope;

            const report = await this.buildReportForScope(scope, period, selectedScope);
            this._generatedReport = report;

            this.renderReportPreview(report);
            this.updateDownloadButtonState(true);

            const rowCount = Array.isArray(report.rows) ? report.rows.length : 0;
            this.setReportStatus(`Report generated successfully (${rowCount} rows).`, 'success');
        } catch (error) {
            console.error('Technical officer analytics report generation failed:', error);
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

        if (scope === 'spare-parts') {
            return this.buildSparePartsReport(period, selectedScope);
        }

        if (scope === 'work-updates') {
            return this.buildWorkUpdatesReport(period, selectedScope);
        }

        if (scope === 'assets') {
            return this.buildAssetsReport(period, selectedScope);
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
        const response = await this.safeGet('/fault-tickets', 'Failed to load fault tickets');
        const allTickets = this.extractArrayFromResponse(response, ['data.tickets', 'data']);
        const tickets = this.filterTicketsForCurrentOfficer(allTickets)
            .filter((ticket) => this.isWithinPeriod(this.extractDate(ticket?.created_at, ticket?.updated_at), period));

        const rows = tickets.map((ticket) => ({
            ticket_id: this.getTicketDisplayId(ticket),
            status: this.toTitle(ticket.status || 'Pending'),
            priority: this.toTitle(ticket.priority || 'Medium'),
            location: ticket.location || '',
            created_at: ticket.created_at || '',
            assignments: this.extractTicketAssignees(ticket),
        }));

        const summary = {
            assigned_tickets: rows.length,
            active_flow: rows.filter((row) => {
                const status = this.normalizeKey(row.status);
                return status !== 'resolved' && status !== 'closed' && status !== 'completed';
            }).length,
            waiting_for_parts: rows.filter((row) => this.normalizeKey(row.status) === 'waiting-for-spare-parts').length,
            resolved_or_closed: rows.filter((row) => {
                const status = this.normalizeKey(row.status);
                return status === 'resolved' || status === 'closed' || status === 'completed';
            }).length,
        };

        return {
            scope: selectedScope,
            reportType: 'Ticket Analytics',
            generatedAt: new Date().toISOString(),
            period,
            summary,
            columns: [
                { key: 'ticket_id', label: 'Ticket ID' },
                { key: 'status', label: 'Status' },
                { key: 'priority', label: 'Priority' },
                { key: 'location', label: 'Location' },
                { key: 'created_at', label: 'Created At' },
                { key: 'assignments', label: 'Assignments' },
            ],
            rows,
        };
    }

    async buildSparePartsReport(period, selectedScope) {
        const response = await this.safeGet('/spare-part-requests', 'Failed to load spare part requests');
        const rawRequests = this.extractArrayFromResponse(response, ['data.requests', 'data']);
        const requests = this.filterRequestsForCurrentOfficer(rawRequests)
            .filter((request) => this.isWithinPeriod(this.extractDate(request?.created_at, request?.requested_at), period));

        const rows = requests.map((request) => {
            const items = Array.isArray(request.items) ? request.items : [];
            const quantity = items.reduce((sum, item) => sum + Math.max(this.toNumber(item.quantity), 0), 0);

            return {
                request_id: request.request_id || request.id || '',
                status: this.toTitle(request.status || 'Pending'),
                priority: this.toTitle(request.priority || request.ticket_priority || 'Medium'),
                item_count: items.length,
                total_quantity: quantity,
                created_at: request.created_at || '',
            };
        });

        const summary = {
            total_requests: rows.length,
            pending_requests: rows.filter((row) => this.normalizeKey(row.status) === 'pending').length,
            approved_or_issued: rows.filter((row) => {
                const status = this.normalizeKey(row.status);
                return status === 'approved' || status === 'issued';
            }).length,
            rejected_requests: rows.filter((row) => this.normalizeKey(row.status) === 'rejected').length,
        };

        return {
            scope: selectedScope,
            reportType: 'Spare Part Analytics',
            generatedAt: new Date().toISOString(),
            period,
            summary,
            columns: [
                { key: 'request_id', label: 'Request ID' },
                { key: 'status', label: 'Status' },
                { key: 'priority', label: 'Priority' },
                { key: 'item_count', label: 'Item Count' },
                { key: 'total_quantity', label: 'Total Quantity' },
                { key: 'created_at', label: 'Created At' },
            ],
            rows,
        };
    }

    async buildWorkUpdatesReport(period, selectedScope) {
        const response = await this.safeGet('/fault-tickets', 'Failed to load fault tickets');
        const allTickets = this.extractArrayFromResponse(response, ['data.tickets', 'data']);
        const tickets = this.filterTicketsForCurrentOfficer(allTickets);

        const rows = [];

        tickets.forEach((ticket) => {
            const ticketId = this.getTicketDisplayId(ticket);
            const updates = Array.isArray(ticket.work_updates) ? ticket.work_updates : [];

            updates.forEach((update) => {
                const updateDate = this.extractDate(update?.created_at, update?.updated_at);
                if (!this.isWithinPeriod(updateDate, period)) {
                    return;
                }

                rows.push({
                    ticket_id: ticketId,
                    update_id: update.id || '',
                    time_spent_hours: Math.max(this.toNumber(update.time_spent), 0),
                    parts_used: update.parts_used || '',
                    work_description: update.work_description || '',
                    created_at: update.created_at || update.updated_at || '',
                });
            });
        });

        const totalHours = rows.reduce((sum, row) => sum + this.toNumber(row.time_spent_hours), 0);
        const uniqueTickets = new Set(rows.map((row) => row.ticket_id)).size;

        const summary = {
            total_updates: rows.length,
            total_hours_logged: Number(totalHours.toFixed(2)),
            tickets_updated: uniqueTickets,
            average_hours_per_update: rows.length > 0 ? Number((totalHours / rows.length).toFixed(2)) : 0,
        };

        return {
            scope: selectedScope,
            reportType: 'Work Update Analytics',
            generatedAt: new Date().toISOString(),
            period,
            summary,
            columns: [
                { key: 'ticket_id', label: 'Ticket ID' },
                { key: 'update_id', label: 'Update ID' },
                { key: 'time_spent_hours', label: 'Time Spent (h)' },
                { key: 'parts_used', label: 'Parts Used' },
                { key: 'work_description', label: 'Work Description' },
                { key: 'created_at', label: 'Created At' },
            ],
            rows,
        };
    }

    async buildAssetsReport(period, selectedScope) {
        const [vehicleResponse, machineResponse] = await Promise.all([
            this.safeGet('/vehicles', 'Failed to load vehicles'),
            this.safeGet('/machines', 'Failed to load machines'),
        ]);

        const vehicles = this.extractArrayFromResponse(vehicleResponse, ['data.vehicles', 'data'])
            .filter((vehicle) => this.isWithinPeriodOrUndated(this.extractDate(vehicle?.created_at, vehicle?.updated_at), period));
        const machines = this.extractArrayFromResponse(machineResponse, ['data.machines', 'data'])
            .filter((machine) => this.isWithinPeriodOrUndated(this.extractDate(machine?.created_at, machine?.updated_at), period));

        const rows = [
            ...vehicles.map((vehicle) => ({
                asset_type: 'Vehicle',
                asset_id: vehicle.vehicle_id || vehicle.id || '',
                asset_name: vehicle.vehicle_name || vehicle.number_plate || '',
                status: this.toTitle(vehicle.status || 'Active'),
                created_at: vehicle.created_at || '',
            })),
            ...machines.map((machine) => ({
                asset_type: 'Machine',
                asset_id: machine.machine_id || machine.id || '',
                asset_name: machine.machine_name || machine.model_number || '',
                status: this.toTitle(machine.status || 'Active'),
                created_at: machine.created_at || '',
            })),
        ];

        const summary = {
            total_assets: rows.length,
            vehicles: rows.filter((row) => row.asset_type === 'Vehicle').length,
            machines: rows.filter((row) => row.asset_type === 'Machine').length,
            active_assets: rows.filter((row) => {
                const status = this.normalizeKey(row.status);
                return status === 'active' || status === 'available' || status === 'operational' || status === 'in-service';
            }).length,
        };

        return {
            scope: selectedScope,
            reportType: 'Asset Analytics',
            generatedAt: new Date().toISOString(),
            period,
            summary,
            columns: [
                { key: 'asset_type', label: 'Asset Type' },
                { key: 'asset_id', label: 'Asset ID' },
                { key: 'asset_name', label: 'Asset Name' },
                { key: 'status', label: 'Status' },
                { key: 'created_at', label: 'Created At' },
            ],
            rows,
        };
    }

    async buildNotificationsReport(period, selectedScope) {
        const response = await this.safeGet('/notifications?limit=100', 'Failed to load notifications');
        const notifications = this.extractArrayFromResponse(response, ['data.notifications', 'data'])
            .filter((notification) => this.isWithinPeriod(this.extractDate(notification?.created_at), period));

        const rows = notifications.map((notification) => ({
            notification_id: notification.notification_id || notification.id || '',
            title: notification.title || '',
            type: this.toTitle(notification.type || 'Info'),
            is_read: Number(notification.is_read) === 1 ? 'Yes' : 'No',
            created_at: notification.created_at || '',
            message: notification.message || '',
        }));

        const summary = {
            total_notifications: rows.length,
            unread: rows.filter((row) => row.is_read === 'No').length,
            read: rows.filter((row) => row.is_read === 'Yes').length,
            types_present: new Set(rows.map((row) => row.type)).size,
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
            rows,
        };
    }

    async buildAllAnalyticsReport(period, selectedScope) {
        const [tickets, spareParts, workUpdates, assets, notifications] = await Promise.all([
            this.buildTicketsReport(period, 'tickets'),
            this.buildSparePartsReport(period, 'spare-parts'),
            this.buildWorkUpdatesReport(period, 'work-updates'),
            this.buildAssetsReport(period, 'assets'),
            this.buildNotificationsReport(period, 'notifications'),
        ]);

        const reports = [tickets, spareParts, workUpdates, assets, notifications];
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
        const fromRaw = String(this.querySelector('#toReportFromDate')?.value || '').trim();
        const toRaw = String(this.querySelector('#toReportToDate')?.value || '').trim();

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

    isWithinPeriodOrUndated(date, period) {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
            return !period.from && !period.to;
        }

        return this.isWithinPeriod(date, period);
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
        const button = this.querySelector('#toReportDownloadBtn');
        if (!button) {
            return;
        }

        button.disabled = !enabled;
    }

    setReportStatus(message, type = 'info') {
        const statusEl = this.querySelector('#toReportStatus');
        if (!statusEl) {
            return;
        }

        statusEl.className = `toa-report-status ${type}`;
        statusEl.textContent = message;
    }

    renderReportPreview(report) {
        const previewEl = this.querySelector('#toReportPreview');
        if (!previewEl) {
            return;
        }

        const summaryHtml = Object.entries(report.summary || {})
            .map(([key, value]) => {
                const label = this.toLabel(key);
                return `
                    <div class="toa-report-summary-item">
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
            ? `<div class="toa-report-truncated-note">Showing first ${previewRows.length} rows out of ${rows.length}.</div>`
            : '';

        const tableSection = columns.length > 0
            ? `
                <div class="toa-report-table-wrap">
                    <table class="toa-report-table" id="toReportTable">
                        <thead><tr>${tableHeader}</tr></thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>
                ${truncatedNote}
            `
            : '<div class="toa-report-empty">No tabular rows available for this report.</div>';

        previewEl.innerHTML = `
            <div class="toa-report-preview-card">
                <div class="toa-report-meta">
                    <h3>${this.escapeHtml(report.reportType)}</h3>
                    <p>Period: ${this.escapeHtml(periodText)} | Generated: ${this.escapeHtml(this.formatDateTime(report.generatedAt))}</p>
                </div>
                <div class="toa-report-summary-grid">${summaryHtml || '<div class="toa-report-empty">No summary metrics found.</div>'}</div>
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
        anchor.download = `technical-officer-${scopeLabel}-report-${fileStamp}.csv`;
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

    filterTicketsForCurrentOfficer(tickets) {
        const normalized = Array.isArray(tickets) ? tickets : [];
        const userId = Number(this._currentUser?.id);

        if (!Number.isFinite(userId)) {
            return normalized;
        }

        return normalized.filter((ticket) => {
            const assignments = Array.isArray(ticket.assignments) ? ticket.assignments : [];
            const assigned = assignments.some((assignment) => {
                const assignedTo = Number(
                    assignment.assigned_to
                    || assignment.assigned_to_id
                    || assignment.technician_id
                    || assignment.user_id
                );

                return Number.isFinite(assignedTo) && assignedTo === userId;
            });

            if (assigned) {
                return true;
            }

            const reportedBy = Number(ticket.reported_by || ticket.reported_by_id);
            return Number.isFinite(reportedBy) && reportedBy === userId;
        });
    }

    filterRequestsForCurrentOfficer(requests) {
        const normalized = Array.isArray(requests) ? requests : [];
        const userId = Number(this._currentUser?.id);

        if (!Number.isFinite(userId)) {
            return normalized;
        }

        const hasRequesterInfo = normalized.some((request) => request && request.requested_by != null);
        if (!hasRequesterInfo) {
            return normalized;
        }

        return normalized.filter((request) => Number(request?.requested_by) === userId);
    }

    getTicketDisplayId(ticket) {
        if (ticket?.breakdown_report_id) {
            return String(ticket.breakdown_report_id);
        }

        if (ticket?.ticket_id) {
            return String(ticket.ticket_id);
        }

        if (ticket?.id) {
            return `#${ticket.id}`;
        }

        return 'Unknown';
    }

    buildWeeklyWorkSeries(entries, maxWeeks = 8) {
        const weekMap = new Map();

        entries.forEach((entry) => {
            const weekKey = this.getWeekStart(entry.date);
            if (!weekKey) {
                return;
            }

            const current = weekMap.get(weekKey) || { hours: 0, updates: 0 };
            current.hours += Math.max(this.toNumber(entry.hours), 0);
            current.updates += 1;
            weekMap.set(weekKey, current);
        });

        const sortedWeekKeys = Array.from(weekMap.keys()).sort();
        const selectedWeekKeys = sortedWeekKeys.slice(-Math.max(maxWeeks, 1));

        return {
            labels: selectedWeekKeys.map((key) => this.formatWeekLabel(key)),
            hoursData: selectedWeekKeys.map((key) => Number((weekMap.get(key)?.hours || 0).toFixed(2))),
            updatesData: selectedWeekKeys.map((key) => weekMap.get(key)?.updates || 0),
        };
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

    renderSummary(containerId, metrics) {
        const container = this.querySelector(`#${containerId}`);
        if (!container) {
            return;
        }

        container.innerHTML = metrics.map((metric) => {
            return `
                <div class="toa-kpi-card">
                    <span class="toa-kpi-label">${this.escapeHtml(metric.label)}</span>
                    <span class="toa-kpi-value">${this.escapeHtml(String(metric.value))}</span>
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

    renderDualLineChart(canvasId, trendSeries) {
        this.renderChart(canvasId, {
            type: 'line',
            data: {
                labels: trendSeries.labels,
                datasets: [
                    {
                        label: 'Hours Logged',
                        data: trendSeries.hoursData,
                        borderColor: 'rgba(37, 99, 235, 1)',
                        backgroundColor: 'rgba(37, 99, 235, 0.16)',
                        tension: 0.3,
                        fill: true,
                    },
                    {
                        label: 'Update Count',
                        data: trendSeries.updatesData,
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

    sortEntriesDesc(source) {
        return Object.entries(source)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value);
    }

    entriesFromObject(source) {
        return Object.entries(source).map(([label, value]) => ({ label, value }));
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
            tickets: 'Ticket',
            'spare-parts': 'Spare Part',
            'work-updates': 'Work Update',
            assets: 'Asset',
            notifications: 'Notification',
        };

        return labels[view] || 'Analytics';
    }

    setStatus(message, type = 'info') {
        const statusEl = this.querySelector('#toAnalyticsStatus');
        if (!statusEl) {
            return;
        }

        statusEl.textContent = message;
        statusEl.className = 'toa-analytics-status';

        if (type) {
            statusEl.classList.add(type);
        }
    }

    emitToast(message, type = 'info') {
        this.dispatchEvent(new CustomEvent('technical-officer-analytics-hub:toast', {
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

if (!customElements.get('to-analytics-hub')) {
    customElements.define('to-analytics-hub', TOAnalyticsHub);
}