let currentUser = null;
let refreshIntervalId = null;
let driverTicketDetailsReturnSection = 'breakdown';

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast || !message) {
        return;
    }

    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';

    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

function componentSelectorBySection(sectionId) {
    const selectors = {
        dashboard: 'driver-dashboard-overview',
        'trip-log': 'driver-trip-log',
        'vehicle-check': 'driver-vehicle-check',
        breakdown: 'driver-breakdown',
        'ticket-details': 'driver-ticket-detail-view',
        'ticket-tracking': 'driver-ticket-tracking',
        'fuel-mileage': 'driver-fuel-mileage',
        'transport-ticket': 'driver-transport-ticket',
        garages: 'driver-garages',
    };

    return selectors[sectionId] || null;
}

async function refreshSection(sectionId) {
    const selector = componentSelectorBySection(sectionId);
    if (!selector) {
        return;
    }

    const component = document.querySelector(selector);
    if (component && typeof component.refresh === 'function') {
        await component.refresh();
    }
}

async function refreshAllSections() {
    const sections = [
        'dashboard',
        'trip-log',
        'vehicle-check',
        'breakdown',
        'ticket-details',
        'ticket-tracking',
        'fuel-mileage',
        'transport-ticket',
        'garages',
    ];

    for (const section of sections) {
        await refreshSection(section);
    }
}

function closeActiveModalWithEscape() {
    const activeModal = document.querySelector('.modal.active');
    if (!activeModal || !activeModal.id) {
        return;
    }

    DriverUtils.closeModal(activeModal.id);
}

function bindDriverTicketDetailView() {
    const ticketDetailView = document.querySelector('#ticket-details driver-ticket-detail-view');
    if (!ticketDetailView || ticketDetailView.dataset.bound === 'true') {
        return;
    }

    ticketDetailView.dataset.bound = 'true';

    ticketDetailView.addEventListener('driver-ticket-detail-view:toast', (event) => {
        const message = event.detail?.message;
        const type = event.detail?.type || 'info';
        if (!message) {
            return;
        }

        showToast(message, type);
    });

    ticketDetailView.addEventListener('driver-ticket-detail-view:back', (event) => {
        const requestedSection = String(
            event.detail?.returnSection
            || driverTicketDetailsReturnSection
            || 'breakdown'
        ).trim() || 'breakdown';

        ticketDetailView.closeView?.();
        const layout = document.querySelector('ac-layout');
        layout?.navigateTo?.(requestedSection);
    });
}

function viewDriverTicketDetails(ticketId, options = {}) {
    const numericTicketId = Number(ticketId);
    if (!Number.isFinite(numericTicketId) || numericTicketId <= 0) {
        showToast('Linked ticket is not available for this report yet.', 'warning');
        return;
    }

    const ticketDetailView = document.querySelector('#ticket-details driver-ticket-detail-view');
    if (!ticketDetailView || typeof ticketDetailView.open !== 'function') {
        showToast('Ticket details component is unavailable.', 'error');
        return;
    }

    const returnSection = String(options.returnSection || 'breakdown').trim() || 'breakdown';
    driverTicketDetailsReturnSection = returnSection;

    const layout = document.querySelector('ac-layout');
    layout?.navigateTo?.('ticket-details');
    window.scrollTo(0, 0);

    ticketDetailView.open(numericTicketId, {
        returnSection,
        focusHash: String(options.focusHash || '').trim(),
    });
}

function bindOrchestrationEvents() {
    const layout = document.querySelector('ac-layout');
    if (layout) {
        layout.addEventListener('section-change', async (event) => {
            const section = event.detail?.section;
            if (section) {
                await refreshSection(section);
            }
        });
    }

    document.addEventListener('driver-ui:toast', (event) => {
        const message = event.detail?.message;
        if (!message) {
            return;
        }

        showToast(message, event.detail?.type || 'success');
    });

    document.addEventListener('driver:data-summary-updated', () => {
        refreshSection('dashboard');
    });

    document.addEventListener('driver:open-ticket-details', (event) => {
        const ticketId = event.detail?.ticketId;
        const returnSection = event.detail?.returnSection || 'breakdown';
        const focusHash = event.detail?.focusHash || '';

        viewDriverTicketDetails(ticketId, {
            returnSection,
            focusHash,
        });
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeActiveModalWithEscape();
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    bindOrchestrationEvents();
    bindDriverTicketDetailView();

    try {
        await DashboardInit.init(['Driver', 'Admin'], {
            updateUserDisplay: true,
            onSuccess: async (user) => {
                currentUser = user;
                if (window.DriverUtils) {
                    DriverUtils.store.currentUser = user;
                }

                await refreshAllSections();

                if (refreshIntervalId) {
                    clearInterval(refreshIntervalId);
                }

                refreshIntervalId = window.setInterval(() => {
                    refreshSection('trip-log');
                    refreshSection('transport-ticket');
                    refreshSection('vehicle-check');
                    refreshSection('breakdown');
                    refreshSection('ticket-tracking');
                }, 30000);
            },
        });
    } catch (error) {
        console.error('Driver dashboard initialization failed:', error);
        showToast('Failed to initialize dashboard.', 'error');
    }
});

window.addEventListener('beforeunload', () => {
    if (refreshIntervalId) {
        clearInterval(refreshIntervalId);
    }
});
