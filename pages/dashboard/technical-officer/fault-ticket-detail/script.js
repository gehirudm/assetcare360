'use strict';

// ── State ──────────────────────────────────────────────────────────────────
let ticketData      = null;
let currentUser     = null;
let budgetReport    = null;
let sparePartRequests = [];
let workUpdates     = [];

// ── Helpers ────────────────────────────────────────────────────────────────

function getTicketId() {
    return new URLSearchParams(window.location.search).get('id');
}

function fmtDate(str) {
    if (!str) return 'N/A';
    return new Date(str).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function fmtDateShort(str) {
    if (!str) return 'N/A';
    return new Date(str).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const msg   = document.getElementById('toastMessage');
    toast.classList.remove('toast-success', 'toast-warning', 'toast-error', 'show');
    if (type === 'success') toast.classList.add('toast-success');
    else if (type === 'warning') toast.classList.add('toast-warning');
    else if (type === 'error') toast.classList.add('toast-error');
    msg.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4000);
}

function showError(message) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('mainContent').style.display  = 'none';
    document.getElementById('errorState').style.display   = 'flex';
    document.getElementById('errorMessage').textContent   = message;
}

// ── Status helpers ─────────────────────────────────────────────────────────

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

function normaliseStatus(s) {
    return (s || '').toLowerCase().trim();
}

function statusIndex(s) {
    const idx = STATUS_ORDER.indexOf(normaliseStatus(s));
    return idx === -1 ? 0 : idx;
}

/**
 * Returns true if ticket status has advanced past (or reached) the given status.
 */
function statusAtOrPast(ticketStatus, targetStatus) {
    return statusIndex(ticketStatus) >= statusIndex(targetStatus);
}

/**
 * Pre-work statuses: budget & parts can be submitted.
 */
const PRE_WORK_STATUSES = ['open', 'assigned', 'waiting for budget approval', 'waiting for spare parts', 'parts approved'];
function isPreWork(status) {
    return PRE_WORK_STATUSES.includes(normaliseStatus(status));
}

// ── Init ───────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    // Auth check
    try {
        currentUser = await Auth.checkAuth();
        if (!currentUser) {
            window.location.href = CONFIG.ROUTES.LOGIN;
            return;
        }
    } catch (e) {
        window.location.href = CONFIG.ROUTES.LOGIN;
        return;
    }

    // Populate header user info (same as dashboard)
    DashboardInit.updateUserInfo(currentUser);

    // Load everything
    await loadAll();
});

async function loadAll() {
    const id = getTicketId();
    if (!id) {
        showError('No ticket ID supplied in the URL.');
        return;
    }

    try {
        // Fetch ticket + supplemental data in parallel
        const [ticketResp, budgetResp, partsResp, updatesResp] = await Promise.all([
            API.get(`/fault-tickets/${id}`),
            API.get(`/budget-reports/ticket/${id}/latest`).catch(() => null),
            API.get(`/spare-part-requests/ticket/${id}`).catch(() => null),
            API.get(`/ticket-work-updates/ticket/${id}`).catch(() => null),
        ]);

        if (ticketResp.status !== 'success' || !ticketResp.data) {
            showError(ticketResp.message || 'Failed to load ticket.');
            return;
        }

        ticketData        = ticketResp.data;
        budgetReport      = (budgetResp && budgetResp.status === 'success') ? budgetResp.data : null;
        sparePartRequests = (partsResp  && partsResp.status  === 'success') ? (partsResp.data  || []) : [];
        workUpdates       = (updatesResp && updatesResp.status === 'success') ? (updatesResp.data || []) : [];

        renderPage();

    } catch (err) {
        console.error('loadAll error:', err);
        showError('An error occurred while loading the ticket.');
    }
}

// ── Render ─────────────────────────────────────────────────────────────────

function renderPage() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('mainContent').style.display  = 'flex';

    const ticket = ticketData;
    const status = normaliseStatus(ticket.status);
    const ticketIdFormatted = ticket.breakdown_report_id || ticket.ticket_id || `#${ticket.id}`;

    // Header badge
    document.getElementById('ticketIdBadge').textContent = ticketIdFormatted;

    renderOverview(ticket, ticketIdFormatted);
    renderFlow(ticket, ticketIdFormatted);
}

function renderOverview(ticket, ticketIdFormatted) {
    const status   = normaliseStatus(ticket.status);
    const priority = (ticket.priority || 'Medium').toLowerCase();

    document.getElementById('ovTicketId').textContent = ticketIdFormatted;
    document.getElementById('ovLocation').textContent = ticket.location  || 'N/A';
    document.getElementById('ovDate').textContent     = fmtDateShort(ticket.created_at);
    document.getElementById('ovDescription').textContent = ticket.description || 'No description provided.';

    document.getElementById('ovEquipment').textContent =
        ticket.machine_model_number || ticket.machine_name || (ticket.machine_id ? `Machine #${ticket.machine_id}` : 'N/A');

    document.getElementById('ovStatus').innerHTML =
        `<span class="badge badge-${status.replace(/\s+/g, '-')}">${ticket.status || 'Unknown'}</span>`;

    document.getElementById('ovPriority').innerHTML =
        `<span class="badge badge-priority-${priority}">${ticket.priority || 'Medium'}</span>`;
}

function renderFlow(ticket, ticketIdFormatted) {
    const status = normaliseStatus(ticket.status);

    // ── Step 1: Reported ────────────────────────────────────────────────
    markStep('step-reported', 'completed');
    document.getElementById('step1-reporter').textContent =
        ticket.reporter_full_name || ticket.reported_by_name || 'Unknown';
    document.getElementById('step1-date').textContent = fmtDateShort(ticket.created_at);
    document.getElementById('step1-desc').textContent =
        `Fault reported. Breakdown type: ${ticket.breakdown_type || 'N/A'}.`;

    // ── Step 2: Assignment ──────────────────────────────────────────────
    const assignment = ticket.assignments && ticket.assignments.length > 0 ? ticket.assignments[0] : null;

    if (assignment || statusAtOrPast(status, 'assigned')) {
        markStep('step-assigned', 'completed');
        document.getElementById('step2-assignedBy').textContent =
            assignment ? (assignment.assigned_by_name || 'Supervisor') : 'Supervisor';
        document.getElementById('step2-technician').textContent =
            assignment ? (assignment.technician_name || 'You') : 'You';
        document.getElementById('step2-desc').textContent =
            `Assigned on ${fmtDateShort(assignment?.assigned_at || ticket.updated_at)}.`;
        if (assignment?.notes) {
            const notesEl = document.getElementById('step2-notes');
            notesEl.textContent = assignment.notes;
            notesEl.style.display = 'block';
        }
    } else {
        markStep('step-assigned', 'pending');
        document.getElementById('step2-assignedBy').textContent = 'Pending';
        document.getElementById('step2-technician').textContent = 'Pending';
    }

    // ── Step 3: Budget ──────────────────────────────────────────────────
    renderBudgetStep(ticket, status);

    // ── Step 4: Spare Parts ─────────────────────────────────────────────
    renderPartsStep(ticket, status);

    // ── Step 5: In Progress ─────────────────────────────────────────────
    renderInProgressStep(ticket, status);

    // ── Step 6: Resolved ────────────────────────────────────────────────
    renderResolvedStep(ticket, status);

    // ── Step 7: Closed ──────────────────────────────────────────────────
    renderClosedStep(ticket, status);
}

function markStep(stepId, state) {
    const el = document.getElementById(stepId);
    if (!el) return;
    el.classList.remove('step-completed', 'step-active', 'step-pending', 'step-warning', 'step-danger');
    el.classList.add(`step-${state}`);
}

// ── Step 3: Budget ─────────────────────────────────────────────────────────

function renderBudgetStep(ticket, status) {
    const budgetIdx = statusIndex('waiting for budget approval');
    const currentIdx = statusIndex(status);

    const preApproval = currentIdx < budgetIdx;        // Open / Assigned
    const atBudget    = status === 'waiting for budget approval';
    const pastBudget  = currentIdx > budgetIdx;

    if (budgetReport) {
        document.getElementById('budget-no-report').style.display = 'none';
        document.getElementById('budget-report-info').style.display = 'block';

        document.getElementById('step3-submitter').textContent =
            budgetReport.submitted_by_name || 'Technical Officer';

        // Amount
        const amount = parseFloat(budgetReport.total_amount || 0);
        document.getElementById('budget-amount').textContent = amount > 0
            ? `LKR ${amount.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}`
            : '—';

        // Approval level
        const levelEl = document.getElementById('budget-level');
        if (budgetReport.approval_level === 'maintenance_manager') {
            levelEl.textContent = 'Maintenance Manager';
            levelEl.style.background = '#ede9fe';
            levelEl.style.color = '#5b21b6';
        } else {
            levelEl.textContent = 'Supervisor';
        }

        // Status badge
        const bs = (budgetReport.status || 'pending').toLowerCase();
        const badgeEl = document.getElementById('budget-status-badge');
        badgeEl.textContent = budgetReport.status || 'Pending';
        badgeEl.className = `budget-status-badge status-${bs}`;

        // Reviewer
        if (budgetReport.reviewed_by_name) {
            const chip = document.getElementById('step3-reviewer-chip');
            chip.style.display = 'inline-flex';
            document.getElementById('step3-reviewer').textContent = budgetReport.reviewed_by_name;
            const roleEl = document.getElementById('step3-reviewer-role');
            roleEl.textContent = budgetReport.approval_level === 'maintenance_manager'
                ? 'Maintenance Manager' : 'Supervisor';
        }

        // Review notes
        if (budgetReport.review_notes) {
            const noteEl = document.getElementById('budget-review-notes');
            noteEl.textContent = budgetReport.review_notes;
            noteEl.style.display = 'block';
        }

        // Step visual state
        if (bs === 'approved')      markStep('step-budget', 'completed');
        else if (bs === 'rejected') markStep('step-budget', 'danger');
        else if (bs === 'revised')  markStep('step-budget', 'warning');
        else                        markStep('step-budget', 'active');    // pending

    } else {
        // No budget report yet
        document.getElementById('budget-no-report').style.display = 'flex';
        document.getElementById('budget-report-info').style.display = 'none';

        if (preApproval || atBudget) {
            markStep('step-budget', atBudget ? 'active' : 'pending');
        } else {
            markStep('step-budget', 'completed'); // skipped
        }
    }

    // Show submit button only if pre-work and no approved/pending report
    const canSubmit = isPreWork(status) &&
        (!budgetReport || budgetReport.status === 'rejected' || budgetReport.status === 'revised');

    const actionEl = document.getElementById('budget-action');
    if (canSubmit) {
        actionEl.style.display = 'block';
    } else {
        actionEl.style.display = 'none';
    }
}

// ── Step 4: Spare Parts ────────────────────────────────────────────────────

function renderPartsStep(ticket, status) {
    const partsIdx   = statusIndex('waiting for spare parts');
    const currentIdx = statusIndex(status);

    if (sparePartRequests.length > 0) {
        document.getElementById('parts-no-request').style.display = 'none';
        document.getElementById('parts-list-container').style.display = 'block';

        const listEl = document.getElementById('parts-list');
        listEl.innerHTML = sparePartRequests.map(req => {
            const reqStatus = (req.status || 'Pending').toLowerCase();
            let statusBadgeClass = 'status-pending';
            if (reqStatus === 'approved' || reqStatus === 'issued') statusBadgeClass = 'status-approved';
            else if (reqStatus === 'rejected') statusBadgeClass = 'status-rejected';

            const items = (req.items || []).map(item =>
                `<div class="parts-item-row">${item.part_name}${item.quantity ? ` &times; ${item.quantity}` : ''}${item.unit ? ` (${item.unit})` : ''}</div>`
            ).join('');

            const reviewNote = req.review_notes
                ? `<div class="parts-review-note"><i class="fas fa-comment-alt"></i> ${req.review_notes}</div>` : '';

            return `
                <div class="parts-request-card" style="margin-bottom:8px;">
                    <div class="parts-request-header">
                        <span class="parts-request-id">${req.request_id || `SPR-${req.id}`}</span>
                        <span class="budget-status-badge ${statusBadgeClass}">${req.status || 'Pending'}</span>
                    </div>
                    <div class="parts-items">${items || '<em style="font-size:.8rem;color:var(--muted)">No items listed</em>'}</div>
                    ${req.reviewed_by_name
                        ? `<div class="work-update-meta"><i class="fas fa-user-check"></i> Reviewed by ${req.reviewed_by_name}</div>`
                        : ''}
                    ${reviewNote}
                </div>`;
        }).join('');

        // Overall step state based on most advanced request status
        const allApproved = sparePartRequests.every(r => ['approved','issued'].includes((r.status||'').toLowerCase()));
        const anyRejected = sparePartRequests.some(r => (r.status||'').toLowerCase() === 'rejected');
        const anyApproved = sparePartRequests.some(r => ['approved','issued'].includes((r.status||'').toLowerCase()));

        if (allApproved) markStep('step-parts', 'completed');
        else if (anyRejected && !anyApproved) markStep('step-parts', 'danger');
        else if (currentIdx >= partsIdx) markStep('step-parts', 'active');
        else markStep('step-parts', 'pending');

    } else {
        document.getElementById('parts-no-request').style.display = 'flex';
        document.getElementById('parts-list-container').style.display = 'none';

        if (currentIdx >= statusIndex('parts approved')) {
            markStep('step-parts', 'completed'); // skipped spare parts
        } else if (status === 'waiting for spare parts') {
            markStep('step-parts', 'active');
        } else {
            markStep('step-parts', 'pending');
        }
    }

    // Show request button only if pre-work
    const partsActionEl = document.getElementById('parts-action');
    if (isPreWork(status)) {
        partsActionEl.style.display = 'block';
    } else {
        partsActionEl.style.display = 'none';
    }
}

// ── Step 5: In Progress ────────────────────────────────────────────────────

function renderInProgressStep(ticket, status) {
    const currentIdx = statusIndex(status);
    const inProgressIdx = statusIndex('in progress');

    if (currentIdx >= inProgressIdx) {
        markStep('step-inprogress', statusAtOrPast(status, 'resolved') ? 'completed' : 'active');
        document.getElementById('inprogress-hint').style.display = 'none';
        document.getElementById('inprogress-info').style.display = 'block';

        document.getElementById('step5-tech').textContent =
            currentUser ? (currentUser.full_name || currentUser.name || 'You') : 'You';

        // Work updates
        const updatesEl = document.getElementById('work-updates-list');
        if (workUpdates.length > 0) {
            updatesEl.innerHTML = workUpdates.map(u => `
                <div class="work-update-item" style="margin-top:6px;">
                    <div>${u.update_text || u.notes || 'Work update'}</div>
                    <div class="work-update-meta">
                        <i class="fas fa-clock"></i> ${fmtDate(u.created_at)}
                        ${u.updated_by_name ? `&nbsp;&bull;&nbsp;<i class="fas fa-user"></i> ${u.updated_by_name}` : ''}
                    </div>
                </div>
            `).join('');
        } else {
            updatesEl.innerHTML = '<p class="step-hint" style="margin-top:6px;"><i class="fas fa-info-circle"></i> No work updates yet.</p>';
        }

        // Show complete action only if actively in progress (not yet resolved)
        const completeEl = document.getElementById('complete-action');
        if (status === 'in progress') {
            completeEl.style.display = 'block';
        } else {
            completeEl.style.display = 'none';
        }
    } else {
        markStep('step-inprogress', 'pending');
        document.getElementById('inprogress-hint').style.display = 'flex';
        document.getElementById('inprogress-info').style.display = 'none';
        document.getElementById('complete-action').style.display = 'none';
    }
}

// ── Step 6: Resolved ───────────────────────────────────────────────────────

function renderResolvedStep(ticket, status) {
    if (statusAtOrPast(status, 'resolved')) {
        markStep('step-resolved', 'completed');
        document.getElementById('resolved-hint').style.display = 'none';
        document.getElementById('resolved-info').style.display = 'block';

        document.getElementById('step6-resolver').textContent =
            currentUser ? (currentUser.full_name || currentUser.name || 'You') : 'You';

        if (ticket.resolution_notes) {
            const notesEl = document.getElementById('resolution-notes-text');
            notesEl.textContent = ticket.resolution_notes;
        }
    } else {
        markStep('step-resolved', 'pending');
        document.getElementById('resolved-hint').style.display = 'flex';
        document.getElementById('resolved-info').style.display = 'none';
    }
}

// ── Step 7: Closed ─────────────────────────────────────────────────────────

function renderClosedStep(ticket, status) {
    if (status === 'closed') {
        markStep('step-closed', 'completed');
        document.getElementById('closed-hint').style.display = 'none';
        document.getElementById('closed-info').style.display = 'block';
        document.getElementById('closed-date').textContent =
            `Closed on ${fmtDateShort(ticket.updated_at)}.`;
    } else {
        markStep('step-closed', 'pending');
        document.getElementById('closed-hint').style.display = 'flex';
        document.getElementById('closed-info').style.display = 'none';
    }
}

// ── Budget Modal ───────────────────────────────────────────────────────────

function openBudgetModal() {
    const ticket = ticketData;
    const ticketIdFormatted = ticket.breakdown_report_id || ticket.ticket_id || `#${ticket.id}`;
    document.getElementById('budgetTicketDisplay').value = ticketIdFormatted;
    document.getElementById('budgetTotalAmount').value = '';
    document.getElementById('budgetQuotation').value = '';
    document.getElementById('budgetJustification').value = '';
    document.getElementById('pettyCashHint').textContent = '';

    document.getElementById('budgetModal').classList.add('active');

    // Show petty cash hint when amount changes
    document.getElementById('budgetTotalAmount').addEventListener('input', updatePettyCashHint);
}

function closeBudgetModal() {
    document.getElementById('budgetModal').classList.remove('active');
    document.getElementById('budgetTotalAmount').removeEventListener('input', updatePettyCashHint);
}

function updatePettyCashHint() {
    const val = parseFloat(document.getElementById('budgetTotalAmount').value) || 0;
    const hintEl = document.getElementById('pettyCashHint');
    if (val > 0) {
        // We don't know petty cash limit client-side; show generic guidance
        hintEl.textContent = 'Note: amounts above the petty cash limit require Maintenance Manager approval.';
        hintEl.className = 'form-hint warn';
    } else {
        hintEl.textContent = '';
        hintEl.className = 'form-hint';
    }
}

async function submitBudget(e) {
    e.preventDefault();
    const btn = document.getElementById('budgetSubmitBtn');
    const totalAmount = parseFloat(document.getElementById('budgetTotalAmount').value);
    const quotation   = document.getElementById('budgetQuotation').value.trim();
    const justification = document.getElementById('budgetJustification').value.trim();

    if (!totalAmount || totalAmount <= 0 || !quotation || !justification) {
        showToast('Please fill in all required fields.', 'error');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    try {
        const resp = await API.post('/budget-reports', {
            fault_ticket_id: ticketData.id,
            total_amount:    totalAmount,
            quotation:       quotation,
            justification:   justification
        });

        if (resp.status === 'success') {
            showToast('Budget report submitted successfully!', 'success');
            closeBudgetModal();
            // Reload to reflect new status
            await loadAll();
        } else {
            showToast(resp.message || 'Failed to submit budget report.', 'error');
        }
    } catch (err) {
        console.error('submitBudget error:', err);
        showToast('An error occurred. Please try again.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Report';
    }
}

// ── Parts Modal ────────────────────────────────────────────────────────────

function openPartsModal() {
    const ticket = ticketData;
    const ticketIdFormatted = ticket.breakdown_report_id || ticket.ticket_id || `#${ticket.id}`;
    document.getElementById('partsTicketDisplay').value = ticketIdFormatted;
    document.getElementById('partsEquipment').value =
        ticket.machine_model_number || ticket.machine_name || '';
    document.getElementById('partsLocation').value = ticket.location || '';
    document.getElementById('partsPriority').value = ticket.priority || 'Medium';
    document.getElementById('partsNotes').value     = '';

    // Reset items list with one row
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
    if (listEl.querySelector('.part-row-header')) return; // already added
    const header = document.createElement('div');
    header.className = 'part-row-header';
    header.innerHTML = `
        <span>Part Name</span>
        <span>Qty</span>
        <span class="part-unit">Unit</span>
        <span></span>
    `;
    listEl.insertBefore(header, listEl.firstChild);
}

function addPartRow() {
    const listEl = document.getElementById('partsItemsList');
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

function removePartRow(btn) {
    const listEl = document.getElementById('partsItemsList');
    const rows   = listEl.querySelectorAll('.part-row');
    if (rows.length <= 1) {
        showToast('At least one spare part item is required.', 'warning');
        return;
    }
    btn.closest('.part-row').remove();
}

async function submitPartsRequest(e) {
    e.preventDefault();
    const btn = document.getElementById('partsSubmitBtn');

    // Collect items
    const listEl = document.getElementById('partsItemsList');
    const rows   = listEl.querySelectorAll('.part-row');
    const items  = [];

    let hasError = false;
    rows.forEach(row => {
        const name = row.querySelector('.part-name').value.trim();
        const qty  = parseInt(row.querySelector('.part-qty').value) || 1;
        const unit = row.querySelector('.part-unit').value.trim() || 'pcs';
        if (name) {
            items.push({ part_name: name, quantity: qty, unit });
        } else {
            hasError = true;
        }
    });

    if (hasError || items.length === 0) {
        showToast('Please enter a valid part name for each row.', 'error');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    try {
        const ticket = ticketData;
        const resp = await API.post('/spare-part-requests', {
            fault_ticket_id:      ticket.id,
            ticket_id_formatted:  ticket.breakdown_report_id || ticket.ticket_id || null,
            equipment_name:       document.getElementById('partsEquipment').value.trim() || null,
            location:             document.getElementById('partsLocation').value.trim()  || null,
            priority:             document.getElementById('partsPriority').value,
            additional_notes:     document.getElementById('partsNotes').value.trim()     || null,
            items
        });

        if (resp.status === 'success') {
            showToast('Spare parts request submitted successfully!', 'success');
            closePartsModal();
            await loadAll();
        } else {
            showToast(resp.message || 'Failed to submit spare parts request.', 'error');
        }
    } catch (err) {
        console.error('submitPartsRequest error:', err);
        showToast('An error occurred. Please try again.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Request';
    }
}

// ── Complete Modal ─────────────────────────────────────────────────────────

function openCompleteModal() {
    document.getElementById('completeSummary').value = '';
    document.getElementById('completeModal').classList.add('active');
}

function closeCompleteModal() {
    document.getElementById('completeModal').classList.remove('active');
}

async function submitComplete(e) {
    e.preventDefault();
    const btn = document.getElementById('completeSubmitBtn');
    const summary = document.getElementById('completeSummary').value.trim();

    if (!summary) {
        showToast('Please enter work summary / resolution notes.', 'error');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
        const resp = await API.post(`/fault-tickets/${ticketData.id}/complete`, {
            work_summary: summary
        });

        if (resp.status === 'success') {
            showToast('Ticket marked as resolved!', 'success');
            closeCompleteModal();
            await loadAll();
        } else {
            showToast(resp.message || 'Failed to resolve ticket.', 'error');
        }
    } catch (err) {
        console.error('submitComplete error:', err);
        showToast('An error occurred. Please try again.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check"></i> Confirm Resolved';
    }
}

// ── Close modals on overlay click ──────────────────────────────────────────

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});
