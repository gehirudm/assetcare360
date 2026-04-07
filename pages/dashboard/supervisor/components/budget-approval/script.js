class SupervisorBudgetApproval extends HTMLElement {
    constructor() {
        super();
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

        this.applyFilter('all');
    }

    disconnectedCallback() {
        this.removeEventListener('click', this._onRootClick);
        document.removeEventListener('click', this._onDocumentClick);
    }

    refresh() {
        this.updateBudgetCount();
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

            this.dispatchEvent(new CustomEvent('supervisor-budget-approval:view', {
                bubbles: true,
                detail: { budgetId }
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

    approveBudget(budgetId) {
        const confirmAction = () => {
            this.updateBudgetStatus(budgetId, 'approved');
            this.dispatchEvent(new CustomEvent('supervisor-budget-approval:status-change', {
                bubbles: true,
                detail: {
                    budgetId,
                    status: 'approved'
                }
            }));
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
            this.updateBudgetStatus(budgetId, 'rejected');
            this.dispatchEvent(new CustomEvent('supervisor-budget-approval:status-change', {
                bubbles: true,
                detail: {
                    budgetId,
                    status: 'rejected'
                }
            }));
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

    updateBudgetStatus(budgetId, status) {
        const row = this.querySelector(`.inventory-item[data-id="${budgetId}"]`);
        if (!row) return;

        row.dataset.status = status;

        const actionButtons = row.querySelector('.action-buttons');
        if (actionButtons) {
            const statusClass = status === 'approved' ? 'status-completed' : 'status-rejected';
            const statusLabel = status === 'approved' ? 'Approved' : 'Rejected';

            actionButtons.innerHTML = `
                <span class="status-text ${statusClass}">${statusLabel}</span>
                <button type="button" class="btn btn-secondary btn-small" data-budget-view="${budgetId}"><i class="fas fa-eye"></i> View</button>
            `;
        }

        this.closeAllDropdowns();
        this.applyFilter(this._activeFilter);
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
                    <span class="status-text status-pending" id="budgetCountBadge">5 budgets</span>
                </div>
                <div id="pendingBudgetsTable" class="inventory-list">
                    ${this.renderBudgetItem('BUD-001', 'Tire Replacement', 'LKA-1234', 'BR-003', 'Kamal', 'status-urgent', 'URGENT', 'LKR 12,500')}
                    ${this.renderBudgetItem('BUD-002', 'Battery Replacement', 'LKA-5678', 'BR-005', 'Saman', 'status-normal', 'NORMAL', 'LKR 8,750')}
                    ${this.renderBudgetItem('BUD-003', 'Brake System Repair', 'LKA-9012', 'BR-007', 'Nimal', 'status-urgent', 'URGENT', 'LKR 15,200')}
                    ${this.renderBudgetItem('BUD-004', 'Coolant System Leak', 'LKA-3456', 'BR-009', 'Anil', 'status-normal', 'NORMAL', 'LKR 6,500')}
                    ${this.renderBudgetItem('BUD-005', 'Transmission Issue', 'LKA-7890', 'BR-011', 'Sunil', 'status-urgent', 'URGENT', 'LKR 22,800')}
                </div>
            </div>

            <div class="grid">
                <div class="card">
                    <div class="card-header"><i class="fas fa-chart-pie"></i> Monthly Budget Summary</div>
                    <div style="padding: 15px 0;">
                        <div style="margin-bottom: 10px;"><strong>Total Allocated:</strong> $50,000</div>
                        <div style="margin-bottom: 10px;"><strong>Total Spent:</strong> $38,450</div>
                        <div style="margin-bottom: 10px;"><strong>Pending Approvals:</strong> $8,300</div>
                        <div><strong>Remaining:</strong> $3,250</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderBudgetItem(id, title, vehicleId, breakdownId, driverName, priorityClass, priorityLabel, amount) {
        return `
            <div class="inventory-item" data-id="${id}" data-breakdown-id="${breakdownId}" data-type="in-route" data-status="pending">
                <div class="item-details">
                    <strong><i class="fas fa-file-invoice-dollar"></i> ${id} - ${title}</strong>
                    <div class="item-meta">
                        <i class="fas fa-truck"></i> Vehicle ${vehicleId} |
                        <i class="fas fa-ticket-alt"></i> ${breakdownId} |
                        <i class="fas fa-user"></i> Driver ${driverName}
                    </div>
                    <div class="item-description">
                        <span class="status-text ${priorityClass}">${priorityLabel}</span> |
                        <i class="fas fa-dollar-sign"></i> ${amount}
                    </div>
                </div>
                <div class="item-actions">
                    <div class="action-buttons">
                        <button type="button" class="btn btn-primary btn-small" data-budget-view="${id}"><i class="fas fa-eye"></i> VIEW</button>
                        <div class="dropdown-container">
                            <button type="button" class="btn btn-small btn-secondary dropdown-trigger" data-dropdown-id="budget-${id}">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div class="dropdown-menu" id="dropdown-budget-${id}">
                                <button type="button" class="dropdown-item" data-budget-approve="${id}">
                                    <i class="fas fa-check"></i> Approve
                                </button>
                                <button type="button" class="dropdown-item danger" data-budget-reject="${id}">
                                    <i class="fas fa-times"></i> Reject
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

if (!customElements.get('supervisor-budget-approval')) {
    customElements.define('supervisor-budget-approval', SupervisorBudgetApproval);
}
