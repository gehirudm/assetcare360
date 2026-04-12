class AuctionAssets extends HTMLElement {
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
                <h1 class="page-title">Assets for Auction</h1>
                <p class="page-subtitle">Manage vehicles and machinery marked for disposal</p>
            </div>

            <div class="filter-controls" data-filter-group="assets">
                <button class="filter-btn active" type="button" data-filter="all">All Assets</button>
                <button class="filter-btn" type="button" data-filter="good">Good Condition</button>
                <button class="filter-btn" type="button" data-filter="fair">Fair Condition</button>
                <button class="filter-btn" type="button" data-filter="vehicles">Vehicles</button>
                <button class="filter-btn" type="button" data-filter="equipment">Equipment</button>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-truck"></i> Assets Ready for Auction</span>
                    <span class="status-badge status-pending">8 available</span>
                </div>
                <div id="assetsContainer">
                    <div class="item-card" data-status="fair" data-type="vehicles">
                        <div class="item-details">
                            <strong>Truck LKC-7890</strong>
                            <div class="item-meta">2017 Mitsubishi Canter · 180,000 km</div>
                            <div class="item-description">High maintenance cost | Fair condition</div>
                        </div>
                        <div class="item-actions">
                            <span class="status-badge status-pending">Fair</span>
                            <button class="btn btn-primary btn-small" type="button" data-action="view-asset" data-asset-id="Truck LKC-7890"><i class="fas fa-eye"></i> View</button>
                            <button class="btn btn-success btn-small" type="button" data-action="schedule-asset" data-asset-id="Truck LKC-7890"><i class="fas fa-calendar-alt"></i> Schedule</button>
                        </div>
                    </div>
                    <div class="item-card" data-status="good" data-type="equipment">
                        <div class="item-details">
                            <strong>Excavator EX-003</strong>
                            <div class="item-meta">2016 Caterpillar 315D · 8,500 h</div>
                            <div class="item-description">Fleet downsizing | Good condition</div>
                        </div>
                        <div class="item-actions">
                            <span class="status-badge status-approved">Good</span>
                            <button class="btn btn-primary btn-small" type="button" data-action="view-asset" data-asset-id="Excavator EX-003"><i class="fas fa-eye"></i> View</button>
                            <button class="btn btn-success btn-small" type="button" data-action="schedule-asset" data-asset-id="Excavator EX-003"><i class="fas fa-calendar-alt"></i> Schedule</button>
                        </div>
                    </div>
                    <div class="item-card" data-status="fair" data-type="equipment">
                        <div class="item-details">
                            <strong>Generator GEN-002</strong>
                            <div class="item-meta">2015 Perkins 100kVA · 12,000 h</div>
                            <div class="item-description">Replacement purchased | Fair condition</div>
                        </div>
                        <div class="item-actions">
                            <span class="status-badge status-pending">Fair</span>
                            <button class="btn btn-primary btn-small" type="button" data-action="view-asset" data-asset-id="Generator GEN-002"><i class="fas fa-eye"></i> View</button>
                            <button class="btn btn-success btn-small" type="button" data-action="schedule-asset" data-asset-id="Generator GEN-002"><i class="fas fa-calendar-alt"></i> Schedule</button>
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

            if (button.dataset.filter) {
                this.filterAssets(button.dataset.filter, button);
                return;
            }

            if (button.dataset.action === 'view-asset') {
                this.emitToast(`Viewing asset: ${button.dataset.assetId}`);
                return;
            }

            if (button.dataset.action === 'schedule-asset') {
                this.emit('auction-assets:schedule', { assetId: button.dataset.assetId });
                this.emitToast(`Preparing schedule for ${button.dataset.assetId}`);
            }
        });
    }

    filterAssets(criteria, activeButton) {
        const cards = this.querySelectorAll('#assetsContainer .item-card');
        let visibleCount = 0;

        cards.forEach((card) => {
            const cardStatus = card.dataset.status;
            const cardType = card.dataset.type;
            let shouldShow = false;

            if (criteria === 'all') {
                shouldShow = true;
            } else if (criteria === 'good' && cardStatus === 'good') {
                shouldShow = true;
            } else if (criteria === 'fair' && cardStatus === 'fair') {
                shouldShow = true;
            } else if (criteria === 'vehicles' && cardType === 'vehicles') {
                shouldShow = true;
            } else if (criteria === 'equipment' && cardType === 'equipment') {
                shouldShow = true;
            }

            card.style.display = shouldShow ? 'flex' : 'none';
            if (shouldShow) {
                visibleCount += 1;
            }
        });

        this.updateFilterButtons(activeButton);
        this.emitToast(`Showing ${visibleCount} assets`);
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

customElements.define('auction-assets', AuctionAssets);
