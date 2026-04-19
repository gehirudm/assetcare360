class SupervisorTicketDetailView extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this._ticketId = null;
        this._returnSection = this.defaultReturnSection;
        this._focusHash = '';
        this._templateReady = false;

        this.ensureScopedStyles();
        this.renderPlaceholder();
    }

    get defaultReturnSection() {
        return String(this.getAttribute('default-return-section') || 'fault-ticket-tracking').trim() || 'fault-ticket-tracking';
    }

    ensureScopedStyles() {
        if (document.getElementById('supervisor-ticket-detail-component-style')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'supervisor-ticket-detail-component-style';
        style.textContent = `
            supervisor-ticket-detail-view {
                display: block;
            }

            supervisor-ticket-detail-view .container {
                min-height: auto;
            }

            supervisor-ticket-detail-view .main-wrapper {
                display: block;
            }

            supervisor-ticket-detail-view .main-content.detail-page-content {
                width: 100%;
                max-width: none;
                padding: 0 0 24px;
                margin: 0;
                min-height: 0;
                overflow: visible;
            }

            supervisor-ticket-detail-view .detail-subheader {
                position: relative;
                z-index: 3;
            }

            supervisor-ticket-detail-view .route-location-map,
            supervisor-ticket-detail-view .garage-approval-map,
            supervisor-ticket-detail-view .leaflet-container,
            supervisor-ticket-detail-view .leaflet-pane,
            supervisor-ticket-detail-view .leaflet-top,
            supervisor-ticket-detail-view .leaflet-bottom {
                z-index: 1 !important;
            }

            supervisor-ticket-detail-view to-shell-header,
            supervisor-ticket-detail-view to-shell-sidebar {
                display: none !important;
            }
        `;

        document.head.appendChild(style);
    }

    renderPlaceholder() {
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

    buildViewTicketUrl(pathname) {
        return new URL(pathname, window.location.href).toString();
    }

    async loadScriptOnce(pathname, markerId) {
        if (document.getElementById(markerId)) {
            return;
        }

        const script = document.createElement('script');
        script.id = markerId;
        script.src = this.buildViewTicketUrl(pathname);

        await new Promise((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${pathname}`));
            document.head.appendChild(script);
        });
    }

    loadStyleOnce(pathname, markerId) {
        if (document.getElementById(markerId)) {
            return;
        }

        const link = document.createElement('link');
        link.id = markerId;
        link.rel = 'stylesheet';
        link.href = this.buildViewTicketUrl(pathname);
        document.head.appendChild(link);
    }

    async ensureViewTicketAssets() {
        this.loadStyleOnce('../../view-ticket/style.css', 'supervisor-ticket-detail-view-style');
        this.loadStyleOnce('../technical-officer/view-ticket/style.css', 'supervisor-ticket-detail-view-overrides-style');

        await this.loadScriptOnce('../../js/fault-ticket-detail-template.js', 'supervisor-ticket-detail-template-script');
        await this.loadScriptOnce('../../view-ticket/script.js', 'supervisor-ticket-detail-runtime-script');
    }

    async ensureViewTicketTemplate() {
        if (this._templateReady) {
            return;
        }

        const response = await fetch(this.buildViewTicketUrl('../../view-ticket/index.html'), {
            credentials: 'same-origin',
        });

        if (!response.ok) {
            throw new Error('Unable to load ticket detail template.');
        }

        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const container = doc.querySelector('body > .container');

        if (!container) {
            throw new Error('Ticket detail template is invalid.');
        }

        const inlineStyle = doc.querySelector('head style');
        if (inlineStyle && !document.getElementById('view-ticket-inline-style')) {
            const style = document.createElement('style');
            style.id = 'view-ticket-inline-style';
            style.textContent = inlineStyle.textContent;
            document.head.appendChild(style);
        }

        container.querySelector('to-shell-header')?.remove();
        container.querySelector('to-shell-sidebar')?.remove();

        this.innerHTML = '';
        this.appendChild(container);

        this._templateReady = true;
    }

    buildRuntimeContext() {
        return {
            ticketId: this._ticketId,
            roleOverride: 'SUPERVISOR',
            returnTo: this.buildReturnPath(this._returnSection),
            dashboardComponentMode: true,
            onBack: () => {
                this.dispatchEvent(new CustomEvent('supervisor-ticket-detail-view:back', {
                    bubbles: true,
                    detail: {
                        returnSection: this._returnSection || this.defaultReturnSection,
                    }
                }));
            },
        };
    }

    async open(ticketId, options = {}) {
        const numericTicketId = Number(ticketId);
        if (!Number.isFinite(numericTicketId) || numericTicketId <= 0) {
            this.dispatchEvent(new CustomEvent('supervisor-ticket-detail-view:toast', {
                bubbles: true,
                detail: {
                    message: 'Invalid ticket ID',
                    type: 'error',
                }
            }));
            return;
        }

        const returnSection = String(options.returnSection || this.defaultReturnSection).trim() || this.defaultReturnSection;
        this._ticketId = numericTicketId;
        this._returnSection = returnSection;
        this._focusHash = String(options.focusHash || '').trim().replace(/^#/, '');

        try {
            await this.ensureViewTicketTemplate();
            window.__ACViewTicketContext = this.buildRuntimeContext();
            await this.ensureViewTicketAssets();

            if (!window.ViewTicketPage || typeof window.ViewTicketPage.initialize !== 'function') {
                throw new Error('Ticket detail runtime is unavailable.');
            }

            await window.ViewTicketPage.initialize(this.buildRuntimeContext());

            if (this._focusHash) {
                window.setTimeout(() => {
                    const focusTarget = document.getElementById(this._focusHash);
                    if (focusTarget && typeof focusTarget.scrollIntoView === 'function') {
                        focusTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 60);
            }
        } catch (error) {
            console.error('Supervisor ticket detail open error:', error);
            this.renderPlaceholder();
            this._templateReady = false;
            this.dispatchEvent(new CustomEvent('supervisor-ticket-detail-view:toast', {
                bubbles: true,
                detail: {
                    message: 'Unable to open ticket details right now.',
                    type: 'error',
                }
            }));
        }
    }

    refresh() {
        if (!this._ticketId) {
            this.renderPlaceholder();
            return;
        }

        void this.open(this._ticketId, {
            returnSection: this._returnSection,
            focusHash: this._focusHash,
        });
    }

    closeView() {
        this._ticketId = null;
        this._focusHash = '';
        this._templateReady = false;
        delete window.__ACViewTicketContext;
        this.renderPlaceholder();
    }
}

if (!customElements.get('supervisor-ticket-detail-view')) {
    customElements.define('supervisor-ticket-detail-view', SupervisorTicketDetailView);
}