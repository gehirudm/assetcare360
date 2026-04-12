class SupervisorDailyCheckReports extends HTMLElement {
    constructor() {
        super();
        this._statusFilter = 'all';
        this._sourceFilter = 'all';
        this._weeklyReportsMap = new Map();
        this._handleRootClick = this._handleRootClick.bind(this);
        this._handleModalApprove = this._handleModalApprove.bind(this);
        this._handleModalReject = this._handleModalReject.bind(this);
        this._handleRejectionSubmit = this._handleRejectionSubmit.bind(this);
    }

    connectedCallback() {
        if (this._initialized) return;

        this.render();
        this.addEventListener('click', this._handleRootClick);
        this.addEventListener('supervisor-report-details-modal:approve', this._handleModalApprove);
        this.addEventListener('supervisor-report-details-modal:reject', this._handleModalReject);
        this.addEventListener('supervisor-rejection-reason-modal:submit', this._handleRejectionSubmit);
        this._initialized = true;
    }

    disconnectedCallback() {
        this.removeEventListener('click', this._handleRootClick);
        this.removeEventListener('supervisor-report-details-modal:approve', this._handleModalApprove);
        this.removeEventListener('supervisor-report-details-modal:reject', this._handleModalReject);
        this.removeEventListener('supervisor-rejection-reason-modal:submit', this._handleRejectionSubmit);
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-clipboard-check"></i> Weekly Check Reports</h2>
                <p class="page-subtitle">Review and approve daily inspection reports</p>
            </div>

            <div class="filter-controls" id="reportStatusFilters">
                <button class="filter-btn active" type="button" data-report-status="all">All</button>
                <button class="filter-btn" type="button" data-report-status="pending">Pending</button>
                <button class="filter-btn" type="button" data-report-status="approved">Approved</button>
                <button class="filter-btn" type="button" data-report-status="rejected">Rejected</button>
            </div>

            <div class="filter-controls" id="reportSourceFilters">
                <button class="filter-btn active" type="button" data-report-source="all">All Sources</button>
                <button class="filter-btn" type="button" data-report-source="driver">Driver Reports</button>
                <button class="filter-btn" type="button" data-report-source="operator">Operator Reports</button>
            </div>

            <div class="card">
                <div class="card-header">
                    <i class="fas fa-list"></i> Reports for Review
                </div>
                <div id="reportsTableBody" class="inventory-list">
                    <p style="text-align: center; color: var(--muted); padding: 40px;">No reports loaded</p>
                </div>
            </div>

            <supervisor-report-details-modal></supervisor-report-details-modal>
            <supervisor-rejection-reason-modal></supervisor-rejection-reason-modal>
        `;
    }

    refresh() {
        this.loadReports();
    }

    async loadReports() {
        const tbody = this.querySelector('#reportsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Loading reports...</p>';

        try {
            const [vehicleChecksResponse, machineChecksResponse] = await Promise.all([
                API.get('/vehicle-checks'),
                API.get('/machine-weekly-checks')
            ]);

            const reports = [];
            this._weeklyReportsMap.clear();

            if (vehicleChecksResponse.success && vehicleChecksResponse.data) {
                const vehicleChecks = Array.isArray(vehicleChecksResponse.data) ? vehicleChecksResponse.data : [];
                vehicleChecks.forEach((check) => {
                    const report = {
                        id: check.check_id,
                        assetName: check.vehicle_registration || 'N/A',
                        submittedBy: check.driver_name || 'Driver',
                        type: 'driver',
                        date: check.submitted_date ? new Date(check.submitted_date).toLocaleDateString() : 'N/A',
                        status: check.status ? check.status.charAt(0).toUpperCase() + check.status.slice(1) : 'Pending',
                        rawData: check
                    };
                    reports.push(report);
                    this._weeklyReportsMap.set(report.id, report);
                });
            }

            if (machineChecksResponse.status === 'success' && machineChecksResponse.data && machineChecksResponse.data.checks) {
                machineChecksResponse.data.checks.forEach((check) => {
                    const report = {
                        id: check.check_id,
                        assetName: check.machine_name || `Machine ${check.machine_id}`,
                        submittedBy: check.operator_name || 'Operator',
                        type: 'operator',
                        date: check.submitted_date ? new Date(check.submitted_date).toLocaleDateString() : 'N/A',
                        status: check.status ? check.status.charAt(0).toUpperCase() + check.status.slice(1) : 'Pending',
                        rawData: check
                    };
                    reports.push(report);
                    this._weeklyReportsMap.set(report.id, report);
                });
            }

            reports.sort((a, b) => {
                const dateA = a.rawData.submitted_date ? new Date(a.rawData.submitted_date) : new Date(0);
                const dateB = b.rawData.submitted_date ? new Date(b.rawData.submitted_date) : new Date(0);
                return dateB - dateA;
            });

            if (!reports.length) {
                tbody.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 40px;">No weekly check reports found</p>';
                this.emitPendingCount(0);
                return;
            }

            tbody.innerHTML = reports.map((report) => this.renderReportItem(report)).join('');

            const pendingCount = reports.filter((item) => item.status.toLowerCase() === 'pending').length;
            this.emitPendingCount(pendingCount);
            this.applyFilters(true);
        } catch (error) {
            console.error('Error loading weekly check reports:', error);
            tbody.innerHTML = '<p style="text-align: center; color: #e74c3c; padding: 40px;">Error loading reports. Please try again.</p>';
            this.emitToast('Error loading reports. Please try again.', 'error');
        }
    }

    renderReportItem(report) {
        const reportId = this.escapeHtml(report.id || '');
        const type = this.escapeHtml(report.type || 'driver');
        const typeLabel = report.type === 'operator' ? 'Operator' : 'Driver';
        const statusLower = (report.status || 'Pending').toLowerCase();
        const statusUpper = (report.status || 'Pending').toUpperCase();

        return `
            <div class="inventory-item" data-id="${reportId}" data-type="${type}" data-status="${statusLower}">
                <div class="item-details">
                    <strong><i class="fas fa-clipboard-check"></i> ${reportId} - ${this.escapeHtml(report.assetName)}</strong>
                    <div class="item-meta">
                        <i class="fas fa-user"></i> ${this.escapeHtml(report.submittedBy)} |
                        <i class="fas fa-tag"></i> ${this.escapeHtml(typeLabel)}
                    </div>
                    <div class="item-meta">
                        <span class="status-text status-${statusLower}">${statusUpper}</span> |
                        <i class="fas fa-calendar"></i> ${this.escapeHtml(report.date || 'N/A')}
                    </div>
                </div>
                <div class="item-actions">
                    <div class="action-buttons">
                        <button class="btn btn-primary btn-small" type="button" data-report-view="${reportId}">
                            <i class="fas fa-eye"></i> VIEW
                        </button>
                        ${statusLower === 'pending' ? this.renderPendingActions(reportId) : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderPendingActions(reportId) {
        return `
            <div class="dropdown-container">
                <button class="btn btn-small btn-secondary dropdown-trigger" type="button" data-report-menu-trigger="${reportId}">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
                <div class="dropdown-menu" id="dropdown-report-${reportId}">
                    <button class="dropdown-item" type="button" data-report-approve="${reportId}">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="dropdown-item danger" type="button" data-report-reject="${reportId}">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </div>
            </div>
        `;
    }

    _handleRootClick(event) {
        const statusButton = event.target.closest('button[data-report-status]');
        if (statusButton) {
            this._statusFilter = statusButton.getAttribute('data-report-status') || 'all';
            this.updateFilterButtons();
            this.applyFilters();
            return;
        }

        const sourceButton = event.target.closest('button[data-report-source]');
        if (sourceButton) {
            this._sourceFilter = sourceButton.getAttribute('data-report-source') || 'all';
            this.updateFilterButtons();
            this.applyFilters();
            return;
        }

        const menuTrigger = event.target.closest('button[data-report-menu-trigger]');
        if (menuTrigger) {
            event.stopPropagation();
            const reportId = menuTrigger.getAttribute('data-report-menu-trigger');
            this.toggleReportDropdown(reportId);
            return;
        }

        const viewButton = event.target.closest('button[data-report-view]');
        if (viewButton) {
            const reportId = viewButton.getAttribute('data-report-view');
            const cachedReport = this._weeklyReportsMap.get(reportId);
            this.viewReport(reportId, cachedReport?.type);
            return;
        }

        const approveButton = event.target.closest('button[data-report-approve]');
        if (approveButton) {
            const reportId = approveButton.getAttribute('data-report-approve');
            this.closeAllDropdowns();
            this.approveReport(reportId);
            return;
        }

        const rejectButton = event.target.closest('button[data-report-reject]');
        if (rejectButton) {
            const reportId = rejectButton.getAttribute('data-report-reject');
            this.closeAllDropdowns();
            this.openRejectionReasonModal(reportId);
            return;
        }

        if (!event.target.closest('.dropdown-container')) {
            this.closeAllDropdowns();
        }
    }

    _handleModalApprove(event) {
        const reportId = event.detail?.reportId;
        if (!reportId) return;
        this.approveReport(reportId);
    }

    _handleModalReject(event) {
        const reportId = event.detail?.reportId;
        if (!reportId) return;
        this.openRejectionReasonModal(reportId);
    }

    _handleRejectionSubmit(event) {
        const reportId = event.detail?.reportId;
        const reason = event.detail?.reason;
        if (!reportId || !reason) {
            this.emitToast('Invalid report ID', 'error');
            return;
        }

        this.rejectReport(reportId, reason);
    }

    toggleReportDropdown(reportId) {
        const dropdown = this.querySelector(`#dropdown-report-${reportId}`);
        if (!dropdown) return;

        this.querySelectorAll('.dropdown-menu').forEach((menu) => {
            if (menu !== dropdown) menu.classList.remove('show');
        });

        dropdown.classList.toggle('show');
    }

    closeAllDropdowns() {
        this.querySelectorAll('.dropdown-menu').forEach((menu) => {
            menu.classList.remove('show');
        });
    }

    updateFilterButtons() {
        this.querySelectorAll('button[data-report-status]').forEach((button) => {
            button.classList.toggle('active', button.getAttribute('data-report-status') === this._statusFilter);
        });

        this.querySelectorAll('button[data-report-source]').forEach((button) => {
            button.classList.toggle('active', button.getAttribute('data-report-source') === this._sourceFilter);
        });
    }

    applyFilters(silent = false) {
        const items = this.querySelectorAll('#reportsTableBody .inventory-item');
        let visibleCount = 0;

        items.forEach((item) => {
            const itemStatus = item.getAttribute('data-status');
            const itemType = item.getAttribute('data-type');

            const matchesStatus = this._statusFilter === 'all' || itemStatus === this._statusFilter;
            const matchesSource = this._sourceFilter === 'all' || itemType === this._sourceFilter;

            const visible = matchesStatus && matchesSource;
            item.style.display = visible ? '' : 'none';
            if (visible) visibleCount += 1;
        });

        if (!silent) {
            this.emitToast(`Showing ${visibleCount} reports`, 'info');
        }
    }

    async viewReport(reportId, reportTypeHint) {
        try {
            const reportType = reportTypeHint || this._weeklyReportsMap.get(reportId)?.type;
            const isVehicleCheck = reportId.startsWith('VCHK-') || reportId.startsWith('CHK-') || reportType === 'driver';
            const isMachineCheck = reportId.startsWith('MCHK-') || reportType === 'operator';

            if (isVehicleCheck) {
                await this.viewVehicleReport(reportId);
                return;
            }

            if (isMachineCheck) {
                await this.viewMachineReport(reportId);
                return;
            }

            this.emitToast('Invalid report ID format', 'error');
        } catch (error) {
            console.error('Error viewing report:', error);
            this.emitToast('Error loading report details', 'error');
        }
    }

    async viewVehicleReport(reportId) {
        const response = await API.get(`/vehicle-checks?id=${reportId}`);
        if (!response || !response.success || !response.data) {
            this.emitToast('Failed to load vehicle check report', 'error');
            return;
        }

        const checkData = response.data;
        const submittedDate = this.formatDateTime(checkData.submitted_date);
        const weekStart = this.formatDate(checkData.week_start_date);
        const weekEnd = this.formatDate(checkData.week_end_date);
        const reviewedDate = this.formatDateTime(checkData.reviewed_date);
        const statusMeta = this.getStatusMeta(checkData.status);

        const engineOilStatus = checkData.engine_oil === 1 || checkData.engine_oil === true ? '✓ Checked' : '✗ Issues';
        const brakesStatus = checkData.brakes === 1 || checkData.brakes === true ? '✓ Checked' : '✗ Issues';
        const lightsStatus = checkData.lights === 1 || checkData.lights === true ? '✓ Checked' : '✗ Issues';
        const tiresStatus = checkData.tires === 1 || checkData.tires === true ? '✓ Checked' : '✗ Issues';
        const coolantStatus = checkData.coolant === 1 || checkData.coolant === true ? '✓ Checked' : '✗ Issues';
        const wipersStatus = checkData.wipers === 1 || checkData.wipers === true ? '✓ Checked' : '✗ Issues';

        const content = `
            <div class="form-section">
                <h5><i class="fas fa-info-circle"></i> Basic Information</h5>
                <p><strong>Check ID:</strong> <span style="color: var(--royal-blue);">${this.escapeHtml(checkData.check_id || 'N/A')}</span></p>
                <p><strong>Type:</strong> <i class="fas fa-car"></i> Driver Vehicle Check</p>
                <p><strong>Week Period:</strong> ${this.escapeHtml(weekStart)} - ${this.escapeHtml(weekEnd)}</p>
                <p><strong>Submitted:</strong> ${this.escapeHtml(submittedDate)}</p>
                <p><strong>Status:</strong> <span class="status-text ${statusMeta.className}">${statusMeta.label}</span></p>
            </div>

            <div class="form-section">
                <h5><i class="fas fa-truck"></i> Vehicle Information</h5>
                <p><strong>Vehicle Registration:</strong> ${this.escapeHtml(checkData.vehicle_registration || 'Not provided')}</p>
                <p><strong>Driver:</strong> ${this.escapeHtml(checkData.driver_name || (checkData.driver_id ? `Driver ID: ${checkData.driver_id}` : 'Not assigned'))}</p>
                <p><strong>Odometer Reading:</strong> ${checkData.odometer_reading ? `${checkData.odometer_reading.toLocaleString()} km` : 'Not recorded'}</p>
            </div>

            <div class="form-section">
                <h5><i class="fas fa-clipboard-check"></i> Weekly Inspection Checklist</h5>
                <p style="color: #666; font-size: 13px; margin-bottom: 12px;"><i class="fas fa-info-circle"></i> Items verified by driver during weekly inspection</p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <p><strong>Engine Oil Level:</strong> ${engineOilStatus}</p>
                    <p><strong>Brake System:</strong> ${brakesStatus}</p>
                    <p><strong>All Lights:</strong> ${lightsStatus}</p>
                    <p><strong>Tire Pressure:</strong> ${tiresStatus}</p>
                    <p><strong>Coolant Level:</strong> ${coolantStatus}</p>
                    <p><strong>Wipers & Washers:</strong> ${wipersStatus}</p>
                </div>
            </div>

            ${checkData.notes ? `
            <div class="form-section">
                <h5><i class="fas fa-sticky-note"></i> Notes</h5>
                <p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px; white-space: pre-wrap;">${this.escapeHtml(checkData.notes)}</p>
            </div>
            ` : ''}

            ${checkData.issues_found ? `
            <div class="form-section">
                <h5><i class="fas fa-exclamation-triangle"></i> Issues Found</h5>
                <p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px; border-left: 3px solid #dc3545; white-space: pre-wrap;">${this.escapeHtml(checkData.issues_found)}</p>
            </div>
            ` : ''}

            ${checkData.status !== 'pending' ? `
            <div class="form-section">
                <h5><i class="fas fa-check-circle"></i> Review Details</h5>
                ${checkData.reviewed_by_name ? `<p><strong>Reviewed By:</strong> ${this.escapeHtml(checkData.reviewed_by_name)}</p>` : ''}
                ${reviewedDate !== 'N/A' ? `<p><strong>Review Date:</strong> ${this.escapeHtml(reviewedDate)}</p>` : ''}
                ${checkData.rejection_reason ? `<p><strong>Rejection Reason:</strong></p><p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px; border-left: 3px solid #e74c3c; white-space: pre-wrap;">${this.escapeHtml(checkData.rejection_reason)}</p>` : ''}
            </div>
            ` : ''}
        `;

        this.openReportModal({
            title: '<i class="fas fa-car"></i> Vehicle Weekly Check Report',
            content,
            status: checkData.status,
            reportId
        });
    }

    async viewMachineReport(reportId) {
        const response = await API.get(`/machine-weekly-checks?id=${reportId}`);
        if (!response || response.status !== 'success' || !response.data || !response.data.check) {
            this.emitToast('Failed to load machine check report', 'error');
            return;
        }

        const checkData = response.data.check;
        const submittedDate = this.formatDateTime(checkData.submitted_date);
        const weekStart = this.formatDate(checkData.week_start_date);
        const weekEnd = this.formatDate(checkData.week_end_date);
        const reviewedDate = this.formatDateTime(checkData.reviewed_date);
        const statusMeta = this.getStatusMeta(checkData.status);

        const engineStatus = checkData.engine_status === 1 || checkData.engine_status === true ? '✓ Normal' : '✗ Issues';
        const hydraulicStatus = checkData.hydraulics === 1 || checkData.hydraulics === true ? '✓ Normal' : '✗ Issues';
        const electricalStatus = checkData.electrical_system === 1 || checkData.electrical_system === true ? '✓ Normal' : '✗ Issues';
        const safetyStatus = checkData.safety_equipment === 1 || checkData.safety_equipment === true ? '✓ Normal' : '✗ Issues';
        const controlsStatus = checkData.controls === 1 || checkData.controls === true ? '✓ Normal' : '✗ Issues';
        const lubricationStatus = checkData.lubrication === 1 || checkData.lubrication === true ? '✓ Normal' : '✗ Issues';
        const coolingStatus = checkData.cooling_system === 1 || checkData.cooling_system === true ? '✓ Normal' : '✗ Issues';
        const filtersStatus = checkData.filters === 1 || checkData.filters === true ? '✓ Normal' : '✗ Issues';

        const content = `
            <div class="form-section">
                <h5><i class="fas fa-info-circle"></i> Basic Information</h5>
                <p><strong>Check ID:</strong> <span style="color: var(--royal-blue);">${this.escapeHtml(checkData.check_id || 'N/A')}</span></p>
                <p><strong>Type:</strong> <i class="fas fa-cogs"></i> Machinery Operator Check</p>
                <p><strong>Week Period:</strong> ${this.escapeHtml(weekStart)} - ${this.escapeHtml(weekEnd)}</p>
                <p><strong>Submitted:</strong> ${this.escapeHtml(submittedDate)}</p>
                <p><strong>Status:</strong> <span class="status-text ${statusMeta.className}">${statusMeta.label}</span></p>
            </div>

            <div class="form-section">
                <h5><i class="fas fa-cog"></i> Machine Information</h5>
                <p><strong>Machine:</strong> ${this.escapeHtml(checkData.machine_name || `Machine ID: ${checkData.machine_id}`)}</p>
                ${checkData.operator_name ? `<p><strong>Operator:</strong> ${this.escapeHtml(checkData.operator_name)}</p>` : ''}
            </div>

            <div class="form-section">
                <h5><i class="fas fa-cogs"></i> System Status</h5>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <p><strong>Engine:</strong> ${engineStatus}</p>
                    <p><strong>Hydraulics:</strong> ${hydraulicStatus}</p>
                    <p><strong>Electrical:</strong> ${electricalStatus}</p>
                    <p><strong>Safety Equipment:</strong> ${safetyStatus}</p>
                    <p><strong>Controls:</strong> ${controlsStatus}</p>
                    <p><strong>Lubrication:</strong> ${lubricationStatus}</p>
                    <p><strong>Cooling System:</strong> ${coolingStatus}</p>
                    <p><strong>Filters:</strong> ${filtersStatus}</p>
                </div>
            </div>

            ${checkData.notes ? `
            <div class="form-section">
                <h5><i class="fas fa-clipboard-list"></i> Observations</h5>
                <p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px; white-space: pre-wrap;">${this.escapeHtml(checkData.notes)}</p>
            </div>
            ` : ''}

            ${checkData.issues_found ? `
            <div class="form-section">
                <h5><i class="fas fa-exclamation-triangle"></i> Issues Found</h5>
                <p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px; border-left: 3px solid #dc3545; white-space: pre-wrap;">${this.escapeHtml(checkData.issues_found)}</p>
            </div>
            ` : ''}

            ${checkData.status !== 'pending' ? `
            <div class="form-section">
                <h5><i class="fas fa-check-circle"></i> Review Details</h5>
                ${checkData.reviewed_by_name ? `<p><strong>Reviewed By:</strong> ${this.escapeHtml(checkData.reviewed_by_name)}</p>` : ''}
                ${reviewedDate !== 'N/A' ? `<p><strong>Review Date:</strong> ${this.escapeHtml(reviewedDate)}</p>` : ''}
                ${checkData.rejection_reason ? `<p><strong>Rejection Reason:</strong></p><p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px; border-left: 3px solid #e74c3c; white-space: pre-wrap;">${this.escapeHtml(checkData.rejection_reason)}</p>` : ''}
            </div>
            ` : ''}
        `;

        this.openReportModal({
            title: '<i class="fas fa-cogs"></i> Machine Weekly Check Report',
            content,
            status: checkData.status,
            reportId
        });
    }

    openReportModal(config) {
        const modal = this.querySelector('supervisor-report-details-modal');
        if (!modal || typeof modal.open !== 'function') {
            this.emitToast('Error: Modal not found', 'error');
            return;
        }

        modal.open(config);
    }

    openRejectionReasonModal(reportId) {
        const modal = this.querySelector('supervisor-rejection-reason-modal');
        if (!modal || typeof modal.open !== 'function') {
            this.emitToast('Error: Rejection modal not found', 'error');
            return;
        }

        modal.open(reportId);
    }

    async approveReport(reportId) {
        const { isVehicleCheck, isMachineCheck } = this.resolveCheckType(reportId);
        if (!isVehicleCheck && !isMachineCheck) {
            this.emitToast('Invalid report ID format', 'error');
            return;
        }

        this.confirmAction('Approve Report', `Are you sure you want to approve report ${reportId}?`, async () => {
            this.emitToast('Processing approval...', 'info');

            try {
                const currentUser = Auth.getCurrentUser();
                const reviewerId = currentUser?.id || 1;
                let response;

                if (isVehicleCheck) {
                    response = await API.put(`/vehicle-checks/${reportId}/approve`, {
                        reviewed_by: reviewerId,
                        notes: 'Approved by supervisor'
                    });
                } else {
                    response = await API.post(`/machine-weekly-checks/${reportId}/approve`, {
                        reviewed_by: reviewerId,
                        notes: 'Approved by supervisor'
                    });
                }

                const isSuccess = response && (response.success === true || response.status === 'success');
                if (isSuccess) {
                    this.emitToast(`Report ${reportId} approved successfully!`, 'success');
                    this.querySelector('supervisor-report-details-modal')?.close?.();
                    await this.loadReports();
                } else {
                    this.emitToast(`Failed to approve report: ${response?.message || 'Unknown error'}`, 'error');
                }
            } catch (error) {
                console.error('Error approving report:', error);
                this.emitToast(`Error approving report: ${error.message || 'Network error. Please try again.'}`, 'error');
            }
        }, 'primary');
    }

    async rejectReport(reportId, reason) {
        const { isVehicleCheck, isMachineCheck } = this.resolveCheckType(reportId);
        if (!isVehicleCheck && !isMachineCheck) {
            this.emitToast('Invalid report ID format', 'error');
            return;
        }

        this.confirmAction(
            'Reject Report',
            `Are you sure you want to reject report ${reportId}? The submitter will be notified.`,
            async () => {
                this.emitToast('Processing rejection...', 'info');

                try {
                    const currentUser = Auth.getCurrentUser();
                    const reviewerId = currentUser?.id || 1;
                    let response;

                    if (isVehicleCheck) {
                        response = await API.put(`/vehicle-checks/${reportId}/reject`, {
                            reviewed_by: reviewerId,
                            rejection_reason: reason,
                            notes: 'Rejected by supervisor'
                        });
                    } else {
                        response = await API.post(`/machine-weekly-checks/${reportId}/reject`, {
                            reviewed_by: reviewerId,
                            rejection_reason: reason,
                            notes: 'Rejected by supervisor'
                        });
                    }

                    const isSuccess = response && (response.success === true || response.status === 'success');
                    if (isSuccess) {
                        this.emitToast(`Report ${reportId} rejected`, 'warning');
                        this.querySelector('supervisor-rejection-reason-modal')?.close?.();
                        this.querySelector('supervisor-report-details-modal')?.close?.();
                        await this.loadReports();
                    } else {
                        this.emitToast(`Failed to reject report: ${response?.message || 'Unknown error'}`, 'error');
                    }
                } catch (error) {
                    console.error('Error rejecting report:', error);
                    this.emitToast(`Error rejecting report: ${error.message || 'Network error. Please try again.'}`, 'error');
                }
            },
            'danger'
        );
    }

    resolveCheckType(reportId) {
        return {
            isVehicleCheck: reportId.startsWith('VCHK-') || reportId.startsWith('CHK-'),
            isMachineCheck: reportId.startsWith('MCHK-')
        };
    }

    confirmAction(title, message, onConfirm, variant) {
        if (typeof window.createConfirmationDialog === 'function') {
            window.createConfirmationDialog(title, message, onConfirm, variant || 'primary');
            return;
        }

        if (window.confirm(message)) {
            onConfirm();
        }
    }

    emitToast(message, type = 'info') {
        this.dispatchEvent(new CustomEvent('supervisor-daily-check-reports:toast', {
            bubbles: true,
            detail: { message, type }
        }));
    }

    emitPendingCount(count) {
        this.dispatchEvent(new CustomEvent('supervisor-daily-check-reports:pending-count', {
            bubbles: true,
            detail: { count }
        }));
    }

    getStatusMeta(status) {
        if (status === 'approved') {
            return { label: 'Approved', className: 'status-approved' };
        }
        if (status === 'rejected') {
            return { label: 'Rejected', className: 'status-rejected' };
        }
        return { label: 'Pending Review', className: 'status-pending' };
    }

    formatDate(value) {
        if (!value) return 'N/A';
        return new Date(value).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    formatDateTime(value) {
        if (!value) return 'N/A';
        return new Date(value).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

if (!customElements.get('supervisor-daily-check-reports')) {
    customElements.define('supervisor-daily-check-reports', SupervisorDailyCheckReports);
}
