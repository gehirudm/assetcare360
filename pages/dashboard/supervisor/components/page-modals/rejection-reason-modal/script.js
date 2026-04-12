class SupervisorRejectionReasonModal extends HTMLElement {
    constructor() {
        super();
        this._reportId = null;
    }

    connectedCallback() {
        if (this._initialized) return;
        this.render();
        this.bindEvents();
        this._initialized = true;
    }

    render() {
        this.innerHTML = `
            <div id="rejectionReasonModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-exclamation-triangle"></i> Reject Report</h2>
                        <button class="btn-close" type="button" data-rejection-close>&times;</button>
                    </div>
                    <div class="modal-body">
                        <p style="margin-bottom: 15px; color: #64748b;">Please provide a reason for rejecting this report. The submitter will be notified.</p>
                        <div class="form-group">
                            <label for="rejectionReasonText" style="display: block; margin-bottom: 8px; font-weight: 500; color: #334155;">
                                Rejection Reason <span style="color: #ef4444;">*</span>
                            </label>
                            <textarea id="rejectionReasonText" rows="4" placeholder="Enter reason for rejection..."
                                style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; font-family: inherit; resize: vertical; min-height: 100px;"></textarea>
                            <small id="rejectionReasonError" style="color: #ef4444; display: none; margin-top: 5px;">Rejection reason is required</small>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-rejection-close>
                            <i class="fas fa-times"></i> Cancel
                        </button>
                        <button type="button" class="btn btn-danger" data-rejection-submit>
                            <i class="fas fa-ban"></i> Reject Report
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const closeButton = event.target.closest('[data-rejection-close]');
            if (closeButton) {
                this.close();
                return;
            }

            const submitButton = event.target.closest('[data-rejection-submit]');
            if (submitButton) {
                this.submit();
                return;
            }

            if (event.target.id === 'rejectionReasonModal') {
                this.close();
            }
        });
    }

    open(reportId) {
        this._reportId = reportId;

        const textarea = this.querySelector('#rejectionReasonText');
        const errorNode = this.querySelector('#rejectionReasonError');
        if (textarea) {
            textarea.value = '';
            textarea.style.borderColor = '#cbd5e1';
        }
        if (errorNode) {
            errorNode.style.display = 'none';
        }

        const modal = this.querySelector('#rejectionReasonModal');
        if (!modal) return;

        modal.style.display = 'flex';
        modal.style.opacity = '0';
        document.body.style.overflow = 'hidden';
        void modal.offsetHeight;

        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            setTimeout(() => {
                textarea?.focus();
            }, 100);
        });
    }

    close() {
        const modal = this.querySelector('#rejectionReasonModal');
        if (!modal) return;

        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            this._reportId = null;
        }, 300);
    }

    submit() {
        const textarea = this.querySelector('#rejectionReasonText');
        const errorNode = this.querySelector('#rejectionReasonError');
        if (!textarea || !errorNode) return;

        const reason = textarea.value.trim();
        if (!reason) {
            errorNode.style.display = 'block';
            textarea.style.borderColor = '#ef4444';
            return;
        }

        errorNode.style.display = 'none';
        textarea.style.borderColor = '#cbd5e1';

        this.dispatchEvent(new CustomEvent('supervisor-rejection-reason-modal:submit', {
            bubbles: true,
            detail: {
                reportId: this._reportId,
                reason
            }
        }));
    }
}

if (!customElements.get('supervisor-rejection-reason-modal')) {
    customElements.define('supervisor-rejection-reason-modal', SupervisorRejectionReasonModal);
}
