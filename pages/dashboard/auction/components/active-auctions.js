class AuctionActiveAuctions extends HTMLElement {
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
                <h1 class="page-title">Active Auctions</h1>
                <p class="page-subtitle">Monitor ongoing auctions and bidding activity</p>
            </div>

            <div style="margin-bottom: 20px;">
                <button class="btn btn-primary" type="button" data-action="open-create-auction">Create New Auction</button>
            </div>

            <div class="filter-controls" data-filter-group="auctions">
                <button class="filter-btn active" type="button" data-filter="all">All Auctions</button>
                <button class="filter-btn" type="button" data-filter="active">Active</button>
                <button class="filter-btn" type="button" data-filter="ending-soon">Ending Soon</button>
                <button class="filter-btn" type="button" data-filter="starting-soon">Starting Soon</button>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-gavel"></i> Active Auctions</span>
                    <span class="status-badge status-active">3 active</span>
                </div>
                <div id="auctionsContainer">
                    <div class="item-card" data-status="ending-soon">
                        <div class="item-details">
                            <strong>AUC-2024-001</strong>
                            <div class="item-meta">Truck LX-A-9876 (2019) | 12 Bidders</div>
                            <div class="item-description">Current: LKR 18,500 | Reserve: LKR 18,000 | Time: 2h 15m</div>
                        </div>
                        <div class="item-actions">
                            <span class="status-badge status-in-progress">Ending Soon</span>
                            <button class="btn btn-secondary btn-small" type="button" data-action="view-auction-details" data-auction-id="AUC-2024-001"><i class="fas fa-eye"></i> View</button>
                            <button class="btn btn-secondary btn-small" type="button" data-action="view-auction-bidders" data-auction-id="AUC-2024-001"><i class="fas fa-users"></i> Bidders</button>
                        </div>
                    </div>
                    <div class="item-card" data-status="active">
                        <div class="item-details">
                            <strong>AUC-2024-002</strong>
                            <div class="item-meta">Event F1-005 (2018) | 8 Bidders</div>
                            <div class="item-description">Current: LKR 9,200 | Reserve: LKR 8,000 | Time: 1d 5h</div>
                        </div>
                        <div class="item-actions">
                            <span class="status-badge status-active">Active</span>
                            <button class="btn btn-secondary btn-small" type="button" data-action="view-auction-details" data-auction-id="AUC-2024-002"><i class="fas fa-eye"></i> View</button>
                            <button class="btn btn-secondary btn-small" type="button" data-action="view-auction-bidders" data-auction-id="AUC-2024-002"><i class="fas fa-users"></i> Bidders</button>
                        </div>
                    </div>
                    <div class="item-card" data-status="starting-soon">
                        <div class="item-details">
                            <strong>AUC-2024-003</strong>
                            <div class="item-meta">V2L LX-B-486 (2020) | 15 Registered</div>
                            <div class="item-description">Reserve: LKR 12,000 | Starts in: 5h</div>
                        </div>
                        <div class="item-actions">
                            <span class="status-badge status-pending">Starting Soon</span>
                            <button class="btn btn-secondary btn-small" type="button" data-action="view-auction-details" data-auction-id="AUC-2024-003"><i class="fas fa-eye"></i> View</button>
                            <button class="btn btn-secondary btn-small" type="button" data-action="view-auction-bidders" data-auction-id="AUC-2024-003"><i class="fas fa-users"></i> Bidders</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (!button) {
                return;
            }

            if (button.dataset.action === 'open-create-auction') {
                this.emit('auction-active-auctions:open-create-modal');
                return;
            }

            if (button.dataset.filter) {
                this.filterAuctions(button.dataset.filter, button);
                return;
            }

            if (button.dataset.action === 'view-auction-details') {
                this.emit('auction-active-auctions:view-details', { auctionId: button.dataset.auctionId });
                return;
            }

            if (button.dataset.action === 'view-auction-bidders') {
                this.emit('auction-active-auctions:view-bidders', { auctionId: button.dataset.auctionId });
            }
        });
    }

    filterAuctions(status, activeButton) {
        const cards = this.querySelectorAll('#auctionsContainer .item-card');
        let visibleCount = 0;

        cards.forEach((card) => {
            const matches = status === 'all' || card.dataset.status === status;
            card.style.display = matches ? 'flex' : 'none';
            if (matches) {
                visibleCount += 1;
            }
        });

        this.updateFilterButtons(activeButton);
        this.emitToast(`Showing ${visibleCount} auctions`);
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

customElements.define('auction-active-auctions', AuctionActiveAuctions);
