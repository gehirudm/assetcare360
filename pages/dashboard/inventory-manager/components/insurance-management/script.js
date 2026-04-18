/**
 * inventory-insurance-management.js
 * Inventory insurance renewals section for machines and vehicles.
 */

class InventoryInsuranceManagement extends HTMLElement {
    constructor() {
        super();
        this.assets = [];
        this.filteredAssets = [];
        this.currentFilter = 'upcoming';
        this.currentSearch = '';
        this.currentRenewalAsset = null;
    }

    connectedCallback() {
        this.loadStyles();
        this.render();
        this.bindEvents();
        this.refresh();
    }

    loadStyles() {
        const linkId = 'inventory-insurance-management-styles';
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = './components/insurance-management/style.css';
            document.head.appendChild(link);
        }
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-shield-alt"></i> Insurance Management</h2>
                <p class="page-subtitle">Track upcoming insurance renewals and submit renewal updates for machines and vehicles.</p>
            </div>

            <div id="insuranceStatusBanner"></div>

            <div class="insurance-summary-grid" id="insuranceSummaryGrid"></div>

            <div class="insurance-controls">
                <input
                    id="insuranceSearch"
                    class="form-input insurance-search"
                    type="text"
                    placeholder="Search by asset name, ID, provider, or number plate..."
                >
                <div class="insurance-filter-buttons" id="insuranceFilterButtons">
                    <button class="insurance-filter-btn active" data-filter="upcoming" type="button">Upcoming</button>
                    <button class="insurance-filter-btn" data-filter="overdue" type="button">Overdue</button>
                    <button class="insurance-filter-btn" data-filter="missing" type="button">Missing Data</button>
                    <button class="insurance-filter-btn" data-filter="all" type="button">All</button>
                </div>
            </div>

            <div class="insurance-list" id="insuranceList"></div>

            <div class="modal" id="insuranceRenewalModal">
                <div class="modal-content insurance-modal-card">
                    <div class="modal-header">
                        <h2><i class="fas fa-file-signature"></i> Submit Insurance Renewal</h2>
                        <button class="btn-close" type="button" data-action="close-renewal-modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <p class="insurance-modal-subtitle" id="insuranceRenewalAssetLabel"></p>
                    <form id="insuranceRenewalForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Insurance Type *</label>
                                <select id="insuranceRenewalType" class="form-select" required>
                                    <option value="">Select Insurance Type</option>
                                    <option value="Full">Full</option>
                                    <option value="Third-Party">Third-Party</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Insurance Provider *</label>
                                <input id="insuranceRenewalProvider" class="form-input" type="text" required>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Provider Details *</label>
                                <textarea id="insuranceRenewalProviderDetails" class="form-textarea" rows="2" required></textarea>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Renew Interval (Days) *</label>
                                <input id="insuranceRenewalIntervalDays" class="form-input" type="number" min="1" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Last Renew Date *</label>
                                <input id="insuranceRenewalLastDate" class="form-input" type="date" max="${new Date().toISOString().split('T')[0]}" required>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Last Renew Details *</label>
                                <textarea id="insuranceRenewalLastDetails" class="form-textarea" rows="3" required></textarea>
                            </div>
                        </div>

                        <div class="form-actions">
                            <button class="btn btn-secondary" type="button" data-action="close-renewal-modal">Cancel</button>
                            <button class="btn btn-primary" id="insuranceRenewalSubmitBtn" type="submit">Save Renewal</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        this.renderSummary();
        this.renderList();
    }

    bindEvents() {
        const filterButtons = this.querySelectorAll('#insuranceFilterButtons .insurance-filter-btn');
        filterButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const filter = button.dataset.filter;
                this.currentFilter = filter || 'upcoming';

                filterButtons.forEach((btn) => btn.classList.remove('active'));
                button.classList.add('active');
                this.applyFilters();
            });
        });

        const searchInput = this.querySelector('#insuranceSearch');
        searchInput?.addEventListener('input', (event) => {
            this.currentSearch = String(event.target.value || '').trim().toLowerCase();
            this.applyFilters();
        });

        this.addEventListener('click', (event) => {
            const actionElement = event.target.closest('[data-action]');
            if (!actionElement) {
                if (event.target.id === 'insuranceRenewalModal') {
                    this.closeRenewalModal();
                }
                return;
            }

            const action = actionElement.dataset.action;
            if (action === 'open-renewal-modal') {
                const assetType = actionElement.dataset.assetType;
                const assetId = Number(actionElement.dataset.assetId || 0);
                this.openRenewalModal(assetType, assetId);
                return;
            }

            if (action === 'close-renewal-modal') {
                this.closeRenewalModal();
            }
        });

        const form = this.querySelector('#insuranceRenewalForm');
        form?.addEventListener('submit', async (event) => {
            event.preventDefault();
            await this.submitRenewal();
        });
    }

    async refresh() {
        this.renderStatusBanner('Refreshing insurance data...', 'loading');

        try {
            const [machinesResponse, vehiclesResponse] = await Promise.all([
                API.get('/machines?per_page=500'),
                API.get('/vehicles?per_page=500'),
            ]);

            const machines = this.extractItems(machinesResponse, 'machines');
            const vehicles = this.extractItems(vehiclesResponse, 'vehicles');

            const machineAssets = machines.map((machine) => this.mapMachineAsset(machine));
            const vehicleAssets = vehicles.map((vehicle) => this.mapVehicleAsset(vehicle));

            this.assets = [...machineAssets, ...vehicleAssets].sort((first, second) => {
                const firstDate = this.getComparableDate(first.next_insurance_renew_date);
                const secondDate = this.getComparableDate(second.next_insurance_renew_date);
                return firstDate - secondDate;
            });

            this.renderStatusBanner('');
            this.applyFilters();
        } catch (error) {
            console.error('Failed to refresh insurance management section:', error);
            this.assets = [];
            this.filteredAssets = [];
            this.renderStatusBanner(error.message || 'Failed to load insurance data.', 'error');
            this.renderSummary();
            this.renderList();
        }
    }

    extractItems(response, key) {
        if (!response || response.status !== 'success') {
            return [];
        }

        if (Array.isArray(response.data)) {
            return response.data;
        }

        if (response.data && Array.isArray(response.data[key])) {
            return response.data[key];
        }

        return [];
    }

    mapMachineAsset(machine) {
        return {
            asset_type: 'machine',
            id: Number(machine.id || 0),
            asset_code: machine.machine_id || `MCH-${machine.id}`,
            asset_name: machine.machine_name || 'Machine',
            model_number: machine.model_number || 'N/A',
            display_identifier: machine.location || 'N/A',
            insurance_type: machine.insurance_type || '',
            insurance_provider: machine.insurance_provider || '',
            insurance_provider_details: machine.insurance_provider_details || '',
            insurance_renew_interval_days: this.parsePositiveInteger(machine.insurance_renew_interval_days),
            last_insurance_renew_date: machine.last_insurance_renew_date || '',
            last_insurance_renew_details: machine.last_insurance_renew_details || '',
            next_insurance_renew_date: machine.next_insurance_renew_date || '',
        };
    }

    mapVehicleAsset(vehicle) {
        return {
            asset_type: 'vehicle',
            id: Number(vehicle.id || 0),
            asset_code: vehicle.vehicle_id || `VEH-${vehicle.id}`,
            asset_name: vehicle.vehicle_name || 'Vehicle',
            model_number: vehicle.model_number || 'N/A',
            display_identifier: vehicle.number_plate || 'N/A',
            insurance_type: vehicle.insurance_type || '',
            insurance_provider: vehicle.insurance_provider || '',
            insurance_provider_details: vehicle.insurance_provider_details || '',
            insurance_renew_interval_days: this.parsePositiveInteger(vehicle.insurance_renew_interval_days),
            last_insurance_renew_date: vehicle.last_insurance_renew_date || '',
            last_insurance_renew_details: vehicle.last_insurance_renew_details || '',
            next_insurance_renew_date: vehicle.next_insurance_renew_date || '',
        };
    }

    applyFilters() {
        const filtered = this.assets.filter((asset) => {
            const renewalState = this.getRenewalState(asset.next_insurance_renew_date);

            if (this.currentFilter !== 'all' && renewalState.key !== this.currentFilter) {
                return false;
            }

            if (!this.currentSearch) {
                return true;
            }

            const searchTarget = [
                asset.asset_code,
                asset.asset_name,
                asset.model_number,
                asset.display_identifier,
                asset.insurance_provider,
            ].join(' ').toLowerCase();

            return searchTarget.includes(this.currentSearch);
        });

        this.filteredAssets = filtered;
        this.renderSummary();
        this.renderList();
    }

    renderSummary() {
        const summaryRoot = this.querySelector('#insuranceSummaryGrid');
        if (!summaryRoot) return;

        const upcoming = this.assets.filter((asset) => this.getRenewalState(asset.next_insurance_renew_date).key === 'upcoming').length;
        const overdue = this.assets.filter((asset) => this.getRenewalState(asset.next_insurance_renew_date).key === 'overdue').length;
        const missing = this.assets.filter((asset) => this.getRenewalState(asset.next_insurance_renew_date).key === 'missing').length;

        summaryRoot.innerHTML = `
            <div class="insurance-summary-card">
                <div class="insurance-summary-title">Upcoming Insurance Renewals</div>
                <div class="insurance-summary-value">${upcoming}</div>
            </div>
            <div class="insurance-summary-card">
                <div class="insurance-summary-title">Overdue Renewals</div>
                <div class="insurance-summary-value">${overdue}</div>
            </div>
            <div class="insurance-summary-card">
                <div class="insurance-summary-title">Missing Insurance Data</div>
                <div class="insurance-summary-value">${missing}</div>
            </div>
            <div class="insurance-summary-card">
                <div class="insurance-summary-title">Tracked Assets</div>
                <div class="insurance-summary-value">${this.assets.length}</div>
            </div>
        `;
    }

    renderList() {
        const listRoot = this.querySelector('#insuranceList');
        if (!listRoot) return;

        if (!this.filteredAssets.length) {
            listRoot.innerHTML = `
                <div class="insurance-empty">
                    <i class="fas fa-shield-alt" style="font-size: 1.7rem; margin-bottom: 8px;"></i>
                    <p>No matching insurance renewal records were found.</p>
                </div>
            `;
            return;
        }

        listRoot.innerHTML = this.filteredAssets.map((asset) => {
            const renewalState = this.getRenewalState(asset.next_insurance_renew_date);
            const daysLabel = renewalState.daysUntil === null
                ? 'No renewal schedule'
                : (renewalState.daysUntil < 0
                    ? `${Math.abs(renewalState.daysUntil)} day(s) overdue`
                    : `${renewalState.daysUntil} day(s) remaining`);

            return `
                <div class="insurance-item">
                    <div class="insurance-item-main">
                        <div class="insurance-item-title">
                            <span class="insurance-asset-chip ${asset.asset_type}">${asset.asset_type}</span>
                            <span>${this.escapeHtml(asset.asset_name)} (${this.escapeHtml(asset.asset_code)})</span>
                        </div>
                        <div class="insurance-item-meta">
                            Model: ${this.escapeHtml(asset.model_number)} | ${asset.asset_type === 'vehicle' ? 'Number Plate' : 'Location'}: ${this.escapeHtml(asset.display_identifier)}
                        </div>
                        <div class="insurance-item-meta">
                            Insurance: ${this.escapeHtml(asset.insurance_type || 'N/A')} | Provider: ${this.escapeHtml(asset.insurance_provider || 'N/A')}
                        </div>
                        <div class="insurance-status-row">
                            <span class="insurance-status-chip ${renewalState.key}">${renewalState.label}</span>
                            <span class="insurance-item-meta">Next renew: ${this.formatDate(asset.next_insurance_renew_date)} (${daysLabel})</span>
                        </div>
                    </div>
                    <div class="insurance-item-actions">
                        <button
                            class="btn btn-primary btn-small"
                            type="button"
                            data-action="open-renewal-modal"
                            data-asset-type="${asset.asset_type}"
                            data-asset-id="${asset.id}"
                        >
                            <i class="fas fa-file-signature"></i> Submit Renewal
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    openRenewalModal(assetType, assetId) {
        const asset = this.assets.find((item) => item.asset_type === assetType && item.id === Number(assetId));
        if (!asset) {
            Utils.showToast('Unable to locate selected asset for renewal.', 'error');
            return;
        }

        this.currentRenewalAsset = asset;

        const modal = this.querySelector('#insuranceRenewalModal');
        const label = this.querySelector('#insuranceRenewalAssetLabel');

        if (label) {
            label.textContent = `${asset.asset_name} (${asset.asset_code}) - ${asset.asset_type === 'vehicle' ? asset.display_identifier : asset.model_number}`;
        }

        this.querySelector('#insuranceRenewalType').value = asset.insurance_type || '';
        this.querySelector('#insuranceRenewalProvider').value = asset.insurance_provider || '';
        this.querySelector('#insuranceRenewalProviderDetails').value = asset.insurance_provider_details || '';
        this.querySelector('#insuranceRenewalIntervalDays').value = asset.insurance_renew_interval_days || '';
        this.querySelector('#insuranceRenewalLastDate').value = asset.last_insurance_renew_date || '';
        this.querySelector('#insuranceRenewalLastDetails').value = asset.last_insurance_renew_details || '';

        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    closeRenewalModal() {
        const modal = this.querySelector('#insuranceRenewalModal');
        if (modal) {
            modal.classList.remove('active');
        }

        document.body.style.overflow = '';
        this.currentRenewalAsset = null;
    }

    async submitRenewal() {
        if (!this.currentRenewalAsset) {
            Utils.showToast('No asset is selected for renewal.', 'error');
            return;
        }

        const insuranceType = String(this.querySelector('#insuranceRenewalType')?.value || '').trim();
        const insuranceProvider = String(this.querySelector('#insuranceRenewalProvider')?.value || '').trim();
        const insuranceProviderDetails = String(this.querySelector('#insuranceRenewalProviderDetails')?.value || '').trim();
        const insuranceRenewIntervalDays = this.parsePositiveInteger(this.querySelector('#insuranceRenewalIntervalDays')?.value);
        const lastInsuranceRenewDate = String(this.querySelector('#insuranceRenewalLastDate')?.value || '').trim();
        const lastInsuranceRenewDetails = String(this.querySelector('#insuranceRenewalLastDetails')?.value || '').trim();

        if (!insuranceType || !insuranceProvider || !insuranceProviderDetails || !insuranceRenewIntervalDays || !lastInsuranceRenewDate || !lastInsuranceRenewDetails) {
            Utils.showToast('Please fill all renewal fields before saving.', 'error');
            return;
        }

        const renewDate = new Date(lastInsuranceRenewDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (Number.isNaN(renewDate.getTime()) || renewDate > today) {
            Utils.showToast('Last renew date must be today or earlier.', 'error');
            return;
        }

        const payload = {
            insurance_type: insuranceType,
            insurance_provider: insuranceProvider,
            insurance_provider_details: insuranceProviderDetails,
            insurance_renew_interval_days: insuranceRenewIntervalDays,
            last_insurance_renew_date: lastInsuranceRenewDate,
            last_insurance_renew_details: lastInsuranceRenewDetails,
        };

        const endpoint = this.currentRenewalAsset.asset_type === 'machine'
            ? `/machines/${this.currentRenewalAsset.id}`
            : `/vehicles/${this.currentRenewalAsset.id}`;

        const submitButton = this.querySelector('#insuranceRenewalSubmitBtn');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }

        try {
            const response = await API.put(endpoint, payload);
            if (response.status !== 'success') {
                throw new Error(response.message || 'Failed to save insurance renewal details');
            }

            Utils.showToast('Insurance renewal details saved successfully.', 'success');
            this.closeRenewalModal();
            await this.refresh();

            this.dispatchEvent(new CustomEvent('inventory-insurance-management:renewal-saved', {
                bubbles: true,
                detail: {
                    assetType: this.currentRenewalAsset?.asset_type,
                    assetId: this.currentRenewalAsset?.id,
                },
            }));
        } catch (error) {
            console.error('Failed to submit insurance renewal:', error);
            Utils.showToast(error.message || 'Failed to submit insurance renewal', 'error');
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Save Renewal';
            }
        }
    }

    getRenewalState(nextInsuranceRenewDate) {
        if (!nextInsuranceRenewDate) {
            return { key: 'missing', label: 'Missing', daysUntil: null };
        }

        const nextDate = new Date(nextInsuranceRenewDate);
        if (Number.isNaN(nextDate.getTime())) {
            return { key: 'missing', label: 'Missing', daysUntil: null };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const normalizedNextDate = new Date(nextDate);
        normalizedNextDate.setHours(0, 0, 0, 0);

        const diffMs = normalizedNextDate.getTime() - today.getTime();
        const daysUntil = Math.floor(diffMs / (24 * 60 * 60 * 1000));

        if (daysUntil < 0) {
            return { key: 'overdue', label: 'Overdue', daysUntil };
        }

        if (daysUntil <= 30) {
            return { key: 'upcoming', label: 'Upcoming', daysUntil };
        }

        return { key: 'all', label: 'Scheduled', daysUntil };
    }

    getComparableDate(value) {
        const state = this.getRenewalState(value);
        if (state.daysUntil === null) {
            return Number.MAX_SAFE_INTEGER;
        }

        return state.daysUntil;
    }

    parsePositiveInteger(value) {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            return null;
        }

        return parsed;
    }

    renderStatusBanner(message, type = '') {
        const banner = this.querySelector('#insuranceStatusBanner');
        if (!banner) return;

        if (!message) {
            banner.innerHTML = '';
            return;
        }

        const normalizedType = type === 'error' ? 'error' : 'loading';
        banner.innerHTML = `<div class="insurance-alert-banner ${normalizedType}">${this.escapeHtml(message)}</div>`;
    }

    formatDate(value) {
        if (!value) return 'N/A';

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return 'N/A';
        }

        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    }

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

customElements.define('inventory-insurance-management', InventoryInsuranceManagement);
