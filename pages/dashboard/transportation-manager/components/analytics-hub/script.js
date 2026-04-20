class TMAnalyticsHub extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this._activeView = 'trip';
        this._views = ['trip', 'fuel', 'cargo', 'driver', 'garage'];
        this._generatedReport = null;

        this.loadStyles();
        this.render();
        this.bindEvents();
        this.setDefaultReportPeriod();
        this.setReportStatus('Choose a period and generate a downloadable report.', 'info');
        this.updateDownloadButtonState(false);
        this.activateView(this.getInitialView(), { refresh: false });
    }

    loadStyles() {
        const linkId = 'tm-analytics-hub-styles';
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = './components/analytics-hub/style.css';
            document.head.appendChild(link);
        }
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-chart-bar"></i> Analytics</h2>
                <p class="page-subtitle">Select an analytics view and generate downloadable reports by time period.</p>
            </div>

            <div class="tm-analytics-hub-nav" role="tablist" aria-label="Analytics views">
                <button type="button" class="analytics-option-btn" role="tab" data-view="trip">Trip Analytics</button>
                <button type="button" class="analytics-option-btn" role="tab" data-view="fuel">Fuel Analytics</button>
                <button type="button" class="analytics-option-btn" role="tab" data-view="cargo">Cargo Analytics</button>
                <button type="button" class="analytics-option-btn" role="tab" data-view="driver">Driver Analytics</button>
                <button type="button" class="analytics-option-btn" role="tab" data-view="garage">Garage Analytics</button>
            </div>

            <div class="tm-report-toolbar">
                <div class="report-toolbar-group">
                    <label class="report-toolbar-label" for="tmReportFromDate">From Date</label>
                    <input id="tmReportFromDate" class="report-toolbar-field" type="date">
                </div>
                <div class="report-toolbar-group">
                    <label class="report-toolbar-label" for="tmReportToDate">To Date</label>
                    <input id="tmReportToDate" class="report-toolbar-field" type="date">
                </div>
                <div class="report-toolbar-group">
                    <label class="report-toolbar-label" for="tmReportScope">Report Type</label>
                    <select id="tmReportScope" class="report-toolbar-field">
                        <option value="active">Active Analytics View</option>
                        <option value="trip">Trip Analytics</option>
                        <option value="fuel">Fuel Analytics</option>
                        <option value="cargo">Cargo Analytics</option>
                        <option value="driver">Driver Analytics</option>
                        <option value="garage">Garage Analytics</option>
                        <option value="all">All Analytics Summary</option>
                    </select>
                </div>
                <div class="report-toolbar-actions">
                    <button type="button" class="btn btn-primary" data-action="generate-report">
                        <i class="fas fa-file-lines"></i> Generate Report
                    </button>
                    <button type="button" class="btn btn-secondary" data-action="download-report" id="tmReportDownloadBtn" disabled>
                        <i class="fas fa-download"></i> Download CSV
                    </button>
                </div>
            </div>

            <div id="tmReportStatus" class="tm-report-status"></div>
            <div id="tmReportPreview" class="tm-report-preview"></div>

            <div class="tm-analytics-panel" data-view="trip" role="tabpanel">
                <tm-trip-analytics></tm-trip-analytics>
            </div>
            <div class="tm-analytics-panel" data-view="fuel" role="tabpanel">
                <tm-fuel-analytics></tm-fuel-analytics>
            </div>
            <div class="tm-analytics-panel" data-view="cargo" role="tabpanel">
                <tm-cargo-analytics></tm-cargo-analytics>
            </div>
            <div class="tm-analytics-panel" data-view="driver" role="tabpanel">
                <tm-driver-analytics></tm-driver-analytics>
            </div>
            <div class="tm-analytics-panel" data-view="garage" role="tabpanel">
                <tm-garage-analytics></tm-garage-analytics>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
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

            const optionBtn = event.target.closest('.analytics-option-btn[data-view]');
            if (!optionBtn) {
                return;
            }

            this.activateView(optionBtn.dataset.view || '', { refresh: true });
        });
    }

    setDefaultReportPeriod() {
        const fromInput = this.querySelector('#tmReportFromDate');
        const toInput = this.querySelector('#tmReportToDate');
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
        const mapping = {
            'trip-analytics': 'trip',
            'fuel-analytics': 'fuel',
            'cargo-analytics': 'cargo',
            'driver-analytics': 'driver',
            'garage-analytics': 'garage',
        };

        const params = new URLSearchParams(window.location.search);
        const section = String(params.get('section') || '').trim();
        if (mapping[section]) {
            return mapping[section];
        }

        const explicit = String(this.getAttribute('default-view') || '').trim();
        if (this._views.includes(explicit)) {
            return explicit;
        }

        return 'trip';
    }

    getComponentForView(view) {
        const map = {
            trip: 'tm-trip-analytics',
            fuel: 'tm-fuel-analytics',
            cargo: 'tm-cargo-analytics',
            driver: 'tm-driver-analytics',
            garage: 'tm-garage-analytics',
        };

        const selector = map[view];
        if (!selector) {
            return null;
        }

        return this.querySelector(selector);
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

        this.querySelectorAll('.tm-analytics-panel').forEach((panel) => {
            const isActive = panel.dataset.view === view;
            panel.classList.toggle('active', isActive);
            panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
        });

        if (refresh) {
            const component = this.getComponentForView(view);
            if (component && typeof component.refresh === 'function') {
                component.refresh();
            }
        }

        this.dispatchEvent(new CustomEvent('tm-analytics-hub:view-changed', {
            detail: { view },
            bubbles: true,
        }));
    }

    async generateReport() {
        try {
            this.setGeneratingState(true);
            this.setReportStatus('Generating report...', 'info');

            const period = this.getReportPeriod();
            const selectedScope = String(this.querySelector('#tmReportScope')?.value || 'active').trim();
            const scope = selectedScope === 'active' ? this._activeView : selectedScope;

            const report = await this.buildReportForScope(scope, period, selectedScope);
            this._generatedReport = report;
            this.renderReportPreview(report);
            this.updateDownloadButtonState(true);

            const rowCount = Array.isArray(report.rows) ? report.rows.length : 0;
            this.setReportStatus(`Report generated successfully (${rowCount} rows).`, 'success');
        } catch (error) {
            console.error('TM analytics report generation failed:', error);
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

        if (scope === 'fuel') {
            return this.buildFuelReport(period, selectedScope);
        }

        if (scope === 'cargo') {
            return this.buildCargoReport(period, selectedScope);
        }

        if (scope === 'driver') {
            return this.buildDriverReport(period, selectedScope);
        }

        if (scope === 'garage') {
            return this.buildGarageReport(period, selectedScope);
        }

        if (scope === 'all') {
            return this.buildAllAnalyticsReport(period, selectedScope);
        }

        throw new Error('Unsupported report type selected.');
    }

    async buildTripReport(period, selectedScope) {
        const trips = await this.fetchTrips();
        const filteredTrips = trips.filter((trip) => this.isWithinPeriod(this.extractTripDate(trip), period));

        const rows = filteredTrips.map((trip) => {
            const startOdo = Number.parseFloat(trip.starting_odometer);
            const endOdo = Number.parseFloat(trip.final_odometer);
            const distance = Number.isFinite(startOdo) && Number.isFinite(endOdo) && endOdo >= startOdo
                ? Number((endOdo - startOdo).toFixed(2))
                : '';

            return {
                trip_id: trip.trip_id || '',
                status: trip.status || '',
                origin: trip.origin || '',
                destination: trip.destination || '',
                driver: trip.driver_name || (trip.driver_id ? `Driver #${trip.driver_id}` : ''),
                vehicle: trip.vehicle_registration || '',
                start_time: trip.start_time || '',
                end_time: trip.end_time || '',
                distance_km: distance,
            };
        });

        const summary = {
            total_trips: filteredTrips.length,
            pending_or_accepted: filteredTrips.filter((trip) => {
                const status = this.normalizeTripStatus(trip.status);
                return status === 'Pending' || status === 'Accepted';
            }).length,
            in_progress: filteredTrips.filter((trip) => this.normalizeTripStatus(trip.status) === 'In Progress').length,
            completed: filteredTrips.filter((trip) => this.normalizeTripStatus(trip.status) === 'Completed').length,
            rejected_or_cancelled: filteredTrips.filter((trip) => {
                const status = this.normalizeTripStatus(trip.status);
                return status === 'Rejected' || status === 'Cancelled';
            }).length,
        };

        return {
            scope: selectedScope,
            reportType: 'Trip Analytics',
            generatedAt: new Date().toISOString(),
            period,
            summary,
            columns: [
                { key: 'trip_id', label: 'Trip ID' },
                { key: 'status', label: 'Status' },
                { key: 'origin', label: 'Origin' },
                { key: 'destination', label: 'Destination' },
                { key: 'driver', label: 'Driver' },
                { key: 'vehicle', label: 'Vehicle' },
                { key: 'start_time', label: 'Start Time' },
                { key: 'end_time', label: 'End Time' },
                { key: 'distance_km', label: 'Distance (km)' },
            ],
            rows,
        };
    }

    async buildFuelReport(period, selectedScope) {
        const logs = await this.fetchFuelLogs();
        const filteredLogs = logs.filter((log) => {
            const date = log.log_datetime ? new Date(log.log_datetime) : null;
            return this.isWithinPeriod(date, period);
        });

        let totalVolume = 0;
        let totalCost = 0;
        let totalDistance = 0;
        let efficiencyCount = 0;
        let efficiencySum = 0;

        const rows = filteredLogs.map((log) => {
            const volume = Number.parseFloat(log.fuel_volume);
            const cost = Number.parseFloat(log.total_cost);
            const distance = Number.parseFloat(log.distance_since_last);
            const efficiency = Number.parseFloat(log.fuel_efficiency);

            if (Number.isFinite(volume)) {
                totalVolume += volume;
            }

            if (Number.isFinite(cost) && cost > 0) {
                totalCost += cost;
            }

            if (Number.isFinite(distance) && distance > 0) {
                totalDistance += distance;
            }

            if (Number.isFinite(efficiency) && efficiency > 0) {
                efficiencySum += efficiency;
                efficiencyCount += 1;
            }

            return {
                fuel_log_id: log.fuel_log_id || '',
                log_datetime: log.log_datetime || '',
                vehicle: log.vehicle_registration || '',
                driver: log.driver_name || (log.driver_id ? `Driver #${log.driver_id}` : ''),
                source: log.fuel_source || '',
                station: log.station_name || '',
                volume_l: Number.isFinite(volume) ? Number(volume.toFixed(2)) : '',
                total_cost_lkr: Number.isFinite(cost) ? Number(cost.toFixed(2)) : '',
                distance_km: Number.isFinite(distance) ? Number(distance.toFixed(2)) : '',
                efficiency_km_per_l: Number.isFinite(efficiency) ? Number(efficiency.toFixed(2)) : '',
            };
        });

        const summary = {
            total_entries: filteredLogs.length,
            total_volume_l: Number(totalVolume.toFixed(2)),
            total_cost_lkr: Number(totalCost.toFixed(2)),
            avg_efficiency_km_per_l: efficiencyCount > 0 ? Number((efficiencySum / efficiencyCount).toFixed(2)) : 0,
            avg_cost_per_km_lkr: totalDistance > 0 ? Number((totalCost / totalDistance).toFixed(2)) : 0,
        };

        return {
            scope: selectedScope,
            reportType: 'Fuel Analytics',
            generatedAt: new Date().toISOString(),
            period,
            summary,
            columns: [
                { key: 'fuel_log_id', label: 'Fuel Log ID' },
                { key: 'log_datetime', label: 'Log DateTime' },
                { key: 'vehicle', label: 'Vehicle' },
                { key: 'driver', label: 'Driver' },
                { key: 'source', label: 'Source' },
                { key: 'station', label: 'Station' },
                { key: 'volume_l', label: 'Volume (L)' },
                { key: 'total_cost_lkr', label: 'Total Cost (LKR)' },
                { key: 'distance_km', label: 'Distance (km)' },
                { key: 'efficiency_km_per_l', label: 'Efficiency (km/L)' },
            ],
            rows,
        };
    }

    async buildCargoReport(period, selectedScope) {
        const analytics = await this.fetchCargoAnalytics(period);
        const totals = analytics?.totals || {};
        const byItem = Array.isArray(analytics?.by_item) ? analytics.by_item : [];

        const rows = byItem.map((item) => ({
            cargo_item_id: item.cargo_item_id || '',
            name: item.name || '',
            unit: item.unit || '',
            dangerous: Number(item.is_dangerous) === 1 ? 'Yes' : 'No',
            total_quantity: Number(item.total_quantity || 0),
            trips_count: Number(item.trips_count || 0),
            last_transported_at: item.last_transported_at || '',
        }));

        const summary = {
            total_quantity_transported: Number(totals.total_quantity_transported || 0),
            dangerous_quantity_transported: Number(totals.dangerous_quantity_transported || 0),
            trips_with_cargo: Number(totals.trips_with_cargo || 0),
            dangerous_trips: Number(totals.dangerous_trips || 0),
        };

        return {
            scope: selectedScope,
            reportType: 'Cargo Analytics',
            generatedAt: new Date().toISOString(),
            period,
            summary,
            columns: [
                { key: 'cargo_item_id', label: 'Cargo Item ID' },
                { key: 'name', label: 'Cargo Item' },
                { key: 'unit', label: 'Unit' },
                { key: 'dangerous', label: 'Dangerous' },
                { key: 'total_quantity', label: 'Total Quantity' },
                { key: 'trips_count', label: 'Trips Count' },
                { key: 'last_transported_at', label: 'Last Transported At' },
            ],
            rows,
        };
    }

    async buildDriverReport(period, selectedScope) {
        const trips = await this.fetchTrips();
        const filteredTrips = trips.filter((trip) => this.isWithinPeriod(this.extractTripDate(trip), period));

        const driverMap = new Map();
        filteredTrips.forEach((trip) => {
            const driverName = String(trip.driver_name || '').trim();
            const driverId = Number(trip.driver_id || 0);
            const driverKey = driverName ? `name:${driverName.toLowerCase()}` : `id:${driverId}`;
            const driverLabel = driverName || (driverId > 0 ? `Driver #${driverId}` : 'Unassigned');

            if (!driverMap.has(driverKey)) {
                driverMap.set(driverKey, {
                    driver: driverLabel,
                    total_trips: 0,
                    pending_or_accepted: 0,
                    in_progress: 0,
                    completed: 0,
                    interrupted: 0,
                });
            }

            const row = driverMap.get(driverKey);
            row.total_trips += 1;

            const status = this.normalizeTripStatus(trip.status);
            if (status === 'Pending' || status === 'Accepted') {
                row.pending_or_accepted += 1;
            } else if (status === 'In Progress') {
                row.in_progress += 1;
            } else if (status === 'Completed') {
                row.completed += 1;
            } else {
                row.interrupted += 1;
            }
        });

        const rows = Array.from(driverMap.values())
            .map((row) => ({
                ...row,
                completion_rate_percent: row.total_trips > 0
                    ? Number(((row.completed / row.total_trips) * 100).toFixed(2))
                    : 0,
            }))
            .sort((a, b) => b.total_trips - a.total_trips);

        const totalTrips = rows.reduce((sum, row) => sum + row.total_trips, 0);
        const completedTrips = rows.reduce((sum, row) => sum + row.completed, 0);

        const summary = {
            drivers_with_trips: rows.length,
            total_trips: totalTrips,
            completed_trips: completedTrips,
            overall_completion_rate_percent: totalTrips > 0 ? Number(((completedTrips / totalTrips) * 100).toFixed(2)) : 0,
        };

        return {
            scope: selectedScope,
            reportType: 'Driver Analytics',
            generatedAt: new Date().toISOString(),
            period,
            summary,
            columns: [
                { key: 'driver', label: 'Driver' },
                { key: 'total_trips', label: 'Total Trips' },
                { key: 'pending_or_accepted', label: 'Pending/Accepted' },
                { key: 'in_progress', label: 'In Progress' },
                { key: 'completed', label: 'Completed' },
                { key: 'interrupted', label: 'Rejected/Cancelled' },
                { key: 'completion_rate_percent', label: 'Completion Rate (%)' },
            ],
            rows,
        };
    }

    async buildGarageReport(period, selectedScope) {
        const breakdowns = await this.fetchRouteBreakdowns();
        const filtered = breakdowns.filter((row) => this.isWithinPeriod(this.extractBreakdownDate(row), period));

        const statusCounts = new Map();
        const rows = filtered.map((row) => {
            const workflowStatus = this.normalizeGarageWorkflowStatus(row);
            statusCounts.set(workflowStatus, (statusCounts.get(workflowStatus) || 0) + 1);

            const billAmount = this.getGarageBillAmount(row);

            return {
                route_breakdown_id: row.route_breakdown_id || '',
                breakdown_datetime: row.breakdown_datetime || '',
                number_plate: row.number_plate || '',
                driver: row.driver_name || '',
                severity: row.severity || '',
                workflow_status: workflowStatus,
                approved_garage: this.getApprovedGarageName(row),
                bill_amount_lkr: Number.isFinite(billAmount) ? Number(billAmount.toFixed(2)) : '',
                completed_at: row.garage_workflow?.completed_at || row.completed_at || '',
            };
        });

        const summary = {
            total_breakdowns: filtered.length,
            awaiting_approval: statusCounts.get('awaiting_supervisor_approval') || 0,
            garage_approved: statusCounts.get('garage_approved') || 0,
            garage_entry_logged: statusCounts.get('garage_entry_logged') || 0,
            repair_in_progress: statusCounts.get('repair_in_progress') || 0,
            completed: statusCounts.get('completed') || 0,
        };

        return {
            scope: selectedScope,
            reportType: 'Garage Analytics',
            generatedAt: new Date().toISOString(),
            period,
            summary,
            columns: [
                { key: 'route_breakdown_id', label: 'Route Breakdown ID' },
                { key: 'breakdown_datetime', label: 'Breakdown DateTime' },
                { key: 'number_plate', label: 'Vehicle' },
                { key: 'driver', label: 'Driver' },
                { key: 'severity', label: 'Severity' },
                { key: 'workflow_status', label: 'Workflow Status' },
                { key: 'approved_garage', label: 'Approved Garage' },
                { key: 'bill_amount_lkr', label: 'Bill Amount (LKR)' },
                { key: 'completed_at', label: 'Completed At' },
            ],
            rows,
        };
    }

    async buildAllAnalyticsReport(period, selectedScope) {
        const [tripReport, fuelReport, cargoReport, driverReport, garageReport] = await Promise.all([
            this.buildTripReport(period, 'trip'),
            this.buildFuelReport(period, 'fuel'),
            this.buildCargoReport(period, 'cargo'),
            this.buildDriverReport(period, 'driver'),
            this.buildGarageReport(period, 'garage'),
        ]);

        const reports = [tripReport, fuelReport, cargoReport, driverReport, garageReport];
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
            sections_included: reports.length,
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

    async fetchTrips() {
        const response = await API.get('/trips');
        if (!this.isSuccessResponse(response)) {
            throw new Error(response?.message || 'Failed to load trips for reporting.');
        }

        const trips = response?.data?.trips;
        return Array.isArray(trips) ? trips : [];
    }

    async fetchFuelLogs() {
        const response = await API.get('/fuel-logs');
        if (!this.isSuccessResponse(response)) {
            throw new Error(response?.message || 'Failed to load fuel logs for reporting.');
        }

        const logs = response?.data?.fuel_logs;
        return Array.isArray(logs) ? logs : [];
    }

    async fetchCargoAnalytics(period) {
        const params = new URLSearchParams();
        if (period.fromRaw) {
            params.set('from_date', period.fromRaw);
        }

        if (period.toRaw) {
            params.set('to_date', period.toRaw);
        }

        const query = params.toString();
        const endpoint = query ? `/trips/cargo-analytics?${query}` : '/trips/cargo-analytics';
        const response = await API.get(endpoint);
        if (!this.isSuccessResponse(response)) {
            throw new Error(response?.message || 'Failed to load cargo analytics for reporting.');
        }

        return response?.data || {};
    }

    async fetchRouteBreakdowns() {
        const response = await API.get('/route-breakdowns');
        if (!this.isSuccessResponse(response)) {
            throw new Error(response?.message || 'Failed to load route breakdowns for reporting.');
        }

        const rows = response?.data?.breakdowns;
        return Array.isArray(rows) ? rows : [];
    }

    isSuccessResponse(response) {
        return !!response && (response.success === true || response.status === 'success');
    }

    getReportPeriod() {
        const fromRaw = String(this.querySelector('#tmReportFromDate')?.value || '').trim();
        const toRaw = String(this.querySelector('#tmReportToDate')?.value || '').trim();

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

    extractBreakdownDate(item) {
        const values = [item?.breakdown_datetime, item?.created_at, item?.updated_at];
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

    normalizeTripStatus(value) {
        const status = String(value || '').toLowerCase();
        if (status.includes('progress')) return 'In Progress';
        if (status.includes('reject')) return 'Rejected';
        if (status.includes('cancel')) return 'Cancelled';
        if (status.includes('complete') || status.includes('resolve')) return 'Completed';
        if (status.includes('accept')) return 'Accepted';
        return 'Pending';
    }

    normalizeGarageWorkflowStatus(item) {
        const rawStatus = String(
            item?.garage_workflow?.status
            || item?.garage_workflow_status
            || ''
        ).trim().toLowerCase();

        if (rawStatus === 'garage_approved') return 'garage_approved';
        if (rawStatus === 'garage_entry_logged') return 'garage_entry_logged';
        if (rawStatus === 'repair_in_progress') return 'repair_in_progress';
        if (rawStatus === 'completed') return 'completed';

        if (rawStatus) {
            return rawStatus;
        }

        const breakdownStatus = String(item?.status || '').trim().toLowerCase();
        const ticketStatus = String(item?.ticket_status || '').trim().toLowerCase();
        if (breakdownStatus === 'resolved' || breakdownStatus === 'closed' || ticketStatus === 'resolved' || ticketStatus === 'closed') {
            return 'completed';
        }

        return 'awaiting_supervisor_approval';
    }

    getApprovedGarageName(item) {
        return String(
            item?.garage_workflow?.approved_garage?.name
            || item?.approved_garage_name
            || ''
        ).trim();
    }

    getGarageBillAmount(item) {
        const workflowAmount = Number(item?.garage_workflow?.bill_amount);
        if (Number.isFinite(workflowAmount)) {
            return workflowAmount;
        }

        const rootAmount = Number(item?.bill_amount);
        if (Number.isFinite(rootAmount)) {
            return rootAmount;
        }

        return NaN;
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
        const button = this.querySelector('#tmReportDownloadBtn');
        if (!button) {
            return;
        }

        button.disabled = !enabled;
    }

    setReportStatus(message, type = 'info') {
        const statusEl = this.querySelector('#tmReportStatus');
        if (!statusEl) {
            return;
        }

        statusEl.className = `tm-report-status ${type}`;
        statusEl.textContent = message;
    }

    renderReportPreview(report) {
        const previewEl = this.querySelector('#tmReportPreview');
        if (!previewEl) {
            return;
        }

        const summaryHtml = Object.entries(report.summary || {})
            .map(([key, value]) => {
                const label = this.toLabel(key);
                return `
                    <div class="tm-report-summary-item">
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
            ? `<div class="tm-report-truncated-note">Showing first ${previewRows.length} rows out of ${rows.length}.</div>`
            : '';

        const tableSection = columns.length > 0
            ? `
                <div class="tm-report-table-wrap">
                    <table class="tm-report-table">
                        <thead><tr>${tableHeader}</tr></thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>
                ${truncatedNote}
            `
            : '<div class="tm-report-empty">No tabular rows available for this report.</div>';

        previewEl.innerHTML = `
            <div class="tm-report-preview-card">
                <div class="tm-report-meta">
                    <h3>${this.escapeHtml(report.reportType)}</h3>
                    <p>Period: ${this.escapeHtml(periodText)} | Generated: ${this.escapeHtml(this.formatDateTime(report.generatedAt))}</p>
                </div>
                <div class="tm-report-summary-grid">${summaryHtml || '<div class="tm-report-empty">No summary metrics found.</div>'}</div>
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
        anchor.download = `tm-${scopeLabel}-report-${fileStamp}.csv`;
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

    async refreshActive() {
        const component = this.getComponentForView(this._activeView);
        if (component && typeof component.refresh === 'function') {
            await component.refresh();
        }
    }

    async refreshAll() {
        for (const view of this._views) {
            const component = this.getComponentForView(view);
            if (component && typeof component.refresh === 'function') {
                await component.refresh();
            }
        }
    }
}

customElements.define('tm-analytics-hub', TMAnalyticsHub);
