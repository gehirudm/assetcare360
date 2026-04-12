class SupervisorBudgetApproval extends HTMLElement {
    constructor() {
        super();
        this._budgets = [];
        this._loading = false;
        this._error = '';
        this._activeFilter = 'all';
        this._onRootClick = this._onRootClick.bind(this);
        this._onDocumentClick = this._onDocumentClick.bind(this);
    }

    connectedCallback() {
        if (this._initialized) return;

        this.render();
        this.addEventListener('click', this._onRootClick);
        document.addEventListener('click', this._onDocumentClick);
        this._initialized = true;
        this.refresh();
    }

    disconnectedCallback() {
        this.removeEventListener('click', this._onRootClick);
        document.removeEventListener('click', this._onDocumentClick);
    }

    refresh() {
        return this.loadBudgets();
    }

    _onRootClick(event) {
        const filterButton = event.target.closest('button[data-budget-filter]');
        if (filterButton) {
            const status = filterButton.dataset.budgetFilter || 'all';
            this.applyFilter(status, filterButton);
            return;
        }

        const viewButton = event.target.closest('button[data-budget-view]');
        if (viewButton) {
            const budgetId = viewButton.dataset.budgetView;
            if (!budgetId) return;

            const budget = this._budgets.find(item => item.id === String(budgetId));

            this.dispatchEvent(new CustomEvent('supervisor-budget-approval:view', {
                bubbles: true,
                detail: {
                    budgetId,
                    budget: budget ? budget.raw : null
                }
            }));
            return;
        }

        const approveButton = event.target.closest('button[data-budget-approve]');
        if (approveButton) {
            const budgetId = approveButton.dataset.budgetApprove;
            if (!budgetId) return;
            this.approveBudget(budgetId);
            return;
        }

        const rejectButton = event.target.closest('button[data-budget-reject]');
        if (rejectButton) {
            const budgetId = rejectButton.dataset.budgetReject;
            if (!budgetId) return;
            this.rejectBudget(budgetId);
            return;
        }

        const dropdownTrigger = event.target.closest('button[data-dropdown-id]');
        if (!dropdownTrigger) return;

        event.preventDefault();
        event.stopPropagation();

        const dropdownId = dropdownTrigger.dataset.dropdownId;
        if (!dropdownId) return;

        this.toggleDropdown(dropdownId);
    }

    _onDocumentClick(event) {
        if (this.contains(event.target)) return;
        this.closeAllDropdowns();
    }

    toggleDropdown(dropdownId) {
        const target = this.querySelector(`#dropdown-${dropdownId}`);
        if (!target) return;

        const shouldOpen = !target.classList.contains('show');
        this.closeAllDropdowns();

        if (shouldOpen) {
            target.classList.add('show');
        }
    }

    closeAllDropdowns() {
        this.querySelectorAll('.dropdown-menu.show').forEach(menu => {
            menu.classList.remove('show');
        });
    }

    async loadBudgets() {
        this._loading = true;
        this._error = '';
        this.renderBudgetList();

        try {
            if (!window.API || typeof window.API.get !== 'function') {
                throw new Error('API client is not available on this page');
            }

            const response = await window.API.get('/budget-reports/pending');
            if (response.status !== 'success') {
                throw new Error(response.message || 'Failed to load pending budgets');
            }

            const reports = response.data?.reports || [];
            this._budgets = reports.map(report => this.normalizeBudget(report));
        } catch (error) {
            console.error('Failed to load budget approvals:', error);
            this._error = error.message || 'Failed to load pending budget approvals';
            this._budgets = [];
        } finally {
            this._loading = false;
            this.renderBudgetList();
        }
    }

    normalizeBudget(report) {
        const numericAmount = Number.parseFloat(report.total_amount || 0);
        const priorityRaw = (report.ticket_priority || 'Medium').toLowerCase();
        const isUrgent = priorityRaw === 'high' || priorityRaw === 'critical';

        return {
            id: String(report.id),
            labelId: `BUD-${String(report.id).padStart(3, '0')}`,
            ticketId: report.ticket_display_id || `Ticket #${report.fault_ticket_id}`,
            ticketDescription: report.ticket_description || 'No description provided',
            submittedBy: report.submitted_by_name || report.submitted_by_employee_id || 'Unknown',
            createdAt: report.created_at || null,
            amount: Number.isFinite(numericAmount) ? numericAmount : 0,
            status: (report.status || 'pending').toLowerCase(),
            approvalLevel: report.approval_level || 'supervisor',
            priorityClass: isUrgent ? 'status-urgent' : 'status-normal',
            priorityLabel: isUrgent ? 'URGENT' : 'NORMAL',
            raw: report
        };
    }

    formatCurrency(amount) {
        const value = Number.isFinite(amount) ? amount : 0;
        return `LKR ${value.toLocaleString('en-LK', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }

    formatDate(dateValue) {
        if (!dateValue) {
            return 'N/A';
        }
        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) {
            return 'N/A';
        }
        return date.toLocaleString('en-LK', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    renderBudgetList() {
        const list = this.querySelector('#pendingBudgetsTable');
        if (!list) return;

        if (this._loading) {
            list.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Loading budget approvals...</p>';
            this.updateBudgetCount();
            this.renderSummary();
            return;
        }

        if (this._error) {
            list.innerHTML = `<p style="text-align:center; color: var(--danger); padding: 20px;">${this.escapeHtml(this._error)}</p>`;
            this.updateBudgetCount();
            this.renderSummary();
            return;
        }

        if (this._budgets.length === 0) {
            list.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 20px;">No budget approvals are pending right now.</p>';
            this.updateBudgetCount();
            this.renderSummary();
            return;
        }

        list.innerHTML = this._budgets.map(item => this.renderBudgetItem(item)).join('');
        this.renderSummary();
        this.applyFilter(this._activeFilter);
    }

    applyFilter(status = 'all', clickedButton = null) {
        const filterButtons = this.querySelectorAll('button[data-budget-filter]');
        const rows = this.querySelectorAll('#pendingBudgetsTable .inventory-item');
        let visibleCount = 0;

        this._activeFilter = status;

        filterButtons.forEach(button => button.classList.remove('active'));

        const selectedButton = clickedButton || this.querySelector(`button[data-budget-filter="${status}"]`) || filterButtons[0];
        if (selectedButton) {
            selectedButton.classList.add('active');
        }

        rows.forEach(row => {
            const rowStatus = row.dataset.status;
            const visible = status === 'all' || rowStatus === status;
            row.style.display = visible ? '' : 'none';
            if (visible) {
                visibleCount += 1;
            }
        });

        this.updateBudgetCount();

        this.dispatchEvent(new CustomEvent('supervisor-budget-approval:filter', {
            bubbles: true,
            detail: {
                status,
                visibleCount
            }
        }));
    }

    updateBudgetCount() {
        const badge = this.querySelector('#budgetCountBadge');
        if (!badge) return;

        const rows = this.querySelectorAll('#pendingBudgetsTable .inventory-item');
        let visibleCount = 0;

        rows.forEach(row => {
            if (row.style.display !== 'none') {
                visibleCount += 1;
            }
        });

        badge.textContent = `${visibleCount} budget${visibleCount !== 1 ? 's' : ''}`;
    }

    renderSummary() {
        const totalRequestsEl = this.querySelector('#summaryTotalRequests');
        const pendingEl = this.querySelector('#summaryPending');
        const approvedEl = this.querySelector('#summaryApproved');
        const rejectedEl = this.querySelector('#summaryRejected');

        if (!totalRequestsEl || !pendingEl || !approvedEl || !rejectedEl) {
            return;
        }

        const totals = this._budgets.reduce((acc, item) => {
            acc.total += item.amount;
            if (item.status === 'pending') acc.pending += item.amount;
            if (item.status === 'approved') acc.approved += item.amount;
            if (item.status === 'rejected') acc.rejected += item.amount;
            return acc;
        }, { total: 0, pending: 0, approved: 0, rejected: 0 });

        totalRequestsEl.textContent = this.formatCurrency(totals.total);
        pendingEl.textContent = this.formatCurrency(totals.pending);
        approvedEl.textContent = this.formatCurrency(totals.approved);
        rejectedEl.textContent = this.formatCurrency(totals.rejected);
    }

    approveBudget(budgetId) {
        const confirmAction = () => {
            this.reviewBudget(budgetId, 'approved');
        };

        if (typeof createConfirmationDialog === 'function') {
            createConfirmationDialog(
                'Approve Budget',
                `Approve budget ${budgetId}?`,
                confirmAction,
                'success'
            );
            return;
        }

        confirmAction();
    }

    rejectBudget(budgetId) {
        const confirmAction = () => {
            this.reviewBudget(budgetId, 'rejected');
        };

        if (typeof createConfirmationDialog === 'function') {
            createConfirmationDialog(
                'Reject Budget',
                `Reject budget ${budgetId}? Technician will need to revise.`,
                confirmAction,
                'danger'
            );
            return;
        }

        confirmAction();
    }

    async reviewBudget(budgetId, status) {
        try {
            if (!window.API || typeof window.API.post !== 'function') {
                throw new Error('API client is not available on this page');
            }

            const note = status === 'approved'
                ? 'Approved by Supervisor'
                : 'Rejected by Supervisor';

            const response = await window.API.post(`/budget-reports/${budgetId}/review`, {
                status,
                review_notes: note
            });

            if (response.status !== 'success') {
                throw new Error(response.message || `Failed to ${status} budget`);
            }

            const report = response.data?.report || null;
            const reportStatus = (report?.status || status).toLowerCase();
            const target = this._budgets.find(item => item.id === String(budgetId));
            if (target) {
                target.status = reportStatus;
                target.raw = report || target.raw;
            }

            this.dispatchEvent(new CustomEvent('supervisor-budget-approval:status-change', {
                bubbles: true,
                detail: {
                    budgetId,
                    status: reportStatus,
                    report
                }
            }));

            this.showToast(`Budget ${budgetId} ${status} successfully.`, status === 'approved' ? 'success' : 'warning');
            this.renderBudgetList();
            this.closeAllDropdowns();
        } catch (error) {
            console.error('Budget review error:', error);
            this.showToast(error.message || 'Failed to submit budget review', 'error');
        }
    }

    showToast(message, type = 'success') {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
            return;
        }
        console.log(`[${type}] ${message}`);
    }

    escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-dollar-sign"></i> Budget Approval</h2>
                <p class="page-subtitle">Review and approve repair budgets</p>
            </div>

            <div class="filter-controls" id="budgetStatusFilters">
                <button type="button" class="filter-btn active" data-budget-filter="all">All Budgets</button>
                <button type="button" class="filter-btn" data-budget-filter="pending">Pending</button>
                <button type="button" class="filter-btn" data-budget-filter="approved">Approved</button>
                <button type="button" class="filter-btn" data-budget-filter="rejected">Rejected</button>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-file-invoice-dollar"></i> Budget Approvals</span>
                    <span class="status-text status-pending" id="budgetCountBadge">0 budgets</span>
                </div>
                <div id="pendingBudgetsTable" class="inventory-list"></div>
            </div>

            <div class="grid">
                <div class="card">
                    <div class="card-header"><i class="fas fa-chart-pie"></i> Monthly Budget Summary</div>
                    <div style="padding: 15px 0;">
                        <div style="margin-bottom: 10px;"><strong>Total Requested:</strong> <span id="summaryTotalRequests">LKR 0.00</span></div>
                        <div style="margin-bottom: 10px;"><strong>Pending Approvals:</strong> <span id="summaryPending">LKR 0.00</span></div>
                        <div style="margin-bottom: 10px;"><strong>Approved Amount:</strong> <span id="summaryApproved">LKR 0.00</span></div>
                        <div><strong>Rejected Amount:</strong> <span id="summaryRejected">LKR 0.00</span></div>
                    </div>
                </div>
            </div>
        `;
    }

    renderBudgetItem(item) {
        const status = item.status || 'pending';
        const isPending = status === 'pending';
        const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
        const statusClass = status === 'approved'
            ? 'status-completed'
            : status === 'rejected'
                ? 'status-rejected'
                : 'status-pending';

        const description = this.escapeHtml(item.ticketDescription);
        const submittedBy = this.escapeHtml(item.submittedBy);
        const ticketId = this.escapeHtml(item.ticketId);
        const displayId = this.escapeHtml(item.labelId);
        const approvalLevel = item.approvalLevel === 'maintenance_manager' ? 'Maintenance Manager' : 'Supervisor';

        return `
            <div class="inventory-item" data-id="${item.id}" data-status="${status}">
                <div class="item-details">
                    <strong><i class="fas fa-file-invoice-dollar"></i> ${displayId}</strong>
                    <div class="item-meta">
                        <i class="fas fa-ticket-alt"></i> ${ticketId} |
                        <i class="fas fa-user"></i> Submitted by ${submittedBy}
                    </div>
                    <div class="item-description">
                        <span class="status-text ${item.priorityClass}">${item.priorityLabel}</span> |
                        <span class="status-text status-info">${approvalLevel}</span> |
                        <i class="fas fa-coins"></i> ${this.formatCurrency(item.amount)}
                    </div>
                    <div class="item-meta" style="margin-top: 6px;">
                        <i class="fas fa-calendar"></i> ${this.formatDate(item.createdAt)}
                    </div>
                    <div class="item-description" style="margin-top: 6px;">
                        ${description}
                    </div>
                </div>
                <div class="item-actions">
                    <div class="action-buttons">
                        <button type="button" class="btn btn-primary btn-small" data-budget-view="${item.id}"><i class="fas fa-eye"></i> VIEW</button>
                        ${isPending ? `
                            <div class="dropdown-container">
                                <button type="button" class="btn btn-small btn-secondary dropdown-trigger" data-dropdown-id="budget-${item.id}">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <div class="dropdown-menu" id="dropdown-budget-${item.id}">
                                    <button type="button" class="dropdown-item" data-budget-approve="${item.id}">
                                        <i class="fas fa-check"></i> Approve
                                    </button>
                                    <button type="button" class="dropdown-item danger" data-budget-reject="${item.id}">
                                        <i class="fas fa-times"></i> Reject
                                    </button>
                                </div>
                            </div>
                        ` : `<span class="status-text ${statusClass}">${statusLabel}</span>`}
                    </div>
                </div>
            </div>
        `;
    }
}

if (!customElements.get('supervisor-budget-approval')) {
    customElements.define('supervisor-budget-approval', SupervisorBudgetApproval);
}
