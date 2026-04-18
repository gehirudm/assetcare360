let currentUser = null;
let refreshIntervalId = null;
let moTicketDetailsReturnSection = 'fault-reporting';

function getComponent(selector) {
    return document.querySelector(selector);
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) {
        return;
    }

    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';

    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        return false;
    }

    modal.classList.add('active');
    return true;
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        return false;
    }

    modal.classList.remove('active');
    return true;
}

function setSidebarNotificationBadge(count) {
    const sidebar = document.querySelector('ac-layout ac-sidebar');
    if (sidebar && typeof sidebar.setNotifBadge === 'function') {
        sidebar.setNotifBadge(count);
    }
}

function syncCurrentUserToComponents(user) {
    const targets = [
        getComponent('mo-fault-reporting'),
        getComponent('mo-condition-updates'),
        getComponent('mo-report-fault-modal'),
        getComponent('mo-condition-update-modal'),
    ];

    targets.forEach((target) => {
        if (target && typeof target.setCurrentUser === 'function') {
            target.setCurrentUser(user);
        }
    });
}

async function refreshDashboardOverview() {
    const dashboard = getComponent('mo-dashboard-overview');
    if (dashboard && typeof dashboard.refresh === 'function') {
        await dashboard.refresh();
    }
}

async function refreshFaultReporting() {
    const section = getComponent('mo-fault-reporting');
    if (section && typeof section.refresh === 'function') {
        await section.refresh();
    }
}

async function refreshTicketDetails() {
    const section = getComponent('mo-ticket-detail-view');
    if (section && typeof section.refresh === 'function') {
        await section.refresh();
    }
}

async function refreshConditionUpdates() {
    const section = getComponent('mo-condition-updates');
    if (section && typeof section.refresh === 'function') {
        await section.refresh();
    }
}

function refreshNotifications() {
    const section = getComponent('mo-notifications');
    if (section && typeof section.refresh === 'function') {
        section.refresh();
    }
}

async function refreshAllSections() {
    await Promise.all([
        refreshDashboardOverview(),
        refreshFaultReporting(),
        refreshTicketDetails(),
        refreshConditionUpdates(),
    ]);

    refreshNotifications();
}

async function refreshSection(sectionId) {
    if (sectionId === 'dashboard') {
        await refreshDashboardOverview();
        return;
    }

    if (sectionId === 'fault-reporting') {
        await refreshFaultReporting();
        return;
    }

    if (sectionId === 'ticket-details') {
        await refreshTicketDetails();
        return;
    }

    if (sectionId === 'condition-updates') {
        await refreshConditionUpdates();
        return;
    }

    if (sectionId === 'notifications') {
        refreshNotifications();
    }
}

function closeActiveModal() {
    const activeModal = document.querySelector('.modal.active');
    if (activeModal) {
        activeModal.classList.remove('active');
    }
}

function bindMOTicketDetailView() {
    const ticketDetailView = document.querySelector('#ticket-details mo-ticket-detail-view');
    if (!ticketDetailView || ticketDetailView.dataset.bound === 'true') {
        return;
    }

    ticketDetailView.dataset.bound = 'true';

    ticketDetailView.addEventListener('mo-ticket-detail-view:toast', (event) => {
        const message = event.detail?.message;
        const type = event.detail?.type || 'info';
        if (!message) {
            return;
        }

        showToast(message, type);
    });

    ticketDetailView.addEventListener('mo-ticket-detail-view:back', (event) => {
        const requestedSection = String(
            event.detail?.returnSection
            || moTicketDetailsReturnSection
            || 'fault-reporting'
        ).trim() || 'fault-reporting';

        ticketDetailView.closeView?.();
        const layout = document.querySelector('ac-layout');
        layout?.navigateTo?.(requestedSection);
    });

    ticketDetailView.addEventListener('mo-ticket-detail-view:edit-request', (event) => {
        const ticketId = Number(event.detail?.ticketId || 0);
        if (!Number.isFinite(ticketId) || ticketId <= 0) {
            showToast('Invalid ticket selected for edit.', 'warning');
            return;
        }

        document.dispatchEvent(new CustomEvent('mo:open-edit-fault', {
            detail: { ticketId },
        }));
    });
}

function viewMOTicketDetails(ticketId, options = {}) {
    const numericTicketId = Number(ticketId);
    if (!Number.isFinite(numericTicketId) || numericTicketId <= 0) {
        showToast('Linked ticket is not available for this report yet.', 'warning');
        return;
    }

    const ticketDetailView = document.querySelector('#ticket-details mo-ticket-detail-view');
    if (!ticketDetailView || typeof ticketDetailView.open !== 'function') {
        showToast('Ticket details component is unavailable.', 'error');
        return;
    }

    const returnSection = String(options.returnSection || 'fault-reporting').trim() || 'fault-reporting';
    moTicketDetailsReturnSection = returnSection;

    const layout = document.querySelector('ac-layout');
    layout?.navigateTo?.('ticket-details');
    window.scrollTo(0, 0);

    ticketDetailView.open(numericTicketId, {
        returnSection,
        focusHash: String(options.focusHash || '').trim(),
    });
}

function bindDashboardEvents() {
    const layout = document.querySelector('ac-layout');
    if (layout) {
        layout.addEventListener('section-change', async (event) => {
            const section = event.detail?.section;
            if (section) {
                await refreshSection(section);
            }
        });
    }

    document.addEventListener('mo-ui:toast', (event) => {
        const message = event.detail?.message;
        if (!message) {
            return;
        }

        showToast(message, event.detail?.type || 'success');
    });

    document.addEventListener('mo:notifications-count', (event) => {
        const count = Number.parseInt(event.detail?.count, 10);
        setSidebarNotificationBadge(Number.isFinite(count) ? count : 0);
    });

    document.addEventListener('mo:open-report-fault-modal', () => {
        getComponent('mo-report-fault-modal')?.open();
    });

    document.addEventListener('mo:open-condition-update-modal', () => {
        getComponent('mo-condition-update-modal')?.open();
    });

    document.addEventListener('mo:open-weekly-check-edit', (event) => {
        const check = event.detail?.check || null;
        const normalizedStatus = String(check?.status || '').trim().toLowerCase();
        if (!check || normalizedStatus !== 'pending') {
            return;
        }

        getComponent('mo-condition-update-modal')?.open({ mode: 'edit', check });
    });

    document.addEventListener('mo:open-edit-fault', (event) => {
        const ticketId = event.detail?.ticketId;
        if (!ticketId) {
            return;
        }

        getComponent('mo-edit-fault-modal')?.openWithTicket(ticketId);
    });

    document.addEventListener('mo:open-machine-details', (event) => {
        const machineId = event.detail?.machineId;
        if (!machineId) {
            return;
        }

        getComponent('mo-machine-details-modal')?.open(machineId);
    });

    document.addEventListener('mo:open-machine-breakdown-details', (event) => {
        const breakdownId = event.detail?.breakdownId;
        if (!breakdownId) {
            return;
        }

        getComponent('mo-machine-breakdown-details-modal')?.open(breakdownId);
    });

    document.addEventListener('mo:open-weekly-check-details', (event) => {
        getComponent('mo-weekly-check-details-modal')?.open(event.detail || {});
    });

    document.addEventListener('mo:fault-created', async () => {
        await Promise.all([
            refreshDashboardOverview(),
            refreshFaultReporting(),
        ]);
        refreshNotifications();
    });

    document.addEventListener('mo:fault-updated', async () => {
        await Promise.all([
            refreshFaultReporting(),
            refreshTicketDetails(),
        ]);
    });

    document.addEventListener('mo:open-ticket-details', (event) => {
        const ticketId = event.detail?.ticketId;
        const returnSection = event.detail?.returnSection || 'fault-reporting';
        const focusHash = event.detail?.focusHash || '';

        viewMOTicketDetails(ticketId, {
            returnSection,
            focusHash,
        });
    });

    document.addEventListener('mo:weekly-check-submitted', async () => {
        await Promise.all([
            refreshDashboardOverview(),
            refreshConditionUpdates(),
        ]);
    });

    document.addEventListener('mo:weekly-check-updated', async () => {
        await Promise.all([
            refreshDashboardOverview(),
            refreshConditionUpdates(),
        ]);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeActiveModal();
        }
    });
}

function setupMobileMenu() {
    if (window.innerWidth > 768) {
        return;
    }

    if (document.querySelector('.menu-btn')) {
        return;
    }

    const menuBtn = document.createElement('button');
    menuBtn.className = 'menu-btn';
    menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
    menuBtn.style.cssText = [
        'position: fixed',
        'top: 80px',
        'left: 20px',
        'z-index: 1000',
        'background: var(--royal-blue)',
        'color: white',
        'border: none',
        'padding: 12px 16px',
        'border-radius: 8px',
        'font-size: 20px',
        'cursor: pointer',
        'box-shadow: var(--shadow)',
    ].join('; ');

    menuBtn.addEventListener('click', () => {
        document.querySelector('.sidebar')?.classList.toggle('open');
    });

    document.body.prepend(menuBtn);
}

function handleResize() {
    const menuBtn = document.querySelector('.menu-btn');

    if (window.innerWidth > 768 && menuBtn) {
        menuBtn.remove();
        return;
    }

    if (window.innerWidth <= 768 && !menuBtn) {
        setupMobileMenu();
    }
}

window.showToast = showToast;
window.openModal = openModal;
window.closeModal = closeModal;

window.addEventListener('resize', handleResize);

document.addEventListener('DOMContentLoaded', async () => {
    bindDashboardEvents();
    bindMOTicketDetailView();

    try {
        await DashboardInit.init(['Machinary Operator', 'Admin'], {
            updateUserDisplay: true,
            onSuccess: async (user) => {
                currentUser = user;
                syncCurrentUserToComponents(currentUser);
                await refreshAllSections();

                if (refreshIntervalId) {
                    clearInterval(refreshIntervalId);
                }

                refreshIntervalId = window.setInterval(() => {
                    refreshDashboardOverview();
                    refreshConditionUpdates();
                }, 30000);

                setupMobileMenu();
            },
        });
    } catch (error) {
        console.error('Initialization error:', error);
    }
});
