class MaintenanceServiceWarranty extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.filterStatus = 'all';
        this.searchTerm = '';
        this.loading = false;
        this.rows = [];

        this.render();
        this.bindEvents();
        this.refresh();
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Warranty Management</h1>
                <p class="page-subtitle">Track warranty health and control void/restore status for vehicles and machines</p>
            </div>

            <div class="filter-toolbar" style="margin-bottom: 20px;">
                <div class="filter-toolbar__group">
                    <label class="filter-toolbar__label">Warranty Status</label>
                    <div class="filter-controls filter-toolbar__filters" id="serviceWarrantyFilterControls">
                        <button class="filter-btn active" type="button" data-action="set-filter" data-status="all">All</button>
                        <button class="filter-btn" type="button" data-action="set-filter" data-status="active">Active</button>
                        <button class="filter-btn" type="button" data-action="set-filter" data-status="expired">Expired</button>
                        <button class="filter-btn" type="button" data-action="set-filter" data-status="voided">Voided</button>
                    </div>
                </div>
            </div>

            <div class="search-bar" style="margin-bottom: 20px;">
                <input class="search-input" id="warrantySearchInput" data-action="search" placeholder="Search by asset ID, name, type, or provider">
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-shield-alt"></i> Warranty Assets</span>
                    <span class="status-badge status-scheduled" id="warrantyVisibleCount">Loading...</span>
                </div>
                <div id="warrantyAssetList" class="inventory-list">
                    <div style="text-align:center;padding:20px;color:var(--muted);">Loading warranty assets...</div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionNode = event.target.closest('[data-action]');
            if (!actionNode) {
                return;
            }

            const action = actionNode.dataset.action;
            if (action === 'set-filter') {
                const status = String(actionNode.dataset.status || 'all').toLowerCase();
                this.applyFilter(status, actionNode);
                return;
            }

            if (action === 'open-warranty-modal') {
                const assetType = actionNode.dataset.assetType;
                const assetId = Number(actionNode.dataset.assetId || 0);
                if (assetType && assetId > 0) {
                    this.viewWarrantyDetails({
                        asset_type: assetType,
                        asset_id: assetId,
                    });
                }
            }
        });

        this.addEventListener('input', (event) => {
            const searchNode = event.target.closest('[data-action="search"]');
            if (!searchNode) {
                return;
            }

            this.searchTerm = String(searchNode.value || '').trim().toLowerCase();
            this.renderRows();
        });
    }

    normalizeWarrantyStatus(rawStatus, warrantyExpiry) {
        const status = String(rawStatus || '').trim();
        if (status === 'Active' || status === 'Expired' || status === 'Voided') {
            return status;
        }

        if (warrantyExpiry) {
            const expiryDate = new Date(warrantyExpiry);
            if (!Number.isNaN(expiryDate.getTime()) && expiryDate < new Date()) {
                return 'Expired';
            }
        }

        return 'Active';
    }

    async refresh() {
        this.loading = true;
        this.updateVisibleCounter();
        this.renderRows();

        let errorMessage = '';

        try {
            const [vehiclesResponse, machinesResponse] = await Promise.all([
                API.get('/vehicles?per_page=500'),
                API.get('/machines?per_page=500'),
            ]);

            const vehicleRows = this.mapVehicleRows(vehiclesResponse);
            const machineRows = this.mapMachineRows(machinesResponse);
            this.rows = [...vehicleRows, ...machineRows];
        } catch (error) {
            console.error('Failed to load warranty data:', error);
            this.rows = [];
            errorMessage = 'Failed to load warranty assets.';
            this.emitToast('Failed to load warranty assets.', 'error');
        }

        this.loading = false;
        this.renderRows(errorMessage);
        this.updateVisibleCounter();
    }

    mapVehicleRows(response) {
        if (!response || response.status !== 'success' || !response.data) {
            return [];
        }

        const vehicles = Array.isArray(response.data.vehicles) ? response.data.vehicles : [];
        return vehicles.map((vehicle) => ({
            asset_type: 'vehicle',
            asset_id: Number(vehicle.id),
            asset_code: vehicle.vehicle_id || 'Vehicle',
            asset_name: vehicle.vehicle_name || 'Unnamed Vehicle',
            asset_ref: vehicle.number_plate || '-',
            warranty_provider: vehicle.warranty_provider || '-',
            warranty_expiry: vehicle.warranty_expiry || null,
            warranty_status: this.normalizeWarrantyStatus(vehicle.warranty_status, vehicle.warranty_expiry),
            warranty_void_reason: vehicle.warranty_void_reason || null,
            warranty_voided_at: vehicle.warranty_voided_at || null,
            updated_at: vehicle.updated_at || vehicle.created_at || null,
        }));
    }

    mapMachineRows(response) {
        if (!response || response.status !== 'success' || !response.data) {
            return [];
        }

        const machines = Array.isArray(response.data.machines) ? response.data.machines : [];
        return machines.map((machine) => ({
            asset_type: 'machine',
            asset_id: Number(machine.id),
            asset_code: machine.machine_id || 'Machine',
            asset_name: machine.machine_name || 'Unnamed Machine',
            asset_ref: machine.location || '-',
            warranty_provider: machine.warranty_provider || '-',
            warranty_expiry: machine.warranty_expiry || null,
            warranty_status: this.normalizeWarrantyStatus(machine.warranty_status, machine.warranty_expiry),
            warranty_void_reason: machine.warranty_void_reason || null,
            warranty_voided_at: machine.warranty_voided_at || null,
            updated_at: machine.updated_at || machine.created_at || null,
        }));
    }

    applyFilter(status, trigger) {
        this.filterStatus = String(status || 'all').toLowerCase();

        this.querySelectorAll('#serviceWarrantyFilterControls .filter-btn').forEach((button) => {
            button.classList.toggle('active', button === trigger);
        });

        this.renderRows();
    }

    statusClass(status) {
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

    renderRows(errorMessage = '') {
        const list = this.querySelector('#warrantyAssetList');
        if (!list) {
            return;
        }

        if (errorMessage) {
            list.innerHTML = `<div style="text-align:center;padding:20px;color:var(--danger);">${this.escapeHtml(errorMessage)}</div>`;
            this.updateVisibleCounter(0);
            return;
        }

        if (this.loading) {
            list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);">Loading warranty assets...</div>';
            return;
        }

        const filteredRows = this.rows
            .filter((row) => {
                const statusKey = row.warranty_status.toLowerCase();
                const statusMatch = this.filterStatus === 'all' || statusKey === this.filterStatus;

                const searchBlob = [
                    row.asset_type,
                    row.asset_code,
                    row.asset_name,
                    row.asset_ref,
                    row.warranty_provider,
                    row.warranty_status,
                    row.warranty_void_reason,
                ].join(' ').toLowerCase();

                const searchMatch = !this.searchTerm || searchBlob.includes(this.searchTerm);
                return statusMatch && searchMatch;
            })
            .sort((first, second) => {
                const firstTime = new Date(first.updated_at || first.warranty_expiry || '').getTime();
                const secondTime = new Date(second.updated_at || second.warranty_expiry || '').getTime();
                const safeFirst = Number.isFinite(firstTime) ? firstTime : 0;
                const safeSecond = Number.isFinite(secondTime) ? secondTime : 0;
                return safeSecond - safeFirst;
            });

        if (filteredRows.length === 0) {
            list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);">No assets match the current warranty filters.</div>';
            this.updateVisibleCounter(0);
            return;
        }

        list.innerHTML = filteredRows.map((row) => {
            const statusClass = this.statusClass(row.warranty_status);
            const displayType = row.asset_type === 'vehicle' ? 'Vehicle' : 'Machine';

            return `
                <div class="inventory-item" data-asset-type="${this.escapeHtml(row.asset_type)}" data-asset-id="${Number(row.asset_id)}">
                    <div class="item-details">
                        <strong><i class="fas fa-shield-alt"></i> ${this.escapeHtml(row.asset_code)} - ${this.escapeHtml(row.asset_name)}</strong>
                        <div class="item-meta">
                            <i class="fas fa-cubes"></i> ${displayType} &nbsp;|&nbsp;
                            <i class="fas fa-id-card"></i> ${this.escapeHtml(row.asset_ref)}
                        </div>
                        <div class="item-meta">
                            <i class="fas fa-building"></i> Provider: ${this.escapeHtml(row.warranty_provider)}
                            &nbsp;|&nbsp;
                            <i class="fas fa-calendar-alt"></i> Expiry: ${this.escapeHtml(this.formatDate(row.warranty_expiry))}
                        </div>
                        ${row.warranty_void_reason ? `
                            <div class="item-meta" style="color: var(--danger);">
                                <i class="fas fa-exclamation-circle"></i>
                                Void reason: ${this.escapeHtml(row.warranty_void_reason)}
                            </div>
                        ` : ''}
                    </div>
                    <div class="item-actions">
                        <span class="status-badge ${statusClass}">${this.escapeHtml(row.warranty_status)}</span>
                        <button class="btn btn-primary btn-small" type="button" data-action="open-warranty-modal" data-asset-type="${this.escapeHtml(row.asset_type)}" data-asset-id="${Number(row.asset_id)}">
                            <i class="fas fa-edit"></i> Manage
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        this.updateVisibleCounter(filteredRows.length);
    }

    updateVisibleCounter(visibleCount = null) {
        const node = this.querySelector('#warrantyVisibleCount');
        if (!node) {
            return;
        }

        if (this.loading) {
            node.textContent = 'Loading...';
            return;
        }

        const total = this.rows.length;
        if (visibleCount === null) {
            node.textContent = `${total} assets`;
            return;
        }

        node.textContent = `${visibleCount} of ${total} assets`;
    }

    async viewWarrantyDetails(entryOrId) {
        const normalized = this.resolveEntry(entryOrId);
        if (!normalized) {
            this.emitToast('Warranty details are unavailable right now.', 'warning');
            return;
        }

        const modal = document.querySelector('maintenance-warranty-details-modal');
        if (modal && typeof modal.open === 'function') {
            modal.open(normalized);
            return;
        }

        this.emitToast('Warranty details modal is unavailable right now.', 'warning');
    }

    resolveEntry(entryOrId) {
        if (entryOrId && typeof entryOrId === 'object') {
            const assetType = String(entryOrId.asset_type || '').toLowerCase();
            const assetId = Number(entryOrId.asset_id || 0);
            if (!assetType || assetId <= 0) {
                return null;
            }
            return this.rows.find((row) => row.asset_type === assetType && Number(row.asset_id) === assetId) || null;
        }

        const token = String(entryOrId || '').trim();
        if (!token) {
            return null;
        }

        return this.rows.find((row) => {
            return String(row.asset_id) === token || `${row.asset_type}:${row.asset_id}` === token || row.asset_code === token;
        }) || null;
    }

    async updateWarrantyStatus(payload) {
        const assetType = String(payload?.assetType || '').toLowerCase();
        const assetId = Number(payload?.assetId || 0);
        const status = String(payload?.status || '').trim();
        const reason = String(payload?.reason || '').trim();

        if (!assetType || assetId <= 0) {
            this.emitToast('Invalid warranty target selected.', 'error');
            return false;
        }

        if (!['Active', 'Expired', 'Voided'].includes(status)) {
            this.emitToast('Warranty status must be Active, Expired, or Voided.', 'warning');
            return false;
        }

        if (status === 'Voided' && !reason) {
            this.emitToast('Reason is required when voiding warranty.', 'warning');
            return false;
        }

        try {
            const response = await API.post(`/service-tickets/warranty/${assetType}/${assetId}`, {
                status,
                reason: status === 'Voided' ? reason : null,
            });

            if (!response || response.status !== 'success') {
                this.emitToast(response?.message || 'Failed to update warranty status.', 'error');
                return false;
            }

            this.emitToast('Warranty status updated successfully.', 'success');
            await this.refresh();
            return true;
        } catch (error) {
            console.error('Failed to update warranty status:', error);
            this.emitToast('Failed to update warranty status.', 'error');
            return false;
        }
    }

    viewServiceSchedule(identifier) {
        this.viewWarrantyDetails(identifier);
    }

    scheduleService(identifier) {
        this.viewWarrantyDetails(identifier);
    }

    emitToast(message, type = 'info') {
        this.dispatchEvent(new CustomEvent('maintenance-ui:toast', {
            bubbles: true,
            detail: { message, type },
        }));
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

customElements.define('maintenance-service-warranty', MaintenanceServiceWarranty);
