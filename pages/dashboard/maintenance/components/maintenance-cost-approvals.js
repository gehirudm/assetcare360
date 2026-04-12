class MaintenanceCostApprovals extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.currentFilter = 'all';
        this.costApprovalData = {};
        this.pendingCostApprovals = [];
        this.approvedCostApprovals = [];
        this.rejectedCostApprovals = [];

        this.render();
        this.bindEvents();
        this.bindModalEvents();
        this.refresh();
    }

    disconnectedCallback() {
        if (this._boundApproveHandler) {
            document.removeEventListener('maintenance-cost:approve-submit', this._boundApproveHandler);
        }
        if (this._boundRejectHandler) {
            document.removeEventListener('maintenance-cost:reject-submit', this._boundRejectHandler);
        }
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Cost Approvals</h1>
                <p class="page-subtitle">Approve/Reject repair costs beyond petty cash</p>
            </div>

            <div class="filter-controls" id="costApprovalsFilterControls">
                <button class="filter-btn active" type="button" data-action="set-filter" data-status="all">All Requests</button>
                <button class="filter-btn" type="button" data-action="set-filter" data-status="pending">Pending</button>
                <button class="filter-btn" type="button" data-action="set-filter" data-status="approved">Approved</button>
                <button class="filter-btn" type="button" data-action="set-filter" data-status="rejected">Rejected</button>
            </div>

            <div class="card cost-approval-card" data-approval-status="pending">
                <div class="card-header"><i class="fas fa-money-bill-wave"></i> Pending Cost Approvals</div>
                <div id="costApprovalPendingList">
                    <p style="text-align: center; color: var(--muted); padding: 20px;">
                        <i class="fas fa-spinner fa-spin"></i> Loading pending approvals...
                    </p>
                </div>
            </div>

            <div class="card cost-approval-card" data-approval-status="approved" style="display: none;">
                <div class="card-header"><i class="fas fa-check-circle"></i> Approved Requests</div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Request ID</th>
                            <th>Supervisor</th>
                            <th>Description</th>
                            <th>Amount</th>
                            <th>Approved Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="costApprovalApprovedBody">
                        <tr>
                            <td colspan="6" style="text-align: center; color: var(--muted);">No approved records loaded yet</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="card cost-approval-card" data-approval-status="rejected" style="display: none;">
                <div class="card-header"><i class="fas fa-times-circle"></i> Rejected Requests</div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Request ID</th>
                            <th>Supervisor</th>
                            <th>Description</th>
                            <th>Amount</th>
                            <th>Rejected Date</th>
                            <th>Reason</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="costApprovalRejectedBody">
                        <tr>
                            <td colspan="7" style="text-align: center; color: var(--muted);">No rejected records loaded yet</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (!button) {
                return;
            }

            const action = button.dataset.action;
            if (!action) {
                return;
            }

            if (action === 'set-filter') {
                this.applyFilter(button.dataset.status, button);
                return;
            }

            if (action === 'open-approve-modal') {
                this.openApproveModal(button.dataset.requestId);
                return;
            }

            if (action === 'open-reject-modal') {
                this.openRejectModal(button.dataset.requestId);
                return;
            }

            if (action === 'view-details') {
                this.viewCostDetails(button.dataset.requestId);
            }
        });
    }

    bindModalEvents() {
        this._boundApproveHandler = (event) => {
            const requestId = String(event.detail?.requestId || '');
            const comments = event.detail?.comments || 'Approved by Maintenance Manager';
            if (!requestId) {
                return;
            }

            this.reviewCostRequest(requestId, 'approved', comments);
        };

        this._boundRejectHandler = (event) => {
            const requestId = String(event.detail?.requestId || '');
            const reason = event.detail?.reason || '';
            const comments = event.detail?.comments || '';
            const reviewNotes = [reason, comments].filter(Boolean).join(' - ') || 'Rejected by Maintenance Manager';

            if (!requestId) {
                return;
            }

            this.reviewCostRequest(requestId, 'rejected', reviewNotes);
        };

        document.addEventListener('maintenance-cost:approve-submit', this._boundApproveHandler);
        document.addEventListener('maintenance-cost:reject-submit', this._boundRejectHandler);
    }

    emitToast(message, type = 'success') {
        this.dispatchEvent(new CustomEvent('maintenance-ui:toast', {
            bubbles: true,
            detail: { message, type },
        }));
    }

    formatLkrCurrency(value) {
        const amount = Number.parseFloat(value || 0);
        const safeAmount = Number.isFinite(amount) ? amount : 0;
        return `LKR ${safeAmount.toLocaleString('en-LK', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    }

    mapBudgetApproval(report) {
        const status = (report.status || 'pending').toLowerCase();
        const id = String(report.id);
        const ticketId = report.ticket_display_id || `Ticket #${report.fault_ticket_id}`;
        const requestedBy = report.submitted_by_name || report.submitted_by_employee_id || 'Unknown';
        const requestDate = report.created_at ? new Date(report.created_at).toLocaleString('en-LK') : 'N/A';
        const approvalLevel = report.approval_level === 'maintenance_manager' ? 'Maintenance Manager' : 'Supervisor';

        return {
            id,
            status,
            requestedBy,
            requestDate,
            ticketId,
            description: report.ticket_description || 'No description provided',
            amount: this.formatLkrCurrency(report.total_amount),
            justification: report.justification || 'No justification provided',
            quotation: report.quotation || 'No quotation details provided',
            approvalLevel,
            priority: report.ticket_priority || 'Medium',
            reviewNotes: report.review_notes || null,
            raw: report,
        };
    }

    async refresh() {
        const pendingContainer = this.querySelector('#costApprovalPendingList');
        if (pendingContainer) {
            pendingContainer.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Loading pending approvals...</p>';
        }

        try {
            const response = await API.get('/budget-reports/pending');
            if (response.status !== 'success') {
                throw new Error(response.message || 'Failed to load budget approvals');
            }

            const reports = response.data?.reports || [];
            this.pendingCostApprovals = reports.map((report) => this.mapBudgetApproval(report)).filter((item) => item.status === 'pending');
            this.approvedCostApprovals = [];
            this.rejectedCostApprovals = [];

            this.costApprovalData = {};
            this.pendingCostApprovals.forEach((item) => {
                this.costApprovalData[item.id] = item;
            });

            this.renderPendingCostApprovals();
            this.renderCostApprovalHistoryTables();
            this.applyFilter(this.currentFilter);
        } catch (error) {
            console.error('Failed to load cost approvals:', error);
            if (pendingContainer) {
                pendingContainer.innerHTML = `<p style="text-align: center; color: var(--danger); padding: 20px;">${error.message || 'Failed to load budget approvals'}</p>`;
            }
            this.emitToast(error.message || 'Failed to load budget approvals', 'error');
        }
    }

    renderPendingCostApprovals() {
        const container = this.querySelector('#costApprovalPendingList');
        if (!container) {
            return;
        }

        if (this.pendingCostApprovals.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 20px;">No pending approvals at the moment.</p>';
            return;
        }

        container.innerHTML = this.pendingCostApprovals.map((item) => `
            <div class="request-item">
                <div class="ticket-details">
                    <strong>BUD-${String(item.id).padStart(3, '0')}</strong>
                    <div class="ticket-meta">Requested by: ${item.requestedBy} | Date: ${item.requestDate}</div>
                    <div class="ticket-issue">${item.description} (${item.ticketId})</div>
                    <div class="ticket-meta">
                        <strong>Amount: ${item.amount}</strong><br>
                        Approval Level: ${item.approvalLevel}
                    </div>
                </div>
                <div class="ticket-actions">
                    <span class="status-badge status-pending">Pending</span>
                    <div style="display: flex; gap: 8px; margin-top: 8px;">
                        <button class="btn btn-success btn-small" type="button" data-action="open-approve-modal" data-request-id="${item.id}">Approve</button>
                        <button class="btn btn-danger btn-small" type="button" data-action="open-reject-modal" data-request-id="${item.id}">Reject</button>
                        <button class="btn btn-secondary btn-small" type="button" data-action="view-details" data-request-id="${item.id}">Details</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderCostApprovalHistoryTables() {
        const approvedBody = this.querySelector('#costApprovalApprovedBody');
        const rejectedBody = this.querySelector('#costApprovalRejectedBody');

        if (approvedBody) {
            if (this.approvedCostApprovals.length === 0) {
                approvedBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--muted);">No approved records loaded yet</td></tr>';
            } else {
                approvedBody.innerHTML = this.approvedCostApprovals.map((item) => `
                    <tr>
                        <td>BUD-${String(item.id).padStart(3, '0')}</td>
                        <td>${item.requestedBy}</td>
                        <td>${item.description}</td>
                        <td>${item.amount}</td>
                        <td>${item.reviewedAt || 'Now'}</td>
                        <td><button class="btn btn-secondary btn-small" type="button" data-action="view-details" data-request-id="${item.id}">View</button></td>
                    </tr>
                `).join('');
            }
        }

        if (rejectedBody) {
            if (this.rejectedCostApprovals.length === 0) {
                rejectedBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--muted);">No rejected records loaded yet</td></tr>';
            } else {
                rejectedBody.innerHTML = this.rejectedCostApprovals.map((item) => `
                    <tr>
                        <td>BUD-${String(item.id).padStart(3, '0')}</td>
                        <td>${item.requestedBy}</td>
                        <td>${item.description}</td>
                        <td>${item.amount}</td>
                        <td>${item.reviewedAt || 'Now'}</td>
                        <td>${item.reviewNotes || 'Rejected by Maintenance Manager'}</td>
                        <td><button class="btn btn-secondary btn-small" type="button" data-action="view-details" data-request-id="${item.id}">View</button></td>
                    </tr>
                `).join('');
            }
        }
    }

    setActiveFilterButton(button) {
        this.querySelectorAll('#costApprovalsFilterControls .filter-btn').forEach((btn) => {
            btn.classList.remove('active');
        });

        if (button) {
            button.classList.add('active');
        }
    }

    applyFilter(status, button) {
        const nextStatus = status || this.currentFilter || 'all';
        this.currentFilter = nextStatus;

        if (button) {
            this.setActiveFilterButton(button);
        } else {
            const activeButton = this.querySelector(`#costApprovalsFilterControls [data-status="${nextStatus}"]`);
            this.setActiveFilterButton(activeButton);
        }

        this.querySelectorAll('.cost-approval-card').forEach((card) => {
            const cardStatus = card.dataset.approvalStatus;
            card.style.display = nextStatus === 'all' || cardStatus === nextStatus ? 'block' : 'none';
        });
    }

    getCostApprovalById(requestId) {
        return this.costApprovalData[String(requestId)]
            || this.pendingCostApprovals.find((item) => item.id === String(requestId))
            || this.approvedCostApprovals.find((item) => item.id === String(requestId))
            || this.rejectedCostApprovals.find((item) => item.id === String(requestId))
            || null;
    }

    viewCostDetails(requestId) {
        const costData = this.getCostApprovalById(requestId);
        if (!costData) {
            this.emitToast(`Cost request ${requestId} not found.`, 'warning');
            return;
        }

        const detailsModal = document.querySelector('maintenance-cost-details-modal');
        if (!detailsModal || typeof detailsModal.open !== 'function') {
            this.emitToast('Cost details modal is unavailable.', 'error');
            return;
        }

        detailsModal.open(costData);
    }

    openApproveModal(requestId) {
        const modal = document.querySelector('maintenance-approve-cost-modal');
        if (!modal || typeof modal.open !== 'function') {
            this.emitToast('Approve modal is unavailable.', 'error');
            return;
        }

        modal.open(String(requestId || ''));
    }

    openRejectModal(requestId) {
        const modal = document.querySelector('maintenance-reject-cost-modal');
        if (!modal || typeof modal.open !== 'function') {
            this.emitToast('Reject modal is unavailable.', 'error');
            return;
        }

        modal.open(String(requestId || ''));
    }

    async reviewCostRequest(requestId, status, reviewNotes) {
        try {
            const response = await API.post(`/budget-reports/${requestId}/review`, {
                status,
                review_notes: reviewNotes || (status === 'approved'
                    ? 'Approved by Maintenance Manager'
                    : 'Rejected by Maintenance Manager'),
            });

            if (response.status !== 'success') {
                throw new Error(response.message || `Failed to ${status} budget request`);
            }

            const reviewedItemIndex = this.pendingCostApprovals.findIndex((item) => item.id === String(requestId));
            if (reviewedItemIndex === -1) {
                await this.refresh();
                return;
            }

            const reviewed = this.pendingCostApprovals.splice(reviewedItemIndex, 1)[0];
            reviewed.status = status;
            reviewed.reviewedAt = new Date().toLocaleString('en-LK');
            reviewed.reviewNotes = reviewNotes || (status === 'approved'
                ? 'Approved by Maintenance Manager'
                : 'Rejected by Maintenance Manager');

            this.costApprovalData[reviewed.id] = reviewed;

            if (status === 'approved') {
                this.approvedCostApprovals.unshift(reviewed);
                this.emitToast(`Cost request ${requestId} approved successfully!`, 'success');
            } else {
                this.rejectedCostApprovals.unshift(reviewed);
                this.emitToast(`Cost request ${requestId} rejected.`, 'warning');
            }

            this.renderPendingCostApprovals();
            this.renderCostApprovalHistoryTables();
            this.applyFilter(this.currentFilter);
        } catch (error) {
            console.error('Cost approval review failed:', error);
            this.emitToast(error.message || 'Failed to update budget approval status', 'error');
        }
    }
}

customElements.define('maintenance-cost-approvals', MaintenanceCostApprovals);
