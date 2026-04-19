// ==================== INITIALIZATION & AUTH ====================

DashboardInit.init('Supervisor', {
    onSuccess: () => {
        bindSupervisorDashboardOverview();
        bindSupervisorDailyCheckReports();
        bindSupervisorFaultTickets();
        bindSupervisorTicketModals();
        bindSupervisorTicketDetailView();
        bindSupervisorBreakdownDetailView();
        bindSupervisorAssetStatus();
        bindSupervisorRepairManagement();
        bindSupervisorBudgetApproval();
        bindSupervisorTechnicians();
        loadDashboardData();

        // Refresh weekly check reports every 30 seconds
        setInterval(() => {
            const currentSection = document.querySelector('.content-section.active')?.id;
            if (currentSection === 'daily-check-reports') {
                refreshSupervisorDailyCheckReports();
            }
        }, 30000);
    }
});

// ==================== NAVIGATION ====================

const SUPERVISOR_SECTIONS = new Set([
    'dashboard',
    'daily-check-reports',
    'fault-ticket-tracking',
    'ticket-details',
    'breakdown-details',
    'repair-management',
    'budget-approval',
    'asset-status',
    'technicians'
]);

let supervisorTicketDetailsReturnSection = 'fault-ticket-tracking';
let supervisorBreakdownDetailsReturnSection = 'fault-ticket-tracking';

function normalizeSupervisorSection(sectionId) {
    if (sectionId === 'technician-assignments' || sectionId === 'fault-tickets') {
        return 'fault-ticket-tracking';
    }

    return SUPERVISOR_SECTIONS.has(sectionId) ? sectionId : 'dashboard';
}

function getInitialSupervisorSection() {
    const sectionFromUrl = new URLSearchParams(window.location.search).get('section');
    return normalizeSupervisorSection(sectionFromUrl);
}

function syncSupervisorSectionInUrl(sectionId) {
    const normalized = normalizeSupervisorSection(sectionId);
    const url = new URL(window.location.href);

    if (url.searchParams.get('section') === normalized) {
        return;
    }

    url.searchParams.set('section', normalized);
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
}

function navigateSupervisorSection(sectionId) {
    const section = normalizeSupervisorSection(sectionId);
    const layout = document.querySelector('ac-layout');
    if (!layout || typeof layout.navigateTo !== 'function') {
        return;
    }

    layout.navigateTo(section);
}

function scrollSupervisorViewportToTop() {
    try {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } catch (_error) {
        window.scrollTo(0, 0);
    }
}

document.querySelector('ac-layout')
    ?.addEventListener('section-change', (event) => {
        const section = normalizeSupervisorSection(event.detail?.section);
        syncSupervisorSectionInUrl(section);
        loadSectionData(section);
    });

// ==================== DATA LOADING ====================

function loadDashboardData() {
    const initialSection = getInitialSupervisorSection();
    const layout = document.querySelector('ac-layout');

    if (layout && typeof layout.navigateTo === 'function') {
        layout.navigateTo(initialSection);
        return;
    }

    syncSupervisorSectionInUrl(initialSection);
    loadSectionData(initialSection);
}

function loadSectionData(sectionId) {
    switch (sectionId) {
        case 'dashboard':
            // Dashboard already shows static summary
            break;
        case 'daily-check-reports':
            refreshSupervisorDailyCheckReports();
            break;
        case 'fault-ticket-tracking':
            refreshSupervisorFaultTicketTracking();
            break;
        case 'ticket-details':
        case 'breakdown-details':
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

function bindSupervisorDailyCheckReports() {
    const component = document.querySelector('supervisor-daily-check-reports');
    if (!component || component.dataset.bound === 'true') return;

    component.dataset.bound = 'true';

    component.addEventListener('supervisor-daily-check-reports:toast', (event) => {
        const message = event.detail?.message;
        const type = event.detail?.type || 'info';
        if (!message) return;
        showToast(message, type);
    });

    component.addEventListener('supervisor-daily-check-reports:pending-count', (event) => {
        const count = Number(event.detail?.count);
        if (!Number.isFinite(count)) return;
        updateDashboardSummary(count);
    });
}

function refreshSupervisorDailyCheckReports() {
    const component = document.querySelector('supervisor-daily-check-reports');
    if (!component || typeof component.refresh !== 'function') return;
    component.refresh();
}

function refreshSupervisorFaultTicketTracking() {
    const component = document.querySelector('supervisor-fault-ticket-tracking');
    if (!component || typeof component.refresh !== 'function') return;
    component.refresh();
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

    component.addEventListener('supervisor-fault-tickets:action', (event) => {
        const detail = event.detail || {};
        const action = detail.action;

        if (!action) return;

        switch (action) {
            case 'view-breakdown':
            case 'view-breakdown-ticket':
                if (!detail.reportType || !detail.reportId) return;
                viewOrCreateBreakdownTicket(detail.reportType, detail.reportId);
                break;
            case 'assign-breakdown':
                if (!detail.reportType || !detail.reportId) return;
                assignBreakdownTicket(detail.reportType, detail.reportId);
                break;
            case 'view-machine-breakdown':
                if (!detail.ticketId) return;
                viewTicketDetails(detail.ticketId);
                break;
            case 'view-ticket':
                if (!detail.ticketId) return;
                viewTicketDetails(detail.ticketId);
                break;
            case 'assign-ticket':
                if (!detail.ticketId) return;
                assignTicket(detail.ticketId);
                break;
            case 'edit-ticket':
                if (!detail.ticketId) return;
                editTicket(detail.ticketId);
                break;
            case 'delete-ticket':
                if (!detail.ticketId) return;
                deleteTicket(detail.ticketId);
                break;
            case 'edit-assignment':
                if (!detail.ticketId) return;
                editTicketAssignment(detail.ticketId);
                break;
            case 'reassign-ticket':
                if (!detail.ticketId) return;
                reassignTicket(detail.ticketId);
                break;
            case 'mark-complete':
                if (!detail.ticketId) return;
                markTicketComplete(detail.ticketId);
                break;
            case 'print-ticket':
                if (!detail.ticketId) return;
                printTicket(detail.ticketId);
                break;
            default:
                break;
        }
    });
}

function bindSupervisorTicketModals() {
    const createTicketModal = document.querySelector('supervisor-create-ticket-modal');
    if (createTicketModal && createTicketModal.dataset.bound !== 'true') {
        createTicketModal.dataset.bound = 'true';

        createTicketModal.addEventListener('supervisor-ticket-modal:toast', (event) => {
            const message = event.detail?.message;
            const type = event.detail?.type || 'info';
            if (!message) return;
            showToast(message, type);
        });

        createTicketModal.addEventListener('supervisor-create-ticket-modal:created', () => {
            loadFaultTickets();
        });
    }

    const assignTicketModal = document.querySelector('supervisor-assign-ticket-modal');
    if (assignTicketModal && assignTicketModal.dataset.bound !== 'true') {
        assignTicketModal.dataset.bound = 'true';

        assignTicketModal.addEventListener('supervisor-ticket-modal:toast', (event) => {
            const message = event.detail?.message;
            const type = event.detail?.type || 'info';
            if (!message) return;
            showToast(message, type);
        });

        assignTicketModal.addEventListener('supervisor-assign-ticket-modal:assigned', () => {
            loadFaultTickets();
        });
    }

    const viewTicketModal = document.querySelector('supervisor-view-ticket-modal');
    if (viewTicketModal && viewTicketModal.dataset.bound !== 'true') {
        viewTicketModal.dataset.bound = 'true';

        viewTicketModal.addEventListener('supervisor-ticket-modal:toast', (event) => {
            const message = event.detail?.message;
            const type = event.detail?.type || 'info';
            if (!message) return;
            showToast(message, type);
        });
    }
}

function bindSupervisorTicketDetailView() {
    const component = document.querySelector('#ticket-details supervisor-ticket-detail-view');
    if (!component || component.dataset.bound === 'true') {
        return;
    }

    component.dataset.bound = 'true';

    component.addEventListener('supervisor-ticket-detail-view:toast', (event) => {
        const message = event.detail?.message;
        const type = event.detail?.type || 'info';
        if (!message) {
            return;
        }

        showToast(message, type);
    });

    component.addEventListener('supervisor-ticket-detail-view:back', (event) => {
        const requestedSection = normalizeSupervisorSection(
            event.detail?.returnSection
            || supervisorTicketDetailsReturnSection
            || 'fault-ticket-tracking'
        );

        component.closeView?.();
        navigateSupervisorSection(requestedSection);
    });
}

function bindSupervisorBreakdownDetailView() {
    const component = document.querySelector('#breakdown-details ac-breakdown-detail-view');
    if (!component || component.dataset.bound === 'true') {
        return;
    }

    component.dataset.bound = 'true';

    component.addEventListener('ac-breakdown-detail-view:toast', (event) => {
        const message = event.detail?.message;
        const type = event.detail?.type || 'info';
        if (!message) {
            return;
        }

        showToast(message, type);
    });

    component.addEventListener('ac-breakdown-detail-view:back', (event) => {
        const requestedSection = String(
            event.detail?.returnSection
            || supervisorBreakdownDetailsReturnSection
            || 'fault-ticket-tracking'
        ).trim();

        component.closeView?.();
        navigateSupervisorSection(requestedSection);
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

// ==================== FAULT TICKETS ====================

let currentTicketStatusFilter = 'all';
let currentTicketSourceFilter = 'all';
let allTickets = []; // Store all tickets for filtering
let allBreakdownItems = []; // Store breakdown reports for unassigned list

function isRouteGarageWorkflowAssigned(status) {
    const normalized = String(status || '').toLowerCase();
    return ['garage_approved', 'garage_entry_logged', 'repair_in_progress', 'completed'].includes(normalized);
}

function isTicketCoveredByGarageWorkflow(ticket) {
    if (!ticket || String(ticket.breakdown_type || '').toLowerCase() !== 'route_breakdown') {
        return false;
    }

    return isRouteGarageWorkflowAssigned(ticket.route_garage_workflow_status);
}

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

        const routeWorkflowByReportId = new Map();

        // Process route breakdown reports
        if (routeResponse && routeResponse.status === 'success' && routeResponse.data && routeResponse.data.breakdowns) {
            routeResponse.data.breakdowns.forEach(breakdown => {
                const reportKey = String(breakdown.route_breakdown_id || '').trim();
                if (reportKey) {
                    routeWorkflowByReportId.set(reportKey, {
                        route_garage_workflow_status: breakdown?.garage_workflow?.status || breakdown.garage_workflow_status || null,
                        route_approved_garage_name: breakdown?.garage_workflow?.approved_garage?.name || breakdown.approved_garage_name || null,
                        route_breakdown_numeric_id: breakdown.id,
                        dangerous_cargo_present: Number(breakdown.dangerous_cargo_present || 0) === 1 ? 1 : 0,
                        dangerous_cargo_summary: breakdown.dangerous_cargo_summary || null,
                        dangerous_cargo_trip_id: breakdown.dangerous_cargo_trip_id || null,
                    });
                }

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
                    source: 'driver',
                    fault_ticket_id: breakdown.fault_ticket_id ? Number(breakdown.fault_ticket_id) : null,
                    garage_workflow_status: breakdown?.garage_workflow?.status || breakdown.garage_workflow_status || null,
                    approved_garage_name: breakdown?.garage_workflow?.approved_garage?.name || breakdown.approved_garage_name || null,
                    dangerous_cargo_present: Number(breakdown.dangerous_cargo_present || 0) === 1 ? 1 : 0,
                    dangerous_cargo_summary: breakdown.dangerous_cargo_summary || null,
                    dangerous_cargo_trip_id: breakdown.dangerous_cargo_trip_id || null,
                });
            });
            console.log('Loaded route breakdowns:', routeResponse.data.breakdowns.length);
        }

        if (routeWorkflowByReportId.size > 0 && Array.isArray(allTickets)) {
            allTickets = allTickets.map((ticket) => {
                if (String(ticket.breakdown_type || '').toLowerCase() !== 'route_breakdown') {
                    return ticket;
                }

                const workflowMeta = routeWorkflowByReportId.get(String(ticket.breakdown_report_id || '').trim());
                if (!workflowMeta) {
                    return ticket;
                }

                return {
                    ...ticket,
                    route_garage_workflow_status: workflowMeta.route_garage_workflow_status,
                    route_approved_garage_name: workflowMeta.route_approved_garage_name,
                    route_breakdown_numeric_id: workflowMeta.route_breakdown_numeric_id,
                    dangerous_cargo_present: workflowMeta.dangerous_cargo_present,
                    dangerous_cargo_summary: workflowMeta.dangerous_cargo_summary,
                    dangerous_cargo_trip_id: workflowMeta.dangerous_cargo_trip_id,
                    is_dangerous_cargo: workflowMeta.dangerous_cargo_present === 1,
                };
            });
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
    const component = document.querySelector('supervisor-fault-tickets');
    if (!component || typeof component.renderFilteredTickets !== 'function') {
        return;
    }

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
    const unassignedTickets = filteredTickets.filter((ticket) => {
        const hasAssignments = ticket.assignments && ticket.assignments.length > 0;
        return !hasAssignments && !isTicketCoveredByGarageWorkflow(ticket);
    });

    const assignedTickets = filteredTickets.filter((ticket) => {
        const hasAssignments = ticket.assignments && ticket.assignments.length > 0;
        const coveredByGarage = isTicketCoveredByGarageWorkflow(ticket);
        return (hasAssignments || coveredByGarage) && ticket.status !== 'Resolved' && ticket.status !== 'Closed';
    });

    const resolvedTickets = filteredTickets.filter(t => t.assignments && t.assignments.length > 0 && (t.status === 'Resolved' || t.status === 'Closed'));

    // Filter breakdown reports based on source filter
    let filteredBreakdowns = allBreakdownItems.filter(b => {
        // Only show in unassigned filter or all filter
        if (currentTicketStatusFilter !== 'all' && currentTicketStatusFilter !== 'unassigned') return false;

        // Source filter - breakdowns are always from drivers
        if (currentTicketSourceFilter !== 'all' && currentTicketSourceFilter !== 'driver') return false;

        return true;
    });

    component.renderFilteredTickets({
        unassignedBreakdowns: filteredBreakdowns,
        unassignedTickets,
        assignedTickets,
        resolvedTickets
    });
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
    const modal = document.querySelector('supervisor-create-ticket-modal');
    if (!modal || typeof modal.open !== 'function') {
        showToast('Create ticket modal is not available', 'error');
        return;
    }

    await modal.open();
}

function closeCreateTicketModal() {
    const modal = document.querySelector('supervisor-create-ticket-modal');
    modal?.close?.();
}

function assignTicket(ticketId) {
    const modal = document.querySelector('supervisor-assign-ticket-modal');
    if (!modal || typeof modal.open !== 'function') {
        showToast('Assign ticket modal is not available', 'error');
        return;
    }

    modal.open(ticketId, { isEdit: false });
}

function editTicketAssignment(ticketId) {
    const modal = document.querySelector('supervisor-assign-ticket-modal');
    if (!modal || typeof modal.open !== 'function') {
        showToast('Assign ticket modal is not available', 'error');
        return;
    }

    modal.open(ticketId, { isEdit: true });
}

function closeAssignTicketModal() {
    const modal = document.querySelector('supervisor-assign-ticket-modal');
    modal?.close?.();
}

function viewTicketDetails(ticketId) {
    const numericTicketId = Number(ticketId);
    if (!Number.isFinite(numericTicketId) || numericTicketId <= 0) {
        showToast('Invalid ticket ID', 'error');
        return;
    }

    const ticketDetailView = document.querySelector('#ticket-details supervisor-ticket-detail-view');
    if (!ticketDetailView || typeof ticketDetailView.open !== 'function') {
        showToast('Ticket details component is unavailable', 'error');
        return;
    }

    const activeSection = document.querySelector('.content-section.active')?.id || '';
    const urlSection = new URLSearchParams(window.location.search).get('section') || '';
    const requestedReturnSection = normalizeSupervisorSection(activeSection || urlSection || 'fault-ticket-tracking');

    if (requestedReturnSection !== 'ticket-details') {
        supervisorTicketDetailsReturnSection = requestedReturnSection;
    }

    navigateSupervisorSection('ticket-details');
    scrollSupervisorViewportToTop();

    ticketDetailView.open(numericTicketId, {
        returnSection: supervisorTicketDetailsReturnSection,
    });
}

function closeViewTicketModal() {
    const modal = document.querySelector('supervisor-view-ticket-modal');
    modal?.close?.();
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

// ==================== BREAKDOWN REPORT DETAILS ====================

async function viewBreakdownDetails(type, id) {
    const normalizedType = normalizeBreakdownType(type);
    const numericId = Number(id);

    if (!normalizedType || !Number.isFinite(numericId) || numericId <= 0) {
        showToast('Invalid breakdown report selection', 'error');
        return;
    }

    const detailView = document.querySelector('#breakdown-details ac-breakdown-detail-view');
    if (!detailView || typeof detailView.open !== 'function') {
        showToast('Breakdown details component is unavailable', 'error');
        return;
    }

    const activeSection = document.querySelector('.content-section.active')?.id || '';
    const urlSection = new URLSearchParams(window.location.search).get('section') || '';
    const requestedReturnSection = normalizeSupervisorSection(activeSection || urlSection || 'fault-ticket-tracking');

    if (requestedReturnSection !== 'breakdown-details') {
        supervisorBreakdownDetailsReturnSection = requestedReturnSection;
    }

    await detailView.open(normalizedType, numericId, {
        returnSection: supervisorBreakdownDetailsReturnSection,
    });

    navigateSupervisorSection('breakdown-details');
    requestAnimationFrame(() => {
        scrollSupervisorViewportToTop();
    });
}

function normalizeBreakdownType(type) {
    const normalizedType = String(type || '').trim().toLowerCase();

    if (normalizedType === 'route_breakdown' || normalizedType === 'route') {
        return 'route_breakdown';
    }

    if (normalizedType === 'machine_breakdown' || normalizedType === 'machine') {
        return 'machine_breakdown';
    }

    if (normalizedType === 'vehicle_breakdown' || normalizedType === 'breakdown_report' || normalizedType === 'vehicle') {
        return 'vehicle_breakdown';
    }

    return '';
}

function findFaultTicketForBreakdown(report) {
    if (!report) return null;

    const normalizedReportType = normalizeBreakdownType(report.type || report.breakdown_type || report.source);
    const directTicketId = Number(report.fault_ticket_id || report.faultTicketId || 0);

    if (Number.isFinite(directTicketId) && directTicketId > 0) {
        return allTickets.find((ticket) => Number(ticket?.id || 0) === directTicketId) || null;
    }

    const breakdownId = String(report.breakdown_id || report.route_breakdown_id || '').trim();
    const reportNumericId = Number(report.id || 0);

    return allTickets.find((ticket) => {
        if (!ticket) {
            return false;
        }

        const normalizedTicketType = normalizeBreakdownType(ticket.breakdown_type);
        if (normalizedReportType && normalizedTicketType && normalizedTicketType !== normalizedReportType) {
            return false;
        }

        if (breakdownId && String(ticket.breakdown_report_id || '').trim() === breakdownId) {
            return true;
        }

        if (reportNumericId > 0 && String(ticket.breakdown_report_id || '').trim() === String(reportNumericId)) {
            return true;
        }

        return false;
    }) || null;
}

function buildBreakdownReportFromTrackingItem(breakdown) {
    if (!breakdown) {
        return null;
    }

    const raw = breakdown.raw || {};
    const normalizedType = breakdown.source === 'route' ? 'route_breakdown' : 'machine_breakdown';

    if (normalizedType === 'route_breakdown') {
        return {
            id: Number(raw.id || breakdown.id || 0),
            breakdown_id: raw.route_breakdown_id || breakdown.breakdownId || '',
            type: 'route_breakdown',
            vehicle_id: raw.vehicle_id || null,
            description: raw.description || breakdown.description || 'Route breakdown reported',
            severity: raw.severity || breakdown.severity || 'Medium',
            status: raw.status || breakdown.effectiveStatus || 'Pending',
            driver_name: raw.driver_name || breakdown.reportedBy || 'Unknown Driver',
            number_plate: raw.number_plate || breakdown.identifier || 'N/A',
            breakdown_date: raw.breakdown_datetime || raw.breakdown_date || breakdown.date,
            breakdown_type: raw.breakdown_type || breakdown.type || 'Route Breakdown',
            breakdown_location: raw.breakdown_location || '',
            created_at: raw.breakdown_datetime || raw.created_at || breakdown.date,
            source: 'driver',
            fault_ticket_id: Number(raw.fault_ticket_id || breakdown.faultTicketId || 0) || null,
            garage_workflow_status: raw?.garage_workflow?.status || raw.garage_workflow_status || breakdown.garageWorkflowStatus || null,
            approved_garage_name: raw?.garage_workflow?.approved_garage?.name || raw.approved_garage_name || breakdown.approvedGarageName || null,
            dangerous_cargo_present: Number(raw.dangerous_cargo_present || 0) === 1 ? 1 : 0,
            dangerous_cargo_summary: raw.dangerous_cargo_summary || null,
            dangerous_cargo_trip_id: raw.dangerous_cargo_trip_id || null
        };
    }

    return {
        id: Number(raw.id || breakdown.id || 0),
        breakdown_id: raw.breakdown_id || breakdown.breakdownId || '',
        type: 'machine_breakdown',
        machine_id: raw.machine_id || null,
        machine_model: raw.machine_model || raw.machine_name || breakdown.identifier || 'Unknown Machine',
        operator_name: raw.operator_name || breakdown.reportedBy || 'Unknown Operator',
        description: raw.description || breakdown.description || 'Machine breakdown reported',
        severity: raw.severity || breakdown.severity || 'Medium',
        status: raw.status || breakdown.effectiveStatus || 'Pending',
        breakdown_type: raw.breakdown_type || breakdown.type || 'Machine Fault',
        breakdown_date: raw.breakdown_date || raw.created_at || breakdown.date,
        created_at: raw.created_at || breakdown.date,
        source: 'machinery_operator',
        fault_ticket_id: Number(raw.fault_ticket_id || breakdown.faultTicketId || 0) || null
    };
}

async function createFaultTicketFromBreakdownReport(type, report) {
    const isRoute = type === 'route_breakdown';
    const isMachine = type === 'machine_breakdown';
    const typeLabel = isMachine ? 'Machine Breakdown' : (isRoute ? 'Route Breakdown' : 'Vehicle Breakdown');

    let description;
    if (isMachine) {
        description = `[${typeLabel}] Machine: ${report.machine_model || 'N/A'} | Operator: ${report.operator_name || 'N/A'}\nSeverity: ${report.severity} | Type: ${report.breakdown_type}\nDescription: ${report.description}`;
    } else {
        description = `[${typeLabel}] Vehicle: ${report.number_plate} | Driver: ${report.driver_name}\nSeverity: ${report.severity} | Type: ${report.breakdown_type}\n${report.breakdown_location ? 'Location: ' + report.breakdown_location + '\n' : ''}Description: ${report.description}`;
    }

    const severityMap = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
    const priority = severityMap[(report.severity || 'medium').toLowerCase()] || 'Medium';

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
        return Number(response.data.id);
    }

    const errorMsg = response.errors ? Object.values(response.errors).join(', ') : (response.message || 'Failed to create ticket');
    throw new Error(errorMsg);
}

async function viewOrCreateBreakdownTicket(type, id, trackingBreakdown = null) {
    const normalizedType = normalizeBreakdownType(type);
    const numericId = Number(id);

    if (!normalizedType || !Number.isFinite(numericId) || numericId <= 0) {
        showToast('Invalid breakdown report selection', 'error');
        return;
    }

    let report = allBreakdownItems.find((item) => normalizeBreakdownType(item.type) === normalizedType && Number(item.id) === numericId);

    if (!report && trackingBreakdown) {
        report = buildBreakdownReportFromTrackingItem(trackingBreakdown);
    }

    if (!report && normalizedType === 'machine_breakdown') {
        const fallbackTicket = allTickets.find((ticket) => {
            if (!ticket || !ticket.is_machine_breakdown) {
                return false;
            }

            if (Number(ticket.id) === numericId) {
                return true;
            }

            const breakdownCode = String(ticket.breakdown_report_id || ticket.ticket_id || '').trim();
            return breakdownCode !== '' && breakdownCode === String(id).trim();
        });

        if (fallbackTicket) {
            report = {
                id: Number(fallbackTicket.id),
                breakdown_id: fallbackTicket.breakdown_report_id || fallbackTicket.ticket_id || `MBD-${String(fallbackTicket.id).padStart(3, '0')}`,
                type: 'machine_breakdown',
                machine_id: fallbackTicket.machine_id,
                machine_model: fallbackTicket.machine_name || fallbackTicket.machine_model_number,
                operator_name: fallbackTicket.reporter_full_name || fallbackTicket.reported_by_name,
                description: fallbackTicket.description,
                severity: fallbackTicket.priority,
                status: fallbackTicket.status,
                breakdown_type: fallbackTicket.original_report ? fallbackTicket.original_report.breakdown_type : 'Machine Fault',
                breakdown_date: fallbackTicket.created_at,
                fault_ticket_id: Number(fallbackTicket.id)
            };
        }
    }

    if (!report) {
        showToast('Breakdown report not found', 'error');
        return;
    }

    const linkedTicket = findFaultTicketForBreakdown(report);
    const linkedTicketId = Number(report.fault_ticket_id || linkedTicket?.id || 0);

    if (Number.isFinite(linkedTicketId) && linkedTicketId > 0) {
        viewTicketDetails(linkedTicketId);
        return;
    }

    try {
        showToast('Creating fault ticket from breakdown report...', 'info');
        const newTicketId = await createFaultTicketFromBreakdownReport(normalizedType, report);

        if (!Number.isFinite(newTicketId) || newTicketId <= 0) {
            showToast('Failed to open ticket details', 'error');
            return;
        }

        await loadFaultTickets();
        viewTicketDetails(newTicketId);
        showToast('Fault ticket created successfully', 'success');
    } catch (error) {
        console.error('Error creating fault ticket from breakdown view flow:', error);
        showToast(error.message || 'Failed to create ticket from breakdown', 'error');
    }
}

async function viewRouteBreakdownTicket(type, id) {
    await viewBreakdownDetails(type, id);
}

// View machine breakdown details from allTickets
function viewMachineBreakdownInSupervisor(breakdownId) {
    viewBreakdownDetails('machine_breakdown', breakdownId);
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

    const linkedTicket = findFaultTicketForBreakdown(report);
    const linkedTicketId = Number(report.fault_ticket_id || linkedTicket?.id || 0);

    if (Number.isFinite(linkedTicketId) && linkedTicketId > 0) {
        assignTicket(linkedTicketId);
        return;
    }

    if (type === 'route_breakdown' && isRouteGarageWorkflowAssigned(report.garage_workflow_status)) {
        showToast('A nearby garage is already approved for this route breakdown. Technician assignment is not required.', 'warning');
        return;
    }

    try {
        showToast('Creating fault ticket from breakdown report...', 'info');
        const newTicketId = await createFaultTicketFromBreakdownReport(type, report);

        if (Number.isFinite(newTicketId) && newTicketId > 0) {
            showToast('Fault ticket created! Now assign a technician.', 'success');

            // Reload tickets so the new ticket appears in the system
            await loadFaultTickets();

            // Open the assign modal for the newly created ticket
            assignTicket(newTicketId);
        } else {
            showToast('Failed to create ticket', 'error');
        }
    } catch (error) {
        console.error('Error creating ticket from breakdown:', error);
        showToast(error.message || 'Failed to create ticket from breakdown', 'error');
    }
}

async function createTicketFromBreakdown(type, id) {
    // Find the breakdown report from allBreakdownItems
    let report = allBreakdownItems.find(b => b.type === type && b.id === id);

    if (!report && type === 'machine_breakdown') {
        const machineTicket = allTickets.find(t => t.is_machine_breakdown && t.id === id);
        if (machineTicket) {
            report = {
                ...machineTicket,
                breakdown_id: machineTicket.breakdown_report_id || machineTicket.ticket_id || machineTicket.id,
                report_id: machineTicket.breakdown_report_id || machineTicket.ticket_id || machineTicket.id
            };
        }
    }

    if (!report) {
        showToast('Breakdown report not found', 'error');
        return;
    }

    const modal = document.querySelector('supervisor-create-ticket-modal');
    if (!modal || typeof modal.openFromBreakdown !== 'function') {
        showToast('Create ticket modal is not available', 'error');
        return;
    }

    await modal.openFromBreakdown(report);
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
                <button class="btn-close" type="button" data-details-close>
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body details-modal-content">
                ${content}
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" type="button" data-details-close><i class="fas fa-times"></i> Close</button>
            </div>
        </div>
    `;

    // Close on explicit close actions and backdrop click
    modal.addEventListener('click', (e) => {
        const viewTicketButton = e.target.closest('[data-view-ticket-id]');
        if (viewTicketButton) {
            const ticketId = Number(viewTicketButton.dataset.viewTicketId);
            closeDetailsModal();
            if (Number.isFinite(ticketId)) {
                viewTicketDetails(ticketId);
            }
            return;
        }

        if (e.target.closest('[data-details-close]') || e.target === modal) {
            closeDetailsModal();
        }
    });

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

    menuBtn.addEventListener('click', () => {
        const sidebar = document.querySelector('.sidebar');
        sidebar.classList.toggle('open');
    });

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

// ==================== ASSET STATUS FUNCTIONS ====================

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
                ? `<button class="btn btn-secondary btn-small" type="button" data-view-ticket-id="${Number(ticket.id)}"><i class="fas fa-eye"></i> View Ticket</button>`
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
    navigateTo('fault-ticket-tracking');
    showToast('Select a fault ticket and use Assign to choose technician(s)', 'info');
}

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

