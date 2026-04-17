const INVENTORY_USAGE_TRACKING_BASE = new URL(
    './',
    document.currentScript ? document.currentScript.src : window.location.href
);

class InventoryUsageTracking extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.state = {
            loading: false,
            error: null,
            products: [],
            issuedQtyMap: {},
            searchQuery: '',
            usageModalOpen: false,
            usageModalLoading: false,
            usageModalError: null,
            selectedPartUsageHistory: [],
            selectedPartUsageStats: null,
            selectedUsageDate: null,
            selectedPart: null,
        };

        this._onRootClick = this._onRootClick.bind(this);
        this._onSearchInput = this._onSearchInput.bind(this);
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
        this._searchInput.addEventListener('input', this._onSearchInput);

        this._initialized = true;
        this.render();
        await this.refresh();
    }

    disconnectedCallback() {
        this.shadowRoot.removeEventListener('click', this._onRootClick);
        this._searchInput?.removeEventListener('input', this._onSearchInput);
    }

    async refresh() {
        if (!window.API || typeof window.API.get !== 'function') {
            this.setState({ loading: false, error: 'API client is not available.' });
            return;
        }

        this.setState({ loading: true, error: null });

        try {
            const productsResponse = await window.API.get('/products');
            const products = this._extractProducts(productsResponse);

            const issuedQtyMap = {};
            try {
                const usageResponse = await window.API.get('/usage');
                const usageRecords = this._extractUsage(usageResponse);
                usageRecords.forEach(record => {
                    const sparepartId = record.sparepart_id;
                    const qty = this._toInt(record.quantity_issued);
                    if (!sparepartId) return;
                    issuedQtyMap[sparepartId] = (issuedQtyMap[sparepartId] || 0) + qty;
                });
            } catch (usageError) {
                console.warn('Usage Tracking: failed to load usage records.', usageError);
            }

            this.setState({
                loading: false,
                error: null,
                products,
                issuedQtyMap,
            });
        } catch (error) {
            console.error('Usage Tracking: failed to load products.', error);
            this.setState({
                loading: false,
                error: error.message || 'Failed to load usage tracking data.'
            });
        }
    }

    setState(partial) {
        this.state = { ...this.state, ...partial };
        this.render();
    }

    render() {
        if (!this._initialized) return;

        const {
            loading,
            error,
            products,
            issuedQtyMap,
            searchQuery,
            usageModalOpen,
            usageModalLoading,
            usageModalError,
            selectedPartUsageHistory,
            selectedPartUsageStats,
            selectedUsageDate,
            selectedPart,
        } = this.state;

        this._banner.innerHTML = '';
        if (error) {
            this._banner.innerHTML = `<div class="info-banner error">${this._escape(error)}</div>`;
        } else if (loading) {
            this._banner.innerHTML = '<div class="info-banner loading">Loading spare parts usage data...</div>';
        }
        this._searchInput.value = searchQuery;

        const normalizedQuery = searchQuery.trim().toLowerCase();
        const filteredProducts = products.filter(product => {
            const sparepartId = String(product.sparepart_id || '').toLowerCase();
            const name = String(product.name || product.sparepart_name || '').toLowerCase();
            return !normalizedQuery || sparepartId.includes(normalizedQuery) || name.includes(normalizedQuery);
        });

        this._tbody.innerHTML = filteredProducts.length > 0
            ? filteredProducts.map(product => this._renderRow(product, issuedQtyMap)).join('')
            : `
                <tr>
                    <td colspan="7" class="center-cell">
                        <div class="empty-state">No matching spare parts found.</div>
                    </td>
                </tr>
            `;

        this._usageModal.classList.toggle('active', usageModalOpen);

        if (!selectedPart) {
            this._usageModalSubtitle.textContent = 'Select a sparepart to inspect usage history.';
            this._usageModalBody.innerHTML = '';
            return;
        }

        this._usageModalSubtitle.textContent = `${selectedPart.name} (${selectedPart.sparepartId})`;
        this._usageModalBody.innerHTML = this._renderUsageModalBody({
            loading: usageModalLoading,
            error: usageModalError,
            history: selectedPartUsageHistory,
            stats: selectedPartUsageStats,
            selectedDate: selectedUsageDate,
        });
    }

    _template() {
        return `
            <div class="page-header">
                <h2 class="page-title">Usage Tracking</h2>
                <p class="page-subtitle">Track sparepart issuance trends and inventory consumption history.</p>
            </div>

            <div class="search-row">
                <input id="usageSearch" class="search-input" type="text" placeholder="Search by sparepart ID or name...">
            </div>

            <div id="banner"></div>

            <div class="card">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Sparepart ID</th>
                            <th>Sparepart Name</th>
                            <th>Category</th>
                            <th>Available Qty</th>
                            <th>Issued Qty</th>
                            <th>Last Issue Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="usageTableBody"></tbody>
                </table>
            </div>

            <div id="usageModal" class="modal">
                <div class="modal-content usage-modal-content">
                    <div class="modal-header">
                        <div>
                            <h3 class="modal-title">Usage Overview</h3>
                            <p id="usageModalSubtitle" class="modal-subtitle"></p>
                        </div>
                        <button type="button" class="btn btn-secondary btn-small" data-action="close-usage-modal">Close</button>
                    </div>
                    <div id="usageModalBody" class="modal-body"></div>
                </div>
            </div>
        `;
    }

    _cacheDom() {
        this._searchInput = this.shadowRoot.getElementById('usageSearch');
        this._banner = this.shadowRoot.getElementById('banner');
        this._tbody = this.shadowRoot.getElementById('usageTableBody');

        this._usageModal = this.shadowRoot.getElementById('usageModal');
        this._usageModalSubtitle = this.shadowRoot.getElementById('usageModalSubtitle');
        this._usageModalBody = this.shadowRoot.getElementById('usageModalBody');
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
            const response = await fetch(new URL('style.css', INVENTORY_USAGE_TRACKING_BASE));
            if (!response.ok) {
                throw new Error(`Failed to load style.css (${response.status})`);
            }
            return await response.text();
        } catch (error) {
            console.error('Failed to load usage-tracking styles:', error);
            return ':host { display: block; }';
        }
    }

    _renderRow(product, issuedQtyMap) {
        const sparepartId = product.sparepart_id || '-';
        const sparepartName = product.name || product.sparepart_name || '-';
        const categoryRaw = product.category || 'Unknown';
        const category = categoryRaw.charAt(0).toUpperCase() + categoryRaw.slice(1);

        const availableQty = this._toInt(product.quantity);
        const issuedQty = this._toInt(issuedQtyMap[sparepartId]);
        const thresholdRaw = this._toInt(product.low_stock_threshold ?? product.reorder_level);
        const lowStockThreshold = thresholdRaw > 0 ? thresholdRaw : 10;

        const stockClass = availableQty <= 0 ? 'out' : (availableQty <= lowStockThreshold ? 'low' : 'in');
        const lastIssue = product.last_issue_date
            ? new Date(product.last_issue_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            })
            : '<span class="muted">Not issued yet</span>';

        return `
            <tr>
                <td><strong>${this._escape(sparepartId)}</strong></td>
                <td>${this._escape(sparepartName)}</td>
                <td>${this._escape(category)}</td>
                <td><span class="stock-value ${stockClass}">${availableQty} units</span></td>
                <td>${issuedQty > 0 ? `<span class="issued-value">${issuedQty} units</span>` : '<span class="muted">0 units</span>'}</td>
                <td>${lastIssue}</td>
                <td>
                    <button type="button" class="btn btn-primary btn-small" data-action="open-usage-modal" data-sparepart-id="${this._escapeAttr(sparepartId)}" data-sparepart-name="${this._escapeAttr(sparepartName)}" data-available-qty="${availableQty}">
                        View Usage
                    </button>
                </td>
            </tr>
        `;
    }

    _onRootClick(event) {
        const actionElement = event.target.closest('[data-action]');
        if (!actionElement) {
            if (event.target === this._usageModal) {
                this._closeUsageModal();
            }
            return;
        }

        switch (actionElement.dataset.action) {
            case 'open-usage-modal':
                this._openUsageModal({
                    sparepartId: actionElement.dataset.sparepartId || '',
                    name: actionElement.dataset.sparepartName || '',
                    availableQty: this._toInt(actionElement.dataset.availableQty),
                });
                break;
            case 'close-usage-modal':
                this._closeUsageModal();
                break;
            case 'select-usage-date':
                this.setState({
                    selectedUsageDate: actionElement.dataset.usageDate || null,
                });
                break;
            default:
                break;
        }
    }

    _onSearchInput(event) {
        this.setState({ searchQuery: event.target.value || '' });
    }

    _openUsageModal(part) {
        if (!part || !part.sparepartId) return;

        this.setState({
            usageModalOpen: true,
            usageModalLoading: true,
            usageModalError: null,
            selectedPart: part,
            selectedPartUsageHistory: [],
            selectedPartUsageStats: null,
            selectedUsageDate: null,
        });

        this._loadSelectedPartUsage(part.sparepartId);
    }

    _closeUsageModal() {
        this.setState({
            usageModalOpen: false,
            usageModalLoading: false,
            usageModalError: null,
            selectedPart: null,
            selectedPartUsageHistory: [],
            selectedPartUsageStats: null,
            selectedUsageDate: null,
        });
    }

    async _loadSelectedPartUsage(sparepartId) {
        if (!window.API || typeof window.API.get !== 'function') {
            this.setState({
                usageModalLoading: false,
                usageModalError: 'API client is not available.',
            });
            return;
        }

        try {
            const response = await window.API.get(`/usage/sparepart/${encodeURIComponent(sparepartId)}`);
            const { history, stats } = this._extractUsageHistoryPayload(response);

            if (this.state.selectedPart?.sparepartId !== sparepartId) {
                return;
            }

            this.setState({
                usageModalLoading: false,
                usageModalError: null,
                selectedPartUsageHistory: history,
                selectedPartUsageStats: this._normalizeUsageStats(history, stats),
                selectedUsageDate: this._resolveSelectedUsageDate(history, this.state.selectedUsageDate),
            });
        } catch (error) {
            console.error('Usage Tracking: failed to load sparepart usage history.', error);

            if (this.state.selectedPart?.sparepartId !== sparepartId) {
                return;
            }

            this.setState({
                usageModalLoading: false,
                usageModalError: error.message || 'Failed to load usage history.',
            });
        }
    }

    _extractUsageHistoryPayload(response) {
        if (!response || response.status !== 'success') {
            throw new Error(response?.message || 'Failed to load usage history');
        }

        if (Array.isArray(response.data)) {
            return {
                history: response.data,
                stats: null,
            };
        }

        const history = Array.isArray(response.data?.history) ? response.data.history : [];
        const stats = response.data && typeof response.data.stats === 'object' ? response.data.stats : null;

        return { history, stats };
    }

    _normalizeUsageStats(history, stats) {
        const sortedDates = history
            .map(item => String(item.issue_date || '').split('T')[0])
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));

        const fallbackTotalQuantity = history.reduce(
            (sum, item) => sum + this._toInt(item.quantity_issued),
            0
        );

        return {
            totalIssuances: this._toInt(stats?.total_issuances ?? history.length),
            totalQuantity: this._toInt(stats?.total_quantity ?? fallbackTotalQuantity),
            firstIssueDate: stats?.first_issue_date || sortedDates[0] || null,
            lastIssueDate: stats?.last_issue_date || sortedDates[sortedDates.length - 1] || null,
        };
    }

    _renderUsageModalBody({ loading, error, history, stats, selectedDate }) {
        if (loading) {
            return '<div class="info-banner loading">Loading usage history and chart data...</div>';
        }

        if (error) {
            return `<div class="info-banner error">${this._escape(error)}</div>`;
        }

        const safeStats = stats || this._normalizeUsageStats(history, null);

        return `
            ${this._renderUsageStats(safeStats)}
            ${this._renderUsageChart(history, selectedDate)}
            ${this._renderUsageDateDetails(history, selectedDate)}
            ${this._renderUsageHistory(history)}
        `;
    }

    _renderUsageStats(stats) {
        return `
            <div class="usage-stats-grid">
                <article class="usage-stat-card">
                    <div class="usage-stat-label">Total Issuances</div>
                    <div class="usage-stat-value">${stats.totalIssuances}</div>
                </article>
                <article class="usage-stat-card">
                    <div class="usage-stat-label">Total Issued Qty</div>
                    <div class="usage-stat-value">${stats.totalQuantity}</div>
                </article>
                <article class="usage-stat-card">
                    <div class="usage-stat-label">First Issued</div>
                    <div class="usage-stat-value small">${this._escape(this._formatDate(stats.firstIssueDate))}</div>
                </article>
                <article class="usage-stat-card">
                    <div class="usage-stat-label">Last Issued</div>
                    <div class="usage-stat-value small">${this._escape(this._formatDate(stats.lastIssueDate))}</div>
                </article>
            </div>
        `;
    }

    _renderUsageChart(history, selectedDate) {
        const points = this._buildUsagePoints(history);
        if (points.length === 0) {
            return '<div class="usage-empty-state">No issuance records found for this sparepart yet.</div>';
        }

        const activeDate = selectedDate || points[points.length - 1].date;

        const geometry = this._buildLineChartGeometry(points);

        const gridMarkup = geometry.gridLines.map(line => `
            <g>
                <line class="usage-line-grid" x1="${geometry.padding.left}" y1="${line.y}" x2="${geometry.width - geometry.padding.right}" y2="${line.y}"></line>
                <text class="usage-line-y-label" x="${geometry.padding.left - 8}" y="${line.y + 4}" text-anchor="end">${line.value}</text>
            </g>
        `).join('');

        const pointsMarkup = geometry.points.map(point => {
            const tooltip = `${point.quantity} unit(s) on ${point.fullDate}`;

            return `
                <g class="usage-line-point-group">
                    <text class="usage-line-point-value" x="${point.x}" y="${point.valueLabelY}" text-anchor="middle">${point.quantity}</text>
                    <circle class="usage-line-point" cx="${point.x}" cy="${point.y}" r="4"></circle>
                    <title>${this._escape(tooltip)}</title>
                </g>
            `;
        }).join('');

        const labelsMarkup = geometry.points
            .map(point => `<span class="usage-line-label">${this._escape(point.label)}</span>`)
            .join('');

        const detailItemsMarkup = geometry.points
            .map(point => `
                <button type="button" class="usage-line-detail-item ${point.date === activeDate ? 'active' : ''}" data-action="select-usage-date" data-usage-date="${this._escapeAttr(point.date)}">
                    <div class="usage-line-detail-date">${this._escape(point.fullDate)}</div>
                    <div class="usage-line-detail-qty">${point.quantity} unit(s)</div>
                </button>
            `)
            .join('');

        return `
            <div class="usage-chart-shell">
                <div class="usage-chart-header">
                    <h4 class="usage-section-title">Usage Trend (Last ${points.length} Issuance Dates)</h4>
                    <span class="usage-chart-meta">Max per day: ${geometry.maxQuantity}</span>
                </div>
                <div class="usage-line-chart-wrapper">
                    <svg class="usage-line-chart" viewBox="0 0 ${geometry.width} ${geometry.height}" role="img" aria-label="Usage line chart">
                        ${gridMarkup}
                        <polygon class="usage-line-area" points="${geometry.areaPoints}"></polygon>
                        <polyline class="usage-line-path" points="${geometry.pathPoints}"></polyline>
                        ${pointsMarkup}
                    </svg>
                    <div class="usage-line-label-row">${labelsMarkup}</div>
                    <div class="usage-line-detail-list">${detailItemsMarkup}</div>
                </div>
            </div>
        `;
    }

    _renderUsageDateDetails(history, selectedDate) {
        const targetDate = this._resolveSelectedUsageDate(history, selectedDate);
        if (!targetDate) {
            return '';
        }

        const selectedRecords = history.filter(record => this._normalizeDate(record.issue_date) === targetDate);
        if (selectedRecords.length === 0) {
            return '';
        }

        const totalQuantity = selectedRecords.reduce((sum, record) => sum + this._toInt(record.quantity_issued), 0);

        const rowMarkup = selectedRecords.map(record => {
            const machineText = record.machine_id ? `Machine ${this._escape(record.machine_id)}` : '';
            const vehicleText = record.vehicle_id ? `Vehicle ${this._escape(record.vehicle_id)}` : '';
            const location = [machineText, vehicleText].filter(Boolean).join(' / ') || '<span class="muted">-</span>';
            const notes = record.notes ? this._escape(record.notes) : '<span class="muted">-</span>';

            return `
                <tr>
                    <td>${this._toInt(record.quantity_issued)} units</td>
                    <td>${location}</td>
                    <td>${notes}</td>
                </tr>
            `;
        }).join('');

        return `
            <div class="usage-date-detail-card">
                <div class="usage-date-detail-header">
                    <h4 class="usage-section-title">Details for ${this._escape(this._formatDate(targetDate))}</h4>
                    <span class="usage-date-detail-meta">${selectedRecords.length} record(s) • ${totalQuantity} unit(s)</span>
                </div>
                <div class="usage-date-detail-scroll">
                    <table class="usage-date-detail-table">
                        <thead>
                            <tr>
                                <th>Quantity</th>
                                <th>Machine/Vehicle</th>
                                <th>Notes</th>
                            </tr>
                        </thead>
                        <tbody>${rowMarkup}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    _resolveSelectedUsageDate(history, selectedDate) {
        const availableDates = Array.from(
            new Set(history.map(record => this._normalizeDate(record.issue_date)).filter(Boolean))
        ).sort((a, b) => a.localeCompare(b));

        if (selectedDate && availableDates.includes(selectedDate)) {
            return selectedDate;
        }

        return availableDates.length > 0 ? availableDates[availableDates.length - 1] : null;
    }

    _normalizeDate(value) {
        return String(value || '').split('T')[0] || null;
    }

    _buildLineChartGeometry(points) {
        const width = 640;
        const height = 240;
        const padding = {
            top: 16,
            right: 18,
            bottom: 40,
            left: 36,
        };

        const maxQuantity = Math.max(...points.map(point => point.quantity), 1);
        const innerWidth = width - padding.left - padding.right;
        const innerHeight = height - padding.top - padding.bottom;
        const baselineY = padding.top + innerHeight;

        const chartPoints = points.map((point, index) => {
            const x = points.length === 1
                ? padding.left + (innerWidth / 2)
                : padding.left + (index * innerWidth) / (points.length - 1);
            const y = padding.top + ((maxQuantity - point.quantity) / maxQuantity) * innerHeight;
            const valueLabelY = Math.max(y - 10, padding.top + 12);

            return {
                ...point,
                x: Number(x.toFixed(2)),
                y: Number(y.toFixed(2)),
                valueLabelY: Number(valueLabelY.toFixed(2)),
            };
        });

        const pathPoints = chartPoints.map(point => `${point.x},${point.y}`).join(' ');

        const areaPoints = chartPoints.length === 1
            ? `${chartPoints[0].x},${baselineY} ${chartPoints[0].x},${chartPoints[0].y} ${chartPoints[0].x},${baselineY}`
            : `${chartPoints[0].x},${baselineY} ${pathPoints} ${chartPoints[chartPoints.length - 1].x},${baselineY}`;

        const gridSteps = 4;
        const gridLines = Array.from({ length: gridSteps + 1 }, (_, index) => {
            const y = padding.top + (innerHeight * index) / gridSteps;
            const value = Math.round(maxQuantity - (maxQuantity * index) / gridSteps);
            return {
                y: Number(y.toFixed(2)),
                value,
            };
        });

        return {
            width,
            height,
            padding,
            maxQuantity,
            points: chartPoints,
            pathPoints,
            areaPoints,
            gridLines,
        };
    }

    _renderUsageHistory(history) {
        if (!history || history.length === 0) {
            return '';
        }

        const rowsMarkup = history.slice(0, 8).map(record => {
            const machineText = record.machine_id ? `Machine ${this._escape(record.machine_id)}` : '';
            const vehicleText = record.vehicle_id ? `Vehicle ${this._escape(record.vehicle_id)}` : '';
            const location = [machineText, vehicleText].filter(Boolean).join(' / ') || '<span class="muted">-</span>';
            const notes = record.notes ? this._escape(record.notes) : '<span class="muted">-</span>';

            return `
                <tr>
                    <td>${this._escape(this._formatDate(record.issue_date))}</td>
                    <td>${this._toInt(record.quantity_issued)} units</td>
                    <td>${location}</td>
                    <td>${notes}</td>
                </tr>
            `;
        }).join('');

        return `
            <div class="usage-history-card">
                <h4 class="usage-section-title">Recent Issuance Records</h4>
                <div class="usage-history-scroll">
                    <table class="usage-history-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Quantity</th>
                                <th>Machine/Vehicle</th>
                                <th>Notes</th>
                            </tr>
                        </thead>
                        <tbody>${rowsMarkup}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    _buildUsagePoints(history) {
        const totalsByDate = new Map();

        history.forEach(record => {
            const normalizedDate = String(record.issue_date || '').split('T')[0];
            if (!normalizedDate) return;

            const quantityIssued = this._toInt(record.quantity_issued);
            totalsByDate.set(normalizedDate, (totalsByDate.get(normalizedDate) || 0) + quantityIssued);
        });

        const points = Array.from(totalsByDate.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, quantity]) => ({
                date,
                quantity,
                label: this._formatDate(date, { month: 'short', day: 'numeric' }),
                fullDate: this._formatDate(date),
            }));

        const maxPoints = 10;
        return points.length > maxPoints ? points.slice(points.length - maxPoints) : points;
    }

    _formatDate(value, options = { year: 'numeric', month: 'short', day: 'numeric' }) {
        if (!value) return '-';

        const parsedDate = new Date(value);
        if (Number.isNaN(parsedDate.getTime())) {
            return '-';
        }

        return parsedDate.toLocaleDateString('en-US', options);
    }

    _extractProducts(response) {
        if (!response || response.status !== 'success') {
            throw new Error(response?.message || 'Failed to load spareparts');
        }

        if (Array.isArray(response.data)) {
            return response.data;
        }

        if (response.data && Array.isArray(response.data.products)) {
            return response.data.products;
        }

        return [];
    }

    _extractUsage(response) {
        if (!response || response.status !== 'success') return [];
        if (Array.isArray(response.data)) return response.data;
        if (response.data && Array.isArray(response.data.usage)) return response.data.usage;
        return [];
    }

    _toInt(value) {
        const parsed = Number.parseInt(value, 10);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    _toast(message, type = 'info') {
        if (window.Utils && typeof window.Utils.showToast === 'function') {
            window.Utils.showToast(message, type);
            return;
        }

        console.log(`[${type}] ${message}`);
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

customElements.define('inventory-usage-tracking', InventoryUsageTracking);
