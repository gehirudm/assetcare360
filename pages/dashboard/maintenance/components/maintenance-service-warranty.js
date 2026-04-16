class MaintenanceServiceWarranty extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.currentFilter = 'all';
        this.serviceScheduleData = this.buildInitialScheduleData();

        this.render();
        this.bindEvents();
        this.bindCrossComponentEvents();
        this.renderScheduleRows();
        this.applyFilter('all');
    }

    disconnectedCallback() {
        if (this._boundAddRecordHandler) {
            document.removeEventListener('maintenance-service:add-record', this._boundAddRecordHandler);
        }
    }

    buildInitialScheduleData() {
        const today = new Date();
        const inFiveDays = new Date(today);
        inFiveDays.setDate(today.getDate() + 5);

        const inThirtyDays = new Date(today);
        inThirtyDays.setDate(today.getDate() + 30);

        const oneDayAgo = new Date(today);
        oneDayAgo.setDate(today.getDate() - 1);

        return [
            {
                id: 'VH101',
                equipment: 'Vehicle #101',
                equipmentType: 'vehicle',
                insuranceExpiry: '2026-03-15',
                nextServiceDue: inFiveDays.toISOString().split('T')[0],
                serviceType: 'Preventive Maintenance',
                insuranceProvider: 'National Insurance Co.',
                insurancePolicy: 'POL-VH101-2025',
                lastService: 'Aug 20, 2025',
                serviceInterval: '3 months',
                technicalOfficer: 'Tech Officer A',
                notes: 'Monitor engine temperature closely after recent repairs',
            },
            {
                id: 'MC205',
                equipment: 'Machine #205',
                equipmentType: 'machinery',
                insuranceExpiry: '2025-12-01',
                nextServiceDue: inThirtyDays.toISOString().split('T')[0],
                serviceType: 'Major Service',
                insuranceProvider: 'Industrial Coverage Ltd.',
                insurancePolicy: 'POL-MC205-2025',
                lastService: 'Aug 15, 2025',
                serviceInterval: '6 months',
                technicalOfficer: 'Tech Officer C',
                notes: 'Hydraulic system requires special attention',
            },
            {
                id: 'VH089',
                equipment: 'Vehicle #089',
                equipmentType: 'vehicle',
                insuranceExpiry: '2026-01-20',
                nextServiceDue: oneDayAgo.toISOString().split('T')[0],
                serviceType: 'Routine Check',
                insuranceProvider: 'Fleet Insurance Co.',
                insurancePolicy: 'POL-VH089-2025',
                lastService: 'Aug 19, 2025',
                serviceInterval: '2 weeks',
                technicalOfficer: 'Tech Officer B',
                notes: 'Brake system recently overhauled - monitor closely',
            },
        ];
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Service & Warranty Monitoring</h1>
                <p class="page-subtitle">Track warranty and service schedules with color coding</p>
            </div>

            <div class="card">
                <div class="card-header">
                    <i class="fas fa-shield-alt"></i> Warranty Status Monitor
                    <div class="filter-controls" id="serviceWarrantyFilterControls">
                        <button class="filter-btn active" type="button" data-action="set-filter" data-status="all">All</button>
                        <button class="filter-btn" type="button" data-action="set-filter" data-status="active">Active</button>
                        <button class="filter-btn" type="button" data-action="set-filter" data-status="expiring">Expiring Soon</button>
                        <button class="filter-btn" type="button" data-action="set-filter" data-status="expired">Expired</button>
                    </div>
                </div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Equipment ID</th>
                            <th>Insurance Expiry</th>
                            <th>Next Service Due</th>
                            <th>Service Type</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="service-schedule-table-body"></tbody>
                </table>
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
                this.applyFilter(actionNode.dataset.status, actionNode);
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

    emitToast(message, type = 'info') {
        this.dispatchEvent(new CustomEvent('maintenance-ui:toast', {
            bubbles: true,
            detail: { message, type },
        }));
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) {
            return dateString || 'N/A';
        }

        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    }

    getDateStatus(dueDateString) {
        const today = new Date();
        const dueDate = new Date(dueDateString);
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

    getWarrantyStatus(serviceStatus) {
        if (serviceStatus === 'overdue') {
            return 'expired';
        }
        if (serviceStatus === 'due-soon') {
            return 'expiring';
        }
        return 'active';
    }

    getStatusMeta(serviceStatus) {
        if (serviceStatus === 'overdue') {
            return { className: 'status-overdue', text: 'Overdue' };
        }
        if (serviceStatus === 'due-soon') {
            return { className: 'status-due-soon', text: 'Due Soon' };
        }
        return { className: 'status-scheduled', text: 'Scheduled' };
    }

    renderScheduleRows() {
        const tbody = this.querySelector('#service-schedule-table-body');
        if (!tbody) {
            return;
        }

        tbody.innerHTML = this.serviceScheduleData.map((item) => {
            const serviceStatus = this.getDateStatus(item.nextServiceDue);
            const warrantyStatus = this.getWarrantyStatus(serviceStatus);
            const statusMeta = this.getStatusMeta(serviceStatus);

            return `
                <tr data-service-status="${serviceStatus}" data-warranty-status="${warrantyStatus}">
                    <td>${item.equipment}</td>
                    <td>${this.formatDate(item.insuranceExpiry)}</td>
                    <td>${this.formatDate(item.nextServiceDue)}</td>
                    <td>${item.serviceType}</td>
                    <td><span class="status-badge ${statusMeta.className}">${statusMeta.text}</span></td>
                    <td><button class="btn btn-secondary btn-small" type="button" data-action="view-schedule" data-equipment-id="${item.id}">View</button></td>
                </tr>
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

        this.querySelectorAll('#service-schedule-table-body tr').forEach((row) => {
            const rowWarrantyStatus = row.dataset.warrantyStatus;
            row.style.display = nextStatus === 'all' || rowWarrantyStatus === nextStatus ? 'table-row' : 'none';
        });
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
            equipment: schedule.equipment,
            insuranceProvider: schedule.insuranceProvider,
            insurancePolicy: schedule.insurancePolicy,
            insuranceExpiry: this.formatDate(schedule.insuranceExpiry),
            lastService: schedule.lastService,
            nextServiceDue: this.formatDate(schedule.nextServiceDue),
            serviceType: schedule.serviceType,
            serviceInterval: schedule.serviceInterval,
            technicalOfficer: schedule.technicalOfficer,
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

    inferEquipmentType(equipmentLabel) {
        const label = String(equipmentLabel || '').toLowerCase();
        if (label.includes('vehicle')) {
            return 'vehicle';
        }
        if (label.includes('machine')) {
            return 'machinery';
        }
        return '';
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
        const equipmentLabel = schedule?.equipment || this.normalizeEquipmentLabel(equipmentId);

        this.openAddServiceModal({
            equipmentId: equipmentLabel,
            equipmentType: schedule?.equipmentType || this.inferEquipmentType(equipmentLabel),
        });
    }

    generateServiceId(equipmentLabel, equipmentType) {
        const digits = String(equipmentLabel || '').replace(/[^0-9]/g, '');
        const prefix = equipmentType === 'machinery' ? 'MC' : 'VH';
        if (digits) {
            return `${prefix}${digits}`;
        }

        const fallbackNumber = this.serviceScheduleData.length + 1;
        return `${prefix}${String(fallbackNumber).padStart(3, '0')}`;
    }

    addServiceRecord(record) {
        const equipment = this.normalizeEquipmentLabel(record.equipment || record.id);
        if (!equipment) {
            return;
        }

        const equipmentType = record.equipmentType || this.inferEquipmentType(equipment);
        const entryId = String(record.id || this.generateServiceId(equipment, equipmentType)).toUpperCase();

        const entry = {
            id: entryId,
            equipment,
            equipmentType,
            insuranceExpiry: record.insuranceExpiry,
            nextServiceDue: record.nextServiceDue,
            serviceType: record.serviceType,
            insuranceProvider: record.insuranceProvider || 'Pending update',
            insurancePolicy: record.insurancePolicy || 'Pending update',
            lastService: record.lastService || this.formatDate(new Date().toISOString().split('T')[0]),
            serviceInterval: record.serviceInterval || 'TBD',
            technicalOfficer: record.technicalOfficer || 'Unassigned',
            notes: record.notes || 'No additional notes',
        };

        const existingIndex = this.serviceScheduleData.findIndex((item) => item.id === entryId);
        if (existingIndex >= 0) {
            this.serviceScheduleData[existingIndex] = entry;
        } else {
            this.serviceScheduleData.push(entry);
        }

        this.renderScheduleRows();
        this.applyFilter(this.currentFilter);
        this.emitToast('Service record added successfully!', 'success');
    }
}

customElements.define('maintenance-service-warranty', MaintenanceServiceWarranty);
