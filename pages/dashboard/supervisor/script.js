// ==================== INITIALIZATION & AUTH ====================

DashboardInit.init('Supervisor', {
    onSuccess: () => {
        bindSupervisorDashboardOverview();
        bindSupervisorFaultTickets();
        bindSupervisorAssetStatus();
        bindSupervisorRepairManagement();
        bindSupervisorBudgetApproval();
        bindSupervisorTechnicians();
        loadDashboardData();

        // Refresh weekly check reports every 30 seconds
        setInterval(() => {
            const currentSection = document.querySelector('.content-section.active')?.id;
            if (currentSection === 'daily-check-reports') {
                loadDailyCheckReports();
            }
        }, 30000);

        // Set up photo upload handler
        const photoInput = document.getElementById('ticketPhotos');
        if (photoInput) {
            photoInput.addEventListener('change', handleCreateTicketPhotoUpload);
        }
    }
});

// ==================== NAVIGATION ====================

document.querySelector('ac-layout')
    ?.addEventListener('section-change', e => loadSectionData(e.detail.section));

// ==================== DATA LOADING ====================

function loadDashboardData() {
    // Load summary data for dashboard
    loadSectionData('dashboard');
}

function loadSectionData(sectionId) {
    switch (sectionId) {
        case 'dashboard':
            // Dashboard already shows static summary
            break;
        case 'reports':
            loadAllReports();
            break;
        case 'daily-check-reports':
            loadDailyCheckReports();
            break;
        case 'fault-tickets':
            refreshSupervisorFaultTickets();
            break;
        case 'repair-management':
            refreshSupervisorRepairManagement();
            break;
        case 'budget-approval':
            refreshSupervisorBudgetApproval();
            break;
        case 'asset-status':
            refreshSupervisorAssetStatus();
            break;
        case 'technicians':
        case 'technician-assignments':
            loadTechnicians();
            break;
    }
}

function bindSupervisorDashboardOverview() {
    const component = document.querySelector('supervisor-dashboard-overview');
    if (!component || component._supervisorDashboardOverviewBound) return;

    component._supervisorDashboardOverviewBound = true;

    component.addEventListener('supervisor-dashboard-overview:navigate', (event) => {
        const section = event.detail?.section;
        const layout = document.querySelector('ac-layout');
        if (!section || !layout || typeof layout.navigateTo !== 'function') return;
        layout.navigateTo(section);
    });
}

function bindSupervisorFaultTickets() {
    const component = document.querySelector('supervisor-fault-tickets');
    if (!component || component.dataset.bound === 'true') return;

    component.dataset.bound = 'true';

    component.addEventListener('supervisor-fault-tickets:filter-status', (event) => {
        const status = event.detail?.status;
        if (!status) return;
        filterTicketsByStatus(status);
    });

    component.addEventListener('supervisor-fault-tickets:filter-source', (event) => {
        const source = event.detail?.source;
        if (!source) return;
        filterTicketsBySource(source);
    });

    component.addEventListener('supervisor-fault-tickets:create-ticket', () => {
        createNewTicket();
    });
}

function refreshSupervisorFaultTickets() {
    const component = document.querySelector('supervisor-fault-tickets');
    if (component && typeof component.setStatusFilter === 'function') {
        component.setStatusFilter(currentTicketStatusFilter);
    }
    if (component && typeof component.setSourceFilter === 'function') {
        component.setSourceFilter(currentTicketSourceFilter);
    }

    loadFaultTickets();
}

function bindSupervisorAssetStatus() {
    const component = document.querySelector('supervisor-asset-status');
    if (!component || component.dataset.bound === 'true') return;

    component.dataset.bound = 'true';

    component.addEventListener('supervisor-asset-status:filter', (event) => {
        const visibleCount = Number(event.detail?.visibleCount);
        if (!Number.isFinite(visibleCount)) return;
        showToast(`Showing ${visibleCount} asset${visibleCount !== 1 ? 's' : ''}`, 'info');
    });

    component.addEventListener('supervisor-asset-status:view', (event) => {
        const assetId = event.detail?.assetId;
        if (!assetId) return;
        viewAssetDetails(assetId);
    });

    component.addEventListener('supervisor-asset-status:update', (event) => {
        const assetId = event.detail?.assetId;
        if (!assetId) return;
        updateAssetStatus(assetId);
    });
}

function refreshSupervisorAssetStatus() {
    const component = document.querySelector('supervisor-asset-status');
    if (!component || typeof component.refresh !== 'function') return;
    component.refresh();
}

function bindSupervisorRepairManagement() {
    const component = document.querySelector('supervisor-repair-management');
    if (!component || component.dataset.bound === 'true') return;

    component.dataset.bound = 'true';

    component.addEventListener('supervisor-repair-management:view-repair-details', (event) => {
        const repairId = event.detail?.repairId;
        if (!repairId) return;
        viewRepairDetails(repairId);
    });

    component.addEventListener('supervisor-repair-management:approve-repair', (event) => {
        const repairId = event.detail?.repairId;
        if (!repairId) return;
        greenLightRepair(repairId);
    });

    component.addEventListener('supervisor-repair-management:reject-repair', (event) => {
        const repairId = event.detail?.repairId;
        if (!repairId) return;
        rejectRepair(repairId);
    });

    component.addEventListener('supervisor-repair-management:outsource-repair', (event) => {
        const repairId = event.detail?.repairId;
        if (!repairId) return;
        markAsOutsourced(repairId);
    });

    component.addEventListener('supervisor-repair-management:view-repair-progress', (event) => {
        const repairId = event.detail?.repairId;
        if (!repairId) return;
        viewRepairProgress(repairId);
    });

    component.addEventListener('supervisor-repair-management:update-repair-timeline', (event) => {
        const repairId = event.detail?.repairId;
        if (!repairId) return;
        updateRepairTimeline(repairId);
    });

    component.addEventListener('supervisor-repair-management:view-outsourced', () => {
        viewAllOutsourced();
    });

    component.addEventListener('supervisor-repair-management:update-component-info', () => {
        updateComponentInfo();
    });
}

function refreshSupervisorRepairManagement() {
    const component = document.querySelector('supervisor-repair-management');
    if (!component) return;

    if (typeof component.refresh === 'function') {
        component.refresh();
    }

    loadRepairs();
}

function bindSupervisorBudgetApproval() {
    const component = document.querySelector('supervisor-budget-approval');
    if (!component || component.dataset.bound === 'true') return;

    component.dataset.bound = 'true';

    component.addEventListener('supervisor-budget-approval:view', (event) => {
        const budgetId = event.detail?.budgetId;
        if (!budgetId) return;
        viewBudgetDetails(budgetId, event.detail?.budget || null);
    });

    component.addEventListener('supervisor-budget-approval:filter', (event) => {
        const visibleCount = Number(event.detail?.visibleCount);
        if (!Number.isFinite(visibleCount)) return;
        showToast(`Showing ${visibleCount} budget${visibleCount !== 1 ? 's' : ''}`, 'info');
    });

    component.addEventListener('supervisor-budget-approval:status-change', (event) => {
        const budgetId = event.detail?.budgetId;
        const status = event.detail?.status;
        if (!budgetId || !status) return;

        if (status === 'approved') {
            showToast(`Budget ${budgetId} approved!`, 'success');
        } else if (status === 'rejected') {
            showToast(`Budget ${budgetId} rejected.`, 'warning');
        }
    });
}

function refreshSupervisorBudgetApproval() {
    const component = document.querySelector('supervisor-budget-approval');
    if (!component || typeof component.refresh !== 'function') return;
    component.refresh();
}

function bindSupervisorTechnicians() {
    const component = document.querySelector('supervisor-technicians');
    if (!component || component.dataset.bound === 'true') return;

    component.dataset.bound = 'true';

    component.addEventListener('supervisor-technicians:view', (event) => {
        const technicianId = Number(event.detail?.technicianId);
        if (!technicianId) return;
        viewTechnicianDetails(technicianId);
    });
}

// ==================== WEEKLY CHECK REPORTS ====================

function updateDashboardSummary(pendingCount) {
    const overview = document.querySelector('supervisor-dashboard-overview');
    if (!overview || typeof overview.updatePendingReports !== 'function') {
        console.warn('supervisor-dashboard-overview not ready; skipping pending report summary update during current render cycle.');
        return;
    }
    overview.updatePendingReports(pendingCount);
}

async function loadDailyCheckReports() {
    const tbody = document.getElementById('reportsTableBody');
    tbody.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Loading reports...</p>';

    try {
        // Fetch both driver vehicle checks and machinery operator checks
        const [vehicleChecksResponse, machineChecksResponse] = await Promise.all([
            API.get('/vehicle-checks'),
            API.get('/machine-weekly-checks')
        ]);

        const reports = [];
        weeklyCheckReportsMap.clear();

        // Process vehicle checks (driver reports)
        if (vehicleChecksResponse.success && vehicleChecksResponse.data) {
            const vehicleChecks = Array.isArray(vehicleChecksResponse.data) ? vehicleChecksResponse.data : [];
            vehicleChecks.forEach(check => {
                const reportObj = {
                    id: check.check_id,
                    asset: check.vehicle_registration || 'N/A',
                    assetName: check.vehicle_registration || 'N/A',
                    submittedBy: check.driver_name || 'Driver',
                    type: 'driver',
                    date: check.submitted_date ? new Date(check.submitted_date).toLocaleDateString() : 'N/A',
                    status: check.status.charAt(0).toUpperCase() + check.status.slice(1),
                    description: check.notes || 'Weekly vehicle check completed',
                    rawData: check
                };
                reports.push(reportObj);
                weeklyCheckReportsMap.set(reportObj.id, reportObj);
            });
        }

        // Process machine weekly checks (machinery operator reports)
        if (machineChecksResponse.status === 'success' && machineChecksResponse.data && machineChecksResponse.data.checks) {
            machineChecksResponse.data.checks.forEach(check => {
                const reportObj = {
                    id: check.check_id,
                    asset: check.machine_name || `Machine ${check.machine_id}`,
                    assetName: check.machine_name || `Machine ${check.machine_id}`,
                    submittedBy: check.operator_name || 'Operator',
                    type: 'operator',
                    date: check.submitted_date ? new Date(check.submitted_date).toLocaleDateString() : 'N/A',
                    status: check.status.charAt(0).toUpperCase() + check.status.slice(1),
                    description: check.notes || 'Weekly machine check completed',
                    rawData: check
                };
                reports.push(reportObj);
                weeklyCheckReportsMap.set(reportObj.id, reportObj);
            });
        }

        // Sort by date (newest first)
        reports.sort((a, b) => {
            const dateA = a.rawData.submitted_date ? new Date(a.rawData.submitted_date) : new Date(0);
            const dateB = b.rawData.submitted_date ? new Date(b.rawData.submitted_date) : new Date(0);
            return dateB - dateA;
        });

        if (reports.length === 0) {
            tbody.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 40px;">No weekly check reports found</p>';
            return;
        }

        tbody.innerHTML = reports.map(report => `
            <div class="inventory-item" data-id="${report.id}" data-type="${report.type}" data-status="${report.status.toLowerCase()}">
                <div class="item-details">
                    <strong><i class="fas fa-clipboard-check"></i> ${report.id} - ${report.assetName}</strong>
                    <div class="item-meta">
                        <i class="fas fa-user"></i> ${report.submittedBy} | 
                        <i class="fas fa-tag"></i> ${report.type.charAt(0).toUpperCase() + report.type.slice(1)}
                    </div>
                    <div class="item-meta">
                        <span class="status-text status-${report.status.toLowerCase()}">${report.status.toUpperCase()}</span> | 
                        <i class="fas fa-calendar"></i> ${report.date}
                    </div>
                </div>
                <div class="item-actions">
                    <div class="action-buttons">
                        <button class="btn btn-primary btn-small" onclick="viewReport('${report.id}', '${report.type}')">
                            <i class="fas fa-eye"></i> VIEW
                        </button>
                        ${report.status === 'Pending' ? `
                            <div class="dropdown-container">
                                <button class="btn btn-small btn-secondary dropdown-trigger" onclick="toggleDropdown(event, 'report-${report.id}')">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <div class="dropdown-menu" id="dropdown-report-${report.id}">
                                    <button class="dropdown-item" onclick="approveReport('${report.id}'); closeAllDropdowns();">
                                        <i class="fas fa-check"></i> Approve
                                    </button>
                                    <button class="dropdown-item danger" onclick="rejectReport('${report.id}'); closeAllDropdowns();">
                                        <i class="fas fa-times"></i> Reject
                                    </button>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('');

        // Update summary count
        const pendingCount = reports.filter(r => r.status.toLowerCase() === 'pending').length;
        updateDashboardSummary(pendingCount);

    } catch (error) {
        console.error('Error loading weekly check reports:', error);
        tbody.innerHTML = '<p style="text-align: center; color: #e74c3c; padding: 40px;">Error loading reports. Please try again.</p>';
    }
}

function filterReportsByStatus(status) {
    const buttons = document.querySelectorAll('#reportStatusFilters .filter-btn');
    buttons.forEach(b => b.classList.remove('active'));

    // Find and activate the clicked button
    const clickedButton = Array.from(buttons).find(btn => {
        const onclickAttr = btn.getAttribute('onclick');
        return onclickAttr && onclickAttr.includes(`'${status}'`);
    });

    if (clickedButton) {
        clickedButton.classList.add('active');
    }

    currentReportStatusFilter = status;
    applyReportFilters();
}

function applyReportFilters() {
    const items = document.querySelectorAll('#reportsTableBody .inventory-item');
    let visibleCount = 0;

    items.forEach(item => {
        const itemStatus = item.getAttribute('data-status');
        const itemType = item.getAttribute('data-type');

        const matchesStatus = currentReportStatusFilter === 'all' || itemStatus === currentReportStatusFilter.toLowerCase();
        const matchesSource = currentReportSourceFilter === 'all' || itemType === currentReportSourceFilter;

        if (matchesStatus && matchesSource) {
            item.style.display = '';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });

    showToast(`Showing ${visibleCount} reports`, 'info');
}

async function viewReport(reportId, reportTypeHint) {
    try {
        // Determine if it's a vehicle check (VCHK-/CHK-) or machine check (MCHK-)
        const cachedReport = weeklyCheckReportsMap.get(reportId);
        const reportType = reportTypeHint || cachedReport?.type;
        const isVehicleCheck = reportId.startsWith('VCHK-') || reportId.startsWith('CHK-') || reportType === 'driver';
        const isMachineCheck = reportId.startsWith('MCHK-') || reportType === 'operator';

        let checkData;

        if (isVehicleCheck) {
            // Fetch vehicle check from API
            const response = await API.get(`/vehicle-checks?id=${reportId}`);
            console.log('Vehicle check API response:', response);
            if (!response || !response.success || !response.data) {
                console.error('Failed response:', response);
                showToast('Failed to load vehicle check report', 'error');
                return;
            }
            checkData = response.data;
            console.log('Vehicle check data:', checkData);

            // Format dates
            const submittedDate = checkData.submitted_date ? new Date(checkData.submitted_date).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : 'N/A';

            const weekStart = checkData.week_start_date ? new Date(checkData.week_start_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            }) : 'N/A';

            const weekEnd = checkData.week_end_date ? new Date(checkData.week_end_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            }) : 'N/A';

            const reviewedDate = checkData.reviewed_date ? new Date(checkData.reviewed_date).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : null;

            // Format status
            let statusLabel = 'Pending Review';
            let statusClass = 'status-pending';
            if (checkData.status === 'approved') {
                statusLabel = 'Approved';
                statusClass = 'status-approved';
            } else if (checkData.status === 'rejected') {
                statusLabel = 'Rejected';
                statusClass = 'status-rejected';
            }

            // Format condition
            const condition = checkData.overall_condition ?
                checkData.overall_condition.charAt(0).toUpperCase() + checkData.overall_condition.slice(1) :
                'N/A';

            // Format only the system checks that drivers actually submit in their form
            const engineOilStatus = checkData.engine_oil === 1 || checkData.engine_oil === true ? '✓ Checked' : '✗ Issues';
            const brakesStatus = checkData.brakes === 1 || checkData.brakes === true ? '✓ Checked' : '✗ Issues';
            const lightsStatus = checkData.lights === 1 || checkData.lights === true ? '✓ Checked' : '✗ Issues';
            const tiresStatus = checkData.tires === 1 || checkData.tires === true ? '✓ Checked' : '✗ Issues';
            const coolantStatus = checkData.coolant === 1 || checkData.coolant === true ? '✓ Checked' : '✗ Issues';
            const wipersStatus = checkData.wipers === 1 || checkData.wipers === true ? '✓ Checked' : '✗ Issues';

            const content = `
                <div class="form-section">
                    <h5><i class="fas fa-info-circle"></i> Basic Information</h5>
                    <p><strong>Check ID:</strong> <span style="color: var(--royal-blue);">${checkData.check_id || 'N/A'}</span></p>
                    <p><strong>Type:</strong> <i class="fas fa-car"></i> Driver Vehicle Check</p>
                    <p><strong>Week Period:</strong> ${weekStart} - ${weekEnd}</p>
                    <p><strong>Submitted:</strong> ${submittedDate}</p>
                    <p><strong>Status:</strong> <span class="status-text ${statusClass}">${statusLabel}</span></p>
                </div>

                <div class="form-section">
                    <h5><i class="fas fa-truck"></i> Vehicle Information</h5>
                    <p><strong>Vehicle Registration:</strong> ${checkData.vehicle_registration || 'Not provided'}</p>
                    <p><strong>Driver:</strong> ${checkData.driver_name || (checkData.driver_id ? 'Driver ID: ' + checkData.driver_id : 'Not assigned')}</p>
                    <p><strong>Odometer Reading:</strong> ${checkData.odometer_reading ? checkData.odometer_reading.toLocaleString() + ' km' : 'Not recorded'}</p>
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
                    <p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px; white-space: pre-wrap;">${checkData.notes}</p>
                </div>
                ` : ''}

                ${checkData.issues_found ? `
                <div class="form-section">
                    <h5><i class="fas fa-exclamation-triangle"></i> Issues Found</h5>
                    <p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px; border-left: 3px solid #dc3545; white-space: pre-wrap;">${checkData.issues_found}</p>
                </div>
                ` : ''}

                ${checkData.status !== 'pending' ? `
                <div class="form-section">
                    <h5><i class="fas fa-check-circle"></i> Review Details</h5>
                    ${checkData.reviewed_by_name ? `<p><strong>Reviewed By:</strong> ${checkData.reviewed_by_name}</p>` : ''}
                    ${reviewedDate ? `<p><strong>Review Date:</strong> ${reviewedDate}</p>` : ''}
                    ${checkData.rejection_reason ? `<p><strong>Rejection Reason:</strong></p><p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px; border-left: 3px solid #e74c3c; white-space: pre-wrap;">${checkData.rejection_reason}</p>` : ''}
                </div>
                ` : ''}
            `;

            document.getElementById('reportDetailsModalTitle').innerHTML = '<i class="fas fa-car"></i> Vehicle Weekly Check Report';
            document.getElementById('reportDetailsModalContent').innerHTML = content;

            // Update modal footer with action buttons for pending reports
            updateModalFooter(reportId, checkData.status);

            openReportDetailsModal();

        } else if (isMachineCheck) {
            // Fetch machine check from API
            const response = await API.get(`/machine-weekly-checks?id=${reportId}`);
            if (!response || response.status !== 'success' || !response.data || !response.data.check) {
                console.error('Failed to load machine check report. Response:', response);
                showToast('Failed to load machine check report', 'error');
                return;
            }
            checkData = response.data.check;

            // Format dates
            const submittedDate = checkData.submitted_date ? new Date(checkData.submitted_date).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : 'N/A';

            const weekStart = checkData.week_start_date ? new Date(checkData.week_start_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            }) : 'N/A';

            const weekEnd = checkData.week_end_date ? new Date(checkData.week_end_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            }) : 'N/A';

            const reviewedDate = checkData.reviewed_date ? new Date(checkData.reviewed_date).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : null;

            // Format status
            let statusLabel = 'Pending Review';
            let statusClass = 'status-pending';
            if (checkData.status === 'approved') {
                statusLabel = 'Approved';
                statusClass = 'status-approved';
            } else if (checkData.status === 'rejected') {
                statusLabel = 'Rejected';
                statusClass = 'status-rejected';
            }

            // Format condition
            const condition = checkData.overall_condition ?
                checkData.overall_condition.charAt(0).toUpperCase() + checkData.overall_condition.slice(1) :
                'N/A';

            // Format system statuses
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
                    <p><strong>Check ID:</strong> <span style="color: var(--royal-blue);">${checkData.check_id}</span></p>
                    <p><strong>Type:</strong> <i class="fas fa-cogs"></i> Machinery Operator Check</p>
                    <p><strong>Week Period:</strong> ${weekStart} - ${weekEnd}</p>
                    <p><strong>Submitted:</strong> ${submittedDate}</p>
                    <p><strong>Status:</strong> <span class="status-text ${statusClass}">${statusLabel}</span></p>
                </div>

                <div class="form-section">
                    <h5><i class="fas fa-cog"></i> Machine Information</h5>
                    <p><strong>Machine:</strong> ${checkData.machine_name || 'Machine ID: ' + checkData.machine_id}</p>
                    ${checkData.operator_name ? `<p><strong>Operator:</strong> ${checkData.operator_name}</p>` : ''}
                </div>

                <div class="form-section">
                    <h5><i class="fas fa-chart-bar"></i> Overall Condition</h5>
                    <p><strong>Overall Assessment:</strong> ${condition}</p>
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
                    <p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px; white-space: pre-wrap;">${checkData.notes}</p>
                </div>
                ` : ''}

                ${checkData.issues_found ? `
                <div class="form-section">
                    <h5><i class="fas fa-exclamation-triangle"></i> Issues Found</h5>
                    <p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px; border-left: 3px solid #dc3545; white-space: pre-wrap;">${checkData.issues_found}</p>
                </div>
                ` : ''}

                ${checkData.status !== 'pending' ? `
                <div class="form-section">
                    <h5><i class="fas fa-check-circle"></i> Review Details</h5>
                    ${checkData.reviewed_by_name ? `<p><strong>Reviewed By:</strong> ${checkData.reviewed_by_name}</p>` : ''}
                    ${reviewedDate ? `<p><strong>Review Date:</strong> ${reviewedDate}</p>` : ''}
                    ${checkData.rejection_reason ? `<p><strong>Rejection Reason:</strong></p><p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px; border-left: 3px solid #e74c3c; white-space: pre-wrap;">${checkData.rejection_reason}</p>` : ''}
                </div>
                ` : ''}
            `;

            const modalTitle = document.getElementById('reportDetailsModalTitle');
            const modalContent = document.getElementById('reportDetailsModalContent');

            if (!modalTitle || !modalContent) {
                console.error('Modal elements not found in DOM');
                showToast('Error: Modal elements not found', 'error');
                return;
            }

            modalTitle.innerHTML = '<i class="fas fa-cogs"></i> Machine Weekly Check Report';
            modalContent.innerHTML = content;

            // Update modal footer with action buttons for pending reports
            updateModalFooter(reportId, checkData.status);

            openReportDetailsModal();

        } else {
            console.error('Invalid report type. ID:', reportId, 'Type:', reportType);
            showToast('Invalid report ID format', 'error');
        }

    } catch (error) {
        console.error('Error viewing report:', error);
        showToast('Error loading report details', 'error');
    }
}

async function approveReport(reportId) {
    console.log('Approving report:', reportId);
    // Determine if it's a vehicle check (VCHK-) or machine check (MCHK-)
    const isVehicleCheck = reportId.startsWith('VCHK-') || reportId.startsWith('CHK-');
    const isMachineCheck = reportId.startsWith('MCHK-');

    if (!isVehicleCheck && !isMachineCheck) {
        showToast('Invalid report ID format', 'error');
        return;
    }

    createConfirmationDialog(
        'Approve Report',
        `Are you sure you want to approve report ${reportId}?`,
        async () => {
            // Show loading state
            showToast('Processing approval...', 'info');

            try {
                // Get current user ID (supervisor) from localStorage for faster access
                const currentUser = Auth.getCurrentUser();
                const reviewerId = currentUser?.id || 1;

                console.log('Sending approve request for:', reportId, 'by reviewer:', reviewerId);

                let response;
                if (isVehicleCheck) {
                    // Approve vehicle check
                    response = await API.put(`/vehicle-checks/${reportId}/approve`, {
                        reviewed_by: reviewerId,
                        notes: 'Approved by supervisor'
                    });
                } else if (isMachineCheck) {
                    // Approve machine check
                    response = await API.post(`/machine-weekly-checks/${reportId}/approve`, {
                        reviewed_by: reviewerId,
                        notes: 'Approved by supervisor'
                    });
                }

                console.log('Approve response:', response);

                // Check for success - handle both response formats (success: true or status: 'success')
                const isSuccess = response && (response.success === true || response.status === 'success');

                if (isSuccess) {
                    showToast(`Report ${reportId} approved successfully!`, 'success');
                    // Close the modal if open
                    closeReportDetailsModal();
                    // Reload the reports list to show updated status
                    await loadDailyCheckReports();
                } else {
                    showToast(`Failed to approve report: ${response?.message || 'Unknown error'}`, 'error');
                }
            } catch (error) {
                console.error('Error approving report:', error);
                showToast(`Error approving report: ${error.message || 'Network error. Please try again.'}`, 'error');
            }
        },
        'primary'
    );
}

// Store the report ID for rejection
let pendingRejectionReportId = null;

async function rejectReport(reportId) {
    console.log('Rejecting report:', reportId);
    // Determine if it's a vehicle check (VCHK-) or machine check (MCHK-)
    const isVehicleCheck = reportId.startsWith('VCHK-') || reportId.startsWith('CHK-');
    const isMachineCheck = reportId.startsWith('MCHK-');

    if (!isVehicleCheck && !isMachineCheck) {
        showToast('Invalid report ID format', 'error');
        return;
    }

    // Store report ID and show rejection reason modal
    pendingRejectionReportId = reportId;
    document.getElementById('rejectionReasonText').value = '';
    document.getElementById('rejectionReasonError').style.display = 'none';
    openRejectionReasonModal();
}

// Open rejection reason modal
function openRejectionReasonModal() {
    const modal = document.getElementById('rejectionReasonModal');
    if (!modal) {
        console.error('rejectionReasonModal element not found in DOM');
        showToast('Error: Modal not found', 'error');
        return;
    }

    modal.style.display = 'flex';
    modal.style.opacity = '0';
    document.body.style.overflow = 'hidden';

    void modal.offsetHeight;

    requestAnimationFrame(() => {
        modal.style.opacity = '1';
        // Focus on textarea
        setTimeout(() => {
            document.getElementById('rejectionReasonText')?.focus();
        }, 100);
    });
}

// Close rejection reason modal
function closeRejectionReasonModal() {
    const modal = document.getElementById('rejectionReasonModal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            pendingRejectionReportId = null;
        }, 300);
    }
}

// Submit rejection with reason from form
async function submitRejection() {
    const reason = document.getElementById('rejectionReasonText').value.trim();
    const errorElement = document.getElementById('rejectionReasonError');

    // Validate reason
    if (!reason) {
        errorElement.style.display = 'block';
        document.getElementById('rejectionReasonText').style.borderColor = '#ef4444';
        return;
    }

    errorElement.style.display = 'none';
    document.getElementById('rejectionReasonText').style.borderColor = '#cbd5e1';

    const reportId = pendingRejectionReportId;
    if (!reportId) {
        showToast('Invalid report ID', 'error');
        return;
    }

    // Determine check type
    const isVehicleCheck = reportId.startsWith('VCHK-') || reportId.startsWith('CHK-');
    const isMachineCheck = reportId.startsWith('MCHK-');

    // Close rejection modal
    closeRejectionReasonModal();

    // Show confirmation dialog
    createConfirmationDialog(
        'Reject Report',
        `Are you sure you want to reject report ${reportId}? The submitter will be notified.`,
        async () => {
            // Show loading state
            showToast('Processing rejection...', 'info');

            try {
                // Get current user ID (supervisor) from localStorage for faster access
                const currentUser = Auth.getCurrentUser();
                const reviewerId = currentUser?.id || 1;

                console.log('Sending reject request for:', reportId, 'by reviewer:', reviewerId);

                let response;
                if (isVehicleCheck) {
                    // Reject vehicle check
                    response = await API.put(`/vehicle-checks/${reportId}/reject`, {
                        reviewed_by: reviewerId,
                        rejection_reason: reason,
                        notes: 'Rejected by supervisor'
                    });
                } else if (isMachineCheck) {
                    // Reject machine check
                    response = await API.post(`/machine-weekly-checks/${reportId}/reject`, {
                        reviewed_by: reviewerId,
                        rejection_reason: reason,
                        notes: 'Rejected by supervisor'
                    });
                }

                console.log('Reject response:', response);

                // Check for success - handle both response formats (success: true or status: 'success')
                const isSuccess = response && (response.success === true || response.status === 'success');

                if (isSuccess) {
                    showToast(`Report ${reportId} rejected`, 'warning');
                    // Close the modal if open
                    closeReportDetailsModal();
                    // Reload the reports list to show updated status
                    await loadDailyCheckReports();
                } else {
                    showToast(`Failed to reject report: ${response?.message || 'Unknown error'}`, 'error');
                }
            } catch (error) {
                console.error('Error rejecting report:', error);
                showToast(`Error rejecting report: ${error.message || 'Network error. Please try again.'}`, 'error');
            }
        },
        'danger'
    );
}

// ==================== FAULT TICKETS ====================

let currentTicketStatusFilter = 'all';
let currentTicketSourceFilter = 'all';
let allTickets = []; // Store all tickets for filtering
let allBreakdownItems = []; // Store breakdown reports for unassigned list

async function loadFaultTickets() {
    try {
        const faultTickets = document.querySelector('supervisor-fault-tickets');
        if (faultTickets && typeof faultTickets.setLoading === 'function') {
            faultTickets.setLoading();
        } else {
            const unassignedList = document.getElementById('unassignedTicketsList');
            const activeList = document.getElementById('activeTicketsList');

            if (unassignedList) {
                unassignedList.innerHTML = '<p style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> Loading...</p>';
            }

            if (activeList) {
                activeList.innerHTML = '<p style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> Loading tickets...</p>';
            }
        }

        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);

        // Fetch fault tickets + breakdown reports + route breakdowns + machine breakdowns in parallel
        console.log('Fetching fault tickets and breakdown reports...');
        const [ticketResponse, breakdownResponse, routeResponse, machineResponse] = await Promise.all([
            API.get('/fault-tickets'),
            fetch(`${CONFIG.API_BASE_URL}/breakdown-reports`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(r => r.json()).catch(() => null),
            fetch(`${CONFIG.API_BASE_URL}/route-breakdowns`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(r => r.json()).catch(() => null),
            fetch(`${CONFIG.API_BASE_URL}/machine-breakdowns`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(r => r.json()).catch(() => null)
        ]);

        console.log('Fault tickets response:', ticketResponse);
        console.log('Breakdown reports response:', breakdownResponse);
        console.log('Route breakdowns response:', routeResponse);
        console.log('Machine breakdowns response:', machineResponse);

        if (ticketResponse.status === 'success' && ticketResponse.data) {
            // Handle nested data structure: {data: {tickets: []}}
            allTickets = ticketResponse.data.tickets || ticketResponse.data || [];
            console.log('Loaded tickets:', allTickets.length);
        } else {
            console.error('Invalid ticket response:', ticketResponse);
            allTickets = [];
        }

        // Process breakdown reports into unassigned items
        allBreakdownItems = [];

        // Collect all fault ticket breakdown_report_ids to avoid duplicates
        // The fault_tickets table has breakdown_report_id and breakdown_type fields
        const linkedBreakdownIds = new Set();
        allTickets.forEach(t => {
            if (t.breakdown_report_id) {
                linkedBreakdownIds.add(String(t.breakdown_report_id));
            }
        });

        console.log('=== DEBUG: Linked Breakdown IDs ===');
        console.log('linkedBreakdownIds:', Array.from(linkedBreakdownIds));

        // Process vehicle breakdown reports
        if (breakdownResponse && breakdownResponse.status === 'success' && breakdownResponse.data && breakdownResponse.data.reports) {
            console.log('=== DEBUG: Processing vehicle breakdowns ===');
            console.log('Total breakdown reports received:', breakdownResponse.data.reports.length);

            breakdownResponse.data.reports.forEach(report => {
                console.log(`Checking breakdown: id=${report.id}, breakdown_id=${report.breakdown_id}, has_fault_ticket=${!!report.fault_ticket_id}`);

                // Skip if already linked to a fault ticket
                const isLinkedById = linkedBreakdownIds.has(String(report.breakdown_id));
                const isLinkedByNumericId = linkedBreakdownIds.has(String(report.id));
                console.log(`  - linkedByBreakdownId (${report.breakdown_id}): ${isLinkedById}`);
                console.log(`  - linkedByNumericId (${report.id}): ${isLinkedByNumericId}`);

                if (isLinkedById || isLinkedByNumericId) {
                    console.log(`  -> SKIPPED (already linked)`);
                    return;
                }

                console.log(`  -> ADDED to unassigned list`);
                allBreakdownItems.push({
                    id: report.id,
                    breakdown_id: report.breakdown_id,
                    type: 'vehicle_breakdown',
                    vehicle_id: report.vehicle_id,
                    description: report.description || 'Vehicle breakdown reported',
                    severity: report.severity || 'Medium',
                    status: report.status || 'Pending',
                    driver_name: report.driver_name || 'Unknown Driver',
                    number_plate: report.number_plate || 'N/A',
                    breakdown_date: report.breakdown_date,
                    breakdown_type: report.breakdown_type || 'Breakdown',
                    created_at: report.breakdown_date || report.created_at,
                    source: 'driver'
                });
            });
            console.log('Loaded vehicle breakdowns:', breakdownResponse.data.reports.length);
        }

        // Process route breakdown reports
        if (routeResponse && routeResponse.status === 'success' && routeResponse.data && routeResponse.data.breakdowns) {
            routeResponse.data.breakdowns.forEach(breakdown => {
                // Skip if already linked to a fault ticket
                if (linkedBreakdownIds.has(String(breakdown.route_breakdown_id)) || linkedBreakdownIds.has(String(breakdown.id))) return;

                allBreakdownItems.push({
                    id: breakdown.id,
                    breakdown_id: breakdown.route_breakdown_id,
                    type: 'route_breakdown',
                    vehicle_id: breakdown.vehicle_id,
                    description: breakdown.description || 'Route breakdown reported',
                    severity: breakdown.severity || 'Medium',
                    status: breakdown.status || 'Pending',
                    driver_name: breakdown.driver_name || 'Unknown Driver',
                    number_plate: breakdown.number_plate || 'N/A',
                    breakdown_date: breakdown.breakdown_datetime || breakdown.breakdown_date,
                    breakdown_type: breakdown.breakdown_type || 'In-Route',
                    breakdown_location: breakdown.breakdown_location || '',
                    created_at: breakdown.breakdown_datetime || breakdown.created_at,
                    source: 'driver'
                });
            });
            console.log('Loaded route breakdowns:', routeResponse.data.breakdowns.length);
        }

        // Process machine breakdown reports (from machinery operators)
        // These should appear as fault tickets directly in the supervisor view
        if (machineResponse && machineResponse.status === 'success' && machineResponse.data && machineResponse.data.reports) {
            console.log('=== DEBUG: Processing machine breakdowns into fault tickets ===');
            console.log('Total machine breakdown reports received:', machineResponse.data.reports.length);

            machineResponse.data.reports.forEach(report => {
                // Skip if already linked to a fault ticket (it's already in allTickets)
                const isLinked = linkedBreakdownIds.has(String(report.breakdown_id)) || linkedBreakdownIds.has(String(report.id));
                if (isLinked) {
                    console.log(`  Machine breakdown ${report.breakdown_id} -> SKIPPED (already has a fault ticket)`);
                    return;
                }

                // Map severity to priority
                const severityMap = { 'critical': 'Critical', 'high': 'High', 'medium': 'Medium', 'low': 'Low' };
                const priority = severityMap[(report.severity || 'medium').toLowerCase()] || 'Medium';

                console.log(`  Machine breakdown ${report.breakdown_id} -> ADDED to fault tickets list`);
                // Add directly to allTickets as a ticket-like object so it appears in the fault tickets view
                allTickets.push({
                    id: report.id,
                    ticket_id: report.breakdown_id, // e.g. MBD-014
                    machine_id: report.machine_id,
                    machine_name: report.machine_name || report.machine_model || 'Unknown Machine',
                    machine_model_number: report.machine_model || report.machine_name || '',
                    breakdown_report_id: report.breakdown_id,
                    breakdown_type: 'machine_breakdown',
                    reported_by: report.operator_id,
                    reporter_full_name: report.operator_name || 'Unknown Operator',
                    reporter_role: 'Machinary Operator', // Set the reporter role
                    description: report.description || 'Machine breakdown reported',
                    priority: priority,
                    status: report.status || 'Open',
                    created_at: report.breakdown_date || report.created_at,
                    updated_at: report.updated_at || report.breakdown_date,
                    source: 'machinery_operator',
                    is_machine_breakdown: true, // flag to identify these
                    original_report: report // keep original data for actions
                });
            });
            console.log('Machine breakdowns added to fault tickets:', machineResponse.data.reports.length);
        }

        console.log('Total breakdown items for unassigned list:', allBreakdownItems.length);

        // Apply current filters
        displayFilteredTickets();

    } catch (error) {
        console.error('Error loading fault tickets:', error);

        const faultTickets = document.querySelector('supervisor-fault-tickets');
        if (faultTickets && typeof faultTickets.setError === 'function') {
            faultTickets.setError('Error loading tickets');
        } else {
            const unassignedList = document.getElementById('unassignedTicketsList');
            const activeList = document.getElementById('activeTicketsList');

            if (unassignedList) {
                unassignedList.innerHTML = '<p style="text-align: center; color: var(--danger);">Error loading tickets</p>';
            }

            if (activeList) {
                activeList.innerHTML = '<p style="text-align: center; color: var(--danger);">Error loading tickets</p>';
            }
        }

        showToast('Failed to load fault tickets', 'error');
    }
}

function displayFilteredTickets() {
    const unassignedList = document.getElementById('unassignedTicketsList');
    if (!unassignedList) return;

    // Filter tickets based on current filters
    let filteredTickets = allTickets.filter(ticket => {
        // Status filter
        let matchesStatus = true;
        if (currentTicketStatusFilter !== 'all') {
            const ticketStatus = (ticket.status || '').toLowerCase().replace(' ', '-');
            const hasAssignments = ticket.assignments && ticket.assignments.length > 0;

            if (currentTicketStatusFilter === 'unassigned') {
                matchesStatus = !hasAssignments;
            } else if (currentTicketStatusFilter === 'assigned') {
                matchesStatus = hasAssignments && ticketStatus !== 'completed' && ticketStatus !== 'resolved';
            } else if (currentTicketStatusFilter === 'in-progress') {
                matchesStatus = ticketStatus === 'in-progress' || ticketStatus === 'in progress';
            } else if (currentTicketStatusFilter === 'completed') {
                matchesStatus = ticketStatus === 'completed' || ticketStatus === 'resolved' || ticketStatus === 'closed';
            }
        }

        // Source filter
        let matchesSource = true;
        if (currentTicketSourceFilter !== 'all') {
            const reporterRole = (ticket.reporter_role || ticket.reported_by_role || '').toLowerCase();
            matchesSource = reporterRole.includes(currentTicketSourceFilter.toLowerCase());
        }

        return matchesStatus && matchesSource;
    });

    // Separate into unassigned, assigned (active), and resolved
    const unassignedTickets = filteredTickets.filter(t => !t.assignments || t.assignments.length === 0);
    const assignedTickets = filteredTickets.filter(t => t.assignments && t.assignments.length > 0 && t.status !== 'Resolved' && t.status !== 'Closed');
    const resolvedTickets = filteredTickets.filter(t => t.assignments && t.assignments.length > 0 && (t.status === 'Resolved' || t.status === 'Closed'));

    // Filter breakdown reports based on source filter
    let filteredBreakdowns = allBreakdownItems.filter(b => {
        // Only show in unassigned filter or all filter
        if (currentTicketStatusFilter !== 'all' && currentTicketStatusFilter !== 'unassigned') return false;

        // Source filter - breakdowns are always from drivers
        if (currentTicketSourceFilter !== 'all' && currentTicketSourceFilter !== 'driver') return false;

        return true;
    });

    // Build unassigned HTML: combine unassigned tickets + breakdown reports
    let unassignedHTML = '';

    // Render breakdown reports first (driver + machinery operator breakdown reports)
    if (filteredBreakdowns.length > 0) {
        unassignedHTML += filteredBreakdowns.map(report => {
            const isRoute = report.type === 'route_breakdown';
            const isMachine = report.type === 'machine_breakdown';
            const reportId = report.breakdown_id || `BD-${report.id}`;
            const description = report.description || 'No description';
            const shortDesc = description.split('\n')[0] || description;
            const severity = (report.severity || 'Medium').toLowerCase();
            const createdDate = new Date(report.created_at || report.breakdown_date);
            const formattedDate = createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const formattedTime = createdDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const assetName = isMachine ? (report.machine_model || 'Unknown Machine') : (report.number_plate || 'Unknown Vehicle');
            const reporterName = isMachine ? (report.operator_name || 'Unknown Operator') : (report.driver_name || 'Unknown');
            const assetIcon = isMachine ? 'fas fa-cogs' : 'fas fa-wrench';
            const sourceLabel = isMachine ? 'Machine' : (isRoute ? 'Route' : 'Vehicle');

            return `
                <div class="inventory-item">
                    <div class="item-details">
                        <strong><i class="fas fa-ticket-alt"></i> ${reportId} <span style="font-size: 10px; background: ${isMachine ? '#7c3aed' : '#2563eb'}; color: white; padding: 1px 6px; border-radius: 4px; margin-left: 6px;">${sourceLabel}</span></strong>
                        <div class="item-meta">
                            <i class="${assetIcon}"></i> ${assetName} | 
                            <i class="fas fa-user"></i> ${reporterName}
                        </div>
                        <div class="item-description">
                            ${shortDesc}
                        </div>
                        <div class="item-meta">
                            <span class="status-text status-${severity}">${severity.toUpperCase()}</span> | 
                            ${isMachine ? `<i class="fas fa-tools"></i> ${report.breakdown_type || 'Machine Fault'} | ` : ''}
                            <i class="fas fa-calendar"></i> ${formattedDate} ${formattedTime}
                        </div>
                    </div>
                    <div class="item-actions">
                        <div class="action-buttons">
                            <button class="btn btn-primary btn-small" onclick="viewBreakdownDetails('${report.type}', ${report.id})"><i class="fas fa-eye"></i> VIEW</button>
                            <div class="dropdown-container">
                                <button class="btn btn-small btn-secondary dropdown-trigger" onclick="toggleDropdown(event, 'breakdown-${report.type}-${report.id}')">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <div class="dropdown-menu" id="dropdown-breakdown-${report.type}-${report.id}">
                                    <button class="dropdown-item" onclick="assignBreakdownTicket('${report.type}', ${report.id}); closeAllDropdowns();">
                                        <i class="fas fa-user-plus"></i> Assign Technician
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Render unassigned fault tickets
    if (unassignedTickets.length > 0) {
        unassignedHTML += unassignedTickets.map(ticket => {
            const isMachineBreakdown = ticket.is_machine_breakdown === true;
            const assetName = ticket.machine_model_number || ticket.machine_name || `Machine #${ticket.machine_id}`;
            const description = ticket.description || 'No description';
            const reporterName = ticket.reported_by_name || ticket.reporter_full_name || 'Unknown';
            const createdDate = new Date(ticket.created_at);
            const formattedDate = createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const formattedTime = createdDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

            const priority = (ticket.priority || 'Medium').toLowerCase();
            const shortDesc = description.split('\n')[0] || description;

            // For machine breakdown tickets, display the breakdown_report_id (e.g., MBD-005)
            // For regular fault tickets, display the ticket_id
            const displayTicketId = (ticket.breakdown_type === 'machine_breakdown' && ticket.breakdown_report_id)
                ? ticket.breakdown_report_id
                : (ticket.ticket_id || ('MBD-' + String(ticket.id).padStart(3, '0')));

            // For machine breakdowns, use assignBreakdownTicket which creates the fault ticket first
            const viewAction = isMachineBreakdown
                ? `viewMachineBreakdownInSupervisor(${ticket.id})`
                : `viewTicketDetails(${ticket.id})`;
            const assignAction = isMachineBreakdown
                ? `assignBreakdownTicket('machine_breakdown', ${ticket.id}); closeAllDropdowns();`
                : `assignTicket(${ticket.id}); closeAllDropdowns();`;
            const sourceTag = isMachineBreakdown
                ? `<span style="font-size: 10px; background: #7c3aed; color: white; padding: 1px 6px; border-radius: 4px; margin-left: 6px;">Machine</span>`
                : '';
            const assetIcon = isMachineBreakdown ? 'fas fa-cogs' : 'fas fa-wrench';

            return `
                <div class="inventory-item">
                    <div class="item-details">
                        <strong><i class="fas fa-ticket-alt"></i> ${displayTicketId} ${sourceTag}</strong>
                        <div class="item-meta">
                            <i class="${assetIcon}"></i> ${assetName} | 
                            <i class="fas fa-user"></i> ${reporterName}
                        </div>
                        <div class="item-description">
                            ${shortDesc}
                        </div>
                        <div class="item-meta">
                            <span class="status-text status-${priority}">${priority.toUpperCase()}</span> | 
                            <i class="fas fa-calendar"></i> ${formattedDate} ${formattedTime}
                        </div>
                    </div>
                    <div class="item-actions">
                        <div class="action-buttons">
                            <button class="btn btn-primary btn-small" onclick="${viewAction}"><i class="fas fa-eye"></i> VIEW</button>
                            <div class="dropdown-container">
                                <button class="btn btn-small btn-secondary dropdown-trigger" onclick="toggleDropdown(event, 'ticket-${displayTicketId}')">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <div class="dropdown-menu" id="dropdown-ticket-${displayTicketId}">
                                    <button class="dropdown-item" onclick="${assignAction}">
                                        <i class="fas fa-user-plus"></i> Assign Technician
                                    </button>
                                    ${!isMachineBreakdown ? `
                                    <button class="dropdown-item" onclick="editTicket(${ticket.id}); closeAllDropdowns();">
                                        <i class="fas fa-edit"></i> Edit Ticket
                                    </button>
                                    <button class="dropdown-item danger" onclick="deleteTicket(${ticket.id}); closeAllDropdowns();">
                                        <i class="fas fa-trash"></i> Delete
                                    </button>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Display combined unassigned content
    if (unassignedHTML) {
        unassignedList.innerHTML = unassignedHTML;
    } else {
        unassignedList.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 20px;">No unassigned tickets or breakdown reports match the current filters</p>';
    }

    // Display assigned tickets
    const activeList = document.getElementById('activeTicketsList');
    if (assignedTickets.length > 0) {
        activeList.innerHTML = assignedTickets.map(ticket => {
            const assetName = ticket.machine_model_number || ticket.machine_name || `Machine #${ticket.machine_id}`;
            const description = ticket.description || 'No description';
            const shortDesc = description.split('\n')[0];

            const assignedTo = ticket.assignments && ticket.assignments.length > 0
                ? ticket.assignments.map(a => a.technician_name).join(', ')
                : 'Unassigned';

            const priority = (ticket.priority || 'Medium').toLowerCase();
            const status = (ticket.status || 'open').toLowerCase().replace(' ', '-');

            // For machine breakdown tickets, display the breakdown_report_id (e.g., MBD-005)
            // For regular fault tickets, display the ticket_id
            const displayTicketId = (ticket.breakdown_type === 'machine_breakdown' && ticket.breakdown_report_id)
                ? ticket.breakdown_report_id
                : (ticket.ticket_id || ('MBD-' + String(ticket.id).padStart(3, '0')));

            return `
                <div class="inventory-item">
                    <div class="item-details">
                        <strong><i class="fas fa-ticket-alt"></i> ${displayTicketId}</strong>
                        <div class="item-meta">
                            <i class="fas fa-wrench"></i> ${assetName} | 
                            <i class="fas fa-user-cog"></i> ${assignedTo}
                        </div>
                        <div class="item-description">
                            ${shortDesc}
                        </div>
                        <div class="item-meta">
                            <span class="status-text status-${priority}">${(ticket.priority || 'MEDIUM').toUpperCase()}</span> | 
                            <span class="status-text status-${status}">${(ticket.status || 'OPEN').toUpperCase().replace('-', ' ')}</span>
                        </div>
                    </div>
                    <div class="item-actions">
                        <div class="action-buttons">
                            <button class="btn btn-primary btn-small" onclick="viewTicketDetails(${ticket.id})"><i class="fas fa-eye"></i> VIEW</button>
                            <div class="dropdown-container">
                                <button class="btn btn-small btn-secondary dropdown-trigger" onclick="toggleDropdown(event, 'active-${ticket.id}')">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <div class="dropdown-menu" id="dropdown-active-${ticket.id}">
                                    <button class="dropdown-item" onclick="editTicketAssignment(${ticket.id}); closeAllDropdowns();">
                                        <i class="fas fa-edit"></i> Edit Assignment
                                    </button>
                                    <button class="dropdown-item" onclick="reassignTicket(${ticket.id}); closeAllDropdowns();">
                                        <i class="fas fa-user-cog"></i> Reassign
                                    </button>
                                    <button class="dropdown-item" onclick="markTicketComplete(${ticket.id}); closeAllDropdowns();">
                                        <i class="fas fa-check-circle"></i> Mark Complete
                                    </button>
                                    <button class="dropdown-item" onclick="printTicket(${ticket.id}); closeAllDropdowns();">
                                        <i class="fas fa-print"></i> Print
                                    </button>
                                    <button class="dropdown-item danger" onclick="deleteTicket(${ticket.id}); closeAllDropdowns();">
                                        <i class="fas fa-trash"></i> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        activeList.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 20px;">No assigned tickets match the current filters</p>';
    }

    // Display resolved/completed tickets
    const resolvedList = document.getElementById('resolvedTicketsList');
    if (resolvedList) {
        if (resolvedTickets.length > 0) {
            resolvedList.innerHTML = resolvedTickets.map(ticket => {
                const assetName = ticket.machine_model_number || ticket.machine_name || `Machine #${ticket.machine_id}`;
                const description = ticket.description || 'No description';
                const shortDesc = description.split('\n')[0];

                const assignedTo = ticket.assignments && ticket.assignments.length > 0
                    ? ticket.assignments.map(a => a.technician_name).join(', ')
                    : 'Unassigned';

                const priority = (ticket.priority || 'Medium').toLowerCase();

                // For machine breakdown tickets, display the breakdown_report_id (e.g., MBD-005)
                // For regular fault tickets, display the ticket_id
                const displayTicketId = (ticket.breakdown_type === 'machine_breakdown' && ticket.breakdown_report_id)
                    ? ticket.breakdown_report_id
                    : (ticket.ticket_id || ('MBD-' + String(ticket.id).padStart(3, '0')));

                return `
                    <div class="inventory-item" style="border-left: 4px solid #10b981;">
                        <div class="item-details">
                            <strong><i class="fas fa-ticket-alt"></i> ${displayTicketId}</strong>
                            <div class="item-meta">
                                <i class="fas fa-wrench"></i> ${assetName} | 
                                <i class="fas fa-user-cog"></i> ${assignedTo}
                            </div>
                            <div class="item-description">
                                ${shortDesc}
                            </div>
                            <div class="item-meta">
                                <span class="status-text status-${priority}">${(ticket.priority || 'MEDIUM').toUpperCase()}</span> | 
                                <span class="status-badge" style="background: #10b981; color: white; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;"><i class="fas fa-check-circle"></i> FINISHED</span>
                                ${ticket.resolution_notes ? `<br><i class="fas fa-clipboard-check" style="color: #10b981;"></i> <span style="color: #6b7280; font-size: 12px;">${ticket.resolution_notes}</span>` : ''}
                            </div>
                        </div>
                        <div class="item-actions">
                            <div class="action-buttons">
                                <button class="btn btn-primary btn-small" onclick="viewTicketDetails(${ticket.id})"><i class="fas fa-eye"></i> VIEW</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            resolvedList.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 20px;">No resolved tickets</p>';
        }
    }
}

function filterTicketsByStatus(status) {
    currentTicketStatusFilter = status;

    const component = document.querySelector('supervisor-fault-tickets');
    if (component && typeof component.setStatusFilter === 'function') {
        component.setStatusFilter(status);
    }

    displayFilteredTickets();
    showToast(`Showing ${status === 'all' ? 'all' : status} tickets`);
}

function filterTicketsBySource(source) {
    currentTicketSourceFilter = source;

    const component = document.querySelector('supervisor-fault-tickets');
    if (component && typeof component.setSourceFilter === 'function') {
        component.setSourceFilter(source);
    }

    displayFilteredTickets();
    showToast(`Showing ${source === 'all' ? 'all sources' : source + ' tickets'}`);
}

async function createNewTicket() {
    // Load breakdown reports for dropdown
    await loadBreakdownReportsForTicket();

    // Show modal
    const modal = document.getElementById('createTicketModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Reset form
    const form = document.getElementById('createTicketForm');
    form.reset();

    // Clear photos
    createTicketPhotos = [];
    updateCreateTicketPhotoPreview();
}

// Load breakdown reports for ticket creation
async function loadBreakdownReportsForTicket() {
    const select = document.getElementById('breakdownReportId');
    if (!select) return;

    // Clear existing options except the first one
    select.innerHTML = '<option value="">Loading reports...</option>';

    try {
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);

        // Fetch breakdown reports if not already loaded
        if (allDriverReports.length === 0 && allOperatorReports.length === 0) {
            // Load driver breakdown reports (vehicle breakdowns + route breakdowns)
            const vehicleResponse = await fetch(`${CONFIG.API_BASE_URL}/breakdown-reports`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const routeResponse = await fetch(`${CONFIG.API_BASE_URL}/route-breakdowns`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Load machinery operator fault tickets
            const faultResponse = await fetch(`${CONFIG.API_BASE_URL}/fault-tickets`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            allDriverReports = [];
            allOperatorReports = [];

            // Process vehicle breakdowns
            if (vehicleResponse.ok) {
                const vehicleData = await vehicleResponse.json();
                if (vehicleData.status === 'success' && vehicleData.data.reports) {
                    vehicleData.data.reports.forEach(report => {
                        const reportObj = {
                            ...report,
                            report_type: 'Vehicle Breakdown',
                            breakdown_type: 'vehicle_breakdown',
                            report_id: report.breakdown_id,
                            date: report.breakdown_date,
                            source: 'driver'
                        };
                        allDriverReports.push(reportObj);
                        allReportsMap.set(reportObj.report_id, reportObj);
                    });
                }
            }

            // Process route breakdowns
            if (routeResponse.ok) {
                const routeData = await routeResponse.json();
                if (routeData.status === 'success' && routeData.data.breakdowns) {
                    routeData.data.breakdowns.forEach(breakdown => {
                        const reportObj = {
                            ...breakdown,
                            report_type: 'Route Breakdown',
                            breakdown_type: 'route_breakdown',
                            report_id: breakdown.route_breakdown_id,
                            date: breakdown.breakdown_datetime,
                            source: 'driver'
                        };
                        allDriverReports.push(reportObj);
                        allReportsMap.set(reportObj.report_id, reportObj);
                    });
                }
            }

            // Process fault tickets from machinery operators
            if (faultResponse.ok) {
                const faultData = await faultResponse.json();
                if (faultData.status === 'success' && faultData.data.tickets) {
                    faultData.data.tickets.forEach(ticket => {
                        const reportObj = {
                            ...ticket,
                            report_type: 'Fault Ticket',
                            breakdown_type: 'fault_ticket',
                            report_id: ticket.ticket_id,
                            date: ticket.created_at,
                            source: 'operator'
                        };
                        allOperatorReports.push(reportObj);
                        allReportsMap.set(reportObj.report_id, reportObj);
                    });
                }
            }
        }

        // Clear and reset the dropdown
        select.innerHTML = '<option value="">Select Breakdown Report</option>';

        // Get all reports
        const allReports = [...allDriverReports, ...allOperatorReports];

        if (allReports.length === 0) {
            select.innerHTML += '<option value="" disabled>No breakdown reports available</option>';
            return;
        }

        // Sort by date (most recent first)
        allReports.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Add reports to dropdown
        allReports.forEach(report => {
            const option = document.createElement('option');
            option.value = report.report_id;
            const assetName = report.vehicle_registration_no || report.machine_name || 'N/A';
            const source = report.source === 'driver' ? 'Driver' : 'Machine';
            const status = report.status ? ` [${report.status.toUpperCase()}]` : '';
            option.textContent = `${source} ${report.report_type} #${report.report_id} - ${assetName}${status} (${new Date(report.date).toLocaleDateString()})`;
            select.appendChild(option);
        });

    } catch (error) {
        console.error('Error loading breakdown reports:', error);
        select.innerHTML = '<option value="">Error loading reports</option>';
        showToast('Failed to load breakdown reports', 'error');
    }
}

// Populate ticket form from selected report
function populateTicketFromReport() {
    const select = document.getElementById('breakdownReportId');
    const reportId = select.value;

    if (!reportId) {
        // Clear form if no report selected
        document.getElementById('issueTitle').value = '';
        document.getElementById('issueDescription').value = '';
        return;
    }

    // Convert to number if numeric to match map key
    const reportIdKey = isNaN(reportId) ? reportId : parseInt(reportId);
    const report = allReportsMap.get(reportIdKey);
    if (!report) {
        console.log('Report not found for ID:', reportId, 'Map keys:', Array.from(allReportsMap.keys()));
        return;
    }

    // Populate issue title
    const titleField = document.getElementById('issueTitle');
    const assetName = report.vehicle_registration_no || report.machine_name || 'Asset';
    titleField.value = `${report.report_type} - ${assetName}`;

    // Populate issue description
    const descField = document.getElementById('issueDescription');
    let description = report.description || report.issue_description || report.fault_description || '';

    // Add additional context
    if (report.location) description += `\n\nLocation: ${report.location}`;
    if (report.severity) description += `\nSeverity: ${report.severity}`;
    if (report.fault_type) description += `\nFault Type: ${report.fault_type}`;
    if (report.reported_by) description += `\nReported By: ${report.reported_by}`;

    descField.value = description.trim();

    // Set priority based on report severity
    const priorityField = document.getElementById('priority');
    if (report.severity) {
        const severityLower = report.severity.toLowerCase();
        if (severityLower.includes('critical')) {
            priorityField.value = 'critical';
        } else if (severityLower.includes('high')) {
            priorityField.value = 'high';
        } else if (severityLower.includes('medium')) {
            priorityField.value = 'medium';
        }
    } else if (report.priority) {
        priorityField.value = report.priority.toLowerCase();
    }
}

// Photo handling for create ticket modal
function handleCreateTicketPhotoUpload(event) {
    const files = Array.from(event.target.files);
    const maxFiles = 5;

    // Check if adding these files would exceed the limit
    if (createTicketPhotos.length + files.length > maxFiles) {
        showToast(`Maximum ${maxFiles} photos allowed`, 'error');
        return;
    }

    // Add files to the array
    createTicketPhotos.push(...files);
    updateCreateTicketPhotoPreview();

    // Reset the file input so the same file can be selected again if needed
    event.target.value = '';
}

function updateCreateTicketPhotoPreview() {
    const container = document.getElementById('createTicketPhotoPreview');
    container.innerHTML = '';

    if (createTicketPhotos.length === 0) {
        return;
    }

    createTicketPhotos.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'photo-preview-item';
            previewItem.innerHTML = `
                <img src="${e.target.result}" alt="${file.name}">
                <button type="button" class="remove-photo" onclick="removeCreateTicketPhoto(${index})">
                    <i class="fas fa-times"></i>
                </button>
                <div class="photo-name">${file.name}</div>
            `;
            container.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    });
}

function removeCreateTicketPhoto(index) {
    createTicketPhotos.splice(index, 1);
    updateCreateTicketPhotoPreview();
    showToast('Photo removed', 'success');
}

async function loadMachinesForTicket() {
    try {
        const response = await API.get('/machines');
        const select = document.getElementById('assetId');

        if (response.status === 'success' && response.data) {
            const machines = response.data.machines || response.data || [];
            const options = machines.map(machine =>
                `<option value="${machine.id}">${machine.model_number || machine.machine_name || machine.id}</option>`
            ).join('');

            select.innerHTML = '<option value="">Select Machine/Asset</option>' + options;
        }
    } catch (error) {
        console.error('Error loading machines:', error);
        showToast('Failed to load machines', 'error');
    }
}

function closeCreateTicketModal() {
    const modal = document.getElementById('createTicketModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Technicians are assigned via the ticket details modal, not during creation

// Store selected photos for create ticket
let createTicketPhotos = [];

async function handleCreateTicket(event) {
    event.preventDefault();

    const form = event.target;

    // Create FormData for multipart/form-data submission
    const formData = new FormData();

    // Get form values
    const breakdownReportId = document.getElementById('breakdownReportId').value;
    const issueTitle = document.getElementById('issueTitle').value;
    const issueDescription = document.getElementById('issueDescription').value;
    const priority = document.getElementById('priority').value;

    if (!breakdownReportId) {
        showToast('Please select a breakdown report', 'error');
        return;
    }

    // Get the selected report to extract machine/vehicle info
    // Convert to number if it's a numeric string to match the map key
    const reportIdKey = isNaN(breakdownReportId) ? breakdownReportId : parseInt(breakdownReportId);
    const selectedReport = allReportsMap.get(reportIdKey);

    // Combine title and description
    const description = `${issueTitle}\n\n${issueDescription}`;

    // Capitalize first letter of priority to match backend format
    const capitalizedPriority = priority.charAt(0).toUpperCase() + priority.slice(1);

    // Append data to FormData
    if (selectedReport) {
        // If it's a driver report with vehicle, use vehicle_id
        if (selectedReport.vehicle_id) {
            formData.append('vehicle_id', selectedReport.vehicle_id);
        }
        // If it's an operator report with machine, use machine_id
        if (selectedReport.machine_id) {
            formData.append('machine_id', selectedReport.machine_id);
        }
        // Add breakdown type for linking
        if (selectedReport.breakdown_type) {
            formData.append('breakdown_type', selectedReport.breakdown_type);
        }
    }
    formData.append('breakdown_report_id', breakdownReportId);
    formData.append('description', description);
    formData.append('priority', capitalizedPriority);

    // Append photos if any
    createTicketPhotos.forEach((photo) => {
        formData.append('photos[]', photo);
    });

    // Log form data for debugging
    console.log('Creating ticket with data:', {
        breakdownReportId,
        issueTitle,
        issueDescription,
        priority: capitalizedPriority,
        selectedReport,
        formDataEntries: Array.from(formData.entries())
    });

    try {
        const response = await API.postFormData('/fault-tickets', formData);

        console.log('Create ticket response:', response);

        if (response.status === 'success') {
            showToast('Fault ticket created successfully', 'success');
            closeCreateTicketModal();
            loadFaultTickets(); // Reload tickets
        } else {
            // Show validation errors if present
            if (response.errors) {
                const errorMessages = Object.values(response.errors).join(', ');
                showToast(errorMessages || response.message || 'Failed to create ticket', 'error');
            } else {
                showToast(response.message || 'Failed to create ticket', 'error');
            }
        }
    } catch (error) {
        console.error('Error creating ticket:', error);
        showToast(error.message || 'Failed to create ticket', 'error');
    }
}

function assignTicket(ticketId) {
    loadTicketForAssignment(ticketId);
}

function editTicketAssignment(ticketId) {
    loadTicketForAssignment(ticketId, true);
}

async function loadTicketForAssignment(ticketId, isEdit = false) {
    try {
        // Load ticket details
        const ticketResponse = await API.get(`/fault-tickets/${ticketId}`);
        const ticket = ticketResponse.data;

        // If editing, check if ticket status is "Assigned"
        if (isEdit && ticket.status && ticket.status.toLowerCase() !== 'assigned') {
            showToast('Only tickets with "Assigned" status can be edited', 'error');
            return;
        }

        // Update modal title based on mode
        const modalTitle = document.querySelector('#assignTicketModal .modal-header h2');
        if (modalTitle) {
            modalTitle.innerHTML = isEdit
                ? '<i class="fas fa-edit"></i> Edit Ticket Assignment'
                : '<i class="fas fa-user-plus"></i> Assign Ticket to Technician(s)';
        }

        // Set ticket ID in modal (it's a div, not an input)
        const ticketIdElement = document.getElementById('assignTicketId');
        if (ticketIdElement) {
            ticketIdElement.textContent = ticket.ticket_id || ('MBD-' + String(ticketId).padStart(3, '0'));
        }

        // Set current priority if exists
        const prioritySelect = document.getElementById('assignPriority');
        if (ticket.priority && prioritySelect) {
            prioritySelect.value = ticket.priority.toLowerCase();
        }

        // Load technicians with workload
        await loadTechniciansWithWorkload();

        // If editing, pre-select currently assigned technicians
        if (isEdit && ticket.assignments && ticket.assignments.length > 0) {
            const assignedTechnicianIds = ticket.assignments.map(a => a.assigned_to);
            assignedTechnicianIds.forEach(techId => {
                const checkbox = document.querySelector(`input[name="technicians"][value="${techId}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });

            // Pre-fill expected completion date and notes if available
            if (ticket.assignments[0].expected_completion_date) {
                const dateInput = document.getElementById('expectedCompletion');
                if (dateInput) {
                    dateInput.value = ticket.assignments[0].expected_completion_date;
                }
            }

            if (ticket.assignments[0].notes) {
                const notesInput = document.getElementById('assignmentNotes');
                if (notesInput) {
                    notesInput.value = ticket.assignments[0].notes;
                }
            }
        }

        // Store ticket ID and edit mode for submission
        const assignForm = document.getElementById('assignTicketForm');
        if (assignForm) {
            assignForm.dataset.ticketId = ticketId;
            assignForm.dataset.isEdit = isEdit ? 'true' : 'false';
        }

        // Show modal
        const assignModal = document.getElementById('assignTicketModal');
        if (assignModal) {
            assignModal.style.display = 'flex';
            assignModal.style.opacity = '0';
            document.body.style.overflow = 'hidden';
            setTimeout(() => {
                assignModal.style.opacity = '1';
            }, 10);
        }
    } catch (error) {
        console.error('Error loading ticket for assignment:', error);
        showToast('Failed to load ticket details', 'error');
    }
}

async function loadTechniciansWithWorkload() {
    try {
        const technicians = await fetchTechniciansWithWorkload();

        // Populate checkbox list
        const checkboxList = document.getElementById('techniciansList');

        if (!checkboxList) {
            console.error('techniciansList element not found!');
            return;
        }

        // Check if there are any technicians available
        if (technicians.length === 0) {
            checkboxList.innerHTML = `
                <div style="padding: 20px; text-align: center; color: var(--muted);">
                    <i class="fas fa-user-slash" style="font-size: 24px; margin-bottom: 10px;"></i>
                    <p>No active technical officers available in the system.</p>
                    <p style="font-size: 0.9em;">Contact system administrator to add technical officers.</p>
                </div>
            `;
            return;
        }

        checkboxList.innerHTML = technicians.map(tech => {
            const activeTickets = tech.active_ticket_count;
            const workloadClass = activeTickets === 0 ? 'available' : (activeTickets <= 2 ? 'busy' : 'heavy');
            const workloadText = `${activeTickets} active ticket${activeTickets === 1 ? '' : 's'}`;
            const name = tech.full_name || tech.username || `Technician #${tech.id}`;
            const expertise = tech.technical_expertise || 'General';

            return `
                <label class="checkbox-item">
                    <input type="checkbox" name="technicians" value="${tech.id}" onchange="updateTechnicianWarning()">
                    <span class="technician-details">
                        <span class="technician-name">${name}</span>
                        <span class="technician-expertise"><i class="fas fa-wrench"></i> ${expertise}</span>
                    </span>
                    <span class="technician-workload ${workloadClass}">${workloadText}</span>
                </label>
            `;
        }).join('');

        // Initial warning check
        updateTechnicianWarning();
    } catch (error) {
        console.error('Error loading technicians:', error);
        showToast('Failed to load technicians', 'error');
    }
}

function updateTechnicianWarning() {
    const form = document.getElementById('assignTicketForm');
    const isEdit = form?.dataset.isEdit === 'true';
    const warningDiv = document.getElementById('noTechnicianWarning');

    if (!warningDiv || !isEdit) {
        if (warningDiv) warningDiv.style.display = 'none';
        return;
    }

    const selectedTechnicians = document.querySelectorAll('input[name="technicians"]:checked');

    if (selectedTechnicians.length === 0) {
        warningDiv.style.display = 'block';
    } else {
        warningDiv.style.display = 'none';
    }
}

let technicianOverviewData = [];
let technicianOverviewAssignments = new Map();
let technicianTicketDataAvailable = false;

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatDateTime(value, includeTime = true) {
    if (!value) {
        return 'N/A';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return 'N/A';
    }

    return includeTime ? parsed.toLocaleString() : parsed.toLocaleDateString();
}

function getTechnicianWorkloadStatus(workloadCount) {
    if (workloadCount === 0) {
        return { className: 'status-completed', label: 'AVAILABLE' };
    }

    if (workloadCount <= 2) {
        return { className: 'status-warn', label: 'BUSY' };
    }

    return { className: 'status-critical', label: 'HEAVY LOAD' };
}

function getTicketStatusClass(status) {
    const normalizedStatus = String(status || '').toLowerCase().trim();

    switch (normalizedStatus) {
        case 'assigned':
            return 'status-assigned';
        case 'in progress':
            return 'status-in-progress';
        case 'resolved':
        case 'closed':
            return 'status-completed';
        case 'waiting for budget approval':
        case 'waiting for spare parts':
        case 'parts approved':
            return 'status-warn';
        case 'open':
        default:
            return 'status-normal';
    }
}

function getPriorityStatusClass(priority) {
    const normalizedPriority = String(priority || '').toLowerCase().trim();

    switch (normalizedPriority) {
        case 'critical':
            return 'status-critical';
        case 'high':
            return 'status-urgent';
        case 'medium':
            return 'status-warn';
        case 'low':
        default:
            return 'status-normal';
    }
}

function getTechnicianWorkloadCount(technician, assignmentMap) {
    const mappedAssignments = assignmentMap.get(Number(technician.id)) || [];
    const mappedCount = mappedAssignments.length;
    const backendCount = Number(technician.active_ticket_count || 0);
    return Math.max(mappedCount, backendCount);
}

function summarizeTechnicianTicketStates(assignedTickets) {
    if (!assignedTickets || assignedTickets.length === 0) {
        return 'No active tickets';
    }

    const groupedStatuses = assignedTickets.reduce((accumulator, ticket) => {
        const status = ticket.status || 'Open';
        accumulator[status] = (accumulator[status] || 0) + 1;
        return accumulator;
    }, {});

    return Object.entries(groupedStatuses)
        .map(([status, count]) => `${status}: ${count}`)
        .join(' | ');
}

function buildTechnicianAssignmentMap(tickets) {
    const assignmentMap = new Map();

    (tickets || []).forEach(ticket => {
        const ticketStatus = String(ticket.status || '').toLowerCase();
        if (ticketStatus === 'resolved' || ticketStatus === 'closed') {
            return;
        }

        const assignments = Array.isArray(ticket.assignments) ? ticket.assignments : [];
        assignments.forEach(assignment => {
            if (assignment.status && assignment.status !== 'Active') {
                return;
            }

            const technicianId = Number(assignment.assigned_to);
            if (!technicianId) {
                return;
            }

            if (!assignmentMap.has(technicianId)) {
                assignmentMap.set(technicianId, []);
            }

            assignmentMap.get(technicianId).push({
                id: Number(ticket.id),
                ticket_id: ticket.ticket_id || `TKT-${String(ticket.id || '').padStart(3, '0')}`,
                status: ticket.status || 'Open',
                priority: ticket.priority || 'Medium',
                description: ticket.description || 'No description provided',
                machine_name: ticket.machine_name || ticket.machine_model_number || (ticket.machine_id ? `Machine #${ticket.machine_id}` : 'N/A'),
                location: ticket.location || 'N/A',
                expected_completion_date: assignment.expected_completion_date || null,
                assigned_at: assignment.assigned_at || ticket.updated_at || ticket.created_at || null
            });
        });
    });

    assignmentMap.forEach((assignedTickets) => {
        assignedTickets.sort((first, second) => {
            const firstDate = new Date(first.assigned_at || 0).getTime();
            const secondDate = new Date(second.assigned_at || 0).getTime();
            return secondDate - firstDate;
        });
    });

    return assignmentMap;
}

function updateTechnicianSummaryCards(technicians, assignmentMap) {
    const totalElement = document.getElementById('technicianTotalCount');
    const availableElement = document.getElementById('technicianAvailableCount');
    const busyElement = document.getElementById('technicianBusyCount');
    const activeAssignmentsElement = document.getElementById('technicianActiveAssignmentsCount');
    const heavyLoadElement = document.getElementById('technicianHeavyLoadCount');

    const workloadCounts = (technicians || []).map(technician => getTechnicianWorkloadCount(technician, assignmentMap));
    const totalTechnicians = workloadCounts.length;
    const availableCount = workloadCounts.filter(count => count === 0).length;
    const busyCount = workloadCounts.filter(count => count > 0 && count <= 2).length;
    const heavyCount = workloadCounts.filter(count => count > 2).length;
    const activeAssignments = workloadCounts.reduce((total, count) => total + count, 0);

    if (totalElement) {
        totalElement.textContent = String(totalTechnicians);
    }
    if (availableElement) {
        availableElement.textContent = `${availableCount} Available`;
    }
    if (busyElement) {
        busyElement.textContent = `${busyCount} Busy`;
    }
    if (activeAssignmentsElement) {
        activeAssignmentsElement.textContent = String(activeAssignments);
    }
    if (heavyLoadElement) {
        heavyLoadElement.textContent = String(heavyCount);
    }
}

async function fetchTechniciansWithWorkload() {
    const techResponse = await API.get('/technicians');

    if (techResponse && techResponse.status && techResponse.status !== 'success') {
        throw new Error(techResponse.message || 'Failed to load technicians');
    }

    const technicians = techResponse?.data?.users || techResponse?.data || [];

    if (!Array.isArray(technicians)) {
        return [];
    }

    return technicians
        .map(tech => ({
            ...tech,
            technical_expertise: (tech.technical_expertise || 'General').trim() || 'General',
            active_ticket_count: Number(tech.active_ticket_count || 0)
        }))
        .sort((first, second) => {
            if (first.active_ticket_count !== second.active_ticket_count) {
                return first.active_ticket_count - second.active_ticket_count;
            }
            return (first.full_name || '').localeCompare(second.full_name || '');
        });
}

async function handleAssignTicket(event) {
    event.preventDefault();

    const form = event.target;
    const ticketId = form.dataset.ticketId;
    const isEdit = form.dataset.isEdit === 'true';

    // Get selected technicians
    const selectedTechnicians = Array.from(form.querySelectorAll('input[name="technicians"]:checked'))
        .map(cb => parseInt(cb.value));

    // Check if no technicians selected
    if (selectedTechnicians.length === 0) {
        if (!isEdit) {
            // For new assignments, at least one technician is required
            showToast('Please select at least one technician', 'error');
            return;
        }
        // For edit mode with no technicians selected, proceed to unassign all
        // (visual warning is already shown in the modal)
    }

    const formData = new FormData(form);

    // Capitalize first letter of priority to match backend format
    const priority = formData.get('priority');
    const capitalizedPriority = priority.charAt(0).toUpperCase() + priority.slice(1);

    const assignmentData = {
        technician_ids: selectedTechnicians, // Now supports multiple technicians (can be empty array for unassignment)
        priority: capitalizedPriority,
        expected_completion_date: formData.get('expected_completion'),
        notes: formData.get('notes')
    };

    try {
        // Use the new assignment endpoint
        await API.post(`/fault-tickets/${ticketId}/assign`, assignmentData);

        // Close modal and show success
        closeAssignTicketModal();

        if (selectedTechnicians.length === 0) {
            showToast('All technicians unassigned. Ticket moved to Unassigned.', 'success');
        } else {
            showToast('Ticket assigned successfully', 'success');
        }

        // Reload tickets and reports to reflect status changes
        loadFaultTickets();
        loadAllReports(); // Reload reports to show updated status
    } catch (error) {
        console.error('Error assigning ticket:', error);
        showToast(error.message || 'Failed to assign ticket', 'error');
    }
}

function closeAssignTicketModal() {
    const modal = document.getElementById('assignTicketModal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300); // Wait for opacity transition
    }

    // Reset form
    const form = document.getElementById('assignTicketForm');
    form.reset();

    // Uncheck all technician checkboxes
    const checkboxes = form.querySelectorAll('input[name="technicians"]');
    checkboxes.forEach(cb => cb.checked = false);

    // Hide warning message
    const warningDiv = document.getElementById('noTechnicianWarning');
    if (warningDiv) {
        warningDiv.style.display = 'none';
    }
}

async function viewTicketDetails(ticketId) {
    try {
        const response = await API.get(`/fault-tickets/${ticketId}`);
        const ticket = response.data;

        // Format the ticket details
        const assetName = ticket.machine_model_number || ticket.machine_name || `Machine #${ticket.machine_id}`;
        const createdDate = new Date(ticket.created_at).toLocaleString();
        const updatedDate = ticket.updated_at ? new Date(ticket.updated_at).toLocaleString() : 'N/A';

        // Build images section if images exist
        let imagesHTML = '';
        if (ticket.images && ticket.images.length > 0) {
            const baseURL = CONFIG.API_BASE_URL.replace('/api', ''); // Remove /api from the URL
            imagesHTML = `
                <div class="form-section">
                    <h5><i class="fas fa-images"></i> Attached Images</h5>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">
                        ${ticket.images.map(img => `
                            <div style="border: 1px solid var(--stone-200); border-radius: 8px; overflow: hidden;">
                                <img src="${baseURL}/uploads/fault-tickets/${img.image_url}" 
                                     alt="${img.original_filename}" 
                                     style="width: 100%; height: 200px; object-fit: cover; cursor: pointer;"
                                     onclick="window.open('${baseURL}/uploads/fault-tickets/${img.image_url}', '_blank')">
                                <div style="padding: 8px; font-size: 0.75rem; color: var(--muted);">
                                    ${img.original_filename}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        const detailsHTML = `
            <div class="form-section">
                <h5><i class="fas fa-info-circle"></i> Ticket Information</h5>
                <p><strong>Ticket ID:</strong> ${ticket.ticket_id || ('MBD-' + String(ticket.id).padStart(3, '0'))}</p>
                <p><strong>Status:</strong> ${(ticket.status === 'Resolved' || ticket.status === 'Closed')
                ? '<span style=\"background: #10b981; color: white; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;\"><i class=\"fas fa-check-circle\"></i> FINISHED</span>'
                : '<span class=\"status-text status-' + (ticket.status || 'open').toLowerCase().replace(' ', '-') + '\">' + (ticket.status || 'OPEN').toUpperCase().replace('_', ' ') + '</span>'}</p>
                <p><strong>Priority:</strong> <span class="status-text status-${ticket.priority ? ticket.priority.toLowerCase() : 'normal'}">${(ticket.priority || 'NORMAL').toUpperCase()}</span></p>
                <p><strong>Machine:</strong> ${assetName}</p>
                ${ticket.location ? `<p><strong>Location:</strong> ${ticket.location}</p>` : ''}
            </div>
            
            <div class="form-section">
                <h5><i class="fas fa-clipboard-list"></i> Description</h5>
                <p style="white-space: pre-wrap; border-left: none; padding: 12px; background: var(--background); border-radius: 6px;">${ticket.description || 'No description provided'}</p>
            </div>
            
            ${imagesHTML}
            
            <div class="form-section">
                <h5><i class="fas fa-user-cog"></i> Assignment Details</h5>
                <p><strong>Reported By:</strong> ${ticket.reported_by_name || ticket.reporter_full_name || 'N/A'}</p>
                <p><strong>Assigned To:</strong> ${ticket.assignments && ticket.assignments.length > 0
                ? ticket.assignments.map(a => a.technician_name).join(', ')
                : 'Unassigned'}</p>
                <p><strong>Created:</strong> ${createdDate}</p>
                <p><strong>Last Updated:</strong> ${updatedDate}</p>
                ${ticket.assignments && ticket.assignments.length > 0 && ticket.assignments[0].expected_completion_date ? `
                <p><strong>Expected Completion:</strong> ${new Date(ticket.assignments[0].expected_completion_date).toLocaleDateString()}</p>
                ` : ''}
                ${ticket.assignments && ticket.assignments.length > 0 && ticket.assignments[0].notes ? `
                <p><strong>Assignment Notes:</strong></p>
                <p style="white-space: pre-wrap; border-left: none; padding: 12px; background: var(--background); border-radius: 6px;">${ticket.assignments[0].notes}</p>
                ` : ''}
            </div>
            
            ${ticket.resolution_notes ? `
            <div class="form-section">
                <h5><i class="fas fa-check-circle"></i> Resolution Notes</h5>
                <p style="white-space: pre-wrap; border-left: none; padding: 12px; background: var(--background); border-radius: 6px;">${ticket.resolution_notes}</p>
            </div>
            ` : ''}
            
            ${(ticket.status === 'Resolved' || ticket.status === 'Finished' || ticket.status === 'Completed') && ticket.work_updates && ticket.work_updates.length > 0 ? `
            <div class="form-section">
                <h5><i class="fas fa-tools" style="color: #27ae60;"></i> Work Completed - Finishing Details</h5>
                ${ticket.work_updates.map(update => `
                <div style="padding: 15px; background: #e8f5e9; border-radius: 6px; border-left: 4px solid #27ae60; margin-bottom: 10px;">
                    <p style="margin: 0 0 8px 0; font-weight: 600; color: #27ae60;">
                        <i class="fas fa-user-cog"></i> ${update.technician_name || 'Technical Officer'}
                    </p>
                    <p style="margin: 0 0 8px 0; color: var(--text-700);">
                        <strong>Work Description:</strong> ${update.machine_description || 'N/A'}
                    </p>
                    <p style="margin: 0 0 8px 0; color: var(--text-700);">
                        <strong>Parts Used:</strong> ${update.parts_used || 'None'}
                    </p>
                    <p style="margin: 0 0 8px 0; color: var(--text-700);">
                        <strong>Time Spent:</strong> ${update.time_spent ? update.time_spent + ' hours' : 'N/A'}
                    </p>
                    <p style="margin: 0 0 8px 0; color: var(--text-700);">
                        <strong>Status:</strong> <span style="background: ${update.work_status === 'Completed' ? '#10b981' : '#f59e0b'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">${update.work_status}</span>
                    </p>
                    <p style="margin: 0; color: #666; font-size: 0.9em;">
                        <i class="fas fa-calendar-check"></i> Updated: ${new Date(update.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
                `).join('')}
            </div>
            ` : ''}
        `;

        // Populate modal
        document.getElementById('viewTicketContent').innerHTML = detailsHTML;

        // Show modal
        const viewModal = document.getElementById('viewTicketModal');
        viewModal.style.display = 'flex';
        viewModal.style.opacity = '0';
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
            viewModal.style.opacity = '1';
        }, 10);
    } catch (error) {
        console.error('Error loading ticket details:', error);
        showToast('Failed to load ticket details', 'error');
    }
}

function closeViewTicketModal() {
    const modal = document.getElementById('viewTicketModal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            document.getElementById('viewTicketContent').innerHTML = '';
        }, 300);
    }
}

// ==================== BREAKDOWN REPORT DETAILS ====================

async function viewBreakdownDetails(type, id) {
    try {
        const endpoint = type === 'route_breakdown' ? `/route-breakdowns/${id}` : `/breakdown-reports/${id}`;
        const response = await API.get(endpoint);

        let report;
        if (type === 'route_breakdown') {
            report = response.data.breakdown || response.data;
        } else {
            report = response.data.report || response.data;
        }

        if (!report) {
            showToast('Breakdown report not found', 'error');
            return;
        }

        const isRoute = type === 'route_breakdown';
        const typeLabel = isRoute ? 'Route Breakdown' : 'Vehicle Breakdown';
        const typeBadgeColor = isRoute ? '#e67e22' : '#e74c3c';
        const reportId = isRoute ? (report.route_breakdown_id || `RBD-${report.id}`) : (report.breakdown_id || `VBD-${report.id}`);
        const createdDate = new Date(isRoute ? (report.breakdown_datetime || report.created_at) : (report.breakdown_date || report.created_at));

        const detailsHTML = `
            <div class="form-section">
                <h5><i class="fas ${isRoute ? 'fa-road' : 'fa-car-crash'}"></i> Breakdown Information</h5>
                <p><strong>Report ID:</strong> ${reportId}</p>
                <p><strong>Type:</strong> <span style="background: ${typeBadgeColor}; color: white; padding: 2px 10px; border-radius: 10px; font-size: 0.85rem;">${typeLabel}</span></p>
                <p><strong>Status:</strong> <span class="status-text status-${(report.status || 'pending').toLowerCase()}">${(report.status || 'Pending').toUpperCase()}</span></p>
                <p><strong>Severity:</strong> <span class="status-text status-${(report.severity || 'medium').toLowerCase()}">${(report.severity || 'Medium').toUpperCase()}</span></p>
                <p><strong>Breakdown Type:</strong> ${report.breakdown_type || 'N/A'}</p>
                ${isRoute && report.breakdown_location ? `<p><strong>Location:</strong> ${report.breakdown_location}</p>` : ''}
            </div>
            
            <div class="form-section">
                <h5><i class="fas fa-truck"></i> Vehicle Details</h5>
                <p><strong>Vehicle:</strong> ${report.number_plate || 'N/A'}</p>
                ${report.make ? `<p><strong>Make:</strong> ${report.make}</p>` : ''}
                ${report.model ? `<p><strong>Model:</strong> ${report.model}</p>` : ''}
            </div>
            
            <div class="form-section">
                <h5><i class="fas fa-clipboard-list"></i> Description</h5>
                <p style="white-space: pre-wrap; border-left: none; padding: 12px; background: var(--background); border-radius: 6px;">${report.description || 'No description provided'}</p>
            </div>
            
            <div class="form-section">
                <h5><i class="fas fa-user"></i> Driver Details</h5>
                <p><strong>Driver:</strong> ${report.driver_name || 'N/A'}</p>
                ${report.driver_employee_id ? `<p><strong>Employee ID:</strong> ${report.driver_employee_id}</p>` : ''}
                ${report.driver_phone ? `<p><strong>Phone:</strong> ${report.driver_phone}</p>` : ''}
                <p><strong>Reported On:</strong> ${createdDate.toLocaleString()}</p>
            </div>
            
            <div style="text-align: center; margin-top: 20px;">
                <button class="btn btn-success" onclick="closeViewTicketModal(); createTicketFromBreakdown('${type}', ${id});">
                    <i class="fas fa-plus-circle"></i> Create Fault Ticket from this Report
                </button>
            </div>
        `;

        // Populate and show modal (reuse view ticket modal)
        document.getElementById('viewTicketContent').innerHTML = detailsHTML;

        const viewModal = document.getElementById('viewTicketModal');
        viewModal.style.display = 'flex';
        viewModal.style.opacity = '0';
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
            viewModal.style.opacity = '1';
        }, 10);

    } catch (error) {
        console.error('Error loading breakdown details:', error);
        showToast('Failed to load breakdown report details', 'error');
    }
}

// View machine breakdown details from allTickets
function viewMachineBreakdownInSupervisor(breakdownId) {
    const ticket = allTickets.find(t => t.is_machine_breakdown && t.id === breakdownId);
    if (!ticket) {
        showToast('Machine breakdown not found', 'error');
        return;
    }

    const report = ticket.original_report || ticket;
    const createdDate = new Date(report.breakdown_date || ticket.created_at).toLocaleString();
    const machineName = report.machine_model || report.machine_name || ticket.machine_name || 'N/A';
    const operatorName = report.operator_name || ticket.reporter_full_name || 'N/A';

    const detailsHTML = `
        <div class="form-section">
            <h5><i class="fas fa-info-circle"></i> Machine Breakdown Information</h5>
            <p><strong>Breakdown ID:</strong> ${ticket.ticket_id}</p>
            <p><strong>Status:</strong> <span class="status-text status-${(ticket.status || 'open').toLowerCase().replace(' ', '-')}">${(ticket.status || 'OPEN').toUpperCase()}</span></p>
            <p><strong>Priority:</strong> <span class="status-text status-${(ticket.priority || 'medium').toLowerCase()}">${(ticket.priority || 'MEDIUM').toUpperCase()}</span></p>
            <p><strong>Machine:</strong> ${machineName}</p>
            <p><strong>Operator:</strong> ${operatorName}</p>
            <p><strong>Breakdown Type:</strong> ${report.breakdown_type || 'N/A'}</p>
            <p><strong>Date:</strong> ${createdDate}</p>
        </div>
        <div class="form-section">
            <h5><i class="fas fa-clipboard-list"></i> Description</h5>
            <p style="white-space: pre-wrap; padding: 12px; background: var(--background); border-radius: 6px;">${ticket.description || 'No description provided'}</p>
        </div>
        <div class="form-section">
            <h5><i class="fas fa-exclamation-triangle"></i> Source</h5>
            <p><span style="background: #7c3aed; color: white; padding: 2px 10px; border-radius: 12px; font-size: 12px;">Machinery Operator Fault Report</span></p>
        </div>
    `;

    const viewTitle = document.querySelector('#viewTicketModal .modal-header h2');
    if (viewTitle) {
        viewTitle.innerHTML = `<i class="fas fa-cogs"></i> Machine Breakdown Details`;
    }
    const viewContent = document.getElementById('viewTicketContent');
    if (viewContent) {
        viewContent.innerHTML = detailsHTML;
    }

    const viewModal = document.getElementById('viewTicketModal');
    viewModal.style.display = 'flex';
    viewModal.style.opacity = '0';
    document.body.style.overflow = 'hidden';
    setTimeout(() => { viewModal.style.opacity = '1'; }, 10);
}

// Assign technician to a breakdown report (auto-creates fault ticket first, then opens assign modal)
async function assignBreakdownTicket(type, id) {
    // Search in allBreakdownItems first, then in allTickets for machine breakdowns
    let report = allBreakdownItems.find(b => b.type === type && b.id === id);
    if (!report && type === 'machine_breakdown') {
        // Machine breakdowns are now merged into allTickets
        const ticket = allTickets.find(t => t.is_machine_breakdown && t.id === id);
        if (ticket) {
            report = {
                id: ticket.id,
                breakdown_id: ticket.ticket_id,
                type: 'machine_breakdown',
                machine_id: ticket.machine_id,
                machine_model: ticket.machine_name || ticket.machine_model_number,
                operator_name: ticket.reporter_full_name,
                description: ticket.description,
                severity: ticket.priority,
                status: ticket.status,
                breakdown_type: ticket.original_report ? ticket.original_report.breakdown_type : 'Machine Fault',
                breakdown_date: ticket.created_at
            };
        }
    }

    if (!report) {
        showToast('Breakdown report not found', 'error');
        return;
    }

    try {
        showToast('Creating fault ticket from breakdown report...', 'info');

        const isRoute = type === 'route_breakdown';
        const isMachine = type === 'machine_breakdown';
        const typeLabel = isMachine ? 'Machine Breakdown' : (isRoute ? 'Route Breakdown' : 'Vehicle Breakdown');

        // Build description from breakdown data
        let description;
        if (isMachine) {
            description = `[${typeLabel}] Machine: ${report.machine_model || 'N/A'} | Operator: ${report.operator_name || 'N/A'}\nSeverity: ${report.severity} | Type: ${report.breakdown_type}\nDescription: ${report.description}`;
        } else {
            description = `[${typeLabel}] Vehicle: ${report.number_plate} | Driver: ${report.driver_name}\nSeverity: ${report.severity} | Type: ${report.breakdown_type}\n${report.breakdown_location ? 'Location: ' + report.breakdown_location + '\n' : ''}Description: ${report.description}`;
        }

        // Map severity to priority
        const severityMap = { 'critical': 'Critical', 'high': 'High', 'medium': 'Medium', 'low': 'Low' };
        const priority = severityMap[(report.severity || 'medium').toLowerCase()] || 'Medium';

        // Create the ticket via API using FormData
        const formData = new FormData();
        if (isMachine && report.machine_id) {
            formData.append('machine_id', report.machine_id);
        } else if (report.vehicle_id) {
            formData.append('vehicle_id', report.vehicle_id);
        }
        formData.append('breakdown_report_id', report.breakdown_id || report.id);
        formData.append('breakdown_type', type);
        formData.append('description', description);
        formData.append('priority', priority);

        const response = await API.postFormData('/fault-tickets', formData);

        if (response.status === 'success' && response.data && response.data.id) {
            const newTicketId = response.data.id;
            showToast('Fault ticket created! Now assign a technician.', 'success');

            // Reload tickets so the new ticket appears in the system
            await loadFaultTickets();

            // Open the assign modal for the newly created ticket
            assignTicket(newTicketId);
        } else {
            const errorMsg = response.errors ? Object.values(response.errors).join(', ') : (response.message || 'Failed to create ticket');
            showToast(errorMsg, 'error');
        }
    } catch (error) {
        console.error('Error creating ticket from breakdown:', error);
        showToast(error.message || 'Failed to create ticket from breakdown', 'error');
    }
}

async function createTicketFromBreakdown(type, id) {
    // Find the breakdown report from allBreakdownItems
    const report = allBreakdownItems.find(b => b.type === type && b.id === id);

    if (!report) {
        showToast('Breakdown report not found', 'error');
        return;
    }

    // Open the create ticket modal pre-filled with breakdown data
    await loadBreakdownReportsForTicket();

    const modal = document.getElementById('createTicketModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Reset and pre-fill form
    const form = document.getElementById('createTicketForm');
    form.reset();

    // Pre-fill description
    const descField = document.getElementById('ticketDescription');
    if (descField) {
        const isRoute = type === 'route_breakdown';
        const isMachine = type === 'machine_breakdown';
        const typeLabel = isMachine ? 'Machine Breakdown' : (isRoute ? 'Route Breakdown' : 'Vehicle Breakdown');
        if (isMachine) {
            descField.value = `[${typeLabel}] Machine: ${report.machine_model || 'N/A'} | Operator: ${report.operator_name || 'N/A'}\nSeverity: ${report.severity} | Type: ${report.breakdown_type}\nDescription: ${report.description}`;
        } else {
            descField.value = `[${typeLabel}] Vehicle: ${report.number_plate} | Driver: ${report.driver_name}\nSeverity: ${report.severity} | Type: ${report.breakdown_type}\n${report.breakdown_location ? 'Location: ' + report.breakdown_location + '\n' : ''}Description: ${report.description}`;
        }
    }

    // Pre-fill priority based on severity
    const priorityField = document.getElementById('ticketPriority');
    if (priorityField) {
        const severityMap = { 'critical': 'Critical', 'high': 'High', 'medium': 'Medium', 'low': 'Low' };
        priorityField.value = severityMap[(report.severity || 'medium').toLowerCase()] || 'Medium';
    }

    // Select the breakdown report in the dropdown if it exists
    const breakdownSelect = document.getElementById('breakdownReportId');
    if (breakdownSelect) {
        const reportId = report.breakdown_id;
        for (let option of breakdownSelect.options) {
            if (option.value === reportId) {
                option.selected = true;
                break;
            }
        }
    }

    // Clear photos
    createTicketPhotos = [];
    if (typeof updateCreateTicketPhotoPreview === 'function') {
        updateCreateTicketPhotoPreview();
    }

    showToast('Create a fault ticket from this breakdown report', 'info');
}

// ==================== REPAIR MANAGEMENT ====================

async function loadRepairs() {
    const awaitingDiv = document.getElementById('pendingRepairsList');
    const ongoingDiv = document.getElementById('ongoingRepairsList');
    const outsourcedDiv = document.getElementById('outsourcedRepairsList');

    if (!awaitingDiv || !ongoingDiv || !outsourcedDiv) {
        return;
    }

    awaitingDiv.innerHTML = '<p style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> Loading...</p>';
    ongoingDiv.innerHTML = '<p style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> Loading...</p>';
    outsourcedDiv.innerHTML = '<p style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> Loading...</p>';

    // TODO: Replace with actual API calls
    setTimeout(() => {
        awaitingDiv.innerHTML = '<p style="text-align: center; color: var(--muted);">No repairs awaiting approval</p>';
        ongoingDiv.innerHTML = '<p style="text-align: center; color: var(--muted);">No ongoing repairs</p>';
        outsourcedDiv.innerHTML = '<p style="text-align: center; color: var(--muted);">No outsourced repairs</p>';
    }, 500);
}

function greenLightRepair(repairId) {
    createConfirmationDialog(
        'Approve Repair',
        `Approve repair ${repairId}? The technician will be notified to proceed.`,
        async () => {
            showToast(`Repair ${repairId} approved!`, 'success');
            loadRepairs();
        },
        'primary'
    );
}

function markAsOutsourced(repairId) {
    showToast(`Marking repair ${repairId} as outsourced`, 'info');
    // TODO: Implement outsource modal
}

function updateComponentInfo() {
    showToast('Component info update feature coming soon', 'info');
    // TODO: Implement component info modal
}

function viewAllOutsourced() {
    showToast('Loading all outsourced repairs', 'info');
}

// ==================== BUDGET APPROVAL ====================

async function loadBudgets() {
    const tbody = document.getElementById('budgetsTableBody');
    if (!tbody) {
        return;
    }

    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> Loading budgets...</td></tr>';

    // TODO: Replace with actual API call
    setTimeout(() => {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--muted);">No pending budgets</td></tr>';
    }, 500);
}

function filterBudgetsByStatus(status) {
    showToast(`Filtering budgets by ${status}`);
    // TODO: Implement filtering logic
}

function approveBudget(budgetId) {
    createConfirmationDialog(
        'Approve Budget',
        `Approve budget ${budgetId}? This will allow the repair to proceed.`,
        async () => {
            showToast(`Budget ${budgetId} approved!`, 'success');
            loadBudgets();
        },
        'primary'
    );
}

function rejectBudget(budgetId) {
    createConfirmationDialog(
        'Reject Budget',
        `Reject budget ${budgetId}? The technician will need to revise.`,
        async () => {
            showToast(`Budget ${budgetId} rejected`, 'warning');
            loadBudgets();
        },
        'danger'
    );
}

// ==================== ASSET STATUS ====================

async function loadAssetStatus() {
    const tbody = document.getElementById('assetStatusBody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> Loading assets...</td></tr>';

    // TODO: Replace with actual API call
    setTimeout(() => {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--muted);">No assets found</td></tr>';
    }, 500);
}

function filterAssets(status) {
    showToast(`Filtering assets by ${status}`);
    // TODO: Implement filtering logic
}

// ==================== TECHNICIANS ====================

async function loadTechnicians() {
    const component = document.querySelector('supervisor-technicians');
    if (!component) {
        return;
    }

    if (typeof component.setLoading === 'function') {
        component.setLoading();
    }

    try {
        const techniciansPromise = fetchTechniciansWithWorkload();
        const ticketPromise = API.get('/fault-tickets').catch(() => null);

        const [technicians, ticketResponse] = await Promise.all([techniciansPromise, ticketPromise]);

        technicianOverviewData = technicians;

        const ticketResponseIsValid = ticketResponse && (!ticketResponse.status || ticketResponse.status === 'success');
        technicianTicketDataAvailable = Boolean(ticketResponseIsValid);

        const tickets = ticketResponseIsValid ? (ticketResponse?.data?.tickets || ticketResponse?.data || []) : [];
        const normalizedTickets = Array.isArray(tickets) ? tickets : [];
        technicianOverviewAssignments = buildTechnicianAssignmentMap(normalizedTickets);

        updateTechnicianSummaryCards(technicians, technicianOverviewAssignments);

        if (technicians.length === 0) {
            if (typeof component.setEmpty === 'function') {
                component.setEmpty();
            }
            return;
        }

        const viewModel = technicians.map(technician => {
            const assignedTickets = technicianOverviewAssignments.get(Number(technician.id)) || [];
            const workloadCount = getTechnicianWorkloadCount(technician, technicianOverviewAssignments);
            const workloadStatus = getTechnicianWorkloadStatus(workloadCount);
            const statusSummary = technicianTicketDataAvailable
                ? summarizeTechnicianTicketStates(assignedTickets)
                : (workloadCount === 0 ? 'No active tickets' : 'Ticket details unavailable');

            const technicianName = escapeHtml(technician.full_name || `Technician #${technician.id}`);
            const expertise = escapeHtml(technician.technical_expertise || 'General');
            const assignmentLabel = `${workloadCount} active assignment${workloadCount === 1 ? '' : 's'}`;

            return {
                id: Number(technician.id),
                technicianName,
                expertise,
                assignmentLabel,
                workloadClass: workloadStatus.className,
                workloadLabel: workloadStatus.label,
                statusSummary: escapeHtml(statusSummary)
            };
        });

        if (typeof component.renderTechnicians === 'function') {
            component.renderTechnicians(viewModel);
        }
    } catch (error) {
        console.error('Error loading technicians:', error);
        technicianOverviewData = [];
        technicianOverviewAssignments = new Map();
        technicianTicketDataAvailable = false;
        updateTechnicianSummaryCards([], new Map());

        if (typeof component.setError === 'function') {
            component.setError('Failed to load technicians. Please try again.');
        }
        showToast('Failed to load technicians', 'error');
    }
}

// ==================== TOAST NOTIFICATIONS ====================

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;

    toast.className = 'toast';
    if (type === 'error' || type === 'danger') {
        toast.classList.add('toast-error');
    } else if (type === 'warning') {
        toast.classList.add('toast-warning');
    } else if (type === 'info') {
        toast.classList.add('toast-info');
    } else {
        toast.classList.add('toast-success');
    }

    toast.style.display = 'block';

    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// logout(), createConfirmationDialog(), closeConfirmation(), confirmAction()
// are now provided by shared dashboard-init.js



function createDetailsModal(title, content) {
    // Remove any existing details modal
    const existingModal = document.getElementById('detailsModal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'detailsModal';

    modal.innerHTML = `
        <div class="modal-content modal-content-large">
            <div class="modal-header">
                <h2><i class="fas fa-info-circle"></i> ${title}</h2>
                <button class="btn-close" onclick="closeDetailsModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body details-modal-content">
                ${content}
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeDetailsModal()"><i class="fas fa-times"></i> Close</button>
            </div>
        </div>
    `;

    // Close on outside click
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeDetailsModal();
        }
    };

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Add active class with slight delay to ensure transition works
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

function closeDetailsModal() {
    const modal = document.getElementById('detailsModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(() => modal.remove(), 300);
    }
}


// ==================== MODAL HANDLERS ====================

// Close modal when clicking outside
document.addEventListener('click', function (event) {
    const modal = document.getElementById('createTicketModal');
    if (event.target === modal) {
        closeCreateTicketModal();
    }
});

// Close modal on ESC key
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        const modal = document.getElementById('createTicketModal');
        if (modal && modal.classList.contains('active')) {
            closeCreateTicketModal();
        }
    }
});

// ==================== MOBILE MENU ====================

// Add mobile menu toggle for responsive design
if (window.innerWidth <= 768) {
    const menuBtn = document.createElement('button');
    menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
    menuBtn.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        z-index: 1000;
        background: var(--royal-blue);
        color: white;
        border: none;
        padding: 10px 15px;
        border-radius: 5px;
        cursor: pointer;
    `;

    menuBtn.onclick = () => {
        const sidebar = document.querySelector('.sidebar');
        sidebar.classList.toggle('open');
    };

    document.body.appendChild(menuBtn);
}

// ==================== REPAIR MANAGEMENT FUNCTIONS ====================

function viewRepairDetails(repairId) {
    // Sample data - replace with actual API call
    const repairData = {
        'REP-001': { id: 'REP-001', title: 'Engine Overhaul', asset: 'Vehicle V-105', assetName: 'Toyota Hiace LKA-1234', ticket: 'MBD-050', technician: 'Mike Johnson', priority: 'Urgent', estimatedCost: 'LKR 2,500', estimatedTime: '2 days', description: 'Complete engine overhaul required due to excessive oil consumption and performance issues', parts: 'Engine gaskets, oil filters, air filters, spark plugs, engine oil', status: 'Pending Approval' },
        'REP-002': { id: 'REP-002', title: 'Transmission Repair', asset: 'Vehicle V-108', assetName: 'Isuzu NPR LKA-5678', ticket: 'MBD-051', technician: 'Sarah Williams', priority: 'Normal', estimatedCost: 'LKR 1,800', estimatedTime: '1.5 days', description: 'Transmission fluid leak detected along with gear shifting issues', parts: 'Transmission seals, gasket kit, transmission fluid', status: 'Pending Approval' }
    };

    const repair = repairData[repairId] || repairData['REP-001'];

    const content = `
        <div style="padding: 20px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div>
                    <strong>Repair ID:</strong><br>
                    <span style="color: var(--royal-blue);">${repair.id}</span>
                </div>
                <div>
                    <strong>Priority:</strong><br>
                    <span class="status-text status-${repair.priority.toLowerCase()}">${repair.priority.toUpperCase()}</span>
                </div>
                <div>
                    <strong>Asset:</strong><br>
                    ${repair.assetName}
                </div>
                <div>
                    <strong>Related Ticket:</strong><br>
                    ${repair.ticket}
                </div>
                <div>
                    <strong>Assigned Technician:</strong><br>
                    <i class="fas fa-user-cog"></i> ${repair.technician}
                </div>
                <div>
                    <strong>Status:</strong><br>
                    <span class="status-text status-pending">${repair.status}</span>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <strong>Issue Description:</strong><br>
                <p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px;">${repair.description}</p>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div>
                    <strong>Estimated Cost:</strong><br>
                    <span style="font-size: 1.2em; color: var(--royal-blue);">${repair.estimatedCost}</span>
                </div>
                <div>
                    <strong>Estimated Time:</strong><br>
                    <span style="font-size: 1.2em;">${repair.estimatedTime}</span>
                </div>
            </div>
            
            <div>
                <strong>Required Parts:</strong><br>
                <p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px;">${repair.parts}</p>
            </div>
        </div>
    `;

    createDetailsModal('Repair Details', content);
}

function greenLightRepair(repairId) {
    createConfirmationDialog(
        'Approve Repair',
        `Are you sure you want to approve repair ${repairId}? The technician can proceed with the work.`,
        async () => {
            const itemCard = document.querySelector(`[data-id="${repairId}"]`);
            if (itemCard) {
                itemCard.remove();
            }
            showToast(`Repair ${repairId} approved! Technician can proceed.`, 'success');
        },
        'success'
    );
}

function rejectRepair(repairId) {
    createConfirmationDialog(
        'Reject Repair',
        `Reject repair ${repairId}? Please provide reason to technician.`,
        async () => {
            const itemCard = document.querySelector(`[data-id="${repairId}"]`);
            if (itemCard) {
                itemCard.remove();
            }
            showToast(`Repair ${repairId} rejected.`, 'warning');
        },
        'danger'
    );
}

function markAsOutsourced(repairId) {
    showToast(`Marking repair ${repairId} as outsourced`, 'info');
    // TODO: Implement outsource modal
}

function viewRepairProgress(repairId) {
    // Sample data - replace with actual API call
    const progressData = {
        'REP-010': { id: 'REP-010', title: 'Hydraulic System', asset: 'Machine M-205', assetName: 'CAT Excavator 320D', technician: 'Mike Johnson', startDate: 'Oct 18, 2025', expectedDate: 'Oct 20, 2025', status: 'On Track', progress: '60%', completedSteps: 'Initial diagnosis completed, Hydraulic pump removed, System flushed', remainingSteps: 'Install new pump, Test system, Final inspection', notes: 'Work is progressing well, no delays expected' }
    };

    const progress = progressData[repairId] || progressData['REP-010'];

    const content = `
        <div class="form-section">
            <h5><i class="fas fa-info-circle"></i> Basic Information</h5>
            <p><strong>Repair ID:</strong> <span style="color: var(--royal-blue);">${progress.id}</span></p>
            <p><strong>Status:</strong> <span class="status-text status-in-progress">${progress.status.toUpperCase()}</span></p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-car"></i> Asset & Assignment</h5>
            <p><strong>Asset:</strong> ${progress.assetName}</p>
            <p><strong>Technician:</strong> <i class="fas fa-user-cog"></i> ${progress.technician}</p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-calendar-alt"></i> Timeline</h5>
            <p><strong>Start Date:</strong> <i class="fas fa-calendar-check"></i> ${progress.startDate}</p>
            <p><strong>Expected Completion:</strong> <i class="fas fa-calendar-check"></i> ${progress.expectedDate}</p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-chart-line"></i> Progress</h5>
            <div style="margin-top: 8px; background: var(--background); border-radius: 6px; padding: 8px;">
                <div style="width: 100%; background: #e0e0e0; border-radius: 4px; height: 24px; position: relative;">
                    <div style="width: ${progress.progress}; background: var(--kelly-green); border-radius: 4px; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">${progress.progress}</div>
                </div>
            </div>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-check-circle"></i> Completed Steps</h5>
            <p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px;">${progress.completedSteps}</p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-tasks"></i> Remaining Steps</h5>
            <p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px;">${progress.remainingSteps}</p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-sticky-note"></i> Notes</h5>
            <p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px;">${progress.notes}</p>
        </div>
    `;

    createDetailsModal('Repair Progress', content);
}

function updateRepairTimeline(repairId) {
    showToast(`Updating timeline for repair ${repairId}`, 'info');
    // TODO: Implement timeline update functionality
}

function viewAllOutsourced() {
    showToast('Loading all outsourced repairs...', 'info');
    // TODO: Implement outsourced repairs view
}

function updateComponentInfo() {
    showToast('Opening component information update form', 'info');
    // TODO: Implement component info modal
}

// ==================== BUDGET APPROVAL FUNCTIONS ====================

function filterBudgetsByStatus(status) {
    const btn = event.target;
    document.querySelectorAll('#budget-approval .filter-controls .filter-btn').forEach(b => {
        b.classList.remove('active');
    });
    btn.classList.add('active');

    const rows = document.querySelectorAll('#pendingBudgetsTable tr');
    let visibleCount = 0;

    rows.forEach(row => {
        const rowStatus = row.getAttribute('data-status');
        if (!rowStatus) return;

        if (status === 'all') {
            row.style.display = '';
            visibleCount++;
        } else if (rowStatus === status) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    // Update badge count
    const badge = document.getElementById('budgetCountBadge');
    if (badge) {
        badge.textContent = `${visibleCount} budget${visibleCount !== 1 ? 's' : ''}`;
    }

    showToast(`Showing ${visibleCount} budget${visibleCount !== 1 ? 's' : ''}`, 'info');
}

function viewBudgetDetails(budgetId, budgetPayload = null) {
    const amountValue = Number.parseFloat(budgetPayload?.total_amount || 0);
    const amountLabel = Number.isFinite(amountValue)
        ? `LKR ${amountValue.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : 'LKR 0.00';

    const statusValue = (budgetPayload?.status || 'pending').toLowerCase();
    const statusLabel = statusValue.charAt(0).toUpperCase() + statusValue.slice(1);

    const ticketLabel = budgetPayload?.ticket_display_id || `Ticket #${budgetPayload?.fault_ticket_id || 'N/A'}`;
    const submittedBy = budgetPayload?.submitted_by_name || budgetPayload?.submitted_by_employee_id || 'Unknown';
    const submittedDate = budgetPayload?.created_at
        ? new Date(budgetPayload.created_at).toLocaleString('en-LK', {
            year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
        })
        : 'N/A';
    const approvalLevel = budgetPayload?.approval_level === 'maintenance_manager'
        ? 'Maintenance Manager'
        : 'Supervisor';
    const reviewNotes = budgetPayload?.review_notes || 'No review notes provided.';

    const fallbackDescription = 'No budget details were provided for this item.';
    const description = budgetPayload?.ticket_description || fallbackDescription;
    const quotation = budgetPayload?.quotation || 'No quotation details provided.';
    const justification = budgetPayload?.justification || 'No justification provided.';

    const content = `
        <div class="form-section">
            <h5><i class="fas fa-info-circle"></i> Basic Information</h5>
            <p><strong>Budget ID:</strong> <span style="color: var(--royal-blue);">${budgetId}</span></p>
            <p><strong>Status:</strong> <span class="status-text status-${statusValue}">${statusLabel}</span></p>
            <p><strong>Approval Level:</strong> ${approvalLevel}</p>
            <p><strong>Submitted Date:</strong> <i class="fas fa-calendar"></i> ${submittedDate}</p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-ticket-alt"></i> Fault Ticket</h5>
            <p><strong>Ticket:</strong> ${ticketLabel}</p>
            <p><strong>Submitted By:</strong> <i class="fas fa-user"></i> ${submittedBy}</p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-clipboard-list"></i> Ticket Description</h5>
            <p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px;">${description}</p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-receipt"></i> Quotation</h5>
            <div style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px; white-space: pre-line;">${quotation}</div>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-question-circle"></i> Justification</h5>
            <p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px;">${justification}</p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-comment-alt"></i> Review Notes</h5>
            <p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px;">${reviewNotes}</p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-dollar-sign"></i> Total Amount</h5>
            <div style="padding: 15px; background: linear-gradient(135deg, var(--royal-blue), var(--tang-blue)); color: white; border-radius: 8px; text-align: center;">
                <span style="font-size: 1.5em; font-weight: bold;">${amountLabel}</span>
            </div>
        </div>
    `;

    createDetailsModal('Budget Approval Details', content);
}

function approveBudget(budgetId) {
    createConfirmationDialog(
        'Approve Budget',
        `Approve budget ${budgetId}?`,
        async () => {
            const row = document.querySelector(`tr[data-id="${budgetId}"]`);
            if (row) {
                // Update status
                row.setAttribute('data-status', 'approved');

                // Update the actions column to show approved status
                const actionsCell = row.querySelector('.budget-actions');
                if (actionsCell) {
                    actionsCell.innerHTML = `
                        <span class="status-text status-completed">Approved</span>
                        <button class="btn btn-secondary btn-small" onclick="viewBudgetDetails('${budgetId}')"><i class="fas fa-eye"></i> View</button>
                    `;
                }

                // Hide the row if viewing only pending
                const activeBtn = document.querySelector('#budget-approval .filter-controls .filter-btn.active');
                if (activeBtn && activeBtn.textContent.toLowerCase().includes('pending')) {
                    row.style.display = 'none';
                }
            }
            showToast(`Budget ${budgetId} approved!`, 'success');
            updateBudgetCount();
        },
        'success'
    );
}

function rejectBudget(budgetId) {
    createConfirmationDialog(
        'Reject Budget',
        `Reject budget ${budgetId}? Technician will need to revise.`,
        async () => {
            const row = document.querySelector(`tr[data-id="${budgetId}"]`);
            if (row) {
                // Update status
                row.setAttribute('data-status', 'rejected');

                // Update the actions column to show rejected status
                const actionsCell = row.querySelector('.budget-actions');
                if (actionsCell) {
                    actionsCell.innerHTML = `
                        <span class="status-text status-rejected">Rejected</span>
                        <button class="btn btn-secondary btn-small" onclick="viewBudgetDetails('${budgetId}')"><i class="fas fa-eye"></i> View</button>
                    `;
                }

                // Hide the row if viewing only pending
                const activeBtn = document.querySelector('#budget-approval .filter-controls .filter-btn.active');
                if (activeBtn && activeBtn.textContent.toLowerCase().includes('pending')) {
                    row.style.display = 'none';
                }
            }
            showToast(`Budget ${budgetId} rejected.`, 'warning');
            updateBudgetCount();
        },
        'danger'
    );
}

function updateBudgetCount() {
    const activeBtn = document.querySelector('#budget-approval .filter-controls .filter-btn.active');
    if (activeBtn) {
        const rows = document.querySelectorAll('#pendingBudgetsTable tr');
        let visibleCount = 0;

        rows.forEach(row => {
            if (row.style.display !== 'none') {
                visibleCount++;
            }
        });

        const badge = document.getElementById('budgetCountBadge');
        if (badge) {
            badge.textContent = `${visibleCount} budget${visibleCount !== 1 ? 's' : ''}`;
        }
    }
}

// ==================== ASSET STATUS FUNCTIONS ====================

function filterAssets(status) {
    const btn = event.target;
    document.querySelectorAll('#asset-status .filter-controls .filter-btn').forEach(b => {
        b.classList.remove('active');
    });
    btn.classList.add('active');

    const rows = document.querySelectorAll('#assetStatusTable tr');
    let visibleCount = 0;

    rows.forEach(row => {
        const rowStatus = row.getAttribute('data-status');
        if (!rowStatus) return;

        if (status === 'all') {
            row.style.display = '';
            visibleCount++;
        } else if (rowStatus === status) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    showToast(`Showing ${visibleCount} asset${visibleCount !== 1 ? 's' : ''}`, 'info');
}

function viewAssetDetails(assetId) {
    // Sample data - replace with actual API call
    const assetData = {
        'VEH-001': { id: 'VEH-001', name: 'Toyota Hiace LKA-1234', type: 'Vehicle', category: 'Passenger Van', location: 'Depot A', status: 'Operational', lastService: '2024-01-15', nextService: '2024-04-15', mileage: '45,230 km', assignedTo: 'Driver John Doe', fuelType: 'Diesel', year: '2020', condition: 'Good' },
        'VEH-002': { id: 'VEH-002', name: 'Isuzu NPR LKA-5678', type: 'Vehicle', category: 'Light Truck', location: 'Workshop', status: 'In Maintenance', lastService: '2024-01-20', nextService: '2024-02-05', mileage: '78,500 km', assignedTo: 'Unassigned', fuelType: 'Diesel', year: '2019', condition: 'Fair' },
        'VEH-003': { id: 'VEH-003', name: 'Mitsubishi Canter LKA-9012', type: 'Vehicle', category: 'Medium Truck', location: 'Workshop', status: 'Under Repair', lastService: '2024-01-10', nextService: 'TBD', mileage: '125,400 km', assignedTo: 'Unassigned', fuelType: 'Diesel', year: '2018', condition: 'Needs Repair' },
        'MAC-001': { id: 'MAC-001', name: 'CAT Excavator 320D', type: 'Machine', category: 'Heavy Equipment', location: 'Site B', status: 'Operational', lastService: '2024-01-18', nextService: '2024-04-18', hours: '1,250 hrs', assignedTo: 'Operator Jane Smith', fuelType: 'Diesel', year: '2021', condition: 'Excellent' },
        'MAC-002': { id: 'MAC-002', name: 'JCB Backhoe 3CX', type: 'Machine', category: 'Heavy Equipment', location: 'Site C', status: 'Operational', lastService: '2024-01-12', nextService: '2024-04-12', hours: '890 hrs', assignedTo: 'Operator Mike Johnson', fuelType: 'Diesel', year: '2022', condition: 'Excellent' }
    };

    const asset = assetData[assetId] || assetData['VEH-001'];

    const content = `
        <div class="form-section">
            <h5><i class="fas fa-info-circle"></i> Basic Information</h5>
            <p><strong>Asset ID:</strong> <span style="color: var(--royal-blue);">${asset.id}</span></p>
            <p><strong>Name:</strong> ${asset.name}</p>
            <p><strong>Status:</strong> <span class="status-text status-${asset.status.toLowerCase().replace(' ', '-')}">${asset.status.toUpperCase()}</span></p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-cog"></i> Asset Details</h5>
            <p><strong>Type:</strong> <i class="fas fa-${asset.type === 'Vehicle' ? 'truck' : 'cogs'}"></i> ${asset.type} - ${asset.category}</p>
            <p><strong>Location:</strong> <i class="fas fa-map-marker-alt"></i> ${asset.location}</p>
            <p><strong>Year:</strong> ${asset.year}</p>
            <p><strong>Fuel Type:</strong> ${asset.fuelType}</p>
            <p><strong>Condition:</strong> ${asset.condition}</p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-tachometer-alt"></i> Usage</h5>
            <p><strong>${asset.type === 'Vehicle' ? 'Mileage' : 'Engine Hours'}:</strong> <span style="font-size: 1.1em; color: var(--royal-blue);">${asset.type === 'Vehicle' ? asset.mileage : asset.hours}</span></p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-user"></i> Assignment</h5>
            <p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px;">${asset.assignedTo}</p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-wrench"></i> Service Information</h5>
            <p><strong>Last Service:</strong> <i class="fas fa-calendar-check"></i> ${asset.lastService}</p>
            <p><strong>Next Service:</strong> <i class="fas fa-calendar-alt"></i> ${asset.nextService}</p>
        </div>
    `;

    createDetailsModal('Asset Details', content);
}

function updateAssetStatus(assetId) {
    showToast(`Updating status for asset ${assetId}`, 'info');
    // TODO: Implement status update modal
}

// ==================== TECHNICIAN FUNCTIONS ====================

async function viewTechnicianDetails(techId) {
    const technicianId = Number(techId);

    if (!technicianId) {
        showToast('Invalid technician ID', 'error');
        return;
    }

    let technician = technicianOverviewData.find(item => Number(item.id) === technicianId);

    if (!technician) {
        await loadTechnicians();
        technician = technicianOverviewData.find(item => Number(item.id) === technicianId);
    }

    if (!technician) {
        showToast('Technician details not found', 'error');
        return;
    }

    const assignedTickets = technicianOverviewAssignments.get(technicianId) || [];
    const workloadCount = getTechnicianWorkloadCount(technician, technicianOverviewAssignments);
    const workloadStatus = getTechnicianWorkloadStatus(workloadCount);
    const ticketStatesSummary = technicianTicketDataAvailable
        ? summarizeTechnicianTicketStates(assignedTickets)
        : (workloadCount === 0 ? 'No active tickets' : 'Ticket details unavailable');

    let assignedTicketHtml = '';

    if (!technicianTicketDataAvailable && workloadCount > 0) {
        assignedTicketHtml = `
            <p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px; color: var(--muted);">
                Ticket details are temporarily unavailable. Workload count is still shown above.
            </p>
        `;
    } else if (assignedTickets.length === 0) {
        assignedTicketHtml = `
            <p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px; color: var(--muted);">
                No active assignments for this technician.
            </p>
        `;
    } else {
        assignedTicketHtml = assignedTickets.map(ticket => {
            const ticketId = escapeHtml(ticket.ticket_id || `TKT-${String(ticket.id || '').padStart(3, '0')}`);
            const ticketStatus = escapeHtml((ticket.status || 'Open').toUpperCase());
            const priority = escapeHtml((ticket.priority || 'Medium').toUpperCase());
            const priorityClass = getPriorityStatusClass(ticket.priority);
            const statusClass = getTicketStatusClass(ticket.status);
            const machineName = escapeHtml(ticket.machine_name || 'N/A');
            const location = escapeHtml(ticket.location || 'N/A');
            const description = escapeHtml(ticket.description || 'No description provided');
            const expectedCompletion = formatDateTime(ticket.expected_completion_date, false);
            const assignedAt = formatDateTime(ticket.assigned_at);

            const ticketAction = Number.isFinite(Number(ticket.id))
                ? `<button class="btn btn-secondary btn-small" onclick="closeDetailsModal(); viewTicketDetails(${Number(ticket.id)})"><i class="fas fa-eye"></i> View Ticket</button>`
                : '';

            return `
                <div style="margin-top: 10px; padding: 12px; border: 1px solid var(--stone-200); border-radius: 8px; background: #fff;">
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 8px;">
                        <strong><i class="fas fa-ticket-alt"></i> ${ticketId}</strong>
                        <span class="status-text ${statusClass}">${ticketStatus}</span>
                    </div>
                    <p><strong>Priority:</strong> <span class="status-text ${priorityClass}">${priority}</span></p>
                    <p><strong>Machine:</strong> ${machineName}</p>
                    <p><strong>Location:</strong> ${location}</p>
                    <p><strong>Expected Completion:</strong> ${expectedCompletion}</p>
                    <p><strong>Assigned At:</strong> ${assignedAt}</p>
                    <p><strong>Description:</strong> ${description}</p>
                    <div style="margin-top: 10px;">
                        ${ticketAction}
                    </div>
                </div>
            `;
        }).join('');
    }

    const technicianName = escapeHtml(technician.full_name || `Technician #${technician.id}`);
    const expertise = escapeHtml(technician.technical_expertise || 'General');
    const employeeId = escapeHtml(technician.employee_id || 'N/A');
    const department = escapeHtml(technician.department || 'N/A');
    const email = escapeHtml(technician.email || 'N/A');
    const phone = escapeHtml(technician.phone || 'N/A');

    const content = `
        <div class="form-section">
            <h5><i class="fas fa-info-circle"></i> Basic Information</h5>
            <p><strong>Technician ID:</strong> <span style="color: var(--royal-blue);">${employeeId}</span></p>
            <p><strong>Name:</strong> ${technicianName}</p>
            <p><strong>Availability:</strong> <span class="status-text ${workloadStatus.className}">${workloadStatus.label}</span></p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-user-cog"></i> Professional Details</h5>
            <p><strong>Technical Expertise:</strong> <i class="fas fa-wrench"></i> ${expertise}</p>
            <p><strong>Department:</strong> ${department}</p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-address-book"></i> Contact Information</h5>
            <p><strong>Phone:</strong> <i class="fas fa-phone"></i> ${phone}</p>
            <p><strong>Email:</strong> <i class="fas fa-envelope"></i> ${email}</p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-chart-bar"></i> Current Workload</h5>
            <p><strong>Active Assignments:</strong> ${workloadCount}</p>
            <p><strong>Ticket State Summary:</strong> ${escapeHtml(ticketStatesSummary)}</p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-tasks"></i> Assigned Tickets</h5>
            ${assignedTicketHtml}
        </div>
    `;

    createDetailsModal('Technician Details', content);
}

function assignNewTicket(techId) {
    navigateTo('fault-tickets');
    showToast('Select a fault ticket and use Assign to choose technician(s)', 'info');
}

// ==================== MODAL BACKDROP HANDLERS ====================

// Close modals on backdrop click
window.addEventListener('click', (event) => {
    if (event.target.classList.contains('modal')) {
        const modalDisplay = window.getComputedStyle(event.target).display;
        if (modalDisplay === 'flex' || event.target.classList.contains('active')) {
            if (event.target.id === 'createTicketModal') {
                closeCreateTicketModal();
            } else if (event.target.id === 'assignTicketModal') {
                closeAssignTicketModal();
            } else if (event.target.id === 'viewTicketModal') {
                closeViewTicketModal();
            }
        }
    }
});

// Close modals on ESC key
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        const createModal = document.getElementById('createTicketModal');
        const assignModal = document.getElementById('assignTicketModal');
        const viewModal = document.getElementById('viewTicketModal');

        if (createModal && (createModal.classList.contains('active') || window.getComputedStyle(createModal).display === 'flex')) {
            closeCreateTicketModal();
        } else if (assignModal && window.getComputedStyle(assignModal).display === 'flex') {
            closeAssignTicketModal();
        } else if (viewModal && window.getComputedStyle(viewModal).display === 'flex') {
            closeViewTicketModal();
        }
    }
});
// ==================== DROPDOWN MENU FUNCTIONS ====================

function toggleDropdown(event, dropdownId) {
    event.stopPropagation();
    const dropdown = document.getElementById(`dropdown-${dropdownId}`);
    const allDropdowns = document.querySelectorAll('.dropdown-menu');

    // Close all other dropdowns
    allDropdowns.forEach(d => {
        if (d !== dropdown) {
            d.classList.remove('show');
        }
    });

    // Toggle current dropdown
    dropdown.classList.toggle('show');
}

function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-menu').forEach(dropdown => {
        dropdown.classList.remove('show');
    });
}

// Close dropdowns when clicking outside
document.addEventListener('click', function (event) {
    if (!event.target.closest('.dropdown-container')) {
        closeAllDropdowns();
    }
});

// Placeholder functions for dropdown actions
function reassignTicket(ticketId) {
    assignTicket(ticketId);
}

function markTicketComplete(ticketId) {
    // Implementation for marking ticket complete
    console.log('Mark ticket complete:', ticketId);
    showToast('Feature coming soon', 'info');
}

function printTicket(ticketId) {
    // Implementation for printing ticket
    console.log('Print ticket:', ticketId);
    showToast('Feature coming soon', 'info');
}

function editTicket(ticketId) {
    // Implementation for editing ticket
    console.log('Edit ticket:', ticketId);
    showToast('Feature coming soon', 'info');
}

function editTicketAssignment(ticketId) {
    assignTicket(ticketId);
}

// ==================== REPORTS PAGE ====================

let allDriverReports = [];
let allOperatorReports = [];
let currentReportSourceFilter = 'all';
let currentReportStatusFilter = 'all';
let allReportsMap = new Map(); // Store reports by ID for quick access
let weeklyCheckReportsMap = new Map(); // Store weekly check reports by ID for quick access

// Load all reports data
async function loadAllReports() {
    try {
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);

        // Load driver breakdown reports (vehicle breakdowns + route breakdowns)
        const vehicleResponse = await fetch(`${CONFIG.API_BASE_URL}/breakdown-reports`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const routeResponse = await fetch(`${CONFIG.API_BASE_URL}/route-breakdowns`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // Load machinery operator fault tickets
        const faultResponse = await fetch(`${CONFIG.API_BASE_URL}/fault-tickets`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        allDriverReports = [];
        allOperatorReports = [];

        // Process vehicle breakdowns
        if (vehicleResponse.ok) {
            const vehicleData = await vehicleResponse.json();
            if (vehicleData.status === 'success' && vehicleData.data.reports) {
                vehicleData.data.reports.forEach(report => {
                    allDriverReports.push({
                        ...report,
                        report_type: 'Vehicle Breakdown',
                        breakdown_type: 'vehicle_breakdown',
                        report_id: report.breakdown_id,
                        date: report.breakdown_date,
                        source: 'driver'
                    });
                });
            }
        }

        // Process route breakdowns
        if (routeResponse.ok) {
            const routeData = await routeResponse.json();
            if (routeData.status === 'success' && routeData.data.breakdowns) {
                routeData.data.breakdowns.forEach(breakdown => {
                    allDriverReports.push({
                        ...breakdown,
                        report_type: 'Route Breakdown',
                        breakdown_type: 'route_breakdown',
                        report_id: breakdown.route_breakdown_id,
                        date: breakdown.breakdown_datetime,
                        source: 'driver'
                    });
                });
            }
        }

        // Process fault tickets from machinery operators
        if (faultResponse.ok) {
            const faultData = await faultResponse.json();
            if (faultData.status === 'success' && faultData.data.tickets) {
                faultData.data.tickets.forEach(ticket => {
                    allOperatorReports.push({
                        ...ticket,
                        report_type: 'Fault Ticket',
                        breakdown_type: 'fault_ticket',
                        report_id: ticket.ticket_id,
                        date: ticket.created_at,
                        source: 'operator'
                    });
                });
            }
        }

        displayAllReports();
    } catch (error) {
        console.error('Error loading reports:', error);
        const container = document.getElementById('allReportsList');
        if (container) {
            container.innerHTML = '<p style="text-align: center; color: var(--danger); padding: 40px;"><i class="fas fa-exclamation-triangle"></i> Failed to load reports</p>';
        }
        showToast('Failed to load reports', 'error');
    }
}

// Display all reports in one list
function displayAllReports() {
    const container = document.getElementById('allReportsList');
    if (!container) return;

    container.innerHTML = '';

    // Combine all reports
    let allReports = [...allDriverReports, ...allOperatorReports];

    // Apply filters
    let filteredReports = allReports.filter(report => {
        const matchesSource = currentReportSourceFilter === 'all' || report.source === currentReportSourceFilter;
        const matchesStatus = currentReportStatusFilter === 'all' || report.status === currentReportStatusFilter;
        return matchesSource && matchesStatus;
    });

    // Sort by date descending
    filteredReports.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filteredReports.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 40px;">No reports found</p>';
        return;
    }

    filteredReports.forEach(report => {
        // Store report in map for easy access
        allReportsMap.set(report.report_id, report);

        const card = document.createElement('div');
        card.className = 'inventory-item';
        card.setAttribute('data-id', report.report_id);
        card.setAttribute('data-type', report.source);
        card.setAttribute('data-status', (report.status || 'pending').toLowerCase());

        const isDriver = report.source === 'driver';
        const icon = isDriver ? 'fa-car' : 'fa-wrench';
        // Use number_plate from API for driver reports, machine_name for operator reports
        const assetName = report.number_plate || report.vehicle_registration_no || report.machine_name || 'N/A';
        const submittedBy = report.driver_name || report.reported_by_name || report.reported_by || 'N/A';
        const statusClass = (report.status || 'pending').toLowerCase().replace(' ', '-');

        card.innerHTML = `
            <div class="item-details">
                <strong><i class="fas ${icon}"></i> ${report.report_type} #${report.report_id} - ${assetName}</strong>
                <div class="item-meta">
                    <i class="fas fa-user"></i> ${submittedBy} | 
                    <i class="fas fa-tag"></i> ${isDriver ? 'Driver' : 'Operator'}
                    ${report.priority ? ` | <i class="fas fa-exclamation-circle"></i> ${report.priority}` : ''}
                    ${report.severity ? ` | <i class="fas fa-thermometer-half"></i> ${report.severity}` : ''}
                </div>
                <div class="item-meta">
                    <span class="status-text status-${statusClass}">${(report.status || 'Pending').toUpperCase()}</span> | 
                    <i class="fas fa-calendar"></i> ${new Date(report.date).toLocaleString()}
                    ${report.breakdown_location ? ` | <i class="fas fa-map-marker-alt"></i> ${report.breakdown_location}` : ''}
                    ${report.location && !report.breakdown_location ? ` | <i class="fas fa-map-marker-alt"></i> ${report.location}` : ''}
                </div>
            </div>
            <div class="item-actions">
                <div class="action-buttons">
                    <button class="btn btn-primary btn-small" onclick="viewReportDetails('${report.report_id}')">
                        <i class="fas fa-eye"></i> VIEW
                    </button>
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}

// Display driver reports (kept for backward compatibility, but now calls displayAllReports)
function displayDriverReports() {
    displayAllReports();
}

// Display operator reports (kept for backward compatibility, but now calls displayAllReports)
function displayOperatorReports() {
    displayAllReports();
}

// Display driver reports
function displayDriverReports() {
    const container = document.getElementById('driverReportsList');
    if (!container) return;

    container.innerHTML = '';

    let filteredReports = allDriverReports.filter(report => {
        const matchesSource = currentReportSourceFilter === 'all' || currentReportSourceFilter === 'driver';
        const matchesStatus = currentReportStatusFilter === 'all' || report.status === currentReportStatusFilter;
        return matchesSource && matchesStatus;
    });

    // Sort by date descending
    filteredReports.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Update badge
    const badge = document.getElementById('driverReportsBadge');
    if (badge) {
        badge.textContent = `${filteredReports.length} report${filteredReports.length !== 1 ? 's' : ''}`;
    }

    if (filteredReports.length === 0) {
        container.innerHTML = '<div style="padding: 40px; text-align: center; color: #9ca3af;">No driver reports found</div>';
        return;
    }

    filteredReports.forEach(report => {
        const statusColor = getStatusColor(report.status);
        const card = document.createElement('div');
        card.className = 'inventory-item';
        card.style.cursor = 'pointer';
        card.onclick = () => viewReportDetails(report);

        card.innerHTML = `
            <div class="inventory-item-header">
                <div class="inventory-item-title">
                    <i class="fas fa-car"></i> ${report.report_type} #${report.report_id}
                </div>
                <span class="badge" style="background: ${statusColor};">
                    ${report.status || 'Pending'}
                </span>
            </div>
            <div class="inventory-item-details">
                <div class="detail-row">
                    <i class="fas fa-calendar"></i>
                    <span>${new Date(report.date).toLocaleString()}</span>
                </div>
                ${report.vehicle_registration_no ? `
                <div class="detail-row">
                    <i class="fas fa-truck"></i>
                    <span>${report.vehicle_registration_no}</span>
                </div>
                ` : ''}
                ${report.location ? `
                <div class="detail-row">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${report.location}</span>
                </div>
                ` : ''}
                ${report.severity ? `
                <div class="detail-row">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>${report.severity}</span>
                </div>
                ` : ''}
            </div>
            <div class="inventory-item-meta">
                ${report.description || report.issue_description || 'No description'}
            </div>
        `;

        container.appendChild(card);
    });
}

// Display operator reports
function displayOperatorReports() {
    const container = document.getElementById('operatorReportsList');
    if (!container) return;

    container.innerHTML = '';

    let filteredReports = allOperatorReports.filter(report => {
        const matchesSource = currentReportSourceFilter === 'all' || currentReportSourceFilter === 'operator';
        const matchesStatus = currentReportStatusFilter === 'all' || report.status === currentReportStatusFilter;
        return matchesSource && matchesStatus;
    });

    // Sort by date descending
    filteredReports.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Update badge
    const badge = document.getElementById('operatorReportsBadge');
    if (badge) {
        badge.textContent = `${filteredReports.length} report${filteredReports.length !== 1 ? 's' : ''}`;
    }

    if (filteredReports.length === 0) {
        container.innerHTML = '<div style="padding: 40px; text-align: center; color: #9ca3af;">No operator reports found</div>';
        return;
    }

    filteredReports.forEach(report => {
        const statusColor = getStatusColor(report.status);
        const priorityColor = getPriorityColor(report.priority);
        const card = document.createElement('div');
        card.className = 'inventory-item';
        card.style.cursor = 'pointer';
        card.onclick = () => viewReportDetails(report);

        card.innerHTML = `
            <div class="inventory-item-header">
                <div class="inventory-item-title">
                    <i class="fas fa-wrench"></i> ${report.report_type} #${report.report_id}
                </div>
                <div style="display: flex; gap: 8px;">
                    ${report.priority ? `<span class="badge" style="background: ${priorityColor};">${report.priority}</span>` : ''}
                    <span class="badge" style="background: ${statusColor};">
                        ${report.status || 'Pending'}
                    </span>
                </div>
            </div>
            <div class="inventory-item-details">
                <div class="detail-row">
                    <i class="fas fa-calendar"></i>
                    <span>${new Date(report.date).toLocaleString()}</span>
                </div>
                ${report.machine_name ? `
                <div class="detail-row">
                    <i class="fas fa-cog"></i>
                    <span>${report.machine_name}</span>
                </div>
                ` : ''}
                ${report.reported_by ? `
                <div class="detail-row">
                    <i class="fas fa-user"></i>
                    <span>${report.reported_by}</span>
                </div>
                ` : ''}
                ${report.fault_type ? `
                <div class="detail-row">
                    <i class="fas fa-tools"></i>
                    <span>${report.fault_type}</span>
                </div>
                ` : ''}
            </div>
            <div class="inventory-item-meta">
                ${report.description || report.fault_description || 'No description'}
            </div>
        `;

        container.appendChild(card);
    });
}

// Update report statistics
function updateReportStatistics() {
    const totalDriverCount = document.getElementById('totalDriverReportsCount');
    const totalOperatorCount = document.getElementById('totalOperatorReportsCount');
    const pendingCount = document.getElementById('totalPendingReportsCount');
    const criticalCount = document.getElementById('totalCriticalReportsCount');

    if (totalDriverCount) totalDriverCount.textContent = allDriverReports.length;
    if (totalOperatorCount) totalOperatorCount.textContent = allOperatorReports.length;

    const pendingReports = [...allDriverReports, ...allOperatorReports].filter(r => r.status === 'pending');
    if (pendingCount) pendingCount.textContent = pendingReports.length;

    const criticalReports = [...allDriverReports, ...allOperatorReports].filter(r =>
        r.priority === 'high' || r.priority === 'critical' || r.severity === 'critical'
    );
    if (criticalCount) criticalCount.textContent = criticalReports.length;
}

// Filter reports by source
function filterReportsBySource(source) {
    // Update filter buttons with data-filter-source attribute
    document.querySelectorAll('[data-filter-source]').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-filter-source') === source) {
            btn.classList.add('active');
        }
    });

    // Also update filter buttons without data-filter-source (for weekly check reports section)
    const weeklyCheckButtons = document.querySelectorAll('#reportSourceFilters .filter-btn');
    weeklyCheckButtons.forEach(btn => {
        const onclickAttr = btn.getAttribute('onclick');
        if (onclickAttr && onclickAttr.includes(`'${source}'`)) {
            btn.classList.add('active');
        }
    });

    currentReportSourceFilter = source;

    // If we're on the "All Reports" section, use displayAllReports
    const allReportsContainer = document.getElementById('allReportsList');
    const weeklyCheckContainer = document.getElementById('reportsTableBody');

    // Check which section is currently visible or has content
    if (allReportsContainer && allReportsContainer.closest('#reports')) {
        displayAllReports();
    }

    // If weekly check reports section exists, also apply filters there
    if (weeklyCheckContainer && weeklyCheckContainer.closest('#daily-check-reports')) {
        applyReportFilters();
    }
}

// Filter reports by status
function filterReportsByReportStatus(status) {
    // Update filter buttons
    document.querySelectorAll('[data-filter-status]').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-filter-status') === status) {
            btn.classList.add('active');
        }
    });

    currentReportStatusFilter = status;
    displayAllReports();
}

// View report details
function viewReportDetails(reportIdOrObj) {
    let report;

    // Check if we received a report object or an ID
    if (typeof reportIdOrObj === 'object' && reportIdOrObj !== null) {
        report = reportIdOrObj;
    } else {
        // Try both string and number keys
        report = allReportsMap.get(reportIdOrObj) || allReportsMap.get(parseInt(reportIdOrObj));
    }

    if (!report) {
        console.log('Report not found for ID:', reportIdOrObj, 'Map keys:', Array.from(allReportsMap.keys()));
        showToast('Report not found', 'error');
        return;
    }

    console.log('Full report data:', report); // Debug log

    const isDriver = report.source === 'driver';
    const isRouteBreakdown = report.report_type === 'Route Breakdown';
    const isFaultTicket = report.report_type === 'Fault Ticket';
    const statusClass = (report.status || 'pending').toLowerCase().replace(/\s+/g, '-');
    const icon = isDriver ? 'fa-car' : 'fa-wrench';

    // Get vehicle/number plate (API returns 'number_plate')
    const vehicleNumber = report.number_plate || report.vehicle_registration_no || 'N/A';

    const content = `
        <div class="form-section">
            <h5><i class="fas fa-info-circle"></i> Basic Information</h5>
            <div class="details-grid">
                <p><strong>Report ID:</strong> <span class="highlight-text">${report.report_type} #${report.report_id}</span></p>
                <p><strong>Source:</strong> ${isDriver ? '<i class="fas fa-car"></i> Driver Report' : '<i class="fas fa-cog"></i> Machinery Operator Report'}</p>
                <p><strong>Status:</strong> <span class="status-badge status-${statusClass}">${(report.status || 'Pending').toUpperCase()}</span></p>
                <p><strong>Report Date:</strong> ${new Date(report.date).toLocaleString()}</p>
                ${report.created_at && report.created_at !== report.date ? `<p><strong>Created At:</strong> ${new Date(report.created_at).toLocaleString()}</p>` : ''}
                ${report.updated_at ? `<p><strong>Last Updated:</strong> ${new Date(report.updated_at).toLocaleString()}</p>` : ''}
            </div>
            ${report.priority ? `<p><strong>Priority:</strong> <span class="priority-${report.priority.toLowerCase()}">${report.priority.toUpperCase()}</span></p>` : ''}
        </div>
        
        ${isDriver ? `
        <div class="form-section">
            <h5><i class="fas fa-truck"></i> Vehicle & Driver Information</h5>
            <div class="details-grid">
                <p><strong>Vehicle Number:</strong> ${vehicleNumber}</p>
                <p><strong>Driver Name:</strong> ${report.driver_name || 'N/A'}</p>
                ${report.vehicle_id ? `<p><strong>Vehicle ID:</strong> ${report.vehicle_id}</p>` : ''}
                ${report.driver_id ? `<p><strong>Driver ID:</strong> ${report.driver_id}</p>` : ''}
            </div>
        </div>
        
        <div class="form-section">
            <h5><i class="fas fa-exclamation-triangle"></i> Breakdown Details</h5>
            <div class="details-grid">
                ${report.breakdown_type && report.breakdown_type !== 'vehicle_breakdown' && report.breakdown_type !== 'route_breakdown' ? `<p><strong>Breakdown Type:</strong> ${report.breakdown_type}</p>` : ''}
                ${report.severity ? `<p><strong>Severity:</strong> <span class="severity-${report.severity.toLowerCase()}">${report.severity.toUpperCase()}</span></p>` : ''}
                ${isRouteBreakdown && report.breakdown_location ? `<p><strong>Breakdown Location:</strong> ${report.breakdown_location}</p>` : ''}
                ${isRouteBreakdown && report.breakdown_datetime ? `<p><strong>Breakdown Time:</strong> ${new Date(report.breakdown_datetime).toLocaleString()}</p>` : ''}
                ${!isRouteBreakdown && report.breakdown_date ? `<p><strong>Breakdown Date:</strong> ${new Date(report.breakdown_date).toLocaleDateString()}</p>` : ''}
                ${report.breakdown_id && isRouteBreakdown ? `<p><strong>Related Breakdown ID:</strong> ${report.breakdown_id}</p>` : ''}
            </div>
        </div>
        ` : `
        <div class="form-section">
            <h5><i class="fas fa-cog"></i> Machine Information</h5>
            <div class="details-grid">
                <p><strong>Machine Name:</strong> ${report.machine_name || 'N/A'}</p>
                ${report.machine_model_number ? `<p><strong>Model Number:</strong> ${report.machine_model_number}</p>` : ''}
                ${report.machine_id ? `<p><strong>Machine ID:</strong> ${report.machine_id}</p>` : ''}
                ${report.serial_number ? `<p><strong>Serial Number:</strong> ${report.serial_number}</p>` : ''}
            </div>
        </div>
        
        <div class="form-section">
            <h5><i class="fas fa-exclamation-triangle"></i> Fault Details</h5>
            <div class="details-grid">
                ${report.fault_type ? `<p><strong>Fault Type:</strong> ${report.fault_type}</p>` : ''}
                ${report.priority ? `<p><strong>Priority:</strong> <span class="priority-${report.priority.toLowerCase()}">${report.priority.toUpperCase()}</span></p>` : ''}
                ${report.location ? `<p><strong>Location:</strong> ${report.location}</p>` : ''}
                ${report.reported_by_name || report.reporter_full_name ? `<p><strong>Reported By:</strong> ${report.reported_by_name || report.reporter_full_name}</p>` : ''}
                ${report.reported_by ? `<p><strong>Reporter ID:</strong> ${report.reported_by}</p>` : ''}
            </div>
        </div>
        `}
        
        <div class="form-section">
            <h5><i class="fas fa-file-alt"></i> Description</h5>
            <div class="description-box">
                ${report.description || report.issue_description || report.fault_description || 'No description provided'}
            </div>
        </div>
        
        ${report.notes || report.additional_notes ? `
        <div class="form-section">
            <h5><i class="fas fa-sticky-note"></i> Additional Notes</h5>
            <div class="description-box">${report.notes || report.additional_notes}</div>
        </div>
        ` : ''}
        
        ${(report.images && report.images.length > 0) || report.image_path ? `
        <div class="form-section">
            <h5><i class="fas fa-images"></i> Attached Images</h5>
            <div class="image-gallery">
                ${report.images && report.images.length > 0 ? report.images.map(img => `
                    <img src="${img.image_url || img.file_path || img}" alt="Report Image" 
                         class="gallery-image"
                         onclick="window.open('${img.image_url || img.file_path || img}', '_blank')">
                `).join('') : ''}
                ${report.image_path ? `
                    <img src="${report.image_path}" alt="Report Image" 
                         class="gallery-image"
                         onclick="window.open('${report.image_path}', '_blank')">
                ` : ''}
            </div>
        </div>
        ` : ''}
    `;

    document.getElementById('reportDetailsModalTitle').innerHTML = `<i class="fas ${icon}"></i> ${report.report_type} Details`;
    document.getElementById('reportDetailsModalContent').innerHTML = content;
    openReportDetailsModal();
}

// Open report details modal
function openReportDetailsModal() {
    const modal = document.getElementById('reportDetailsModal');
    if (!modal) {
        console.error('reportDetailsModal element not found in DOM');
        showToast('Error: Modal not found', 'error');
        return;
    }

    // Reset and show modal
    modal.style.display = 'flex';
    modal.style.opacity = '0';
    document.body.style.overflow = 'hidden';

    // Force reflow to ensure CSS transition works properly
    void modal.offsetHeight;

    // Fade in with transition
    requestAnimationFrame(() => {
        modal.style.opacity = '1';
    });
}

// Close report details modal
function closeReportDetailsModal() {
    const modal = document.getElementById('reportDetailsModal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    }
}

// Update modal footer with action buttons based on report status
function updateModalFooter(reportId, status) {
    const modalFooter = document.querySelector('#reportDetailsModal .modal-footer');
    if (!modalFooter) return;

    // Clear existing buttons
    modalFooter.innerHTML = '';

    if (status === 'pending') {
        // Add Approve and Reject buttons for pending reports
        modalFooter.innerHTML = `
            <button type="button" class="btn btn-success" onclick="approveReport('${reportId}')">
                <i class="fas fa-check"></i> Approve
            </button>
            <button type="button" class="btn btn-danger" onclick="rejectReport('${reportId}')">
                <i class="fas fa-times"></i> Reject
            </button>
            <button type="button" class="btn btn-secondary" onclick="closeReportDetailsModal()">
                <i class="fas fa-arrow-left"></i> Close
            </button>
        `;
    } else {
        // For approved/rejected reports, just show close button
        modalFooter.innerHTML = `
            <button type="button" class="btn btn-secondary" onclick="closeReportDetailsModal()">
                <i class="fas fa-times"></i> Close
            </button>
        `;
    }
}

// Get severity color helper
function getSeverityColor(severity) {
    const colors = {
        'low': '#10b981',
        'minor': '#10b981',
        'medium': '#f59e0b',
        'moderate': '#f59e0b',
        'high': '#ef4444',
        'severe': '#ef4444',
        'critical': '#dc2626'
    };
    return colors[severity?.toLowerCase()] || '#6b7280';
}

// Helper functions
function getStatusColor(status) {
    const colors = {
        'pending': '#f59e0b',
        'in_progress': '#3b82f6',
        'resolved': '#10b981',
        'assigned': '#6366f1',
        'completed': '#059669',
        'rejected': '#dc2626'
    };
    return colors[status?.toLowerCase()] || '#6b7280';
}

function getPriorityColor(priority) {
    const colors = {
        'low': '#10b981',
        'medium': '#f59e0b',
        'high': '#ef4444',
        'critical': '#dc2626'
    };
    return colors[priority?.toLowerCase()] || '#6b7280';
}
