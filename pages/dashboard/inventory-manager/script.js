// ==================== AUTHENTICATION & INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async function () {
    try {
        // Check authentication and authorization using DashboardInit
        const user = await DashboardInit.init(['Inventory Manager', 'Admin'], {
            updateUserDisplay: true,
            onSuccess: async (user) => {
                currentUser = user;
                await initializeApp();
            }
        });
    } catch (error) {
        console.error('Authentication error:', error);
        window.location.href = '/auth/login.html';
    }
});

let currentUser = null;
let machines = [];
let vehicles = [];
let currentMachineFilter = 'all';
let currentVehicleFilter = 'all';

// Machine types with their specific components (Litro Gas company equipment)
const MACHINE_TYPES = {
    'LPG Cylinder Filling Machine': ['Filling Valve', 'Pressure Gauge', 'Flow Meter', 'Control Panel', 'Safety Relief Valve', 'Weighing System', 'Conveyor Belt'],
    'Gas Cylinder Testing Machine': ['Hydraulic Pump', 'Pressure Gauge', 'Control Panel', 'Safety Valve', 'Test Chamber', 'Pressure Regulator'],
    'Cylinder Painting Machine': ['Spray Gun', 'Air Compressor', 'Paint Tank', 'Control Panel', 'Conveyor System', 'Ventilation System'],
    'Valve Crimping Machine': ['Hydraulic Press', 'Control Panel', 'Valve Holder', 'Safety Guard', 'Pressure Gauge'],
    'Gas Leak Detector': ['Sensor Unit', 'Display Panel', 'Alarm System', 'Battery', 'Calibration Unit'],
    'Cylinder Washing Machine': ['Water Pump', 'Heating Element', 'Control Panel', 'Drainage System', 'Conveyor Belt', 'Drying Unit'],
    'LPG Storage Tank': ['Pressure Gauge', 'Safety Relief Valve', 'Level Indicator', 'Temperature Sensor', 'Emergency Shut-off Valve'],
    'Gas Compressor': ['Motor', 'Compressor Unit', 'Cooling System', 'Control Panel', 'Pressure Switch', 'Oil Filter', 'Air Filter'],
    'Forklift': ['Engine', 'Hydraulic System', 'Control Panel', 'Cooling System', 'Forks', 'Mast', 'Steering System', 'Brakes'],
    'Delivery Truck': ['Engine', 'Transmission', 'Braking System', 'Suspension', 'Electrical System', 'Cooling System', 'Cargo Space'],
    'Cylinder Carousel System': ['Motor', 'Control Panel', 'Rotating Platform', 'Safety Sensors', 'Drive Belt', 'Emergency Stop'],
    'Vaporizer': ['Heat Exchanger', 'Control Panel', 'Pressure Regulator', 'Safety Valve', 'Temperature Sensor']
};

// Available locations
const LOCATIONS = [
    'LOCATION 1',
    'LOCATION 2',
    'LOCATION 3',
    'LOCATION 4'
];

// Vehicle types with their specific components (Litro Gas company vehicles)
const VEHICLE_TYPES = {
    'LPG Distribution Truck': ['Engine', 'Transmission', 'Braking System', 'Suspension', 'LPG Tank', 'Pressure Regulator', 'Safety Valve', 'Loading System'],
    'Cylinder Delivery Van': ['Engine', 'Transmission', 'Braking System', 'Suspension', 'Cargo Space', 'Loading Ramp', 'Safety Straps'],
    'Forklift': ['Engine', 'Hydraulic System', 'Control Panel', 'Cooling System', 'Forks', 'Mast', 'Steering System', 'Brakes'],
    'Tanker Lorry': ['Engine', 'Transmission', 'Braking System', 'Tank Body', 'Pump System', 'Safety Valve', 'Emergency Shut-off', 'Discharge System'],
    'Staff Car': ['Engine', 'Transmission', 'Braking System', 'Suspension', 'Electrical System', 'Air Conditioning', 'Safety Features'],
    'Pickup Truck': ['Engine', 'Transmission', 'Braking System', 'Suspension', 'Cargo Bed', 'Towing System'],
    'Three-Wheeler': ['Engine', 'Transmission', 'Braking System', 'Cargo Space', 'Suspension'],
    'Motorcycle': ['Engine', 'Transmission', 'Braking System', 'Suspension', 'Electrical System']
};

async function initializeApp() {
    try {
        showLoading(true);

        // Load current user info
        await loadCurrentUser();

        // Initialize search handlers
        initializeSearchHandlers();

        // Wire section component events and initialize overview metrics
        bindDashboardOverviewModel();
        await refreshDashboardOverviewModel().catch(err => {
            console.warn('Initial dashboard overview refresh failed:', err);
        });

        // Wire section component events and initialize notification badge state
        bindNotificationsModel();
        await refreshNotificationsModel().catch(err => {
            console.warn('Initial notifications refresh failed:', err);
        });

        // Wire catalog section events
        bindCatalogModel();

        // Wire sparepart addition events
        bindSparepartAdditionModel();

        // Load initial data for active section
        const activeSection = document.querySelector('.content-section.active')?.id;
        if (activeSection) {
            await loadSectionData(activeSection).catch(err => {
                console.warn('Section data loading failed:', err);
            });
        }

        showLoading(false);
    } catch (error) {
        console.error('Failed to initialize app:', error);
        Utils.showToast('Failed to load application. Please refresh the page.', 'error');
        showLoading(false);
    }
}

async function loadCurrentUser() {
    try {
        const response = await API.get('/auth/me');
        // Backend returns {status: 'success', message: '...', data: {...}}
        if (response.status === 'success' && response.data) {
            currentUser = response.data;

            // Check if user needs to change password
            if (currentUser.force_password_change) {
                window.location.href = '../../auth/change-password.html';
                return;
            }

            updateUserInfo();
        }
    } catch (error) {
        console.error('Failed to load user info:', error);
        // Auth middleware will handle redirecting to login
    }
}

function updateUserInfo() {
    if (!currentUser) return;

    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const userRole = document.getElementById('userRole');

    if (userAvatar) {
        userAvatar.textContent = currentUser.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
    }

    if (userName) {
        userName.textContent = currentUser.full_name;
    }

    if (userRole) {
        userRole.textContent = currentUser.role;
    }
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.toggle('active', show);

        // Safeguard: ensure loading is hidden after 10 seconds max
        if (show) {
            setTimeout(() => {
                if (overlay.classList.contains('active')) {
                    console.warn('Loading overlay forcefully hidden after timeout');
                    overlay.classList.remove('active');
                }
            }, 10000);
        }
    }
}

// ==================== NAVIGATION ====================
// Navigation is handled by <ac-layout>. Listen for section-change events.
document.querySelector('ac-layout')
    ?.addEventListener('section-change', e => {
        loadSectionData(e.detail.section).catch(err => {
            console.error('Error loading section data:', err);
        });
    });

// Orders & Approvals component event bridge
document.addEventListener('inventory-orders-approvals:count-change', (e) => {
    const count = e.detail.count;
    // Update sidebar badge if needed (currently no badge for orders-approvals)
    console.log(`Orders pending count: ${count}`);
});

// Machines component event bridge
document.addEventListener('inventory-machines:add', () => {
    openAddMachineModal();
});
document.addEventListener('inventory-machines:view', (e) => {
    viewMachineDetails(e.detail.machineId);
});
document.addEventListener('inventory-machines:edit', (e) => {
    editMachine(e.detail.machineId);
});
document.addEventListener('inventory-machines:more', (e) => {
    // Handle more actions (delete, auction, etc.)
    console.log('More actions for machine:', e.detail.machineId);
});

// Vehicles component event bridge
document.addEventListener('inventory-vehicles:add', () => {
    openAddVehicleModal();
});
document.addEventListener('inventory-vehicles:view', (e) => {
    viewVehicleDetails(e.detail.vehicleId);
});
document.addEventListener('inventory-vehicles:edit', (e) => {
    editVehicle(e.detail.vehicleId);
});
document.addEventListener('inventory-vehicles:more', (e) => {
    // Handle more actions (delete, auction, etc.)
    console.log('More actions for vehicle:', e.detail.vehicleId);
});

function bindDashboardOverviewModel() {
    const dashboardModel = document.querySelector('inventory-dashboard-overview-model');
    if (!dashboardModel || dashboardModel._inventoryDashboardOverviewBound) {
        return;
    }

    dashboardModel._inventoryDashboardOverviewBound = true;

    dashboardModel.addEventListener('inventory-dashboard-overview:navigate', event => {
        const section = event.detail?.section;
        if (!section) return;

        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo(section);
        }
    });
}

async function refreshDashboardOverviewModel() {
    const dashboardModel = document.querySelector('inventory-dashboard-overview-model');
    if (!dashboardModel || typeof dashboardModel.refresh !== 'function') {
        return;
    }

    await dashboardModel.refresh();
}

function bindNotificationsModel() {
    const notificationsModel = document.querySelector('inventory-notifications-model');
    if (!notificationsModel || notificationsModel._inventoryNotificationsBound) {
        return;
    }

    notificationsModel._inventoryNotificationsBound = true;

    notificationsModel.addEventListener('inventory-notifications:reorder', event => {
        const sparepartId = event.detail?.sparepartId;
        if (!sparepartId) return;
        reorderPart(sparepartId);
    });

    notificationsModel.addEventListener('inventory-notifications:view-part', event => {
        const sparepartId = event.detail?.sparepartId;
        if (!sparepartId) return;
        viewPartDetails(sparepartId);
    });

    notificationsModel.addEventListener('inventory-notifications:view-order', async event => {
        try {
            const orderId = event.detail?.orderId;
            if (!orderId) return;

            // Navigate to orders-approvals section
            const layout = document.querySelector('ac-layout');
            if (layout && typeof layout.navigateTo === 'function') {
                layout.navigateTo('orders-approvals');
                
                // Wait a moment for the component to load, then trigger view
                setTimeout(() => {
                    const ordersModel = document.querySelector('inventory-orders-approvals-model');
                    if (ordersModel && typeof ordersModel.viewOrderDetails === 'function') {
                        ordersModel.viewOrderDetails(orderId);
                    }
                }, 100);
            }
        } catch (error) {
            console.error('Failed to open order from notifications:', error);
            Utils.showToast('Unable to open request details right now.', 'error');
        }
    });

    notificationsModel.addEventListener('inventory-notifications:order-updated', async () => {
        try {
            await Promise.all([
                refreshOrdersApprovalsModel(),
                refreshDashboardOverviewModel()
            ]);
        } catch (error) {
            console.error('Failed to sync orders after notification action:', error);
        }
    });

    notificationsModel.addEventListener('inventory-notifications:count-change', event => {
        const count = Number(event.detail?.count) || 0;
        const sidebar = document.querySelector('ac-layout ac-sidebar');
        if (sidebar && typeof sidebar.setNotifBadge === 'function') {
            sidebar.setNotifBadge(count);
        }
    });
}

async function refreshNotificationsModel() {
    const notificationsModel = document.querySelector('inventory-notifications-model');
    if (!notificationsModel || typeof notificationsModel.refresh !== 'function') {
        return;
    }

    await notificationsModel.refresh();
}

function bindCatalogModel() {
    const catalogModel = document.querySelector('inventory-catalog-model');
    if (!catalogModel || catalogModel._inventoryCatalogBound) {
        return;
    }

    catalogModel._inventoryCatalogBound = true;

    catalogModel.addEventListener('inventory-catalog:add', () => {
        openAddPartModal();
    });

    catalogModel.addEventListener('inventory-catalog:view', event => {
        const sparepartId = event.detail?.sparepartId;
        if (sparepartId) {
            viewPartDetails(sparepartId);
        }
    });

    catalogModel.addEventListener('inventory-catalog:edit', event => {
        const sparepartId = event.detail?.sparepartId;
        if (sparepartId) {
            editPart(sparepartId);
        }
    });

    catalogModel.addEventListener('inventory-catalog:delete', event => {
        const sparepartId = event.detail?.sparepartId;
        if (sparepartId) {
            deletePart(sparepartId);
        }
    });

    catalogModel.addEventListener('inventory-catalog:reorder', event => {
        const sparepartId = event.detail?.sparepartId;
        if (sparepartId) {
            reorderPart(sparepartId);
        }
    });
}

async function refreshCatalogModel() {
    const catalogModel = document.querySelector('inventory-catalog-model');
    if (!catalogModel || typeof catalogModel.refresh !== 'function') {
        return;
    }

    await catalogModel.refresh();
}

function bindSparepartAdditionModel() {
    const additionsModel = document.querySelector('inventory-sparepart-addition-model');
    if (!additionsModel || additionsModel._inventorySparepartAdditionBound) {
        return;
    }

    additionsModel._inventorySparepartAdditionBound = true;

    additionsModel.addEventListener('inventory-sparepart-addition:add', () => {
        openAddStockModal();
    });

    additionsModel.addEventListener('inventory-sparepart-addition:view', event => {
        const additionData = event.detail?.addition || event.detail?.additionId;
        if (additionData) {
            viewAdditionDetails(additionData);
        }
    });

    additionsModel.addEventListener('inventory-sparepart-addition:edit', event => {
        const additionData = event.detail?.addition || event.detail?.additionId;
        if (additionData) {
            editAddition(additionData);
        }
    });

    additionsModel.addEventListener('inventory-sparepart-addition:delete', event => {
        const additionData = event.detail?.addition || event.detail?.additionId;
        if (additionData) {
            deleteAddition(additionData);
        }
    });
}

async function refreshSparepartAdditionModel() {
    const additionsModel = document.querySelector('inventory-sparepart-addition-model');
    if (!additionsModel || typeof additionsModel.refresh !== 'function') {
        return;
    }

    await additionsModel.refresh();
}

async function refreshUsageTrackingModel() {
    const usageModel = document.querySelector('inventory-usage-tracking-model');
    if (!usageModel || typeof usageModel.refresh !== 'function') {
        return;
    }

    await usageModel.refresh();
}

async function refreshOrdersApprovalsModel() {
    const ordersModel = document.querySelector('inventory-orders-approvals-model');
    if (!ordersModel) {
        return;
    }

    // Set current user if not already set
    if (currentUser && typeof ordersModel.setCurrentUser === 'function') {
        ordersModel.setCurrentUser(currentUser);
    }

    if (typeof ordersModel.refresh === 'function') {
        await ordersModel.refresh();
    }
}

function refreshMachinesModel() {
    const machinesModel = document.querySelector('inventory-machines-model');
    if (machinesModel && typeof machinesModel.refresh === 'function') {
        machinesModel.refresh();
    }
}

function refreshVehiclesModel() {
    const vehiclesModel = document.querySelector('inventory-vehicles-model');
    if (vehiclesModel && typeof vehiclesModel.refresh === 'function') {
        vehiclesModel.refresh();
    }
}

async function loadSectionData(sectionId) {
    try {
        // Don't show loading overlay for section switches - it blocks navigation
        // showLoading(true);

        switch (sectionId) {
            case 'dashboard':
                await refreshDashboardOverviewModel();
                break;
            case 'machines':
                refreshMachinesModel();
                break;
            case 'vehicles':
                refreshVehiclesModel();
                break;
            case 'catalog':
                await refreshCatalogModel();
                break;
            case 'sparepart-addition':
                await refreshSparepartAdditionModel();
                break;
            case 'orders-approvals':
                refreshOrdersApprovalsModel();
                break;
            case 'usage-tracking':
                await refreshUsageTrackingModel();
                break;
            case 'notifications':
                await refreshNotificationsModel();
                break;
        }

        // showLoading(false);
    } catch (error) {
        console.error(`Failed to load ${sectionId} data:`, error);
        Utils.showToast(`Failed to load ${sectionId} data`, 'error');
        // showLoading(false);
    }
}

// ==================== MACHINES MANAGEMENT ====================


// ==================== MACHINE CRUD OPERATIONS ====================

async function openAddMachineModal() {
    // Fetch next machine ID before creating the modal
    let nextMachineId = 'MCH-001';
    try {
        const response = await API.get('/machines/next-id');
        if (response.status === 'success' && response.data.next_id) {
            nextMachineId = response.data.next_id;
        }
    } catch (error) {
        console.error('Failed to fetch next machine ID:', error);
    }

    const modal = createMachineModal(null, nextMachineId);
    document.body.appendChild(modal);
    modal.classList.add('active');
}

function createMachineModal(machine = null, nextMachineId = 'MCH-001') {
    const isEdit = !!machine;
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = isEdit ? 'editMachineModal' : 'addMachineModal';

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-cog"></i> ${isEdit ? 'Edit' : 'Add New'} Machine</h2>
                <button class="btn-close" onclick="closeModal('${modal.id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <form id="${isEdit ? 'editMachineForm' : 'addMachineForm'}">
                ${isEdit ? `<input type="hidden" id="machineId" value="${machine.id}">` : ''}
                
                <div class="form-section">
                    <h5><i class="fas fa-info-circle"></i> Basic Information</h5>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Machine ID</label>
                            <input type="text" class="form-input" id="machineIdDisplay" 
                                   value="${machine?.machine_id || nextMachineId}" 
                                   placeholder="${nextMachineId}" readonly style="background-color: #f3f4f6; cursor: not-allowed;">
                            <small style="color: var(--muted); display: block; margin-top: 4px;">Automatically generated unique identifier</small>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Machine Name *</label>
                            <select class="form-select" id="machineName" required onchange="updateMachineComponents()">
                                <option value="">Select Machine Type</option>
                                ${Object.keys(MACHINE_TYPES).map(type => `
                                    <option value="${type}" ${machine?.machine_name === type ? 'selected' : ''}>${type}</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Model Number *</label>
                            <input type="text" class="form-input" id="modelNumber" 
                                   value="${machine?.model_number || ''}" 
                                   placeholder="e.g., CAT-320D" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Location *</label>
                            <select class="form-select" id="location" required>
                                <option value="">Select Location</option>
                                ${LOCATIONS.map(loc => `
                                    <option value="${loc}" ${machine?.location === loc ? 'selected' : ''}>${loc}</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Status</label>
                            <select class="form-select" id="status">
                                <option value="Active" ${machine?.status === 'Active' ? 'selected' : ''}>Active</option>
                                <option value="Inactive" ${machine?.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                                <option value="Under Maintenance" ${machine?.status === 'Under Maintenance' ? 'selected' : ''}>Under Maintenance</option>
                                <option value="Decommissioned" ${machine?.status === 'Decommissioned' ? 'selected' : ''}>Decommissioned</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h5><i class="fas fa-truck"></i> Supplier Information</h5>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Supplier Name *</label>
                            <input type="text" class="form-input" id="supplierName" 
                                   value="${machine?.supplier_name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Supplier Contact</label>
                            <input type="text" class="form-input" id="supplierContact" 
                                   value="${machine?.supplier_contact || ''}">
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h5><i class="fas fa-calendar-alt"></i> Service & Warranty</h5>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Service Interval (Days) *</label>
                            <input type="number" class="form-input" id="serviceInterval" 
                                   value="${machine?.service_interval_days || 90}" min="1" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Last Service Date</label>
                            <input type="date" class="form-input" id="lastServiceDate" 
                                   value="${machine?.last_service_date || ''}" 
                                   max="${new Date().toISOString().split('T')[0]}">
                            <small style="color: var(--muted); display: block; margin-top: 4px;">Cannot be in the future</small>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Warranty Expiry</label>
                            <input type="date" class="form-input" id="warrantyExpiry" 
                                   value="${machine?.warranty_expiry || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Warranty Provider</label>
                            <input type="text" class="form-input" id="warrantyProvider" 
                                   value="${machine?.warranty_provider || ''}">
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h5><i class="fas fa-cogs"></i> Machine Components</h5>
                    <div class="form-group">
                        <label class="form-label">Select Components</label>
                        <div class="components-grid" id="componentsGrid">
                            ${machine?.machine_name && MACHINE_TYPES[machine.machine_name] ? MACHINE_TYPES[machine.machine_name].map(component => {
        const isChecked = machine?.components?.includes(component) ? 'checked' : '';
        return `
                                    <label class="component-checkbox">
                                        <input type="checkbox" name="machineComponent" value="${component}" ${isChecked}>
                                        <span>${component}</span>
                                    </label>
                                `;
    }).join('') : '<p style="color: var(--muted); padding: 1rem;">Please select a machine type to see available components</p>'}
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <div class="form-group">
                        <label class="form-label">Notes</label>
                        <textarea class="form-textarea" id="notes" rows="3">${machine?.notes || ''}</textarea>
                    </div>
                </div>

                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-${isEdit ? 'save' : 'plus'}"></i> ${isEdit ? 'Update' : 'Add'} Machine
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModal('${modal.id}')">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </form>
        </div>
    `;

    // Add form submit handler
    setTimeout(() => {
        const form = modal.querySelector('form');
        form.addEventListener('submit', isEdit ? handleEditMachine : handleAddMachine);

        // Fetch next machine ID for add form
        if (!isEdit) {
            fetchAndDisplayNextMachineId(modal);
        }
    }, 100);

    return modal;
}

// Update machine components based on selected machine type
function updateMachineComponents() {
    const machineType = document.getElementById('machineName')?.value;
    const componentsGrid = document.getElementById('componentsGrid');

    if (!componentsGrid) return;

    if (!machineType || !MACHINE_TYPES[machineType]) {
        componentsGrid.innerHTML = '<p style="color: var(--muted); padding: 1rem;">Please select a machine type to see available components</p>';
        return;
    }

    const components = MACHINE_TYPES[machineType];
    componentsGrid.innerHTML = components.map(component => `
        <label class="component-checkbox">
            <input type="checkbox" name="machineComponent" value="${component}" checked>
            <span>${component}</span>
        </label>
    `).join('');
}

// Update vehicle components based on selected vehicle type
function updateVehicleComponents() {
    const vehicleType = document.getElementById('vehicleName')?.value;
    const componentsGrid = document.getElementById('vehicleComponentsGrid');

    if (!componentsGrid) return;

    if (!vehicleType || !VEHICLE_TYPES[vehicleType]) {
        componentsGrid.innerHTML = '<p style="color: var(--muted); padding: 1rem;">Please select a vehicle type to see available components</p>';
        return;
    }

    const components = VEHICLE_TYPES[vehicleType];
    componentsGrid.innerHTML = components.map(component => `
        <label class="component-checkbox">
            <input type="checkbox" name="vehicleComponent" value="${component}" checked>
            <span>${component}</span>
        </label>
    `).join('');
}

async function handleAddMachine(e) {
    e.preventDefault();

    try {
        const formData = getMachineFormData();

        // Validate last service date is not in the future
        if (formData.last_service_date) {
            const lastServiceDate = new Date(formData.last_service_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

            if (lastServiceDate > today) {
                Utils.showToast('Last service date cannot be in the future', 'error');
                return;
            }
        }

        const response = await API.post('/machines', formData);

        if (response.status === 'success') {
            Utils.showToast('Machine added successfully!', 'success');
            closeModal('addMachineModal');
            await loadMachines();
        } else if (response.status === 'error') {
            // Display error message from backend
            Utils.showToast(response.message || 'Failed to add machine', 'error');

            // If there are validation errors, display them on the form
            if (response.errors) {
                const form = document.getElementById('addMachineForm');
                Utils.showFormErrors(form, response.errors);
            }
        }
    } catch (error) {
        console.error('Failed to add machine:', error);
        Utils.showToast(error.message || 'Failed to add machine', 'error');
    }
}

async function handleEditMachine(e) {
    e.preventDefault();

    try {
        const machineId = document.getElementById('machineId').value;
        const formData = getMachineFormData();

        // Validate last service date is not in the future
        if (formData.last_service_date) {
            const lastServiceDate = new Date(formData.last_service_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

            if (lastServiceDate > today) {
                Utils.showToast('Last service date cannot be in the future', 'error');
                return;
            }
        }

        const response = await API.put(`/machines/${machineId}`, formData);

        if (response.status === 'success') {
            Utils.showToast('Machine updated successfully!', 'success');
            closeModal('editMachineModal');
            await loadMachines();
        } else if (response.status === 'error') {
            // Display error message from backend
            Utils.showToast(response.message || 'Failed to update machine', 'error');

            // If there are validation errors, display them on the form
            if (response.errors) {
                const form = document.getElementById('editMachineForm');
                Utils.showFormErrors(form, response.errors);
            }
        }
    } catch (error) {
        console.error('Failed to update machine:', error);
        Utils.showToast(error.message || 'Failed to update machine', 'error');
    }
}

function getMachineFormData() {
    const selectedComponents = Array.from(document.querySelectorAll('input[name="machineComponent"]:checked'))
        .map(cb => cb.value);

    return {
        machine_name: document.getElementById('machineName').value,
        model_number: document.getElementById('modelNumber').value,
        location: document.getElementById('location').value,
        status: document.getElementById('status').value,
        supplier_name: document.getElementById('supplierName').value,
        supplier_contact: document.getElementById('supplierContact').value,
        service_interval_days: parseInt(document.getElementById('serviceInterval').value),
        last_service_date: document.getElementById('lastServiceDate').value || null,
        warranty_expiry: document.getElementById('warrantyExpiry').value || null,
        warranty_provider: document.getElementById('warrantyProvider').value,
        components: selectedComponents,
        notes: document.getElementById('notes').value
    };
}

async function editMachine(id) {
    const machine = machines.find(m => m.id === id);
    if (!machine) {
        Utils.showToast('Machine not found', 'error');
        return;
    }

    const modal = createMachineModal(machine);
    document.body.appendChild(modal);
    modal.classList.add('active');
}

async function deleteMachine(id) {
    const machine = machines.find(m => m.id === id);
    if (!machine) {
        Utils.showToast('Machine not found', 'error');
        return;
    }

    if (!confirm(`Are you sure you want to delete machine "${machine.machine_name}"? This action cannot be undone.`)) {
        return;
    }

    try {
        const response = await API.delete(`/machines/${id}`);

        if (response.status === 'success') {
            Utils.showToast('Machine deleted successfully!', 'success');
            await loadMachines();
        }
    } catch (error) {
        console.error('Failed to delete machine:', error);
        Utils.showToast(error.message || 'Failed to delete machine', 'error');
    }
}

function viewMachineDetails(id) {
    const machine = machines.find(m => m.id === id);
    if (!machine) {
        Utils.showToast('Machine not found', 'error');
        return;
    }

    const modal = createDetailsModal('Machine Details', `
        <div class="form-section">
            <h5><i class="fas fa-info-circle"></i> Basic Information</h5>
            <p><strong>Machine ID:</strong> ${machine.machine_id}</p>
            <p><strong>Machine Name:</strong> ${machine.machine_name}</p>
            <p><strong>Model Number:</strong> ${machine.model_number}</p>
            <p><strong>Location:</strong> ${machine.location}</p>
            <p><strong>Status:</strong> <span class="status-text ${getStatusClass(machine.status)}">${machine.status}</span></p>
        </div>
        <div class="form-section">
            <h5><i class="fas fa-truck"></i> Supplier Information</h5>
            <p><strong>Supplier:</strong> ${machine.supplier_name}</p>
            ${machine.supplier_contact ? `<p><strong>Contact:</strong> ${machine.supplier_contact}</p>` : ''}
        </div>
        <div class="form-section">
            <h5><i class="fas fa-calendar-alt"></i> Service & Warranty</h5>
            <p><strong>Service Interval:</strong> ${machine.service_interval_days} days</p>
            ${machine.last_service_date ? `<p><strong>Last Service:</strong> ${Utils.formatDate(machine.last_service_date)}</p>` : ''}
            ${machine.next_service_date ? `<p><strong>Next Service:</strong> ${Utils.formatDate(machine.next_service_date)}</p>` : ''}
            ${machine.warranty_expiry ? `<p><strong>Warranty Expiry:</strong> ${Utils.formatDate(machine.warranty_expiry)}</p>` : ''}
            ${machine.warranty_provider ? `<p><strong>Warranty Provider:</strong> ${machine.warranty_provider}</p>` : ''}
        </div>
        ${machine.components && Array.isArray(machine.components) ? `
            <div class="form-section">
                <h5><i class="fas fa-list"></i> Components</h5>
                <div class="components-list">
                    ${machine.components.map(comp => `<span class="component-badge">${comp}</span>`).join('')}
                </div>
            </div>
        ` : ''}
        ${machine.notes ? `
            <div class="form-section">
                <h5><i class="fas fa-sticky-note"></i> Notes</h5>
                <p>${machine.notes}</p>
            </div>
        ` : ''}
    `);

    document.body.appendChild(modal);
    modal.classList.add('active');
}

// ==================== VEHICLES MANAGEMENT ====================

// ==================== VEHICLE CRUD OPERATIONS ====================

async function openAddVehicleModal() {
    // Fetch next vehicle ID before creating the modal
    let nextVehicleId = 'VEH-001';
    try {
        const response = await API.get('/vehicles/next-id');
        if (response.status === 'success' && response.data.next_id) {
            nextVehicleId = response.data.next_id;
        }
    } catch (error) {
        console.error('Failed to fetch next vehicle ID:', error);
    }

    const modal = createVehicleModal(null, nextVehicleId);
    document.body.appendChild(modal);
    modal.classList.add('active');
}

function createVehicleModal(vehicle = null, nextVehicleId = 'VEH-001') {
    const isEdit = !!vehicle;
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = isEdit ? 'editVehicleModal' : 'addVehicleModal';

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-truck"></i> ${isEdit ? 'Edit' : 'Add New'} Vehicle</h2>
                <button class="btn-close" onclick="closeModal('${modal.id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <form id="${isEdit ? 'editVehicleForm' : 'addVehicleForm'}">
                ${isEdit ? `<input type="hidden" id="vehicleId" value="${vehicle.id}">` : ''}
                
                <div class="form-section">
                    <h5><i class="fas fa-info-circle"></i> Basic Information</h5>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Vehicle ID</label>
                            <input type="text" class="form-input" id="vehicleIdDisplay" 
                                   value="${vehicle?.vehicle_id || nextVehicleId}" 
                                   placeholder="${nextVehicleId}" readonly style="background-color: #f3f4f6; cursor: not-allowed;">
                            <small style="color: var(--muted); display: block; margin-top: 4px;">Automatically generated unique identifier</small>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Vehicle Type *</label>
                            <select class="form-select" id="vehicleName" required onchange="updateVehicleComponents()">
                                <option value="">Select Vehicle Type</option>
                                ${Object.keys(VEHICLE_TYPES).map(type => `
                                    <option value="${type}" ${vehicle?.vehicle_name === type ? 'selected' : ''}>${type}</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Number Plate *</label>
                            <input type="text" class="form-input" id="numberPlate" 
                                   value="${vehicle?.number_plate || ''}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Chassis Number</label>
                            <input type="text" class="form-input" id="chassisNumber" 
                                   value="${vehicle?.chassis_number || ''}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Fuel Type *</label>
                            <select class="form-select" id="fuelType" required>
                                ${CONFIG.FUEL_TYPES.map(type =>
        `<option value="${type}" ${vehicle?.fuel_type === type ? 'selected' : ''}>${type}</option>`
    ).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Current Mileage (km)</label>
                            <input type="number" class="form-input" id="currentMileage" 
                                   value="${vehicle?.current_mileage || 0}" min="0">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Status</label>
                            <select class="form-select" id="vehicleStatus">
                                <option value="Active" ${vehicle?.status === 'Active' ? 'selected' : ''}>Active</option>
                                <option value="Inactive" ${vehicle?.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                                <option value="Under Maintenance" ${vehicle?.status === 'Under Maintenance' ? 'selected' : ''}>Under Maintenance</option>
                                <option value="Decommissioned" ${vehicle?.status === 'Decommissioned' ? 'selected' : ''}>Decommissioned</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h5><i class="fas fa-truck"></i> Supplier Information</h5>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Supplier Name *</label>
                            <input type="text" class="form-input" id="vehicleSupplierName" 
                                   value="${vehicle?.supplier_name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Supplier Contact</label>
                            <input type="text" class="form-input" id="vehicleSupplierContact" 
                                   value="${vehicle?.supplier_contact || ''}">
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h5><i class="fas fa-calendar-alt"></i> Service & Warranty</h5>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Service Interval Type *</label>
                            <select class="form-select" id="serviceIntervalType" onchange="toggleServiceIntervals()" required>
                                <option value="Time-Based" ${vehicle?.service_interval_type === 'Time-Based' ? 'selected' : ''}>Time-Based</option>
                                <option value="Mileage-Based" ${vehicle?.service_interval_type === 'Mileage-Based' ? 'selected' : ''}>Mileage-Based</option>
                                <option value="Both" ${vehicle?.service_interval_type === 'Both' ? 'selected' : ''}>Both</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group" id="timeIntervalGroup">
                            <label class="form-label">Service Interval (Days)</label>
                            <input type="number" class="form-input" id="vehicleServiceIntervalDays" 
                                   value="${vehicle?.service_interval_days || ''}" min="1">
                        </div>
                        <div class="form-group" id="mileageIntervalGroup">
                            <label class="form-label">Service Interval (Kilometers)</label>
                            <input type="number" class="form-input" id="vehicleServiceIntervalKm" 
                                   value="${vehicle?.service_interval_km || ''}" min="1">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Last Service Date</label>
                            <input type="date" class="form-input" id="vehicleLastServiceDate" 
                                   value="${vehicle?.last_service_date || ''}" 
                                   max="${new Date().toISOString().split('T')[0]}">
                            <small style="color: var(--muted); display: block; margin-top: 4px;">Cannot be in the future</small>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Last Service Mileage (km)</label>
                            <input type="number" class="form-input" id="lastServiceMileage" 
                                   value="${vehicle?.last_service_mileage || ''}" min="0">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Warranty Expiry</label>
                            <input type="date" class="form-input" id="vehicleWarrantyExpiry" 
                                   value="${vehicle?.warranty_expiry || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Warranty Provider</label>
                            <input type="text" class="form-input" id="vehicleWarrantyProvider" 
                                   value="${vehicle?.warranty_provider || ''}">
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h5><i class="fas fa-cogs"></i> Vehicle Components</h5>
                    <div class="form-group">
                        <label class="form-label">Select Components</label>
                        <div class="components-grid" id="vehicleComponentsGrid">
                            ${vehicle?.vehicle_name && VEHICLE_TYPES[vehicle.vehicle_name] ? VEHICLE_TYPES[vehicle.vehicle_name].map(component => {
        const isChecked = vehicle?.components?.includes(component) ? 'checked' : '';
        return `
                                    <label class="component-checkbox">
                                        <input type="checkbox" name="vehicleComponent" value="${component}" ${isChecked}>
                                        <span>${component}</span>
                                    </label>
                                `;
    }).join('') : '<p style="color: var(--muted); padding: 1rem;">Please select a vehicle type to see available components</p>'}
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <div class="form-group">
                        <label class="form-label">Notes</label>
                        <textarea class="form-textarea" id="vehicleNotes" rows="3">${vehicle?.notes || ''}</textarea>
                    </div>
                </div>

                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-${isEdit ? 'save' : 'plus'}"></i> ${isEdit ? 'Update' : 'Add'} Vehicle
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModal('${modal.id}')">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </form>
        </div>
    `;

    // Add form submit handler
    setTimeout(() => {
        const form = modal.querySelector('form');
        form.addEventListener('submit', isEdit ? handleEditVehicle : handleAddVehicle);

        // Initialize service interval visibility
        if (modal.querySelector('#serviceIntervalType')) {
            toggleServiceIntervals();
        }
    }, 100);

    return modal;
}

function toggleServiceIntervals() {
    const serviceType = document.getElementById('serviceIntervalType').value;
    const timeGroup = document.getElementById('timeIntervalGroup');
    const mileageGroup = document.getElementById('mileageIntervalGroup');

    if (serviceType === 'Time-Based') {
        timeGroup.style.display = 'block';
        mileageGroup.style.display = 'none';
        document.getElementById('vehicleServiceIntervalDays').required = true;
        document.getElementById('vehicleServiceIntervalKm').required = false;
    } else if (serviceType === 'Mileage-Based') {
        timeGroup.style.display = 'none';
        mileageGroup.style.display = 'block';
        document.getElementById('vehicleServiceIntervalDays').required = false;
        document.getElementById('vehicleServiceIntervalKm').required = true;
    } else { // Both
        timeGroup.style.display = 'block';
        mileageGroup.style.display = 'block';
        document.getElementById('vehicleServiceIntervalDays').required = true;
        document.getElementById('vehicleServiceIntervalKm').required = true;
    }
}

async function handleAddVehicle(e) {
    e.preventDefault();

    try {
        const formData = getVehicleFormData();

        // Validate last service date is not in the future
        if (formData.last_service_date) {
            const lastServiceDate = new Date(formData.last_service_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

            if (lastServiceDate > today) {
                Utils.showToast('Last service date cannot be in the future', 'error');
                return;
            }
        }

        const response = await API.post('/vehicles', formData);

        if (response.status === 'success') {
            Utils.showToast('Vehicle added successfully!', 'success');
            closeModal('addVehicleModal');
            await loadVehicles();
        } else if (response.status === 'error') {
            // Display error message from backend
            Utils.showToast(response.message || 'Failed to add vehicle', 'error');

            // If there are validation errors, display them on the form
            if (response.errors) {
                const form = document.getElementById('addVehicleForm');
                Utils.showFormErrors(form, response.errors);
            }
        }
    } catch (error) {
        console.error('Failed to add vehicle:', error);
        Utils.showToast(error.message || 'Failed to add vehicle', 'error');
    }
}

async function handleEditVehicle(e) {
    e.preventDefault();

    try {
        const vehicleId = document.getElementById('vehicleId').value;
        const formData = getVehicleFormData();

        // Validate last service date is not in the future
        if (formData.last_service_date) {
            const lastServiceDate = new Date(formData.last_service_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

            if (lastServiceDate > today) {
                Utils.showToast('Last service date cannot be in the future', 'error');
                return;
            }
        }

        const response = await API.put(`/vehicles/${vehicleId}`, formData);

        if (response.status === 'success') {
            Utils.showToast('Vehicle updated successfully!', 'success');
            closeModal('editVehicleModal');
            await loadVehicles();
        } else if (response.status === 'error') {
            // Display error message from backend
            Utils.showToast(response.message || 'Failed to update vehicle', 'error');

            // If there are validation errors, display them on the form
            if (response.errors) {
                const form = document.getElementById('editVehicleForm');
                Utils.showFormErrors(form, response.errors);
            }
        }
    } catch (error) {
        console.error('Failed to update vehicle:', error);
        Utils.showToast(error.message || 'Failed to update vehicle', 'error');
    }
}

function getVehicleFormData() {
    const serviceType = document.getElementById('serviceIntervalType').value;

    const formData = {
        vehicle_name: document.getElementById('vehicleName').value,
        model_number: document.getElementById('vehicleModel').value,
        number_plate: document.getElementById('numberPlate').value,
        chassis_number: document.getElementById('chassisNumber').value,
        vehicle_type: document.getElementById('vehicleName').value,
        fuel_type: document.getElementById('fuelType').value,
        current_mileage: parseInt(document.getElementById('currentMileage').value) || 0,
        status: document.getElementById('vehicleStatus').value,
        supplier_name: document.getElementById('vehicleSupplierName').value,
        supplier_contact: document.getElementById('vehicleSupplierContact').value,
        service_interval_type: serviceType,
        warranty_expiry: document.getElementById('vehicleWarrantyExpiry').value || null,
        warranty_provider: document.getElementById('vehicleWarrantyProvider').value,
        last_service_date: document.getElementById('vehicleLastServiceDate').value || null,
        last_service_mileage: document.getElementById('lastServiceMileage').value ? parseInt(document.getElementById('lastServiceMileage').value) : null,
        notes: document.getElementById('vehicleNotes').value
    };

    // Add service intervals based on type
    if (serviceType === 'Time-Based' || serviceType === 'Both') {
        formData.service_interval_days = parseInt(document.getElementById('vehicleServiceIntervalDays').value);
    }

    if (serviceType === 'Mileage-Based' || serviceType === 'Both') {
        formData.service_interval_km = parseInt(document.getElementById('vehicleServiceIntervalKm').value);
    }

    // Get selected components
    const selectedComponents = [];
    document.querySelectorAll('input[name="vehicleComponent"]:checked').forEach(checkbox => {
        selectedComponents.push(checkbox.value);
    });
    formData.components = selectedComponents;

    return formData;
}

async function editVehicle(id) {
    const vehicle = vehicles.find(v => v.id === id);
    if (!vehicle) {
        Utils.showToast('Vehicle not found', 'error');
        return;
    }

    const modal = createVehicleModal(vehicle);
    document.body.appendChild(modal);
    modal.classList.add('active');
}

async function deleteVehicle(id) {
    const vehicle = vehicles.find(v => v.id === id);
    if (!vehicle) {
        Utils.showToast('Vehicle not found', 'error');
        return;
    }

    if (!confirm(`Are you sure you want to delete vehicle "${vehicle.vehicle_name}" (${vehicle.number_plate})? This action cannot be undone.`)) {
        return;
    }

    try {
        const response = await API.delete(`/vehicles/${id}`);

        if (response.status === 'success') {
            Utils.showToast('Vehicle deleted successfully!', 'success');
            await loadVehicles();
        }
    } catch (error) {
        console.error('Failed to delete vehicle:', error);
        Utils.showToast(error.message || 'Failed to delete vehicle', 'error');
    }
}

function viewVehicleDetails(id) {
    const vehicle = vehicles.find(v => v.id === id);
    if (!vehicle) {
        Utils.showToast('Vehicle not found', 'error');
        return;
    }

    const modal = createDetailsModal('Vehicle Details', `
        <div class="form-section">
            <h5><i class="fas fa-info-circle"></i> Basic Information</h5>
            <p><strong>Vehicle ID:</strong> ${vehicle.vehicle_id}</p>
            <p><strong>Vehicle Name:</strong> ${vehicle.vehicle_name}</p>
            <p><strong>Number Plate:</strong> ${vehicle.number_plate}</p>
            <p><strong>Chassis Number:</strong> ${vehicle.chassis_number}</p>
            <p><strong>Vehicle Type:</strong> ${vehicle.vehicle_type}</p>
            <p><strong>Fuel Type:</strong> ${vehicle.fuel_type}</p>
            <p><strong>Current Mileage:</strong> ${vehicle.current_mileage} km</p>
            <p><strong>Status:</strong> <span class="status-text ${getStatusClass(vehicle.status)}">${vehicle.status}</span></p>
        </div>
        <div class="form-section">
            <h5><i class="fas fa-truck"></i> Supplier Information</h5>
            <p><strong>Supplier:</strong> ${vehicle.supplier_name}</p>
            ${vehicle.supplier_contact ? `<p><strong>Contact:</strong> ${vehicle.supplier_contact}</p>` : ''}
        </div>
        <div class="form-section">
            <h5><i class="fas fa-calendar-alt"></i> Service & Warranty</h5>
            <p><strong>Service Interval Type:</strong> ${vehicle.service_interval_type}</p>
            ${vehicle.service_interval_days ? `<p><strong>Service Interval (Days):</strong> ${vehicle.service_interval_days}</p>` : ''}
            ${vehicle.service_interval_km ? `<p><strong>Service Interval (KM):</strong> ${vehicle.service_interval_km}</p>` : ''}
            ${vehicle.last_service_date ? `<p><strong>Last Service:</strong> ${Utils.formatDate(vehicle.last_service_date)}</p>` : ''}
            ${vehicle.last_service_mileage ? `<p><strong>Last Service Mileage:</strong> ${vehicle.last_service_mileage} km</p>` : ''}
            ${vehicle.next_service_date ? `<p><strong>Next Service:</strong> ${Utils.formatDate(vehicle.next_service_date)}</p>` : ''}
            ${vehicle.next_service_mileage ? `<p><strong>Next Service Mileage:</strong> ${vehicle.next_service_mileage} km</p>` : ''}
            ${vehicle.warranty_expiry ? `<p><strong>Warranty Expiry:</strong> ${Utils.formatDate(vehicle.warranty_expiry)}</p>` : ''}
            ${vehicle.warranty_provider ? `<p><strong>Warranty Provider:</strong> ${vehicle.warranty_provider}</p>` : ''}
        </div>
        ${vehicle.components && vehicle.components.length > 0 ? `
            <div class="form-section">
                <h5><i class="fas fa-cogs"></i> Components</h5>
                <div class="components-list">
                    ${vehicle.components.map(comp => `<span class="component-badge">${comp}</span>`).join('')}
                </div>
            </div>
        ` : ''}
        ${vehicle.notes ? `
            <div class="form-section">
                <h5><i class="fas fa-sticky-note"></i> Notes</h5>
                <p>${vehicle.notes}</p>
            </div>
        ` : ''}
    `);

    document.body.appendChild(modal);
    modal.classList.add('active');
}

function updateVehicleMileage(id) {
    const vehicle = vehicles.find(v => v.id === id);
    if (!vehicle) {
        Utils.showToast('Vehicle not found', 'error');
        return;
    }

    const modal = createMileageUpdateModal(vehicle);
    document.body.appendChild(modal);
    modal.classList.add('active');
}

function createMileageUpdateModal(vehicle) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'updateMileageModal';

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h4><i class="fas fa-tachometer-alt"></i> Update Vehicle Mileage</h4>
                <button class="btn-close" onclick="closeModal('updateMileageModal')">&times;</button>
            </div>
            <form id="updateMileageForm" onsubmit="handleMileageUpdate(event, ${vehicle.id})">
                <div class="form-section">
                    <div class="vehicle-info-card">
                        <h5><i class="fas fa-car"></i> ${vehicle.vehicle_name}</h5>
                        <p><strong>Number Plate:</strong> ${vehicle.number_plate}</p>
                        <p><strong>Current Mileage:</strong> <span class="highlight">${vehicle.current_mileage} km</span></p>
                    </div>
                </div>
                
                <div class="form-section">
                    <div class="form-group">
                        <label class="form-label">New Mileage (km) *</label>
                        <input type="number" 
                               class="form-input" 
                               id="newMileage" 
                               min="${vehicle.current_mileage}" 
                               value="${vehicle.current_mileage}" 
                               required>
                        <small class="form-help">Mileage must be greater than or equal to current mileage (${vehicle.current_mileage} km)</small>
                    </div>
                </div>

                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i> Update Mileage
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModal('updateMileageModal')">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </form>
        </div>
    `;

    return modal;
}

async function handleMileageUpdate(e, vehicleId) {
    e.preventDefault();

    try {
        const mileage = parseInt(document.getElementById('newMileage').value);
        const response = await API.patch(`/vehicles/${vehicleId}/mileage`, { mileage });

        if (response.status === 'success') {
            Utils.showToast('Mileage updated successfully!', 'success');
            closeModal('updateMileageModal');
            await loadVehicles();
        }
    } catch (error) {
        console.error('Failed to update mileage:', error);
        Utils.showToast(error.message || 'Failed to update mileage', 'error');
    }
}

// ==================== SEARCH HANDLERS ====================

function initializeSearchHandlers() {
    const machineSearch = document.getElementById('machineSearch');
    const vehicleSearch = document.getElementById('vehicleSearch');

    if (machineSearch) {
        machineSearch.addEventListener('input', (e) => {
            applyMachineFilters(e.target.value.toLowerCase());
        });
    }

    if (vehicleSearch) {
        vehicleSearch.addEventListener('input', (e) => {
            applyVehicleFilters(e.target.value.toLowerCase());
        });
    }
}

// ==================== UTILITY FUNCTIONS ====================

function createDetailsModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'detailsModal_' + Date.now();

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-info-circle"></i> ${title}</h2>
                <button class="btn-close" onclick="closeModal('${modal.id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="form-section">
                ${content}
            </div>
            <button class="btn btn-secondary" onclick="closeModal('${modal.id}')"><i class="fas fa-times"></i> Close</button>
        </div>
    `;

    return modal;
}

function openModal(modalId) {
    console.log('openModal called with modalId:', modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        console.log('Modal opened successfully:', modalId);
    } else {
        console.error('Modal element not found:', modalId);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        // Remove dynamically created modals
        if (modalId.startsWith('detailsModal_') || modalId.includes('Machine') || modalId.includes('Vehicle')) {
            setTimeout(() => modal.remove(), 300);
        }
    }
}

// logout(), createConfirmationDialog(), closeConfirmation(), confirmAction()
// are now provided by shared dashboard-init.js



function toggleDropdown(event, dropdownId) {
    event.stopPropagation();

    // Close all other dropdowns first
    closeAllDropdowns();

    // Toggle the clicked dropdown
    const dropdown = document.getElementById(`dropdown-${dropdownId}`);
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
}

function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-menu').forEach(dropdown => {
        dropdown.classList.remove('active');
    });
}

// Close dropdowns when clicking outside
document.addEventListener('click', (event) => {
    if (!event.target.closest('.dropdown-container')) {
        closeAllDropdowns();
    }
});


// ==================== DELETE CONFIRMATION ====================

function confirmDelete(id, type, name) {
    closeAllDropdowns();
    createConfirmationDialog(
        'Confirm Deletion',
        `Are you sure you want to delete <strong>${name}</strong>?<br><br>This action cannot be undone.`,
        async () => {
            if (type === 'machine') {
                await deleteMachine(id);
            } else if (type === 'vehicle') {
                await deleteVehicle(id);
            }
        },
        'danger'
    );
}

// ==================== AUCTION FUNCTIONS ====================

function markForAuction(id, type) {
    closeAllDropdowns();
    const itemName = type === 'machine'
        ? machines.find(m => m.id === id)?.machine_name
        : vehicles.find(v => v.id === id)?.vehicle_name;

    createConfirmationDialog(
        'Mark for Auction',
        `Are you sure you want to mark <strong>${itemName}</strong> for auction?<br><br>This will change the status to "For Auction".`,
        async () => {
            await updateItemStatus(id, type, 'For Auction');
        },
        'warning'
    );
}

async function removeFromAuction(id, type) {
    closeAllDropdowns();
    const itemName = type === 'machine'
        ? machines.find(m => m.id === id)?.machine_name
        : vehicles.find(v => v.id === id)?.vehicle_name;

    createConfirmationDialog(
        'Remove from Auction',
        `Do you want to remove <strong>${itemName}</strong> from auction?<br><br>The status will be changed to "Active".`,
        async () => {
            await updateItemStatus(id, type, 'Active');
        },
        'primary'
    );
}

async function updateItemStatus(id, type, status) {
    try {
        const endpoint = type === 'machine' ? `/machines/${id}` : `/vehicles/${id}`;
        const response = await API.put(endpoint, { status });

        if (response.status === 'success') {
            Utils.showToast(`Status updated to "${status}" successfully!`, 'success');
            if (type === 'machine') {
                await loadMachines();
            } else {
                await loadVehicles();
            }
        }
    } catch (error) {
        console.error('Failed to update status:', error);
        Utils.showToast(error.message || 'Failed to update status', 'error');
    }
}

// ==================== SPARE PARTS CATALOG FUNCTIONS ====================

// Define spare part names for each category
const SPARE_PART_NAMES = {
    vehicles: [
        'Brake Pads',
        'Oil Filter',
        'Air Filter',
        'Fuel Filter',
        'Battery',
        'Tyres',
        'Engine Oil',
        'Transmission Fluid',
        'Spark Plugs',
        'Alternator',
        'Radiator',
        'Water Pump',
        'Timing Belt',
        'Clutch Kit',
        'Suspension Parts',
        'Headlights',
        'Wiper Blades'
    ],
    machines: [
        'Hydraulic Pump',
        'Hydraulic Fluid',
        'Pressure Valve',
        'Gas Cylinder',
        'Pressure Regulator',
        'Safety Valve',
        'Compressor Belt',
        'Compressor Oil',
        'Seals and Gaskets',
        'Hoses',
        'Filters',
        'Bearings',
        'Motor Components',
        'Control Panel Parts',
        'Sensors',
        'Electrical Components',
        'Pneumatic Parts'
    ]
};

// Update sparepart name dropdown based on selected category
function updateSparepartNameOptions() {
    const category = document.getElementById('partCategory').value;
    const sparepartNameSelect = document.getElementById('sparepartName');

    sparepartNameSelect.innerHTML = '<option value="">Select Sparepart Name</option>';

    if (category && SPARE_PART_NAMES[category]) {
        SPARE_PART_NAMES[category].forEach(sparepartName => {
            const option = document.createElement('option');
            option.value = sparepartName;
            option.textContent = sparepartName;
            sparepartNameSelect.appendChild(option);
        });
    }
}

// Update sparepart name dropdown for edit form
function updateEditSparepartNameOptions() {
    const category = document.getElementById('editPartCategory').value;
    const sparepartNameSelect = document.getElementById('editSparepartName');
    const currentValue = sparepartNameSelect.value;

    sparepartNameSelect.innerHTML = '<option value="">Select Sparepart Name</option>';

    if (category && SPARE_PART_NAMES[category]) {
        SPARE_PART_NAMES[category].forEach(sparepartName => {
            const option = document.createElement('option');
            option.value = sparepartName;
            option.textContent = sparepartName;
            if (sparepartName === currentValue) {
                option.selected = true;
            }
            sparepartNameSelect.appendChild(option);
        });
    }
}

// Update compatibility checkboxes based on selected category
function updateCompatibilityOptions() {
    const category = document.getElementById('partCategory').value;
    const container = document.getElementById('compatibilityCheckboxes');
    const label = document.getElementById('compatibilityLabel');

    if (category === 'vehicles') {
        label.textContent = 'Compatible Vehicles';
        const vehicleTypesList = Object.keys(VEHICLE_TYPES);
        container.innerHTML = vehicleTypesList.map(vehicleType => `
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" name="compatibleVehicles" value="${vehicleType}"> ${vehicleType}
            </label>
        `).join('');
    } else if (category === 'machines') {
        label.textContent = 'Compatible Machines';
        const machineTypesList = Object.keys(MACHINE_TYPES);
        container.innerHTML = machineTypesList.map(machineType => `
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" name="compatibleMachines" value="${machineType}"> ${machineType}
            </label>
        `).join('');
    } else {
        label.textContent = 'Compatible Machines/Vehicles';
        container.innerHTML = '<p style="color: #999; grid-column: 1 / -1;">Please select a category first</p>';
    }
}

// Update compatibility checkboxes for edit form
function updateEditCompatibilityOptions() {
    const category = document.getElementById('editPartCategory').value;
    const container = document.getElementById('editCompatibilityCheckboxes');
    const label = document.getElementById('editCompatibilityLabel');

    if (category === 'vehicles') {
        label.textContent = 'Compatible Vehicles';
        const vehicleTypesList = Object.keys(VEHICLE_TYPES);
        container.innerHTML = vehicleTypesList.map(vehicleType => `
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" name="editCompatibleVehicles" value="${vehicleType}"> ${vehicleType}
            </label>
        `).join('');
    } else if (category === 'machines') {
        label.textContent = 'Compatible Machines';
        const machineTypesList = Object.keys(MACHINE_TYPES);
        container.innerHTML = machineTypesList.map(machineType => `
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" name="editCompatibleMachines" value="${machineType}"> ${machineType}
            </label>
        `).join('');
    } else {
        label.textContent = 'Compatible Machines/Vehicles';
        container.innerHTML = '<p style="color: #999; grid-column: 1 / -1;">Please select a category first</p>';
    }
}

// ==================== SPARE PARTS / PRODUCTS API FUNCTIONS ====================

// CREATE - Add Part
async function openAddPartModal() {
    try {
        // Fetch next sparepart ID from backend
        const response = await API.get('/products/next-id');
        if (response.status === 'success' && response.data && response.data.next_id) {
            document.getElementById('sparepartIdDisplay').value = response.data.next_id;
        } else {
            throw new Error('Failed to get next sparepart ID');
        }
        openModal('addPartModal');
    } catch (error) {
        console.error('Failed to get next sparepart ID:', error);
        Utils.showToast('Failed to get next sparepart ID', 'error');
        document.getElementById('sparepartIdDisplay').value = 'SPR-###';
        openModal('addPartModal');
    }
}

document.getElementById('addPartForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const sparepartId = document.getElementById('sparepartIdDisplay').value;
    const sparepartName = document.getElementById('sparepartName').value;
    const category = document.getElementById('partCategory').value;
    const location = document.getElementById('partLocation').value;

    // Get compatible machines and vehicles
    const compatibleMachines = Array.from(document.querySelectorAll('input[name="compatibleMachines"]:checked'))
        .map(cb => cb.value);
    const compatibleVehicles = Array.from(document.querySelectorAll('input[name="compatibleVehicles"]:checked'))
        .map(cb => cb.value);

    // Save spare part to database (without warranty, quantity, and supplier fields - managed via additions)
    await saveSparePart({
        sparepart_id: sparepartId,
        name: sparepartName,
        category: category,
        quantity: 0,
        location: location,
        compatible_machines: JSON.stringify(compatibleMachines),
        compatible_vehicles: JSON.stringify(compatibleVehicles)
    });
});

async function saveSparePart(data) {
    try {
        showLoading(true);
        console.log('Saving spare part:', data);
        const response = await API.post('/products', data);
        console.log('API response:', response);

        if (response.status === 'success') {
            Utils.showToast(`${data.name} added to catalog successfully!`, 'success');
            closeModal('addPartModal');
            document.getElementById('addPartForm').reset();
            // Reload spare parts
            await refreshCatalogModel();
        } else {
            console.error('Failed to add spare part:', response);
            Utils.showToast(`Failed to add spare part: ${response.message}`, 'error');
        }
    } catch (error) {
        console.error('Error saving spare part:', error);
        Utils.showToast('Error saving spare part', 'error');
    } finally {
        showLoading(false);
    }
}

// READ - View Part Details
async function viewPartDetails(partId) {
    try {
        showLoading(true);

        // Fetch part details from database
        const response = await API.get(`/products/${partId}`);

        if (response.status !== 'success' || !response.data) {
            Utils.showToast('Failed to load spare part details', 'error');
            return;
        }

        const part = response.data;

        // Parse JSON fields
        const compatibleMachines = part.compatible_machines ? JSON.parse(part.compatible_machines) : [];
        const compatibleVehicles = part.compatible_vehicles ? JSON.parse(part.compatible_vehicles) : [];

        // Determine stock status
        const quantity = parseInt(part.quantity) || 0;
        const stockStatus = quantity > 10 ? 'In Stock' : (quantity > 0 ? 'Low Stock' : 'Out of Stock');
        const stockBadge = quantity > 10 ? 'status-in-stock' : (quantity > 0 ? 'status-low-stock' : 'status-out-of-stock');

        // Format category
        const categoryDisplay = part.category === 'vehicles' ? 'Vehicle Parts' : 'Machine Parts';

        const modal = createDetailsModal('Spare Part Details', `
            <div class="form-section">
                <h5><i class="fas fa-box"></i> Part Information</h5>
                <p><strong>Sparepart ID:</strong> ${part.sparepart_id}</p>
                <p><strong>Sparepart Name:</strong> ${part.name}</p>
                <p><strong>Category:</strong> ${categoryDisplay}</p>
                <p><strong>Quantity:</strong> ${quantity} units</p>
                <p><strong>Stock Status:</strong> <span class="status-text ${stockBadge}">${stockStatus}</span></p>
                <p><strong>Storage Location:</strong> ${part.location || 'N/A'}</p>
                ${part.unit_price ? `<p><strong>Unit Price:</strong> Rs. ${parseFloat(part.unit_price).toFixed(2)}</p>` : ''}
                ${part.reorder_level ? `<p><strong>Reorder Level:</strong> ${part.reorder_level} units</p>` : ''}
            </div>
            <div class="form-section">
                <h5><i class="fas fa-truck"></i> Supplier Information</h5>
                <p><strong>Supplier Name:</strong> ${part.supplier || 'N/A'}</p>
                <p><strong>Contact:</strong> ${part.supplier_contact || 'N/A'}</p>
                <p><strong>Address:</strong> ${part.supplier_address || 'N/A'}</p>
            </div>
            <div class="form-section">
                <h5><i class="fas fa-cog"></i> Compatible Machines</h5>
                <div class="components-list">
                    ${compatibleMachines.length > 0
                ? compatibleMachines.map(machine => `<span class="component-badge">${machine}</span>`).join('')
                : '<span class="text-muted">No compatible machines specified</span>'}
                </div>
            </div>
            <div class="form-section">
                <h5><i class="fas fa-truck"></i> Compatible Vehicles</h5>
                <div class="components-list">
                    ${compatibleVehicles.length > 0
                ? compatibleVehicles.map(vehicle => `<span class="component-badge">${vehicle}</span>`).join('')
                : '<span class="text-muted">No compatible vehicles specified</span>'}
                </div>
            </div>
            <div class="form-section">
                <h5><i class="fas fa-clock"></i> Record Information</h5>
                <p><strong>Created:</strong> ${new Date(part.created_at).toLocaleString()}</p>
                <p><strong>Last Updated:</strong> ${new Date(part.updated_at).toLocaleString()}</p>
            </div>
        `);

        document.body.appendChild(modal);
        modal.classList.add('active');

    } catch (error) {
        console.error('Error loading part details:', error);
        Utils.showToast('Error loading spare part details', 'error');
    } finally {
        showLoading(false);
    }
}

// UPDATE - Edit Part
async function editPart(partId) {
    try {
        showLoading(true);

        // Fetch spare part data from database
        const response = await API.get(`/products/${partId}`);

        if (response.status !== 'success' || !response.data) {
            Utils.showToast('Failed to load spare part details', 'error');
            return;
        }

        const part = response.data;

        // Parse JSON fields
        const compatibleMachines = part.compatible_machines ? JSON.parse(part.compatible_machines) : [];
        const compatibleVehicles = part.compatible_vehicles ? JSON.parse(part.compatible_vehicles) : [];

        // Set basic information
        document.getElementById('editPartId').value = part.id;
        document.getElementById('editSparepartId').value = part.sparepart_id;

        // Set category first to populate dropdown options
        document.getElementById('editPartCategory').value = part.category;
        updateEditSparepartNameOptions();
        updateEditCompatibilityOptions();

        // Set sparepart name
        document.getElementById('editSparepartName').value = part.name;
        document.getElementById('editPartQuantity').value = part.quantity;
        document.getElementById('editPartLocation').value = part.location;

        // Set supplier details
        document.getElementById('editPartSupplier').value = part.supplier || '';
        document.getElementById('editPartSupplierContact').value = part.supplier_contact || '';
        document.getElementById('editPartSupplierAddress').value = part.supplier_address || '';

        // Set compatibility checkboxes
        if (part.category === 'machines') {
            compatibleMachines.forEach(machine => {
                const checkbox = document.querySelector(`input[name="editCompatibleMachines"][value="${machine}"]`);
                if (checkbox) checkbox.checked = true;
            });
        } else if (part.category === 'vehicles') {
            compatibleVehicles.forEach(vehicle => {
                const checkbox = document.querySelector(`input[name="editCompatibleVehicles"][value="${vehicle}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }

        openModal('editPartModal');
    } catch (error) {
        console.error('Error loading spare part for edit:', error);
        Utils.showToast('Error loading spare part details', 'error');
    } finally {
        showLoading(false);
    }
}

document.getElementById('editPartForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const partId = document.getElementById('editPartId').value;
    const sparepartName = document.getElementById('editSparepartName').value;
    const quantity = document.getElementById('editPartQuantity').value;
    const category = document.getElementById('editPartCategory').value;
    const location = document.getElementById('editPartLocation').value;
    const supplier = document.getElementById('editPartSupplier').value || '';
    const supplierContact = document.getElementById('editPartSupplierContact').value || '';
    const supplierAddress = document.getElementById('editPartSupplierAddress').value || '';

    // Get compatible machines and vehicles
    const compatibleMachines = Array.from(document.querySelectorAll('input[name="editCompatibleMachines"]:checked'))
        .map(cb => cb.value);
    const compatibleVehicles = Array.from(document.querySelectorAll('input[name="editCompatibleVehicles"]:checked'))
        .map(cb => cb.value);

    // Update spare part in database
    try {
        showLoading(true);
        const response = await API.put(`/products/${partId}`, {
            name: sparepartName,
            category: category,
            quantity: parseInt(quantity),
            location: location,
            supplier: supplier,
            supplier_contact: supplierContact,
            supplier_address: supplierAddress,
            compatible_machines: JSON.stringify(compatibleMachines),
            compatible_vehicles: JSON.stringify(compatibleVehicles)
        });

        if (response.status === 'success') {
            Utils.showToast(`${sparepartName} updated successfully!`, 'success');
            closeModal('editPartModal');
            this.reset();
            // Reload spare parts list
            await refreshCatalogModel();
        } else {
            Utils.showToast('Failed to update spare part', 'error');
        }
    } catch (error) {
        console.error('Error updating spare part:', error);
        Utils.showToast('Error updating spare part', 'error');
    } finally {
        showLoading(false);
    }
});

// DELETE - Delete Part
async function deletePart(partId) {
    const deleteMessage = document.getElementById('deleteMessage');
    deleteMessage.textContent = `Are you sure you want to delete part ${partId}? This action cannot be undone.`;

    const confirmBtn = document.getElementById('confirmDeleteBtn');
    confirmBtn.onclick = async function () {
        try {
            showLoading(true);

            // Find the sparepart from sparepart_id
            const partElement = document.querySelector(`#catalogItems [data-id="${partId}"]`);
            if (!partElement) {
                Utils.showToast('Part not found', 'error');
                closeModal('deleteModal');
                return;
            }

            // Delete from database
            const response = await API.delete(`/products/${partId}`);

            if (response.status === 'success') {
                Utils.showToast(`Part ${partId} deleted successfully!`, 'success');
                closeModal('deleteModal');
                // Reload spare parts
                await refreshCatalogModel();
            } else {
                Utils.showToast(`Failed to delete part: ${response.message}`, 'error');
            }
        } catch (error) {
            console.error('Error deleting part:', error);
            Utils.showToast('Error deleting part', 'error');
        } finally {
            showLoading(false);
        }
    };

    openModal('deleteModal');
}

// REORDER FUNCTIONS
function reorderPart(partId) {
    const partData = {
        'OF-205': { name: 'Oil Filter - OF-205', currentStock: '8 units' },
        'HYD-250': { name: 'Hydraulic Pump - HYD-250', currentStock: '0 units' },
        'HYD-HOSE-25': { name: 'Hydraulic Hoses - HYD-HOSE-25', currentStock: '3 units' },
        'EO-15W40': { name: 'Engine Oil - EO-15W40', currentStock: '2 units' }
    };

    const part = partData[partId] || { name: `Part ${partId}`, currentStock: '0 units' };

    document.getElementById('reorderSparepartName').value = part.name;
    document.getElementById('reorderCurrentStock').value = part.currentStock;

    openModal('reorderModal');
}

document.getElementById('reorderForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const sparepartName = document.getElementById('reorderSparepartName').value;
    const quantity = document.getElementById('reorderQuantity').value;
    const priority = document.getElementById('reorderPriority').value;

    Utils.showToast(`Reorder request submitted for ${quantity} units of ${sparepartName} (Priority: ${priority}). Supplier will be contacted.`, 'success');
    closeModal('reorderModal');
    this.reset();
});

// ==================== SPAREPART ADDITION ====================

// Handle add stock form submission
document.getElementById('addStockForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    const sparepartId = document.getElementById('addStockSparepartIdDisplay').value;
    const sparepartName = document.getElementById('addStockSparepartName').value;
    const category = document.getElementById('addStockCategory').value;
    const quantity = document.getElementById('addStockQuantity').value;
    const location = document.getElementById('addStockLocation').value;
    const supplier = document.getElementById('addStockSupplier').value || '';
    const supplierContact = document.getElementById('addStockSupplierContact')?.value || '';
    const supplierAddress = document.getElementById('addStockSupplierAddress')?.value || '';

    // Get warranty details
    const warrantyPeriod = document.getElementById('addStockWarrantyPeriod')?.value || '';
    const warrantyStart = document.getElementById('addStockWarrantyStart')?.value || '';
    const warrantyTerms = document.getElementById('addStockWarrantyTerms')?.value || '';

    // Get compatible machines and vehicles
    const compatibleMachines = Array.from(document.querySelectorAll('input[name="addStockCompatibleMachines"]:checked'))
        .map(cb => cb.value);
    const compatibleVehicles = Array.from(document.querySelectorAll('input[name="addStockCompatibleVehicles"]:checked'))
        .map(cb => cb.value);

    // Check if we're in edit mode
    if (window.editingAdditionId) {
        // Update existing addition record
        await updateAdditionRecord({
            id: window.editingAdditionId,
            sparepart_id: sparepartId,
            sparepart_name: sparepartName,
            category: category,
            quantity_added: parseInt(quantity),
            location: location,
            supplier: supplier,
            supplier_contact: supplierContact,
            supplier_address: supplierAddress,
            warranty_period: warrantyPeriod || null,
            warranty_start: warrantyStart || null,
            warranty_terms: warrantyTerms || null,
            compatible_machines: JSON.stringify(compatibleMachines),
            compatible_vehicles: JSON.stringify(compatibleVehicles)
        });
    } else {
        // Save new spare part to database
        await saveSparePartFromAddStock({
            sparepart_id: sparepartId,
            name: sparepartName,
            category: category,
            quantity: parseInt(quantity),
            location: location,
            supplier: supplier,
            supplier_contact: supplierContact,
            supplier_address: supplierAddress,
            warranty_period: warrantyPeriod || null,
            warranty_start: warrantyStart || null,
            warranty_terms: warrantyTerms || null,
            compatible_machines: JSON.stringify(compatibleMachines),
            compatible_vehicles: JSON.stringify(compatibleVehicles)
        });
    }
});

// Update an existing addition record
async function updateAdditionRecord(data) {
    try {
        showLoading(true);
        console.log('Updating addition record:', data);

        // Get the original addition to compare quantities
        const originalAddition = window.additionsData?.find(a => a.id == data.id);

        // Update the addition record
        const response = await API.put(`/additions/${data.id}`, data);

        if (response.status === 'success') {
            // If quantity changed, update the sparepart quantity
            if (originalAddition && originalAddition.quantity_added !== data.quantity_added) {
                const quantityDifference = data.quantity_added - originalAddition.quantity_added;

                // Get current sparepart to calculate new quantity
                const sparepartResponse = await API.get(`/products/${data.sparepart_id}`);
                if (sparepartResponse.status === 'success' && sparepartResponse.data) {
                    const currentQuantity = parseInt(sparepartResponse.data.quantity) || 0;
                    const newQuantity = currentQuantity + quantityDifference;

                    // Update sparepart quantity
                    await API.put(`/products/${data.sparepart_id}`, {
                        quantity: newQuantity
                    });
                }
            }

            Utils.showToast('Addition record updated successfully!', 'success');
            closeModal('addStockModal');

            // Reset form and modal state
            const form = document.getElementById('addStockForm');
            if (form) form.reset();

            // Reset modal title and button
            const modalTitle = document.querySelector('#addStockModal .modal-header h2');
            const submitBtn = document.querySelector('#addStockModal button[type="submit"]');
            if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Add New Spare Part';
            if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-check"></i> Add to Catalog';

            window.editingAdditionId = null;

            // Reload recent additions and spare parts
            await Promise.all([refreshSparepartAdditionModel(), refreshCatalogModel()]);
        } else {
            console.error('Failed to update addition:', response);
            Utils.showToast(`Failed to update: ${response.message}`, 'error');
        }
    } catch (error) {
        console.error('Error updating addition:', error);
        Utils.showToast('Error updating addition: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function saveSparePartFromAddStock(data) {
    try {
        showLoading(true);
        console.log('Saving spare part from Add Stock:', data);

        // Check if sparepart already exists
        const checkResponse = await API.get('/products');
        let existingPart = null;

        if (checkResponse.status === 'success' && checkResponse.data && checkResponse.data.products) {
            existingPart = checkResponse.data.products.find(p =>
                p.sparepart_id === data.sparepart_id && p.is_active === 1
            );
        }

        let response;
        let isNewPart = false;

        if (existingPart) {
            // Update existing sparepart - add to quantity
            const newQuantity = parseInt(existingPart.quantity) + parseInt(data.quantity);
            response = await API.put(`/products/${data.sparepart_id}`, {
                quantity: newQuantity,
                location: data.location || existingPart.location
            });

            if (response.status === 'success') {
                // Record the addition in sparepart_additions table
                await API.post('/additions', {
                    sparepart_id: data.sparepart_id,
                    sparepart_name: data.name,
                    category: data.category,
                    location: data.location || existingPart.location,
                    quantity_added: data.quantity,
                    previous_stock: parseInt(existingPart.quantity),
                    new_stock: newQuantity,
                    received_date: new Date().toISOString().split('T')[0],
                    supplier: data.supplier || null,
                    supplier_contact: data.supplier_contact || null,
                    supplier_address: data.supplier_address || null,
                    warranty_period: data.warranty_period || null,
                    warranty_start: data.warranty_start || null,
                    warranty_terms: data.warranty_terms || null,
                    compatible_machines: data.compatible_machines || existingPart.compatible_machines,
                    compatible_vehicles: data.compatible_vehicles || existingPart.compatible_vehicles,
                    reference: `Stock Addition - ${data.sparepart_id}`,
                    notes: `Added ${data.quantity} units from ${data.supplier || 'unknown supplier'}`
                });

                Utils.showToast(`Added ${data.quantity} units to ${data.sparepart_id} from ${data.supplier || 'supplier'}. New total: ${newQuantity} units`, 'success');
            }
        } else {
            // Create new sparepart
            response = await API.post('/products', data);
            isNewPart = true;

            if (response.status === 'success') {
                // Record the addition in sparepart_additions table
                await API.post('/additions', {
                    sparepart_id: data.sparepart_id,
                    sparepart_name: data.name,
                    category: data.category,
                    location: data.location,
                    quantity_added: data.quantity,
                    previous_stock: 0,
                    new_stock: data.quantity,
                    received_date: new Date().toISOString().split('T')[0],
                    supplier: data.supplier || null,
                    supplier_contact: data.supplier_contact || null,
                    supplier_address: data.supplier_address || null,
                    warranty_period: data.warranty_period || null,
                    warranty_start: data.warranty_start || null,
                    warranty_terms: data.warranty_terms || null,
                    compatible_machines: data.compatible_machines || null,
                    compatible_vehicles: data.compatible_vehicles || null,
                    reference: 'Initial Stock',
                    notes: `New sparepart added from ${data.supplier || 'catalog'}`
                });

                Utils.showToast(`${data.name} added to catalog successfully!`, 'success');
            }
        }

        if (response.status === 'success') {
            closeModal('addStockModal');
            document.getElementById('addStockForm').reset();

            // Reload spare parts and recent additions
            await Promise.all([
                refreshCatalogModel(),
                refreshSparepartAdditionModel()
            ]);
        } else {
            console.error('Failed to save spare part:', response);
            Utils.showToast(`Failed to save spare part: ${response.message}`, 'error');
        }
    } catch (error) {
        console.error('Error saving spare part:', error);
        Utils.showToast('Error saving spare part: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Update sparepart name dropdown for add stock form
function updateAddStockSparepartNameOptions() {
    const category = document.getElementById('addStockCategory').value;
    const sparepartNameSelect = document.getElementById('addStockSparepartName');

    sparepartNameSelect.innerHTML = '<option value="">Select Sparepart Name</option>';

    if (category && SPARE_PART_NAMES[category]) {
        SPARE_PART_NAMES[category].forEach(sparepartName => {
            const option = document.createElement('option');
            option.value = sparepartName;
            option.textContent = sparepartName;
            sparepartNameSelect.appendChild(option);
        });
    }
}

// Auto-fetch sparepart ID when name is selected
document.getElementById('addStockSparepartName')?.addEventListener('change', async function () {
    const category = document.getElementById('addStockCategory').value;
    const sparepartName = this.value;
    const sparepartIdDisplay = document.getElementById('addStockSparepartIdDisplay');

    if (!category || !sparepartName) {
        return;
    }

    try {
        // Search for existing sparepart with this name and category
        const response = await API.get('/products');
        if (response.status === 'success' && response.data && response.data.products) {
            const existingPart = response.data.products.find(p =>
                p.name === sparepartName &&
                p.category === category &&
                p.is_active === 1
            );

            if (existingPart) {
                // Found existing sparepart - use its ID
                sparepartIdDisplay.value = existingPart.sparepart_id;
                sparepartIdDisplay.style.background = '#dbeafe';
                sparepartIdDisplay.style.color = '#1e40af';
                Utils.showToast(`Found existing sparepart: ${existingPart.sparepart_id}`, 'info');
            } else {
                // No existing sparepart - will create new one
                const nextIdResponse = await API.get('/products/next-id');
                if (nextIdResponse.status === 'success' && nextIdResponse.data && nextIdResponse.data.next_id) {
                    sparepartIdDisplay.value = nextIdResponse.data.next_id;
                    sparepartIdDisplay.style.background = '#dcfce7';
                    sparepartIdDisplay.style.color = '#166534';
                    Utils.showToast(`New sparepart will be created: ${nextIdResponse.data.next_id}`, 'info');
                }
            }
        }
    } catch (error) {
        console.error('Error fetching sparepart:', error);
    }
});

// Update compatibility checkboxes for add stock form
function updateAddStockCompatibilityOptions() {
    const category = document.getElementById('addStockCategory').value;
    const container = document.getElementById('addStockCompatibilityCheckboxes');
    const label = document.getElementById('addStockCompatibilityLabel');

    if (category === 'vehicles') {
        label.textContent = 'Compatible Vehicles';
        const vehicleTypesList = Object.keys(VEHICLE_TYPES);
        container.innerHTML = vehicleTypesList.map(vehicleType => `
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" name="addStockCompatibleVehicles" value="${vehicleType}"> ${vehicleType}
            </label>
        `).join('');
    } else if (category === 'machines') {
        label.textContent = 'Compatible Machines';
        const machineTypesList = Object.keys(MACHINE_TYPES);
        container.innerHTML = machineTypesList.map(machineType => `
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" name="addStockCompatibleMachines" value="${machineType}"> ${machineType}
            </label>
        `).join('');
    } else {
        label.textContent = 'Compatible Machines/Vehicles';
        container.innerHTML = '<p style="color: #999; grid-column: 1 / -1;">Please select a category first</p>';
    }
}

function resolveAdditionRecord(additionRef) {
    if (additionRef && typeof additionRef === 'object') {
        return additionRef;
    }

    const additions = Array.isArray(window.additionsData) ? window.additionsData : [];
    return additions.find(a => a.id == additionRef);
}

// View addition details in modal
function viewAdditionDetails(additionRef) {
    const addition = resolveAdditionRecord(additionRef);
    if (!addition) {
        Utils.showToast('Addition details not found', 'error');
        return;
    }

    const date = new Date(addition.received_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Format warranty information
    let warrantyDisplay = 'N/A';
    if (addition.warranty_period) {
        const warrantyMonths = addition.warranty_period;
        warrantyDisplay = `${warrantyMonths} months`;
        if (addition.warranty_start) {
            const startDate = new Date(addition.warranty_start);
            const endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + parseInt(warrantyMonths));
            warrantyDisplay = `${warrantyMonths} months (Valid until ${endDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})`;
        }
    }

    // Format compatible machines/vehicles
    let compatibleMachines = [];
    let compatibleVehicles = [];
    try {
        if (addition.compatible_machines) {
            compatibleMachines = JSON.parse(addition.compatible_machines);
        }
        if (addition.compatible_vehicles) {
            compatibleVehicles = JSON.parse(addition.compatible_vehicles);
        }
    } catch (e) {
        console.error('Error parsing compatibility data:', e);
    }

    // Format category display
    const categoryDisplay = addition.category === 'vehicles' ? 'Vehicle Parts' : 'Machine Parts';

    // Create modal using the same pattern as viewPartDetails
    const modal = createDetailsModal('Stock Addition Details', `
        <div class="form-section">
            <h5><i class="fas fa-box"></i> Sparepart Information</h5>
            <p><strong>Sparepart ID:</strong> ${addition.sparepart_id}</p>
            <p><strong>Sparepart Name:</strong> ${addition.sparepart_name}</p>
            <p><strong>Category:</strong> ${categoryDisplay}</p>
            <p><strong>Storage Location:</strong> ${addition.location || 'N/A'}</p>
            <p><strong>Received Date:</strong> ${date}</p>
        </div>
        <div class="form-section">
            <h5><i class="fas fa-chart-line"></i> Stock Information</h5>
            <p><strong>Quantity Added:</strong> <span style="color:#10b981; font-weight:700;">+${addition.quantity_added} units</span></p>
            <p><strong>Previous Stock:</strong> ${addition.previous_stock} units</p>
            <p><strong>New Stock:</strong> <span style="color:#6366f1; font-weight:600;">${addition.new_stock} units</span></p>
            <p><strong>Reference:</strong> ${addition.reference || 'N/A'}</p>
        </div>
        <div class="form-section">
            <h5><i class="fas fa-truck"></i> Supplier Information</h5>
            <p><strong>Supplier Name:</strong> ${addition.supplier || 'N/A'}</p>
            <p><strong>Contact:</strong> ${addition.supplier_contact || 'N/A'}</p>
            <p><strong>Address:</strong> ${addition.supplier_address || 'N/A'}</p>
        </div>
        <div class="form-section">
            <h5><i class="fas fa-shield-alt"></i> Warranty Details</h5>
            <p><strong>Warranty Period:</strong> ${warrantyDisplay}</p>
            <p><strong>Warranty Terms:</strong> ${addition.warranty_terms || 'N/A'}</p>
        </div>
        <div class="form-section">
            <h5><i class="fas fa-cog"></i> Compatible Machines</h5>
            <div class="components-list">
                ${compatibleMachines.length > 0
            ? compatibleMachines.map(machine => `<span class="component-badge">${machine}</span>`).join('')
            : '<span class="text-muted">No compatible machines specified</span>'}
            </div>
        </div>
        <div class="form-section">
            <h5><i class="fas fa-truck"></i> Compatible Vehicles</h5>
            <div class="components-list">
                ${compatibleVehicles.length > 0
            ? compatibleVehicles.map(vehicle => `<span class="component-badge">${vehicle}</span>`).join('')
            : '<span class="text-muted">No compatible vehicles specified</span>'}
            </div>
        </div>
        ${addition.notes ? `
        <div class="form-section">
            <h5><i class="fas fa-sticky-note"></i> Notes</h5>
            <p>${addition.notes}</p>
        </div>
        ` : ''}
        <div class="form-section">
            <h5><i class="fas fa-clock"></i> Record Information</h5>
            <p><strong>Added By:</strong> ${addition.added_by || 'admin'}</p>
            <p><strong>Created:</strong> ${new Date(addition.created_at).toLocaleString()}</p>
        </div>
    `);

    document.body.appendChild(modal);
    modal.classList.add('active');
}

// Edit addition - open modal with pre-filled data
async function editAddition(additionRef) {
    const addition = resolveAdditionRecord(additionRef);
    if (!addition) {
        Utils.showToast('Addition details not found', 'error');
        return;
    }

    // Store the addition ID for updating
    window.editingAdditionId = addition.id;

    // Open the add stock modal and populate with existing data
    try {
        // Populate form fields - use safe element access
        const setFieldValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value || '';
        };

        setFieldValue('addStockSparepartIdDisplay', addition.sparepart_id);
        setFieldValue('addStockCategory', addition.category);

        // Update sparepart name options for the category
        await updateAddStockSparepartNameOptions();

        // Set the sparepart name after options are loaded
        setTimeout(() => {
            setFieldValue('addStockSparepartName', addition.sparepart_name);
        }, 100);

        // Other fields
        setFieldValue('addStockQuantity', addition.quantity_added);
        setFieldValue('addStockLocation', addition.location);
        setFieldValue('addStockSupplier', addition.supplier);
        setFieldValue('addStockSupplierContact', addition.supplier_contact);
        setFieldValue('addStockSupplierAddress', addition.supplier_address);
        setFieldValue('addStockWarrantyPeriod', addition.warranty_period);
        setFieldValue('addStockWarrantyStart', addition.warranty_start);
        setFieldValue('addStockWarrantyTerms', addition.warranty_terms);

        // Update compatibility options and set checkboxes
        updateAddStockCompatibilityOptions();

        // Set compatible machines/vehicles checkboxes after a short delay to ensure they're loaded
        setTimeout(() => {
            if (addition.compatible_machines) {
                try {
                    // Handle if it's already an array or a JSON string
                    const machines = typeof addition.compatible_machines === 'string'
                        ? JSON.parse(addition.compatible_machines)
                        : addition.compatible_machines;

                    if (Array.isArray(machines)) {
                        machines.forEach(machineId => {
                            const checkbox = document.querySelector(`#addStockCompatibilityCheckboxes input[value="${machineId}"]`);
                            if (checkbox) checkbox.checked = true;
                        });
                    }
                } catch (e) {
                    console.error('Error parsing machines:', e, addition.compatible_machines);
                }
            }
            if (addition.compatible_vehicles) {
                try {
                    // Handle if it's already an array or a JSON string
                    const vehicles = typeof addition.compatible_vehicles === 'string'
                        ? JSON.parse(addition.compatible_vehicles)
                        : addition.compatible_vehicles;

                    if (Array.isArray(vehicles)) {
                        vehicles.forEach(vehicleId => {
                            const checkbox = document.querySelector(`#addStockCompatibilityCheckboxes input[value="${vehicleId}"]`);
                            if (checkbox) checkbox.checked = true;
                        });
                    }
                } catch (e) {
                    console.error('Error parsing vehicles:', e, addition.compatible_vehicles);
                }
            }
        }, 300);

        // Change modal title and button for edit mode
        const modalTitle = document.querySelector('#addStockModal .modal-header h2');
        const submitBtn = document.querySelector('#addStockModal button[type="submit"]');
        if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Stock Addition';
        if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Addition';

        openModal('addStockModal');
    } catch (error) {
        console.error('Failed to open edit modal:', error);
        Utils.showToast('Failed to load addition for editing', 'error');
    }
}

// Delete addition
async function deleteAddition(additionRef) {
    const addition = resolveAdditionRecord(additionRef);
    if (!addition) {
        Utils.showToast('Addition not found', 'error');
        return;
    }

    const confirmDelete = await Utils.confirm(
        `Are you sure you want to delete this stock addition?`,
        `This will remove the record for ${addition.quantity_added} units of "${addition.sparepart_name}" added on ${new Date(addition.received_date).toLocaleDateString()}.`
    );

    if (!confirmDelete) return;

    try {
        const response = await API.delete(`/additions/${addition.id}`);

        if (response.status === 'success') {
            Utils.showToast('Stock addition deleted successfully', 'success');
            await refreshSparepartAdditionModel();
        } else {
            throw new Error(response.message || 'Failed to delete addition');
        }
    } catch (error) {
        console.error('Error deleting addition:', error);
        Utils.showToast(error.message || 'Failed to delete addition', 'error');
    }
}

// Open add stock modal
async function openAddStockModal() {
    try {
        // Clear any editing state
        window.editingAdditionId = null;

        // Reset modal title and button to add mode
        const modalTitle = document.querySelector('#addStockModal .modal-header h2');
        const submitBtn = document.querySelector('#addStockModal button[type="submit"]');
        if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Add New Spare Part';
        if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-check"></i> Add to Catalog';

        // Reset form fields
        const form = document.getElementById('addStockForm');
        if (form) form.reset();

        // Clear compatibility checkboxes
        const compatibilityContainer = document.getElementById('addStockCompatibilityCheckboxes');
        if (compatibilityContainer) {
            compatibilityContainer.innerHTML = '<p style="color: #999; grid-column: 1 / -1;">Please select a category first</p>';
        }
        const compatibilityLabel = document.getElementById('addStockCompatibilityLabel');
        if (compatibilityLabel) {
            compatibilityLabel.textContent = 'Compatible Machines/Vehicles';
        }

        // Reset category dropdown
        document.getElementById('addStockCategory').value = '';
        document.getElementById('addStockSparepartName').innerHTML = '<option value="">Select category first</option>';

        // Fetch next sparepart ID from backend
        const response = await API.get('/products/next-id');
        if (response.status === 'success' && response.data && response.data.next_id) {
            document.getElementById('addStockSparepartIdDisplay').value = response.data.next_id;
            document.getElementById('addStockSparepartIdDisplay').style.background = '#dcfce7';
        } else {
            throw new Error('Failed to get next sparepart ID');
        }
        openModal('addStockModal');
    } catch (error) {
        console.error('Failed to get next sparepart ID:', error);
        Utils.showToast('Failed to get next sparepart ID', 'error');
        document.getElementById('addStockSparepartIdDisplay').value = 'SPR-###';
        openModal('addStockModal');
    }
}

// Close modal when clicking outside or pressing Escape
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
        document.body.style.overflow = '';
    }
});

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        const activeModals = document.querySelectorAll('.modal.active');
        activeModals.forEach(modal => modal.classList.remove('active'));
        document.body.style.overflow = '';
    }
});