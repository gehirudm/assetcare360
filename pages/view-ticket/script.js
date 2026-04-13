let ticketData = null;
let currentUser = null;
let allMachineTickets = [];
let budgetManager = null;

const BUDGET_ACTIONS = new Set([
    'budget-open-create',
    'budget-open-edit',
    'budget-delete',
    'budget-close-modal'
]);

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    if (!toast || !toastMessage) return;

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

function showError(message) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    document.getElementById('errorMessage').textContent = message;
}

function formatDate(dateString) {
    if (window.FaultTicketDetailTemplate?.formatDateTime) {
        return window.FaultTicketDetailTemplate.formatDateTime(dateString);
    }

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

function encodeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getTicketBadgeId(ticket) {
    return window.FaultTicketDetailTemplate?.formatTicketDisplayId
        ? window.FaultTicketDetailTemplate.formatTicketDisplayId(ticket)
        : (ticket.ticket_id || (`MBD-${String(ticket.id).padStart(3, '0')}`));
}

function getTicketStatusClass(status) {
    return window.FaultTicketDetailTemplate?.toStatusClass
        ? window.FaultTicketDetailTemplate.toStatusClass(status || 'New')
        : (status || 'New').toLowerCase().replace(/\s+/g, '-');
}

function getTicketPriorityClass(priority) {
    return window.FaultTicketDetailTemplate?.toPriorityClass
        ? window.FaultTicketDetailTemplate.toPriorityClass(priority || 'Medium')
        : (priority || 'Medium').toLowerCase();
}

function ensureBudgetManager() {
    if (budgetManager) return;

    budgetManager = new window.ViewTicketBudgetManager({
        api: API,
        getCurrentUser: () => currentUser,
        getTicketData: () => ticketData,
        showToast,
        formatDate
    });
}

async function loadUserData() {
    try {
        currentUser = await Auth.checkAuth();
        if (!currentUser) return;

        const fullName = currentUser.full_name || currentUser.name || 'User';
        document.getElementById('userName').textContent = fullName;
        document.getElementById('userAvatar').textContent = fullName.charAt(0).toUpperCase();

        if (currentUser.employee_id) {
            document.getElementById('userEmployeeId').textContent = `ID: ${currentUser.employee_id}`;
        }

        if (currentUser.role) {
            document.getElementById('userRole').textContent = currentUser.role;
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

function setupBackButton() {
    const backButton = document.getElementById('backButton');
    if (!backButton) return;

    backButton.addEventListener('click', () => {
        window.ViewTicketRouting.navigateBack(currentUser);
    });
}

async function loadTicketDetails() {
    const ticketId = window.ViewTicketRouting.getTicketIdFromUrl();
    if (!ticketId) {
        showError('No ticket ID provided in the URL');
        return;
    }

    try {
        const response = await API.get(`/fault-tickets/${ticketId}`);

        if (response.status !== 'success' || !response.data) {
            showError(response.message || 'Failed to load ticket details');
            return;
        }

        ticketData = response.data;
        displayTicketDetails(ticketData);
        await loadPriorTickets(ticketData.machine_id);
    } catch (error) {
        console.error('Error loading ticket:', error);
        showError('An error occurred while loading the ticket. Please try again.');
    }
}

function displayTicketDetails(ticket) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';

    const ticketIdFormatted = getTicketBadgeId(ticket);
    document.getElementById('ticketIdBadge').textContent = ticketIdFormatted;
    document.getElementById('ticketId').textContent = ticketIdFormatted;

    document.getElementById('ticketCreatedDate').textContent = formatDate(ticket.created_at);
    document.getElementById('ticketReporter').textContent = ticket.reported_by_name || ticket.reporter_full_name || 'Unknown';
    document.getElementById('ticketLocation').textContent = ticket.location || 'Not specified';
    document.getElementById('ticketDescription').textContent = ticket.description || 'No description provided';

    const priority = getTicketPriorityClass(ticket.priority);
    document.getElementById('ticketPriority').innerHTML = `
        <span class="status-badge priority-${priority}">
            <i class="fas fa-exclamation-circle"></i> ${encodeHtml(ticket.priority || 'Medium')}
        </span>
    `;

    const status = getTicketStatusClass(ticket.status);
    document.getElementById('ticketStatus').innerHTML = `
        <span class="status-badge status-${status}">
            <i class="fas fa-circle"></i> ${encodeHtml(ticket.status || 'New')}
        </span>
    `;

    document.getElementById('machineId').textContent = ticket.machine_id || 'N/A';
    document.getElementById('machineModel').textContent = ticket.machine_model_number || 'N/A';
    document.getElementById('machineName').textContent = ticket.machine_name || 'N/A';
    document.getElementById('machineType').textContent = ticket.machine_type || 'N/A';

    renderPhotos(ticket.photos || []);
    renderAssignments(ticket.assignments || []);
    displayActionButtons(ticket);
}

function renderPhotos(photos) {
    const section = document.getElementById('photosSection');
    const container = document.getElementById('ticketPhotos');

    if (!section || !container) return;

    if (!Array.isArray(photos) || photos.length === 0) {
        section.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    section.style.display = 'block';
    container.className = 'photo-gallery';
    container.innerHTML = photos.map((photo, index) => `
        <div class="photo-gallery-item" data-action="open-image-viewer" data-image-url="${encodeURIComponent(photo.url)}">
            <img src="${encodeHtml(photo.url)}" alt="Ticket photo ${index + 1}">
            <div class="photo-overlay">
                <i class="fas fa-search-plus"></i> View
            </div>
        </div>
    `).join('');
}

function renderAssignments(assignments) {
    const card = document.getElementById('assignmentsCard');
    const list = document.getElementById('assignmentsList');

    if (!card || !list) return;

    if (!Array.isArray(assignments) || assignments.length === 0) {
        card.style.display = 'none';
        list.innerHTML = '';
        return;
    }

    card.style.display = 'block';
    list.innerHTML = assignments.map((assignment) => {
        const name = assignment.technician_name || 'Unknown';
        const avatar = name.charAt(0).toUpperCase();
        const assignedDate = formatDate(assignment.assigned_at);
        const expectedDate = assignment.expected_completion_date ? formatDate(assignment.expected_completion_date) : 'Not set';

        return `
            <div class="assignment-item">
                <div class="assignment-avatar">${encodeHtml(avatar)}</div>
                <div class="assignment-details">
                    <div class="assignment-name">${encodeHtml(name)}</div>
                    <div class="assignment-meta">
                        <span><i class="fas fa-envelope"></i> ${encodeHtml(assignment.technician_email || 'N/A')}</span>
                        <span><i class="fas fa-phone"></i> ${encodeHtml(assignment.technician_phone || 'N/A')}</span>
                    </div>
                    <div class="assignment-meta">
                        <span><i class="fas fa-calendar-plus"></i> Assigned: ${encodeHtml(assignedDate)}</span>
                        <span><i class="fas fa-calendar-check"></i> Expected: ${encodeHtml(expectedDate)}</span>
                    </div>
                    ${assignment.notes ? `<div style="margin-top: 8px; font-size: 0.9rem; color: var(--text-600);"><i class="fas fa-sticky-note"></i> ${encodeHtml(assignment.notes)}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function displayActionButtons(ticket) {
    const actionButtons = document.getElementById('actionButtons');
    if (!actionButtons) return;

    const role = currentUser?.role;
    let buttons = '';

    if (role === 'Technical Officer') {
        if (ticket.status === 'New' || ticket.status === 'Pending') {
            buttons += `
                <button type="button" class="btn btn-success" data-action="ticket-accept">
                    <i class="fas fa-check"></i> Accept Ticket
                </button>
            `;
        }

        if (ticket.status === 'In Progress') {
            buttons += `
                <button type="button" class="btn btn-primary" data-action="ticket-update-progress">
                    <i class="fas fa-tasks"></i> Update Progress
                </button>
                <button type="button" class="btn btn-success" data-action="ticket-mark-complete">
                    <i class="fas fa-check-double"></i> Mark Complete
                </button>
            `;
        }
    }

    if (role === 'Supervisor' || role === 'Admin') {
        buttons += `
            <button type="button" class="btn btn-primary" data-action="ticket-edit">
                <i class="fas fa-edit"></i> Edit Ticket
            </button>
            <button type="button" class="btn btn-primary" data-action="ticket-assign-technicians">
                <i class="fas fa-user-plus"></i> Assign Technicians
            </button>
        `;
    }

    actionButtons.innerHTML = buttons;
}

async function loadPriorTickets(machineId) {
    const priorTicketsList = document.getElementById('priorTicketsList');
    const viewAllBtn = document.getElementById('viewAllTicketsBtn');

    if (!priorTicketsList || !viewAllBtn) return;

    try {
        const response = await API.get(`/fault-tickets?machine_id=${machineId}`);

        if (response.status !== 'success' || !response.data) {
            priorTicketsList.innerHTML = `
                <p style="text-align: center; color: var(--danger); padding: 20px;">
                    <i class="fas fa-exclamation-triangle"></i> Error loading ticket history
                </p>
            `;
            return;
        }

        const tickets = response.data.tickets || response.data || [];
        const currentTicketId = ticketData.id;
        const priorTickets = tickets
            .filter((ticket) => ticket.id !== currentTicketId)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5);

        const totalPriorTickets = tickets.filter((ticket) => ticket.id !== currentTicketId).length;

        if (priorTickets.length === 0) {
            priorTicketsList.innerHTML = `
                <p style="text-align: center; color: var(--muted); padding: 20px;">
                    <i class="fas fa-info-circle"></i> No prior tickets found for this asset
                </p>
            `;
            viewAllBtn.style.display = 'none';
            return;
        }

        priorTicketsList.innerHTML = priorTickets.map((ticket) => {
            const ticketIdFormatted = getTicketBadgeId(ticket);
            const status = getTicketStatusClass(ticket.status);

            return `
                <div class="ticket-history-item" data-action="view-ticket" data-ticket-id="${ticket.id}">
                    <div class="ticket-history-header">
                        <span class="ticket-history-id">${encodeHtml(ticketIdFormatted)}</span>
                        <span class="status-badge status-${status}">${encodeHtml(ticket.status || 'New')}</span>
                    </div>
                    <div class="ticket-history-desc">${encodeHtml(ticket.description || 'No description')}</div>
                    <div class="ticket-history-meta">
                        <span><i class="fas fa-calendar"></i> ${encodeHtml(formatDate(ticket.created_at))}</span>
                        <span><i class="fas fa-flag"></i> ${encodeHtml(ticket.priority || 'Medium')}</span>
                    </div>
                </div>
            `;
        }).join('');

        viewAllBtn.style.display = totalPriorTickets > 0 ? 'inline-flex' : 'none';
        if (totalPriorTickets > 5) {
            viewAllBtn.innerHTML = `<i class="fas fa-list"></i> View All (${totalPriorTickets})`;
        } else {
            viewAllBtn.innerHTML = '<i class="fas fa-list"></i> View All';
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

async function openAllTicketsModal() {
    const modal = document.getElementById('allTicketsModal');
    const content = document.getElementById('allTicketsContent');
    const assetName = document.getElementById('modalAssetName');

    if (!modal || !content || !assetName || !ticketData) return;

    modal.classList.add('active');
    assetName.textContent = ticketData.machine_name || ticketData.machine_model_number || `Asset #${ticketData.machine_id}`;
    content.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Loading all tickets...</p>';

    try {
        const response = await API.get(`/fault-tickets?machine_id=${ticketData.machine_id}`);

        if (response.status !== 'success' || !response.data) {
            content.innerHTML = '<p style="text-align: center; color: var(--danger); padding: 40px;"><i class="fas fa-exclamation-triangle"></i> Error loading tickets</p>';
            return;
        }

        const tickets = response.data.tickets || response.data || [];
        allMachineTickets = tickets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (allMachineTickets.length === 0) {
            content.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 40px;"><i class="fas fa-info-circle"></i> No tickets found for this asset</p>';
            return;
        }

        renderAllTickets();
    } catch (error) {
        console.error('Error loading all tickets:', error);
        content.innerHTML = '<p style="text-align: center; color: var(--danger); padding: 40px;"><i class="fas fa-exclamation-triangle"></i> Error loading tickets</p>';
    }
}

function closeAllTicketsModal() {
    const modal = document.getElementById('allTicketsModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function renderAllTickets() {
    const content = document.getElementById('allTicketsContent');
    if (!content || !ticketData) return;

    content.innerHTML = allMachineTickets.map((ticket) => {
        const ticketIdFormatted = getTicketBadgeId(ticket);
        const status = getTicketStatusClass(ticket.status);
        const isCurrent = ticket.id === ticketData.id;

        let photosHtml = '';
        if (Array.isArray(ticket.photos) && ticket.photos.length > 0) {
            photosHtml = `
                <div class="modal-ticket-images">
                    ${ticket.photos.slice(0, 4).map((photo) => `
                        <img src="${encodeHtml(photo.url)}" alt="Ticket image" data-action="open-image-viewer" data-image-url="${encodeURIComponent(photo.url)}">
                    `).join('')}
                    ${ticket.photos.length > 4 ? `<div style="display: flex; align-items: center; justify-content: center; background: var(--stone-200); color: var(--muted); font-weight: 600; border-radius: 6px;">+${ticket.photos.length - 4} more</div>` : ''}
                </div>
            `;
        }

        return `
            <div class="modal-ticket-item ${isCurrent ? 'current-ticket' : ''}" data-action="view-ticket" data-ticket-id="${ticket.id}" style="${isCurrent ? 'border-left-color: var(--kelly-green); background: #f0fdf4;' : ''}">
                <div class="modal-ticket-header">
                    <span class="modal-ticket-id">
                        ${encodeHtml(ticketIdFormatted)}
                        ${isCurrent ? '<span style="font-size: 0.75rem; background: var(--kelly-green); color: white; padding: 2px 8px; border-radius: 10px; margin-left: 8px; font-weight: 600;">CURRENT</span>' : ''}
                    </span>
                    <span class="status-badge status-${status}">
                        <i class="fas fa-circle"></i> ${encodeHtml(ticket.status || 'New')}
                    </span>
                </div>
                <div class="modal-ticket-desc">${encodeHtml(ticket.description || 'No description')}</div>
                <div class="modal-ticket-meta">
                    <span><i class="fas fa-calendar"></i> ${encodeHtml(formatDate(ticket.created_at))}</span>
                    <span><i class="fas fa-flag"></i> Priority: <strong style="color: var(--text-900);">${encodeHtml(ticket.priority || 'Medium')}</strong></span>
                    <span><i class="fas fa-user"></i> ${encodeHtml(ticket.reported_by_name || ticket.reporter_full_name || 'Unknown')}</span>
                    ${ticket.location ? `<span><i class="fas fa-map-marker-alt"></i> ${encodeHtml(ticket.location)}</span>` : ''}
                </div>
                ${photosHtml}
                ${!isCurrent ? '<div style="margin-top: 10px; font-size: 0.85rem; color: var(--royal-blue); font-weight: 600;"><i class="fas fa-arrow-right"></i> Click to view details</div>' : ''}
            </div>
        `;
    }).join('');
}

function navigateToTicket(ticketId) {
    if (!ticketId) return;

    if (ticketData && Number(ticketId) === Number(ticketData.id)) {
        closeAllTicketsModal();
        return;
    }

    window.location.href = window.ViewTicketRouting.buildViewTicketUrl(ticketId);
}

function openImageViewer(imageUrl) {
    const modal = document.getElementById('imageViewerModal');
    const image = document.getElementById('viewerImage');
    if (!modal || !image) return;

    image.src = imageUrl;
    modal.classList.add('active');
}

function closeImageViewer() {
    const modal = document.getElementById('imageViewerModal');
    if (!modal) return;

    modal.classList.remove('active');
}

function openLogoutModal() {
    document.getElementById('logoutModal').classList.add('active');
}

function closeLogoutModal() {
    document.getElementById('logoutModal').classList.remove('active');
}

function confirmLogout() {
    Auth.logout();
}

function acceptTicket() {
    showToast('Ticket accepted! Redirecting to update page...');
}

function updateProgress() {
    showToast('Opening progress update form...');
}

function markComplete() {
    showToast('Opening completion form...');
}

function editTicket() {
    showToast('Opening edit form...');
}

function assignTechnicians() {
    showToast('Opening assignment form...');
}

async function handleActionClick(actionElement, event) {
    const action = actionElement.dataset.action;
    if (!action) return;

    if (BUDGET_ACTIONS.has(action)) {
        await budgetManager.handleAction(action, actionElement);
        return;
    }

    switch (action) {
        case 'logout-open':
            openLogoutModal();
            break;
        case 'logout-close':
            closeLogoutModal();
            break;
        case 'logout-confirm':
            confirmLogout();
            break;
        case 'retry-load':
            window.location.reload();
            break;
        case 'open-all-tickets':
            await openAllTicketsModal();
            break;
        case 'close-all-tickets':
            closeAllTicketsModal();
            break;
        case 'open-image-viewer': {
            event.preventDefault();
            event.stopPropagation();
            const encodedImage = actionElement.dataset.imageUrl || '';
            openImageViewer(decodeURIComponent(encodedImage));
            break;
        }
        case 'close-image-viewer':
            closeImageViewer();
            break;
        case 'view-ticket': {
            const ticketId = Number(actionElement.dataset.ticketId);
            navigateToTicket(ticketId);
            break;
        }
        case 'ticket-accept':
            acceptTicket();
            break;
        case 'ticket-update-progress':
            updateProgress();
            break;
        case 'ticket-mark-complete':
            markComplete();
            break;
        case 'ticket-edit':
            editTicket();
            break;
        case 'ticket-assign-technicians':
            assignTechnicians();
            break;
        default:
            break;
    }
}

function setupEventDelegation() {
    document.addEventListener('click', async (event) => {
        const actionElement = event.target.closest('[data-action]');
        if (!actionElement) return;

        await handleActionClick(actionElement, event);
    });

    const imageViewerModal = document.getElementById('imageViewerModal');
    if (imageViewerModal) {
        imageViewerModal.addEventListener('click', (event) => {
            if (event.target === imageViewerModal) {
                closeImageViewer();
            }
        });
    }

    const budgetForm = document.getElementById('budgetReportForm');
    if (budgetForm) {
        budgetForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            await budgetManager.submitBudgetReport(event.target);
        });
    }
}

window.viewTicket = navigateToTicket;
window.openAllTicketsModal = openAllTicketsModal;
window.closeAllTicketsModal = closeAllTicketsModal;
window.openImageViewer = openImageViewer;
window.closeImageViewer = closeImageViewer;
window.handleLogout = openLogoutModal;
window.closeLogoutModal = closeLogoutModal;
window.confirmLogout = confirmLogout;

(async function initialize() {
    ensureBudgetManager();
    setupEventDelegation();

    await loadUserData();
    setupBackButton();
    await loadTicketDetails();
    await budgetManager.loadBudgetReport();
}());
