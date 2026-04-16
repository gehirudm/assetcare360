class AuctionCreateAuctionModal extends HTMLElement {
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
            <div id="createAuctionModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <button class="close" type="button" data-close-modal>&times;</button>
                    <h2 style="margin-bottom: 20px; color: var(--tang-blue);">Create New Auction</h2>
                    <form id="createAuctionForm">
                        <div class="form-section">
                            <h5><i class="fas fa-id-card"></i> Basic Details</h5>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Auction ID *</label>
                                    <input type="text" name="auctionId" class="form-input" placeholder="AUC-2024-010" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Asset *</label>
                                    <input type="text" name="asset" class="form-input" placeholder="Truck LKC-7890" required>
                                </div>
                            </div>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Reserve Price (LKR) *</label>
                                    <input type="number" name="reservePrice" class="form-input" min="0" step="0.01" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Start Time *</label>
                                    <input type="datetime-local" name="startTime" class="form-input" required>
                                </div>
                            </div>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">End Time *</label>
                                    <input type="datetime-local" name="endTime" class="form-input" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Bid Increment (LKR)</label>
                                    <input type="number" name="bidIncrement" class="form-input" min="1" step="1" value="100">
                                </div>
                            </div>
                        </div>
                        <div class="form-section">
                            <h5><i class="fas fa-sticky-note"></i> Notes</h5>
                            <textarea class="form-textarea" name="notes" placeholder="Inspection notes, disclosures, etc."></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary">Create Auction</button>
                        <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#createAuctionModal');
        const form = this.querySelector('#createAuctionForm');

        this.addEventListener('click', (event) => {
            if (event.target === modal || event.target.closest('[data-close-modal]')) {
                this.close();
            }
        });

        if (form) {
            form.addEventListener('submit', (event) => {
                event.preventDefault();
                this.emitToast('Auction created successfully');
                this.close();
                form.reset();
            });
        }
    }

    open(prefill = {}) {
        const modal = this.querySelector('#createAuctionModal');
        const assetInput = this.querySelector('input[name="asset"]');

        if (assetInput && prefill.assetName) {
            assetInput.value = prefill.assetName;
        }

        if (modal) {
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
        }
    }

    close() {
        const modal = this.querySelector('#createAuctionModal');
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

customElements.define('auction-create-auction-modal', AuctionCreateAuctionModal);
