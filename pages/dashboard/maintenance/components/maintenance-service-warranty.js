class MaintenanceServiceWarranty extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.currentFilter = 'all';
        this.currentQuery = '';
        this.serviceScheduleData = [];
        this.loading = false;

        this.render();
        this.bindEvents();
        this.bindCrossComponentEvents();
        this.loadServiceScheduleData();
    }

    disconnectedCallback() {
        if (this._boundAddRecordHandler) {
            document.removeEventListener('maintenance-service:add-record', this._boundAddRecordHandler);
        }
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Service & Warranty Monitoring</h1>
                <p class="page-subtitle">Track vehicle and machine service schedules using live inventory details</p>
            </div>

            <div class="search-bar" style="margin-bottom: 20px;">
                <input type="text" id="serviceWarrantySearch" class="search-input" placeholder="Search assets, model, or registration/location" data-action="search-assets">
                <button class="btn btn-primary" type="button" data-action="open-add-service">
                    <i class="fas fa-plus"></i> Add Service Record
                </button>
                <button class="btn btn-secondary" type="button" data-action="refresh-data">
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-shield-alt"></i> Warranty and Service Status</span>
                    <span id="serviceWarrantyCount" class="status-badge status-scheduled">Loading...</span>
                </div>
                <div class="filter-controls" id="serviceWarrantyFilterControls">
                    <button class="filter-btn active" type="button" data-action="set-filter" data-status="all">All</button>
                    <button class="filter-btn" type="button" data-action="set-filter" data-status="active">Active</button>
                    <button class="filter-btn" type="button" data-action="set-filter" data-status="expiring">Expiring Soon</button>
                    <button class="filter-btn" type="button" data-action="set-filter" data-status="expired">Expired</button>
                </div>

                <div id="service-schedule-list" class="inventory-list">
                    <div style="text-align: center; color: var(--muted); padding: 20px;">Loading service schedule details...</div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('input', (event) => {
            const actionNode = event.target.closest('[data-action]');
            if (!actionNode) {
                return;
            }

            if (actionNode.dataset.action === 'search-assets') {
                this.currentQuery = String(actionNode.value || '').trim().toLowerCase();
                this.applyFilter(this.currentFilter);
            }
        });

        this.addEventListener('click', (event) => {
            const actionNode = event.target.closest('[data-action]');
            if (!actionNode) {
                return;
            }

            const action = actionNode.dataset.action;
            if (action === 'set-filter') {
                this.applyFilter(actionNode.dataset.status, actionNode);
                return;
            }

            if (action === 'open-add-service') {
                this.openAddServiceModal();
                return;
            }

            if (action === 'refresh-data') {
                this.loadServiceScheduleData();
                return;
            }

            if (action === 'schedule-service') {
                this.scheduleService(actionNode.dataset.equipmentId);
                return;
            }

            if (action === 'view-schedule') {
                this.viewServiceSchedule(actionNode.dataset.equipmentId);
            }
        });
    }

    bindCrossComponentEvents() {
        this._boundAddRecordHandler = (event) => {
            const record = event.detail?.record;
            if (!record) {
                return;
            }

            this.addServiceRecord(record);
        };

        document.addEventListener('maintenance-service:add-record', this._boundAddRecordHandler);
    }

    async loadServiceScheduleData() {
        this.loading = true;
        this.updateSummary();
        this.renderScheduleRows();

        let errorMessage = '';

        try {
            const [vehiclesResponse, machinesResponse] = await Promise.all([
                API.get('/vehicles?per_page=200'),
                API.get('/machines?per_page=200'),
            ]);

            const vehicles = this.extractDataList(vehiclesResponse, 'vehicles');
            const machines = this.extractDataList(machinesResponse, 'machines');

            const vehicleSchedules = vehicles.map((vehicle) => this.mapVehicleToSchedule(vehicle));
            const machineSchedules = machines.map((machine) => this.mapMachineToSchedule(machine));

            // Keep vehicle ordering identical to Inventory Manager vehicle listing order.
            this.serviceScheduleData = [
                ...vehicleSchedules,
                ...machineSchedules,
            ];

            if (vehiclesResponse.status !== 'success' || machinesResponse.status !== 'success') {
                this.emitToast('Some inventory details could not be loaded.', 'warning');
            }
        } catch (error) {
            console.error('Failed to load service and warranty data:', error);
            this.serviceScheduleData = [];
            errorMessage = 'Failed to load service and warranty details.';
            this.emitToast(errorMessage, 'error');
        }

        this.loading = false;
        this.updateSummary();
        this.renderScheduleRows(errorMessage);
        this.applyFilter(this.currentFilter);
    }

    extractDataList(response, key) {
        if (!response || response.status !== 'success' || !response.data || !Array.isArray(response.data[key])) {
            return [];
        }

        return response.data[key];
    }

    mapVehicleToSchedule(vehicle) {
        const vehicleIdentifier = vehicle.vehicle_id || `Vehicle #${vehicle.id}`;
        const registrationNumber = vehicle.registration_number || vehicle.number_plate || 'N/A';
        return {
            id: `vehicle-${vehicle.id}`,
            assetDbId: String(vehicle.id),
            equipment: vehicleIdentifier,
            equipmentType: 'vehicle',
            equipmentTypeLabel: 'Vehicle',
            equipmentName: vehicle.vehicle_name || vehicleIdentifier,
            identifierLabel: 'Registration Number',
            identifierValue: registrationNumber,
            modelNumber: vehicle.model_number || 'N/A',
            inventoryStatus: vehicle.status || 'Unknown',
            insuranceExpiry: vehicle.warranty_expiry || '',
            nextServiceDue: vehicle.next_service_date || '',
            serviceType: vehicle.service_interval_type || 'Vehicle Service',
            insuranceProvider: vehicle.warranty_provider || 'Not specified',
            insurancePolicy: 'Not specified',
            lastService: vehicle.last_service_date || '',
            serviceInterval: this.describeVehicleInterval(vehicle),
            technicalOfficer: 'Unassigned',
            notes: vehicle.notes || 'No additional notes',
            thresholdType: 'km',
            currentReading: this.parseNullableNumber(vehicle.current_mileage ?? vehicle.mileage),
            nextThreshold: this.parseNullableNumber(vehicle.next_service_mileage),
        };
    }

    mapMachineToSchedule(machine) {
        const machineIdentifier = machine.machine_id || `Machine #${machine.id}`;
        return {
            id: `machine-${machine.id}`,
            assetDbId: String(machine.id),
            equipment: machineIdentifier,
            equipmentType: 'machinery',
            equipmentTypeLabel: 'Machine',
            equipmentName: machine.machine_name || machineIdentifier,
            identifierLabel: 'Location',
            identifierValue: machine.location || 'N/A',
            modelNumber: machine.model_number || 'N/A',
            inventoryStatus: machine.status || 'Unknown',
            insuranceExpiry: machine.warranty_expiry || '',
            nextServiceDue: machine.next_service_date || '',
            serviceType: 'Machine Service',
            insuranceProvider: machine.warranty_provider || 'Not specified',
            insurancePolicy: 'Not specified',
            lastService: machine.last_service_date || '',
            serviceInterval: this.describeMachineInterval(machine),
            technicalOfficer: 'Unassigned',
            notes: machine.notes || 'No additional notes',
            thresholdType: 'hours',
            currentReading: this.parseNullableNumber(machine.current_operating_hours),
            nextThreshold: this.parseNullableNumber(machine.next_service_hours),
        };
    }

    describeVehicleInterval(vehicle) {
        const parts = [];
        const intervalDays = this.parseNullableNumber(vehicle.service_interval_days);
        const intervalKm = this.parseNullableNumber(vehicle.service_interval_km);

        if (intervalDays !== null && intervalDays > 0) {
            parts.push(`${intervalDays.toLocaleString()} days`);
        }

        if (intervalKm !== null && intervalKm > 0) {
            parts.push(`${intervalKm.toLocaleString()} km`);
        }

        return parts.length > 0 ? parts.join(' + ') : 'Not configured';
    }

    describeMachineInterval(machine) {
        const parts = [];
        const intervalDays = this.parseNullableNumber(machine.service_interval_days);
        const intervalHours = this.parseNullableNumber(machine.service_interval_hours);

        if (intervalDays !== null && intervalDays > 0) {
            parts.push(`${intervalDays.toLocaleString()} days`);
        }

        if (intervalHours !== null && intervalHours > 0) {
            parts.push(`${intervalHours.toLocaleString()} hours`);
        }

        return parts.length > 0 ? parts.join(' + ') : 'Not configured';
    }

    parseNullableNumber(value) {
        if (value === null || value === undefined || value === '') {
            return null;
        }

        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    toDateOrNull(value) {
        if (!value) {
            return null;
        }

        const date = new Date(`${value}T00:00:00`);
        if (Number.isNaN(date.getTime())) {
            return null;
        }

        date.setHours(0, 0, 0, 0);
        return date;
    }

    getDateStatus(dueDateString) {
        const dueDate = this.toDateOrNull(dueDateString);
        if (!dueDate) {
            return 'scheduled';
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffTime = dueDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return 'overdue';
        }

        if (diffDays <= 7) {
            return 'due-soon';
        }

        return 'scheduled';
    }

    getWarrantyStatusByDate(expiryDateString) {
        const expiryDate = this.toDateOrNull(expiryDateString);
        if (!expiryDate) {
            return 'active';
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffTime = expiryDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return 'expired';
        }

        if (diffDays <= 30) {
            return 'expiring';
        }

        return 'active';
    }

    mergeServiceStatus(statusA, statusB) {
        const rank = {
            scheduled: 0,
            'due-soon': 1,
            overdue: 2,
        };

        return (rank[statusB] || 0) > (rank[statusA] || 0) ? statusB : statusA;
    }

    getThresholdStatus(item) {
        const nextThreshold = this.parseNullableNumber(item.nextThreshold);
        const currentReading = this.parseNullableNumber(item.currentReading);

        if (nextThreshold === null || currentReading === null) {
            return 'scheduled';
        }

        const warningBuffer = item.thresholdType === 'hours' ? 10 : 500;
        const remaining = nextThreshold - currentReading;

        if (remaining < 0) {
            return 'overdue';
        }

        if (remaining <= warningBuffer) {
            return 'due-soon';
        }

        return 'scheduled';
    }

    getServiceStatus(item) {
        const dateStatus = this.getDateStatus(item.nextServiceDue);
        const thresholdStatus = this.getThresholdStatus(item);
        return this.mergeServiceStatus(dateStatus, thresholdStatus);
    }

    getFilterStatus(item) {
        const serviceStatus = this.getServiceStatus(item);
        const warrantyStatus = this.getWarrantyStatusByDate(item.insuranceExpiry);

        if (serviceStatus === 'overdue' || warrantyStatus === 'expired') {
            return 'expired';
        }

        if (serviceStatus === 'due-soon' || warrantyStatus === 'expiring') {
            return 'expiring';
        }

        return 'active';
    }

    getStatusMeta(item) {
        const serviceStatus = this.getServiceStatus(item);
        const warrantyStatus = this.getWarrantyStatusByDate(item.insuranceExpiry);

        if (serviceStatus === 'overdue') {
            return { className: 'status-overdue', text: 'Service Overdue' };
        }

        if (warrantyStatus === 'expired') {
            return { className: 'status-overdue', text: 'Warranty Expired' };
        }

        if (serviceStatus === 'due-soon') {
            return { className: 'status-due-soon', text: 'Service Due Soon' };
        }

        if (warrantyStatus === 'expiring') {
            return { className: 'status-due-soon', text: 'Warranty Expiring' };
        }

        return { className: 'status-scheduled', text: 'Scheduled' };
    }

    formatDate(dateString) {
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

    formatThresholdSummary(item) {
        const nextThreshold = this.parseNullableNumber(item.nextThreshold);
        const currentReading = this.parseNullableNumber(item.currentReading);
        if (nextThreshold === null || currentReading === null) {
            return 'N/A';
        }

        const unit = item.thresholdType === 'hours' ? 'hours' : 'km';
        const currentText = currentReading.toLocaleString();
        const nextText = nextThreshold.toLocaleString();
        return `${currentText} / ${nextText} ${unit}`;
    }

    formatServiceDueDetails(item) {
        const dateText = item.nextServiceDue ? this.formatDate(item.nextServiceDue) : 'N/A';
        const thresholdText = this.formatThresholdSummary(item);
        return `
            <div>${this.escapeHtml(dateText)}</div>
            <div style="font-size: 12px; color: var(--muted);">Threshold: ${this.escapeHtml(thresholdText)}</div>
        `;
    }

    formatCurrentReading(item) {
        const currentReading = this.parseNullableNumber(item.currentReading);
        if (currentReading === null) {
            return 'N/A';
        }

        const unit = item.thresholdType === 'hours' ? 'hours' : 'km';
        return `${currentReading.toLocaleString()} ${unit}`;
    }

    formatInventoryMeta(item) {
        const inventoryStatus = item.inventoryStatus || 'Unknown';
        const reading = this.formatCurrentReading(item);
        return `${inventoryStatus} | ${reading}`;
    }

    getInventoryStatusClass(status) {
        const normalized = String(status || '').toLowerCase();
        if (normalized === 'active') {
            return 'status-completed';
        }

        if (normalized === 'under maintenance') {
            return 'status-in-progress';
        }

        if (normalized === 'inactive' || normalized === 'decommissioned') {
            return 'status-closed';
        }

        if (normalized === 'for auction') {
            return 'status-pending';
        }

        return 'status-normal';
    }

    updateSummary(visibleCount = null) {
        const summaryChip = this.querySelector('#serviceWarrantyCount');
        if (!summaryChip) {
            return;
        }

        if (this.loading) {
            summaryChip.textContent = 'Loading...';
            return;
        }

        const totalCount = this.serviceScheduleData.length;
        const hasScopedView = this.currentFilter !== 'all' || this.currentQuery !== '';

        if (hasScopedView && visibleCount !== null) {
            summaryChip.textContent = `${visibleCount} of ${totalCount} assets`;
            return;
        }

        summaryChip.textContent = `${totalCount} assets`;
    }

    renderScheduleRows(errorMessage = '') {
        const listContainer = this.querySelector('#service-schedule-list');
        if (!listContainer) {
            return;
        }

        if (errorMessage) {
            listContainer.innerHTML = `<div style="text-align: center; color: var(--danger); padding: 20px;">${this.escapeHtml(errorMessage)}</div>`;
            return;
        }

        if (this.loading) {
            listContainer.innerHTML = '<div style="text-align: center; color: var(--muted); padding: 20px;">Loading service schedule details...</div>';
            return;
        }

        if (this.serviceScheduleData.length === 0) {
            listContainer.innerHTML = '<div style="text-align: center; color: var(--muted); padding: 20px;">No vehicle or machine records found.</div>';
            return;
        }

        listContainer.innerHTML = this.serviceScheduleData.map((item) => {
            const filterStatus = this.getFilterStatus(item);
            const statusMeta = this.getStatusMeta(item);
            const assetIcon = item.equipmentType === 'vehicle' ? 'fa-truck' : 'fa-cogs';
            const serviceDateText = item.nextServiceDue ? this.formatDate(item.nextServiceDue) : 'N/A';
            const warrantyDateText = item.insuranceExpiry ? this.formatDate(item.insuranceExpiry) : 'N/A';
            const thresholdText = this.formatThresholdSummary(item);
            const inventoryStatusClass = this.getInventoryStatusClass(item.inventoryStatus);
            const searchText = [
                item.equipment,
                item.equipmentName,
                item.modelNumber,
                item.identifierValue,
                item.inventoryStatus,
                statusMeta.text,
            ].join(' ').toLowerCase();

            return `
                <div class="inventory-item" data-service-status="${this.getServiceStatus(item)}" data-warranty-status="${filterStatus}" data-filter-status="${filterStatus}" data-search-text="${this.escapeHtml(searchText)}">
                    <div class="item-details">
                        <strong><i class="fas ${assetIcon}"></i> ${this.escapeHtml(item.equipmentName)}</strong>
                        <div class="item-meta">
                            <i class="fas fa-hashtag"></i> ${this.escapeHtml(item.modelNumber)} &nbsp;|&nbsp;
                            <i class="fas fa-barcode"></i> ${this.escapeHtml(item.equipment)} &nbsp;|&nbsp;
                            <i class="fas fa-id-card"></i> ${this.escapeHtml(item.identifierValue)}
                        </div>
                        <div class="item-description">
                            <span class="status-text ${inventoryStatusClass}">${this.escapeHtml(item.inventoryStatus || 'Unknown')}</span>
                            &nbsp;|&nbsp;
                            <span class="status-badge ${statusMeta.className}">${statusMeta.text}</span>
                        </div>
                        <div class="item-meta">
                            <i class="fas fa-shield-alt"></i> Warranty: ${this.escapeHtml(warrantyDateText)} &nbsp;|&nbsp;
                            <i class="fas fa-tools"></i> Next Service: ${this.escapeHtml(serviceDateText)}
                        </div>
                        <div class="item-meta">
                            <i class="fas fa-sync-alt"></i> Interval: ${this.escapeHtml(item.serviceInterval)} &nbsp;|&nbsp;
                            <i class="fas fa-tachometer-alt"></i> Threshold: ${this.escapeHtml(thresholdText)}
                        </div>
                    </div>
                    <div class="item-actions">
                        <div class="action-buttons">
                            <button class="btn btn-secondary btn-small" type="button" data-action="view-schedule" data-equipment-id="${item.id}">View</button>
                            <button class="btn btn-primary btn-small" type="button" data-action="schedule-service" data-equipment-id="${item.id}">Update</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    setActiveFilterButton(button) {
        this.querySelectorAll('#serviceWarrantyFilterControls .filter-btn').forEach((item) => {
            item.classList.remove('active');
        });

        if (button) {
            button.classList.add('active');
        }
    }

    applyFilter(status, button) {
        const nextStatus = status || this.currentFilter || 'all';
        this.currentFilter = nextStatus;

        if (button) {
            this.setActiveFilterButton(button);
        } else {
            const activeButton = this.querySelector(`#serviceWarrantyFilterControls [data-status="${nextStatus}"]`);
            this.setActiveFilterButton(activeButton);
        }

        let visibleCount = 0;
        this.querySelectorAll('#service-schedule-list [data-filter-status]').forEach((row) => {
            const rowFilterStatus = row.dataset.filterStatus;
            const searchText = row.dataset.searchText || '';

            const matchesStatus = rowFilterStatus && (nextStatus === 'all' || rowFilterStatus === nextStatus);
            const matchesSearch = !this.currentQuery || searchText.includes(this.currentQuery);
            const isVisible = matchesStatus && matchesSearch;

            row.style.display = isVisible ? 'flex' : 'none';
            if (isVisible) {
                visibleCount += 1;
            }
        });

        this.updateSummary(visibleCount);
    }

    getServiceScheduleById(equipmentId) {
        return this.serviceScheduleData.find((item) => item.id === String(equipmentId || '')) || null;
    }

    viewServiceSchedule(equipmentId) {
        const schedule = this.getServiceScheduleById(equipmentId);
        if (!schedule) {
            this.emitToast(`Service schedule ${equipmentId} not found.`, 'warning');
            return;
        }

        const modal = document.querySelector('maintenance-service-schedule-modal');
        if (!modal || typeof modal.open !== 'function') {
            this.emitToast('Service schedule modal is unavailable.', 'error');
            return;
        }

        modal.open({
            equipment: `${schedule.equipment} (${schedule.equipmentTypeLabel})`,
            insuranceProvider: schedule.insuranceProvider,
            insurancePolicy: schedule.insurancePolicy,
            insuranceExpiry: this.formatDate(schedule.insuranceExpiry),
            lastService: this.formatDate(schedule.lastService),
            nextServiceDue: this.formatDate(schedule.nextServiceDue),
            serviceType: schedule.serviceType,
            serviceInterval: schedule.serviceInterval,
            technicalOfficer: schedule.technicalOfficer,
            notes: `${schedule.notes}\n${schedule.identifierLabel}: ${schedule.identifierValue}\nModel: ${schedule.modelNumber}`,
        });
    }

    openAddServiceModal(prefill = {}) {
        const modal = document.querySelector('maintenance-add-service-record-modal');
        if (!modal || typeof modal.open !== 'function') {
            this.emitToast('Add service modal is unavailable.', 'error');
            return;
        }

        modal.open(prefill);
    }

    scheduleService(equipmentId) {
        const schedule = this.getServiceScheduleById(equipmentId);
        if (!schedule) {
            this.emitToast(`Unable to schedule service for ${equipmentId}.`, 'warning');
            return;
        }

        this.openAddServiceModal({
            assetDbId: schedule.assetDbId,
            equipmentId: schedule.equipment,
            equipmentType: schedule.equipmentType,
            insuranceExpiry: schedule.insuranceExpiry,
            nextServiceDue: schedule.nextServiceDue,
            serviceType: schedule.serviceType,
            notes: schedule.notes,
        });
    }

    normalizeEquipmentLabel(value) {
        const input = String(value || '').trim();
        if (!input) {
            return '';
        }

        const vehicleMatch = input.match(/^VH(\d+)$/i);
        if (vehicleMatch) {
            return `Vehicle #${vehicleMatch[1]}`;
        }

        const machineMatch = input.match(/^MC(\d+)$/i);
        if (machineMatch) {
            return `Machine #${machineMatch[1]}`;
        }

        return input;
    }

    resolveScheduleFromRecord(record) {
        const targetType = record.equipmentType === 'vehicle' ? 'vehicle' : 'machinery';

        if (record.assetDbId) {
            return this.serviceScheduleData.find((item) => {
                return item.assetDbId === String(record.assetDbId) && item.equipmentType === targetType;
            }) || null;
        }

        const normalizedEquipment = this.normalizeEquipmentLabel(record.equipment || '');
        if (!normalizedEquipment) {
            return null;
        }

        const compact = normalizedEquipment.replace(/\s+/g, '').toLowerCase();
        return this.serviceScheduleData.find((item) => {
            if (item.equipmentType !== targetType) {
                return false;
            }

            return item.equipment.replace(/\s+/g, '').toLowerCase() === compact;
        }) || null;
    }

    async addServiceRecord(record) {
        const schedule = this.resolveScheduleFromRecord(record || {});
        if (!schedule) {
            this.emitToast('Please choose an existing vehicle or machine to update.', 'warning');
            return;
        }

        const payload = {};
        if (record.insuranceExpiry) {
            payload.warranty_expiry = record.insuranceExpiry;
        }
        if (record.nextServiceDue) {
            payload.next_service_date = record.nextServiceDue;
        }
        if (record.notes) {
            payload.notes = record.notes;
        }

        if (Object.keys(payload).length === 0) {
            this.emitToast('No service fields were provided for update.', 'warning');
            return;
        }

        const endpoint = schedule.equipmentType === 'vehicle'
            ? `/vehicles/${schedule.assetDbId}`
            : `/machines/${schedule.assetDbId}`;

        try {
            const response = await API.put(endpoint, payload);
            if (!response || response.status !== 'success') {
                this.emitToast(response?.message || 'Failed to update service details.', 'error');
                return;
            }

            this.emitToast('Service record updated successfully.', 'success');
            await this.loadServiceScheduleData();
        } catch (error) {
            console.error('Failed to update service record:', error);
            this.emitToast('Failed to update service details.', 'error');
        }
    }

    escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    emitToast(message, type = 'info') {
        this.dispatchEvent(new CustomEvent('maintenance-ui:toast', {
            bubbles: true,
            detail: { message, type },
        }));
    }
}

customElements.define('maintenance-service-warranty', MaintenanceServiceWarranty);
