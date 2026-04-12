class DriverCheckDetailsModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.render();
        this.bindEvents();

        DriverUtils.on('driver:modal-open', (event) => {
            if (event.detail?.id === 'checkDetailsModal') {
                this.open(event.detail?.payload || {});
            }
        });

        DriverUtils.on('driver:modal-close', (event) => {
            if (event.detail?.id === 'checkDetailsModal') {
                this.close();
            }
        });
    }

    render() {
        this.innerHTML = `
            <div id="checkDetailsModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-clipboard-check"></i> Weekly Vehicle Check Details</h2>
                        <button class="btn-close" type="button" data-action="close-modal"><i class="fas fa-times"></i></button>
                    </div>
                    <div id="checkDetailsContent"></div>
                    <button class="btn btn-secondary" type="button" data-action="close-modal"><i class="fas fa-times"></i> Close</button>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#checkDetailsModal');
        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (event.target === modal || (actionEl && actionEl.dataset.action === 'close-modal')) {
                this.close();
            }
        });
    }

    open(payload) {
        const check = payload?.check || null;
        const content = this.querySelector('#checkDetailsContent');

        if (!check) {
            content.innerHTML = '<p style="color: var(--muted);">Check details are not available.</p>';
            DriverUtils.setModalState(this.querySelector('#checkDetailsModal'), true);
            return;
        }

        const statusText = check.status === 'approved' ? 'APPROVED' : check.status === 'rejected' ? 'REJECTED' : 'PENDING REVIEW';
        const statusColor = DriverUtils.getStatusColor(check.status);

        content.innerHTML = `
            <div class="form-section">
                <div style="display:grid; gap:10px;">
                    <div style="display:flex; justify-content:space-between; padding:10px; background:#f8f9fa; border-radius:6px;"><strong>Check ID:</strong><span>${check.check_id || check.id}</span></div>
                    <div style="display:flex; justify-content:space-between; padding:10px; background:#f8f9fa; border-radius:6px;"><strong>Status:</strong><span style="color:${statusColor}; font-weight:700;">${statusText}</span></div>
                    <div style="display:flex; justify-content:space-between; padding:10px; background:#f8f9fa; border-radius:6px;"><strong>Vehicle:</strong><span>${check.vehicle_registration || 'LKA-1234'}</span></div>
                    <div style="display:flex; justify-content:space-between; padding:10px; background:#f8f9fa; border-radius:6px;"><strong>Week Ending:</strong><span>${check.week_end_date || 'N/A'}</span></div>
                    <div style="display:flex; justify-content:space-between; padding:10px; background:#f8f9fa; border-radius:6px;"><strong>Odometer:</strong><span>${(check.odometer_reading || 0).toLocaleString()} km</span></div>
                </div>
            </div>
            <div class="form-section">
                <h5><i class="fas fa-sticky-note"></i> Notes</h5>
                <div style="padding:12px; background:#f8f9fa; border-radius:6px;">${check.notes || 'Submitted - Awaiting supervisor review.'}</div>
            </div>
            ${check.rejection_reason ? `
                <div class="form-section">
                    <h5><i class="fas fa-times-circle"></i> Rejection Reason</h5>
                    <div style="padding:12px; background:#fdecea; border-left:4px solid #e74c3c; border-radius:6px;">${check.rejection_reason}</div>
                </div>
            ` : ''}
        `;

        DriverUtils.setModalState(this.querySelector('#checkDetailsModal'), true);
    }

    close() {
        DriverUtils.setModalState(this.querySelector('#checkDetailsModal'), false);
    }
}

customElements.define('driver-check-details-modal', DriverCheckDetailsModal);
