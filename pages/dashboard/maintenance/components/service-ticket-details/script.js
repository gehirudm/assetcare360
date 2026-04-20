class MaintenanceServiceTicketDetailView extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this._ticketId = null;
        this._ticket = null;
        this._returnSection = this.defaultReturnSection;

        this.ensureScopedStyles();
        this.bindEvents();
        this.renderPlaceholder();
    }

    get defaultReturnSection() {
        return String(this.getAttribute('default-return-section') || 'service-tickets').trim() || 'service-tickets';
    }

    ensureScopedStyles() {
        if (document.getElementById('maintenance-service-ticket-detail-view-style')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'maintenance-service-ticket-detail-view-style';
        style.textContent = `
            maintenance-service-ticket-detail-view {
                display: block;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-shell {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-subheader {
                padding: 12px 0 4px;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-subheader-inner {
                display: flex;
                align-items: center;
                gap: 16px;
                flex-wrap: wrap;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-back,
            maintenance-service-ticket-detail-view .service-ticket-detail-breadcrumb-link {
                width: 36px;
                height: 36px;
                border-radius: 8px;
                border: 1.5px solid var(--stone-200);
                background: var(--card);
                color: var(--text-700);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.95rem;
                transition: all 0.2s;
                flex-shrink: 0;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-back:hover {
                background: var(--stone-200);
                color: var(--text-900);
                transform: translateX(-2px);
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-title-block {
                min-width: 280px;
                flex: 1;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-breadcrumb {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 0.8rem;
                margin-bottom: 6px;
                flex-wrap: wrap;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-breadcrumb-item {
                color: var(--muted);
                font-weight: 500;
                display: inline-flex;
                align-items: center;
                gap: 5px;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-breadcrumb-link {
                width: auto;
                height: auto;
                padding: 0;
                border: 0;
                background: transparent;
                border-radius: 0;
                color: var(--muted);
                cursor: pointer;
                font-size: 0.8rem;
                font-weight: 600;
                text-decoration: underline;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-breadcrumb-link:hover {
                color: var(--royal-blue);
                transform: none;
                background: transparent;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-breadcrumb-current {
                color: var(--text-900);
                font-weight: 700;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-breadcrumb-sep {
                font-size: 0.62rem;
                color: var(--muted);
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-title {
                margin: 0;
                color: var(--tang-blue);
                font-size: 1.35rem;
                font-weight: 700;
                display: inline-flex;
                align-items: center;
                gap: 10px;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-subtitle {
                margin: 6px 0 0;
                color: var(--muted);
                font-size: 0.9rem;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-overview-card {
                border: 1px solid #dbeafe;
                background: linear-gradient(135deg, #f8fbff 0%, #ffffff 58%);
                padding: 22px;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-overview-head {
                display: flex;
                justify-content: space-between;
                gap: 12px;
                align-items: flex-start;
                flex-wrap: wrap;
                margin-bottom: 14px;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-overview-ticket {
                color: var(--tang-blue);
                font-size: 1.15rem;
                font-weight: 800;
                letter-spacing: 0.2px;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-status-row {
                display: flex;
                gap: 8px;
                align-items: center;
                flex-wrap: wrap;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-overview-grid {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 12px;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-overview-item {
                border: 1px solid var(--stone-200);
                border-radius: 10px;
                background: #fff;
                padding: 10px;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-overview-label {
                font-size: 0.72rem;
                text-transform: uppercase;
                letter-spacing: 0.4px;
                color: var(--muted);
                font-weight: 700;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-overview-value {
                font-size: 0.92rem;
                color: var(--text-900);
                font-weight: 600;
                line-height: 1.4;
                word-break: break-word;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-overview-description {
                margin-top: 14px;
                border-top: 1px solid #dbeafe;
                padding-top: 12px;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-overview-description p {
                margin: 4px 0 0;
                color: var(--text-700);
                line-height: 1.6;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-flow {
                background: var(--card);
                border: 1px solid var(--stone-200);
                border-radius: 14px;
                box-shadow: var(--shadow);
                padding: 18px;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-flow-title {
                margin: 0 0 12px;
                font-size: 1rem;
                color: var(--tang-blue);
                font-weight: 700;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-flow-grid {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 10px;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-flow-step {
                border: 1px solid var(--stone-200);
                border-radius: 12px;
                background: #f9fbff;
                padding: 10px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                min-height: 122px;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-flow-step.is-complete {
                border-color: #bbf7d0;
                background: #f0fdf4;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-flow-step.is-active {
                border-color: #bfdbfe;
                background: #eff6ff;
                box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.25);
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-flow-step.is-cancelled {
                border-color: #fecaca;
                background: #fff1f2;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-flow-head {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 8px;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-flow-step-number {
                font-size: 0.72rem;
                color: var(--muted);
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.4px;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-flow-step-icon {
                width: 28px;
                height: 28px;
                border-radius: 999px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 0.78rem;
                background: #dbeafe;
                color: #1e40af;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-flow-step.is-complete .service-ticket-detail-flow-step-icon {
                background: #dcfce7;
                color: #166534;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-flow-step.is-cancelled .service-ticket-detail-flow-step-icon {
                background: #fee2e2;
                color: #b91c1c;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-flow-step-title {
                font-weight: 700;
                color: var(--text-900);
                font-size: 0.9rem;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-flow-step-note {
                margin: 0;
                font-size: 0.82rem;
                color: var(--text-700);
                line-height: 1.45;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-cancelled-note {
                margin-top: 10px;
                border: 1px solid #fecaca;
                background: #fff1f2;
                color: #9f1239;
                border-radius: 10px;
                padding: 10px 12px;
                font-size: 0.86rem;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-danger-actions {
                display: flex;
                justify-content: flex-end;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-layout {
                display: grid;
                grid-template-columns: minmax(0, 1.6fr) minmax(290px, 1fr);
                gap: 16px;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-main,
            maintenance-service-ticket-detail-view .service-ticket-detail-side {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-card {
                padding: 18px;
                border-radius: 14px;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-card-title {
                margin: 0 0 12px;
                font-size: 1rem;
                color: var(--tang-blue);
                font-weight: 700;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-info-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 10px;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-info-item {
                border: 1px solid var(--stone-200);
                border-radius: 10px;
                background: #fff;
                padding: 10px;
                display: flex;
                flex-direction: column;
                gap: 5px;
                min-height: 72px;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-info-label {
                font-size: 0.73rem;
                color: var(--muted);
                text-transform: uppercase;
                letter-spacing: 0.35px;
                font-weight: 700;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-info-value {
                font-size: 0.92rem;
                color: var(--text-900);
                font-weight: 600;
                line-height: 1.45;
                word-break: break-word;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-note-block {
                border: 1px solid var(--stone-200);
                border-left: 4px solid #dbeafe;
                background: #fafcff;
                border-radius: 10px;
                padding: 10px 12px;
                margin-top: 10px;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-note-title {
                display: block;
                font-size: 0.74rem;
                color: var(--muted);
                text-transform: uppercase;
                letter-spacing: 0.35px;
                font-weight: 700;
                margin-bottom: 5px;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-note-value {
                color: var(--text-700);
                line-height: 1.6;
                font-size: 0.9rem;
                white-space: pre-wrap;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-components {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 10px;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-component-chip {
                padding: 8px 10px;
                border: 1px solid var(--stone-200);
                border-radius: 8px;
                background: #fff;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-component-chip-comment {
                margin-top: 8px;
                font-size: 0.88rem;
                color: var(--text-700);
                white-space: pre-wrap;
            }

            maintenance-service-ticket-detail-view .warranty-active {
                background: #dcfce7;
                color: #166534;
            }

            maintenance-service-ticket-detail-view .warranty-expired {
                background: #fee2e2;
                color: #b91c1c;
            }

            maintenance-service-ticket-detail-view .warranty-unknown {
                background: #f3f4f6;
                color: #374151;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-empty-card,
            maintenance-service-ticket-detail-view .service-ticket-detail-loading-card,
            maintenance-service-ticket-detail-view .service-ticket-detail-error-card {
                padding: 20px;
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-empty-inner,
            maintenance-service-ticket-detail-view .service-ticket-detail-loading-inner {
                display: flex;
                align-items: center;
                gap: 10px;
                color: var(--muted);
            }

            maintenance-service-ticket-detail-view .service-ticket-detail-loading-inner {
                justify-content: center;
            }

            @media (max-width: 1180px) {
                maintenance-service-ticket-detail-view .service-ticket-detail-layout {
                    grid-template-columns: 1fr;
                }

                maintenance-service-ticket-detail-view .service-ticket-detail-side {
                    order: -1;
                }
            }

            @media (max-width: 860px) {
                maintenance-service-ticket-detail-view .service-ticket-detail-overview-grid,
                maintenance-service-ticket-detail-view .service-ticket-detail-flow-grid {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
            }

            @media (max-width: 640px) {
                maintenance-service-ticket-detail-view .service-ticket-detail-subheader {
                    padding-top: 6px;
                }

                maintenance-service-ticket-detail-view .service-ticket-detail-title {
                    font-size: 1.18rem;
                }

                maintenance-service-ticket-detail-view .service-ticket-detail-overview-grid,
                maintenance-service-ticket-detail-view .service-ticket-detail-flow-grid,
                maintenance-service-ticket-detail-view .service-ticket-detail-info-grid {
                    grid-template-columns: 1fr;
                }

                maintenance-service-ticket-detail-view .service-ticket-detail-card,
                maintenance-service-ticket-detail-view .service-ticket-detail-overview-card,
                maintenance-service-ticket-detail-view .service-ticket-detail-flow {
                    padding: 14px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionNode = event.target.closest('[data-action]');
            if (!actionNode) {
                return;
            }

            if (actionNode.dataset.action === 'back') {
                this.dispatchEvent(new CustomEvent('maintenance-service-ticket-detail-view:back', {
                    bubbles: true,
                    detail: {
                        returnSection: this._returnSection || this.defaultReturnSection,
                    },
                }));
                return;
            }

            if (actionNode.dataset.action === 'delete-ticket') {
                void this.handleDeleteTicket();
            }
        });
    }

    renderPlaceholder() {
        this.innerHTML = `
            <div class="card service-ticket-detail-empty-card">
                <div class="service-ticket-detail-empty-inner">
                    <i class="fas fa-file-alt"></i>
                    <span>Select a service ticket from Service Management or Service Report Management to open details.</span>
                </div>
            </div>
        `;
    }

    renderLoading(ticketId) {
        const label = ticketId ? `Loading ticket ${this.escapeHtml(ticketId)}...` : 'Loading service ticket details...';
        this.innerHTML = `
            <div class="card service-ticket-detail-loading-card">
                <div class="service-ticket-detail-loading-inner">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>${label}</span>
                </div>
            </div>
        `;
    }

    renderError(message) {
        this.innerHTML = `
            <div class="card service-ticket-detail-error-card">
                <div class="form-section" style="margin: 0;">
                    <h5><i class="fas fa-exclamation-triangle"></i> Unable to Load Service Ticket Details</h5>
                    <p style="margin: 0;">${this.escapeHtml(message)}</p>
                </div>
            </div>
        `;
    }

    async fetchTicketById(ticketId) {
        try {
            const response = await API.get(`/service-tickets/${encodeURIComponent(String(ticketId))}`);
            if (!response || response.status !== 'success' || !response.data) {
                return null;
            }

            return response.data;
        } catch (error) {
            console.error('Failed to load service ticket details:', error);
            return null;
        }
    }

    async open(ticketId, options = {}) {
        const normalizedTicketId = String(ticketId || '').trim();
        if (!normalizedTicketId) {
            this.emitToast('Invalid service ticket ID.', 'error');
            return;
        }

        this._ticketId = normalizedTicketId;
        this._returnSection = String(options.returnSection || this.defaultReturnSection).trim() || this.defaultReturnSection;

        this.renderLoading(normalizedTicketId);

        const ticket = await this.fetchTicketById(normalizedTicketId);
        if (!ticket) {
            this.renderError(`Service ticket ${this.escapeHtml(normalizedTicketId)} was not found.`);
            this.emitToast('Service ticket details are unavailable right now.', 'error');
            return;
        }

        this._ticket = ticket;
        this.renderTicket(ticket);
    }

    refresh() {
        if (!this._ticketId) {
            this.renderPlaceholder();
            return;
        }

        void this.open(this._ticketId, {
            returnSection: this._returnSection,
        });
    }

    closeView() {
        this._ticketId = null;
        this._ticket = null;
        this.renderPlaceholder();
    }

    emitToast(message, type = 'info') {
        this.dispatchEvent(new CustomEvent('maintenance-service-ticket-detail-view:toast', {
            bubbles: true,
            detail: { message, type },
        }));
    }

    async handleDeleteTicket() {
        if (!this._ticket) {
            this.emitToast('Service ticket details are unavailable right now.', 'error');
            return;
        }

        const statusKey = this.normalizeStatus(this._ticket.status);
        if (statusKey !== 'pending') {
            this.emitToast('Only pending service tickets can be deleted.', 'warning');
            return;
        }

        const ticketId = this._ticket.id || this._ticketId;
        if (!ticketId) {
            this.emitToast('Invalid service ticket ID.', 'error');
            return;
        }

        const confirmed = window.confirm('Delete this pending service ticket? This action cannot be undone.');
        if (!confirmed) {
            return;
        }

        try {
            const response = await API.delete(`/service-tickets/${encodeURIComponent(String(ticketId))}`);
            if (!response || response.status !== 'success') {
                this.emitToast(response?.message || 'Failed to delete service ticket.', 'error');
                return;
            }

            this.emitToast('Service ticket deleted successfully.', 'success');

            this.dispatchEvent(new CustomEvent('maintenance-service-ticket-detail-view:deleted', {
                bubbles: true,
                detail: {
                    ticketId: String(ticketId),
                    returnSection: this._returnSection || this.defaultReturnSection,
                },
            }));
        } catch (error) {
            console.error('Failed to delete service ticket:', error);
            this.emitToast('Failed to delete service ticket.', 'error');
        }
    }

    getStatusMeta(status) {
        const normalized = String(status || '').toLowerCase();
        if (normalized.includes('completed')) {
            return { label: 'Completed', className: 'status-completed' };
        }
        if (normalized.includes('progress')) {
            return { label: 'In Progress', className: 'status-in-progress' };
        }
        if (normalized.includes('assigned')) {
            return { label: 'Assigned', className: 'status-assigned' };
        }
        if (normalized.includes('cancelled')) {
            return { label: 'Cancelled', className: 'status-closed' };
        }

        return { label: status || 'Pending Assignment', className: 'status-pending' };
    }

    getPriorityClass(priority) {
        const normalized = String(priority || '').toLowerCase();
        if (normalized === 'critical') {
            return 'status-critical';
        }
        if (normalized === 'high') {
            return 'status-under-review';
        }
        if (normalized === 'low') {
            return 'status-scheduled';
        }

        return 'status-assigned';
    }

    getWarrantyClass(status) {
        const normalized = String(status || '').toLowerCase();
        if (normalized === 'active') {
            return 'warranty-active';
        }
        if (normalized === 'expired') {
            return 'warranty-expired';
        }

        return 'warranty-unknown';
    }

    normalizeStatus(status) {
        const normalized = String(status || '').toLowerCase();
        if (normalized.includes('pending')) {
            return 'pending';
        }
        if (normalized.includes('progress')) {
            return 'in-progress';
        }
        if (normalized.includes('assigned')) {
            return 'assigned';
        }
        if (normalized.includes('completed')) {
            return 'completed';
        }
        if (normalized.includes('cancelled')) {
            return 'cancelled';
        }

        return 'pending';
    }

    normalizeComponents(rawValue) {
        if (Array.isArray(rawValue)) {
            return rawValue
                .map((item) => this.normalizeComponentItem(item))
                .filter((item) => item !== '');
        }

        if (rawValue === null || rawValue === undefined) {
            return [];
        }

        const value = String(rawValue).trim();
        if (!value) {
            return [];
        }

        try {
            const decoded = JSON.parse(value);
            if (Array.isArray(decoded)) {
                return decoded
                    .map((item) => this.normalizeComponentItem(item))
                    .filter((item) => item !== '');
            }
        } catch (error) {
            // Fall through to comma parsing.
        }

        return value
            .split(',')
            .map((item) => this.normalizeComponentItem(item))
            .filter((item) => item !== '');
    }

    normalizeComponentItem(item) {
        if (typeof item === 'string') {
            return item.trim();
        }

        if (item && typeof item === 'object') {
            const keys = ['name', 'component', 'label', 'title', 'part_name', 'part'];
            for (const key of keys) {
                if (item[key]) {
                    return String(item[key]).trim();
                }
            }
            return JSON.stringify(item);
        }

        if (typeof item === 'number') {
            return String(item);
        }

        return '';
    }

    normalizeComponentComments(rawValue) {
        if (Array.isArray(rawValue)) {
            return rawValue
                .map((item) => this.normalizeComponentCommentItem(item))
                .filter((item) => item !== null);
        }

        if (rawValue === null || rawValue === undefined) {
            return [];
        }

        const value = String(rawValue).trim();
        if (!value) {
            return [];
        }

        try {
            const decoded = JSON.parse(value);
            if (Array.isArray(decoded)) {
                return decoded
                    .map((item) => this.normalizeComponentCommentItem(item))
                    .filter((item) => item !== null);
            }
        } catch (error) {
            // Fall through to empty list.
        }

        return [];
    }

    normalizeComponentCommentItem(item) {
        if (typeof item === 'string') {
            const comment = item.trim();
            if (!comment) {
                return null;
            }

            return {
                component: 'General',
                comment,
            };
        }

        if (!item || typeof item !== 'object') {
            return null;
        }

        const component = String(item.component || item.name || item.label || item.part_name || item.part || 'General').trim() || 'General';
        const comment = String(item.comment || item.notes || item.note || '').trim();
        if (!comment) {
            return null;
        }

        return { component, comment };
    }

    buildComponentCommentLookup(componentComments) {
        const lookup = new Map();
        (componentComments || []).forEach((entry) => {
            const component = String(entry.component || 'General').trim() || 'General';
            const comment = String(entry.comment || '').trim();
            if (!comment) {
                return;
            }

            const key = component.toLowerCase();
            if (!lookup.has(key)) {
                lookup.set(key, { component, comment });
            }
        });

        return lookup;
    }

    formatDate(value) {
        if (!value) {
            return 'N/A';
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return this.escapeHtml(value);
        }

        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    }

    formatDateTime(value) {
        if (!value) {
            return 'N/A';
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return this.escapeHtml(value);
        }

        return date.toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    formatCurrency(value) {
        if (value === null || value === undefined || value === '') {
            return 'N/A';
        }

        if (typeof value === 'string' && value.trim().toUpperCase().startsWith('LKR')) {
            return this.escapeHtml(value.trim());
        }

        const amount = Number(value);
        if (!Number.isFinite(amount)) {
            return this.escapeHtml(value);
        }

        return `LKR ${amount.toLocaleString('en-LK', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    }

    formatAssetType(assetType) {
        const normalized = String(assetType || '').toLowerCase();
        if (normalized === 'vehicle') {
            return 'Vehicle';
        }
        if (normalized === 'machine') {
            return 'Machine';
        }

        return assetType || 'N/A';
    }

    getReturnSectionLabel() {
        const section = String(this._returnSection || this.defaultReturnSection || 'service-tickets').trim();
        const labels = {
            dashboard: 'Dashboard',
            'service-tickets': 'Service Management',
            'service-reports': 'Service Report Management',
            'warranty-management': 'Warranty Management',
            notifications: 'Notifications',
        };

        if (labels[section]) {
            return labels[section];
        }

        if (!section) {
            return 'Service Management';
        }

        return section
            .split('-')
            .map((token) => token ? `${token.charAt(0).toUpperCase()}${token.slice(1)}` : '')
            .join(' ')
            .trim() || 'Service Management';
    }

    getFlowStepIndex(statusKey) {
        const map = {
            pending: 1,
            assigned: 2,
            'in-progress': 3,
            completed: 4,
            cancelled: 2,
        };

        return map[statusKey] || 1;
    }

    renderProgressFlow(ticket) {
        const statusKey = this.normalizeStatus(ticket.status);
        const activeStep = this.getFlowStepIndex(statusKey);
        const isCompleted = statusKey === 'completed';
        const isCancelled = statusKey === 'cancelled';

        const steps = [
            {
                icon: 'fa-flag',
                title: 'Reported',
                note: `${this.formatDateTime(ticket.created_at)} by ${this.escapeHtml(ticket.reported_by_name || ticket.reported_by || 'Unknown')}`,
            },
            {
                icon: 'fa-user-check',
                title: 'Assigned',
                note: ticket.assigned_to_name
                    ? `Assigned to ${this.escapeHtml(ticket.assigned_to_name)}`
                    : 'Waiting for assignment',
            },
            {
                icon: 'fa-play-circle',
                title: 'In Progress',
                note: ticket.started_at
                    ? `Started ${this.formatDateTime(ticket.started_at)}`
                    : 'Service work has not started yet',
            },
            {
                icon: 'fa-check-circle',
                title: 'Completed',
                note: ticket.completed_at
                    ? `Completed ${this.formatDateTime(ticket.completed_at)}`
                    : 'Completion report pending',
            },
        ];

        const stepMarkup = steps.map((step, index) => {
            const order = index + 1;
            let stateClass = 'is-pending';

            if (isCompleted || order < activeStep) {
                stateClass = 'is-complete';
            } else if (isCancelled && order === activeStep) {
                stateClass = 'is-cancelled';
            } else if (!isCancelled && order === activeStep) {
                stateClass = 'is-active';
            }

            return `
                <div class="service-ticket-detail-flow-step ${stateClass}">
                    <div class="service-ticket-detail-flow-head">
                        <span class="service-ticket-detail-flow-step-number">Step ${order}</span>
                        <span class="service-ticket-detail-flow-step-icon"><i class="fas ${step.icon}"></i></span>
                    </div>
                    <div class="service-ticket-detail-flow-step-title">${step.title}</div>
                    <p class="service-ticket-detail-flow-step-note">${step.note}</p>
                </div>
            `;
        }).join('');

        return `
            <section class="service-ticket-detail-flow">
                <h2 class="service-ticket-detail-flow-title"><i class="fas fa-shoe-prints"></i> Service Progress Flow</h2>
                <div class="service-ticket-detail-flow-grid">
                    ${stepMarkup}
                </div>
                ${isCancelled
                    ? '<div class="service-ticket-detail-cancelled-note"><i class="fas fa-times-circle"></i> This service ticket was cancelled before the workflow reached completion.</div>'
                    : ''}
            </section>
        `;
    }

    renderOverviewMetric(label, value, allowHtml = false) {
        const renderedValue = allowHtml
            ? value
            : this.escapeHtml(value === null || value === undefined || value === '' ? 'N/A' : value);

        return `
            <div class="service-ticket-detail-overview-item">
                <span class="service-ticket-detail-overview-label">${this.escapeHtml(label)}</span>
                <div class="service-ticket-detail-overview-value">${renderedValue}</div>
            </div>
        `;
    }

    renderField(label, value, allowHtml = false) {
        const renderedValue = allowHtml
            ? value
            : this.escapeHtml(value === null || value === undefined || value === '' ? 'N/A' : value);

        return `
            <div class="service-ticket-detail-info-item">
                <span class="service-ticket-detail-info-label">${this.escapeHtml(label)}</span>
                <div class="service-ticket-detail-info-value">${renderedValue}</div>
            </div>
        `;
    }

    renderTextBlock(title, value) {
        if (!value) {
            return '';
        }

        return `
            <div class="service-ticket-detail-note-block">
                <span class="service-ticket-detail-note-title">${this.escapeHtml(title)}</span>
                <div class="service-ticket-detail-note-value">${this.escapeHtml(value)}</div>
            </div>
        `;
    }

    renderPendingDeleteAction(statusKey) {
        if (statusKey !== 'pending') {
            return '';
        }

        return `
            <div class="service-ticket-detail-danger-actions">
                <button class="btn btn-danger" type="button" data-action="delete-ticket">
                    <i class="fas fa-trash"></i> Delete Service Ticket
                </button>
            </div>
        `;
    }

    renderComponents(components, componentComments = []) {
        if (!components.length && !componentComments.length) {
            return '<p style="margin: 0; color: var(--muted);">No component details recorded for this asset.</p>';
        }

        const commentLookup = this.buildComponentCommentLookup(componentComments);
        const componentKeySet = new Set(components.map((component) => String(component || '').trim().toLowerCase()).filter((item) => item !== ''));

        const componentCards = components.map((component) => {
            const key = String(component || '').trim().toLowerCase();
            const comment = key ? (commentLookup.get(key)?.comment || '') : '';
            return `
                <div class="service-ticket-detail-component-chip">
                    <strong>${this.escapeHtml(component)}</strong>
                    ${comment
                        ? `<div class="service-ticket-detail-component-chip-comment">${this.escapeHtml(comment)}</div>`
                        : '<div class="service-ticket-detail-component-chip-comment" style="color: var(--muted);">No comment provided.</div>'}
                </div>
            `;
        });

        const extraCommentCards = componentComments
            .filter((entry) => !componentKeySet.has(String(entry.component || '').trim().toLowerCase()))
            .map((entry) => `
                <div class="service-ticket-detail-component-chip">
                    <strong>${this.escapeHtml(entry.component || 'General')}</strong>
                    <div class="service-ticket-detail-component-chip-comment">${this.escapeHtml(entry.comment || '')}</div>
                </div>
            `);

        const allCards = [...componentCards, ...extraCommentCards];
        if (!allCards.length) {
            return '<p style="margin: 0; color: var(--muted);">No component comments captured for this service ticket.</p>';
        }

        return `
            <div class="service-ticket-detail-components">
                ${allCards.join('')}
            </div>
        `;
    }

    renderTicket(ticket) {
        this._ticket = ticket;

        const statusMeta = this.getStatusMeta(ticket.status);
        const statusKey = this.normalizeStatus(ticket.status);
        const hasServiceReport = statusKey === 'completed';
        const priorityClass = this.getPriorityClass(ticket.priority);
        const warrantyClass = this.getWarrantyClass(ticket.asset_warranty_status);
        const components = this.normalizeComponents(ticket.asset_components);
        const componentComments = this.normalizeComponentComments(ticket.component_comments);
        const serviceTicketLabel = ticket.service_ticket_id || ticket.ticket_id || ticket.id || 'N/A';
        const returnSectionLabel = this.getReturnSectionLabel();

        const assetFields = [
            this.renderField('Asset Type', this.formatAssetType(ticket.asset_type)),
            this.renderField('Asset Name', ticket.asset_name || 'N/A'),
            this.renderField('Asset Code', ticket.asset_code || 'N/A'),
            this.renderField('Reference', ticket.asset_reference || 'N/A'),
            this.renderField('Model', ticket.asset_model || 'N/A'),
            this.renderField('Warranty Provider', ticket.asset_warranty_provider || 'N/A'),
            this.renderField('Warranty Expiry', this.formatDate(ticket.asset_warranty_expiry)),
            this.renderField(
                'Warranty Status',
                `<span class="status-badge ${this.escapeHtml(warrantyClass)}">${this.escapeHtml(ticket.asset_warranty_status || 'Unknown')}</span>`,
                true
            ),
        ].join('');

        const reportFields = [
            this.renderField('Service Type', ticket.service_type || 'N/A'),
            this.renderField('Reported By', ticket.reported_by_name || ticket.reported_by || 'N/A'),
            this.renderField('Assigned To', ticket.assigned_to_name || 'Unassigned'),
            this.renderField('Created At', this.formatDateTime(ticket.created_at)),
            this.renderField('Expected Completion Date', this.formatDate(ticket.scheduled_date)),
            this.renderField('Started At', this.formatDateTime(ticket.started_at)),
            this.renderField('Completed At', this.formatDateTime(ticket.completed_at)),
            this.renderField('Estimated Cost', this.formatCurrency(ticket.estimated_cost)),
            this.renderField('Actual Cost', this.formatCurrency(ticket.actual_cost)),
            this.renderField('Next Service Date', this.formatDate(ticket.next_service_date)),
            this.renderField('Service Meter Reading', ticket.service_meter_reading ?? 'N/A'),
            this.renderField('Warranty Action', ticket.warranty_action || 'none'),
        ].join('');

        const overviewMetrics = [
            this.renderOverviewMetric('Service Type', ticket.service_type || 'N/A'),
            this.renderOverviewMetric('Asset', `${ticket.asset_name || 'N/A'} (${ticket.asset_code || 'N/A'})`),
            this.renderOverviewMetric('Reported By', ticket.reported_by_name || ticket.reported_by || 'N/A'),
            this.renderOverviewMetric('Assigned To', ticket.assigned_to_name || 'Unassigned'),
            this.renderOverviewMetric('Expected Completion', this.formatDate(ticket.scheduled_date)),
            this.renderOverviewMetric('Created', this.formatDateTime(ticket.created_at)),
            this.renderOverviewMetric('Started', this.formatDateTime(ticket.started_at)),
            this.renderOverviewMetric('Completed', this.formatDateTime(ticket.completed_at)),
        ].join('');

        this.innerHTML = `
            <div class="service-ticket-detail-shell">
                <div class="service-ticket-detail-subheader">
                    <div class="service-ticket-detail-subheader-inner">
                        <button class="service-ticket-detail-back" type="button" data-action="back" aria-label="Back to previous section">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                        <div class="service-ticket-detail-title-block">
                            <nav class="service-ticket-detail-breadcrumb" aria-label="Breadcrumb">
                                <span class="service-ticket-detail-breadcrumb-item"><i class="fas fa-chart-line"></i> Dashboard</span>
                                <i class="service-ticket-detail-breadcrumb-sep fas fa-chevron-right"></i>
                                <button class="service-ticket-detail-breadcrumb-item service-ticket-detail-breadcrumb-link" type="button" data-action="back">${this.escapeHtml(returnSectionLabel)}</button>
                                <i class="service-ticket-detail-breadcrumb-sep fas fa-chevron-right"></i>
                                <span class="service-ticket-detail-breadcrumb-item service-ticket-detail-breadcrumb-current">${this.escapeHtml(serviceTicketLabel)}</span>
                            </nav>
                            <h1 class="service-ticket-detail-title"><i class="fas fa-tools"></i> Service Ticket Detail</h1>
                            <p class="service-ticket-detail-subtitle">Review the complete service workflow with asset details, report data, and component observations.</p>
                        </div>
                    </div>
                </div>

                <section class="card service-ticket-detail-overview-card">
                    <div class="service-ticket-detail-overview-head">
                        <div class="service-ticket-detail-overview-ticket">${this.escapeHtml(serviceTicketLabel)}</div>
                        <div class="service-ticket-detail-status-row">
                            <span class="status-badge ${this.escapeHtml(statusMeta.className)}">${this.escapeHtml(statusMeta.label)}</span>
                            <span class="status-badge ${this.escapeHtml(priorityClass)}">Priority: ${this.escapeHtml(ticket.priority || 'Medium')}</span>
                            <span class="status-badge ${this.escapeHtml(warrantyClass)}">Warranty: ${this.escapeHtml(ticket.asset_warranty_status || 'Unknown')}</span>
                        </div>
                    </div>
                    <div class="service-ticket-detail-overview-grid">
                        ${overviewMetrics}
                    </div>
                    <div class="service-ticket-detail-overview-description">
                        <span class="service-ticket-detail-overview-label">Service Description</span>
                        <p>${this.escapeHtml(ticket.description || 'No service description provided.')}</p>
                    </div>
                </section>

                ${this.renderProgressFlow(ticket)}

                ${this.renderPendingDeleteAction(statusKey)}

                <div class="service-ticket-detail-layout">
                    <div class="service-ticket-detail-main">
                        <section class="card service-ticket-detail-card">
                            <h2 class="service-ticket-detail-card-title"><i class="fas fa-cubes"></i> Asset Details</h2>
                            <div class="service-ticket-detail-info-grid">
                                ${assetFields}
                            </div>
                        </section>

                        ${hasServiceReport
                            ? `
                                <section class="card service-ticket-detail-card">
                                    <h2 class="service-ticket-detail-card-title"><i class="fas fa-clipboard-check"></i> Service Report Details</h2>
                                    <div class="service-ticket-detail-info-grid">
                                        ${reportFields}
                                    </div>
                                    ${this.renderTextBlock('Maintenance Notes', ticket.maintenance_notes || '')}
                                    ${this.renderTextBlock('Overall Asset Status Notes', ticket.completion_notes || '')}
                                    ${this.renderTextBlock('Warranty Void Reason', ticket.warranty_void_reason || '')}
                                </section>
                            `
                            : ''}
                    </div>

                    <aside class="service-ticket-detail-side">
                        <section class="card service-ticket-detail-card">
                            <h2 class="service-ticket-detail-card-title"><i class="fas fa-microchip"></i> Individual Asset Components and Comments</h2>
                            ${this.renderComponents(components, componentComments)}
                        </section>
                    </aside>
                </div>
            </div>
        `;
    }

    escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

if (!customElements.get('maintenance-service-ticket-detail-view')) {
    customElements.define('maintenance-service-ticket-detail-view', MaintenanceServiceTicketDetailView);
}
