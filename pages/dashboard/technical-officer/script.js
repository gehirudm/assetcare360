
// Store ticket data
let allTickets = [];
let currentUser = null;

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
            
            // Filter tickets assigned to current user
            allTickets = tickets.filter(ticket => {
                // Check if ticket has assignments and if current user is assigned
                if (ticket.assignments && Array.isArray(ticket.assignments)) {
                    return ticket.assignments.some(assignment => 
                        assignment.assigned_to === currentUser.id
                    );
                }
                return false;
            });
            
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

// Render tickets
function renderTickets(tickets) {
    const ticketsList = document.getElementById('allTicketsList');
    
    if (tickets.length === 0) {
        ticketsList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--muted);"><i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 15px;"></i><p>No tickets found</p></div>';
        return;
    }
    
    ticketsList.innerHTML = tickets.map(ticket => {
        const ticketIdFormatted = `TKT-${String(ticket.id).padStart(3, '0')}`;
        const status = (ticket.status || 'New').toLowerCase().replace(/\s+/g, '-');
        const priority = ticket.priority || 'Medium';
        const assetName = ticket.machine_model_number || ticket.machine_name || `Machine #${ticket.machine_id}`;
        const reporterName = ticket.reported_by_name || ticket.reporter_full_name || 'Unknown';
        const description = ticket.description || 'No description';
        const createdDate = new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        // Get assignment details
        const assignment = ticket.assignments && ticket.assignments.length > 0 ? ticket.assignments[0] : null;
        const assignedBy = assignment ? (assignment.assigned_by_name || 'Supervisor') : 'Unknown';
        const assignedDate = assignment ? new Date(assignment.assigned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : createdDate;
        
        // Determine action buttons based on status
        let actionButtons = '';
        if (status === 'new' || status === 'pending') {
            actionButtons = `
                <button class="btn btn-primary btn-mini" onclick="processTicket(${ticket.id})">
                    <i class="fas fa-play"></i> Start Work
                </button>
                <button class="btn btn-warning btn-mini" onclick="requestPartsForTicket(${ticket.id})">
                    <i class="fas fa-tools"></i> Request Parts
                </button>
                <button class="btn btn-secondary btn-mini" onclick="viewTicket(${ticket.id})">
                    <i class="fas fa-eye"></i> View
                </button>
            `;
        } else if (status === 'in-progress') {
            actionButtons = `
                <button class="btn btn-primary btn-mini" onclick="updateWork(${ticket.id})">
                    <i class="fas fa-tasks"></i> Update Progress
                </button>
                <button class="btn btn-success btn-mini" onclick="markDone(${ticket.id})">
                    <i class="fas fa-check-double"></i> Mark Done
                </button>
                <button class="btn btn-secondary btn-mini" onclick="viewTicket(${ticket.id})">
                    <i class="fas fa-eye"></i> View
                </button>
            `;
        } else {
            actionButtons = `
                <button class="btn btn-secondary btn-mini" onclick="viewTicket(${ticket.id})">
                    <i class="fas fa-eye"></i> View Details
                </button>
            `;
        }
        
        return `
            <div class="ticket-item" data-status="${status}">
                <div class="ticket-details">
                    <strong>${ticketIdFormatted}</strong>
                    <div class="ticket-meta">Equipment: ${assetName} | Reporter: ${reporterName}</div>
                    <div class="ticket-issue">${description}</div>
                    <div class="ticket-meta">Assigned by: ${assignedBy} | Priority: ${priority} | Date: ${assignedDate}</div>
                </div>
                <div class="ticket-actions">
                    <span class="status-badge status-${status}">${ticket.status || 'New'}</span>
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
        return status === 'new' || status === 'pending';
    }).length;
    
    const inProgressCount = tickets.filter(t => 
        (t.status || '').toLowerCase() === 'in-progress'
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
function viewTicket(ticketId) {
    window.location.href = `/view-ticket/?id=${ticketId}`;
}

// Process ticket (start work)
function processTicket(ticketId) {
    openModal('processTicketModal', ticketId);
}

// Update work progress
function updateWork(ticketId) {
    openModal('updateWorkModal', ticketId);
}

// Mark ticket as done
function markDone(ticketId) {
    openModal('markDoneModal', ticketId);
}

// Request parts for ticket
function requestPartsForTicket(ticketId) {
    const ticket = allTickets.find(t => t.id === ticketId);
    if (ticket) {
        document.getElementById('relatedTicketId').value = `TKT-${String(ticketId).padStart(3, '0')}`;
    }
    openModal('requestPartsModal');
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
    const ticketId = 'TKT-' + String(Math.floor(Math.random() * 900) + 100);

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
    showToast(`✅ Repair Ticket ${ticketId} created successfully!\nType: ${repairTypeText}\nAsset: ${assetId}\nSent to supervisor for approval and management.`);

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
        '🔧 Internal Repair' : '🏪 Outsourced';

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
    openModal('viewDetailsModal', ticketId);
}

// View Part Request Details
function viewPartRequestDetails(requestId) {
    const modal = document.getElementById('viewPartRequestModal');
    const content = document.getElementById('partRequestDetailsContent');

    // Sample data - in a real application, this would come from a database
    const requestData = {
        'REQ-001': {
            id: 'REQ-001',
            ticketId: 'TKT-001',
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
            ticketId: 'TKT-003',
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
                    <strong style="color: var(--kelly-green);">✅ Approval Information</strong>
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
                        <span style="color: var(--muted); font-size: 0.9rem; font-weight: 600;">📝 Issue Description</span>
                        <div style="margin-top: 8px; line-height: 1.6; color: var(--text-700);">
                            ${request.issueDescription}
                        </div>
                    </div>

                    <div style="margin-top: 20px;">
                        <span style="color: var(--muted); font-size: 0.9rem; font-weight: 600;">🔧 Spare Parts Required</span>
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

function showTicketDetails(ticketId) {
    const ticket = ticketData[ticketId];
    const detailsContent = document.getElementById('ticketDetailsContent');

    detailsContent.innerHTML = `
                <div class="form-section">
                    <h5>📋 Ticket Information</h5>
                    <p><strong>Ticket ID:</strong> ${ticketId}</p>
                    <p><strong>Equipment:</strong> ${ticket.equipment}</p>
                    <p><strong>Reporter:</strong> ${ticket.reporter}</p>
                    <p><strong>Issue:</strong> ${ticket.issue}</p>
                    <p><strong>Priority:</strong> ${ticket.priority}</p>
                    <p><strong>Assigned by:</strong> ${ticket.assignedBy}</p>
                    <p><strong>Assigned Date:</strong> ${ticket.assignedDate}</p>
                    <p><strong>Current Status:</strong> ${ticket.status.replace('-', ' ').toUpperCase()}</p>
                    ${ticket.workDone ? `<p><strong>Work Progress:</strong> ${ticket.workDone}</p>` : ''}
                </div>
            `;
}

// Form submissions
function initializeForms() {
    // Request Parts Form
    document.getElementById('requestPartsForm').addEventListener('submit', function (e) {
        e.preventDefault();
        showToast('Parts request submitted to Supervisor for approval!');
        closeModal('requestPartsModal');
        this.reset();
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
    // Require Technical Officer role
    const authorized = await Auth.requireRole('Technical Officer');

    if (!authorized) {
        return; // Auth.requireRole will handle redirection
    }

    // Load user data
    const user = await Auth.checkAuth();
    if (user) {
        currentUser = user; // Store for ticket filtering
        
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
        
        // Load tickets after user data is loaded
        await loadTickets();
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
