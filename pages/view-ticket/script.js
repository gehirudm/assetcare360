
let ticketData = null;
let currentUser = null;

// Get ticket ID from URL
function getTicketIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Show toast notification
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    toastMessage.textContent = message;

    toast.classList.remove('error');
    if (isError) {
        toast.classList.add('error');
    }

    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Show error state
function showError(message) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    document.getElementById('errorMessage').textContent = message;
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Load user data
async function loadUserData() {
    try {
        currentUser = await Auth.checkAuth();
        if (currentUser) {
            const fullName = currentUser.full_name || currentUser.name || 'User';
            document.getElementById('userName').textContent = fullName;
            document.getElementById('userAvatar').textContent = fullName.charAt(0).toUpperCase();

            if (currentUser.employee_id) {
                document.getElementById('userEmployeeId').textContent = `ID: ${currentUser.employee_id}`;
            }

            if (currentUser.role) {
                document.getElementById('userRole').textContent = currentUser.role;
            }
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Setup back button
function setupBackButton() {
    const backButton = document.getElementById('backButton');
    backButton.addEventListener('click', () => {
        if (currentUser && currentUser.role) {
            const role = currentUser.role.toLowerCase().replace(/\s+/g, '-');
            window.location.href = `/dashboard/${role}/`;
        } else {
            window.history.back();
        }
    });
}

// Load ticket details
async function loadTicketDetails() {
    const ticketId = getTicketIdFromUrl();

    if (!ticketId) {
        showError('No ticket ID provided in the URL');
        return;
    }

    try {
        const response = await API.get(`/fault-tickets/${ticketId}`);

        if (response.status === 'success' && response.data) {
            ticketData = response.data;
            displayTicketDetails(ticketData);
            loadPriorTickets(ticketData.machine_id);
        } else {
            showError(response.message || 'Failed to load ticket details');
        }
    } catch (error) {
        console.error('Error loading ticket:', error);
        showError('An error occurred while loading the ticket. Please try again.');
    }
}

// Display ticket details
function displayTicketDetails(ticket) {
    // Hide loading, show content
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';

    // Ticket ID Badge
    const ticketIdFormatted = `TKT-${String(ticket.id).padStart(3, '0')}`;
    document.getElementById('ticketIdBadge').textContent = ticketIdFormatted;
    document.getElementById('ticketId').textContent = ticketIdFormatted;

    // Basic Info
    document.getElementById('ticketCreatedDate').textContent = formatDate(ticket.created_at);
    document.getElementById('ticketReporter').textContent = ticket.reported_by_name || ticket.reporter_full_name || 'Unknown';
    document.getElementById('ticketLocation').textContent = ticket.location || 'Not specified';
    document.getElementById('ticketDescription').textContent = ticket.description || 'No description provided';

    // Priority Badge
    const priority = (ticket.priority || 'Medium').toLowerCase();
    const priorityBadge = `<span class="status-badge priority-${priority}">
                <i class="fas fa-exclamation-circle"></i> ${ticket.priority || 'Medium'}
            </span>`;
    document.getElementById('ticketPriority').innerHTML = priorityBadge;

    // Status Badge
    const status = (ticket.status || 'New').toLowerCase().replace(/\s+/g, '-');
    const statusBadge = `<span class="status-badge status-${status}">
                <i class="fas fa-circle"></i> ${ticket.status || 'New'}
            </span>`;
    document.getElementById('ticketStatus').innerHTML = statusBadge;

    // Machine/Asset Info
    document.getElementById('machineId').textContent = ticket.machine_id || 'N/A';
    document.getElementById('machineModel').textContent = ticket.machine_model_number || 'N/A';
    document.getElementById('machineName').textContent = ticket.machine_name || 'N/A';
    document.getElementById('machineType').textContent = ticket.machine_type || 'N/A';

    // Display Photos if available
    if (ticket.photos && ticket.photos.length > 0) {
        document.getElementById('photosSection').style.display = 'block';
        const photosContainer = document.getElementById('ticketPhotos');
        photosContainer.className = 'photo-gallery';
        photosContainer.innerHTML = ticket.photos.map((photo, index) => `
            <div class="photo-gallery-item" onclick="openImageViewer('${photo.url}')">
                <img src="${photo.url}" alt="Ticket photo ${index + 1}">
                <div class="photo-overlay">
                    <i class="fas fa-search-plus"></i> View
                </div>
            </div>
        `).join('');
    }

    // Display Assignments if available
    if (ticket.assignments && ticket.assignments.length > 0) {
        document.getElementById('assignmentsCard').style.display = 'block';
        const assignmentsList = document.getElementById('assignmentsList');
        assignmentsList.innerHTML = ticket.assignments.map(assignment => {
            const name = assignment.technician_name || 'Unknown';
            const avatar = name.charAt(0).toUpperCase();
            const assignedDate = formatDate(assignment.assigned_at);
            const expectedDate = assignment.expected_completion_date ? formatDate(assignment.expected_completion_date) : 'Not set';

            return `
                        <div class="assignment-item">
                            <div class="assignment-avatar">${avatar}</div>
                            <div class="assignment-details">
                                <div class="assignment-name">${name}</div>
                                <div class="assignment-meta">
                                    <span><i class="fas fa-envelope"></i> ${assignment.technician_email || 'N/A'}</span>
                                    <span><i class="fas fa-phone"></i> ${assignment.technician_phone || 'N/A'}</span>
                                </div>
                                <div class="assignment-meta">
                                    <span><i class="fas fa-calendar-plus"></i> Assigned: ${assignedDate}</span>
                                    <span><i class="fas fa-calendar-check"></i> Expected: ${expectedDate}</span>
                                </div>
                                ${assignment.notes ? `<div style="margin-top: 8px; font-size: 0.9rem; color: var(--text-600);"><i class="fas fa-sticky-note"></i> ${assignment.notes}</div>` : ''}
                            </div>
                        </div>
                    `;
        }).join('');
    }

    // Add action buttons based on user role
    displayActionButtons(ticket);
}

// Display action buttons based on role
function displayActionButtons(ticket) {
    const actionButtons = document.getElementById('actionButtons');
    let buttons = '';

    if (currentUser) {
        const role = currentUser.role;

        if (role === 'Technical Officer') {
            if (ticket.status === 'New' || ticket.status === 'Pending') {
                buttons += `
                            <button class="btn btn-success" onclick="acceptTicket()">
                                <i class="fas fa-check"></i> Accept Ticket
                            </button>
                        `;
            }
            if (ticket.status === 'In Progress') {
                buttons += `
                            <button class="btn btn-primary" onclick="updateProgress()">
                                <i class="fas fa-tasks"></i> Update Progress
                            </button>
                            <button class="btn btn-success" onclick="markComplete()">
                                <i class="fas fa-check-double"></i> Mark Complete
                            </button>
                        `;
            }
        } else if (role === 'Supervisor' || role === 'Admin') {
            buttons += `
                        <button class="btn btn-primary" onclick="editTicket()">
                            <i class="fas fa-edit"></i> Edit Ticket
                        </button>
                        <button class="btn btn-primary" onclick="assignTechnicians()">
                            <i class="fas fa-user-plus"></i> Assign Technicians
                        </button>
                    `;
        }
    }

    if (buttons) {
        actionButtons.innerHTML = buttons;
    }
}

// Load prior tickets for the same machine
async function loadPriorTickets(machineId) {
    const priorTicketsList = document.getElementById('priorTicketsList');
    const viewAllBtn = document.getElementById('viewAllTicketsBtn');

    try {
        const response = await API.get(`/fault-tickets?machine_id=${machineId}`);

        if (response.status === 'success' && response.data) {
            const tickets = response.data.tickets || response.data || [];
            const currentTicketId = ticketData.id;

            // Filter out current ticket and show only last 5
            const priorTickets = tickets
                .filter(t => t.id !== currentTicketId)
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 5);

            const totalPriorTickets = tickets.filter(t => t.id !== currentTicketId).length;

            if (priorTickets.length > 0) {
                // Show View All button if there are more than 5 tickets
                if (totalPriorTickets > 5) {
                    viewAllBtn.style.display = 'inline-flex';
                }
                
                priorTicketsList.innerHTML = priorTickets.map(ticket => {
                    const ticketIdFormatted = `TKT-${String(ticket.id).padStart(3, '0')}`;
                    const status = (ticket.status || 'New').toLowerCase().replace(/\s+/g, '-');
                    const priority = (ticket.priority || 'Medium').toLowerCase();

                    return `
                        <div class="ticket-history-item" onclick="viewTicket(${ticket.id})">
                            <div class="ticket-history-header">
                                <span class="ticket-history-id">${ticketIdFormatted}</span>
                                <span class="status-badge status-${status}">${ticket.status || 'New'}</span>
                            </div>
                            <div class="ticket-history-desc">
                                ${ticket.description || 'No description'}
                            </div>
                            <div class="ticket-history-meta">
                                <span><i class="fas fa-calendar"></i> ${formatDate(ticket.created_at)}</span>
                                <span><i class="fas fa-flag"></i> ${ticket.priority || 'Medium'}</span>
                            </div>
                        </div>
                    `;
                }).join('');
                
                // Always show View All button if there are any prior tickets
                if (totalPriorTickets > 0) {
                    viewAllBtn.style.display = 'inline-flex';
                    if (totalPriorTickets > 5) {
                        viewAllBtn.innerHTML = `<i class="fas fa-list"></i> View All (${totalPriorTickets})`;
                    }
                }
            } else {
                priorTicketsList.innerHTML = `
                    <p style="text-align: center; color: var(--muted); padding: 20px;">
                        <i class="fas fa-info-circle"></i> No prior tickets found for this asset
                    </p>
                `;
            }
        }
    } catch (error) {
        console.error('Error loading prior tickets:', error);
        priorTicketsList.innerHTML = `
            <p style="text-align: center; color: var(--danger); padding: 20px;">
                <i class="fas fa-exclamation-triangle"></i> Error loading ticket history
                    </p>
                `;
    }
}

// View another ticket
function viewTicket(ticketId) {
    window.location.href = `/view-ticket/?id=${ticketId}`;
}

// Logout functions
function handleLogout() {
    document.getElementById('logoutModal').classList.add('active');
}

function closeLogoutModal() {
    document.getElementById('logoutModal').classList.remove('active');
}

function confirmLogout() {
    Auth.logout();
}

// Image viewer functions
function openImageViewer(imageUrl) {
    const modal = document.getElementById('imageViewerModal');
    const img = document.getElementById('viewerImage');
    img.src = imageUrl;
    modal.classList.add('active');
}

function closeImageViewer() {
    const modal = document.getElementById('imageViewerModal');
    modal.classList.remove('active');
}

// All tickets modal functions
let allMachineTickets = [];

async function openAllTicketsModal() {
    const modal = document.getElementById('allTicketsModal');
    const content = document.getElementById('allTicketsContent');
    const assetName = document.getElementById('modalAssetName');
    
    modal.classList.add('active');
    
    // Set asset name
    if (ticketData) {
        assetName.textContent = ticketData.machine_name || ticketData.machine_model_number || `Asset #${ticketData.machine_id}`;
    }
    
    // Show loading
    content.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Loading all tickets...</p>';
    
    try {
        const response = await API.get(`/fault-tickets?machine_id=${ticketData.machine_id}`);
        
        if (response.status === 'success' && response.data) {
            const tickets = response.data.tickets || response.data || [];
            allMachineTickets = tickets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
            if (allMachineTickets.length > 0) {
                renderAllTickets();
            } else {
                content.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 40px;"><i class="fas fa-info-circle"></i> No tickets found for this asset</p>';
            }
        } else {
            content.innerHTML = '<p style="text-align: center; color: var(--danger); padding: 40px;"><i class="fas fa-exclamation-triangle"></i> Error loading tickets</p>';
        }
    } catch (error) {
        console.error('Error loading all tickets:', error);
        content.innerHTML = '<p style="text-align: center; color: var(--danger); padding: 40px;"><i class="fas fa-exclamation-triangle"></i> Error loading tickets</p>';
    }
}

function closeAllTicketsModal() {
    const modal = document.getElementById('allTicketsModal');
    modal.classList.remove('active');
}

function renderAllTickets() {
    const content = document.getElementById('allTicketsContent');
    const currentTicketId = ticketData.id;
    
    content.innerHTML = allMachineTickets.map(ticket => {
        const ticketIdFormatted = `TKT-${String(ticket.id).padStart(3, '0')}`;
        const status = (ticket.status || 'New').toLowerCase().replace(/\s+/g, '-');
        const priority = (ticket.priority || 'Medium').toLowerCase();
        const isCurrent = ticket.id === currentTicketId;
        
        let photosHtml = '';
        if (ticket.photos && ticket.photos.length > 0) {
            photosHtml = `
                <div class="modal-ticket-images">
                    ${ticket.photos.slice(0, 4).map(photo => `
                        <img src="${photo.url}" alt="Ticket image" onclick="event.stopPropagation(); openImageViewer('${photo.url}')">
                    `).join('')}
                    ${ticket.photos.length > 4 ? `<div style="display: flex; align-items: center; justify-content: center; background: var(--stone-200); color: var(--muted); font-weight: 600; border-radius: 6px;">+${ticket.photos.length - 4} more</div>` : ''}
                </div>
            `;
        }
        
        return `
            <div class="modal-ticket-item ${isCurrent ? 'current-ticket' : ''}" onclick="viewTicket(${ticket.id})" style="${isCurrent ? 'border-left-color: var(--kelly-green); background: #f0fdf4;' : ''}">
                <div class="modal-ticket-header">
                    <span class="modal-ticket-id">
                        ${ticketIdFormatted}
                        ${isCurrent ? '<span style="font-size: 0.75rem; background: var(--kelly-green); color: white; padding: 2px 8px; border-radius: 10px; margin-left: 8px; font-weight: 600;">CURRENT</span>' : ''}
                    </span>
                    <span class="status-badge status-${status}">
                        <i class="fas fa-circle"></i> ${ticket.status || 'New'}
                    </span>
                </div>
                <div class="modal-ticket-desc">
                    ${ticket.description || 'No description'}
                </div>
                <div class="modal-ticket-meta">
                    <span><i class="fas fa-calendar"></i> ${formatDate(ticket.created_at)}</span>
                    <span><i class="fas fa-flag"></i> Priority: <strong style="color: var(--text-900);">${ticket.priority || 'Medium'}</strong></span>
                    <span><i class="fas fa-user"></i> ${ticket.reported_by_name || ticket.reporter_full_name || 'Unknown'}</span>
                    ${ticket.location ? `<span><i class="fas fa-map-marker-alt"></i> ${ticket.location}</span>` : ''}
                </div>
                ${photosHtml}
                ${!isCurrent ? '<div style="margin-top: 10px; font-size: 0.85rem; color: var(--royal-blue); font-weight: 600;"><i class="fas fa-arrow-right"></i> Click to view details</div>' : ''}
            </div>
        `;
    }).join('');
}

function viewTicket(ticketId) {
    if (ticketId === ticketData.id) {
        closeAllTicketsModal();
        return;
    }
    window.location.href = `/view-ticket/?id=${ticketId}`;
}

// Action functions (placeholders)
function acceptTicket() {
    showToast('Ticket accepted! Redirecting to update page...');
    // Implement accept ticket logic
}

function updateProgress() {
    showToast('Opening progress update form...');
    // Implement update progress logic
}

function markComplete() {
    showToast('Opening completion form...');
    // Implement mark complete logic
}

function editTicket() {
    showToast('Opening edit form...');
    // Implement edit logic
}

function assignTechnicians() {
    showToast('Opening assignment form...');
    // Implement assignment logic
}

// Initialize on page load
(async function initialize() {
    await loadUserData();
    setupBackButton();
    await loadTicketDetails();
})();
