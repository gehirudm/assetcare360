const INVENTORY_NOTIFICATIONS_MODEL_BASE = new URL(
    './',
    document.currentScript ? document.currentScript.src : window.location.href
);

class InventoryNotificationsModel extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.state = {
            loading: false,
            error: null,
            lowStockAlerts: [],
            pendingOrders: []
        };

        this._dismissedKeys = new Set();
        this._busyOrderIds = new Set();
        this._bulkBusy = false;

        this._onRootClick = this._onRootClick.bind(this);
    }

    async connectedCallback() {
        if (this._initialized) return;

        const css = await this._loadStyles();
        this._adoptSharedStyles();

        this.shadowRoot.innerHTML = `
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
                error: 'API client is not available.',
            });
            return;
        }

        this.setState({ loading: true, error: null });

        try {
            const [productsResponse, requestsResponse] = await Promise.all([
                window.API.get('/products'),
                window.API.get('/spare-part-requests')
            ]);

            const products = this._extractProducts(productsResponse);
            const requests = this._extractRequests(requestsResponse);

            const lowStockAlerts = products
                .map((product, index) => this._mapLowStockProduct(product, index))
                .filter(Boolean)
                .sort((a, b) => a.quantity - b.quantity);

            const pendingOrders = requests
                .filter(order => String(order.status || '').toLowerCase() === 'pending')
                .map(order => this._mapPendingOrder(order))
                .filter(order => order && order.id)
                .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

            this.setState({
                loading: false,
                error: null,
                lowStockAlerts,
                pendingOrders
            });
        } catch (error) {
            console.error('Failed to load notifications data:', error);
            this.setState({
                loading: false,
                error: error.message || 'Failed to load notifications data.'
            });
        }
    }

    setState(partial) {
        this.state = { ...this.state, ...partial };
        this.render();
    }

    render() {
        if (!this._initialized) return;

        const visibleLowStockAlerts = this._visibleLowStockAlerts();
        const visiblePendingOrders = this._visiblePendingOrders();

        this._renderSummary(visibleLowStockAlerts.length, visiblePendingOrders.length);

        if (this.state.error) {
            this._statusBanner.innerHTML = `<div class="status-banner error">${this._escape(this.state.error)}</div>`;
        } else if (this.state.loading) {
            this._statusBanner.innerHTML = '<div class="status-banner loading">Loading latest notifications...</div>';
        } else {
            this._statusBanner.innerHTML = '';
        }

        this._lowStockContainer.innerHTML = this.state.loading
            ? this._loadingState('Checking stock levels...')
            : this._renderLowStockList(visibleLowStockAlerts);

        this._pendingOrdersContainer.innerHTML = this.state.loading
            ? this._loadingState('Loading pending orders...')
            : this._renderPendingOrdersList(visiblePendingOrders);

        const disableBulkActions = this._bulkBusy || visiblePendingOrders.length === 0 || this.state.loading;
        this._approveAllButton.disabled = disableBulkActions;
        this._refreshButton.disabled = this.state.loading || this._bulkBusy;

        this._emitCountChange(visibleLowStockAlerts.length, visiblePendingOrders.length);
    }

    _template() {
        return `
            <div class="page-header">
                <h1 class="page-title">Notifications</h1>
                <p class="page-subtitle">Manage low stock alerts and pending orders</p>
            </div>

            <div id="summaryGrid" class="summary-grid"></div>
            <div id="statusBanner"></div>

            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Low Stock Alerts</h2>
                    <button type="button" class="btn btn-secondary btn-small" data-action="configure-alerts">Configure</button>
                </div>
                <div id="lowStockAlerts" class="notification-list"></div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Pending Orders</h2>
                    <div>
                        <button id="refreshButton" type="button" class="btn btn-secondary btn-small" data-action="refresh-notifications">Refresh</button>
                        <button id="approveAllButton" type="button" class="btn btn-success btn-small" data-action="approve-all">Approve All</button>
                    </div>
                </div>
                <div id="pendingOrders" class="notification-list"></div>
            </div>
        `;
    }

    _cacheDom() {
        this._summaryGrid = this.shadowRoot.getElementById('summaryGrid');
        this._statusBanner = this.shadowRoot.getElementById('statusBanner');
        this._lowStockContainer = this.shadowRoot.getElementById('lowStockAlerts');
        this._pendingOrdersContainer = this.shadowRoot.getElementById('pendingOrders');
        this._approveAllButton = this.shadowRoot.getElementById('approveAllButton');
        this._refreshButton = this.shadowRoot.getElementById('refreshButton');
    }

    _adoptSharedStyles() {
        const sheets = [];

        if (window._ACStyles && window._ACStyles.buttons) {
            sheets.push(window._ACStyles.buttons);
        }

        if (window._ACStyles && window._ACStyles.icons) {
            sheets.push(window._ACStyles.icons);
        }

        if (sheets.length > 0) {
            this.shadowRoot.adoptedStyleSheets = sheets;
        }
    }

    async _loadStyles() {
        try {
            const response = await fetch(new URL('style.css', INVENTORY_NOTIFICATIONS_MODEL_BASE));
            if (!response.ok) {
                throw new Error(`Failed to load style.css (${response.status})`);
            }
            return await response.text();
        } catch (error) {
            console.error('Failed to load notifications-model styles:', error);
            return ':host { display: block; }';
        }
    }

    _extractProducts(response) {
        if (!response || response.status !== 'success') return [];
        if (Array.isArray(response.data)) return response.data;
        if (response.data && Array.isArray(response.data.products)) return response.data.products;
        return [];
    }

    _extractRequests(response) {
        if (!response || response.status !== 'success') return [];
        if (Array.isArray(response.data)) return response.data;
        if (response.data && Array.isArray(response.data.requests)) return response.data.requests;
        return [];
    }

    _mapLowStockProduct(product, index) {
        const quantity = Number.parseInt(product.quantity, 10);
        const normalizedQuantity = Number.isFinite(quantity) ? quantity : 0;

        if (normalizedQuantity > 10) {
            return null;
        }

        const sparepartId = String(
            product.sparepart_id || product.product_id || product.id || `low-stock-${index}`
        );

        return {
            key: sparepartId,
            sparepartId,
            name: product.sparepart_name || product.name || sparepartId,
            quantity: normalizedQuantity,
            location: product.location || 'N/A',
        };
    }

    _mapPendingOrder(order) {
        if (!order || order.id === undefined || order.id === null) {
            return null;
        }

        const items = Array.isArray(order.items) ? order.items : [];
        const totalUnits = items.reduce((sum, item) => {
            const qty = Number.parseInt(item.quantity, 10);
            return sum + (Number.isFinite(qty) ? qty : 0);
        }, 0);

        return {
            id: String(order.id),
            requestId: order.request_id || `REQ-${order.id}`,
            ticketId: order.ticket_id_formatted || order.fault_ticket_code || '-',
            equipmentName: order.equipment_name || 'Unknown equipment',
            requestedBy: order.requested_by_name || '-',
            partsSummary: `${items.length} part${items.length === 1 ? '' : 's'} (${totalUnits} units)`,
            createdAt: order.created_at || '',
        };
    }

    _visibleLowStockAlerts() {
        return this.state.lowStockAlerts.filter(item => !this._dismissedKeys.has(`low:${item.key}`));
    }

    _visiblePendingOrders() {
        return this.state.pendingOrders.filter(item => !this._dismissedKeys.has(`order:${item.id}`));
    }

    _renderSummary(lowStockCount, pendingCount) {
        const total = lowStockCount + pendingCount;

        this._summaryGrid.innerHTML = `
            <div class="summary-pill">
                <span class="summary-label">Total Notifications</span>
                <span class="summary-value">${total}</span>
            </div>
            <div class="summary-pill">
                <span class="summary-label">Low Stock Alerts</span>
                <span class="summary-value">${lowStockCount}</span>
            </div>
            <div class="summary-pill">
                <span class="summary-label">Pending Orders</span>
                <span class="summary-value">${pendingCount}</span>
            </div>
        `;
    }

    _renderLowStockList(alerts) {
        if (alerts.length === 0) {
            return '<div class="empty-state">No low stock alerts currently.</div>';
        }

        return alerts.map(alert => `
            <div class="notification-item low-stock" data-low-key="${this._escapeAttr(alert.key)}">
                <span class="notification-icon low-stock">LS</span>
                <div class="notification-body">
                    <p class="notification-title"><strong>${this._escape(alert.name)}</strong> is low on stock.</p>
                    <p class="notification-meta">ID: ${this._escape(alert.sparepartId)} | Qty: ${alert.quantity} | Location: ${this._escape(alert.location)}</p>
                    <div class="notification-actions">
                        <button type="button" class="btn btn-primary btn-small" data-action="reorder-part" data-part-id="${this._escapeAttr(alert.sparepartId)}">Reorder</button>
                        <button type="button" class="btn btn-secondary btn-small" data-action="view-part" data-part-id="${this._escapeAttr(alert.sparepartId)}">View</button>
                        <button type="button" class="btn btn-danger btn-small" data-action="dismiss-low-stock" data-low-key="${this._escapeAttr(alert.key)}">Dismiss</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    _renderPendingOrdersList(orders) {
        if (orders.length === 0) {
            return '<div class="empty-state">No pending orders requiring approval.</div>';
        }

        return orders.map(order => {
            const orderId = this._escapeAttr(order.id);
            const isBusy = this._bulkBusy || this._busyOrderIds.has(order.id);
            const disableAttr = isBusy ? 'disabled' : '';

            return `
                <div class="notification-item pending-order" data-order-id="${orderId}">
                    <span class="notification-icon pending-order">PO</span>
                    <div class="notification-body">
                        <p class="notification-title"><strong>${this._escape(order.requestId)}</strong> needs approval.</p>
                        <p class="notification-meta">
                            Ticket: ${this._escape(order.ticketId)} | Equipment: ${this._escape(order.equipmentName)}
                        </p>
                        <p class="notification-meta">
                            Parts: ${this._escape(order.partsSummary)} | Requested by: ${this._escape(order.requestedBy)} | Created: ${this._escape(this._formatDate(order.createdAt))}
                        </p>
                        <div class="notification-actions">
                            <button type="button" class="btn btn-success btn-small" data-action="approve-order" data-order-id="${orderId}" ${disableAttr}>Quick Approve</button>
                            <button type="button" class="btn btn-secondary btn-small" data-action="review-order" data-order-id="${orderId}" ${disableAttr}>Review</button>
                            <button type="button" class="btn btn-danger btn-small" data-action="reject-order" data-order-id="${orderId}" ${disableAttr}>Reject</button>
                            <button type="button" class="btn btn-secondary btn-small" data-action="dismiss-order" data-order-id="${orderId}" ${disableAttr}>Dismiss</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    _loadingState(message) {
        return `<div class="empty-state">${this._escape(message)}</div>`;
    }

    async _onRootClick(event) {
        const button = event.target.closest('button[data-action]');
        if (!button) return;

        const action = button.dataset.action;

        switch (action) {
            case 'configure-alerts':
                this._configureAlerts();
                break;
            case 'refresh-notifications':
                await this.refresh();
                break;
            case 'reorder-part':
                this._dispatch('inventory-notifications:reorder', {
                    sparepartId: button.dataset.partId || ''
                });
                break;
            case 'view-part':
                this._dispatch('inventory-notifications:view-part', {
                    sparepartId: button.dataset.partId || ''
                });
                break;
            case 'dismiss-low-stock':
                this._dismissedKeys.add(`low:${button.dataset.lowKey || ''}`);
                this.render();
                this._toast('Notification dismissed', 'info');
                break;
            case 'approve-order':
                await this._approveOrder(button.dataset.orderId || '');
                break;
            case 'reject-order':
                await this._rejectOrder(button.dataset.orderId || '');
                break;
            case 'review-order':
                this._dispatch('inventory-notifications:view-order', {
                    orderId: button.dataset.orderId || ''
                });
                break;
            case 'dismiss-order':
                this._dismissedKeys.add(`order:${button.dataset.orderId || ''}`);
                this.render();
                this._toast('Notification dismissed', 'info');
                break;
            case 'approve-all':
                await this._approveAllPending();
                break;
            default:
                break;
        }
    }

    async _approveOrder(orderId) {
        if (!orderId) return;

        await this._runOrderAction(orderId, async () => {
            const response = await window.API.post(`/spare-part-requests/${orderId}/approve`, {
                notes: 'Approved from notifications panel'
            });

            if (!response || response.status !== 'success') {
                throw new Error(response?.message || 'Failed to approve request');
            }

            this._toast(`Request ${this._getRequestLabel(orderId)} approved.`, 'success');
            this._dispatch('inventory-notifications:order-updated', {
                orderId,
                status: 'Approved'
            });
            await this.refresh();
        });
    }

    async _rejectOrder(orderId) {
        if (!orderId) return;

        const reason = window.prompt(
            `Enter rejection reason for ${this._getRequestLabel(orderId)}:`,
            'Rejected from notifications panel'
        );

        if (reason === null) return;

        const notes = reason.trim() || 'Rejected from notifications panel';

        await this._runOrderAction(orderId, async () => {
            const response = await window.API.post(`/spare-part-requests/${orderId}/reject`, {
                notes
            });

            if (!response || response.status !== 'success') {
                throw new Error(response?.message || 'Failed to reject request');
            }

            this._toast(`Request ${this._getRequestLabel(orderId)} rejected.`, 'info');
            this._dispatch('inventory-notifications:order-updated', {
                orderId,
                status: 'Rejected'
            });
            await this.refresh();
        });
    }

    async _approveAllPending() {
        const orders = this._visiblePendingOrders();

        if (orders.length === 0) {
            this._toast('No pending orders to approve.', 'info');
            return;
        }

        const confirmed = window.confirm(
            `Approve all ${orders.length} pending order(s)?`
        );

        if (!confirmed) return;

        this._bulkBusy = true;
        this.render();

        let approvedCount = 0;
        let failedCount = 0;

        for (const order of orders) {
            try {
                const response = await window.API.post(`/spare-part-requests/${order.id}/approve`, {
                    notes: 'Bulk approved from notifications panel'
                });

                if (response && response.status === 'success') {
                    approvedCount += 1;
                } else {
                    failedCount += 1;
                }
            } catch (error) {
                console.error(`Failed to approve request ${order.id}:`, error);
                failedCount += 1;
            }
        }

        this._bulkBusy = false;

        if (failedCount === 0) {
            this._toast(`Approved ${approvedCount} request(s).`, 'success');
        } else if (approvedCount > 0) {
            this._toast(`Approved ${approvedCount} request(s); ${failedCount} failed.`, 'info');
        } else {
            this._toast('Failed to approve pending requests.', 'error');
        }

        this._dispatch('inventory-notifications:order-updated', {
            bulk: true,
            approvedCount,
            failedCount
        });

        await this.refresh();
    }

    async _runOrderAction(orderId, action) {
        if (this._busyOrderIds.has(orderId) || this._bulkBusy) return;

        this._busyOrderIds.add(orderId);
        this.render();

        try {
            await action();
        } catch (error) {
            console.error('Order action failed:', error);
            this._toast(error.message || 'Order action failed.', 'error');
        } finally {
            this._busyOrderIds.delete(orderId);
            this.render();
        }
    }

    _getRequestLabel(orderId) {
        const order = this.state.pendingOrders.find(item => item.id === String(orderId));
        return order ? order.requestId : `REQ-${orderId}`;
    }

    _configureAlerts() {
        this._toast('Alert configuration will be available in a later slice.', 'info');
    }

    _emitCountChange(lowStockCount, pendingCount) {
        this._dispatch('inventory-notifications:count-change', {
            count: lowStockCount + pendingCount,
            lowStockCount,
            pendingCount
        });
    }

    _dispatch(eventName, detail) {
        this.dispatchEvent(new CustomEvent(eventName, {
            detail,
            bubbles: true,
            composed: true
        }));
    }

    _toast(message, type = 'info') {
        if (window.Utils && typeof window.Utils.showToast === 'function') {
            window.Utils.showToast(message, type);
            return;
        }

        console.log(`[${type}] ${message}`);
    }

    _formatDate(value) {
        if (!value) return '-';

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return '-';

        return parsed.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
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

customElements.define('inventory-notifications-model', InventoryNotificationsModel);
