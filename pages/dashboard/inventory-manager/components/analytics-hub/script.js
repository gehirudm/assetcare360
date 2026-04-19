class InventoryAnalyticsHub extends HTMLElement {
    constructor() {
        super();
        this._activeView = 'stock';
        this._views = ['stock', 'additions', 'usage', 'requests', 'assets'];
        this._charts = new Map();
        this._refreshToken = 0;
        this._generatedReport = null;
        this._onRootClick = this._onRootClick.bind(this);
    }

    connectedCallback() {
        if (this._initialized) {
            this.bindEvents();
            return;
        }

        this._initialized = true;
        this.loadStyles();
        this.render();
        this.bindEvents();
        this.setDefaultReportPeriod();
        this.setReportStatus('Choose a time period and generate a downloadable report.', 'info');
        this.updateDownloadButtonState(false);
        this.activateView(this.getInitialView(), { refresh: false });
        this.refresh();
    }

    disconnectedCallback() {
        this.removeEventListener('click', this._onRootClick);
        this.destroyAllCharts();
    }

    loadStyles() {
        const linkId = 'inventory-analytics-hub-styles';
        if (document.getElementById(linkId)) {
            return;
        }

        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = './components/analytics-hub/style.css';
        document.head.appendChild(link);
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-chart-pie"></i> Inventory Analytics</h2>
                <p class="page-subtitle">Analyze stock movement, requests, and asset insurance coverage from one hub.</p>
            </div>

            <div class="iv-analytics-nav" role="tablist" aria-label="Inventory analytics sections">
                <button type="button" class="iv-tab" role="tab" data-view="stock">Stock Analytics</button>
                <button type="button" class="iv-tab" role="tab" data-view="additions">Stock Additions</button>
                <button type="button" class="iv-tab" role="tab" data-view="usage">Usage Analytics</button>
                <button type="button" class="iv-tab" role="tab" data-view="requests">Request Analytics</button>
                <button type="button" class="iv-tab" role="tab" data-view="assets">Asset Coverage</button>
            </div>

            <div class="iv-report-toolbar">
                <div class="iv-report-group">
                    <label class="iv-report-label" for="inventoryReportFromDate">From Date</label>
                    <input id="inventoryReportFromDate" class="iv-report-field" type="date">
                </div>
                <div class="iv-report-group">
                    <label class="iv-report-label" for="inventoryReportToDate">To Date</label>
                    <input id="inventoryReportToDate" class="iv-report-field" type="date">
                </div>
                <div class="iv-report-group">
                    <label class="iv-report-label" for="inventoryReportScope">Report Type</label>
                    <select id="inventoryReportScope" class="iv-report-field">
                        <option value="active">Active Analytics View</option>
                        <option value="stock">Stock Analytics</option>
                        <option value="additions">Stock Additions</option>
                        <option value="usage">Usage Analytics</option>
                        <option value="requests">Request Analytics</option>
                        <option value="assets">Asset Coverage</option>
                        <option value="all">All Analytics Summary</option>
                    </select>
                </div>
                <div class="iv-report-actions">
                    <button type="button" class="btn btn-primary" data-action="generate-report">
                        <i class="fas fa-file-lines"></i> Generate Report
                    </button>
                    <button type="button" class="btn btn-secondary" id="inventoryReportDownloadBtn" data-action="download-report" disabled>
                        <i class="fas fa-download"></i> Download CSV
                    </button>
                </div>
            </div>

            <div id="inventoryReportStatus" class="iv-report-status" aria-live="polite"></div>
            <div id="inventoryReportPreview" class="iv-report-preview"></div>

            <div id="inventoryAnalyticsStatus" class="iv-status" aria-live="polite"></div>

            <div class="iv-panel" data-view="stock" role="tabpanel" aria-hidden="true">
                <div id="ivSummaryStock" class="iv-summary"></div>
                <div class="iv-chart-grid">
                    ${this.renderChartCard('Stock Status Mix', 'In-stock, low-stock, and out-of-stock distribution.', 'ivStockStatusChart')}
                    ${this.renderChartCard('Top Stock Quantities', 'Highest quantity spare parts currently on hand.', 'ivStockTopChart')}
                </div>
            </div>

            <div class="iv-panel" data-view="additions" role="tabpanel" aria-hidden="true">
                <div id="ivSummaryAdditions" class="iv-summary"></div>
                <div class="iv-chart-grid">
                    ${this.renderChartCard('Monthly Stock Additions', 'Added quantity trend for recent months.', 'ivAdditionTrendChart')}
                    ${this.renderChartCard('Additions by Category', 'Distribution of additions by spare part category.', 'ivAdditionCategoryChart')}
                </div>
            </div>

            <div class="iv-panel" data-view="usage" role="tabpanel" aria-hidden="true">
                <div id="ivSummaryUsage" class="iv-summary"></div>
                <div class="iv-chart-grid">
                    ${this.renderChartCard('Monthly Usage Trend', 'Issued quantity trend for recent months.', 'ivUsageTrendChart')}
                    ${this.renderChartCard('Top Consumed Parts', 'Most issued spare parts by quantity.', 'ivUsageTopPartsChart')}
                </div>
            </div>

            <div class="iv-panel" data-view="requests" role="tabpanel" aria-hidden="true">
                <div id="ivSummaryRequests" class="iv-summary"></div>
                <div class="iv-chart-grid">
                    ${this.renderChartCard('Request Status Mix', 'Current request pipeline across statuses.', 'ivRequestStatusChart')}
                    ${this.renderChartCard('Request Priority Distribution', 'Priority profile of spare-part requests.', 'ivRequestPriorityChart')}
                </div>
            </div>

            <div class="iv-panel" data-view="assets" role="tabpanel" aria-hidden="true">
                <div id="ivSummaryAssets" class="iv-summary"></div>
                <div class="iv-chart-grid">
                    ${this.renderChartCard('Machine vs Vehicle Split', 'Asset count by type.', 'ivAssetTypeChart')}
                    ${this.renderChartCard('Insurance Renewal State', 'Overdue, due-soon, and upcoming insurance renewals.', 'ivInsuranceStateChart')}
                </div>
            </div>
        `;
    }

    renderChartCard(title, subtitle, canvasId) {
        return `
            <article class="iv-chart-card">
                <h3 class="iv-chart-title">${title}</h3>
                <p class="iv-chart-subtitle">${subtitle}</p>
                <div class="iv-chart-wrap">
                    <canvas id="${canvasId}"></canvas>
                    <p class="iv-chart-empty" data-empty-for="${canvasId}" hidden>No chart data available for this section.</p>
                </div>
            </article>
        `;
    }

    bindEvents() {
        this.removeEventListener('click', this._onRootClick);
        this.addEventListener('click', this._onRootClick);
    }

    _onRootClick(event) {
        const actionBtn = event.target.closest('[data-action]');
        if (actionBtn) {
            const action = String(actionBtn.dataset.action || '').trim();
            if (action === 'generate-report') {
                this.generateReport();
                return;
            }

            if (action === 'download-report') {
                this.downloadReportCsv();
                return;
            }
        }

        const tab = event.target.closest('.iv-tab[data-view]');
        if (!tab) {
            return;
        }

        this.activateView(String(tab.dataset.view || ''), { refresh: true });
    }

    setDefaultReportPeriod() {
        const fromInput = this.querySelector('#inventoryReportFromDate');
        const toInput = this.querySelector('#inventoryReportToDate');
        if (!fromInput || !toInput) {
            return;
        }

        const toDate = new Date();
        const fromDate = new Date();
        fromDate.setDate(toDate.getDate() - 30);

        fromInput.value = this.toInputDate(fromDate);
        toInput.value = this.toInputDate(toDate);
    }

    getInitialView() {
        const explicit = String(this.getAttribute('default-view') || '').trim();
        if (this._views.includes(explicit)) {
            return explicit;
        }

        return 'stock';
    }

    activateView(view, options = {}) {
        const refresh = options.refresh === true;
        if (!this._views.includes(view)) {
            return;
        }

        this._activeView = view;

        this.querySelectorAll('.iv-tab').forEach((button) => {
            const isActive = button.dataset.view === view;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        this.querySelectorAll('.iv-panel').forEach((panel) => {
            const isActive = panel.dataset.view === view;
            panel.classList.toggle('active', isActive);
            panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
        });

        if (refresh) {
            this.refresh();
        }
    }

    async refresh() {
        const token = ++this._refreshToken;
        const view = this._activeView;
        this.setStatus(`Loading ${this.getViewLabel(view)} analytics...`, 'info');

        try {
            if (view === 'stock') {
                await this.loadStockAnalytics();
            } else if (view === 'additions') {
                await this.loadAdditionAnalytics();
            } else if (view === 'usage') {
                await this.loadUsageAnalytics();
            } else if (view === 'requests') {
                await this.loadRequestAnalytics();
            } else if (view === 'assets') {
                await this.loadAssetAnalytics();
            }

            if (token !== this._refreshToken) {
                return;
            }

            this.setStatus(`${this.getViewLabel(view)} analytics updated at ${this.formatTime(new Date())}.`, 'success');
        } catch (error) {
            if (token !== this._refreshToken) {
                return;
            }

            const message = error?.message || `Unable to load ${this.getViewLabel(view).toLowerCase()} analytics.`;
            this.setStatus(message, 'error');
            this.emitToast(message, 'error');
        }
    }

    async loadStockAnalytics() {
        const products = await this.fetchProducts();

        const statusCounts = {
            'In Stock': 0,
            'Low Stock': 0,
            'Out of Stock': 0,
        };

        let totalQuantity = 0;
        let totalValue = 0;

        const topStockEntries = products
            .map((product) => {
                const quantity = this.toNumber(product.quantity);
                const unitPrice = this.toNumber(product.unit_price);
                const level = this.getStockLevel(product);

                statusCounts[level] = (statusCounts[level] || 0) + 1;
                totalQuantity += quantity;
                totalValue += quantity * unitPrice;

                return {
                    label: String(product.name || product.sparepart_id || 'Unknown Part').trim() || 'Unknown Part',
                    value: quantity,
                };
            })
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);

        this.renderSummary('ivSummaryStock', [
            { label: 'Total Spare Parts', value: products.length },
            { label: 'Total Quantity', value: totalQuantity },
            { label: 'Low Stock Parts', value: statusCounts['Low Stock'] || 0 },
            { label: 'Out of Stock Parts', value: statusCounts['Out of Stock'] || 0 },
            { label: 'Estimated Stock Value', value: this.formatCurrency(totalValue) },
        ]);

        this.renderDoughnutChart('ivStockStatusChart', this.entriesFromObject(statusCounts), 'Parts');
        this.renderBarChart('ivStockTopChart', topStockEntries, 'Units');
    }

    async loadAdditionAnalytics() {
        const additions = await this.fetchAdditions();
        const supplierSet = new Set();
        const partSet = new Set();
        const categoryCounts = {};

        let totalQuantityAdded = 0;

        additions.forEach((addition) => {
            const quantityAdded = this.toNumber(addition.quantity_added);
            totalQuantityAdded += quantityAdded;

            const supplier = String(addition.supplier || '').trim();
            if (supplier) {
                supplierSet.add(supplier.toLowerCase());
            }

            const partKey = String(addition.sparepart_id || addition.sparepart_name || '').trim();
            if (partKey) {
                partSet.add(partKey.toLowerCase());
            }

            const category = this.toTitle(addition.category || 'Uncategorized');
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        });

        const trend = this.buildMonthlySeries(
            additions,
            (row) => this.extractAdditionDate(row),
            (row) => this.toNumber(row.quantity_added),
            8
        );

        this.renderSummary('ivSummaryAdditions', [
            { label: 'Addition Records', value: additions.length },
            { label: 'Total Quantity Added', value: totalQuantityAdded },
            { label: 'Unique Spare Parts', value: partSet.size },
            { label: 'Suppliers Involved', value: supplierSet.size },
        ]);

        this.renderLineChart('ivAdditionTrendChart', trend, 'Added Quantity', 'rgba(37, 99, 235, 1)', 'rgba(37, 99, 235, 0.16)');
        this.renderDoughnutChart('ivAdditionCategoryChart', this.sortEntriesDesc(categoryCounts), 'Records');
    }

    async loadUsageAnalytics() {
        const usage = await this.fetchUsage();
        const partUsageCounts = {};

        let totalQuantityIssued = 0;
        let machineIssuanceCount = 0;
        let vehicleIssuanceCount = 0;

        usage.forEach((record) => {
            const quantityIssued = this.toNumber(record.quantity_issued);
            totalQuantityIssued += quantityIssued;

            if (record.machine_id) {
                machineIssuanceCount += 1;
            }

            if (record.vehicle_id) {
                vehicleIssuanceCount += 1;
            }

            const label = String(record.sparepart_name || record.sparepart_id || 'Unknown Part').trim() || 'Unknown Part';
            partUsageCounts[label] = (partUsageCounts[label] || 0) + quantityIssued;
        });

        const topUsageEntries = this.sortEntriesDesc(partUsageCounts).slice(0, 8);
        const trend = this.buildMonthlySeries(
            usage,
            (row) => this.extractUsageDate(row),
            (row) => this.toNumber(row.quantity_issued),
            8
        );

        this.renderSummary('ivSummaryUsage', [
            { label: 'Issuance Records', value: usage.length },
            { label: 'Total Quantity Issued', value: totalQuantityIssued },
            { label: 'Machine Issuances', value: machineIssuanceCount },
            { label: 'Vehicle Issuances', value: vehicleIssuanceCount },
        ]);

        this.renderLineChart('ivUsageTrendChart', trend, 'Issued Quantity', 'rgba(16, 185, 129, 1)', 'rgba(16, 185, 129, 0.18)');
        this.renderBarChart('ivUsageTopPartsChart', topUsageEntries, 'Units Issued');
    }

    async loadRequestAnalytics() {
        const requests = await this.fetchRequests();
        const statusCounts = this.aggregateCounts(
            requests.map((request) => this.toTitle(request.status || 'Pending'))
        );
        const priorityCounts = this.aggregateCounts(
            requests.map((request) => this.toTitle(request.priority || request.ticket_priority || 'Medium'))
        );

        let pendingCount = 0;
        let approvedIssuedCount = 0;
        let rejectedCount = 0;
        let totalRequestedQuantity = 0;

        requests.forEach((request) => {
            const status = this.normalizeKey(request.status);
            if (status === 'pending') {
                pendingCount += 1;
            }

            if (status === 'approved' || status === 'issued') {
                approvedIssuedCount += 1;
            }

            if (status === 'rejected' || status === 'cancelled') {
                rejectedCount += 1;
            }

            const items = Array.isArray(request.items) ? request.items : [];
            items.forEach((item) => {
                totalRequestedQuantity += this.toNumber(item.quantity);
            });
        });

        this.renderSummary('ivSummaryRequests', [
            { label: 'Total Requests', value: requests.length },
            { label: 'Pending', value: pendingCount },
            { label: 'Approved / Issued', value: approvedIssuedCount },
            { label: 'Rejected', value: rejectedCount },
            { label: 'Requested Quantity', value: totalRequestedQuantity },
        ]);

        this.renderDoughnutChart('ivRequestStatusChart', this.sortEntriesDesc(statusCounts), 'Requests');
        this.renderBarChart('ivRequestPriorityChart', this.sortEntriesDesc(priorityCounts), 'Requests');
    }

    async loadAssetAnalytics() {
        const assets = await this.fetchAssetsWithType();

        const typeSplit = {
            Machines: assets.filter((asset) => asset.assetType === 'Machine').length,
            Vehicles: assets.filter((asset) => asset.assetType === 'Vehicle').length,
        };

        const insuranceStateCounts = {
            Overdue: 0,
            'Due Soon': 0,
            Upcoming: 0,
            'No Schedule': 0,
        };

        const activeStates = new Set(['active', 'available', 'operational', 'in-service', 'serviceable']);
        let activeCount = 0;

        assets.forEach((asset) => {
            const state = this.getInsuranceState(asset);
            insuranceStateCounts[state] = (insuranceStateCounts[state] || 0) + 1;

            const normalizedStatus = this.normalizeKey(asset.status);
            if (activeStates.has(normalizedStatus)) {
                activeCount += 1;
            }
        });

        this.renderSummary('ivSummaryAssets', [
            { label: 'Total Assets', value: assets.length },
            { label: 'Active Assets', value: activeCount },
            { label: 'Insurance Overdue', value: insuranceStateCounts.Overdue || 0 },
            { label: 'Due Within 30 Days', value: insuranceStateCounts['Due Soon'] || 0 },
            { label: 'No Renewal Schedule', value: insuranceStateCounts['No Schedule'] || 0 },
        ]);

        this.renderDoughnutChart('ivAssetTypeChart', this.entriesFromObject(typeSplit), 'Assets');
        this.renderBarChart('ivInsuranceStateChart', this.entriesFromObject(insuranceStateCounts), 'Assets');
    }

    async generateReport() {
        try {
            this.setGeneratingState(true);
            this.setReportStatus('Generating report...', 'info');

            const period = this.getReportPeriod();
            const selectedScope = String(this.querySelector('#inventoryReportScope')?.value || 'active').trim();
            const scope = selectedScope === 'active' ? this._activeView : selectedScope;

            const report = await this.buildReportForScope(scope, period, selectedScope);
            this._generatedReport = report;
            this.renderReportPreview(report);
            this.updateDownloadButtonState(true);

            const rowCount = Array.isArray(report.rows) ? report.rows.length : 0;
            this.setReportStatus(`Report generated successfully (${rowCount} rows).`, 'success');
        } catch (error) {
            console.error('Inventory report generation failed:', error);
            this.setReportStatus(error?.message || 'Failed to generate report.', 'error');
            this.updateDownloadButtonState(false);
        } finally {
            this.setGeneratingState(false);
        }
    }

    async buildReportForScope(scope, period, selectedScope) {
        if (scope === 'stock') {
            return this.buildStockReport(period, selectedScope);
        }

        if (scope === 'additions') {
            return this.buildAdditionsReport(period, selectedScope);
        }

        if (scope === 'usage') {
            return this.buildUsageReport(period, selectedScope);
        }

        if (scope === 'requests') {
            return this.buildRequestsReport(period, selectedScope);
        }

        if (scope === 'assets') {
            return this.buildAssetsReport(period, selectedScope);
        }

        if (scope === 'all') {
            return this.buildAllAnalyticsReport(period, selectedScope);
        }

        throw new Error('Unsupported report type selected.');
    }

    async buildStockReport(period, selectedScope) {
        const products = await this.fetchProducts();
        const filtered = products.filter((product) => {
            const date = this.extractProductDate(product);
            return this.isSnapshotWithinPeriod(date, period);
        });

        const rows = filtered.map((product) => {
            const quantity = this.toNumber(product.quantity);
            const unitPrice = this.toNumber(product.unit_price);
            const threshold = this.getStockThreshold(product);

            return {
                sparepart_id: product.sparepart_id || '',
                part_name: product.name || '',
                category: product.category || '',
                quantity,
                threshold,
                stock_level: this.getStockLevel(product),
                unit_price_lkr: Number.isFinite(unitPrice) ? Number(unitPrice.toFixed(2)) : '',
                stock_value_lkr: Number.isFinite(unitPrice) ? Number((unitPrice * quantity).toFixed(2)) : '',
                last_issue_date: product.last_issue_date || '',
                updated_at: product.updated_at || product.created_at || '',
            };
        });

        const lowStockCount = rows.filter((row) => row.stock_level === 'Low Stock').length;
        const outOfStockCount = rows.filter((row) => row.stock_level === 'Out of Stock').length;
        const totalQuantity = rows.reduce((sum, row) => sum + this.toNumber(row.quantity), 0);
        const totalValue = rows.reduce((sum, row) => sum + this.toNumber(row.stock_value_lkr), 0);

        return {
            scope: selectedScope,
            reportType: 'Stock Analytics',
            generatedAt: new Date().toISOString(),
            period,
            summary: {
                total_spareparts: rows.length,
                total_quantity: totalQuantity,
                low_stock_parts: lowStockCount,
                out_of_stock_parts: outOfStockCount,
                estimated_stock_value_lkr: Number(totalValue.toFixed(2)),
            },
            columns: [
                { key: 'sparepart_id', label: 'Spare Part ID' },
                { key: 'part_name', label: 'Part Name' },
                { key: 'category', label: 'Category' },
                { key: 'quantity', label: 'Quantity' },
                { key: 'threshold', label: 'Threshold' },
                { key: 'stock_level', label: 'Stock Level' },
                { key: 'unit_price_lkr', label: 'Unit Price (LKR)' },
                { key: 'stock_value_lkr', label: 'Stock Value (LKR)' },
                { key: 'last_issue_date', label: 'Last Issue Date' },
                { key: 'updated_at', label: 'Updated At' },
            ],
            rows,
        };
    }

    async buildAdditionsReport(period, selectedScope) {
        const additions = await this.fetchAdditions();
        const filtered = additions.filter((record) => this.isWithinPeriod(this.extractAdditionDate(record), period));

        const rows = filtered.map((record) => ({
            addition_id: record.id || '',
            sparepart_id: record.sparepart_id || '',
            sparepart_name: record.sparepart_name || '',
            category: record.category || '',
            quantity_added: this.toNumber(record.quantity_added),
            received_date: record.received_date || '',
            supplier: record.supplier || '',
            added_by: record.added_by || '',
            notes: record.notes || '',
        }));

        const totalQuantityAdded = rows.reduce((sum, row) => sum + this.toNumber(row.quantity_added), 0);
        const uniqueParts = new Set(rows.map((row) => String(row.sparepart_id || row.sparepart_name || '').trim()).filter(Boolean));
        const uniqueSuppliers = new Set(rows.map((row) => String(row.supplier || '').trim().toLowerCase()).filter(Boolean));

        return {
            scope: selectedScope,
            reportType: 'Stock Additions',
            generatedAt: new Date().toISOString(),
            period,
            summary: {
                addition_records: rows.length,
                total_quantity_added: totalQuantityAdded,
                unique_spareparts: uniqueParts.size,
                suppliers_involved: uniqueSuppliers.size,
            },
            columns: [
                { key: 'addition_id', label: 'Addition ID' },
                { key: 'sparepart_id', label: 'Spare Part ID' },
                { key: 'sparepart_name', label: 'Spare Part Name' },
                { key: 'category', label: 'Category' },
                { key: 'quantity_added', label: 'Quantity Added' },
                { key: 'received_date', label: 'Received Date' },
                { key: 'supplier', label: 'Supplier' },
                { key: 'added_by', label: 'Added By' },
                { key: 'notes', label: 'Notes' },
            ],
            rows,
        };
    }

    async buildUsageReport(period, selectedScope) {
        const usage = await this.fetchUsage();
        const filtered = usage.filter((record) => this.isWithinPeriod(this.extractUsageDate(record), period));

        const rows = filtered.map((record) => ({
            usage_id: record.id || '',
            sparepart_id: record.sparepart_id || '',
            sparepart_name: record.sparepart_name || '',
            quantity_issued: this.toNumber(record.quantity_issued),
            issue_date: record.issue_date || '',
            machine_id: record.machine_id || '',
            vehicle_id: record.vehicle_id || '',
            issued_by: record.issued_by || '',
            notes: record.notes || '',
        }));

        const totalQuantityIssued = rows.reduce((sum, row) => sum + this.toNumber(row.quantity_issued), 0);
        const machineIssuances = rows.filter((row) => row.machine_id).length;
        const vehicleIssuances = rows.filter((row) => row.vehicle_id).length;

        return {
            scope: selectedScope,
            reportType: 'Usage Analytics',
            generatedAt: new Date().toISOString(),
            period,
            summary: {
                issuance_records: rows.length,
                total_quantity_issued: totalQuantityIssued,
                machine_issuances: machineIssuances,
                vehicle_issuances: vehicleIssuances,
            },
            columns: [
                { key: 'usage_id', label: 'Usage ID' },
                { key: 'sparepart_id', label: 'Spare Part ID' },
                { key: 'sparepart_name', label: 'Spare Part Name' },
                { key: 'quantity_issued', label: 'Quantity Issued' },
                { key: 'issue_date', label: 'Issue Date' },
                { key: 'machine_id', label: 'Machine ID' },
                { key: 'vehicle_id', label: 'Vehicle ID' },
                { key: 'issued_by', label: 'Issued By' },
                { key: 'notes', label: 'Notes' },
            ],
            rows,
        };
    }

    async buildRequestsReport(period, selectedScope) {
        const requests = await this.fetchRequests();
        const filtered = requests.filter((request) => this.isWithinPeriod(this.extractRequestDate(request), period));

        const rows = filtered.map((request) => {
            const items = Array.isArray(request.items) ? request.items : [];
            const totalRequestedQuantity = items.reduce((sum, item) => sum + this.toNumber(item.quantity), 0);

            return {
                request_id: request.request_id || request.id || '',
                status: request.status || '',
                priority: request.priority || request.ticket_priority || '',
                requested_by: request.requested_by_name || request.requested_by || '',
                fault_ticket: request.fault_ticket_code || request.fault_ticket_id || '',
                items_count: items.length,
                total_requested_quantity: totalRequestedQuantity,
                created_at: request.created_at || '',
                reviewed_at: request.reviewed_at || '',
            };
        });

        const pendingCount = rows.filter((row) => this.normalizeKey(row.status) === 'pending').length;
        const approvedIssuedCount = rows.filter((row) => {
            const status = this.normalizeKey(row.status);
            return status === 'approved' || status === 'issued';
        }).length;
        const rejectedCount = rows.filter((row) => {
            const status = this.normalizeKey(row.status);
            return status === 'rejected' || status === 'cancelled';
        }).length;
        const totalRequestedQuantity = rows.reduce((sum, row) => sum + this.toNumber(row.total_requested_quantity), 0);

        return {
            scope: selectedScope,
            reportType: 'Request Analytics',
            generatedAt: new Date().toISOString(),
            period,
            summary: {
                total_requests: rows.length,
                pending_requests: pendingCount,
                approved_or_issued: approvedIssuedCount,
                rejected_requests: rejectedCount,
                total_requested_quantity: totalRequestedQuantity,
            },
            columns: [
                { key: 'request_id', label: 'Request ID' },
                { key: 'status', label: 'Status' },
                { key: 'priority', label: 'Priority' },
                { key: 'requested_by', label: 'Requested By' },
                { key: 'fault_ticket', label: 'Fault Ticket' },
                { key: 'items_count', label: 'Item Count' },
                { key: 'total_requested_quantity', label: 'Total Requested Quantity' },
                { key: 'created_at', label: 'Created At' },
                { key: 'reviewed_at', label: 'Reviewed At' },
            ],
            rows,
        };
    }

    async buildAssetsReport(period, selectedScope) {
        const assets = await this.fetchAssetsWithType();
        const filtered = assets.filter((asset) => this.isSnapshotWithinPeriod(this.extractAssetDate(asset), period));

        const rows = filtered.map((asset) => {
            const insuranceState = this.getInsuranceState(asset);
            return {
                asset_type: asset.assetType,
                asset_id: asset.machine_id || asset.vehicle_id || asset.id || '',
                asset_name: asset.machine_name || asset.vehicle_name || '',
                status: asset.status || '',
                location_or_plate: asset.location || asset.number_plate || '',
                insurance_provider: asset.insurance_provider || '',
                next_insurance_renew_date: asset.next_insurance_renew_date || '',
                insurance_state: insuranceState,
            };
        });

        const activeStates = new Set(['active', 'available', 'operational', 'in-service', 'serviceable']);
        const activeCount = rows.filter((row) => activeStates.has(this.normalizeKey(row.status))).length;
        const overdueCount = rows.filter((row) => row.insurance_state === 'Overdue').length;
        const dueSoonCount = rows.filter((row) => row.insurance_state === 'Due Soon').length;
        const noScheduleCount = rows.filter((row) => row.insurance_state === 'No Schedule').length;

        return {
            scope: selectedScope,
            reportType: 'Asset Coverage',
            generatedAt: new Date().toISOString(),
            period,
            summary: {
                total_assets: rows.length,
                active_assets: activeCount,
                insurance_overdue: overdueCount,
                due_within_30_days: dueSoonCount,
                no_renewal_schedule: noScheduleCount,
            },
            columns: [
                { key: 'asset_type', label: 'Asset Type' },
                { key: 'asset_id', label: 'Asset ID' },
                { key: 'asset_name', label: 'Asset Name' },
                { key: 'status', label: 'Status' },
                { key: 'location_or_plate', label: 'Location/Plate' },
                { key: 'insurance_provider', label: 'Insurance Provider' },
                { key: 'next_insurance_renew_date', label: 'Next Insurance Renew Date' },
                { key: 'insurance_state', label: 'Insurance State' },
            ],
            rows,
        };
    }

    async buildAllAnalyticsReport(period, selectedScope) {
        const reports = await Promise.all([
            this.buildStockReport(period, 'stock'),
            this.buildAdditionsReport(period, 'additions'),
            this.buildUsageReport(period, 'usage'),
            this.buildRequestsReport(period, 'requests'),
            this.buildAssetsReport(period, 'assets'),
        ]);

        const rows = [];
        reports.forEach((report) => {
            Object.entries(report.summary || {}).forEach(([metric, value]) => {
                rows.push({
                    section: report.reportType,
                    metric,
                    value,
                });
            });
        });

        return {
            scope: selectedScope,
            reportType: 'All Analytics Summary',
            generatedAt: new Date().toISOString(),
            period,
            summary: {
                sections_included: reports.length,
                summary_rows: rows.length,
            },
            columns: [
                { key: 'section', label: 'Section' },
                { key: 'metric', label: 'Metric' },
                { key: 'value', label: 'Value' },
            ],
            rows,
        };
    }

    async fetchAssetsWithType() {
        const [machineResult, vehicleResult] = await Promise.allSettled([
            this.fetchMachines(),
            this.fetchVehicles(),
        ]);

        const machines = machineResult.status === 'fulfilled' ? machineResult.value : [];
        const vehicles = vehicleResult.status === 'fulfilled' ? vehicleResult.value : [];

        const hasSuccessfulSource = machineResult.status === 'fulfilled' || vehicleResult.status === 'fulfilled';
        if (!hasSuccessfulSource) {
            throw new Error('Failed to load machine and vehicle data.');
        }

        return [
            ...machines.map((machine) => ({ ...machine, assetType: 'Machine' })),
            ...vehicles.map((vehicle) => ({ ...vehicle, assetType: 'Vehicle' })),
        ];
    }

    async fetchProducts() {
        const response = await this.safeGet('/products', 'Failed to load spare parts.');
        return this.extractArrayFromResponse(response, ['data.products', 'data']);
    }

    async fetchAdditions() {
        const response = await this.safeGet('/additions', 'Failed to load additions.');
        return this.extractArrayFromResponse(response, ['data.additions', 'data']);
    }

    async fetchUsage() {
        const response = await this.safeGet('/usage', 'Failed to load usage records.');
        return this.extractArrayFromResponse(response, ['data.usage', 'data']);
    }

    async fetchRequests() {
        const response = await this.safeGet('/spare-part-requests', 'Failed to load spare-part requests.');
        return this.extractArrayFromResponse(response, ['data.requests', 'data']);
    }

    async fetchMachines() {
        const response = await this.safeGet('/machines', 'Failed to load machines.');
        return this.extractArrayFromResponse(response, ['data.machines', 'data']);
    }

    async fetchVehicles() {
        const response = await this.safeGet('/vehicles', 'Failed to load vehicles.');
        return this.extractArrayFromResponse(response, ['data.vehicles', 'data']);
    }

    async safeGet(endpoint, fallbackMessage) {
        if (!window.API || typeof window.API.get !== 'function') {
            throw new Error('API client is not available on this page.');
        }

        const response = await window.API.get(endpoint);
        if (!this.isSuccessResponse(response)) {
            throw new Error(response?.message || fallbackMessage);
        }

        return response;
    }

    isSuccessResponse(response) {
        if (!response || typeof response !== 'object') {
            return false;
        }

        return response.status === 'success' || response.success === true;
    }

    extractArrayFromResponse(response, candidatePaths) {
        for (const path of candidatePaths) {
            const value = this.readPath(response, path);
            if (Array.isArray(value)) {
                return value;
            }
        }

        return [];
    }

    readPath(source, path) {
        if (!source || !path) {
            return undefined;
        }

        return path.split('.').reduce((value, key) => {
            if (value && Object.prototype.hasOwnProperty.call(value, key)) {
                return value[key];
            }
            return undefined;
        }, source);
    }

    getStockThreshold(product) {
        const threshold = this.toNumber(product.low_stock_threshold || product.reorder_level);
        return threshold > 0 ? threshold : 0;
    }

    getStockLevel(product) {
        const quantity = this.toNumber(product.quantity);
        const threshold = this.getStockThreshold(product);

        if (quantity <= 0) {
            return 'Out of Stock';
        }

        if (threshold > 0 && quantity <= threshold) {
            return 'Low Stock';
        }

        return 'In Stock';
    }

    getInsuranceState(asset) {
        const nextRenewDate = this.parseDate(asset.next_insurance_renew_date);
        if (!(nextRenewDate instanceof Date) || Number.isNaN(nextRenewDate.getTime())) {
            return 'No Schedule';
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const msPerDay = 24 * 60 * 60 * 1000;
        const diffDays = Math.floor((nextRenewDate.getTime() - today.getTime()) / msPerDay);

        if (diffDays < 0) {
            return 'Overdue';
        }

        if (diffDays <= 30) {
            return 'Due Soon';
        }

        return 'Upcoming';
    }

    buildMonthlySeries(entries, dateExtractor, valueExtractor, maxMonths = 8) {
        const monthMap = new Map();
        entries.forEach((entry) => {
            const date = dateExtractor(entry);
            if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
                return;
            }

            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const current = monthMap.get(monthKey) || 0;
            monthMap.set(monthKey, current + this.toNumber(valueExtractor(entry)));
        });

        const labels = [];
        const values = [];
        const now = new Date();

        for (let offset = maxMonths - 1; offset >= 0; offset -= 1) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
            const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
            labels.push(monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
            values.push(Number((monthMap.get(monthKey) || 0).toFixed(2)));
        }

        return { labels, values };
    }

    parseDate(value) {
        if (!value) {
            return null;
        }

        const raw = String(value).trim();
        if (!raw) {
            return null;
        }

        const normalized = raw.includes('T')
            ? raw
            : raw.includes(' ')
                ? raw.replace(' ', 'T')
                : `${raw}T00:00:00`;
        const parsed = new Date(normalized);
        if (Number.isNaN(parsed.getTime())) {
            return null;
        }

        return parsed;
    }

    extractProductDate(product) {
        const candidates = [product.updated_at, product.created_at, product.last_issue_date];
        for (const candidate of candidates) {
            const date = this.parseDate(candidate);
            if (date) {
                return date;
            }
        }

        return null;
    }

    extractAdditionDate(addition) {
        const candidates = [addition.received_date, addition.created_at];
        for (const candidate of candidates) {
            const date = this.parseDate(candidate);
            if (date) {
                return date;
            }
        }

        return null;
    }

    extractUsageDate(record) {
        const candidates = [record.issue_date, record.created_at, record.updated_at];
        for (const candidate of candidates) {
            const date = this.parseDate(candidate);
            if (date) {
                return date;
            }
        }

        return null;
    }

    extractRequestDate(request) {
        const candidates = [request.created_at, request.reviewed_at, request.updated_at];
        for (const candidate of candidates) {
            const date = this.parseDate(candidate);
            if (date) {
                return date;
            }
        }

        return null;
    }

    extractAssetDate(asset) {
        const candidates = [asset.updated_at, asset.created_at, asset.last_insurance_renew_date, asset.next_insurance_renew_date];
        for (const candidate of candidates) {
            const date = this.parseDate(candidate);
            if (date) {
                return date;
            }
        }

        return null;
    }

    getReportPeriod() {
        const fromRaw = String(this.querySelector('#inventoryReportFromDate')?.value || '').trim();
        const toRaw = String(this.querySelector('#inventoryReportToDate')?.value || '').trim();

        const from = fromRaw ? new Date(`${fromRaw}T00:00:00`) : null;
        const to = toRaw ? new Date(`${toRaw}T23:59:59`) : null;

        if (from && Number.isNaN(from.getTime())) {
            throw new Error('Invalid from-date value.');
        }

        if (to && Number.isNaN(to.getTime())) {
            throw new Error('Invalid to-date value.');
        }

        if (from && to && from.getTime() > to.getTime()) {
            throw new Error('From date must be earlier than or equal to to date.');
        }

        return { fromRaw, toRaw, from, to };
    }

    isWithinPeriod(date, period) {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
            return false;
        }

        if (period.from && date.getTime() < period.from.getTime()) {
            return false;
        }

        if (period.to && date.getTime() > period.to.getTime()) {
            return false;
        }

        return true;
    }

    isSnapshotWithinPeriod(date, period) {
        if (!period.from && !period.to) {
            return true;
        }

        if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
            return true;
        }

        return this.isWithinPeriod(date, period);
    }

    renderSummary(containerId, metrics) {
        const container = this.querySelector(`#${containerId}`);
        if (!container) {
            return;
        }

        container.innerHTML = metrics.map((metric) => {
            return `
                <div class="iv-kpi-card">
                    <span class="iv-kpi-label">${this.escapeHtml(metric.label)}</span>
                    <span class="iv-kpi-value">${this.escapeHtml(String(metric.value))}</span>
                </div>
            `;
        }).join('');
    }

    renderDoughnutChart(canvasId, entries, label) {
        this.renderChart(canvasId, {
            type: 'doughnut',
            data: {
                labels: entries.map((entry) => entry.label),
                datasets: [{
                    label,
                    data: entries.map((entry) => entry.value),
                    backgroundColor: this.createColors(entries.length, 0.85),
                    borderColor: '#ffffff',
                    borderWidth: 2,
                }],
            },
            options: {
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    },
                },
            },
        });
    }

    renderBarChart(canvasId, entries, label) {
        this.renderChart(canvasId, {
            type: 'bar',
            data: {
                labels: entries.map((entry) => entry.label),
                datasets: [{
                    label,
                    data: entries.map((entry) => entry.value),
                    backgroundColor: this.createColors(entries.length, 0.78),
                    borderColor: this.createColors(entries.length, 1),
                    borderWidth: 1,
                    borderRadius: 8,
                    maxBarThickness: 36,
                }],
            },
            options: {
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                    },
                },
                plugins: {
                    legend: {
                        display: false,
                    },
                },
            },
        });
    }

    renderLineChart(canvasId, trend, label, lineColor, fillColor) {
        this.renderChart(canvasId, {
            type: 'line',
            data: {
                labels: trend.labels,
                datasets: [{
                    label,
                    data: trend.values,
                    borderColor: lineColor,
                    backgroundColor: fillColor,
                    fill: true,
                    tension: 0.32,
                }],
            },
            options: {
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                    },
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                    },
                },
            },
        });
    }

    renderChart(canvasId, config) {
        const canvas = this.querySelector(`#${canvasId}`);
        if (!canvas) {
            return;
        }

        if (typeof window.Chart !== 'function') {
            this.destroyChart(canvasId);
            this.showChartEmptyState(canvasId, 'Chart rendering library is unavailable.');
            return;
        }

        const hasData = this.hasChartData(config?.data?.datasets || []);
        if (!hasData) {
            this.destroyChart(canvasId);
            this.showChartEmptyState(canvasId, 'No chart data available for this section.');
            return;
        }

        this.hideChartEmptyState(canvasId);
        this.destroyChart(canvasId);

        const context = canvas.getContext('2d');
        const chart = new window.Chart(context, config);
        this._charts.set(canvasId, chart);
    }

    hasChartData(datasets) {
        return datasets.some((dataset) => {
            const values = Array.isArray(dataset?.data) ? dataset.data : [];
            return values.some((value) => this.toNumber(value) > 0);
        });
    }

    showChartEmptyState(canvasId, message) {
        const canvas = this.querySelector(`#${canvasId}`);
        const emptyState = this.querySelector(`[data-empty-for="${canvasId}"]`);

        if (canvas) {
            canvas.style.display = 'none';
        }

        if (emptyState) {
            emptyState.hidden = false;
            emptyState.textContent = message;
        }
    }

    hideChartEmptyState(canvasId) {
        const canvas = this.querySelector(`#${canvasId}`);
        const emptyState = this.querySelector(`[data-empty-for="${canvasId}"]`);

        if (canvas) {
            canvas.style.display = 'block';
        }

        if (emptyState) {
            emptyState.hidden = true;
        }
    }

    destroyChart(canvasId) {
        const chart = this._charts.get(canvasId);
        if (!chart) {
            return;
        }

        chart.destroy();
        this._charts.delete(canvasId);
    }

    destroyAllCharts() {
        this._charts.forEach((chart) => chart.destroy());
        this._charts.clear();
    }

    createColors(count, alpha = 1) {
        const palette = [
            [37, 99, 235],
            [16, 185, 129],
            [245, 158, 11],
            [239, 68, 68],
            [14, 165, 233],
            [99, 102, 241],
            [236, 72, 153],
            [217, 119, 6],
            [107, 114, 128],
            [20, 184, 166],
        ];

        return Array.from({ length: Math.max(count, 1) }, (_, index) => {
            const [r, g, b] = palette[index % palette.length];
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        });
    }

    aggregateCounts(values) {
        return values.reduce((accumulator, value) => {
            const normalized = String(value || 'Unknown').trim() || 'Unknown';
            accumulator[normalized] = (accumulator[normalized] || 0) + 1;
            return accumulator;
        }, {});
    }

    sortEntriesDesc(source) {
        return Object.entries(source)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value);
    }

    entriesFromObject(source) {
        return Object.entries(source).map(([label, value]) => ({ label, value }));
    }

    normalizeKey(value) {
        return String(value || '')
            .trim()
            .toLowerCase()
            .replace(/[_\s]+/g, '-')
            .replace(/[^a-z0-9-]/g, '');
    }

    toTitle(value) {
        const raw = String(value || '').trim();
        if (!raw) {
            return 'Unknown';
        }

        return raw
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/\b\w/g, (letter) => letter.toUpperCase());
    }

    toNumber(value) {
        const numeric = Number.parseFloat(value);
        return Number.isFinite(numeric) ? numeric : 0;
    }

    formatCurrency(amount) {
        const value = Number.isFinite(amount) ? amount : 0;
        return `LKR ${value.toLocaleString('en-LK', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    }

    formatTime(value) {
        if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
            return 'N/A';
        }

        return value.toLocaleTimeString('en-LK', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    }

    getViewLabel(view) {
        const labels = {
            stock: 'Stock',
            additions: 'Stock Additions',
            usage: 'Usage',
            requests: 'Request',
            assets: 'Asset Coverage',
        };

        return labels[view] || 'Analytics';
    }

    setStatus(message, type = 'info') {
        const statusEl = this.querySelector('#inventoryAnalyticsStatus');
        if (!statusEl) {
            return;
        }

        statusEl.textContent = message;
        statusEl.className = 'iv-status';
        if (type) {
            statusEl.classList.add(type);
        }
    }

    setGeneratingState(isGenerating) {
        const generateBtn = this.querySelector('[data-action="generate-report"]');
        if (!generateBtn) {
            return;
        }

        generateBtn.disabled = isGenerating;
        generateBtn.innerHTML = isGenerating
            ? '<i class="fas fa-spinner fa-spin"></i> Generating...'
            : '<i class="fas fa-file-lines"></i> Generate Report';

        if (isGenerating) {
            this.updateDownloadButtonState(false);
        }
    }

    updateDownloadButtonState(enabled) {
        const button = this.querySelector('#inventoryReportDownloadBtn');
        if (!button) {
            return;
        }

        button.disabled = !enabled;
    }

    setReportStatus(message, type = 'info') {
        const statusEl = this.querySelector('#inventoryReportStatus');
        if (!statusEl) {
            return;
        }

        statusEl.className = `iv-report-status ${type}`;
        statusEl.textContent = message;
    }

    renderReportPreview(report) {
        const previewEl = this.querySelector('#inventoryReportPreview');
        if (!previewEl) {
            return;
        }

        const summaryHtml = Object.entries(report.summary || {})
            .map(([key, value]) => {
                const label = this.toLabel(key);
                return `
                    <div class="iv-report-summary-item">
                        <span class="summary-key">${this.escapeHtml(label)}</span>
                        <span class="summary-value">${this.escapeHtml(String(value))}</span>
                    </div>
                `;
            })
            .join('');

        const columns = Array.isArray(report.columns) ? report.columns : [];
        const rows = Array.isArray(report.rows) ? report.rows : [];
        const previewRows = rows.slice(0, 200);

        const tableHead = columns
            .map((column) => `<th>${this.escapeHtml(column.label)}</th>`)
            .join('');

        const tableBody = previewRows
            .map((row) => {
                const cells = columns
                    .map((column) => `<td>${this.escapeHtml(String(row[column.key] ?? ''))}</td>`)
                    .join('');
                return `<tr>${cells}</tr>`;
            })
            .join('');

        const periodText = `${report.period.fromRaw || 'Any'} to ${report.period.toRaw || 'Any'}`;
        const tableSection = columns.length > 0
            ? `
                <div class="iv-report-table-wrap">
                    <table class="iv-report-table">
                        <thead><tr>${tableHead}</tr></thead>
                        <tbody>${tableBody}</tbody>
                    </table>
                </div>
            `
            : '<div class="iv-report-empty">No tabular rows available for this report.</div>';

        const truncatedNote = rows.length > previewRows.length
            ? `<div class="iv-report-truncated-note">Showing first ${previewRows.length} rows out of ${rows.length}.</div>`
            : '';

        previewEl.innerHTML = `
            <div class="iv-report-card">
                <div class="iv-report-meta">
                    <h3>${this.escapeHtml(report.reportType)}</h3>
                    <p>Period: ${this.escapeHtml(periodText)} | Generated: ${this.escapeHtml(this.formatDateTime(report.generatedAt))}</p>
                </div>
                <div class="iv-report-summary-grid">${summaryHtml || '<div class="iv-report-empty">No summary metrics found.</div>'}</div>
                ${tableSection}
                ${truncatedNote}
            </div>
        `;
    }

    downloadReportCsv() {
        if (!this._generatedReport) {
            this.setReportStatus('Generate a report before downloading.', 'error');
            return;
        }

        const csv = this.buildCsv(this._generatedReport);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const now = new Date();
        const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
        const scope = String(this._generatedReport.scope || 'analytics').toLowerCase();

        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `inventory-${scope}-report-${stamp}.csv`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);

        URL.revokeObjectURL(url);
        this.setReportStatus('Report downloaded successfully.', 'success');
    }

    buildCsv(report) {
        const lines = [];
        lines.push(`Report Type,${this.escapeCsv(report.reportType)}`);
        lines.push(`Generated At,${this.escapeCsv(report.generatedAt)}`);
        lines.push(`From Date,${this.escapeCsv(report.period.fromRaw || 'Any')}`);
        lines.push(`To Date,${this.escapeCsv(report.period.toRaw || 'Any')}`);
        lines.push('');
        lines.push('Summary Metric,Value');

        Object.entries(report.summary || {}).forEach(([metric, value]) => {
            lines.push(`${this.escapeCsv(this.toLabel(metric))},${this.escapeCsv(value)}`);
        });

        lines.push('');

        const columns = Array.isArray(report.columns) ? report.columns : [];
        if (columns.length > 0) {
            lines.push(columns.map((column) => this.escapeCsv(column.label)).join(','));

            const rows = Array.isArray(report.rows) ? report.rows : [];
            rows.forEach((row) => {
                const values = columns.map((column) => this.escapeCsv(row[column.key] ?? ''));
                lines.push(values.join(','));
            });
        }

        return lines.join('\n');
    }

    escapeCsv(value) {
        const raw = String(value ?? '');
        const escaped = raw.replace(/"/g, '""');
        if (/[",\n]/.test(escaped)) {
            return `"${escaped}"`;
        }

        return escaped;
    }

    toLabel(value) {
        return String(value || '')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    formatDateTime(value) {
        if (!value) {
            return 'N/A';
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    toInputDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    emitToast(message, type = 'info') {
        this.dispatchEvent(new CustomEvent('inventory-analytics-hub:toast', {
            bubbles: true,
            detail: {
                message,
                type,
            },
        }));
    }

    escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    async refreshActive() {
        await this.refresh();
    }

    async refreshAll() {
        const originalView = this._activeView;
        for (const view of this._views) {
            this.activateView(view, { refresh: false });
            await this.refresh();
        }

        this.activateView(originalView, { refresh: false });
    }
}

if (!customElements.get('inventory-analytics-hub')) {
    customElements.define('inventory-analytics-hub', InventoryAnalyticsHub);
}
