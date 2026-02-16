
// Store ticket data
let allTickets = [];
let allInventory = [];
let currentInventoryFilter = 'all';
let currentUser = null;

// Store requested spare parts per ticket (keyed by ticket numeric id)
let requestedPartsMap = {};

// Track the current ticket being updated in the update work modal
let currentUpdateTicketId = null;

// Navigation functionality
function navigateTo(sectionId) {
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));

    const targetNav = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
    if (targetNav) {
        targetNav.classList.add('active');
    }

    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
}

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function () {
        const sectionId = this.getAttribute('data-section');
        navigateTo(sectionId);
    });
});

// Modal functionality
function openModal(modalId, ticketId = '') {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');

        if (ticketId) {
            if (modalId === 'processTicketModal') {
                document.getElementById('processTicketId').value = ticketId;
            } else if (modalId === 'updateWorkModal') {
                document.getElementById('updateTicketId').value = ticketId;
            } else if (modalId === 'markDoneModal') {
                document.getElementById('doneTicketId').value = ticketId;
            } else if (modalId === 'viewDetailsModal') {
                showTicketDetails(ticketId);
            }
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        // Remove dynamically created modals from DOM after transition
        if (modalId.startsWith('detailsModal_')) {
            setTimeout(() => modal.remove(), 300);
        }
    }
}

// Add another spare part field dynamically
function addPartField() {
    const container = document.getElementById('sparePartsContainer');
    const newPartItem = document.createElement('div');
    newPartItem.className = 'spare-part-item';
    newPartItem.style.cssText = 'background: #f8f9fa; border-radius: 8px; padding: 15px; margin-bottom: 10px; position: relative;';
    newPartItem.innerHTML = `
                <button type="button" onclick="this.parentElement.remove()" style="position: absolute; top: 10px; right: 10px; background: var(--danger); color: white; border: none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer; font-size: 14px;">×</button>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Part Name</label>
                        <select class="form-select" required>
                            <option value="">Select Part</option>
                            <option value="BP-001">Brake Pads - BP-001</option>
                            <option value="OF-205">Oil Filter - OF-205</option>
                            <option value="HYD-250">Hydraulic Pump - HYD-250</option>
                            <option value="ENG-301">Engine Oil - ENG-301</option>
                            <option value="TYR-150">Tyres - TYR-150</option>
                            <option value="BAT-200">Battery - BAT-200</option>
                            <option value="GAS-400">Gas Cylinder - GAS-400</option>
                            <option value="VAL-350">Pressure Valve - VAL-350</option>
                            <option value="FIL-180">Air Filter - FIL-180</option>
                            <option value="BEL-220">Belt - BEL-220</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Quantity</label>
                        <input type="number" class="form-input" min="1" placeholder="Qty" required>
                    </div>
                </div>
            `;
    container.appendChild(newPartItem);
}

// Toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;

    if (type === 'success') {
        toast.style.background = 'var(--kelly-green)';
    } else if (type === 'warning') {
        toast.style.background = 'var(--warn)';
        toast.style.color = '#000';
    } else if (type === 'error') {
        toast.style.background = 'var(--danger)';
    }

    toast.style.display = 'block';

    setTimeout(() => {
        toast.style.display = 'none';
        toast.style.background = 'var(--kelly-green)';
        toast.style.color = 'white';
    }, 4000);
}

// Filter tickets by status
function filterTicketsByStatus(status) {
    const tickets = document.querySelectorAll('#allTicketsList .ticket-item');
    const noTicketsMessage = document.getElementById('noTicketsMessage');
    const ticketCount = document.getElementById('ticketCount');
    const filterButtons = document.querySelectorAll('#ticketFilterTabs .filter-btn');
    let visibleCount = 0;

    // Update active button styling
    filterButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Find and activate the clicked button
    const clickedButton = event ? event.target : filterButtons[0];
    clickedButton.classList.add('active');

    // Filter tickets
    tickets.forEach(ticket => {
        const ticketStatus = ticket.getAttribute('data-status');
        if (status === 'all' || ticketStatus === status) {
            ticket.style.display = '';
            visibleCount++;
        } else {
            ticket.style.display = 'none';
        }
    });

    // Show/hide no tickets message
    if (visibleCount === 0) {
        noTicketsMessage.style.display = 'block';
    } else {
        noTicketsMessage.style.display = 'none';
    }

    // Update ticket count
    ticketCount.textContent = `${visibleCount} ticket${visibleCount !== 1 ? 's' : ''}`;
}

// Load tickets from backend
async function loadTickets() {
    const ticketsList = document.getElementById('allTicketsList');
    const ticketCount = document.getElementById('ticketCount');
    
    // Show loading state
    ticketsList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--muted);"><i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i><p style="margin-top: 15px;">Loading tickets...</p></div>';
    
    try {
        const response = await API.get('/fault-tickets');
        
        if (response.status === 'success' && response.data) {
            const tickets = response.data.tickets || response.data || [];
            
            console.log('=== DEBUG: Technical Officer Ticket Filtering ===');
            console.log('Current user ID:', currentUser?.id, 'Type:', typeof currentUser?.id);
            console.log('Total tickets received:', tickets.length);
            
            // Filter tickets assigned to current user
            allTickets = tickets.filter(ticket => {
                // Check if ticket has assignments and if current user is assigned
                if (ticket.assignments && Array.isArray(ticket.assignments)) {
                    const hasMatch = ticket.assignments.some(assignment => {
                        // Use loose equality to handle string/number mismatches
                        const matches = assignment.assigned_to == currentUser.id;
                        if (assignment.status === 'Active') {
                            console.log(`Ticket ${ticket.ticket_id}: assignment.assigned_to=${assignment.assigned_to} (${typeof assignment.assigned_to}) vs currentUser.id=${currentUser.id} (${typeof currentUser.id}) => ${matches ? 'MATCH' : 'NO MATCH'}`);
                        }
                        return matches;
                    });
                    return hasMatch;
                }
                return false;
            });
            
            console.log('Filtered tickets for current user:', allTickets.length);
            
            if (allTickets.length > 0) {
                renderTickets(allTickets);
                ticketCount.textContent = `${allTickets.length} ticket${allTickets.length !== 1 ? 's' : ''}`;
                
                // Update dashboard counts
                updateDashboardCounts(allTickets);
            } else {
                ticketsList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--muted);"><i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 15px;"></i><p>No tickets assigned to you yet</p></div>';
                ticketCount.textContent = '0 tickets';
            }
        } else {
            throw new Error(response.message || 'Failed to load tickets');
        }
    } catch (error) {
        console.error('Error loading tickets:', error);
        ticketsList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--danger);"><i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 15px;"></i><p>Error loading tickets. Please try again.</p></div>';
    }
}

// Helper function to get display ticket ID
function getDisplayTicketId(ticket) {
    // Use breakdown_report_id if available (this is what supervisor sees)
    // Otherwise fall back to ticket_id
    // This ensures consistency across all dashboards
    if (ticket.breakdown_report_id) {
        return ticket.breakdown_report_id;
    }
    return ticket.ticket_id || 'N/A';
}

// Render tickets
function renderTickets(tickets) {
    const ticketsList = document.getElementById('allTicketsList');
    
    if (tickets.length === 0) {
        ticketsList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--muted);"><i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 15px;"></i><p>No tickets found</p></div>';
        return;
    }
    
    ticketsList.innerHTML = tickets.map(ticket => {
        const ticketIdFormatted = getDisplayTicketId(ticket);
        
        // Map Open/Assigned to Pending for display, keep others as-is
        let ticketStatus = ticket.status || 'Pending';
        if (ticketStatus.toLowerCase() === 'open' || ticketStatus.toLowerCase() === 'assigned') {
            ticketStatus = 'Pending';
        }
        
        const status = ticketStatus.toLowerCase().replace(/\s+/g, '-');
        const statusDisplay = ticketStatus.toUpperCase();
        const priority = (ticket.priority || 'Medium').toLowerCase();
        const priorityDisplay = (ticket.priority || 'Medium').toUpperCase();
        const assetName = ticket.machine_model_number || ticket.machine_name || `Machine #${ticket.machine_id}`;
        const reporterName = ticket.reported_by_name || ticket.reporter_full_name || 'Unknown';
        const description = ticket.description || 'No description';
        const createdDate = new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        // Get assignment details
        const assignment = ticket.assignments && ticket.assignments.length > 0 ? ticket.assignments[0] : null;
        const assignedBy = assignment ? (assignment.assigned_by_name || 'Supervisor') : 'Unknown';
        const assignedDate = assignment ? new Date(assignment.assigned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : createdDate;
        
        // Show different action buttons based on ticket status
        let actionButtons = '';
        if (status === 'pending') {
            // Pending → Request Spare Parts
            actionButtons = `
                <button class="btn btn-mini" onclick="requestSparePartsForTicket(${ticket.id})" style="background: var(--tang-blue); color: white;">
                    <i class="fas fa-tools"></i> Request Spare Parts
                </button>
                <button class="btn btn-primary btn-mini" onclick="viewTicket(${ticket.id})">
                    <i class="fas fa-eye"></i> VIEW
                </button>
            `;
        } else if (status === 'waiting-for-spare-parts') {
            // Waiting for Parts → show waiting indicator
            actionButtons = `
                <span class="btn btn-mini" style="background: #f59e0b; color: #000; cursor: default;">
                    <i class="fas fa-hourglass-half"></i> Awaiting Approval
                </span>
                <button class="btn btn-primary btn-mini" onclick="viewTicket(${ticket.id})">
                    <i class="fas fa-eye"></i> VIEW
                </button>
            `;
        } else if (status === 'parts-approved') {
            // Parts Approved → START button
            actionButtons = `
                <button class="btn btn-mini" onclick="startTicketWork(${ticket.id})" style="background: var(--kelly-green); color: white;">
                    <i class="fas fa-play"></i> START
                </button>
                <button class="btn btn-primary btn-mini" onclick="viewTicket(${ticket.id})">
                    <i class="fas fa-eye"></i> VIEW
                </button>
            `;
        } else if (status === 'in-progress') {
            // In Progress → UPDATE button
            actionButtons = `
                <button class="btn btn-warning btn-mini" onclick="updateWork(${ticket.id})">
                    <i class="fas fa-edit"></i> UPDATE
                </button>
                <button class="btn btn-primary btn-mini" onclick="viewTicket(${ticket.id})">
                    <i class="fas fa-eye"></i> VIEW
                </button>
            `;
        } else if (status === 'resolved' || status === 'completed' || status === 'closed') {
            // Resolved/Completed/Closed → show done badge + VIEW
            actionButtons = `
                <span class="btn btn-mini" style="background: #10b981; color: white; cursor: default;">
                    <i class="fas fa-check-circle"></i> Done
                </span>
                <button class="btn btn-primary btn-mini" onclick="viewTicket(${ticket.id})">
                    <i class="fas fa-eye"></i> VIEW
                </button>
            `;
        } else {
            actionButtons = `
                <button class="btn btn-primary btn-mini" onclick="viewTicket(${ticket.id})">
                    <i class="fas fa-eye"></i> VIEW
                </button>
            `;
        }
        
        return `
            <div class="ticket-item" data-status="${status}">
                <div class="ticket-details">
                    <strong>${ticketIdFormatted}</strong>
                    <div class="ticket-meta">
                        Equipment: ${assetName} | Reporter: ${reporterName}
                    </div>
                    <div class="ticket-issue">${description}</div>
                    <div class="ticket-meta">
                        Assigned by: ${assignedBy} | 
                        <span class="status-text status-${priority}">${priorityDisplay}</span> | 
                        <span class="status-text status-${status}">${statusDisplay}</span>
                    </div>
                </div>
                <div class="ticket-actions">
                    <div class="action-buttons">
                        ${actionButtons}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Update dashboard counts
function updateDashboardCounts(tickets) {
    const newCount = tickets.filter(t => {
        const status = (t.status || 'New').toLowerCase();
        return status === 'new' || status === 'pending' || status === 'open' || status === 'assigned';
    }).length;
    
    const waitingPartsCount = tickets.filter(t => 
        (t.status || '').toLowerCase() === 'waiting for spare parts'
    ).length;
    
    const partsApprovedCount = tickets.filter(t => 
        (t.status || '').toLowerCase() === 'parts approved'
    ).length;
    
    const inProgressCount = tickets.filter(t => 
        (t.status || '').toLowerCase() === 'in progress'
    ).length;
    
    const completedToday = tickets.filter(t => {
        const status = (t.status || '').toLowerCase();
        const isCompleted = status === 'completed' || status === 'resolved';
        if (!isCompleted) return false;
        
        const today = new Date();
        const updatedDate = new Date(t.updated_at);
        return updatedDate.toDateString() === today.toDateString();
    }).length;
    
    const dashNewCount = document.getElementById('dashNewCount');
    const dashProgressCount = document.getElementById('dashProgressCount');
    const dashCompleteCount = document.getElementById('dashCompleteCount');
    
    if (dashNewCount) dashNewCount.textContent = newCount;
    if (dashProgressCount) dashProgressCount.textContent = inProgressCount;
    if (dashCompleteCount) dashCompleteCount.textContent = completedToday;
}

// View ticket details
async function viewTicket(ticketId) {
    const ticket = allTickets.find(t => t.id === ticketId);
    if (!ticket) {
        showToast('Ticket not found', 'error');
        return;
    }
    
    const ticketIdFormatted = getDisplayTicketId(ticket);
    const status = (ticket.status || 'Open').toLowerCase().replace(/\s+/g, '-');
    const statusDisplay = (ticket.status || 'Open').toUpperCase();
    const priority = (ticket.priority || 'Medium').toLowerCase();
    const priorityDisplay = (ticket.priority || 'Medium').toUpperCase();
    const assetName = ticket.machine_model_number || ticket.machine_name || `Machine #${ticket.machine_id}`;
    const reporterName = ticket.reported_by_name || ticket.reporter_full_name || 'Unknown';
    const description = ticket.description || 'No description';
    const createdDate = new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const updatedDate = ticket.updated_at ? new Date(ticket.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
    
    const assignment = ticket.assignments && ticket.assignments.length > 0 ? ticket.assignments[0] : null;
    const assignedBy = assignment ? (assignment.assigned_by_name || 'Supervisor') : 'N/A';
    const assignedDate = assignment ? new Date(assignment.assigned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
    
    // Fetch spare part requests for this ticket to get approval/rejection notes
    let sparePartsSection = '';
    try {
        const sparePartsResponse = await API.get(`/spare-part-requests/ticket/${ticketId}`);
        if (sparePartsResponse.status === 'success' && sparePartsResponse.data && sparePartsResponse.data.length > 0) {
            const requests = sparePartsResponse.data;
            sparePartsSection = requests.map(request => {
                const statusClass = request.status === 'Approved' ? 'success' : request.status === 'Rejected' ? 'danger' : 'warning';
                const statusIcon = request.status === 'Approved' ? 'check-circle' : request.status === 'Rejected' ? 'times-circle' : 'clock';
                const reviewedDate = request.reviewed_at ? new Date(request.reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
                
                return `
                    <div class="form-section" style="background-color: ${request.status === 'Approved' ? '#f0fdf4' : request.status === 'Rejected' ? '#fef2f2' : '#fefce8'}; border-left: 4px solid ${request.status === 'Approved' ? '#10b981' : request.status === 'Rejected' ? '#ef4444' : '#f59e0b'}; padding: 12px; margin-bottom: 10px;">
                        <h5><i class="fas fa-${statusIcon}" style="color: ${request.status === 'Approved' ? '#10b981' : request.status === 'Rejected' ? '#ef4444' : '#f59e0b'};"></i> Spare Parts Request - <span class="status-text status-${statusClass}">${request.status.toUpperCase()}</span></h5>
                        ${request.review_notes ? `
                            <p><strong>${request.status === 'Approved' ? 'Approval' : 'Rejection'} Notes:</strong></p>
                            <p style="background: white; padding: 10px; border-radius: 6px; margin-top: 8px; font-style: italic; color: #374151;">${request.review_notes}</p>
                        ` : ''}
                        ${request.reviewed_by_name ? `<p style="margin-top: 8px;"><strong>Reviewed By:</strong> ${request.reviewed_by_name} (Inventory Manager)</p>` : ''}
                        ${request.reviewed_at ? `<p><strong>Review Date:</strong> ${reviewedDate}</p>` : ''}
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error fetching spare parts info:', error);
    }
    
    const modal = createDetailsModal('Ticket Details', `
        <div class="form-section">
            <h5><i class="fas fa-ticket-alt"></i> Ticket Information</h5>
            <p><strong>Ticket ID:</strong> ${ticketIdFormatted}</p>
            <p><strong>Priority:</strong> <span class="status-text status-${priority}">${priorityDisplay}</span></p>
            <p><strong>Status:</strong> <span class="status-text status-${status}">${statusDisplay}</span></p>
            <p><strong>Created Date:</strong> ${createdDate}</p>
            <p><strong>Last Updated:</strong> ${updatedDate}</p>
        </div>
        <div class="form-section">
            <h5><i class="fas fa-cogs"></i> Equipment & Issue Details</h5>
            <p><strong>Equipment/Asset:</strong> ${assetName}</p>
            <p><strong>Machine ID:</strong> ${ticket.machine_id || 'N/A'}</p>
            <p><strong>Reported By:</strong> ${reporterName}</p>
            <p><strong>Issue Description:</strong> ${description}</p>
        </div>
        <div class="form-section">
            <h5><i class="fas fa-user-tag"></i> Assignment Details</h5>
            <p><strong>Assigned By:</strong> ${assignedBy}</p>
            <p><strong>Assigned Date:</strong> ${assignedDate}</p>
            ${assignment && assignment.notes ? `<p><strong>Assignment Notes:</strong> ${assignment.notes}</p>` : ''}
        </div>
        ${sparePartsSection}
        ${ticket.resolution_notes || ticket.work_done ? `
            <div class="form-section">
                <h5><i class="fas fa-check-circle"></i> Work Progress / Resolution</h5>
                <p>${ticket.resolution_notes || ticket.work_done}</p>
            </div>
        ` : ''}
    `);
    
    document.body.appendChild(modal);
    modal.classList.add('active');
}

// Process ticket (start work)
function processTicket(ticketId) {
    openModal('processTicketModal', ticketId);
}

// Request spare parts for a ticket - opens the request parts form
function requestSparePartsForTicket(ticketId) {
    const ticket = allTickets.find(t => t.id === ticketId);
    if (!ticket) {
        showToast('Ticket not found', 'error');
        return;
    }
    
    const ticketIdFormatted = getDisplayTicketId(ticket);
    const assetName = ticket.machine_model_number || ticket.machine_name || `Machine #${ticket.machine_id}`;
    const priority = ticket.priority || 'Medium';
    const description = ticket.description || 'No description provided';
    const location = ticket.location || 'Not specified';
    const reporterName = ticket.reported_by_name || ticket.reporter_full_name || 'Unknown';
    const createdDate = ticket.created_at ? new Date(ticket.created_at).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }) : 'Unknown';
    
    // Pre-fill the request parts form with ticket data
    document.getElementById('relatedTicketId').value = ticketIdFormatted;
    document.getElementById('requestingTicketId').value = ticketId;
    
    // Pre-fill equipment field
    const equipmentInput = document.getElementById('equipmentInput');
    if (equipmentInput) {
        equipmentInput.value = assetName;
        equipmentInput.readOnly = true;
        equipmentInput.style.backgroundColor = '#f0f0f0';
    }
    
    // Pre-fill location field
    const locationInput = document.getElementById('locationInput');
    if (locationInput) {
        locationInput.value = location;
    }
    
    // Pre-fill priority
    const prioritySelect = document.getElementById('prioritySelect');
    if (prioritySelect) {
        prioritySelect.value = priority.toLowerCase();
    }
    
    // Pre-fill reported by field
    const reportedByInput = document.getElementById('reportedByInput');
    if (reportedByInput) {
        reportedByInput.value = reporterName;
    }
    
    // Pre-fill reported date field
    const reportedDateInput = document.getElementById('reportedDateInput');
    if (reportedDateInput) {
        reportedDateInput.value = createdDate;
    }
    
    // Pre-fill original issue description
    const originalIssueTextarea = document.getElementById('originalIssueTextarea');
    if (originalIssueTextarea) {
        originalIssueTextarea.value = description;
    }
    
    // Clear additional notes
    const additionalNotesTextarea = document.getElementById('additionalNotesTextarea');
    if (additionalNotesTextarea) {
        additionalNotesTextarea.value = '';
    }
    
    // Reset "No Spare Parts Needed" checkbox
    const noPartsCheckbox = document.getElementById('noSparePartsNeeded');
    if (noPartsCheckbox) {
        noPartsCheckbox.checked = false;
        toggleSparePartsSection(false);
    }
    
    // Open request parts modal
    openModal('requestPartsModal');
}

// Toggle spare parts section visibility
function toggleSparePartsSection(hide) {
    const sparePartsSection = document.getElementById('sparePartsSection');
    if (sparePartsSection) {
        sparePartsSection.style.display = hide ? 'none' : 'block';
    }
}

// Update work progress
async function updateWork(ticketId) {
    const ticket = allTickets.find(t => t.id === ticketId);
    currentUpdateTicketId = ticketId; // Store for completeTicketWork to use
    
    // Pre-fill the ticket ID in VBD/RBD/MBD format
    const ticketIdFormatted = ticket ? getDisplayTicketId(ticket) : ticketId;
    document.getElementById('updateTicketId').value = ticketIdFormatted;
    
    // Populate the Parts Used section with requested parts as checkboxes
    const container = document.getElementById('updatePartsUsedContainer');
    let requestedParts = requestedPartsMap[ticketId] || [];
    
    // If no local data, fetch from API (e.g. after page refresh)
    if (requestedParts.length === 0) {
        try {
            const res = await API.get(`/spare-part-requests/ticket/${ticketId}`);
            if (res.status === 'success' && res.data && res.data.length > 0) {
                const allItems = [];
                res.data.forEach(req => {
                    if (req.items) {
                        req.items.forEach(item => {
                            allItems.push(item.part_name);
                        });
                    }
                });
                if (allItems.length > 0) {
                    requestedParts = allItems;
                    requestedPartsMap[ticketId] = allItems;
                }
            }
        } catch (err) {
            console.error('Error fetching spare part requests:', err);
        }
    }
    
    if (requestedParts.length > 0) {
        container.innerHTML = requestedParts.map((part, index) => `
            <label style="display: flex; align-items: center; gap: 10px; padding: 8px 4px; border-bottom: 1px solid #eee; cursor: pointer; font-size: 0.95rem;">
                <input type="checkbox" name="partsUsed" value="${part}" style="width: 18px; height: 18px; accent-color: var(--tang-blue);">
                <span>${part}</span>
            </label>
        `).join('');
    } else {
        container.innerHTML = '<p style="color: #999; font-size: 0.9rem; margin: 0;">No spare parts were requested for this ticket.</p>';
    }
    
    // Open the modal (don't pass ticketId so openModal doesn't overwrite our formatted ID)
    const modal = document.getElementById('updateWorkModal');
    if (modal) {
        modal.classList.add('active');
    }
}

// Mark ticket as finished / completed
async function completeTicketWork() {
    if (!currentUpdateTicketId) {
        showToast('No ticket selected', 'error');
        return;
    }
    
    const ticket = allTickets.find(t => t.id === currentUpdateTicketId);
    const ticketIdFormatted = ticket ? getDisplayTicketId(ticket) : currentUpdateTicketId;
    
    // Get work summary from the form
    const workDoneTextarea = document.querySelector('#updateWorkForm textarea');
    const workSummary = workDoneTextarea ? workDoneTextarea.value.trim() : '';
    
    createConfirmationDialog(
        'Mark Ticket as Finished',
        `Are you sure you want to mark <strong>${ticketIdFormatted}</strong> as finished?<br><br>This will change the status to <strong>Resolved</strong> across all related records.`,
        async () => {
            try {
                const response = await API.post(`/fault-tickets/${currentUpdateTicketId}/complete`, {
                    work_summary: workSummary
                });
                
                if (response.status === 'success') {
                    // Update local ticket data
                    const ticketIndex = allTickets.findIndex(t => t.id == currentUpdateTicketId);
                    if (ticketIndex !== -1) {
                        allTickets[ticketIndex].status = 'Resolved';
                    }
                    
                    // Re-render tickets and update counts
                    renderTickets(allTickets);
                    updateDashboardCounts(allTickets);
                    
                    // Close the update work modal
                    closeModal('updateWorkModal');
                    
                    // Reset the form
                    document.getElementById('updateWorkForm').reset();
                    currentUpdateTicketId = null;
                    
                    showToast(`${ticketIdFormatted} marked as finished! Status updated to Resolved.`, 'success');
                } else {
                    showToast(response.message || 'Failed to complete ticket', 'error');
                }
            } catch (error) {
                console.error('Error completing ticket:', error);
                showToast('Failed to mark ticket as finished. Please try again.', 'error');
            }
        },
        'primary'
    );
}

// Mark ticket as done (legacy, redirects to completeTicketWork)
function markDone(ticketId) {
    currentUpdateTicketId = ticketId;
    completeTicketWork();
}

// Filter parts requests by status
function filterPartsByStatus(status) {
    const requests = document.querySelectorAll('#allPartsRequests .request-item');
    const noPartsMessage = document.getElementById('noPartsMessage');
    const partsCount = document.getElementById('partsCount');
    const filterButtons = document.querySelectorAll('#partsFilterTabs .filter-btn');
    let visibleCount = 0;

    // Update active button styling
    filterButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Filter requests
    requests.forEach(request => {
        const requestStatus = request.getAttribute('data-status');
        if (status === 'all' || requestStatus === status) {
            request.style.display = 'block';
            visibleCount++;
        } else {
            request.style.display = 'none';
        }
    });

    // Show/hide no requests message
    if (visibleCount === 0) {
        noPartsMessage.style.display = 'block';
    } else {
        noPartsMessage.style.display = 'none';
    }

    // Update parts count
    partsCount.textContent = `${visibleCount} request${visibleCount !== 1 ? 's' : ''}`;
}

// Toggle outsourced fields based on repair type selection
function toggleOutsourcedFields() {
    const repairType = document.getElementById('repairType').value;
    const internalFields = document.getElementById('internalRepairFields');
    const outsourcedFields = document.getElementById('outsourcedRepairFields');

    if (repairType === 'internal') {
        internalFields.style.display = 'block';
        outsourcedFields.style.display = 'none';
        // Remove required from outsourced fields
        document.getElementById('serviceProvider').removeAttribute('required');
    } else if (repairType === 'outsourced') {
        internalFields.style.display = 'none';
        outsourcedFields.style.display = 'block';
        // Add required to service provider
        document.getElementById('serviceProvider').setAttribute('required', 'required');
    } else {
        internalFields.style.display = 'none';
        outsourcedFields.style.display = 'none';
    }
}

// Create Repair Ticket Form Submission
document.getElementById('createRepairTicketForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const assetType = document.getElementById('assetType').value;
    const assetId = document.getElementById('assetId').value;
    const assetName = document.getElementById('assetName').value;
    const faultCategory = document.getElementById('faultCategory').value;
    const faultDescription = document.getElementById('faultDescription').value;
    const reportedBy = document.getElementById('reportedBy').value;
    const priority = document.getElementById('repairPriority').value;
    const repairType = document.getElementById('repairType').value;

    // Generate new ticket ID
    const ticketId = 'MBD-' + String(Math.floor(Math.random() * 900) + 100);

    // Create ticket object
    const ticketData = {
        ticketId: ticketId,
        assetType: assetType,
        assetId: assetId,
        assetName: assetName,
        faultCategory: faultCategory,
        faultDescription: faultDescription,
        reportedBy: reportedBy,
        priority: priority,
        repairType: repairType,
        createdBy: 'Technical Officer',
        status: 'pending-supervisor-approval',
        createdDate: new Date().toISOString()
    };

    // Add type-specific details
    if (repairType === 'internal') {
        ticketData.estimatedCompletion = document.getElementById('estimatedCompletion').value;
        ticketData.requiredParts = document.getElementById('requiredParts').value;
    } else if (repairType === 'outsourced') {
        ticketData.serviceProvider = document.getElementById('serviceProvider').value;
        ticketData.serviceContact = document.getElementById('serviceContact').value;
        ticketData.serviceAddress = document.getElementById('serviceAddress').value;
        ticketData.estimatedCost = document.getElementById('estimatedCost').value;
    }

    ticketData.additionalNotes = document.getElementById('additionalNotes').value;

    // In a real application, this would send data to the server
    console.log('New Repair Ticket Created:', ticketData);

    // Show success message
    const repairTypeText = repairType === 'internal' ? 'Internal Repair (To be resolved by you)' : 'Outsourced Repair';
    showToast(`Repair Ticket ${ticketId} created successfully!\nType: ${repairTypeText}\nAsset: ${assetId}\nSent to supervisor for approval and management.`);

    // Close modal and reset form
    closeModal('createRepairTicketModal');
    this.reset();
    document.getElementById('internalRepairFields').style.display = 'none';
    document.getElementById('outsourcedRepairFields').style.display = 'none';

    // Optionally add the ticket to the list (for demonstration)
    addTicketToList(ticketData);
});

// Add newly created ticket to the list
function addTicketToList(ticketData) {
    const ticketsList = document.getElementById('allTicketsList');
    const priorityClass = ticketData.priority === 'high' ? 'status-urgent' :
        ticketData.priority === 'medium' ? 'status-normal' : 'status-low';

    const repairTypeDisplay = ticketData.repairType === 'internal' ?
        'Internal Repair' : 'Outsourced';

    const newTicketHTML = `
                <div class="ticket-item" data-status="new" style="border-left: 4px solid #fbbf24;">
                    <div class="ticket-details">
                        <strong>${ticketData.ticketId}</strong>
                        <div class="ticket-meta">Equipment: ${ticketData.assetId}${ticketData.assetName ? ' - ' + ticketData.assetName : ''} | Type: ${ticketData.assetType}</div>
                        <div class="ticket-issue">${ticketData.faultDescription}</div>
                        <div class="ticket-meta">Created by: You | Priority: ${ticketData.priority} | ${repairTypeDisplay}</div>
                        <div style="margin-top: 8px; padding: 8px; background: #fef3c7; border-radius: 4px; font-size: 12px;">
                            <strong>⏳ Status:</strong> Waiting for supervisor approval and assignment
                        </div>
                    </div>
                    <div class="ticket-actions">
                        <span class="status-badge ${priorityClass}">Pending Approval</span>
                        <div class="action-buttons">
                            <button class="btn btn-secondary btn-mini" onclick="viewTicketDetails('${ticketData.ticketId}')">View Details</button>
                        </div>
                    </div>
                </div>
            `;

    // Add to the top of the list
    ticketsList.insertAdjacentHTML('afterbegin', newTicketHTML);
}

// Request parts function (called from action buttons)
function requestPartsForTicket(ticketId) {
    // Open the main request parts modal and pre-fill ticket ID
    const modal = document.getElementById('requestPartsModal');
    const ticketIdField = document.getElementById('relatedTicketId');

    if (ticketIdField) {
        ticketIdField.value = ticketId;
    }

    modal.classList.add('active');
}

function viewTicketDetails(ticketId) {
    viewTicket(ticketId);
}

// View Part Request Details
function viewPartRequestDetails(requestId) {
    const modal = document.getElementById('viewPartRequestModal');
    const content = document.getElementById('partRequestDetailsContent');

    // Sample data - in a real application, this would come from a database
    const requestData = {
        'REQ-001': {
            id: 'REQ-001',
            ticketId: 'MBD-001',
            equipment: 'Vehicle #101',
            reporter: 'Tech Officer',
            requestedDate: 'Aug 20, 2025',
            status: 'Approved',
            priority: 'High',
            issueDescription: 'Required for brake system repair on Vehicle #101',
            parts: [
                { name: 'Brake Pads - BP-001', quantity: 4 }
            ],
            approvedBy: 'Supervisor John',
            approvedDate: 'Aug 21, 2025',
            remarks: 'Approved for immediate dispatch'
        },
        'REQ-002': {
            id: 'REQ-002',
            ticketId: 'MBD-003',
            equipment: 'Machine #205',
            reporter: 'Tech Officer',
            requestedDate: 'Aug 22, 2025',
            status: 'Pending',
            priority: 'Medium',
            issueDescription: 'Preventive maintenance for hydraulic system',
            parts: [
                { name: 'Oil Filter - OF-205', quantity: 2 },
                { name: 'Hydraulic Pump - HYD-250', quantity: 1 }
            ],
            approvedBy: null,
            approvedDate: null,
            remarks: 'Awaiting supervisor approval'
        }
    };

    const request = requestData[requestId];

    if (!request) {
        content.innerHTML = '<p>Request not found.</p>';
        modal.classList.add('active');
        return;
    }

    // Build parts list HTML
    let partsHTML = '';
    request.parts.forEach((part, index) => {
        const borderBottom = index < request.parts.length - 1 ? 'border-bottom: 1px solid var(--stone-200);' : '';
        partsHTML += `
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; ${borderBottom}">
                        <span style="color: var(--text-700); font-weight: 500;">${part.name}</span>
                        <span style="color: var(--text-900); font-weight: 600;">Qty: ${part.quantity}</span>
                    </div>
                `;
    });

    const statusBadgeClass = request.status === 'Approved' ? 'status-approved' : 'status-pending';
    const approvalSection = request.status === 'Approved' ? `
                <div style="margin-top: 20px; padding: 15px; background: #f0fdf4; border-radius: 8px; border: 1px solid #86efac;">
                    <strong style="color: var(--kelly-green);">Approval Information</strong>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px;">
                        <div>
                            <span style="color: var(--muted); font-size: 0.9rem;">Approved By</span>
                            <div style="font-weight: 500; margin-top: 3px;">${request.approvedBy}</div>
                        </div>
                        <div>
                            <span style="color: var(--muted); font-size: 0.9rem;">Approved Date</span>
                            <div style="font-weight: 500; margin-top: 3px;">${request.approvedDate}</div>
                        </div>
                    </div>
                    <div style="margin-top: 10px;">
                        <span style="color: var(--muted); font-size: 0.9rem;">Remarks</span>
                        <div style="margin-top: 3px; color: var(--text-700);">${request.remarks}</div>
                    </div>
                </div>
            ` : `
                <div style="margin-top: 20px; padding: 15px; background: #fef3c7; border-radius: 8px; border: 1px solid #fbbf24;">
                    <strong style="color: var(--warn);">⏳ Pending Approval</strong>
                    <div style="margin-top: 8px; color: var(--text-700);">
                        ${request.remarks}
                    </div>
                </div>
            `;

    content.innerHTML = `
                <div style="background: white;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid var(--stone-200);">
                        <strong style="font-size: 1.2rem; color: var(--tang-blue);">${request.id}</strong>
                        <span class="status-badge ${statusBadgeClass}">${request.status}</span>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 15px;">
                        <div>
                            <span style="color: var(--muted); font-size: 0.9rem;">Ticket ID</span>
                            <div style="font-weight: 500; margin-top: 3px;">${request.ticketId}</div>
                        </div>
                        <div>
                            <span style="color: var(--muted); font-size: 0.9rem;">Equipment</span>
                            <div style="font-weight: 500; margin-top: 3px;">${request.equipment}</div>
                        </div>
                        <div>
                            <span style="color: var(--muted); font-size: 0.9rem;">Reporter</span>
                            <div style="font-weight: 500; margin-top: 3px;">${request.reporter}</div>
                        </div>
                        <div>
                            <span style="color: var(--muted); font-size: 0.9rem;">Requested Date</span>
                            <div style="font-weight: 500; margin-top: 3px;">${request.requestedDate}</div>
                        </div>
                        <div>
                            <span style="color: var(--muted); font-size: 0.9rem;">Priority</span>
                            <div style="font-weight: 500; margin-top: 3px;">${request.priority}</div>
                        </div>
                    </div>

                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--stone-200);">
                        <span style="color: var(--muted); font-size: 0.9rem; font-weight: 600;">Issue Description</span>
                        <div style="margin-top: 8px; line-height: 1.6; color: var(--text-700);">
                            ${request.issueDescription}
                        </div>
                    </div>

                    <div style="margin-top: 20px;">
                        <span style="color: var(--muted); font-size: 0.9rem; font-weight: 600;">Spare Parts Required</span>
                        <div style="margin-top: 10px;">
                            <div style="background: #f8f9fa; border-radius: 8px; padding: 15px;">
                                ${partsHTML}
                            </div>
                        </div>
                    </div>

                    ${approvalSection}
                </div>
            `;

    modal.classList.add('active');
}

// Filter warranty claims by status
function filterWarrantyByStatus(status) {
    const claims = document.querySelectorAll('#allWarrantyClaims .request-item');
    const noWarrantyMessage = document.getElementById('noWarrantyMessage');
    const warrantyCount = document.getElementById('warrantyCount');
    const filterButtons = document.querySelectorAll('#warrantyFilterTabs .filter-btn');
    let visibleCount = 0;

    // Update active button styling
    filterButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Filter warranty claims
    claims.forEach(claim => {
        const claimStatus = claim.getAttribute('data-status');
        if (status === 'all' || claimStatus === status) {
            claim.style.display = '';
            visibleCount++;
        } else {
            claim.style.display = 'none';
        }
    });

    // Show/hide no claims message
    if (visibleCount === 0) {
        noWarrantyMessage.style.display = 'block';
    } else {
        noWarrantyMessage.style.display = 'none';
    }

    // Update warranty count
    warrantyCount.textContent = `${visibleCount} claim${visibleCount !== 1 ? 's' : ''}`;
}

// ==================== INVENTORY MANAGEMENT FUNCTIONS ====================

// Load inventory (vehicles and machines)
async function loadInventory() {
    const inventoryList = document.getElementById('allInventoryList');
    const inventoryCount = document.getElementById('inventoryCount');
    
    if (!inventoryList) return;
    
    // Show loading state
    inventoryList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--muted);"><i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i><p style="margin-top: 15px;">Loading inventory...</p></div>';
    
    try {
        // Fetch both vehicles and machines
        const [vehiclesResponse, machinesResponse] = await Promise.all([
            API.get('/vehicles'),
            API.get('/machines')
        ]);
        
        allInventory = [];
        
        // Process vehicles
        if (vehiclesResponse.success && vehiclesResponse.data) {
            const vehicles = Array.isArray(vehiclesResponse.data) ? vehiclesResponse.data : [vehiclesResponse.data];
            vehicles.forEach(vehicle => {
                allInventory.push({
                    ...vehicle,
                    type: 'vehicle',
                    id: vehicle.vehicle_id,
                    name: vehicle.vehicle_name || vehicle.registration_number || 'Unknown Vehicle',
                    identifier: vehicle.registration_number || vehicle.vehicle_id
                });
            });
        }
        
        // Process machines
        if (machinesResponse.success && machinesResponse.data) {
            const machines = Array.isArray(machinesResponse.data) ? machinesResponse.data : [machinesResponse.data];
            machines.forEach(machine => {
                allInventory.push({
                    ...machine,
                    type: 'machine',
                    id: machine.machine_id,
                    name: machine.machine_name || machine.model_number || 'Unknown Machine',
                    identifier: machine.model_number || machine.serial_number || machine.machine_id
                });
            });
        }
        
        if (allInventory.length > 0) {
            renderInventory(allInventory);
            inventoryCount.textContent = `${allInventory.length} item${allInventory.length !== 1 ? 's' : ''}`;
        } else {
            inventoryList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--muted);"><i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 15px;"></i><p>No inventory items found</p></div>';
            inventoryCount.textContent = '0 items';
        }
    } catch (error) {
        console.error('Error loading inventory:', error);
        inventoryList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--danger);"><i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 15px;"></i><p>Error loading inventory. Please try again.</p></div>';
    }
}

// Render inventory items
function renderInventory(items) {
    const inventoryList = document.getElementById('allInventoryList');
    
    if (!inventoryList || items.length === 0) {
        inventoryList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--muted);"><i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 15px;"></i><p>No inventory items found</p></div>';
        return;
    }
    
    inventoryList.innerHTML = items.map(item => {
        const isVehicle = item.type === 'vehicle';
        const icon = isVehicle ? 'fa-car' : 'fa-cogs';
        const typeLabel = isVehicle ? 'Vehicle' : 'Machine';
        const status = item.status || 'Active';
        const statusClass = status.toLowerCase().replace(/\s+/g, '-');
        const manufacturer = item.manufacturer || 'N/A';
        const model = item.model || item.model_number || 'N/A';
        
        return `
            <div class="inventory-item" data-type="${item.type}" data-status="${statusClass}">
                <div class="item-details">
                    <strong><i class="fas ${icon}"></i> ${item.name}</strong>
                    <div class="item-meta">
                        <i class="fas fa-hashtag"></i> ${item.identifier} | 
                        <i class="fas fa-tag"></i> ${typeLabel} |
                        <i class="fas fa-industry"></i> ${manufacturer}
                    </div>
                    <div class="item-meta">
                        <i class="fas fa-cubes"></i> Model: ${model} |
                        <span class="status-badge status-${statusClass}">${status}</span>
                    </div>
                </div>
                <div class="item-actions">
                    <div class="action-buttons">
                        <button class="btn btn-primary btn-small" onclick="viewInventoryItem('${item.type}', '${item.id}')">
                            <i class="fas fa-eye"></i> VIEW
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Filter inventory by type
function filterInventoryByType(type) {
    const items = document.querySelectorAll('#allInventoryList .inventory-item');
    const noInventoryMessage = document.getElementById('noInventoryMessage');
    const inventoryCount = document.getElementById('inventoryCount');
    const filterButtons = document.querySelectorAll('#inventoryFilterTabs .filter-btn');
    let visibleCount = 0;

    // Update active button styling
    filterButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Find and activate the clicked button
    const clickedButton = Array.from(filterButtons).find(btn => {
        const onclickAttr = btn.getAttribute('onclick');
        return onclickAttr && onclickAttr.includes(`'${type}'`);
    });
    
    if (clickedButton) {
        clickedButton.classList.add('active');
    }

    currentInventoryFilter = type;

    // Filter items
    items.forEach(item => {
        const itemType = item.getAttribute('data-type');
        if (type === 'all' || itemType === type) {
            item.style.display = '';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });

    // Show/hide no items message
    if (noInventoryMessage) {
        if (visibleCount === 0) {
            noInventoryMessage.style.display = 'block';
        } else {
            noInventoryMessage.style.display = 'none';
        }
    }

    // Update inventory count
    if (inventoryCount) {
        inventoryCount.textContent = `${visibleCount} item${visibleCount !== 1 ? 's' : ''}`;
    }
}

// View inventory item details
function viewInventoryItem(type, id) {
    const item = allInventory.find(i => i.type === type && String(i.id) === String(id));
    if (!item) {
        showToast('Item not found', 'error');
        return;
    }
    
    const isVehicle = item.type === 'vehicle';
    const status = item.status || 'Active';
    const statusClass = status.toLowerCase().replace(/\s+/g, '-');
    
    let content = '';
    
    if (isVehicle) {
        content = `
            <div class="form-section">
                <h5><i class="fas fa-info-circle"></i> Basic Information</h5>
                <p><strong>Vehicle ID:</strong> ${item.vehicle_id || 'N/A'}</p>
                <p><strong>Vehicle Name:</strong> ${item.vehicle_name || 'N/A'}</p>
                <p><strong>Number Plate:</strong> ${item.registration_number || item.number_plate || 'N/A'}</p>
                <p><strong>Chassis Number:</strong> ${item.chassis_number || 'N/A'}</p>
                <p><strong>Vehicle Type:</strong> ${item.vehicle_type || 'N/A'}</p>
                <p><strong>Fuel Type:</strong> ${item.fuel_type || 'N/A'}</p>
                <p><strong>Current Mileage:</strong> ${item.current_mileage ? item.current_mileage + ' km' : 'N/A'}</p>
                <p><strong>Status:</strong> <span class="status-text status-${statusClass}">${status}</span></p>
            </div>
            <div class="form-section">
                <h5><i class="fas fa-truck"></i> Supplier Information</h5>
                <p><strong>Supplier:</strong> ${item.supplier_name || 'N/A'}</p>
                ${item.supplier_contact ? `<p><strong>Contact:</strong> ${item.supplier_contact}</p>` : ''}
            </div>
            <div class="form-section">
                <h5><i class="fas fa-calendar-alt"></i> Service & Warranty</h5>
                ${item.last_service_date ? `<p><strong>Last Service:</strong> ${new Date(item.last_service_date).toLocaleDateString()}</p>` : ''}
                ${item.next_service_date ? `<p><strong>Next Service:</strong> ${new Date(item.next_service_date).toLocaleDateString()}</p>` : ''}
                ${item.warranty_expiry ? `<p><strong>Warranty Expiry:</strong> ${new Date(item.warranty_expiry).toLocaleDateString()}</p>` : ''}
                ${item.warranty_provider ? `<p><strong>Warranty Provider:</strong> ${item.warranty_provider}</p>` : ''}
            </div>
            ${item.notes ? `
                <div class="form-section">
                    <h5><i class="fas fa-sticky-note"></i> Notes</h5>
                    <p>${item.notes}</p>
                </div>
            ` : ''}
        `;
    } else {
        content = `
            <div class="form-section">
                <h5><i class="fas fa-info-circle"></i> Basic Information</h5>
                <p><strong>Machine ID:</strong> ${item.machine_id || 'N/A'}</p>
                <p><strong>Machine Name:</strong> ${item.machine_name || 'N/A'}</p>
                <p><strong>Model Number:</strong> ${item.model_number || 'N/A'}</p>
                <p><strong>Serial Number:</strong> ${item.serial_number || 'N/A'}</p>
                <p><strong>Machine Type:</strong> ${item.machine_type || 'N/A'}</p>
                <p><strong>Manufacturer:</strong> ${item.manufacturer || 'N/A'}</p>
                <p><strong>Status:</strong> <span class="status-text status-${statusClass}">${status}</span></p>
            </div>
            ${item.specifications ? `
                <div class="form-section">
                    <h5><i class="fas fa-wrench"></i> Technical Specifications</h5>
                    <p><strong>Specifications:</strong> ${item.specifications}</p>
                </div>
            ` : ''}
            <div class="form-section">
                <h5><i class="fas fa-calendar-alt"></i> Purchase & Warranty</h5>
                ${item.purchase_date ? `<p><strong>Purchase Date:</strong> ${new Date(item.purchase_date).toLocaleDateString()}</p>` : ''}
                ${item.warranty_expiry ? `<p><strong>Warranty Expiry:</strong> ${new Date(item.warranty_expiry).toLocaleDateString()}</p>` : ''}
            </div>
            ${item.notes ? `
                <div class="form-section">
                    <h5><i class="fas fa-sticky-note"></i> Notes</h5>
                    <p>${item.notes}</p>
                </div>
            ` : ''}
        `;
    }
    
    const title = isVehicle ? 'Vehicle Details' : 'Machine Details';
    const modal = createDetailsModal(title, content);
    document.body.appendChild(modal);
    modal.classList.add('active');
}

function showTicketDetails(ticketId) {
    viewTicket(ticketId);
}

// Create details modal - same format as inventory manager
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
            <div style="padding: 20px 30px;">
                ${content}
            </div>
            <div style="padding: 0 30px 20px 30px;">
                <button class="btn btn-secondary" onclick="closeModal('${modal.id}')"><i class="fas fa-times"></i> Close</button>
            </div>
        </div>
    `;
    
    // Close when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal(modal.id);
        }
    });
    
    return modal;
}

// Start ticket work - changes status from Parts Approved to In Progress
async function startTicketWork(ticketId) {
    const ticket = allTickets.find(t => t.id === ticketId);
    if (!ticket) {
        showToast('Ticket not found', 'error');
        return;
    }
    
    try {
        const response = await API.put(`/fault-tickets/${ticketId}`, {
            status: 'In Progress'
        });
        
        if (response.status === 'success') {
            // Update the ticket in local array
            const ticketIndex = allTickets.findIndex(t => t.id == ticketId);
            if (ticketIndex !== -1) {
                allTickets[ticketIndex].status = 'In Progress';
            }
            
            // Re-render tickets to reflect the status change
            renderTickets(allTickets);
            updateDashboardCounts(allTickets);
            
            showToast('Work started! Status changed to In Progress.', 'success');
        } else {
            showToast('Failed to start work. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error starting ticket work:', error);
        showToast('Failed to start work. Please try again.', 'error');
    }
}

// Form submissions
function initializeForms() {
    // Update Work Form - save progress notes
    const updateWorkForm = document.getElementById('updateWorkForm');
    if (updateWorkForm) {
        updateWorkForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            
            if (!currentUpdateTicketId) {
                showToast('No ticket selected', 'error');
                return;
            }
            
            const ticket = allTickets.find(t => t.id === currentUpdateTicketId);
            const ticketIdFormatted = ticket ? getDisplayTicketId(ticket) : currentUpdateTicketId;
            
            // Gather form data
            const textarea = this.querySelector('textarea');
            const machineDescription = textarea ? textarea.value.trim() : '';
            
            // Get checked parts
            const checkedParts = Array.from(this.querySelectorAll('input[name="partsUsed"]:checked')).map(cb => cb.value);
            
            // Get time spent
            const timeInput = this.querySelector('input[type="number"]');
            const timeSpent = timeInput ? parseFloat(timeInput.value) : 0;
            
            // Validate required fields
            if (!machineDescription) {
                showToast('Please provide machine description', 'error');
                return;
            }
            
            if (!timeSpent || timeSpent <= 0) {
                showToast('Please provide valid time spent', 'error');
                return;
            }
            
            try {
                // Save work update to ticket_work_updates table
                const workUpdateData = {
                    ticket_id: currentUpdateTicketId,
                    parts_used: checkedParts.join(', '),
                    time_spent: timeSpent,
                    machine_description: machineDescription,
                    work_status: 'Completed'
                };
                
                console.log('Submitting work update:', workUpdateData);
                
                const workUpdateResponse = await API.post('/ticket-work-updates', workUpdateData);
                
                console.log('Work update response:', workUpdateResponse);
                
                if (workUpdateResponse.status !== 'success') {
                    const errorMsg = workUpdateResponse.message || 'Failed to save work update';
                    console.error('Work update failed:', workUpdateResponse);
                    showToast(errorMsg, 'error');
                    return;
                }
                
                // Update ticket status to Resolved
                console.log('Updating ticket status to Resolved...');
                const ticketResponse = await API.put(`/fault-tickets/${currentUpdateTicketId}`, {
                    status: 'Resolved',
                    resolution_notes: machineDescription
                });
                
                console.log('Ticket update response:', ticketResponse);
                
                if (ticketResponse.status === 'success') {
                    showToast(`Work completed for ${ticketIdFormatted}`, 'success');
                    closeModal('updateWorkModal');
                    this.reset();
                    currentUpdateTicketId = null;
                    // Reload tickets to reflect status change
                    await loadTickets();
                } else {
                    const errorMsg = ticketResponse.message || 'Failed to update ticket status';
                    showToast(`Work saved but ${errorMsg}`, 'warning');
                }
            } catch (error) {
                console.error('Error finishing work:', error);
                showToast(error.message || 'Failed to finish work. Please try again.', 'error');
            }
        });
    }
    
    // Request Parts Form
    document.getElementById('requestPartsForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        
        // Get the ticket ID that triggered this request
        const ticketId = document.getElementById('requestingTicketId').value;
        const noSparePartsNeeded = document.getElementById('noSparePartsNeeded')?.checked || false;
        
        // Capture the selected spare parts and store them for later use in update work modal
        const sparePartItems = [];
        if (!noSparePartsNeeded) {
            const partRows = document.querySelectorAll('#sparePartsContainer .spare-part-item');
            partRows.forEach(row => {
                const select = row.querySelector('.form-select');
                const qtyInput = row.querySelector('input[type="number"]');
                if (select && select.value) {
                    const selectedOption = select.options[select.selectedIndex];
                    sparePartItems.push({
                        part_code: select.value,
                        part_name: selectedOption.text || select.value,
                        quantity: qtyInput ? parseInt(qtyInput.value) || 1 : 1
                    });
                }
            });
            // Also store for local update work modal usage
            if (sparePartItems.length > 0) {
                requestedPartsMap[ticketId] = sparePartItems.map(p => p.part_name);
            }
        }
        
        if (ticketId) {
            // If no spare parts needed → set status to "In Progress" directly
            // If spare parts requested → set status to "Waiting for Spare Parts" until approved
            const newStatus = noSparePartsNeeded ? 'In Progress' : 'Waiting for Spare Parts';
            
            try {
                // If spare parts are requested, POST the request to the backend first
                if (!noSparePartsNeeded && sparePartItems.length > 0) {
                    const ticket = allTickets.find(t => t.id == ticketId);
                    const ticketIdFormatted = ticket ? getDisplayTicketId(ticket) : '';
                    const equipmentName = document.getElementById('equipmentInput')?.value || '';
                    const locationVal = document.getElementById('locationInput')?.value || '';
                    const priorityVal = document.getElementById('prioritySelect')?.value || 'Medium';
                    const additionalNotes = document.getElementById('additionalNotesTextarea')?.value || '';

                    const requestPayload = {
                        fault_ticket_id: parseInt(ticketId),
                        ticket_id_formatted: ticketIdFormatted,
                        equipment_name: equipmentName,
                        location: locationVal,
                        priority: priorityVal,
                        additional_notes: additionalNotes,
                        items: sparePartItems
                    };

                    const spareResponse = await API.post('/spare-part-requests', requestPayload);
                    if (spareResponse.status !== 'success') {
                        console.error('Failed to save spare part request:', spareResponse);
                    }
                }

                const response = await API.put(`/fault-tickets/${ticketId}`, {
                    status: newStatus
                });
                
                if (response.status === 'success') {
                    // Update the ticket in local array
                    const ticketIndex = allTickets.findIndex(t => t.id == ticketId);
                    if (ticketIndex !== -1) {
                        allTickets[ticketIndex].status = newStatus;
                    }
                    
                    // Re-render tickets to reflect the status change
                    renderTickets(allTickets);
                    updateDashboardCounts(allTickets);
                    
                    if (noSparePartsNeeded) {
                        showToast('No spare parts needed. Work started! Status changed to In Progress.', 'success');
                    } else {
                        showToast('Spare parts request submitted to Inventory Manager. Waiting for approval.', 'success');
                    }
                } else {
                    showToast('Request submitted but status update failed.', 'warning');
                }
            } catch (error) {
                console.error('Error updating ticket status:', error);
                showToast('Request submitted but status update failed.', 'warning');
            }
        } else {
            showToast('Parts request submitted to Inventory Manager!', 'success');
        }
        
        closeModal('requestPartsModal');
        
        // Reset form and unlock fields for next use
        this.reset();
        document.getElementById('requestingTicketId').value = '';
        const noPartsCheckbox = document.getElementById('noSparePartsNeeded');
        if (noPartsCheckbox) {
            noPartsCheckbox.checked = false;
            toggleSparePartsSection(false);
        }
        const equipmentInput = document.getElementById('equipmentInput');
        if (equipmentInput) {
            equipmentInput.readOnly = false;
            equipmentInput.style.backgroundColor = '';
        }
        // Clear all other fields
        const locationInput = document.getElementById('locationInput');
        if (locationInput) locationInput.value = '';
        const reportedByInput = document.getElementById('reportedByInput');
        if (reportedByInput) reportedByInput.value = '';
        const reportedDateInput = document.getElementById('reportedDateInput');
        if (reportedDateInput) reportedDateInput.value = '';
        const originalIssueTextarea = document.getElementById('originalIssueTextarea');
        if (originalIssueTextarea) originalIssueTextarea.value = '';
        const additionalNotesTextarea = document.getElementById('additionalNotesTextarea');
        if (additionalNotesTextarea) additionalNotesTextarea.value = '';
    });

    // Warranty Claim Form
    document.getElementById('warrantyClaimForm').addEventListener('submit', function (e) {
        e.preventDefault();
        showToast('Warranty claim submitted to Inventory Manager!');
        closeModal('warrantyClaimModal');
        this.reset();
    });

    // Asset Feedback Form
    document.getElementById('assetFeedbackForm').addEventListener('submit', function (e) {
        e.preventDefault();
        showToast('Feedback submitted successfully! Shared with Supervisor & Maintenance Manager.');
        closeModal('feedbackModal');
        this.reset();
    });
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

// ==================== INVENTORY MANAGEMENT ====================
// (Inventory loading is handled by the loadInventory function earlier in the file)

function renderInventory(items) {
    const inventoryList = document.getElementById('allInventoryList');
    
    if (items.length === 0) {
        inventoryList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--muted);"><i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 15px;"></i><p>No inventory items found</p></div>';
        return;
    }
    
    inventoryList.innerHTML = items.map(item => {
        const isVehicle = item.type === 'vehicle';
        const icon = isVehicle ? 'fa-car' : 'fa-cogs';
        const status = item.status || 'Active';
        const statusClass = status.toLowerCase().replace(/\s+/g, '-');
        
        return `
            <div class="inventory-item" data-type="${item.type}">
                <div class="item-details">
                    <strong><i class="fas ${icon}"></i> ${item.name}</strong>
                    <div class="item-meta">
                        <i class="fas fa-hashtag"></i> ${item.identifier || 'N/A'} | 
                        <i class="fas fa-tag"></i> ${isVehicle ? 'Vehicle' : 'Machine'}
                        ${item.model ? ` | <i class="fas fa-box"></i> ${item.model}` : ''}
                    </div>
                    ${item.manufacturer ? `<div class="item-meta"><i class="fas fa-industry"></i> ${item.manufacturer}</div>` : ''}
                </div>
                <div class="item-actions">
                    <span class="status-badge status-${statusClass}">${status}</span>
                    <div class="action-buttons">
                        <button class="btn btn-primary btn-mini" onclick="viewInventoryItem(${item.id}, '${item.type}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function filterInventoryByType(type) {
    const buttons = document.querySelectorAll('#inventoryFilterTabs .filter-btn');
    buttons.forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    
    let filteredItems = allInventoryItems;
    if (type !== 'all') {
        filteredItems = allInventoryItems.filter(item => item.type === type);
    }
    
    renderInventory(filteredItems);
    
    const inventoryCount = document.getElementById('inventoryCount');
    inventoryCount.textContent = `${filteredItems.length} asset${filteredItems.length !== 1 ? 's' : ''}`;
}

// ==================== NAVIGATION & SECTION SWITCHING ====================

// Close modal when clicking outside
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        const activeModal = document.querySelector('.modal.active');
        if (activeModal) {
            activeModal.classList.remove('active');
        }
    }
});

// Mobile sidebar toggle
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('open');
}

// ==================== INITIALIZATION & AUTH ====================

// Check authorization on page load
(async function initializeDashboard() {
    try {
        // Require Technical Officer role
        const authorized = await Auth.requireRole('Technical Officer');

        if (!authorized) {
            console.error('Authorization failed');
            return; // Auth.requireRole will handle redirection
        }

        // Load user data
        const user = await Auth.checkAuth();
        console.log('Technical Officer Dashboard - User loaded:', user);
        
        if (user) {
            currentUser = user; // Store for ticket filtering
            console.log('currentUser set to:', currentUser);
            
            // Update user name
            const fullName = user.full_name || user.name || 'Technical Officer';
            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
                userNameElement.textContent = fullName;
            }

            // Update user avatar with first letter of name
            const avatar = document.getElementById('userAvatar');
            if (avatar) {
                avatar.textContent = fullName.charAt(0).toUpperCase();
            }

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
            
            // Load tickets and inventory after user data is loaded
            console.log('Loading tickets and inventory...');
            await loadTickets();
            await loadInventory();
            console.log('Tickets and inventory loaded');
        } else {
            console.error('No user data received');
        }
    } catch (error) {
        console.error('Error initializing dashboard:', error);
    }
})();

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    initializeForms();

    // Set today's date as default for date inputs
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    document.querySelectorAll('input[type="date"]').forEach(input => {
        if (!input.value) {
            input.value = today;
        }
    });

    document.querySelectorAll('input[type="datetime-local"]').forEach(input => {
        if (!input.value) {
            input.value = currentDateTime;
        }
    });

    // Add mobile menu button for responsive design
    if (window.innerWidth <= 768) {
        const menuBtn = document.createElement('button');
        menuBtn.innerHTML = '☰';
        menuBtn.className = 'menu-btn';
        menuBtn.style.cssText = `
                    position: fixed;
                    top: 80px;
                    left: 20px;
                    z-index: 1000;
                    background: var(--royal-blue);
                    color: white;
                    border: none;
                    padding: 10px;
                    border-radius: 5px;
                    font-size: 18px;
                    cursor: pointer;
                    box-shadow: var(--shadow);
                `;
        menuBtn.onclick = toggleSidebar;
        document.body.appendChild(menuBtn);
    }
});
