// ==================== AUTHENTICATION & INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Check authentication and authorization using DashboardInit
        const user = await DashboardInit.init(['Inventory Manager', 'Admin'], {
            updateUserDisplay: true,
            onSuccess: async (user) => {
                // Store current user
                currentUser = user;
                
                // Update specific user info elements for this dashboard
                const userNameElement = document.getElementById('userName');
                const userRoleElement = document.getElementById('userRole');
                const userEmployeeIdElement = document.getElementById('userEmployeeId');
                const userAvatarElement = document.getElementById('userAvatar');
                
                if (userNameElement) {
                    userNameElement.textContent = user.full_name || 'Inventory Manager';
                }
                if (userRoleElement) {
                    userRoleElement.textContent = user.role || 'Inventory Manager';
                }
                if (userEmployeeIdElement && user.employee_id) {
                    userEmployeeIdElement.textContent = `ID: ${user.employee_id}`;
                }
                if (userAvatarElement && user.full_name) {
                    userAvatarElement.textContent = user.full_name.charAt(0).toUpperCase();
                }
                
                // Initialize the application
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

// Navigate to a specific section programmatically
function navigateTo(sectionId) {
    // Remove active class from all nav items and sections
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
    
    // Find and activate the nav item
    const navItem = document.querySelector(`[data-section="${sectionId}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }
    
    // Show the section
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
    }
    
    // Load section data
    loadSectionData(sectionId);
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
                // Initialize catalog count
                const catalogItems = document.querySelectorAll('#catalogItems .inventory-item');
                updateCatalogCount(catalogItems.length);
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
        Utils.showToast(`Failed to load ${sectionId} data`, 'error');
        showLoading(false);
    }
}

// ==================== DASHBOARD DATA ====================

async function loadDashboardData() {
    try {
        // Load machines and vehicles count
        const [machinesResponse, vehiclesResponse] = await Promise.all([
            API.get('/machines'),
            API.get('/vehicles')
        ]);

        // Update dashboard statistics if elements exist
        const totalMachinesEl = document.getElementById('totalMachines');
        const totalVehiclesEl = document.getElementById('totalVehicles');
        
        if (totalMachinesEl) {
            totalMachinesEl.textContent = machinesResponse.data?.machines?.length || 0;
        }
        if (totalVehiclesEl) {
            totalVehiclesEl.textContent = vehiclesResponse.data?.vehicles?.length || 0;
        }
        
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
                <strong><i class="fas fa-cog"></i> ${machine.machine_name} - ${machine.model_number}</strong>
                <div class="item-meta">
                    <i class="fas fa-barcode"></i> SN: ${machine.serial_number} | 
                    <i class="fas fa-map-marker-alt"></i> ${machine.location} | 
                    <i class="fas fa-tools"></i> ${machine.supplier_name}
                </div>
                <div class="item-description">
                    Status: <span class="status-text ${getStatusClass(machine.status)}">${machine.status}</span>
                    ${machine.next_service_date ? `| Next Service: ${Utils.formatDate(machine.next_service_date)}` : ''}
                </div>
                ${machine.components && Array.isArray(machine.components) ? `<div class="item-meta"><i class="fas fa-list"></i> Components: ${machine.components.join(', ')}</div>` : ''}
            </div>
            <div class="item-actions">
                <div class="action-buttons">
                    <button class="btn btn-small btn-secondary" onclick="viewMachineDetails(${machine.id})">
                        <i class="fas fa-eye"></i> VIEW
                    </button>
                    <button class="btn btn-small btn-primary" onclick="editMachine(${machine.id})">
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
                            <label class="form-label">Serial Number *</label>
                            <input type="text" class="form-input" id="serialNumber" 
                                   value="${machine?.serial_number || ''}" 
                                   placeholder="e.g., SN-EXC-001" required
                                   ${isEdit ? 'readonly' : ''}>
                            <small style="color: var(--muted); display: block; margin-top: 4px;">Unique identifier for this machine</small>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Machine Name *</label>
                            <input type="text" class="form-input" id="machineName" 
                                   value="${machine?.machine_name || ''}" required>
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
                            <input type="text" class="form-input" id="location" 
                                   value="${machine?.location || ''}" required>
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
                        <div class="components-grid">
                            ${CONFIG.MACHINE_COMPONENTS.map((component, index) => {
                                const isChecked = machine?.components?.includes(component) ? 'checked' : '';
                                return `
                                    <label class="component-checkbox">
                                        <input type="checkbox" name="machineComponent" value="${component}" ${isChecked}>
                                        <span>${component}</span>
                                    </label>
                                `;
                            }).join('')}
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
    }, 100);

    return modal;
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
        serial_number: document.getElementById('serialNumber').value,
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
            <p><strong>Serial Number:</strong> ${machine.serial_number}</p>
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
                <p>${machine.components.join(', ')}</p>
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
                <strong><i class="fas fa-truck"></i> ${vehicle.vehicle_name} - ${vehicle.number_plate}</strong>
                <div class="item-meta">
                    <i class="fas fa-car"></i> ${vehicle.vehicle_type} | 
                    <i class="fas fa-gas-pump"></i> ${vehicle.fuel_type} |
                    <i class="fas fa-tachometer-alt"></i> ${vehicle.current_mileage} km
                </div>
                <div class="item-description">
                    Status: <span class="status-text ${getStatusClass(vehicle.status)}">${vehicle.status}</span>
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
                        <i class="fas fa-eye"></i> VIEW
                    </button>
                    <button class="btn btn-small btn-primary" onclick="editVehicle(${vehicle.id})">
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
                        <div class="components-grid">
                            ${CONFIG.VEHICLE_COMPONENTS.map((component, index) => {
                                const isChecked = vehicle?.components?.includes(component) ? 'checked' : '';
                                return `
                                    <label class="component-checkbox">
                                        <input type="checkbox" name="vehicleComponent" value="${component}" ${isChecked}>
                                        <span>${component}</span>
                                    </label>
                                `;
                            }).join('')}
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
            <p><strong>Vehicle Name:</strong> ${vehicle.vehicle_name}</p>
            <p><strong>Model Number:</strong> ${vehicle.model_number}</p>
            <p><strong>Number Plate:</strong> ${vehicle.number_plate}</p>
            <p><strong>Chassis Number:</strong> ${vehicle.chassis_number}</p>
            <p><strong>Vehicle Type:</strong> ${vehicle.vehicle_type}</p>
            <p><strong>Fuel Type:</strong> ${vehicle.fuel_type}</p>
            ${vehicle.fuel_efficiency ? `<p><strong>Fuel Efficiency:</strong> ${vehicle.fuel_efficiency} km/L</p>` : ''}
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
    createConfirmationDialog(
        'Confirm Logout',
        'Are you sure you want to logout? Any unsaved changes will be lost.',
        () => {
            Auth.logout();
        },
        'warning'
    );
}

// ==================== DROPDOWN MENU FUNCTIONS ====================

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

// ==================== CONFIRMATION DIALOG FUNCTIONS ====================

function createConfirmationDialog(title, message, onConfirm, type = 'danger') {
    const modal = document.createElement('div');
    modal.className = 'modal confirmation-modal';
    modal.id = 'confirmationModal';
    
    modal.innerHTML = `
        <div class="modal-content confirmation-content">
            <div class="confirmation-header ${type}">
                <i class="fas fa-${type === 'danger' ? 'exclamation-triangle' : 'question-circle'}"></i>
                <h4>${title}</h4>
            </div>
            <div class="confirmation-body">
                <p>${message}</p>
            </div>
            <div class="confirmation-actions">
                <button class="btn btn-secondary" onclick="closeConfirmation()">
                    <i class="fas fa-times"></i> Cancel
                </button>
                <button class="btn btn-${type}" onclick="confirmAction()">
                    <i class="fas fa-check"></i> Confirm
                </button>
            </div>
        </div>
    `;
    
    // Store the confirmation action
    window.pendingConfirmAction = onConfirm;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeConfirmation() {
    const modal = document.getElementById('confirmationModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
    window.pendingConfirmAction = null;
}

async function confirmAction() {
    if (window.pendingConfirmAction) {
        await window.pendingConfirmAction();
        closeConfirmation();
    }
}

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

// Update compatibility checkboxes based on selected category
function updateCompatibilityOptions() {
    const category = document.getElementById('partCategory').value;
    const container = document.getElementById('compatibilityCheckboxes');
    const label = document.getElementById('compatibilityLabel');
    
    if (category === 'vehicles') {
        label.textContent = 'Compatible Vehicles';
        container.innerHTML = `
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" name="compatibility" value="Transport-Vehicle"> Transport Vehicle
            </label>
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" name="compatibility" value="Gas-Distribution-Vehicle"> Gas Distribution Vehicle
            </label>
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" name="compatibility" value="Service-Truck"> Service Truck
            </label>
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" name="compatibility" value="Delivery-Van"> Delivery Van
            </label>
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" name="compatibility" value="Utility-Vehicle"> Utility Vehicle
            </label>
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" name="compatibility" value="Maintenance-Vehicle"> Maintenance Vehicle
            </label>
        `;
    } else if (category === 'machines') {
        label.textContent = 'Compatible Machines';
        container.innerHTML = `
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" name="compatibility" value="Gas-Filling-Machine"> Gas Filling Machine
            </label>
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" name="compatibility" value="Gas-Compressor"> Gas Compressor
            </label>
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" name="compatibility" value="Cylinder-Testing-Machine"> Cylinder Testing Machine
            </label>
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" name="compatibility" value="Gas-Transfer-Pump"> Gas Transfer Pump
            </label>
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" name="compatibility" value="Storage-Tank-System"> Storage Tank System
            </label>
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" name="compatibility" value="Pressure-Regulator"> Pressure Regulator
            </label>
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" name="compatibility" value="Loading-Unloading-System"> Loading/Unloading System
            </label>
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" name="compatibility" value="Gas-Leak-Detector"> Gas Leak Detector
            </label>
        `;
    } else {
        label.textContent = 'Compatible Machines/Vehicles';
        container.innerHTML = '<p style="color: #999; grid-column: 1 / -1;">Please select a category first</p>';
    }
}

// CREATE - Add Part
function openAddPartModal() {
    openModal('addPartModal');
}

document.getElementById('addPartForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const partName = document.getElementById('partName').value;
    const partNumber = document.getElementById('partNumber').value;
    const category = document.getElementById('partCategory').value;
    const quantity = document.getElementById('partQuantity').value;
    const location = document.getElementById('partLocation').value;
    const supplier = document.getElementById('partSupplier').value;
    
    addPartToCatalog(partName, partNumber, category, quantity, location, supplier);
    
    Utils.showToast(`✅ ${partName} added to catalog successfully!`, 'success');
    closeModal('addPartModal');
    this.reset();
});

function addPartToCatalog(partName, partNumber, category, quantity, location, supplier) {
    const catalogItems = document.getElementById('catalogItems');
    const stockStatus = quantity > 10 ? 'in-stock' : (quantity > 0 ? 'low-stock' : 'out-of-stock');
    const stockBadge = quantity > 10 ? 'status-in-stock' : (quantity > 0 ? 'status-low-stock' : 'status-out-of-stock');
    const stockText = quantity > 10 ? 'In Stock' : (quantity > 0 ? 'Low Stock' : 'Out of Stock');
    
    const newItem = document.createElement('div');
    newItem.className = 'inventory-item';
    newItem.setAttribute('data-status', stockStatus);
    newItem.setAttribute('data-category', category);
    newItem.setAttribute('data-id', partNumber);
    newItem.innerHTML = `
        <div class="item-details">
            <strong>${partName} - ${partNumber}</strong>
            <div class="item-meta">Category: ${category.charAt(0).toUpperCase() + category.slice(1)} Parts | Quantity: ${quantity} units</div>
            <div class="item-description">Location: ${location} | Supplier: ${supplier}</div>
            <div class="item-meta">Linked Machines: TBD</div>
        </div>
        <div class="item-actions">
            <span class="status-text ${stockBadge}">${stockText}</span>
            <div class="action-buttons">
                <button class="btn btn-secondary btn-small" onclick="viewPartDetails('${partNumber}')"><i class="fas fa-eye"></i> View</button>
                <button class="btn btn-primary btn-small" onclick="editPart('${partNumber}')"><i class="fas fa-edit"></i> Edit</button>
                ${quantity <= 10 ? `<button class="btn btn-warning btn-small" onclick="reorderPart('${partNumber}')"><i class="fas fa-sync"></i> Reorder</button>` : ''}
                <button class="btn btn-danger btn-small" onclick="deletePart('${partNumber}')"><i class="fas fa-trash"></i> Delete</button>
            </div>
        </div>
    `;
    
    catalogItems.appendChild(newItem);
    
    const items = document.querySelectorAll('#catalogItems .inventory-item');
    updateCatalogCount(items.length);
}

// READ - View Part Details
function viewPartDetails(partId) {
    const title = document.getElementById('detailsTitle');
    const content = document.getElementById('detailsContent');
    
    const partDetails = {
        'BP-001': {
            name: 'Brake Pads - BP-001',
            category: 'Brake System',
            quantity: 45,
            location: 'Warehouse A-15',
            supplier: 'Ravindu Lakshan',
            supplierContact: '+94-77-123-4567',
            supplierAddress: '123 Brake Street, Colombo, Sri Lanka',
            warranty: 'Active until Dec 2025',
            warrantyTerms: 'Full replacement warranty for manufacturing defects',
            lastService: 'Aug 15, 2025',
            linkedMachines: ['Vehicle #101', 'Vehicle #089', 'Vehicle #112'],
            unitCost: 'Rs. 45.50',
            totalValue: 'Rs. 2,047.50'
        },
        'OF-205': {
            name: 'Oil Filter - OF-205',
            category: 'Filtration System',
            quantity: 8,
            location: 'Warehouse B-03',
            supplier: 'FilterMax Ltd.',
            supplierContact: '+94-77-234-5678',
            supplierAddress: '456 Filter Ave, Colombo, Sri Lanka',
            warranty: 'Active until Mar 2026',
            warrantyTerms: '12-month warranty against defects',
            lastService: 'Sep 10, 2025',
            linkedMachines: ['Excavator #205', 'Loader #210', 'Crane #215'],
            unitCost: 'Rs. 125.00',
            totalValue: 'Rs. 1,000.00'
        },
        'HYD-250': {
            name: 'Hydraulic Pump - HYD-250',
            category: 'Hydraulic System',
            quantity: 0,
            location: 'Warehouse C-08',
            supplier: 'Hydraulic Systems Pro',
            supplierContact: '+94-77-345-6789',
            supplierAddress: '789 Hydraulic Road, Colombo, Sri Lanka',
            warranty: 'Active until Jun 2026',
            warrantyTerms: '18-month warranty with free service',
            lastService: 'Jul 20, 2025',
            linkedMachines: ['Excavator #045', 'Bulldozer #067'],
            unitCost: 'Rs. 25,500.00',
            totalValue: 'Rs. 0.00'
        }
    };

    const part = partDetails[partId] || {
        name: `Part ${partId}`,
        category: 'Unknown',
        quantity: 0,
        location: 'N/A',
        supplier: 'N/A',
        supplierContact: 'N/A',
        supplierAddress: 'N/A',
        warranty: 'N/A',
        warrantyTerms: 'N/A',
        lastService: 'N/A',
        linkedMachines: ['N/A'],
        unitCost: 'Rs. 0.00',
        totalValue: 'Rs. 0.00'
    };
    
    title.textContent = part.name + ' Details';
    content.innerHTML = `
        <div class="form-section">
            <h5><i class="fas fa-box"></i> Part Information</h5>
            <div class="form-grid">
                <div><strong>Category:</strong> ${part.category}</div>
                <div><strong>Quantity:</strong> ${part.quantity} units</div>
                <div><strong>Location:</strong> ${part.location}</div>
                <div><strong>Unit Cost:</strong> ${part.unitCost}</div>
                <div><strong>Total Value:</strong> ${part.totalValue}</div>
                <div><strong>Last Service:</strong> ${part.lastService}</div>
            </div>
        </div>
        <div class="form-section">
            <h5><i class="fas fa-truck"></i> Supplier Information</h5>
            <div class="form-grid">
                <div><strong>Supplier:</strong> ${part.supplier}</div>
                <div><strong>Contact:</strong> ${part.supplierContact}</div>
            </div>
            <div><strong>Address:</strong> ${part.supplierAddress}</div>
        </div>
        <div class="form-section">
            <h5><i class="fas fa-shield-alt"></i> Warranty Details</h5>
            <div><strong>Status:</strong> ${part.warranty}</div>
            <div><strong>Terms:</strong> ${part.warrantyTerms}</div>
        </div>
        <div class="form-section">
            <h5><i class="fas fa-link"></i> Linked Machines</h5>
            <div>${part.linkedMachines.join(', ')}</div>
        </div>
    `;
    
    openModal('detailsModal');
}

// UPDATE - Edit Part
function editPart(partId) {
    document.getElementById('editPartId').value = partId;
    
    // Find the part element
    const partElement = document.querySelector(`[data-id="${partId}"]`);
    if (partElement) {
        const partText = partElement.querySelector('strong').textContent;
        const parts = partText.split(' - ');
        document.getElementById('editPartName').value = parts[0];
        document.getElementById('editPartNumber').value = parts[1] || partId;
        
        // Get other details
        const category = partElement.getAttribute('data-category');
        document.getElementById('editPartCategory').value = category;
        
        const metaText = partElement.querySelector('.item-meta').textContent;
        const quantityMatch = metaText.match(/Quantity: (\d+)/);
        if (quantityMatch) {
            document.getElementById('editPartQuantity').value = quantityMatch[1];
        }
        
        const descText = partElement.querySelector('.item-description').textContent;
        const locationMatch = descText.match(/Location: ([^|]+)/);
        if (locationMatch) {
            document.getElementById('editPartLocation').value = locationMatch[1].trim();
        }
    }
    
    openModal('editPartModal');
}

document.getElementById('editPartForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const partId = document.getElementById('editPartId').value;
    const partName = document.getElementById('editPartName').value;
    const partNumber = document.getElementById('editPartNumber').value;
    const quantity = document.getElementById('editPartQuantity').value;
    const category = document.getElementById('editPartCategory').value;
    const location = document.getElementById('editPartLocation').value;
    
    // Find and update the part element
    const partElement = document.querySelector(`[data-id="${partId}"]`);
    if (partElement) {
        const strongElement = partElement.querySelector('strong');
        strongElement.textContent = `${partName} - ${partNumber}`;
        
        // Update category
        partElement.setAttribute('data-category', category);
        
        // Update meta and description
        const metaDiv = partElement.querySelector('.item-meta');
        const currentMeta = metaDiv.textContent;
        metaDiv.textContent = currentMeta.replace(/Category: [^|]+/, `Category: ${category.charAt(0).toUpperCase() + category.slice(1)} Parts`);
        metaDiv.textContent = metaDiv.textContent.replace(/Quantity: \d+/, `Quantity: ${quantity}`);
        
        const descDiv = partElement.querySelector('.item-description');
        const currentDesc = descDiv.textContent;
        descDiv.textContent = currentDesc.replace(/Location: [^|]+/, `Location: ${location}`);
        
        // Update stock status
        const stockStatus = quantity > 10 ? 'in-stock' : (quantity > 0 ? 'low-stock' : 'out-of-stock');
        const stockBadge = quantity > 10 ? 'status-in-stock' : (quantity > 0 ? 'status-low-stock' : 'status-out-of-stock');
        const stockText = quantity > 10 ? 'In Stock' : (quantity > 0 ? 'Low Stock' : 'Out of Stock');
        
        partElement.setAttribute('data-status', stockStatus);
        const badge = partElement.querySelector('.status-text');
        badge.className = `status-text ${stockBadge}`;
        badge.textContent = stockText;
    }
    
    Utils.showToast(`✅ ${partName} updated successfully!`, 'success');
    closeModal('editPartModal');
    this.reset();
});

// DELETE - Delete Part
function deletePart(partId) {
    const deleteMessage = document.getElementById('deleteMessage');
    deleteMessage.textContent = `Are you sure you want to delete part ${partId}? This action cannot be undone.`;
    
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    confirmBtn.onclick = function() {
        const partElement = document.querySelector(`#catalogItems [data-id="${partId}"]`);
        if (partElement) {
            partElement.remove();
            Utils.showToast(`🗑️ Part ${partId} deleted successfully!`, 'success');
            
            const items = document.querySelectorAll('#catalogItems .inventory-item');
            updateCatalogCount(items.length);
        }
        closeModal('deleteModal');
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
document.getElementById('catalogSearch')?.addEventListener('input', function() {
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
    
    document.getElementById('reorderPartName').value = part.name;
    document.getElementById('reorderCurrentStock').value = part.currentStock;
    
    openModal('reorderModal');
}

document.getElementById('reorderForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const partName = document.getElementById('reorderPartName').value;
    const quantity = document.getElementById('reorderQuantity').value;
    const priority = document.getElementById('reorderPriority').value;
    
    Utils.showToast(`📤 Reorder request submitted for ${quantity} units of ${partName} (Priority: ${priority}). Supplier will be contacted.`, 'success');
    closeModal('reorderModal');
    this.reset();
});

// ==================== ORDER MANAGEMENT FUNCTIONS ====================

function filterOrdersByStatus(status) {
    // Update active button
    const filterButtons = document.querySelectorAll('#orders-approvals .filter-btn');
    filterButtons.forEach(btn => {
        btn.classList.remove('active');
        // Check if this button's onclick matches the status
        const btnStatus = btn.getAttribute('onclick').match(/'([^']+)'/)[1];
        if (btnStatus === status) {
            btn.classList.add('active');
        }
    });
    
    // Filter order sections
    const orderSections = document.querySelectorAll('.order-section');
    
    orderSections.forEach(section => {
        const sectionStatus = section.getAttribute('data-status');
        
        if (status === 'all' || sectionStatus === status) {
            section.style.display = 'block';
        } else {
            section.style.display = 'none';
        }
    });
}

function approveOrder(orderId) {
    const title = document.getElementById('orderActionTitle');
    const content = document.getElementById('orderActionContent');
    
    title.textContent = 'Approve Order';
    content.innerHTML = `
        <div class="form-section">
            <h5><i class="fas fa-check-circle"></i> Approve Order: ${orderId}</h5>
            <p>Are you sure you want to approve this order?</p>
            <div style="margin: 20px 0;">
                <div class="form-group">
                    <label class="form-label">Approval Notes (Optional)</label>
                    <textarea class="form-textarea" id="approvalNotes" placeholder="Add any notes for this approval..."></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Expected Delivery Date</label>
                    <input type="date" class="form-input" id="deliveryDate" required>
                </div>
            </div>
            <div style="display: flex; gap: 10px;">
                <button class="btn btn-success" onclick="confirmApproval('${orderId}')"><i class="fas fa-check"></i> Confirm Approval</button>
                <button class="btn btn-secondary" onclick="closeModal('orderActionModal')"><i class="fas fa-times"></i> Cancel</button>
            </div>
        </div>
    `;
    
    openModal('orderActionModal');
}

function rejectOrder(orderId) {
    const title = document.getElementById('orderActionTitle');
    const content = document.getElementById('orderActionContent');
    
    title.textContent = 'Reject Order';
    content.innerHTML = `
        <div class="form-section">
            <h5><i class="fas fa-times-circle"></i> Reject Order: ${orderId}</h5>
            <p>Please provide a reason for rejecting this order:</p>
            <div style="margin: 20px 0;">
                <div class="form-group">
                    <label class="form-label">Rejection Reason</label>
                    <select class="form-select" id="rejectionReason" required>
                        <option value="">Select Reason</option>
                        <option value="out-of-stock">Item Out of Stock</option>
                        <option value="insufficient-justification">Insufficient Justification</option>
                        <option value="budget-constraints">Budget Constraints</option>
                        <option value="alternative-available">Alternative Part Available</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Additional Comments</label>
                    <textarea class="form-textarea" id="rejectionComments" placeholder="Provide detailed reason for rejection..." required></textarea>
                </div>
            </div>
            <div style="display: flex; gap: 10px;">
                <button class="btn btn-danger" onclick="confirmRejection('${orderId}')"><i class="fas fa-times"></i> Confirm Rejection</button>
                <button class="btn btn-secondary" onclick="closeModal('orderActionModal')">Cancel</button>
            </div>
        </div>
    `;
    
    openModal('orderActionModal');
}

function confirmApproval(orderId) {
    moveOrderToApproved(orderId);
    Utils.showToast(`✅ Order ${orderId} approved successfully! Technical Officer and Supervisor notified.`, 'success');
    closeModal('orderActionModal');
}

function confirmRejection(orderId) {
    moveOrderToRejected(orderId);
    Utils.showToast(`❌ Order ${orderId} rejected. Requestor has been notified.`, 'info');
    closeModal('orderActionModal');
}

function moveOrderToApproved(orderId) {
    // Find the pending order row
    const row = document.querySelector(`#pendingOrders tr[data-id="${orderId}"]`);
    if (!row) return;
    
    // Extract order details
    const partDetails = row.cells[1].querySelector('strong').textContent;
    const qtyInfo = row.cells[1].querySelector('small').textContent;
    const requestor = row.cells[2].textContent;
    const supervisor = row.cells[3].textContent;
    
    // Remove from pending
    row.remove();
    
    // Add to approved section
    const approvedOrders = document.getElementById('approvedOrders');
    const newItem = document.createElement('div');
    newItem.className = 'inventory-item';
    newItem.setAttribute('data-id', orderId);
    newItem.innerHTML = `
        <div class="item-details">
            <strong>${orderId}</strong>
            <div class="item-meta">${partDetails} - ${qtyInfo} | ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            <div class="item-description">From: ${requestor} via ${supervisor}</div>
            <div class="item-meta">Approved by: ${currentUser?.full_name || 'Inventory Manager'} | Dispatched: Pending</div>
        </div>
        <div class="item-actions">
            <span class="status-text status-approved">Approved</span>
            <div class="action-buttons">
                <button class="btn btn-secondary btn-small" onclick="viewOrderDetails('${orderId}')"><i class="fas fa-eye"></i> View</button>
                <button class="btn btn-warning btn-small" onclick="printOrderDetails('${orderId}')"><i class="fas fa-print"></i> Print</button>
            </div>
        </div>
    `;
    approvedOrders.appendChild(newItem);
    
    // Update pending count
    updatePendingCount();
}

function moveOrderToRejected(orderId) {
    // Find the pending order row
    const row = document.querySelector(`#pendingOrders tr[data-id="${orderId}"]`);
    if (!row) return;
    
    // Extract order details
    const partDetails = row.cells[1].querySelector('strong').textContent;
    const qtyInfo = row.cells[1].querySelector('small').textContent;
    const requestor = row.cells[2].textContent;
    const supervisor = row.cells[3].textContent;
    const reason = document.getElementById('rejectionReason')?.value || 'Not specified';
    
    // Remove from pending
    row.remove();
    
    // Add to rejected section
    const rejectedOrders = document.getElementById('rejectedOrders');
    const newItem = document.createElement('div');
    newItem.className = 'inventory-item';
    newItem.setAttribute('data-id', orderId);
    newItem.innerHTML = `
        <div class="item-details">
            <strong>${orderId}</strong>
            <div class="item-meta">${partDetails} - ${qtyInfo} | ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            <div class="item-description">From: ${requestor} via ${supervisor}</div>
            <div class="item-meta">Rejected by: ${currentUser?.full_name || 'Inventory Manager'} | Reason: ${reason}</div>
        </div>
        <div class="item-actions">
            <span class="status-text status-rejected">Rejected</span>
            <div class="action-buttons">
                <button class="btn btn-secondary btn-small" onclick="viewOrderDetails('${orderId}')"><i class="fas fa-eye"></i> View</button>
                <button class="btn btn-success btn-small" onclick="reconsiderOrder('${orderId}')"><i class="fas fa-redo"></i> Reconsider</button>
            </div>
        </div>
    `;
    rejectedOrders.appendChild(newItem);
    
    // Update pending count
    updatePendingCount();
}

function updatePendingCount() {
    const pendingRows = document.querySelectorAll('#pendingOrders tbody tr');
    const count = pendingRows.length;
    const badge = document.getElementById('pendingCount');
    if (badge) {
        badge.textContent = `${count} pending`;
    }
}

function viewOrderDetails(orderId) {
    const title = document.getElementById('detailsTitle');
    const content = document.getElementById('detailsContent');
    
    title.textContent = `Order Details - ${orderId}`;
    content.innerHTML = `
        <div class="form-section">
            <h5><i class="fas fa-info-circle"></i> Order Information</h5>
            <div class="form-grid">
                <div><strong>Order ID:</strong> ${orderId}</div>
                <div><strong>Status:</strong> <span class="status-text status-approved">Approved</span></div>
                <div><strong>Requested Date:</strong> Aug 15, 2025</div>
                <div><strong>Approved Date:</strong> Aug 16, 2025</div>
            </div>
        </div>
        <div class="form-section">
            <h5><i class="fas fa-box"></i> Items Requested</h5>
            <p>Brake pads (BP-001) - Quantity: 4 units</p>
            <p>For Ticket: TKT-001</p>
        </div>
        <div class="form-section">
            <h5><i class="fas fa-user"></i> Approval Chain</h5>
            <div><strong>Requestor:</strong> Technical Officer</div>
            <div><strong>Supervisor:</strong> Senash Adeesha</div>
            <div><strong>Approved By:</strong> Inventory Manager</div>
        </div>
    `;
    
    openModal('detailsModal');
}

function viewTicketDetails(ticketId) {
    const title = document.getElementById('detailsTitle');
    const content = document.getElementById('detailsContent');
    
    title.innerHTML = `<i class="fas fa-ticket-alt"></i> Ticket Details - ${ticketId}`;
    content.innerHTML = `
        <div class="form-section">
            <h5><i class="fas fa-info-circle"></i> Ticket Information</h5>
            <div style="margin-bottom: 10px;"><strong>Ticket ID:</strong> ${ticketId}</div>
            <div style="margin-bottom: 10px;"><strong>Status:</strong> <span class="status-text status-pending">Open</span></div>
            <div style="margin-bottom: 10px;"><strong>Priority:</strong> <span class="status-text status-low-stock">High</span></div>
            <div style="margin-bottom: 10px;"><strong>Created By:</strong> Technical Officer</div>
            <div style="margin-bottom: 10px;"><strong>Created Date:</strong> ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
        </div>
        <div class="form-section">
            <h5><i class="fas fa-tools"></i> Issue Description</h5>
            <p style="margin-bottom: 10px;">Machine breakdown requiring immediate attention. Spare parts needed for repair work.</p>
        </div>
        <div class="form-section">
            <h5><i class="fas fa-box"></i> Requested Parts</h5>
            <p style="margin-bottom: 10px;">Parts required for this maintenance ticket are listed in the order request.</p>
        </div>
    `;
    
    openModal('detailsModal');
}

function printOrderDetails(orderId) {
    Utils.showToast(`Printing order ${orderId}...`, 'info');
}

function reconsiderOrder(orderId) {
    Utils.showToast(`Order ${orderId} moved back to pending for reconsideration`, 'info');
}

function viewAllApprovedOrders() {
    Utils.showToast('Viewing all approved orders...', 'info');
}

function viewAllRejectedOrders() {
    Utils.showToast('Viewing all rejected orders...', 'info');
}

function approveAllOrders() {
    const pendingRows = document.querySelectorAll('#pendingOrders tbody tr');
    if (pendingRows.length === 0) {
        Utils.showToast('No pending orders to approve', 'info');
        return;
    }
    
    createConfirmationDialog(
        'Approve All Orders',
        `Are you sure you want to approve all ${pendingRows.length} pending orders?`,
        () => {
            pendingRows.forEach(row => {
                const orderId = row.getAttribute('data-id');
                moveOrderToApproved(orderId);
            });
            Utils.showToast('✅ All pending orders approved!', 'success');
        },
        'success'
    );
}

// ==================== PLACEHOLDER FUNCTIONS ====================

// ==================== USAGE TRACKING ====================

function addMachineUsage() {
    // Populate dropdown with inventory items (machines and vehicles)
    const select = document.getElementById('usageItemSelect');
    select.innerHTML = '<option value="">-- Select a machine or vehicle --</option>';
    
    // Add machines to dropdown
    machines.forEach(machine => {
        const option = document.createElement('option');
        option.value = machine.id;
        option.textContent = `${machine.machine_name} - ${machine.model_number}`;
        option.setAttribute('data-type', 'machine');
        select.appendChild(option);
    });
    
    // Add vehicles to dropdown
    vehicles.forEach(vehicle => {
        const option = document.createElement('option');
        option.value = vehicle.id;
        option.textContent = `${vehicle.vehicle_name} - ${vehicle.registration_number}`;
        option.setAttribute('data-type', 'vehicle');
        select.appendChild(option);
    });
    
    // Clear form fields
    document.getElementById('usageRepairDate').value = '';
    document.getElementById('usagePartsUsed').value = '';
    document.getElementById('usageCost').value = '';
    document.getElementById('usageFrequency').value = '';
    
    openModal('addUsageModal');
}

// Handle add usage form submission
document.getElementById('addUsageForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const selectedItemId = document.getElementById('usageItemSelect').value;
    const selectedOption = document.getElementById('usageItemSelect').selectedOptions[0];
    const repairDate = document.getElementById('usageRepairDate').value;
    const partsUsed = document.getElementById('usagePartsUsed').value;
    const cost = document.getElementById('usageCost').value;
    const frequency = document.getElementById('usageFrequency').value;
    
    if (!selectedItemId) {
        Utils.showToast('Please select a machine or vehicle', 'error');
        return;
    }
    
    // Get item name from dropdown
    const itemName = selectedOption.textContent;
    
    // Format the date
    const dateObj = new Date(repairDate);
    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    // Determine status badge color based on frequency
    let statusClass = 'status-pending';
    if (frequency === 'High') {
        statusClass = 'status-low-stock';
    } else if (frequency === 'Low') {
        statusClass = 'status-normal';
    }
    
    // Create new usage row
    const newRow = document.createElement('tr');
    newRow.setAttribute('data-id', selectedItemId);
    newRow.innerHTML = `
        <td>${itemName.split(' - ')[0]}</td>
        <td>${formattedDate}</td>
        <td>${partsUsed}</td>
        <td>Rs. ${parseFloat(cost).toFixed(2)}</td>
        <td><span class="status-text ${statusClass}">${frequency}</span></td>
        <td>
            <button class="btn btn-secondary btn-small" onclick="viewUsageDetails('${selectedItemId}')"><i class="fas fa-eye"></i> View</button>
            <button class="btn btn-primary btn-small" onclick="editUsageRecord('${selectedItemId}')"><i class="fas fa-edit"></i> Edit</button>
            <button class="btn btn-success btn-small" onclick="generateMachineReport('${selectedItemId}')"><i class="fas fa-chart-bar"></i> Report</button>
            <button class="btn btn-danger btn-small" onclick="deleteUsageRecord('${selectedItemId}')"><i class="fas fa-trash"></i> Delete</button>
        </td>
    `;
    
    // Add to usage table
    document.getElementById('usageTableBody').appendChild(newRow);
    
    closeModal('addUsageModal');
    Utils.showToast('Usage entry added successfully!');
    this.reset();
});

function viewUsageDetails(machineId) {
    const title = document.getElementById('detailsTitle');
    const content = document.getElementById('detailsContent');
    
    title.innerHTML = `<i class="fas fa-chart-line"></i> Usage Details - ${machineId}`;
    content.innerHTML = `
        <div class="form-section">
            <h5><i class="fas fa-info-circle"></i> Machine Usage Information</h5>
            <div style="margin-bottom: 10px;"><strong>Machine ID:</strong> ${machineId}</div>
            <div style="margin-bottom: 10px;"><strong>Last Repair:</strong> ${new Date().toLocaleDateString()}</div>
            <div style="margin-bottom: 10px;"><strong>Total Repairs:</strong> 12</div>
            <div style="margin-bottom: 10px;"><strong>Total Cost:</strong> Rs. 8,500</div>
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
    confirmBtn.onclick = function() {
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

document.getElementById('reportForm')?.addEventListener('submit', function(e) {
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