class SAPettyCashConfig extends HTMLElement {
    constructor() {
        super();
        this._handleSettingUpdated = this._handleSettingUpdated.bind(this);
    }

    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this._setting = null;
        this._loading = false;
        this._loadError = '';
        this.render();
        this.bindEvents();
        document.addEventListener('sa-petty-cash:updated', this._handleSettingUpdated);
        this.loadPettyCashSetting();
    }

    disconnectedCallback() {
        document.removeEventListener('sa-petty-cash:updated', this._handleSettingUpdated);
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Petty Cash Configuration</h1>
                <p class="page-subtitle">Manage the global approval threshold for petty cash requests</p>
            </div>

            <div style="margin-bottom: 20px;">
                <button class="btn btn-primary" type="button" data-action="open-limit-modal">
                    <i class="fas fa-money-bill-wave"></i> Set New Limit
                </button>
                <button class="btn btn-secondary" type="button" data-action="refresh-setting">
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
            </div>

            <div class="card">
                <div class="card-header"><i class="fas fa-cog"></i> Global Petty Cash Setting</div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Setting</th>
                            <th>Current Value</th>
                            <th>Last Updated</th>
                            <th>Updated By</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="pettyCashSettingRows">
                        <tr>
                            <td colspan="5" style="text-align: center; color: var(--muted);">Loading petty cash configuration...</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="card">
                <div class="card-header"><i class="fas fa-route"></i> Approval Routing</div>
                <div class="notification-item info">
                    <span class="notification-icon"><i class="fas fa-info-circle"></i></span>
                    <div id="pettyCashRoutingSummary">Loading petty cash approval routing...</div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (!button) {
                return;
            }

            const action = button.dataset.action;
            if (!action) {
                return;
            }

            if (action === 'open-limit-modal') {
                this.openLimitModal();
                return;
            }

            if (action === 'refresh-setting') {
                this.loadPettyCashSetting();
                return;
            }

            if (action === 'edit-limit') {
                this.openEditLimit();
            }
        });
    }

    async loadPettyCashSetting() {
        this._loading = true;
        this._loadError = '';
        this.renderSettingRows();
        this.renderRoutingSummary();

        try {
            const setting = await this.fetchPettyCashSetting();
            this._setting = setting;
            this._loadError = '';
            this.renderSettingRows();
            this.renderRoutingSummary();
        } catch (error) {
            console.error('Failed to load petty cash configuration:', error);
            this._setting = null;
            this._loadError = error.message || 'Failed to load petty cash configuration.';
            this.renderSettingRows(this._loadError);
            this.renderRoutingSummary();
            this.emitToast(this._loadError, 'error');
        } finally {
            this._loading = false;
            this.renderSettingRows(this._loadError);
            this.renderRoutingSummary();
        }
    }

    async fetchPettyCashSetting() {
        const directResponse = await API.get('/system-settings/petty_cash_limit');
        if (directResponse?.status === 'success' && directResponse?.data?.setting) {
            return directResponse.data.setting;
        }

        const allSettingsResponse = await API.get('/system-settings');
        if (allSettingsResponse?.status === 'success' && Array.isArray(allSettingsResponse?.data?.settings)) {
            const found = allSettingsResponse.data.settings.find((setting) => setting.setting_key === 'petty_cash_limit');
            if (found) {
                return found;
            }
        }

        const failureMessage = directResponse?.message || allSettingsResponse?.message || 'Petty cash limit setting is not available.';
        throw new Error(failureMessage);
    }

    renderSettingRows(errorMessage = '') {
        const rowsContainer = this.querySelector('#pettyCashSettingRows');
        if (!rowsContainer) {
            return;
        }

        if (this._loading) {
            rowsContainer.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: var(--muted);">Loading petty cash configuration...</td>
                </tr>
            `;
            return;
        }

        if (errorMessage) {
            rowsContainer.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: var(--danger);">${this.escapeHtml(errorMessage)}</td>
                </tr>
            `;
            return;
        }

        if (!this._setting) {
            rowsContainer.innerHTML = `
                <tr>
                    <td>petty_cash_limit</td>
                    <td id="saPettyCashLimitValue">Not configured</td>
                    <td>Not available</td>
                    <td>Not available</td>
                    <td>
                        <button class="btn btn-primary btn-small" type="button" data-action="open-limit-modal">Set Limit</button>
                    </td>
                </tr>
            `;
            return;
        }

        const settingValue = this.formatCurrency(this.parseNumericValue(this._setting.setting_value));
        const updatedAt = this.formatDateTime(this._setting.updated_at);
        const updatedBy = this._setting.updated_by_name || this._setting.updated_by || 'System';
        const description = this._setting.description
            ? `<div style="font-size: 12px; color: var(--muted); margin-top: 4px;">${this.escapeHtml(this._setting.description)}</div>`
            : '';

        rowsContainer.innerHTML = `
            <tr>
                <td>
                    <strong>petty_cash_limit</strong>
                    ${description}
                </td>
                <td id="saPettyCashLimitValue">${settingValue}</td>
                <td>${updatedAt}</td>
                <td>${this.escapeHtml(String(updatedBy))}</td>
                <td>
                    <button class="btn btn-secondary btn-small" type="button" data-action="edit-limit">Edit</button>
                </td>
            </tr>
        `;
    }

    renderRoutingSummary() {
        const summaryElement = this.querySelector('#pettyCashRoutingSummary');
        if (!summaryElement) {
            return;
        }

        if (this._loadError) {
            summaryElement.textContent = 'Unable to load petty cash approval routing right now.';
            return;
        }

        const limitValue = this.parseNumericValue(this._setting?.setting_value);
        if (!Number.isFinite(limitValue)) {
            summaryElement.textContent = 'Set a petty cash limit to enforce Supervisor and Maintenance Manager approval routing.';
            return;
        }

        summaryElement.textContent = `Supervisor can approve budgets up to ${this.formatCurrency(limitValue)}. Budgets above this threshold require Maintenance Manager approval.`;
    }

    _handleSettingUpdated(event) {
        const updatedSetting = event?.detail?.setting;
        if (!updatedSetting || updatedSetting.setting_key !== 'petty_cash_limit') {
            return;
        }

        this._setting = updatedSetting;
        this._loadError = '';
        this.renderSettingRows();
        this.renderRoutingSummary();
    }

    parseNumericValue(value) {
        if (value === null || value === undefined || String(value).trim() === '') {
            return NaN;
        }

        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : NaN;
    }

    formatCurrency(value) {
        if (!Number.isFinite(value)) {
            return 'Not configured';
        }

        return `LKR ${value.toLocaleString('en-LK', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    }

    formatDateTime(value) {
        if (!value) {
            return 'Not available';
        }

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return this.escapeHtml(String(value));
        }

        return parsed.toLocaleString('en-LK');
    }

    escapeHtml(text) {
        return String(text)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    openLimitModal() {
        const modalComponent = document.querySelector('sa-set-petty-cash-limit-modal');
        if (modalComponent && typeof modalComponent.openWithSetting === 'function') {
            modalComponent.openWithSetting(this._setting);
            return;
        }

        this.openModal('setPettyCashLimitModal');
    }

    openModal(modalId) {
        if (typeof window.openModal === 'function') {
            window.openModal(modalId);
            return;
        }

        const modal = document.getElementById(modalId);
        if (!modal) {
            return;
        }

        modal.classList.add('active');
        modal.style.display = 'flex';
    }

    closeModal(modalId) {
        if (typeof window.closeModal === 'function') {
            window.closeModal(modalId);
            return;
        }

        const modal = document.getElementById(modalId);
        if (!modal) {
            return;
        }

        modal.classList.remove('active');
        modal.style.display = 'none';
    }

    openDetailsModal(titleText, contentHtml, onReady) {
        const title = document.getElementById('detailsTitle');
        const content = document.getElementById('detailsContent');

        if (!title || !content) {
            return;
        }

        title.textContent = titleText;
        content.innerHTML = contentHtml;

        if (typeof onReady === 'function') {
            onReady(content);
        }

        this.openModal('detailsModal');
    }

    emitToast(message, type = 'success') {
        this.dispatchEvent(new CustomEvent('sa-ui:toast', {
            bubbles: true,
            detail: { message, type },
        }));
    }

    openEditLimit() {
        const currentLimit = this.parseNumericValue(this._setting?.setting_value);
        const prefilledValue = Number.isFinite(currentLimit) ? currentLimit.toFixed(2) : '';
        this.openDetailsModal(
            'Edit Petty Cash Limit',
            `
                <form id="editPettyCashForm">
                    <div class="form-section">
                        <h5>Global Approval Threshold</h5>
                        <div class="form-group">
                            <label class="form-label" for="editPettyCashLimitInput">Petty Cash Limit (LKR)</label>
                            <input id="editPettyCashLimitInput" type="number" class="form-input" step="0.01" min="0" value="${prefilledValue}" required>
                        </div>
                        <div class="notification-item info" style="margin-top: 12px;">
                            <span class="notification-icon"><i class="fas fa-info-circle"></i></span>
                            <div>Budgets above this value require Maintenance Manager approval.</div>
                        </div>
                    </div>
                    <div style="text-align: right; margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                        <button type="button" class="btn btn-secondary" data-action="close-details">Cancel</button>
                        <button id="editPettyCashSubmit" type="submit" class="btn btn-primary">Save Changes</button>
                    </div>
                </form>
            `,
            (content) => {
                content.querySelector('[data-action="close-details"]')?.addEventListener('click', () => {
                    this.closeModal('detailsModal');
                });

                content.querySelector('#editPettyCashForm')?.addEventListener('submit', async (event) => {
                    event.preventDefault();

                    const limitInput = content.querySelector('#editPettyCashLimitInput');
                    const submitButton = content.querySelector('#editPettyCashSubmit');
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

                        this._setting = response.data.setting;
                        this.renderSettingRows();
                        this.renderRoutingSummary();

                        document.dispatchEvent(new CustomEvent('sa-petty-cash:updated', {
                            detail: { setting: this._setting },
                        }));

                        this.emitToast(response.message || 'Petty cash limit updated.', 'success');
                        this.closeModal('detailsModal');
                    } catch (error) {
                        console.error('Failed to update petty cash limit from details modal:', error);
                        this.emitToast(error.message || 'Failed to update petty cash limit.', 'error');
                    } finally {
                        if (submitButton) {
                            submitButton.disabled = false;
                            submitButton.textContent = 'Save Changes';
                        }
                    }
                });
            }
        );
    }
}

customElements.define('sa-petty-cash-config', SAPettyCashConfig);
