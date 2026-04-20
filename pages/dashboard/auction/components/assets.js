class AuctionAssets extends HTMLElement {
    constructor() {
        super();
        this.assets = [];
        this.currentFilter = 'all';
    }

    connectedCallback() {
        if (this._mounted) {
            return;
        }
        this._mounted = true;
        this.render();
        this.bindEvents();
        this.refresh();
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Assets for Auction</h1>
                <p class="page-subtitle">Manage vehicles and machinery marked for disposal</p>
            </div>

            <div class="filter-controls" data-filter-group="assets">
                <button class="filter-btn active" type="button" data-filter="all">All Assets</button>
                <button class="filter-btn" type="button" data-filter="good">Good Condition</button>
                <button class="filter-btn" type="button" data-filter="fair">Fair Condition</button>
                <button class="filter-btn" type="button" data-filter="vehicles">Vehicles</button>
                <button class="filter-btn" type="button" data-filter="equipment">Equipment</button>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-truck"></i> Assets Ready for Auction</span>
                    <span class="status-badge status-pending" id="assetsAvailabilityBadge">0 available</span>
                </div>
                <div id="assetsContainer">
                    <div style="text-align:center; padding: 32px; color: var(--muted);">
                        <i class="fas fa-spinner fa-spin" style="font-size: 1.8rem; margin-bottom: 10px;"></i>
                        <p>Loading assets marked for auction...</p>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (!button) {
                return;
            }

            if (button.dataset.filter) {
                this.filterAssets(button.dataset.filter, button);
                return;
            }

            if (button.dataset.action === 'view-asset') {
                this.emitToast(`Viewing asset: ${button.dataset.assetId}`);
                return;
            }

            if (button.dataset.action === 'schedule-asset') {
                this.emit('auction-assets:schedule', { assetId: button.dataset.assetId });
                this.emitToast(`Preparing schedule for ${button.dataset.assetId}`);
            }
        });
    }

    async refresh() {
        const container = this.querySelector('#assetsContainer');
        if (container) {
            container.innerHTML = `
                <div style="text-align:center; padding: 32px; color: var(--muted);">
                    <i class="fas fa-spinner fa-spin" style="font-size: 1.8rem; margin-bottom: 10px;"></i>
                    <p>Loading assets marked for auction...</p>
                </div>
            `;
        }

        try {
            const [vehicleResponse, machineResponse] = await Promise.all([
                API.get('/vehicles?status=For%20Auction&per_page=200'),
                API.get('/machines?status=For%20Auction&per_page=200'),
            ]);

            const vehicles = this.extractList(vehicleResponse, 'vehicles')
                .map((vehicle) => this.normalizeVehicle(vehicle));
            const machines = this.extractList(machineResponse, 'machines')
                .map((machine) => this.normalizeMachine(machine));

            this.assets = [...vehicles, ...machines];
            this.renderAssets(this.assets);
            this.updateAvailabilityBadge(this.assets.length);

            const activeFilterButton = this.querySelector(`.filter-btn[data-filter="${this.currentFilter}"]`);
            this.filterAssets(this.currentFilter, activeFilterButton, { silent: true });
        } catch (error) {
            console.error('Failed to load auction assets:', error);
            this.assets = [];
            this.renderAssets([]);
            this.updateAvailabilityBadge(0);
            this.emitToast(error?.message || 'Failed to load auction assets', 'error');
        }
    }

    renderAssets(assetRows) {
        const container = this.querySelector('#assetsContainer');
        if (!container) {
            return;
        }

        if (!Array.isArray(assetRows) || assetRows.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding: 32px; color: var(--muted);">
                    <i class="fas fa-box-open" style="font-size: 1.8rem; margin-bottom: 10px;"></i>
                    <p>No assets are currently marked for auction.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = assetRows.map((asset) => {
            const statusBadgeClass = asset.condition === 'good' ? 'status-approved' : 'status-pending';
            const statusLabel = asset.condition === 'good' ? 'Good' : 'Fair';

            return `
                <div class="item-card" data-status="${asset.condition}" data-type="${asset.type}">
                    <div class="item-details">
                        <strong>${asset.name}</strong>
                        <div class="item-meta">${asset.meta}</div>
                        <div class="item-description">${asset.description}</div>
                    </div>
                    <div class="item-actions">
                        <span class="status-badge ${statusBadgeClass}">${statusLabel}</span>
                        <button class="btn btn-primary btn-small" type="button" data-action="view-asset" data-asset-id="${asset.assetId}"><i class="fas fa-eye"></i> View</button>
                        <button class="btn btn-success btn-small" type="button" data-action="schedule-asset" data-asset-id="${asset.assetId}"><i class="fas fa-calendar-alt"></i> Schedule</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    filterAssets(criteria, activeButton, options = {}) {
        this.currentFilter = criteria;
        const cards = this.querySelectorAll('#assetsContainer .item-card');
        let visibleCount = 0;

        cards.forEach((card) => {
            const cardStatus = card.dataset.status;
            const cardType = card.dataset.type;
            let shouldShow = false;

            if (criteria === 'all') {
                shouldShow = true;
            } else if (criteria === 'good' && cardStatus === 'good') {
                shouldShow = true;
            } else if (criteria === 'fair' && cardStatus === 'fair') {
                shouldShow = true;
            } else if (criteria === 'vehicles' && cardType === 'vehicles') {
                shouldShow = true;
            } else if (criteria === 'equipment' && cardType === 'equipment') {
                shouldShow = true;
            }

            card.style.display = shouldShow ? 'flex' : 'none';
            if (shouldShow) {
                visibleCount += 1;
            }
        });

        if (activeButton) {
            this.updateFilterButtons(activeButton);
        }

        if (!options.silent) {
            this.emitToast(`Showing ${visibleCount} assets`);
        }
    }

    updateFilterButtons(activeButton) {
        if (!activeButton) {
            return;
        }

        const group = activeButton.closest('[data-filter-group]');
        if (!group) {
            return;
        }

        group.querySelectorAll('.filter-btn').forEach((button) => button.classList.remove('active'));
        activeButton.classList.add('active');
    }

    emit(eventName, detail = {}) {
        this.dispatchEvent(new CustomEvent(eventName, {
            bubbles: true,
            detail,
        }));
    }

    emitToast(message, type = 'success') {
        this.emit('auction-ui:toast', { message, type });
    }

    updateAvailabilityBadge(count) {
        const badge = this.querySelector('#assetsAvailabilityBadge');
        if (!badge) {
            return;
        }

        badge.textContent = `${count} available`;
    }

    extractList(response, key) {
        if (!response) {
            return [];
        }

        if (Array.isArray(response)) {
            return response;
        }

        if (Array.isArray(response.data?.[key])) {
            return response.data[key];
        }

        if (Array.isArray(response[key])) {
            return response[key];
        }

        return [];
    }

    normalizeVehicle(vehicle) {
        const notes = this.cleanText(vehicle?.notes);
        const condition = this.inferCondition(notes);
        const mileage = this.toNumber(vehicle?.current_mileage ?? vehicle?.mileage);
        const mileageText = mileage > 0 ? `${mileage.toLocaleString()} km` : 'Mileage not recorded';

        return {
            type: 'vehicles',
            condition,
            assetId: this.cleanText(vehicle?.vehicle_id) || `VEH-${vehicle?.id ?? 'N/A'}`,
            name: this.cleanText(vehicle?.vehicle_name) || 'Unnamed Vehicle',
            meta: `${this.cleanText(vehicle?.model_number) || 'Model not specified'} · ${this.cleanText(vehicle?.number_plate) || 'Number plate not set'}`,
            description: notes
                ? `${notes} | ${this.conditionLabel(condition)} condition`
                : `${mileageText} | ${this.conditionLabel(condition)} condition`,
        };
    }

    normalizeMachine(machine) {
        const notes = this.cleanText(machine?.notes);
        const condition = this.inferCondition(notes);
        const hours = this.toNumber(machine?.current_operating_hours);
        const hoursText = hours > 0 ? `${hours.toLocaleString()} h` : 'Operating hours not recorded';

        return {
            type: 'equipment',
            condition,
            assetId: this.cleanText(machine?.machine_id) || `MCH-${machine?.id ?? 'N/A'}`,
            name: this.cleanText(machine?.machine_name) || 'Unnamed Machine',
            meta: `${this.cleanText(machine?.model_number) || 'Model not specified'} · ${this.cleanText(machine?.location) || 'Location not set'}`,
            description: notes
                ? `${notes} | ${this.conditionLabel(condition)} condition`
                : `${hoursText} | ${this.conditionLabel(condition)} condition`,
        };
    }

    inferCondition(notes) {
        const text = String(notes || '').toLowerCase();
        if (text.includes('good') || text.includes('excellent') || text.includes('ready')) {
            return 'good';
        }

        return 'fair';
    }

    conditionLabel(condition) {
        return condition === 'good' ? 'Good' : 'Fair';
    }

    cleanText(value) {
        return String(value || '').trim();
    }

    toNumber(value) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
}

customElements.define('auction-assets', AuctionAssets);
