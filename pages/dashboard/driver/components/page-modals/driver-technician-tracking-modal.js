class DriverTechnicianTrackingModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.render();
        this.bindEvents();

        DriverUtils.on('driver:modal-open', (event) => {
            if (event.detail?.id === 'technicianTrackingModal') {
                this.open(event.detail?.payload || {});
            }
        });

        DriverUtils.on('driver:modal-close', (event) => {
            if (event.detail?.id === 'technicianTrackingModal') {
                this.close();
            }
        });
    }

    render() {
        this.innerHTML = `
            <div id="technicianTrackingModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-user-cog"></i> Assigned Technician</h2>
                        <button class="btn-close" type="button" data-action="close-modal"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="form-section" id="technicianTrackingContent">
                        <p style="margin: 0; color: var(--muted);">Technician status will appear here once assigned.</p>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button class="btn btn-primary" type="button" data-action="call-technician"><i class="fas fa-phone"></i> Call Technician</button>
                        <button class="btn btn-secondary" type="button" data-action="close-modal">Close</button>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#technicianTrackingModal');

        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (event.target === modal || (actionEl && actionEl.dataset.action === 'close-modal')) {
                this.close();
                return;
            }

            if (actionEl && actionEl.dataset.action === 'call-technician') {
                DriverUtils.showToast('Calling assigned technician...');
            }
        });
    }

    open(payload) {
        const content = this.querySelector('#technicianTrackingContent');
        const item = payload?.item || null;

        if (item) {
            content.innerHTML = `
                <div style="display:grid; gap:10px;">
                    <div style="padding:10px; background:#f8f9fa; border-radius:6px;"><strong>Breakdown:</strong> ${item.breakdownId || 'N/A'}</div>
                    <div style="padding:10px; background:#f8f9fa; border-radius:6px;"><strong>Status:</strong> ${item.status || 'Assigned'}</div>
                    <div style="padding:10px; background:#f8f9fa; border-radius:6px;"><strong>Technician:</strong> Assigned technical officer</div>
                </div>
            `;
        }

        DriverUtils.setModalState(this.querySelector('#technicianTrackingModal'), true);
    }

    close() {
        DriverUtils.setModalState(this.querySelector('#technicianTrackingModal'), false);
    }
}

customElements.define('driver-technician-tracking-modal', DriverTechnicianTrackingModal);
