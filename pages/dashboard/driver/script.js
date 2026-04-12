let currentUser = null;
let refreshIntervalId = null;

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

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeActiveModalWithEscape();
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    bindOrchestrationEvents();

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
                    refreshSection('vehicle-check');
                    refreshSection('breakdown');
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
