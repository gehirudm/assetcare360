class SASetPettyCashLimitModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this._currentSetting = null;
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
                            <h5><i class="fas fa-money-bill-wave"></i> Global Budget Approval Threshold</h5>
                            <div class="form-group">
                                <label class="form-label">Current Limit</label>
                                <input id="saCurrentPettyCashLimit" type="text" class="form-input" value="Loading..." readonly disabled>
                            </div>
                            <div class="form-group">
                                <label class="form-label">New Petty Cash Limit (LKR)</label>
                                <input id="saPettyCashLimitInput" type="number" class="form-input" step="0.01" min="0" placeholder="e.g., 50000.00" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Routing Behavior</label>
                                <div id="saPettyCashLimitDescription" class="form-hint">
                                    Budgets above this limit require Maintenance Manager approval.
                                </div>
                            </div>
                        </div>
                        <button id="saSetPettyCashSubmit" type="submit" class="btn btn-primary">Save Limit</button>
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
            this.handleSubmit(event);
        });
    }

    openWithSetting(setting = null) {
        this._currentSetting = setting;
        this.updateLimitFields();
        this.open();
    }

    open() {
        if (typeof window.openModal === 'function') {
            window.openModal('setPettyCashLimitModal');
            return;
        }

        const modal = this.querySelector('#setPettyCashLimitModal');
        if (!modal) {
            return;
        }

        modal.classList.add('active');
        modal.style.display = 'flex';
    }

    updateLimitFields() {
        const currentLimitInput = this.querySelector('#saCurrentPettyCashLimit');
        const limitInput = this.querySelector('#saPettyCashLimitInput');
        const description = this.querySelector('#saPettyCashLimitDescription');

        const numericValue = this.parseSettingValue(this._currentSetting?.setting_value);
        const hasNumericValue = Number.isFinite(numericValue);

        if (currentLimitInput) {
            currentLimitInput.value = hasNumericValue ? this.formatCurrency(numericValue) : 'Not configured';
        }

        if (limitInput) {
            limitInput.value = hasNumericValue ? numericValue.toFixed(2) : '';
        }

        if (description) {
            description.textContent = hasNumericValue
                ? `Budgets above ${this.formatCurrency(numericValue)} require Maintenance Manager approval.`
                : 'Budgets above this limit require Maintenance Manager approval.';
        }
    }

    parseSettingValue(value) {
        if (value === null || value === undefined || String(value).trim() === '') {
            return NaN;
        }

        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : NaN;
    }

    formatCurrency(value) {
        if (!Number.isFinite(value)) {
            return 'LKR 0.00';
        }

        return `LKR ${value.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    async handleSubmit(event) {
        event.preventDefault();

        const limitInput = this.querySelector('#saPettyCashLimitInput');
        const submitButton = this.querySelector('#saSetPettyCashSubmit');

        const nextLimit = Number(limitInput?.value);
        if (!Number.isFinite(nextLimit) || nextLimit < 0) {
            this.emitToast('Please enter a valid non-negative petty cash limit.', 'warning');
            return;
        }

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Saving...';
        }

        try {
            const response = await API.put('/system-settings/petty_cash_limit', { value: nextLimit.toFixed(2) });
            if (response?.status !== 'success' || !response?.data?.setting) {
                this.emitToast(response?.message || 'Failed to update petty cash limit.', 'error');
                return;
            }

            this._currentSetting = response.data.setting;
            this.updateLimitFields();
            this.emitToast(response.message || 'Petty cash limit updated.', 'success');

            document.dispatchEvent(new CustomEvent('sa-petty-cash:updated', {
                detail: { setting: this._currentSetting },
            }));

            this.close();
        } catch (error) {
            console.error('Failed to update petty cash limit:', error);
            this.emitToast(error.message || 'Failed to update petty cash limit.', 'error');
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Save Limit';
            }
        }
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
