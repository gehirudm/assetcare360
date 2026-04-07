class SAServiceConfig extends HTMLElement {
    connectedCallback() {
        this.render();
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Service Interval Configuration</h1>
                <p class="page-subtitle">Manage vehicle and machine service schedules</p>
            </div>

            <div style="margin-bottom: 20px;">
                <button class="btn btn-primary" onclick="openModal('addServiceIntervalModal')">
                    <i class="fas fa-plus"></i> Add Service Interval
                </button>
            </div>

            <div class="card">
                <div class="card-header"><i class="fas fa-cog"></i> Service Interval Settings</div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Vehicle/Machine Type</th>
                            <th>Service Type</th>
                            <th>Interval (km/hours)</th>
                            <th>Time-based (months)</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Light Vehicle</td>
                            <td>Oil Change</td>
                            <td>5,000 km</td>
                            <td>6 months</td>
                            <td><span class="status-text status-active">Active</span></td>
                            <td>
                                <button class="btn btn-secondary btn-small" onclick="editServiceInterval('SI-001')">Edit</button>
                                <button class="btn btn-danger btn-small" onclick="deleteServiceInterval('SI-001')">Delete</button>
                            </td>
                        </tr>
                        <tr>
                            <td>Heavy Vehicle</td>
                            <td>Major Service</td>
                            <td>10,000 km</td>
                            <td>12 months</td>
                            <td><span class="status-text status-active">Active</span></td>
                            <td>
                                <button class="btn btn-secondary btn-small" onclick="editServiceInterval('SI-002')">Edit</button>
                                <button class="btn btn-danger btn-small" onclick="deleteServiceInterval('SI-002')">Delete</button>
                            </td>
                        </tr>
                        <tr>
                            <td>Excavator</td>
                            <td>Hydraulic System Check</td>
                            <td>500 hours</td>
                            <td>3 months</td>
                            <td><span class="status-text status-active">Active</span></td>
                            <td>
                                <button class="btn btn-secondary btn-small" onclick="editServiceInterval('SI-003')">Edit</button>
                                <button class="btn btn-danger btn-small" onclick="deleteServiceInterval('SI-003')">Delete</button>
                            </td>
                        </tr>
                        <tr>
                            <td>All Vehicles</td>
                            <td>Brake Inspection</td>
                            <td>15,000 km</td>
                            <td>12 months</td>
                            <td><span class="status-text status-active">Active</span></td>
                            <td>
                                <button class="btn btn-secondary btn-small" onclick="editServiceInterval('SI-004')">Edit</button>
                                <button class="btn btn-danger btn-small" onclick="deleteServiceInterval('SI-004')">Delete</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="card">
                <div class="card-header"><i class="fas fa-exclamation-circle"></i> Overdue Service Alerts</div>
                <div class="notification-item danger">
                    <span class="notification-icon"><i class="fas fa-exclamation-triangle"></i></span>
                    <div>
                        <strong>Vehicle #045:</strong> Oil change overdue by 15 days (Last service: Sep 20, 2025)
                        <div style="margin-top: 5px;">
                            <button class="btn btn-primary btn-small" onclick="scheduleService('VEH-045')">Schedule Service</button>
                            <button class="btn btn-secondary btn-small" onclick="viewVehicleDetails('VEH-045')">View Details</button>
                        </div>
                    </div>
                </div>
                <div class="notification-item warning">
                    <span class="notification-icon"><i class="fas fa-clock"></i></span>
                    <div>
                        <strong>Machine #078:</strong> Hydraulic check due in 3 days (Last service: Jul 18, 2025)
                        <div style="margin-top: 5px;">
                            <button class="btn btn-primary btn-small" onclick="scheduleService('MAC-078')">Schedule Service</button>
                            <button class="btn btn-secondary btn-small" onclick="viewMachineDetails('MAC-078')">View Details</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('sa-service-config', SAServiceConfig);
