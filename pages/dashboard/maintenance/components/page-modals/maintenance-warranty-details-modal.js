class MaintenanceWarrantyDetailsModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.currentEntry = null;
        this.render();
        this.bindEvents();
    }

    render() {
        this.innerHTML = `
            <div id="warrantyDetailsModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h4><i class="fas fa-shield-alt"></i> Warranty Management</h4>
                        <button class="btn-close" type="button" data-action="close-modal">&times;</button>
                    </div>
                    <div style="padding: 24px;">
                        <div id="warrantyDetailsContent"></div>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            if (event.target.closest('[data-action="close-modal"]') || event.target.id === 'warrantyDetailsModal') {
                this.close();
                return;
            }

            const actionNode = event.target.closest('[data-action="toggle-void-reason"]');
            if (!actionNode) {
                return;
            }

            this.updateVoidReasonVisibility(actionNode.value);
        });

        this.addEventListener('change', (event) => {
            const statusSelect = event.target.closest('[data-action="toggle-void-reason"]');
            if (!statusSelect) {
                return;
            }

            this.updateVoidReasonVisibility(statusSelect.value);
        });

        this.addEventListener('submit', async (event) => {
            const form = event.target.closest('#warrantyStatusForm');
            if (!form) {
                return;
            }

            event.preventDefault();
            await this.handleUpdate(form);
        });
    }

    updateVoidReasonVisibility(status) {
        const reasonGroup = this.querySelector('#warrantyVoidReasonGroup');
        if (!reasonGroup) {
            return;
        }

        reasonGroup.style.display = status === 'Voided' ? 'block' : 'none';
    }

    emitToast(message, type = 'warning') {
        this.dispatchEvent(new CustomEvent('maintenance-ui:toast', {
            bubbles: true,
            detail: { message, type },
        }));
    }

    open(entry) {
        if (!entry || typeof entry !== 'object') {
            this.emitToast('Warranty details are unavailable right now.', 'warning');
            return;
        }

        this.currentEntry = entry;
        const detailsContainer = this.querySelector('#warrantyDetailsContent');
        if (detailsContainer) {
            detailsContainer.innerHTML = this.renderContent(entry);
        }

        this.updateVoidReasonVisibility(entry.warranty_status || 'Active');

        if (typeof window.openModal === 'function') {
            window.openModal('warrantyDetailsModal');
            return;
        }

        const modal = this.querySelector('#warrantyDetailsModal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    openById(identifier) {
        const component = document.querySelector('maintenance-service-warranty');
        if (!component || typeof component.resolveEntry !== 'function') {
            this.emitToast('Warranty details are unavailable right now.', 'warning');
            return;
        }

        const entry = component.resolveEntry(identifier);
        this.open(entry);
    }

    close() {
        if (typeof window.closeModal === 'function') {
            window.closeModal('warrantyDetailsModal');
            return;
        }

        const modal = this.querySelector('#warrantyDetailsModal');
        if (!modal) {
            return;
        }

        modal.classList.remove('active');
    }

    renderContent(entry) {
        const assetType = entry.asset_type === 'vehicle' ? 'Vehicle' : 'Machine';
        const currentStatus = this.escapeHtml(entry.warranty_status || 'Active');
        const voidReason = this.escapeHtml(entry.warranty_void_reason || 'N/A');

        return `
            <div class="form-section">
                <h5><i class="fas fa-cubes"></i> Asset Details</h5>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                    <div><strong>Type:</strong> ${assetType}</div>
                    <div><strong>Asset ID:</strong> ${this.escapeHtml(entry.asset_code || String(entry.asset_id))}</div>
                    <div><strong>Name:</strong> ${this.escapeHtml(entry.asset_name || 'Unknown')}</div>
                    <div><strong>Reference:</strong> ${this.escapeHtml(entry.asset_ref || '-')}</div>
                    <div><strong>Provider:</strong> ${this.escapeHtml(entry.warranty_provider || '-')}</div>
                    <div><strong>Expiry:</strong> ${this.escapeHtml(this.formatDate(entry.warranty_expiry))}</div>
                </div>
                <div style="margin-bottom: 12px;">
                    <strong>Current Status:</strong>
                    <span class="status-badge ${this.getStatusClass(entry.warranty_status)}">${currentStatus}</span>
                </div>
                <div style="margin-bottom: 16px; color: var(--muted);">
                    <strong>Current Void Reason:</strong> ${voidReason}
                </div>
            </div>

            <form id="warrantyStatusForm" class="form-section" style="margin-top: 16px;">
                <h5><i class="fas fa-edit"></i> Update Warranty Status</h5>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">New Status</label>
                        <select class="form-select" name="status" data-action="toggle-void-reason" required>
                            <option value="Active" ${entry.warranty_status === 'Active' ? 'selected' : ''}>Active</option>
                            <option value="Expired" ${entry.warranty_status === 'Expired' ? 'selected' : ''}>Expired</option>
                            <option value="Voided" ${entry.warranty_status === 'Voided' ? 'selected' : ''}>Voided</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Asset Scope</label>
                        <input class="form-input" type="text" value="${assetType} warranty" disabled>
                    </div>
                </div>
                <div class="form-group" id="warrantyVoidReasonGroup" style="display: ${entry.warranty_status === 'Voided' ? 'block' : 'none'};">
                    <label class="form-label">Void Reason</label>
                    <textarea class="form-textarea" name="reason" placeholder="Required when status is Voided">${entry.warranty_status === 'Voided' ? this.escapeHtml(entry.warranty_void_reason || '') : ''}</textarea>
                </div>
                <button class="btn btn-primary" type="submit">
                    <i class="fas fa-save"></i> Save Warranty Status
                </button>
            </form>
        `;
    }

    async handleUpdate(form) {
        if (!this.currentEntry) {
            this.emitToast('No warranty asset selected.', 'warning');
            return;
        }

        const formData = new FormData(form);
        const status = String(formData.get('status') || '').trim();
        const reason = String(formData.get('reason') || '').trim();

        const component = document.querySelector('maintenance-service-warranty');
        if (!component || typeof component.updateWarrantyStatus !== 'function') {
            this.emitToast('Warranty update service is unavailable right now.', 'error');
            return;
        }

        const success = await component.updateWarrantyStatus({
            assetType: this.currentEntry.asset_type,
            assetId: Number(this.currentEntry.asset_id),
            status,
            reason,
        });

        if (success) {
            this.close();
        }
    }

    getStatusClass(status) {
        if (status === 'Voided') {
            return 'status-closed';
        }

        if (status === 'Expired') {
            return 'status-pending';
        }

        return 'status-completed';
    }

    formatDate(dateString) {
        if (!dateString) {
            return 'N/A';
        }

        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) {
            return 'N/A';
        }

        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    }

    escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

customElements.define('maintenance-warranty-details-modal', MaintenanceWarrantyDetailsModal);
