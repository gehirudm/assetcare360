class AuctionRegisterBidderModal extends HTMLElement {
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
            <div id="registerBidderModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <button class="close" type="button" data-close-modal>&times;</button>
                    <h2 style="margin-bottom: 20px; color: var(--tang-blue);">Register Bidder</h2>
                    <form id="registerBidderForm">
                        <div class="form-section">
                            <h5><i class="fas fa-user"></i> Bidder Information</h5>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Full Name *</label>
                                    <input type="text" class="form-input" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Email *</label>
                                    <input type="email" class="form-input" required>
                                </div>
                            </div>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Phone *</label>
                                    <input type="tel" class="form-input" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Type *</label>
                                    <select class="form-select" required>
                                        <option value="">Select Type</option>
                                        <option>Individual</option>
                                        <option>Company</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Company</label>
                                    <input type="text" class="form-input" placeholder="If applicable">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Verification Status *</label>
                                    <select class="form-select" required>
                                        <option value="">Select Status</option>
                                        <option>Pending</option>
                                        <option>Verified</option>
                                        <option>Rejected</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary">Register Bidder</button>
                        <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#registerBidderModal');
        const form = this.querySelector('#registerBidderForm');

        this.addEventListener('click', (event) => {
            if (event.target === modal || event.target.closest('[data-close-modal]')) {
                this.close();
            }
        });

        if (form) {
            form.addEventListener('submit', (event) => {
                event.preventDefault();
                this.emitToast('Bidder registered successfully');
                this.close();
                form.reset();
            });
        }
    }

    open() {
        const modal = this.querySelector('#registerBidderModal');
        if (modal) {
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
        }
    }

    close() {
        const modal = this.querySelector('#registerBidderModal');
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

customElements.define('auction-register-bidder-modal', AuctionRegisterBidderModal);
