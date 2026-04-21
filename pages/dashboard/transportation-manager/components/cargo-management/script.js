class TMCargoManagement extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this._cargoItems = [];
        this._cargoItemsError = null;
        this._filters = {
            search: '',
            cargoType: 'all',
            status: 'active',
        };

        this._onCargoItemSaved = async () => {
            await this.refresh();
        };

        this.loadStyles();
        this.render();
        this.bindEvents();
        document.addEventListener('tm-modal:cargo-item-saved', this._onCargoItemSaved);
        this.refresh();
    }

    disconnectedCallback() {
        this._mounted = false;

        if (this._onCargoItemSaved) {
            document.removeEventListener('tm-modal:cargo-item-saved', this._onCargoItemSaved);
        }
    }

    loadStyles() {
        const linkId = 'tm-cargo-management-styles';
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = './components/cargo-management/style.css';
            document.head.appendChild(link);
        }
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-boxes-stacked"></i> Cargo Management</h2>
                <p class="page-subtitle">Manage cargo catalogue items and open detailed cargo analytics views</p>
            </div>

            <div class="cargo-toolbar">
                <div class="cargo-toolbar-top">
                    <div class="search-bar cargo-search-bar">
                        <input
                            type="text"
                            id="cargoCatalogSearch"
                            class="search-input"
                            placeholder="Search by cargo code, name, unit, capacity, or description..."
                        >
                    </div>

                    <div class="cargo-toolbar-actions">
                        <button class="btn btn-primary" data-action="open-cargo-item-modal">
                            <i class="fas fa-plus"></i> Add Cargo Item
                        </button>
                    </div>
                </div>

                <div class="cargo-toolbar-bottom">
                    <div class="filter-controls cargo-type-filters" id="cargoTypeFilters" aria-label="Cargo type filters">
                        <button class="filter-btn active" data-action="set-cargo-type-filter" data-filter-value="all">All Cargo</button>
                        <button class="filter-btn" data-action="set-cargo-type-filter" data-filter-value="dangerous">Dangerous</button>
                        <button class="filter-btn" data-action="set-cargo-type-filter" data-filter-value="non-dangerous">Non-dangerous</button>
                    </div>

                    <div class="cargo-status-filter">
                        <label for="cargoStatusFilter">Status</label>
                        <select id="cargoStatusFilter" class="form-select">
                            <option value="active" selected>Active only</option>
                            <option value="all">All statuses</option>
                            <option value="inactive">Inactive only</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="card cargo-catalog-card" data-cargo-catalog-root>
                <div class="card-header">
                    <span><i class="fas fa-boxes-stacked"></i> Cargo Catalogue</span>
                    <span id="cargoCatalogCount" class="status-text status-normal">0 items</span>
                </div>

                <div id="cargoCatalogContainer">
                    <div class="loading-state" style="padding: 25px 15px;">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>Loading cargo items...</span>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (!actionEl) {
                return;
            }

            const action = actionEl.dataset.action;
            const itemId = Number(actionEl.dataset.itemId || 0);

            switch (action) {
                case 'set-cargo-type-filter':
                    this._filters.cargoType = actionEl.dataset.filterValue || 'all';
                    this._setCargoTypeButtonState();
                    this._renderCargoCatalog();
                    break;
                case 'open-cargo-item-modal':
                    this.dispatchEvent(new CustomEvent('tm-cargo-management:create-item', {
                        bubbles: true,
                    }));
                    break;
                case 'refresh-cargo-catalog':
                    this.refresh();
                    break;
                case 'view-cargo-item':
                    if (itemId > 0) {
                        this.dispatchEvent(new CustomEvent('tm-cargo-management:view', {
                            bubbles: true,
                            detail: {
                                itemId,
                            },
                        }));
                    }
                    break;
            }
        });

        const searchInput = this.querySelector('#cargoCatalogSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (event) => {
                this._filters.search = String(event.target.value || '').trim().toLowerCase();
                this._renderCargoCatalog();
            });
        }

        const statusFilter = this.querySelector('#cargoStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', async (event) => {
                this._filters.status = event.target.value || 'active';
                await this.refresh();
            });
        }

        this._setCargoTypeButtonState();
    }

    async refresh() {
        try {
            await this._loadCargoItems();
            this._cargoItemsError = null;
        } catch (error) {
            this._cargoItemsError = error.message || 'Failed to load cargo items';
        }

        this._renderCargoCatalog();
    }

    async _loadCargoItems() {
        const includeInactive = this._filters.status !== 'active';
        const endpoint = includeInactive
            ? '/trips/cargo-items?include_inactive=1'
            : '/trips/cargo-items';

        const response = await API.get(endpoint);
        this._assertSuccess(response, 'Failed to load cargo items');

        this._cargoItems = Array.isArray(response.data?.cargo_items)
            ? response.data.cargo_items
            : [];
    }

    _setCargoTypeButtonState() {
        const buttons = this.querySelectorAll('#cargoTypeFilters [data-action="set-cargo-type-filter"]');
        buttons.forEach((button) => {
            if (button.dataset.filterValue === this._filters.cargoType) {
                button.classList.add('active');
                return;
            }

            button.classList.remove('active');
        });
    }

    _getFilteredCargoItems() {
        const search = this._filters.search;
        let items = Array.isArray(this._cargoItems) ? [...this._cargoItems] : [];

        if (this._filters.status === 'active') {
            items = items.filter((item) => Number(item.is_active) === 1);
        } else if (this._filters.status === 'inactive') {
            items = items.filter((item) => Number(item.is_active) !== 1);
        }

        if (this._filters.cargoType === 'dangerous') {
            items = items.filter((item) => Number(item.is_dangerous) === 1);
        } else if (this._filters.cargoType === 'non-dangerous') {
            items = items.filter((item) => Number(item.is_dangerous) !== 1);
        }

        if (search) {
            items = items.filter((item) => {
                const searchPool = [
                    item.name,
                    item.cargo_item_id,
                    item.description,
                    item.unit,
                    item.capacity,
                ].map((value) => String(value || '').toLowerCase()).join(' ');

                return searchPool.includes(search);
            });
        }

        return items.sort((a, b) => {
            const dangerDiff = Number(b.is_dangerous) - Number(a.is_dangerous);
            if (dangerDiff !== 0) {
                return dangerDiff;
            }

            const nameA = String(a.name || '').toLowerCase();
            const nameB = String(b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
    }

    _renderCargoCatalog() {
        const container = this.querySelector('#cargoCatalogContainer');
        const countEl = this.querySelector('#cargoCatalogCount');
        if (!container) {
            return;
        }

        if (this._cargoItemsError) {
            if (countEl) {
                countEl.textContent = '0 items';
            }

            container.innerHTML = `
                <div class="empty-state error" style="padding: 25px 20px;">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Failed to load cargo items</h3>
                    <p>${TMUtils.escapeHtml(this._cargoItemsError)}</p>
                    <button class="btn btn-secondary" type="button" data-action="refresh-cargo-catalog">
                        <i class="fas fa-rotate-right"></i> Retry
                    </button>
                </div>
            `;
            return;
        }

        const items = this._getFilteredCargoItems();
        if (countEl) {
            countEl.textContent = `${items.length} item${items.length === 1 ? '' : 's'}`;
        }

        if (!items.length) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 25px 20px;">
                    <i class="fas fa-box-open"></i>
                    <h3>No cargo items found</h3>
                    <p>Adjust catalogue filters or add a new cargo item to continue.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = items.map((item) => {
            const isDangerous = Number(item.is_dangerous) === 1;
            const itemId = Number(item.id);
            const description = String(item.description || '').trim();
            const unitLabel = TMUtils.formatCargoUnit(item.unit || 'units');
            const capacityLabel = TMUtils.formatCargoCapacity(item.capacity);

            return `
                <div class="inventory-item cargo-catalog-item" data-item-id="${itemId}">
                    <div class="item-details">
                        <strong><i class="fas fa-boxes-stacked"></i> ${TMUtils.escapeHtml(item.name || 'Unnamed Cargo')}</strong>
                        <div class="item-meta">
                            <i class="fas fa-fingerprint"></i> ${TMUtils.escapeHtml(item.cargo_item_id || 'N/A')} |
                            <i class="fas fa-ruler-combined"></i> Unit: ${TMUtils.escapeHtml(unitLabel)}
                        </div>
                        <div class="item-meta">
                            <i class="fas fa-weight-hanging"></i> Capacity (weight kg): ${TMUtils.escapeHtml(capacityLabel)}
                        </div>
                        ${description ? `<div class="item-meta"><i class="fas fa-align-left"></i> ${TMUtils.escapeHtml(description)}</div>` : ''}
                        <div class="item-meta">
                            <i class="fas ${isDangerous ? 'fa-radiation' : 'fa-circle-check'}"></i>
                            ${isDangerous ? 'Dangerous cargo item' : 'Non-dangerous cargo item'}
                        </div>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-primary btn-small" data-action="view-cargo-item" data-item-id="${itemId}">
                            <i class="fas fa-eye"></i> View Details
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    _assertSuccess(response, fallbackMessage) {
        if (response && (response.success === true || response.status === 'success')) {
            return;
        }

        const message = response?.message || fallbackMessage;
        throw new Error(message);
    }
}

customElements.define('tm-cargo-management', TMCargoManagement);
