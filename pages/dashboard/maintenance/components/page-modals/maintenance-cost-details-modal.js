class MaintenanceCostDetailsModal extends HTMLElement {
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
            <div id="costDetailsModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h4><i class="fas fa-info-circle"></i> Cost Request Details</h4>
                        <button class="btn-close" type="button" data-action="close-modal">&times;</button>
                    </div>
                    <div style="padding: 30px;">
                    <div id="costDetailsContent">
                        <!-- Content will be populated by JavaScript -->
                    </div>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            if (event.target.closest('[data-action="close-modal"]') || event.target.id === 'costDetailsModal') {
                this.close();
            }
        });
    }

    open(costData) {
        const detailsContainer = this.querySelector('#costDetailsContent');
        if (detailsContainer) {
            detailsContainer.innerHTML = this.renderContent(costData);
        }

        if (typeof window.openModal === 'function') {
            window.openModal('costDetailsModal');
            return;
        }

        const modal = this.querySelector('#costDetailsModal');
        if (!modal) {
            return;
        }

        modal.classList.add('active');
        modal.style.display = '';
    }

    close() {
        if (typeof window.closeModal === 'function') {
            window.closeModal('costDetailsModal');
            return;
        }

        const modal = this.querySelector('#costDetailsModal');
        if (!modal) {
            return;
        }

        modal.classList.remove('active');
        modal.style.display = 'none';
    }

    renderContent(costData) {
        const status = String(costData?.status || 'pending');
        return `
            <div class="form-section">
                <h5><i class="fas fa-money-bill-wave"></i> Cost Request Information</h5>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div><strong>Request ID:</strong> BUD-${String(costData?.id || '').padStart(3, '0')}</div>
                    <div><strong>Ticket:</strong> ${costData?.ticketId || 'N/A'}</div>
                    <div><strong>Requested By:</strong> ${costData?.requestedBy || 'N/A'}</div>
                    <div><strong>Request Date:</strong> ${costData?.requestDate || 'N/A'}</div>
                    <div><strong>Amount:</strong> ${costData?.amount || 'N/A'}</div>
                    <div><strong>Priority:</strong> ${costData?.priority || 'Medium'}</div>
                    <div><strong>Approval Level:</strong> ${costData?.approvalLevel || 'Maintenance Manager'}</div>
                    <div><strong>Status:</strong> ${status}</div>
                </div>
                <div style="margin-bottom: 15px;">
                    <strong>Description:</strong><br>
                    ${costData?.description || 'N/A'}
                </div>
                <div style="margin-bottom: 15px;">
                    <strong>Justification:</strong><br>
                    ${costData?.justification || 'N/A'}
                </div>
                <div>
                    <strong>Quotation:</strong><br>
                    ${costData?.quotation || 'N/A'}
                </div>
            </div>
        `;
    }
}

customElements.define('maintenance-cost-details-modal', MaintenanceCostDetailsModal);
