class MaintenanceServiceTickets extends HTMLElement {
    constructor() {
        super();
        this._mounted = false;
        this._onModalCreated = this._onModalCreated.bind(this);
    }

    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.initializeState();
        this.render();
        this.bindEvents();
        document.addEventListener('maintenance-service-ticket-modal:created', this._onModalCreated);
        this.refresh();
    }

    disconnectedCallback() {
        document.removeEventListener('maintenance-service-ticket-modal:created', this._onModalCreated);
    }

    initializeState() {
        this.loading = false;
        this.tickets = [];
        this.technicians = [];
        this.assets = [];

        this.currentTicketFilter = 'all';
        this.currentTicketSort = 'created';
        this.currentTicketSearch = '';

        this.currentAssetFilter = 'all';
        this.currentAssetSort = 'service-priority';
        this.currentAssetSearch = '';
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Service Management</h1>
                <p class="page-subtitle">Track service status of all assets, create service tickets, and manage technician assignments</p>
            </div>

            <div class="card" style="margin-bottom: 20px;">
                <div class="card-header">
                    <span><i class="fas fa-heartbeat"></i> Asset Service Status</span>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="status-badge status-scheduled" id="maintenanceAssetStatusCount">Loading...</span>
                        <button id="maintenanceOpenCreateTicketModal" class="btn btn-primary btn-small" type="button" data-action="open-create-modal">
                            <i class="fas fa-plus-circle"></i> Create Service Ticket
                        </button>
                    </div>
                </div>

                <div class="filter-toolbar">
                    <div class="filter-toolbar__group">
                        <label class="filter-toolbar__label">Service Status</label>
                        <div class="filter-controls filter-toolbar__filters" id="maintenanceAssetStatusFilters">
                            <button class="filter-btn active" type="button" data-action="set-asset-filter" data-filter="all">All</button>
                            <button class="filter-btn" type="button" data-action="set-asset-filter" data-filter="overdue">Overdue</button>
                            <button class="filter-btn" type="button" data-action="set-asset-filter" data-filter="due-soon">Due Soon</button>
                            <button class="filter-btn" type="button" data-action="set-asset-filter" data-filter="scheduled">Scheduled</button>
                            <button class="filter-btn" type="button" data-action="set-asset-filter" data-filter="no-schedule">No Schedule</button>
                        </div>
                    </div>
                    <div class="filter-toolbar__group" style="min-width: 240px;">
                        <label class="filter-toolbar__label" for="maintenanceAssetSort">Sort Assets</label>
                        <select id="maintenanceAssetSort" class="form-select" data-action="set-asset-sort">
                            <option value="service-priority" selected>Service Priority</option>
                            <option value="most-overdue">Most Overdue First</option>
                            <option value="least-overdue">Least Overdue First</option>
                            <option value="due-soon">Due Soon First</option>
                            <option value="asset-name">Asset Name (A-Z)</option>
                        </select>
                    </div>
                </div>

                <div class="search-bar" style="margin-bottom: 16px;">
                    <input id="maintenanceAssetStatusSearch" class="search-input" data-action="search-assets" placeholder="Search by asset ID, name, reference, or status">
                </div>

                <div id="maintenanceAssetStatusList" class="inventory-list">
                    <div style="text-align:center;padding:20px;color:var(--muted);">Loading asset service status...</div>
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
            if (action === 'set-asset-filter') {
                this.currentAssetFilter = String(actionNode.dataset.filter || 'all');
                this.setActiveFilterButton('#maintenanceAssetStatusFilters', this.currentAssetFilter);
                this.renderAssetRows();
                return;
            }

            if (action === 'set-ticket-filter') {
                this.currentTicketFilter = String(actionNode.dataset.filter || 'all');
                this.setActiveFilterButton('#maintenanceServiceTicketFilters', this.currentTicketFilter);
                this.renderTicketRows();
                return;
            }

            if (action === 'set-ticket-sort') {
                return;
            }

            if (action === 'open-create-modal') {
                this.openCreateTicketModal(String(actionNode.dataset.assetKey || '').trim());
                return;
            }

            if (action === 'assign-ticket') {
                const ticketId = actionNode.dataset.ticketId;
                if (ticketId) {
                    this.assignTicket(ticketId);
                }
                return;
            }

            if (action === 'view-ticket') {
                const ticketId = actionNode.dataset.ticketId;
                if (ticketId) {
                    this.openTicketDetails(ticketId);
                }
            }
        });

        this.addEventListener('input', (event) => {
            const assetSearch = event.target.closest('[data-action="search-assets"]');
            if (assetSearch) {
                this.currentAssetSearch = String(assetSearch.value || '').trim().toLowerCase();
                this.renderAssetRows();
                return;
            }

            const ticketSearch = event.target.closest('[data-action="search-tickets"]');
            if (ticketSearch) {
                this.currentTicketSearch = String(ticketSearch.value || '').trim().toLowerCase();
                this.renderTicketRows();
            }
        });

        this.addEventListener('change', (event) => {
            const assetSortSelect = event.target.closest('[data-action="set-asset-sort"]');
            if (assetSortSelect) {
                this.currentAssetSort = String(assetSortSelect.value || 'service-priority');
                this.renderAssetRows();
                return;
            }

            const sortSelect = event.target.closest('[data-action="set-ticket-sort"]');
            if (!sortSelect) {
                return;
            }

            this.currentTicketSort = String(sortSelect.value || 'created');
            this.renderTicketRows();
        });
    }

    setActiveFilterButton(containerSelector, activeFilter) {
        this.querySelectorAll(`${containerSelector} .filter-btn`).forEach((button) => {
            button.classList.toggle('active', button.dataset.filter === activeFilter);
        });
    }

    async _onModalCreated() {
        await this.refresh();
    }

    async refresh() {
        this.loading = true;
        this.updateAssetSummary();
        this.renderAssetRows();

        let errorMessage = '';

        try {
            const [ticketsRes, techniciansRes, vehiclesRes, machinesRes] = await Promise.all([
                API.get('/service-tickets'),
                API.get('/service-tickets/technicians'),
                API.get('/vehicles?per_page=200'),
                API.get('/machines?per_page=200'),
            ]);

            this.tickets = this.extractTickets(ticketsRes);
            this.technicians = this.extractTechnicians(techniciansRes);

            const rawAssets = [
                ...this.extractAssets(vehiclesRes, 'vehicle'),
                ...this.extractAssets(machinesRes, 'machine'),
            ];
            this.assets = this.decorateAssetsWithServiceState(rawAssets);
        } catch (error) {
            console.error('Failed to load service management data:', error);
            this.tickets = [];
            this.technicians = [];
            this.assets = [];
            errorMessage = 'Failed to load service management data.';
            this.emitToast('Failed to load service management data.', 'error');
        }

        this.loading = false;
        this.renderAssetRows(errorMessage);
        this.updateAssetSummary();
    }

    extractTickets(response) {
        if (!response || response.status !== 'success') {
            return [];
        }

        const payload = response.data || {};
        if (Array.isArray(payload.tickets)) {
            return payload.tickets;
        }

        if (Array.isArray(payload)) {
            return payload;
        }

        return [];
    }

    extractTechnicians(response) {
        if (!response || response.status !== 'success') {
            return [];
        }

        const payload = response.data || {};
        if (!Array.isArray(payload.users)) {
            return [];
        }

        return payload.users.map((technician) => ({
            ...technician,
            active_ticket_count: Number(technician.active_ticket_count || 0),
            technical_expertise: String(technician.technical_expertise || 'General').trim() || 'General',
        }));
    }

    extractAssets(response, assetType) {
        if (!response || response.status !== 'success' || !response.data) {
            return [];
        }

        if (assetType === 'vehicle') {
            const vehicles = Array.isArray(response.data.vehicles) ? response.data.vehicles : [];
            return vehicles.map((vehicle) => ({
                key: `vehicle:${vehicle.id}`,
                asset_type: 'vehicle',
                asset_id: Number(vehicle.id),
                asset_code: vehicle.vehicle_id || `Vehicle-${vehicle.id}`,
                asset_name: vehicle.vehicle_name || 'Unnamed Vehicle',
                asset_reference: vehicle.number_plate || '-',
                asset_model: vehicle.model_number || '-',
                label: `${vehicle.vehicle_id || 'Vehicle'} - ${vehicle.vehicle_name || 'Unnamed Vehicle'}`,
                last_service_date: vehicle.last_service_date || null,
                next_service_date: vehicle.next_service_date || null,
                current_meter: this.toNumberOrNull(vehicle.current_mileage),
                next_service_meter: this.toNumberOrNull(vehicle.next_service_mileage),
                service_interval_days: this.toNumberOrNull(vehicle.service_interval_days),
                service_interval_meter: this.toNumberOrNull(vehicle.service_interval_km),
                meter_unit: 'km',
                components: this.normalizeComponents(vehicle.components),
            }));
        }

        const machines = Array.isArray(response.data.machines) ? response.data.machines : [];
        return machines.map((machine) => ({
            key: `machine:${machine.id}`,
            asset_type: 'machine',
            asset_id: Number(machine.id),
            asset_code: machine.machine_id || `Machine-${machine.id}`,
            asset_name: machine.machine_name || 'Unnamed Machine',
            asset_reference: machine.location || '-',
            asset_model: machine.model_number || '-',
            label: `${machine.machine_id || 'Machine'} - ${machine.machine_name || 'Unnamed Machine'}`,
            last_service_date: machine.last_service_date || null,
            next_service_date: machine.next_service_date || null,
            current_meter: this.toNumberOrNull(machine.current_operating_hours),
            next_service_meter: this.toNumberOrNull(machine.next_service_hours),
            service_interval_days: this.toNumberOrNull(machine.service_interval_days),
            service_interval_meter: this.toNumberOrNull(machine.service_interval_hours),
            meter_unit: 'hrs',
            components: this.normalizeComponents(machine.components),
        }));
    }

    normalizeComponents(rawComponents) {
        if (Array.isArray(rawComponents)) {
            return rawComponents.filter((entry) => String(entry || '').trim() !== '');
        }

        if (rawComponents == null || rawComponents === '') {
            return [];
        }

        if (typeof rawComponents === 'string') {
            const trimmed = rawComponents.trim();
            if (!trimmed) {
                return [];
            }

            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    return parsed.filter((entry) => String(entry || '').trim() !== '');
                }
            } catch (error) {
                return trimmed.split(',').map((entry) => entry.trim()).filter((entry) => entry);
            }

            return [];
        }

        return [];
    }

    toNumberOrNull(value) {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : null;
    }

    decorateAssetsWithServiceState(assets) {
        const openTicketCounts = new Map();
        const activeTicketByAsset = this.buildActiveTicketByAssetMap();

        this.tickets.forEach((ticket) => {
            const ticketStatus = this.normalizeFilterStatus(ticket.status);
            if (ticketStatus === 'completed' || ticketStatus === 'cancelled') {
                return;
            }

            const assetType = String(ticket.asset_type || '').toLowerCase();
            const assetId = Number(ticket.asset_id);
            if (!assetType || !Number.isFinite(assetId)) {
                return;
            }

            const key = `${assetType}:${assetId}`;
            openTicketCounts.set(key, (openTicketCounts.get(key) || 0) + 1);
        });

        return assets
            .map((asset) => {
                const statusMeta = this.computeAssetServiceStatus(asset);
                const openTicketCount = openTicketCounts.get(asset.key) || 0;
                const componentCount = Array.isArray(asset.components) ? asset.components.length : 0;
                const activeTicket = activeTicketByAsset.get(asset.key) || null;

                if (activeTicket) {
                    const ticketStatusMeta = this.getStatusMeta(activeTicket.status);
                    const activeTicketId = activeTicket.service_ticket_id || `#${activeTicket.id}`;

                    return {
                        ...asset,
                        service_status_key: 'service-in-progress',
                        service_status_label: 'Service In Progress',
                        service_status_class: 'status-in-progress',
                        service_due_summary: `Active ticket ${activeTicketId} (${ticketStatusMeta.text})`,
                        service_urgency_rank: -1,
                        open_ticket_count: openTicketCount,
                        component_count: componentCount,
                        active_service_ticket_id: activeTicket.id || activeTicket.service_ticket_id || null,
                    };
                }

                return {
                    ...asset,
                    ...statusMeta,
                    open_ticket_count: openTicketCount,
                    component_count: componentCount,
                    active_service_ticket_id: null,
                };
            })
            .sort((first, second) => {
                const statusDiff = this.getAssetStatusOrder(first.service_status_key) - this.getAssetStatusOrder(second.service_status_key);
                if (statusDiff !== 0) {
                    return statusDiff;
                }

                const urgencyDiff = first.service_urgency_rank - second.service_urgency_rank;
                if (urgencyDiff !== 0) {
                    return urgencyDiff;
                }

                return String(first.asset_name || '').localeCompare(String(second.asset_name || ''));
            });
    }

    buildActiveTicketByAssetMap() {
        const activeTicketByAsset = new Map();

        this.tickets.forEach((ticket) => {
            const ticketStatus = this.normalizeFilterStatus(ticket.status);
            if (ticketStatus === 'completed' || ticketStatus === 'cancelled') {
                return;
            }

            const assetType = String(ticket.asset_type || '').toLowerCase();
            const assetId = Number(ticket.asset_id);
            if (!assetType || !Number.isFinite(assetId)) {
                return;
            }

            const key = `${assetType}:${assetId}`;
            const current = activeTicketByAsset.get(key);

            if (!current || this.getTicketTimestamp(ticket) > this.getTicketTimestamp(current)) {
                activeTicketByAsset.set(key, ticket);
            }
        });

        return activeTicketByAsset;
    }

    getAssetStatusOrder(statusKey) {
        if (statusKey === 'service-in-progress') {
            return -1;
        }
        if (statusKey === 'overdue') {
            return 0;
        }
        if (statusKey === 'due-soon') {
            return 1;
        }
        if (statusKey === 'scheduled') {
            return 2;
        }
        return 3;
    }

    computeAssetServiceStatus(asset) {
        const dateAssessment = this.assessDateStatus(asset.next_service_date);
        const meterAssessment = this.assessMeterStatus(asset.current_meter, asset.next_service_meter, asset.asset_type);
        const assessments = [dateAssessment, meterAssessment].filter(Boolean);

        if (assessments.length === 0) {
            return {
                service_status_key: 'no-schedule',
                service_status_label: 'No Schedule',
                service_status_class: 'status-pending',
                service_due_summary: 'No service date or meter threshold configured.',
                service_urgency_rank: 999999,
            };
        }

        assessments.sort((first, second) => {
            if (first.severity !== second.severity) {
                return second.severity - first.severity;
            }

            return first.distance - second.distance;
        });

        const primary = assessments[0];
        const secondary = assessments[1] || null;

        let summary = primary.summary;
        if (secondary && secondary.severity === primary.severity && secondary.summary !== primary.summary) {
            summary = `${primary.summary} | ${secondary.summary}`;
        }

        const statusMeta = this.getServiceStatusMeta(primary.statusKey);

        return {
            service_status_key: primary.statusKey,
            service_status_label: statusMeta.label,
            service_status_class: statusMeta.className,
            service_due_summary: summary,
            service_urgency_rank: primary.distance,
        };
    }

    assessDateStatus(dateString) {
        if (!dateString) {
            return null;
        }

        const dueDate = new Date(`${dateString}T00:00:00`);
        if (Number.isNaN(dueDate.getTime())) {
            return null;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dayMs = 24 * 60 * 60 * 1000;
        const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / dayMs);

        if (diffDays < 0) {
            const overdueDays = Math.abs(diffDays);
            return {
                statusKey: 'overdue',
                severity: 3,
                distance: overdueDays,
                summary: `Date overdue by ${overdueDays} day${overdueDays === 1 ? '' : 's'}`,
            };
        }

        if (diffDays <= 7) {
            if (diffDays === 0) {
                return {
                    statusKey: 'due-soon',
                    severity: 2,
                    distance: 0,
                    summary: 'Date due today',
                };
            }

            return {
                statusKey: 'due-soon',
                severity: 2,
                distance: diffDays,
                summary: `Date due in ${diffDays} day${diffDays === 1 ? '' : 's'}`,
            };
        }

        return {
            statusKey: 'scheduled',
            severity: 1,
            distance: diffDays,
            summary: `Date due on ${this.formatDate(dateString)}`,
        };
    }

    assessMeterStatus(currentMeter, nextServiceMeter, assetType) {
        if (!Number.isFinite(currentMeter) || !Number.isFinite(nextServiceMeter)) {
            return null;
        }

        const remaining = nextServiceMeter - currentMeter;
        const threshold = assetType === 'vehicle' ? 500 : 10;
        const unit = assetType === 'vehicle' ? 'km' : 'hrs';

        if (remaining <= 0) {
            const overdueBy = Math.abs(remaining);
            return {
                statusKey: 'overdue',
                severity: 3,
                distance: overdueBy,
                summary: `${unit.toUpperCase()} overdue by ${this.formatNumber(overdueBy)} ${unit}`,
            };
        }

        if (remaining <= threshold) {
            return {
                statusKey: 'due-soon',
                severity: 2,
                distance: remaining,
                summary: `${unit.toUpperCase()} due in ${this.formatNumber(remaining)} ${unit}`,
            };
        }

        return {
            statusKey: 'scheduled',
            severity: 1,
            distance: remaining,
            summary: `Next threshold in ${this.formatNumber(remaining)} ${unit}`,
        };
    }

    getServiceStatusMeta(statusKey) {
        if (statusKey === 'overdue') {
            return { label: 'Overdue', className: 'status-overdue' };
        }

        if (statusKey === 'due-soon') {
            return { label: 'Due Soon', className: 'status-due-soon' };
        }

        if (statusKey === 'scheduled') {
            return { label: 'Scheduled', className: 'status-scheduled' };
        }

        return { label: 'No Schedule', className: 'status-pending' };
    }

    getPriorityRank(priority) {
        const normalized = String(priority || 'Medium').toLowerCase();
        if (normalized === 'critical') return 4;
        if (normalized === 'high') return 3;
        if (normalized === 'low') return 1;
        return 2;
    }

    getTicketTimestamp(ticket) {
        const candidates = [
            ticket.created_at,
            ticket.updated_at,
            ticket.scheduled_date,
        ];

        for (const value of candidates) {
            if (!value) {
                continue;
            }

            const timestamp = new Date(value).getTime();
            if (Number.isFinite(timestamp)) {
                return timestamp;
            }
        }

        return Number(ticket.id || 0);
    }

    normalizeFilterStatus(status) {
        const normalized = String(status || '').toLowerCase();
        if (normalized.includes('pending')) {
            return 'pending';
        }
        if (normalized.includes('assigned')) {
            return 'assigned';
        }
        if (normalized.includes('progress')) {
            return 'in-progress';
        }
        if (normalized.includes('completed')) {
            return 'completed';
        }
        if (normalized.includes('cancelled')) {
            return 'cancelled';
        }
        return 'pending';
    }

    getStatusMeta(status) {
        const normalized = this.normalizeFilterStatus(status);
        if (normalized === 'assigned') {
            return { text: 'Assigned', className: 'status-assigned' };
        }
        if (normalized === 'in-progress') {
            return { text: 'In Progress', className: 'status-in-progress' };
        }
        if (normalized === 'completed') {
            return { text: 'Completed', className: 'status-completed' };
        }
        if (normalized === 'cancelled') {
            return { text: 'Cancelled', className: 'status-closed' };
        }

        return { text: 'Pending Assignment', className: 'status-pending' };
    }

    getPriorityBadgeClass(priority) {
        const normalized = String(priority || 'Medium').toLowerCase();
        if (normalized === 'critical') {
            return 'status-critical';
        }
        if (normalized === 'high') {
            return 'status-pending';
        }
        if (normalized === 'low') {
            return 'status-scheduled';
        }
        return 'status-assigned';
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

    formatNumber(value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) {
            return '0';
        }

        return new Intl.NumberFormat('en-GB').format(Math.round(numeric));
    }

    getFilteredAssets() {
        const filtered = this.assets.filter((asset) => {
            const matchesFilter = this.currentAssetFilter === 'all' || asset.service_status_key === this.currentAssetFilter;
            if (!matchesFilter) {
                return false;
            }

            const searchText = [
                asset.asset_code,
                asset.asset_name,
                asset.asset_reference,
                asset.asset_model,
                asset.service_status_label,
                asset.service_due_summary,
            ].join(' ').toLowerCase();

            return !this.currentAssetSearch || searchText.includes(this.currentAssetSearch);
        });

        return this.sortAssets(filtered);
    }

    sortAssets(assets) {
        const sorted = [...assets];

        if (this.currentAssetSort === 'asset-name') {
            return sorted.sort((first, second) => String(first.asset_name || '').localeCompare(String(second.asset_name || '')));
        }

        if (this.currentAssetSort === 'most-overdue') {
            return sorted.sort((first, second) => {
                const firstOverdue = first.service_status_key === 'overdue';
                const secondOverdue = second.service_status_key === 'overdue';

                if (firstOverdue !== secondOverdue) {
                    return firstOverdue ? -1 : 1;
                }

                if (firstOverdue && secondOverdue) {
                    const urgencyDiff = this.getAssetUrgencyRank(second) - this.getAssetUrgencyRank(first);
                    if (urgencyDiff !== 0) {
                        return urgencyDiff;
                    }
                }

                return this.compareByServicePriority(first, second);
            });
        }

        if (this.currentAssetSort === 'least-overdue') {
            return sorted.sort((first, second) => {
                const firstOverdue = first.service_status_key === 'overdue';
                const secondOverdue = second.service_status_key === 'overdue';

                if (firstOverdue !== secondOverdue) {
                    return firstOverdue ? -1 : 1;
                }

                if (firstOverdue && secondOverdue) {
                    const urgencyDiff = this.getAssetUrgencyRank(first) - this.getAssetUrgencyRank(second);
                    if (urgencyDiff !== 0) {
                        return urgencyDiff;
                    }
                }

                return this.compareByServicePriority(first, second);
            });
        }

        if (this.currentAssetSort === 'due-soon') {
            const dueSoonOrder = {
                'due-soon': 0,
                overdue: 1,
                scheduled: 2,
                'service-in-progress': 3,
                'no-schedule': 4,
            };

            return sorted.sort((first, second) => {
                const firstOrder = dueSoonOrder[first.service_status_key] ?? 5;
                const secondOrder = dueSoonOrder[second.service_status_key] ?? 5;
                if (firstOrder !== secondOrder) {
                    return firstOrder - secondOrder;
                }

                if (first.service_status_key === 'due-soon' || first.service_status_key === 'scheduled') {
                    const urgencyDiff = this.getAssetUrgencyRank(first) - this.getAssetUrgencyRank(second);
                    if (urgencyDiff !== 0) {
                        return urgencyDiff;
                    }
                }

                if (first.service_status_key === 'overdue') {
                    const urgencyDiff = this.getAssetUrgencyRank(second) - this.getAssetUrgencyRank(first);
                    if (urgencyDiff !== 0) {
                        return urgencyDiff;
                    }
                }

                return String(first.asset_name || '').localeCompare(String(second.asset_name || ''));
            });
        }

        return sorted.sort((first, second) => this.compareByServicePriority(first, second));
    }

    compareByServicePriority(first, second) {
        const statusDiff = this.getAssetStatusOrder(first.service_status_key) - this.getAssetStatusOrder(second.service_status_key);
        if (statusDiff !== 0) {
            return statusDiff;
        }

        const urgencyDiff = this.getAssetUrgencyRank(first) - this.getAssetUrgencyRank(second);
        if (urgencyDiff !== 0) {
            return urgencyDiff;
        }

        return String(first.asset_name || '').localeCompare(String(second.asset_name || ''));
    }

    getAssetUrgencyRank(asset) {
        const rank = Number(asset?.service_urgency_rank);
        if (Number.isFinite(rank)) {
            return rank;
        }

        return Number.MAX_SAFE_INTEGER;
    }

    renderAssetRows(errorMessage = '') {
        const list = this.querySelector('#maintenanceAssetStatusList');
        if (!list) {
            return;
        }

        if (errorMessage) {
            list.innerHTML = `<div style="text-align:center;padding:20px;color:var(--danger);">${this.escapeHtml(errorMessage)}</div>`;
            this.updateAssetSummary(0);
            return;
        }

        if (this.loading) {
            list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);">Loading asset service status...</div>';
            return;
        }

        const filtered = this.getFilteredAssets();
        if (filtered.length === 0) {
            list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);">No assets match the selected service status.</div>';
            this.updateAssetSummary(0);
            return;
        }

        list.innerHTML = filtered.map((asset) => {
            const typeLabel = asset.asset_type === 'machine' ? 'Machine' : 'Vehicle';
            const intervalDate = Number.isFinite(asset.service_interval_days) ? `${asset.service_interval_days} days` : 'N/A';
            const intervalMeter = Number.isFinite(asset.service_interval_meter)
                ? `${this.formatNumber(asset.service_interval_meter)} ${asset.meter_unit}`
                : 'N/A';
            const openTicketLabel = asset.open_ticket_count > 0
                ? `${asset.open_ticket_count} open ticket${asset.open_ticket_count === 1 ? '' : 's'}`
                : 'No open tickets';
            const openTicketClass = asset.open_ticket_count > 0 ? 'status-assigned' : 'status-scheduled';
            const hasActiveTicket = asset.active_service_ticket_id !== null && asset.active_service_ticket_id !== undefined && String(asset.active_service_ticket_id).trim() !== '';

            return `
                <div class="inventory-item" data-asset-key="${this.escapeHtml(asset.key)}">
                    <div class="item-details">
                        <strong><i class="fas fa-cubes"></i> ${this.escapeHtml(asset.asset_code)} - ${this.escapeHtml(asset.asset_name)}</strong>
                        <div class="item-meta">
                            <i class="fas fa-tag"></i> ${this.escapeHtml(typeLabel)} &nbsp;|&nbsp;
                            <i class="fas fa-map-marker-alt"></i> ${this.escapeHtml(asset.asset_reference || '-')} &nbsp;|&nbsp;
                            <i class="fas fa-microchip"></i> ${this.escapeHtml(asset.asset_model || '-')}
                        </div>
                        <div class="item-meta">
                            <span class="status-badge ${this.escapeHtml(asset.service_status_class)}">${this.escapeHtml(asset.service_status_label)}</span>
                            &nbsp;|&nbsp;
                            <span class="status-badge ${openTicketClass}">${this.escapeHtml(openTicketLabel)}</span>
                        </div>
                        <div class="item-description">${this.escapeHtml(asset.service_due_summary)}</div>
                        <div class="item-meta">
                            <i class="fas fa-history"></i> Interval: ${this.escapeHtml(intervalDate)} / ${this.escapeHtml(intervalMeter)}
                            &nbsp;|&nbsp;
                            <i class="fas fa-calendar-check"></i> Next Service: ${this.escapeHtml(this.formatDate(asset.next_service_date))}
                        </div>
                    </div>
                    <div class="item-actions" style="min-width: 180px;">
                        ${hasActiveTicket ? `
                            <button class="btn btn-secondary btn-small" type="button" data-action="view-ticket" data-ticket-id="${this.escapeHtml(asset.active_service_ticket_id)}">
                                <i class="fas fa-eye"></i> View Ticket
                            </button>
                        ` : `
                            <button class="btn btn-primary btn-small" type="button" data-action="open-create-modal" data-asset-key="${this.escapeHtml(asset.key)}">
                                <i class="fas fa-plus-circle"></i> Create Ticket
                            </button>
                        `}
                    </div>
                </div>
            `;
        }).join('');

        this.updateAssetSummary(filtered.length);
    }

    renderTicketRows(errorMessage = '') {
        const list = this.querySelector('#maintenanceServiceTicketList');
        if (!list) {
            return;
        }

        if (errorMessage) {
            list.innerHTML = `<div style="text-align:center;padding:20px;color:var(--danger);">${this.escapeHtml(errorMessage)}</div>`;
            this.updateTicketSummary(0);
            return;
        }

        if (this.loading) {
            list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);">Loading service tickets...</div>';
            return;
        }

        const sorted = [...this.tickets].sort((first, second) => {
            if (this.currentTicketSort === 'priority') {
                const priorityDiff = this.getPriorityRank(second.priority) - this.getPriorityRank(first.priority);
                if (priorityDiff !== 0) {
                    return priorityDiff;
                }
            }

            if (this.currentTicketSort === 'scheduled') {
                const firstDate = new Date(first.scheduled_date || '').getTime();
                const secondDate = new Date(second.scheduled_date || '').getTime();
                const safeFirst = Number.isFinite(firstDate) ? firstDate : Number.MAX_SAFE_INTEGER;
                const safeSecond = Number.isFinite(secondDate) ? secondDate : Number.MAX_SAFE_INTEGER;
                if (safeFirst !== safeSecond) {
                    return safeFirst - safeSecond;
                }
            }

            return this.getTicketTimestamp(second) - this.getTicketTimestamp(first);
        });

        const filtered = sorted.filter((ticket) => {
            const ticketStatus = this.normalizeFilterStatus(ticket.status);
            const matchesFilter = this.currentTicketFilter === 'all' || ticketStatus === this.currentTicketFilter;
            if (!matchesFilter) {
                return false;
            }

            const searchText = [
                ticket.service_ticket_id,
                ticket.title,
                ticket.description,
                ticket.asset_name,
                ticket.asset_code,
                ticket.service_type,
                ticket.assigned_to_name,
            ].join(' ').toLowerCase();

            return !this.currentTicketSearch || searchText.includes(this.currentTicketSearch);
        });

        if (filtered.length === 0) {
            list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);">No service tickets found.</div>';
            this.updateTicketSummary(0);
            return;
        }

        list.innerHTML = filtered.map((ticket) => {
            const status = this.getStatusMeta(ticket.status);
            const priorityClass = this.getPriorityBadgeClass(ticket.priority);
            const serviceTicketId = this.escapeHtml(ticket.service_ticket_id || `#${ticket.id}`);
            const title = this.escapeHtml(ticket.title || 'Untitled service ticket');
            const assetName = this.escapeHtml(ticket.asset_name || 'Unknown asset');
            const assetCode = this.escapeHtml(ticket.asset_code || '-');
            const serviceType = this.escapeHtml(ticket.service_type || '-');
            const scheduledDate = this.escapeHtml(this.formatDate(ticket.scheduled_date));
            const assignedTo = this.escapeHtml(ticket.assigned_to_name || 'Unassigned');
            const createdDate = this.escapeHtml(this.formatDate(ticket.created_at));
            const notes = this.escapeHtml(ticket.maintenance_notes || 'No maintenance notes');
            const description = this.escapeHtml(ticket.description || '');
            const ticketId = Number(ticket.id);

            const canAssign = this.normalizeFilterStatus(ticket.status) !== 'completed'
                && this.normalizeFilterStatus(ticket.status) !== 'cancelled';

            return `
                <div class="inventory-item" data-ticket-id="${ticketId}">
                    <div class="item-details">
                        <strong><i class="fas fa-tools"></i> ${serviceTicketId} - ${title}</strong>
                        <div class="item-meta">
                            <i class="fas fa-cubes"></i> ${assetName} (${assetCode}) &nbsp;|&nbsp;
                            <i class="fas fa-tag"></i> ${serviceType}
                        </div>
                        <div class="item-description">${description}</div>
                        <div class="item-meta">
                            <span class="status-badge ${status.className}">${status.text}</span>
                            &nbsp;|&nbsp;
                            <span class="status-badge ${priorityClass}">${this.escapeHtml(String(ticket.priority || 'Medium'))}</span>
                            &nbsp;|&nbsp;
                            <i class="fas fa-calendar-check"></i> Scheduled: ${scheduledDate}
                        </div>
                        <div class="item-meta">
                            <i class="fas fa-user-cog"></i> Assigned To: ${assignedTo}
                            &nbsp;|&nbsp;
                            <i class="fas fa-clock"></i> Created: ${createdDate}
                        </div>
                        <div class="item-meta">
                            <i class="fas fa-sticky-note"></i> ${notes}
                        </div>
                    </div>
                    <div class="item-actions" style="min-width: 250px;">
                        <button class="btn btn-secondary btn-small" type="button" data-action="view-ticket" data-ticket-id="${ticketId}" style="margin-bottom: 8px; width: 100%;">
                            <i class="fas fa-eye"></i> View Details
                        </button>
                        ${canAssign ? `
                            <select class="form-select" data-ticket-technician="${ticketId}" style="margin-bottom: 8px; min-width: 220px;">
                                <option value="">Unassigned</option>
                                ${this.technicians.map((technician) => {
                                    const technicianId = Number(technician.id);
                                    const selected = Number(ticket.assigned_to) === technicianId ? 'selected' : '';
                                    const workload = Number(technician.active_ticket_count || 0);
                                    const expertise = this.escapeHtml(String(technician.technical_expertise || 'General'));
                                    const name = this.escapeHtml(technician.full_name || 'Technical Officer');
                                    return `<option value="${technicianId}" ${selected}>${name} (${expertise}, ${workload} active)</option>`;
                                }).join('')}
                            </select>
                            <button class="btn btn-primary btn-small" type="button" data-action="assign-ticket" data-ticket-id="${ticketId}">
                                <i class="fas fa-user-check"></i> Save Assignment
                            </button>
                        ` : '<span class="status-badge status-completed">Assignment locked</span>'}
                    </div>
                </div>
            `;
        }).join('');

        this.updateTicketSummary(filtered.length);
    }

    updateAssetSummary(visibleCount = null) {
        const summary = this.querySelector('#maintenanceAssetStatusCount');
        if (!summary) {
            return;
        }

        if (this.loading) {
            summary.textContent = 'Loading...';
            return;
        }

        const total = this.assets.length;
        if (visibleCount === null) {
            summary.textContent = `${total} assets`;
            return;
        }

        summary.textContent = `${visibleCount} of ${total} assets`;
    }

    updateTicketSummary(visibleCount = null) {
        const summary = this.querySelector('#maintenanceServiceTicketCount');
        if (!summary) {
            return;
        }

        if (this.loading) {
            summary.textContent = 'Loading...';
            return;
        }

        const total = this.tickets.length;
        if (visibleCount === null) {
            summary.textContent = `${total} tickets`;
            return;
        }

        summary.textContent = `${visibleCount} of ${total} tickets`;
    }

    openCreateTicketModal(defaultAssetKey = '') {
        if (this.loading) {
            this.emitToast('Please wait for service data to load.', 'warning');
            return;
        }

        const modal = document.querySelector('maintenance-create-service-ticket-modal');
        if (!modal || typeof modal.open !== 'function') {
            this.emitToast('Service ticket creation modal is unavailable.', 'error');
            return;
        }

        modal.open({
            assets: this.assets,
            technicians: this.technicians,
            defaultAssetKey,
        });
    }

    async assignTicket(ticketId) {
        const numericId = Number(ticketId);
        const select = this.querySelector(`select[data-ticket-technician="${numericId}"]`);
        if (!select) {
            return;
        }

        const assignedTo = String(select.value || '').trim();

        try {
            const response = await API.put(`/service-tickets/${numericId}`, {
                assigned_to: assignedTo || null,
            });

            if (!response || response.status !== 'success') {
                this.emitToast(response?.message || 'Failed to update assignment.', 'error');
                return;
            }

            this.emitToast('Service ticket assignment updated.', 'success');
            await this.refresh();
        } catch (error) {
            console.error('Failed to assign service ticket:', error);
            this.emitToast('Failed to update assignment.', 'error');
        }
    }

    openTicketDetails(ticketId) {
        if (typeof window.viewServiceTicketDetails === 'function') {
            window.viewServiceTicketDetails(String(ticketId || '').trim());
            return;
        }

        this.emitToast('Service ticket details component is unavailable right now.', 'error');
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

if (!customElements.get('maintenance-service-tickets')) {
    customElements.define('maintenance-service-tickets', MaintenanceServiceTickets);
}