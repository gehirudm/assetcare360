class MaintenanceRejectCostModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.render();
        this.bindEvents();
    }

    render() {
        this.innerHTML = `
            <div id="rejectModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h4><i class="fas fa-times-circle"></i> Reject Cost Request</h4>
                        <button class="btn-close" type="button" data-action="close-modal">&times;</button>
                    </div>
                    <form id="rejectCostForm">
                        <div class="form-section">
                            <h5><i class="fas fa-times-circle"></i> Rejection Details</h5>
                            <div class="form-group">
                                <label class="form-label">Request ID</label>
                                <input type="text" class="form-input" id="rejectRequestId" readonly>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Reason for Rejection</label>
                                <select class="form-select" id="rejectReason" required>
                                    <option value="">Select Reason</option>
                                    <option value="budget_exceeded">Budget Exceeded</option>
                                    <option value="insufficient_justification">Insufficient Justification</option>
                                    <option value="alternative_solution">Alternative Solution Required</option>
                                    <option value="timing">Timing Issues</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Detailed Comments</label>
                                <textarea class="form-textarea" id="rejectComments" placeholder="Provide detailed reason for rejection..." required></textarea>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Suggested Alternative (Optional)</label>
                                <textarea class="form-textarea" id="rejectAlternative" placeholder="Suggest alternative repair or cost-saving options..."></textarea>
                            </div>
                        </div>
                        <button type="submit" class="btn btn-danger">Reject Request</button>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const form = this.querySelector('#rejectCostForm');

        this.addEventListener('click', (event) => {
            if (event.target.closest('[data-action="close-modal"]') || event.target.id === 'rejectModal') {
                this.close();
            }
        });

        form?.addEventListener('submit', (event) => {
            event.preventDefault();

            const requestId = this.querySelector('#rejectRequestId')?.value || '';
            const reason = this.querySelector('#rejectReason')?.value || '';
            const comments = this.querySelector('#rejectComments')?.value?.trim() || '';
            const alternative = this.querySelector('#rejectAlternative')?.value?.trim() || '';

            this.dispatchEvent(new CustomEvent('maintenance-cost:reject-submit', {
                bubbles: true,
                detail: {
                    requestId,
                    reason,
                    comments,
                    alternative,
                },
            }));

            form.reset();
            this.close();
        });
    }

    open(requestId) {
        const requestField = this.querySelector('#rejectRequestId');
        if (requestField) {
            requestField.value = String(requestId || '');
        }

        if (typeof window.openModal === 'function') {
            window.openModal('rejectModal');
            return;
        }

        const modal = this.querySelector('#rejectModal');
        if (!modal) {
            return;
        }

        modal.classList.add('active');
        modal.style.display = '';
    }

    close() {
        if (typeof window.closeModal === 'function') {
            window.closeModal('rejectModal');
            return;
        }

        const modal = this.querySelector('#rejectModal');
        if (!modal) {
            return;
        }

        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

customElements.define('maintenance-reject-cost-modal', MaintenanceRejectCostModal);
