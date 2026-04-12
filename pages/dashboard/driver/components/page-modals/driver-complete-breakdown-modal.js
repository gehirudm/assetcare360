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
                        <input type="hidden" id="completeBreakdownId">
                        <div class="form-section">
                            <div class="form-group">
                                <label class="form-label">Breakdown ID</label>
                                <input type="text" class="form-input" id="breakdownIdDisplay" readonly>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Repair Budget (LKR) *</label>
                                <input type="number" class="form-input" id="repairBudget" min="0" step="0.01" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Completion Notes</label>
                                <textarea class="form-textarea" id="completionNotes"></textarea>
                            </div>
                        </div>
                        <div style="display:flex; gap:10px;">
                            <button type="submit" class="btn btn-success"><i class="fas fa-check-circle"></i> Mark as Resolved</button>
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

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            DriverUtils.showToast('Breakdown marked as resolved.');
            this.close();
            form.reset();
            DriverUtils.emit('driver:data-breakdowns-changed');
        });
    }

    open(payload) {
        const form = this.querySelector('#completeBreakdownForm');
        form.querySelector('#completeBreakdownId').value = payload?.breakdownId || '';
        form.querySelector('#breakdownIdDisplay').value = payload?.breakdownId || '';
        DriverUtils.setModalState(this.querySelector('#completeBreakdownModal'), true);
    }

    close() {
        DriverUtils.setModalState(this.querySelector('#completeBreakdownModal'), false);
    }
}

customElements.define('driver-complete-breakdown-modal', DriverCompleteBreakdownModal);
