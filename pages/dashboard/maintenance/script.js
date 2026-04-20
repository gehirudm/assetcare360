function getMaintenanceCostApprovalsComponent() {
    return document.querySelector('maintenance-cost-approvals');
}

function getMaintenanceServiceReportsComponent() {
    return document.querySelector('maintenance-service-reports');
}

function getMaintenanceServiceTicketsComponent() {
    return document.querySelector('maintenance-service-tickets');
}

function getMaintenanceServiceTicketDetailViewComponent() {
    return document.querySelector('#service-ticket-details maintenance-service-ticket-detail-view');
}

function getMaintenanceServiceWarrantyComponent() {
    return document.querySelector('maintenance-service-warranty');
}

function getMaintenanceNotificationsComponent() {
    return document.querySelector('maintenance-notifications');
}

function getMaintenanceFaultTicketsComponent() {
    return document.querySelector('maintenance-fault-tickets');
}

let maintenanceServiceTicketDetailsReturnSection = 'service-tickets';

function navigateMaintenanceSection(sectionId) {
    const layout = document.querySelector('ac-layout');
    if (!layout || typeof layout.navigateTo !== 'function') {
        return false;
    }

    layout.navigateTo(sectionId);
    return true;
}

function scrollMaintenanceViewportToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getMaintenanceAnalyticsHubComponent() {
    return document.querySelector('maintenance-analytics-hub');
}

function getTicketDetailsModalComponent() {
    return document.querySelector('maintenance-ticket-details-modal');
}

function getWarrantyDetailsModalComponent() {
    return document.querySelector('maintenance-warranty-details-modal');
}

async function refreshMaintenanceCostApprovals() {
    const component = getMaintenanceCostApprovalsComponent();
    if (component && typeof component.refresh === 'function') {
        await component.refresh();
    }
}

async function refreshMaintenanceAnalyticsHub() {
    const component = getMaintenanceAnalyticsHubComponent();
    if (!component) {
        return;
    }

    if (typeof component.refreshActive === 'function') {
        await component.refreshActive();
        return;
    }

    if (typeof component.refresh === 'function') {
        await component.refresh();
    }
}

async function refreshMaintenanceServiceTickets() {
    const component = getMaintenanceServiceTicketsComponent();
    if (component && typeof component.refresh === 'function') {
        await component.refresh();
    }
}

async function refreshMaintenanceServiceReports() {
    const component = getMaintenanceServiceReportsComponent();
    if (component && typeof component.refresh === 'function') {
        await component.refresh();
    }
}

async function refreshMaintenanceWarrantyManagement() {
    const component = getMaintenanceServiceWarrantyComponent();
    if (component && typeof component.refresh === 'function') {
        await component.refresh();
    }
}

async function refreshMaintenanceSection(sectionId) {
    if (sectionId === 'cost-approvals') {
        await refreshMaintenanceCostApprovals();
        return;
    }

    if (sectionId === 'analytics') {
        await refreshMaintenanceAnalyticsHub();
        return;
    }

    if (sectionId === 'service-tickets') {
        await refreshMaintenanceServiceTickets();
        return;
    }

    if (sectionId === 'service-ticket-details') {
        const detailView = getMaintenanceServiceTicketDetailViewComponent();
        if (detailView && typeof detailView.refresh === 'function') {
            detailView.refresh();
        }
        return;
    }

    if (sectionId === 'service-reports') {
        await refreshMaintenanceServiceReports();
        return;
    }

    if (sectionId === 'warranty-management') {
        await refreshMaintenanceWarrantyManagement();
    }
}

function filterTickets(status, evt) {
    const component = getMaintenanceFaultTicketsComponent();
    if (!component || typeof component.applyFilter !== 'function') {
        return;
    }

    const trigger = evt?.target || window.event?.target
        || component.querySelector(`#faultTicketsFilterControls [data-status="${status}"]`);
    component.applyFilter(status, trigger || null);
}

function filterServiceReports(status, evt) {
    const component = getMaintenanceServiceReportsComponent();
    if (!component || typeof component.applyFilter !== 'function') {
        return;
    }

    const trigger = evt?.target || window.event?.target
        || component.querySelector(`#serviceReportFilterControls [data-status="${status}"]`);
    component.applyFilter(status, trigger || null);
}

function filterWarranty(status, evt) {
    const component = getMaintenanceServiceWarrantyComponent();
    if (!component || typeof component.applyFilter !== 'function') {
        return;
    }

    const trigger = evt?.target || window.event?.target
        || component.querySelector(`#serviceWarrantyFilterControls [data-status="${status}"]`);
    component.applyFilter(status, trigger || null);
}

function filterNotifications(category, evt) {
    const component = getMaintenanceNotificationsComponent();
    if (!component || typeof component.applyFilter !== 'function') {
        return;
    }

    const trigger = evt?.target || window.event?.target
        || component.querySelector(`#notificationsFilterControls [data-category="${category}"]`);
    component.applyFilter(category, trigger || null);
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        return;
    }

    modal.classList.add('active');
    modal.style.display = '';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        return;
    }

    modal.classList.remove('active');
    modal.style.display = 'none';
}

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) {
        return;
    }

    toast.textContent = message;
    toast.style.display = 'block';

    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

document.addEventListener('maintenance-ui:toast', (event) => {
    const message = event.detail?.message;
    if (!message) {
        return;
    }

    showToast(message);
});

function viewTicketDetails(ticketId) {
    const modal = getTicketDetailsModalComponent();
    if (modal && typeof modal.openById === 'function') {
        modal.openById(String(ticketId || ''));
        return;
    }

    showToast(`Ticket ${ticketId} details are unavailable right now.`);
}

function viewWarrantyDetails(warrantyId) {
    const modal = getWarrantyDetailsModalComponent();
    if (modal && typeof modal.openById === 'function') {
        modal.openById(String(warrantyId || ''));
        return;
    }

    showToast(`Warranty ${warrantyId} details are unavailable right now.`);
}

function viewReportDetails(reportId) {
    const component = getMaintenanceServiceReportsComponent();
    if (component && typeof component.viewReportDetails === 'function') {
        component.viewReportDetails(String(reportId || ''));
        return;
    }

    showToast(`Service report ${reportId} details are unavailable right now.`);
}

function viewCostDetails(requestId) {
    const component = getMaintenanceCostApprovalsComponent();
    if (component && typeof component.viewCostDetails === 'function') {
        component.viewCostDetails(String(requestId || ''));
        return;
    }

    showToast(`Cost request ${requestId} details are unavailable right now.`);
}

function viewServiceSchedule(equipmentId) {
    const component = getMaintenanceServiceWarrantyComponent();
    if (component && typeof component.viewServiceSchedule === 'function') {
        component.viewServiceSchedule(String(equipmentId || ''));
        return;
    }

    showToast(`Service schedule for ${equipmentId} is unavailable right now.`);
}

function viewServiceDetails(serviceId) {
    viewServiceTicketDetails(serviceId);
}

function viewServiceTicketDetails(ticketId, options = {}) {
    const normalizedTicketId = String(ticketId || '').trim();
    if (!normalizedTicketId) {
        showToast('Invalid service ticket ID.');
        return;
    }

    const detailView = getMaintenanceServiceTicketDetailViewComponent();
    if (!detailView || typeof detailView.open !== 'function') {
        showToast('Service ticket details component is unavailable right now.');
        return;
    }

    const requestedReturnSection = String(options.returnSection || '').trim();
    if (requestedReturnSection && requestedReturnSection !== 'service-ticket-details') {
        maintenanceServiceTicketDetailsReturnSection = requestedReturnSection;
    } else {
        const activeSection = document.querySelector('.content-section.active')?.id || '';
        if (activeSection && activeSection !== 'service-ticket-details') {
            maintenanceServiceTicketDetailsReturnSection = activeSection;
        }
    }

    const navigated = navigateMaintenanceSection('service-ticket-details');
    if (!navigated) {
        showToast('Unable to open service ticket details right now.');
        return;
    }

    scrollMaintenanceViewportToTop();

    detailView.open(normalizedTicketId, {
        returnSection: maintenanceServiceTicketDetailsReturnSection,
    });
}

function approveCost(requestId) {
    const component = getMaintenanceCostApprovalsComponent();
    if (component && typeof component.openApproveModal === 'function') {
        component.openApproveModal(String(requestId || ''));
        return;
    }

    showToast(`Approve flow for ${requestId} is unavailable right now.`);
}

function rejectCost(requestId) {
    const component = getMaintenanceCostApprovalsComponent();
    if (component && typeof component.openRejectModal === 'function') {
        component.openRejectModal(String(requestId || ''));
        return;
    }

    showToast(`Reject flow for ${requestId} is unavailable right now.`);
}

function approveReport(reportId) {
    const component = getMaintenanceServiceReportsComponent();
    if (component && typeof component.approveReport === 'function') {
        component.approveReport(String(reportId || ''));
        return;
    }

    showToast(`Approve flow for service report ${reportId} is unavailable right now.`);
}

function reviewReport(reportId) {
    const component = getMaintenanceServiceReportsComponent();
    if (component && typeof component.reviewReport === 'function') {
        component.reviewReport(String(reportId || ''));
        return;
    }

    viewReportDetails(reportId);
}

function scheduleService(equipmentId) {
    const component = getMaintenanceServiceWarrantyComponent();
    if (component && typeof component.scheduleService === 'function') {
        component.scheduleService(String(equipmentId || ''));
        return;
    }

    showToast(`Scheduling service for ${equipmentId} is unavailable right now.`);
}

document.addEventListener('click', (event) => {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
        event.target.style.display = 'none';
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
        return;
    }

    const activeModal = document.querySelector('.modal.active');
    if (!activeModal) {
        return;
    }

    activeModal.classList.remove('active');
    activeModal.style.display = 'none';
});

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar?.classList.toggle('open');
}

function setupMobileMenu() {
    if (window.innerWidth > 768) {
        return;
    }

    if (document.querySelector('.menu-btn')) {
        return;
    }

    const menuBtn = document.createElement('button');
    menuBtn.innerHTML = '☰';
    menuBtn.className = 'menu-btn';
    menuBtn.setAttribute('aria-label', 'Toggle navigation');
    menuBtn.addEventListener('click', toggleSidebar);

    document.body.prepend(menuBtn);
}

document.addEventListener('DOMContentLoaded', async () => {
    await DashboardInit.init(['Maintenance Manager'], { updateUserDisplay: true });

    const layout = document.querySelector('ac-layout');
    if (layout) {
        layout.addEventListener('section-change', async (event) => {
            const section = event.detail?.section;
            if (!section) {
                return;
            }

            await refreshMaintenanceSection(section);
        });
    }

    const serviceTicketDetailView = getMaintenanceServiceTicketDetailViewComponent();
    if (serviceTicketDetailView) {
        serviceTicketDetailView.addEventListener('maintenance-service-ticket-detail-view:toast', (event) => {
            const message = event.detail?.message;
            if (!message) {
                return;
            }

            showToast(message);
        });

        serviceTicketDetailView.addEventListener('maintenance-service-ticket-detail-view:back', (event) => {
            const returnSection = String(event.detail?.returnSection || maintenanceServiceTicketDetailsReturnSection || 'service-tickets').trim() || 'service-tickets';
            maintenanceServiceTicketDetailsReturnSection = returnSection === 'service-ticket-details' ? 'service-tickets' : returnSection;

            navigateMaintenanceSection(maintenanceServiceTicketDetailsReturnSection);
            serviceTicketDetailView.closeView?.();
            scrollMaintenanceViewportToTop();
        });

        serviceTicketDetailView.addEventListener('maintenance-service-ticket-detail-view:deleted', async (event) => {
            const returnSection = String(event.detail?.returnSection || maintenanceServiceTicketDetailsReturnSection || 'service-tickets').trim() || 'service-tickets';
            maintenanceServiceTicketDetailsReturnSection = returnSection === 'service-ticket-details' ? 'service-tickets' : returnSection;

            navigateMaintenanceSection(maintenanceServiceTicketDetailsReturnSection);
            serviceTicketDetailView.closeView?.();

            await refreshMaintenanceServiceTickets();
            await refreshMaintenanceServiceReports();

            scrollMaintenanceViewportToTop();
        });
    }

    await refreshMaintenanceCostApprovals();
    setupMobileMenu();
});
