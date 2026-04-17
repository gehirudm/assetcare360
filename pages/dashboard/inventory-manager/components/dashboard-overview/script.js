const INVENTORY_DASHBOARD_OVERVIEW_BASE = new URL(
    './',
    document.currentScript ? document.currentScript.src : window.location.href
);

class InventoryDashboardOverview extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.state = {
            loading: false,
            error: null,
            metrics: {
                totalParts: 0,
                outOfStock: 0,
                lowStock: 0,
                totalAssets: 0,
                pendingOrders: 0,
            },
            activities: []
        };

        this._onRootClick = this._onRootClick.bind(this);
    }

    async connectedCallback() {
        if (this._initialized) return;

        const css = await this._loadStyles();
        this._adoptSharedStyles();

        this.shadowRoot.innerHTML = `
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <style>${css}</style>
            ${this._template()}
        `;

        this._cacheDom();
        this.shadowRoot.addEventListener('click', this._onRootClick);
        this._initialized = true;

        this.render();
        await this.refresh();
    }

    disconnectedCallback() {
        this.shadowRoot.removeEventListener('click', this._onRootClick);
    }

    async refresh() {
        if (!window.API || typeof window.API.get !== 'function') {
            this.setState({
                loading: false,
                error: 'API client is not available.'
            });
            return;
        }

        this.setState({ loading: true, error: null });

        try {
            const [machinesResponse, vehiclesResponse, productsResponse, ordersResponse] = await Promise.all([
                window.API.get('/machines'),
                window.API.get('/vehicles'),
                window.API.get('/products'),
                window.API.get('/spare-part-requests')
            ]);

            const machines = this._extractItems(machinesResponse, 'machines');
            const vehicles = this._extractItems(vehiclesResponse, 'vehicles');
            const products = this._extractItems(productsResponse, 'products');
            const orders = this._extractItems(ordersResponse, 'requests');

            const totalParts = products.length;
            const outOfStock = products.filter(product => this._toInt(product.quantity) <= 0).length;
            const lowStock = products.filter(product => this._isLowStock(product)).length;
            const pendingOrders = orders.filter(order => String(order.status || '').toLowerCase() === 'pending').length;

            const metrics = {
                totalParts,
                outOfStock,
                lowStock,
                totalAssets: machines.length + vehicles.length,
                pendingOrders,
            };

            const activities = this._buildActivities(metrics, products);

            this.setState({
                loading: false,
                error: null,
                metrics,
                activities,
            });
        } catch (error) {
            console.error('Failed to load inventory dashboard overview:', error);
            this.setState({
                loading: false,
                error: error.message || 'Failed to load dashboard overview.'
            });
        }
    }

    setState(partial) {
        this.state = { ...this.state, ...partial };
        this.render();
    }

    render() {
        if (!this._initialized) return;

        const { loading, error, metrics, activities } = this.state;

        this._statusBanner.innerHTML = '';
        if (error) {
            this._statusBanner.innerHTML = `<div class="alert-banner error">${this._escape(error)}</div>`;
        } else if (loading) {
            this._statusBanner.innerHTML = '<div class="alert-banner loading">Refreshing dashboard metrics...</div>';
        }

        this._summaryGrid.innerHTML = this._renderSummaryCards(metrics);
        this._activitiesList.innerHTML = activities.length > 0
            ? activities.map(item => this._renderActivity(item)).join('')
            : '<div class="empty-state">No activity insights available.</div>';
    }

    _template() {
        return `
            <div class="header-row">
                <div>
                    <h2 class="page-title">Dashboard Overview</h2>
                    <p class="page-subtitle">Welcome! Here is your inventory management summary.</p>
                </div>
            </div>

            <div id="statusBanner"></div>

            <div id="summaryGrid" class="summary-grid"></div>

            <div class="activities-card">
                <div class="activities-header">
                    <h3 class="activities-title">Recent Activities</h3>
                </div>
                <div id="activitiesList" class="activities-list"></div>
            </div>
        `;
    }

    _cacheDom() {
        this._statusBanner = this.shadowRoot.getElementById('statusBanner');
        this._summaryGrid = this.shadowRoot.getElementById('summaryGrid');
        this._activitiesList = this.shadowRoot.getElementById('activitiesList');
    }

    _adoptSharedStyles() {
        const sheets = [];

        if (window._ACStyles && window._ACStyles.buttons) {
            sheets.push(window._ACStyles.buttons);
        }

        if (sheets.length > 0) {
            this.shadowRoot.adoptedStyleSheets = sheets;
        }
    }

    async _loadStyles() {
        try {
            const response = await fetch(new URL('style.css', INVENTORY_DASHBOARD_OVERVIEW_BASE));
            if (!response.ok) {
                throw new Error(`Failed to load style.css (${response.status})`);
            }
            return await response.text();
        } catch (error) {
            console.error('Failed to load dashboard-overview styles:', error);
            return ':host { display: block; }';
        }
    }

    _extractItems(response, key) {
        if (!response || response.status !== 'success') return [];

        if (Array.isArray(response.data)) {
            return response.data;
        }

        if (response.data && Array.isArray(response.data[key])) {
            return response.data[key];
        }

        return [];
    }

    _buildActivities(metrics, products) {
        const lowestStockPart = products
            .map(product => ({
                id: product.sparepart_id || product.product_id || product.id || '-',
                name: product.sparepart_name || product.name || 'Unknown part',
                quantity: this._toInt(product.quantity),
                threshold: this._getLowStockThreshold(product),
            }))
            .filter(item => item.quantity >= 0)
            .sort((a, b) => a.quantity - b.quantity)[0];

        const activityItems = [
            {
                title: `${metrics.pendingOrders} pending order${metrics.pendingOrders === 1 ? '' : 's'} awaiting review`,
                description: 'Review and resolve pending spare part requests from Technical Officers.',
                meta: 'Orders and Approvals',
                status: metrics.pendingOrders > 0 ? 'warning' : 'success',
                section: 'orders-approvals'
            },
            {
                title: `${metrics.lowStock} low-stock part${metrics.lowStock === 1 ? '' : 's'} detected`,
                description: 'Open notifications to prioritize low-stock replenishment actions.',
                meta: 'Low stock monitoring',
                status: metrics.lowStock > 0 ? 'danger' : 'success',
                section: 'notifications'
            },
            {
                title: `${metrics.outOfStock} out-of-stock part${metrics.outOfStock === 1 ? '' : 's'} in catalog`,
                description: 'Review the spare parts catalog and submit reorder requests where needed.',
                meta: 'Catalog health',
                status: metrics.outOfStock > 0 ? 'danger' : 'info',
                section: 'catalog'
            },
            {
                title: `${metrics.totalAssets} total assets under management`,
                description: lowestStockPart
                    ? `Lowest stock item: ${lowestStockPart.name} (${lowestStockPart.id}) has ${lowestStockPart.quantity} unit(s) with threshold ${lowestStockPart.threshold}.`
                    : 'Asset inventory is up to date based on current machine and vehicle records.',
                meta: 'Assets and inventory',
                status: 'info',
                section: 'machines'
            }
        ];

        return activityItems;
    }

    _getLowStockThreshold(product) {
        const rawThreshold = this._toInt(product.low_stock_threshold ?? product.reorder_level);
        return rawThreshold > 0 ? rawThreshold : 10;
    }

    _isLowStock(product) {
        const quantity = this._toInt(product.quantity);
        if (quantity <= 0) {
            return false;
        }

        return quantity <= this._getLowStockThreshold(product);
    }

    _renderSummaryCards(metrics) {
        const cards = [
            {
                icon: 'fas fa-boxes',
                title: 'Spare Parts',
                value: metrics.totalParts,
                description: 'Total parts in catalog',
                section: 'catalog'
            },
            {
                icon: 'fas fa-exclamation-circle',
                title: 'Out of Stock',
                value: metrics.outOfStock,
                description: 'Items requiring restock',
                section: 'catalog'
            },
            {
                icon: 'fas fa-bell',
                title: 'Low Stock Alerts',
                value: metrics.lowStock,
                description: 'Items below threshold',
                section: 'notifications'
            },
            {
                icon: 'fas fa-layer-group',
                title: 'Total Assets',
                value: metrics.totalAssets,
                description: 'Vehicles and machines managed',
                section: 'machines'
            }
        ];

        return cards.map(card => `
            <button type="button" class="summary-card clickable" data-target="${this._escapeAttr(card.section)}">
                <div class="summary-card-content">
                    <div class="summary-icon"><i class="${this._escapeAttr(card.icon)}"></i></div>
                    <div class="summary-details">
                        <div class="summary-title">${this._escape(card.title)}</div>
                        <div class="summary-number">${card.value}</div>
                        <div class="summary-description">${this._escape(card.description)}</div>
                    </div>
                </div>
                <div class="summary-arrow"><i class="fas fa-chevron-right"></i></div>
            </button>
        `).join('');
    }

    _renderActivity(activity) {
        return `
            <div class="activity-item">
                <div class="activity-main">
                    <p class="activity-name">${this._escape(activity.title)}</p>
                    <p class="activity-description">${this._escape(activity.description)}</p>
                    <p class="activity-meta">${this._escape(activity.meta)}</p>
                </div>
                <div class="activity-right">
                    <span class="status-chip ${this._escapeAttr(activity.status)}">${this._escape(activity.status)}</span>
                    <button type="button" class="btn btn-primary btn-small" data-target="${this._escapeAttr(activity.section)}">
                        Open
                    </button>
                </div>
            </div>
        `;
    }

    _onRootClick(event) {
        const targetButton = event.target.closest('button[data-target]');
        if (!targetButton) return;

        const targetSection = targetButton.dataset.target;
        if (!targetSection) return;

        this.dispatchEvent(new CustomEvent('inventory-dashboard-overview:navigate', {
            detail: { section: targetSection },
            bubbles: true,
            composed: true
        }));
    }

    _toInt(value) {
        const parsed = Number.parseInt(value, 10);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    _escape(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    _escapeAttr(value) {
        return this._escape(value);
    }
}

customElements.define('inventory-dashboard-overview', InventoryDashboardOverview);
