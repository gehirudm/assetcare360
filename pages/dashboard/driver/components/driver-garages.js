class DriverGarages extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.render();
        this.bindEvents();
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-warehouse"></i> Nearby Company Garages</h2>
                <p class="page-subtitle">Find registered service centers for emergency support</p>
            </div>

            <div class="grid">
                <div class="card">
                    <div class="card-header"><i class="fas fa-store"></i> AutoCare Service Center</div>
                    <div style="margin-bottom: 10px;">
                        <div style="margin-bottom: 5px;"><strong>Address:</strong> 123 Galle Road, Colombo 03</div>
                        <div style="margin-bottom: 5px;"><strong>Distance:</strong> 2.5 km from your location</div>
                        <div style="margin-bottom: 5px;"><strong>Contact:</strong> +94 11 234 5678</div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-primary btn-small" type="button" data-action="directions" data-garage="AutoCare">Get Directions</button>
                        <button class="btn btn-secondary btn-small" type="button" data-action="call" data-phone="+94112345678">Call</button>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header"><i class="fas fa-wrench"></i> Reliable Motors</div>
                    <div style="margin-bottom: 10px;">
                        <div style="margin-bottom: 5px;"><strong>Address:</strong> 456 Kandy Road, Kadawatha</div>
                        <div style="margin-bottom: 5px;"><strong>Distance:</strong> 8.2 km from your location</div>
                        <div style="margin-bottom: 5px;"><strong>Contact:</strong> +94 11 345 6789</div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-primary btn-small" type="button" data-action="directions" data-garage="Reliable">Get Directions</button>
                        <button class="btn btn-secondary btn-small" type="button" data-action="call" data-phone="+94113456789">Call</button>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header"><i class="fas fa-tools"></i> Quick Fix Auto</div>
                    <div style="margin-bottom: 10px;">
                        <div style="margin-bottom: 5px;"><strong>Address:</strong> 789 High Level Road, Nugegoda</div>
                        <div style="margin-bottom: 5px;"><strong>Distance:</strong> 12.1 km from your location</div>
                        <div style="margin-bottom: 5px;"><strong>Contact:</strong> +94 11 456 7890</div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-primary btn-small" type="button" data-action="directions" data-garage="QuickFix">Get Directions</button>
                        <button class="btn btn-secondary btn-small" type="button" data-action="call" data-phone="+94114567890">Call</button>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">Emergency Support</div>
                <p style="color: var(--muted); margin-bottom: 15px;">For emergency breakdowns, contact the nearest registered garage or call the company hotline: <strong style="color: var(--danger);">+94 11 999 0000</strong></p>
                <div style="background: #fee; border: 1px solid #fca5a5; border-radius: 8px; padding: 15px;">
                    <strong style="color: var(--danger);">Important:</strong> Always report breakdowns through the system and wait for supervisor approval before proceeding with repairs at external garages.
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

            if (actionEl.dataset.action === 'directions') {
                DriverUtils.showToast(`Opening directions to ${actionEl.dataset.garage}`);
                return;
            }

            if (actionEl.dataset.action === 'call') {
                DriverUtils.showToast(`Calling ${actionEl.dataset.phone}`);
            }
        });
    }

    refresh() {
        // Static section.
    }
}

customElements.define('driver-garages', DriverGarages);
