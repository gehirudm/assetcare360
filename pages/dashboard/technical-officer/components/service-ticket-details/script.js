class TOServiceTicketDetailView extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this._ticketId = null;
        this._ticket = null;
        this._sparePartRequests = [];
        this._busy = false;
        this._showCompletionForm = false;
        this._showStartTicketModal = false;
        this._startTicketExpectedCompletionDate = '';
        this._startTicketModalPortal = null;
        this._returnSection = this.defaultReturnSection;

        this.ensureScopedStyles();
        this.bindEvents();
        this.renderPlaceholder();
    }

    disconnectedCallback() {
        this.removeStartTicketModalPortal();
    }

    get defaultReturnSection() {
        return String(this.getAttribute('default-return-section') || 'service-tickets').trim() || 'service-tickets';
    }

    ensureScopedStyles() {
        if (document.getElementById('to-service-ticket-detail-view-style')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'to-service-ticket-detail-view-style';
        style.textContent = `
            to-service-ticket-detail-view {
                display: block;
            }

            to-service-ticket-detail-view .service-ticket-detail-shell {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }

            to-service-ticket-detail-view .service-ticket-detail-subheader {
                padding: 12px 0 4px;
            }

            to-service-ticket-detail-view .service-ticket-detail-subheader-inner {
                display: flex;
                align-items: center;
                gap: 16px;
                flex-wrap: wrap;
            }

            to-service-ticket-detail-view .service-ticket-detail-back,
            to-service-ticket-detail-view .service-ticket-detail-breadcrumb-link {
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

            to-service-ticket-detail-view .service-ticket-detail-back:hover {
                background: var(--stone-200);
                color: var(--text-900);
                transform: translateX(-2px);
            }

            to-service-ticket-detail-view .service-ticket-detail-title-block {
                min-width: 280px;
                flex: 1;
            }

            to-service-ticket-detail-view .service-ticket-detail-breadcrumb {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 0.8rem;
                margin-bottom: 6px;
                flex-wrap: wrap;
            }

            to-service-ticket-detail-view .service-ticket-detail-breadcrumb-item {
                color: var(--muted);
                font-weight: 500;
                display: inline-flex;
                align-items: center;
                gap: 5px;
            }

            to-service-ticket-detail-view .service-ticket-detail-breadcrumb-link {
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

            to-service-ticket-detail-view .service-ticket-detail-breadcrumb-link:hover {
                color: var(--royal-blue);
                transform: none;
                background: transparent;
            }

            to-service-ticket-detail-view .service-ticket-detail-breadcrumb-current {
                color: var(--text-900);
                font-weight: 700;
            }

            to-service-ticket-detail-view .service-ticket-detail-breadcrumb-sep {
                font-size: 0.62rem;
                color: var(--muted);
            }

            to-service-ticket-detail-view .service-ticket-detail-title {
                margin: 0;
                color: var(--tang-blue);
                font-size: 1.35rem;
                font-weight: 700;
                display: inline-flex;
                align-items: center;
                gap: 10px;
            }

            to-service-ticket-detail-view .service-ticket-detail-subtitle {
                margin: 6px 0 0;
                color: var(--muted);
                font-size: 0.9rem;
            }

            to-service-ticket-detail-view .service-ticket-detail-overview-card {
                border: 1px solid #dbeafe;
                background: linear-gradient(135deg, #f8fbff 0%, #ffffff 58%);
                padding: 22px;
            }

            to-service-ticket-detail-view .service-ticket-detail-overview-head {
                display: flex;
                justify-content: space-between;
                gap: 12px;
                align-items: flex-start;
                flex-wrap: wrap;
                margin-bottom: 14px;
            }

            to-service-ticket-detail-view .service-ticket-detail-overview-ticket {
                color: var(--tang-blue);
                font-size: 1.15rem;
                font-weight: 800;
                letter-spacing: 0.2px;
            }

            to-service-ticket-detail-view .service-ticket-detail-status-row {
                display: flex;
                gap: 8px;
                align-items: center;
                flex-wrap: wrap;
            }

            to-service-ticket-detail-view .service-ticket-detail-overview-grid {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 12px;
            }

            to-service-ticket-detail-view .service-ticket-detail-overview-item {
                border: 1px solid var(--stone-200);
                border-radius: 10px;
                background: #fff;
                padding: 10px;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            to-service-ticket-detail-view .service-ticket-detail-overview-label {
                font-size: 0.72rem;
                text-transform: uppercase;
                letter-spacing: 0.4px;
                color: var(--muted);
                font-weight: 700;
            }

            to-service-ticket-detail-view .service-ticket-detail-overview-value {
                font-size: 0.92rem;
                color: var(--text-900);
                font-weight: 600;
                line-height: 1.4;
                word-break: break-word;
            }

            to-service-ticket-detail-view .service-ticket-detail-overview-description {
                margin-top: 14px;
                border-top: 1px solid #dbeafe;
                padding-top: 12px;
            }

            to-service-ticket-detail-view .service-ticket-detail-overview-description p {
                margin: 4px 0 0;
                color: var(--text-700);
                line-height: 1.6;
            }

            to-service-ticket-detail-view .service-ticket-detail-flow {
                background: var(--card);
                border: 1px solid var(--stone-200);
                border-radius: 14px;
                box-shadow: var(--shadow);
                padding: 18px;
            }

            to-service-ticket-detail-view .service-ticket-detail-flow-title {
                margin: 0 0 12px;
                font-size: 1rem;
                color: var(--tang-blue);
                font-weight: 700;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }

            to-service-ticket-detail-view .service-ticket-detail-flow-grid {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 10px;
            }

            to-service-ticket-detail-view .service-ticket-detail-flow-step {
                border: 1px solid var(--stone-200);
                border-radius: 12px;
                background: #f9fbff;
                padding: 10px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                min-height: 122px;
            }

            to-service-ticket-detail-view .service-ticket-detail-flow-step.is-complete {
                border-color: #bbf7d0;
                background: #f0fdf4;
            }

            to-service-ticket-detail-view .service-ticket-detail-flow-step.is-active {
                border-color: #bfdbfe;
                background: #eff6ff;
                box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.25);
            }

            to-service-ticket-detail-view .service-ticket-detail-flow-step.is-cancelled {
                border-color: #fecaca;
                background: #fff1f2;
            }

            to-service-ticket-detail-view .service-ticket-detail-flow-head {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 8px;
            }

            to-service-ticket-detail-view .service-ticket-detail-flow-step-number {
                font-size: 0.72rem;
                color: var(--muted);
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.4px;
            }

            to-service-ticket-detail-view .service-ticket-detail-flow-step-icon {
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

            to-service-ticket-detail-view .service-ticket-detail-flow-step.is-complete .service-ticket-detail-flow-step-icon {
                background: #dcfce7;
                color: #166534;
            }

            to-service-ticket-detail-view .service-ticket-detail-flow-step.is-cancelled .service-ticket-detail-flow-step-icon {
                background: #fee2e2;
                color: #b91c1c;
            }

            to-service-ticket-detail-view .service-ticket-detail-flow-step-title {
                font-weight: 700;
                color: var(--text-900);
                font-size: 0.9rem;
            }

            to-service-ticket-detail-view .service-ticket-detail-flow-step-note {
                margin: 0;
                font-size: 0.82rem;
                color: var(--text-700);
                line-height: 1.45;
            }

            to-service-ticket-detail-view .service-ticket-detail-cancelled-note {
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

            to-service-ticket-detail-view .service-ticket-detail-layout {
                display: grid;
                grid-template-columns: minmax(0, 1.6fr) minmax(290px, 1fr);
                gap: 16px;
            }

            to-service-ticket-detail-view .service-ticket-detail-main,
            to-service-ticket-detail-view .service-ticket-detail-side {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }

            to-service-ticket-detail-view .service-ticket-detail-card {
                padding: 18px;
                border-radius: 14px;
            }

            to-service-ticket-detail-view .service-ticket-detail-card-title {
                margin: 0 0 12px;
                font-size: 1rem;
                color: var(--tang-blue);
                font-weight: 700;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }

            to-service-ticket-detail-view .service-ticket-detail-info-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 10px;
            }

            to-service-ticket-detail-view .service-ticket-detail-info-item {
                border: 1px solid var(--stone-200);
                border-radius: 10px;
                background: #fff;
                padding: 10px;
                display: flex;
                flex-direction: column;
                gap: 5px;
                min-height: 72px;
            }

            to-service-ticket-detail-view .service-ticket-detail-info-label {
                font-size: 0.73rem;
                color: var(--muted);
                text-transform: uppercase;
                letter-spacing: 0.35px;
                font-weight: 700;
            }

            to-service-ticket-detail-view .service-ticket-detail-info-value {
                font-size: 0.92rem;
                color: var(--text-900);
                font-weight: 600;
                line-height: 1.45;
                word-break: break-word;
            }

            to-service-ticket-detail-view .service-ticket-detail-note-block {
                border: 1px solid var(--stone-200);
                border-left: 4px solid #dbeafe;
                background: #fafcff;
                border-radius: 10px;
                padding: 10px 12px;
                margin-top: 10px;
            }

            to-service-ticket-detail-view .service-ticket-detail-note-title {
                display: block;
                font-size: 0.74rem;
                color: var(--muted);
                text-transform: uppercase;
                letter-spacing: 0.35px;
                font-weight: 700;
                margin-bottom: 5px;
            }

            to-service-ticket-detail-view .service-ticket-detail-note-value {
                color: var(--text-700);
                line-height: 1.6;
                font-size: 0.9rem;
                white-space: pre-wrap;
            }

            to-service-ticket-detail-view .service-ticket-detail-actions {
                border: 1px solid #dbeafe;
                border-radius: 12px;
                background: #f8fbff;
                padding: 14px;
            }

            to-service-ticket-detail-view .service-ticket-detail-actions h5 {
                margin: 0 0 8px;
                color: #1e3a8a;
                font-size: 0.98rem;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }

            to-service-ticket-detail-view .service-ticket-detail-components {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 10px;
            }

            to-service-ticket-detail-view .service-ticket-detail-action-bar {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                align-items: center;
            }

            to-service-ticket-detail-view .service-ticket-detail-start-actions {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 10px;
                align-items: stretch;
            }

            to-service-ticket-detail-view .service-ticket-detail-start-actions .btn {
                width: 100%;
                justify-content: center;
            }

            to-service-ticket-detail-view .service-ticket-detail-action-hint {
                margin: 0;
                color: var(--muted);
                font-size: 0.9rem;
                line-height: 1.45;
            }

            to-service-ticket-detail-view .service-ticket-detail-start-modal-backdrop,
            .service-ticket-detail-start-modal-backdrop {
                position: fixed;
                inset: 0;
                background: rgba(15, 23, 42, 0.55);
                z-index: 2100;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 16px;
            }

            to-service-ticket-detail-view .service-ticket-detail-start-modal,
            .service-ticket-detail-start-modal {
                width: min(520px, calc(100vw - 32px));
                max-height: calc(100vh - 32px);
                border-radius: 12px;
                border: 1px solid #dbeafe;
                background: #ffffff;
                box-shadow: 0 25px 55px rgba(15, 23, 42, 0.25);
                overflow: hidden;
            }

            to-service-ticket-detail-view .service-ticket-detail-start-modal-header,
            .service-ticket-detail-start-modal-header {
                padding: 14px 16px;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                background: #f8fbff;
            }

            to-service-ticket-detail-view .service-ticket-detail-start-modal-title,
            .service-ticket-detail-start-modal-title {
                margin: 0;
                font-size: 1rem;
                color: var(--tang-blue);
                font-weight: 700;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }

            to-service-ticket-detail-view .service-ticket-detail-start-modal-close,
            .service-ticket-detail-start-modal-close {
                width: 34px;
                height: 34px;
                border-radius: 8px;
                border: 1px solid var(--stone-200);
                background: #fff;
                color: var(--text-700);
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }

            to-service-ticket-detail-view .service-ticket-detail-start-modal-close:hover,
            .service-ticket-detail-start-modal-close:hover {
                background: var(--stone-100);
            }

            to-service-ticket-detail-view .service-ticket-detail-start-modal-close:disabled,
            .service-ticket-detail-start-modal-close:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }

            to-service-ticket-detail-view .service-ticket-detail-start-modal-body,
            .service-ticket-detail-start-modal-body {
                padding: 16px;
                overflow-y: auto;
            }

            to-service-ticket-detail-view .service-ticket-detail-start-modal-body .form-group,
            .service-ticket-detail-start-modal-body .form-group {
                margin-bottom: 12px;
            }

            to-service-ticket-detail-view .service-ticket-detail-start-modal-body .form-label,
            .service-ticket-detail-start-modal-body .form-label {
                display: block;
                margin-bottom: 6px;
                font-weight: 600;
                color: var(--text-700);
            }

            to-service-ticket-detail-view .service-ticket-detail-start-modal-actions,
            .service-ticket-detail-start-modal-actions {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 14px;
            }

            to-service-ticket-detail-view .service-ticket-detail-request-meta {
                margin-top: 12px;
                padding: 10px;
                border: 1px solid #dbeafe;
                border-radius: 10px;
                background: #ffffff;
            }

            to-service-ticket-detail-view .service-ticket-detail-request-meta p {
                margin: 0 0 8px;
                font-size: 0.88rem;
                color: var(--text-700);
            }

            to-service-ticket-detail-view .service-ticket-detail-request-meta p:last-child {
                margin-bottom: 0;
            }

            to-service-ticket-detail-view .service-ticket-detail-complete-form {
                margin-top: 14px;
                padding-top: 14px;
                border-top: 1px solid var(--stone-200);
            }

            to-service-ticket-detail-view .service-ticket-detail-complete-form .form-group {
                margin-bottom: 12px;
            }

            to-service-ticket-detail-view .service-ticket-detail-component-comment-grid {
                display: grid;
                gap: 12px;
            }

            to-service-ticket-detail-view .service-ticket-detail-component-comment {
                border: 1px solid var(--stone-200);
                border-radius: 10px;
                background: #fff;
                padding: 10px;
            }

            to-service-ticket-detail-view .service-ticket-detail-component-comment textarea {
                min-height: 88px;
            }

            to-service-ticket-detail-view .service-ticket-detail-component-title {
                display: block;
                font-weight: 600;
                margin-bottom: 8px;
            }

            to-service-ticket-detail-view .service-ticket-detail-component-chip-comment {
                margin-top: 8px;
                font-size: 0.88rem;
                color: var(--text-700);
                white-space: pre-wrap;
            }

            to-service-ticket-detail-view .service-ticket-detail-component-chip {
                padding: 8px 10px;
                border: 1px solid var(--stone-200);
                border-radius: 8px;
                background: #fff;
            }

            to-service-ticket-detail-view .warranty-active {
                background: #dcfce7;
                color: #166534;
            }

            to-service-ticket-detail-view .warranty-expired {
                background: #fee2e2;
                color: #b91c1c;
            }

            to-service-ticket-detail-view .warranty-unknown {
                background: #f3f4f6;
                color: #374151;
            }

            to-service-ticket-detail-view .service-ticket-detail-empty-card,
            to-service-ticket-detail-view .service-ticket-detail-loading-card,
            to-service-ticket-detail-view .service-ticket-detail-error-card {
                padding: 20px;
            }

            to-service-ticket-detail-view .service-ticket-detail-empty-inner,
            to-service-ticket-detail-view .service-ticket-detail-loading-inner {
                display: flex;
                align-items: center;
                gap: 10px;
                color: var(--muted);
            }

            to-service-ticket-detail-view .service-ticket-detail-loading-inner {
                justify-content: center;
            }

            @media (max-width: 1180px) {
                to-service-ticket-detail-view .service-ticket-detail-layout {
                    grid-template-columns: 1fr;
                }

                to-service-ticket-detail-view .service-ticket-detail-side {
                    order: -1;
                }
            }

            @media (max-width: 860px) {
                to-service-ticket-detail-view .service-ticket-detail-overview-grid,
                to-service-ticket-detail-view .service-ticket-detail-flow-grid {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
            }

            @media (max-width: 640px) {
                to-service-ticket-detail-view .service-ticket-detail-subheader {
                    padding-top: 6px;
                }

                to-service-ticket-detail-view .service-ticket-detail-title {
                    font-size: 1.18rem;
                }

                to-service-ticket-detail-view .service-ticket-detail-overview-grid,
                to-service-ticket-detail-view .service-ticket-detail-flow-grid,
                to-service-ticket-detail-view .service-ticket-detail-info-grid {
                    grid-template-columns: 1fr;
                }

                to-service-ticket-detail-view .service-ticket-detail-card,
                to-service-ticket-detail-view .service-ticket-detail-overview-card,
                to-service-ticket-detail-view .service-ticket-detail-flow {
                    padding: 14px;
                }

                to-service-ticket-detail-view .service-ticket-detail-start-actions {
                    grid-template-columns: 1fr;
                }

                to-service-ticket-detail-view .service-ticket-detail-start-modal-actions,
                .service-ticket-detail-start-modal-actions {
                    flex-direction: column;
                }

                to-service-ticket-detail-view .service-ticket-detail-start-modal-actions .btn,
                .service-ticket-detail-start-modal-actions .btn {
                    width: 100%;
                }
            }
        `;

        document.head.appendChild(style);
    }

    bindEvents() {
        this.addEventListener('submit', (event) => {
            const startTicketForm = event.target.closest('form[data-action="start-ticket-modal-form"]');
            if (startTicketForm) {
                event.preventDefault();
                this.submitStartTicketForm(startTicketForm);
                return;
            }

            const completeForm = event.target.closest('form[data-action="complete-form"]');
            if (!completeForm) {
                return;
            }

            event.preventDefault();
            this.completeTicket(completeForm);
        });

        this.addEventListener('change', (event) => {
            const warrantyActionSelect = event.target.closest('[data-action="warranty-action"]');
            if (!warrantyActionSelect) {
                return;
            }

            const form = warrantyActionSelect.closest('form[data-action="complete-form"]');
            if (!form) {
                return;
            }

            const reasonField = form.querySelector('.warranty-void-reason-group');
            if (!reasonField) {
                return;
            }

            reasonField.style.display = warrantyActionSelect.value === 'voided' ? 'block' : 'none';
        });

        this.addEventListener('click', (event) => {
            if (event.target.classList.contains('service-ticket-detail-start-modal-backdrop')) {
                this.closeStartTicketModal();
                return;
            }

            const actionNode = event.target.closest('[data-action]');
            if (!actionNode) {
                return;
            }

            const action = actionNode.dataset.action;

            if (action === 'back') {
                this.dispatchEvent(new CustomEvent('to-service-ticket-detail-view:back', {
                    bubbles: true,
                    detail: {
                        returnSection: this._returnSection || this.defaultReturnSection,
                    },
                }));
                return;
            }

            if (action === 'start-ticket') {
                this.startTicket();
                return;
            }

            if (action === 'cancel-start-ticket-modal' || action === 'close-start-ticket-modal') {
                this.closeStartTicketModal();
                return;
            }

            if (action === 'request-spare-parts') {
                this.requestSpareParts();
                return;
            }

            if (action === 'toggle-complete-form') {
                this._showCompletionForm = !this._showCompletionForm;
                this.renderTicket(this._ticket || {});
                return;
            }

            if (action === 'cancel-complete-form') {
                this._showCompletionForm = false;
                this.renderTicket(this._ticket || {});
            }
        });
    }

    renderPlaceholder() {
        this.removeStartTicketModalPortal();
        this.innerHTML = `
            <div class="card service-ticket-detail-empty-card">
                <div class="service-ticket-detail-empty-inner">
                    <i class="fas fa-file-alt"></i>
                    <span>Select a service ticket from Service Tickets to open details.</span>
                </div>
            </div>
        `;
    }

    renderLoading(ticketId) {
        this.removeStartTicketModalPortal();
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
        this.removeStartTicketModalPortal();
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

    async fetchSparePartRequests(ticketId) {
        try {
            const response = await API.get(`/spare-part-requests/service-ticket/${encodeURIComponent(String(ticketId))}`);
            if (!response || response.status !== 'success' || !Array.isArray(response.data)) {
                return [];
            }

            return response.data;
        } catch (error) {
            console.error('Failed to load service-ticket spare part requests:', error);
            return [];
        }
    }

    getLatestSparePartRequest() {
        const requests = Array.isArray(this._sparePartRequests) ? [...this._sparePartRequests] : [];
        if (!requests.length) {
            return null;
        }

        requests.sort((left, right) => {
            const leftTime = new Date(left?.updated_at || left?.created_at || 0).getTime();
            const rightTime = new Date(right?.updated_at || right?.created_at || 0).getTime();
            return rightTime - leftTime;
        });

        return requests[0] || null;
    }

    hasPendingSparePartRequest() {
        return (this._sparePartRequests || []).some((request) => String(request?.status || '').toLowerCase() === 'pending');
    }

    getSparePartRequestStatusMeta(status) {
        const normalized = String(status || '').toLowerCase();
        if (normalized === 'approved') {
            return { label: 'Approved', className: 'status-completed' };
        }
        if (normalized === 'rejected') {
            return { label: 'Rejected', className: 'status-closed' };
        }

        return { label: 'Pending Approval', className: 'status-pending' };
    }

    requestSpareParts() {
        if (!this._ticket) {
            this.emitToast('Service ticket details are not ready yet.', 'warning');
            return;
        }

        const statusKey = this.normalizeStatus(this._ticket.status);
        if (!['assigned', 'pending'].includes(statusKey)) {
            this.emitToast('Spare parts can only be requested before service starts.', 'warning');
            return;
        }

        const ticketNumericId = Number(this._ticket.id || this._ticketId);
        if (!Number.isFinite(ticketNumericId) || ticketNumericId <= 0) {
            this.emitToast('Invalid service ticket ID for spare part request.', 'error');
            return;
        }

        this.dispatchEvent(new CustomEvent('to-service-ticket-detail-view:request-spare-parts', {
            bubbles: true,
            detail: {
                ticket: {
                    id: ticketNumericId,
                    service_ticket_id: this._ticket.service_ticket_id || this._ticket.ticket_id || null,
                    asset_name: this._ticket.asset_name || null,
                    asset_code: this._ticket.asset_code || null,
                    location: this._ticket.location || this._ticket.asset_location || null,
                    reported_by_name: this._ticket.reported_by_name || this._ticket.reported_by || null,
                    created_at: this._ticket.created_at || null,
                    description: this._ticket.description || null,
                    priority: this._ticket.priority || null,
                },
            },
        }));
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

        const [ticket, sparePartRequests] = await Promise.all([
            this.fetchTicketById(normalizedTicketId),
            this.fetchSparePartRequests(normalizedTicketId),
        ]);

        if (!ticket) {
            this.renderError(`Service ticket ${this.escapeHtml(normalizedTicketId)} was not found.`);
            this.emitToast('Service ticket details are unavailable right now.', 'error');
            return;
        }

        this._ticket = ticket;
        this._sparePartRequests = Array.isArray(sparePartRequests) ? sparePartRequests : [];
        if (this.normalizeStatus(ticket.status) !== 'in-progress') {
            this._showCompletionForm = false;
        }
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
        this._sparePartRequests = [];
        this._showCompletionForm = false;
        this._showStartTicketModal = false;
        this._startTicketExpectedCompletionDate = '';
        this.renderPlaceholder();
    }

    startTicket() {
        this.openStartTicketModal();
    }

    openStartTicketModal() {
        if (!this._ticketId || this._busy) {
            return;
        }

        const defaultExpectedDate = String(this._ticket?.scheduled_date || '').trim();
        this._startTicketExpectedCompletionDate = defaultExpectedDate;
        this._showStartTicketModal = true;
        this.renderTicket(this._ticket || {});
    }

    closeStartTicketModal() {
        if (this._busy) {
            return;
        }

        this._showStartTicketModal = false;
        this.renderTicket(this._ticket || {});
    }

    async submitStartTicketForm(form) {
        if (!form || this._busy) {
            return;
        }

        const formData = new FormData(form);
        const expectedCompletionDate = String(formData.get('expected_completion_date') || '').trim();

        const validation = this.validateExpectedCompletionDate(expectedCompletionDate);
        if (!validation.valid) {
            this.emitToast(validation.message, 'warning');
            return;
        }

        this._startTicketExpectedCompletionDate = validation.value;
        await this.submitStartTicket(validation.value);
    }

    async submitStartTicket(expectedCompletionDate) {
        if (!this._ticketId || this._busy) {
            return;
        }

        this._busy = true;
        this.renderTicket(this._ticket || {});
        try {
            const response = await API.post(`/service-tickets/${encodeURIComponent(String(this._ticketId))}/start`, {
                expected_completion_date: expectedCompletionDate,
            });
            if (!response || response.status !== 'success') {
                this.emitToast(response?.message || 'Failed to start service ticket.', 'error');
                return;
            }

            this.emitToast('Service ticket moved to In Progress.', 'success');
            this._showStartTicketModal = false;
            this._startTicketExpectedCompletionDate = '';

            // Clear busy before refresh so the newly rendered "End Service Operation" button is enabled.
            this._busy = false;
            await this.open(this._ticketId, { returnSection: this._returnSection });
        } catch (error) {
            console.error('Failed to start service ticket from detail view:', error);
            this.emitToast('Failed to start service ticket.', 'error');
        } finally {
            this._busy = false;
        }
    }

    validateExpectedCompletionDate(value) {
        if (!value) {
            return {
                valid: false,
                message: 'Expected completion date is required to start service work.',
            };
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return {
                valid: false,
                message: 'Expected completion date must use YYYY-MM-DD format.',
            };
        }

        const [year, month, day] = value.split('-').map(Number);
        const parsed = new Date(year, month - 1, day);
        if (
            Number.isNaN(parsed.getTime())
            || parsed.getFullYear() !== year
            || parsed.getMonth() !== month - 1
            || parsed.getDate() !== day
        ) {
            return {
                valid: false,
                message: 'Expected completion date is invalid.',
            };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        parsed.setHours(0, 0, 0, 0);
        if (parsed < today) {
            return {
                valid: false,
                message: 'Expected completion date cannot be in the past.',
            };
        }

        return {
            valid: true,
            value,
        };
    }

    async completeTicket(form) {
        if (!this._ticketId || this._busy) {
            return;
        }

        const formData = new FormData(form);
        const payload = {
            completion_notes: String(formData.get('completion_notes') || '').trim(),
            actual_cost: String(formData.get('actual_cost') || '').trim() || null,
            service_meter_reading: String(formData.get('service_meter_reading') || '').trim() || null,
            warranty_action: String(formData.get('warranty_action') || 'none').trim() || 'none',
            warranty_void_reason: String(formData.get('warranty_void_reason') || '').trim() || null,
        };

        const componentCommentInputs = Array.from(form.querySelectorAll('[data-component-comment]'));
        const componentComments = componentCommentInputs
            .map((input) => {
                const component = String(input.dataset.componentName || '').trim() || 'General';
                const comment = String(input.value || '').trim();
                return { component, comment };
            })
            .filter((entry) => entry.comment !== '');

        if (!payload.completion_notes) {
            this.emitToast('Overall asset status notes are required.', 'warning');
            return;
        }

        if (componentCommentInputs.length > 0 && componentComments.length === 0) {
            this.emitToast('Add at least one component-level comment before ending the operation.', 'warning');
            return;
        }

        if (payload.warranty_action === 'voided' && !payload.warranty_void_reason) {
            this.emitToast('Warranty void reason is required.', 'warning');
            return;
        }

        payload.component_comments = componentComments;

        this._busy = true;
        try {
            const response = await API.post(`/service-tickets/${encodeURIComponent(String(this._ticketId))}/complete`, payload);
            if (!response || response.status !== 'success') {
                this.emitToast(response?.message || 'Failed to complete service ticket.', 'error');
                return;
            }

            this._showCompletionForm = false;
            this.emitToast('Service ticket completed successfully.', 'success');
            await this.open(this._ticketId, { returnSection: this._returnSection });
        } catch (error) {
            console.error('Failed to complete service ticket from detail view:', error);
            this.emitToast('Failed to complete service ticket.', 'error');
        } finally {
            this._busy = false;
        }
    }

    emitToast(message, type = 'info') {
        this.dispatchEvent(new CustomEvent('to-service-ticket-detail-view:toast', {
            bubbles: true,
            detail: { message, type },
        }));
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
            return 'status-high';
        }
        if (normalized === 'low') {
            return 'status-scheduled';
        }

        return 'status-medium';
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
            // Fall back to comma-separated parsing.
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
            // No-op; fall through to empty array.
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
            'service-tickets': 'Service Tickets',
            notifications: 'Notifications',
        };

        if (labels[section]) {
            return labels[section];
        }

        if (!section) {
            return 'Service Tickets';
        }

        return section
            .split('-')
            .map((token) => token ? `${token.charAt(0).toUpperCase()}${token.slice(1)}` : '')
            .join(' ')
            .trim() || 'Service Tickets';
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

    renderOperationsPanel(ticket, components, componentComments) {
        const statusKey = this.normalizeStatus(ticket.status);
        const isBusy = this._busy;
        const latestSparePartRequest = this.getLatestSparePartRequest();
        const hasPendingSparePartRequest = this.hasPendingSparePartRequest();

        if (statusKey === 'assigned') {
            const latestStatusMeta = latestSparePartRequest
                ? this.getSparePartRequestStatusMeta(latestSparePartRequest.status)
                : null;

            return `
                <div class="service-ticket-detail-actions">
                    <h5><i class="fas fa-play-circle"></i> Service Operations</h5>
                    <p class="service-ticket-detail-action-hint">Request spare parts if needed before starting work. When you start the operation, you will be asked for an expected completion date. Start is temporarily locked while a request is awaiting Inventory Manager approval.</p>
                    <div class="service-ticket-detail-action-bar service-ticket-detail-start-actions">
                        <button class="btn btn-secondary" type="button" data-action="request-spare-parts" ${isBusy || hasPendingSparePartRequest ? 'disabled' : ''}>
                            <i class="fas fa-clipboard-list"></i> Request Spare Parts
                        </button>
                        <button class="btn btn-warning" type="button" data-action="start-ticket" ${isBusy || hasPendingSparePartRequest ? 'disabled' : ''}>
                            <i class="fas fa-play"></i> Start Service Operation
                        </button>
                    </div>
                    ${latestSparePartRequest ? `
                        <div class="service-ticket-detail-request-meta">
                            <p><strong>Latest Spare-Part Request:</strong> ${this.escapeHtml(latestSparePartRequest.request_id || '-')}</p>
                            <p><strong>Status:</strong> <span class="status-badge ${this.escapeHtml(latestStatusMeta.className)}">${this.escapeHtml(latestStatusMeta.label)}</span></p>
                            <p><strong>Updated:</strong> ${this.formatDateTime(latestSparePartRequest.updated_at || latestSparePartRequest.created_at)}</p>
                        </div>
                    ` : ''}
                    ${hasPendingSparePartRequest
                        ? '<p class="service-ticket-detail-action-hint" style="margin-top:10px; color:#b45309;"><i class="fas fa-hourglass-half"></i> A spare-part request is pending. Wait for approval or rejection before starting.</p>'
                        : ''}
                </div>
            `;
        }

        if (statusKey === 'in-progress') {
            return `
                <div class="service-ticket-detail-actions">
                    <h5><i class="fas fa-flag-checkered"></i> Service Operations</h5>
                    <p class="service-ticket-detail-action-hint">End the service operation with a full report, including component-level observations.</p>
                    <div class="service-ticket-detail-action-bar">
                        <button class="btn btn-primary" type="button" data-action="toggle-complete-form" ${isBusy ? 'disabled' : ''}>
                            <i class="fas fa-check-circle"></i> ${this._showCompletionForm ? 'Hide End Operation Form' : 'End Service Operation'}
                        </button>
                    </div>
                    ${this._showCompletionForm ? this.renderCompletionForm(ticket, components, componentComments) : ''}
                </div>
            `;
        }

        if (statusKey === 'completed') {
            return `
                <div class="service-ticket-detail-actions">
                    <h5><i class="fas fa-check-circle"></i> Service Operations</h5>
                    <p class="service-ticket-detail-action-hint">This service ticket has already been completed.</p>
                </div>
            `;
        }

        return `
            <div class="service-ticket-detail-actions">
                <h5><i class="fas fa-info-circle"></i> Service Operations</h5>
                <p class="service-ticket-detail-action-hint">This ticket must be assigned before service operations can start.</p>
            </div>
        `;
    }

    renderStartTicketModalMarkup(ticket, isBusy) {
        const defaultExpectedDate = this.escapeHtml(
            String(this._startTicketExpectedCompletionDate || ticket?.scheduled_date || '').trim()
        );
        const serviceTicketLabel = ticket?.service_ticket_id || ticket?.ticket_id || ticket?.id || this._ticketId || 'N/A';

        return `
            <div class="service-ticket-detail-start-modal" role="dialog" aria-modal="true" aria-labelledby="toStartServiceModalTitle">
                <div class="service-ticket-detail-start-modal-header">
                    <h3 class="service-ticket-detail-start-modal-title" id="toStartServiceModalTitle"><i class="fas fa-play"></i> Start Service Operation</h3>
                    <button
                        class="service-ticket-detail-start-modal-close"
                        type="button"
                        data-action="close-start-ticket-modal"
                        aria-label="Close start service modal"
                        ${isBusy ? 'disabled' : ''}
                    >
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form class="service-ticket-detail-start-modal-body" data-action="start-ticket-modal-form">
                    <div class="form-group">
                        <label class="form-label">Service Ticket</label>
                        <input type="text" class="form-input" value="${this.escapeHtml(serviceTicketLabel)}" readonly>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="expectedCompletionDateInput">Expected Completion Date</label>
                        <input
                            id="expectedCompletionDateInput"
                            class="form-input"
                            type="date"
                            name="expected_completion_date"
                            value="${defaultExpectedDate}"
                            required
                            ${isBusy ? 'disabled' : ''}
                        >
                    </div>
                    <div class="service-ticket-detail-start-modal-actions">
                        <button class="btn btn-secondary" type="button" data-action="cancel-start-ticket-modal" ${isBusy ? 'disabled' : ''}>
                            <i class="fas fa-times"></i> Cancel
                        </button>
                        <button class="btn btn-warning" type="submit" ${isBusy ? 'disabled' : ''}>
                            <i class="fas fa-play"></i> Start Service Operation
                        </button>
                    </div>
                </form>
            </div>
        `;
    }

    syncStartTicketModalPortal(ticket) {
        this.removeStartTicketModalPortal();

        if (!this._showStartTicketModal) {
            return;
        }

        const backdrop = document.createElement('div');
        backdrop.className = 'service-ticket-detail-start-modal-backdrop';
        backdrop.innerHTML = this.renderStartTicketModalMarkup(ticket || this._ticket || {}, this._busy);

        backdrop.addEventListener('click', (event) => {
            const closeActionNode = event.target.closest('[data-action="close-start-ticket-modal"], [data-action="cancel-start-ticket-modal"]');
            if (event.target === backdrop || closeActionNode) {
                event.preventDefault();
                this.closeStartTicketModal();
            }
        });

        const startForm = backdrop.querySelector('form[data-action="start-ticket-modal-form"]');
        if (startForm) {
            startForm.addEventListener('submit', (event) => {
                event.preventDefault();
                this.submitStartTicketForm(startForm);
            });
        }

        document.body.appendChild(backdrop);
        this._startTicketModalPortal = backdrop;
    }

    removeStartTicketModalPortal() {
        if (this._startTicketModalPortal && this._startTicketModalPortal.parentNode) {
            this._startTicketModalPortal.parentNode.removeChild(this._startTicketModalPortal);
        }

        this._startTicketModalPortal = null;
    }

    renderCompletionComponentFields(components, componentComments) {
        const commentLookup = this.buildComponentCommentLookup(componentComments);

        if (!components.length) {
            const generalComment = commentLookup.get('general')?.comment || '';
            return `
                <div class="service-ticket-detail-component-comment-grid">
                    <div class="service-ticket-detail-component-comment">
                        <label class="service-ticket-detail-component-title" for="componentCommentGeneral">Component Comment</label>
                        <textarea
                            id="componentCommentGeneral"
                            class="form-textarea"
                            data-component-comment
                            data-component-name="General"
                            placeholder="Capture component-level findings"
                        >${this.escapeHtml(generalComment)}</textarea>
                    </div>
                </div>
            `;
        }

        return `
            <div class="service-ticket-detail-component-comment-grid">
                ${components.map((component, index) => {
                    const key = String(component || '').trim().toLowerCase();
                    const existingComment = key ? (commentLookup.get(key)?.comment || '') : '';
                    return `
                        <div class="service-ticket-detail-component-comment">
                            <label class="service-ticket-detail-component-title" for="componentComment${index}">${this.escapeHtml(component)}</label>
                            <textarea
                                id="componentComment${index}"
                                class="form-textarea"
                                data-component-comment
                                data-component-name="${this.escapeHtml(component)}"
                                placeholder="Add observations or service notes for this component"
                            >${this.escapeHtml(existingComment)}</textarea>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    renderCompletionForm(ticket, components, componentComments) {
        const warrantyAction = String(ticket.warranty_action || 'none').toLowerCase();
        const showVoidReason = warrantyAction === 'voided';

        return `
            <form class="service-ticket-detail-complete-form" data-action="complete-form">
                <div class="form-group">
                    <label class="form-label">Overall Asset Status Notes</label>
                    <textarea
                        class="form-textarea"
                        name="completion_notes"
                        required
                        placeholder="Summarize overall work completed and final asset condition"
                    >${this.escapeHtml(ticket.completion_notes || '')}</textarea>
                </div>

                <h6 style="margin: 0 0 10px; color: var(--text-700);">Individual Component Comments</h6>
                ${this.renderCompletionComponentFields(components, componentComments)}

                <div class="form-grid" style="margin-top: 12px;">
                    <div class="form-group">
                        <label class="form-label">Actual Cost (LKR)</label>
                        <input class="form-input" name="actual_cost" type="number" min="0" step="0.01" value="${this.escapeHtml(ticket.actual_cost ?? '')}" placeholder="0.00">
                    </div>
                </div>

                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Meter/Hours Reading</label>
                        <input class="form-input" name="service_meter_reading" type="number" min="0" step="1" value="${this.escapeHtml(ticket.service_meter_reading ?? '')}" placeholder="e.g. 12500">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Warranty Action</label>
                        <select class="form-select" name="warranty_action" data-action="warranty-action">
                            <option value="none" ${warrantyAction === 'none' ? 'selected' : ''}>No change</option>
                            <option value="covered" ${warrantyAction === 'covered' ? 'selected' : ''}>Service covered by warranty</option>
                            <option value="voided" ${warrantyAction === 'voided' ? 'selected' : ''}>Void warranty</option>
                        </select>
                    </div>
                </div>

                <div class="form-group warranty-void-reason-group" style="display:${showVoidReason ? 'block' : 'none'};">
                    <label class="form-label">Warranty Void Reason</label>
                    <textarea class="form-textarea" name="warranty_void_reason" placeholder="Explain why warranty was voided">${this.escapeHtml(ticket.warranty_void_reason || '')}</textarea>
                </div>

                <div class="service-ticket-detail-action-bar">
                    <button class="btn btn-success" type="submit" ${this._busy ? 'disabled' : ''}>
                        <i class="fas fa-check-circle"></i> Submit Completion Report
                    </button>
                    <button class="btn btn-secondary" type="button" data-action="cancel-complete-form" ${this._busy ? 'disabled' : ''}>
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </form>
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
            this.renderField('Expected Cost', this.formatCurrency(ticket.estimated_cost)),
            this.renderField('Actual Cost', this.formatCurrency(ticket.actual_cost)),
            this.renderField('Next Service Date', this.formatDate(ticket.next_service_date)),
            this.renderField('Service Meter Reading', ticket.service_meter_reading ?? 'N/A'),
            this.renderField('Warranty Action', ticket.warranty_action || 'none'),
        ].join('');

        const hasServiceReport = this.normalizeStatus(ticket.status) === 'completed'
            || Boolean(String(ticket.completed_at || '').trim())
            || Boolean(String(ticket.completion_notes || '').trim())
            || Boolean(String(ticket.warranty_void_reason || '').trim())
            || (Array.isArray(componentComments) && componentComments.length > 0)
            || (ticket.actual_cost !== null && ticket.actual_cost !== undefined && String(ticket.actual_cost).trim() !== '')
            || String(ticket.warranty_action || 'none').toLowerCase() !== 'none';

        const overviewMetrics = [
            this.renderOverviewMetric('Service Type', ticket.service_type || 'N/A'),
            this.renderOverviewMetric('Asset', `${ticket.asset_name || 'N/A'} (${ticket.asset_code || 'N/A'})`),
            this.renderOverviewMetric('Reported By', ticket.reported_by_name || ticket.reported_by || 'N/A'),
            this.renderOverviewMetric('Assigned To', ticket.assigned_to_name || 'Unassigned'),
            this.renderOverviewMetric('Expected Completion', this.formatDate(ticket.scheduled_date)),
            this.renderOverviewMetric('Expected Cost', this.formatCurrency(ticket.estimated_cost)),
            this.renderOverviewMetric('Created', this.formatDateTime(ticket.created_at)),
            this.renderOverviewMetric('Started', this.formatDateTime(ticket.started_at)),
            this.renderOverviewMetric('Completed', this.formatDateTime(ticket.completed_at)),
        ].join('');

        this.innerHTML = `
            <div class="service-ticket-detail-shell">
                <div class="service-ticket-detail-subheader">
                    <div class="service-ticket-detail-subheader-inner">
                        <button class="service-ticket-detail-back" type="button" data-action="back" aria-label="Back to service tickets">
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
                            <p class="service-ticket-detail-subtitle">Review the complete service workflow with operations, asset details, and completion reporting.</p>
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

                <div class="service-ticket-detail-layout">
                    <div class="service-ticket-detail-main">
                        <section class="card service-ticket-detail-card">
                            <h2 class="service-ticket-detail-card-title"><i class="fas fa-cubes"></i> Asset Details</h2>
                            <div class="service-ticket-detail-info-grid">
                                ${assetFields}
                            </div>
                        </section>

                        ${hasServiceReport ? `
                            <section class="card service-ticket-detail-card">
                                <h2 class="service-ticket-detail-card-title"><i class="fas fa-clipboard-check"></i> Service Report Details</h2>
                                <div class="service-ticket-detail-info-grid">
                                    ${reportFields}
                                </div>
                                ${this.renderTextBlock('Maintenance Notes', ticket.maintenance_notes || '')}
                                ${this.renderTextBlock('Overall Asset Status Notes', ticket.completion_notes || '')}
                                ${this.renderTextBlock('Warranty Void Reason', ticket.warranty_void_reason || '')}
                            </section>
                        ` : ''}
                    </div>

                    <aside class="service-ticket-detail-side">
                        <section class="card service-ticket-detail-card">
                            ${this.renderOperationsPanel(ticket, components, componentComments)}
                        </section>

                        <section class="card service-ticket-detail-card">
                            <h2 class="service-ticket-detail-card-title"><i class="fas fa-microchip"></i> Individual Asset Components and Comments</h2>
                            ${this.renderComponents(components, componentComments)}
                        </section>
                    </aside>
                </div>
            </div>
        `;

        this.syncStartTicketModalPortal(ticket);
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

if (!customElements.get('to-service-ticket-detail-view')) {
    customElements.define('to-service-ticket-detail-view', TOServiceTicketDetailView);
}
