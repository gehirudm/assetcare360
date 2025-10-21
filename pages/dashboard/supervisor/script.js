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
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> Loading reports...</td></tr>';
    
    // TODO: Replace with actual API call
    // const reports = await API.get('/daily-check-reports');
    
    // Sample data
    const reports = [
        { id: 'DCR-001', asset: 'TRK-101', submittedBy: 'John Doe', type: 'driver', date: '2025-10-21', status: 'Pending' },
        { id: 'DCR-002', asset: 'EXC-045', submittedBy: 'Jane Smith', type: 'operator', date: '2025-10-21', status: 'Pending' }
    ];
    
    tbody.innerHTML = reports.map(report => `
        <tr data-id="${report.id}" data-type="${report.type}">
            <td>${report.id}</td>
            <td>${report.asset}</td>
            <td>${report.submittedBy}</td>
            <td><i class="fas fa-${report.type === 'driver' ? 'car' : 'cog'}"></i> ${report.type}</td>
            <td>${report.date}</td>
            <td><span class="status-badge status-${report.status.toLowerCase()}">${report.status}</span></td>
            <td>
                <button class="btn btn-secondary btn-small" onclick="viewReport('${report.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn btn-success btn-small" onclick="approveReport('${report.id}')">
                    <i class="fas fa-check"></i> Approve
                </button>
                <button class="btn btn-danger btn-small" onclick="rejectReport('${report.id}')">
                    <i class="fas fa-times"></i> Reject
                </button>
            </td>
        </tr>
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
    const rows = document.querySelectorAll('#pendingReportsTable tr[data-id]');
    let visibleCount = 0;
    
    rows.forEach(row => {
        const rowStatus = row.querySelector('.status-badge').textContent.toLowerCase();
        const rowType = row.getAttribute('data-type');
        
        const matchesStatus = currentReportStatusFilter === 'all' || rowStatus === currentReportStatusFilter;
        const matchesSource = currentReportSourceFilter === 'all' || rowType === currentReportSourceFilter;
        
        if (matchesStatus && matchesSource) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    showToast(`Showing ${visibleCount} reports`);
}

function viewReport(reportId) {
    showToast(`Viewing report ${reportId}`, 'info');
    // TODO: Implement view report modal
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

async function loadFaultTickets() {
    try {
        // Load unassigned tickets
        const unassignedList = document.getElementById('unassignedTicketsList');
        unassignedList.innerHTML = '<p style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> Loading...</p>';
        
        // Load active tickets
        const tbody = document.getElementById('activeTicketsBody');
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> Loading tickets...</td></tr>';
        
        // Fetch tickets from backend
        const response = await API.get('/fault-tickets');
        
        if (response.status === 'success' && response.data) {
            // Handle nested data structure: {data: {tickets: []}}
            const tickets = response.data.tickets || response.data || [];
            
            // Separate unassigned and assigned tickets based on assignments array
            const unassignedTickets = tickets.filter(t => !t.assignments || t.assignments.length === 0);
            const assignedTickets = tickets.filter(t => t.assignments && t.assignments.length > 0 && t.status !== 'Resolved' && t.status !== 'Closed');
            
            // Display unassigned tickets
            if (unassignedTickets.length > 0) {
                unassignedList.innerHTML = unassignedTickets.map(ticket => {
                    const assetName = ticket.machine_model_number || ticket.machine_name || `Machine #${ticket.machine_id}`;
                    const description = ticket.description || 'No description';
                    const reporterName = ticket.reported_by_name || ticket.reporter_full_name || 'Unknown';
                    const createdDate = new Date(ticket.created_at);
                    const formattedDate = createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    const formattedTime = createdDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    
                    // Get first line of description for title
                    const descriptionLines = description.split('\n').filter(line => line.trim());
                    const title = descriptionLines[0] || description;
                    const details = descriptionLines.slice(1).join(' ') || '';
                    
                    // Determine urgency level for styling
                    const priority = (ticket.priority || 'Medium').toLowerCase();
                    const urgencyClass = `urgency-${priority}`;
                    
                    return `
                        <div class="fault-ticket-card ${urgencyClass}">
                            <div class="ticket-card-header">
                                <div class="ticket-header-left">
                                    <span class="ticket-id">TKT-${String(ticket.id).padStart(3, '0')}</span>
                                    <h3 class="ticket-card-title">${title}</h3>
                                </div>
                                <div class="ticket-header-right">
                                    <span class="priority-badge priority-${priority}">
                                        <i class="fas fa-exclamation-circle"></i> ${priority.toUpperCase()}
                                    </span>
                                    <div class="ticket-actions-inline">
                                        <button class="btn-compact btn-view" onclick="viewTicketDetails(${ticket.id})" title="View Details">
                                            <i class="fas fa-eye"></i> <span>View</span>
                                        </button>
                                        <button class="btn-compact btn-assign" onclick="assignTicket(${ticket.id})" title="Assign Ticket">
                                            <i class="fas fa-user-plus"></i> <span>Assign</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div class="ticket-card-meta">
                                <span class="meta-item">
                                    <i class="fas fa-wrench"></i> <strong>Machine:</strong> ${assetName}
                                </span>
                                <span class="meta-item">
                                    <i class="fas fa-user"></i> <strong>Reported By:</strong> ${reporterName}
                                </span>
                                <span class="meta-item">
                                    <i class="fas fa-calendar"></i> <strong>Date:</strong> ${formattedDate}
                                </span>
                                <span class="meta-item">
                                    <i class="fas fa-clock"></i> <strong>Time:</strong> ${formattedTime}
                                </span>
                            </div>
                            ${details ? `<div class="ticket-card-description">${details}</div>` : ''}
                        </div>
                    `;
                }).join('');
            } else {
                unassignedList.innerHTML = '<p style="text-align: center; color: var(--muted);">No unassigned tickets</p>';
            }
            
            // Display assigned tickets
            if (assignedTickets.length > 0) {
                tbody.innerHTML = assignedTickets.map(ticket => {
                    const assetName = ticket.machine_model_number || ticket.machine_name || `Machine #${ticket.machine_id}`;
                    const description = ticket.description || 'No description';
                    const shortDesc = description.split('\n')[0]; // Get first line
                    
                    // Get assigned technicians names
                    const assignedTo = ticket.assignments && ticket.assignments.length > 0
                        ? ticket.assignments.map(a => a.technician_name).join(', ')
                        : 'Unassigned';
                    
                    return `
                        <tr>
                            <td>TKT-${String(ticket.id).padStart(3, '0')}</td>
                            <td>${assetName}</td>
                            <td>${shortDesc}</td>
                            <td><span class="status-badge status-${ticket.priority ? ticket.priority.toLowerCase() : 'medium'}">${(ticket.priority || 'MEDIUM').toUpperCase()}</span></td>
                            <td>${assignedTo}</td>
                            <td><span class="status-badge status-${(ticket.status || 'open').toLowerCase().replace(' ', '-')}">${(ticket.status || 'OPEN').toUpperCase()}</span></td>
                            <td>
                                <button class="btn btn-small btn-secondary" onclick="viewTicketDetails(${ticket.id})">
                                    <i class="fas fa-eye"></i> View
                                </button>
                                <button class="btn btn-small btn-primary" onclick="editTicketAssignment(${ticket.id})" style="margin-left: 5px;">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--muted);">No active tickets</td></tr>';
            }
        } else {
            throw new Error('Failed to load tickets');
        }
    } catch (error) {
        console.error('Error loading fault tickets:', error);
        document.getElementById('unassignedTicketsList').innerHTML = '<p style="text-align: center; color: var(--danger);">Error loading tickets</p>';
        document.getElementById('activeTicketsBody').innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--danger);">Error loading tickets</td></tr>';
        showToast('Failed to load fault tickets', 'error');
    }
}

function filterTicketsByStatus(status) {
    currentTicketStatusFilter = status;
    applyTicketFilters();
}

function filterTicketsBySource(source) {
    currentTicketSourceFilter = source;
    applyTicketFilters();
}

function applyTicketFilters() {
    showToast('Filters applied');
    // TODO: Implement filtering logic
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
    modal.classList.remove('active');
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
        
        // Update modal title based on mode
        const modalTitle = document.querySelector('#assignTicketModal .modal-title');
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
        
        // Store ticket ID for submission
        const assignForm = document.getElementById('assignTicketForm');
        if (assignForm) {
            assignForm.dataset.ticketId = ticketId;
        }
        
        // Show modal
        const assignModal = document.getElementById('assignTicketModal');
        if (assignModal) {
            assignModal.style.display = 'flex';
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
                    <input type="checkbox" name="technicians" value="${tech.id}">
                    <span>${tech.full_name || tech.username}</span>
                    <span class="technician-workload ${workloadClass}">${workloadText}</span>
                </label>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading technicians:', error);
        showToast('Failed to load technicians', 'error');
    }
}

async function handleAssignTicket(event) {
    event.preventDefault();
    
    const form = event.target;
    const ticketId = form.dataset.ticketId;
    
    // Get selected technicians
    const selectedTechnicians = Array.from(form.querySelectorAll('input[name="technicians"]:checked'))
        .map(cb => parseInt(cb.value));
    
    if (selectedTechnicians.length === 0) {
        showToast('Please select at least one technician', 'error');
        return;
    }
    
    const formData = new FormData(form);
    
    // Capitalize first letter of priority to match backend format
    const priority = formData.get('priority');
    const capitalizedPriority = priority.charAt(0).toUpperCase() + priority.slice(1);
    
    const assignmentData = {
        technician_ids: selectedTechnicians, // Now supports multiple technicians
        priority: capitalizedPriority,
        expected_completion_date: formData.get('expected_completion'),
        notes: formData.get('notes')
    };
    
    try {
        // Use the new assignment endpoint
        await API.post(`/fault-tickets/${ticketId}/assign`, assignmentData);
        
        // Close modal and show success
        closeAssignTicketModal();
        showToast('Ticket assigned successfully', 'success');
        
        // Reload tickets
        loadFaultTickets();
    } catch (error) {
        console.error('Error assigning ticket:', error);
        showToast(error.message || 'Failed to assign ticket', 'error');
    }
}

function closeAssignTicketModal() {
    const modal = document.getElementById('assignTicketModal');
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300); // Wait for opacity transition
    
    // Reset form
    const form = document.getElementById('assignTicketForm');
    form.reset();
    
    // Uncheck all technician checkboxes
    const checkboxes = form.querySelectorAll('input[name="technicians"]');
    checkboxes.forEach(cb => cb.checked = false);
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
                <div class="ticket-detail-section">
                    <h3>Attached Images</h3>
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
            <div class="ticket-detail-section">
                <h3>Ticket Information</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Ticket ID:</label>
                        <span>TKT-${String(ticket.id).padStart(3, '0')}</span>
                    </div>
                    <div class="detail-item">
                        <label>Status:</label>
                        <span class="status-badge status-${(ticket.status || 'open').toLowerCase().replace('_', '-')}">${(ticket.status || 'OPEN').toUpperCase().replace('_', ' ')}</span>
                    </div>
                    <div class="detail-item">
                        <label>Priority:</label>
                        <span class="status-badge status-${ticket.priority ? ticket.priority.toLowerCase() : 'normal'}">${(ticket.priority || 'NORMAL').toUpperCase()}</span>
                    </div>
                    <div class="detail-item">
                        <label>Machine:</label>
                        <span>${assetName}</span>
                    </div>
                    ${ticket.location ? `
                    <div class="detail-item">
                        <label>Location:</label>
                        <span>${ticket.location}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="ticket-detail-section">
                <h3>Description</h3>
                <p style="white-space: pre-wrap;">${ticket.description || 'No description provided'}</p>
            </div>
            
            ${imagesHTML}
            
            <div class="ticket-detail-section">
                <h3>Assignment Details</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Reported By:</label>
                        <span>${ticket.reported_by_name || ticket.reporter_full_name || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Assigned To:</label>
                        <span>${ticket.assignments && ticket.assignments.length > 0 
                            ? ticket.assignments.map(a => a.technician_name).join(', ') 
                            : 'Unassigned'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Created:</label>
                        <span>${createdDate}</span>
                    </div>
                    <div class="detail-item">
                        <label>Last Updated:</label>
                        <span>${updatedDate}</span>
                    </div>
                    ${ticket.assignments && ticket.assignments.length > 0 && ticket.assignments[0].expected_completion_date ? `
                    <div class="detail-item">
                        <label>Expected Completion:</label>
                        <span>${new Date(ticket.assignments[0].expected_completion_date).toLocaleDateString()}</span>
                    </div>
                    ` : ''}
                    ${ticket.assignments && ticket.assignments.length > 0 && ticket.assignments[0].notes ? `
                    <div class="detail-item" style="grid-column: 1 / -1;">
                        <label>Assignment Notes:</label>
                        <p style="white-space: pre-wrap; margin: 5px 0 0 0;">${ticket.assignments[0].notes}</p>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            ${ticket.resolution_notes ? `
            <div class="ticket-detail-section">
                <h3>Resolution Notes</h3>
                <p style="white-space: pre-wrap;">${ticket.resolution_notes}</p>
            </div>
            ` : ''}
        `;
        
        // Populate modal
        document.getElementById('viewTicketContent').innerHTML = detailsHTML;
        
        // Show modal
        const viewModal = document.getElementById('viewTicketModal');
        viewModal.style.display = 'flex';
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
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.style.display = 'none';
        document.getElementById('viewTicketContent').innerHTML = '';
    }, 300);
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
    showToast(`Viewing repair ${repairId} details`, 'info');
    // TODO: Implement detailed repair view modal
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
    showToast(`Viewing progress for repair ${repairId}`, 'info');
    // TODO: Implement progress view modal
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
    showToast(`Viewing budget ${budgetId} details`, 'info');
    // TODO: Implement detailed budget view modal with breakdown and garage details
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
                        <span class="status-badge status-completed">✅ Approved</span>
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
                        <span class="status-badge status-rejected">❌ Rejected</span>
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
    showToast(`Viewing details for asset ${assetId}`, 'info');
    // TODO: Implement detailed asset view modal
}

function updateAssetStatus(assetId) {
    showToast(`Updating status for asset ${assetId}`, 'info');
    // TODO: Implement status update modal
}

// ==================== TECHNICIAN ASSIGNMENTS FUNCTIONS ====================

function viewTechnicianDetails(techId) {
    showToast(`Viewing details for technician ${techId}`, 'info');
    // TODO: Implement detailed technician view modal
}

function assignNewTicket(techId) {
    showToast(`Assigning new ticket to technician ${techId}`, 'info');
    // TODO: Implement ticket assignment modal
}

// ==================== MODAL BACKDROP HANDLERS ====================

// Close modals on backdrop click
window.addEventListener('click', (event) => {
    if (event.target.classList.contains('modal') && event.target.style.display === 'block') {
        if (event.target.id === 'createTicketModal') {
            closeCreateTicketModal();
        } else if (event.target.id === 'assignTicketModal') {
            closeAssignTicketModal();
        } else if (event.target.id === 'viewTicketModal') {
            closeViewTicketModal();
        }
    }
});

// Close modals on ESC key
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        const createModal = document.getElementById('createTicketModal');
        const assignModal = document.getElementById('assignTicketModal');
        const viewModal = document.getElementById('viewTicketModal');
        
        if (createModal && createModal.style.display === 'block') {
            closeCreateTicketModal();
        } else if (assignModal && assignModal.style.display === 'block') {
            closeAssignTicketModal();
        } else if (viewModal && viewModal.style.display === 'block') {
            closeViewTicketModal();
        }
    }
});
