class AuctionBiddersModal extends HTMLElement {
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
            <div id="auctionBiddersModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <button class="close" type="button" data-close-modal>&times;</button>
                    <h2 id="auctionBiddersTitle" style="margin-bottom: 20px; color: var(--tang-blue);">Bidders</h2>
                    <div id="auctionBiddersBody"></div>
                    <button type="button" class="btn btn-secondary" data-close-modal>Close</button>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#auctionBiddersModal');

        this.addEventListener('click', (event) => {
            if (event.target === modal || event.target.closest('[data-close-modal]')) {
                this.close();
            }
        });
    }

    open(auctionId) {
        const modal = this.querySelector('#auctionBiddersModal');
        const title = this.querySelector('#auctionBiddersTitle');
        const body = this.querySelector('#auctionBiddersBody');

        if (title) {
            title.textContent = `Bidders for ${auctionId}`;
        }

        if (body) {
            body.innerHTML = `
                <div class="form-section">
                    <h5><i class="fas fa-users"></i> Registered Bidders (12)</h5>
                    <div style="margin-bottom: 8px;">
                        <strong>Active Bidders:</strong><br><br>
                        <strong>BID-032</strong> - M. Jayasekara | Individual<br>
                        Last Bid: LKR 18,500 (5 min ago) | Total Bids: 8<br><br>
                        <strong>BID-014</strong> - Next Motors (Pvt) | Company<br>
                        Last Bid: LKR 18,400 (12 min ago) | Total Bids: 6<br><br>
                        <strong>BID-045</strong> - R. Fernando | Individual<br>
                        Last Bid: LKR 18,200 (1 hour ago) | Total Bids: 5
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
        const modal = this.querySelector('#auctionBiddersModal');
        if (modal) {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        }
    }
}

customElements.define('auction-bidders-modal', AuctionBiddersModal);
