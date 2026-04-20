'use strict';

(() => {

let ticketData = null;
let machineDetails = null;
let currentUser = null;
let budgetReport = null;
let sparePartRequests = [];
let workUpdates = [];
let currentRoleContext = null;
let routeBreakdownContext = null;
let availableRouteGarages = [];
let routeLocationMap = null;
let routeGarageMap = null;
let routeGarageMapGarageMarkers = [];
let routeGarageMapLeafletPromise = null;
let cachedSparePartOptionsHtml = '';

const STATUS_INSURANCE_CLAIMED = 'insurance claimed';

const STATUS_ORDER = [
    'open',
    'assigned',
    'waiting for budget approval',
    'waiting for spare parts',
    'parts approved',
    'in progress',
    'resolved',
    'closed'
];

const PRE_WORK_STATUSES = [
    'open',
    'assigned',
    'waiting for budget approval',
    'waiting for spare parts',
    'parts approved'
];

const SUPERVISOR_NAV_ITEMS = [
    { section: 'dashboard', icon: 'fas fa-chart-line', label: 'Dashboard' },
    { section: 'daily-check-reports', icon: 'fas fa-clipboard-check', label: 'Weekly Check Reports' },
    { section: 'fault-ticket-tracking', icon: 'fas fa-ticket-alt', label: 'Fault Tickets' },
    { section: 'fault-tickets', icon: 'fas fa-user-cog', label: 'Technician Assignment' },
    { section: 'repair-management', icon: 'fas fa-tools', label: 'Repair Management' },
    { section: 'budget-approval', icon: 'fas fa-dollar-sign', label: 'Budget Approval' },
    { section: 'asset-status', icon: 'fas fa-truck', label: 'Asset Status' },
    { section: 'technicians', icon: 'fas fa-user-cog', label: 'Technicians' }
];

function getViewTicketContext() {
    const context = window.__ACViewTicketContext;
    if (context && typeof context === 'object') {
        return context;
    }

    return {};
}

function isDashboardComponentMode() {
    return getViewTicketContext().dashboardComponentMode === true;
}

function getTicketId() {
    const contextTicketId = getViewTicketContext().ticketId;
    if (contextTicketId !== undefined && contextTicketId !== null && String(contextTicketId).trim() !== '') {
        return String(contextTicketId).trim();
    }

    return new URLSearchParams(window.location.search).get('id');
}

function toRoleKey(roleName) {
    return String(roleName || '').trim().toUpperCase().replace(/\s+/g, '_');
}

function getRoleOverrideKey() {
    const contextRoleOverride = getViewTicketContext().roleOverride;
    if (contextRoleOverride !== undefined && contextRoleOverride !== null && String(contextRoleOverride).trim() !== '') {
        return toRoleKey(contextRoleOverride);
    }

    const overrideParam = new URLSearchParams(window.location.search).get('role_override');
    return toRoleKey(overrideParam);
}

function isEmbeddedMode() {
    const contextEmbedded = getViewTicketContext().embedded;
    if (typeof contextEmbedded === 'boolean') {
        return contextEmbedded;
    }

    return new URLSearchParams(window.location.search).get('embedded') === '1';
}

function normaliseStatus(status) {
    return String(status || '').toLowerCase().trim();
}

function statusIndex(status) {
    const normalizedStatus = normaliseStatus(status);
    if (normalizedStatus === STATUS_INSURANCE_CLAIMED) {
        return STATUS_ORDER.indexOf('assigned');
    }

    const idx = STATUS_ORDER.indexOf(normalizedStatus);
    return idx === -1 ? 0 : idx;
}

function statusAtOrPast(ticketStatus, targetStatus) {
    return statusIndex(ticketStatus) >= statusIndex(targetStatus);
}

function isPreWork(status) {
    return PRE_WORK_STATUSES.includes(normaliseStatus(status));
}

function isTechnicalOfficer() {
    const roleKey = currentRoleContext?.roleKey || getRoleOverrideKey() || toRoleKey(currentUser?.role);
    return roleKey === 'TECHNICAL_OFFICER';
}

function isSupervisorLike() {
    const roleKey = currentRoleContext?.roleKey || getRoleOverrideKey() || toRoleKey(currentUser?.role);
    return roleKey === 'SUPERVISOR' || roleKey === 'ADMIN';
}

function isAssignedTechnicalOfficer() {
    if (!isTechnicalOfficer()) {
        return false;
    }

    const currentUserId = Number(currentUser?.id || 0);
    if (!Number.isFinite(currentUserId) || currentUserId <= 0) {
        return false;
    }

    const assignments = Array.isArray(ticketData?.assignments) ? ticketData.assignments : [];
    return assignments.some((assignment) => Number(assignment?.assigned_to || assignment?.technician_id || 0) === currentUserId);
}

function canViewInsuranceClaimContext() {
    return isSupervisorLike() || isAssignedTechnicalOfficer();
}
  
function isMachinaryOperator() {
    const roleKey = currentRoleContext?.roleKey || getRoleOverrideKey() || toRoleKey(currentUser?.role);
    return roleKey === 'MACHINARY_OPERATOR';
}

function isDriver() {
    const roleKey = currentRoleContext?.roleKey || getRoleOverrideKey() || toRoleKey(currentUser?.role);
    return roleKey === 'DRIVER';
}

function isRouteBreakdownTicket() {
    return normaliseStatus(ticketData?.breakdown_type) === 'route_breakdown';
}

function getRouteGarageWorkflowStatus() {
    return normaliseStatus(
        routeBreakdownContext?.garage_workflow_status
        || routeBreakdownContext?.garage_workflow?.status
        || ticketData?.route_garage_workflow_status
    );
}

function isDriverGarageRepairStage(status = getRouteGarageWorkflowStatus()) {
    return status === 'garage_entry_logged' || status === 'repair_in_progress';
}

function hasRouteGarageAssignment() {
    const status = getRouteGarageWorkflowStatus();
    return ['garage_approved', 'garage_entry_logged', 'repair_in_progress', 'completed'].includes(status);
}

function isInsuranceClaimed(status = ticketData?.status) {
    return normaliseStatus(status) === STATUS_INSURANCE_CLAIMED;
}

function getInsuranceClaimContext() {
    const context = ticketData?.insurance_claim;
    if (!context || typeof context !== 'object') {
        return null;
    }

    return {
        assetLabel: String(context.asset_label || '').trim(),
        insuranceProvider: String(context.insurance_provider || '').trim(),
        insuranceType: String(context.insurance_type || '').trim(),
        warrantyProvider: String(context.warranty_provider || '').trim(),
        warrantyExpiry: String(context.warranty_expiry || '').trim(),
        nextRenewalDate: String(context.next_insurance_renew_date || '').trim(),
        eligibilityReason: String(context.eligibility_reason || '').trim(),
        eligible: context.eligible === true || String(context.eligible || '').toLowerCase() === 'true' || Number(context.eligible || 0) === 1,
    };
}

function getDangerousCargoContext() {
    const dangerousPresent = Number(routeBreakdownContext?.dangerous_cargo_present || 0) === 1
        || ticketData?.is_dangerous_cargo === true
        || Number(ticketData?.is_dangerous_cargo || 0) === 1
        || Number(ticketData?.dangerous_cargo_present || 0) === 1;

    return {
        present: dangerousPresent,
        summary: String(routeBreakdownContext?.dangerous_cargo_summary || ticketData?.dangerous_cargo_summary || '').trim(),
        tripId: String(routeBreakdownContext?.dangerous_cargo_trip_id || ticketData?.dangerous_cargo_trip_id || '').trim(),
    };
}

function getApprovedRouteGarageName() {
    return routeBreakdownContext?.approved_garage_name
        || routeBreakdownContext?.garage_workflow?.approved_garage?.name
        || ticketData?.route_approved_garage_name
        || null;
}

function formatLkrAmount(amountValue) {
    const amount = Number(amountValue);
    if (!Number.isFinite(amount) || amount <= 0) {
        return 'N/A';
    }

    if (window.FaultTicketDetailTemplate?.formatLkrCurrency) {
        return window.FaultTicketDetailTemplate.formatLkrCurrency(amount);
    }

    return `LKR ${amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function resolveSameOriginAssetUrl(pathValue) {
    const rawPath = String(pathValue || '').trim();
    if (!rawPath) {
        return null;
    }

    const hasScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(rawPath);
    const candidatePath = hasScheme
        ? rawPath
        : (rawPath.startsWith('/') ? rawPath : `/${rawPath}`);

    try {
        const resolved = new URL(candidatePath, window.location.origin);
        if (resolved.origin !== window.location.origin) {
            return null;
        }

        return resolved.toString();
    } catch (_error) {
        return null;
    }
}

function getRouteGarageCompletionDetails() {
    if (!isRouteBreakdownTicket()) {
        return null;
    }

    const workflow = routeBreakdownContext?.garage_workflow || null;
    const workflowStatus = normaliseStatus(
        workflow?.status
        || routeBreakdownContext?.garage_workflow_status
        || ticketData?.route_garage_workflow_status
    );

    const billAmountRaw = workflow?.bill_amount ?? routeBreakdownContext?.bill_amount ?? null;
    const completionRemarks = String(
        workflow?.completion_remarks
        || routeBreakdownContext?.completion_remarks
        || ''
    ).trim();
    const billImagePath = String(
        workflow?.bill_image_path
        || routeBreakdownContext?.bill_image_path
        || ''
    ).trim();

    const hasBillData = (Number.isFinite(Number(billAmountRaw)) && Number(billAmountRaw) > 0)
        || completionRemarks !== ''
        || billImagePath !== '';

    if (workflowStatus !== 'completed' && !hasBillData) {
        return null;
    }

    return {
        billAmount: Number.isFinite(Number(billAmountRaw)) ? Number(billAmountRaw) : null,
        completionRemarks,
        billImagePath,
        billImageUrl: resolveSameOriginAssetUrl(billImagePath),
        completedAt: workflow?.completed_at || routeBreakdownContext?.completed_at || null,
        completedBy: String(workflow?.completed_by || routeBreakdownContext?.completed_by_name || '').trim(),
    };
}

function getRouteBreakdownNumericId() {
    const candidates = [
        routeBreakdownContext?.id,
        routeBreakdownContext?.route_breakdown_id_numeric,
        ticketData?.route_breakdown_numeric_id,
        ticketData?.breakdown_context?.route_breakdown_numeric_id,
    ];

    for (const candidate of candidates) {
        const parsed = Number(candidate || 0);
        if (Number.isFinite(parsed) && parsed > 0) {
            return parsed;
        }
    }

    return 0;
}

function parseLegacyRouteBreakdownDescription(description) {
    const rawDescription = String(description || '').trim();
    if (!rawDescription) {
        return {
            issueDescription: '',
            locationText: '',
        };
    }

    const normalized = rawDescription.replace(/\r\n/g, '\n');
    const seemsLegacy = /^\[route breakdown\]/i.test(normalized)
        || (/vehicle\s*:/i.test(normalized) && /driver\s*:/i.test(normalized) && /description\s*:/i.test(normalized));

    if (!seemsLegacy) {
        return {
            issueDescription: rawDescription,
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

    return {
        issueDescription: readField('Description') || readField('Details') || rawDescription,
        locationText: readField('Location', ['Description', 'Details']),
    };
}

function getRouteTicketIssueDescription() {
    const descriptionCandidates = [
        routeBreakdownContext?.description,
        ticketData?.breakdown_context?.description,
        ticketData?.description,
    ];

    for (const candidate of descriptionCandidates) {
        const parsed = parseLegacyRouteBreakdownDescription(candidate);
        if (parsed.issueDescription) {
            return parsed.issueDescription;
        }
    }

    return '';
}

async function loadRouteBreakdownContext() {
    routeBreakdownContext = null;

    if (!isRouteBreakdownTicket()) {
        return;
    }

    try {
        const response = await API.get('/route-breakdowns');
        const list = Array.isArray(response?.data?.breakdowns)
            ? response.data.breakdowns
            : (Array.isArray(response?.data) ? response.data : []);

        if (list.length) {
            const ticketId = Number(ticketData?.id || 0);
            const reportId = String(ticketData?.breakdown_report_id || '').trim().toLowerCase();

            routeBreakdownContext = list.find((item) => Number(item?.fault_ticket_id || 0) === ticketId)
                || list.find((item) => String(item?.route_breakdown_id || '').trim().toLowerCase() === reportId)
                || null;
        }

        if (!routeBreakdownContext) {
            const fallbackBreakdownContext = ticketData?.breakdown_context && typeof ticketData.breakdown_context === 'object'
                ? ticketData.breakdown_context
                : null;
            const fallbackRouteBreakdownId = Number(
                ticketData?.route_breakdown_numeric_id
                || fallbackBreakdownContext?.route_breakdown_numeric_id
                || 0
            );

            if (fallbackBreakdownContext || (Number.isFinite(fallbackRouteBreakdownId) && fallbackRouteBreakdownId > 0)) {
                routeBreakdownContext = {
                    ...(fallbackBreakdownContext || {}),
                    id: Number.isFinite(fallbackRouteBreakdownId) && fallbackRouteBreakdownId > 0
                        ? fallbackRouteBreakdownId
                        : undefined,
                    route_breakdown_id: fallbackBreakdownContext?.route_breakdown_id || ticketData?.breakdown_report_id || '',
                    description: fallbackBreakdownContext?.description || ticketData?.description || '',
                    breakdown_location: fallbackBreakdownContext?.location
                        || ticketData?.breakdown_location
                        || ticketData?.location
                        || '',
                    number_plate: fallbackBreakdownContext?.number_plate || ticketData?.number_plate || '',
                    driver_name: fallbackBreakdownContext?.reporter_name
                        || ticketData?.reported_by_name
                        || ticketData?.reporter_full_name
                        || '',
                };
            }
        }
    } catch (error) {
        console.warn('Unable to load route breakdown context for ticket detail page:', error);

        const fallbackBreakdownContext = ticketData?.breakdown_context && typeof ticketData.breakdown_context === 'object'
            ? ticketData.breakdown_context
            : null;
        const fallbackRouteBreakdownId = Number(
            ticketData?.route_breakdown_numeric_id
            || fallbackBreakdownContext?.route_breakdown_numeric_id
            || 0
        );

        if (fallbackBreakdownContext || (Number.isFinite(fallbackRouteBreakdownId) && fallbackRouteBreakdownId > 0)) {
            routeBreakdownContext = {
                ...(fallbackBreakdownContext || {}),
                id: Number.isFinite(fallbackRouteBreakdownId) && fallbackRouteBreakdownId > 0
                    ? fallbackRouteBreakdownId
                    : undefined,
                route_breakdown_id: fallbackBreakdownContext?.route_breakdown_id || ticketData?.breakdown_report_id || '',
                description: fallbackBreakdownContext?.description || ticketData?.description || '',
                breakdown_location: fallbackBreakdownContext?.location
                    || ticketData?.breakdown_location
                    || ticketData?.location
                    || '',
                number_plate: fallbackBreakdownContext?.number_plate || ticketData?.number_plate || '',
                driver_name: fallbackBreakdownContext?.reporter_name
                    || ticketData?.reported_by_name
                    || ticketData?.reporter_full_name
                    || '',
            };
        }
    }
}

function fmtDate(value) {
    if (window.FaultTicketDetailTemplate?.formatDateTime) {
        return window.FaultTicketDetailTemplate.formatDateTime(value);
    }

    if (!value) return 'N/A';

    return new Date(value).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}

function fmtDateShort(value) {
    if (window.FaultTicketDetailTemplate?.formatDateShort) {
        return window.FaultTicketDetailTemplate.formatDateShort(value);
    }

    if (!value) return 'N/A';

    return new Date(value).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
}

function showToast(message, type = 'success') {
    const context = getViewTicketContext();
    if (typeof context.onToast === 'function') {
        try {
            const handled = context.onToast({ message, type });
            if (handled !== false) {
                return;
            }
        } catch (error) {
            console.error('Failed to delegate toast to host context:', error);
        }
    }

    const msg = document.querySelector('#toastMessage');
    const toast = (msg && msg.closest('.toast')) || document.getElementById('toast');
    if (!toast) return;

    toast.classList.remove('toast-success', 'toast-warning', 'toast-error', 'show');
    if (type === 'warning') toast.classList.add('toast-warning');
    else if (type === 'error' || type === 'danger') toast.classList.add('toast-error');
    else toast.classList.add('toast-success');

    if (msg) {
        msg.textContent = message;
    } else {
        toast.textContent = message;
    }

    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
}

function showError(message) {
    const loading = document.getElementById('loadingState');
    const content = document.getElementById('mainContent');
    const errorState = document.getElementById('errorState');
    const errorMessage = document.getElementById('errorMessage');

    if (loading) loading.style.display = 'none';
    if (content) content.style.display = 'none';
    if (errorState) errorState.style.display = 'flex';
    if (errorMessage) errorMessage.textContent = message;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getFallbackEquipmentLabel(ticket) {
    if (!ticket) {
        return 'N/A';
    }

    const breakdownType = String(ticket.breakdown_type || '').toLowerCase().trim();
    const vehicleId = Number(ticket.vehicle_id || ticket.breakdown_context?.vehicle_id || 0);
    const machineId = Number(ticket.machine_id || 0);
    const isVehicle = breakdownType === 'vehicle_breakdown'
        || breakdownType === 'route_breakdown'
        || (vehicleId > 0 && machineId <= 0);

    if (isVehicle) {
        const numberPlate = String(ticket.number_plate || ticket.breakdown_context?.number_plate || '').trim();
        const vehicleName = String(ticket.vehicle_name || '').trim();
        const vehicleModel = String(ticket.breakdown_context?.equipment_model || ticket.machine_model_number || '').trim();

        const primaryLabel = numberPlate || String(ticket.breakdown_context?.equipment_label || '').trim();
        const secondaryLabel = vehicleName || vehicleModel;

        if (primaryLabel !== '' && secondaryLabel !== '' && primaryLabel !== secondaryLabel) {
            return `${primaryLabel} (${secondaryLabel})`;
        }

        if (primaryLabel !== '') {
            return primaryLabel;
        }

        if (secondaryLabel !== '') {
            return secondaryLabel;
        }

        if (vehicleId > 0) {
            return `Vehicle #${vehicleId}`;
        }

        return 'Vehicle';
    }

    return ticket.machine_model_number || ticket.machine_name || (ticket.machine_id ? `Machine #${ticket.machine_id}` : 'N/A');
}

function getMachineReferenceId(ticket = ticketData) {
    const machineId = Number(ticket?.machine_id || ticket?.breakdown_context?.machine_id || 0);
    return Number.isFinite(machineId) && machineId > 0 ? machineId : null;
}

function isMachineFaultTicket(ticket = ticketData) {
    if (!ticket || typeof ticket !== 'object') {
        return false;
    }

    const breakdownType = normaliseStatus(ticket.breakdown_type);
    if (breakdownType === 'machine_breakdown') {
        return true;
    }

    if (breakdownType === 'vehicle_breakdown' || breakdownType === 'route_breakdown') {
        return false;
    }

    const machineId = getMachineReferenceId(ticket);
    const vehicleId = Number(ticket?.vehicle_id || ticket?.breakdown_context?.vehicle_id || 0);
    return machineId !== null && (!Number.isFinite(vehicleId) || vehicleId <= 0);
}

async function loadMachineDetailsForTicket() {
    machineDetails = null;

    if (!isMachineFaultTicket(ticketData)) {
        return;
    }

    const machineId = getMachineReferenceId(ticketData);
    if (!machineId) {
        return;
    }

    try {
        const machineResp = await API.get(`/machines/${machineId}`);
        if (machineResp?.status === 'success' && machineResp.data && typeof machineResp.data === 'object') {
            machineDetails = machineResp.data;
        }
    } catch (error) {
        console.warn('Failed to load machine details for ticket view:', error);
    }
}

function markStep(stepId, state) {
    const el = document.getElementById(stepId);
    if (!el) return;

    el.classList.remove('step-completed', 'step-active', 'step-pending', 'step-warning', 'step-danger');
    el.classList.add(`step-${state}`);
}

function getSafeReturnToPath() {
    const contextReturnTo = getViewTicketContext().returnTo;
    if (typeof contextReturnTo === 'string' && contextReturnTo.trim()) {
        try {
            const resolved = new URL(contextReturnTo, window.location.origin);
            if (resolved.origin !== window.location.origin) return null;
            return `${resolved.pathname}${resolved.search}`;
        } catch (_error) {
            return null;
        }
    }

    const raw = new URLSearchParams(window.location.search).get('return_to');
    if (!raw) return null;

    try {
        const resolved = new URL(raw, window.location.origin);
        if (resolved.origin !== window.location.origin) return null;
        return `${resolved.pathname}${resolved.search}`;
    } catch (_error) {
        return null;
    }
}

function resolveRoleContext(user) {
    const roleKey = getRoleOverrideKey() || toRoleKey(user?.role);
    const dashboardPath = CONFIG?.ROUTES?.DASHBOARD?.[roleKey]
        || CONFIG?.ROUTES?.DASHBOARD?.TECHNICAL_OFFICER
        || '/dashboard/technical-officer/index.html';

    const defaultSection = roleKey === 'SUPERVISOR' ? 'fault-tickets'
        : roleKey === 'TECHNICAL_OFFICER' ? 'tickets'
            : roleKey === 'MACHINARY_OPERATOR' ? 'fault-reporting'
            : 'dashboard';

    const title = roleKey === 'SUPERVISOR' ? 'Supervisor Dashboard'
        : roleKey === 'TECHNICAL_OFFICER' ? 'Technical Officer Dashboard'
            : roleKey === 'MACHINARY_OPERATOR' ? 'Machinery Operator Dashboard'
            : `${user?.role || 'User'} Dashboard`;

    return {
        roleKey,
        dashboardPath,
        defaultSection,
        title,
        navItems: roleKey === 'SUPERVISOR' ? SUPERVISOR_NAV_ITEMS : null
    };
}

function buildDashboardUrl(section = 'dashboard') {
    if (!currentRoleContext) return '#';

    const url = new URL(currentRoleContext.dashboardPath, window.location.origin);
    if (section) url.searchParams.set('section', section);
    return `${url.pathname}${url.search}`;
}

function applyRoleShellAndNavigation() {
    if (!currentRoleContext) return;

    const embeddedMode = isEmbeddedMode();
    const dashboardComponentMode = isDashboardComponentMode();

    if (embeddedMode && !dashboardComponentMode && document.body) {
        document.body.classList.add('ticket-detail-embedded');
    }

    if (!dashboardComponentMode) {
        const header = document.querySelector('to-shell-header');
        if (header) {
            header.setAttribute('title', currentRoleContext.title);
            const headerIcon = currentRoleContext.roleKey === 'SUPERVISOR'
                ? 'fa-user-tie'
                : currentRoleContext.roleKey === 'DRIVER'
                    ? 'fa-steering-wheel'
                    : currentRoleContext.roleKey === 'MACHINARY_OPERATOR'
                        ? 'fa-cogs'
                    : 'fa-tools';
            header.setAttribute('icon', headerIcon);
            if (embeddedMode) {
                header.style.display = 'none';
            }
        }

        const sidebar = document.querySelector('to-shell-sidebar');
        if (sidebar) {
            sidebar.setAttribute('mode', 'subpage');
            sidebar.setAttribute('active-section', currentRoleContext.defaultSection);
            sidebar.setAttribute('base-path', currentRoleContext.dashboardPath);

            if (currentRoleContext.navItems) sidebar.setAttribute('nav', JSON.stringify(currentRoleContext.navItems));
            else sidebar.removeAttribute('nav');

            if (embeddedMode) {
                sidebar.style.display = 'none';
            }
        }
    }

    const returnToPath = getSafeReturnToPath();
    const ticketsPath = returnToPath || buildDashboardUrl(currentRoleContext.defaultSection);
    const dashboardPath = buildDashboardUrl('dashboard');

    const dashboardCrumb = document.getElementById('dashboardCrumbLink');
    const ticketsCrumb = document.getElementById('ticketsCrumbLink');
    const backButton = document.getElementById('backButton');
    const errorBackButton = document.getElementById('errorBackButton');

    if (dashboardCrumb) dashboardCrumb.href = dashboardPath;

    if (ticketsCrumb) {
        ticketsCrumb.href = ticketsPath;
        ticketsCrumb.textContent = currentRoleContext.roleKey === 'SUPERVISOR'
            ? 'Technician Assignment'
            : currentRoleContext.roleKey === 'DRIVER'
                ? 'Breakdown Reports'
                : currentRoleContext.roleKey === 'MACHINARY_OPERATOR'
                    ? 'Fault Reporting'
                : 'Fault & Repair Tickets';
    }

    if (embeddedMode) {
        if (!dashboardComponentMode) {
            const detailSubheader = document.getElementById('detailSubheader');
            const embeddedErrorBackButton = document.getElementById('errorBackButton');

            if (detailSubheader) {
                detailSubheader.style.display = 'none';
            }

            if (embeddedErrorBackButton) {
                embeddedErrorBackButton.style.display = 'none';
            }

            return;
        }
    }

    const navigateBack = () => {
        const context = getViewTicketContext();
        if (dashboardComponentMode && typeof context.onBack === 'function') {
            context.onBack({
                ticketsPath,
                roleKey: currentRoleContext.roleKey,
            });
            return;
        }

        window.location.href = ticketsPath;
    };

    if (backButton) backButton.addEventListener('click', navigateBack);
    if (errorBackButton) errorBackButton.addEventListener('click', navigateBack);
}

async function loadAll() {
    const ticketId = getTicketId();
    if (!ticketId) {
        showError('No ticket ID supplied in the URL.');
        return;
    }

    try {
        const [ticketResp, budgetResp, partsResp] = await Promise.all([
            API.get(`/fault-tickets/${ticketId}`),
            API.get(`/budget-reports/ticket/${ticketId}/latest`).catch(() => null),
            API.get(`/spare-part-requests/ticket/${ticketId}`).catch(() => null)
        ]);

        if (ticketResp.status !== 'success' || !ticketResp.data) {
            showError(ticketResp.message || 'Failed to load ticket.');
            return;
        }

        ticketData = ticketResp.data;
        await loadRouteBreakdownContext();
    await loadMachineDetailsForTicket();

        const budgetPayload = (budgetResp && budgetResp.status === 'success')
            ? budgetResp.data
            : null;

        if (budgetPayload && typeof budgetPayload === 'object' && Object.prototype.hasOwnProperty.call(budgetPayload, 'report')) {
            budgetReport = (budgetPayload.report && typeof budgetPayload.report === 'object')
                ? budgetPayload.report
                : null;
        } else {
            budgetReport = (budgetPayload && typeof budgetPayload === 'object')
                ? budgetPayload
                : null;
        }

        sparePartRequests = (partsResp && partsResp.status === 'success') ? (partsResp.data || []) : [];
        workUpdates = Array.isArray(ticketData.work_updates) ? ticketData.work_updates : [];

        const workflow = ticketData.workflow || {};
        if (!budgetReport && workflow.has_budget_report) {
            budgetReport = {
                id: workflow.budget_report_id || null,
                status: workflow.budget_report_status || 'pending',
                approval_level: workflow.budget_approval_level || 'supervisor'
            };
        }

        if (sparePartRequests.length === 0 && workflow.has_spare_part_request) {
            sparePartRequests = [{
                id: workflow.spare_part_request_id || null,
                request_id: workflow.spare_part_request_id
                    ? `SPR-${String(workflow.spare_part_request_id).padStart(3, '0')}`
                    : 'SPR',
                status: workflow.spare_part_request_status || 'Pending',
                items: []
            }];
        }

        renderPage();
    } catch (error) {
        console.error('loadAll error:', error);
        showError('An error occurred while loading the ticket.');
    }
}

function renderPage() {
    const loadingState = document.getElementById('loadingState');
    const mainContent = document.getElementById('mainContent');

    if (loadingState) loadingState.style.display = 'none';
    if (mainContent) mainContent.style.display = 'flex';

    const ticketIdFormatted = window.FaultTicketDetailTemplate?.formatTicketDisplayId
        ? window.FaultTicketDetailTemplate.formatTicketDisplayId(ticketData)
        : (ticketData.breakdown_report_id || ticketData.ticket_id || `#${ticketData.id}`);

    const badge = document.getElementById('ticketIdBadge');
    if (badge) badge.textContent = ticketIdFormatted;

    renderOverview(ticketIdFormatted);
    void renderRouteLocationPanel();
    renderFlow();
    bindAssignModalFallbackHandlers();
}

function renderOverview(ticketIdFormatted) {
    const status = normaliseStatus(ticketData.status);
    const priority = String(ticketData.priority || 'Medium').toLowerCase();
    const dangerousContext = getDangerousCargoContext();
    const insuranceContext = getInsuranceClaimContext();
    const routeTicket = isRouteBreakdownTicket();
    const routeLocationLabel = routeTicket ? getRouteTicketLocationLabel() : '';
    const routeIssueDescription = routeTicket ? getRouteTicketIssueDescription() : '';

    document.getElementById('ovTicketId').textContent = ticketIdFormatted;
    document.getElementById('ovLocation').textContent = routeTicket
        ? (routeLocationLabel || 'N/A')
        : (ticketData.location || 'N/A');
    document.getElementById('ovDate').textContent = fmtDateShort(ticketData.created_at);
    document.getElementById('ovDescription').textContent = routeTicket
        ? (routeIssueDescription || ticketData.description || 'No description provided.')
        : (ticketData.description || 'No description provided.');

    document.getElementById('ovEquipment').textContent = window.FaultTicketDetailTemplate?.formatEquipmentLabel
        ? window.FaultTicketDetailTemplate.formatEquipmentLabel(ticketData)
        : getFallbackEquipmentLabel(ticketData);

    const statusClass = window.FaultTicketDetailTemplate?.toStatusClass
        ? window.FaultTicketDetailTemplate.toStatusClass(ticketData.status)
        : status.replace(/\s+/g, '-');

    const priorityClass = window.FaultTicketDetailTemplate?.toPriorityClass
        ? window.FaultTicketDetailTemplate.toPriorityClass(ticketData.priority)
        : priority;

    document.getElementById('ovStatus').innerHTML = `<span class="badge badge-${statusClass}">${ticketData.status || 'Unknown'}</span>`;
    document.getElementById('ovPriority').innerHTML = `<span class="badge badge-priority-${priorityClass}">${ticketData.priority || 'Medium'}</span>`;

    renderMachineOverviewPanel();

    const dangerousPanel = document.getElementById('ovDangerousCargoPanel');
    const dangerousBadges = document.getElementById('ovDangerousCargoBadges');
    const dangerousSummary = document.getElementById('ovDangerousCargoSummary');

    if (dangerousPanel && dangerousBadges && dangerousSummary) {
        if (dangerousContext.present) {
            dangerousPanel.style.display = 'flex';

            const tripBadge = dangerousContext.tripId
                ? `<span class="dangerous-badge secondary"><i class="fas fa-route"></i> Trip ${escapeHtml(dangerousContext.tripId)}</span>`
                : '';

            dangerousBadges.innerHTML = `
                <span class="dangerous-badge primary"><i class="fas fa-radiation"></i> Hazardous Load Reported</span>
                ${tripBadge}
            `;

            dangerousSummary.textContent = dangerousContext.summary || 'This route breakdown ticket was created while dangerous cargo was in transit.';
        } else {
            dangerousPanel.style.display = 'none';
            dangerousBadges.innerHTML = '';
            dangerousSummary.textContent = '';
        }
    }

    const insurancePanel = document.getElementById('ovInsurancePanel');
    const insuranceAssetEl = document.getElementById('ovInsuranceAsset');
    const insuranceProviderEl = document.getElementById('ovInsuranceProvider');
    const insuranceTypeEl = document.getElementById('ovInsuranceType');
    const insuranceRenewalDateEl = document.getElementById('ovInsuranceRenewalDate');
    const warrantyProviderEl = document.getElementById('ovWarrantyProvider');
    const warrantyExpiryEl = document.getElementById('ovWarrantyExpiry');
    const insuranceEligibilityEl = document.getElementById('ovInsuranceEligibility');
    const insuranceReasonEl = document.getElementById('ovInsuranceReason');
    const insuranceDetailsGrid = insurancePanel?.querySelector('.overview-insurance-grid');

    if (
        insurancePanel
        && insuranceAssetEl
        && insuranceProviderEl
        && insuranceTypeEl
        && insuranceRenewalDateEl
        && warrantyProviderEl
        && warrantyExpiryEl
        && insuranceEligibilityEl
        && insuranceReasonEl
    ) {
        if (canViewInsuranceClaimContext() && insuranceContext) {
            const renewalDateText = insuranceContext.nextRenewalDate
                ? fmtDateShort(insuranceContext.nextRenewalDate)
                : 'N/A';

            insuranceAssetEl.textContent = insuranceContext.assetLabel || 'N/A';
            insuranceProviderEl.textContent = insuranceContext.insuranceProvider || 'N/A';
            insuranceTypeEl.textContent = insuranceContext.insuranceType || 'N/A';
            insuranceRenewalDateEl.textContent = renewalDateText;
            warrantyProviderEl.textContent = insuranceContext.warrantyProvider || 'N/A';
            warrantyExpiryEl.textContent = insuranceContext.warrantyExpiry
                ? fmtDateShort(insuranceContext.warrantyExpiry)
                : 'N/A';

            if (insuranceContext.eligible) {

                insuranceEligibilityEl.textContent = 'Eligible for Insurance Claim';
                insuranceEligibilityEl.classList.add('eligible');
                insuranceEligibilityEl.classList.remove('not-eligible');

                if (insuranceDetailsGrid) {
                    insuranceDetailsGrid.style.display = 'grid';
                }

                insuranceReasonEl.textContent = insuranceContext.eligibilityReason || 'Eligibility details are unavailable.';
                insuranceReasonEl.style.display = 'block';
            } else {
                insuranceEligibilityEl.textContent = 'Insurance is not eligible.';
                insuranceEligibilityEl.classList.remove('eligible');
                insuranceEligibilityEl.classList.add('not-eligible');

                if (insuranceDetailsGrid) {
                    insuranceDetailsGrid.style.display = 'none';
                }

                insuranceReasonEl.textContent = '';
                insuranceReasonEl.style.display = 'none';
            }

            insurancePanel.style.display = 'flex';
        } else {
            insurancePanel.style.display = 'none';
            insuranceEligibilityEl.classList.remove('eligible', 'not-eligible');
            if (insuranceDetailsGrid) {
                insuranceDetailsGrid.style.display = '';
            }
            insuranceReasonEl.style.display = '';
        }
    }

    const overviewActions = document.getElementById('overviewActions');
    const editFaultTicketBtn = document.getElementById('editFaultTicketBtn');
    const viewNearbyGaragesBtn = document.getElementById('viewNearbyGaragesBtn');
    const logGarageEntryBtn = document.getElementById('logGarageEntryBtn');
    const addGarageProgressBtn = document.getElementById('addGarageProgressBtn');
    const completeGarageRepairBtn = document.getElementById('completeGarageRepairBtn');

    if (
        overviewActions
        && editFaultTicketBtn
        && viewNearbyGaragesBtn
        && logGarageEntryBtn
        && addGarageProgressBtn
        && completeGarageRepairBtn
    ) {
        const normalizedTicketStatus = normaliseStatus(ticketData?.status);
        const routeWorkflowStatus = getRouteGarageWorkflowStatus();
        const canEditPendingTicket = isMachinaryOperator()
            && Number(ticketData?.id || 0) > 0
            && (normalizedTicketStatus === 'open' || normalizedTicketStatus === 'pending');
        const canDriverOpenNearbyGarages = isDriver() && routeTicket;
        const canDriverLogGarageEntry = canDriverOpenNearbyGarages && routeWorkflowStatus === 'garage_approved';
        const canDriverAddGarageProgress = canDriverOpenNearbyGarages && isDriverGarageRepairStage(routeWorkflowStatus);
        const canDriverCompleteRepair = canDriverAddGarageProgress;

        editFaultTicketBtn.style.display = canEditPendingTicket ? 'inline-flex' : 'none';
        viewNearbyGaragesBtn.style.display = canDriverOpenNearbyGarages ? 'inline-flex' : 'none';
        logGarageEntryBtn.style.display = canDriverLogGarageEntry ? 'inline-flex' : 'none';
        addGarageProgressBtn.style.display = canDriverAddGarageProgress ? 'inline-flex' : 'none';
        completeGarageRepairBtn.style.display = canDriverCompleteRepair ? 'inline-flex' : 'none';

        editFaultTicketBtn.onclick = canEditPendingTicket
            ? () => {
                const context = getViewTicketContext();
                const ticketId = Number(ticketData?.id || 0);

                if (!Number.isFinite(ticketId) || ticketId <= 0) {
                    showToast('Invalid ticket selected for edit.', 'warning');
                    return;
                }

                if (isDashboardComponentMode() && typeof context.onRequestEdit === 'function') {
                    context.onRequestEdit({
                        ticketId,
                        status: ticketData?.status || '',
                    });
                    return;
                }

                showToast('Edit is available from the Machinery Operator dashboard view.', 'warning');
            }
            : null;

        viewNearbyGaragesBtn.onclick = canDriverOpenNearbyGarages
            ? () => {
                void openDriverNearbyGarages();
            }
            : null;

        logGarageEntryBtn.onclick = canDriverLogGarageEntry
            ? () => {
                void openDriverGarageEntry();
            }
            : null;

        addGarageProgressBtn.onclick = canDriverAddGarageProgress
            ? () => {
                void openDriverGarageProgress();
            }
            : null;

        completeGarageRepairBtn.onclick = canDriverCompleteRepair
            ? () => {
                void openDriverCompleteRepair();
            }
            : null;

        overviewActions.style.display = (
            canEditPendingTicket
            || canDriverOpenNearbyGarages
            || canDriverLogGarageEntry
            || canDriverAddGarageProgress
            || canDriverCompleteRepair
        )
            ? 'flex'
            : 'none';
    }
}

function renderMachineOverviewPanel() {
    const machinePanel = document.getElementById('ovMachinePanel');
    if (!machinePanel) {
        return;
    }

    if (!isMachineFaultTicket(ticketData)) {
        machinePanel.style.display = 'none';
        return;
    }

    const machineData = machineDetails && typeof machineDetails === 'object' ? machineDetails : null;
    const machineRefId = getMachineReferenceId(ticketData);

    const machineCode = String(machineData?.machine_id || '').trim() || (machineRefId ? `Machine #${machineRefId}` : 'N/A');
    const machineName = String(machineData?.machine_name || ticketData?.machine_name || ticketData?.breakdown_context?.equipment_label || '').trim() || 'N/A';
    const machineSerial = String(machineData?.serial_number || '').trim() || 'N/A';
    const machineModel = String(machineData?.model_number || ticketData?.machine_model_number || ticketData?.breakdown_context?.equipment_model || '').trim() || 'N/A';
    const machineSupplier = String(machineData?.supplier_name || '').trim() || 'N/A';
    const machineStatus = String(machineData?.status || '').trim() || 'N/A';

    const hoursValue = machineData?.current_operating_hours;
    const machineHours = hoursValue !== null
        && hoursValue !== undefined
        && String(hoursValue).trim() !== ''
        && Number.isFinite(Number(hoursValue))
        ? `${Number(hoursValue).toLocaleString('en-US')} hrs`
        : 'N/A';

    const lastService = machineData?.last_service_date ? fmtDateShort(machineData.last_service_date) : 'N/A';
    const nextService = machineData?.next_service_date ? fmtDateShort(machineData.next_service_date) : 'N/A';

    const values = {
        ovMachineCode: machineCode,
        ovMachineName: machineName,
        ovMachineSerial: machineSerial,
        ovMachineModel: machineModel,
        ovMachineSupplier: machineSupplier,
        ovMachineStatus: machineStatus,
        ovMachineHours: machineHours,
        ovMachineLastService: lastService,
        ovMachineNextService: nextService,
    };

    Object.entries(values).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });

    machinePanel.style.display = 'flex';
}

function parseCoordinatePair(latitudeValue, longitudeValue) {
    const latitude = Number(latitudeValue);
    const longitude = Number(longitudeValue);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return null;
    }

    return [latitude, longitude];
}

function parseCoordinatesFromText(value) {
    const text = String(value || '').trim();
    if (!text) {
        return null;
    }

    const labelledMatch = text.match(/lat(?:itude)?\s*[:=]?\s*(-?\d+(?:\.\d+)?)\s*[,|]\s*lng(?:itude)?\s*[:=]?\s*(-?\d+(?:\.\d+)?)/i);
    if (labelledMatch) {
        return parseCoordinatePair(labelledMatch[1], labelledMatch[2]);
    }

    const coordinatePairMatch = text.match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
    if (coordinatePairMatch) {
        return parseCoordinatePair(coordinatePairMatch[1], coordinatePairMatch[2]);
    }

    return null;
}

function getRouteTicketLocationLabel() {
    const routeDescriptionLocation = parseLegacyRouteBreakdownDescription(routeBreakdownContext?.description).locationText;
    const breakdownContextDescriptionLocation = parseLegacyRouteBreakdownDescription(ticketData?.breakdown_context?.description).locationText;
    const ticketDescriptionLocation = parseLegacyRouteBreakdownDescription(ticketData?.description).locationText;

    return String(
        routeBreakdownContext?.breakdown_location
        || ticketData?.breakdown_context?.location
        || ticketData?.breakdown_location
        || routeDescriptionLocation
        || breakdownContextDescriptionLocation
        || ticketDescriptionLocation
        || ticketData?.location
        || ''
    ).trim();
}

function getRouteTicketCoordinates() {
    const coordinateCandidates = [
        parseCoordinatePair(routeBreakdownContext?.breakdown_latitude, routeBreakdownContext?.breakdown_longitude),
        parseCoordinatePair(routeBreakdownContext?.latitude, routeBreakdownContext?.longitude),
        parseCoordinatePair(ticketData?.breakdown_context?.breakdown_latitude, ticketData?.breakdown_context?.breakdown_longitude),
        parseCoordinatePair(ticketData?.breakdown_context?.latitude, ticketData?.breakdown_context?.longitude),
        parseCoordinatePair(ticketData?.breakdown_latitude, ticketData?.breakdown_longitude),
        parseCoordinatePair(ticketData?.latitude, ticketData?.longitude),
        parseCoordinatesFromText(routeBreakdownContext?.breakdown_location),
        parseCoordinatesFromText(routeBreakdownContext?.description),
        parseCoordinatesFromText(ticketData?.breakdown_context?.location),
        parseCoordinatesFromText(ticketData?.breakdown_context?.description),
        parseCoordinatesFromText(ticketData?.location),
        parseCoordinatesFromText(ticketData?.description),
    ];

    return coordinateCandidates.find((candidate) => Array.isArray(candidate) && candidate.length === 2) || null;
}

function destroyRouteLocationMap() {
    if (routeLocationMap && typeof routeLocationMap.remove === 'function') {
        routeLocationMap.remove();
    }

    routeLocationMap = null;
}

async function renderRouteLocationPanel() {
    const panelEl = document.getElementById('routeLocationPanel');
    const mapEl = document.getElementById('routeLocationMap');
    const hintEl = document.getElementById('routeLocationHint');
    const labelEl = document.getElementById('routeLocationLabel');

    if (!panelEl || !mapEl || !hintEl || !labelEl) {
        return;
    }

    if (!isRouteBreakdownTicket()) {
        destroyRouteLocationMap();
        panelEl.style.display = 'none';
        return;
    }

    panelEl.style.display = 'flex';

    const locationLabel = getRouteTicketLocationLabel();
    if (locationLabel) {
        labelEl.textContent = locationLabel;
        labelEl.style.display = 'inline-flex';
    } else {
        labelEl.textContent = '';
        labelEl.style.display = 'none';
    }

    const coordinates = getRouteTicketCoordinates();
    if (!coordinates) {
        destroyRouteLocationMap();
        mapEl.style.display = 'none';
        hintEl.textContent = locationLabel
            ? 'A location was reported, but map coordinates are not available for this ticket.'
            : 'Location coordinates were not captured for this route breakdown.';
        return;
    }

    mapEl.style.display = 'block';

    const leafletReady = await ensureLeafletForGarageMap();
    if (!leafletReady || typeof window.L === 'undefined') {
        hintEl.textContent = 'Unable to load map resources right now. Please try again shortly.';
        return;
    }

    destroyRouteLocationMap();

    routeLocationMap = window.L.map(mapEl, {
        zoomControl: true,
    });

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
    }).addTo(routeLocationMap);

    const marker = window.L.marker(coordinates)
        .addTo(routeLocationMap)
        .bindPopup('<strong>Reported Breakdown Location</strong>');

    routeLocationMap.setView(coordinates, 14);
    marker.openPopup();

    hintEl.textContent = 'This map shows the location reported when the route breakdown was submitted.';

    setTimeout(() => {
        if (routeLocationMap) {
            routeLocationMap.invalidateSize();
        }
    }, 50);
}

function renderFlow() {
    const status = normaliseStatus(ticketData.status);
    const dangerousContext = getDangerousCargoContext();

    markStep('step-reported', 'completed');
    document.getElementById('step1-reporter').textContent = ticketData.reporter_full_name || ticketData.reported_by_name || 'Unknown';
    document.getElementById('step1-date').textContent = fmtDateShort(ticketData.created_at);
    let stepOneDescription = `Fault reported. Breakdown type: ${ticketData.breakdown_type || 'N/A'}.`;
    if (dangerousContext.present) {
        const dangerousTripText = dangerousContext.tripId ? ` Cargo trip: ${dangerousContext.tripId}.` : '';
        stepOneDescription += ` Dangerous cargo was active at report time.${dangerousTripText}`;
    }
    document.getElementById('step1-desc').textContent = stepOneDescription;

    const assignment = ticketData.assignments && ticketData.assignments.length > 0 ? ticketData.assignments[0] : null;
    const hasGarageAssignment = hasRouteGarageAssignment();
    const approvedGarageName = getApprovedRouteGarageName();
    const insuranceContext = getInsuranceClaimContext();
    const assignmentTitle = document.getElementById('step2-title');
    const assigneeRole = document.getElementById('step2-assignee-role');

    if (assignmentTitle) {
        if (isInsuranceClaimed(status)) {
            assignmentTitle.textContent = 'Insurance Claim Submitted';
        } else {
            assignmentTitle.textContent = hasGarageAssignment ? 'Assigned to Nearby Garage' : 'Assigned to Technician';
        }
    }

    if (assigneeRole) {
        if (isInsuranceClaimed(status)) {
            assigneeRole.textContent = 'Insurance Provider';
        } else {
            assigneeRole.textContent = hasGarageAssignment ? 'Nearby Garage' : 'Technical Officer';
        }
    }

    if (isInsuranceClaimed(status)) {
        markStep('step-assigned', 'completed');
        document.getElementById('step2-assignedBy').textContent = 'Supervisor';
        document.getElementById('step2-technician').textContent = insuranceContext?.insuranceProvider || 'Insurance Provider';
        document.getElementById('step2-desc').textContent = `Insurance claim submitted on ${fmtDateShort(ticketData.updated_at)}.`;

        const notesEl = document.getElementById('step2-notes');
        const eligibilityNote = String(insuranceContext?.eligibilityReason || '').trim();
        if (eligibilityNote) {
            notesEl.textContent = eligibilityNote;
            notesEl.style.display = 'block';
        } else {
            notesEl.style.display = 'none';
            notesEl.textContent = '';
        }
    } else if (hasGarageAssignment) {
        markStep('step-assigned', 'completed');
        document.getElementById('step2-assignedBy').textContent = routeBreakdownContext?.approved_by_name || 'Supervisor';
        document.getElementById('step2-technician').textContent = approvedGarageName || 'Approved Garage';
        document.getElementById('step2-desc').textContent = `Nearby garage approved on ${fmtDateShort(routeBreakdownContext?.approved_at || routeBreakdownContext?.updated_at || ticketData.updated_at)}.`;

        const notesEl = document.getElementById('step2-notes');
        const approvalNotes = String(routeBreakdownContext?.approval_notes || '').trim();
        if (approvalNotes) {
            notesEl.textContent = approvalNotes;
            notesEl.style.display = 'block';
        } else {
            notesEl.style.display = 'none';
            notesEl.textContent = '';
        }
    } else if (assignment || statusAtOrPast(status, 'assigned')) {
        markStep('step-assigned', 'completed');
        document.getElementById('step2-assignedBy').textContent = assignment ? (assignment.assigned_by_name || 'Supervisor') : 'Supervisor';
        document.getElementById('step2-technician').textContent = assignment ? (assignment.technician_name || 'Technical Officer') : 'Pending';
        document.getElementById('step2-desc').textContent = `Assigned on ${fmtDateShort(assignment?.assigned_at || ticketData.updated_at)}.`;

        const notesEl = document.getElementById('step2-notes');
        if (assignment?.notes) {
            notesEl.textContent = assignment.notes;
            notesEl.style.display = 'block';
        } else {
            notesEl.style.display = 'none';
            notesEl.textContent = '';
        }
    } else {
        markStep('step-assigned', 'pending');
        document.getElementById('step2-assignedBy').textContent = 'Pending';
        document.getElementById('step2-technician').textContent = 'Pending';
        const notesEl = document.getElementById('step2-notes');
        notesEl.style.display = 'none';
        notesEl.textContent = '';
    }

    renderAssignmentAction(status, assignment);
    renderBudgetStep(status);
    renderPartsStep(status);
    renderInProgressStep(status);
    renderResolvedStep(status);
    renderClosedStep(status);
}

function renderAssignmentAction(status, assignment) {
    const actionEl = document.getElementById('step2-action');
    const assignButton = document.getElementById('assignTicketBtn');
    const approveGarageButton = document.getElementById('approveGarageBtn');
    const claimInsuranceButton = document.getElementById('claimInsuranceBtn');
    const garageHint = document.getElementById('step2-garage-hint');
    if (!actionEl || !assignButton || !approveGarageButton || !claimInsuranceButton || !garageHint) return;

    const routeTicket = isRouteBreakdownTicket();
    const hasGarageAssignment = hasRouteGarageAssignment();
    const insuranceContext = getInsuranceClaimContext();
    const insuranceClaimed = isInsuranceClaimed(status);
    const canClaimInsurance = isSupervisorLike()
        && !insuranceClaimed
        && !hasGarageAssignment
        && insuranceContext?.eligible === true;

    if (!isSupervisorLike() || statusAtOrPast(status, 'resolved')) {
        actionEl.style.display = 'none';
        return;
    }

    if (insuranceClaimed) {
        assignButton.style.display = 'none';
        approveGarageButton.style.display = 'none';
        claimInsuranceButton.style.display = 'none';

        garageHint.textContent = 'This ticket is now in the insurance-claim workflow. Technical assignment is not required.';
        garageHint.style.display = 'flex';
        actionEl.style.display = 'block';
        return;
    }

    assignButton.innerHTML = assignment
        ? '<i class="fas fa-user-cog"></i> Edit Assignment'
        : '<i class="fas fa-user-plus"></i> Assign Technician';

    if (canClaimInsurance) {
        assignButton.style.display = hasGarageAssignment ? 'none' : 'inline-flex';
        approveGarageButton.style.display = (routeTicket && !hasGarageAssignment) ? 'inline-flex' : 'none';
        claimInsuranceButton.style.display = 'inline-flex';

        const providerName = insuranceContext?.insuranceProvider ? ` (${insuranceContext.insuranceProvider})` : '';
        garageHint.textContent = `Eligible for insurance claim${providerName}. You can either assign a technician or submit the insurance claim.`;
        garageHint.style.display = 'flex';

        actionEl.style.display = 'block';
        return;
    }

    claimInsuranceButton.style.display = 'none';
    assignButton.style.display = hasGarageAssignment ? 'none' : 'inline-flex';
    approveGarageButton.style.display = (routeTicket && !hasGarageAssignment) ? 'inline-flex' : 'none';

    if (routeTicket && hasGarageAssignment) {
        const approvedGarageName = getApprovedRouteGarageName();
        garageHint.textContent = approvedGarageName
            ? `Nearby garage approved (${approvedGarageName}). Technician assignment is optional.`
            : 'Nearby garage is already approved. Technician assignment is optional.';
        garageHint.style.display = 'flex';
    } else if (insuranceContext && insuranceContext.eligible === false) {
        garageHint.textContent = 'Insurance is not eligible.';
        garageHint.style.display = 'flex';
    } else {
        garageHint.style.display = 'none';
        garageHint.textContent = '';
    }

    actionEl.style.display = 'block';
}

function renderBudgetStep(status) {
    const currentIdx = statusIndex(status);
    const budgetIdx = statusIndex('waiting for budget approval');

    const noReportEl = document.getElementById('budget-no-report');
    const reportInfoEl = document.getElementById('budget-report-info');
    const budgetActionEl = document.getElementById('budget-action');
    const reviewActionEl = document.getElementById('budget-review-action');
    const reviewHintEl = document.getElementById('budget-review-hint');

    if (reviewHintEl) {
        reviewHintEl.style.display = 'none';
        reviewHintEl.textContent = '';
    }

    if (budgetReport) {
        noReportEl.style.display = 'none';
        reportInfoEl.style.display = 'block';

        document.getElementById('step3-submitter').textContent = budgetReport.submitted_by_name || 'Technical Officer';

        const amount = Number.parseFloat(budgetReport.total_amount || 0);
        document.getElementById('budget-amount').textContent = amount > 0
            ? (window.FaultTicketDetailTemplate?.formatLkrCurrency
                ? window.FaultTicketDetailTemplate.formatLkrCurrency(amount)
                : `LKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
            : '-';

        const levelEl = document.getElementById('budget-level');
        const approvalLevel = String(budgetReport.approval_level || 'supervisor').toLowerCase();

        if (approvalLevel === 'maintenance_manager') {
            levelEl.textContent = 'Maintenance Manager';
            levelEl.style.background = '#ede9fe';
            levelEl.style.color = '#5b21b6';
        } else {
            levelEl.textContent = 'Supervisor';
            levelEl.style.background = 'var(--stone-200)';
            levelEl.style.color = 'var(--text-700)';
        }

        const budgetStatus = String(budgetReport.status || 'pending').toLowerCase();
        const statusBadge = document.getElementById('budget-status-badge');
        statusBadge.textContent = budgetReport.status || 'Pending';
        statusBadge.className = `budget-status-badge status-${budgetStatus}`;

        const reviewerChip = document.getElementById('step3-reviewer-chip');
        if (budgetReport.reviewed_by_name) {
            reviewerChip.style.display = 'inline-flex';
            document.getElementById('step3-reviewer').textContent = budgetReport.reviewed_by_name;
            document.getElementById('step3-reviewer-role').textContent =
                approvalLevel === 'maintenance_manager' ? 'Maintenance Manager' : 'Supervisor';
        } else {
            reviewerChip.style.display = 'none';
            document.getElementById('step3-reviewer').textContent = '-';
        }

        const reviewNotesEl = document.getElementById('budget-review-notes');
        if (budgetReport.review_notes) {
            reviewNotesEl.textContent = budgetReport.review_notes;
            reviewNotesEl.style.display = 'block';
        } else {
            reviewNotesEl.style.display = 'none';
            reviewNotesEl.textContent = '';
        }

        if (budgetStatus === 'approved') markStep('step-budget', 'completed');
        else if (budgetStatus === 'rejected') markStep('step-budget', 'danger');
        else if (budgetStatus === 'revised') markStep('step-budget', 'warning');
        else markStep('step-budget', 'active');

        const canReviewAsSupervisor = isSupervisorLike()
            && budgetStatus === 'pending'
            && approvalLevel !== 'maintenance_manager';

        if (reviewActionEl) {
            reviewActionEl.style.display = canReviewAsSupervisor ? 'flex' : 'none';
        }

        if (isSupervisorLike() && budgetStatus === 'pending' && approvalLevel === 'maintenance_manager' && reviewHintEl) {
            reviewHintEl.textContent = 'This request exceeds petty cash limit and requires Maintenance Manager approval.';
            reviewHintEl.style.display = 'flex';
        }
    } else {
        noReportEl.style.display = 'flex';
        reportInfoEl.style.display = 'none';

        if (currentIdx < budgetIdx) markStep('step-budget', 'pending');
        else if (normaliseStatus(status) === 'waiting for budget approval') markStep('step-budget', 'active');
        else markStep('step-budget', 'completed');

        if (reviewActionEl) reviewActionEl.style.display = 'none';
    }

    const canSubmitBudget = isTechnicalOfficer()
        && isPreWork(status)
        && (!budgetReport || ['rejected', 'revised'].includes(String(budgetReport.status || '').toLowerCase()));

    budgetActionEl.style.display = canSubmitBudget ? 'block' : 'none';
}

function renderPartsStep(status) {
    const partsIdx = statusIndex('waiting for spare parts');
    const currentIdx = statusIndex(status);

    if (sparePartRequests.length > 0) {
        document.getElementById('parts-no-request').style.display = 'none';
        document.getElementById('parts-list-container').style.display = 'block';

        const listEl = document.getElementById('parts-list');
        listEl.innerHTML = sparePartRequests.map((request) => {
            const reqStatus = String(request.status || 'Pending').toLowerCase();
            let statusClass = 'status-pending';
            if (reqStatus === 'approved' || reqStatus === 'issued') statusClass = 'status-approved';
            else if (reqStatus === 'rejected') statusClass = 'status-rejected';

            const items = (request.items || []).map((item) => (
                `<div class="parts-item-row">${item.part_name}${item.quantity ? ` x ${item.quantity}` : ''}${item.unit ? ` (${item.unit})` : ''}</div>`
            )).join('');

            const reviewNote = request.review_notes
                ? `<div class="parts-review-note"><i class="fas fa-comment-alt"></i> ${request.review_notes}</div>`
                : '';

            return `
                <div class="parts-request-card" style="margin-bottom:8px;">
                    <div class="parts-request-header">
                        <span class="parts-request-id">${request.request_id || `SPR-${request.id}`}</span>
                        <span class="budget-status-badge ${statusClass}">${request.status || 'Pending'}</span>
                    </div>
                    <div class="parts-items">${items || '<em style="font-size:.8rem;color:var(--muted)">No items listed</em>'}</div>
                    ${request.reviewed_by_name
                        ? `<div class="work-update-meta"><i class="fas fa-user-check"></i> Reviewed by ${request.reviewed_by_name}</div>`
                        : ''}
                    ${reviewNote}
                </div>`;
        }).join('');

        const allApproved = sparePartRequests.every((item) => ['approved', 'issued'].includes(String(item.status || '').toLowerCase()));
        const anyRejected = sparePartRequests.some((item) => String(item.status || '').toLowerCase() === 'rejected');
        const anyApproved = sparePartRequests.some((item) => ['approved', 'issued'].includes(String(item.status || '').toLowerCase()));

        if (allApproved) markStep('step-parts', 'completed');
        else if (anyRejected && !anyApproved) markStep('step-parts', 'danger');
        else if (currentIdx >= partsIdx) markStep('step-parts', 'active');
        else markStep('step-parts', 'pending');
    } else {
        document.getElementById('parts-no-request').style.display = 'flex';
        document.getElementById('parts-list-container').style.display = 'none';

        if (currentIdx >= statusIndex('parts approved')) markStep('step-parts', 'completed');
        else if (normaliseStatus(status) === 'waiting for spare parts') markStep('step-parts', 'active');
        else markStep('step-parts', 'pending');
    }

    const partsActionEl = document.getElementById('parts-action');
    partsActionEl.style.display = (isTechnicalOfficer() && isPreWork(status)) ? 'block' : 'none';
}

function renderInProgressStep(status) {
    const currentIdx = statusIndex(status);
    const inProgressIdx = statusIndex('in progress');
    const startWorkAction = document.getElementById('start-work-action');

    if (currentIdx >= inProgressIdx) {
        markStep('step-inprogress', statusAtOrPast(status, 'resolved') ? 'completed' : 'active');
        document.getElementById('inprogress-hint').style.display = 'none';
        document.getElementById('inprogress-info').style.display = 'block';

        if (startWorkAction) {
            startWorkAction.style.display = 'none';
        }

        document.getElementById('step5-tech').textContent =
            currentUser ? (currentUser.full_name || currentUser.name || 'Technical Officer') : 'Technical Officer';

        const updatesEl = document.getElementById('work-updates-list');
        if (workUpdates.length > 0) {
            updatesEl.innerHTML = workUpdates.map((update) => `
                <div class="work-update-item" style="margin-top:6px;">
                    <div>${update.update_text || update.notes || 'Work update'}</div>
                    <div class="work-update-meta">
                        <i class="fas fa-clock"></i> ${fmtDate(update.created_at)}
                        ${update.updated_by_name ? ` &bull; <i class="fas fa-user"></i> ${update.updated_by_name}` : ''}
                    </div>
                </div>
            `).join('');
        } else {
            updatesEl.innerHTML = '<p class="step-hint" style="margin-top:6px;"><i class="fas fa-info-circle"></i> No work updates yet.</p>';
        }

        const completeAction = document.getElementById('complete-action');
        completeAction.style.display = (isTechnicalOfficer() && normaliseStatus(status) === 'in progress') ? 'block' : 'none';
    } else {
        const canStartWork = isTechnicalOfficer() && normaliseStatus(status) === 'parts approved';

        markStep('step-inprogress', canStartWork ? 'active' : 'pending');
        document.getElementById('inprogress-hint').style.display = 'flex';
        document.getElementById('inprogress-info').style.display = 'none';
        document.getElementById('complete-action').style.display = 'none';

        if (startWorkAction) {
            startWorkAction.style.display = canStartWork ? 'block' : 'none';
        }
    }
}

function renderRouteGarageCompletionSection(completionDetails = getRouteGarageCompletionDetails()) {
    const billBox = document.getElementById('routeGarageBillBox');
    const billAmountEl = document.getElementById('routeGarageBillAmount');
    const completedAtEl = document.getElementById('routeGarageCompletedAt');
    const completedByEl = document.getElementById('routeGarageCompletedBy');
    const remarksEl = document.getElementById('routeGarageCompletionRemarks');
    const billImageLinkEl = document.getElementById('routeGarageBillImageLink');
    const billImageHintEl = document.getElementById('routeGarageBillImageHint');
    const billImagePreviewWrapEl = document.getElementById('routeGarageBillImagePreviewWrap');
    const billImagePreviewEl = document.getElementById('routeGarageBillImagePreview');

    if (!billBox
        || !billAmountEl
        || !completedAtEl
        || !completedByEl
        || !remarksEl
        || !billImageLinkEl
        || !billImageHintEl
        || !billImagePreviewWrapEl
        || !billImagePreviewEl
    ) {
        return;
    }

    const reset = () => {
        billBox.style.display = 'none';
        billAmountEl.textContent = 'N/A';
        completedAtEl.textContent = 'N/A';
        completedByEl.textContent = 'N/A';

        remarksEl.style.display = 'none';
        remarksEl.textContent = '';

        billImageLinkEl.style.display = 'none';
        billImageLinkEl.removeAttribute('href');

        billImageHintEl.style.display = 'none';
        billImageHintEl.textContent = '';

        billImagePreviewWrapEl.style.display = 'none';
        billImagePreviewEl.removeAttribute('src');
    };

    if (!completionDetails) {
        reset();
        return;
    }

    billBox.style.display = 'flex';
    billAmountEl.textContent = formatLkrAmount(completionDetails.billAmount);
    completedAtEl.textContent = completionDetails.completedAt ? fmtDate(completionDetails.completedAt) : 'N/A';
    completedByEl.textContent = completionDetails.completedBy || 'N/A';

    if (completionDetails.completionRemarks) {
        remarksEl.style.display = 'block';
        remarksEl.textContent = completionDetails.completionRemarks;
    } else {
        remarksEl.style.display = 'none';
        remarksEl.textContent = '';
    }

    if (completionDetails.billImageUrl) {
        billImageLinkEl.style.display = 'inline-flex';
        billImageLinkEl.href = completionDetails.billImageUrl;

        billImagePreviewWrapEl.style.display = 'block';
        billImagePreviewEl.src = completionDetails.billImageUrl;

        billImageHintEl.style.display = 'none';
        billImageHintEl.textContent = '';
    } else {
        billImageLinkEl.style.display = 'none';
        billImageLinkEl.removeAttribute('href');

        billImagePreviewWrapEl.style.display = 'none';
        billImagePreviewEl.removeAttribute('src');

        if (completionDetails.billImagePath) {
            billImageHintEl.style.display = 'flex';
            billImageHintEl.textContent = 'Bill image upload exists, but the file URL is not available to preview.';
        } else {
            billImageHintEl.style.display = 'none';
            billImageHintEl.textContent = '';
        }
    }
}

function renderResolvedStep(status) {
    const routeGarageCompletion = getRouteGarageCompletionDetails();
    const hasRouteCompletion = Boolean(routeGarageCompletion);
    const resolvedStepReached = statusAtOrPast(status, 'resolved') || hasRouteCompletion;
    const resolverRoleEl = document.getElementById('step6-resolver-role');

    if (resolvedStepReached) {
        markStep('step-resolved', 'completed');
        document.getElementById('resolved-hint').style.display = 'none';
        document.getElementById('resolved-info').style.display = 'block';

        document.getElementById('step6-resolver').textContent =
            routeGarageCompletion?.completedBy
            || ticketData?.resolved_by_name
            || currentUser?.full_name
            || currentUser?.name
            || 'Technical Officer';

        if (resolverRoleEl) {
            resolverRoleEl.textContent = hasRouteCompletion ? 'Driver' : 'Technical Officer';
        }

        const resolutionText = document.getElementById('resolution-notes-text');
        resolutionText.textContent = ticketData?.resolution_notes
            || routeGarageCompletion?.completionRemarks
            || 'No resolution notes were provided.';

        renderRouteGarageCompletionSection(routeGarageCompletion);
    } else {
        markStep('step-resolved', 'pending');
        document.getElementById('resolved-hint').style.display = 'flex';
        document.getElementById('resolved-info').style.display = 'none';

        if (resolverRoleEl) {
            resolverRoleEl.textContent = 'Technical Officer';
        }

        renderRouteGarageCompletionSection(null);
    }
}

function renderClosedStep(status) {
    if (normaliseStatus(status) === 'closed') {
        markStep('step-closed', 'completed');
        document.getElementById('closed-hint').style.display = 'none';
        document.getElementById('closed-info').style.display = 'block';
        document.getElementById('closed-date').textContent = `Closed on ${fmtDateShort(ticketData.updated_at)}.`;
    } else {
        markStep('step-closed', 'pending');
        document.getElementById('closed-hint').style.display = 'flex';
        document.getElementById('closed-info').style.display = 'none';
    }
}

function capitalise(value) {
    const text = String(value || '');
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

function getBudgetModalElements() {
    return {
        modal: document.getElementById('budgetModal'),
        ticketDisplay: document.getElementById('budgetTicketDisplay'),
        totalAmount: document.getElementById('budgetTotalAmount'),
        quotation: document.getElementById('budgetQuotation'),
        justification: document.getElementById('budgetJustification'),
        hint: document.getElementById('pettyCashHint'),
        submitButton: document.getElementById('budgetSubmitBtn')
    };
}

function ensureBudgetModalElements(elements, options = {}) {
    const {
        requireSubmitButton = false,
        toastMessage = 'Budget form is not available right now. Please reopen ticket details and try again.'
    } = options;

    if (!elements.modal
        || !elements.ticketDisplay
        || !elements.totalAmount
        || !elements.quotation
        || !elements.justification
        || !elements.hint
        || (requireSubmitButton && !elements.submitButton)
    ) {
        console.warn('Budget modal DOM is not fully available.');
        showToast(toastMessage, 'error');
        return false;
    }

    return true;
}

function openBudgetModal() {
    if (!isTechnicalOfficer() || !ticketData) {
        showToast('Only Technical Officers can submit budget reports from this page.', 'warning');
        return;
    }

    const budgetElements = getBudgetModalElements();
    if (!ensureBudgetModalElements(budgetElements)) {
        return;
    }

    const ticketIdFormatted = window.FaultTicketDetailTemplate?.formatTicketDisplayId
        ? window.FaultTicketDetailTemplate.formatTicketDisplayId(ticketData)
        : (ticketData.breakdown_report_id || ticketData.ticket_id || `#${ticketData.id}`);

    budgetElements.ticketDisplay.value = ticketIdFormatted;
    budgetElements.totalAmount.value = '';
    budgetElements.quotation.value = '';
    budgetElements.justification.value = '';
    budgetElements.hint.textContent = '';
    budgetElements.hint.className = 'form-hint';

    budgetElements.modal.classList.add('active');
    budgetElements.totalAmount.removeEventListener('input', updatePettyCashHint);
    budgetElements.totalAmount.addEventListener('input', updatePettyCashHint);
}

function closeBudgetModal() {
    const budgetElements = getBudgetModalElements();
    if (budgetElements.modal) {
        budgetElements.modal.classList.remove('active');
    }
    if (budgetElements.totalAmount) {
        budgetElements.totalAmount.removeEventListener('input', updatePettyCashHint);
    }
}

function updatePettyCashHint() {
    const budgetElements = getBudgetModalElements();
    if (!budgetElements.totalAmount || !budgetElements.hint) {
        return;
    }

    const value = Number.parseFloat(budgetElements.totalAmount.value) || 0;
    const hintEl = budgetElements.hint;

    if (value > 0) {
        hintEl.textContent = 'Amounts above petty cash limit will require Maintenance Manager approval.';
        hintEl.className = 'form-hint warn';
    } else {
        hintEl.textContent = '';
        hintEl.className = 'form-hint';
    }
}

async function submitBudget(event) {
    event.preventDefault();

    if (!isTechnicalOfficer()) {
        showToast('Only Technical Officers can submit budget reports from this page.', 'warning');
        return;
    }

    const budgetElements = getBudgetModalElements();
    if (!ensureBudgetModalElements(budgetElements, {
        requireSubmitButton: true,
        toastMessage: 'Budget form is unavailable right now. Please reopen ticket details and try again.'
    })) {
        return;
    }

    const submitButton = budgetElements.submitButton;
    const totalAmount = Number.parseFloat(budgetElements.totalAmount.value);
    const quotation = budgetElements.quotation.value.trim();
    const justification = budgetElements.justification.value.trim();

    if (!totalAmount || totalAmount <= 0 || !quotation || !justification) {
        showToast('Please fill in all required fields.', 'error');
        return;
    }

    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    try {
        const response = await API.post('/budget-reports', {
            fault_ticket_id: ticketData.id,
            total_amount: totalAmount,
            quotation,
            justification
        });

        if (response.status === 'success') {
            showToast('Budget report submitted successfully.', 'success');
            closeBudgetModal();
            await loadAll();
        } else {
            showToast(response.message || 'Failed to submit budget report.', 'error');
        }
    } catch (error) {
        console.error('submitBudget error:', error);
        showToast('An error occurred while submitting the budget report.', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Report';
    }
}

async function reviewBudget(status) {
    const normalizedStatus = String(status || '').toLowerCase();

    if (!isSupervisorLike()) {
        showToast('Only Supervisors can review budget requests from this page.', 'warning');
        return;
    }

    if (!budgetReport || !budgetReport.id) {
        showToast('No budget report is available for review.', 'warning');
        return;
    }

    if (!['approved', 'rejected'].includes(normalizedStatus)) {
        showToast('Invalid budget review action.', 'error');
        return;
    }

    const approvalLevel = String(budgetReport.approval_level || 'supervisor').toLowerCase();
    if (approvalLevel === 'maintenance_manager') {
        showToast('This request exceeds petty cash limit and requires Maintenance Manager approval.', 'warning');
        return;
    }

    const currentBudgetStatus = String(budgetReport.status || '').toLowerCase();
    if (currentBudgetStatus !== 'pending') {
        showToast('Only pending budget requests can be reviewed.', 'warning');
        return;
    }

    const actionLabel = normalizedStatus === 'approved' ? 'approve' : 'reject';
    if (!window.confirm(`Are you sure you want to ${actionLabel} this budget request?`)) return;

    let reviewNotes = normalizedStatus === 'approved' ? 'Approved by Supervisor' : 'Rejected by Supervisor';
    if (normalizedStatus === 'rejected') {
        const note = window.prompt('Optional rejection reason:', reviewNotes);
        if (note && note.trim()) reviewNotes = note.trim();
    }

    const approveBtn = document.getElementById('approveBudgetBtn');
    const rejectBtn = document.getElementById('rejectBudgetBtn');
    if (approveBtn) approveBtn.disabled = true;
    if (rejectBtn) rejectBtn.disabled = true;

    try {
        const response = await API.post(`/budget-reports/${budgetReport.id}/review`, {
            status: normalizedStatus,
            review_notes: reviewNotes
        });

        if (response.status === 'success') {
            showToast(`Budget ${actionLabel}d successfully.`, normalizedStatus === 'approved' ? 'success' : 'warning');
            await loadAll();
        } else {
            showToast(response.message || 'Failed to review budget request.', 'error');
        }
    } catch (error) {
        console.error('reviewBudget error:', error);
        showToast('An error occurred while reviewing the budget request.', 'error');
    } finally {
        if (approveBtn) approveBtn.disabled = false;
        if (rejectBtn) rejectBtn.disabled = false;
    }
}

function openPartsModal() {
    if (!isTechnicalOfficer() || !ticketData) {
        showToast('Only Technical Officers can request spare parts from this page.', 'warning');
        return;
    }

    const ticketIdFormatted = window.FaultTicketDetailTemplate?.formatTicketDisplayId
        ? window.FaultTicketDetailTemplate.formatTicketDisplayId(ticketData)
        : (ticketData.breakdown_report_id || ticketData.ticket_id || `#${ticketData.id}`);

    const requestingTicketIdField = document.getElementById('requestingTicketId');
    const relatedTicketIdField = document.getElementById('relatedTicketId');
    const equipmentInput = document.getElementById('equipmentInput');
    const locationInput = document.getElementById('locationInput');
    const reportedByInput = document.getElementById('reportedByInput');
    const reportedDateInput = document.getElementById('reportedDateInput');
    const originalIssueTextarea = document.getElementById('originalIssueTextarea');
    const prioritySelect = document.getElementById('prioritySelect');
    const additionalNotesTextarea = document.getElementById('additionalNotesTextarea');
    const sparePartsContainer = document.getElementById('sparePartsContainer');

    if (requestingTicketIdField) requestingTicketIdField.value = String(ticketData.id);
    if (relatedTicketIdField) relatedTicketIdField.value = ticketIdFormatted;

    const assetName = window.FaultTicketDetailTemplate?.formatEquipmentLabel
        ? window.FaultTicketDetailTemplate.formatEquipmentLabel(ticketData)
        : getFallbackEquipmentLabel(ticketData);
    if (equipmentInput) {
        equipmentInput.value = assetName;
        equipmentInput.readOnly = true;
        equipmentInput.style.backgroundColor = '#f0f0f0';
    }

    if (locationInput) locationInput.value = ticketData.location || '';
    if (reportedByInput) reportedByInput.value = ticketData.reported_by_name || ticketData.reporter_full_name || 'Unknown';
    if (reportedDateInput) {
        reportedDateInput.value = ticketData.created_at
            ? new Date(ticketData.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
            : '';
    }
    if (originalIssueTextarea) originalIssueTextarea.value = ticketData.description || '';
    if (additionalNotesTextarea) additionalNotesTextarea.value = '';

    if (prioritySelect) {
        const priorityValue = String(ticketData.priority || 'medium').toLowerCase();
        prioritySelect.value = ['low', 'medium', 'high', 'critical'].includes(priorityValue) ? priorityValue : 'medium';
    }

    const noPartsCheckbox = document.getElementById('noSparePartsNeeded');
    if (noPartsCheckbox) {
        noPartsCheckbox.checked = false;
        toggleSparePartsSection(false);
    }

    (async () => {
        if (!sparePartsContainer) {
            return;
        }

        try {
            const productsRes = await API.get('/products');
            const products = (productsRes?.status === 'success' && Array.isArray(productsRes?.data?.products))
                ? productsRes.data.products
                : (Array.isArray(productsRes?.data) ? productsRes.data : []);

            cachedSparePartOptionsHtml = products.length > 0
                ? products.map((product) => `<option value="${product.sparepart_id}">${product.name} — ${product.sparepart_id}</option>`).join('')
                : '';
        } catch (error) {
            console.error('Could not load spare parts list from API:', error);
            cachedSparePartOptionsHtml = '';
        }

        sparePartsContainer.innerHTML = buildSparePartRow(false);
        attachAvailabilityListeners(sparePartsContainer);
    })();

    document.getElementById('partsModal')?.classList.add('active');
}

function closePartsModal() {
    document.getElementById('partsModal')?.classList.remove('active');
}

async function checkSparePartAvailability(partCode, quantity) {
    try {
        const response = await API.post('/spare-part-requests/check-availability', {
            items: [{ part_code: partCode, quantity }]
        });

        if (response?.status === 'success' && response.data?.items?.length > 0) {
            return response.data.items[0];
        }

        return null;
    } catch (error) {
        console.error('Availability check failed:', error);
        return null;
    }
}

function updateAvailabilityBadge(row, result) {
    const badge = row.querySelector('.availability-badge');
    if (!badge) {
        return;
    }

    if (!result) {
        badge.innerHTML = '';
        badge.className = 'availability-badge';
        return;
    }

    let badgeClass = '';
    let badgeText = '';
    let icon = '';

    switch (result.status) {
        case 'available':
            badgeClass = 'badge-success';
            icon = '✓';
            badgeText = `In Stock (${result.available_qty} available)`;
            break;
        case 'insufficient':
            badgeClass = 'badge-warning';
            icon = '⚠';
            badgeText = `Low Stock (${result.available_qty} available, ${result.requested_qty} requested)`;
            break;
        case 'out_of_stock':
            badgeClass = 'badge-danger';
            icon = '✗';
            badgeText = 'Out of Stock';
            break;
        case 'not_found':
            badgeClass = 'badge-danger';
            icon = '✗';
            badgeText = 'Not in Catalog';
            break;
        default:
            badge.innerHTML = '';
            badge.className = 'availability-badge';
            return;
    }

    badge.className = `availability-badge ${badgeClass}`;
    badge.innerHTML = `<span class="badge-icon">${icon}</span> ${badgeText}`;
}

function attachAvailabilityListeners(container) {
    const rows = container.querySelectorAll('.spare-part-item');
    rows.forEach((row) => {
        const select = row.querySelector('.form-select');
        const quantityInput = row.querySelector('input[type="number"]');

        if (select && !select.dataset.availabilityBound) {
            select.dataset.availabilityBound = 'true';
            select.addEventListener('change', async () => {
                const partCode = select.value;
                const quantity = quantityInput ? Number.parseInt(quantityInput.value, 10) || 1 : 1;
                if (partCode) {
                    const result = await checkSparePartAvailability(partCode, quantity);
                    updateAvailabilityBadge(row, result);
                } else {
                    updateAvailabilityBadge(row, null);
                }
            });
        }

        if (quantityInput && !quantityInput.dataset.availabilityBound) {
            quantityInput.dataset.availabilityBound = 'true';
            let debounceTimer = null;
            quantityInput.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(async () => {
                    const partCode = select ? select.value : '';
                    const quantity = Number.parseInt(quantityInput.value, 10) || 1;
                    if (partCode) {
                        const result = await checkSparePartAvailability(partCode, quantity);
                        updateAvailabilityBadge(row, result);
                    }
                }, 300);
            });
        }
    });
}

function buildSparePartRow(removable = false, required = true) {
    const removeBtn = removable
        ? '<button type="button" onclick="this.parentElement.remove()" style="position:absolute;top:10px;right:10px;background:var(--danger);color:white;border:none;border-radius:50%;width:25px;height:25px;cursor:pointer;font-size:14px;">×</button>'
        : '';
    const requiredAttr = required ? ' required' : '';

    return `
        <div class="spare-part-item" style="background:#f8f9fa;border-radius:8px;padding:15px;margin-bottom:10px;position:relative;">
            ${removeBtn}
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">Part Name</label>
                    <select class="form-select"${requiredAttr}>
                        <option value="">Select Part</option>
                        ${cachedSparePartOptionsHtml}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Quantity</label>
                    <input type="number" class="form-input" min="1" placeholder="Qty" value="1"${requiredAttr}>
                </div>
            </div>
            <div class="availability-badge" style="margin-top:8px;font-size:0.85rem;"></div>
        </div>
    `;
}

function addPartField() {
    const container = document.getElementById('sparePartsContainer');
    if (!container) {
        return;
    }

    const noPartsChecked = document.getElementById('noSparePartsNeeded')?.checked || false;
    const rowHtml = buildSparePartRow(true, !noPartsChecked);
    container.insertAdjacentHTML('beforeend', rowHtml);
    attachAvailabilityListeners(container);
}

function toggleSparePartsSection(isChecked) {
    const section = document.getElementById('sparePartsSection');
    if (!section) {
        return;
    }

    section.style.display = isChecked ? 'none' : 'block';
    section.querySelectorAll('select, input').forEach((element) => {
        element.required = !isChecked;
    });
}

async function submitPartsRequest(event) {
    event.preventDefault();

    if (!isTechnicalOfficer()) {
        showToast('Only Technical Officers can submit spare part requests from this page.', 'warning');
        return;
    }

    const submitButton = document.getElementById('partsSubmitBtn');
    const form = document.getElementById('requestPartsForm');
    const ticketId = document.getElementById('requestingTicketId')?.value;
    const noSparePartsNeeded = document.getElementById('noSparePartsNeeded')?.checked || false;
    const sparePartItems = [];

    if (!noSparePartsNeeded) {
        const partRows = document.querySelectorAll('#sparePartsContainer .spare-part-item');
        partRows.forEach((row) => {
            const select = row.querySelector('.form-select');
            const qtyInput = row.querySelector('input[type="number"]');

            if (select && select.value) {
                const selectedOption = select.options[select.selectedIndex];
                sparePartItems.push({
                    part_code: select.value,
                    part_name: selectedOption.text || select.value,
                    quantity: qtyInput ? Number.parseInt(qtyInput.value, 10) || 1 : 1,
                });
            }
        });
    }

    if (!ticketId) {
        showToast('Unable to resolve ticket for this spare parts request.', 'error');
        return;
    }

    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    try {
        if (!noSparePartsNeeded) {
            if (sparePartItems.length === 0) {
                showToast('Please select at least one spare part, or check "No Spare Parts Needed".', 'error');
                return;
            }

            try {
                const availabilityResponse = await API.post('/spare-part-requests/check-availability', {
                    items: sparePartItems.map((item) => ({ part_code: item.part_code, quantity: item.quantity }))
                });

                if (availabilityResponse?.status === 'success' && availabilityResponse.data?.items) {
                    const unavailableItems = availabilityResponse.data.items.filter((item) => item.status === 'not_found');
                    const lowStockItems = availabilityResponse.data.items.filter((item) => item.status === 'insufficient' || item.status === 'out_of_stock');

                    if (unavailableItems.length > 0) {
                        const partNames = unavailableItems.map((item) => item.part_code).join(', ');
                        showToast(`Cannot submit: Parts not found in catalog: ${partNames}`, 'error');
                        return;
                    }

                    if (lowStockItems.length > 0) {
                        const warnings = lowStockItems.map((item) => `${item.part_code}: ${item.message}`).join('; ');
                        console.warn('Low stock warning:', warnings);
                    }
                }
            } catch (availabilityError) {
                console.warn('Availability check failed, proceeding with request:', availabilityError);
            }

            const ticketIdFormatted = window.FaultTicketDetailTemplate?.formatTicketDisplayId
                ? window.FaultTicketDetailTemplate.formatTicketDisplayId(ticketData)
                : (ticketData.breakdown_report_id || ticketData.ticket_id || null);

            const equipmentName = document.getElementById('equipmentInput')?.value || '';
            const locationVal = document.getElementById('locationInput')?.value || '';
            const priorityVal = document.getElementById('prioritySelect')?.value || 'Medium';
            const additionalNotes = document.getElementById('additionalNotesTextarea')?.value || '';

            const requestPayload = {
                fault_ticket_id: Number.parseInt(ticketId, 10),
                ticket_id_formatted: ticketIdFormatted,
                equipment_name: equipmentName,
                location: locationVal,
                priority: priorityVal,
                additional_notes: additionalNotes,
                items: sparePartItems,
            };

            const spareResponse = await API.post('/spare-part-requests', requestPayload);
            if (spareResponse?.status !== 'success') {
                showToast(spareResponse?.message || 'Failed to submit spare parts request.', 'error');
                return;
            }

            showToast('Spare parts request submitted to Inventory Manager. Waiting for approval.', 'success');
        } else {
            const response = await API.put(`/fault-tickets/${ticketId}`, {
                status: 'In Progress'
            });

            if (response?.status !== 'success') {
                showToast(response?.message || 'Status update failed. Please try again.', 'error');
                return;
            }

            showToast('No spare parts needed. Work started! Status changed to In Progress.', 'success');
        }

        closePartsModal();

        if (form) {
            form.reset();
        }

        const noPartsCheckbox = document.getElementById('noSparePartsNeeded');
        if (noPartsCheckbox) {
            noPartsCheckbox.checked = false;
            toggleSparePartsSection(false);
        }

        const equipmentInput = document.getElementById('equipmentInput');
        if (equipmentInput) {
            equipmentInput.readOnly = false;
            equipmentInput.style.backgroundColor = '';
        }

        const locationInput = document.getElementById('locationInput');
        if (locationInput) locationInput.value = '';
        const reportedByInput = document.getElementById('reportedByInput');
        if (reportedByInput) reportedByInput.value = '';
        const reportedDateInput = document.getElementById('reportedDateInput');
        if (reportedDateInput) reportedDateInput.value = '';
        const originalIssueTextarea = document.getElementById('originalIssueTextarea');
        if (originalIssueTextarea) originalIssueTextarea.value = '';
        const additionalNotesTextarea = document.getElementById('additionalNotesTextarea');
        if (additionalNotesTextarea) additionalNotesTextarea.value = '';
        const requestingTicketIdField = document.getElementById('requestingTicketId');
        if (requestingTicketIdField) requestingTicketIdField.value = '';
        const sparePartsContainer = document.getElementById('sparePartsContainer');
        if (sparePartsContainer) sparePartsContainer.innerHTML = '';

        await loadAll();
    } catch (error) {
        console.error('submitPartsRequest error:', error);
        showToast(error.message || 'Failed to submit request. Please try again.', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Submit & Start Work';
    }
}

function openStartWorkModal() {
    if (!isTechnicalOfficer()) {
        showToast('Only Technical Officers can start fault ticket work from this page.', 'warning');
        return;
    }

    if (!ticketData?.id) {
        showToast('Ticket data is not ready yet.', 'warning');
        return;
    }

    const normalizedStatus = normaliseStatus(ticketData.status);
    if (normalizedStatus !== 'parts approved') {
        showToast('Work can only be started after spare parts are approved.', 'warning');
        return;
    }

    const ticketIdFormatted = window.FaultTicketDetailTemplate?.formatTicketDisplayId
        ? window.FaultTicketDetailTemplate.formatTicketDisplayId(ticketData)
        : (ticketData.breakdown_report_id || ticketData.ticket_id || `#${ticketData.id}`);

    const processTicketId = document.getElementById('processTicketId');
    const assessmentField = document.getElementById('processInitialAssessment');
    const estimatedCompletionField = document.getElementById('processEstimatedCompletion');

    if (processTicketId) processTicketId.value = ticketIdFormatted;
    if (assessmentField) assessmentField.value = '';

    if (estimatedCompletionField) {
        const now = new Date();
        now.setSeconds(0, 0);
        const localDateTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000))
            .toISOString()
            .slice(0, 16);

        estimatedCompletionField.min = localDateTime;
        estimatedCompletionField.value = '';
    }

    document.getElementById('processTicketModal')?.classList.add('active');
}

function closeStartWorkModal() {
    document.getElementById('processTicketModal')?.classList.remove('active');
}

async function submitStartWork(event) {
    event.preventDefault();

    if (!isTechnicalOfficer()) {
        showToast('Only Technical Officers can start fault ticket work from this page.', 'warning');
        return;
    }

    if (!ticketData?.id) {
        showToast('Ticket data is not ready yet.', 'warning');
        return;
    }

    const normalizedStatus = normaliseStatus(ticketData.status);
    if (normalizedStatus !== 'parts approved') {
        showToast('Work can only be started after spare parts are approved.', 'warning');
        return;
    }

    const assessment = String(document.getElementById('processInitialAssessment')?.value || '').trim();
    const estimatedCompletion = String(document.getElementById('processEstimatedCompletion')?.value || '').trim();
    const submitButton = document.getElementById('processTicketSubmitBtn');

    if (!assessment) {
        showToast('Initial assessment is required.', 'error');
        return;
    }

    if (!estimatedCompletion) {
        showToast('Estimated completion time is required.', 'error');
        return;
    }

    const estimatedDate = new Date(estimatedCompletion);
    if (Number.isNaN(estimatedDate.getTime())) {
        showToast('Estimated completion time is invalid.', 'error');
        return;
    }

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';
    }

    try {
        const response = await API.put(`/fault-tickets/${ticketData.id}`, {
            status: 'In Progress'
        });

        if (response?.status !== 'success') {
            showToast(response?.message || 'Failed to start work. Please try again.', 'error');
            return;
        }

        closeStartWorkModal();
        showToast('Work started! Status changed to In Progress.', 'success');
        await loadAll();
    } catch (error) {
        console.error('submitStartWork error:', error);
        showToast('Failed to start work. Please try again.', 'error');
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-play"></i> Start Work &amp; Update Status';
        }
    }
}

function openCompleteModal() {
    if (!isTechnicalOfficer()) {
        showToast('Only Technical Officers can resolve tickets from this page.', 'warning');
        return;
    }

    if (!ticketData?.id) {
        showToast('Ticket data is not ready yet.', 'warning');
        return;
    }

    const ticketIdFormatted = window.FaultTicketDetailTemplate?.formatTicketDisplayId
        ? window.FaultTicketDetailTemplate.formatTicketDisplayId(ticketData)
        : (ticketData.breakdown_report_id || ticketData.ticket_id || `#${ticketData.id}`);

    const updateTicketIdField = document.getElementById('updateTicketId');
    if (updateTicketIdField) updateTicketIdField.value = ticketIdFormatted;

    const timeSpentField = document.getElementById('completeTimeSpent');
    if (timeSpentField) timeSpentField.value = '';
    const machineDescriptionField = document.getElementById('completeMachineDescription');
    if (machineDescriptionField) machineDescriptionField.value = '';

    const container = document.getElementById('updatePartsUsedContainer');
    if (container) {
        const requestedParts = [];

        if (Array.isArray(sparePartRequests)) {
            sparePartRequests.forEach((request) => {
                if (Array.isArray(request?.items)) {
                    request.items.forEach((item) => {
                        const partLabel = String(item?.part_name || item?.part_code || '').trim();
                        if (partLabel) requestedParts.push(partLabel);
                    });
                }
            });
        }

        const uniqueParts = [...new Set(requestedParts)];

        if (uniqueParts.length > 0) {
            container.innerHTML = uniqueParts.map((partName) => `
                <label style="display: flex; align-items: center; gap: 10px; padding: 8px 4px; border-bottom: 1px solid #eee; cursor: pointer; font-size: 0.95rem;">
                    <input type="checkbox" name="partsUsed" value="${escapeHtml(partName)}" style="width: 18px; height: 18px; accent-color: var(--tang-blue);">
                    <span>${escapeHtml(partName)}</span>
                </label>
            `).join('');
        } else {
            container.innerHTML = '<p style="color: #999; font-size: 0.9rem; margin: 0;">No spare parts were requested for this ticket.</p>';
        }
    }

    document.getElementById('completeModal')?.classList.add('active');
}

function closeCompleteModal() {
    document.getElementById('completeModal').classList.remove('active');
}

async function submitComplete(event) {
    event.preventDefault();

    if (!isTechnicalOfficer()) {
        showToast('Only Technical Officers can resolve tickets from this page.', 'warning');
        return;
    }

    if (!ticketData?.id) {
        showToast('Ticket data is not ready yet.', 'warning');
        return;
    }

    const machineDescription = document.getElementById('completeMachineDescription')?.value.trim() || '';
    const timeSpent = Number.parseFloat(document.getElementById('completeTimeSpent')?.value || '0');

    if (!machineDescription) {
        showToast('Please provide machine description.', 'error');
        return;
    }

    if (!timeSpent || timeSpent <= 0) {
        showToast('Please provide valid time spent.', 'error');
        return;
    }

    const checkedParts = Array.from(document.querySelectorAll('#updatePartsUsedContainer input[name="partsUsed"]:checked'))
        .map((checkbox) => String(checkbox.value || '').trim())
        .filter(Boolean);

    const submitButton = document.getElementById('completeSubmitBtn');
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
        const workUpdateResponse = await API.post('/ticket-work-updates', {
            ticket_id: ticketData.id,
            parts_used: checkedParts.join(', '),
            time_spent: timeSpent,
            machine_description: machineDescription,
            work_status: 'Completed'
        });

        if (workUpdateResponse?.status !== 'success') {
            showToast(workUpdateResponse?.message || 'Failed to save work update.', 'error');
            return;
        }

        const response = await API.put(`/fault-tickets/${ticketData.id}`, {
            status: 'Resolved',
            resolution_notes: machineDescription
        });

        if (response.status === 'success') {
            showToast('Work completed and ticket marked as resolved.', 'success');
            closeCompleteModal();

            const completeForm = document.getElementById('completeForm');
            if (completeForm) completeForm.reset();

            await loadAll();
        } else {
            showToast(response.message || 'Work update saved but failed to mark ticket as resolved.', 'warning');
        }
    } catch (error) {
        console.error('submitComplete error:', error);
        showToast(error.message || 'Failed to finish work. Please try again.', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-check-circle"></i> Finish';
    }
}

function getAssignModalElements() {
    return {
        modal: document.getElementById('assignModal'),
        form: document.getElementById('assignForm'),
        openButton: document.getElementById('assignTicketBtn'),
        closeButton: document.querySelector('#assignModal .modal-close'),
        ticketDisplay: document.getElementById('assignTicketDisplay'),
        priority: document.getElementById('assignPriority'),
        expectedCompletion: document.getElementById('assignExpectedCompletion'),
        notes: document.getElementById('assignNotes'),
        submitButton: document.getElementById('assignSubmitBtn'),
    };
}

function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function applyAssignExpectedCompletionConstraints({ defaultToToday = false } = {}) {
    const expectedDateInput = document.getElementById('assignExpectedCompletion');
    if (!expectedDateInput) {
        return;
    }

    const today = getTodayDateString();
    expectedDateInput.min = today;

    if (defaultToToday && !String(expectedDateInput.value || '').trim()) {
        expectedDateInput.value = today;
    }

    if (expectedDateInput.value && expectedDateInput.value < today) {
        expectedDateInput.setCustomValidity('Expected completion date cannot be in the past.');
        return;
    }

    expectedDateInput.setCustomValidity('');
}

function bindAssignModalFallbackHandlers() {
    const assignElements = getAssignModalElements();

    if (assignElements.openButton
        && typeof assignElements.openButton.onclick !== 'function'
        && assignElements.openButton.dataset.assignFallbackBound !== 'true') {
        assignElements.openButton.dataset.assignFallbackBound = 'true';
        assignElements.openButton.addEventListener('click', (event) => {
            event.preventDefault();
            void openAssignModal();
        });
    }

    if (assignElements.closeButton
        && typeof assignElements.closeButton.onclick !== 'function'
        && assignElements.closeButton.dataset.assignFallbackBound !== 'true') {
        assignElements.closeButton.dataset.assignFallbackBound = 'true';
        assignElements.closeButton.addEventListener('click', (event) => {
            event.preventDefault();
            closeAssignModal();
        });
    }

    if (assignElements.form
        && typeof assignElements.form.onsubmit !== 'function'
        && assignElements.form.dataset.assignFallbackBound !== 'true') {
        assignElements.form.dataset.assignFallbackBound = 'true';
        assignElements.form.addEventListener('submit', (event) => {
            void submitAssignment(event);
        });
    }

    if (assignElements.expectedCompletion
        && assignElements.expectedCompletion.dataset.assignDateValidationBound !== 'true') {
        assignElements.expectedCompletion.dataset.assignDateValidationBound = 'true';
        assignElements.expectedCompletion.addEventListener('input', () => {
            applyAssignExpectedCompletionConstraints();
        });
        assignElements.expectedCompletion.addEventListener('change', () => {
            applyAssignExpectedCompletionConstraints();
        });
    }
}

async function openAssignModal() {
    if (!isSupervisorLike()) {
        showToast('Only Supervisors can assign technicians from this page.', 'warning');
        return;
    }

    if (!ticketData?.id) {
        showToast('Ticket data is not ready yet.', 'warning');
        return;
    }

    if (isInsuranceClaimed(ticketData.status)) {
        showToast('This ticket is in insurance-claim workflow and cannot be assigned to technicians.', 'warning');
        return;
    }

    if (isRouteBreakdownTicket() && hasRouteGarageAssignment()) {
        showToast('Nearby garage is already approved. Technician assignment is not required.', 'warning');
        return;
    }

    if (isDashboardComponentMode()) {
        const context = getViewTicketContext();
        if (typeof context.onRequestAssignment === 'function') {
            const hasExistingAssignment = Array.isArray(ticketData.assignments) && ticketData.assignments.length > 0;

            try {
                const handled = context.onRequestAssignment({
                    ticketId: Number(ticketData.id),
                    isEdit: hasExistingAssignment,
                });

                if (handled !== false) {
                    return;
                }
            } catch (error) {
                console.error('Failed to delegate assignment to dashboard modal:', error);
            }
        }
    }

    const assignElements = getAssignModalElements();
    if (!assignElements.modal || !assignElements.ticketDisplay || !assignElements.priority || !assignElements.expectedCompletion || !assignElements.notes) {
        showToast('Assignment form is still loading. Please wait a moment and try again.', 'warning');
        return;
    }

    const ticketIdFormatted = window.FaultTicketDetailTemplate?.formatTicketDisplayId
        ? window.FaultTicketDetailTemplate.formatTicketDisplayId(ticketData)
        : (ticketData.breakdown_report_id || ticketData.ticket_id || `#${ticketData.id}`);

    assignElements.ticketDisplay.value = ticketIdFormatted;
    assignElements.priority.value = String(ticketData.priority || 'Medium').toLowerCase();
    assignElements.notes.value = '';

    const expectedDateInput = assignElements.expectedCompletion;
    const existingAssignment = Array.isArray(ticketData.assignments) && ticketData.assignments.length > 0
        ? ticketData.assignments[0]
        : null;

    expectedDateInput.value = existingAssignment?.expected_completion_date || '';
    if (existingAssignment?.notes) {
        assignElements.notes.value = existingAssignment.notes;
    }

    applyAssignExpectedCompletionConstraints({ defaultToToday: !existingAssignment });

    await loadTechniciansForAssignment();
    updateAssignSelectionWarning();
    assignElements.modal.classList.add('active');
}

function closeAssignModal() {
    const assignModal = document.getElementById('assignModal');
    if (assignModal) {
        assignModal.classList.remove('active');
    }
}

async function openDriverNearbyGarages() {
    if (!isDriver()) {
        showToast('Nearby garages can be viewed from the Driver role only.', 'warning');
        return;
    }

    if (!ticketData?.id || !isRouteBreakdownTicket()) {
        showToast('Nearby garages are available only for route breakdown tickets.', 'warning');
        return;
    }

    await loadRouteBreakdownContext();

    const routeBreakdownId = getRouteBreakdownNumericId();
    const breakdownPayload = buildGarageApprovalBreakdownPayload(routeBreakdownId || null);
    const context = getViewTicketContext();

    if (isDashboardComponentMode() && typeof context.onRequestNearbyGarages === 'function') {
        try {
            const handled = context.onRequestNearbyGarages({
                ticketId: Number(ticketData.id),
                routeBreakdownId: routeBreakdownId > 0 ? routeBreakdownId : null,
                breakdown: breakdownPayload,
            });

            if (handled !== false) {
                return;
            }
        } catch (error) {
            console.error('Failed to delegate nearby garages to dashboard modal:', error);
        }
    }

    if (window.DriverUtils && typeof window.DriverUtils.openModal === 'function') {
        window.DriverUtils.openModal('nearbyGaragesModal', {
            mode: 'browse',
            breakdown: breakdownPayload,
        });
        return;
    }

    showToast('Nearby garages are available only from the Driver dashboard.', 'warning');
}

async function openDriverGarageEntry() {
    if (!isDriver()) {
        showToast('Garage entry can be logged from the Driver role only.', 'warning');
        return;
    }

    if (!ticketData?.id || !isRouteBreakdownTicket()) {
        showToast('Garage entry is available only for route breakdown tickets.', 'warning');
        return;
    }

    await loadRouteBreakdownContext();

    if (getRouteGarageWorkflowStatus() !== 'garage_approved') {
        showToast('Garage entry can be logged only after nearby garage approval.', 'warning');
        return;
    }

    const approvedGarageId = Number(
        routeBreakdownContext?.garage_workflow?.approved_garage?.id
        || routeBreakdownContext?.approved_garage_id
        || ticketData?.route_approved_garage_id
        || 0
    );

    if (!approvedGarageId) {
        showToast('No approved garage found for this route breakdown.', 'warning');
        return;
    }

    const routeBreakdownId = getRouteBreakdownNumericId();
    const breakdownPayload = buildGarageApprovalBreakdownPayload(routeBreakdownId || null);
    const context = getViewTicketContext();

    if (isDashboardComponentMode() && typeof context.onRequestGarageEntry === 'function') {
        try {
            const handled = context.onRequestGarageEntry({
                ticketId: Number(ticketData.id),
                routeBreakdownId: routeBreakdownId > 0 ? routeBreakdownId : null,
                breakdown: breakdownPayload,
            });

            if (handled !== false) {
                return;
            }
        } catch (error) {
            console.error('Failed to delegate garage entry to dashboard modal:', error);
        }
    }

    if (window.DriverUtils && typeof window.DriverUtils.openModal === 'function') {
        window.DriverUtils.openModal('nearbyGaragesModal', {
            mode: 'entry',
            breakdown: breakdownPayload,
        });
        return;
    }

    showToast('Garage entry logging is available only from the Driver dashboard.', 'warning');
}

async function openDriverGarageProgress() {
    if (!isDriver()) {
        showToast('Garage progress updates can be submitted from the Driver role only.', 'warning');
        return;
    }

    if (!ticketData?.id || !isRouteBreakdownTicket()) {
        showToast('Garage progress updates are available only for route breakdown tickets.', 'warning');
        return;
    }

    await loadRouteBreakdownContext();

    const routeWorkflowStatus = getRouteGarageWorkflowStatus();
    if (!isDriverGarageRepairStage(routeWorkflowStatus)) {
        showToast('Garage progress can be updated after garage entry is logged.', 'warning');
        return;
    }

    const routeBreakdownId = getRouteBreakdownNumericId();
    const breakdownPayload = buildGarageApprovalBreakdownPayload(routeBreakdownId || null);
    const context = getViewTicketContext();

    if (isDashboardComponentMode() && typeof context.onRequestGarageProgress === 'function') {
        try {
            const handled = context.onRequestGarageProgress({
                ticketId: Number(ticketData.id),
                routeBreakdownId: routeBreakdownId > 0 ? routeBreakdownId : null,
                breakdown: breakdownPayload,
            });

            if (handled !== false) {
                return;
            }
        } catch (error) {
            console.error('Failed to delegate garage progress modal to dashboard context:', error);
        }
    }

    if (window.DriverUtils && typeof window.DriverUtils.openModal === 'function') {
        window.DriverUtils.openModal('garageProgressModal', {
            breakdown: breakdownPayload,
        });
        return;
    }

    showToast('Garage progress updates are available only from the Driver dashboard.', 'warning');
}

async function openDriverCompleteRepair() {
    if (!isDriver()) {
        showToast('Repair completion can be submitted from the Driver role only.', 'warning');
        return;
    }

    if (!ticketData?.id || !isRouteBreakdownTicket()) {
        showToast('Repair completion is available only for route breakdown tickets.', 'warning');
        return;
    }

    await loadRouteBreakdownContext();

    const routeWorkflowStatus = getRouteGarageWorkflowStatus();
    if (!isDriverGarageRepairStage(routeWorkflowStatus)) {
        showToast('Complete repair is available only when garage repair is in progress.', 'warning');
        return;
    }

    const routeBreakdownId = getRouteBreakdownNumericId();
    const breakdownPayload = buildGarageApprovalBreakdownPayload(routeBreakdownId || null);
    const context = getViewTicketContext();

    if (isDashboardComponentMode() && typeof context.onRequestGarageComplete === 'function') {
        try {
            const handled = context.onRequestGarageComplete({
                ticketId: Number(ticketData.id),
                routeBreakdownId: routeBreakdownId > 0 ? routeBreakdownId : null,
                breakdown: breakdownPayload,
            });

            if (handled !== false) {
                return;
            }
        } catch (error) {
            console.error('Failed to delegate complete repair modal to dashboard context:', error);
        }
    }

    if (window.DriverUtils && typeof window.DriverUtils.openModal === 'function') {
        window.DriverUtils.openModal('completeBreakdownModal', {
            breakdown: breakdownPayload,
        });
        return;
    }

    showToast('Repair completion is available only from the Driver dashboard.', 'warning');
}

function buildGarageApprovalBreakdownPayload(routeBreakdownId = null) {
    const numericRouteBreakdownId = Number(routeBreakdownId || getRouteBreakdownNumericId() || 0);
    const coordinates = getRouteTicketCoordinates();
    const routeLocationLabel = getRouteTicketLocationLabel();
    const routeIssueDescription = getRouteTicketIssueDescription();
    const fallbackBreakdownCode = routeBreakdownContext?.route_breakdown_id
        || ticketData?.breakdown_context?.route_breakdown_id
        || ticketData?.breakdown_report_id
        || (numericRouteBreakdownId > 0 ? `RBD-${numericRouteBreakdownId}` : '');

    return {
        ...(routeBreakdownContext || {}),
        id: numericRouteBreakdownId > 0 ? numericRouteBreakdownId : null,
        route_breakdown_id: fallbackBreakdownCode,
        breakdownId: fallbackBreakdownCode,
        identifier: routeBreakdownContext?.number_plate
            || ticketData?.breakdown_context?.number_plate
            || ticketData?.number_plate
            || `Vehicle #${ticketData?.vehicle_id || 'N/A'}`,
        number_plate: routeBreakdownContext?.number_plate
            || ticketData?.breakdown_context?.number_plate
            || ticketData?.number_plate
            || '',
        reportedBy: routeBreakdownContext?.driver_name
            || ticketData?.breakdown_context?.reporter_name
            || ticketData?.reported_by_name
            || ticketData?.reporter_full_name
            || 'Unknown',
        driver_name: routeBreakdownContext?.driver_name
            || ticketData?.breakdown_context?.reporter_name
            || ticketData?.reported_by_name
            || ticketData?.reporter_full_name
            || '',
        breakdown_location: routeLocationLabel,
        description: routeIssueDescription || routeBreakdownContext?.description || ticketData?.description || '',
        breakdown_latitude: routeBreakdownContext?.breakdown_latitude
            ?? routeBreakdownContext?.latitude
            ?? ticketData?.breakdown_context?.breakdown_latitude
            ?? ticketData?.breakdown_context?.latitude
            ?? ticketData?.breakdown_latitude
            ?? (Array.isArray(coordinates) ? coordinates[0] : null),
        breakdown_longitude: routeBreakdownContext?.breakdown_longitude
            ?? routeBreakdownContext?.longitude
            ?? ticketData?.breakdown_context?.breakdown_longitude
            ?? ticketData?.breakdown_context?.longitude
            ?? ticketData?.breakdown_longitude
            ?? (Array.isArray(coordinates) ? coordinates[1] : null),
        raw: routeBreakdownContext || ticketData?.breakdown_context || null,
    };
}

function renderGarageApprovalMeta(breakdownPayload) {
    const meta = document.getElementById('garageApprovalMeta');
    if (!meta) {
        return;
    }

    const locationLabel = String(breakdownPayload?.breakdown_location || '').trim();
    const descriptionLabel = String(breakdownPayload?.description || '').trim();

    meta.innerHTML = `
        <div style="background:#f8fafc; border:1px solid #dbeafe; border-radius:8px; padding:12px;">
            <div><strong>Route Breakdown:</strong> ${escapeHtml(breakdownPayload?.breakdownId || breakdownPayload?.route_breakdown_id || `RBD-${breakdownPayload?.id || 'N/A'}`)}</div>
            <div><strong>Vehicle:</strong> ${escapeHtml(breakdownPayload?.identifier || breakdownPayload?.number_plate || `Vehicle #${ticketData?.vehicle_id || 'N/A'}`)}</div>
            <div><strong>Driver:</strong> ${escapeHtml(breakdownPayload?.reportedBy || breakdownPayload?.driver_name || 'N/A')}</div>
            ${locationLabel ? `<div><strong>Reported Location:</strong> ${escapeHtml(locationLabel)}</div>` : ''}
            ${descriptionLabel ? `<div><strong>Description:</strong> ${escapeHtml(descriptionLabel)}</div>` : ''}
        </div>
    `;
}

async function openGarageApprovalModal() {
    if (!isSupervisorLike()) {
        showToast('Only Supervisors can approve nearby garages from this page.', 'warning');
        return;
    }

    if (!ticketData?.id || !isRouteBreakdownTicket()) {
        showToast('Nearby garage approval is only available for route breakdown tickets.', 'warning');
        return;
    }

    if (isInsuranceClaimed(ticketData.status)) {
        showToast('This ticket is already in insurance-claim workflow.', 'warning');
        return;
    }

    await loadRouteBreakdownContext();

    if (hasRouteGarageAssignment()) {
        showToast('A nearby garage is already approved for this route breakdown.', 'warning');
        return;
    }

    const routeBreakdownId = getRouteBreakdownNumericId();
    const breakdownPayload = buildGarageApprovalBreakdownPayload(routeBreakdownId || null);

    const context = getViewTicketContext();
    if (typeof context.onRequestGarageApproval === 'function') {
        try {
            const handled = context.onRequestGarageApproval({
                ticketId: Number(ticketData.id),
                routeBreakdownId: routeBreakdownId > 0 ? routeBreakdownId : null,
                breakdown: breakdownPayload,
            });

            if (handled !== false) {
                return;
            }
        } catch (error) {
            console.error('Failed to delegate garage approval to dashboard modal:', error);
        }
    }

    if (!routeBreakdownId) {
        showToast('Unable to resolve the route breakdown ID for garage approval.', 'error');
        return;
    }

    const modal = document.getElementById('garageApprovalModal');
    if (!modal) {
        showToast('Garage approval form is not available on this page.', 'error');
        return;
    }

    const routeBreakdownInput = document.getElementById('garageApprovalBreakdownId');
    if (routeBreakdownInput) {
        routeBreakdownInput.value = String(routeBreakdownId);
    }

    renderGarageApprovalMeta(breakdownPayload);

    const notesField = document.getElementById('garageApprovalNotes');
    if (notesField) {
        notesField.value = '';
    }

    modal.classList.add('active');
    await loadGaragesForRouteApproval();
    updateGarageApprovalSelectionWarning();
    await renderGarageApprovalMap();
}

function closeGarageApprovalModal() {
    const modal = document.getElementById('garageApprovalModal');
    if (modal) {
        modal.classList.remove('active');
    }

    const warning = document.getElementById('garageApprovalSelectionWarning');
    if (warning) {
        warning.style.display = 'none';
    }

    destroyRouteGarageMap();
}

async function loadGaragesForRouteApproval() {
    const selectEl = document.getElementById('garageApprovalSelect');
    if (!selectEl) {
        return;
    }

    selectEl.innerHTML = '<option value="">Loading garages...</option>';

    try {
        const response = await API.get('/garages');
        const garages = Array.isArray(response?.data?.garages)
            ? response.data.garages
            : (Array.isArray(response?.data) ? response.data : []);

        const breakdownCoordinates = getRouteBreakdownCoordinates();
        availableRouteGarages = rankGaragesByDistance(garages, breakdownCoordinates);

        if (!availableRouteGarages.length) {
            selectEl.innerHTML = '<option value="">No garages available</option>';
            return;
        }

        const preselectedGarageId = Number(
            routeBreakdownContext?.garage_workflow?.approved_garage?.id
            || routeBreakdownContext?.approved_garage_id
            || ticketData?.route_approved_garage_id
            || 0
        );

        selectEl.innerHTML = `
            <option value="">Select a garage</option>
            ${availableRouteGarages.map((garage) => {
            const name = garage.name || `Garage #${garage.id}`;
            const address = garage.address || 'Address not available';
            const distanceLabel = formatGarageDistance(garage.distance_km);
            return `
                <option value="${Number(garage.id)}" ${preselectedGarageId === Number(garage.id) ? 'selected' : ''}>
                    ${escapeHtml(name)} - ${escapeHtml(address)}${distanceLabel ? ` (${escapeHtml(distanceLabel)} away)` : ''}
                </option>
            `;
            }).join('')}
        `;

        syncGarageSelectionOnMap(Number(selectEl.value || 0));
    } catch (error) {
        console.error('loadGaragesForRouteApproval error:', error);
        selectEl.innerHTML = '<option value="">Failed to load garages</option>';
    }
}

function updateGarageApprovalSelectionWarning() {
    const warning = document.getElementById('garageApprovalSelectionWarning');
    if (!warning) {
        return;
    }

    const selectedGarageId = Number(document.getElementById('garageApprovalSelect')?.value || 0);
    warning.style.display = selectedGarageId > 0 ? 'none' : 'block';

    syncGarageSelectionOnMap(selectedGarageId);
}

function getRouteBreakdownCoordinates() {
    return getRouteTicketCoordinates();
}

function computeGarageDistanceKm(garage, originCoordinates) {
    if (!originCoordinates || !Array.isArray(originCoordinates)) {
        return null;
    }

    const garageCoordinates = parseCoordinatePair(garage?.latitude, garage?.longitude);
    if (!garageCoordinates) {
        return null;
    }

    const toRadians = (degrees) => (degrees * Math.PI) / 180;
    const earthRadiusKm = 6371;

    const [originLatitude, originLongitude] = originCoordinates;
    const [garageLatitude, garageLongitude] = garageCoordinates;

    const deltaLatitude = toRadians(garageLatitude - originLatitude);
    const deltaLongitude = toRadians(garageLongitude - originLongitude);
    const startLatitude = toRadians(originLatitude);
    const endLatitude = toRadians(garageLatitude);

    const a = Math.sin(deltaLatitude / 2) ** 2
        + Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(deltaLongitude / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
}

function rankGaragesByDistance(garages, originCoordinates) {
    const normalizedGarages = Array.isArray(garages) ? garages : [];

    return normalizedGarages
        .map((garage) => ({
            ...garage,
            distance_km: computeGarageDistanceKm(garage, originCoordinates),
        }))
        .sort((first, second) => {
            const firstDistance = Number.isFinite(first.distance_km) ? first.distance_km : Number.POSITIVE_INFINITY;
            const secondDistance = Number.isFinite(second.distance_km) ? second.distance_km : Number.POSITIVE_INFINITY;

            if (firstDistance !== secondDistance) {
                return firstDistance - secondDistance;
            }

            return String(first.name || '').localeCompare(String(second.name || ''));
        });
}

function formatGarageDistance(distanceKm) {
    if (!Number.isFinite(distanceKm)) {
        return '';
    }

    if (distanceKm < 1) {
        return `${Math.max(50, Math.round(distanceKm * 1000))} m`;
    }

    return `${distanceKm.toFixed(1)} km`;
}

function destroyRouteGarageMap() {
    if (routeGarageMap && typeof routeGarageMap.remove === 'function') {
        routeGarageMap.remove();
    }

    routeGarageMap = null;
    routeGarageMapGarageMarkers = [];
}

async function ensureLeafletForGarageMap() {
    if (typeof window.L !== 'undefined') {
        return true;
    }

    if (!routeGarageMapLeafletPromise) {
        routeGarageMapLeafletPromise = new Promise((resolve) => {
            const existingScript = document.getElementById('leaflet-script');
            if (existingScript) {
                existingScript.addEventListener('load', () => resolve(true), { once: true });
                existingScript.addEventListener('error', () => resolve(false), { once: true });
                return;
            }

            if (!document.getElementById('leaflet-stylesheet')) {
                const stylesheet = document.createElement('link');
                stylesheet.id = 'leaflet-stylesheet';
                stylesheet.rel = 'stylesheet';
                stylesheet.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(stylesheet);
            }

            const script = document.createElement('script');
            script.id = 'leaflet-script';
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.head.appendChild(script);
        });
    }

    return routeGarageMapLeafletPromise;
}

async function renderGarageApprovalMap() {
    const mapEl = document.getElementById('garageApprovalMap');
    const mapHintEl = document.getElementById('garageApprovalMapHint');
    if (!mapEl) {
        return;
    }

    const leafletReady = await ensureLeafletForGarageMap();
    if (!leafletReady || typeof window.L === 'undefined') {
        if (mapHintEl) {
            mapHintEl.textContent = 'Unable to load map resources. You can still approve using the list below.';
        }
        return;
    }

    destroyRouteGarageMap();

    routeGarageMap = window.L.map(mapEl, {
        zoomControl: true,
    });

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
    }).addTo(routeGarageMap);

    const bounds = [];
    routeGarageMapGarageMarkers = [];

    const driverCoordinates = getRouteBreakdownCoordinates();
    if (driverCoordinates) {
        const driverMarker = window.L.marker(driverCoordinates)
            .addTo(routeGarageMap)
            .bindPopup('<strong>Driver Location</strong>');
        bounds.push(driverMarker.getLatLng());
    }

    availableRouteGarages.forEach((garage) => {
        const latitude = Number(garage.latitude);
        const longitude = Number(garage.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return;
        }

        const marker = window.L.circleMarker([latitude, longitude], {
            radius: 8,
            color: '#1d4ed8',
            fillColor: '#2563eb',
            fillOpacity: 0.75,
            weight: 2,
        }).addTo(routeGarageMap);

        const distanceLabel = formatGarageDistance(garage.distance_km);
        marker.bindPopup(`<strong>${garage.name || 'Garage'}</strong><br>${garage.address || 'Address not available'}${distanceLabel ? `<br>Approx. ${distanceLabel} from breakdown` : ''}`);
        marker.on('click', () => {
            const selectEl = document.getElementById('garageApprovalSelect');
            if (selectEl) {
                selectEl.value = String(Number(garage.id));
            }
            updateGarageApprovalSelectionWarning();
        });

        routeGarageMapGarageMarkers.push({
            garageId: Number(garage.id),
            marker,
        });

        bounds.push(marker.getLatLng());
    });

    if (bounds.length > 1) {
        routeGarageMap.fitBounds(bounds, { padding: [30, 30] });
    } else if (bounds.length === 1) {
        routeGarageMap.setView(bounds[0], 14);
    } else {
        routeGarageMap.setView([7.8731, 80.7718], 7);
    }

    const selectedGarageId = Number(document.getElementById('garageApprovalSelect')?.value || 0);
    syncGarageSelectionOnMap(selectedGarageId);

    if (mapHintEl) {
        if (!driverCoordinates) {
            mapHintEl.textContent = 'Driver GPS coordinates are missing for this breakdown. Garages are still shown on the map.';
        } else if (!routeGarageMapGarageMarkers.length) {
            mapHintEl.textContent = 'No garages with coordinates are available. Select from the dropdown below.';
        } else {
            mapHintEl.textContent = 'Garages are listed by nearest distance. Click a marker or use the dropdown to select one, then approve.';
        }
    }

    setTimeout(() => {
        if (routeGarageMap) {
            routeGarageMap.invalidateSize();
        }
    }, 50);
}

function syncGarageSelectionOnMap(selectedGarageId) {
    if (!routeGarageMapGarageMarkers.length) {
        return;
    }

    routeGarageMapGarageMarkers.forEach(({ garageId, marker }) => {
        const isSelected = selectedGarageId > 0 && garageId === selectedGarageId;
        marker.setStyle({
            color: isSelected ? '#991b1b' : '#1d4ed8',
            fillColor: isSelected ? '#dc2626' : '#2563eb',
            fillOpacity: isSelected ? 0.9 : 0.75,
            radius: isSelected ? 10 : 8,
        });

        if (isSelected && routeGarageMap) {
            routeGarageMap.panTo(marker.getLatLng());
        }
    });
}

async function submitGarageApproval(event) {
    event.preventDefault();

    if (!isSupervisorLike()) {
        showToast('Only Supervisors can approve nearby garages from this page.', 'warning');
        return;
    }

    if (!isRouteBreakdownTicket()) {
        showToast('Nearby garage approval is only available for route breakdown tickets.', 'warning');
        return;
    }

    if (isInsuranceClaimed(ticketData.status)) {
        showToast('This ticket is already in insurance-claim workflow.', 'warning');
        closeGarageApprovalModal();
        return;
    }

    if (hasRouteGarageAssignment()) {
        showToast('A nearby garage is already approved for this route breakdown.', 'warning');
        closeGarageApprovalModal();
        return;
    }

    const routeBreakdownId = Number(document.getElementById('garageApprovalBreakdownId')?.value || getRouteBreakdownNumericId() || 0);
    if (!routeBreakdownId) {
        showToast('Unable to resolve the route breakdown ID for garage approval.', 'error');
        return;
    }

    const selectedGarageId = Number(document.getElementById('garageApprovalSelect')?.value || 0);

    if (!selectedGarageId) {
        updateGarageApprovalSelectionWarning();
        showToast('Please select a nearby garage to approve.', 'error');
        return;
    }

    const submitButton = document.getElementById('garageApprovalSubmitBtn');
    const approvalNotes = (document.getElementById('garageApprovalNotes')?.value || '').trim();

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Approving...';
    }

    try {
        const response = await API.post(`/route-breakdowns/${routeBreakdownId}/garage-approval`, {
            garage_id: selectedGarageId,
            approval_notes: approvalNotes || null,
        });

        if (response?.status === 'success') {
            showToast('Nearby garage approved successfully.', 'success');
            closeGarageApprovalModal();
            await loadAll();
            return;
        }

        showToast(response?.message || 'Failed to approve nearby garage.', 'error');
    } catch (error) {
        console.error('submitGarageApproval error:', error);
        showToast('An error occurred while approving the nearby garage.', 'error');
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-warehouse"></i> Approve Nearby Garage';
        }
    }
}

async function loadTechniciansForAssignment() {
    const listEl = document.getElementById('assignTechniciansList');
    if (!listEl) return;

    listEl.innerHTML = '<p class="step-hint"><i class="fas fa-spinner fa-spin"></i> Loading technicians...</p>';

    try {
        const response = await API.get('/technicians');
        const payload = response?.data;
        const technicians = Array.isArray(payload?.users)
            ? payload.users
            : (Array.isArray(payload?.technicians)
                ? payload.technicians
                : (Array.isArray(payload) ? payload : []));

        if (!Array.isArray(technicians) || technicians.length === 0) {
            listEl.innerHTML = '<p class="step-hint"><i class="fas fa-user-slash"></i> No active technical officers available.</p>';
            return;
        }

        const sorted = technicians
            .map((tech) => ({
                id: Number(tech.id),
                full_name: tech.full_name || tech.username || `Technician #${tech.id}`,
                technical_expertise: String(tech.technical_expertise || tech.expertise || 'General').trim() || 'General',
                active_ticket_count: Number(tech.active_ticket_count || 0)
            }))
            .filter((tech) => Number.isFinite(tech.id) && tech.id > 0)
            .sort((first, second) => {
                if (first.active_ticket_count !== second.active_ticket_count) {
                    return first.active_ticket_count - second.active_ticket_count;
                }
                return first.full_name.localeCompare(second.full_name);
            });

        const selectedIds = new Set(
            (Array.isArray(ticketData?.assignments) ? ticketData.assignments : [])
                .map((assignment) => Number(assignment.assigned_to))
                .filter((id) => Number.isFinite(id) && id > 0)
        );

        listEl.innerHTML = sorted.map((tech) => {
            const checked = selectedIds.has(tech.id) ? 'checked' : '';
            const workloadLabel = `${tech.active_ticket_count} active ticket${tech.active_ticket_count === 1 ? '' : 's'}`;
            return `
                <label class="assign-tech-item">
                    <span><input type="checkbox" name="assignTechnicians" value="${tech.id}" ${checked}></span>
                    <span style="flex:1; min-width:0;">
                        <span class="assign-tech-name">${tech.full_name}</span>
                        <span class="assign-tech-meta"><i class="fas fa-wrench"></i> ${tech.technical_expertise}</span>
                    </span>
                    <span class="assign-tech-meta">${workloadLabel}</span>
                </label>
            `;
        }).join('');
    } catch (error) {
        console.error('loadTechniciansForAssignment error:', error);
        listEl.innerHTML = '<p class="step-hint" style="color: var(--danger);"><i class="fas fa-exclamation-triangle"></i> Failed to load technicians.</p>';
    }
}

function updateAssignSelectionWarning() {
    const warningEl = document.getElementById('assignSelectionWarning');
    if (!warningEl) return;

    const selected = document.querySelectorAll('input[name="assignTechnicians"]:checked');
    const hasExistingAssignment = Array.isArray(ticketData?.assignments) && ticketData.assignments.length > 0;
    warningEl.style.display = (hasExistingAssignment && selected.length === 0) ? 'block' : 'none';
}

async function submitAssignment(event) {
    event.preventDefault();

    if (!isSupervisorLike()) {
        showToast('Only Supervisors can assign technicians from this page.', 'warning');
        return;
    }

    if (!ticketData?.id) {
        showToast('Ticket context is missing for assignment.', 'error');
        return;
    }

    if (isInsuranceClaimed(ticketData.status)) {
        showToast('This ticket is in insurance-claim workflow and cannot be assigned to technicians.', 'warning');
        closeAssignModal();
        return;
    }

    if (isRouteBreakdownTicket() && hasRouteGarageAssignment()) {
        showToast('Nearby garage is already approved. Technician assignment is not required.', 'warning');
        closeAssignModal();
        return;
    }

    const selectedIds = Array.from(document.querySelectorAll('input[name="assignTechnicians"]:checked'))
        .map((input) => Number(input.value))
        .filter((id) => Number.isFinite(id) && id > 0);

    const hasExistingAssignment = Array.isArray(ticketData?.assignments) && ticketData.assignments.length > 0;
    if (!hasExistingAssignment && selectedIds.length === 0) {
        showToast('Please select at least one technician.', 'error');
        return;
    }

    const assignElements = getAssignModalElements();
    if (!assignElements.expectedCompletion || !assignElements.priority || !assignElements.notes) {
        showToast('Assignment form is unavailable right now.', 'error');
        return;
    }

    const expectedCompletionDate = assignElements.expectedCompletion.value;
    if (!expectedCompletionDate) {
        showToast('Expected completion date is required.', 'error');
        assignElements.expectedCompletion.reportValidity();
        return;
    }

    const today = getTodayDateString();
    if (expectedCompletionDate < today) {
        assignElements.expectedCompletion.setCustomValidity('Expected completion date cannot be in the past.');
        assignElements.expectedCompletion.reportValidity();
        showToast('Expected completion date cannot be in the past.', 'error');
        return;
    }

    assignElements.expectedCompletion.setCustomValidity('');

    const payload = {
        technician_ids: selectedIds,
        priority: capitalise(assignElements.priority.value || 'medium'),
        expected_completion_date: expectedCompletionDate,
        notes: assignElements.notes.value.trim()
    };

    const submitButton = assignElements.submitButton;
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    }

    try {
        const response = await API.post(`/fault-tickets/${ticketData.id}/assign`, payload);

        if (response.status === 'success') {
            showToast(selectedIds.length === 0 ? 'Ticket unassigned successfully.' : 'Ticket assignment updated successfully.', 'success');
            closeAssignModal();
            await loadAll();
        } else {
            showToast(response.message || 'Failed to update assignment.', 'error');
        }
    } catch (error) {
        console.error('submitAssignment error:', error);
        showToast('An error occurred while saving the assignment.', 'error');
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-user-check"></i> Save Assignment';
        }
    }
}

async function submitInsuranceClaim() {
    if (!isSupervisorLike()) {
        showToast('Only Supervisors can submit insurance claims from this page.', 'warning');
        return;
    }

    if (!ticketData?.id) {
        showToast('Ticket context is missing for insurance claim submission.', 'error');
        return;
    }

    if (isInsuranceClaimed(ticketData.status)) {
        showToast('This ticket has already been moved to insurance claim workflow.', 'warning');
        return;
    }

    const insuranceContext = getInsuranceClaimContext();
    if (!insuranceContext || insuranceContext.eligible !== true) {
        showToast('Insurance is not eligible.', 'error');
        return;
    }

    if (!window.confirm('Submit this ticket to insurance claim workflow? This will bypass technician assignment.')) {
        return;
    }

    const claimButton = document.getElementById('claimInsuranceBtn');
    if (claimButton) {
        claimButton.disabled = true;
        claimButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    }

    try {
        const response = await API.put(`/fault-tickets/${ticketData.id}`, {
            status: 'Insurance Claimed'
        });

        if (response?.status === 'success') {
            showToast('Ticket moved to insurance claim workflow.', 'success');
            await loadAll();
            return;
        }

        showToast(response?.message || 'Failed to submit insurance claim.', 'error');
    } catch (error) {
        console.error('submitInsuranceClaim error:', error);
        showToast('An error occurred while submitting the insurance claim.', 'error');
    } finally {
        if (claimButton) {
            claimButton.disabled = false;
            claimButton.innerHTML = '<i class="fas fa-file-signature"></i> Claim Insurance';
        }
    }
}

document.addEventListener('click', (event) => {
    if (event.target.classList.contains('modal-overlay')) {
        event.target.classList.remove('active');
    }
});

document.addEventListener('change', (event) => {
    if (event.target.matches('input[name="assignTechnicians"]')) {
        updateAssignSelectionWarning();
        return;
    }

    if (event.target.matches('#garageApprovalSelect')) {
        updateGarageApprovalSelectionWarning();
    }
});

function exposeInlineTemplateHandlers() {
    const handlerMap = {
        openStartWorkModal,
        closeStartWorkModal,
        submitStartWork,
        openAssignModal,
        openGarageApprovalModal,
        openDriverNearbyGarages,
        openDriverGarageEntry,
        openDriverGarageProgress,
        openDriverCompleteRepair,
        openBudgetModal,
        reviewBudget,
        submitInsuranceClaim,
        openPartsModal,
        openCompleteModal,
        closeBudgetModal,
        submitBudget,
        addPartField,
        toggleSparePartsSection,
        closePartsModal,
        submitPartsRequest,
        closeCompleteModal,
        submitComplete,
        closeAssignModal,
        submitAssignment,
        closeGarageApprovalModal,
        submitGarageApproval,
    };

    Object.entries(handlerMap).forEach(([name, handler]) => {
        if (typeof handler === 'function') {
            window[name] = handler;
        }
    });
}

exposeInlineTemplateHandlers();

async function initializeViewTicketPage(context = null) {
    if (context && typeof context === 'object') {
        window.__ACViewTicketContext = context;
    }

    try {
        currentUser = await Auth.checkAuth();
        if (!currentUser) {
            window.location.href = CONFIG.ROUTES.LOGIN;
            return;
        }
    } catch (_error) {
        window.location.href = CONFIG.ROUTES.LOGIN;
        return;
    }

    currentRoleContext = resolveRoleContext(currentUser);
    applyRoleShellAndNavigation();

    if (window.DashboardInit?.updateUserInfo) {
        window.DashboardInit.updateUserInfo(currentUser);
    }

    const shellSidebar = document.querySelector('to-shell-sidebar');
    if (shellSidebar && !isDashboardComponentMode() && typeof shellSidebar.refreshNotificationBadge === 'function') {
        await shellSidebar.refreshNotificationBadge();
    }

    await loadAll();
}

window.ViewTicketPage = window.ViewTicketPage || {};
window.ViewTicketPage.initialize = initializeViewTicketPage;

function shouldAutoInitializeViewTicketPage() {
    if (isDashboardComponentMode()) {
        return false;
    }

    return Boolean(document.getElementById('loadingState') && document.getElementById('mainContent'));
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        if (!shouldAutoInitializeViewTicketPage()) {
            return;
        }

        await initializeViewTicketPage();
    });
} else if (shouldAutoInitializeViewTicketPage()) {
    void initializeViewTicketPage();
}

})();
