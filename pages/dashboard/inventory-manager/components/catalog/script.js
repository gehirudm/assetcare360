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
                <button class="btn btn-secondary" id="catalogRefreshBtn">
                    <i class="fas fa-sync"></i> Refresh
                </button>
            </div>

            <div class="filter-controls" id="stockFilterTabs">
                <button class="filter-btn active" data-stock="all">All Stock</button>
                <button class="filter-btn" data-stock="in-stock">In Stock</button>
                <button class="filter-btn" data-stock="low-stock">Low Stock</button>
                <button class="filter-btn" data-stock="out-of-stock">Out of Stock</button>
            </div>

            <div class="filter-controls" id="categoryFilterTabs" style="margin-top:10px;">
                <button class="filter-btn active" data-category="all">All Categories</button>
                <button class="filter-btn" data-category="vehicles">Vehicles</button>
                <button class="filter-btn" data-category="machines">Machines</button>
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

        // Add new
        // Refresh
        const refreshBtn = this.querySelector('#catalogRefreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadSpareParts());
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

            const action = button.dataset.action;
            const sparepartId = button.dataset.id;
            if (!sparepartId) return;

            if (action === 'view') {
                this.dispatchEvent(new CustomEvent('inventory-catalog:view', {
                    bubbles: true,
                    detail: { sparepartId }
                }));
            }

            if (action === 'edit') {
                this.dispatchEvent(new CustomEvent('inventory-catalog:edit', {
                    bubbles: true,
                    detail: { sparepartId }
                }));
            }

            if (action === 'delete') {
                this.dispatchEvent(new CustomEvent('inventory-catalog:delete', {
                    bubbles: true,
                    detail: { sparepartId }
                }));
            }

            if (action === 'reorder') {
                this.dispatchEvent(new CustomEvent('inventory-catalog:reorder', {
                    bubbles: true,
                    detail: { sparepartId }
                }));
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

    applyFilters() {
        const searchValue = (this.querySelector('#catalogSearch')?.value || '').toLowerCase();

        const filtered = this.products.filter(product => {
            const quantity = parseInt(product.quantity, 10) || 0;
            const stockStatus = quantity > 10 ? 'in-stock' : (quantity > 0 ? 'low-stock' : 'out-of-stock');
            const category = product.category || 'unknown';

            const textSearch = `${product.name || ''} ${product.sparepart_id || ''} ${category}`.toLowerCase();
            const matchesSearch = !searchValue || textSearch.includes(searchValue);
            const matchesStock = this.currentStockFilter === 'all' || stockStatus === this.currentStockFilter;
            const matchesCategory = this.currentCategoryFilter === 'all' || category === this.currentCategoryFilter;

            return matchesSearch && matchesStock && matchesCategory;
        });

        this.displaySpareParts(filtered);
        this.updateCount(filtered.length);
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
            const stockBadge = quantity > 10 ? 'status-in-stock' : (quantity > 0 ? 'status-low-stock' : 'status-out-of-stock');
            const stockText = quantity > 10 ? 'In Stock' : (quantity > 0 ? 'Low Stock' : 'Out of Stock');

            const partName = product.name || 'Unnamed Part';
            const partId = product.sparepart_id || '-';
            const category = (product.category || 'Unknown');
            const categoryText = category.charAt(0).toUpperCase() + category.slice(1);
            const escapedPartId = this.escapeAttr(partId);

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
                            <i class="fas fa-boxes"></i> ${quantity} units
                        </div>
                    </div>
                    <div class="item-actions">
                        <div class="catalog-action-buttons">
                            <button class="btn btn-primary btn-small" data-action="view" data-id="${escapedPartId}">
                                <i class="fas fa-eye"></i> VIEW
                            </button>
                            <button class="btn btn-secondary btn-small" data-action="edit" data-id="${escapedPartId}">
                                <i class="fas fa-edit"></i> EDIT
                            </button>
                            ${quantity <= 10 ? `
                                <button class="btn btn-secondary btn-small" data-action="reorder" data-id="${escapedPartId}">
                                    <i class="fas fa-sync"></i> REORDER
                                </button>
                            ` : ''}
                            <button class="btn btn-danger btn-small" data-action="delete" data-id="${escapedPartId}">
                                <i class="fas fa-trash"></i> DELETE
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
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
