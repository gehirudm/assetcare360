class SASetPettyCashLimitModal extends HTMLElement {
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
            <div id="setPettyCashLimitModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <button class="close" type="button" data-close-modal>&times;</button>
                    <h2 style="margin-bottom: 20px; color: var(--tang-blue);">Set Petty Cash Limit</h2>
                    <form id="setPettyCashLimitForm">
                        <div class="form-section">
                            <h5><i class="fas fa-money-bill-wave"></i> Allowance Configuration</h5>
                            <div class="form-group">
                                <label class="form-label">Role</label>
                                <select class="form-select" required>
                                    <option value="">Select Role</option>
                                    <option value="supervisor">Supervisor</option>
                                    <option value="technical-officer">Technical Officer</option>
                                    <option value="maintenance-manager">Maintenance Manager</option>
                                </select>
                            </div>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Daily Limit (LKR)</label>
                                    <input type="number" class="form-input" placeholder="e.g., 500" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Monthly Limit (LKR)</label>
                                    <input type="number" class="form-input" placeholder="e.g., 5000" required>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Approval Required Above (LKR)</label>
                                <input type="number" class="form-input" placeholder="e.g., 200" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Notes</label>
                                <textarea class="form-textarea" placeholder="Any special conditions or notes"></textarea>
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary">Set Limit</button>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#setPettyCashLimitModal');
        const form = this.querySelector('#setPettyCashLimitForm');

        this.addEventListener('click', (event) => {
            if (event.target === modal || event.target.closest('[data-close-modal]')) {
                this.close();
            }
        });

        form?.addEventListener('submit', (event) => {
            event.preventDefault();
            this.emitToast('Petty cash limit updated.', 'success');
            this.close();
        });
    }

    emitToast(message, type = 'success') {
        this.dispatchEvent(new CustomEvent('sa-ui:toast', {
            bubbles: true,
            detail: { message, type },
        }));
    }

    close() {
        if (typeof window.closeModal === 'function') {
            window.closeModal('setPettyCashLimitModal');
            return;
        }

        const modal = this.querySelector('#setPettyCashLimitModal');
        if (!modal) {
            return;
        }

        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

customElements.define('sa-set-petty-cash-limit-modal', SASetPettyCashLimitModal);
