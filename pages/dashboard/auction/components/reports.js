class AuctionReports extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }
        this._mounted = true;
        this.render();
        this.bindEvents();
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Auction Reports</h1>
                <p class="page-subtitle">Generate and analyze auction performance data</p>
            </div>

            <div class="card">
                <div class="card-header"><i class="fas fa-chart-line"></i> Report Filters</div>
                <form id="reportFilters">
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Date Range</label>
                            <select class="form-select">
                                <option>Today</option>
                                <option>This Week</option>
                                <option>This Month</option>
                                <option>Custom</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Status</label>
                            <select class="form-select">
                                <option>All</option>
                                <option>Active</option>
                                <option>Ended</option>
                                <option>Scheduled</option>
                            </select>
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button type="submit" class="btn btn-primary">Apply Filters</button>
                        <button type="button" class="btn btn-success" data-action="export-csv">Export CSV</button>
                    </div>
                </form>
            </div>

            <div class="filter-controls" data-filter-group="reports">
                <button class="filter-btn active" type="button" data-filter="all">All Reports</button>
                <button class="filter-btn" type="button" data-filter="active">Active</button>
                <button class="filter-btn" type="button" data-filter="ended">Ended</button>
                <button class="filter-btn" type="button" data-filter="scheduled">Scheduled</button>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-chart-bar"></i> Auction Report Results</span>
                    <span class="status-badge status-approved">3 results</span>
                </div>
                <div id="reportsContainer">
                    <div class="item-card" data-status="active">
                        <div class="item-details">
                            <strong>AUC-2024-001 - Truck LX-A-9876 (2019)</strong>
                            <div class="item-meta">12 Bidders | Start: LKR 18,000 | Current: LKR 18,500</div>
                            <div class="item-description">Above Reserve: 2.8% | Ends in: 2h 15m</div>
                        </div>
                        <div class="item-actions">
                            <span class="status-badge status-in-progress">Ending Soon</span>
                            <button class="btn btn-secondary btn-small" type="button" data-action="view-report" data-report-id="AUC-2024-001"><i class="fas fa-eye"></i> View</button>
                        </div>
                    </div>
                    <div class="item-card" data-status="active">
                        <div class="item-details">
                            <strong>AUC-2024-002 - Event F1-005 (2018)</strong>
                            <div class="item-meta">8 Bidders | Start: LKR 8,000 | Current: LKR 9,200</div>
                            <div class="item-description">Above Reserve: 15.0% | Ends in: 1d 5h</div>
                        </div>
                        <div class="item-actions">
                            <span class="status-badge status-active">Active</span>
                            <button class="btn btn-secondary btn-small" type="button" data-action="view-report" data-report-id="AUC-2024-002"><i class="fas fa-eye"></i> View</button>
                        </div>
                    </div>
                    <div class="item-card" data-status="scheduled">
                        <div class="item-details">
                            <strong>AUC-2024-003 - V2L LX-B-486 (2020)</strong>
                            <div class="item-meta">15 Registered | Reserve: LKR 12,000</div>
                            <div class="item-description">Starts in: 5h</div>
                        </div>
                        <div class="item-actions">
                            <span class="status-badge status-pending">Starting Soon</span>
                            <button class="btn btn-secondary btn-small" type="button" data-action="view-report" data-report-id="AUC-2024-003"><i class="fas fa-eye"></i> View</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const filtersForm = this.querySelector('#reportFilters');
        if (filtersForm) {
            filtersForm.addEventListener('submit', (event) => {
                event.preventDefault();
                this.emitToast('Filters applied');
            });
        }

        this.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (!button) {
                return;
            }

            if (button.dataset.action === 'export-csv') {
                this.emitToast('Exporting report data...');
                return;
            }

            if (button.dataset.filter) {
                this.filterReports(button.dataset.filter, button);
                return;
            }

            if (button.dataset.action === 'view-report') {
                this.emitToast(`Viewing report ${button.dataset.reportId}`);
            }
        });
    }

    filterReports(status, activeButton) {
        const cards = this.querySelectorAll('#reportsContainer .item-card');
        let visibleCount = 0;

        cards.forEach((card) => {
            const matches = status === 'all' || card.dataset.status === status;
            card.style.display = matches ? 'flex' : 'none';
            if (matches) {
                visibleCount += 1;
            }
        });

        this.updateFilterButtons(activeButton);
        this.emitToast(`Showing ${visibleCount} reports`);
    }

    updateFilterButtons(activeButton) {
        const group = activeButton.closest('[data-filter-group]');
        if (!group) {
            return;
        }

        group.querySelectorAll('.filter-btn').forEach((button) => button.classList.remove('active'));
        activeButton.classList.add('active');
    }

    emit(eventName, detail = {}) {
        this.dispatchEvent(new CustomEvent(eventName, {
            bubbles: true,
            detail,
        }));
    }

    emitToast(message, type = 'success') {
        this.emit('auction-ui:toast', { message, type });
    }
}

customElements.define('auction-reports', AuctionReports);
