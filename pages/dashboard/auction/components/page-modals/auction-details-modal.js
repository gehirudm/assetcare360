class AuctionDetailsModal extends HTMLElement {
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
            <div id="auctionDetailsModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <button class="close" type="button" data-close-modal>&times;</button>
                    <h2 id="auctionDetailsTitle" style="margin-bottom: 20px; color: var(--tang-blue);">Auction Details</h2>
                    <div id="auctionDetailsBody"></div>
                    <button type="button" class="btn btn-secondary" data-close-modal>Close</button>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#auctionDetailsModal');

        this.addEventListener('click', (event) => {
            if (event.target === modal || event.target.closest('[data-close-modal]')) {
                this.close();
            }
        });
    }

    open(auctionId) {
        const modal = this.querySelector('#auctionDetailsModal');
        const title = this.querySelector('#auctionDetailsTitle');
        const body = this.querySelector('#auctionDetailsBody');

        if (title) {
            title.textContent = `Auction Details - ${auctionId}`;
        }

        if (body) {
            body.innerHTML = `
                <div class="form-section">
                    <h5><i class="fas fa-gavel"></i> Auction Information</h5>
                    <div><strong>Auction ID:</strong> ${auctionId}</div>
                    <div><strong>Asset:</strong> Truck LX-A-9876 (2019)</div>
                    <div><strong>Status:</strong> <span class="status-badge status-in-progress">Active - Ending Soon</span></div>
                    <div><strong>Created:</strong> Oct 15, 2025</div>
                    <div><strong>Start Time:</strong> Oct 17, 2025 10:00 AM</div>
                    <div><strong>End Time:</strong> Oct 19, 2025 04:30 PM</div>
                    <div><strong>Time Remaining:</strong> 2 hours 15 minutes</div>
                </div>
                <div class="form-section">
                    <h5><i class="fas fa-money-bill-wave"></i> Bidding Information</h5>
                    <div><strong>Reserve Price:</strong> LKR 18,000</div>
                    <div><strong>Starting Bid:</strong> LKR 18,000</div>
                    <div><strong>Current Bid:</strong> LKR 18,500</div>
                    <div><strong>Above Reserve:</strong> 2.8%</div>
                    <div><strong>Total Bidders:</strong> 12</div>
                    <div><strong>Total Bids:</strong> 27</div>
                    <div><strong>Bid Increment:</strong> LKR 100</div>
                </div>
                <div class="form-section">
                    <h5><i class="fas fa-truck"></i> Asset Details</h5>
                    <div><strong>Make/Model:</strong> Truck LX-A-9876</div>
                    <div><strong>Year:</strong> 2019</div>
                    <div><strong>Mileage:</strong> 85,000 km</div>
                    <div><strong>Condition:</strong> Good</div>
                    <div><strong>Location:</strong> Main Depot - Colombo</div>
                </div>
                <div class="form-section">
                    <h5><i class="fas fa-chart-bar"></i> Bidding Activity</h5>
                    <div style="margin-bottom: 8px;">
                        <strong>Recent Bids:</strong><br>
                        LKR 18,500 - BID-032 (M. Jayasekara) - 5 min ago<br>
                        LKR 18,400 - BID-014 (Next Motors) - 12 min ago<br>
                        LKR 18,300 - BID-032 (M. Jayasekara) - 25 min ago<br>
                        LKR 18,200 - BID-045 (R. Fernando) - 1 hour ago
                    </div>
                </div>
            `;
        }

        if (modal) {
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
        }
    }

    close() {
        const modal = this.querySelector('#auctionDetailsModal');
        if (modal) {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        }
    }
}

customElements.define('auction-details-modal', AuctionDetailsModal);
