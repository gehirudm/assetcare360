class MaintenanceApproveCostModal extends HTMLElement {
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
            <div id="approveModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <button class="close" type="button" data-action="close-modal">&times;</button>
                    <h2 style="margin-bottom: 20px; color: var(--kelly-green);">Approve Cost Request</h2>
                    <form id="approveCostForm">
                        <div class="form-section">
                            <h5><i class="fas fa-check-circle"></i> Approval Details</h5>
                            <div class="form-group">
                                <label class="form-label">Request ID</label>
                                <input type="text" class="form-input" id="approveRequestId" readonly>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Approval Comments</label>
                                <textarea class="form-textarea" id="approveComments" placeholder="Add any comments for approval..." required></textarea>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Budget Code (Optional)</label>
                                <input type="text" class="form-input" id="approveBudgetCode" placeholder="Enter budget code if applicable">
                            </div>
                        </div>
                        <button type="submit" class="btn btn-success">Approve Request</button>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const form = this.querySelector('#approveCostForm');

        this.addEventListener('click', (event) => {
            if (event.target.closest('[data-action="close-modal"]') || event.target.id === 'approveModal') {
                this.close();
            }
        });

        form?.addEventListener('submit', (event) => {
            event.preventDefault();

            const requestId = this.querySelector('#approveRequestId')?.value || '';
            const comments = this.querySelector('#approveComments')?.value?.trim() || '';
            const budgetCode = this.querySelector('#approveBudgetCode')?.value?.trim() || '';

            this.dispatchEvent(new CustomEvent('maintenance-cost:approve-submit', {
                bubbles: true,
                detail: {
                    requestId,
                    comments,
                    budgetCode,
                },
            }));

            form.reset();
            this.close();
        });
    }

    open(requestId) {
        const requestField = this.querySelector('#approveRequestId');
        if (requestField) {
            requestField.value = String(requestId || '');
        }

        const commentsField = this.querySelector('#approveComments');
        if (commentsField) {
            commentsField.value = 'Approved by Maintenance Manager';
        }

        if (typeof window.openModal === 'function') {
            window.openModal('approveModal');
            return;
        }

        const modal = this.querySelector('#approveModal');
        if (!modal) {
            return;
        }

        modal.classList.add('active');
        modal.style.display = '';
    }

    close() {
        if (typeof window.closeModal === 'function') {
            window.closeModal('approveModal');
            return;
        }

        const modal = this.querySelector('#approveModal');
        if (!modal) {
            return;
        }

        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

customElements.define('maintenance-approve-cost-modal', MaintenanceApproveCostModal);
