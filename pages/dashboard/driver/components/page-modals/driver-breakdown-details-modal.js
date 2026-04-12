class DriverBreakdownDetailsModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.render();
        this.bindEvents();

        DriverUtils.on('driver:modal-open', (event) => {
            if (event.detail?.id === 'breakdownDetailsModal') {
                this.open(event.detail?.payload || {});
            }
        });

        DriverUtils.on('driver:modal-close', (event) => {
            if (event.detail?.id === 'breakdownDetailsModal') {
                this.close();
            }
        });
    }

    render() {
        this.innerHTML = `
            <div id="breakdownDetailsModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-info-circle"></i> Breakdown Report Details</h2>
                        <button class="btn-close" type="button" data-action="close-modal"><i class="fas fa-times"></i></button>
                    </div>
                    <div id="breakdownDetailsContent"></div>
                    <button class="btn btn-secondary" type="button" data-action="close-modal"><i class="fas fa-times"></i> Close</button>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#breakdownDetailsModal');
        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (event.target === modal || (actionEl && actionEl.dataset.action === 'close-modal')) {
                this.close();
            }
        });
    }

    open(payload) {
        const item = payload?.item;
        const content = this.querySelector('#breakdownDetailsContent');

        if (!item) {
            content.innerHTML = '<p style="color: var(--muted);">Breakdown details are not available.</p>';
            DriverUtils.setModalState(this.querySelector('#breakdownDetailsModal'), true);
            return;
        }

        const statusColor = DriverUtils.getStatusColor(item.status);
        const severityColor = DriverUtils.getStatusColor(item.severity);

        content.innerHTML = `
            <div class="form-section">
                <h5><i class="fas fa-id-card"></i> Breakdown Information</h5>
                <div style="display: grid; gap: 10px;">
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;"><strong>ID:</strong><span>${item.breakdownId || item.breakdown_id || item.route_breakdown_id || 'N/A'}</span></div>
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;"><strong>Type:</strong><span>${item.type === 'in-route' ? 'Breakdown in Route' : 'Breakdown'}</span></div>
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;"><strong>Status:</strong><span style="color:${statusColor}; font-weight:700;">${item.status || 'Pending'}</span></div>
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;"><strong>Severity:</strong><span style="color:${severityColor}; font-weight:700;">${String(item.severity || 'medium').toUpperCase()}</span></div>
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;"><strong>Date:</strong><span>${DriverUtils.formatDateTime(item.dateRaw || item.breakdown_date || item.breakdown_datetime)}</span></div>
                </div>
            </div>
            <div class="form-section">
                <h5><i class="fas fa-file-alt"></i> Description</h5>
                <div style="padding: 12px; background: #f8f9fa; border-radius: 6px;">${item.summary || item.description || 'No description provided.'}</div>
            </div>
        `;

        DriverUtils.setModalState(this.querySelector('#breakdownDetailsModal'), true);
    }

    close() {
        DriverUtils.setModalState(this.querySelector('#breakdownDetailsModal'), false);
    }
}

customElements.define('driver-breakdown-details-modal', DriverBreakdownDetailsModal);
