class TOSpareParts extends HTMLElement {
    constructor() {
        super();
        this.currentFilter = 'all';
        this._onRootClick = this._onRootClick.bind(this);
    }

    connectedCallback() {
        if (this._initialized) return;

        this.render();
        this.addEventListener('click', this._onRootClick);
        this._initialized = true;
        this.applyFilter('all');
    }

    disconnectedCallback() {
        this.removeEventListener('click', this._onRootClick);
    }

    refresh() {
        this.applyFilter(this.currentFilter);
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Spare Part Management</h1>
                <p class="page-subtitle">Request and track spare parts</p>
            </div>

            <div style="margin-bottom: 20px;">
                <button type="button" class="btn btn-primary" data-open-request-modal>
                    Request New Parts
                </button>
            </div>

            <div class="filter-controls" data-role="filters">
                <button type="button" class="filter-btn active" data-filter="all">All Requests</button>
                <button type="button" class="filter-btn" data-filter="approved">Approved</button>
                <button type="button" class="filter-btn" data-filter="pending">Pending</button>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-tools"></i> My Parts Requests</span>
                    <span class="status-badge status-normal" data-role="count">0 requests</span>
                </div>
                <div class="inventory-list" data-role="list"></div>
                <div data-role="empty" style="display: none; text-align: center; color: var(--muted); padding: 20px;">
                    No parts requests found for this filter
                </div>
            </div>
        `;
    }

    _onRootClick(event) {
        const openButton = event.target.closest('button[data-open-request-modal]');
        if (openButton) {
            this.dispatchEvent(new CustomEvent('technical-officer-spare-parts:open-request-modal', {
                bubbles: true
            }));
            return;
        }

        const filterButton = event.target.closest('button[data-filter]');
        if (filterButton) {
            this.applyFilter(filterButton.dataset.filter || 'all');
        }
    }

    applyFilter(status) {
        this.currentFilter = status;

        this.querySelectorAll('button[data-filter]').forEach(button => {
            button.classList.toggle('active', button.dataset.filter === this.currentFilter);
        });

        const list = this.querySelector('[data-role="list"]');
        const empty = this.querySelector('[data-role="empty"]');
        const count = this.querySelector('[data-role="count"]');

        if (!list || !empty || !count) return;

        const requests = list.querySelectorAll('.request-item');
        let visibleCount = 0;

        requests.forEach(request => {
            const requestStatus = request.getAttribute('data-status');
            if (status === 'all' || requestStatus === status) {
                request.style.display = '';
                visibleCount += 1;
            } else {
                request.style.display = 'none';
            }
        });

        empty.style.display = visibleCount === 0 ? 'block' : 'none';
        count.textContent = `${visibleCount} request${visibleCount !== 1 ? 's' : ''}`;
    }
}

if (!customElements.get('to-spare-parts')) {
    customElements.define('to-spare-parts', TOSpareParts);
}
