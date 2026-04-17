class TMGarages extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this._garages = [];
        this._searchTimer = null;

        this.loadStyles();
        this.render();
        this.bindEvents();
        this.refresh();
    }

    disconnectedCallback() {
        if (this._searchTimer) {
            clearTimeout(this._searchTimer);
            this._searchTimer = null;
        }
    }

    loadStyles() {
        const linkId = 'tm-garages-styles';
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = './components/garages/style.css';
            document.head.appendChild(link);
        }
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-warehouse"></i> Company Garages</h2>
                <p class="page-subtitle">Add and manage company-connected garages for route breakdown support</p>
            </div>

            <div class="garage-layout">
                <div class="card garage-create-card">
                    <div class="card-header garage-create-header">
                        <span><i class="fas fa-plus-circle"></i> Add Connected Garage</span>
                        <button class="btn btn-primary" type="button" data-action="add-garage">
                            <i class="fas fa-plus"></i> Add New Garage
                        </button>
                    </div>
                    <p class="garage-create-note">
                        Use the popup form to register a new connected garage for route-breakdown and approval workflows.
                    </p>
                </div>

                <div class="card garage-help-card">
                    <div class="card-header">
                        <span><i class="fas fa-circle-info"></i> Why this matters</span>
                    </div>
                    <ul class="garage-help-list">
                        <li>Newly added active garages appear in Driver nearby garage views.</li>
                        <li>Supervisor garage approval modal uses the same active garage list.</li>
                        <li>Coordinates enable map visibility during approval and navigation.</li>
                    </ul>
                    <p class="garage-help-note">
                        Tip: Enter both latitude and longitude for each garage to ensure map pin accuracy.
                    </p>
                </div>
            </div>

            <div class="card">
                <div class="card-header garage-list-header">
                    <span><i class="fas fa-store"></i> Registered Garages</span>
                    <span id="tmGarageCount" class="status-text status-normal">0 garages</span>
                </div>

                <div class="garage-list-toolbar">
                    <input id="tmGarageSearch" class="search-input" type="text" placeholder="Search by name, address, or city">
                    <label class="garage-checkbox-row compact" for="tmGarageIncludeInactive">
                        <input id="tmGarageIncludeInactive" type="checkbox">
                        <span>Show inactive</span>
                    </label>
                    <button class="btn btn-secondary btn-small" type="button" data-action="refresh">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>

                <div id="tmGarageList" class="garage-list-container">
                    <div class="loading-state">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>Loading garages...</span>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (!actionEl) {
                return;
            }

            const action = actionEl.dataset.action;
            if (action === 'add-garage') {
                this.dispatchEvent(new CustomEvent('tm-garages:add', { bubbles: true }));
                return;
            }

            if (action === 'refresh') {
                this.refresh();
                return;
            }

            if (action === 'directions') {
                const lat = String(actionEl.dataset.lat || '').trim();
                const lng = String(actionEl.dataset.lng || '').trim();
                const address = String(actionEl.dataset.address || '').trim();
                const name = String(actionEl.dataset.name || '').trim();

                let query = '';
                if (lat && lng) {
                    query = `${encodeURIComponent(lat)},${encodeURIComponent(lng)}`;
                } else if (address) {
                    query = encodeURIComponent(address);
                } else if (name) {
                    query = encodeURIComponent(name);
                }

                if (!query) {
                    this.emitToast('Location details are unavailable for this garage.', 'warning');
                    return;
                }

                window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank', 'noopener,noreferrer');
                return;
            }

            if (action === 'call') {
                const phone = String(actionEl.dataset.phone || '').trim();
                if (!phone) {
                    this.emitToast('Phone number is unavailable for this garage.', 'warning');
                    return;
                }

                window.location.href = `tel:${phone.replace(/\s+/g, '')}`;
            }
        });

        const searchInput = this.querySelector('#tmGarageSearch');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                if (this._searchTimer) {
                    clearTimeout(this._searchTimer);
                }

                this._searchTimer = setTimeout(() => {
                    this.refresh();
                }, 250);
            });
        }

        const includeInactive = this.querySelector('#tmGarageIncludeInactive');
        if (includeInactive) {
            includeInactive.addEventListener('change', () => {
                this.refresh();
            });
        }
    }

    emitToast(message, type = 'success') {
        if (window.TMUtils && typeof window.TMUtils.emitToast === 'function') {
            window.TMUtils.emitToast(message, type);
            return;
        }

        document.dispatchEvent(new CustomEvent('tm-ui:toast', {
            detail: { message, type },
        }));
    }

    escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => {
            if (char === '&') return '&amp;';
            if (char === '<') return '&lt;';
            if (char === '>') return '&gt;';
            if (char === '"') return '&quot;';
            return '&#39;';
        });
    }

    buildGarageQuery() {
        const params = new URLSearchParams();
        const searchQuery = String(this.querySelector('#tmGarageSearch')?.value || '').trim();
        const includeInactive = !!this.querySelector('#tmGarageIncludeInactive')?.checked;

        if (searchQuery) {
            params.set('q', searchQuery);
        }

        if (includeInactive) {
            params.set('include_inactive', 'true');
        }

        const query = params.toString();
        return query ? `?${query}` : '';
    }

    async refresh() {
        const listEl = this.querySelector('#tmGarageList');
        const countEl = this.querySelector('#tmGarageCount');

        if (!listEl || !countEl) {
            return;
        }

        listEl.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading garages...</span>
            </div>
        `;

        try {
            const response = await API.get(`/garages${this.buildGarageQuery()}`);
            if (response?.status !== 'success') {
                throw new Error(response?.message || 'Failed to load garages');
            }

            this._garages = Array.isArray(response?.data?.garages)
                ? response.data.garages
                : [];

            countEl.textContent = `${this._garages.length} garage${this._garages.length === 1 ? '' : 's'}`;
            this.renderGarageList();
        } catch (error) {
            console.error('TM garages refresh failed:', error);
            listEl.innerHTML = `
                <div class="empty-state error">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Failed to load garages</h3>
                    <p>${this.escapeHtml(error?.message || 'Please try again later.')}</p>
                </div>
            `;
            countEl.textContent = '0 garages';
        }
    }

    renderGarageList() {
        const listEl = this.querySelector('#tmGarageList');
        if (!listEl) {
            return;
        }

        if (!this._garages.length) {
            listEl.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-store-slash"></i>
                    <h3>No garages found</h3>
                    <p>Add a new garage or adjust your search filters.</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = this._garages.map((garage) => {
            const isActive = Number(garage.is_active) === 1;
            const nameValue = String(garage.name || `Garage #${garage.id}`);
            const addressValue = String(garage.address || '').trim();
            const cityValue = String(garage.city || '').trim();
            const phoneValue = String(garage.phone || '').trim();
            const latitudeValue = Number(garage.latitude);
            const longitudeValue = Number(garage.longitude);
            const hasCoordinates = Number.isFinite(latitudeValue) && Number.isFinite(longitudeValue);

            const name = this.escapeHtml(nameValue);
            const address = this.escapeHtml(addressValue || 'Address not available');
            const city = this.escapeHtml(cityValue || 'City not set');
            const phone = this.escapeHtml(phoneValue || 'No phone');

            const addressAttr = this.escapeHtml(addressValue);
            const phoneAttr = this.escapeHtml(phoneValue);
            const latitudeAttr = hasCoordinates ? String(latitudeValue) : '';
            const longitudeAttr = hasCoordinates ? String(longitudeValue) : '';

            return `
                <div class="inventory-item ${isActive ? 'completed' : 'cancelled'}">
                    <div class="item-details">
                        <strong><i class="fas fa-store"></i> ${name}</strong>
                        <div class="item-meta"><i class="fas fa-map-marker-alt"></i> ${address}</div>
                        <div class="item-meta"><i class="fas fa-city"></i> ${city}</div>
                        <div class="item-meta"><i class="fas fa-phone"></i> ${phone}</div>
                        <div class="item-meta"><i class="fas fa-location-arrow"></i> ${hasCoordinates ? `${latitudeAttr}, ${longitudeAttr}` : 'Coordinates not set'}</div>
                    </div>
                    <div class="item-actions">
                        <span class="garage-status-chip ${isActive ? 'active' : 'inactive'}">${isActive ? 'Active' : 'Inactive'}</span>
                        <div class="btn-group">
                            <button
                                class="btn btn-primary btn-small"
                                type="button"
                                data-action="directions"
                                data-name="${name}"
                                data-address="${addressAttr}"
                                data-lat="${latitudeAttr}"
                                data-lng="${longitudeAttr}"
                            >
                                <i class="fas fa-map"></i> Directions
                            </button>
                            <button
                                class="btn btn-secondary btn-small"
                                type="button"
                                data-action="call"
                                data-phone="${phoneAttr}"
                            >
                                <i class="fas fa-phone"></i> Call
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

}

customElements.define('tm-garages', TMGarages);
