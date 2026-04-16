'use strict';

let ticketData = null;
let currentUser = null;
let budgetReport = null;
let sparePartRequests = [];
let workUpdates = [];
let currentRoleContext = null;

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

function getTicketId() {
    return new URLSearchParams(window.location.search).get('id');
}

function toRoleKey(roleName) {
    return String(roleName || '').trim().toUpperCase().replace(/\s+/g, '_');
}

function normaliseStatus(status) {
    return String(status || '').toLowerCase().trim();
}

function statusIndex(status) {
    const idx = STATUS_ORDER.indexOf(normaliseStatus(status));
    return idx === -1 ? 0 : idx;
}

function statusAtOrPast(ticketStatus, targetStatus) {
    return statusIndex(ticketStatus) >= statusIndex(targetStatus);
}

function isPreWork(status) {
    return PRE_WORK_STATUSES.includes(normaliseStatus(status));
}

function isTechnicalOfficer() {
    return toRoleKey(currentUser?.role) === 'TECHNICAL_OFFICER';
}

function isSupervisorLike() {
    const roleKey = toRoleKey(currentUser?.role);
    return roleKey === 'SUPERVISOR' || roleKey === 'ADMIN';
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
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toastMessage');
    if (!toast || !msg) return;

    toast.classList.remove('toast-success', 'toast-warning', 'toast-error', 'show');
    if (type === 'warning') toast.classList.add('toast-warning');
    else if (type === 'error' || type === 'danger') toast.classList.add('toast-error');
    else toast.classList.add('toast-success');

    msg.textContent = message;
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

function markStep(stepId, state) {
    const el = document.getElementById(stepId);
    if (!el) return;

    el.classList.remove('step-completed', 'step-active', 'step-pending', 'step-warning', 'step-danger');
    el.classList.add(`step-${state}`);
}

function getSafeReturnToPath() {
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
    const roleKey = toRoleKey(user?.role);
    const dashboardPath = CONFIG?.ROUTES?.DASHBOARD?.[roleKey]
        || CONFIG?.ROUTES?.DASHBOARD?.TECHNICAL_OFFICER
        || '/dashboard/technical-officer/index.html';

    const defaultSection = roleKey === 'SUPERVISOR' ? 'fault-tickets'
        : roleKey === 'TECHNICAL_OFFICER' ? 'tickets'
            : 'dashboard';

    const title = roleKey === 'SUPERVISOR' ? 'Supervisor Dashboard'
        : roleKey === 'TECHNICAL_OFFICER' ? 'Technical Officer Dashboard'
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

    const header = document.querySelector('to-shell-header');
    if (header) {
        header.setAttribute('title', currentRoleContext.title);
        header.setAttribute('icon', currentRoleContext.roleKey === 'SUPERVISOR' ? 'fa-user-tie' : 'fa-tools');
    }

    const sidebar = document.querySelector('to-shell-sidebar');
    if (sidebar) {
        sidebar.setAttribute('mode', 'subpage');
        sidebar.setAttribute('active-section', currentRoleContext.defaultSection);
        sidebar.setAttribute('base-path', currentRoleContext.dashboardPath);

        if (currentRoleContext.navItems) sidebar.setAttribute('nav', JSON.stringify(currentRoleContext.navItems));
        else sidebar.removeAttribute('nav');
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
            : 'Fault & Repair Tickets';
    }

    const navigateBack = () => {
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
    renderFlow();
}

function renderOverview(ticketIdFormatted) {
    const status = normaliseStatus(ticketData.status);
    const priority = String(ticketData.priority || 'Medium').toLowerCase();

    document.getElementById('ovTicketId').textContent = ticketIdFormatted;
    document.getElementById('ovLocation').textContent = ticketData.location || 'N/A';
    document.getElementById('ovDate').textContent = fmtDateShort(ticketData.created_at);
    document.getElementById('ovDescription').textContent = ticketData.description || 'No description provided.';

    document.getElementById('ovEquipment').textContent = window.FaultTicketDetailTemplate?.formatEquipmentLabel
        ? window.FaultTicketDetailTemplate.formatEquipmentLabel(ticketData)
        : (ticketData.machine_model_number || ticketData.machine_name || (ticketData.machine_id ? `Machine #${ticketData.machine_id}` : 'N/A'));

    const statusClass = window.FaultTicketDetailTemplate?.toStatusClass
        ? window.FaultTicketDetailTemplate.toStatusClass(ticketData.status)
        : status.replace(/\s+/g, '-');

    const priorityClass = window.FaultTicketDetailTemplate?.toPriorityClass
        ? window.FaultTicketDetailTemplate.toPriorityClass(ticketData.priority)
        : priority;

    document.getElementById('ovStatus').innerHTML = `<span class="badge badge-${statusClass}">${ticketData.status || 'Unknown'}</span>`;
    document.getElementById('ovPriority').innerHTML = `<span class="badge badge-priority-${priorityClass}">${ticketData.priority || 'Medium'}</span>`;
}

function renderFlow() {
    const status = normaliseStatus(ticketData.status);

    markStep('step-reported', 'completed');
    document.getElementById('step1-reporter').textContent = ticketData.reporter_full_name || ticketData.reported_by_name || 'Unknown';
    document.getElementById('step1-date').textContent = fmtDateShort(ticketData.created_at);
    document.getElementById('step1-desc').textContent = `Fault reported. Breakdown type: ${ticketData.breakdown_type || 'N/A'}.`;

    const assignment = ticketData.assignments && ticketData.assignments.length > 0 ? ticketData.assignments[0] : null;

    if (assignment || statusAtOrPast(status, 'assigned')) {
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
    const button = document.getElementById('assignTicketBtn');
    if (!actionEl || !button) return;

    if (!isSupervisorLike() || statusAtOrPast(status, 'resolved')) {
        actionEl.style.display = 'none';
        return;
    }

    button.innerHTML = assignment
        ? '<i class="fas fa-user-cog"></i> Edit Assignment'
        : '<i class="fas fa-user-plus"></i> Assign Technician';
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

    if (currentIdx >= inProgressIdx) {
        markStep('step-inprogress', statusAtOrPast(status, 'resolved') ? 'completed' : 'active');
        document.getElementById('inprogress-hint').style.display = 'none';
        document.getElementById('inprogress-info').style.display = 'block';

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
        markStep('step-inprogress', 'pending');
        document.getElementById('inprogress-hint').style.display = 'flex';
        document.getElementById('inprogress-info').style.display = 'none';
        document.getElementById('complete-action').style.display = 'none';
    }
}

function renderResolvedStep(status) {
    if (statusAtOrPast(status, 'resolved')) {
        markStep('step-resolved', 'completed');
        document.getElementById('resolved-hint').style.display = 'none';
        document.getElementById('resolved-info').style.display = 'block';

        document.getElementById('step6-resolver').textContent =
            ticketData?.resolved_by_name || currentUser?.full_name || currentUser?.name || 'Technical Officer';

        const resolutionText = document.getElementById('resolution-notes-text');
        resolutionText.textContent = ticketData?.resolution_notes || 'No resolution notes were provided.';
    } else {
        markStep('step-resolved', 'pending');
        document.getElementById('resolved-hint').style.display = 'flex';
        document.getElementById('resolved-info').style.display = 'none';
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

function openBudgetModal() {
    if (!isTechnicalOfficer() || !ticketData) {
        showToast('Only Technical Officers can submit budget reports from this page.', 'warning');
        return;
    }

    const ticketIdFormatted = window.FaultTicketDetailTemplate?.formatTicketDisplayId
        ? window.FaultTicketDetailTemplate.formatTicketDisplayId(ticketData)
        : (ticketData.breakdown_report_id || ticketData.ticket_id || `#${ticketData.id}`);

    document.getElementById('budgetTicketDisplay').value = ticketIdFormatted;
    document.getElementById('budgetTotalAmount').value = '';
    document.getElementById('budgetQuotation').value = '';
    document.getElementById('budgetJustification').value = '';
    document.getElementById('pettyCashHint').textContent = '';

    document.getElementById('budgetModal').classList.add('active');
    document.getElementById('budgetTotalAmount').addEventListener('input', updatePettyCashHint);
}

function closeBudgetModal() {
    document.getElementById('budgetModal').classList.remove('active');
    document.getElementById('budgetTotalAmount').removeEventListener('input', updatePettyCashHint);
}

function updatePettyCashHint() {
    const value = Number.parseFloat(document.getElementById('budgetTotalAmount').value) || 0;
    const hintEl = document.getElementById('pettyCashHint');

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

    const submitButton = document.getElementById('budgetSubmitBtn');
    const totalAmount = Number.parseFloat(document.getElementById('budgetTotalAmount').value);
    const quotation = document.getElementById('budgetQuotation').value.trim();
    const justification = document.getElementById('budgetJustification').value.trim();

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

    const ticketIdFormatted = ticketData.breakdown_report_id || ticketData.ticket_id || `#${ticketData.id}`;
    document.getElementById('partsTicketDisplay').value = ticketIdFormatted;
    document.getElementById('partsEquipment').value = ticketData.machine_model_number || ticketData.machine_name || '';
    document.getElementById('partsLocation').value = ticketData.location || '';
    document.getElementById('partsPriority').value = ticketData.priority || 'Medium';
    document.getElementById('partsNotes').value = '';

    const listEl = document.getElementById('partsItemsList');
    listEl.innerHTML = '';
    addHeaderRow();
    addPartRow();

    document.getElementById('partsModal').classList.add('active');
}

function closePartsModal() {
    document.getElementById('partsModal').classList.remove('active');
}

function addHeaderRow() {
    const listEl = document.getElementById('partsItemsList');
    if (!listEl || listEl.querySelector('.part-row-header')) return;

    const header = document.createElement('div');
    header.className = 'part-row-header';
    header.innerHTML = '<span>Part Name</span><span>Qty</span><span class="part-unit">Unit</span><span></span>';
    listEl.insertBefore(header, listEl.firstChild);
}

function addPartRow() {
    const listEl = document.getElementById('partsItemsList');
    if (!listEl) return;

    addHeaderRow();

    const row = document.createElement('div');
    row.className = 'part-row';
    row.innerHTML = `
        <input type="text" placeholder="e.g. Hydraulic Seal" class="part-name" required>
        <input type="number" placeholder="1" class="part-qty" min="1" value="1">
        <input type="text" placeholder="pcs" class="part-unit">
        <button type="button" class="btn-remove-part" onclick="removePartRow(this)" title="Remove">
            <i class="fas fa-times"></i>
        </button>
    `;

    listEl.appendChild(row);
}

function removePartRow(button) {
    const listEl = document.getElementById('partsItemsList');
    if (!listEl) return;

    const rows = listEl.querySelectorAll('.part-row');
    if (rows.length <= 1) {
        showToast('At least one spare part item is required.', 'warning');
        return;
    }

    button.closest('.part-row')?.remove();
}

async function submitPartsRequest(event) {
    event.preventDefault();

    if (!isTechnicalOfficer()) {
        showToast('Only Technical Officers can submit spare part requests from this page.', 'warning');
        return;
    }

    const submitButton = document.getElementById('partsSubmitBtn');
    const listEl = document.getElementById('partsItemsList');
    const rows = listEl ? listEl.querySelectorAll('.part-row') : [];
    const items = [];
    let hasError = false;

    rows.forEach((row) => {
        const name = row.querySelector('.part-name')?.value.trim();
        const quantity = Number.parseInt(row.querySelector('.part-qty')?.value || '1', 10) || 1;
        const unit = row.querySelector('.part-unit')?.value.trim() || 'pcs';

        if (!name) {
            hasError = true;
            return;
        }

        items.push({ part_name: name, quantity, unit });
    });

    if (hasError || items.length === 0) {
        showToast('Please provide a valid part name for each row.', 'error');
        return;
    }

    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    try {
        const response = await API.post('/spare-part-requests', {
            fault_ticket_id: ticketData.id,
            ticket_id_formatted: ticketData.breakdown_report_id || ticketData.ticket_id || null,
            equipment_name: document.getElementById('partsEquipment').value.trim() || null,
            location: document.getElementById('partsLocation').value.trim() || null,
            priority: document.getElementById('partsPriority').value,
            additional_notes: document.getElementById('partsNotes').value.trim() || null,
            items
        });

        if (response.status === 'success') {
            showToast('Spare parts request submitted successfully.', 'success');
            closePartsModal();
            await loadAll();
        } else {
            showToast(response.message || 'Failed to submit spare parts request.', 'error');
        }
    } catch (error) {
        console.error('submitPartsRequest error:', error);
        showToast('An error occurred while submitting the spare parts request.', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Request';
    }
}

function openCompleteModal() {
    if (!isTechnicalOfficer()) {
        showToast('Only Technical Officers can resolve tickets from this page.', 'warning');
        return;
    }

    document.getElementById('completeSummary').value = '';
    document.getElementById('completeModal').classList.add('active');
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

    const summary = document.getElementById('completeSummary').value.trim();
    if (!summary) {
        showToast('Please enter work summary / resolution notes.', 'error');
        return;
    }

    const submitButton = document.getElementById('completeSubmitBtn');
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
        const response = await API.post(`/fault-tickets/${ticketData.id}/complete`, {
            work_summary: summary
        });

        if (response.status === 'success') {
            showToast('Ticket marked as resolved.', 'success');
            closeCompleteModal();
            await loadAll();
        } else {
            showToast(response.message || 'Failed to mark ticket as resolved.', 'error');
        }
    } catch (error) {
        console.error('submitComplete error:', error);
        showToast('An error occurred while resolving the ticket.', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-check"></i> Confirm Resolved';
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

    const ticketIdFormatted = window.FaultTicketDetailTemplate?.formatTicketDisplayId
        ? window.FaultTicketDetailTemplate.formatTicketDisplayId(ticketData)
        : (ticketData.breakdown_report_id || ticketData.ticket_id || `#${ticketData.id}`);

    document.getElementById('assignTicketDisplay').value = ticketIdFormatted;
    document.getElementById('assignPriority').value = String(ticketData.priority || 'Medium').toLowerCase();
    document.getElementById('assignNotes').value = '';

    const expectedDateInput = document.getElementById('assignExpectedCompletion');
    const existingAssignment = Array.isArray(ticketData.assignments) && ticketData.assignments.length > 0
        ? ticketData.assignments[0]
        : null;

    expectedDateInput.value = existingAssignment?.expected_completion_date || '';
    if (existingAssignment?.notes) {
        document.getElementById('assignNotes').value = existingAssignment.notes;
    }

    await loadTechniciansForAssignment();
    updateAssignSelectionWarning();
    document.getElementById('assignModal').classList.add('active');
}

function closeAssignModal() {
    document.getElementById('assignModal').classList.remove('active');
}

async function loadTechniciansForAssignment() {
    const listEl = document.getElementById('assignTechniciansList');
    if (!listEl) return;

    listEl.innerHTML = '<p class="step-hint"><i class="fas fa-spinner fa-spin"></i> Loading technicians...</p>';

    try {
        const response = await API.get('/technicians');
        const technicians = response?.data?.users || response?.data || [];

        if (!Array.isArray(technicians) || technicians.length === 0) {
            listEl.innerHTML = '<p class="step-hint"><i class="fas fa-user-slash"></i> No active technical officers available.</p>';
            return;
        }

        const sorted = technicians
            .map((tech) => ({
                id: Number(tech.id),
                full_name: tech.full_name || tech.username || `Technician #${tech.id}`,
                technical_expertise: (tech.technical_expertise || 'General').trim() || 'General',
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
            (ticketData.assignments || [])
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

    const selectedIds = Array.from(document.querySelectorAll('input[name="assignTechnicians"]:checked'))
        .map((input) => Number(input.value))
        .filter((id) => Number.isFinite(id) && id > 0);

    const hasExistingAssignment = Array.isArray(ticketData.assignments) && ticketData.assignments.length > 0;
    if (!hasExistingAssignment && selectedIds.length === 0) {
        showToast('Please select at least one technician.', 'error');
        return;
    }

    const expectedCompletionDate = document.getElementById('assignExpectedCompletion').value;
    if (!expectedCompletionDate) {
        showToast('Expected completion date is required.', 'error');
        return;
    }

    const payload = {
        technician_ids: selectedIds,
        priority: capitalise(document.getElementById('assignPriority').value || 'medium'),
        expected_completion_date: expectedCompletionDate,
        notes: document.getElementById('assignNotes').value.trim()
    };

    const submitButton = document.getElementById('assignSubmitBtn');
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

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
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-user-check"></i> Save Assignment';
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
    }
});

document.addEventListener('DOMContentLoaded', async () => {
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
    if (shellSidebar && typeof shellSidebar.refreshNotificationBadge === 'function') {
        await shellSidebar.refreshNotificationBadge();
    }

    await loadAll();
});
