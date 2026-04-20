/**
 * inventory-machines.js
 * Component for Inventory Manager Machines Management section
 */

class InventoryMachines extends HTMLElement {
    constructor() {
        super();
        this.machines = [];
        this.currentFilter = 'all';
        this.currentSort = 'created-desc';
    }

    connectedCallback() {
        this.loadStyles();
        this.render();
        this.bindEvents();
    }

    loadStyles() {
        const linkId = 'inventory-machines-styles';
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = './components/machines/style.css';
            document.head.appendChild(link);
        }
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-cogs"></i> Machine Management</h2>
                <p class="page-subtitle">Manage industrial machines and equipment</p>
            </div>

            <div class="search-bar">
                <input type="text" id="machineSearch" class="search-input" placeholder="Search machines...">
                <button class="btn btn-primary" id="addMachineBtn">
                    <i class="fas fa-plus"></i> Add New Machine
                </button>
            </div>

            <div class="filter-controls" id="machineFilters">
                <button class="filter-btn active" data-status="all">All</button>
                <button class="filter-btn" data-status="Active">Active</button>
                <button class="filter-btn" data-status="Under Maintenance">Under Maintenance</button>
                <button class="filter-btn" data-status="Inactive">Inactive</button>
                <div class="list-sort-controls">
                    <label class="sort-label" for="machineCreatedSort">Sort</label>
                    <select id="machineCreatedSort" class="form-select" aria-label="Sort machines by created date">
                        <option value="created-desc">Created Date: Newest First</option>
                        <option value="created-asc">Created Date: Oldest First</option>
                    </select>
                </div>
            </div>

            <div id="machinesList">
                <div style="text-align: center; padding: 40px; color: #6b7280;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 2em; margin-bottom: 10px;"></i>
                    <p>Loading machines...</p>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Filter buttons
        this.querySelectorAll('#machineFilters .filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const status = btn.dataset.status;
                this.filterByStatus(status);
            });
        });

        // Search input
        const searchInput = this.querySelector('#machineSearch');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.applyFilters());
        }

        // Sort input
        const sortInput = this.querySelector('#machineCreatedSort');
        if (sortInput) {
            sortInput.addEventListener('change', () => {
                this.currentSort = sortInput.value || 'created-desc';
                this.applyFilters();
            });
        }

        // Add button
        const addBtn = this.querySelector('#addMachineBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.dispatchEvent(new CustomEvent('inventory-machines:add', { bubbles: true }));
            });
        }

    }

    async loadMachines() {
        try {
            const response = await API.get('/machines');
            this.machines = response.data?.machines || [];
            this.applyFilters();
        } catch (error) {
            console.error('Failed to load machines:', error);
            Utils.showToast('Failed to load machines', 'error');
            this.machines = [];
            this.displayMachines([]);
        }
    }

    filterByStatus(status) {
        this.currentFilter = status;

        // Update active button
        this.querySelectorAll('#machineFilters .filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.status === status);
        });

        this.applyFilters();
    }

    applyFilters() {
        const searchValue = (this.querySelector('#machineSearch')?.value || '').toLowerCase();

        const filtered = this.machines.filter(machine => {
            // Status filter
            const matchesStatus = this.currentFilter === 'all' || machine.status === this.currentFilter;

            // Search filter
            const matchesSearch = !searchValue ||
                (machine.machine_name || '').toLowerCase().includes(searchValue) ||
                (machine.model_number || '').toLowerCase().includes(searchValue) ||
                (machine.machine_id || '').toLowerCase().includes(searchValue) ||
                (machine.location || '').toLowerCase().includes(searchValue);

            return matchesStatus && matchesSearch;
        });

        this.displayMachines(this.sortByCreatedDate(filtered));
    }

    sortByCreatedDate(machineList) {
        const direction = this.currentSort === 'created-asc' ? 1 : -1;

        return [...machineList].sort((a, b) => {
            const createdAtDifference = this.getCreatedTimestamp(a) - this.getCreatedTimestamp(b);
            if (createdAtDifference !== 0) {
                return direction === 1 ? createdAtDifference : -createdAtDifference;
            }

            const aId = Number.parseInt(a?.id, 10);
            const bId = Number.parseInt(b?.id, 10);
            if (Number.isFinite(aId) && Number.isFinite(bId) && aId !== bId) {
                const idDifference = aId - bId;
                return direction === 1 ? idDifference : -idDifference;
            }

            return 0;
        });
    }

    getCreatedTimestamp(machine) {
        const rawDate = machine?.created_at || machine?.createdAt || machine?.date_created;
        const timestamp = Date.parse(rawDate || '');
        return Number.isFinite(timestamp) ? timestamp : 0;
    }

    displayMachines(machineList) {
        const machinesList = this.querySelector('#machinesList');
        if (!machinesList) return;

        if (machineList.length === 0) {
            machinesList.innerHTML = `
                <div class="card">
                    <p style="text-align: center; color: var(--muted); padding: 40px;">
                        <i class="fas fa-cogs" style="font-size: 3rem; display: block; margin-bottom: 15px;"></i>
                        No machines found.
                    </p>
                </div>
            `;
            return;
        }

        machinesList.innerHTML = machineList.map(machine => {
            const isForAuction = machine.status === 'For Auction';
            const auctionActionHtml = isForAuction
                ? `<button type="button" class="dropdown-item" data-action="remove-auction" data-id="${machine.id}"><i class="fas fa-undo"></i> Remove from Auction</button>`
                : `<button type="button" class="dropdown-item" data-action="mark-auction" data-id="${machine.id}"><i class="fas fa-gavel"></i> Mark for Auction</button>`;

            return `
                <div class="inventory-item" data-id="${machine.id}" data-status="${machine.status}">
                    <div class="item-details">
                        <strong><i class="fas fa-cog"></i> ${machine.machine_name}</strong>
                        <div class="item-meta">
                            <i class="fas fa-hashtag"></i> ${machine.model_number} |
                            <i class="fas fa-barcode"></i> ${machine.machine_id}
                        </div>
                        <div class="item-description">
                            <span class="status-text ${this.getStatusClass(machine.status)}">${machine.status}</span> |
                            <i class="fas fa-map-marker-alt"></i> ${machine.location}
                        </div>
                    </div>
                    <div class="item-actions">
                        <div class="action-buttons">
                            <button type="button" class="btn btn-small btn-primary" data-action="view" data-id="${machine.id}">
                                <i class="fas fa-eye"></i> VIEW
                            </button>
                            <div class="dropdown-container">
                                <button type="button" class="btn btn-small btn-secondary dropdown-trigger" data-action="toggle-menu" data-id="${machine.id}" aria-label="Open machine actions">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <div class="dropdown-menu" id="dropdown-machine-${machine.id}">
                                    <button type="button" class="dropdown-item" data-action="edit" data-id="${machine.id}">
                                        <i class="fas fa-edit"></i> Edit Machine
                                    </button>
                                    ${auctionActionHtml}
                                    <button type="button" class="dropdown-item danger" data-action="delete" data-id="${machine.id}">
                                        <i class="fas fa-trash"></i> Delete Machine
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Bind action buttons
        machinesList.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();

                const action = btn.dataset.action;
                const machineId = Number.parseInt(btn.dataset.id, 10);
                if (!Number.isFinite(machineId)) return;

                switch (action) {
                    case 'view':
                        this.dispatchEvent(new CustomEvent('inventory-machines:view', {
                            bubbles: true,
                            detail: { machineId }
                        }));
                        break;
                    case 'edit':
                        this.dispatchEvent(new CustomEvent('inventory-machines:edit', {
                            bubbles: true,
                            detail: { machineId }
                        }));
                        break;
                    case 'toggle-menu':
                        this.toggleActionMenu(machineId);
                        break;
                    case 'mark-auction':
                        this.closeAllActionMenus();
                        this.dispatchEvent(new CustomEvent('inventory-machines:mark-auction', {
                            bubbles: true,
                            detail: { machineId }
                        }));
                        break;
                    case 'remove-auction':
                        this.closeAllActionMenus();
                        this.dispatchEvent(new CustomEvent('inventory-machines:remove-auction', {
                            bubbles: true,
                            detail: { machineId }
                        }));
                        break;
                    case 'delete':
                        this.closeAllActionMenus();
                        this.dispatchEvent(new CustomEvent('inventory-machines:delete', {
                            bubbles: true,
                            detail: { machineId }
                        }));
                        break;
                    default:
                        break;
                }
            });
        });
    }

    toggleActionMenu(machineId) {
        const menu = this.querySelector(`#dropdown-machine-${machineId}`);
        if (!menu) return;

        const shouldOpen = !menu.classList.contains('active');
        this.closeAllActionMenus();
        if (shouldOpen) {
            menu.classList.add('active');
        }
    }

    closeAllActionMenus() {
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            menu.classList.remove('active');
        });
    }

    getStatusClass(status) {
        switch (status) {
            case 'Active': return 'status-in-stock';
            case 'Under Maintenance': return 'status-low-stock';
            case 'Inactive': return 'status-out-of-stock';
            case 'Decommissioned': return 'status-rejected';
            case 'For Auction': return 'status-auction';
            default: return 'status-normal';
        }
    }

    // Public method for parent to trigger refresh
    refresh() {
        return this.loadMachines();
    }
}

customElements.define('inventory-machines', InventoryMachines);
