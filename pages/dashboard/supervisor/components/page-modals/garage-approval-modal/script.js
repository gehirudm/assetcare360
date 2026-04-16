class SupervisorGarageApprovalModal extends HTMLElement {
    constructor() {
        super();
        this._initialized = false;
        this.currentBreakdown = null;
        this.garages = [];
    }

    connectedCallback() {
        if (this._initialized) {
            return;
        }

        this.render();
        this.bindEvents();
        this._initialized = true;
    }

    get modalElement() {
        return this.querySelector('#garageApprovalModal');
    }

    render() {
        this.innerHTML = `
            <div id="garageApprovalModal" class="modal" style="display:none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-warehouse"></i> Approve Nearby Garage</h2>
                        <button class="btn-close" type="button" data-action="close-modal">&times;</button>
                    </div>

                    <form id="garageApprovalForm">
                        <input type="hidden" id="garageApprovalBreakdownId">

                        <div class="form-section" id="garageApprovalMeta"></div>

                        <div class="form-section">
                            <div class="form-group">
                                <label class="form-label" for="garageApprovalSelect">Select Garage *</label>
                                <select id="garageApprovalSelect" class="form-select" required>
                                    <option value="">Loading garages...</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label class="form-label" for="garageApprovalNotes">Approval Notes</label>
                                <textarea id="garageApprovalNotes" class="form-textarea" placeholder="Optional instructions for the driver"></textarea>
                            </div>
                        </div>

                        <div style="display:flex; gap:10px; flex-wrap:wrap;">
                            <button type="submit" class="btn btn-success"><i class="fas fa-check-circle"></i> Approve Garage</button>
                            <button type="button" class="btn btn-secondary" data-action="close-modal">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (event.target === this.modalElement || (actionEl && actionEl.dataset.action === 'close-modal')) {
                this.close();
            }
        });

        const form = this.querySelector('#garageApprovalForm');
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            await this.submitApproval();
        });
    }

    async open(payload) {
        this.currentBreakdown = payload?.breakdown || null;
        if (!this.currentBreakdown) {
            this.emitToast('Breakdown details are unavailable.', 'warning');
            return;
        }

        const breakdownId = Number(this.currentBreakdown.id || 0);
        if (!breakdownId) {
            this.emitToast('Invalid route breakdown id.', 'error');
            return;
        }

        this.querySelector('#garageApprovalBreakdownId').value = String(breakdownId);
        this.querySelector('#garageApprovalNotes').value = '';
        this.renderMeta();

        await this.loadGarages();

        this.modalElement.style.display = 'flex';
        this.modalElement.style.opacity = '0';
        document.body.style.overflow = 'hidden';

        setTimeout(() => {
            this.modalElement.style.opacity = '1';
        }, 10);
    }

    close() {
        if (!this.modalElement) {
            return;
        }

        this.modalElement.style.opacity = '0';
        setTimeout(() => {
            this.modalElement.style.display = 'none';
            document.body.style.overflow = '';
        }, 200);
    }

    renderMeta() {
        const meta = this.querySelector('#garageApprovalMeta');
        const breakdown = this.currentBreakdown || {};

        meta.innerHTML = `
            <div style="background:#f8fafc; border:1px solid #dbeafe; border-radius:8px; padding:12px;">
                <div><strong>Route Breakdown:</strong> ${breakdown.breakdownId || breakdown.route_breakdown_id || `RBD-${breakdown.id}`}</div>
                <div><strong>Vehicle:</strong> ${breakdown.identifier || breakdown.number_plate || `Vehicle #${breakdown.vehicle_id || 'N/A'}`}</div>
                <div><strong>Driver:</strong> ${breakdown.reportedBy || breakdown.driver_name || 'N/A'}</div>
                ${breakdown.description ? `<div><strong>Description:</strong> ${breakdown.description}</div>` : ''}
            </div>
        `;
    }

    async loadGarages() {
        const select = this.querySelector('#garageApprovalSelect');
        select.innerHTML = '<option value="">Loading garages...</option>';

        try {
            const response = await API.get('/garages');
            this.garages = Array.isArray(response?.data?.garages)
                ? response.data.garages
                : (Array.isArray(response?.data) ? response.data : []);

            if (!this.garages.length) {
                select.innerHTML = '<option value="">No garages available</option>';
                return;
            }

            const preselectedId = Number(
                this.currentBreakdown?.raw?.garage_workflow?.approved_garage?.id
                || this.currentBreakdown?.raw?.approved_garage_id
                || 0
            );

            select.innerHTML = `
                <option value="">Select a garage</option>
                ${this.garages.map((garage) => `
                    <option value="${garage.id}" ${preselectedId === Number(garage.id) ? 'selected' : ''}>
                        ${garage.name} - ${garage.address}
                    </option>
                `).join('')}
            `;
        } catch (error) {
            console.error('Failed to load garages for approval:', error);
            select.innerHTML = '<option value="">Failed to load garages</option>';
            this.emitToast('Failed to load garages', 'error');
        }
    }

    async submitApproval() {
        const breakdownId = Number(this.querySelector('#garageApprovalBreakdownId').value || 0);
        const garageId = Number(this.querySelector('#garageApprovalSelect').value || 0);
        const approvalNotes = this.querySelector('#garageApprovalNotes').value.trim();

        if (!breakdownId) {
            this.emitToast('Route breakdown id is missing.', 'error');
            return;
        }

        if (!garageId) {
            this.emitToast('Please select a garage.', 'error');
            return;
        }

        try {
            const response = await API.post(`/route-breakdowns/${encodeURIComponent(breakdownId)}/garage-approval`, {
                garage_id: garageId,
                approval_notes: approvalNotes,
            });

            if (response && (response.success || response.status === 'success')) {
                this.emitToast('Garage approved successfully.', 'success');
                this.close();
                this.dispatchEvent(new CustomEvent('supervisor-garage-approval-modal:approved', {
                    bubbles: true,
                    detail: { breakdownId, garageId },
                }));
                return;
            }

            this.emitToast(response?.message || 'Failed to approve garage.', 'error');
        } catch (error) {
            console.error('Failed to approve garage:', error);
            this.emitToast('Failed to approve garage.', 'error');
        }
    }

    emitToast(message, type = 'info') {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
            return;
        }

        this.dispatchEvent(new CustomEvent('supervisor-ui:toast', {
            bubbles: true,
            detail: { message, type },
        }));
    }
}

if (!customElements.get('supervisor-garage-approval-modal')) {
    customElements.define('supervisor-garage-approval-modal', SupervisorGarageApprovalModal);
}
