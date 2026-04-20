/**
 * inventory-catalog.js
 * Component for Inventory Manager Spare Parts Catalog section
 */

class InventoryCatalog extends HTMLElement {
    constructor() {
        super();
        this.products = [];
        this.currentStockFilter = 'all';
        this.currentCategoryFilter = 'all';
        this.currentSort = 'created-desc';
        this._eventsBound = false;
        this._initialized = false;
    }

    connectedCallback() {
        if (this._initialized) return;
        this.loadStyles();
        this.render();
        this.bindEvents();
        this._initialized = true;
    }

    loadStyles() {
        const linkId = 'inventory-catalog-styles';
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = './components/catalog/style.css';
            document.head.appendChild(link);
        }
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-list-alt"></i> Spare Parts Catalog</h2>
                <p class="page-subtitle">Browse and manage spare parts inventory</p>
            </div>

            <div class="search-bar">
                <input type="text" id="catalogSearch" class="search-input" placeholder="Search by sparepart name, number, or category...">
                <button class="btn btn-primary" id="catalogAddBtn">
                    <i class="fas fa-plus"></i> Add New Sparepart
                </button>
            </div>

            <div class="catalog-filter-sort-panel">
                <div class="catalog-filter-row">
                    <div class="filter-controls catalog-filter-group" id="stockFilterTabs">
                        <button class="filter-btn active" data-stock="all">All Stock</button>
                        <button class="filter-btn" data-stock="in-stock">In Stock</button>
                        <button class="filter-btn" data-stock="low-stock">Low Stock</button>
                        <button class="filter-btn" data-stock="out-of-stock">Out of Stock</button>
                    </div>
                    <div class="catalog-sort-group">
                        <label class="catalog-sort-label" for="catalogSort">Sort</label>
                        <select id="catalogSort" class="form-select" aria-label="Sort spare parts catalog">
                            <option value="created-desc">Created Date: Newest First</option>
                            <option value="created-asc">Created Date: Oldest First</option>
                            <option value="quantity-desc">Stock Quantity: High to Low</option>
                            <option value="quantity-asc">Stock Quantity: Low to High</option>
                            <option value="name-asc">Name: A to Z</option>
                            <option value="name-desc">Name: Z to A</option>
                        </select>
                    </div>
                </div>

                <div class="catalog-filter-row">
                    <div class="filter-controls catalog-filter-group" id="categoryFilterTabs">
                        <button class="filter-btn active" data-category="all">All Categories</button>
                        <button class="filter-btn" data-category="vehicles">Vehicles</button>
                        <button class="filter-btn" data-category="machines">Machines</button>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-boxes"></i> Parts Catalog</span>
                    <span id="catalogCount" class="status-text status-normal">0 items</span>
                </div>
                <div id="catalogItems">
                    <div class="catalog-empty">
                        <i class="fas fa-spinner fa-spin"></i>
                        Loading spare parts...
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        if (this._eventsBound) return;
        this._eventsBound = true;

        // Search
        const searchInput = this.querySelector('#catalogSearch');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.applyFilters());
        }

        const addButton = this.querySelector('#catalogAddBtn');
        if (addButton) {
            addButton.addEventListener('click', () => {
                this.dispatchEvent(new CustomEvent('inventory-catalog:add', {
                    bubbles: true
                }));
            });
        }

        const sortSelect = this.querySelector('#catalogSort');
        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                this.currentSort = sortSelect.value || 'created-desc';
                this.applyFilters();
            });
        }

        // Stock filters
        this.querySelectorAll('#stockFilterTabs .filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const stock = btn.dataset.stock;
                this.currentStockFilter = stock;
                this.querySelectorAll('#stockFilterTabs .filter-btn').forEach(el => {
                    el.classList.toggle('active', el.dataset.stock === stock);
                });
                this.applyFilters();
            });
        });

        // Category filters
        this.querySelectorAll('#categoryFilterTabs .filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.dataset.category;
                this.currentCategoryFilter = category;
                this.querySelectorAll('#categoryFilterTabs .filter-btn').forEach(el => {
                    el.classList.toggle('active', el.dataset.category === category);
                });
                this.applyFilters();
            });
        });

        // Action button delegation
        this.addEventListener('click', event => {
            const button = event.target.closest('button[data-action]');
            if (!button) return;

            event.stopPropagation();

            const action = button.dataset.action;
            const sparepartId = button.dataset.id;
            if (!sparepartId) return;

            switch (action) {
                case 'view':
                    this.dispatchEvent(new CustomEvent('inventory-catalog:view', {
                        bubbles: true,
                        detail: { sparepartId }
                    }));
                    break;
                case 'edit':
                    this.closeAllActionMenus();
                    this.dispatchEvent(new CustomEvent('inventory-catalog:edit', {
                        bubbles: true,
                        detail: { sparepartId }
                    }));
                    break;
                case 'delete':
                    this.closeAllActionMenus();
                    this.dispatchEvent(new CustomEvent('inventory-catalog:delete', {
                        bubbles: true,
                        detail: { sparepartId }
                    }));
                    break;
                case 'reorder':
                    this.closeAllActionMenus();
                    this.dispatchEvent(new CustomEvent('inventory-catalog:reorder', {
                        bubbles: true,
                        detail: { sparepartId }
                    }));
                    break;
                case 'toggle-menu':
                    this.toggleActionMenu(sparepartId);
                    break;
                default:
                    break;
            }
        });
    }

    async loadSpareParts() {
        try {
            const container = this.querySelector('#catalogItems');
            if (container) {
                container.innerHTML = `
                    <div class="catalog-empty">
                        <i class="fas fa-spinner fa-spin"></i>
                        Loading spare parts...
                    </div>
                `;
            }

            const response = await API.get('/products');
            if (response.status === 'success' && response.data && response.data.products) {
                this.products = response.data.products;
                this.applyFilters();
            } else {
                Utils.showToast('Failed to load spare parts', 'error');
                this.products = [];
                this.applyFilters();
            }
        } catch (error) {
            console.error('Error loading spare parts:', error);
            Utils.showToast('Error loading spare parts', 'error');
            this.products = [];
            this.applyFilters();
        }
    }

    getLowStockThreshold(product) {
        const rawThreshold = Number.parseInt(product.low_stock_threshold ?? product.reorder_level, 10);
        if (Number.isFinite(rawThreshold) && rawThreshold > 0) {
            return rawThreshold;
        }
        return 10;
    }

    getStockStatus(quantity, threshold) {
        if (quantity <= 0) {
            return 'out-of-stock';
        }

        if (quantity <= threshold) {
            return 'low-stock';
        }

        return 'in-stock';
    }

    applyFilters() {
        const searchValue = (this.querySelector('#catalogSearch')?.value || '').toLowerCase();

        const filtered = this.products.filter(product => {
            const quantity = parseInt(product.quantity, 10) || 0;
            const threshold = this.getLowStockThreshold(product);
            const stockStatus = this.getStockStatus(quantity, threshold);
            const category = (product.category || 'unknown').toString().toLowerCase();

            const textSearch = `${product.name || ''} ${product.sparepart_id || ''} ${category}`.toLowerCase();
            const matchesSearch = !searchValue || textSearch.includes(searchValue);
            const matchesStock = this.currentStockFilter === 'all' || stockStatus === this.currentStockFilter;
            const matchesCategory = this.currentCategoryFilter === 'all' || category === this.currentCategoryFilter;

            return matchesSearch && matchesStock && matchesCategory;
        });

        const sorted = this.sortProducts(filtered);
        this.displaySpareParts(sorted);
        this.updateCount(sorted.length);
    }

    sortProducts(products) {
        return [...products].sort((a, b) => {
            switch (this.currentSort) {
                case 'created-asc':
                    return this.compareCreatedAt(a, b);
                case 'created-desc':
                    return this.compareCreatedAt(b, a);
                case 'quantity-asc':
                    return this.compareQuantity(a, b);
                case 'quantity-desc':
                    return this.compareQuantity(b, a);
                case 'name-desc':
                    return this.compareName(b, a);
                case 'name-asc':
                default:
                    return this.compareName(a, b);
            }
        });
    }

    compareCreatedAt(first, second) {
        const diff = this.getCreatedTimestamp(first) - this.getCreatedTimestamp(second);
        if (diff !== 0) {
            return diff;
        }

        return this.compareName(first, second);
    }

    compareQuantity(first, second) {
        const firstQuantity = parseInt(first.quantity, 10) || 0;
        const secondQuantity = parseInt(second.quantity, 10) || 0;
        const diff = firstQuantity - secondQuantity;
        if (diff !== 0) {
            return diff;
        }

        return this.compareName(first, second);
    }

    compareName(first, second) {
        const firstName = (first.name || '').toString().trim().toLowerCase();
        const secondName = (second.name || '').toString().trim().toLowerCase();
        const nameDiff = firstName.localeCompare(secondName);
        if (nameDiff !== 0) {
            return nameDiff;
        }

        const firstId = (first.sparepart_id || '').toString();
        const secondId = (second.sparepart_id || '').toString();
        return firstId.localeCompare(secondId);
    }

    getCreatedTimestamp(product) {
        const rawDate = product?.created_at || product?.createdAt || product?.date_created;
        const timestamp = Date.parse(rawDate || '');
        return Number.isFinite(timestamp) ? timestamp : 0;
    }

    displaySpareParts(products) {
        const catalogItems = this.querySelector('#catalogItems');
        if (!catalogItems) return;

        if (!products.length) {
            catalogItems.innerHTML = `
                <div class="catalog-empty">
                    <i class="fas fa-box-open"></i>
                    No spare parts found.
                </div>
            `;
            return;
        }

        catalogItems.innerHTML = products.map(product => {
            const quantity = parseInt(product.quantity, 10) || 0;
            const threshold = this.getLowStockThreshold(product);
            const stockStatus = this.getStockStatus(quantity, threshold);
            const stockBadge = stockStatus === 'in-stock'
                ? 'status-in-stock'
                : (stockStatus === 'low-stock' ? 'status-low-stock' : 'status-out-of-stock');
            const stockText = stockStatus === 'in-stock'
                ? 'In Stock'
                : (stockStatus === 'low-stock' ? 'Low Stock' : 'Out of Stock');

            const partName = product.name || 'Unnamed Part';
            const partId = product.sparepart_id || '-';
            const category = (product.category || 'Unknown').toString().toLowerCase();
            const categoryText = category.charAt(0).toUpperCase() + category.slice(1);
            const escapedPartId = this.escapeAttr(partId);
            const reorderActionHtml = quantity <= threshold
                ? `<button type="button" class="dropdown-item" data-action="reorder" data-id="${escapedPartId}"><i class="fas fa-sync"></i> Reorder</button>`
                : '';

            return `
                <div class="inventory-item catalog-item" data-id="${escapedPartId}">
                    <div class="item-details">
                        <strong><i class="fas fa-box"></i> ${this.escapeHtml(partName)}</strong>
                        <div class="item-meta">
                            <i class="fas fa-hashtag"></i> ${this.escapeHtml(partId)} |
                            <i class="fas fa-tag"></i> ${this.escapeHtml(categoryText)} Parts
                        </div>
                        <div class="item-description">
                            <span class="status-text ${stockBadge}">${stockText}</span> |
                            <i class="fas fa-boxes"></i> ${quantity} units |
                            <i class="fas fa-bell"></i> Threshold: ${threshold}
                        </div>
                    </div>
                    <div class="item-actions">
                        <div class="catalog-action-buttons">
                            <button type="button" class="btn btn-primary btn-small" data-action="view" data-id="${escapedPartId}">
                                <i class="fas fa-eye"></i> VIEW
                            </button>
                            <div class="dropdown-container">
                                <button type="button" class="btn btn-secondary btn-small dropdown-trigger" data-action="toggle-menu" data-id="${escapedPartId}" aria-label="Open spare part actions">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <div class="dropdown-menu" id="dropdown-catalog-${escapedPartId}">
                                    <button type="button" class="dropdown-item" data-action="edit" data-id="${escapedPartId}">
                                        <i class="fas fa-edit"></i> Edit Part
                                    </button>
                                    ${reorderActionHtml}
                                    <button type="button" class="dropdown-item danger" data-action="delete" data-id="${escapedPartId}">
                                        <i class="fas fa-trash"></i> Delete Part
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    toggleActionMenu(sparepartId) {
        const selector = typeof CSS !== 'undefined' && CSS.escape
            ? `#${CSS.escape(`dropdown-catalog-${sparepartId}`)}`
            : `#dropdown-catalog-${sparepartId}`;
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
        const countBadge = this.querySelector('#catalogCount');
        if (countBadge) {
            countBadge.textContent = `${count} item${count !== 1 ? 's' : ''}`;
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
        return this.escapeHtml(value);
    }

    // Public API for parent script
    refresh() {
        return this.loadSpareParts();
    }
}

customElements.define('inventory-catalog', InventoryCatalog);
