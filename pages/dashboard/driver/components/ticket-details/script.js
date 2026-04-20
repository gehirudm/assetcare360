class DriverTicketDetailView extends HTMLElement {
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
        return String(this.getAttribute('default-return-section') || 'breakdown').trim() || 'breakdown';
    }

    get detailStyleLinkId() {
        return 'driver-ticket-detail-view-style';
    }

    get detailOverridesStyleLinkId() {
        return 'driver-ticket-detail-view-overrides-style';
    }

    get detailInlineStyleId() {
        return 'driver-ticket-detail-view-inline-style';
    }

    ensureScopedStyles() {
        if (document.getElementById('driver-ticket-detail-component-style')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'driver-ticket-detail-component-style';
        style.textContent = `
            driver-ticket-detail-view {
                display: block;
            }

            driver-ticket-detail-view .container {
                min-height: auto;
            }

            driver-ticket-detail-view .main-wrapper {
                display: block;
            }

            driver-ticket-detail-view .main-content.detail-page-content {
                width: 100%;
                max-width: none;
                padding: 0 0 24px;
                margin: 0;
                min-height: 0;
                overflow: visible;
            }

            driver-ticket-detail-view .detail-subheader {
                position: relative;
                z-index: 3;
            }

            driver-ticket-detail-view .route-location-map,
            driver-ticket-detail-view .garage-approval-map,
            driver-ticket-detail-view .leaflet-container,
            driver-ticket-detail-view .leaflet-pane,
            driver-ticket-detail-view .leaflet-top,
            driver-ticket-detail-view .leaflet-bottom {
                z-index: 1 !important;
            }

            driver-ticket-detail-view to-shell-header,
            driver-ticket-detail-view to-shell-sidebar {
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
                    <span>Select a breakdown report to open its linked ticket details.</span>
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
        this.loadStyleOnce('../../view-ticket/style.css', this.detailStyleLinkId);
        this.loadStyleOnce('../technical-officer/view-ticket/style.css', this.detailOverridesStyleLinkId);

        await this.loadScriptOnce('../../js/fault-ticket-detail-template.js', 'driver-ticket-detail-template-script');
        await this.loadScriptOnce('../../view-ticket/script.js', 'driver-ticket-detail-runtime-script');
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
        if (inlineStyle && !document.getElementById(this.detailInlineStyleId)) {
            const style = document.createElement('style');
            style.id = this.detailInlineStyleId;
            style.textContent = inlineStyle.textContent;
            document.head.appendChild(style);
        }

        container.querySelector('to-shell-header')?.remove();
        container.querySelector('to-shell-sidebar')?.remove();

        this.innerHTML = '';
        this.appendChild(container);

        this._templateReady = true;
    }

    cleanupViewTicketAssets() {
        [
            this.detailStyleLinkId,
            this.detailOverridesStyleLinkId,
            this.detailInlineStyleId,
        ].forEach((id) => {
            const node = document.getElementById(id);
            if (node && node.parentNode) {
                node.parentNode.removeChild(node);
            }
        });
    }

    buildRuntimeContext() {
        return {
            ticketId: this._ticketId,
            roleOverride: 'DRIVER',
            returnTo: this.buildReturnPath(this._returnSection),
            dashboardComponentMode: true,
            onBack: () => {
                this.dispatchEvent(new CustomEvent('driver-ticket-detail-view:back', {
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
            this.dispatchEvent(new CustomEvent('driver-ticket-detail-view:toast', {
                bubbles: true,
                detail: {
                    message: 'Invalid ticket ID.',
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
            console.error('Driver ticket detail open error:', error);
            this.renderPlaceholder();
            this._templateReady = false;
            this.dispatchEvent(new CustomEvent('driver-ticket-detail-view:toast', {
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
        this.cleanupViewTicketAssets();
        this.renderPlaceholder();
    }
}

if (!customElements.get('driver-ticket-detail-view')) {
    customElements.define('driver-ticket-detail-view', DriverTicketDetailView);
}
