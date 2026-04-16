class DriverGarages extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.garages = [];
        this.render();
        this.bindEvents();
        this.refresh();
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-warehouse"></i> Nearby Company Garages</h2>
                <p class="page-subtitle">Find registered service centers for emergency support</p>
            </div>

            <div class="card" style="margin-bottom: 16px;">
                <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
                    <span><i class="fas fa-store"></i> Active Garages</span>
                    <button class="btn btn-secondary btn-small" type="button" data-action="refresh"><i class="fas fa-sync-alt"></i> Refresh</button>
                </div>
                <div id="driverGaragesList" class="grid"></div>
            </div>

            <div class="card">
                <div class="card-header">Emergency Support</div>
                <p style="color: var(--muted); margin-bottom: 15px;">
                    For emergency breakdowns, contact the nearest registered garage or call the company hotline:
                    <strong style="color: var(--danger);">+94 11 999 0000</strong>
                </p>
                <div style="background: #fee; border: 1px solid #fca5a5; border-radius: 8px; padding: 15px;">
                    <strong style="color: var(--danger);">Important:</strong>
                    Always report breakdowns through the system and wait for supervisor approval before proceeding with repairs at external garages.
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

            if (action === 'refresh') {
                this.refresh();
                return;
            }

            if (action === 'directions') {
                const address = actionEl.dataset.address || actionEl.dataset.garage || '';
                const query = encodeURIComponent(address);
                window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank', 'noopener,noreferrer');
                return;
            }

            if (action === 'call') {
                const phone = actionEl.dataset.phone || '';
                if (!phone) {
                    DriverUtils.showToast('Phone number is unavailable.', 'warning');
                    return;
                }

                window.location.href = `tel:${phone.replace(/\s+/g, '')}`;
            }
        });
    }

    async refresh() {
        const list = this.querySelector('#driverGaragesList');
        if (!list) {
            return;
        }

        list.innerHTML = '<div style="padding: 20px; color: var(--muted);">Loading garages...</div>';

        try {
            const response = await DriverUtils.apiGet('/garages');
            this.garages = DriverUtils.normalizeApiList(response, 'garages');

            if (!this.garages.length) {
                list.innerHTML = '<div style="padding: 20px; color: var(--muted);">No garages available.</div>';
                return;
            }

            list.innerHTML = this.garages.map((garage) => this.renderGarageCard(garage)).join('');
        } catch (error) {
            console.error('Failed to load garages:', error);
            list.innerHTML = '<div style="padding: 20px; color: var(--danger);">Failed to load garages. Please try again.</div>';
        }
    }

    renderGarageCard(garage) {
        return `
            <div class="card" style="margin: 0;">
                <div class="card-header"><i class="fas fa-store"></i> ${garage.name}</div>
                <div style="margin-bottom: 10px;">
                    <div style="margin-bottom: 5px;"><strong>Address:</strong> ${garage.address || 'N/A'}</div>
                    ${garage.city ? `<div style="margin-bottom: 5px;"><strong>City:</strong> ${garage.city}</div>` : ''}
                    <div style="margin-bottom: 5px;"><strong>Contact:</strong> ${garage.phone || 'N/A'}</div>
                </div>
                <div style="display: flex; gap: 10px; flex-wrap:wrap;">
                    <button class="btn btn-primary btn-small" type="button" data-action="directions" data-garage="${garage.name}" data-address="${garage.address || ''}">Get Directions</button>
                    <button class="btn btn-secondary btn-small" type="button" data-action="call" data-phone="${garage.phone || ''}">Call</button>
                </div>
            </div>
        `;
    }
}

customElements.define('driver-garages', DriverGarages);
