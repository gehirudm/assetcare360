(function initViewTicketBudgetModule(globalScope) {
    class ViewTicketBudgetManager {
        constructor(options) {
            this.api = options.api;
            this.getCurrentUser = options.getCurrentUser;
            this.getTicketData = options.getTicketData;
            this.showToast = options.showToast;
            this.formatDate = options.formatDate;
            this._currentReport = null;
        }

        _currentUser() {
            return typeof this.getCurrentUser === 'function' ? this.getCurrentUser() : null;
        }

        _ticketData() {
            return typeof this.getTicketData === 'function' ? this.getTicketData() : null;
        }

        _isTechnicalOfficer() {
            return this._currentUser()?.role === 'Technical Officer';
        }

        _budgetReportCard() {
            return document.getElementById('budgetReportCard');
        }

        _budgetReportContent() {
            return document.getElementById('budgetReportContent');
        }

        _budgetForm() {
            return document.getElementById('budgetReportForm');
        }

        async loadBudgetReport() {
            const ticket = this._ticketData();
            if (!ticket) return;

            const card = this._budgetReportCard();
            if (!card) return;

            if (!this._isTechnicalOfficer()) {
                card.style.display = 'none';
                return;
            }

            card.style.display = 'block';

            try {
                const response = await this.api.get(`/budget-reports/ticket/${ticket.id}/latest`);

                if (response.status === 'success' && response.data.report) {
                    this._currentReport = response.data.report;
                    this._renderExistingBudgetReport(response.data.report);
                } else {
                    this._currentReport = null;
                    this._renderNewBudgetReportForm();
                }
            } catch (error) {
                console.error('Error loading budget report:', error);
                this._currentReport = null;
                this._renderNewBudgetReportForm();
            }
        }

        _renderExistingBudgetReport(report) {
            const content = this._budgetReportContent();
            if (!content) return;

            const statusClass = report.status === 'approved'
                ? 'status-completed'
                : report.status === 'rejected'
                    ? 'status-urgent'
                    : report.status === 'revised'
                        ? 'status-normal'
                        : 'status-pending';

            const statusText = report.status.charAt(0).toUpperCase() + report.status.slice(1);
            const ticket = this._ticketData();

            const canEdit = true;

            content.innerHTML = `
                <div class="budget-report-view">
                    <div class="budget-status-badge ${statusClass}">
                        <i class="fas ${report.status === 'approved' ? 'fa-check-circle' : report.status === 'rejected' ? 'fa-times-circle' : report.status === 'revised' ? 'fa-edit' : 'fa-clock'}"></i>
                        ${statusText}
                    </div>

                    <div class="budget-section">
                        <h4><i class="fas fa-file-alt"></i> Quotation</h4>
                        <div class="budget-quotation">${report.quotation.replace(/\n/g, '<br>')}</div>
                    </div>

                    <div class="budget-section">
                        <h4><i class="fas fa-rupee-sign"></i> Total Amount</h4>
                        <div class="budget-amount">LKR ${parseFloat(report.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>

                    <div class="budget-section">
                        <h4><i class="fas fa-comment-dots"></i> Justification</h4>
                        <div class="budget-justification">${report.justification.replace(/\n/g, '<br>')}</div>
                    </div>

                    <div class="budget-meta">
                        <small><i class="fas fa-user"></i> Submitted by: ${report.submitted_by_name || 'Unknown'}</small>
                        <small><i class="fas fa-calendar"></i> ${this.formatDate(report.created_at)}</small>
                    </div>

                    ${report.status !== 'pending' && report.reviewed_by_name ? `
                        <div class="budget-review">
                            <h4><i class="fas fa-clipboard-check"></i> Review</h4>
                            <p><strong>Reviewed by:</strong> ${report.reviewed_by_name}</p>
                            <p><strong>Date:</strong> ${this.formatDate(report.reviewed_at)}</p>
                            ${report.review_notes ? `<p><strong>Notes:</strong> ${report.review_notes}</p>` : ''}
                        </div>
                    ` : ''}

                    ${(report.status === 'pending' || report.status === 'revised') ? `
                        <div style="display: flex; gap: 10px; margin-top: 15px;">
                            <button type="button" class="btn btn-primary" data-action="budget-open-edit" data-report-id="${report.id}">
                                <i class="fas fa-edit"></i> Edit Budget Report
                            </button>
                            ${report.status === 'pending' ? `
                                <button type="button" class="btn btn-danger" data-action="budget-delete" data-report-id="${report.id}">
                                    <i class="fas fa-trash"></i> Delete Report
                                </button>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
            `;
        }

        _renderNewBudgetReportForm() {
            const content = this._budgetReportContent();
            if (!content) return;

            const ticket = this._ticketData();

            content.innerHTML = `
                <div class="budget-report-empty">
                    <i class="fas fa-file-invoice-dollar" style="font-size: 3rem; color: var(--muted); margin-bottom: 15px;"></i>
                    <p style="color: var(--muted); margin-bottom: 20px;">No budget report submitted yet</p>
                    <button type="button" class="btn btn-primary" data-action="budget-open-create">
                        <i class="fas fa-plus"></i> Submit Budget Report
                    </button>
                </div>
            `;
        }

        openBudgetReportModal(existingReport = null) {
            const modal = document.getElementById('budgetReportModal');
            const form = this._budgetForm();
            const title = document.getElementById('budgetModalTitle');
            if (!modal || !form || !title) return;

            if (existingReport) {
                title.textContent = 'Edit Budget Report';
                document.getElementById('quotationInput').value = existingReport.quotation;
                document.getElementById('totalAmountInput').value = parseFloat(existingReport.total_amount).toFixed(2);
                document.getElementById('justificationInput').value = existingReport.justification;
                form.dataset.reportId = existingReport.id;
            } else {
                title.textContent = 'Submit Budget Report';
                form.reset();
                delete form.dataset.reportId;
            }

            modal.classList.add('active');
        }

        closeBudgetReportModal() {
            const modal = document.getElementById('budgetReportModal');
            const form = this._budgetForm();
            if (!modal || !form) return;

            modal.classList.remove('active');
            form.reset();
            delete form.dataset.reportId;
        }

        async submitBudgetReport(form) {
            const ticket = this._ticketData();
            if (!ticket) return;

            const reportId = form.dataset.reportId;
            const budgetData = {
                fault_ticket_id: ticket.id,
                quotation: document.getElementById('quotationInput').value.trim(),
                total_amount: parseFloat(document.getElementById('totalAmountInput').value),
                justification: document.getElementById('justificationInput').value.trim()
            };

            try {
                let response;
                if (reportId) {
                    response = await this.api.put(`/budget-reports/${reportId}`, budgetData);
                } else {
                    response = await this.api.post('/budget-reports', budgetData);
                }

                if (response.status === 'success') {
                    this.showToast(reportId ? 'Budget report updated successfully!' : 'Budget report submitted successfully!');
                    this.closeBudgetReportModal();
                    await this.loadBudgetReport();
                } else {
                    throw new Error(response.message || 'Failed to submit budget report');
                }
            } catch (error) {
                console.error('Error submitting budget report:', error);
                this.showToast(error.message || 'Failed to submit budget report. Please try again.', true);
            }
        }

        async deleteBudgetReport(reportId) {
            if (!window.confirm('Are you sure you want to delete this budget report? This action cannot be undone and the ticket status will revert to "Open".')) {
                return;
            }

            try {
                const response = await this.api.delete(`/budget-reports/${reportId}`);

                if (response.status === 'success') {
                    this.showToast('Budget report deleted successfully!');
                    window.location.reload();
                } else {
                    throw new Error(response.message || 'Failed to delete budget report');
                }
            } catch (error) {
                console.error('Error deleting budget report:', error);
                this.showToast(error.message || 'Failed to delete budget report. Please try again.', true);
            }
        }

        async handleAction(action, actionElement) {
            if (action === 'budget-open-create') {
                this.openBudgetReportModal();
                return;
            }

            if (action === 'budget-open-edit') {
                if (this._currentReport) {
                    this.openBudgetReportModal(this._currentReport);
                }
                return;
            }

            if (action === 'budget-delete') {
                const reportId = Number(actionElement.dataset.reportId);
                if (!reportId) return;
                await this.deleteBudgetReport(reportId);
                return;
            }

            if (action === 'budget-close-modal') {
                this.closeBudgetReportModal();
            }
        }
    }

    globalScope.ViewTicketBudgetManager = ViewTicketBudgetManager;
}(window));
