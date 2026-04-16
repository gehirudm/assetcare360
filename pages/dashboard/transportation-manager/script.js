let currentUser = null;
let refreshIntervalId = null;
let currentFleetVehicleId = null;

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

function openModal(modalSelector) {
    const modal = getComponent(modalSelector);
    if (modal && typeof modal.open === 'function') {
        modal.open();
        return true;
    }
    return false;
}

function closeModal(modalSelector) {
    const modal = getComponent(modalSelector);
    if (modal && typeof modal.close === 'function') {
        modal.close();
        return true;
    }
    return false;
}

async function refreshDashboardOverview() {
    const dashboard = getComponent('tm-dashboard-overview');
    if (dashboard && typeof dashboard.refresh === 'function') {
        await dashboard.refresh();
    }
}

async function refreshTrips() {
    const section = getComponent('tm-trips');
    if (section && typeof section.refresh === 'function') {
        await section.refresh();
    }
}

async function refreshTripLog() {
    const section = getComponent('tm-trip-log');
    if (section && typeof section.refresh === 'function') {
        await section.refresh();
    }
}

async function refreshFuelLog() {
    const section = getComponent('tm-fuel-log');
    if (section && typeof section.refresh === 'function') {
        await section.refresh();
    }
}

async function refreshFleet() {
    const section = getComponent('tm-fleet');
    if (section && typeof section.refresh === 'function') {
        await section.refresh();
    }
}

async function refreshFleetDetails() {
    const section = getComponent('tm-fleet-details');
    if (!section || typeof section.refresh !== 'function') {
        return;
    }

    if (currentFleetVehicleId && typeof section.open === 'function') {
        await section.open(currentFleetVehicleId);
        return;
    }

    await section.refresh();
}

async function refreshDriverAssignment() {
    const section = getComponent('tm-driver-assignment');
    if (section && typeof section.refresh === 'function') {
        await section.refresh();
    }
}

function navigateToSection(section) {
    const layout = getComponent('ac-layout');
    if (layout && typeof layout.navigateTo === 'function') {
        layout.navigateTo(section);
    }
}

// ─── Event Handlers ─────────────────────────────────────────────────────────

function setupDashboardOverviewEvents() {
    const overview = getComponent('tm-dashboard-overview');
    if (!overview || overview._eventsBound) return;
    overview._eventsBound = true;

    overview.addEventListener('tm-overview:navigate', (event) => {
        const section = event.detail?.section;
        if (section) navigateToSection(section);
    });

    overview.addEventListener('tm-overview:assign-trip', () => {
        const modal = getComponent('tm-assign-trip-modal');
        if (modal && typeof modal.open === 'function') {
            modal.open();
        }
    });

    overview.addEventListener('tm-overview:add-fuel', () => {
        const modal = getComponent('tm-add-fuel-log-modal');
        if (modal && typeof modal.open === 'function') {
            modal.open();
        }
    });
}

function setupTripsEvents() {
    const trips = getComponent('tm-trips');
    if (!trips || trips._eventsBound) return;
    trips._eventsBound = true;

    trips.addEventListener('tm-trips:assign', () => {
        const modal = getComponent('tm-assign-trip-modal');
        if (modal && typeof modal.open === 'function') {
            modal.open();
        }
    });

    trips.addEventListener('tm-trips:edit', (event) => {
        const tripId = event.detail?.tripId;
        if (!tripId) return;

        const modal = getComponent('tm-edit-trip-modal');
        if (modal && typeof modal.open === 'function') {
            modal.open(tripId);
        }
    });

    trips.addEventListener('tm-trips:view', (event) => {
        const tripId = event.detail?.tripId;
        if (!tripId) return;

        const modal = getComponent('tm-view-trip-modal');
        if (modal && typeof modal.open === 'function') {
            modal.open(tripId);
        }
    });

    trips.addEventListener('tm-trips:start', async (event) => {
        const tripId = event.detail?.tripId;
        if (!tripId) return;

        try {
            await API.post(`/trips/${tripId}/start`, {});
            showToast('Trip started successfully', 'success');
            await refreshTrips();
            await refreshDashboardOverview();
        } catch (error) {
            showToast(error.message || 'Failed to start trip', 'error');
        }
    });

    trips.addEventListener('tm-trips:end', (event) => {
        const tripId = event.detail?.tripId;
        if (!tripId) return;

        const modal = getComponent('tm-end-trip-modal');
        if (modal && typeof modal.open === 'function') {
            modal.open(tripId);
        }
    });

    trips.addEventListener('tm-trips:cancel', async (event) => {
        const tripId = event.detail?.tripId;
        if (!tripId) return;

        if (!confirm(`Cancel trip ${tripId}? This cannot be undone.`)) return;

        try {
            await API.post(`/trips/${tripId}/cancel`, {});
            showToast('Trip cancelled', 'success');
            await refreshTrips();
            await refreshDashboardOverview();
        } catch (error) {
            showToast(error.message || 'Failed to cancel trip', 'error');
        }
    });
}

function setupFuelLogEvents() {
    const fuelLog = getComponent('tm-fuel-log');
    if (!fuelLog || fuelLog._eventsBound) return;
    fuelLog._eventsBound = true;

    fuelLog.addEventListener('tm-fuel-log:add', () => {
        const modal = getComponent('tm-add-fuel-log-modal');
        if (modal && typeof modal.open === 'function') {
            modal.open();
        }
    });

    fuelLog.addEventListener('tm-fuel-log:view', (event) => {
        const logId = event.detail?.logId;
        if (!logId) return;

        const modal = getComponent('tm-view-fuel-modal');
        if (modal && typeof modal.open === 'function') {
            modal.open(logId);
        }
    });
}

function setupTripLogEvents() {
    const tripLog = getComponent('tm-trip-log');
    if (!tripLog || tripLog._eventsBound) return;
    tripLog._eventsBound = true;

    tripLog.addEventListener('tm-trip-log:view', (event) => {
        const tripId = event.detail?.tripId;
        if (!tripId) return;

        const modal = getComponent('tm-view-trip-modal');
        if (modal && typeof modal.open === 'function') {
            modal.open(tripId);
        }
    });
}

function setupFleetEvents() {
    const fleet = getComponent('tm-fleet');
    if (!fleet || fleet._eventsBound) return;
    fleet._eventsBound = true;

    fleet.addEventListener('tm-fleet:view', (event) => {
        const vehicleId = event.detail?.vehicleId;
        if (!vehicleId) return;

        currentFleetVehicleId = vehicleId;
        navigateToSection('fleet-details');

        const details = getComponent('tm-fleet-details');
        if (details && typeof details.open === 'function') {
            details.open(vehicleId);
        }
    });
}

function setupFleetDetailsEvents() {
    const details = getComponent('tm-fleet-details');
    if (!details || details._eventsBound) return;
    details._eventsBound = true;

    details.addEventListener('tm-fleet-details:back', () => {
        navigateToSection('fleet');
    });
}

function setupDriverAssignmentEvents() {
    const driverAssignment = getComponent('tm-driver-assignment');
    if (!driverAssignment || driverAssignment._eventsBound) return;
    driverAssignment._eventsBound = true;

    // Open assign driver modal
    driverAssignment.addEventListener('tm-driver-assignment:assign', (event) => {
        const vehicle = event.detail?.vehicle;
        if (!vehicle) return;

        const modal = getComponent('tm-assign-driver-modal');
        if (modal && typeof modal.open === 'function') {
            modal.open(vehicle);
        }
    });

    // Handle unassign driver
    driverAssignment.addEventListener('tm-driver-assignment:unassign', async (event) => {
        const { vehicleId, numberPlate } = event.detail || {};
        if (!vehicleId) return;

        const confirmDialog = getComponent('confirm-dialog');
        if (confirmDialog) {
            const confirmed = await confirmDialog.show({
                title: 'Unassign Driver',
                message: `Are you sure you want to unassign the driver from vehicle ${numberPlate}?`,
                confirmText: 'Unassign',
                cancelText: 'Cancel',
                type: 'warning'
            });
            if (!confirmed) return;
        }

        try {
            await API.post(`/vehicles/${vehicleId}/unassign-driver`, {});
            showToast('Driver unassigned successfully', 'success');
            await refreshDriverAssignment();
        } catch (error) {
            showToast(error.message || 'Failed to unassign driver', 'error');
        }
    });

    // Listen for successful assignment from modal
    document.addEventListener('tm-driver-assignment:assigned', async (event) => {
        const { previousVehicle } = event.detail || {};
        let message = 'Driver assigned successfully';
        if (previousVehicle) {
            message += `. Driver was unassigned from ${previousVehicle.number_plate}`;
        }
        showToast(message, 'success');
        await refreshDriverAssignment();
    });
}

function setupModalEvents() {
    // Listen for modal completion events
    document.addEventListener('tm-modal:trip-assigned', async () => {
        await refreshTrips();
        await refreshDashboardOverview();
    });

    document.addEventListener('tm-modal:trip-updated', async () => {
        await refreshTrips();
        await refreshDashboardOverview();
    });

    document.addEventListener('tm-modal:trip-ended', async () => {
        await refreshTrips();
        await refreshTripLog();
        await refreshDashboardOverview();
    });

    document.addEventListener('tm-modal:fuel-added', async () => {
        await refreshFuelLog();
        await refreshDashboardOverview();
    });

    // Refresh fuel log whenever the section becomes visible
    document.addEventListener('section-change', async (event) => {
        if (event.detail?.section === 'fuel-log') {
            await refreshFuelLog();
            return;
        }

        if (event.detail?.section === 'fleet-details') {
            await refreshFleetDetails();
        }
    });

    // Listen for toast events from utils
    document.addEventListener('tm-ui:toast', (event) => {
        const { message, type } = event.detail || {};
        if (message) showToast(message, type);
    });
}

// ─── Initialization ─────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    try {
        currentUser = await DashboardInit.init(['Transportation Manager', 'Admin'], {
            updateUserDisplay: true,
        });

        setupDashboardOverviewEvents();
        setupTripsEvents();
        setupFuelLogEvents();
        setupTripLogEvents();
        setupFleetEvents();
        setupFleetDetailsEvents();
        setupDriverAssignmentEvents();
        setupModalEvents();

        // Auto-refresh fuel log every 30 seconds while the page is open
        setInterval(async () => {
            const fuelLogSection = document.getElementById('fuel-log');
            if (fuelLogSection && fuelLogSection.classList.contains('active')) {
                await refreshFuelLog();
            }
        }, 30000);

    } catch (error) {
        console.error('Transportation manager dashboard initialization failed:', error);
        window.location.href = CONFIG.ROUTES.LOGIN;
    }
});

