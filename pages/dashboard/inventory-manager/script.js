// ==================== AUTHENTICATION & INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Check authentication first
        const user = await Auth.checkAuth();
        
        if (!user) {
            // Not authenticated, redirect to login
            window.location.href = '/auth/login.html';
            return;
        }
        
        // Check if user has Inventory Manager role
        if (user.role !== 'Inventory Manager' && user.role !== 'Admin') {
            Utils.showToast('Access denied. Insufficient privileges.', 'error');
            setTimeout(() => {
                // Redirect to their appropriate dashboard
                Auth.redirectToDashboard(user);
            }, 2000);
            return;
        }
        
        // Store current user
        currentUser = user;
        
        // Initialize the application
        await initializeApp();
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

async function initializeApp() {
    try {
        showLoading(true);
        
        // Load current user info
        await loadCurrentUser();
        
        // Initialize navigation
        initializeNavigation();
        
        // Load dashboard data
        await loadDashboardData();
        
        // Initialize search handlers
        initializeSearchHandlers();
        
        // Load initial data for active section
        const activeSection = document.querySelector('.content-section.active').id;
        await loadSectionData(activeSection);
        
        showLoading(false);
    } catch (error) {
        console.error('Failed to initialize app:', error);
        Utils.toast('Failed to load application. Please refresh the page.', 'error');
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
    }
}

// ==================== NAVIGATION ====================

function initializeNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', async function() {
            // Remove active class from all nav items and sections
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
            
            // Add active class to clicked nav item
            this.classList.add('active');
            
            // Show corresponding section
            const sectionId = this.getAttribute('data-section');
            document.getElementById(sectionId).classList.add('active');
            
            // Load section data
            await loadSectionData(sectionId);
        });
    });
}

async function loadSectionData(sectionId) {
    try {
        showLoading(true);
        
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
                // Load spare parts catalog if implemented
                break;
            case 'orders-approvals':
                // Load orders if implemented
                break;
            case 'usage-tracking':
                // Load usage tracking if implemented
                break;
            case 'notifications':
                // Load notifications if implemented
                break;
        }
        
        showLoading(false);
    } catch (error) {
        console.error(`Failed to load ${sectionId} data:`, error);
        Utils.toast(`Failed to load ${sectionId} data`, 'error');
        showLoading(false);
    }
}

// ==================== DASHBOARD DATA ====================

async function loadDashboardData() {
    try {
        // Load machines and vehicles count
        const [machinesResponse, vehiclesResponse, machinesDueResponse, vehiclesDueResponse] = await Promise.all([
            API.get('/machines'),
            API.get('/vehicles'), 
            API.get('/machines/due-service'),
            API.get('/vehicles/due-service')
        ]);

        // Update dashboard statistics
        document.getElementById('totalMachines').textContent = machinesResponse.data?.machines?.length || 0;
        document.getElementById('totalVehicles').textContent = vehiclesResponse.data?.vehicles?.length || 0;
        document.getElementById('machinesDueService').textContent = machinesDueResponse.data?.machines?.length || 0;
        document.getElementById('vehiclesDueService').textContent = vehiclesDueResponse.data?.vehicles?.length || 0;

        // Update urgent items
        updateUrgentItems(machinesDueResponse.data?.machines || [], vehiclesDueResponse.data?.vehicles || []);
        
        // Update recent activity
        updateRecentActivity();
        
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
        // Set default values
        ['totalMachines', 'totalVehicles', 'machinesDueService', 'vehiclesDueService'].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = '-';
        });
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
        Utils.toast('Failed to load machines', 'error');
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
                <strong><i class="fas fa-cog"></i> ${machine.machine_name} - ${machine.model_number}</strong>
                <div class="item-meta">
                    <i class="fas fa-map-marker-alt"></i> Location: ${machine.location} | 
                    <i class="fas fa-tools"></i> Supplier: ${machine.supplier_name}
                </div>
                <div class="item-description">
                    Status: <span class="status-badge ${getStatusClass(machine.status)}">${machine.status}</span>
                    ${machine.next_service_date ? `| Next Service: ${Utils.formatDate(machine.next_service_date)}` : ''}
                </div>
                ${machine.components ? `<div class="item-meta"><i class="fas fa-list"></i> Components: ${JSON.parse(machine.components).join(', ')}</div>` : ''}
            </div>
            <div class="item-actions">
                <div class="action-buttons">
                    <button class="btn btn-small btn-secondary" onclick="viewMachineDetails(${machine.id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-small btn-primary" onclick="editMachine(${machine.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-small btn-danger" onclick="deleteMachine(${machine.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
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
    Utils.toast('Refreshing machines...', 'info');
    await loadMachines();
}

// ==================== MACHINE CRUD OPERATIONS ====================

function openAddMachineModal() {
    const modal = createMachineModal();
    document.body.appendChild(modal);
    modal.classList.add('active');
}

function createMachineModal(machine = null) {
    const isEdit = !!machine;
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = isEdit ? 'editMachineModal' : 'addMachineModal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <button class="close" onclick="closeModal('${modal.id}')">&times;</button>
            <h2 style="margin-bottom: 20px; color: var(--tang-blue);">
                <i class="fas fa-cog"></i> ${isEdit ? 'Edit' : 'Add New'} Machine
            </h2>
            <form id="${isEdit ? 'editMachineForm' : 'addMachineForm'}">
                ${isEdit ? `<input type="hidden" id="machineId" value="${machine.id}">` : ''}
                
                <div class="form-section">
                    <h5><i class="fas fa-info-circle"></i> Basic Information</h5>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Machine Name *</label>
                            <input type="text" class="form-input" id="machineName" 
                                   value="${machine?.machine_name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Model Number *</label>
                            <input type="text" class="form-input" id="modelNumber" 
                                   value="${machine?.model_number || ''}" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Location *</label>
                            <input type="text" class="form-input" id="location" 
                                   value="${machine?.location || ''}" required>
                        </div>
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
                                   value="${machine?.last_service_date || ''}">
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
                    <h5><i class="fas fa-list"></i> Components</h5>
                    <div class="checkbox-group">
                        ${CONFIG.MACHINE_COMPONENTS.map(component => `
                            <div class="checkbox-item">
                                <input type="checkbox" id="comp_${component}" value="${component}"
                                       ${machine?.components && JSON.parse(machine.components).includes(component) ? 'checked' : ''}>
                                <label for="comp_${component}">${component}</label>
                            </div>
                        `).join('')}
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
    }, 100);

    return modal;
}

async function handleAddMachine(e) {
    e.preventDefault();
    
    try {
        const formData = getMachineFormData();
        const response = await API.post('/machines', formData);
        
        if (response.status === 'success') {
            Utils.toast('Machine added successfully!', 'success');
            closeModal('addMachineModal');
            await loadMachines();
        }
    } catch (error) {
        console.error('Failed to add machine:', error);
        Utils.toast(error.message || 'Failed to add machine', 'error');
    }
}

async function handleEditMachine(e) {
    e.preventDefault();
    
    try {
        const machineId = document.getElementById('machineId').value;
        const formData = getMachineFormData();
        const response = await API.put(`/machines/${machineId}`, formData);
        
        if (response.status === 'success') {
            Utils.toast('Machine updated successfully!', 'success');
            closeModal('editMachineModal');
            await loadMachines();
        }
    } catch (error) {
        console.error('Failed to update machine:', error);
        Utils.toast(error.message || 'Failed to update machine', 'error');
    }
}

function getMachineFormData() {
    const selectedComponents = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
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
        Utils.toast('Machine not found', 'error');
        return;
    }
    
    const modal = createMachineModal(machine);
    document.body.appendChild(modal);
    modal.classList.add('active');
}

async function deleteMachine(id) {
    const machine = machines.find(m => m.id === id);
    if (!machine) {
        Utils.toast('Machine not found', 'error');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete machine "${machine.machine_name}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await API.delete(`/machines/${id}`);
        
        if (response.status === 'success') {
            Utils.toast('Machine deleted successfully!', 'success');
            await loadMachines();
        }
    } catch (error) {
        console.error('Failed to delete machine:', error);
        Utils.toast(error.message || 'Failed to delete machine', 'error');
    }
}

function viewMachineDetails(id) {
    const machine = machines.find(m => m.id === id);
    if (!machine) {
        Utils.toast('Machine not found', 'error');
        return;
    }
    
    const modal = createDetailsModal('Machine Details', `
        <div class="form-section">
            <h5><i class="fas fa-info-circle"></i> Basic Information</h5>
            <p><strong>Machine Name:</strong> ${machine.machine_name}</p>
            <p><strong>Model Number:</strong> ${machine.model_number}</p>
            <p><strong>Location:</strong> ${machine.location}</p>
            <p><strong>Status:</strong> <span class="status-badge ${getStatusClass(machine.status)}">${machine.status}</span></p>
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
        ${machine.components ? `
            <div class="form-section">
                <h5><i class="fas fa-list"></i> Components</h5>
                <p>${JSON.parse(machine.components).join(', ')}</p>
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
        Utils.toast('Failed to load vehicles', 'error');
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
                <strong><i class="fas fa-truck"></i> ${vehicle.vehicle_name} - ${vehicle.number_plate}</strong>
                <div class="item-meta">
                    <i class="fas fa-car"></i> ${vehicle.vehicle_type} | 
                    <i class="fas fa-gas-pump"></i> ${vehicle.fuel_type} |
                    <i class="fas fa-tachometer-alt"></i> ${vehicle.current_mileage} km
                </div>
                <div class="item-description">
                    Status: <span class="status-badge ${getStatusClass(vehicle.status)}">${vehicle.status}</span>
                    ${vehicle.next_service_date ? `| Next Service: ${Utils.formatDate(vehicle.next_service_date)}` : ''}
                    ${vehicle.next_service_mileage ? ` (at ${vehicle.next_service_mileage} km)` : ''}
                </div>
                <div class="item-meta">
                    <i class="fas fa-industry"></i> ${vehicle.supplier_name} | 
                    <i class="fas fa-barcode"></i> Chassis: ${vehicle.chassis_number}
                </div>
            </div>
            <div class="item-actions">
                <div class="action-buttons">
                    <button class="btn btn-small btn-secondary" onclick="viewVehicleDetails(${vehicle.id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-small btn-warning" onclick="updateVehicleMileage(${vehicle.id})">
                        <i class="fas fa-tachometer-alt"></i> Update Mileage
                    </button>
                    <button class="btn btn-small btn-primary" onclick="editVehicle(${vehicle.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-small btn-danger" onclick="deleteVehicle(${vehicle.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
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
    Utils.toast('Refreshing vehicles...', 'info');
    await loadVehicles();
}

// ==================== VEHICLE CRUD OPERATIONS ====================

function openAddVehicleModal() {
    const modal = createVehicleModal();
    document.body.appendChild(modal);
    modal.classList.add('active');
}

function createVehicleModal(vehicle = null) {
    const isEdit = !!vehicle;
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = isEdit ? 'editVehicleModal' : 'addVehicleModal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <button class="close" onclick="closeModal('${modal.id}')">&times;</button>
            <h2 style="margin-bottom: 20px; color: var(--tang-blue);">
                <i class="fas fa-truck"></i> ${isEdit ? 'Edit' : 'Add New'} Vehicle
            </h2>
            <form id="${isEdit ? 'editVehicleForm' : 'addVehicleForm'}">
                ${isEdit ? `<input type="hidden" id="vehicleId" value="${vehicle.id}">` : ''}
                
                <div class="form-section">
                    <h5><i class="fas fa-info-circle"></i> Basic Information</h5>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Vehicle Name *</label>
                            <input type="text" class="form-input" id="vehicleName" 
                                   value="${vehicle?.vehicle_name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Model Number *</label>
                            <input type="text" class="form-input" id="vehicleModel" 
                                   value="${vehicle?.model_number || ''}" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Number Plate *</label>
                            <input type="text" class="form-input" id="numberPlate" 
                                   value="${vehicle?.number_plate || ''}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Chassis Number *</label>
                            <input type="text" class="form-input" id="chassisNumber" 
                                   value="${vehicle?.chassis_number || ''}" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Vehicle Type *</label>
                            <select class="form-select" id="vehicleType" required>
                                ${CONFIG.VEHICLE_TYPES.map(type => 
                                    `<option value="${type}" ${vehicle?.vehicle_type === type ? 'selected' : ''}>${type}</option>`
                                ).join('')}
                            </select>
                        </div>
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
                            <label class="form-label">Fuel Efficiency (km/L)</label>
                            <input type="number" step="0.1" class="form-input" id="fuelEfficiency" 
                                   value="${vehicle?.fuel_efficiency || ''}">
                        </div>
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
                                   value="${vehicle?.last_service_date || ''}">
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
        const response = await API.post('/vehicles', formData);
        
        if (response.status === 'success') {
            Utils.toast('Vehicle added successfully!', 'success');
            closeModal('addVehicleModal');
            await loadVehicles();
        }
    } catch (error) {
        console.error('Failed to add vehicle:', error);
        Utils.toast(error.message || 'Failed to add vehicle', 'error');
    }
}

async function handleEditVehicle(e) {
    e.preventDefault();
    
    try {
        const vehicleId = document.getElementById('vehicleId').value;
        const formData = getVehicleFormData();
        const response = await API.put(`/vehicles/${vehicleId}`, formData);
        
        if (response.status === 'success') {
            Utils.toast('Vehicle updated successfully!', 'success');
            closeModal('editVehicleModal');
            await loadVehicles();
        }
    } catch (error) {
        console.error('Failed to update vehicle:', error);
        Utils.toast(error.message || 'Failed to update vehicle', 'error');
    }
}

function getVehicleFormData() {
    const serviceType = document.getElementById('serviceIntervalType').value;
    
    const formData = {
        vehicle_name: document.getElementById('vehicleName').value,
        model_number: document.getElementById('vehicleModel').value,
        number_plate: document.getElementById('numberPlate').value,
        chassis_number: document.getElementById('chassisNumber').value,
        vehicle_type: document.getElementById('vehicleType').value,
        fuel_type: document.getElementById('fuelType').value,
        fuel_efficiency: document.getElementById('fuelEfficiency').value ? parseFloat(document.getElementById('fuelEfficiency').value) : null,
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
    
    return formData;
}

async function editVehicle(id) {
    const vehicle = vehicles.find(v => v.id === id);
    if (!vehicle) {
        Utils.toast('Vehicle not found', 'error');
        return;
    }
    
    const modal = createVehicleModal(vehicle);
    document.body.appendChild(modal);
    modal.classList.add('active');
}

async function deleteVehicle(id) {
    const vehicle = vehicles.find(v => v.id === id);
    if (!vehicle) {
        Utils.toast('Vehicle not found', 'error');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete vehicle "${vehicle.vehicle_name}" (${vehicle.number_plate})? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await API.delete(`/vehicles/${id}`);
        
        if (response.status === 'success') {
            Utils.toast('Vehicle deleted successfully!', 'success');
            await loadVehicles();
        }
    } catch (error) {
        console.error('Failed to delete vehicle:', error);
        Utils.toast(error.message || 'Failed to delete vehicle', 'error');
    }
}

function viewVehicleDetails(id) {
    const vehicle = vehicles.find(v => v.id === id);
    if (!vehicle) {
        Utils.toast('Vehicle not found', 'error');
        return;
    }
    
    const modal = createDetailsModal('Vehicle Details', `
        <div class="form-section">
            <h5><i class="fas fa-info-circle"></i> Basic Information</h5>
            <p><strong>Vehicle Name:</strong> ${vehicle.vehicle_name}</p>
            <p><strong>Model Number:</strong> ${vehicle.model_number}</p>
            <p><strong>Number Plate:</strong> ${vehicle.number_plate}</p>
            <p><strong>Chassis Number:</strong> ${vehicle.chassis_number}</p>
            <p><strong>Vehicle Type:</strong> ${vehicle.vehicle_type}</p>
            <p><strong>Fuel Type:</strong> ${vehicle.fuel_type}</p>
            ${vehicle.fuel_efficiency ? `<p><strong>Fuel Efficiency:</strong> ${vehicle.fuel_efficiency} km/L</p>` : ''}
            <p><strong>Current Mileage:</strong> ${vehicle.current_mileage} km</p>
            <p><strong>Status:</strong> <span class="status-badge ${getStatusClass(vehicle.status)}">${vehicle.status}</span></p>
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
        Utils.toast('Vehicle not found', 'error');
        return;
    }
    
    const newMileage = prompt(`Update mileage for ${vehicle.vehicle_name} (${vehicle.number_plate})\nCurrent mileage: ${vehicle.current_mileage} km\n\nEnter new mileage:`, vehicle.current_mileage);
    
    if (newMileage === null || newMileage === '') return;
    
    const mileage = parseInt(newMileage);
    if (isNaN(mileage) || mileage < vehicle.current_mileage) {
        Utils.toast('Invalid mileage. New mileage must be greater than current mileage.', 'error');
        return;
    }
    
    updateMileageAPI(id, mileage);
}

async function updateMileageAPI(id, mileage) {
    try {
        const response = await API.put(`/vehicles/${id}/mileage`, { mileage });
        
        if (response.status === 'success') {
            Utils.toast('Mileage updated successfully!', 'success');
            await loadVehicles();
        }
    } catch (error) {
        console.error('Failed to update mileage:', error);
        Utils.toast(error.message || 'Failed to update mileage', 'error');
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
            <button class="close" onclick="closeModal('${modal.id}')">&times;</button>
            <h2 style="margin-bottom: 20px; color: var(--tang-blue);">${title}</h2>
            <div>${content}</div>
            <button class="btn btn-secondary" onclick="closeModal('${modal.id}')">Close</button>
        </div>
    `;
    
    return modal;
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        // Remove dynamically created modals
        if (modalId.startsWith('detailsModal_') || modalId.includes('Machine') || modalId.includes('Vehicle')) {
            setTimeout(() => modal.remove(), 300);
        }
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        Auth.logout();
    }
}

// ==================== PLACEHOLDER FUNCTIONS ====================

function openAddPartModal() {
    Utils.toast('Spare parts management coming soon!', 'info');
}

function bulkImportParts() {
    Utils.toast('Bulk import feature coming soon!', 'info');
}

function exportCatalog() {
    Utils.toast('Export feature coming soon!', 'info');
}

function filterCatalogByStock(status) {
    Utils.toast('Catalog filtering coming soon!', 'info');
}

function approveAllOrders() {
    Utils.toast('Order management coming soon!', 'info');
}

function viewAllApprovedOrders() {
    Utils.toast('Order management coming soon!', 'info');
}

function addMachineUsage() {
    Utils.toast('Usage tracking coming soon!', 'info');
}

function configureAlerts() {
    Utils.toast('Alert configuration coming soon!', 'info');
}

// Close modal when clicking outside or pressing Escape
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const activeModals = document.querySelectorAll('.modal.active');
        activeModals.forEach(modal => modal.classList.remove('active'));
    }
});