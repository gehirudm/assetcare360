class MaintenanceReportDetailsModal extends HTMLElement {
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
            <div id="reportDetailsModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h4><i class="fas fa-clipboard-list"></i> Service Report Details</h4>
                        <button class="btn-close" type="button" data-action="close-modal">&times;</button>
                    </div>
                    <div style="padding: 30px;">
                    <div id="reportDetailsContent">
                        <!-- Content will be populated by JavaScript -->
                    </div>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            if (event.target.closest('[data-action="close-modal"]') || event.target.id === 'reportDetailsModal') {
                this.close();
            }
        });
    }

    open(report) {
        const detailsContainer = this.querySelector('#reportDetailsContent');
        if (detailsContainer) {
            detailsContainer.innerHTML = this.renderContent(report);
        }

        if (typeof window.openModal === 'function') {
            window.openModal('reportDetailsModal');
            return;
        }

        const modal = this.querySelector('#reportDetailsModal');
        if (!modal) {
            return;
        }

        modal.classList.add('active');
    }

    close() {
        if (typeof window.closeModal === 'function') {
            window.closeModal('reportDetailsModal');
            return;
        }

        const modal = this.querySelector('#reportDetailsModal');
        if (!modal) {
            return;
        }

        modal.classList.remove('active');
    }

    renderContent(report) {
        return `
            <div class="form-section">
                <h5><i class="fas fa-clipboard-list"></i> Service Report Information</h5>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div><strong>Report ID:</strong> ${report.id}</div>
                    <div><strong>Equipment:</strong> ${report.equipment}</div>
                    <div><strong>Service Type:</strong> ${report.serviceType}</div>
                    <div><strong>Cost:</strong> ${report.cost}</div>
                    <div><strong>Technical Officer:</strong> ${report.technicalOfficer}</div>
                    <div><strong>Service Date:</strong> ${report.serviceDate}</div>
                    <div><strong>Labor Hours:</strong> ${report.laborHours}</div>
                    <div><strong>Next Service Due:</strong> ${report.nextServiceDue}</div>
                </div>
                <div style="margin-bottom: 15px;">
                    <strong>Service Description:</strong><br>
                    ${report.description}
                </div>
                <div style="margin-bottom: 15px;">
                    <strong>Parts Used:</strong><br>
                    ${report.partsUsed}
                </div>
                <div style="margin-bottom: 15px;">
                    <strong>Invoice Numbers:</strong><br>
                    ${report.invoiceNumbers}
                </div>
                <div style="margin-bottom: 15px;">
                    <strong>Warranty Claims:</strong><br>
                    ${report.warrantyClaims}
                </div>
                <div>
                    <strong>Recommendations:</strong><br>
                    ${report.recommendations}
                </div>
            </div>
        `;
    }
}

customElements.define('maintenance-report-details-modal', MaintenanceReportDetailsModal);
