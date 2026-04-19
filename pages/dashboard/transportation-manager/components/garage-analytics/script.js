class TMGarageAnalytics extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this._breakdowns = [];
        this._charts = {
            workflow: null,
            topGarages: null,
            turnaround: null,
        };

        this.loadStyles();
        this.render();
        this.bindEvents();
        this.setDefaultDateFilter();
        this.refresh();
    }

    disconnectedCallback() {
        this.destroyCharts();
    }

    loadStyles() {
        const linkId = 'tm-analytics-pages-styles';
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = './components/analytics-pages/style.css';
            document.head.appendChild(link);
        }
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-warehouse"></i> Garage Analytics</h2>
                <p class="page-subtitle">Track route-breakdown garage workflow progression, costs, and repair turnaround patterns.</p>
            </div>

            <div class="tm-analytics-toolbar">
                <div class="toolbar-group">
                    <label class="toolbar-label" for="tmGarageAnalyticsFromDate">From Date</label>
                    <input id="tmGarageAnalyticsFromDate" class="toolbar-field" type="date">
                </div>
                <div class="toolbar-group">
                    <label class="toolbar-label" for="tmGarageAnalyticsToDate">To Date</label>
                    <input id="tmGarageAnalyticsToDate" class="toolbar-field" type="date">
                </div>
                <button type="button" class="btn btn-primary" data-action="apply-filter">
                    <i class="fas fa-filter"></i> Apply Filter
                </button>
                <button type="button" class="btn btn-secondary" data-action="reset-filter">
                    <i class="fas fa-rotate-left"></i> Reset
                </button>
            </div>

            <div class="tm-analytics-summary">
                <div class="tm-analytics-pill">
                    <div class="pill-label">Breakdowns in Range</div>
                    <div class="pill-value" id="tmGarageBreakdownCount">0</div>
                </div>
                <div class="tm-analytics-pill">
                    <div class="pill-label">Completed Workflows</div>
                    <div class="pill-value" id="tmGarageCompletedCount">0</div>
                </div>
                <div class="tm-analytics-pill">
                    <div class="pill-label">Avg Repair Cost (LKR)</div>
                    <div class="pill-value" id="tmGarageAvgCost">0.00</div>
                </div>
                <div class="tm-analytics-pill">
                    <div class="pill-label">Avg Turnaround (hours)</div>
                    <div class="pill-value" id="tmGarageAvgTurnaround">0.0h</div>
                </div>
            </div>

            <div class="tm-chart-status" id="tmGarageAnalyticsStatus"></div>

            <div class="tm-analytics-grid">
                <div class="tm-chart-card">
                    <div class="chart-header">
                        <span class="chart-title">Garage Workflow Pipeline Distribution</span>
                        <span class="chart-subtitle">Breakdowns grouped by current garage-workflow stage.</span>
                    </div>
                    <div class="tm-chart-canvas-wrap">
                        <canvas id="tmGarageWorkflowChart"></canvas>
                        <div class="tm-chart-empty" id="tmGarageWorkflowChartEmpty"></div>
                    </div>
                    <div class="tm-chart-meta">
                        <span>Decision use: identify bottlenecks between approval, entry, and completion stages.</span>
                    </div>
                </div>

                <div class="tm-chart-card">
                    <div class="chart-header">
                        <span class="chart-title">Top Approved Garages by Breakdown Volume</span>
                        <span class="chart-subtitle">Most frequently selected garages for approved route-breakdown workflows.</span>
                    </div>
                    <div class="tm-chart-canvas-wrap">
                        <canvas id="tmGarageTopGaragesChart"></canvas>
                        <div class="tm-chart-empty" id="tmGarageTopGaragesChartEmpty"></div>
                    </div>
                    <div class="tm-chart-meta">
                        <span>Decision use: evaluate garage partner load distribution and dependency concentration.</span>
                    </div>
                </div>

                <div class="tm-chart-card">
                    <div class="chart-header">
                        <span class="chart-title">Average Turnaround by Severity</span>
                        <span class="chart-subtitle">Mean resolution hours from breakdown report to workflow completion.</span>
                    </div>
                    <div class="tm-chart-canvas-wrap">
                        <canvas id="tmGarageTurnaroundChart"></canvas>
                        <div class="tm-chart-empty" id="tmGarageTurnaroundChartEmpty"></div>
                    </div>
                    <div class="tm-chart-meta">
                        <span>Decision use: compare repair cycle speed across severity levels.</span>
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

            if (actionEl.dataset.action === 'apply-filter') {
                this.updateSummary();
                this.renderCharts();
                this.updateStatusMessage();
                return;
            }

            if (actionEl.dataset.action === 'reset-filter') {
                this.setDefaultDateFilter();
                this.updateSummary();
                this.renderCharts();
                this.updateStatusMessage();
            }
        });
    }

    setDefaultDateFilter() {
        const fromInput = this.querySelector('#tmGarageAnalyticsFromDate');
        const toInput = this.querySelector('#tmGarageAnalyticsToDate');
        if (!fromInput || !toInput) {
            return;
        }

        const toDate = new Date();
        const fromDate = new Date();
        fromDate.setMonth(toDate.getMonth() - 5);

        fromInput.value = this.toInputDate(fromDate);
        toInput.value = this.toInputDate(toDate);
    }

    async refresh() {
        const statusEl = this.querySelector('#tmGarageAnalyticsStatus');
        if (statusEl) {
            statusEl.className = 'tm-chart-status';
            statusEl.textContent = 'Loading garage analytics...';
        }

        try {
            const response = await API.get('/route-breakdowns');
            if (!this.isSuccessResponse(response)) {
                throw new Error(response?.message || 'Failed to load garage analytics');
            }

            this._breakdowns = this.extractBreakdowns(response);
            this.updateSummary();
            this.renderCharts();
            this.updateStatusMessage();
        } catch (error) {
            console.error('TM garage analytics refresh failed:', error);
            this._breakdowns = [];
            this.updateSummary();
            this.renderCharts();

            if (statusEl) {
                statusEl.className = 'tm-chart-status error';
                statusEl.textContent = error?.message || 'Failed to load garage analytics.';
            }
        }
    }

    updateStatusMessage() {
        const statusEl = this.querySelector('#tmGarageAnalyticsStatus');
        if (!statusEl) {
            return;
        }

        const filtered = this.getFilteredBreakdowns();
        statusEl.className = 'tm-chart-status';
        statusEl.textContent = `Showing ${filtered.length} route breakdown records in selected date range.`;
    }

    getFilteredBreakdowns() {
        const fromInput = String(this.querySelector('#tmGarageAnalyticsFromDate')?.value || '').trim();
        const toInput = String(this.querySelector('#tmGarageAnalyticsToDate')?.value || '').trim();

        const fromDate = fromInput ? new Date(`${fromInput}T00:00:00`) : null;
        const toDate = toInput ? new Date(`${toInput}T23:59:59`) : null;

        return this._breakdowns.filter((item) => {
            const breakdownDate = this.extractBreakdownDate(item);
            if (!breakdownDate) {
                return false;
            }

            if (fromDate && breakdownDate < fromDate) {
                return false;
            }

            if (toDate && breakdownDate > toDate) {
                return false;
            }

            return true;
        });
    }

    updateSummary() {
        const filtered = this.getFilteredBreakdowns();

        const completed = filtered.filter((item) => this.normalizeWorkflowStatus(item) === 'completed');

        const billValues = filtered
            .map((item) => this.getBillAmount(item))
            .filter((value) => Number.isFinite(value) && value > 0);

        const avgCost = billValues.length
            ? billValues.reduce((sum, value) => sum + value, 0) / billValues.length
            : 0;

        const turnaroundValues = completed
            .map((item) => this.getTurnaroundHours(item))
            .filter((value) => Number.isFinite(value) && value > 0);

        const avgTurnaround = turnaroundValues.length
            ? turnaroundValues.reduce((sum, value) => sum + value, 0) / turnaroundValues.length
            : 0;

        this.setText('#tmGarageBreakdownCount', String(filtered.length));
        this.setText('#tmGarageCompletedCount', String(completed.length));
        this.setText('#tmGarageAvgCost', avgCost.toFixed(2));
        this.setText('#tmGarageAvgTurnaround', `${avgTurnaround.toFixed(1)}h`);
    }

    renderCharts() {
        const filtered = this.getFilteredBreakdowns();
        this.renderWorkflowChart(filtered);
        this.renderTopGaragesChart(filtered);
        this.renderTurnaroundChart(filtered);
    }

    renderWorkflowChart(filtered) {
        const canvas = this.querySelector('#tmGarageWorkflowChart');
        if (!canvas || !this.isChartReady('#tmGarageWorkflowChartEmpty')) {
            return;
        }

        const statusCounts = new Map();
        filtered.forEach((item) => {
            const status = this.normalizeWorkflowStatus(item);
            statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
        });

        const labels = Array.from(statusCounts.keys());
        if (!labels.length) {
            this.showEmpty('#tmGarageWorkflowChartEmpty', 'fa-chart-pie', 'No route-breakdown records available for workflow distribution.');
            this.destroyChart('workflow');
            return;
        }

        const chartLabels = labels.map((status) => this.getWorkflowLabel(status));
        const values = labels.map((status) => statusCounts.get(status));
        const palette = {
            awaiting_supervisor_approval: 'rgba(245, 158, 11, 0.82)',
            garage_approved: 'rgba(59, 130, 246, 0.82)',
            garage_entry_logged: 'rgba(14, 165, 233, 0.82)',
            repair_in_progress: 'rgba(99, 102, 241, 0.82)',
            completed: 'rgba(16, 185, 129, 0.85)',
            other: 'rgba(100, 116, 139, 0.82)',
        };

        this.hideEmpty('#tmGarageWorkflowChartEmpty');
        this.destroyChart('workflow');

        this._charts.workflow = new window.Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: chartLabels,
                datasets: [
                    {
                        data: values,
                        backgroundColor: labels.map((status) => palette[status] || palette.other),
                        borderWidth: 0,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                    },
                },
            },
        });
    }

    renderTopGaragesChart(filtered) {
        const canvas = this.querySelector('#tmGarageTopGaragesChart');
        if (!canvas || !this.isChartReady('#tmGarageTopGaragesChartEmpty')) {
            return;
        }

        const garageMap = new Map();
        filtered.forEach((item) => {
            const status = this.normalizeWorkflowStatus(item);
            if (status === 'awaiting_supervisor_approval') {
                return;
            }

            const garageName = this.getGarageName(item);
            if (!garageName) {
                return;
            }

            garageMap.set(garageName, (garageMap.get(garageName) || 0) + 1);
        });

        const ranked = Array.from(garageMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);

        if (!ranked.length) {
            this.showEmpty('#tmGarageTopGaragesChartEmpty', 'fa-warehouse', 'No approved-garage records available in selected period.');
            this.destroyChart('topGarages');
            return;
        }

        this.hideEmpty('#tmGarageTopGaragesChartEmpty');
        this.destroyChart('topGarages');

        this._charts.topGarages = new window.Chart(canvas, {
            type: 'bar',
            data: {
                labels: ranked.map((entry) => entry[0]),
                datasets: [
                    {
                        label: 'Breakdowns',
                        data: ranked.map((entry) => entry[1]),
                        backgroundColor: 'rgba(37, 99, 235, 0.82)',
                        borderWidth: 0,
                    },
                ],
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false,
                    },
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0,
                        },
                    },
                },
            },
        });
    }

    renderTurnaroundChart(filtered) {
        const canvas = this.querySelector('#tmGarageTurnaroundChart');
        if (!canvas || !this.isChartReady('#tmGarageTurnaroundChartEmpty')) {
            return;
        }

        const severityOrder = ['low', 'medium', 'high', 'critical'];
        const buckets = new Map();
        severityOrder.forEach((severity) => {
            buckets.set(severity, []);
        });

        filtered.forEach((item) => {
            if (this.normalizeWorkflowStatus(item) !== 'completed') {
                return;
            }

            const hours = this.getTurnaroundHours(item);
            if (!(Number.isFinite(hours) && hours > 0)) {
                return;
            }

            const severity = this.normalizeSeverity(item.severity);
            if (!buckets.has(severity)) {
                buckets.set(severity, []);
            }

            buckets.get(severity).push(hours);
        });

        const labels = [];
        const data = [];
        severityOrder.forEach((severity) => {
            const values = buckets.get(severity) || [];
            if (!values.length) {
                return;
            }

            labels.push(this.toTitleCase(severity));
            data.push(values.reduce((sum, value) => sum + value, 0) / values.length);
        });

        if (!labels.length) {
            this.showEmpty('#tmGarageTurnaroundChartEmpty', 'fa-clock', 'No completed workflow records available for turnaround analysis.');
            this.destroyChart('turnaround');
            return;
        }

        this.hideEmpty('#tmGarageTurnaroundChartEmpty');
        this.destroyChart('turnaround');

        this._charts.turnaround = new window.Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Average Hours to Complete',
                        data: data.map((value) => Number(value.toFixed(2))),
                        backgroundColor: [
                            'rgba(148, 163, 184, 0.82)',
                            'rgba(245, 158, 11, 0.82)',
                            'rgba(249, 115, 22, 0.82)',
                            'rgba(220, 38, 38, 0.82)',
                        ].slice(0, data.length),
                        borderWidth: 0,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.parsed.y} hours`,
                        },
                    },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Hours',
                        },
                    },
                },
            },
        });
    }

    getGarageName(item) {
        const workflowGarageName = item?.garage_workflow?.approved_garage?.name;
        if (workflowGarageName) {
            return String(workflowGarageName).trim();
        }

        const rootName = item?.approved_garage_name;
        if (rootName) {
            return String(rootName).trim();
        }

        return '';
    }

    getBillAmount(item) {
        const workflowAmount = Number(item?.garage_workflow?.bill_amount);
        if (Number.isFinite(workflowAmount)) {
            return workflowAmount;
        }

        const rootAmount = Number(item?.bill_amount);
        if (Number.isFinite(rootAmount)) {
            return rootAmount;
        }

        return NaN;
    }

    getTurnaroundHours(item) {
        const start = this.extractBreakdownDate(item);
        const completedRaw = item?.garage_workflow?.completed_at || item?.completed_at;
        const end = completedRaw ? new Date(completedRaw) : null;

        if (!start || !end || Number.isNaN(end.getTime())) {
            return NaN;
        }

        const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return diffHours > 0 ? diffHours : NaN;
    }

    extractBreakdownDate(item) {
        const values = [item?.breakdown_datetime, item?.created_at, item?.updated_at];
        for (const value of values) {
            if (!value) {
                continue;
            }

            const date = new Date(value);
            if (!Number.isNaN(date.getTime())) {
                return date;
            }
        }

        return null;
    }

    normalizeSeverity(value) {
        const severity = String(value || '').trim().toLowerCase();
        if (severity === 'critical') return 'critical';
        if (severity === 'high') return 'high';
        if (severity === 'medium') return 'medium';
        return 'low';
    }

    normalizeWorkflowStatus(item) {
        const rawStatus = String(
            item?.garage_workflow?.status
            || item?.garage_workflow_status
            || ''
        ).trim().toLowerCase();

        if (rawStatus === 'garage_approved') return 'garage_approved';
        if (rawStatus === 'garage_entry_logged') return 'garage_entry_logged';
        if (rawStatus === 'repair_in_progress') return 'repair_in_progress';
        if (rawStatus === 'completed') return 'completed';

        if (rawStatus) {
            return rawStatus;
        }

        const breakdownStatus = String(item?.status || '').trim().toLowerCase();
        const ticketStatus = String(item?.ticket_status || '').trim().toLowerCase();

        if (breakdownStatus === 'resolved' || breakdownStatus === 'closed' || ticketStatus === 'resolved' || ticketStatus === 'closed') {
            return 'completed';
        }

        return 'awaiting_supervisor_approval';
    }

    getWorkflowLabel(status) {
        const map = {
            awaiting_supervisor_approval: 'Awaiting Approval',
            garage_approved: 'Garage Approved',
            garage_entry_logged: 'Garage Entry Logged',
            repair_in_progress: 'Repair In Progress',
            completed: 'Completed',
        };

        if (map[status]) {
            return map[status];
        }

        return this.toTitleCase(status.replace(/_/g, ' '));
    }

    toTitleCase(value) {
        return String(value || '')
            .split(' ')
            .map((word) => word ? (word[0].toUpperCase() + word.slice(1)) : '')
            .join(' ');
    }

    isSuccessResponse(response) {
        return !!response && (response.success === true || response.status === 'success');
    }

    extractBreakdowns(response) {
        const breakdowns = response?.data?.breakdowns;
        return Array.isArray(breakdowns) ? breakdowns : [];
    }

    isChartReady(emptySelector) {
        if (typeof window.Chart === 'undefined') {
            this.showEmpty(emptySelector, 'fa-chart-line', 'Chart.js is not available. Refresh the page and retry.');
            return false;
        }

        this.hideEmpty(emptySelector);
        return true;
    }

    showEmpty(selector, icon, message) {
        const emptyEl = this.querySelector(selector);
        if (!emptyEl) {
            return;
        }

        emptyEl.classList.add('visible');
        emptyEl.innerHTML = `
            <i class="fas ${icon}"></i>
            <p>${this.escapeHtml(message)}</p>
        `;
    }

    hideEmpty(selector) {
        const emptyEl = this.querySelector(selector);
        if (!emptyEl) {
            return;
        }

        emptyEl.classList.remove('visible');
        emptyEl.innerHTML = '';
    }

    destroyChart(name) {
        const chart = this._charts[name];
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
        this._charts[name] = null;
    }

    destroyCharts() {
        this.destroyChart('workflow');
        this.destroyChart('topGarages');
        this.destroyChart('turnaround');
    }

    toInputDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    setText(selector, value) {
        const el = this.querySelector(selector);
        if (el) {
            el.textContent = value;
        }
    }

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

customElements.define('tm-garage-analytics', TMGarageAnalytics);
