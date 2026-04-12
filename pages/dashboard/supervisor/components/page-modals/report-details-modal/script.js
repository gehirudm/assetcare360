class SupervisorReportDetailsModal extends HTMLElement {
    connectedCallback() {
        if (this._initialized) return;
        this.render();
        this.bindEvents();
        this._initialized = true;
    }

    render() {
        this.innerHTML = `
            <div id="reportDetailsModal" class="modal">
                <div class="modal-content modal-content-large">
                    <div class="modal-header">
                        <h2 id="reportDetailsModalTitle">
                            <i class="fas fa-file-alt"></i> Report Details
                        </h2>
                        <button class="btn-close" type="button" data-modal-close>&times;</button>
                    </div>
                    <div id="reportDetailsModalContent" class="modal-body"></div>
                    <div class="modal-footer" data-modal-footer>
                        <button type="button" class="btn btn-secondary" data-modal-close>
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const closeButton = event.target.closest('[data-modal-close]');
            if (closeButton) {
                this.close();
                this.dispatchEvent(new CustomEvent('supervisor-report-details-modal:close', { bubbles: true }));
                return;
            }

            const approveButton = event.target.closest('[data-modal-approve]');
            if (approveButton) {
                const reportId = approveButton.getAttribute('data-modal-approve');
                this.dispatchEvent(new CustomEvent('supervisor-report-details-modal:approve', {
                    bubbles: true,
                    detail: { reportId }
                }));
                return;
            }

            const rejectButton = event.target.closest('[data-modal-reject]');
            if (rejectButton) {
                const reportId = rejectButton.getAttribute('data-modal-reject');
                this.dispatchEvent(new CustomEvent('supervisor-report-details-modal:reject', {
                    bubbles: true,
                    detail: { reportId }
                }));
                return;
            }

            if (event.target.id === 'reportDetailsModal') {
                this.close();
                this.dispatchEvent(new CustomEvent('supervisor-report-details-modal:close', { bubbles: true }));
            }
        });
    }

    open(config) {
        const { title, content, status, reportId } = config;
        const titleNode = this.querySelector('#reportDetailsModalTitle');
        const contentNode = this.querySelector('#reportDetailsModalContent');
        const footerNode = this.querySelector('[data-modal-footer]');

        if (titleNode) titleNode.innerHTML = title;
        if (contentNode) contentNode.innerHTML = content;

        if (footerNode) {
            if (status === 'pending') {
                footerNode.innerHTML = `
                    <button type="button" class="btn btn-success" data-modal-approve="${reportId}">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button type="button" class="btn btn-danger" data-modal-reject="${reportId}">
                        <i class="fas fa-times"></i> Reject
                    </button>
                    <button type="button" class="btn btn-secondary" data-modal-close>
                        <i class="fas fa-arrow-left"></i> Close
                    </button>
                `;
            } else {
                footerNode.innerHTML = `
                    <button type="button" class="btn btn-secondary" data-modal-close>
                        <i class="fas fa-times"></i> Close
                    </button>
                `;
            }
        }

        const modal = this.querySelector('#reportDetailsModal');
        if (!modal) return;

        modal.style.display = 'flex';
        modal.style.opacity = '0';
        document.body.style.overflow = 'hidden';
        void modal.offsetHeight;
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
        });
    }

    close() {
        const modal = this.querySelector('#reportDetailsModal');
        if (!modal) return;

        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    }
}

if (!customElements.get('supervisor-report-details-modal')) {
    customElements.define('supervisor-report-details-modal', SupervisorReportDetailsModal);
}
