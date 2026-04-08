
// Store ticket data
let allTickets = [];
let currentUser = null;

// Store requested spare parts per ticket (keyed by ticket numeric id)
let requestedPartsMap = {};

// Track the current ticket being updated in the update work modal
let currentUpdateTicketId = null;

// Navigation is handled by <ac-layout>; this keeps query-param deep links in sync.
let isHistoryNavigation = false;

function handleSectionActivation(sectionId) {
    if (sectionId === 'notifications') {
        refreshTONotifications().catch(error => {
            console.error('Failed to refresh notifications section:', error);
        });
    }

    if (sectionId === 'inventory') {
        refreshTOInventory().catch(error => {
            console.error('Failed to refresh inventory section:', error);
        });
    }

    if (sectionId === 'spare-parts') {
        refreshTOSpareParts();
    }
}

function navigateToSection(sectionId) {
    const layout = document.querySelector('ac-layout');
    if (!layout || typeof layout.navigateTo !== 'function') return;

    layout.navigateTo(sectionId);
}

function syncSectionInUrl(sectionId, replace = false) {
    const url = new URL(window.location.href);
    url.searchParams.set('section', sectionId);

    if (replace) {
        history.replaceState({ section: sectionId }, '', url.toString());
        return;
    }

    history.pushState({ section: sectionId }, '', url.toString());
}

// Restore section from query param on load / browser back-forward
function restoreSectionFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const section = params.get('section') || 'dashboard';

    const layout = document.querySelector('ac-layout');
    if (!layout || typeof layout.navigateTo !== 'function') return;

    isHistoryNavigation = true;
    layout.navigateTo(section);
    syncSectionInUrl(section, true);
}

window.addEventListener('popstate', (e) => {
    const section = (e.state && e.state.section)
        || new URLSearchParams(window.location.search).get('section')
        || 'dashboard';

    const layout = document.querySelector('ac-layout');
    if (!layout || typeof layout.navigateTo !== 'function') return;

    isHistoryNavigation = true;
    layout.navigateTo(section);
});

document.querySelector('ac-layout')?.addEventListener('section-change', (event) => {
    const section = event.detail?.section;
    if (!section) return;

    if (isHistoryNavigation) {
        isHistoryNavigation = false;
    } else {
        syncSectionInUrl(section);
    }

    handleSectionActivation(section);
});

// Modal functionality
function openModal(modalId, ticketId = '') {
    const modal = document.getElementById(modalId);
    if (modal) {
        if (typeof modal.open === 'function') {
            modal.open();
        } else {
            modal.classList.add('active');
        }

        if (ticketId) {
            if (modalId === 'processTicketModal') {
                document.getElementById('processTicketId').value = ticketId;
            } else if (modalId === 'updateWorkModal') {
                document.getElementById('updateTicketId').value = ticketId;
            } else if (modalId === 'markDoneModal') {
                document.getElementById('doneTicketId').value = ticketId;
            } else if (modalId === 'viewDetailsModal') {
                viewTicket(ticketId);
            }
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        if (typeof modal.close === 'function') {
            modal.close();
        } else {
            modal.classList.remove('active');
        }
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
function filterTicketsByStatus(status, clickedButton = null) {
    const ticketsComponent = document.querySelector('to-tickets');
    if (ticketsComponent && typeof ticketsComponent.applyFilter === 'function') {
        ticketsComponent.applyFilter(status, clickedButton);
        return;
    }

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
    const targetButton = clickedButton || filterButtons[0];
    if (targetButton) {
        targetButton.classList.add('active');
    }

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

// ==================== NOTIFICATIONS ====================

/**
 * Loads notifications from backend notification APIs.
 */
async function loadNotifications() {
    const list = document.getElementById('notificationsList');
    const empty = document.getElementById('notifEmpty');
    if (!list) return;

    try {
        const response = await API.get('/notifications?limit=50');
        if (!response || response.status !== 'success') {
            throw new Error(response?.message || 'Failed to load notifications');
        }

        const notifications = (response.data && response.data.notifications) || [];
        const unreadCount = Number(response?.data?.unread_count || 0);
        const sidebar = document.querySelector('to-shell-sidebar');
        if (sidebar) {
            sidebar.setNotifBadge(unreadCount);
        }

        list.querySelectorAll('.notif-card').forEach(el => el.remove());

        if (!Array.isArray(notifications) || notifications.length === 0) {
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';
        notifications.forEach(n => {
            const card = document.createElement('div');
            const type = n.type || 'info';
            const title = n.title || 'Notification';
            const desc = n.message || 'No details available.';
            const iconMap = {
                success: 'fa-check-circle',
                warning: 'fa-exclamation-triangle',
                error: 'fa-times-circle',
                info: 'fa-bell'
            };
            const icon = iconMap[type] || iconMap.info;
            const readClass = Number(n.is_read) === 1 ? 'notif-read' : '';

            card.className = `notif-card notif-${type} ${readClass}`.trim();
            card.innerHTML = `
                <div class="notif-icon"><i class="fas ${icon}"></i></div>
                <div class="notif-body">
                    <div class="notif-title">${title}</div>
                    <div class="notif-desc">${desc}</div>
                    <div class="notif-action">
                        ${Number(n.is_read) === 1
                            ? '<span class="badge-success">Read</span>'
                            : `<button class="btn btn-small btn-secondary" onclick="markNotificationAsRead('${n.notification_id}')">Mark as Read</button>`}
                    </div>
                </div>`;
            list.appendChild(card);
        });
    } catch (err) {
        console.error('loadNotifications error:', err);
        list.querySelectorAll('.notif-card').forEach(el => el.remove());
        const errEl = document.createElement('div');
        errEl.className = 'notif-card notif-danger';
        errEl.innerHTML = `<div class="notif-icon"><i class="fas fa-exclamation-circle"></i></div><div class="notif-body"><div class="notif-title">Failed to load notifications</div><div class="notif-desc">Please refresh the page and try again.</div></div>`;
        list.appendChild(errEl);
    }
}

async function markNotificationAsRead(notificationId) {
    if (!notificationId) return;
    try {
        const response = await API.post('/notifications/read', { notification_id: notificationId });
        if (!response || response.status !== 'success') {
            throw new Error(response?.message || 'Failed to update notification');
        }
        await loadNotifications();
    } catch (err) {
        console.error('markNotificationAsRead error:', err);
        if (window.Utils && typeof window.Utils.showToast === 'function') {
            window.Utils.showToast('Failed to mark notification as read', 'error');
        }
    }
function bindTONotifications() {
    const notificationsComponent = document.querySelector('to-notifications');
    if (!notificationsComponent || notificationsComponent.dataset.bound === 'true') return;

    notificationsComponent.dataset.bound = 'true';
    notificationsComponent.addEventListener('technical-officer-notifications:navigate', (event) => {
        const section = event.detail?.section;
        if (!section) return;
        navigateToSection(section);
    });
}

function bindTOTickets() {
    const ticketsComponent = document.querySelector('to-tickets');
    if (!ticketsComponent || ticketsComponent.dataset.bound === 'true') return;

    ticketsComponent.dataset.bound = 'true';

    ticketsComponent.addEventListener('technical-officer-tickets:view-ticket', (event) => {
        const ticketId = Number(event.detail?.ticketId);
        if (!ticketId) return;
        viewTicket(ticketId);
    });

    ticketsComponent.addEventListener('technical-officer-tickets:request-spare-parts', (event) => {
        const ticketId = Number(event.detail?.ticketId);
        if (!ticketId) return;
        requestSparePartsForTicket(ticketId);
    });

    ticketsComponent.addEventListener('technical-officer-tickets:start-work', (event) => {
        const ticketId = Number(event.detail?.ticketId);
        if (!ticketId) return;
        startTicketWork(ticketId);
    });

    ticketsComponent.addEventListener('technical-officer-tickets:update-work', (event) => {
        const ticketId = Number(event.detail?.ticketId);
        if (!ticketId) return;
        updateWork(ticketId);
    });
}

async function refreshTONotifications() {
    const notificationsComponent = document.querySelector('to-notifications');
    if (!notificationsComponent) return;

    if (typeof notificationsComponent.setCurrentUser === 'function') {
        notificationsComponent.setCurrentUser(currentUser);
    }

    if (typeof notificationsComponent.refresh === 'function') {
        await notificationsComponent.refresh();
    }
}

function bindTOInventory() {
    const inventoryComponent = document.querySelector('to-inventory');
    if (!inventoryComponent || inventoryComponent.dataset.bound === 'true') return;

    inventoryComponent.dataset.bound = 'true';
    inventoryComponent.addEventListener('technical-officer-inventory:error', (event) => {
        const message = event.detail?.message;
        if (!message) return;
        showToast(message, 'error');
    });
}

async function refreshTOInventory() {
    const inventoryComponent = document.querySelector('to-inventory');
    if (!inventoryComponent) return;

    if (typeof inventoryComponent.refresh === 'function') {
        await inventoryComponent.refresh();
    }
}

function bindTOFeedback() {
    const feedbackComponent = document.querySelector('to-feedback');
    if (!feedbackComponent || feedbackComponent.dataset.bound === 'true') return;

    feedbackComponent.dataset.bound = 'true';
    feedbackComponent.addEventListener('technical-officer-feedback:submitted', (event) => {
        const message = event.detail?.message || 'Feedback submitted successfully! Shared with Supervisor & Maintenance Manager.';
        showToast(message, 'success');
    });
}

function bindTOSpareParts() {
    const sparePartsComponent = document.querySelector('to-spare-parts');
    if (!sparePartsComponent || sparePartsComponent.dataset.bound === 'true') return;

    sparePartsComponent.dataset.bound = 'true';
    sparePartsComponent.addEventListener('technical-officer-spare-parts:open-request-modal', () => {
        openModal('requestPartsModal');
    });
}

function refreshTOSpareParts() {
    const sparePartsComponent = document.querySelector('to-spare-parts');
    if (!sparePartsComponent) return;

    if (typeof sparePartsComponent.refresh === 'function') {
        sparePartsComponent.refresh();
    }
}

function bindTOServiceWarranty() {
    const serviceWarrantyComponent = document.querySelector('to-service-warranty');
    if (!serviceWarrantyComponent || serviceWarrantyComponent.dataset.bound === 'true') return;

    serviceWarrantyComponent.dataset.bound = 'true';
    serviceWarrantyComponent.addEventListener('technical-officer-service-warranty:submitted', (event) => {
        const message = event.detail?.message || 'Warranty claim submitted to Inventory Manager!';
        showToast(message, 'success');
    });
}

// Load tickets from backend
async function loadTickets() {
    const ticketsComponent = document.querySelector('to-tickets');
    const ticketsList = document.getElementById('allTicketsList');
    const ticketCount = document.getElementById('ticketCount');

    // Show loading state
    if (ticketsComponent && typeof ticketsComponent.setLoading === 'function') {
        ticketsComponent.setLoading();
    } else if (ticketsList) {
        ticketsList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--muted);"><i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i><p style="margin-top: 15px;">Loading tickets...</p></div>';
    }

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
            } else {
                if (ticketsComponent && typeof ticketsComponent.setEmpty === 'function') {
                    ticketsComponent.setEmpty('No tickets assigned to you yet');
                } else {
                    ticketsList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--muted);"><i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 15px;"></i><p>No tickets assigned to you yet</p></div>';
                    ticketCount.textContent = '0 tickets';
                }
            }

            // Update dashboard counts
            updateDashboardCounts(allTickets);
        } else {
            throw new Error(response.message || 'Failed to load tickets');
        }
    } catch (error) {
        console.error('Error loading tickets:', error);
        if (ticketsComponent && typeof ticketsComponent.setError === 'function') {
            ticketsComponent.setError('Error loading tickets. Please try again.');
        } else if (ticketsList) {
            ticketsList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--danger);"><i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 15px;"></i><p>Error loading tickets. Please try again.</p></div>';
        }
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
    const ticketsComponent = document.querySelector('to-tickets');
    if (ticketsComponent && typeof ticketsComponent.renderTickets === 'function') {
        ticketsComponent.renderTickets(tickets);
        return;
    }

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
                <button class="btn btn-mini" onclick="event.stopPropagation(); requestSparePartsForTicket(${ticket.id})" style="background: var(--tang-blue); color: white;">
                    <i class="fas fa-tools"></i> Request Spare Parts
                </button>
            `;
        } else if (status === 'waiting-for-spare-parts') {
            // Waiting for Parts → show waiting indicator
            actionButtons = `
                <span class="btn btn-mini" style="background: #f59e0b; color: #000; cursor: default;">
                    <i class="fas fa-hourglass-half"></i> Awaiting Approval
                </span>
            `;
        } else if (status === 'parts-approved') {
            // Parts Approved → START button
            actionButtons = `
                <button class="btn btn-mini" onclick="event.stopPropagation(); startTicketWork(${ticket.id})" style="background: var(--kelly-green); color: white;">
                    <i class="fas fa-play"></i> START
                </button>
            `;
        } else if (status === 'in-progress') {
            // In Progress → UPDATE button
            actionButtons = `
                <button class="btn btn-warning btn-mini" onclick="event.stopPropagation(); updateWork(${ticket.id})">
                    <i class="fas fa-edit"></i> UPDATE
                </button>
            `;
        } else if (status === 'resolved' || status === 'completed' || status === 'closed') {
            // Resolved/Completed/Closed → show done badge
            actionButtons = `
                <span class="btn btn-mini" style="background: #10b981; color: white; cursor: default;">
                    <i class="fas fa-check-circle"></i> Done
                </span>
            `;
        }

        return `
            <div class="ticket-item" data-status="${status}" onclick="viewTicket(${ticket.id})" style="cursor:pointer;">
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

// View ticket details — navigate to the dedicated detail page
function viewTicket(ticketId) {
    window.location.href = `fault-ticket-detail/?id=${ticketId}`;
}

// Request spare parts for a ticket — now handled in the detail page;
// this stub is kept for backward compatibility with action buttons in the list.
function requestSparePartsForTicket(ticketId) {
    window.location.href = `fault-ticket-detail/?id=${ticketId}`;
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

// Bind create-fault-ticket child events to parent-level dashboard orchestration.
function bindCreateFaultTicket() {
    const model = document.querySelector('create-fault-ticket');
    if (!model || model.dataset.bound === 'true') return;

    model.dataset.bound = 'true';
    model.addEventListener('create-fault-ticket-created', (event) => {
        const ticketData = event.detail?.ticketData;
        const successMessage = event.detail?.successMessage;

        if (ticketData) {
            addTicketToList(ticketData);
        }

        if (successMessage) {
            showToast(successMessage);
        }
    });
}

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

}

// logout(), createConfirmationDialog(), closeConfirmation(), confirmAction()
// are now provided by shared dashboard-init.js

// ==================== NAVIGATION & SECTION SWITCHING ====================

// Close modal when clicking outside
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('modal')) {
        if (typeof e.target.close === 'function') {
            e.target.close();
        } else {
            e.target.classList.remove('active');
        }
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        const activeModal = document.querySelector('.modal.active');
        if (activeModal) {
            if (typeof activeModal.close === 'function') {
                activeModal.close();
            } else {
                activeModal.classList.remove('active');
            }
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
        const user = await DashboardInit.init('Technical Officer', {
            updateUserDisplay: true
        });

        if (!user) {
            console.error('No authorized user data received for Technical Officer dashboard');
            return;
        }

        currentUser = user;
        console.log('Technical Officer Dashboard - User loaded:', user);

        bindTOInventory();
        bindTONotifications();
        bindTOFeedback();
        bindTOTickets();
        bindTOSpareParts();
        bindTOServiceWarranty();

        // Load tickets and inventory after user data is loaded
        console.log('Loading tickets and inventory...');
        await loadTickets();
        await refreshTOInventory();
        await refreshTONotifications();
        console.log('Tickets and inventory loaded');
    } catch (error) {
        console.error('Error initializing dashboard:', error);
    }
})();

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    initializeForms();
    bindCreateFaultTicket();
    bindTOTickets();
    bindTOInventory();
    bindTONotifications();
    bindTOFeedback();
    bindTOSpareParts();
    bindTOServiceWarranty();

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

    // Restore the active section from ?section= query param (or default to 'dashboard')
    restoreSectionFromUrl();
});
