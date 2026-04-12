class AuctionDashboardOverview extends HTMLElement {
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
                <h1 class="page-title">Dashboard</h1>
                <p class="page-subtitle">Auction Management Overview</p>
            </div>

            <div class="grid">
                <div class="summary-card">
                    <div class="summary-title">Today's Activity</div>
                    <div class="summary-content">
                        • Active Auctions: 3<br>
                        • Total Bids: 35<br>
                        • Pending Bidders: 5<br>
                        • Scheduled Auctions: 3
                    </div>
                </div>
                <div class="summary-card">
                    <div class="summary-title">Auction Performance</div>
                    <div class="summary-content">
                        • Completed This Month: 12<br>
                        • Success Rate: 92%<br>
                        • Avg. Above Reserve: 15%<br>
                        • Total Revenue: LKR 285,000
                    </div>
                </div>
                <div class="summary-card">
                    <div class="summary-title">Pending Actions</div>
                    <div class="summary-content">
                        • Bidder Approvals: 5<br>
                        • Assets Ready: 8<br>
                        • Ending Soon: 1<br>
                        • To Be Published: 3
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <span>⚡ Quick Actions</span>
                </div>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button class="btn btn-primary" type="button" data-nav-target="active-auctions"><i class="fas fa-gavel"></i> Create Auction</button>
                    <button class="btn btn-primary" type="button" data-nav-target="bidders"><i class="fas fa-users"></i> Register Bidder</button>
                    <button class="btn btn-primary" type="button" data-nav-target="schedule"><i class="fas fa-calendar-alt"></i> Schedule Auction</button>
                    <button class="btn btn-success" type="button" data-nav-target="reports"><i class="fas fa-chart-bar"></i> View Reports</button>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-chart-line"></i> Recent Activities</span>
                </div>
                <div class="item-card">
                    <div class="item-details">
                        <strong>Auction Created</strong>
                        <div class="item-meta">AUC-2024-010 | 2 hours ago</div>
                        <div class="item-description">Truck LKC-7890 (2017) - Reserve: LKR 15,000</div>
                    </div>
                    <span class="status-badge status-complete">Created</span>
                </div>
                <div class="item-card">
                    <div class="item-details">
                        <strong>Bidder Approved</strong>
                        <div class="item-meta">BID-051 - K-Tech Imports | 4 hours ago</div>
                        <div class="item-description">Company verification completed</div>
                    </div>
                    <span class="status-badge status-approved">Approved</span>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const navigateButton = event.target.closest('[data-nav-target]');
            if (!navigateButton) {
                return;
            }

            this.dispatchEvent(new CustomEvent('auction-dashboard:navigate', {
                bubbles: true,
                detail: {
                    section: navigateButton.dataset.navTarget,
                },
            }));
        });
    }
}

customElements.define('auction-dashboard-overview', AuctionDashboardOverview);
