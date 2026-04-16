class DriverCompleteBreakdownModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.render();
        this.bindEvents();

        DriverUtils.on('driver:modal-open', (event) => {
            if (event.detail?.id === 'completeBreakdownModal') {
                this.open(event.detail?.payload || {});
            }
        });

        DriverUtils.on('driver:modal-close', (event) => {
            if (event.detail?.id === 'completeBreakdownModal') {
                this.close();
            }
        });
    }

    render() {
        this.innerHTML = `
            <div id="completeBreakdownModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-tools"></i> Complete Breakdown Repair</h2>
                        <button class="btn-close" type="button" data-action="close-modal"><i class="fas fa-times"></i></button>
                    </div>
                    <form id="completeBreakdownForm">
                        <input type="hidden" id="completeBreakdownNumericId">

                        <div class="form-section">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Route Breakdown ID</label>
                                    <input type="text" class="form-input" id="completeBreakdownIdDisplay" readonly>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Approved Garage</label>
                                    <input type="text" class="form-input" id="completeApprovedGarageDisplay" readonly>
                                </div>
                            </div>

                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label" for="completeBillAmount">Bill Amount (LKR) *</label>
                                    <input type="number" class="form-input" id="completeBillAmount" min="0.01" step="0.01" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label" for="completeBillImage">Bill Image *</label>
                                    <input type="file" class="form-input" id="completeBillImage" accept="image/png,image/jpeg,image/webp" required>
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="form-label" for="completeRemarks">Completion Remarks *</label>
                                <textarea class="form-textarea" id="completeRemarks" placeholder="Describe completed repair and final condition..." required></textarea>
                            </div>
                        </div>

                        <div style="display:flex; gap:10px; flex-wrap:wrap;">
                            <button type="submit" class="btn btn-success"><i class="fas fa-check-circle"></i> Mark as Completed</button>
                            <button type="button" class="btn btn-secondary" data-action="close-modal">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#completeBreakdownModal');
        const form = this.querySelector('#completeBreakdownForm');

        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (event.target === modal || (actionEl && actionEl.dataset.action === 'close-modal')) {
                this.close();
            }
        });

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const routeBreakdownNumericId = Number(this.querySelector('#completeBreakdownNumericId').value || 0);
            const billAmount = Number(this.querySelector('#completeBillAmount').value || 0);
            const remarks = this.querySelector('#completeRemarks').value.trim();
            const billImageInput = this.querySelector('#completeBillImage');
            const billImageFile = billImageInput?.files?.[0] || null;

            if (!routeBreakdownNumericId) {
                DriverUtils.showToast('Route breakdown identifier is missing.', 'error');
                return;
            }

            if (!billAmount || billAmount <= 0) {
                DriverUtils.showToast('Please enter a valid bill amount.', 'error');
                return;
            }

            if (!remarks) {
                DriverUtils.showToast('Completion remarks are required.', 'error');
                return;
            }

            if (!billImageFile) {
                DriverUtils.showToast('Please upload the bill image.', 'error');
                return;
            }

            try {
                const formData = new FormData();
                formData.append('bill_amount', String(billAmount));
                formData.append('completion_remarks', remarks);
                formData.append('bill_image', billImageFile);

                const response = await DriverUtils.apiPostFormData(
                    `/route-breakdowns/${encodeURIComponent(routeBreakdownNumericId)}/garage-complete`,
                    formData
                );

                if (response && (response.success || response.status === 'success')) {
                    DriverUtils.showToast('Breakdown marked as completed.');
                    this.close();
                    form.reset();
                    DriverUtils.emit('driver:data-breakdowns-changed');
                    return;
                }

                DriverUtils.showToast(response?.message || 'Failed to complete breakdown.', 'error');
            } catch (error) {
                console.error('Failed to complete breakdown:', error);
                DriverUtils.showToast('Failed to complete breakdown. Please try again.', 'error');
            }
        });
    }

    open(payload) {
        const breakdown = payload?.breakdown || {};
        const routeBreakdownNumericId = Number(breakdown.id || payload?.routeBreakdownId || 0);
        const routeBreakdownCode = breakdown.route_breakdown_id || payload?.breakdownId || (routeBreakdownNumericId ? `RBD-${routeBreakdownNumericId}` : '');
        const approvedGarage = breakdown?.garage_workflow?.approved_garage?.name || breakdown.approved_garage_name || 'N/A';

        const form = this.querySelector('#completeBreakdownForm');
        form.reset();

        this.querySelector('#completeBreakdownNumericId').value = routeBreakdownNumericId ? String(routeBreakdownNumericId) : '';
        this.querySelector('#completeBreakdownIdDisplay').value = routeBreakdownCode;
        this.querySelector('#completeApprovedGarageDisplay').value = approvedGarage;

        DriverUtils.setModalState(this.querySelector('#completeBreakdownModal'), true);
    }

    close() {
        DriverUtils.setModalState(this.querySelector('#completeBreakdownModal'), false);
    }
}

customElements.define('driver-complete-breakdown-modal', DriverCompleteBreakdownModal);
