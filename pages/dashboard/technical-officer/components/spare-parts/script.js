class TOSpareParts extends HTMLElement {
    constructor() {
        super();
        this._allRequests = [];
        this.currentFilter = 'all';
        this._onRootClick = this._onRootClick.bind(this);
    }

    connectedCallback() {
        if (this._initialized) return;

        this.render();
        this.addEventListener('click', this._onRootClick);
        this._initialized = true;
        this.loadRequests();
    }

    disconnectedCallback() {
        this.removeEventListener('click', this._onRootClick);
    }

    async refresh() {
        await this.loadRequests();
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Spare Part Management</h1>
                <p class="page-subtitle">Request and track spare parts</p>
            </div>

            <div class="filter-controls" data-role="filters">
                <button type="button" class="filter-btn active" data-filter="all">All</button>
                <button type="button" class="filter-btn" data-filter="Pending">Pending</button>
                <button type="button" class="filter-btn" data-filter="Approved">Approved</button>
                <button type="button" class="filter-btn" data-filter="Rejected">Rejected</button>
                <button type="button" class="filter-btn" data-filter="Issued">Issued</button>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-tools"></i> My Parts Requests</span>
                    <span class="status-badge status-normal" data-role="count">Loading...</span>
                </div>
                <div data-role="list" class="inventory-list">
                    <div style="text-align:center;padding:40px;color:var(--muted);">
                        <i class="fas fa-spinner fa-spin" style="font-size:2rem;"></i>
                        <p style="margin-top:15px;">Loading requests...</p>
                    </div>
                </div>
            </div>
        `;
    }

    async loadRequests() {
        const list = this.querySelector('[data-role="list"]');
        const count = this.querySelector('[data-role="count"]');
        if (list) list.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted);"><i class="fas fa-spinner fa-spin" style="font-size:2rem;"></i><p style="margin-top:15px;">Loading requests...</p></div>`;
        if (count) count.textContent = 'Loading...';

        try {
            const response = await API.get('/spare-part-requests');

            if (response.status !== 'success') {
                throw new Error(response.message || 'Failed to load requests');
            }

            this._allRequests = Array.isArray(response.data) ? response.data : [];
            this._renderCards();
        } catch (error) {
            console.error('TOSpareParts: failed to load requests', error);
            const list = this.querySelector('[data-role="list"]');
            if (list) list.innerHTML = `<div style="text-align:center;padding:40px;color:var(--danger);"><i class="fas fa-exclamation-triangle" style="font-size:2rem;margin-bottom:15px;"></i><p>Failed to load spare part requests</p></div>`;
            if (count) count.textContent = '0 requests';
        }
    }

    _statusStyle(status) {
        const map = {
            pending:  { bg: '#f59e0b', color: '#000' },
            approved: { bg: '#10b981', color: '#fff' },
            rejected: { bg: '#ef4444', color: '#fff' },
            issued:   { bg: '#3b82f6', color: '#fff' },
        };
        return map[(status || '').toLowerCase()] || { bg: '#6b7280', color: '#fff' };
    }

    _formatDate(d) {
        if (!d) return 'N/A';
        return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    _approvalTrail(req) {
        const s = (req.status || '').toLowerCase();
        const submitted = `<span class="trail-step trail-done"><i class="fas fa-check-circle"></i> Submitted ${this._formatDate(req.created_at)}</span>`;
        const arrow = `<span class="trail-arrow"><i class="fas fa-chevron-right"></i></span>`;
        const reviewer = req.reviewed_by_name ? ` by ${req.reviewed_by_name}` : '';
        const reviewDate = req.reviewed_at ? ` on ${this._formatDate(req.reviewed_at)}` : '';
        if (s === 'pending')  return `<div class="approval-trail">${submitted}${arrow}<span class="trail-step trail-pending"><i class="fas fa-hourglass-half"></i> Awaiting IM Review</span></div>`;
        if (s === 'approved') return `<div class="approval-trail">${submitted}${arrow}<span class="trail-step trail-done"><i class="fas fa-check-double"></i> Approved${reviewer}${reviewDate}</span></div>`;
        if (s === 'issued')   return `<div class="approval-trail">${submitted}${arrow}<span class="trail-step trail-done"><i class="fas fa-check-double"></i> Approved${reviewer}</span>${arrow}<span class="trail-step trail-issued"><i class="fas fa-box-open"></i> Parts Issued</span></div>`;
        if (s === 'rejected') return `<div class="approval-trail">${submitted}${arrow}<span class="trail-step trail-rejected"><i class="fas fa-times-circle"></i> Rejected${reviewer}${reviewDate}</span></div>`;
        return '';
    }

    _renderCards() {
        const list = this.querySelector('[data-role="list"]');
        if (!list) return;

        if (this._allRequests.length === 0) {
            list.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted);"><i class="fas fa-inbox" style="font-size:3rem;margin-bottom:15px;"></i><p>No spare part requests yet</p></div>`;
            this._updateCount(0);
            return;
        }

        const visible = this._filtered();

        list.innerHTML = visible.length === 0
            ? `<p style="text-align:center;padding:40px;color:var(--muted);">No requests match this filter</p>`
            : visible.map(req => {
                const sc = this._statusStyle(req.status);
                const ticketLabel = req.ticket_id_formatted || req.fault_ticket_code || `#${req.fault_ticket_id}`;
                const items = Array.isArray(req.items) ? req.items : [];
                const isRejected = (req.status || '').toLowerCase() === 'rejected';
                return `
                    <div class="inventory-item" data-id="${req.id}" data-status="${(req.status || '').toLowerCase()}">
                        <div class="item-details">
                            <strong><i class="fas fa-clipboard-list"></i> ${ticketLabel}</strong>
                            <div class="item-meta"><i class="fas fa-wrench"></i> ${req.equipment_name || 'N/A'} &nbsp;|&nbsp; <i class="fas fa-map-marker-alt"></i> ${req.location || 'N/A'}</div>
                            <div class="item-meta"><i class="fas fa-boxes"></i> ${items.length} part${items.length !== 1 ? 's' : ''} &mdash; ${items.map(i => `${i.part_name || i.part_code}&times;${i.quantity}`).join(', ') || 'No items'}</div>
                            <div class="item-meta"><i class="fas fa-calendar"></i> Submitted: ${this._formatDate(req.created_at)}</div>
                            <div class="item-description">
                                <span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;background:${sc.bg};color:${sc.color};">${req.status || 'Pending'}</span>
                                ${isRejected && req.review_notes ? `<span style="font-size:12px;color:#dc2626;margin-left:8px;"><i class="fas fa-times-circle"></i> ${req.review_notes}</span>` : ''}
                            </div>
                            ${this._approvalTrail(req)}
                        </div>
                        <div class="item-actions">
                            <div class="action-buttons">
                                <button class="btn btn-small btn-primary" data-view-id="${req.id}"><i class="fas fa-eye"></i> VIEW</button>
                                ${isRejected ? `<button class="btn btn-small" data-rerequest-ticket="${req.fault_ticket_id}" style="background:#3b82f6;color:#fff;"><i class="fas fa-redo"></i> Re-request</button>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

        this._updateCount(visible.length);
    }

    _filtered() {
        if (this.currentFilter === 'all') return this._allRequests;
        return this._allRequests.filter(r => r.status === this.currentFilter);
    }

    _updateCount(n) {
        const count = this.querySelector('[data-role="count"]');
        if (count) count.textContent = `${n} request${n !== 1 ? 's' : ''}`;
    }

    _onRootClick(event) {
        const viewBtn = event.target.closest('button[data-view-id]');
        if (viewBtn) {
            event.stopPropagation();
            const requestId = parseInt(viewBtn.dataset.viewId, 10);
            this.dispatchEvent(new CustomEvent('technical-officer-spare-parts:view', {
                bubbles: true,
                detail: { requestId }
            }));
            return;
        }

        const rereqBtn = event.target.closest('button[data-rerequest-ticket]');
        if (rereqBtn) {
            event.stopPropagation();
            const ticketId = parseInt(rereqBtn.dataset.rerequestTicket, 10);
            this.dispatchEvent(new CustomEvent('technical-officer-spare-parts:re-request', {
                bubbles: true,
                detail: { ticketId }
            }));
            return;
        }

        const filterBtn = event.target.closest('button[data-filter]');
        if (filterBtn) {
            this.currentFilter = filterBtn.dataset.filter || 'all';
            this.querySelectorAll('button[data-filter]').forEach(b => b.classList.toggle('active', b.dataset.filter === this.currentFilter));
            this._renderCards();
        }
    }
}

if (!customElements.get('to-spare-parts')) {
    customElements.define('to-spare-parts', TOSpareParts);
}
