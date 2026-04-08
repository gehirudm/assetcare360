class SupervisorRepairManagement extends HTMLElement {
    constructor() {
        super();
        this._onRootClick = this._onRootClick.bind(this);
        this._onDocumentClick = this._onDocumentClick.bind(this);
    }

    connectedCallback() {
        if (this._initialized) return;

        this.render();
        this.addEventListener('click', this._onRootClick);
        document.addEventListener('click', this._onDocumentClick);
        this._initialized = true;
    }

    disconnectedCallback() {
        this.removeEventListener('click', this._onRootClick);
        document.removeEventListener('click', this._onDocumentClick);
    }

    refresh() {
        // Parent handles data refresh. This method keeps interface parity with other section components.
    }

    _onRootClick(event) {
        const actionButton = event.target.closest('button[data-repair-action]');
        if (actionButton) {
            const action = actionButton.dataset.repairAction;
            const repairId = actionButton.dataset.repairId;

            if (action === 'view-outsourced') {
                this.dispatchEvent(new CustomEvent('supervisor-repair-management:view-outsourced', { bubbles: true }));
                return;
            }

            if (action === 'update-component-info') {
                this.dispatchEvent(new CustomEvent('supervisor-repair-management:update-component-info', { bubbles: true }));
                return;
            }

            if (!action || !repairId) return;

            this.dispatchEvent(new CustomEvent(`supervisor-repair-management:${action}`, {
                bubbles: true,
                detail: { repairId }
            }));

            this.closeAllDropdowns();
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

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-tools"></i> Repair Management</h2>
                <p class="page-subtitle">Green-light repairs, monitor timelines and update component info</p>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-wrench"></i> Repairs Awaiting Green-Light</span>
                    <span class="status-text status-pending">6 pending</span>
                </div>
                <div id="pendingRepairsList" class="inventory-list">
                    <div class="inventory-item" data-id="REP-001">
                        <div class="item-details">
                            <strong><i class="fas fa-wrench"></i> REP-001 - Engine Overhaul</strong>
                            <div class="item-meta">
                                <i class="fas fa-truck"></i> Vehicle V-105 |
                                <i class="fas fa-user-cog"></i> Tech: Mike
                            </div>
                            <div class="item-meta">
                                <span class="status-text status-urgent">URGENT</span> |
                                <i class="fas fa-dollar-sign"></i> Est. Cost: $2,500
                            </div>
                        </div>
                        <div class="item-actions">
                            <div class="action-buttons">
                                <button type="button" class="btn btn-primary btn-small" data-repair-action="view-repair-details" data-repair-id="REP-001">
                                    <i class="fas fa-eye"></i> VIEW
                                </button>
                                <div class="dropdown-container">
                                    <button type="button" class="btn btn-small btn-secondary dropdown-trigger" data-dropdown-id="repair-REP-001">
                                        <i class="fas fa-ellipsis-v"></i>
                                    </button>
                                    <div class="dropdown-menu" id="dropdown-repair-REP-001">
                                        <button type="button" class="dropdown-item" data-repair-action="approve-repair" data-repair-id="REP-001">
                                            <i class="fas fa-check"></i> Approve
                                        </button>
                                        <button type="button" class="dropdown-item" data-repair-action="reject-repair" data-repair-id="REP-001">
                                            <i class="fas fa-times"></i> Reject
                                        </button>
                                        <button type="button" class="dropdown-item" data-repair-action="outsource-repair" data-repair-id="REP-001">
                                            <i class="fas fa-building"></i> Outsource
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="inventory-item" data-id="REP-002">
                        <div class="item-details">
                            <strong><i class="fas fa-wrench"></i> REP-002 - Transmission Repair</strong>
                            <div class="item-meta">
                                <i class="fas fa-truck"></i> Vehicle V-108 |
                                <i class="fas fa-user-cog"></i> Tech: Sarah
                            </div>
                            <div class="item-meta">
                                <span class="status-text status-normal">NORMAL</span> |
                                <i class="fas fa-dollar-sign"></i> Est. Cost: $1,800
                            </div>
                        </div>
                        <div class="item-actions">
                            <div class="action-buttons">
                                <button type="button" class="btn btn-primary btn-small" data-repair-action="view-repair-details" data-repair-id="REP-002">
                                    <i class="fas fa-eye"></i> VIEW
                                </button>
                                <div class="dropdown-container">
                                    <button type="button" class="btn btn-small btn-secondary dropdown-trigger" data-dropdown-id="repair-REP-002">
                                        <i class="fas fa-ellipsis-v"></i>
                                    </button>
                                    <div class="dropdown-menu" id="dropdown-repair-REP-002">
                                        <button type="button" class="dropdown-item" data-repair-action="approve-repair" data-repair-id="REP-002">
                                            <i class="fas fa-check"></i> Approve
                                        </button>
                                        <button type="button" class="dropdown-item" data-repair-action="reject-repair" data-repair-id="REP-002">
                                            <i class="fas fa-times"></i> Reject
                                        </button>
                                        <button type="button" class="dropdown-item" data-repair-action="outsource-repair" data-repair-id="REP-002">
                                            <i class="fas fa-building"></i> Outsource
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-clock"></i> Ongoing Repairs - Timeline Monitoring</span>
                </div>
                <div id="ongoingRepairsList" class="inventory-list">
                    <div class="inventory-item" data-id="REP-010">
                        <div class="item-details">
                            <strong><i class="fas fa-tools"></i> REP-010 - Hydraulic System</strong>
                            <div class="item-meta">
                                <i class="fas fa-cogs"></i> Machine M-205 |
                                <i class="fas fa-user-cog"></i> Tech Mike
                            </div>
                            <div class="item-meta">
                                <span class="status-text status-in-progress">ON TRACK</span> |
                                <i class="fas fa-calendar-check"></i> Expected: Oct 20, 2025
                            </div>
                        </div>
                        <div class="item-actions">
                            <div class="action-buttons">
                                <button type="button" class="btn btn-primary btn-small" data-repair-action="view-repair-progress" data-repair-id="REP-010">
                                    <i class="fas fa-eye"></i> VIEW
                                </button>
                                <div class="dropdown-container">
                                    <button type="button" class="btn btn-small btn-secondary dropdown-trigger" data-dropdown-id="ongoing-REP-010">
                                        <i class="fas fa-ellipsis-v"></i>
                                    </button>
                                    <div class="dropdown-menu" id="dropdown-ongoing-REP-010">
                                        <button type="button" class="dropdown-item" data-repair-action="update-repair-timeline" data-repair-id="REP-010">
                                            <i class="fas fa-calendar"></i> Update Timeline
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-building"></i> Outsourced Repairs</span>
                    <button type="button" class="btn btn-secondary btn-small" data-repair-action="view-outsourced">
                        <i class="fas fa-eye"></i> View All
                    </button>
                </div>
                <div id="outsourcedRepairsList" class="inventory-list">
                    <div class="inventory-item">
                        <div class="item-details">
                            <strong><i class="fas fa-building"></i> REP-008 - Electrical System Overhaul</strong>
                            <div class="item-meta">
                                <i class="fas fa-truck"></i> Vehicle V-115 |
                                <i class="fas fa-wrench"></i> AutoTech Solutions
                            </div>
                            <div class="item-meta">
                                <span class="status-text status-outsourced">OUTSOURCED</span> |
                                <i class="fas fa-calendar-check"></i> Return: Oct 25, 2025
                            </div>
                        </div>
                        <div class="item-actions">
                            <div class="action-buttons">
                                <button type="button" class="btn btn-primary btn-small" data-repair-action="view-repair-details" data-repair-id="REP-008">
                                    <i class="fas fa-eye"></i> VIEW
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-sync-alt"></i> Component Information Updates</span>
                </div>
                <p style="color: var(--muted); margin-bottom: 15px;">Update vehicle/machine component information based on technician or service center recommendations</p>
                <button type="button" class="btn btn-primary" data-repair-action="update-component-info">
                    <i class="fas fa-edit"></i> Update Component Info
                </button>
            </div>
        `;
    }
}

if (!customElements.get('supervisor-repair-management')) {
    customElements.define('supervisor-repair-management', SupervisorRepairManagement);
}
