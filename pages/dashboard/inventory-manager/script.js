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

        // Load dashboard data
        await loadDashboardData().catch(err => {
            console.warn('Dashboard data loading failed:', err);
        });

        // Initialize search handlers
        initializeSearchHandlers();

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

async function loadSectionData(sectionId) {
    try {
        // Don't show loading overlay for section switches - it blocks navigation
        // showLoading(true);

        switch (sectionId) {
            case 'dashboard':
                await loadDashboardData();
                break;
            case 'machines':
                await loadMachines();
                break;
            case 'vehicles':
                await loadVehicles();
                break;
            case 'catalog':
                // Load spare parts from database
                await loadSpareParts();
                break;
            case 'sparepart-addition':
                await loadSparepartsForAddition();
                await loadRecentAdditions();
                break;
            case 'orders-approvals':
                await loadSparePartOrders();
                break;
            case 'usage-tracking':
                await loadUsageTracking();
                break;
            case 'notifications':
                // Load notifications if implemented
                break;
        }

        // showLoading(false);
    } catch (error) {
        console.error(`Failed to load ${sectionId} data:`, error);
        Utils.showToast(`Failed to load ${sectionId} data`, 'error');
        // showLoading(false);
    }
}

// ==================== DASHBOARD DATA ====================

async function loadDashboardData() {
    try {
        // Load all data in parallel
        const [machinesResponse, vehiclesResponse, productsResponse] = await Promise.all([
            API.get('/machines'),
            API.get('/vehicles'),
            API.get('/products')
        ]);

        // Get counts
        const machinesCount = machinesResponse.data?.machines?.length || 0;
        const vehiclesCount = vehiclesResponse.data?.vehicles?.length || 0;
        const products = productsResponse.data?.products || [];

        // Calculate stock statistics
        const totalParts = products.length;
        const lowStockParts = products.filter(p => {
            const qty = parseInt(p.quantity) || 0;
            return qty > 0 && qty <= 10;
        }).length;
        const outOfStockParts = products.filter(p => parseInt(p.quantity) === 0).length;

        // Update dashboard cards
        const totalPartsEl = document.getElementById('totalPartsCount');
        const lowStockEl = document.getElementById('lowStockCount');
        const outOfStockEl = document.getElementById('outOfStockCount');
        const totalAssetsEl = document.getElementById('totalAssetsCount');

        if (totalPartsEl) totalPartsEl.textContent = totalParts;
        if (lowStockEl) lowStockEl.textContent = lowStockParts;
        if (outOfStockEl) outOfStockEl.textContent = outOfStockParts;
        if (totalAssetsEl) totalAssetsEl.textContent = machinesCount + vehiclesCount;

        // Update old elements if they exist (for backwards compatibility)
        const totalMachinesEl = document.getElementById('totalMachines');
        const totalVehiclesEl = document.getElementById('totalVehicles');
        if (totalMachinesEl) totalMachinesEl.textContent = machinesCount;
        if (totalVehiclesEl) totalVehiclesEl.textContent = vehiclesCount;

        // Update recent activity
        updateRecentActivity();

    } catch (error) {
        console.error('Failed to load dashboard data:', error);
    }
}

function updateUrgentItems(machinesDue, vehiclesDue) {
    const urgentItems = document.getElementById('urgentItems');
    if (!urgentItems) return;

    let urgentText = '';

    if (machinesDue.length > 0) {
        urgentText += `${machinesDue.length} machine${machinesDue.length > 1 ? 's' : ''} due for service<br>`;
    }

    if (vehiclesDue.length > 0) {
        urgentText += `${vehiclesDue.length} vehicle${vehiclesDue.length > 1 ? 's' : ''} due for service<br>`;
    }

    if (!urgentText) {
        urgentText = 'No urgent items requiring attention';
    }

    urgentItems.innerHTML = urgentText;
}

function updateRecentActivity() {
    const recentActivity = document.getElementById('recentActivity');
    if (!recentActivity) return;

    // This would typically come from an API endpoint
    const activities = [
        'Machine M001 serviced successfully',
        'New vehicle V005 added to fleet',
        'Spare part order approved',
        'Maintenance scheduled for next week'
    ];

    recentActivity.innerHTML = activities.map(activity => `• ${activity}`).join('<br>');
}

// ==================== MACHINES MANAGEMENT ====================

async function loadMachines() {
    try {
        const response = await API.get('/machines');
        machines = response.data?.machines || [];
        displayMachines(machines);
    } catch (error) {
        console.error('Failed to load machines:', error);
        Utils.showToast('Failed to load machines', 'error');
        machines = [];
        displayMachines([]);
    }
}

function displayMachines(machineList) {
    const machinesList = document.getElementById('machinesList');
    if (!machinesList) return;

    if (machineList.length === 0) {
        machinesList.innerHTML = `
            <div class="card">
                <p style="text-align: center; color: var(--muted); padding: 40px;">
                    <i class="fas fa-cogs" style="font-size: 3rem; display: block; margin-bottom: 15px;"></i>
                    No machines found. <a href="#" onclick="openAddMachineModal()" style="color: var(--royal-blue);">Add your first machine</a>
                </p>
            </div>
        `;
        return;
    }

    machinesList.innerHTML = machineList.map(machine => `
        <div class="inventory-item" data-id="${machine.id}" data-status="${machine.status}">
            <div class="item-details">
                <strong><i class="fas fa-cog"></i> ${machine.machine_name}</strong>
                <div class="item-meta">
                    <i class="fas fa-hashtag"></i> ${machine.model_number} | 
                    <i class="fas fa-barcode"></i> ${machine.machine_id}
                </div>
                <div class="item-description">
                    <span class="status-text ${getStatusClass(machine.status)}">${machine.status}</span> | 
                    <i class="fas fa-map-marker-alt"></i> ${machine.location}
                </div>
            </div>
            <div class="item-actions">
                <div class="action-buttons">
                    <button class="btn btn-small btn-primary" onclick="viewMachineDetails(${machine.id})">
                        <i class="fas fa-eye"></i> VIEW
                    </button>
                    <button class="btn btn-small btn-secondary" onclick="editMachine(${machine.id})">
                        <i class="fas fa-edit"></i> EDIT
                    </button>
                    <div class="dropdown-container">
                        <button class="btn btn-small btn-secondary dropdown-trigger" onclick="toggleDropdown(event, 'machine-${machine.id}')">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div class="dropdown-menu" id="dropdown-machine-${machine.id}">
                            ${machine.status === 'For Auction' ? `
                                <button class="dropdown-item" onclick="removeFromAuction(${machine.id}, 'machine')">
                                    <i class="fas fa-undo"></i> Remove from Auction
                                </button>
                            ` : `
                                <button class="dropdown-item" onclick="markForAuction(${machine.id}, 'machine')">
                                    <i class="fas fa-gavel"></i> Mark for Auction
                                </button>
                            `}
                            <button class="dropdown-item danger" onclick="confirmDelete(${machine.id}, 'machine', '${machine.machine_name}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function getStatusClass(status) {
    switch (status) {
        case 'Active': return 'status-in-stock';
        case 'Under Maintenance': return 'status-low-stock';
        case 'Inactive': return 'status-out-of-stock';
        case 'Decommissioned': return 'status-rejected';
        case 'For Auction': return 'status-auction';
        default: return 'status-normal';
    }
}

function filterMachines(status) {
    currentMachineFilter = status;

    // Update filter buttons
    document.querySelectorAll('#machineFilters .filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Apply filter
    const searchValue = document.getElementById('machineSearch').value.toLowerCase();
    applyMachineFilters(searchValue);
}

function applyMachineFilters(searchValue = '') {
    const filteredMachines = machines.filter(machine => {
        const matchesSearch = !searchValue ||
            machine.machine_name.toLowerCase().includes(searchValue) ||
            machine.model_number.toLowerCase().includes(searchValue) ||
            machine.location.toLowerCase().includes(searchValue);

        const matchesStatus = currentMachineFilter === 'all' || machine.status === currentMachineFilter;

        return matchesSearch && matchesStatus;
    });

    displayMachines(filteredMachines);
}

async function refreshMachines() {
    Utils.showToast('Refreshing machines...', 'info');
    await loadMachines();
}

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

async function loadVehicles() {
    try {
        const response = await API.get('/vehicles');
        vehicles = response.data?.vehicles || [];
        displayVehicles(vehicles);
    } catch (error) {
        console.error('Failed to load vehicles:', error);
        Utils.showToast('Failed to load vehicles', 'error');
        vehicles = [];
        displayVehicles([]);
    }
}

function displayVehicles(vehicleList) {
    const vehiclesList = document.getElementById('vehiclesList');
    if (!vehiclesList) return;

    if (vehicleList.length === 0) {
        vehiclesList.innerHTML = `
            <div class="card">
                <p style="text-align: center; color: var(--muted); padding: 40px;">
                    <i class="fas fa-truck" style="font-size: 3rem; display: block; margin-bottom: 15px;"></i>
                    No vehicles found. <a href="#" onclick="openAddVehicleModal()" style="color: var(--royal-blue);">Add your first vehicle</a>
                </p>
            </div>
        `;
        return;
    }

    vehiclesList.innerHTML = vehicleList.map(vehicle => `
        <div class="inventory-item" data-id="${vehicle.id}" data-status="${vehicle.status}">
            <div class="item-details">
                <strong><i class="fas fa-truck"></i> ${vehicle.vehicle_name}</strong>
                <div class="item-meta">
                    <i class="fas fa-id-card"></i> ${vehicle.number_plate} | 
                    <i class="fas fa-car"></i> ${vehicle.vehicle_type}
                </div>
                <div class="item-description">
                    <span class="status-text ${getStatusClass(vehicle.status)}">${vehicle.status}</span> | 
                    <i class="fas fa-tachometer-alt"></i> ${vehicle.current_mileage} km
                </div>
            </div>
            <div class="item-actions">
                <div class="action-buttons">
                    <button class="btn btn-small btn-primary" onclick="viewVehicleDetails(${vehicle.id})">
                        <i class="fas fa-eye"></i> VIEW
                    </button>
                    <button class="btn btn-small btn-secondary" onclick="editVehicle(${vehicle.id})">
                        <i class="fas fa-edit"></i> EDIT
                    </button>
                    <div class="dropdown-container">
                        <button class="btn btn-small btn-secondary dropdown-trigger" onclick="toggleDropdown(event, 'vehicle-${vehicle.id}')">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div class="dropdown-menu" id="dropdown-vehicle-${vehicle.id}">
                            <button class="dropdown-item" onclick="updateVehicleMileage(${vehicle.id}); closeAllDropdowns();">
                                <i class="fas fa-tachometer-alt"></i> Update Mileage
                            </button>
                            ${vehicle.status === 'For Auction' ? `
                                <button class="dropdown-item" onclick="removeFromAuction(${vehicle.id}, 'vehicle')">
                                    <i class="fas fa-undo"></i> Remove from Auction
                                </button>
                            ` : `
                                <button class="dropdown-item" onclick="markForAuction(${vehicle.id}, 'vehicle')">
                                    <i class="fas fa-gavel"></i> Mark for Auction
                                </button>
                            `}
                            <button class="dropdown-item danger" onclick="confirmDelete(${vehicle.id}, 'vehicle', '${vehicle.vehicle_name}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function filterVehicles(status) {
    currentVehicleFilter = status;

    // Update filter buttons
    document.querySelectorAll('#vehicleFilters .filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Apply filter
    const searchValue = document.getElementById('vehicleSearch').value.toLowerCase();
    applyVehicleFilters(searchValue);
}

function applyVehicleFilters(searchValue = '') {
    const filteredVehicles = vehicles.filter(vehicle => {
        const matchesSearch = !searchValue ||
            vehicle.vehicle_name.toLowerCase().includes(searchValue) ||
            vehicle.number_plate.toLowerCase().includes(searchValue) ||
            vehicle.vehicle_type.toLowerCase().includes(searchValue) ||
            vehicle.chassis_number.toLowerCase().includes(searchValue);

        const matchesStatus = currentVehicleFilter === 'all' || vehicle.status === currentVehicleFilter;

        return matchesSearch && matchesStatus;
    });

    displayVehicles(filteredVehicles);
}

async function refreshVehicles() {
    Utils.showToast('Refreshing vehicles...', 'info');
    await loadVehicles();
}

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

let currentStockFilter = 'all';
let currentCategoryFilter = 'all';

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

// Load spare parts from database
async function loadSpareParts() {
    try {
        showLoading(true);
        const response = await API.get('/products');

        if (response.status === 'success' && response.data && response.data.products) {
            const products = response.data.products;
            displaySpareParts(products);
            updateCatalogCount(products.length);
        } else {
            console.error('Failed to load spare parts:', response.message);
            Utils.showToast('Failed to load spare parts', 'error');
        }
    } catch (error) {
        console.error('Error loading spare parts:', error);
        Utils.showToast('Error loading spare parts', 'error');
    } finally {
        showLoading(false);
    }
}

// Display spare parts in the catalog
function displaySpareParts(products) {
    const catalogItems = document.getElementById('catalogItems');
    catalogItems.innerHTML = '';

    if (products.length === 0) {
        catalogItems.innerHTML = '<div class="no-data"><i class="fas fa-box-open"></i><p>No spare parts in catalog</p></div>';
        return;
    }

    products.forEach(product => {
        const quantity = parseInt(product.quantity) || 0;
        const stockStatus = quantity > 10 ? 'in-stock' : (quantity > 0 ? 'low-stock' : 'out-of-stock');
        const stockBadge = quantity > 10 ? 'status-in-stock' : (quantity > 0 ? 'status-low-stock' : 'status-out-of-stock');
        const stockText = quantity > 10 ? 'In Stock' : (quantity > 0 ? 'Low Stock' : 'Out of Stock');

        const newItem = document.createElement('div');
        newItem.className = 'inventory-item';
        newItem.setAttribute('data-status', stockStatus);
        newItem.setAttribute('data-category', product.category || 'unknown');
        newItem.setAttribute('data-id', product.sparepart_id);
        newItem.innerHTML = `
            <div class="item-details">
                <strong><i class="fas fa-box"></i> ${product.name}</strong>
                <div class="item-meta">
                    <i class="fas fa-hashtag"></i> ${product.sparepart_id} | 
                    <i class="fas fa-tag"></i> ${(product.category || 'Unknown').charAt(0).toUpperCase() + (product.category || 'Unknown').slice(1)} Parts
                </div>
                <div class="item-description">
                    <span class="status-text ${stockBadge}">${stockText}</span> | 
                    <i class="fas fa-boxes"></i> ${quantity} units
                </div>
            </div>
            <div class="item-actions">
                <div class="action-buttons">
                    <button class="btn btn-primary btn-small" onclick="viewPartDetails('${product.sparepart_id}')"><i class="fas fa-eye"></i> VIEW</button>
                    <button class="btn btn-secondary btn-small" onclick="editPart('${product.sparepart_id}')"><i class="fas fa-edit"></i> EDIT</button>
                    <div class="dropdown-container">
                        <button class="btn btn-small btn-secondary dropdown-trigger" onclick="toggleDropdown(event, 'part-${product.sparepart_id}')">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div class="dropdown-menu" id="dropdown-part-${product.sparepart_id}">
                            ${quantity <= 10 ? `
                                <button class="dropdown-item" onclick="reorderPart('${product.sparepart_id}'); closeAllDropdowns();">
                                    <i class="fas fa-sync"></i> Reorder
                                </button>
                            ` : ''}
                            <button class="dropdown-item danger" onclick="deletePart('${product.sparepart_id}'); closeAllDropdowns();">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        catalogItems.appendChild(newItem);
    });
}

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
            await loadSpareParts();
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

function addPartToCatalog(partName, productId, category, quantity, location, supplier) {
    const catalogItems = document.getElementById('catalogItems');
    const stockStatus = quantity > 10 ? 'in-stock' : (quantity > 0 ? 'low-stock' : 'out-of-stock');
    const stockBadge = quantity > 10 ? 'status-in-stock' : (quantity > 0 ? 'status-low-stock' : 'status-out-of-stock');
    const stockText = quantity > 10 ? 'In Stock' : (quantity > 0 ? 'Low Stock' : 'Out of Stock');

    const newItem = document.createElement('div');
    newItem.className = 'inventory-item';
    newItem.setAttribute('data-status', stockStatus);
    newItem.setAttribute('data-category', category);
    newItem.setAttribute('data-id', productId);
    newItem.innerHTML = `
        <div class="item-details">
            <strong><i class="fas fa-box"></i> ${partName}</strong>
            <div class="item-meta">
                <i class="fas fa-hashtag"></i> ${productId} | 
                <i class="fas fa-tag"></i> ${category.charAt(0).toUpperCase() + category.slice(1)} Parts
            </div>
            <div class="item-description">
                <span class="status-text ${stockBadge}">${stockText}</span> | 
                <i class="fas fa-boxes"></i> ${quantity} units
            </div>
        </div>
        <div class="item-actions">
            <div class="action-buttons">
                <button class="btn btn-primary btn-small" onclick="viewPartDetails('${productId}')"><i class="fas fa-eye"></i> VIEW</button>
                <button class="btn btn-secondary btn-small" onclick="editPart('${productId}')"><i class="fas fa-edit"></i> EDIT</button>
                <div class="dropdown-container">
                    <button class="btn btn-small btn-secondary dropdown-trigger" onclick="toggleDropdown(event, 'part-${productId}')">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div class="dropdown-menu" id="dropdown-part-${productId}">
                        ${quantity <= 10 ? `
                            <button class="dropdown-item" onclick="reorderPart('${productId}'); closeAllDropdowns();">
                                <i class="fas fa-sync"></i> Reorder
                            </button>
                        ` : ''}
                        <button class="dropdown-item danger" onclick="deletePart('${productId}'); closeAllDropdowns();">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    catalogItems.appendChild(newItem);

    const items = document.querySelectorAll('#catalogItems .inventory-item');
    updateCatalogCount(items.length);
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
            await loadSpareParts();
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
                await loadSpareParts();
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

// FILTER FUNCTIONS
function filterCatalogByStock(status) {
    document.querySelectorAll('#stockFilterTabs .filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    currentStockFilter = status;
    applyCatalogFilters();
}

function filterCatalogByCategory(category) {
    document.querySelectorAll('#categoryFilterTabs .filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    currentCategoryFilter = category;
    applyCatalogFilters();
}

function applyCatalogFilters() {
    const searchValue = document.getElementById('catalogSearch').value.toLowerCase();
    const items = document.querySelectorAll('#catalogItems .inventory-item');
    let visibleCount = 0;

    items.forEach(item => {
        const itemText = item.textContent.toLowerCase();
        const itemStatus = item.getAttribute('data-status');
        const itemCategory = item.getAttribute('data-category');

        const matchesSearch = searchValue === '' || itemText.includes(searchValue);
        const matchesStock = currentStockFilter === 'all' || itemStatus === currentStockFilter;
        const matchesCategory = currentCategoryFilter === 'all' || itemCategory === currentCategoryFilter;

        if (matchesSearch && matchesStock && matchesCategory) {
            item.style.display = 'flex';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });

    updateCatalogCount(visibleCount);
}

function updateCatalogCount(count) {
    const countBadge = document.getElementById('catalogCount');
    if (countBadge) {
        countBadge.textContent = `${count} item${count !== 1 ? 's' : ''}`;
    }
}

// Initialize search handler for catalog
document.getElementById('catalogSearch')?.addEventListener('input', function () {
    applyCatalogFilters();
});

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

// ==================== ORDER MANAGEMENT FUNCTIONS ====================

// Store all loaded spare part requests
let allSparePartRequests = [];
let currentOrderFilter = 'all';

/**
 * Load spare part requests from API
 */
async function loadSparePartOrders() {
    try {
        const response = await API.get('/spare-part-requests');
        if (response.status === 'success') {
            allSparePartRequests = response.data || [];
            updateOrderStats(allSparePartRequests);
            applyOrderFilters();
        } else {
            console.error('Failed to load spare part requests:', response);
            Utils.showToast('Failed to load spare part requests', 'error');
            displayOrders([]);
        }
    } catch (error) {
        console.error('Error loading spare part orders:', error);
        Utils.showToast('Failed to load spare part requests', 'error');
        displayOrders([]);
    }
}

/**
 * Update stats cards
 */
function updateOrderStats(requests) {
    const pending = requests.filter(r => r.status === 'Pending').length;
    const approved = requests.filter(r => r.status === 'Approved').length;
    const rejected = requests.filter(r => r.status === 'Rejected').length;

    const el = id => document.getElementById(id);
    if (el('ordersTotalCount')) el('ordersTotalCount').textContent = requests.length;
    if (el('ordersPendingCount')) el('ordersPendingCount').textContent = pending;
    if (el('ordersApprovedCount')) el('ordersApprovedCount').textContent = approved;
    if (el('ordersRejectedCount')) el('ordersRejectedCount').textContent = rejected;
}

/**
 * Filter by status tab
 */
function filterOrdersByStatus(status) {
    currentOrderFilter = status;

    // Update active button
    document.querySelectorAll('#orderFilterTabs .filter-btn').forEach(btn => {
        btn.classList.remove('active');
        const btnStatus = btn.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
        if (btnStatus === status) btn.classList.add('active');
    });

    applyOrderFilters();
}

/**
 * Filter by search text
 */
function filterSparePartOrders() {
    applyOrderFilters();
}

/**
 * Apply both status filter and search filter, then render
 */
function applyOrderFilters() {
    const searchValue = (document.getElementById('orderSearch')?.value || '').toLowerCase();

    const filtered = allSparePartRequests.filter(order => {
        // Status filter
        const matchesStatus = currentOrderFilter === 'all' || order.status === currentOrderFilter;

        // Search filter
        const matchesSearch = !searchValue ||
            (order.request_id || '').toLowerCase().includes(searchValue) ||
            (order.ticket_id_formatted || '').toLowerCase().includes(searchValue) ||
            (order.fault_ticket_code || '').toLowerCase().includes(searchValue) ||
            (order.equipment_name || '').toLowerCase().includes(searchValue) ||
            (order.location || '').toLowerCase().includes(searchValue) ||
            (order.requested_by_name || '').toLowerCase().includes(searchValue) ||
            (order.additional_notes || '').toLowerCase().includes(searchValue) ||
            (order.items || []).some(i =>
                (i.part_name || '').toLowerCase().includes(searchValue) ||
                (i.part_code || '').toLowerCase().includes(searchValue)
            );

        return matchesStatus && matchesSearch;
    });

    displayOrders(filtered);
}

/**
 * Render orders as vehicle-list style cards
 */
function displayOrders(orderList) {
    const container = document.getElementById('ordersList');
    if (!container) return;

    if (orderList.length === 0) {
        container.innerHTML = `
            <div class="card">
                <p style="text-align: center; color: var(--muted); padding: 40px;">
                    <i class="fas fa-clipboard-check" style="font-size: 3rem; display: block; margin-bottom: 15px;"></i>
                    No spare part requests found.
                </p>
            </div>`;
        return;
    }

    container.innerHTML = orderList.map(order => {
        const statusClass = order.status === 'Approved' ? 'status-approved' :
            order.status === 'Rejected' ? 'status-rejected' :
                order.status === 'Issued' ? 'status-resolved' : 'status-pending';

        const priorityClass = (order.priority || '').toLowerCase() === 'critical' ? 'status-critical' :
            (order.priority || '').toLowerCase() === 'high' ? 'status-low-stock' : 'status-pending';

        const dateStr = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        const ticketType = (order.ticket_id_formatted || '').startsWith('VBD') ? 'Vehicle Breakdown' :
            (order.ticket_id_formatted || '').startsWith('MBD') ? 'Machine Breakdown' :
                (order.ticket_id_formatted || '').startsWith('RBD') ? 'Routine Breakdown' : 'Fault Ticket';

        const partsCount = (order.items || []).reduce((sum, i) => sum + i.quantity, 0);
        const partsLabel = `${(order.items || []).length} part${(order.items || []).length !== 1 ? 's' : ''} (${partsCount} units)`;

        // Build action buttons based on status
        let actionButtons = '';
        if (order.status === 'Pending') {
            actionButtons = `
                <div class="action-buttons">
                    <button class="btn btn-small btn-primary" onclick="event.stopPropagation(); viewOrderDetails(${order.id})">
                        <i class="fas fa-eye"></i> VIEW
                    </button>
                    <button class="btn btn-small" style="background: #10b981; color: white;" onclick="event.stopPropagation(); approveOrder(${order.id})">
                        <i class="fas fa-check"></i> APPROVE
                    </button>
                    <button class="btn btn-small" style="background: #ef4444; color: white;" onclick="event.stopPropagation(); rejectOrder(${order.id})">
                        <i class="fas fa-times"></i> REJECT
                    </button>
                </div>`;
        } else {
            actionButtons = `
                <div class="action-buttons">
                    <button class="btn btn-small btn-primary" onclick="event.stopPropagation(); viewOrderDetails(${order.id})">
                        <i class="fas fa-eye"></i> VIEW
                    </button>
                </div>`;
        }

        return `
        <div class="inventory-item" data-id="${order.id}" data-status="${order.status}" onclick="viewOrderDetails(${order.id})" style="cursor: pointer;">
            <div class="item-details" style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 4px;">
                    <strong style="display: inline; margin-bottom: 0;"><i class="fas fa-file-alt" style="color: var(--tang-blue);"></i> ${order.request_id}</strong>
                    <span class="status-text ${statusClass}">${order.status}</span>
                    <span class="status-text ${priorityClass}">${order.priority}</span>
                </div>
                <div class="item-meta">
                    <i class="fas fa-ticket-alt" style="color: var(--tang-blue);"></i> <strong>${order.ticket_id_formatted || '-'}</strong> — ${ticketType} |
                    <i class="fas fa-cog"></i> ${order.equipment_name || '-'}
                </div>
                <div class="item-description">
                    <i class="fas fa-box" style="color: #6b7280;"></i> ${partsLabel} |
                    <i class="fas fa-user"></i> ${order.requested_by_name || '-'} |
                    <i class="fas fa-calendar"></i> ${dateStr}
                </div>
            </div>
            <div class="item-actions" onclick="event.stopPropagation();">
                ${actionButtons}
            </div>
        </div>`;
    }).join('');
}

/**
 * Approve order - shows modal then calls API
 */
function approveOrder(orderId) {
    console.log('approveOrder called with orderId:', orderId);

    // Close any open details modals first
    document.querySelectorAll('.modal[id^="detailsModal_"]').forEach(m => {
        m.classList.remove('active');
        setTimeout(() => m.remove(), 300);
    });

    const order = allSparePartRequests.find(r => r.id == orderId);
    if (!order) {
        console.error('Order not found in allSparePartRequests for id:', orderId);
        Utils.showToast('Order not found. Please refresh and try again.', 'error');
        return;
    }

    const partsText = (order.items || []).map(i => `${i.part_name} (×${i.quantity})`).join(', ');

    const title = document.getElementById('orderActionTitle');
    const content = document.getElementById('orderActionContent');

    if (!title || !content) {
        console.error('orderActionTitle or orderActionContent element not found');
        Utils.showToast('Modal elements not found. Please refresh the page.', 'error');
        return;
    }

    title.innerHTML = '<i class="fas fa-check-circle" style="color: #10b981;"></i> Approve Spare Parts Request';
    content.innerHTML = `
        <form onsubmit="event.preventDefault(); confirmApproval(${orderId});">
            <div class="form-section">
                <p>Are you sure you want to approve request <strong>${order.request_id}</strong>?</p>
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin: 10px 0;">
                    <p style="margin: 4px 0;"><strong>Ticket:</strong> ${order.ticket_id_formatted || '-'}</p>
                    <p style="margin: 4px 0;"><strong>Equipment:</strong> ${order.equipment_name || '-'}</p>
                    <p style="margin: 4px 0;"><strong>Parts:</strong> ${partsText || '-'}</p>
                    <p style="margin: 4px 0;"><strong>Requested By:</strong> ${order.requested_by_name || '-'}</p>
                </div>
                <div class="form-group">
                    <label class="form-label">Approval Notes (Optional)</label>
                    <textarea class="form-textarea" id="approvalNotes" placeholder="Add any notes for this approval..."></textarea>
                </div>
            </div>
            <div style="display: flex; gap: 10px;">
                <button type="submit" class="btn btn-success"><i class="fas fa-check"></i> Confirm Approval</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal('orderActionModal')"><i class="fas fa-times"></i> Cancel</button>
            </div>
        </form>
    `;

    openModal('orderActionModal');
}

/**
 * Reject order - shows modal then calls API
 */
function rejectOrder(orderId) {
    console.log('rejectOrder called with orderId:', orderId);

    // Close any open details modals first
    document.querySelectorAll('.modal[id^="detailsModal_"]').forEach(m => {
        m.classList.remove('active');
        setTimeout(() => m.remove(), 300);
    });

    const order = allSparePartRequests.find(r => r.id == orderId);
    if (!order) {
        console.error('Order not found in allSparePartRequests for id:', orderId);
        Utils.showToast('Order not found. Please refresh and try again.', 'error');
        return;
    }

    const partsText = (order.items || []).map(i => `${i.part_name} (×${i.quantity})`).join(', ');

    const title = document.getElementById('orderActionTitle');
    const content = document.getElementById('orderActionContent');

    if (!title || !content) {
        console.error('orderActionTitle or orderActionContent element not found');
        Utils.showToast('Modal elements not found. Please refresh the page.', 'error');
        return;
    }

    title.innerHTML = '<i class="fas fa-times-circle" style="color: #ef4444;"></i> Reject Spare Parts Request';
    content.innerHTML = `
        <form onsubmit="event.preventDefault(); confirmRejection(${orderId});">
            <div class="form-section">
                <p>Please provide a reason for rejecting request <strong>${order.request_id}</strong>:</p>
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin: 10px 0;">
                    <p style="margin: 4px 0;"><strong>Ticket:</strong> ${order.ticket_id_formatted || '-'}</p>
                    <p style="margin: 4px 0;"><strong>Equipment:</strong> ${order.equipment_name || '-'}</p>
                    <p style="margin: 4px 0;"><strong>Parts:</strong> ${partsText || '-'}</p>
                </div>
                <div class="form-group">
                    <label class="form-label">Rejection Reason</label>
                    <select class="form-select" id="rejectionReason" required>
                        <option value="">Select Reason</option>
                        <option value="Out of Stock">Item Out of Stock</option>
                        <option value="Insufficient Justification">Insufficient Justification</option>
                        <option value="Budget Constraints">Budget Constraints</option>
                        <option value="Alternative Available">Alternative Part Available</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Additional Comments</label>
                    <textarea class="form-textarea" id="rejectionComments" placeholder="Provide detailed reason for rejection..." required></textarea>
                </div>
            </div>
            <div style="display: flex; gap: 10px;">
                <button type="submit" class="btn btn-danger"><i class="fas fa-times"></i> Confirm Rejection</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal('orderActionModal')">Cancel</button>
            </div>
        </form>
    `;

    openModal('orderActionModal');
}

/**
 * Confirm approval - calls API
 */
async function confirmApproval(orderId) {
    console.log('confirmApproval called with orderId:', orderId, 'currentUser:', currentUser);
    try {
        const notes = document.getElementById('approvalNotes')?.value || '';
        const response = await API.post(`/spare-part-requests/${orderId}/approve`, {
            reviewed_by: currentUser?.id,
            notes: notes
        });

        console.log('Approve API response:', response);

        if (response.status === 'success') {
            Utils.showToast('Spare parts request approved! Fault ticket updated to Parts Approved.', 'success');
            closeModal('orderActionModal');
            await loadSparePartOrders();
        } else {
            Utils.showToast('Failed to approve: ' + (response.message || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error approving order:', error);
        Utils.showToast('Failed to approve request: ' + error.message, 'error');
    }
}

/**
 * Confirm rejection - calls API
 */
async function confirmRejection(orderId) {
    console.log('confirmRejection called with orderId:', orderId, 'currentUser:', currentUser);
    try {
        const reason = document.getElementById('rejectionReason')?.value || '';
        const comments = document.getElementById('rejectionComments')?.value || '';
        const notes = reason + (comments ? ': ' + comments : '');

        if (!reason) {
            Utils.showToast('Please select a rejection reason', 'error');
            return;
        }

        const response = await API.post(`/spare-part-requests/${orderId}/reject`, {
            reviewed_by: currentUser?.id,
            notes: notes
        });

        console.log('Reject API response:', response);

        if (response.status === 'success') {
            Utils.showToast('Spare parts request rejected.', 'info');
            closeModal('orderActionModal');
            await loadSparePartOrders();
        } else {
            Utils.showToast('Failed to reject: ' + (response.message || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error rejecting order:', error);
        Utils.showToast('Failed to reject request: ' + error.message, 'error');
    }
}

/**
 * View order details - full modal with ticket summary + parts table
 */
function viewOrderDetails(orderId) {
    const order = allSparePartRequests.find(r => r.id == orderId);
    if (!order) {
        Utils.showToast('Order not found', 'error');
        return;
    }

    const statusClass = order.status === 'Approved' ? 'status-approved' :
        order.status === 'Rejected' ? 'status-rejected' :
            order.status === 'Issued' ? 'status-resolved' : 'status-pending';
    const priorityClass = (order.priority || '').toLowerCase() === 'critical' ? 'status-critical' :
        (order.priority || '').toLowerCase() === 'high' ? 'status-low-stock' : 'status-pending';
    const dateStr = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const reviewDate = order.reviewed_at ? new Date(order.reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

    const ticketType = (order.ticket_id_formatted || '').startsWith('VBD') ? 'Vehicle Breakdown' :
        (order.ticket_id_formatted || '').startsWith('MBD') ? 'Machine Breakdown' :
            (order.ticket_id_formatted || '').startsWith('RBD') ? 'Routine Breakdown' : 'Fault Ticket';

    const partsHTML = order.items && order.items.length > 0
        ? `<table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
            <thead><tr style="background: #f3f4f6;">
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Part Code</th>
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Part Name</th>
                <th style="padding: 8px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qty</th>
            </tr></thead>
            <tbody>
                ${order.items.map(item => `
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-weight: 600;">${item.part_code || '-'}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">${item.part_name}</td>
                        <td style="padding: 8px; text-align: center; border-bottom: 1px solid #f3f4f6; font-weight: 700;">${item.quantity}</td>
                    </tr>`).join('')}
            </tbody>
           </table>`
        : '<p style="color: #9ca3af;">No parts listed</p>';

    // Build action buttons for pending orders in the details modal
    let modalActions = '';
    if (order.status === 'Pending') {
        modalActions = `
        <div style="display: flex; gap: 10px; margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
            <button class="btn btn-success" onclick="approveOrder(${order.id})">
                <i class="fas fa-check"></i> Approve Request
            </button>
            <button class="btn btn-danger" onclick="rejectOrder(${order.id})">
                <i class="fas fa-times"></i> Reject Request
            </button>
        </div>`;
    }

    const modal = createDetailsModal(`Spare Parts Request — ${order.request_id}`, `
        <div class="form-section">
            <h5><i class="fas fa-info-circle"></i> Request Information</h5>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <p><strong>Request ID:</strong> ${order.request_id}</p>
                <p><strong>Status:</strong> <span class="status-text ${statusClass}">${order.status}</span></p>
                <p><strong>Priority:</strong> <span class="status-text ${priorityClass}">${order.priority}</span></p>
                <p><strong>Requested By:</strong> ${order.requested_by_name || '-'}</p>
                <p><strong>Request Date:</strong> ${dateStr}</p>
                <p><strong>Location:</strong> ${order.location || '-'}</p>
            </div>
        </div>
        <div class="form-section" style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 14px;">
            <h5><i class="fas fa-ticket-alt" style="color: var(--tang-blue);"></i> Linked Ticket Summary</h5>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <p><strong>Ticket ID:</strong> <span style="color: var(--tang-blue); font-weight: 700;">${order.ticket_id_formatted || '-'}</span></p>
                <p><strong>Type:</strong> ${ticketType}</p>
                <p><strong>Equipment:</strong> ${order.equipment_name || '-'}</p>
                <p><strong>Ticket Status:</strong> <span class="status-text ${order.ticket_status?.toLowerCase().includes('approved') ? 'status-approved' : 'status-pending'}">${order.ticket_status || '-'}</span></p>
            </div>
            ${order.ticket_description ? `<p style="margin-top: 8px;"><strong>Description:</strong> ${order.ticket_description}</p>` : ''}
        </div>
        ${order.additional_notes ? `
        <div class="form-section">
            <h5><i class="fas fa-sticky-note"></i> Additional Notes</h5>
            <p>${order.additional_notes}</p>
        </div>` : ''}
        <div class="form-section">
            <h5><i class="fas fa-box"></i> Spare Parts Requested (${(order.items || []).length} items)</h5>
            ${partsHTML}
        </div>
        ${order.status !== 'Pending' ? `
        <div class="form-section">
            <h5><i class="fas fa-user-check"></i> Review Details</h5>
            <p><strong>Reviewed By:</strong> ${order.reviewed_by_name || '-'}</p>
            <p><strong>Review Date:</strong> ${reviewDate}</p>
            ${order.review_notes ? `<p><strong>Notes:</strong> ${order.review_notes}</p>` : ''}
        </div>` : ''}
        ${modalActions}
    `);

    document.body.appendChild(modal);
    modal.classList.add('active');
}

function printOrderDetails(orderId) {
    Utils.showToast(`Printing order ${orderId}...`, 'info');
}

function reconsiderOrder(orderId) {
    Utils.showToast(`Order ${orderId} moved back to pending for reconsideration`, 'info');
}

function viewAllApprovedOrders() {
    filterOrdersByStatus('Approved');
}

function viewAllRejectedOrders() {
    filterOrdersByStatus('Rejected');
}

function approveAllOrders() {
    const pendingRequests = allSparePartRequests.filter(r => r.status === 'Pending');
    if (pendingRequests.length === 0) {
        Utils.showToast('No pending orders to approve', 'info');
        return;
    }

    createConfirmationDialog(
        'Approve All Orders',
        `Are you sure you want to approve all ${pendingRequests.length} pending orders?`,
        async () => {
            try {
                for (const req of pendingRequests) {
                    await API.post(`/spare-part-requests/${req.id}/approve`, {
                        reviewed_by: currentUser?.id,
                        notes: 'Bulk approval'
                    });
                }
                Utils.showToast('All pending orders approved!', 'success');
                await loadSparePartOrders();
            } catch (error) {
                console.error('Error in bulk approval:', error);
                Utils.showToast('Some approvals failed', 'error');
                await loadSparePartOrders();
            }
        },
        'success'
    );
}

// ==================== PLACEHOLDER FUNCTIONS ====================

// ==================== USAGE TRACKING ====================

// Filter usage tracking table by type
function filterUsageByType(filterValue) {
    // Update active button
    document.querySelectorAll('#usageFilters .filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    const rows = document.querySelectorAll('#usageTableBody tr');

    rows.forEach(row => {
        const rowType = row.getAttribute('data-type');

        if (filterValue === 'all') {
            row.style.display = '';
        } else if (rowType === filterValue) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// ==================== USAGE TRACKING - SPAREPART ISSUANCE ====================

// Load all spareparts into the usage tracking table
async function loadUsageTracking() {
    const tbody = document.getElementById('usageTableBody');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:#6b7280;"><i class="fas fa-spinner fa-spin"></i> Loading spareparts...</td></tr>';

    try {
        // Fetch products first
        const productsResponse = await API.get('/products');

        if (productsResponse.status !== 'success' || !productsResponse.data || !productsResponse.data.products) {
            throw new Error(productsResponse.message || 'Failed to load spareparts');
        }

        const products = productsResponse.data.products;

        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:#6b7280;"><i class="fas fa-box-open"></i> No spareparts found</td></tr>';
            return;
        }

        // Fetch usage data (don't fail if this errors)
        const issuedQtyMap = {};
        try {
            const usageResponse = await API.get('/usage');
            if (usageResponse.status === 'success' && usageResponse.data && usageResponse.data.usage) {
                usageResponse.data.usage.forEach(record => {
                    const sparepartId = record.sparepart_id;
                    const qty = parseInt(record.quantity_issued) || 0;
                    issuedQtyMap[sparepartId] = (issuedQtyMap[sparepartId] || 0) + qty;
                });
            }
        } catch (usageError) {
            console.warn('Could not load usage data:', usageError);
            // Continue anyway, issued quantities will just show as 0
        }

        tbody.innerHTML = '';

        products.forEach(part => {
            const qty = parseInt(part.quantity) || 0;
            let stockBadge, stockText;
            if (qty === 0) {
                stockBadge = 'status-out-of-stock';
                stockText = `<span style="color:#dc2626; font-weight:600;">0 units</span>`;
            } else if (qty <= 10) {
                stockBadge = 'status-low-stock';
                stockText = `<span style="color:#f59e0b; font-weight:600;">${qty} units</span>`;
            } else {
                stockBadge = 'status-in-stock';
                stockText = `<span style="color:#10b981; font-weight:600;">${qty} units</span>`;
            }

            // Get issued quantity
            const issuedQty = issuedQtyMap[part.sparepart_id] || 0;
            const issuedText = issuedQty > 0
                ? `<span style="color:#6366f1; font-weight:600;">${issuedQty} units</span>`
                : '<span style="color:#9ca3af;">0 units</span>';

            const lastIssue = part.last_issue_date
                ? new Date(part.last_issue_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                : '<span style="color:#9ca3af;">Not issued yet</span>';

            const category = (part.category || 'Unknown').charAt(0).toUpperCase() + (part.category || 'Unknown').slice(1);

            const row = document.createElement('tr');
            row.setAttribute('data-sparepart-id', part.sparepart_id);
            row.setAttribute('data-name', (part.name || '').toLowerCase());
            row.innerHTML = `
                <td><strong>${part.sparepart_id}</strong></td>
                <td>${part.name}</td>
                <td>${category}</td>
                <td>${stockText}</td>
                <td>${issuedText}</td>
                <td>${lastIssue}</td>
                <td>
                    <button class="btn btn-primary btn-small" onclick="openIssueModal('${part.id}', '${part.sparepart_id}', '${(part.name || '').replace(/'/g, "\\'")}', ${qty})" ${qty === 0 ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
                        <i class="fas fa-share-square"></i> Update
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading usage tracking:', error);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#dc2626;"><i class="fas fa-exclamation-triangle"></i> Failed to load spareparts: ${error.message}</td></tr>`;
    }
}

// Filter usage tracking table by search
function filterUsageTable() {
    const query = (document.getElementById('usageSearch')?.value || '').toLowerCase();
    const rows = document.querySelectorAll('#usageTableBody tr');
    rows.forEach(row => {
        const sid = (row.getAttribute('data-sparepart-id') || '').toLowerCase();
        const name = (row.getAttribute('data-name') || '').toLowerCase();
        row.style.display = (sid.includes(query) || name.includes(query)) ? '' : 'none';
    });
}

// Open the Issue modal for a specific sparepart
function openIssueModal(dbId, sparepartId, sparepartName, availableQty) {
    document.getElementById('issuePartDbId').value = dbId;
    document.getElementById('issuePartId').value = sparepartId;
    document.getElementById('issueSparepartId').value = sparepartId;
    document.getElementById('issueSparepartName').value = sparepartName;
    document.getElementById('issueAvailableQty').value = availableQty + ' units';

    // Auto-set current date
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    document.getElementById('issueDate').value = formattedDate;

    // Reset quantity field
    const qtyInput = document.getElementById('issueQuantity');
    qtyInput.value = '';
    qtyInput.max = availableQty;
    qtyInput.placeholder = `Max: ${availableQty}`;

    openModal('issueModal');
}

// Handle issue form submission
document.getElementById('issueForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    const dbId = document.getElementById('issuePartDbId').value;
    const sparepartId = document.getElementById('issuePartId').value;
    const sparepartName = document.getElementById('issueSparepartName').value;
    const availableQty = parseInt(document.getElementById('issueAvailableQty').value);
    const quantityIssued = parseInt(document.getElementById('issueQuantity').value);

    if (!quantityIssued || quantityIssued < 1) {
        Utils.showToast('Please enter a valid quantity (at least 1)', 'error');
        return;
    }

    if (quantityIssued > availableQty) {
        Utils.showToast(`Cannot issue ${quantityIssued} units. Only ${availableQty} available.`, 'error');
        return;
    }

    try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // Create usage record - this will automatically reduce the catalog quantity
        const usageResponse = await API.post('/usage', {
            sparepart_id: sparepartId,
            sparepart_name: sparepartName,
            quantity_issued: quantityIssued,
            issue_date: today,
            notes: document.getElementById('issueNotes')?.value || `Issued ${quantityIssued} unit(s) from inventory`
        });

        if (usageResponse.status !== 'success') {
            throw new Error(usageResponse.message || 'Failed to issue sparepart');
        }

        closeModal('issueModal');

        const newQuantity = usageResponse.data?.new_quantity ?? (availableQty - quantityIssued);
        Utils.showToast(`Successfully issued ${quantityIssued} unit(s) of ${sparepartName}. Remaining: ${newQuantity}`, 'success');

        // Reload the usage tracking table to reflect changes
        await loadUsageTracking();

    } catch (error) {
        console.error('Error issuing sparepart:', error);
        Utils.showToast('Error issuing sparepart: ' + error.message, 'error');
    }
});

function viewUsageDetails(machineId, sparepartId, issueDate, notes) {
    const title = document.getElementById('detailsTitle');
    const content = document.getElementById('detailsContent');

    title.innerHTML = `<i class="fas fa-chart-line"></i> Sparepart Issuance Details`;
    content.innerHTML = `
        <div class="form-section">
            <h5><i class="fas fa-info-circle"></i> Issuance Information</h5>
            <div style="margin-bottom: 10px;"><strong>Machine/Vehicle ID:</strong> ${machineId}</div>
            <div style="margin-bottom: 10px;"><strong>Sparepart ID:</strong> ${sparepartId}</div>
            <div style="margin-bottom: 10px;"><strong>Issue Date:</strong> ${issueDate}</div>
            ${notes ? `<div style="margin-bottom: 10px;"><strong>Notes:</strong> ${notes}</div>` : ''}
        </div>
    `;

    openModal('detailsModal');
}

function editUsageRecord(machineId) {
    Utils.showToast(`Editing usage record for ${machineId}...`, 'info');
}

function deleteUsageRecord(machineId) {
    const deleteMessage = document.getElementById('deleteMessage');
    deleteMessage.textContent = `Delete usage record for ${machineId}? This will remove this entry from the usage history.`;

    const confirmBtn = document.getElementById('confirmDeleteBtn');
    confirmBtn.onclick = function () {
        const row = document.querySelector(`#usageTableBody tr[data-id="${machineId}"]`);
        if (row) {
            row.remove();
            Utils.showToast(`Usage record for ${machineId} deleted successfully!`);
        }
        closeModal('deleteModal');
    };

    openModal('deleteModal');
}

function generateMachineReport(machineId) {
    document.getElementById('reportMachineId').value = machineId;
    openModal('reportModal');
}

document.getElementById('reportForm')?.addEventListener('submit', function (e) {
    e.preventDefault();

    const machineId = document.getElementById('reportMachineId').value;
    const reportType = document.getElementById('reportType').value;

    Utils.showToast(`${reportType} generated for ${machineId}. Report will be shared with Maintenance Manager.`);
    closeModal('reportModal');
    this.reset();
});

// ==================== NOTIFICATIONS ====================

function dismissNotification(notificationId) {
    const notification = document.querySelector(`[data-id="${notificationId}"]`);
    if (notification) {
        notification.remove();
        Utils.showToast('Notification dismissed');
    }
}

function quickApprove(orderId) {
    confirmApproval(orderId);
}

function quickReject(orderId) {
    if (confirm(`Quickly reject order ${orderId}? Default rejection reason will be used.`)) {
        confirmRejection(orderId);
    }
}

function viewRequest(orderId) {
    viewOrderDetails(orderId);
}

function configureAlerts() {
    Utils.showToast('Opening alert configuration settings...', 'info');
}

function viewAllActivities() {
    Utils.showToast('Loading all activities...', 'info');
}

// ==================== SPAREPART ADDITION ====================

// Load all spareparts into the datalist for autocomplete
async function loadSparepartsForAddition() {
    try {
        const response = await API.get('/products');
        if (response.status === 'success' && response.data && response.data.products) {
            const datalist = document.getElementById('sparepartsList');
            datalist.innerHTML = '';

            response.data.products.forEach(part => {
                const option = document.createElement('option');
                option.value = part.sparepart_id;
                option.textContent = `${part.sparepart_id} - ${part.name}`;
                datalist.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading spareparts for addition:', error);
    }
}

// Handle sparepart selection - auto-fill details
document.getElementById('addStockSparepartId')?.addEventListener('input', async function () {
    const sparepartId = this.value.trim();

    if (sparepartId.length >= 3) {
        try {
            const response = await API.get(`/products/${sparepartId}`);
            if (response.status === 'success' && response.data) {
                const part = response.data;
                document.getElementById('addStockSparepartName').value = part.name || '';
                document.getElementById('addStockCurrentQty').value = `${part.quantity || 0} units`;

                // Pre-fill supplier if available
                if (part.supplier) {
                    document.getElementById('addStockSupplier').value = part.supplier;
                }
            }
        } catch (error) {
            // Clear fields if not found
            document.getElementById('addStockSparepartName').value = '';
            document.getElementById('addStockCurrentQty').value = '';
        }
    }
});

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
            await Promise.all([loadRecentAdditions(), loadSpareParts()]);
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
            await loadSpareParts();
            loadRecentAdditions();
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

// Load recent stock additions
async function loadRecentAdditions() {
    const container = document.getElementById('recentAdditionsItems');
    container.innerHTML = '<div style="text-align:center; padding:40px; color:#6b7280;"><i class="fas fa-spinner fa-spin" style="font-size:2em; margin-bottom:10px;"></i><p>Loading recent additions...</p></div>';

    try {
        const response = await API.get('/additions?per_page=50');

        if (response.status === 'success' && response.data && response.data.additions) {
            const additions = response.data.additions;

            // Update count
            const countEl = document.getElementById('additionsCount');
            if (countEl) countEl.textContent = `${additions.length} items`;

            if (additions.length === 0) {
                container.innerHTML = '<div class="no-data"><i class="fas fa-box-open"></i><p>No stock additions yet</p></div>';
                return;
            }

            container.innerHTML = '';

            additions.forEach(addition => {
                const date = new Date(addition.received_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });

                const categoryLabel = addition.category ?
                    (addition.category.charAt(0).toUpperCase() + addition.category.slice(1) + ' Parts') : 'Unknown';

                const item = document.createElement('div');
                item.className = 'inventory-item';
                item.setAttribute('data-id', addition.id);
                item.setAttribute('data-category', addition.category || 'unknown');
                item.setAttribute('data-name', (addition.sparepart_name || '').toLowerCase());
                item.setAttribute('data-supplier', (addition.supplier || '').toLowerCase());
                item.setAttribute('data-sparepart-id', (addition.sparepart_id || '').toLowerCase());
                item.innerHTML = `
                    <div class="item-details">
                        <strong><i class="fas fa-box"></i> ${addition.sparepart_name}</strong>
                        <div class="item-meta">
                            <i class="fas fa-hashtag"></i> ${addition.sparepart_id} | 
                            <i class="fas fa-tag"></i> ${categoryLabel} |
                            <i class="fas fa-calendar"></i> ${date}
                        </div>
                        <div class="item-description">
                            <span class="status-text" style="background:#dcfce7; color:#166534;"><i class="fas fa-plus-circle"></i> +${addition.quantity_added} units</span> | 
                            <span class="status-text" style="background:#fef3c7; color:#92400e;"><i class="fas fa-truck"></i> ${addition.supplier || 'N/A'}</span> |
                            <i class="fas fa-map-marker-alt"></i> ${addition.location || 'N/A'}
                        </div>
                    </div>
                    <div class="item-actions">
                        <div class="action-buttons">
                            <button class="btn btn-primary btn-small" onclick="viewAdditionDetails(${addition.id})">
                                <i class="fas fa-eye"></i> VIEW
                            </button>
                            <button class="btn btn-secondary btn-small" onclick="editAddition(${addition.id})">
                                <i class="fas fa-edit"></i> EDIT
                            </button>
                            <div class="dropdown-container">
                                <button class="btn btn-small btn-secondary dropdown-trigger" onclick="toggleDropdown(event, 'addition-${addition.id}')">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <div class="dropdown-menu" id="dropdown-addition-${addition.id}">
                                    <button class="dropdown-item danger" onclick="deleteAddition(${addition.id}); closeAllDropdowns();">
                                        <i class="fas fa-trash"></i> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                container.appendChild(item);
            });

            // Store additions data for detail view
            window.additionsData = additions;
        } else {
            throw new Error(response.message || 'Failed to load additions');
        }
    } catch (error) {
        console.error('Error loading recent additions:', error);
        container.innerHTML = '<div style="text-align:center; padding:40px; color:#dc2626;"><i class="fas fa-exclamation-triangle" style="font-size:2em; margin-bottom:10px;"></i><p>Failed to load additions</p></div>';
    }
}

// Filter additions by search text
function filterAdditions() {
    const searchText = (document.getElementById('additionSearch')?.value || '').toLowerCase();
    const items = document.querySelectorAll('#recentAdditionsItems .inventory-item');
    let visibleCount = 0;

    items.forEach(item => {
        const name = item.getAttribute('data-name') || '';
        const supplier = item.getAttribute('data-supplier') || '';
        const sparepartId = item.getAttribute('data-sparepart-id') || '';
        const isVisible = !searchText || name.includes(searchText) || supplier.includes(searchText) || sparepartId.includes(searchText);

        // Also check current category filter
        const activeCatBtn = document.querySelector('#additionCategoryFilter .filter-btn.active');
        const activeCategory = activeCatBtn ? activeCatBtn.textContent.trim().toLowerCase() : 'all categories';
        const itemCategory = item.getAttribute('data-category') || '';
        const categoryMatch = activeCategory === 'all categories' || itemCategory === activeCategory;

        item.style.display = (isVisible && categoryMatch) ? '' : 'none';
        if (isVisible && categoryMatch) visibleCount++;
    });

    const countEl = document.getElementById('additionsCount');
    if (countEl) countEl.textContent = `${visibleCount} items`;
}

// Filter additions by category
function filterAdditionsByCategory(category) {
    // Update active button
    document.querySelectorAll('#additionCategoryFilter .filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    const items = document.querySelectorAll('#recentAdditionsItems .inventory-item');
    const searchText = (document.getElementById('additionSearch')?.value || '').toLowerCase();
    let visibleCount = 0;

    items.forEach(item => {
        const itemCategory = item.getAttribute('data-category') || '';
        const categoryMatch = category === 'all' || itemCategory === category;

        // Also apply search filter
        const name = item.getAttribute('data-name') || '';
        const supplier = item.getAttribute('data-supplier') || '';
        const sparepartId = item.getAttribute('data-sparepart-id') || '';
        const searchMatch = !searchText || name.includes(searchText) || supplier.includes(searchText) || sparepartId.includes(searchText);

        item.style.display = (categoryMatch && searchMatch) ? '' : 'none';
        if (categoryMatch && searchMatch) visibleCount++;
    });

    const countEl = document.getElementById('additionsCount');
    if (countEl) countEl.textContent = `${visibleCount} items`;
}

// View addition details in modal
function viewAdditionDetails(additionId) {
    const addition = window.additionsData?.find(a => a.id == additionId);
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
async function editAddition(additionId) {
    console.log('editAddition called with ID:', additionId);

    const addition = window.additionsData?.find(a => a.id == additionId);
    if (!addition) {
        Utils.showToast('Addition details not found', 'error');
        return;
    }

    console.log('Found addition:', addition);

    // Store the addition ID for updating
    window.editingAdditionId = additionId;

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
        console.log('Modal opened for editing');
    } catch (error) {
        console.error('Failed to open edit modal:', error);
        Utils.showToast('Failed to load addition for editing', 'error');
    }
}

// Delete addition
async function deleteAddition(additionId) {
    const addition = window.additionsData?.find(a => a.id == additionId);
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
        const response = await API.delete(`/additions/${additionId}`);

        if (response.status === 'success') {
            Utils.showToast('Stock addition deleted successfully', 'success');
            await loadRecentAdditions();
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
        const compatibilityContainer = document.getElementById('addStockCompatibility');
        if (compatibilityContainer) compatibilityContainer.innerHTML = '';

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