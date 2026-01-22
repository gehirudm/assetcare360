// ==================== INITIALIZATION & AUTH ====================

// Check authorization on page load
(async function initializeDashboard() {
    // Require supervisor role
    const authorized = await Auth.requireRole('Supervisor');
    
    if (!authorized) {
        return; // Auth.requireRole will handle redirection
    }
    
    // Load user data
    const user = await Auth.checkAuth();
    if (user) {
        // Update user name
        const fullName = user.full_name || user.name || 'Supervisor';
        document.getElementById('userName').textContent = fullName;
        
        // Update user avatar with first letter of name
        const avatar = document.getElementById('userAvatar');
        avatar.textContent = fullName.charAt(0).toUpperCase();
        
        // Update employee ID
        const employeeIdElement = document.getElementById('userEmployeeId');
        if (employeeIdElement && user.employee_id) {
            employeeIdElement.textContent = `ID: ${user.employee_id}`;
        }
        
        // Update role
        const roleElement = document.getElementById('userRole');
        if (roleElement && user.role) {
            roleElement.textContent = user.role;
        }
    }
    
    // Load initial data
    loadDashboardData();
    
    // Set up photo upload handler
    const photoInput = document.getElementById('ticketPhotos');
    if (photoInput) {
        photoInput.addEventListener('change', handleCreateTicketPhotoUpload);
    }
})();

// ==================== NAVIGATION ====================

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
        
        this.classList.add('active');
        
        const sectionId = this.getAttribute('data-section');
        document.getElementById(sectionId).classList.add('active');
        
        // Load section-specific data
        loadSectionData(sectionId);
    });
});

function navigateTo(sectionId) {
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
    
    const navItem = document.querySelector(`[data-section="${sectionId}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }
    
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
    }
    
    loadSectionData(sectionId);
}

// ==================== DATA LOADING ====================

function loadDashboardData() {
    // Load summary data for dashboard
    loadSectionData('dashboard');
}

function loadSectionData(sectionId) {
    switch(sectionId) {
        case 'dashboard':
            // Dashboard already shows static summary
            break;
        case 'daily-check-reports':
            loadDailyCheckReports();
            break;
        case 'fault-tickets':
            loadFaultTickets();
            break;
        case 'repair-management':
            loadRepairs();
            break;
        case 'budget-approval':
            loadBudgets();
            break;
        case 'asset-status':
            loadAssetStatus();
            break;
        case 'technician-assignments':
            loadTechnicians();
            break;
    }
}

// ==================== DAILY CHECK REPORTS ====================

let currentReportStatusFilter = 'all';
let currentReportSourceFilter = 'all';

async function loadDailyCheckReports() {
    const tbody = document.getElementById('reportsTableBody');
    tbody.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Loading reports...</p>';
    
    // TODO: Replace with actual API call
    // const reports = await API.get('/daily-check-reports');
    
    // Sample data
    const reports = [
        { id: 'DCR-001', asset: 'TRK-101', assetName: 'Toyota Hiace', submittedBy: 'John Doe', type: 'driver', date: '2025-10-21', status: 'Pending', description: 'Daily pre-trip inspection completed' },
        { id: 'DCR-002', asset: 'EXC-045', assetName: 'CAT Excavator 320D', submittedBy: 'Jane Smith', type: 'operator', date: '2025-10-21', status: 'Pending', description: 'Daily operational check completed' },
        { id: 'DCR-003', asset: 'TRK-105', assetName: 'Isuzu NPR', submittedBy: 'Mike Johnson', type: 'driver', date: '2025-10-20', status: 'Approved', description: 'All systems operational' },
        { id: 'DCR-004', asset: 'BAC-012', assetName: 'JCB Backhoe', submittedBy: 'Sarah Lee', type: 'operator', date: '2025-10-20', status: 'Approved', description: 'Routine maintenance check passed' }
    ];
    
    tbody.innerHTML = reports.map(report => `
        <div class="inventory-item" data-id="${report.id}" data-type="${report.type}" data-status="${report.status.toLowerCase()}">
            <div class="item-details">
                <strong><i class="fas fa-clipboard-check"></i> ${report.id} - ${report.assetName}</strong>
                <div class="item-meta">
                    <i class="fas fa-user"></i> ${report.submittedBy} | 
                    <i class="fas fa-tag"></i> ${report.type.charAt(0).toUpperCase() + report.type.slice(1)}
                </div>
                <div class="item-meta">
                    <span class="status-text status-${report.status.toLowerCase()}">${report.status.toUpperCase()}</span> | 
                    <i class="fas fa-calendar"></i> ${report.date}
                </div>
            </div>
            <div class="item-actions">
                <div class="action-buttons">
                    <button class="btn btn-primary btn-small" onclick="viewReport('${report.id}')">
                        <i class="fas fa-eye"></i> VIEW
                    </button>
                    ${report.status === 'Pending' ? `
                        <div class="dropdown-container">
                            <button class="btn btn-small btn-secondary dropdown-trigger" onclick="toggleDropdown(event, 'report-${report.id}')">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div class="dropdown-menu" id="dropdown-report-${report.id}">
                                <button class="dropdown-item" onclick="approveReport('${report.id}'); closeAllDropdowns();">
                                    <i class="fas fa-check"></i> Approve
                                </button>
                                <button class="dropdown-item danger" onclick="rejectReport('${report.id}'); closeAllDropdowns();">
                                    <i class="fas fa-times"></i> Reject
                                </button>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

function filterReportsByStatus(status) {
    document.querySelectorAll('#reportStatusFilters .filter-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    currentReportStatusFilter = status;
    applyReportFilters();
}

function filterReportsBySource(source) {
    document.querySelectorAll('#reportSourceFilters .filter-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    currentReportSourceFilter = source;
    applyReportFilters();
}

function applyReportFilters() {
    const items = document.querySelectorAll('#reportsTableBody .inventory-item');
    let visibleCount = 0;
    
    items.forEach(item => {
        const itemStatus = item.getAttribute('data-status');
        const itemType = item.getAttribute('data-type');
        
        const matchesStatus = currentReportStatusFilter === 'all' || itemStatus === currentReportStatusFilter.toLowerCase();
        const matchesSource = currentReportSourceFilter === 'all' || itemType === currentReportSourceFilter;
        
        if (matchesStatus && matchesSource) {
            item.style.display = '';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    showToast(`Showing ${visibleCount} reports`);
}

function viewReport(reportId) {
    // Sample data - replace with actual API call
    const reportData = {
        'DCR-001': { id: 'DCR-001', asset: 'TRK-101', assetName: 'Toyota Hiace', submittedBy: 'John Doe', type: 'driver', date: '2025-10-21', time: '08:30 AM', status: 'Pending', description: 'Daily pre-trip inspection completed', odometer: '45,230 km', fuelLevel: '75%', issues: 'None reported', notes: 'All systems operational' },
        'DCR-002': { id: 'DCR-002', asset: 'EXC-045', assetName: 'CAT Excavator 320D', submittedBy: 'Jane Smith', type: 'operator', date: '2025-10-21', time: '07:00 AM', status: 'Pending', description: 'Daily operational check completed', hours: '1,250 hrs', fuelLevel: '60%', issues: 'Minor hydraulic leak noted', notes: 'Scheduled for inspection' }
    };
    
    const report = reportData[reportId] || reportData['DCR-001'];
    
    const content = `
        <div class="form-section">
            <h5><i class="fas fa-info-circle"></i> Basic Information</h5>
            <p><strong>Report ID:</strong> <span style="color: var(--royal-blue);">${report.id}</span></p>
            <p><strong>Date & Time:</strong> ${report.date} at ${report.time}</p>
            <p><strong>Status:</strong> <span class="status-text status-${report.status.toLowerCase()}">${report.status}</span></p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-user"></i> Personnel & Asset</h5>
            <p><strong>Asset:</strong> ${report.asset} - ${report.assetName}</p>
            <p><strong>Type:</strong> <i class="fas fa-${report.type === 'driver' ? 'car' : 'cogs'}"></i> ${report.type.charAt(0).toUpperCase() + report.type.slice(1)}</p>
            <p><strong>Submitted By:</strong> <i class="fas fa-user"></i> ${report.submittedBy}</p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-clipboard-check"></i> Check Details</h5>
            <p><strong>Description:</strong></p>
            <p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px;">${report.description}</p>
            <p><strong>${report.type === 'driver' ? 'Odometer' : 'Engine Hours'}:</strong> ${report.type === 'driver' ? report.odometer : report.hours}</p>
            <p><strong>Fuel Level:</strong> ${report.fuelLevel}</p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-exclamation-triangle"></i> Issues Reported</h5>
            <p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px; ${report.issues !== 'None reported' ? 'border: 1px solid #dc3545; background-color: #f8d7da;' : ''}">${report.issues}</p>
        </div>

        ${report.notes ? `
            <div class="form-section">
                <h5><i class="fas fa-sticky-note"></i> Additional Notes</h5>
                <p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px;">${report.notes}</p>
            </div>
        ` : ''}
    `;
    
    createDetailsModal('Daily Check Report Details', content);
}

function approveReport(reportId) {
    createConfirmationDialog(
        'Approve Report',
        `Are you sure you want to approve report ${reportId}?`,
        async () => {
            // TODO: API call to approve
            showToast(`Report ${reportId} approved!`, 'success');
            loadDailyCheckReports();
        },
        'primary'
    );
}

function rejectReport(reportId) {
    createConfirmationDialog(
        'Reject Report',
        `Are you sure you want to reject report ${reportId}? The submitter will be notified.`,
        async () => {
            // TODO: API call to reject
            showToast(`Report ${reportId} rejected`, 'warning');
            loadDailyCheckReports();
        },
        'danger'
    );
}

// ==================== FAULT TICKETS ====================

let currentTicketStatusFilter = 'all';
let currentTicketSourceFilter = 'all';
let allTickets = []; // Store all tickets for filtering

async function loadFaultTickets() {
    try {
        // Load unassigned tickets
        const unassignedList = document.getElementById('unassignedTicketsList');
        unassignedList.innerHTML = '<p style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> Loading...</p>';
        
        // Load active tickets
        const activeList = document.getElementById('activeTicketsList');
        if (activeList) {
            activeList.innerHTML = '<p style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> Loading tickets...</p>';
        }
        
        // Fetch tickets from backend
        const response = await API.get('/fault-tickets');
        
        if (response.status === 'success' && response.data) {
            // Handle nested data structure: {data: {tickets: []}}
            allTickets = response.data.tickets || response.data || [];
            
            // Apply current filters
            displayFilteredTickets();
        } else {
            throw new Error('Failed to load tickets');
        }
    } catch (error) {
        console.error('Error loading fault tickets:', error);
        document.getElementById('unassignedTicketsList').innerHTML = '<p style="text-align: center; color: var(--danger);">Error loading tickets</p>';
        const activeList = document.getElementById('activeTicketsList');
        if (activeList) {
            activeList.innerHTML = '<p style="text-align: center; color: var(--danger);">Error loading tickets</p>';
        }
        showToast('Failed to load fault tickets', 'error');
    }
}

function displayFilteredTickets() {
    const unassignedList = document.getElementById('unassignedTicketsList');
    const tbody = document.getElementById('activeTicketsBody');
    
    // Filter tickets based on current filters
    let filteredTickets = allTickets.filter(ticket => {
        // Status filter
        let matchesStatus = true;
        if (currentTicketStatusFilter !== 'all') {
            const ticketStatus = (ticket.status || '').toLowerCase().replace(' ', '-');
            const hasAssignments = ticket.assignments && ticket.assignments.length > 0;
            
            if (currentTicketStatusFilter === 'unassigned') {
                matchesStatus = !hasAssignments;
            } else if (currentTicketStatusFilter === 'assigned') {
                matchesStatus = hasAssignments && ticketStatus !== 'completed' && ticketStatus !== 'resolved';
            } else if (currentTicketStatusFilter === 'in-progress') {
                matchesStatus = ticketStatus === 'in-progress' || ticketStatus === 'in progress';
            } else if (currentTicketStatusFilter === 'completed') {
                matchesStatus = ticketStatus === 'completed' || ticketStatus === 'resolved' || ticketStatus === 'closed';
            }
        }
        
        // Source filter
        let matchesSource = true;
        if (currentTicketSourceFilter !== 'all') {
            const reporterRole = (ticket.reporter_role || ticket.reported_by_role || '').toLowerCase();
            matchesSource = reporterRole.includes(currentTicketSourceFilter.toLowerCase());
        }
        
        return matchesStatus && matchesSource;
    });
    
    // Separate into unassigned and assigned
    const unassignedTickets = filteredTickets.filter(t => !t.assignments || t.assignments.length === 0);
    const assignedTickets = filteredTickets.filter(t => t.assignments && t.assignments.length > 0 && t.status !== 'Resolved' && t.status !== 'Closed');
    
    // Display unassigned tickets
    if (unassignedTickets.length > 0) {
        unassignedList.innerHTML = unassignedTickets.map(ticket => {
            const assetName = ticket.machine_model_number || ticket.machine_name || `Machine #${ticket.machine_id}`;
            const description = ticket.description || 'No description';
            const reporterName = ticket.reported_by_name || ticket.reporter_full_name || 'Unknown';
            const createdDate = new Date(ticket.created_at);
            const formattedDate = createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const formattedTime = createdDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            
            const priority = (ticket.priority || 'Medium').toLowerCase();
            const shortDesc = description.split('\n')[0] || description;
            
            return `
                <div class="inventory-item">
                    <div class="item-details">
                        <strong><i class="fas fa-ticket-alt"></i> TKT-${String(ticket.id).padStart(3, '0')}</strong>
                        <div class="item-meta">
                            <i class="fas fa-wrench"></i> ${assetName} | 
                            <i class="fas fa-user"></i> ${reporterName}
                        </div>
                        <div class="item-description">
                            ${shortDesc}
                        </div>
                        <div class="item-meta">
                            <span class="status-text status-${priority}">${priority.toUpperCase()}</span> | 
                            <i class="fas fa-calendar"></i> ${formattedDate} ${formattedTime}
                        </div>
                    </div>
                    <div class="item-actions">
                        <div class="action-buttons">
                            <button class="btn btn-primary btn-small" onclick="viewTicketDetails(${ticket.id})"><i class="fas fa-eye"></i> VIEW</button>
                            <div class="dropdown-container">
                                <button class="btn btn-small btn-secondary dropdown-trigger" onclick="toggleDropdown(event, 'ticket-${ticket.id}')">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <div class="dropdown-menu" id="dropdown-ticket-${ticket.id}">
                                    <button class="dropdown-item" onclick="assignTicket(${ticket.id}); closeAllDropdowns();">
                                        <i class="fas fa-user-plus"></i> Assign Technician
                                    </button>
                                    <button class="dropdown-item" onclick="editTicket(${ticket.id}); closeAllDropdowns();">
                                        <i class="fas fa-edit"></i> Edit Ticket
                                    </button>
                                    <button class="dropdown-item danger" onclick="deleteTicket(${ticket.id}); closeAllDropdowns();">
                                        <i class="fas fa-trash"></i> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        unassignedList.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 20px;">No unassigned tickets match the current filters</p>';
    }
    
    // Display assigned tickets
    const activeList = document.getElementById('activeTicketsList');
    if (assignedTickets.length > 0) {
        activeList.innerHTML = assignedTickets.map(ticket => {
            const assetName = ticket.machine_model_number || ticket.machine_name || `Machine #${ticket.machine_id}`;
            const description = ticket.description || 'No description';
            const shortDesc = description.split('\n')[0];
            
            const assignedTo = ticket.assignments && ticket.assignments.length > 0
                ? ticket.assignments.map(a => a.technician_name).join(', ')
                : 'Unassigned';
            
            const priority = (ticket.priority || 'Medium').toLowerCase();
            const status = (ticket.status || 'open').toLowerCase().replace(' ', '-');
            
            return `
                <div class="inventory-item">
                    <div class="item-details">
                        <strong><i class="fas fa-ticket-alt"></i> TKT-${String(ticket.id).padStart(3, '0')}</strong>
                        <div class="item-meta">
                            <i class="fas fa-wrench"></i> ${assetName} | 
                            <i class="fas fa-user-cog"></i> ${assignedTo}
                        </div>
                        <div class="item-description">
                            ${shortDesc}
                        </div>
                        <div class="item-meta">
                            <span class="status-text status-${priority}">${(ticket.priority || 'MEDIUM').toUpperCase()}</span> | 
                            <span class="status-text status-${status}">${(ticket.status || 'OPEN').toUpperCase().replace('-', ' ')}</span>
                        </div>
                    </div>
                    <div class="item-actions">
                        <div class="action-buttons">
                            <button class="btn btn-primary btn-small" onclick="viewTicketDetails(${ticket.id})"><i class="fas fa-eye"></i> VIEW</button>
                            <div class="dropdown-container">
                                <button class="btn btn-small btn-secondary dropdown-trigger" onclick="toggleDropdown(event, 'active-${ticket.id}')">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <div class="dropdown-menu" id="dropdown-active-${ticket.id}">
                                    <button class="dropdown-item" onclick="editTicketAssignment(${ticket.id}); closeAllDropdowns();">
                                        <i class="fas fa-edit"></i> Edit Assignment
                                    </button>
                                    <button class="dropdown-item" onclick="reassignTicket(${ticket.id}); closeAllDropdowns();">
                                        <i class="fas fa-user-cog"></i> Reassign
                                    </button>
                                    <button class="dropdown-item" onclick="markTicketComplete(${ticket.id}); closeAllDropdowns();">
                                        <i class="fas fa-check-circle"></i> Mark Complete
                                    </button>
                                    <button class="dropdown-item" onclick="printTicket(${ticket.id}); closeAllDropdowns();">
                                        <i class="fas fa-print"></i> Print
                                    </button>
                                    <button class="dropdown-item danger" onclick="deleteTicket(${ticket.id}); closeAllDropdowns();">
                                        <i class="fas fa-trash"></i> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        activeList.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 20px;">No active tickets match the current filters</p>';
    }
}

function filterTicketsByStatus(status) {
    currentTicketStatusFilter = status;
    
    // Update active button - only in the same parent container
    const parentContainer = event.target.parentElement;
    parentContainer.querySelectorAll('button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    displayFilteredTickets();
    showToast(`Showing ${status === 'all' ? 'all' : status} tickets`);
}

function filterTicketsBySource(source) {
    currentTicketSourceFilter = source;
    
    // Update active button - only in the same parent container
    const parentContainer = event.target.parentElement;
    parentContainer.querySelectorAll('button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    displayFilteredTickets();
    showToast(`Showing ${source === 'all' ? 'all sources' : source + ' tickets'}`);
}

async function createNewTicket() {
    // Load machines and technicians for dropdowns
    await Promise.all([
        loadMachinesForTicket(),
        loadTechniciansForAssignment()
    ]);
    
    // Show modal
    const modal = document.getElementById('createTicketModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Reset form
    const form = document.getElementById('createTicketForm');
    form.reset();
    
    // Clear photos
    createTicketPhotos = [];
    updateCreateTicketPhotoPreview();
}

// Photo handling for create ticket modal
function handleCreateTicketPhotoUpload(event) {
    const files = Array.from(event.target.files);
    const maxFiles = 5;
    
    // Check if adding these files would exceed the limit
    if (createTicketPhotos.length + files.length > maxFiles) {
        showToast(`Maximum ${maxFiles} photos allowed`, 'error');
        return;
    }
    
    // Add files to the array
    createTicketPhotos.push(...files);
    updateCreateTicketPhotoPreview();
    
    // Reset the file input so the same file can be selected again if needed
    event.target.value = '';
}

function updateCreateTicketPhotoPreview() {
    const container = document.getElementById('createTicketPhotoPreview');
    container.innerHTML = '';
    
    if (createTicketPhotos.length === 0) {
        return;
    }
    
    createTicketPhotos.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'photo-preview-item';
            previewItem.innerHTML = `
                <img src="${e.target.result}" alt="${file.name}">
                <button type="button" class="remove-photo" onclick="removeCreateTicketPhoto(${index})">
                    <i class="fas fa-times"></i>
                </button>
                <div class="photo-name">${file.name}</div>
            `;
            container.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    });
}

function removeCreateTicketPhoto(index) {
    createTicketPhotos.splice(index, 1);
    updateCreateTicketPhotoPreview();
    showToast('Photo removed', 'success');
}

async function loadMachinesForTicket() {
    try {
        const response = await API.get('/machines');
        const select = document.getElementById('assetId');
        
        if (response.status === 'success' && response.data) {
            const machines = response.data.machines || response.data || [];
            const options = machines.map(machine => 
                `<option value="${machine.id}">${machine.model_number || machine.machine_name || machine.id}</option>`
            ).join('');
            
            select.innerHTML = '<option value="">Select Machine/Asset</option>' + options;
        }
    } catch (error) {
        console.error('Error loading machines:', error);
        showToast('Failed to load machines', 'error');
    }
}

function closeCreateTicketModal() {
    const modal = document.getElementById('createTicketModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

async function loadTechniciansForAssignment() {
    try {
        const response = await API.get('/technicians');
        const select = document.getElementById('assignTo');
        
        if (response.status === 'success' && response.data) {
            const technicians = response.data.users || response.data;
            const options = technicians.map(tech => 
                `<option value="${tech.id}">${tech.full_name || tech.name || tech.employee_id}</option>`
            ).join('');
            
            select.innerHTML = '<option value="">Leave Unassigned</option>' + options;
        }
    } catch (error) {
        console.error('Error loading technicians:', error);
    }
}

// Store selected photos for create ticket
let createTicketPhotos = [];

async function handleCreateTicket(event) {
    event.preventDefault();
    
    const form = event.target;
    
    // Create FormData for multipart/form-data submission
    const formData = new FormData();
    
    // Get form values
    const machineId = document.getElementById('assetId').value;
    const issueTitle = document.getElementById('issueTitle').value;
    const issueDescription = document.getElementById('issueDescription').value;
    const priority = document.getElementById('priority').value;
    
    // Combine title and description
    const description = `${issueTitle}\n\n${issueDescription}`;
    
    // Capitalize first letter of priority to match backend format
    const capitalizedPriority = priority.charAt(0).toUpperCase() + priority.slice(1);
    
    // Append data to FormData
    formData.append('machine_id', machineId);
    formData.append('description', description);
    formData.append('priority', capitalizedPriority);
    
    // Append photos if any
    createTicketPhotos.forEach((photo) => {
        formData.append('photos[]', photo);
    });
    
    try {
        const response = await API.postFormData('/fault-tickets', formData);
        
        if (response.status === 'success') {
            showToast('Fault ticket created successfully', 'success');
            closeCreateTicketModal();
            loadFaultTickets(); // Reload tickets
        } else {
            showToast(response.message || 'Failed to create ticket', 'error');
        }
    } catch (error) {
        console.error('Error creating ticket:', error);
        showToast(error.message || 'Failed to create ticket', 'error');
    }
}

function assignTicket(ticketId) {
    loadTicketForAssignment(ticketId);
}

function editTicketAssignment(ticketId) {
    loadTicketForAssignment(ticketId, true);
}

async function loadTicketForAssignment(ticketId, isEdit = false) {
    try {
        // Load ticket details
        const ticketResponse = await API.get(`/fault-tickets/${ticketId}`);
        const ticket = ticketResponse.data;
        
        // If editing, check if ticket status is "Assigned"
        if (isEdit && ticket.status && ticket.status.toLowerCase() !== 'assigned') {
            showToast('Only tickets with "Assigned" status can be edited', 'error');
            return;
        }
        
        // Update modal title based on mode
        const modalTitle = document.querySelector('#assignTicketModal .modal-header h2');
        if (modalTitle) {
            modalTitle.innerHTML = isEdit 
                ? '<i class="fas fa-edit"></i> Edit Ticket Assignment'
                : '<i class="fas fa-user-plus"></i> Assign Ticket to Technician(s)';
        }
        
        // Set ticket ID in modal (it's a div, not an input)
        const ticketIdElement = document.getElementById('assignTicketId');
        if (ticketIdElement) {
            ticketIdElement.textContent = `TKT-${String(ticketId).padStart(3, '0')}`;
        }
        
        // Set current priority if exists
        const prioritySelect = document.getElementById('assignPriority');
        if (ticket.priority && prioritySelect) {
            prioritySelect.value = ticket.priority.toLowerCase();
        }
        
        // Load technicians with workload
        await loadTechniciansWithWorkload();
        
        // If editing, pre-select currently assigned technicians
        if (isEdit && ticket.assignments && ticket.assignments.length > 0) {
            const assignedTechnicianIds = ticket.assignments.map(a => a.assigned_to);
            assignedTechnicianIds.forEach(techId => {
                const checkbox = document.querySelector(`input[name="technicians"][value="${techId}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
            
            // Pre-fill expected completion date and notes if available
            if (ticket.assignments[0].expected_completion_date) {
                const dateInput = document.getElementById('expectedCompletion');
                if (dateInput) {
                    dateInput.value = ticket.assignments[0].expected_completion_date;
                }
            }
            
            if (ticket.assignments[0].notes) {
                const notesInput = document.getElementById('assignmentNotes');
                if (notesInput) {
                    notesInput.value = ticket.assignments[0].notes;
                }
            }
        }
        
        // Store ticket ID and edit mode for submission
        const assignForm = document.getElementById('assignTicketForm');
        if (assignForm) {
            assignForm.dataset.ticketId = ticketId;
            assignForm.dataset.isEdit = isEdit ? 'true' : 'false';
        }
        
        // Show modal
        const assignModal = document.getElementById('assignTicketModal');
        if (assignModal) {
            assignModal.style.display = 'flex';
            assignModal.style.opacity = '0';
            document.body.style.overflow = 'hidden';
            setTimeout(() => {
                assignModal.style.opacity = '1';
            }, 10);
        }
    } catch (error) {
        console.error('Error loading ticket for assignment:', error);
        showToast('Failed to load ticket details', 'error');
    }
}

async function loadTechniciansWithWorkload() {
    try {
        // Get all technicians using the new endpoint
        const techResponse = await API.get('/technicians');
        const technicians = techResponse.data?.users || techResponse.data || [];
        
        // Get all tickets to count workload
        const ticketResponse = await API.get('/fault-tickets');
        const tickets = ticketResponse.data?.tickets || ticketResponse.data || [];
        
        // Count active tickets per technician
        const workloadMap = {};
        tickets.forEach(ticket => {
            if (ticket.assigned_to && ticket.status !== 'completed' && ticket.status !== 'closed') {
                workloadMap[ticket.assigned_to] = (workloadMap[ticket.assigned_to] || 0) + 1;
            }
        });
        
        // Populate checkbox list
        const checkboxList = document.getElementById('techniciansList');
        
        if (!checkboxList) {
            console.error('techniciansList element not found!');
            return;
        }
        
        checkboxList.innerHTML = technicians.map(tech => {
            const activeTickets = workloadMap[tech.id] || 0;
            const workloadText = activeTickets > 0 
                ? `(${activeTickets} active ticket${activeTickets > 1 ? 's' : ''})`
                : '(Available)';
            const workloadClass = activeTickets > 0 ? 'busy' : 'available';
            
            return `
                <label class="checkbox-item">
                    <input type="checkbox" name="technicians" value="${tech.id}" onchange="updateTechnicianWarning()">
                    <span>${tech.full_name || tech.username}</span>
                    <span class="technician-workload ${workloadClass}">${workloadText}</span>
                </label>
            `;
        }).join('');
        
        // Initial warning check
        updateTechnicianWarning();
    } catch (error) {
        console.error('Error loading technicians:', error);
        showToast('Failed to load technicians', 'error');
    }
}

function updateTechnicianWarning() {
    const form = document.getElementById('assignTicketForm');
    const isEdit = form?.dataset.isEdit === 'true';
    const warningDiv = document.getElementById('noTechnicianWarning');
    
    if (!warningDiv || !isEdit) {
        if (warningDiv) warningDiv.style.display = 'none';
        return;
    }
    
    const selectedTechnicians = document.querySelectorAll('input[name="technicians"]:checked');
    
    if (selectedTechnicians.length === 0) {
        warningDiv.style.display = 'block';
    } else {
        warningDiv.style.display = 'none';
    }
}

async function handleAssignTicket(event) {
    event.preventDefault();
    
    const form = event.target;
    const ticketId = form.dataset.ticketId;
    const isEdit = form.dataset.isEdit === 'true';
    
    // Get selected technicians
    const selectedTechnicians = Array.from(form.querySelectorAll('input[name="technicians"]:checked'))
        .map(cb => parseInt(cb.value));
    
    // Check if no technicians selected
    if (selectedTechnicians.length === 0) {
        if (!isEdit) {
            // For new assignments, at least one technician is required
            showToast('Please select at least one technician', 'error');
            return;
        }
        // For edit mode with no technicians selected, proceed to unassign all
        // (visual warning is already shown in the modal)
    }
    
    const formData = new FormData(form);
    
    // Capitalize first letter of priority to match backend format
    const priority = formData.get('priority');
    const capitalizedPriority = priority.charAt(0).toUpperCase() + priority.slice(1);
    
    const assignmentData = {
        technician_ids: selectedTechnicians, // Now supports multiple technicians (can be empty array for unassignment)
        priority: capitalizedPriority,
        expected_completion_date: formData.get('expected_completion'),
        notes: formData.get('notes')
    };
    
    try {
        // Use the new assignment endpoint
        await API.post(`/fault-tickets/${ticketId}/assign`, assignmentData);
        
        // Close modal and show success
        closeAssignTicketModal();
        
        if (selectedTechnicians.length === 0) {
            showToast('All technicians unassigned. Ticket moved to Unassigned.', 'success');
        } else {
            showToast('Ticket assigned successfully', 'success');
        }
        
        // Reload tickets
        loadFaultTickets();
    } catch (error) {
        console.error('Error assigning ticket:', error);
        showToast(error.message || 'Failed to assign ticket', 'error');
    }
}

function closeAssignTicketModal() {
    const modal = document.getElementById('assignTicketModal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300); // Wait for opacity transition
    }
    
    // Reset form
    const form = document.getElementById('assignTicketForm');
    form.reset();
    
    // Uncheck all technician checkboxes
    const checkboxes = form.querySelectorAll('input[name="technicians"]');
    checkboxes.forEach(cb => cb.checked = false);
    
    // Hide warning message
    const warningDiv = document.getElementById('noTechnicianWarning');
    if (warningDiv) {
        warningDiv.style.display = 'none';
    }
}

async function viewTicketDetails(ticketId) {
    try {
        const response = await API.get(`/fault-tickets/${ticketId}`);
        const ticket = response.data;
        
        // Format the ticket details
        const assetName = ticket.machine_model_number || ticket.machine_name || `Machine #${ticket.machine_id}`;
        const createdDate = new Date(ticket.created_at).toLocaleString();
        const updatedDate = ticket.updated_at ? new Date(ticket.updated_at).toLocaleString() : 'N/A';
        
        // Build images section if images exist
        let imagesHTML = '';
        if (ticket.images && ticket.images.length > 0) {
            const baseURL = CONFIG.API_BASE_URL.replace('/api', ''); // Remove /api from the URL
            imagesHTML = `
                <div class="form-section">
                    <h5><i class="fas fa-images"></i> Attached Images</h5>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">
                        ${ticket.images.map(img => `
                            <div style="border: 1px solid var(--stone-200); border-radius: 8px; overflow: hidden;">
                                <img src="${baseURL}/uploads/fault-tickets/${img.image_url}" 
                                     alt="${img.original_filename}" 
                                     style="width: 100%; height: 200px; object-fit: cover; cursor: pointer;"
                                     onclick="window.open('${baseURL}/uploads/fault-tickets/${img.image_url}', '_blank')">
                                <div style="padding: 8px; font-size: 0.75rem; color: var(--muted);">
                                    ${img.original_filename}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        const detailsHTML = `
            <div class="form-section">
                <h5><i class="fas fa-info-circle"></i> Ticket Information</h5>
                <p><strong>Ticket ID:</strong> TKT-${String(ticket.id).padStart(3, '0')}</p>
                <p><strong>Status:</strong> <span class="status-text status-${(ticket.status || 'open').toLowerCase().replace('_', '-')}">${(ticket.status || 'OPEN').toUpperCase().replace('_', ' ')}</span></p>
                <p><strong>Priority:</strong> <span class="status-text status-${ticket.priority ? ticket.priority.toLowerCase() : 'normal'}">${(ticket.priority || 'NORMAL').toUpperCase()}</span></p>
                <p><strong>Machine:</strong> ${assetName}</p>
                ${ticket.location ? `<p><strong>Location:</strong> ${ticket.location}</p>` : ''}
            </div>
            
            <div class="form-section">
                <h5><i class="fas fa-clipboard-list"></i> Description</h5>
                <p style="white-space: pre-wrap; border-left: none; padding: 12px; background: var(--background); border-radius: 6px;">${ticket.description || 'No description provided'}</p>
            </div>
            
            ${imagesHTML}
            
            <div class="form-section">
                <h5><i class="fas fa-user-cog"></i> Assignment Details</h5>
                <p><strong>Reported By:</strong> ${ticket.reported_by_name || ticket.reporter_full_name || 'N/A'}</p>
                <p><strong>Assigned To:</strong> ${ticket.assignments && ticket.assignments.length > 0 
                    ? ticket.assignments.map(a => a.technician_name).join(', ') 
                    : 'Unassigned'}</p>
                <p><strong>Created:</strong> ${createdDate}</p>
                <p><strong>Last Updated:</strong> ${updatedDate}</p>
                ${ticket.assignments && ticket.assignments.length > 0 && ticket.assignments[0].expected_completion_date ? `
                <p><strong>Expected Completion:</strong> ${new Date(ticket.assignments[0].expected_completion_date).toLocaleDateString()}</p>
                ` : ''}
                ${ticket.assignments && ticket.assignments.length > 0 && ticket.assignments[0].notes ? `
                <p><strong>Assignment Notes:</strong></p>
                <p style="white-space: pre-wrap; border-left: none; padding: 12px; background: var(--background); border-radius: 6px;">${ticket.assignments[0].notes}</p>
                ` : ''}
            </div>
            
            ${ticket.resolution_notes ? `
            <div class="form-section">
                <h5><i class="fas fa-check-circle"></i> Resolution Notes</h5>
                <p style="white-space: pre-wrap; border-left: none; padding: 12px; background: var(--background); border-radius: 6px;">${ticket.resolution_notes}</p>
            </div>
            ` : ''}
        `;
        
        // Populate modal
        document.getElementById('viewTicketContent').innerHTML = detailsHTML;
        
        // Show modal
        const viewModal = document.getElementById('viewTicketModal');
        viewModal.style.display = 'flex';
        viewModal.style.opacity = '0';
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
            viewModal.style.opacity = '1';
        }, 10);
    } catch (error) {
        console.error('Error loading ticket details:', error);
        showToast('Failed to load ticket details', 'error');
    }
}

function closeViewTicketModal() {
    const modal = document.getElementById('viewTicketModal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            document.getElementById('viewTicketContent').innerHTML = '';
        }, 300);
    }
}

// ==================== REPAIR MANAGEMENT ====================

async function loadRepairs() {
    const awaitingDiv = document.getElementById('repairsAwaitingApproval');
    const ongoingDiv = document.getElementById('ongoingRepairsList');
    const outsourcedDiv = document.getElementById('outsourcedRepairsList');
    
    awaitingDiv.innerHTML = '<p style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> Loading...</p>';
    ongoingDiv.innerHTML = '<p style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> Loading...</p>';
    outsourcedDiv.innerHTML = '<p style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> Loading...</p>';
    
    // TODO: Replace with actual API calls
    setTimeout(() => {
        awaitingDiv.innerHTML = '<p style="text-align: center; color: var(--muted);">No repairs awaiting approval</p>';
        ongoingDiv.innerHTML = '<p style="text-align: center; color: var(--muted);">No ongoing repairs</p>';
        outsourcedDiv.innerHTML = '<p style="text-align: center; color: var(--muted);">No outsourced repairs</p>';
    }, 500);
}

function greenLightRepair(repairId) {
    createConfirmationDialog(
        'Approve Repair',
        `Approve repair ${repairId}? The technician will be notified to proceed.`,
        async () => {
            showToast(`Repair ${repairId} approved!`, 'success');
            loadRepairs();
        },
        'primary'
    );
}

function markAsOutsourced(repairId) {
    showToast(`Marking repair ${repairId} as outsourced`, 'info');
    // TODO: Implement outsource modal
}

function updateComponentInfo() {
    showToast('Component info update feature coming soon', 'info');
    // TODO: Implement component info modal
}

function viewAllOutsourced() {
    showToast('Loading all outsourced repairs', 'info');
}

// ==================== BUDGET APPROVAL ====================

async function loadBudgets() {
    const tbody = document.getElementById('budgetsTableBody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> Loading budgets...</td></tr>';
    
    // TODO: Replace with actual API call
    setTimeout(() => {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--muted);">No pending budgets</td></tr>';
    }, 500);
}

function filterBudgetsByStatus(status) {
    showToast(`Filtering budgets by ${status}`);
    // TODO: Implement filtering logic
}

function approveBudget(budgetId) {
    createConfirmationDialog(
        'Approve Budget',
        `Approve budget ${budgetId}? This will allow the repair to proceed.`,
        async () => {
            showToast(`Budget ${budgetId} approved!`, 'success');
            loadBudgets();
        },
        'primary'
    );
}

function rejectBudget(budgetId) {
    createConfirmationDialog(
        'Reject Budget',
        `Reject budget ${budgetId}? The technician will need to revise.`,
        async () => {
            showToast(`Budget ${budgetId} rejected`, 'warning');
            loadBudgets();
        },
        'danger'
    );
}

// ==================== ASSET STATUS ====================

async function loadAssetStatus() {
    const tbody = document.getElementById('assetStatusBody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> Loading assets...</td></tr>';
    
    // TODO: Replace with actual API call
    setTimeout(() => {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--muted);">No assets found</td></tr>';
    }, 500);
}

function filterAssets(status) {
    showToast(`Filtering assets by ${status}`);
    // TODO: Implement filtering logic
}

// ==================== TECHNICIAN ASSIGNMENTS ====================

async function loadTechnicians() {
    const div = document.getElementById('techniciansList');
    div.innerHTML = '<p style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> Loading technicians...</p>';
    
    // TODO: Replace with actual API call
    setTimeout(() => {
        div.innerHTML = '<p style="text-align: center; color: var(--muted);">No technicians available</p>';
    }, 500);
}

// ==================== TOAST NOTIFICATIONS ====================

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    
    toast.className = 'toast';
    if (type === 'error' || type === 'danger') {
        toast.classList.add('toast-error');
    } else if (type === 'warning') {
        toast.classList.add('toast-warning');
    } else if (type === 'info') {
        toast.classList.add('toast-info');
    } else {
        toast.classList.add('toast-success');
    }
    
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// ==================== CONFIRMATION DIALOG ====================

function createConfirmationDialog(title, message, onConfirm, type = 'danger') {
    const modal = document.createElement('div');
    modal.className = 'modal confirmation-modal';
    modal.id = 'confirmationModal';
    
    const iconMap = {
        'danger': 'exclamation-triangle',
        'warning': 'exclamation-circle',
        'primary': 'question-circle',
        'info': 'info-circle'
    };
    
    modal.innerHTML = `
        <div class="modal-content confirmation-content">
            <div class="confirmation-header ${type}">
                <i class="fas fa-${iconMap[type] || 'question-circle'}"></i>
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
    
    // Close on outside click
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeConfirmation();
        }
    };
    
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

// ==================== DETAILS MODAL ====================

function createDetailsModal(title, content) {
    // Remove any existing details modal
    const existingModal = document.getElementById('detailsModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'detailsModal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-info-circle"></i> ${title}</h2>
                <button class="btn-close" onclick="closeDetailsModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="form-section">
                ${content}
            </div>
            <button class="btn btn-secondary" onclick="closeDetailsModal()"><i class="fas fa-times"></i> Close</button>
        </div>
    `;
    
    // Close on outside click
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeDetailsModal();
        }
    };
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    modal.classList.add('active');
}

function closeDetailsModal() {
    const modal = document.getElementById('detailsModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(() => modal.remove(), 300);
    }
}

// ==================== LOGOUT ====================

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

// ==================== MODAL HANDLERS ====================

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('createTicketModal');
    if (event.target === modal) {
        closeCreateTicketModal();
    }
});

// Close modal on ESC key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modal = document.getElementById('createTicketModal');
        if (modal && modal.classList.contains('active')) {
            closeCreateTicketModal();
        }
    }
});

// ==================== MOBILE MENU ====================

// Add mobile menu toggle for responsive design
if (window.innerWidth <= 768) {
    const menuBtn = document.createElement('button');
    menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
    menuBtn.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        z-index: 1000;
        background: var(--royal-blue);
        color: white;
        border: none;
        padding: 10px 15px;
        border-radius: 5px;
        cursor: pointer;
    `;
    
    menuBtn.onclick = () => {
        const sidebar = document.querySelector('.sidebar');
        sidebar.classList.toggle('open');
    };
    
    document.body.appendChild(menuBtn);
}

// ==================== REPAIR MANAGEMENT FUNCTIONS ====================

function viewRepairDetails(repairId) {
    // Sample data - replace with actual API call
    const repairData = {
        'REP-001': { id: 'REP-001', title: 'Engine Overhaul', asset: 'Vehicle V-105', assetName: 'Toyota Hiace LKA-1234', ticket: 'TKT-050', technician: 'Mike Johnson', priority: 'Urgent', estimatedCost: '$2,500', estimatedTime: '2 days', description: 'Complete engine overhaul required due to excessive oil consumption and performance issues', parts: 'Engine gaskets, oil filters, air filters, spark plugs, engine oil', status: 'Pending Approval' },
        'REP-002': { id: 'REP-002', title: 'Transmission Repair', asset: 'Vehicle V-108', assetName: 'Isuzu NPR LKA-5678', ticket: 'TKT-051', technician: 'Sarah Williams', priority: 'Normal', estimatedCost: '$1,800', estimatedTime: '1.5 days', description: 'Transmission fluid leak detected along with gear shifting issues', parts: 'Transmission seals, gasket kit, transmission fluid', status: 'Pending Approval' }
    };
    
    const repair = repairData[repairId] || repairData['REP-001'];
    
    const content = `
        <div style="padding: 20px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div>
                    <strong>Repair ID:</strong><br>
                    <span style="color: var(--royal-blue);">${repair.id}</span>
                </div>
                <div>
                    <strong>Priority:</strong><br>
                    <span class="status-text status-${repair.priority.toLowerCase()}">${repair.priority.toUpperCase()}</span>
                </div>
                <div>
                    <strong>Asset:</strong><br>
                    ${repair.assetName}
                </div>
                <div>
                    <strong>Related Ticket:</strong><br>
                    ${repair.ticket}
                </div>
                <div>
                    <strong>Assigned Technician:</strong><br>
                    <i class="fas fa-user-cog"></i> ${repair.technician}
                </div>
                <div>
                    <strong>Status:</strong><br>
                    <span class="status-text status-pending">${repair.status}</span>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <strong>Issue Description:</strong><br>
                <p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px;">${repair.description}</p>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div>
                    <strong>Estimated Cost:</strong><br>
                    <span style="font-size: 1.2em; color: var(--royal-blue);">${repair.estimatedCost}</span>
                </div>
                <div>
                    <strong>Estimated Time:</strong><br>
                    <span style="font-size: 1.2em;">${repair.estimatedTime}</span>
                </div>
            </div>
            
            <div>
                <strong>Required Parts:</strong><br>
                <p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px;">${repair.parts}</p>
            </div>
        </div>
    `;
    
    createDetailsModal('Repair Details', content);
}

function greenLightRepair(repairId) {
    createConfirmationDialog(
        'Approve Repair',
        `Are you sure you want to approve repair ${repairId}? The technician can proceed with the work.`,
        async () => {
            const itemCard = document.querySelector(`[data-id="${repairId}"]`);
            if (itemCard) {
                itemCard.remove();
            }
            showToast(`✅ Repair ${repairId} approved! Technician can proceed.`, 'success');
        },
        'success'
    );
}

function rejectRepair(repairId) {
    createConfirmationDialog(
        'Reject Repair',
        `Reject repair ${repairId}? Please provide reason to technician.`,
        async () => {
            const itemCard = document.querySelector(`[data-id="${repairId}"]`);
            if (itemCard) {
                itemCard.remove();
            }
            showToast(`❌ Repair ${repairId} rejected.`, 'warning');
        },
        'danger'
    );
}

function markAsOutsourced(repairId) {
    showToast(`Marking repair ${repairId} as outsourced`, 'info');
    // TODO: Implement outsource modal
}

function viewRepairProgress(repairId) {
    // Sample data - replace with actual API call
    const progressData = {
        'REP-010': { id: 'REP-010', title: 'Hydraulic System', asset: 'Machine M-205', assetName: 'CAT Excavator 320D', technician: 'Mike Johnson', startDate: 'Oct 18, 2025', expectedDate: 'Oct 20, 2025', status: 'On Track', progress: '60%', completedSteps: 'Initial diagnosis completed, Hydraulic pump removed, System flushed', remainingSteps: 'Install new pump, Test system, Final inspection', notes: 'Work is progressing well, no delays expected' }
    };
    
    const progress = progressData[repairId] || progressData['REP-010'];
    
    const content = `
        <div class="form-section">
            <h5><i class="fas fa-info-circle"></i> Basic Information</h5>
            <p><strong>Repair ID:</strong> <span style="color: var(--royal-blue);">${progress.id}</span></p>
            <p><strong>Status:</strong> <span class="status-text status-in-progress">${progress.status.toUpperCase()}</span></p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-car"></i> Asset & Assignment</h5>
            <p><strong>Asset:</strong> ${progress.assetName}</p>
            <p><strong>Technician:</strong> <i class="fas fa-user-cog"></i> ${progress.technician}</p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-calendar-alt"></i> Timeline</h5>
            <p><strong>Start Date:</strong> <i class="fas fa-calendar-check"></i> ${progress.startDate}</p>
            <p><strong>Expected Completion:</strong> <i class="fas fa-calendar-check"></i> ${progress.expectedDate}</p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-chart-line"></i> Progress</h5>
            <div style="margin-top: 8px; background: var(--background); border-radius: 6px; padding: 8px;">
                <div style="width: 100%; background: #e0e0e0; border-radius: 4px; height: 24px; position: relative;">
                    <div style="width: ${progress.progress}; background: var(--kelly-green); border-radius: 4px; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">${progress.progress}</div>
                </div>
            </div>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-check-circle"></i> Completed Steps</h5>
            <p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px;">${progress.completedSteps}</p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-tasks"></i> Remaining Steps</h5>
            <p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px;">${progress.remainingSteps}</p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-sticky-note"></i> Notes</h5>
            <p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px;">${progress.notes}</p>
        </div>
    `;
    
    createDetailsModal('Repair Progress', content);
}

function updateRepairTimeline(repairId) {
    showToast(`Updating timeline for repair ${repairId}`, 'info');
    // TODO: Implement timeline update functionality
}

function viewAllOutsourced() {
    showToast('Loading all outsourced repairs...', 'info');
    // TODO: Implement outsourced repairs view
}

function updateComponentInfo() {
    showToast('Opening component information update form', 'info');
    // TODO: Implement component info modal
}

// ==================== BUDGET APPROVAL FUNCTIONS ====================

function filterBudgetsByStatus(status) {
    const btn = event.target;
    document.querySelectorAll('#budget-approval .filter-controls .filter-btn').forEach(b => {
        b.classList.remove('active');
    });
    btn.classList.add('active');
    
    const rows = document.querySelectorAll('#pendingBudgetsTable tr');
    let visibleCount = 0;
    
    rows.forEach(row => {
        const rowStatus = row.getAttribute('data-status');
        if (!rowStatus) return;
        
        if (status === 'all') {
            row.style.display = '';
            visibleCount++;
        } else if (rowStatus === status) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    // Update badge count
    const badge = document.getElementById('budgetCountBadge');
    if (badge) {
        badge.textContent = `${visibleCount} budget${visibleCount !== 1 ? 's' : ''}`;
    }
    
    showToast(`Showing ${visibleCount} budget${visibleCount !== 1 ? 's' : ''}`, 'info');
}

function viewBudgetDetails(budgetId) {
    // Sample data - replace with actual API call
    const budgetData = {
        'BUD-001': { id: 'BUD-001', breakdown: 'BR-003', asset: 'Vehicle LKA-1234', assetName: 'Toyota Hiace', description: 'Tire replacement - In-route breakdown', submittedBy: 'Driver Kamal', submittedDate: '2025-10-21', priority: 'Urgent', requestedAmount: 'LKR 12,500', breakdown: 'Tires (4x): LKR 10,000\nLabor: LKR 1,500\nAlignment: LKR 1,000', location: 'Colombo - Kandy Road (near Kadawatha)', reason: 'Front left tire burst during trip, inspection revealed all tires worn beyond safe limits' },
        'BUD-002': { id: 'BUD-002', breakdown: 'BR-005', asset: 'Vehicle LKA-5678', assetName: 'Isuzu NPR', description: 'Battery replacement', submittedBy: 'Driver Saman', submittedDate: '2025-10-21', priority: 'Normal', requestedAmount: 'LKR 8,750', breakdown: 'Battery: LKR 7,500\nLabor: LKR 1,000\nTerminal cleaning: LKR 250', location: 'Galle depot', reason: 'Battery completely dead, unable to start vehicle after overnight parking' }
    };
    
    const budget = budgetData[budgetId] || budgetData['BUD-001'];
    
    const content = `
        <div class="form-section">
            <h5><i class="fas fa-info-circle"></i> Basic Information</h5>
            <p><strong>Budget ID:</strong> <span style="color: var(--royal-blue);">${budget.id}</span></p>
            <p><strong>Priority:</strong> <span class="status-text status-${budget.priority.toLowerCase()}">${budget.priority.toUpperCase()}</span></p>
            <p><strong>Submitted Date:</strong> <i class="fas fa-calendar"></i> ${budget.submittedDate}</p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-car"></i> Asset & Breakdown</h5>
            <p><strong>Asset:</strong> ${budget.assetName} (${budget.asset})</p>
            <p><strong>Breakdown ID:</strong> ${budget.breakdown}</p>
            <p><strong>Submitted By:</strong> <i class="fas fa-user"></i> ${budget.submittedBy}</p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-clipboard-list"></i> Description</h5>
            <p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px;">${budget.description}</p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-map-marker-alt"></i> Location</h5>
            <p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px;">${budget.location}</p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-question-circle"></i> Reason</h5>
            <p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px;">${budget.reason}</p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-receipt"></i> Cost Breakdown</h5>
            <div style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px; white-space: pre-line;">${budget.breakdown}</div>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-dollar-sign"></i> Total Amount</h5>
            <div style="padding: 15px; background: linear-gradient(135deg, var(--royal-blue), var(--tang-blue)); color: white; border-radius: 8px; text-align: center;">
                <span style="font-size: 1.5em; font-weight: bold;">${budget.requestedAmount}</span>
            </div>
        </div>
    `;
    
    createDetailsModal('Budget Approval Details', content);
}

function approveBudget(budgetId) {
    createConfirmationDialog(
        'Approve Budget',
        `Approve budget ${budgetId}?`,
        async () => {
            const row = document.querySelector(`tr[data-id="${budgetId}"]`);
            if (row) {
                // Update status
                row.setAttribute('data-status', 'approved');
                
                // Update the actions column to show approved status
                const actionsCell = row.querySelector('.budget-actions');
                if (actionsCell) {
                    actionsCell.innerHTML = `
                        <span class="status-text status-completed">✅ Approved</span>
                        <button class="btn btn-secondary btn-small" onclick="viewBudgetDetails('${budgetId}')"><i class="fas fa-eye"></i> View</button>
                    `;
                }
                
                // Hide the row if viewing only pending
                const activeBtn = document.querySelector('#budget-approval .filter-controls .filter-btn.active');
                if (activeBtn && activeBtn.textContent.toLowerCase().includes('pending')) {
                    row.style.display = 'none';
                }
            }
            showToast(`✅ Budget ${budgetId} approved!`, 'success');
            updateBudgetCount();
        },
        'success'
    );
}

function rejectBudget(budgetId) {
    createConfirmationDialog(
        'Reject Budget',
        `Reject budget ${budgetId}? Technician will need to revise.`,
        async () => {
            const row = document.querySelector(`tr[data-id="${budgetId}"]`);
            if (row) {
                // Update status
                row.setAttribute('data-status', 'rejected');
                
                // Update the actions column to show rejected status
                const actionsCell = row.querySelector('.budget-actions');
                if (actionsCell) {
                    actionsCell.innerHTML = `
                        <span class="status-text status-rejected">❌ Rejected</span>
                        <button class="btn btn-secondary btn-small" onclick="viewBudgetDetails('${budgetId}')"><i class="fas fa-eye"></i> View</button>
                    `;
                }
                
                // Hide the row if viewing only pending
                const activeBtn = document.querySelector('#budget-approval .filter-controls .filter-btn.active');
                if (activeBtn && activeBtn.textContent.toLowerCase().includes('pending')) {
                    row.style.display = 'none';
                }
            }
            showToast(`❌ Budget ${budgetId} rejected.`, 'warning');
            updateBudgetCount();
        },
        'danger'
    );
}

function updateBudgetCount() {
    const activeBtn = document.querySelector('#budget-approval .filter-controls .filter-btn.active');
    if (activeBtn) {
        const rows = document.querySelectorAll('#pendingBudgetsTable tr');
        let visibleCount = 0;
        
        rows.forEach(row => {
            if (row.style.display !== 'none') {
                visibleCount++;
            }
        });
        
        const badge = document.getElementById('budgetCountBadge');
        if (badge) {
            badge.textContent = `${visibleCount} budget${visibleCount !== 1 ? 's' : ''}`;
        }
    }
}

// ==================== ASSET STATUS FUNCTIONS ====================

function filterAssets(status) {
    const btn = event.target;
    document.querySelectorAll('#asset-status .filter-controls .filter-btn').forEach(b => {
        b.classList.remove('active');
    });
    btn.classList.add('active');
    
    const rows = document.querySelectorAll('#assetStatusTable tr');
    let visibleCount = 0;
    
    rows.forEach(row => {
        const rowStatus = row.getAttribute('data-status');
        if (!rowStatus) return;
        
        if (status === 'all') {
            row.style.display = '';
            visibleCount++;
        } else if (rowStatus === status) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    showToast(`Showing ${visibleCount} asset${visibleCount !== 1 ? 's' : ''}`, 'info');
}

function viewAssetDetails(assetId) {
    // Sample data - replace with actual API call
    const assetData = {
        'VEH-001': { id: 'VEH-001', name: 'Toyota Hiace LKA-1234', type: 'Vehicle', category: 'Passenger Van', location: 'Depot A', status: 'Operational', lastService: '2024-01-15', nextService: '2024-04-15', mileage: '45,230 km', assignedTo: 'Driver John Doe', fuelType: 'Diesel', year: '2020', condition: 'Good' },
        'VEH-002': { id: 'VEH-002', name: 'Isuzu NPR LKA-5678', type: 'Vehicle', category: 'Light Truck', location: 'Workshop', status: 'In Maintenance', lastService: '2024-01-20', nextService: '2024-02-05', mileage: '78,500 km', assignedTo: 'Unassigned', fuelType: 'Diesel', year: '2019', condition: 'Fair' },
        'VEH-003': { id: 'VEH-003', name: 'Mitsubishi Canter LKA-9012', type: 'Vehicle', category: 'Medium Truck', location: 'Workshop', status: 'Under Repair', lastService: '2024-01-10', nextService: 'TBD', mileage: '125,400 km', assignedTo: 'Unassigned', fuelType: 'Diesel', year: '2018', condition: 'Needs Repair' },
        'MAC-001': { id: 'MAC-001', name: 'CAT Excavator 320D', type: 'Machine', category: 'Heavy Equipment', location: 'Site B', status: 'Operational', lastService: '2024-01-18', nextService: '2024-04-18', hours: '1,250 hrs', assignedTo: 'Operator Jane Smith', fuelType: 'Diesel', year: '2021', condition: 'Excellent' },
        'MAC-002': { id: 'MAC-002', name: 'JCB Backhoe 3CX', type: 'Machine', category: 'Heavy Equipment', location: 'Site C', status: 'Operational', lastService: '2024-01-12', nextService: '2024-04-12', hours: '890 hrs', assignedTo: 'Operator Mike Johnson', fuelType: 'Diesel', year: '2022', condition: 'Excellent' }
    };
    
    const asset = assetData[assetId] || assetData['VEH-001'];
    
    const content = `
        <div class="form-section">
            <h5><i class="fas fa-info-circle"></i> Basic Information</h5>
            <p><strong>Asset ID:</strong> <span style="color: var(--royal-blue);">${asset.id}</span></p>
            <p><strong>Name:</strong> ${asset.name}</p>
            <p><strong>Status:</strong> <span class="status-text status-${asset.status.toLowerCase().replace(' ', '-')}">${asset.status.toUpperCase()}</span></p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-cog"></i> Asset Details</h5>
            <p><strong>Type:</strong> <i class="fas fa-${asset.type === 'Vehicle' ? 'truck' : 'cogs'}"></i> ${asset.type} - ${asset.category}</p>
            <p><strong>Location:</strong> <i class="fas fa-map-marker-alt"></i> ${asset.location}</p>
            <p><strong>Year:</strong> ${asset.year}</p>
            <p><strong>Fuel Type:</strong> ${asset.fuelType}</p>
            <p><strong>Condition:</strong> ${asset.condition}</p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-tachometer-alt"></i> Usage</h5>
            <p><strong>${asset.type === 'Vehicle' ? 'Mileage' : 'Engine Hours'}:</strong> <span style="font-size: 1.1em; color: var(--royal-blue);">${asset.type === 'Vehicle' ? asset.mileage : asset.hours}</span></p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-user"></i> Assignment</h5>
            <p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px;">${asset.assignedTo}</p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-wrench"></i> Service Information</h5>
            <p><strong>Last Service:</strong> <i class="fas fa-calendar-check"></i> ${asset.lastService}</p>
            <p><strong>Next Service:</strong> <i class="fas fa-calendar-alt"></i> ${asset.nextService}</p>
        </div>
    `;
    
    createDetailsModal('Asset Details', content);
}

function updateAssetStatus(assetId) {
    showToast(`Updating status for asset ${assetId}`, 'info');
    // TODO: Implement status update modal
}

// ==================== TECHNICIAN ASSIGNMENTS FUNCTIONS ====================

function viewTechnicianDetails(techId) {
    // Sample data - replace with actual API call
    const techData = {
        'TECH-001': { id: 'TECH-001', name: 'Ranjith Silva', specialization: 'Engine Specialist', currentAssignments: 2, status: 'Available', completedThisWeek: 3, completedThisMonth: 12, experience: '8 years', phone: '+94 77 123 4567', email: 'ranjith.silva@assetcare360.com', activeTickets: 'TKT-050 (Engine Overhaul), TKT-048 (Oil Change)', certifications: 'ASE Master Technician, Diesel Engine Specialist' }
    };
    
    const tech = techData[techId] || techData['TECH-001'];
    
    const content = `
        <div class="form-section">
            <h5><i class="fas fa-info-circle"></i> Basic Information</h5>
            <p><strong>Technician ID:</strong> <span style="color: var(--royal-blue);">${tech.id}</span></p>
            <p><strong>Name:</strong> ${tech.name}</p>
            <p><strong>Status:</strong> <span class="status-text status-normal">${tech.status.toUpperCase()}</span></p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-user-cog"></i> Professional Details</h5>
            <p><strong>Specialization:</strong> <i class="fas fa-wrench"></i> ${tech.specialization}</p>
            <p><strong>Experience:</strong> ${tech.experience}</p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-address-book"></i> Contact Information</h5>
            <p><strong>Phone:</strong> <i class="fas fa-phone"></i> ${tech.phone}</p>
            <p><strong>Email:</strong> <i class="fas fa-envelope"></i> ${tech.email}</p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-certificate"></i> Certifications</h5>
            <p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px;">${tech.certifications}</p>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-chart-bar"></i> Workload Statistics</h5>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                <div style="text-align: center; padding: 15px; background: var(--background); border-radius: 8px;">
                    <div style="font-size: 2em; font-weight: bold; color: var(--tang-blue);">${tech.currentAssignments}</div>
                    <div style="margin-top: 5px; color: var(--muted);">Current Assignments</div>
                </div>
                <div style="text-align: center; padding: 15px; background: var(--background); border-radius: 8px;">
                    <div style="font-size: 2em; font-weight: bold; color: var(--kelly-green);">${tech.completedThisWeek}</div>
                    <div style="margin-top: 5px; color: var(--muted);">Completed This Week</div>
                </div>
                <div style="text-align: center; padding: 15px; background: var(--background); border-radius: 8px;">
                    <div style="font-size: 2em; font-weight: bold; color: var(--royal-blue);">${tech.completedThisMonth}</div>
                    <div style="margin-top: 5px; color: var(--muted);">Completed This Month</div>
                </div>
            </div>
        </div>

        <div class="form-section">
            <h5><i class="fas fa-tasks"></i> Active Tickets</h5>
            <p style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 6px;">${tech.activeTickets}</p>
        </div>
    `;
    
    createDetailsModal('Technician Details', content);
}

function assignNewTicket(techId) {
    showToast(`Assigning new ticket to technician ${techId}`, 'info');
    // TODO: Implement ticket assignment modal
}

// ==================== MODAL BACKDROP HANDLERS ====================

// Close modals on backdrop click
window.addEventListener('click', (event) => {
    if (event.target.classList.contains('modal')) {
        const modalDisplay = window.getComputedStyle(event.target).display;
        if (modalDisplay === 'flex' || event.target.classList.contains('active')) {
            if (event.target.id === 'createTicketModal') {
                closeCreateTicketModal();
            } else if (event.target.id === 'assignTicketModal') {
                closeAssignTicketModal();
            } else if (event.target.id === 'viewTicketModal') {
                closeViewTicketModal();
            }
        }
    }
});

// Close modals on ESC key
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        const createModal = document.getElementById('createTicketModal');
        const assignModal = document.getElementById('assignTicketModal');
        const viewModal = document.getElementById('viewTicketModal');
        
        if (createModal && (createModal.classList.contains('active') || window.getComputedStyle(createModal).display === 'flex')) {
            closeCreateTicketModal();
        } else if (assignModal && window.getComputedStyle(assignModal).display === 'flex') {
            closeAssignTicketModal();
        } else if (viewModal && window.getComputedStyle(viewModal).display === 'flex') {
            closeViewTicketModal();
        }
    }
});
// ==================== DROPDOWN MENU FUNCTIONS ====================

function toggleDropdown(event, dropdownId) {
    event.stopPropagation();
    const dropdown = document.getElementById(`dropdown-${dropdownId}`);
    const allDropdowns = document.querySelectorAll('.dropdown-menu');
    
    // Close all other dropdowns
    allDropdowns.forEach(d => {
        if (d !== dropdown) {
            d.classList.remove('show');
        }
    });
    
    // Toggle current dropdown
    dropdown.classList.toggle('show');
}

function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-menu').forEach(dropdown => {
        dropdown.classList.remove('show');
    });
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(event) {
    if (!event.target.closest('.dropdown-container')) {
        closeAllDropdowns();
    }
});

// Placeholder functions for dropdown actions
function reassignTicket(ticketId) {
    assignTicket(ticketId);
}

function markTicketComplete(ticketId) {
    // Implementation for marking ticket complete
    console.log('Mark ticket complete:', ticketId);
    showToast('Feature coming soon', 'info');
}

function printTicket(ticketId) {
    // Implementation for printing ticket
    console.log('Print ticket:', ticketId);
    showToast('Feature coming soon', 'info');
}

function editTicket(ticketId) {
    // Implementation for editing ticket
    console.log('Edit ticket:', ticketId);
    showToast('Feature coming soon', 'info');
}

function editTicketAssignment(ticketId) {
    assignTicket(ticketId);
}