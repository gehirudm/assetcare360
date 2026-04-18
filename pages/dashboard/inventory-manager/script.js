// ==================== AUTHENTICATION & INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async function () {
    try {
        // Check authentication and authorization using DashboardInit
        const user = await DashboardInit.init(['Inventory Manager', 'Admin'], {
            updateUserDisplay: true,
            onSuccess: async (user) => {
                currentUser = user;
                await initializeApp();
            }
        });
    } catch (error) {
        console.error('Authentication error:', error);
        window.location.href = CONFIG.ROUTES.LOGIN;
    }
});

let currentUser = null;

async function initializeApp() {
    try {
        showLoading(true);

        // Load current user info
        await loadCurrentUser();

        // Wire section component events and initialize overview metrics
        bindDashboardOverview();
        await refreshDashboardOverview().catch(err => {
            console.warn('Initial dashboard overview refresh failed:', err);
        });

        // Wire section component events and initialize notification badge state
        bindNotifications();
        await refreshNotifications().catch(err => {
            console.warn('Initial notifications refresh failed:', err);
        });

        // Wire insurance management section and initialize renewal status view
        bindInsuranceManagement();
        await refreshInsuranceManagement().catch(err => {
            console.warn('Initial insurance management refresh failed:', err);
        });

        // Wire catalog section events
        bindCatalog();

        // Wire sparepart addition events
        bindSparepartAddition();

        // Load initial data for active section
        const activeSection = document.querySelector('.content-section.active')?.id;
        if (activeSection) {
            await loadSectionData(activeSection).catch(err => {
                console.warn('Section data loading failed:', err);
            });
        }

        showLoading(false);
    } catch (error) {
        console.error('Failed to initialize app:', error);
        Utils.showToast('Failed to load application. Please refresh the page.', 'error');
        showLoading(false);
    }
}

async function loadCurrentUser() {
    try {
        const response = await API.get('/auth/me');
        // Backend returns {status: 'success', message: '...', data: {...}}
        if (response.status === 'success' && response.data) {
            currentUser = response.data;

            // Check if user needs to change password
            if (currentUser.force_password_change) {
                window.location.href = '../../auth/change-password.html';
                return;
            }

            updateUserInfo();
        }
    } catch (error) {
        console.error('Failed to load user info:', error);
        // Auth middleware will handle redirecting to login
    }
}

function updateUserInfo() {
    if (!currentUser) return;

    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const userRole = document.getElementById('userRole');

    if (userAvatar) {
        userAvatar.textContent = currentUser.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
    }

    if (userName) {
        userName.textContent = currentUser.full_name;
    }

    if (userRole) {
        userRole.textContent = currentUser.role;
    }
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.toggle('active', show);

        // Safeguard: ensure loading is hidden after 10 seconds max
        if (show) {
            setTimeout(() => {
                if (overlay.classList.contains('active')) {
                    console.warn('Loading overlay forcefully hidden after timeout');
                    overlay.classList.remove('active');
                }
            }, 10000);
        }
    }
}

// ==================== NAVIGATION ====================
// Navigation is handled by <ac-layout>. Listen for section-change events.
document.querySelector('ac-layout')
    ?.addEventListener('section-change', e => {
        loadSectionData(e.detail.section).catch(err => {
            console.error('Error loading section data:', err);
        });
    });

// Orders & Approvals component event bridge
document.addEventListener('inventory-orders-approvals:count-change', (e) => {
    const count = e.detail.count;
    // Update sidebar badge if needed (currently no badge for orders-approvals)
    console.log(`Orders pending count: ${count}`);
});

// Machines component event bridge
document.addEventListener('inventory-machines:add', () => {
    openAddMachineModal();
});
document.addEventListener('inventory-machines:view', (e) => {
    viewMachineDetails(e.detail.machineId);
});
document.addEventListener('inventory-machines:edit', (e) => {
    editMachine(e.detail.machineId);
});
document.addEventListener('inventory-machines:mark-auction', (e) => {
    markForAuction(e.detail.machineId, 'machine');
});
document.addEventListener('inventory-machines:remove-auction', (e) => {
    removeFromAuction(e.detail.machineId, 'machine');
});
document.addEventListener('inventory-machines:delete', (e) => {
    const machineName = getAssetNameFromComponent('machine', e.detail.machineId);
    confirmDelete(e.detail.machineId, 'machine', machineName);
});

// Vehicles component event bridge
document.addEventListener('inventory-vehicles:add', () => {
    openAddVehicleModal();
});
document.addEventListener('inventory-vehicles:view', (e) => {
    viewVehicleDetails(e.detail.vehicleId);
});
document.addEventListener('inventory-vehicles:edit', (e) => {
    editVehicle(e.detail.vehicleId);
});
document.addEventListener('inventory-vehicles:mark-auction', (e) => {
    markForAuction(e.detail.vehicleId, 'vehicle');
});
document.addEventListener('inventory-vehicles:remove-auction', (e) => {
    removeFromAuction(e.detail.vehicleId, 'vehicle');
});
document.addEventListener('inventory-vehicles:delete', (e) => {
    const vehicleName = getAssetNameFromComponent('vehicle', e.detail.vehicleId);
    confirmDelete(e.detail.vehicleId, 'vehicle', vehicleName);
});

function bindDashboardOverview() {
    const dashboardModel = document.querySelector('inventory-dashboard-overview');
    if (!dashboardModel || dashboardModel._inventoryDashboardOverviewBound) {
        return;
    }

    dashboardModel._inventoryDashboardOverviewBound = true;

    dashboardModel.addEventListener('inventory-dashboard-overview:navigate', event => {
        const section = event.detail?.section;
        if (!section) return;

        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo(section);
        }
    });
}

async function refreshDashboardOverview() {
    const dashboardModel = document.querySelector('inventory-dashboard-overview');
    if (!dashboardModel || typeof dashboardModel.refresh !== 'function') {
        return;
    }

    await dashboardModel.refresh();
}

function bindNotifications() {
    const notificationsModel = document.querySelector('inventory-notifications');
    if (!notificationsModel || notificationsModel._inventoryNotificationsBound) {
        return;
    }

    notificationsModel._inventoryNotificationsBound = true;

    notificationsModel.addEventListener('inventory-notifications:reorder', event => {
        const sparepartId = event.detail?.sparepartId;
        if (!sparepartId) return;
        reorderPart(sparepartId);
    });

    notificationsModel.addEventListener('inventory-notifications:view-part', event => {
        const sparepartId = event.detail?.sparepartId;
        if (!sparepartId) return;
        viewPartDetails(sparepartId);
    });

    notificationsModel.addEventListener('inventory-notifications:view-order', async event => {
        try {
            const orderId = event.detail?.orderId;
            if (!orderId) return;

            // Navigate to orders-approvals section
            const layout = document.querySelector('ac-layout');
            if (layout && typeof layout.navigateTo === 'function') {
                layout.navigateTo('orders-approvals');
                
                // Wait a moment for the component to load, then trigger view
                setTimeout(() => {
                    const ordersModel = document.querySelector('inventory-orders-approvals');
                    if (ordersModel && typeof ordersModel.viewOrderDetails === 'function') {
                        ordersModel.viewOrderDetails(orderId);
                    }
                }, 100);
            }
        } catch (error) {
            console.error('Failed to open order from notifications:', error);
            Utils.showToast('Unable to open request details right now.', 'error');
        }
    });

    notificationsModel.addEventListener('inventory-notifications:order-updated', async () => {
        try {
            await Promise.all([
                refreshOrdersApprovals(),
                refreshDashboardOverview()
            ]);
        } catch (error) {
            console.error('Failed to sync orders after notification action:', error);
        }
    });

    notificationsModel.addEventListener('inventory-notifications:count-change', event => {
        const count = Number(event.detail?.count) || 0;
        const sidebar = document.querySelector('ac-layout ac-sidebar');
        if (sidebar && typeof sidebar.setNotifBadge === 'function') {
            sidebar.setNotifBadge(count);
        }
    });
}

async function refreshNotifications() {
    const notificationsModel = document.querySelector('inventory-notifications');
    if (!notificationsModel || typeof notificationsModel.refresh !== 'function') {
        return;
    }

    await notificationsModel.refresh();
}

function bindInsuranceManagement() {
    const insuranceModel = document.querySelector('inventory-insurance-management');
    if (!insuranceModel || insuranceModel._inventoryInsuranceManagementBound) {
        return;
    }

    insuranceModel._inventoryInsuranceManagementBound = true;

    insuranceModel.addEventListener('inventory-insurance-management:renewal-saved', async () => {
        try {
            await Promise.all([
                refreshMachines(),
                refreshVehicles(),
                refreshDashboardOverview(),
            ]);
        } catch (error) {
            console.error('Failed to sync dashboard after insurance renewal update:', error);
        }
    });
}

async function refreshInsuranceManagement() {
    const insuranceModel = document.querySelector('inventory-insurance-management');
    if (!insuranceModel || typeof insuranceModel.refresh !== 'function') {
        return;
    }

    await insuranceModel.refresh();
}

function bindCatalog() {
    const catalogModel = document.querySelector('inventory-catalog');
    if (!catalogModel || catalogModel._inventoryCatalogBound) {
        return;
    }

    catalogModel._inventoryCatalogBound = true;

    catalogModel.addEventListener('inventory-catalog:add', () => {
        openAddPartModal();
    });

    catalogModel.addEventListener('inventory-catalog:view', event => {
        const sparepartId = event.detail?.sparepartId;
        if (sparepartId) {
            viewPartDetails(sparepartId);
        }
    });

    catalogModel.addEventListener('inventory-catalog:edit', event => {
        const sparepartId = event.detail?.sparepartId;
        if (sparepartId) {
            editPart(sparepartId);
        }
    });

    catalogModel.addEventListener('inventory-catalog:delete', event => {
        const sparepartId = event.detail?.sparepartId;
        if (sparepartId) {
            deletePart(sparepartId);
        }
    });

    catalogModel.addEventListener('inventory-catalog:reorder', event => {
        const sparepartId = event.detail?.sparepartId;
        if (sparepartId) {
            reorderPart(sparepartId);
        }
    });
}

async function refreshCatalog() {
    const catalogModel = document.querySelector('inventory-catalog');
    if (!catalogModel || typeof catalogModel.refresh !== 'function') {
        return;
    }

    await catalogModel.refresh();
}

function bindSparepartAddition() {
    const additionsModel = document.querySelector('inventory-sparepart-addition');
    if (!additionsModel || additionsModel._inventorySparepartAdditionBound) {
        return;
    }

    additionsModel._inventorySparepartAdditionBound = true;

    additionsModel.addEventListener('inventory-sparepart-addition:add', () => {
        openAddStockModal();
    });

    additionsModel.addEventListener('inventory-sparepart-addition:view', event => {
        const additionData = event.detail?.addition || event.detail?.additionId;
        if (additionData) {
            viewAdditionDetails(additionData);
        }
    });

    additionsModel.addEventListener('inventory-sparepart-addition:edit', event => {
        const additionData = event.detail?.addition || event.detail?.additionId;
        if (additionData) {
            editAddition(additionData);
        }
    });

    additionsModel.addEventListener('inventory-sparepart-addition:delete', event => {
        const additionData = event.detail?.addition || event.detail?.additionId;
        if (additionData) {
            deleteAddition(additionData);
        }
    });
}

async function refreshSparepartAddition() {
    const additionsModel = document.querySelector('inventory-sparepart-addition');
    if (!additionsModel || typeof additionsModel.refresh !== 'function') {
        return;
    }

    await additionsModel.refresh();
}

async function refreshUsageTracking() {
    const usageModel = document.querySelector('inventory-usage-tracking');
    if (!usageModel || typeof usageModel.refresh !== 'function') {
        return;
    }

    await usageModel.refresh();
}

async function refreshOrdersApprovals() {
    const ordersModel = document.querySelector('inventory-orders-approvals');
    if (!ordersModel) {
        return;
    }

    // Set current user if not already set
    if (currentUser && typeof ordersModel.setCurrentUser === 'function') {
        ordersModel.setCurrentUser(currentUser);
    }

    if (typeof ordersModel.refresh === 'function') {
        await ordersModel.refresh();
    }
}

function refreshMachines() {
    const machinesModel = document.querySelector('inventory-machines');
    if (machinesModel && typeof machinesModel.refresh === 'function') {
        return machinesModel.refresh();
    }

    return Promise.resolve();
}

function refreshVehicles() {
    const vehiclesModel = document.querySelector('inventory-vehicles');
    if (vehiclesModel && typeof vehiclesModel.refresh === 'function') {
        return vehiclesModel.refresh();
    }

    return Promise.resolve();
}

async function loadSectionData(sectionId) {
    try {
        // Don't show loading overlay for section switches - it blocks navigation
        // showLoading(true);

        switch (sectionId) {
            case 'dashboard':
                await refreshDashboardOverview();
                break;
            case 'machines':
                refreshMachines();
                break;
            case 'vehicles':
                refreshVehicles();
                break;
            case 'insurance-management':
                await refreshInsuranceManagement();
                break;
            case 'catalog':
                await refreshCatalog();
                break;
            case 'sparepart-addition':
                await refreshSparepartAddition();
                break;
            case 'orders-approvals':
                refreshOrdersApprovals();
                break;
            case 'usage-tracking':
                await refreshUsageTracking();
                break;
            case 'notifications':
                await refreshNotifications();
                break;
        }

        // showLoading(false);
    } catch (error) {
        console.error(`Failed to load ${sectionId} data:`, error);
        Utils.showToast(`Failed to load ${sectionId} data`, 'error');
        // showLoading(false);
    }
}

// ==================== UTILITY FUNCTIONS ====================

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
            <div class="form-section">
                ${content}
            </div>
            <button class="btn btn-secondary" onclick="closeModal('${modal.id}')"><i class="fas fa-times"></i> Close</button>
        </div>
    `;

    return modal;
}

function openModal(modalId) {
    console.log('openModal called with modalId:', modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        console.log('Modal opened successfully:', modalId);
    } else {
        console.error('Modal element not found:', modalId);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        // Remove dynamically created modals
        if (modalId.startsWith('detailsModal_') || modalId.includes('Machine') || modalId.includes('Vehicle')) {
            setTimeout(() => modal.remove(), 300);
        }
    }
}

// logout(), createConfirmationDialog(), closeConfirmation(), confirmAction()
// are now provided by shared dashboard-init.js



function toggleDropdown(event, dropdownId) {
    event.stopPropagation();

    // Close all other dropdowns first
    closeAllDropdowns();

    // Toggle the clicked dropdown
    const dropdown = document.getElementById(`dropdown-${dropdownId}`);
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
}

function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-menu').forEach(dropdown => {
        dropdown.classList.remove('active');
    });
}

// Close dropdowns when clicking outside
document.addEventListener('click', (event) => {
    if (!event.target.closest('.dropdown-container')) {
        closeAllDropdowns();
    }
});


// ==================== DELETE CONFIRMATION ====================

function confirmDelete(id, type, name) {
    closeAllDropdowns();
    createConfirmationDialog(
        'Confirm Deletion',
        `Are you sure you want to delete <strong>${name}</strong>?<br><br>This action cannot be undone.`,
        async () => {
            if (type === 'machine') {
                await deleteMachine(id);
            } else if (type === 'vehicle') {
                await deleteVehicle(id);
            }
        },
        'danger'
    );
}

// ==================== AUCTION FUNCTIONS ====================

function getAssetNameFromComponent(type, id) {
    if (type === 'machine') {
        const machinesModel = document.querySelector('inventory-machines');
        const machine = Array.isArray(machinesModel?.machines)
            ? machinesModel.machines.find(item => Number(item.id) === Number(id))
            : null;
        return machine?.machine_name || `Machine #${id}`;
    }

    const vehiclesModel = document.querySelector('inventory-vehicles');
    const vehicle = Array.isArray(vehiclesModel?.vehicles)
        ? vehiclesModel.vehicles.find(item => Number(item.id) === Number(id))
        : null;

    return vehicle?.vehicle_name || `Vehicle #${id}`;
}

function markForAuction(id, type) {
    closeAllDropdowns();
    const itemName = getAssetNameFromComponent(type, id);

    createConfirmationDialog(
        'Mark for Auction',
        `Are you sure you want to mark <strong>${itemName}</strong> for auction?<br><br>This will change the status to "For Auction".`,
        async () => {
            await updateItemStatus(id, type, 'For Auction');
        },
        'warning'
    );
}

async function removeFromAuction(id, type) {
    closeAllDropdowns();
    const itemName = getAssetNameFromComponent(type, id);

    createConfirmationDialog(
        'Remove from Auction',
        `Do you want to remove <strong>${itemName}</strong> from auction?<br><br>The status will be changed to "Active".`,
        async () => {
            await updateItemStatus(id, type, 'Active');
        },
        'primary'
    );
}

async function updateItemStatus(id, type, status) {
    try {
        const endpoint = type === 'machine' ? `/machines/${id}` : `/vehicles/${id}`;
        const response = await API.put(endpoint, { status });

        if (response.status === 'success') {
            Utils.showToast(`Status updated to "${status}" successfully!`, 'success');
            if (type === 'machine') {
                await refreshMachines();
            } else {
                await refreshVehicles();
            }
        }
    } catch (error) {
        console.error('Failed to update status:', error);
        Utils.showToast(error.message || 'Failed to update status', 'error');
    }
}

// Close modal when clicking outside or pressing Escape
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
        document.body.style.overflow = '';
    }
});

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        const activeModals = document.querySelectorAll('.modal.active');
        activeModals.forEach(modal => modal.classList.remove('active'));
        document.body.style.overflow = '';
    }
});