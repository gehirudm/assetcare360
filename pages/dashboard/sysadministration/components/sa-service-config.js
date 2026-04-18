class SAServiceConfig extends HTMLElement {
    constructor() {
        super();
        this._handleIntervalSaved = this._handleIntervalSaved.bind(this);
    }

    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.machines = [];
        this.vehicles = [];
        this.dueMachines = [];
        this.dueVehicles = [];
        this.loading = false;

        this.render();
        this.bindEvents();
        this.loadServiceData();
    }

    disconnectedCallback() {
        document.removeEventListener('sa-service-config:interval-saved', this._handleIntervalSaved);
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Service Interval Configuration</h1>
                <p class="page-subtitle">Manage vehicle and machine service schedules</p>
            </div>

            <div style="margin-bottom: 20px;">
                <button class="btn btn-primary" type="button" data-action="open-add-interval">
                    <i class="fas fa-plus"></i> Add Service Interval
                </button>
                <button class="btn btn-secondary" type="button" data-action="refresh-service-data">
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-cog"></i> Service Interval Settings</span>
                    <span id="serviceConfigCount" class="status-text status-normal">Loading...</span>
                </div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Asset</th>
                            <th>Type</th>
                            <th>Time Interval (days)</th>
                            <th>Mileage/Hours Interval</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="serviceConfigRows">
                        <tr>
                            <td colspan="6" style="text-align: center; color: var(--muted);">Loading service intervals...</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="card">
                <div class="card-header"><i class="fas fa-exclamation-circle"></i> Overdue Service Alerts</div>
                <div id="serviceAlertList">
                    <div class="notification-item info">
                        <span class="notification-icon"><i class="fas fa-info-circle"></i></span>
                        <div>Loading service alerts...</div>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        document.addEventListener('sa-service-config:interval-saved', this._handleIntervalSaved);

        this.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (!button) {
                return;
            }

            const action = button.dataset.action;

            if (action === 'open-add-interval') {
                this.openIntervalModal();
                return;
            }

            if (action === 'refresh-service-data') {
                this.loadServiceData();
                return;
            }

            if (action === 'edit-interval') {
                this.openIntervalModal({
                    mode: 'edit',
                    assetType: button.dataset.assetType,
                    assetId: button.dataset.assetDbId,
                });
                return;
            }

            if (action === 'schedule-service') {
                this.openIntervalModal({
                    mode: 'edit',
                    assetType: button.dataset.assetType,
                    assetId: button.dataset.assetDbId,
                });
                return;
            }

            if (action === 'view-vehicle') {
                this.emitToast(`View Vehicle Details ${button.dataset.assetId} - Feature coming soon!`, 'info');
                return;
            }

            if (action === 'view-machine') {
                this.emitToast(`View Machine Details ${button.dataset.assetId} - Feature coming soon!`, 'info');
                return;
            }

            if (action === 'close-details') {
                this.closeModal('detailsModal');
            }
        });
    }

    _handleIntervalSaved() {
        this.loadServiceData();
    }

    openIntervalModal(options = {}) {
        const modalComponent = document.querySelector('sa-add-service-interval-modal');
        if (modalComponent && typeof modalComponent.openForInterval === 'function') {
            modalComponent.openForInterval({
                ...options,
                machines: this.machines,
                vehicles: this.vehicles,
            });
            return;
        }

        this.openModal('addServiceIntervalModal');
    }

    async loadServiceData() {
        this.setLoadingState(true);

        try {
            const [machinesResult, vehiclesResult, dueMachinesResult, dueVehiclesResult] = await Promise.allSettled([
                API.get('/machines?per_page=200'),
                API.get('/vehicles?per_page=200'),
                API.get('/machines/due-service'),
                API.get('/vehicles/due-service'),
            ]);

            const failedSources = [];
            this.machines = this.extractResponseList(machinesResult, 'machines', 'machines', failedSources);
            this.vehicles = this.extractResponseList(vehiclesResult, 'vehicles', 'vehicles', failedSources);
            this.dueMachines = this.extractResponseList(dueMachinesResult, 'machines', 'due machines', failedSources);
            this.dueVehicles = this.extractResponseList(dueVehiclesResult, 'vehicles', 'due vehicles', failedSources);

            this.renderServiceRows();
            this.renderServiceAlerts();

            if (failedSources.length > 0) {
                this.emitToast(`Some service data failed to load (${failedSources.join(', ')}).`, 'warning');
            }
        } catch (error) {
            console.error('Failed to load service configuration data:', error);
            this.renderServiceRowsError();
            this.renderServiceAlertsError();
            this.emitToast('Failed to load service configuration data.', 'error');
        } finally {
            this.setLoadingState(false);
        }
    }

    setLoadingState(isLoading) {
        this.loading = isLoading;
        const countElement = this.querySelector('#serviceConfigCount');
        if (!countElement) {
            return;
        }

        countElement.textContent = isLoading
            ? 'Loading...'
            : `${this.vehicles.length + this.machines.length} assets`;
    }

    extractResponseList(result, key, label, failedSources) {
        if (result.status !== 'fulfilled') {
            failedSources.push(label);
            return [];
        }

        const payload = result.value;
        if (!payload || payload.status !== 'success' || !payload.data || !Array.isArray(payload.data[key])) {
            failedSources.push(label);
            return [];
        }

        return payload.data[key];
    }

    renderServiceRows() {
        const rowsContainer = this.querySelector('#serviceConfigRows');
        if (!rowsContainer) {
            return;
        }

        const rows = [
            ...this.vehicles.map((vehicle) => this.createAssetRow(vehicle, 'vehicle')),
            ...this.machines.map((machine) => this.createAssetRow(machine, 'machine')),
        ];

        rows.sort((a, b) => a.assetCode.localeCompare(b.assetCode));

        if (rows.length === 0) {
            rowsContainer.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: var(--muted);">No assets available for service interval configuration.</td>
                </tr>
            `;
            return;
        }

        rowsContainer.innerHTML = rows.map((row) => `
            <tr data-asset-type="${row.assetType}" data-asset-db-id="${row.assetDbId}">
                <td>
                    <strong>${row.assetCode}</strong><br>
                    <span style="color: var(--muted); font-size: 12px;">${row.assetName}</span>
                </td>
                <td>${row.assetTypeLabel}</td>
                <td>${row.daysInterval}</td>
                <td>${row.thresholdInterval}</td>
                <td><span class="status-text ${row.statusClass}">${row.statusLabel}</span></td>
                <td>
                    <button
                        class="btn btn-secondary btn-small"
                        type="button"
                        data-action="edit-interval"
                        data-asset-type="${row.assetType}"
                        data-asset-db-id="${row.assetDbId}"
                    >
                        Edit
                    </button>
                    <button
                        class="btn btn-primary btn-small"
                        type="button"
                        data-action="schedule-service"
                        data-asset-type="${row.assetType}"
                        data-asset-db-id="${row.assetDbId}"
                    >
                        Update
                    </button>
                </td>
            </tr>
        `).join('');
    }

    createAssetRow(asset, assetType) {
        const assetDbId = String(asset.id ?? '');
        const assetCode = this.getAssetCode(asset, assetType);
        const assetName = this.getAssetName(asset, assetType);
        const status = this.getAssetStatus(asset, assetType);

        return {
            assetType,
            assetDbId,
            assetCode: this.escapeHtml(assetCode),
            assetName: this.escapeHtml(assetName),
            assetTypeLabel: assetType === 'vehicle' ? 'Vehicle' : 'Machine',
            daysInterval: this.formatInterval(asset.service_interval_days, 'days'),
            thresholdInterval: assetType === 'vehicle'
                ? this.formatInterval(asset.service_interval_km, 'km')
                : this.formatInterval(asset.service_interval_hours, 'hours'),
            statusClass: status.className,
            statusLabel: status.label,
        };
    }

    renderServiceRowsError() {
        const rowsContainer = this.querySelector('#serviceConfigRows');
        if (!rowsContainer) {
            return;
        }

        rowsContainer.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--danger);">
                    Failed to load service interval data.
                </td>
            </tr>
        `;
    }

    renderServiceAlerts() {
        const alertContainer = this.querySelector('#serviceAlertList');
        if (!alertContainer) {
            return;
        }

        const alerts = [
            ...this.dueVehicles.map((vehicle) => this.buildAlert(vehicle, 'vehicle')),
            ...this.dueMachines.map((machine) => this.buildAlert(machine, 'machine')),
        ];

        if (alerts.length === 0) {
            alertContainer.innerHTML = `
                <div class="notification-item success">
                    <span class="notification-icon"><i class="fas fa-check-circle"></i></span>
                    <div>
                        <strong>No due or overdue services</strong><br>
                        All machines and vehicles are currently within configured service intervals.
                    </div>
                </div>
            `;
            return;
        }

        alertContainer.innerHTML = alerts.map((alert) => `
            <div class="notification-item ${alert.tone}">
                <span class="notification-icon"><i class="${alert.icon}"></i></span>
                <div>
                    <strong>${this.escapeHtml(alert.assetCode)}:</strong> ${this.escapeHtml(alert.message)}
                    <div style="margin-top: 5px;">
                        <button
                            class="btn btn-primary btn-small"
                            type="button"
                            data-action="edit-interval"
                            data-asset-type="${alert.assetType}"
                            data-asset-db-id="${alert.assetDbId}"
                        >
                            Update Interval
                        </button>
                        <button
                            class="btn btn-secondary btn-small"
                            type="button"
                            data-action="${alert.viewAction}"
                            data-asset-id="${this.escapeHtml(alert.assetCode)}"
                        >
                            View Details
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderServiceAlertsError() {
        const alertContainer = this.querySelector('#serviceAlertList');
        if (!alertContainer) {
            return;
        }

        alertContainer.innerHTML = `
            <div class="notification-item danger">
                <span class="notification-icon"><i class="fas fa-exclamation-triangle"></i></span>
                <div>Failed to load overdue service alerts.</div>
            </div>
        `;
    }

    buildAlert(asset, assetType) {
        const assetCode = this.getAssetCode(asset, assetType);
        const assetDbId = String(asset.id ?? '');
        const overdue = this.getOverdueDetails(asset, assetType);
        const dueSoon = this.getDueSoonDetails(asset, assetType);

        if (overdue) {
            return {
                tone: 'danger',
                icon: 'fas fa-exclamation-triangle',
                message: overdue,
                assetCode,
                assetType,
                assetDbId,
                viewAction: assetType === 'vehicle' ? 'view-vehicle' : 'view-machine',
            };
        }

        return {
            tone: 'warning',
            icon: 'fas fa-clock',
            message: dueSoon || 'Service is due soon based on configured thresholds.',
            assetCode,
            assetType,
            assetDbId,
            viewAction: assetType === 'vehicle' ? 'view-vehicle' : 'view-machine',
        };
    }

    getAssetStatus(asset, assetType) {
        const overdue = this.getOverdueDetails(asset, assetType);
        if (overdue) {
            return { label: 'Overdue', className: 'status-rejected' };
        }

        const dueIdSet = assetType === 'vehicle'
            ? new Set(this.dueVehicles.map((item) => String(item.id)))
            : new Set(this.dueMachines.map((item) => String(item.id)));

        if (dueIdSet.has(String(asset.id))) {
            return { label: 'Due Soon', className: 'status-pending' };
        }

        return { label: 'On Track', className: 'status-active' };
    }

    getOverdueDetails(asset, assetType) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (asset.next_service_date) {
            const nextDate = new Date(`${asset.next_service_date}T00:00:00`);
            if (!Number.isNaN(nextDate.getTime())) {
                const dayDiff = Math.floor((today - nextDate) / (24 * 60 * 60 * 1000));
                if (dayDiff > 0) {
                    return `Service date overdue by ${dayDiff} day(s).`;
                }
            }
        }

        if (assetType === 'vehicle') {
            const currentMileage = Number(asset.current_mileage);
            const nextMileage = Number(asset.next_service_mileage);
            if (Number.isFinite(currentMileage) && Number.isFinite(nextMileage) && currentMileage > nextMileage) {
                return `Mileage threshold exceeded by ${(currentMileage - nextMileage).toLocaleString()} km.`;
            }
            return null;
        }

        const currentHours = Number(asset.current_operating_hours);
        const nextHours = Number(asset.next_service_hours);
        if (Number.isFinite(currentHours) && Number.isFinite(nextHours) && currentHours > nextHours) {
            return `Operating-hour threshold exceeded by ${(currentHours - nextHours).toLocaleString()} hours.`;
        }

        return null;
    }

    getDueSoonDetails(asset, assetType) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (asset.next_service_date) {
            const nextDate = new Date(`${asset.next_service_date}T00:00:00`);
            if (!Number.isNaN(nextDate.getTime())) {
                const dayDiff = Math.ceil((nextDate - today) / (24 * 60 * 60 * 1000));
                if (dayDiff >= 0) {
                    return `Service due in ${dayDiff} day(s).`;
                }
            }
        }

        if (assetType === 'vehicle') {
            const currentMileage = Number(asset.current_mileage);
            const nextMileage = Number(asset.next_service_mileage);
            if (Number.isFinite(currentMileage) && Number.isFinite(nextMileage)) {
                const remainingKm = nextMileage - currentMileage;
                if (remainingKm >= 0) {
                    return `Mileage service due in ${remainingKm.toLocaleString()} km.`;
                }
            }
            return null;
        }

        const currentHours = Number(asset.current_operating_hours);
        const nextHours = Number(asset.next_service_hours);
        if (Number.isFinite(currentHours) && Number.isFinite(nextHours)) {
            const remainingHours = nextHours - currentHours;
            if (remainingHours >= 0) {
                return `Operating-hour service due in ${remainingHours.toLocaleString()} hours.`;
            }
        }

        return null;
    }

    getAssetCode(asset, assetType) {
        if (assetType === 'vehicle') {
            return asset.vehicle_id || `Vehicle #${asset.id}`;
        }

        return asset.machine_id || `Machine #${asset.id}`;
    }

    getAssetName(asset, assetType) {
        if (assetType === 'vehicle') {
            return asset.vehicle_name || asset.number_plate || 'Unnamed Vehicle';
        }

        return asset.machine_name || asset.model_number || 'Unnamed Machine';
    }

    formatInterval(value, unit) {
        if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) {
            return 'Not Set';
        }

        return `${Number(value).toLocaleString()} ${unit}`;
    }

    escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    emitToast(message, type = 'success') {
        this.dispatchEvent(new CustomEvent('sa-ui:toast', {
            bubbles: true,
            detail: { message, type },
        }));
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

}

customElements.define('sa-service-config', SAServiceConfig);
