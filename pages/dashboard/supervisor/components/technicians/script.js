class SupervisorTechnicians extends HTMLElement {
    constructor() {
        super();
        this._onRootClick = this._onRootClick.bind(this);
    }

    connectedCallback() {
        if (this._initialized) return;

        this.render();
        this.addEventListener('click', this._onRootClick);
        this._initialized = true;
    }

    disconnectedCallback() {
        this.removeEventListener('click', this._onRootClick);
    }

    _onRootClick(event) {
        const viewButton = event.target.closest('button[data-technician-view]');
        if (!viewButton) return;

        const technicianId = Number(viewButton.dataset.technicianView);
        if (!technicianId) return;

        this.dispatchEvent(new CustomEvent('supervisor-technicians:view', {
            bubbles: true,
            detail: { technicianId }
        }));
    }

    setLoading() {
        const list = this.querySelector('#technicianAssignmentsTable');
        if (!list) return;

        list.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 18px;"><i class="fas fa-spinner fa-spin"></i> Loading technicians...</p>';
    }

    setEmpty() {
        const list = this.querySelector('#technicianAssignmentsTable');
        if (!list) return;

        list.innerHTML = `
            <div style="padding: 24px; text-align: center; color: var(--muted);">
                <i class="fas fa-user-slash" style="font-size: 24px; margin-bottom: 10px;"></i>
                <p>No active technicians found.</p>
            </div>
        `;
    }

    setError(message = 'Failed to load technicians. Please try again.') {
        const list = this.querySelector('#technicianAssignmentsTable');
        if (!list) return;

        list.innerHTML = `<p style="text-align: center; color: var(--danger); padding: 18px;">${message}</p>`;
    }

    renderTechnicians(items) {
        const list = this.querySelector('#technicianAssignmentsTable');
        if (!list) return;

        if (!Array.isArray(items) || items.length === 0) {
            this.setEmpty();
            return;
        }

        list.innerHTML = items.map(item => `
            <div class="inventory-item" data-id="${item.id}">
                <div class="item-details">
                    <strong><i class="fas fa-user-cog"></i> ${item.technicianName}</strong>
                    <div class="item-meta">
                        <i class="fas fa-wrench"></i> ${item.expertise} |
                        <i class="fas fa-tasks"></i> ${item.assignmentLabel}
                    </div>
                    <div class="item-meta">
                        <span class="status-text ${item.workloadClass}">${item.workloadLabel}</span> |
                        <i class="fas fa-ticket-alt"></i> ${item.statusSummary}
                    </div>
                </div>
                <div class="item-actions">
                    <div class="action-buttons">
                        <button type="button" class="btn btn-primary btn-small" data-technician-view="${item.id}">
                            <i class="fas fa-eye"></i> VIEW
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-user-cog"></i> Technicians</h2>
                <p class="page-subtitle">View technical officers, their assigned tickets, and current ticket status</p>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-clipboard-list"></i> Technicians</span>
                </div>
                <div id="technicianAssignmentsTable" class="inventory-list">
                    <p style="text-align: center; color: var(--muted); padding: 18px;">
                        <i class="fas fa-spinner fa-spin"></i> Loading technicians...
                    </p>
                </div>
            </div>
        `;
    }
}

if (!customElements.get('supervisor-technicians')) {
    customElements.define('supervisor-technicians', SupervisorTechnicians);
}
