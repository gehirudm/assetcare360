class SupervisorFaultTicketTracking extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.currentFilter = 'all';
        this.currentSourceFilter = 'all';
        this.currentSort = 'created';
        this._allBreakdowns = [];

        this.render();
        this.bindEvents();
        this.refresh();

        this._onGarageApproved = () => this.refresh();
        document.addEventListener('supervisor-garage-approval-modal:approved', this._onGarageApproved);
    }

    disconnectedCallback() {
        if (this._onGarageApproved) {
            document.removeEventListener('supervisor-garage-approval-modal:approved', this._onGarageApproved);
        }
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Fault Tickets</h1>
                <p class="page-subtitle">Track machine and vehicle breakdown reports in one place</p>
            </div>

            <div class="filter-toolbar filter-toolbar--stacked">
                <div class="filter-toolbar__group">
                    <span class="filter-toolbar__label-inline">Status</span>
                    <div class="filter-controls filter-toolbar__filters" id="supervisorFaultTicketFilterControls">
                        <button class="filter-btn active" type="button" data-action="set-filter" data-filter="all">All Fault Tickets</button>
                        <button class="filter-btn" type="button" data-action="set-filter" data-filter="open">Pending</button>
                        <button class="filter-btn" type="button" data-action="set-filter" data-filter="in-progress">In Progress</button>
                        <button class="filter-btn" type="button" data-action="set-filter" data-filter="resolved">Resolved</button>
                        <button class="filter-btn" type="button" data-action="set-filter" data-filter="closed">Closed</button>
                    </div>
                </div>

                <div class="filter-toolbar__group">
                    <span class="filter-toolbar__label-inline">Source</span>
                    <div class="filter-controls filter-toolbar__filters" id="supervisorFaultTicketSourceFilterControls">
                        <button class="filter-btn active" type="button" data-action="set-source-filter" data-source="all">All Sources</button>
                        <button class="filter-btn" type="button" data-action="set-source-filter" data-source="vehicle">Vehicle</button>
                        <button class="filter-btn" type="button" data-action="set-source-filter" data-source="machine">Machine</button>
                    </div>
                </div>

                <div class="filter-toolbar__sort">
                    <label class="filter-toolbar__label" for="supervisorFaultTicketSort">Sort by</label>
                    <select id="supervisorFaultTicketSort" class="filter-toolbar__select" data-action="set-sort">
                        <option value="created">Created Date</option>
                        <option value="priority">Priority</option>
                    </select>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-ticket-alt"></i> Fault Ticket List</span>
                    <span class="status-text status-in-progress" data-fault-ticket-summary>Loading...</span>
                </div>
                <div id="supervisorFaultTicketList" class="inventory-list"></div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionNode = event.target.closest('[data-action]');
            if (!actionNode) {
                return;
            }

            const action = actionNode.dataset.action;

            if (action === 'set-filter') {
                this.applyFilter(actionNode.dataset.filter);
                return;
            }

            if (action === 'set-source-filter') {
                this.applySourceFilter(actionNode.dataset.source);
                return;
            }

            if (action === 'set-sort') {
                return;
            }

            if (action === 'view-ticket' || action === 'view-breakdown') {
                this.openDetails(actionNode.dataset.breakdownIdx);
                return;
            }
        });

        this.addEventListener('change', (event) => {
            const actionNode = event.target.closest('[data-action="set-sort"]');
            if (!actionNode) {
                return;
            }

            this.applySort(actionNode.value);
        });
    }

    async refresh() {
        const list = this.querySelector('#supervisorFaultTicketList');
        if (!list) {
            return;
        }

        if (typeof API === 'undefined' || typeof API.get !== 'function') {
            list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--danger);">API client is not available.</div>';
            return;
        }

        list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);">Loading fault tickets...</div>';

        try {
            const [machineRes, routeRes, vehicleRes] = await Promise.all([
                API.get('/machine-breakdowns'),
                API.get('/route-breakdowns'),
                API.get('/breakdown-reports'),
            ]);

            const machineBreakdowns = (machineRes?.status === 'success' && machineRes.data?.reports)
                ? machineRes.data.reports.map((report) => this.normalizeMachineBreakdown(report))
                : [];

            const routeBreakdowns = (routeRes?.status === 'success' && routeRes.data?.breakdowns)
                ? routeRes.data.breakdowns.map((report) => this.normalizeRouteBreakdown(report))
                : [];

            const vehicleBreakdowns = (vehicleRes?.status === 'success' && vehicleRes.data?.reports)
                ? vehicleRes.data.reports.map((report) => this.normalizeVehicleBreakdown(report))
                : [];

            this._allBreakdowns = [...machineBreakdowns, ...routeBreakdowns, ...vehicleBreakdowns];
            this.sortBreakdowns();
        } catch (error) {
            console.error('Error loading supervisor fault ticket tracking data:', error);
            this._allBreakdowns = [];
            list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--danger);">Error loading fault tickets.</div>';
            return;
        }

        this.renderList();
        this.updateSummary();
    }

    normalizeMachineBreakdown(report) {
        return {
            source: 'machine',
            reportType: 'machine_breakdown',
            id: report.id,
            raw: report,
            breakdownId: report.breakdown_id,
            identifier: report.machine_name || report.machine_model || `Machine #${report.machine_id}`,
            reportedBy: report.operator_name || 'Unknown',
            reporterType: 'Machinery Operator',
            description: report.description || '',
            type: report.breakdown_type || 'General Fault',
            severity: report.severity || 'Medium',
            date: report.created_at,
            effectiveStatus: report.ticket_status || report.status || 'Pending',
            ticketNumber: report.fault_ticket_number || null,
            faultTicketId: report.fault_ticket_id ? Number(report.fault_ticket_id) : null,
            assignments: Array.isArray(report.assignments) ? report.assignments : [],
        };
    }

    normalizeVehicleBreakdown(report) {
        return {
            source: 'vehicle',
            reportType: 'vehicle_breakdown',
            id: report.id,
            raw: report,
            breakdownId: report.breakdown_id,
            identifier: report.number_plate || `Vehicle #${report.vehicle_id || 'N/A'}`,
            reportedBy: report.driver_name || 'Unknown',
            reporterType: 'Driver',
            description: report.description || '',
            type: report.breakdown_type || 'Vehicle Breakdown',
            severity: this.normalizeSeverity(report.severity || 'Medium'),
            date: report.breakdown_date || report.created_at,
            effectiveStatus: report.ticket_status || report.status || 'Pending',
            ticketNumber: report.fault_ticket_number || null,
            faultTicketId: report.fault_ticket_id ? Number(report.fault_ticket_id) : null,
            assignments: Array.isArray(report.assigned_technicians)
                ? report.assigned_technicians.map((technician) => ({ technician_name: technician.technician_name }))
                : [],
        };
    }

    normalizeRouteBreakdown(report) {
        const legacyDescription = this.parseLegacyRouteBreakdownDescription(report.description);
        const normalizedSeverity = this.normalizeSeverity(legacyDescription.severity || report.severity || 'Medium');
        const coordinatesFromColumns = this.parseRouteCoordinates(report.breakdown_latitude, report.breakdown_longitude);
        const coordinatesFromText = coordinatesFromColumns
            || this.parseCoordinatesFromText(legacyDescription.locationText || report.breakdown_location || report.description || '');
        const latitude = coordinatesFromText?.latitude ?? null;
        const longitude = coordinatesFromText?.longitude ?? null;
        const locationLabel = this.formatRouteLocationLabel(latitude, longitude, report.breakdown_location || legacyDescription.locationText || '');
        const garageWorkflowStatus = report?.garage_workflow?.status || report.garage_workflow_status || 'awaiting_supervisor_approval';

        return {
            source: 'vehicle',
            reportType: 'route_breakdown',
            id: report.id,
            raw: report,
            breakdownId: report.route_breakdown_id,
            identifier: legacyDescription.vehicle || report.number_plate || `Vehicle #${report.vehicle_id}`,
            reportedBy: legacyDescription.driver || report.driver_name || 'Unknown',
            reporterType: 'Driver',
            description: legacyDescription.issueDescription || report.description || '',
            type: legacyDescription.breakdownType || report.breakdown_type || 'Route Breakdown',
            severity: normalizedSeverity,
            date: report.breakdown_datetime,
            effectiveStatus: this.resolveRouteEffectiveStatus(report.ticket_status || report.status || 'Pending', garageWorkflowStatus),
            ticketNumber: report.fault_ticket_number || null,
            faultTicketId: report.fault_ticket_id ? Number(report.fault_ticket_id) : null,
            garageWorkflowStatus,
            approvedGarageName: report?.garage_workflow?.approved_garage?.name || report.approved_garage_name || null,
            locationLabel,
            latitude,
            longitude,
            dangerousCargoPresent: this.parseDangerousCargoPresent(
                report.is_dangerous_cargo,
                report.dangerous_cargo_present,
            ),
            dangerousCargoSummary: String(report.dangerous_cargo_summary || '').trim(),
            dangerousCargoTripId: String(report.dangerous_cargo_trip_id || '').trim(),
            assignments: Array.isArray(report.assigned_technicians)
                ? report.assigned_technicians.map((technician) => ({ technician_name: technician.technician_name }))
                : [],
        };
    }

    getSeverityRank(severity) {
        const normalizedSeverity = this.normalizeSeverity(severity);

        if (normalizedSeverity === 'critical') {
            return 4;
        }

        if (normalizedSeverity === 'high') {
            return 3;
        }

        if (normalizedSeverity === 'low') {
            return 1;
        }

        return 2;
    }

    getBreakdownSortTimestamp(breakdown) {
        const candidateValues = [
            breakdown?.date,
            breakdown?.raw?.created_at,
            breakdown?.raw?.breakdown_datetime,
            breakdown?.raw?.breakdown_date,
            breakdown?.raw?.updated_at,
        ];

        for (const value of candidateValues) {
            if (!value) {
                continue;
            }

            const parsedTimestamp = new Date(value).getTime();
            if (Number.isFinite(parsedTimestamp)) {
                return parsedTimestamp;
            }
        }

        const fallbackId = Number(breakdown?.id || 0);
        return Number.isFinite(fallbackId) ? fallbackId : 0;
    }

    normalizeSeverity(severity) {
        const normalizedSeverity = String(severity || 'medium').trim().toLowerCase();
        if (['critical', 'high', 'medium', 'low'].includes(normalizedSeverity)) {
            return normalizedSeverity;
        }

        return 'medium';
    }

    parseRouteCoordinates(latitudeValue, longitudeValue) {
        const latitude = Number(latitudeValue);
        const longitude = Number(longitudeValue);

        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
            return { latitude, longitude };
        }

        return null;
    }

    parseCoordinatesFromText(value) {
        const text = String(value || '');
        const match = text.match(/lat\s*[:]?\s*(-?\d+(?:\.\d+)?)\s*[,|]\s*lng\s*[:]?\s*(-?\d+(?:\.\d+)?)/i);

        if (!match) {
            return null;
        }

        const latitude = Number(match[1]);
        const longitude = Number(match[2]);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return null;
        }

        return { latitude, longitude };
    }

    formatRouteLocationLabel(latitude, longitude, fallbackLocation) {
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
            return `Lat ${latitude.toFixed(6)}, Lng ${longitude.toFixed(6)}`;
        }

        return String(fallbackLocation || '').trim();
    }

    parseLegacyRouteBreakdownDescription(description) {
        const rawDescription = String(description || '').trim();
        if (!rawDescription) {
            return {
                issueDescription: '',
                breakdownType: '',
                severity: '',
                vehicle: '',
                driver: '',
                locationText: '',
            };
        }

        const normalized = rawDescription.replace(/\r\n/g, '\n');
        const seemsLegacy = /^\[route breakdown\]/i.test(normalized)
            || (/vehicle\s*:/i.test(normalized) && /driver\s*:/i.test(normalized) && /description\s*:/i.test(normalized));

        if (!seemsLegacy) {
            return {
                issueDescription: rawDescription,
                breakdownType: '',
                severity: '',
                vehicle: '',
                driver: '',
                locationText: '',
            };
        }

        const readField = (label, nextLabels = []) => {
            const lookahead = nextLabels.length
                ? `(?=(?:\\s*[|\\n]?\\s*(?:${nextLabels.join('|')})\\s*:)|$)`
                : '$';
            const pattern = new RegExp(`${label}\\s*:\\s*([\\s\\S]*?)${lookahead}`, 'i');
            const match = normalized.match(pattern);
            return match ? String(match[1] || '').trim() : '';
        };

        const issueDescription = readField('Description')
            || readField('Details')
            || rawDescription;

        return {
            issueDescription,
            breakdownType: readField('Type', ['Location', 'Description', 'Details']),
            severity: readField('Severity', ['Type', 'Location', 'Description', 'Details']),
            vehicle: readField('Vehicle', ['Driver', 'Severity', 'Type', 'Location', 'Description', 'Details']),
            driver: readField('Driver', ['Severity', 'Type', 'Location', 'Description', 'Details']),
            locationText: readField('Location', ['Description', 'Details']),
        };
    }

    resolveRouteEffectiveStatus(baseStatus, garageWorkflowStatus) {
        const normalizedWorkflowStatus = String(garageWorkflowStatus || '').toLowerCase();

        if (normalizedWorkflowStatus === 'garage_approved') {
            return 'Garage Approved';
        }

        if (normalizedWorkflowStatus === 'garage_entry_logged') {
            return 'Garage Entry Logged';
        }

        if (normalizedWorkflowStatus === 'repair_in_progress') {
            return 'Repair In Progress';
        }

        if (normalizedWorkflowStatus === 'completed') {
            return 'Completed';
        }

        return baseStatus || 'Pending';
    }

    parseDangerousCargoPresent(...values) {
        return values.some((value) => {
            if (typeof value === 'boolean') {
                return value;
            }

            const normalized = String(value ?? '').trim().toLowerCase();
            return normalized === '1' || normalized === 'true' || normalized === 'yes';
        });
    }

    normalizeFilterStatus(status) {
        const normalizedStatus = String(status || '').toLowerCase();

        if (normalizedStatus === 'open' || normalizedStatus === 'pending') {
            return 'open';
        }

        if (
            normalizedStatus === 'assigned' ||
            normalizedStatus === 'garage approved' ||
            normalizedStatus === 'garage entry logged' ||
            normalizedStatus === 'repair in progress' ||
            normalizedStatus.includes('progress') ||
            normalizedStatus.includes('spare') ||
            normalizedStatus.includes('parts') ||
            normalizedStatus === 'waiting for budget approval'
        ) {
            return 'in-progress';
        }

        if (normalizedStatus === 'insurance claimed') {
            return 'resolved';
        }

        if (normalizedStatus === 'resolved' || normalizedStatus === 'finished' || normalizedStatus === 'completed') {
            return 'resolved';
        }

        if (normalizedStatus === 'closed') {
            return 'closed';
        }

        return 'open';
    }

    getStatusInfo(status) {
        const statusMap = {
            Open: { label: 'Pending', className: 'status-pending' },
            Pending: { label: 'Pending', className: 'status-pending' },
            Assigned: { label: 'Assigned', className: 'status-assigned' },
            'Waiting for Spare Parts': { label: 'Awaiting Parts', className: 'status-in-progress' },
            'Waiting for Budget Approval': { label: 'Awaiting Approval', className: 'status-in-progress' },
            'Parts Approved': { label: 'Parts Approved', className: 'status-in-progress' },
            'In Progress': { label: 'In Progress', className: 'status-in-progress' },
            'Garage Approved': { label: 'Garage Approved', className: 'status-assigned' },
            'Garage Entry Logged': { label: 'Garage Entry Logged', className: 'status-in-progress' },
            'Repair In Progress': { label: 'Repair In Progress', className: 'status-in-progress' },
            'Insurance Claimed': { label: 'Insurance Claimed', className: 'status-resolved' },
            Completed: { label: 'Completed', className: 'status-resolved' },
            Resolved: { label: 'Resolved', className: 'status-resolved' },
            Closed: { label: 'Closed', className: 'status-resolved' },
        };

        return statusMap[status] || { label: status || 'Pending', className: 'status-pending' };
    }

    getSeverityInfo(severity) {
        const normalizedSeverity = String(severity || 'medium').toLowerCase();

        if (normalizedSeverity === 'critical') {
            return { label: 'CRITICAL', className: 'status-critical' };
        }

        if (normalizedSeverity === 'high') {
            return { label: 'HIGH', className: 'status-urgent' };
        }

        if (normalizedSeverity === 'low') {
            return { label: 'LOW', className: 'status-normal' };
        }

        return { label: 'MEDIUM', className: 'status-warn' };
    }

    getUpdateText(status) {
        const updateMap = {
            Open: 'Awaiting supervisor review',
            Pending: 'Awaiting supervisor review',
            Assigned: 'Technician assigned to this ticket',
            'Waiting for Spare Parts': 'Waiting for spare parts to be approved',
            'Waiting for Budget Approval': 'Awaiting budget approval',
            'Parts Approved': 'Spare parts approved - repair to begin soon',
            'In Progress': 'Being investigated and repaired',
            'Garage Approved': 'Nearby garage approved by supervisor',
            'Garage Entry Logged': 'Vehicle arrived at approved garage',
            'Repair In Progress': 'Repair is in progress at the approved garage',
            'Insurance Claimed': 'Submitted through insurance claim workflow',
            Completed: 'Garage repair completed',
            Resolved: 'Work completed and ticket resolved',
            Closed: 'Ticket closed',
        };

        return updateMap[status] || 'No updates';
    }

    formatDate(value) {
        if (!value) {
            return 'N/A';
        }

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return 'N/A';
        }

        return parsed.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    }

    renderList() {
        const list = this.querySelector('#supervisorFaultTicketList');
        if (!list) {
            return;
        }

        const filtered = [];
        this._allBreakdowns.forEach((breakdown, index) => {
            const matchesStatus = this.currentFilter === 'all' || this.normalizeFilterStatus(breakdown.effectiveStatus) === this.currentFilter;
            const matchesSource = this.currentSourceFilter === 'all' || breakdown.source === this.currentSourceFilter;

            if (matchesStatus && matchesSource) {
                filtered.push({ breakdown, index });
            }
        });

        if (!filtered.length) {
            list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);">No fault tickets found.</div>';
            return;
        }

        list.innerHTML = filtered
            .map(({ breakdown, index }) => this.renderCard(breakdown, index))
            .join('');
    }

    renderCard(breakdown, index) {
        const statusInfo = this.getStatusInfo(breakdown.effectiveStatus);
        const severityInfo = this.getSeverityInfo(breakdown.severity);
        const isVehicleSource = breakdown.source === 'vehicle';
        const sourceIcon = isVehicleSource ? 'fa-car' : 'fa-cogs';
        const sourceLabel = isVehicleSource ? 'Vehicle' : 'Machine';
        const sourceChipColor = isVehicleSource ? '#2563eb' : '#7c3aed';
        const dangerousCargoPresent = this.parseDangerousCargoPresent(breakdown.dangerousCargoPresent);
        const viewActionLabel = 'View';
        const assignedHtml = breakdown.assignments.length
            ? `<div class="item-meta" style="margin-top:4px;"><i class="fas fa-user-cog" style="color:#2563eb;"></i> <span style="color:#2563eb;font-weight:600;">Assigned to: ${this.escapeHtml(breakdown.assignments.map((assignment) => assignment.technician_name).filter(Boolean).join(', '))}</span></div>`
            : '';
        const dangerousBadgeHtml = dangerousCargoPresent
            ? '<span class="dangerous-cargo-chip" style="font-size: 10px; background: #dc2626; color: white; padding: 1px 6px; border-radius: 4px; margin-left: 6px;"><i class="fas fa-radiation"></i> Dangerous Cargo</span>'
            : '';
        const approvedGarageHtml = breakdown.reportType === 'route_breakdown' && breakdown.approvedGarageName
            ? `<div class="item-meta" style="margin-top:4px;"><i class="fas fa-warehouse" style="color:#0f766e;"></i> <span style="color:#0f766e;font-weight:600;">Nearby Garage: ${this.escapeHtml(breakdown.approvedGarageName)}</span></div>`
            : '';
        const routeDetailsHtml = isVehicleSource
            ? `<div class="item-meta" style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap;">
                <span class="status-text status-normal"><i class="fas fa-tools"></i> ${this.escapeHtml(breakdown.type || 'Route Breakdown')}</span>
            </div>`
            : '';
        const updateText = this.getUpdateText(breakdown.effectiveStatus);
        const showUpdateText = breakdown.effectiveStatus !== 'Pending' && breakdown.effectiveStatus !== 'Open';

        return `
            <div class="inventory-item" data-status="${this.escapeHtml(this.normalizeFilterStatus(breakdown.effectiveStatus))}" data-breakdown-idx="${index}">
                <div class="item-details">
                    <strong><i class="fas ${sourceIcon}"></i> ${this.escapeHtml(breakdown.breakdownId || `#${breakdown.id}`)}<span style="font-size: 10px; background: ${sourceChipColor}; color: white; padding: 1px 6px; border-radius: 4px; margin-left: 6px;">${sourceLabel}</span>${dangerousBadgeHtml}</strong>
                    <div class="item-meta">
                        <i class="fas ${sourceIcon}"></i> ${this.escapeHtml(breakdown.identifier)} &nbsp;|&nbsp;
                        <i class="fas fa-user"></i> ${this.escapeHtml(breakdown.reportedBy)} <span style="color:var(--muted);">(${this.escapeHtml(breakdown.reporterType)})</span>
                        ${isVehicleSource ? '' : `&nbsp;|&nbsp;<i class="fas fa-tag"></i> ${this.escapeHtml(breakdown.type)}`}
                    </div>
                    <div class="item-description">${this.escapeHtml(breakdown.description || 'No description provided.')}</div>
                    ${routeDetailsHtml}
                    ${approvedGarageHtml}
                    <div class="item-meta" style="margin-top:6px;">
                        <span class="status-text ${statusInfo.className}">${this.escapeHtml(statusInfo.label)}</span> &nbsp;|&nbsp;
                        <span class="status-text ${severityInfo.className}">${this.escapeHtml(severityInfo.label)}</span> &nbsp;|&nbsp;
                        <i class="fas fa-calendar"></i> ${this.escapeHtml(this.formatDate(breakdown.date))}
                    </div>
                    ${assignedHtml}
                    ${showUpdateText ? `<div class="item-meta" style="margin-top:4px;color:#059669;font-weight:500;">${this.escapeHtml(updateText)}</div>` : ''}
                </div>
                <div class="item-actions">
                    <div class="action-buttons" style="display:flex; flex-direction:column; gap:8px;">
                        <button class="btn btn-primary btn-small" type="button" data-action="view-ticket" data-breakdown-idx="${index}">
                            <i class="fas fa-eye"></i> ${viewActionLabel}
                        </button>
                    </div>
                </div>
            </div>`;
    }

    getGarageWorkflowStatusInfo(status) {
        const normalized = String(status || 'awaiting_supervisor_approval').toLowerCase();
        const statusMap = {
            awaiting_supervisor_approval: { label: 'Awaiting Supervisor Approval', className: 'status-pending' },
            garage_approved: { label: 'Garage Approved', className: 'status-in-progress' },
            garage_entry_logged: { label: 'Garage Entry Logged', className: 'status-assigned' },
            repair_in_progress: { label: 'Repair In Progress', className: 'status-in-progress' },
            completed: { label: 'Completed', className: 'status-resolved' },
        };

        return statusMap[normalized] || {
            label: normalized.replace(/_/g, ' '),
            className: 'status-pending',
        };
    }

    applyFilter(filter) {
        this.currentFilter = filter || 'all';

        this.querySelectorAll('#supervisorFaultTicketFilterControls .filter-btn').forEach((button) => {
            button.classList.toggle('active', button.dataset.filter === this.currentFilter);
        });

        this.renderList();
    }

    applySourceFilter(source) {
        this.currentSourceFilter = source || 'all';

        this.querySelectorAll('#supervisorFaultTicketSourceFilterControls .filter-btn').forEach((button) => {
            button.classList.toggle('active', button.dataset.source === this.currentSourceFilter);
        });

        this.renderList();
    }

    applySort(sortValue) {
        this.currentSort = sortValue || 'created';
        this.sortBreakdowns();
        this.renderList();
    }

    sortBreakdowns() {
        this._allBreakdowns.sort((first, second) => this.compareBreakdowns(first, second));
    }

    compareBreakdowns(first, second) {
        if (this.currentSort === 'priority') {
            const severityDiff = this.getSeverityRank(second.severity) - this.getSeverityRank(first.severity);
            if (severityDiff !== 0) {
                return severityDiff;
            }

            const timestampDiff = this.getBreakdownSortTimestamp(second) - this.getBreakdownSortTimestamp(first);
            if (timestampDiff !== 0) {
                return timestampDiff;
            }

            return Number(second.id || 0) - Number(first.id || 0);
        }

        const timestampDiff = this.getBreakdownSortTimestamp(second) - this.getBreakdownSortTimestamp(first);
        if (timestampDiff !== 0) {
            return timestampDiff;
        }

        const severityDiff = this.getSeverityRank(second.severity) - this.getSeverityRank(first.severity);
        if (severityDiff !== 0) {
            return severityDiff;
        }

        return Number(second.id || 0) - Number(first.id || 0);
    }

    updateSummary() {
        const summary = this.querySelector('[data-fault-ticket-summary]');
        if (!summary) {
            return;
        }

        const pendingCount = this._allBreakdowns
            .filter((breakdown) => this.normalizeFilterStatus(breakdown.effectiveStatus) === 'open')
            .length;
        const activeCount = this._allBreakdowns
            .filter((breakdown) => this.normalizeFilterStatus(breakdown.effectiveStatus) === 'in-progress')
            .length;

        summary.textContent = `${pendingCount} pending, ${activeCount} active`;
    }

    async openDetails(index) {
        const breakdown = this._allBreakdowns[Number(index)];
        if (!breakdown) {
            this.emitToast('Fault ticket not found.', 'warning');
            return;
        }

        const numericFaultTicketId = Number(breakdown.faultTicketId || 0);
        const hasFaultTicket = Number.isFinite(numericFaultTicketId) && numericFaultTicketId > 0;

        if (hasFaultTicket) {
            if (typeof window.viewTicketDetails === 'function') {
                window.viewTicketDetails(numericFaultTicketId);
                return;
            }
            this.emitToast('Ticket details handler is unavailable.', 'error');
            return;
        }

        if (typeof window.viewOrCreateBreakdownTicket === 'function') {
            const reportType = breakdown.reportType || (breakdown.source === 'vehicle' ? 'vehicle_breakdown' : 'machine_breakdown');
            await window.viewOrCreateBreakdownTicket(reportType, breakdown.id, breakdown);
            return;
        }

        this.emitToast('Unable to open ticket details for this breakdown.', 'warning');
    }

    toMachineTicketPayload(breakdown) {
        const priorityBySeverity = {
            critical: 'Critical',
            high: 'High',
            medium: 'Medium',
            low: 'Low',
        };

        const normalizedSeverity = String(breakdown.severity || 'medium').toLowerCase();

        return {
            id: breakdown.id,
            ticket_id: breakdown.breakdownId,
            machine_id: breakdown.raw?.machine_id || null,
            machine_name: breakdown.raw?.machine_name || breakdown.identifier,
            priority: priorityBySeverity[normalizedSeverity] || 'Medium',
            status: breakdown.effectiveStatus || 'Open',
            created_at: breakdown.date,
            reporter_full_name: breakdown.reportedBy,
            original_report: {
                breakdown_type: breakdown.type,
                severity: breakdown.severity,
                breakdown_date: breakdown.date,
                machine_model: breakdown.raw?.machine_model || breakdown.identifier,
                machine_name: breakdown.raw?.machine_name || breakdown.identifier,
                operator_name: breakdown.reportedBy,
                description: breakdown.description,
            },
        };
    }

    emitToast(message, type = 'info') {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
            return;
        }

        this.dispatchEvent(new CustomEvent('supervisor-ui:toast', {
            bubbles: true,
            detail: { message, type },
        }));
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

if (!customElements.get('supervisor-fault-ticket-tracking')) {
    customElements.define('supervisor-fault-ticket-tracking', SupervisorFaultTicketTracking);
}
