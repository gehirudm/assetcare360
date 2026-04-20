
// Store ticket data
let allTickets = [];
let currentUser = null;

// Store requested spare parts per ticket (keyed by ticket numeric id)
let requestedPartsMap = {};

// Track the current ticket being updated in the update work modal
let currentUpdateTicketId = null;
let technicalOfficerTicketDetailReturnSection = 'tickets';

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

    if (sectionId === 'analytics') {
        refreshTOAnalyticsHub().catch(error => {
            console.error('Failed to refresh analytics section:', error);
        });
    }

    if (sectionId === 'ticket-details') {
        const ticketDetailView = document.querySelector('#ticket-details to-ticket-detail-view');
        if (ticketDetailView && typeof ticketDetailView.refresh === 'function') {
            ticketDetailView.refresh();
        }
    }
}

function cleanupTOTicketDetailsOnSectionChange(sectionId) {
    if (sectionId === 'ticket-details') {
        return;
    }

    const ticketDetailView = document.querySelector('#ticket-details to-ticket-detail-view');
    if (!ticketDetailView || typeof ticketDetailView.closeView !== 'function') {
        return;
    }

    ticketDetailView.closeView();
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

    cleanupTOTicketDetailsOnSectionChange(section);
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

// Add another spare part field dynamically (reuses options already loaded when modal opened)
function addPartField() {
    const container = document.getElementById('sparePartsContainer');
    if (!container) return;
    const noPartsChecked = document.getElementById('noSparePartsNeeded')?.checked || false;
    const rowHtml = _buildSparePartRow(true, !noPartsChecked);
    container.insertAdjacentHTML('beforeend', rowHtml);
    // Attach availability listeners to the new row
    _attachAvailabilityListeners(container);
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
        if (sidebar && typeof sidebar.setNotifBadge === 'function') {
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

function bindTOAnalyticsHub() {
    const analyticsComponent = document.querySelector('to-analytics-hub');
    if (!analyticsComponent || analyticsComponent.dataset.bound === 'true') return;

    analyticsComponent.dataset.bound = 'true';
    analyticsComponent.addEventListener('technical-officer-analytics-hub:toast', (event) => {
        const message = event.detail?.message;
        const type = event.detail?.type || 'info';
        if (!message) return;

        showToast(message, type);
    });
}

async function refreshTOAnalyticsHub() {
    const analyticsComponent = document.querySelector('to-analytics-hub');
    if (!analyticsComponent) return;

    if (typeof analyticsComponent.setCurrentUser === 'function') {
        analyticsComponent.setCurrentUser(currentUser);
    }

    if (typeof analyticsComponent.refresh === 'function') {
        await analyticsComponent.refresh();
    }
}

function bindTOTickets() {
    const ticketsComponent = document.querySelector('to-tickets');
    if (!ticketsComponent || ticketsComponent.dataset.bound === 'true') return;

    ticketsComponent.dataset.bound = 'true';

    ticketsComponent.addEventListener('technical-officer-tickets:view-ticket', (event) => {
        const ticketId = Number(event.detail?.ticketId);
        if (!ticketId) return;
        viewTicket(ticketId, { returnSection: 'tickets' });
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

    ticketsComponent.addEventListener('technical-officer-tickets:add-budget', (event) => {
        const ticketId = Number(event.detail?.ticketId);
        if (!ticketId) return;
        viewTicket(ticketId, {
            returnSection: 'tickets',
            focusHash: 'budgetReportCard'
        });
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
    sparePartsComponent.addEventListener('technical-officer-spare-parts:re-request', (event) => {
        const ticketId = Number(event.detail?.ticketId);
        if (!ticketId) return;
        requestSparePartsForTicket(ticketId);
    });
    sparePartsComponent.addEventListener('technical-officer-spare-parts:view', (event) => {
        const requestId = Number(event.detail?.requestId);
        const req = sparePartsComponent._allRequests.find(r => r.id === requestId);
        if (!req) return;
        const items = Array.isArray(req.items) ? req.items : [];
        const isRejected = (req.status || '').toLowerCase() === 'rejected';
        const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
        document.getElementById('partRequestDetailsContent').innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                <div><label style="font-size:12px;color:var(--muted);">Request ID</label><p>${req.request_id || '—'}</p></div>
                <div><label style="font-size:12px;color:var(--muted);">Ticket</label><p>${req.fault_ticket_code || req.ticket_id_formatted || '—'}</p></div>
                <div><label style="font-size:12px;color:var(--muted);">Equipment</label><p>${req.equipment_name || 'N/A'}</p></div>
                <div><label style="font-size:12px;color:var(--muted);">Location</label><p>${req.location || 'N/A'}</p></div>
                <div><label style="font-size:12px;color:var(--muted);">Status</label><p>${req.status || 'Pending'}</p></div>
                <div><label style="font-size:12px;color:var(--muted);">Submitted</label><p>${fmtDate(req.created_at)}</p></div>
            </div>
            <h4 style="margin-bottom:8px;"><i class="fas fa-box-open"></i> Parts Requested</h4>
            ${items.length > 0 ? `<table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#f3f4f6;"><th style="padding:8px;text-align:left;">#</th><th style="padding:8px;text-align:left;">Code</th><th style="padding:8px;text-align:left;">Name</th><th style="padding:8px;text-align:right;">Qty</th></tr></thead><tbody>${items.map((it, i) => `<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:8px;">${i + 1}</td><td style="padding:8px;">${it.part_code || '—'}</td><td style="padding:8px;">${it.part_name || it.part_code || '—'}</td><td style="padding:8px;text-align:right;">${it.quantity}</td></tr>`).join('')}</tbody></table>` : '<p style="color:var(--muted);font-size:13px;">No items recorded</p>'}
            ${req.additional_notes ? `<h4 style="margin:12px 0 6px;"><i class="fas fa-sticky-note"></i> Additional Notes</h4><p style="font-size:13px;">${req.additional_notes}</p>` : ''}
            ${isRejected ? `<div style="margin-top:14px;padding:12px 16px;background:#fef2f2;border-left:4px solid #ef4444;border-radius:6px;"><p style="margin:0;font-weight:600;color:#dc2626;font-size:13px;"><i class="fas fa-times-circle"></i> Rejected</p>${req.review_notes ? `<p style="margin:6px 0 0;font-size:13px;color:#7f1d1d;">${req.review_notes}</p>` : ''}${req.reviewed_by_name ? `<p style="margin:4px 0 0;font-size:12px;color:var(--muted);">By: ${req.reviewed_by_name}</p>` : ''}</div>` : ''}
            ${!isRejected && req.reviewed_by_name ? `<div style="margin-top:12px;padding:10px 12px;background:#f0fdf4;border-left:3px solid #10b981;border-radius:6px;font-size:13px;"><strong>Reviewed by:</strong> ${req.reviewed_by_name}${req.review_notes ? ` — "${req.review_notes}"` : ''}</div>` : ''}
        `;
        openModal('viewPartRequestModal');
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
    let ticketsComponent = document.querySelector('to-tickets');
    const ticketsList = document.getElementById('allTicketsList');
    const ticketCount = document.getElementById('ticketCount');

    // Ensure custom element upgrades before relying on component methods.
    if (ticketsComponent && typeof ticketsComponent.renderTickets !== 'function') {
        try {
            await customElements.whenDefined('to-tickets');
            ticketsComponent = document.querySelector('to-tickets');
        } catch (error) {
            console.warn('to-tickets component was not ready in time:', error);
        }
    }

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
                    if (ticketsList) {
                        ticketsList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--muted);"><i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 15px;"></i><p>No tickets assigned to you yet</p></div>';
                    }
                    if (ticketCount) {
                        ticketCount.textContent = '0 tickets';
                    }
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
    const sortedTickets = [...(Array.isArray(tickets) ? tickets : [])].sort((first, second) => {
        const firstTime = new Date(first?.created_at || first?.updated_at || first?.breakdown_datetime || first?.breakdown_date || 0).getTime();
        const secondTime = new Date(second?.created_at || second?.updated_at || second?.breakdown_datetime || second?.breakdown_date || 0).getTime();
        return secondTime - firstTime;
    });

    const ticketsComponent = document.querySelector('to-tickets');
    if (ticketsComponent && typeof ticketsComponent.renderTickets === 'function') {
        ticketsComponent.renderTickets(sortedTickets);
        return;
    }

    const ticketsList = document.getElementById('allTicketsList');
    if (!ticketsList) {
        console.warn('renderTickets fallback aborted: #allTicketsList not found and to-tickets component API unavailable.');
        return;
    }

    if (sortedTickets.length === 0) {
        ticketsList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--muted);"><i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 15px;"></i><p>No tickets found</p></div>';
        return;
    }

    ticketsList.innerHTML = sortedTickets.map(ticket => {
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

function bindTOTicketDetails() {
    const ticketDetailView = document.querySelector('#ticket-details to-ticket-detail-view');
    if (!ticketDetailView || ticketDetailView.dataset.bound === 'true') {
        return;
    }

    ticketDetailView.dataset.bound = 'true';

    ticketDetailView.addEventListener('to-ticket-detail-view:toast', (event) => {
        const message = event.detail?.message;
        const type = event.detail?.type || 'info';
        if (!message) {
            return;
        }

        showToast(message, type);
    });

    ticketDetailView.addEventListener('to-ticket-detail-view:back', (event) => {
        const requestedSection = String(
            event.detail?.returnSection
            || technicalOfficerTicketDetailReturnSection
            || 'tickets'
        ).trim() || 'tickets';

        ticketDetailView.closeView?.();
        navigateToSection(requestedSection);
    });
}

// View ticket details in the dashboard-local details section component.
function viewTicket(ticketId, options = {}) {
    const numericTicketId = Number(ticketId);
    if (!Number.isFinite(numericTicketId) || numericTicketId <= 0) {
        showToast('Invalid ticket ID.', 'error');
        return;
    }

    const ticketDetailView = document.querySelector('#ticket-details to-ticket-detail-view');
    if (!ticketDetailView || typeof ticketDetailView.open !== 'function') {
        showToast('Ticket details component is unavailable.', 'error');
        return;
    }

    const returnSection = String(options.returnSection || 'tickets').trim() || 'tickets';
    technicalOfficerTicketDetailReturnSection = returnSection;

    navigateToSection('ticket-details');
    window.scrollTo(0, 0);

    ticketDetailView.open(numericTicketId, {
        returnSection,
        focusHash: options.focusHash || '',
    });
}

// Cached options HTML for spare parts dropdowns (loaded once per modal open)
let _cachedSparePartOptionsHtml = '';

// Request spare parts for a ticket — opens the requestPartsModal and pre-populates it.
async function requestSparePartsForTicket(ticketId) {
    const ticket = allTickets.find(t => t.id === ticketId);

    // --- Pre-populate ticket info fields ---
    const requestingTicketIdField = document.getElementById('requestingTicketId');
    const relatedTicketIdField    = document.getElementById('relatedTicketId');
    const equipmentInput          = document.getElementById('equipmentInput');
    const locationInput           = document.getElementById('locationInput');
    const reportedByInput         = document.getElementById('reportedByInput');
    const reportedDateInput       = document.getElementById('reportedDateInput');
    const originalIssueTextarea   = document.getElementById('originalIssueTextarea');
    const prioritySelect          = document.getElementById('prioritySelect');

    if (requestingTicketIdField) requestingTicketIdField.value = ticketId;

    if (ticket) {
        const ticketIdFormatted = getDisplayTicketId(ticket);
        if (relatedTicketIdField)  relatedTicketIdField.value  = ticketIdFormatted;

        const assetName = ticket.machine_model_number || ticket.machine_name || `Machine #${ticket.machine_id}`;
        if (equipmentInput) {
            equipmentInput.value = assetName;
            equipmentInput.readOnly = true;
            equipmentInput.style.backgroundColor = '#f0f0f0';
        }
        if (locationInput)           locationInput.value           = ticket.location || '';
        if (reportedByInput)         reportedByInput.value         = ticket.reported_by_name || ticket.reporter_full_name || 'Unknown';
        if (reportedDateInput)       reportedDateInput.value       = ticket.created_at
            ? new Date(ticket.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
            : '';
        if (originalIssueTextarea)   originalIssueTextarea.value   = ticket.description || '';
        if (prioritySelect)          prioritySelect.value          = (ticket.priority || '').toLowerCase();
    }

    // --- Reset 'No spare parts' checkbox ---
    const noPartsCheckbox = document.getElementById('noSparePartsNeeded');
    if (noPartsCheckbox) {
        noPartsCheckbox.checked = false;
        toggleSparePartsSection(false);
    }

    // --- Load spare parts from API and build a single blank row ---
    const sparePartsContainer = document.getElementById('sparePartsContainer');
    if (sparePartsContainer) {
        try {
            const productsRes = await API.get('/products');
            const products = (productsRes.status === 'success' && Array.isArray(productsRes.data?.products))
                ? productsRes.data.products
                : [];

            _cachedSparePartOptionsHtml = products.length > 0
                ? products.map(p => `<option value="${p.sparepart_id}">${p.name} — ${p.sparepart_id}</option>`).join('')
                : '';
        } catch (err) {
            console.error('Could not load spare parts list from API:', err);
            _cachedSparePartOptionsHtml = '';
        }

        sparePartsContainer.innerHTML = _buildSparePartRow(false);
        _attachAvailabilityListeners(sparePartsContainer);
    }

    openModal('requestPartsModal');
}

// Check availability of spare parts via API
async function _checkSparePartAvailability(partCode, quantity) {
    try {
        const response = await API.post('/spare-part-requests/check-availability', {
            items: [{ part_code: partCode, quantity: quantity }]
        });
        if (response.status === 'success' && response.data?.items?.length > 0) {
            return response.data.items[0];
        }
        return null;
    } catch (err) {
        console.error('Availability check failed:', err);
        return null;
    }
}

// Update the availability status badge in a spare part row
function _updateAvailabilityBadge(row, result) {
    let badge = row.querySelector('.availability-badge');
    if (!badge) return;

    if (!result) {
        badge.innerHTML = '';
        badge.className = 'availability-badge';
        return;
    }

    let badgeClass = '';
    let badgeText = '';
    let icon = '';

    switch (result.status) {
        case 'available':
            badgeClass = 'badge-success';
            icon = '✓';
            badgeText = `In Stock (${result.available_qty} available)`;
            break;
        case 'insufficient':
            badgeClass = 'badge-warning';
            icon = '⚠';
            badgeText = `Low Stock (${result.available_qty} available, ${result.requested_qty} requested)`;
            break;
        case 'out_of_stock':
            badgeClass = 'badge-danger';
            icon = '✗';
            badgeText = 'Out of Stock';
            break;
        case 'not_found':
            badgeClass = 'badge-danger';
            icon = '✗';
            badgeText = 'Not in Catalog';
            break;
        default:
            badge.innerHTML = '';
            badge.className = 'availability-badge';
            return;
    }

    badge.className = `availability-badge ${badgeClass}`;
    badge.innerHTML = `<span class="badge-icon">${icon}</span> ${badgeText}`;
}

// Attach change/input listeners for availability checking to a row
function _attachAvailabilityListeners(container) {
    const rows = container.querySelectorAll('.spare-part-item');
    rows.forEach(row => {
        const select = row.querySelector('.form-select');
        const qtyInput = row.querySelector('input[type="number"]');
        
        if (select && !select.dataset.availabilityBound) {
            select.dataset.availabilityBound = 'true';
            select.addEventListener('change', async () => {
                const partCode = select.value;
                const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
                if (partCode) {
                    const result = await _checkSparePartAvailability(partCode, qty);
                    _updateAvailabilityBadge(row, result);
                } else {
                    _updateAvailabilityBadge(row, null);
                }
            });
        }
        
        if (qtyInput && !qtyInput.dataset.availabilityBound) {
            qtyInput.dataset.availabilityBound = 'true';
            let debounceTimer = null;
            qtyInput.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(async () => {
                    const partCode = select ? select.value : '';
                    const qty = parseInt(qtyInput.value) || 1;
                    if (partCode) {
                        const result = await _checkSparePartAvailability(partCode, qty);
                        _updateAvailabilityBadge(row, result);
                    }
                }, 300);
            });
        }
    });
}

// Build a single spare-part row HTML (first row has no remove button)
function _buildSparePartRow(removable = false, required = true) {
    const removeBtn = removable
        ? `<button type="button" onclick="this.parentElement.remove()" style="position:absolute;top:10px;right:10px;background:var(--danger);color:white;border:none;border-radius:50%;width:25px;height:25px;cursor:pointer;font-size:14px;">×</button>`
        : '';
    const reqAttr = required ? ' required' : '';
    return `
        <div class="spare-part-item" style="background:#f8f9fa;border-radius:8px;padding:15px;margin-bottom:10px;position:relative;">
            ${removeBtn}
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">Part Name</label>
                    <select class="form-select"${reqAttr}>
                        <option value="">Select Part</option>
                        ${_cachedSparePartOptionsHtml}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Quantity</label>
                    <input type="number" class="form-input" min="1" placeholder="Qty" value="1"${reqAttr}>
                </div>
            </div>
            <div class="availability-badge" style="margin-top:8px;font-size:0.85rem;"></div>
        </div>
    `;
}

// Toggle the spare-parts-required section visibility (called from the checkbox in the modal)
function toggleSparePartsSection(isChecked) {
    const section = document.getElementById('sparePartsSection');
    if (!section) return;
    section.style.display = isChecked ? 'none' : 'block';
    // Toggle required on all selects/inputs in the section
    section.querySelectorAll('select, input').forEach(el => {
        el.required = !isChecked;
    });
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
            try {
                if (!noSparePartsNeeded) {
                    // Spare parts requested path
                    // Validation: at least one part must be selected
                    if (sparePartItems.length === 0) {
                        showToast('Please select at least one spare part, or check "No Spare Parts Needed".', 'error');
                        return;
                    }

                    // Availability check before submission
                    try {
                        const availResponse = await API.post('/spare-part-requests/check-availability', {
                            items: sparePartItems.map(item => ({ part_code: item.part_code, quantity: item.quantity }))
                        });
                        
                        if (availResponse.status === 'success' && availResponse.data?.items) {
                            const unavailableItems = availResponse.data.items.filter(i => i.status === 'not_found');
                            const lowStockItems = availResponse.data.items.filter(i => i.status === 'insufficient' || i.status === 'out_of_stock');
                            
                            // Block submission if any parts are not in catalog
                            if (unavailableItems.length > 0) {
                                const partNames = unavailableItems.map(i => i.part_code).join(', ');
                                showToast(`Cannot submit: Parts not found in catalog: ${partNames}`, 'error');
                                return;
                            }
                            
                            // Warn about low/out of stock but allow submission
                            if (lowStockItems.length > 0) {
                                const warnings = lowStockItems.map(i => `${i.part_code}: ${i.message}`).join('; ');
                                console.warn('Low stock warning:', warnings);
                                // Continue submission with warning logged - IM will see availability when approving
                            }
                        }
                    } catch (availErr) {
                        console.warn('Availability check failed, proceeding with request:', availErr);
                        // Continue even if availability check fails
                    }

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
                        showToast(spareResponse.message || 'Failed to submit spare parts request.', 'error');
                        return;
                    }

                    // Backend's syncTicketStatus() already set the ticket to
                    // "Waiting for Spare Parts" — update local state directly,
                    // no duplicate PUT needed.
                    const ticketIndex = allTickets.findIndex(t => t.id == ticketId);
                    if (ticketIndex !== -1) {
                        allTickets[ticketIndex].status = 'Waiting for Spare Parts';
                    }

                    renderTickets(allTickets);
                    updateDashboardCounts(allTickets);
                    showToast('Spare parts request submitted to Inventory Manager. Waiting for approval.', 'success');
                    refreshTOSpareParts();

                } else {
                    // No spare parts needed → PUT to move ticket directly to In Progress
                    const response = await API.put(`/fault-tickets/${ticketId}`, {
                        status: 'In Progress'
                    });

                    if (response.status === 'success') {
                        const ticketIndex = allTickets.findIndex(t => t.id == ticketId);
                        if (ticketIndex !== -1) {
                            allTickets[ticketIndex].status = 'In Progress';
                        }

                        renderTickets(allTickets);
                        updateDashboardCounts(allTickets);
                        showToast('No spare parts needed. Work started! Status changed to In Progress.', 'success');
                    } else {
                        showToast(response.message || 'Status update failed. Please try again.', 'error');
                        return;
                    }
                }
            } catch (error) {
                console.error('Error submitting spare parts request:', error);
                showToast(error.message || 'Failed to submit request. Please try again.', 'error');
                return;
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

        const shellSidebar = document.querySelector('to-shell-sidebar');
        if (shellSidebar && typeof shellSidebar.refreshNotificationBadge === 'function') {
            await shellSidebar.refreshNotificationBadge();
        }

        bindTOInventory();
        bindTONotifications();
        bindTOFeedback();
        bindTOTickets();
        bindTOTicketDetails();
        bindTOSpareParts();
        bindTOServiceWarranty();
        bindTOAnalyticsHub();

        // Load tickets and inventory after user data is loaded
        console.log('Loading tickets and inventory...');
        await loadTickets();
        await refreshTOInventory();
        await refreshTONotifications();

        const activeSection = new URLSearchParams(window.location.search).get('section');
        if (activeSection === 'analytics') {
            await refreshTOAnalyticsHub();
        }

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
    bindTOTicketDetails();
    bindTOInventory();
    bindTONotifications();
    bindTOFeedback();
    bindTOSpareParts();
    bindTOServiceWarranty();
    bindTOAnalyticsHub();

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
