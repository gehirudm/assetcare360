class AuctionSchedule extends HTMLElement {
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
                <h1 class="page-title">Auction Schedule</h1>
                <p class="page-subtitle">Plan and manage auction timelines</p>
            </div>

            <div class="filter-controls" data-filter-group="schedule">
                <button class="filter-btn active" type="button" data-filter="all">All Scheduled</button>
                <button class="filter-btn" type="button" data-filter="scheduled">Scheduled</button>
                <button class="filter-btn" type="button" data-filter="published">Published</button>
                <button class="filter-btn" type="button" data-filter="this-week">This Week</button>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-calendar-alt"></i> Upcoming Auctions</span>
                    <span class="status-badge status-scheduled">3 scheduled</span>
                </div>
                <div id="scheduleContainer">
                    <div class="item-card" data-status="scheduled" data-period="this-week">
                        <div class="item-details">
                            <strong>AUC-2024-004 - Truck LKC-7890</strong>
                            <div class="item-meta">Publish: Sep 01 | Start: Sep 05, 10:00 | End: Sep 10, 15:00</div>
                            <div class="item-description">Reserve: LKR 15,000 | 2017 Mitsubishi Canter</div>
                        </div>
                        <div class="item-actions">
                            <span class="status-badge status-scheduled">Scheduled</span>
                            <button class="btn btn-secondary btn-small" type="button" data-action="edit-schedule" data-auction-id="AUC-2024-004"><i class="fas fa-edit"></i> Edit</button>
                            <button class="btn btn-success btn-small" type="button" data-action="publish-auction" data-auction-id="AUC-2024-004"><i class="fas fa-bullhorn"></i> Publish</button>
                        </div>
                    </div>
                    <div class="item-card" data-status="scheduled" data-period="this-week">
                        <div class="item-details">
                            <strong>AUC-2024-005 - Excavator EX-003</strong>
                            <div class="item-meta">Publish: Sep 03 | Start: Sep 08, 09:00 | End: Sep 13, 12:00</div>
                            <div class="item-description">Reserve: LKR 25,000 | 2016 Caterpillar 315D</div>
                        </div>
                        <div class="item-actions">
                            <span class="status-badge status-scheduled">Scheduled</span>
                            <button class="btn btn-secondary btn-small" type="button" data-action="edit-schedule" data-auction-id="AUC-2024-005"><i class="fas fa-edit"></i> Edit</button>
                            <button class="btn btn-success btn-small" type="button" data-action="publish-auction" data-auction-id="AUC-2024-005"><i class="fas fa-bullhorn"></i> Publish</button>
                        </div>
                    </div>
                    <div class="item-card" data-status="scheduled" data-period="this-week">
                        <div class="item-details">
                            <strong>AUC-2024-006 - Generator GEN-002</strong>
                            <div class="item-meta">Publish: Sep 05 | Start: Sep 10, 14:00 | End: Sep 15, 16:00</div>
                            <div class="item-description">Reserve: LKR 8,000 | 2015 Perkins 100kVA</div>
                        </div>
                        <div class="item-actions">
                            <span class="status-badge status-scheduled">Scheduled</span>
                            <button class="btn btn-secondary btn-small" type="button" data-action="edit-schedule" data-auction-id="AUC-2024-006"><i class="fas fa-edit"></i> Edit</button>
                            <button class="btn btn-success btn-small" type="button" data-action="publish-auction" data-auction-id="AUC-2024-006"><i class="fas fa-bullhorn"></i> Publish</button>
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
                this.filterSchedule(button.dataset.filter, button);
                return;
            }

            if (button.dataset.action === 'edit-schedule') {
                this.emitToast(`Editing schedule for ${button.dataset.auctionId}`);
                return;
            }

            if (button.dataset.action === 'publish-auction') {
                this.emitToast(`Publishing ${button.dataset.auctionId}`);
            }
        });
    }

    filterSchedule(criteria, activeButton) {
        const cards = this.querySelectorAll('#scheduleContainer .item-card');
        let visibleCount = 0;

        cards.forEach((card) => {
            const cardStatus = card.dataset.status;
            const cardPeriod = card.dataset.period;
            let shouldShow = false;

            if (criteria === 'all') {
                shouldShow = true;
            } else if (criteria === 'scheduled' && cardStatus === 'scheduled') {
                shouldShow = true;
            } else if (criteria === 'published' && cardStatus === 'published') {
                shouldShow = true;
            } else if (criteria === 'this-week' && cardPeriod === 'this-week') {
                shouldShow = true;
            }

            card.style.display = shouldShow ? 'flex' : 'none';
            if (shouldShow) {
                visibleCount += 1;
            }
        });

        this.updateFilterButtons(activeButton);
        this.emitToast(`Showing ${visibleCount} scheduled auctions`);
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

customElements.define('auction-schedule', AuctionSchedule);
