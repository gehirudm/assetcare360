class TOServiceWarranty extends HTMLElement {
    constructor() {
        super();
        this.currentFilter = 'all';
        this._onRootClick = this._onRootClick.bind(this);
        this._onSubmit = this._onSubmit.bind(this);
    }

    connectedCallback() {
        if (this._initialized) return;

        this.render();
        this.addEventListener('click', this._onRootClick);
        this.addEventListener('submit', this._onSubmit);
        this._initialized = true;
        this.applyFilter('all');
    }

    disconnectedCallback() {
        this.removeEventListener('click', this._onRootClick);
        this.removeEventListener('submit', this._onSubmit);
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Service & Warranty Handling</h1>
                <p class="page-subtitle">Track service timelines and claim warranties</p>
            </div>

            <div style="margin-bottom: 20px;">
                <button type="button" class="btn btn-primary" data-open-modal>
                    Claim Warranty
                </button>
            </div>

            <div class="filter-controls" data-role="filters">
                <button type="button" class="filter-btn active" data-filter="all">All Claims</button>
                <button type="button" class="filter-btn" data-filter="approved">Approved</button>
                <button type="button" class="filter-btn" data-filter="pending">Pending</button>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-shield-alt"></i> Warranty Claims</span>
                    <span class="status-badge status-normal" data-role="count">0 claims</span>
                </div>
                <div class="inventory-list" data-role="claims"></div>
                <div data-role="empty" style="display: none; text-align: center; color: var(--muted); padding: 20px;">
                    No warranty claims found for this filter
                </div>
            </div>

            <div class="modal" data-role="modal">
                <div class="modal-content">
                    <button type="button" class="close" data-close-modal>&times;</button>
                    <h2 style="margin-bottom: 20px; color: var(--tang-blue);">Claim Warranty</h2>
                    <form id="toWarrantyClaimForm">
                        <div class="form-section">
                            <h5><i class="fas fa-shield-alt"></i> Warranty Information</h5>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Part Number</label>
                                    <input type="text" class="form-input" placeholder="Enter part number" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Equipment ID</label>
                                    <input type="text" class="form-input" placeholder="Equipment identifier" required>
                                </div>
                            </div>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Purchase Date</label>
                                    <input type="date" class="form-input" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Warranty Period (months)</label>
                                    <input type="number" class="form-input" min="1" max="60" required>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Defect Description</label>
                                <textarea class="form-textarea" placeholder="Describe the defect or failure..." required></textarea>
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary">Submit Warranty Claim</button>
                    </form>
                </div>
            </div>
        `;
    }

    _onRootClick(event) {
        const openButton = event.target.closest('[data-open-modal]');
        if (openButton) {
            this.openModal();
            return;
        }

        const closeButton = event.target.closest('[data-close-modal]');
        if (closeButton) {
            this.closeModal();
            return;
        }

        const filterButton = event.target.closest('button[data-filter]');
        if (filterButton) {
            this.applyFilter(filterButton.dataset.filter || 'all');
            return;
        }

        const modal = this.querySelector('[data-role="modal"]');
        if (modal && event.target === modal) {
            this.closeModal();
        }
    }

    _onSubmit(event) {
        if (event.target.id !== 'toWarrantyClaimForm') return;

        event.preventDefault();
        event.target.reset();
        this.closeModal();

        this.dispatchEvent(new CustomEvent('technical-officer-service-warranty:submitted', {
            bubbles: true,
            detail: {
                message: 'Warranty claim submitted to Inventory Manager!'
            }
        }));
    }

    applyFilter(status) {
        this.currentFilter = status;

        this.querySelectorAll('button[data-filter]').forEach(button => {
            button.classList.toggle('active', button.dataset.filter === this.currentFilter);
        });

        const claims = this.querySelectorAll('[data-role="claims"] .request-item');
        const empty = this.querySelector('[data-role="empty"]');
        const count = this.querySelector('[data-role="count"]');
        let visibleCount = 0;

        claims.forEach(claim => {
            const claimStatus = claim.getAttribute('data-status');
            if (status === 'all' || claimStatus === status) {
                claim.style.display = '';
                visibleCount += 1;
            } else {
                claim.style.display = 'none';
            }
        });

        if (empty) {
            empty.style.display = visibleCount === 0 ? 'block' : 'none';
        }

        if (count) {
            count.textContent = `${visibleCount} claim${visibleCount !== 1 ? 's' : ''}`;
        }
    }

    openModal() {
        const modal = this.querySelector('[data-role="modal"]');
        if (!modal) return;
        modal.classList.add('active');
    }

    closeModal() {
        const modal = this.querySelector('[data-role="modal"]');
        if (!modal) return;
        modal.classList.remove('active');
    }
}

if (!customElements.get('to-service-warranty')) {
    customElements.define('to-service-warranty', TOServiceWarranty);
}
