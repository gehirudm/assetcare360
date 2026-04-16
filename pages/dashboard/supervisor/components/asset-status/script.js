class SupervisorAssetStatus extends HTMLElement {
    constructor() {
        super();
        this._activeFilter = 'all';
        this._onRootClick = this._onRootClick.bind(this);
        this._onDocumentClick = this._onDocumentClick.bind(this);
    }

    connectedCallback() {
        if (this._initialized) return;

        this.render();
        this.addEventListener('click', this._onRootClick);
        document.addEventListener('click', this._onDocumentClick);
        this._initialized = true;

        this.applyFilter('all');
    }

    disconnectedCallback() {
        this.removeEventListener('click', this._onRootClick);
        document.removeEventListener('click', this._onDocumentClick);
    }

    refresh() {
        this.applyFilter(this._activeFilter);
    }

    _onRootClick(event) {
        const filterButton = event.target.closest('button[data-asset-filter]');
        if (filterButton) {
            const status = filterButton.dataset.assetFilter || 'all';
            this.applyFilter(status, filterButton);
            return;
        }

        const viewButton = event.target.closest('button[data-asset-view]');
        if (viewButton) {
            const assetId = viewButton.dataset.assetView;
            if (!assetId) return;

            this.dispatchEvent(new CustomEvent('supervisor-asset-status:view', {
                bubbles: true,
                detail: { assetId }
            }));
            return;
        }

        const updateButton = event.target.closest('button[data-asset-update]');
        if (updateButton) {
            const assetId = updateButton.dataset.assetUpdate;
            if (!assetId) return;

            this.closeAllDropdowns();
            this.dispatchEvent(new CustomEvent('supervisor-asset-status:update', {
                bubbles: true,
                detail: { assetId }
            }));
            return;
        }

        const dropdownTrigger = event.target.closest('button[data-dropdown-id]');
        if (!dropdownTrigger) return;

        event.preventDefault();
        event.stopPropagation();

        const dropdownId = dropdownTrigger.dataset.dropdownId;
        if (!dropdownId) return;

        this.toggleDropdown(dropdownId);
    }

    _onDocumentClick(event) {
        if (this.contains(event.target)) return;
        this.closeAllDropdowns();
    }

    toggleDropdown(dropdownId) {
        const target = this.querySelector(`#dropdown-${dropdownId}`);
        if (!target) return;

        const shouldOpen = !target.classList.contains('show');
        this.closeAllDropdowns();

        if (shouldOpen) {
            target.classList.add('show');
        }
    }

    closeAllDropdowns() {
        this.querySelectorAll('.dropdown-menu.show').forEach(menu => {
            menu.classList.remove('show');
        });
    }

    applyFilter(status = 'all', clickedButton = null) {
        const buttons = this.querySelectorAll('button[data-asset-filter]');
        const rows = this.querySelectorAll('#assetStatusTable .inventory-item');
        let visibleCount = 0;

        this._activeFilter = status;

        buttons.forEach(button => {
            button.classList.remove('active');
        });

        const selectedButton = clickedButton || this.querySelector(`button[data-asset-filter="${status}"]`) || buttons[0];
        if (selectedButton) {
            selectedButton.classList.add('active');
        }

        rows.forEach(row => {
            const rowStatus = row.dataset.status;
            const shouldShow = status === 'all' || rowStatus === status;

            row.style.display = shouldShow ? '' : 'none';
            if (shouldShow) {
                visibleCount += 1;
            }
        });

        this.dispatchEvent(new CustomEvent('supervisor-asset-status:filter', {
            bubbles: true,
            detail: {
                status,
                visibleCount
            }
        }));
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-clipboard-check"></i> Asset Status Overview</h2>
                <p class="page-subtitle">Monitor all assets under your supervision</p>
            </div>

            <div class="grid">
                <div class="card">
                    <div class="card-header"><i class="fas fa-truck"></i> Vehicles</div>
                    <div style="padding: 15px 0;">
                        <div style="font-size: 2em; font-weight: bold; color: var(--royal-blue);">12</div>
                        <div style="margin-top: 10px;">
                            <span style="color: var(--ok);">9 Operational</span> •
                            <span style="color: var(--warn);">2 Maintenance</span> •
                            <span style="color: var(--danger);">1 Repair</span>
                        </div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header"><i class="fas fa-cogs"></i> Machines</div>
                    <div style="padding: 15px 0;">
                        <div style="font-size: 2em; font-weight: bold; color: var(--tang-blue);">8</div>
                        <div style="margin-top: 10px;">
                            <span style="color: var(--ok);">6 Operational</span> •
                            <span style="color: var(--warn);">1 Maintenance</span> •
                            <span style="color: var(--danger);">1 Repair</span>
                        </div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header"><i class="fas fa-wrench"></i> In Maintenance</div>
                    <div style="padding: 15px 0;">
                        <div style="font-size: 2em; font-weight: bold; color: var(--warn);">3</div>
                        <div style="margin-top: 10px;">
                            <span>Regular servicing</span>
                        </div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header"><i class="fas fa-tools"></i> Under Repair</div>
                    <div style="padding: 15px 0;">
                        <div style="font-size: 2em; font-weight: bold; color: var(--danger);">2</div>
                        <div style="margin-top: 10px;">
                            <span>Critical issues</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="filter-controls">
                <button type="button" class="filter-btn active" data-asset-filter="all">All Assets</button>
                <button type="button" class="filter-btn" data-asset-filter="operational">Operational</button>
                <button type="button" class="filter-btn" data-asset-filter="maintenance">In Maintenance</button>
                <button type="button" class="filter-btn" data-asset-filter="repair">Under Repair</button>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-list"></i> Asset Details</span>
                </div>
                <div id="assetStatusTable" class="inventory-list">
                    ${this.renderAssetItem('VEH-001', 'fas fa-truck', 'Toyota Hiace LKA-1234', 'Depot A', 'Vehicle', 'operational', 'OPERATIONAL')}
                    ${this.renderAssetItem('VEH-002', 'fas fa-truck', 'Isuzu NPR LKA-5678', 'Workshop', 'Vehicle', 'maintenance', 'IN MAINTENANCE')}
                    ${this.renderAssetItem('VEH-003', 'fas fa-truck', 'Mitsubishi Canter LKA-9012', 'Workshop', 'Vehicle', 'repair', 'UNDER REPAIR')}
                    ${this.renderAssetItem('MAC-001', 'fas fa-cogs', 'CAT Excavator 320D', 'Site B', 'Machine', 'operational', 'OPERATIONAL')}
                    ${this.renderAssetItem('MAC-002', 'fas fa-cogs', 'JCB Backhoe 3CX', 'Site C', 'Machine', 'operational', 'OPERATIONAL')}
                </div>
            </div>
        `;
    }

    renderAssetItem(assetId, iconClass, name, location, type, statusClass, statusLabel) {
        return `
            <div class="inventory-item" data-status="${statusClass}">
                <div class="item-details">
                    <strong><i class="${iconClass}"></i> ${assetId} - ${name}</strong>
                    <div class="item-meta">
                        <i class="fas fa-map-marker-alt"></i> ${location} |
                        <i class="fas fa-clipboard-check"></i> ${type}
                    </div>
                    <div class="item-meta">
                        <span class="status-text status-${statusClass}">${statusLabel}</span>
                    </div>
                </div>
                <div class="item-actions">
                    <div class="action-buttons">
                        <button type="button" class="btn btn-primary btn-small" data-asset-view="${assetId}">
                            <i class="fas fa-eye"></i> VIEW
                        </button>
                        <div class="dropdown-container">
                            <button type="button" class="btn btn-small btn-secondary dropdown-trigger" data-dropdown-id="asset-${assetId}">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div class="dropdown-menu" id="dropdown-asset-${assetId}">
                                <button type="button" class="dropdown-item" data-asset-update="${assetId}">
                                    <i class="fas fa-edit"></i> Update Status
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

if (!customElements.get('supervisor-asset-status')) {
    customElements.define('supervisor-asset-status', SupervisorAssetStatus);
}
