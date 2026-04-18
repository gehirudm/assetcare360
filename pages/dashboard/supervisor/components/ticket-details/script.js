class SupervisorTicketDetailView extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this._ticketId = null;
        this._returnSection = this.defaultReturnSection;
        this.render();
    }

    get defaultReturnSection() {
        return String(this.getAttribute('default-return-section') || 'fault-ticket-tracking').trim() || 'fault-ticket-tracking';
    }

    render() {
        this.innerHTML = `
            <div class="card" style="padding:20px;">
                <div style="display:flex; align-items:center; gap:10px; color: var(--muted);">
                    <i class="fas fa-ticket-alt"></i>
                    <span>Select a ticket from the list to open details.</span>
                </div>
            </div>
        `;
    }

    buildReturnPath(returnSection) {
        const currentUrl = new URL(window.location.href);
        const returnUrl = new URL(currentUrl.pathname, window.location.origin);
        returnUrl.searchParams.set('section', returnSection || this.defaultReturnSection);
        return `${returnUrl.pathname}${returnUrl.search}`;
    }

    buildTicketDetailPath(ticketId, returnSection, focusHash) {
        const detailUrl = new URL('../../view-ticket/index.html', window.location.href);
        detailUrl.searchParams.set('id', String(ticketId));
        detailUrl.searchParams.set('return_to', this.buildReturnPath(returnSection));
        detailUrl.searchParams.set('role_override', 'SUPERVISOR');

        const hash = String(focusHash || '').trim().replace(/^#/, '');
        return hash ? `${detailUrl.pathname}${detailUrl.search}#${encodeURIComponent(hash)}` : `${detailUrl.pathname}${detailUrl.search}`;
    }

    open(ticketId, options = {}) {
        const numericTicketId = Number(ticketId);
        if (!Number.isFinite(numericTicketId) || numericTicketId <= 0) {
            this.dispatchEvent(new CustomEvent('supervisor-ticket-detail-view:toast', {
                bubbles: true,
                detail: {
                    message: 'Invalid ticket ID',
                    type: 'error'
                }
            }));
            return;
        }

        const returnSection = String(options.returnSection || this.defaultReturnSection).trim() || this.defaultReturnSection;
        this._ticketId = numericTicketId;
        this._returnSection = returnSection;

        window.location.href = this.buildTicketDetailPath(numericTicketId, returnSection, options.focusHash || '');
    }

    refresh() {
        // No-op by design: ticket details render in actor-owned view-ticket page.
    }

    closeView() {
        this._ticketId = null;
    }
}

if (!customElements.get('supervisor-ticket-detail-view')) {
    customElements.define('supervisor-ticket-detail-view', SupervisorTicketDetailView);
}
