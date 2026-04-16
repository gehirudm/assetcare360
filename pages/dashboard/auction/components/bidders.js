class AuctionBidders extends HTMLElement {
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
                <h1 class="page-title">Bidder Management</h1>
                <p class="page-subtitle">Register and manage auction participants</p>
            </div>

            <div style="margin-bottom: 20px;">
                <button class="btn btn-primary" type="button" data-action="open-register-modal">Register New Bidder</button>
            </div>

            <div class="filter-controls" data-filter-group="bidders">
                <button class="filter-btn active" type="button" data-filter="all">All Bidders</button>
                <button class="filter-btn" type="button" data-filter="pending">Pending</button>
                <button class="filter-btn" type="button" data-filter="verified">Verified</button>
                <button class="filter-btn" type="button" data-filter="company">Companies</button>
                <button class="filter-btn" type="button" data-filter="individual">Individuals</button>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-users"></i> Registered Bidders</span>
                    <span class="status-badge status-approved">47 total, 5 pending</span>
                </div>
                <div id="biddersContainer">
                    <div class="item-card" data-status="pending" data-type="individual">
                        <div class="item-details">
                            <strong>BID-045 - R. Fernando</strong>
                            <div class="item-meta">Individual | r.fernando@email.com</div>
                            <div class="item-description">Registered: Oct 18, 2025 | Documents submitted</div>
                        </div>
                        <div class="item-actions">
                            <span class="status-badge status-pending">Pending</span>
                            <button class="btn btn-success btn-small" type="button" data-action="approve-bidder" data-bidder-id="BID-045">✓ Approve</button>
                            <button class="btn btn-secondary btn-small" type="button" data-action="view-bidder" data-bidder-id="BID-045"><i class="fas fa-eye"></i> View</button>
                        </div>
                    </div>
                    <div class="item-card" data-status="verified" data-type="company">
                        <div class="item-details">
                            <strong>BID-014 - Next Motors (Pvt)</strong>
                            <div class="item-meta">Company | info@nextmotors.com</div>
                            <div class="item-description">Active bidder | 15 successful bids</div>
                        </div>
                        <div class="item-actions">
                            <span class="status-badge status-approved">Verified</span>
                            <button class="btn btn-secondary btn-small" type="button" data-action="view-bidder" data-bidder-id="BID-014"><i class="fas fa-eye"></i> View</button>
                        </div>
                    </div>
                    <div class="item-card" data-status="verified" data-type="individual">
                        <div class="item-details">
                            <strong>BID-032 - M. Jayasekara</strong>
                            <div class="item-meta">Individual | m.jayasekara@email.com</div>
                            <div class="item-description">Active bidder | 8 successful bids</div>
                        </div>
                        <div class="item-actions">
                            <span class="status-badge status-approved">Verified</span>
                            <button class="btn btn-secondary btn-small" type="button" data-action="view-bidder" data-bidder-id="BID-032"><i class="fas fa-eye"></i> View</button>
                        </div>
                    </div>
                    <div class="item-card" data-status="pending" data-type="company">
                        <div class="item-details">
                            <strong>BID-050 - K-Tech Imports</strong>
                            <div class="item-meta">Company | accounts@ktech.com</div>
                            <div class="item-description">Registered: Oct 17, 2025 | Documents under review</div>
                        </div>
                        <div class="item-actions">
                            <span class="status-badge status-pending">Pending</span>
                            <button class="btn btn-success btn-small" type="button" data-action="approve-bidder" data-bidder-id="BID-050">✓ Approve</button>
                            <button class="btn btn-secondary btn-small" type="button" data-action="view-bidder" data-bidder-id="BID-050"><i class="fas fa-eye"></i> View</button>
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

            if (button.dataset.action === 'open-register-modal') {
                this.emit('auction-bidders:open-register-modal');
                return;
            }

            if (button.dataset.filter) {
                this.filterBidders(button.dataset.filter, button);
                return;
            }

            if (button.dataset.action === 'approve-bidder') {
                this.emitToast(`Bidder ${button.dataset.bidderId} approved`);
                return;
            }

            if (button.dataset.action === 'view-bidder') {
                this.emitToast(`Viewing bidder ${button.dataset.bidderId}`);
            }
        });
    }

    filterBidders(criteria, activeButton) {
        const cards = this.querySelectorAll('#biddersContainer .item-card');
        let visibleCount = 0;

        cards.forEach((card) => {
            const cardStatus = card.dataset.status;
            const cardType = card.dataset.type;
            let shouldShow = false;

            if (criteria === 'all') {
                shouldShow = true;
            } else if (criteria === 'pending' && cardStatus === 'pending') {
                shouldShow = true;
            } else if (criteria === 'verified' && cardStatus === 'verified') {
                shouldShow = true;
            } else if (criteria === 'company' && cardType === 'company') {
                shouldShow = true;
            } else if (criteria === 'individual' && cardType === 'individual') {
                shouldShow = true;
            }

            card.style.display = shouldShow ? 'flex' : 'none';
            if (shouldShow) {
                visibleCount += 1;
            }
        });

        this.updateFilterButtons(activeButton);
        this.emitToast(`Showing ${visibleCount} bidders`);
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

customElements.define('auction-bidders', AuctionBidders);
