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
            issueModalOpen: false,
            selectedPart: null,
        };

        this._onRootClick = this._onRootClick.bind(this);
        this._onSearchInput = this._onSearchInput.bind(this);
        this._onIssueSubmit = this._onIssueSubmit.bind(this);
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
        this._issueForm.addEventListener('submit', this._onIssueSubmit);

        this._initialized = true;
        this.render();
        await this.refresh();
    }

    disconnectedCallback() {
        this.shadowRoot.removeEventListener('click', this._onRootClick);
        this._searchInput?.removeEventListener('input', this._onSearchInput);
        this._issueForm?.removeEventListener('submit', this._onIssueSubmit);
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

        const { loading, error, products, issuedQtyMap, searchQuery, issueModalOpen, selectedPart } = this.state;

        this._banner.innerHTML = '';
        if (error) {
            this._banner.innerHTML = `<div class="info-banner error">${this._escape(error)}</div>`;
        } else if (loading) {
            this._banner.innerHTML = '<div class="info-banner loading">Loading spare parts usage data...</div>';
        }

        this._refreshButton.disabled = loading;
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

        this._modal.classList.toggle('active', issueModalOpen);
        if (selectedPart) {
            this._issueSparepartId.value = selectedPart.sparepartId;
            this._issueSparepartName.value = selectedPart.name;
            this._issueAvailableQty.value = `${selectedPart.availableQty} units`;
            this._issueQuantity.max = String(selectedPart.availableQty);
            this._issueQuantity.placeholder = `Max: ${selectedPart.availableQty}`;
        } else {
            this._issueSparepartId.value = '';
            this._issueSparepartName.value = '';
            this._issueAvailableQty.value = '';
            this._issueQuantity.max = '';
            this._issueQuantity.placeholder = 'Enter quantity';
        }
    }

    _template() {
        return `
            <div class="page-header">
                <h2 class="page-title">Usage Tracking</h2>
                <p class="page-subtitle">Track spare part issuance and update inventory consumption.</p>
            </div>

            <div class="search-row">
                <input id="usageSearch" class="search-input" type="text" placeholder="Search by sparepart ID or name...">
                <button id="refreshButton" type="button" class="btn btn-secondary btn-small" data-action="refresh">Refresh</button>
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

            <div id="issueModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">Issue Sparepart</h3>
                        <button type="button" class="btn btn-secondary btn-small" data-action="close-issue-modal">Close</button>
                    </div>
                    <div class="modal-body">
                        <form id="issueForm">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label" for="issueSparepartId">Sparepart ID</label>
                                    <input id="issueSparepartId" class="form-input" type="text" readonly>
                                </div>
                                <div class="form-group">
                                    <label class="form-label" for="issueSparepartName">Sparepart Name</label>
                                    <input id="issueSparepartName" class="form-input" type="text" readonly>
                                </div>
                                <div class="form-group">
                                    <label class="form-label" for="issueAvailableQty">Available Qty</label>
                                    <input id="issueAvailableQty" class="form-input" type="text" readonly>
                                </div>
                                <div class="form-group">
                                    <label class="form-label" for="issueQuantity">Quantity Issued *</label>
                                    <input id="issueQuantity" class="form-input" type="number" min="1" required>
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="form-label" for="issueNotes">Notes</label>
                                <textarea id="issueNotes" class="form-textarea" placeholder="Optional notes for this issuance"></textarea>
                            </div>

                            <div class="modal-actions">
                                <button type="button" class="btn btn-secondary" data-action="close-issue-modal">Cancel</button>
                                <button id="submitIssueButton" type="submit" class="btn btn-primary">Issue Sparepart</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    _cacheDom() {
        this._searchInput = this.shadowRoot.getElementById('usageSearch');
        this._refreshButton = this.shadowRoot.getElementById('refreshButton');
        this._banner = this.shadowRoot.getElementById('banner');
        this._tbody = this.shadowRoot.getElementById('usageTableBody');

        this._modal = this.shadowRoot.getElementById('issueModal');
        this._issueForm = this.shadowRoot.getElementById('issueForm');
        this._issueSparepartId = this.shadowRoot.getElementById('issueSparepartId');
        this._issueSparepartName = this.shadowRoot.getElementById('issueSparepartName');
        this._issueAvailableQty = this.shadowRoot.getElementById('issueAvailableQty');
        this._issueQuantity = this.shadowRoot.getElementById('issueQuantity');
        this._issueNotes = this.shadowRoot.getElementById('issueNotes');
        this._submitIssueButton = this.shadowRoot.getElementById('submitIssueButton');
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

        const stockClass = availableQty <= 0 ? 'out' : (availableQty <= 10 ? 'low' : 'in');
        const lastIssue = product.last_issue_date
            ? new Date(product.last_issue_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            })
            : '<span class="muted">Not issued yet</span>';

        const disableAction = availableQty <= 0 ? 'disabled' : '';

        return `
            <tr>
                <td><strong>${this._escape(sparepartId)}</strong></td>
                <td>${this._escape(sparepartName)}</td>
                <td>${this._escape(category)}</td>
                <td><span class="stock-value ${stockClass}">${availableQty} units</span></td>
                <td>${issuedQty > 0 ? `<span class="issued-value">${issuedQty} units</span>` : '<span class="muted">0 units</span>'}</td>
                <td>${lastIssue}</td>
                <td>
                    <button type="button" class="btn btn-primary btn-small" data-action="open-issue-modal" data-sparepart-id="${this._escapeAttr(sparepartId)}" data-sparepart-name="${this._escapeAttr(sparepartName)}" data-available-qty="${availableQty}" ${disableAction}>
                        Update
                    </button>
                </td>
            </tr>
        `;
    }

    _onRootClick(event) {
        const button = event.target.closest('button[data-action]');
        if (!button) {
            if (event.target === this._modal) {
                this._closeIssueModal();
            }
            return;
        }

        switch (button.dataset.action) {
            case 'refresh':
                this.refresh();
                break;
            case 'open-issue-modal':
                this._openIssueModal({
                    sparepartId: button.dataset.sparepartId || '',
                    name: button.dataset.sparepartName || '',
                    availableQty: this._toInt(button.dataset.availableQty),
                });
                break;
            case 'close-issue-modal':
                this._closeIssueModal();
                break;
            default:
                break;
        }
    }

    _onSearchInput(event) {
        this.setState({ searchQuery: event.target.value || '' });
    }

    async _onIssueSubmit(event) {
        event.preventDefault();

        const selectedPart = this.state.selectedPart;
        if (!selectedPart) {
            this._toast('No sparepart selected.', 'error');
            return;
        }

        const quantityIssued = this._toInt(this._issueQuantity.value);
        if (quantityIssued < 1) {
            this._toast('Please enter a valid quantity (at least 1).', 'error');
            return;
        }

        if (quantityIssued > selectedPart.availableQty) {
            this._toast(`Cannot issue ${quantityIssued} units. Only ${selectedPart.availableQty} available.`, 'error');
            return;
        }

        this._submitIssueButton.disabled = true;

        try {
            const today = new Date().toISOString().split('T')[0];
            const notes = (this._issueNotes.value || '').trim() || `Issued ${quantityIssued} unit(s) from inventory`;

            const response = await window.API.post('/usage', {
                sparepart_id: selectedPart.sparepartId,
                sparepart_name: selectedPart.name,
                quantity_issued: quantityIssued,
                issue_date: today,
                notes,
            });

            if (!response || response.status !== 'success') {
                throw new Error(response?.message || 'Failed to issue sparepart');
            }

            const newQuantity = response.data?.new_quantity ?? (selectedPart.availableQty - quantityIssued);
            this._toast(`Issued ${quantityIssued} unit(s) of ${selectedPart.name}. Remaining: ${newQuantity}`, 'success');

            this._closeIssueModal();
            await this.refresh();
        } catch (error) {
            console.error('Usage Tracking: failed to issue sparepart.', error);
            this._toast(`Error issuing sparepart: ${error.message}`, 'error');
        } finally {
            this._submitIssueButton.disabled = false;
        }
    }

    _openIssueModal(part) {
        if (!part || !part.sparepartId) return;

        this._issueQuantity.value = '';
        this._issueNotes.value = '';

        this.setState({
            issueModalOpen: true,
            selectedPart: part,
        });
    }

    _closeIssueModal() {
        this.setState({
            issueModalOpen: false,
            selectedPart: null,
        });
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
