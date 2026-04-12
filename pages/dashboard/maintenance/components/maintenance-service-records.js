class MaintenanceServiceRecords extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.currentTab = 'vehicles';

        this.render();
        this.bindEvents();
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Service Records</h1>
                <p class="page-subtitle">Equipment maintenance history submitted by Technical Officers</p>
            </div>

            <div class="tab-container">
                <div class="tab-buttons" id="serviceRecordsTabButtons">
                    <button class="tab-btn active" type="button" data-action="switch-tab" data-tab="vehicles">Vehicles</button>
                    <button class="tab-btn" type="button" data-action="switch-tab" data-tab="machinery">Machinery</button>
                </div>

                <div id="vehicles-tab" class="tab-content active">
                    <div class="card">
                        <div class="card-header"><i class="fas fa-car"></i> Vehicle Service Records</div>
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Vehicle ID</th>
                                    <th>Service Date</th>
                                    <th>Service Type</th>
                                    <th>Cost</th>
                                    <th>Technical Officer</th>
                                    <th>Next Due</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Vehicle #101</td>
                                    <td>Aug 20, 2025</td>
                                    <td>Engine Repair</td>
                                    <td>LKR 45,000</td>
                                    <td>Tech Officer A</td>
                                    <td>Feb 20, 2026</td>
                                    <td><button class="btn btn-secondary btn-small" type="button" data-action="view-service" data-service-id="VH101-001">View</button></td>
                                </tr>
                                <tr>
                                    <td>Vehicle #089</td>
                                    <td>Aug 19, 2025</td>
                                    <td>Brake System Overhaul</td>
                                    <td>LKR 15,000</td>
                                    <td>Tech Officer B</td>
                                    <td>Aug 19, 2026</td>
                                    <td><button class="btn btn-secondary btn-small" type="button" data-action="view-service" data-service-id="VH089-001">View</button></td>
                                </tr>
                                <tr>
                                    <td>Vehicle #067</td>
                                    <td>Aug 12, 2025</td>
                                    <td>Preventive Maintenance</td>
                                    <td>LKR 8,500</td>
                                    <td>Tech Officer A</td>
                                    <td>Nov 12, 2025</td>
                                    <td><button class="btn btn-secondary btn-small" type="button" data-action="view-service" data-service-id="VH067-001">View</button></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div id="machinery-tab" class="tab-content">
                    <div class="card">
                        <div class="card-header"><i class="fas fa-cog"></i> Machinery Service Records</div>
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Machine ID</th>
                                    <th>Service Date</th>
                                    <th>Service Type</th>
                                    <th>Cost</th>
                                    <th>Technical Officer</th>
                                    <th>Next Due</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Machine #205</td>
                                    <td>Aug 15, 2025</td>
                                    <td>Hydraulic System Service</td>
                                    <td>LKR 32,000</td>
                                    <td>Tech Officer C</td>
                                    <td>Feb 15, 2026</td>
                                    <td><button class="btn btn-secondary btn-small" type="button" data-action="view-service" data-service-id="MC205-001">View</button></td>
                                </tr>
                                <tr>
                                    <td>Machine #180</td>
                                    <td>Aug 10, 2025</td>
                                    <td>Engine Maintenance</td>
                                    <td>LKR 28,000</td>
                                    <td>Tech Officer A</td>
                                    <td>Nov 10, 2025</td>
                                    <td><button class="btn btn-secondary btn-small" type="button" data-action="view-service" data-service-id="MC180-001">View</button></td>
                                </tr>
                                <tr>
                                    <td>Machine #203</td>
                                    <td>Aug 08, 2025</td>
                                    <td>Preventive Maintenance</td>
                                    <td>LKR 12,000</td>
                                    <td>Tech Officer B</td>
                                    <td>Nov 08, 2025</td>
                                    <td><button class="btn btn-secondary btn-small" type="button" data-action="view-service" data-service-id="MC203-001">View</button></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionNode = event.target.closest('[data-action]');
            if (!actionNode) {
                return;
            }

            const action = actionNode.dataset.action;
            if (action === 'switch-tab') {
                this.switchTab(actionNode.dataset.tab, actionNode);
                return;
            }

            if (action === 'view-service') {
                this.viewServiceDetails(actionNode.dataset.serviceId);
            }
        });
    }

    emitToast(message, type = 'info') {
        this.dispatchEvent(new CustomEvent('maintenance-ui:toast', {
            bubbles: true,
            detail: { message, type },
        }));
    }

    switchTab(tabName, button) {
        const nextTab = tabName || this.currentTab || 'vehicles';
        this.currentTab = nextTab;

        this.querySelectorAll('#serviceRecordsTabButtons .tab-btn').forEach((tabButton) => {
            tabButton.classList.toggle('active', tabButton === button || tabButton.dataset.tab === nextTab);
        });

        this.querySelectorAll('.tab-content').forEach((tabContent) => {
            tabContent.classList.remove('active');
        });

        const activeTab = this.querySelector(`#${nextTab}-tab`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
    }

    viewServiceDetails(serviceId) {
        this.emitToast(`Viewing detailed service record for ${serviceId}`, 'info');
    }
}

customElements.define('maintenance-service-records', MaintenanceServiceRecords);
