/**
 * inventory-sparepart-addition.js
 * Component for Inventory Manager Sparepart Addition section
 */

class InventorySparepartAddition extends HTMLElement {
    constructor() {
        super();
        this.additions = [];
        this.currentCategory = 'all';
    }

    connectedCallback() {
        this.loadStyles();
        this.render();
        this.bindEvents();
    }

    loadStyles() {
        const linkId = 'inventory-sparepart-addition-styles';
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = './components/sparepart-addition/style.css';
            document.head.appendChild(link);
        }
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-plus-circle"></i> Sparepart Addition</h2>
                <p class="page-subtitle">Add new stock to existing spareparts or record new stock arrivals</p>
            </div>

            <div class="search-bar">
                <input type="text" id="additionSearch" class="search-input" placeholder="Search by sparepart name, ID, or supplier...">
                <button class="btn btn-primary" id="additionAddBtn">
                    <i class="fas fa-plus"></i> Add New Sparepart/Stock
                </button>
                <button class="btn btn-secondary" id="additionRefreshBtn">
                    <i class="fas fa-sync"></i> Refresh
                </button>
            </div>

            <div class="filter-controls" id="additionCategoryFilter">
                <button class="filter-btn active" data-category="all">All Categories</button>
                <button class="filter-btn" data-category="vehicles">Vehicles</button>
                <button class="filter-btn" data-category="machines">Machines</button>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-history"></i> Stock Additions</span>
                    <span id="additionsCount" class="status-text status-normal">0 items</span>
                </div>
                <div id="recentAdditionsItems">
                    <div class="addition-empty">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Loading recent additions...</p>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const searchInput = this.querySelector('#additionSearch');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.applyFilters());
        }

        const addBtn = this.querySelector('#additionAddBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.dispatchEvent(new CustomEvent('inventory-sparepart-addition:add', { bubbles: true }));
            });
        }

        const refreshBtn = this.querySelector('#additionRefreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadRecentAdditions());
        }

        this.querySelectorAll('#additionCategoryFilter .filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.dataset.category || 'all';
                this.currentCategory = category;
                this.querySelectorAll('#additionCategoryFilter .filter-btn').forEach(el => {
                    el.classList.toggle('active', el.dataset.category === category);
                });
                this.applyFilters();
            });
        });

        this.addEventListener('click', event => {
            const actionButton = event.target.closest('button[data-action]');
            if (!actionButton) return;

            event.stopPropagation();

            const action = actionButton.dataset.action;
            const additionId = actionButton.dataset.id;
            if (!additionId) return;

            const addition = this.additions.find(item => String(item.id) === String(additionId));
            const eventDetail = { additionId: Number(additionId), addition: addition || null };

            switch (action) {
                case 'view':
                    this.dispatchEvent(new CustomEvent('inventory-sparepart-addition:view', {
                        bubbles: true,
                        detail: eventDetail
                    }));
                    break;
                case 'edit':
                    this.closeAllActionMenus();
                    this.dispatchEvent(new CustomEvent('inventory-sparepart-addition:edit', {
                        bubbles: true,
                        detail: eventDetail
                    }));
                    break;
                case 'delete':
                    this.closeAllActionMenus();
                    this.dispatchEvent(new CustomEvent('inventory-sparepart-addition:delete', {
                        bubbles: true,
                        detail: eventDetail
                    }));
                    break;
                case 'toggle-menu':
                    this.toggleActionMenu(additionId);
                    break;
                default:
                    break;
            }
        });
    }

    async refresh() {
        await this.loadRecentAdditions();
    }

    async loadRecentAdditions() {
        const container = this.querySelector('#recentAdditionsItems');
        if (!container) return;

        container.innerHTML = `
            <div class="addition-empty">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading recent additions...</p>
            </div>
        `;

        try {
            const response = await API.get('/additions?per_page=50');
            const additions = response?.data?.additions;

            if (response.status !== 'success' || !Array.isArray(additions)) {
                throw new Error(response?.message || 'Failed to load additions');
            }

            this.additions = additions;
            // Preserve compatibility with existing modal/update flows.
            window.additionsData = additions;
            this.applyFilters();
        } catch (error) {
            console.error('Error loading recent additions:', error);
            this.additions = [];
            window.additionsData = [];
            container.innerHTML = `
                <div class="addition-empty addition-empty-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load additions.</p>
                </div>
            `;
            this.updateCount(0);
        }
    }

    applyFilters() {
        const searchText = (this.querySelector('#additionSearch')?.value || '').trim().toLowerCase();

        const filtered = this.additions.filter(addition => {
            const name = String(addition.sparepart_name || '').toLowerCase();
            const supplier = String(addition.supplier || '').toLowerCase();
            const sparepartId = String(addition.sparepart_id || '').toLowerCase();
            const category = String(addition.category || '');

            const matchesSearch = !searchText ||
                name.includes(searchText) ||
                supplier.includes(searchText) ||
                sparepartId.includes(searchText);

            const matchesCategory = this.currentCategory === 'all' || category === this.currentCategory;

            return matchesSearch && matchesCategory;
        });

        this.renderAdditions(filtered);
        this.updateCount(filtered.length);
    }

    renderAdditions(additions) {
        const container = this.querySelector('#recentAdditionsItems');
        if (!container) return;

        if (!additions.length) {
            container.innerHTML = `
                <div class="addition-empty">
                    <i class="fas fa-box-open"></i>
                    <p>No stock additions found.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = additions.map(addition => {
            const date = addition.received_date
                ? new Date(addition.received_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                })
                : 'N/A';

            const categoryLabel = addition.category
                ? `${addition.category.charAt(0).toUpperCase()}${addition.category.slice(1)} Parts`
                : 'Unknown';

            const safeName = this.escapeHtml(addition.sparepart_name || 'N/A');
            const safeId = this.escapeHtml(addition.sparepart_id || 'N/A');
            const safeSupplier = this.escapeHtml(addition.supplier || 'N/A');
            const safeLocation = this.escapeHtml(addition.location || 'N/A');
            const safeCategory = this.escapeHtml(categoryLabel);
            const quantityAdded = Number(addition.quantity_added) || 0;
            const additionId = this.escapeAttr(addition.id);

            return `
                <div class="inventory-item addition-item" data-id="${additionId}">
                    <div class="item-details">
                        <strong><i class="fas fa-box"></i> ${safeName}</strong>
                        <div class="item-meta">
                            <i class="fas fa-hashtag"></i> ${safeId} |
                            <i class="fas fa-tag"></i> ${safeCategory} |
                            <i class="fas fa-calendar"></i> ${this.escapeHtml(date)}
                        </div>
                        <div class="item-description">
                            <span class="status-text" style="background:#dcfce7; color:#166534;"><i class="fas fa-plus-circle"></i> +${quantityAdded} units</span> |
                            <span class="status-text" style="background:#fef3c7; color:#92400e;"><i class="fas fa-truck"></i> ${safeSupplier}</span> |
                            <i class="fas fa-map-marker-alt"></i> ${safeLocation}
                        </div>
                    </div>
                    <div class="item-actions">
                        <div class="addition-action-buttons">
                            <button type="button" class="btn btn-primary btn-small" data-action="view" data-id="${additionId}">
                                <i class="fas fa-eye"></i> VIEW
                            </button>
                            <div class="dropdown-container">
                                <button type="button" class="btn btn-secondary btn-small dropdown-trigger" data-action="toggle-menu" data-id="${additionId}" aria-label="Open addition actions">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <div class="dropdown-menu" id="dropdown-addition-${additionId}">
                                    <button type="button" class="dropdown-item" data-action="edit" data-id="${additionId}">
                                        <i class="fas fa-edit"></i> Edit Addition
                                    </button>
                                    <button type="button" class="dropdown-item danger" data-action="delete" data-id="${additionId}">
                                        <i class="fas fa-trash"></i> Delete Addition
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    toggleActionMenu(additionId) {
        const selector = typeof CSS !== 'undefined' && CSS.escape
            ? `#${CSS.escape(`dropdown-addition-${additionId}`)}`
            : `#dropdown-addition-${additionId}`;
        const menu = this.querySelector(selector);
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

    updateCount(count) {
        const countEl = this.querySelector('#additionsCount');
        if (countEl) {
            countEl.textContent = `${count} item${count !== 1 ? 's' : ''}`;
        }
    }

    escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    escapeAttr(value) {
        return this.escapeHtml(value).replace(/`/g, '&#96;');
    }
}

if (!customElements.get('inventory-sparepart-addition')) {
    customElements.define('inventory-sparepart-addition', InventorySparepartAddition);
}
