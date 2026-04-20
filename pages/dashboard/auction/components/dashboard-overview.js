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
                <p class="page-subtitle">Auction Officer quick actions</p>
            </div>

            <div class="summary-grid">
                <button class="summary-card clickable" type="button" data-nav-target="active-auctions" aria-label="Open Active Auctions section">
                    <div class="summary-card-content">
                        <div class="summary-icon"><i class="fas fa-gavel"></i></div>
                        <div class="summary-details">
                            <div class="summary-title">Active Auctions</div>
                            <div class="summary-description">Create and manage live auction listings</div>
                        </div>
                    </div>
                    <div class="summary-arrow"><i class="fas fa-chevron-right"></i></div>
                </button>

                <button class="summary-card clickable" type="button" data-nav-target="assets" aria-label="Open Assets for Auction section">
                    <div class="summary-card-content">
                        <div class="summary-icon"><i class="fas fa-truck"></i></div>
                        <div class="summary-details">
                            <div class="summary-title">Assets for Auction</div>
                            <div class="summary-description">Review and prepare assets ready for bidding</div>
                        </div>
                    </div>
                    <div class="summary-arrow"><i class="fas fa-chevron-right"></i></div>
                </button>

                <button class="summary-card clickable" type="button" data-nav-target="bidders" aria-label="Open Bidder Management section">
                    <div class="summary-card-content">
                        <div class="summary-icon"><i class="fas fa-users"></i></div>
                        <div class="summary-details">
                            <div class="summary-title">Bidder Management</div>
                            <div class="summary-description">Register and maintain bidder approval workflows</div>
                        </div>
                    </div>
                    <div class="summary-arrow"><i class="fas fa-chevron-right"></i></div>
                </button>

                <button class="summary-card clickable" type="button" data-nav-target="schedule" aria-label="Open Auction Schedule section">
                    <div class="summary-card-content">
                        <div class="summary-icon"><i class="fas fa-calendar-alt"></i></div>
                        <div class="summary-details">
                            <div class="summary-title">Auction Schedule</div>
                            <div class="summary-description">Plan upcoming auctions and timeline slots</div>
                        </div>
                    </div>
                    <div class="summary-arrow"><i class="fas fa-chevron-right"></i></div>
                </button>
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
