class AuctionScheduleAuctionModal extends HTMLElement {
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
            <div id="scheduleAuctionModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <button class="close" type="button" data-close-modal>&times;</button>
                    <h2 style="margin-bottom: 20px; color: var(--tang-blue);">Schedule Auction</h2>
                    <form id="scheduleAuctionForm">
                        <div class="form-section">
                            <h5><i class="fas fa-calendar-alt"></i> Timing</h5>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Auction ID *</label>
                                    <input type="text" name="auctionId" class="form-input" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Publish On *</label>
                                    <input type="datetime-local" name="publishOn" class="form-input" required>
                                </div>
                            </div>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Start Time *</label>
                                    <input type="datetime-local" name="startTime" class="form-input" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">End Time *</label>
                                    <input type="datetime-local" name="endTime" class="form-input" required>
                                </div>
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary">Save Schedule</button>
                        <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#scheduleAuctionModal');
        const form = this.querySelector('#scheduleAuctionForm');

        this.addEventListener('click', (event) => {
            if (event.target === modal || event.target.closest('[data-close-modal]')) {
                this.close();
            }
        });

        if (form) {
            form.addEventListener('submit', (event) => {
                event.preventDefault();
                this.emitToast('Auction schedule saved');
                this.close();
                form.reset();
            });
        }
    }

    open(prefill = {}) {
        const modal = this.querySelector('#scheduleAuctionModal');
        const auctionIdInput = this.querySelector('input[name="auctionId"]');

        if (auctionIdInput && prefill.auctionId) {
            auctionIdInput.value = prefill.auctionId;
        }

        if (modal) {
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
        }
    }

    close() {
        const modal = this.querySelector('#scheduleAuctionModal');
        if (modal) {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    emitToast(message, type = 'success') {
        this.dispatchEvent(new CustomEvent('auction-ui:toast', {
            bubbles: true,
            detail: { message, type },
        }));
    }
}

customElements.define('auction-schedule-auction-modal', AuctionScheduleAuctionModal);
