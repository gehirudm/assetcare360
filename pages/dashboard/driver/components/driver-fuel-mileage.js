class DriverFuelMileage extends HTMLElement {
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
                <h2 class="page-title"><i class="fas fa-gas-pump"></i> Fuel & Mileage</h2>
                <p class="page-subtitle">Track fuel consumption and vehicle efficiency</p>
            </div>

            <div style="margin-bottom: 20px;">
                <button class="btn btn-primary" type="button" data-action="open-fuel-modal">Log Fuel & Mileage</button>
            </div>

            <div class="card">
                <div class="card-header"><i class="fas fa-gas-pump"></i> Recent Fuel Logs</div>
                <div class="inventory-item" data-fuel-id="FL-001">
                    <div class="item-details">
                        <strong><i class="fas fa-gas-pump"></i> FL-001</strong>
                        <div class="item-meta"><i class="fas fa-calendar"></i> Aug 24, 2024 02:30 PM | <i class="fas fa-map-marker-alt"></i> IOC - Kandy Road</div>
                        <div class="item-description"><i class="fas fa-fill-drip"></i> 45 L | <i class="fas fa-dollar-sign"></i> LKR 12,500 | <i class="fas fa-tachometer-alt"></i> 45,100 km | Efficiency: 8.3 km/L</div>
                    </div>
                    <div class="item-actions">
                        <div class="action-buttons">
                            <button class="btn btn-small btn-primary" type="button" data-action="view-fuel" data-fuel-id="FL-001"><i class="fas fa-eye"></i> VIEW</button>
                        </div>
                    </div>
                </div>
                <div class="inventory-item" data-fuel-id="FL-002">
                    <div class="item-details">
                        <strong><i class="fas fa-gas-pump"></i> FL-002</strong>
                        <div class="item-meta"><i class="fas fa-calendar"></i> Aug 20, 2024 09:15 AM | <i class="fas fa-map-marker-alt"></i> CPC - Colombo</div>
                        <div class="item-description"><i class="fas fa-fill-drip"></i> 50 L | <i class="fas fa-dollar-sign"></i> LKR 13,800 | <i class="fas fa-tachometer-alt"></i> 44,800 km | Efficiency: 8.0 km/L</div>
                    </div>
                    <div class="item-actions">
                        <div class="action-buttons">
                            <button class="btn btn-small btn-primary" type="button" data-action="view-fuel" data-fuel-id="FL-002"><i class="fas fa-eye"></i> VIEW</button>
                        </div>
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

            if (actionEl.dataset.action === 'open-fuel-modal') {
                DriverUtils.openModal('fuelMileageModal');
                return;
            }

            if (actionEl.dataset.action === 'view-fuel') {
                DriverUtils.showToast(`Viewing fuel record ${actionEl.dataset.fuelId}`);
            }
        });
    }

    refresh() {
        // Static section; no fetch required.
    }
}

customElements.define('driver-fuel-mileage', DriverFuelMileage);
