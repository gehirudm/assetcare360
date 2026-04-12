// Sample data sets for dashboard interactions
let serviceScheduleData = [
    {
        id: 'VH101',
        equipment: 'Vehicle #101',
        insuranceExpiry: '2026-03-15',
        nextServiceDue: '2025-09-05',
        serviceType: 'Preventive Maintenance',
        notes: 'Regular maintenance schedule'
    },
    {
        id: 'MC205',
        equipment: 'Machine #205',
        insuranceExpiry: '2025-12-01',
        nextServiceDue: '2025-10-15',
        serviceType: 'Major Service',
        notes: 'Scheduled maintenance'
    },
    {
        id: 'VH089',
        equipment: 'Vehicle #089',
        insuranceExpiry: '2026-01-20',
        nextServiceDue: '2025-08-30',
        serviceType: 'Routine Check',
        notes: 'Overdue check required'
    }
];

const ticketData = {
    'TKT-001': {
        id: 'TKT-001',
        equipment: 'Vehicle #101',
        issue: 'Engine overheating',
        reporter: 'John Driver',
        supervisor: 'Supervisor John',
        assignedTo: 'Technical Officer A',
        status: 'In Progress',
        costEstimate: 'LKR 45,000',
        description: 'Engine temperature exceeding normal range during operations. Thermostat and cooling system suspected. Requires complete cooling system inspection and potential engine overhaul.',
        timeline: 'Started: Aug 20, 09:00 AM<br>Expected Completion: Aug 25, 17:00 PM<br>Current Status: Parts ordered, repair in progress',
        partsUsed: 'Thermostat, Coolant, Radiator Hose (Ordered)',
        priority: 'High',
        location: 'Workshop Bay 2'
    },
    'TKT-002': {
        id: 'TKT-002',
        equipment: 'Machine #205',
        issue: 'Hydraulic leak',
        reporter: 'Mike Operator',
        supervisor: 'Supervisor Mike',
        assignedTo: 'Awaiting Assignment',
        status: 'Pending',
        costEstimate: 'LKR 32,000',
        description: 'Hydraulic fluid leaking from main pump assembly. Affecting machine operation efficiency and creating safety hazard.',
        timeline: 'Reported: Aug 22, 14:30 PM<br>Assignment: Pending resource availability<br>Estimated Start: Aug 25, 2025',
        partsUsed: 'Assessment pending',
        priority: 'Medium',
        location: 'Field Site A'
    },
    'TKT-003': {
        id: 'TKT-003',
        equipment: 'Vehicle #089',
        issue: 'Brake failure',
        reporter: 'Sarah Driver',
        supervisor: 'Supervisor John',
        assignedTo: 'Technical Officer B',
        status: 'Completed',
        costEstimate: 'LKR 15,000',
        description: 'Complete brake system failure during operation. Emergency repair completed with full brake system replacement.',
        timeline: 'Completed: Aug 19, 11:00 AM<br>Duration: 21 hours<br>Emergency Priority',
        partsUsed: 'Brake pads, Brake fluid, Brake discs, Master cylinder',
        priority: 'Critical',
        location: 'Workshop Bay 1'
    },
    'TKT-004': {
        id: 'TKT-004',
        equipment: 'Machine #180',
        issue: 'Engine smoke',
        reporter: 'Tom Operator',
        supervisor: 'Supervisor Mike',
        assignedTo: 'Technical Officer C',
        status: 'In Progress',
        costEstimate: 'LKR 25,000',
        description: 'Black smoke emitting from exhaust during operation. Possible engine oil burning or air filter issues.',
        timeline: 'Started: Aug 23, 10:00 AM<br>Expected Completion: Aug 26, 16:00 PM<br>Diagnosis in progress',
        partsUsed: 'Air filter, Engine oil (Ordered)',
        priority: 'Medium',
        location: 'Field Site B'
    }
};

const warrantyData = {
    'VH101-ENG': {
        equipment: 'Vehicle #101',
        component: 'Engine Block',
        purchaseDate: 'Dec 15, 2023',
        warrantyPeriod: '24 months',
        expiryDate: 'Dec 15, 2025',
        status: 'Active',
        supplier: 'Engine Corp Ltd',
        contactNumber: '+94-11-234-5678',
        claimHistory: 'No previous claims',
        termsConditions: 'Covers manufacturing defects, excludes wear and tear'
    },
    'MC205-HYD': {
        equipment: 'Machine #205',
        component: 'Hydraulic Pump',
        purchaseDate: 'Aug 10, 2023',
        warrantyPeriod: '24 months',
        expiryDate: 'Aug 10, 2025',
        status: 'Expired',
        supplier: 'Hydraulic Systems Inc',
        contactNumber: '+94-11-345-6789',
        claimHistory: '1 claim processed in July 2024',
        termsConditions: 'Covers pump failure, excludes seal replacements'
    },
    'VH089-BRK': {
        equipment: 'Vehicle #089',
        component: 'Brake System',
        purchaseDate: 'Sep 30, 2024',
        warrantyPeriod: '12 months',
        expiryDate: 'Sep 30, 2025',
        status: 'Expiring Soon',
        supplier: 'Brake Tech Solutions',
        contactNumber: '+94-11-456-7890',
        claimHistory: 'No claims',
        termsConditions: 'Covers brake components, excludes brake pads'
    }
};

const reportData = {
    'SR-001': {
        id: 'SR-001',
        equipment: 'Vehicle #089',
        serviceType: 'Brake System Complete Overhaul',
        cost: 'LKR 15,000',
        technicalOfficer: 'Technical Officer B',
        serviceDate: 'Aug 19, 2025',
        description: 'Complete brake system overhaul including master cylinder replacement, brake pad replacement, and brake fluid system flush.',
        partsUsed: 'Brake pads (4 sets), Brake fluid (2L), Brake discs (2), Master cylinder (1)',
        laborHours: '8 hours',
        invoiceNumbers: 'INV-089-BRK-001, INV-089-BRK-002',
        warrantyClaims: 'WC-001 - Brake disc replacement under warranty',
        nextServiceDue: 'Aug 19, 2026',
        recommendations: 'Monitor brake fluid levels monthly'
    },
    'SR-002': {
        id: 'SR-002',
        equipment: 'Machine #203',
        serviceType: 'Preventive Maintenance - Hydraulic System',
        cost: 'LKR 8,500',
        technicalOfficer: 'Technical Officer A',
        serviceDate: 'Aug 15, 2025',
        description: 'Routine preventive maintenance of hydraulic system including oil change, filter replacement, and system pressure testing.',
        partsUsed: 'Hydraulic oil (15L), Oil filter (2), Pressure seals (5)',
        laborHours: '4 hours',
        invoiceNumbers: 'INV-203-HYD-001',
        warrantyClaims: 'None',
        nextServiceDue: 'Nov 15, 2025',
        recommendations: 'Check hydraulic oil levels weekly'
    },
    'SR-003': {
        id: 'SR-003',
        equipment: 'Machine #180',
        serviceType: 'Engine Maintenance',
        cost: 'LKR 28,000',
        technicalOfficer: 'Technical Officer A',
        serviceDate: 'Aug 10, 2025',
        description: 'Major engine maintenance including valve adjustment, timing chain replacement, and complete engine tune-up.',
        partsUsed: 'Timing chain (1), Engine oil (8L), Air filter (1), Spark plugs (6)',
        laborHours: '12 hours',
        invoiceNumbers: 'INV-180-ENG-001, INV-180-ENG-002',
        warrantyClaims: 'WC-002 - Timing chain under warranty',
        nextServiceDue: 'Feb 10, 2026',
        recommendations: 'Monitor engine temperature and oil pressure'
    },
    'SR-004': {
        id: 'SR-004',
        equipment: 'Vehicle #067',
        serviceType: 'Engine Service - Complete overhaul',
        cost: 'LKR 22,000',
        technicalOfficer: 'Technical Officer B',
        serviceDate: 'Aug 12, 2025',
        description: 'Complete engine overhaul including piston replacement, crankshaft grinding, and cylinder head refurbishment.',
        partsUsed: 'Pistons (4), Engine gaskets, Engine oil (6L), Oil filter (1)',
        laborHours: '16 hours',
        invoiceNumbers: 'INV-067-ENG-001',
        warrantyClaims: 'WC-003 - Piston set under warranty',
        nextServiceDue: 'Feb 12, 2026',
        recommendations: 'Break-in period required - light duty for 100 hours'
    }
};

let costApprovalData = {};
let pendingCostApprovals = [];
let approvedCostApprovals = [];
let rejectedCostApprovals = [];

const serviceScheduleDetails = {
    'VH101': {
        equipment: 'Vehicle #101',
        insuranceProvider: 'National Insurance Co.',
        insurancePolicy: 'POL-VH101-2025',
        insuranceExpiry: 'Mar 15, 2026',
        lastService: 'Aug 20, 2025',
        nextServiceDue: 'Sep 05, 2025',
        serviceType: 'Preventive Maintenance',
        serviceInterval: '3 months',
        technicalOfficer: 'Tech Officer A',
        notes: 'Monitor engine temperature closely after recent repairs'
    },
    'MC205': {
        equipment: 'Machine #205',
        insuranceProvider: 'Industrial Coverage Ltd.',
        insurancePolicy: 'POL-MC205-2025',
        insuranceExpiry: 'Dec 01, 2025',
        lastService: 'Aug 15, 2025',
        nextServiceDue: 'Oct 15, 2025',
        serviceType: 'Major Service',
        serviceInterval: '6 months',
        technicalOfficer: 'Tech Officer C',
        notes: 'Hydraulic system requires special attention'
    },
    'VH089': {
        equipment: 'Vehicle #089',
        insuranceProvider: 'Fleet Insurance Co.',
        insurancePolicy: 'POL-VH089-2025',
        insuranceExpiry: 'Jan 20, 2026',
        lastService: 'Aug 19, 2025',
        nextServiceDue: 'Aug 30, 2025',
        serviceType: 'Routine Check',
        serviceInterval: '2 weeks',
        technicalOfficer: 'Tech Officer B',
        notes: 'Brake system recently overhauled - monitor closely'
    }
};

// Utility helpers
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function formatLkrCurrency(value) {
    const amount = Number.parseFloat(value || 0);
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    return `LKR ${safeAmount.toLocaleString('en-LK', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function getDateStatus(dueDateString) {
    const today = new Date();
    const dueDate = new Date(dueDateString);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'overdue';
    if (diffDays <= 7) return 'due-soon';
    return 'scheduled';
}

function updateServiceScheduleTable() {
    const tbody = document.getElementById('service-schedule-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    serviceScheduleData.forEach(item => {
        const status = getDateStatus(item.nextServiceDue);
        const statusBadge = status === 'overdue' ? 'status-overdue' :
            status === 'due-soon' ? 'status-due-soon' : 'status-scheduled';
        const statusText = status === 'overdue' ? 'Overdue' :
            status === 'due-soon' ? 'Due Soon' : 'Scheduled';

        const row = document.createElement('tr');
        row.setAttribute('data-service-status', status);
        row.innerHTML = `
            <td>${item.equipment}</td>
            <td>${formatDate(item.insuranceExpiry)}</td>
            <td>${formatDate(item.nextServiceDue)}</td>
            <td>${item.serviceType}</td>
            <td><span class="status-badge ${statusBadge}">${statusText}</span></td>
            <td><button class="btn btn-secondary btn-small" onclick="viewServiceSchedule('${item.id}')">View</button></td>
        `;
        tbody.appendChild(row);
    });
}

function setActiveButtons(selector, trigger) {
    const buttons = document.querySelectorAll(selector);
    buttons.forEach(btn => btn.classList.remove('active'));
    if (trigger) {
        trigger.classList.add('active');
    }
}

// Navigation is handled by <ac-layout>. The navigateToSection global is
// auto-registered by <ac-layout> so existing onclick attributes keep working.

// Tabs
function switchTab(tabName, evt) {
    const trigger = evt?.target || window.event?.target;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    if (trigger) trigger.classList.add('active');
    const tabContent = document.getElementById(`${tabName}-tab`);
    if (tabContent) tabContent.classList.add('active');
}

// Filters
function filterTickets(status, evt) {
    const trigger = evt?.target || window.event?.target;
    setActiveButtons('#fault-tickets .filter-btn', trigger);

    const tickets = document.querySelectorAll('.ticket-item');
    tickets.forEach(ticket => {
        ticket.style.display = (status === 'all' || ticket.getAttribute('data-status') === status) ? 'flex' : 'none';
    });
}

function filterCostApprovals(status, evt) {
    const trigger = evt?.target || window.event?.target;
    setActiveButtons('#cost-approvals .filter-btn', trigger);

    const cards = document.querySelectorAll('.cost-approval-card');
    cards.forEach(card => {
        card.style.display = (status === 'all' || card.getAttribute('data-approval-status') === status) ? 'block' : 'none';
    });
}

function mapBudgetApproval(report) {
    const status = (report.status || 'pending').toLowerCase();
    const id = String(report.id);
    const ticketId = report.ticket_display_id || `Ticket #${report.fault_ticket_id}`;
    const requestedBy = report.submitted_by_name || report.submitted_by_employee_id || 'Unknown';
    const requestDate = report.created_at ? new Date(report.created_at).toLocaleString('en-LK') : 'N/A';
    const approvalLevel = report.approval_level === 'maintenance_manager' ? 'Maintenance Manager' : 'Supervisor';

    return {
        id,
        status,
        requestedBy,
        requestDate,
        ticketId,
        description: report.ticket_description || 'No description provided',
        amount: formatLkrCurrency(report.total_amount),
        justification: report.justification || 'No justification provided',
        quotation: report.quotation || 'No quotation details provided',
        approvalLevel,
        priority: report.ticket_priority || 'Medium',
        reviewNotes: report.review_notes || null,
        raw: report
    };
}

async function loadCostApprovals() {
    const pendingContainer = document.getElementById('costApprovalPendingList');
    if (pendingContainer) {
        pendingContainer.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Loading pending approvals...</p>';
    }

    try {
        const response = await API.get('/budget-reports/pending');
        if (response.status !== 'success') {
            throw new Error(response.message || 'Failed to load budget approvals');
        }

        const reports = response.data?.reports || [];
        pendingCostApprovals = reports.map(mapBudgetApproval).filter(item => item.status === 'pending');

        // Reset local reviewed lists each reload to avoid stale copies.
        approvedCostApprovals = [];
        rejectedCostApprovals = [];

        costApprovalData = {};
        pendingCostApprovals.forEach(item => {
            costApprovalData[item.id] = item;
        });

        renderPendingCostApprovals();
        renderCostApprovalHistoryTables();
    } catch (error) {
        console.error('Failed to load cost approvals:', error);
        if (pendingContainer) {
            pendingContainer.innerHTML = `<p style="text-align: center; color: var(--danger); padding: 20px;">${error.message || 'Failed to load budget approvals'}</p>`;
        }
    }
}

function renderPendingCostApprovals() {
    const container = document.getElementById('costApprovalPendingList');
    if (!container) return;

    if (pendingCostApprovals.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 20px;">No pending approvals at the moment.</p>';
        return;
    }

    container.innerHTML = pendingCostApprovals.map(item => `
        <div class="request-item">
            <div class="ticket-details">
                <strong>BUD-${String(item.id).padStart(3, '0')}</strong>
                <div class="ticket-meta">Requested by: ${item.requestedBy} | Date: ${item.requestDate}</div>
                <div class="ticket-issue">${item.description} (${item.ticketId})</div>
                <div class="ticket-meta">
                    <strong>Amount: ${item.amount}</strong><br>
                    Approval Level: ${item.approvalLevel}
                </div>
            </div>
            <div class="ticket-actions">
                <span class="status-badge status-pending">Pending</span>
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button class="btn btn-success btn-small" onclick="approveCost('${item.id}')">Approve</button>
                    <button class="btn btn-danger btn-small" onclick="rejectCost('${item.id}')">Reject</button>
                    <button class="btn btn-secondary btn-small" onclick="viewCostDetails('${item.id}')">Details</button>
                </div>
            </div>
        </div>
    `).join('');
}

function renderCostApprovalHistoryTables() {
    const approvedBody = document.getElementById('costApprovalApprovedBody');
    const rejectedBody = document.getElementById('costApprovalRejectedBody');

    if (approvedBody) {
        if (approvedCostApprovals.length === 0) {
            approvedBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--muted);">No approved records loaded yet</td></tr>';
        } else {
            approvedBody.innerHTML = approvedCostApprovals.map(item => `
                <tr>
                    <td>BUD-${String(item.id).padStart(3, '0')}</td>
                    <td>${item.requestedBy}</td>
                    <td>${item.description}</td>
                    <td>${item.amount}</td>
                    <td>${item.reviewedAt || 'Now'}</td>
                    <td><button class="btn btn-secondary btn-small" onclick="viewCostDetails('${item.id}')">View</button></td>
                </tr>
            `).join('');
        }
    }

    if (rejectedBody) {
        if (rejectedCostApprovals.length === 0) {
            rejectedBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--muted);">No rejected records loaded yet</td></tr>';
        } else {
            rejectedBody.innerHTML = rejectedCostApprovals.map(item => `
                <tr>
                    <td>BUD-${String(item.id).padStart(3, '0')}</td>
                    <td>${item.requestedBy}</td>
                    <td>${item.description}</td>
                    <td>${item.amount}</td>
                    <td>${item.reviewedAt || 'Now'}</td>
                    <td>${item.reviewNotes || 'Rejected by Maintenance Manager'}</td>
                    <td><button class="btn btn-secondary btn-small" onclick="viewCostDetails('${item.id}')">View</button></td>
                </tr>
            `).join('');
        }
    }
}

function filterServiceReports(status, evt) {
    const trigger = evt?.target || window.event?.target;
    setActiveButtons('#service-reports .filter-btn', trigger);

    const cards = document.querySelectorAll('.service-report-card');
    cards.forEach(card => {
        card.style.display = (status === 'all' || card.getAttribute('data-report-status') === status) ? 'block' : 'none';
    });
}

function filterWarranty(status, evt) {
    const trigger = evt?.target || window.event?.target;
    setActiveButtons('#service-warranty .filter-btn', trigger);

    const rows = document.querySelectorAll('[data-warranty-status]');
    rows.forEach(row => {
        row.style.display = (status === 'all' || row.getAttribute('data-warranty-status') === status) ? 'table-row' : 'none';
    });
}

function filterService(status, evt) {
    const trigger = evt?.target || window.event?.target;
    setActiveButtons('#service-warranty .filter-controls .filter-btn', trigger);

    const rows = document.querySelectorAll('[data-service-status]');
    rows.forEach(row => {
        row.style.display = (status === 'all' || row.getAttribute('data-service-status') === status) ? 'table-row' : 'none';
    });
}

function filterNotifications(category, evt) {
    const trigger = evt?.target || window.event?.target;
    setActiveButtons('#notifications .filter-btn', trigger);

    const cards = document.querySelectorAll('[data-notification-category]');
    cards.forEach(card => {
        card.style.display = (category === 'all' || card.getAttribute('data-notification-category') === category) ? 'block' : 'none';
    });
}

// Modals
function openModal(modalId, itemId = '') {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.add('active');

    if (itemId) {
        if (modalId === 'approveModal') {
            const approveField = document.getElementById('approveRequestId');
            if (approveField) approveField.value = itemId;
        } else if (modalId === 'rejectModal') {
            const rejectField = document.getElementById('rejectRequestId');
            if (rejectField) rejectField.value = itemId;
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// Toast notification
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.style.display = 'block';

    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Detail views
function viewTicketDetails(ticketId) {
    const ticket = ticketData[ticketId];
    if (!ticket) return;

    const content = `
        <div class="form-section">
            <h5><i class="fas fa-ticket-alt"></i> Ticket Information</h5>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <div><strong>Ticket ID:</strong> ${ticket.id}</div>
                <div><strong>Equipment:</strong> ${ticket.equipment}</div>
                <div><strong>Reporter:</strong> ${ticket.reporter}</div>
                <div><strong>Supervisor:</strong> ${ticket.supervisor}</div>
                <div><strong>Assigned To:</strong> ${ticket.assignedTo}</div>
                <div><strong>Priority:</strong> ${ticket.priority}</div>
                <div><strong>Status:</strong> <span class="status-badge status-${ticket.status.toLowerCase().replace(' ', '-')}">${ticket.status}</span></div>
                <div><strong>Cost Estimate:</strong> ${ticket.costEstimate}</div>
            </div>
            <div style="margin-bottom: 15px;">
                <strong>Issue Description:</strong><br>
                ${ticket.description}
            </div>
            <div style="margin-bottom: 15px;">
                <strong>Timeline:</strong><br>
                ${ticket.timeline}
            </div>
            <div style="margin-bottom: 15px;">
                <strong>Location:</strong> ${ticket.location}
            </div>
            <div>
                <strong>Parts Used:</strong><br>
                ${ticket.partsUsed}
            </div>
        </div>
    `;

    const detailsContainer = document.getElementById('ticketDetailsContent');
    if (detailsContainer) {
        detailsContainer.innerHTML = content;
        openModal('ticketDetailsModal');
    }
}

function viewWarrantyDetails(warrantyId) {
    const warranty = warrantyData[warrantyId];
    if (!warranty) return;

    const content = `
        <div class="form-section">
            <h5><i class="fas fa-shield-alt"></i> Warranty Information</h5>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <div><strong>Equipment:</strong> ${warranty.equipment}</div>
                <div><strong>Component:</strong> ${warranty.component}</div>
                <div><strong>Purchase Date:</strong> ${warranty.purchaseDate}</div>
                <div><strong>Warranty Period:</strong> ${warranty.warrantyPeriod}</div>
                <div><strong>Expiry Date:</strong> ${warranty.expiryDate}</div>
                <div><strong>Status:</strong> <span class="status-badge warranty-${warranty.status.toLowerCase().replace(' ', '-')}">${warranty.status}</span></div>
            </div>
            <div style="margin-bottom: 15px;">
                <strong>Supplier:</strong> ${warranty.supplier}<br>
                <strong>Contact:</strong> ${warranty.contactNumber}
            </div>
            <div style="margin-bottom: 15px;">
                <strong>Claim History:</strong><br>
                ${warranty.claimHistory}
            </div>
            <div>
                <strong>Terms & Conditions:</strong><br>
                ${warranty.termsConditions}
            </div>
        </div>
    `;

    const detailsContainer = document.getElementById('warrantyDetailsContent');
    if (detailsContainer) {
        detailsContainer.innerHTML = content;
        openModal('warrantyDetailsModal');
    }
}

function viewReportDetails(reportId) {
    const report = reportData[reportId];
    if (!report) return;

    const content = `
        <div class="form-section">
            <h5><i class="fas fa-clipboard-list"></i> Service Report Information</h5>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <div><strong>Report ID:</strong> ${report.id}</div>
                <div><strong>Equipment:</strong> ${report.equipment}</div>
                <div><strong>Service Type:</strong> ${report.serviceType}</div>
                <div><strong>Cost:</strong> ${report.cost}</div>
                <div><strong>Technical Officer:</strong> ${report.technicalOfficer}</div>
                <div><strong>Service Date:</strong> ${report.serviceDate}</div>
                <div><strong>Labor Hours:</strong> ${report.laborHours}</div>
                <div><strong>Next Service Due:</strong> ${report.nextServiceDue}</div>
            </div>
            <div style="margin-bottom: 15px;">
                <strong>Service Description:</strong><br>
                ${report.description}
            </div>
            <div style="margin-bottom: 15px;">
                <strong>Parts Used:</strong><br>
                ${report.partsUsed}
            </div>
            <div style="margin-bottom: 15px;">
                <strong>Invoice Numbers:</strong><br>
                ${report.invoiceNumbers}
            </div>
            <div style="margin-bottom: 15px;">
                <strong>Warranty Claims:</strong><br>
                ${report.warrantyClaims}
            </div>
            <div>
                <strong>Recommendations:</strong><br>
                ${report.recommendations}
            </div>
        </div>
    `;

    const detailsContainer = document.getElementById('reportDetailsContent');
    if (detailsContainer) {
        detailsContainer.innerHTML = content;
        openModal('reportDetailsModal');
    }
}

function viewCostDetails(requestId) {
    const costData = costApprovalData[requestId];
    if (!costData) return;

    const content = `
        <div class="form-section">
            <h5><i class="fas fa-money-bill-wave"></i> Cost Request Information</h5>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <div><strong>Request ID:</strong> BUD-${String(costData.id).padStart(3, '0')}</div>
                <div><strong>Ticket:</strong> ${costData.ticketId}</div>
                <div><strong>Requested By:</strong> ${costData.requestedBy}</div>
                <div><strong>Request Date:</strong> ${costData.requestDate}</div>
                <div><strong>Amount:</strong> ${costData.amount}</div>
                <div><strong>Priority:</strong> ${costData.priority || 'Medium'}</div>
                <div><strong>Approval Level:</strong> ${costData.approvalLevel || 'Maintenance Manager'}</div>
                <div><strong>Status:</strong> ${costData.status || 'pending'}</div>
            </div>
            <div style="margin-bottom: 15px;">
                <strong>Description:</strong><br>
                ${costData.description}
            </div>
            <div style="margin-bottom: 15px;">
                <strong>Justification:</strong><br>
                ${costData.justification}
            </div>
            <div>
                <strong>Quotation:</strong><br>
                ${costData.quotation}
            </div>
        </div>
    `;

    const detailsContainer = document.getElementById('costDetailsContent');
    if (detailsContainer) {
        detailsContainer.innerHTML = content;
        openModal('costDetailsModal');
    }
}

function viewServiceSchedule(equipmentId) {
    const schedule = serviceScheduleDetails[equipmentId];
    if (!schedule) return;

    const content = `
        <div class="form-section">
            <h5><i class="fas fa-calendar-alt"></i> Service Schedule Information</h5>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <div><strong>Equipment:</strong> ${schedule.equipment}</div>
                <div><strong>Service Type:</strong> ${schedule.serviceType}</div>
                <div><strong>Technical Officer:</strong> ${schedule.technicalOfficer}</div>
                <div><strong>Service Interval:</strong> ${schedule.serviceInterval}</div>
                <div><strong>Last Service:</strong> ${schedule.lastService}</div>
                <div><strong>Next Due:</strong> ${schedule.nextServiceDue}</div>
            </div>
            <div style="margin-bottom: 15px;">
                <strong>Insurance Details:</strong><br>
                Provider: ${schedule.insuranceProvider}<br>
                Policy: ${schedule.insurancePolicy}<br>
                Expiry: ${schedule.insuranceExpiry}
            </div>
            <div>
                <strong>Notes:</strong><br>
                ${schedule.notes}
            </div>
        </div>
    `;

    const detailsContainer = document.getElementById('serviceScheduleContent');
    if (detailsContainer) {
        detailsContainer.innerHTML = content;
        openModal('serviceScheduleModal');
    }
}

function viewServiceDetails(serviceId) {
    showToast(`Viewing detailed service record for ${serviceId}`);
}

function approveCost(requestId) {
    const confirmed = window.confirm(`Approve budget request ${requestId}?`);
    if (!confirmed) return;

    reviewCostRequest(requestId, 'approved');
}

function rejectCost(requestId) {
    const confirmed = window.confirm(`Reject budget request ${requestId}?`);
    if (!confirmed) return;

    reviewCostRequest(requestId, 'rejected');
}

async function reviewCostRequest(requestId, status) {
    try {
        const response = await API.post(`/budget-reports/${requestId}/review`, {
            status,
            review_notes: status === 'approved'
                ? 'Approved by Maintenance Manager'
                : 'Rejected by Maintenance Manager'
        });

        if (response.status !== 'success') {
            throw new Error(response.message || `Failed to ${status} budget request`);
        }

        const reviewedItemIndex = pendingCostApprovals.findIndex(item => item.id === String(requestId));
        if (reviewedItemIndex === -1) {
            await loadCostApprovals();
            return;
        }

        const reviewed = pendingCostApprovals.splice(reviewedItemIndex, 1)[0];
        reviewed.status = status;
        reviewed.reviewedAt = new Date().toLocaleString('en-LK');
        reviewed.reviewNotes = status === 'approved'
            ? 'Approved by Maintenance Manager'
            : 'Rejected by Maintenance Manager';

        costApprovalData[reviewed.id] = reviewed;

        if (status === 'approved') {
            approvedCostApprovals.unshift(reviewed);
            showToast(`Cost request ${requestId} approved successfully!`);
        } else {
            rejectedCostApprovals.unshift(reviewed);
            showToast(`Cost request ${requestId} rejected.`);
        }

        renderPendingCostApprovals();
        renderCostApprovalHistoryTables();
    } catch (error) {
        console.error('Cost approval review failed:', error);
        showToast(error.message || 'Failed to update budget approval status');
    }
}

function approveReport(reportId) {
    showToast(`Service report ${reportId} approved and moved to reviewed list!`);
    setTimeout(() => {
        filterServiceReports('reviewed');
    }, 1500);
}

function reviewReport(reportId) {
    viewReportDetails(reportId);
}

function scheduleService(equipmentId) {
    showToast(`Scheduling service for ${equipmentId}`);
}

// Form initialization
function initializeForms() {
    const approveForm = document.getElementById('approveCostForm');
    if (approveForm) {
        approveForm.addEventListener('submit', e => {
            e.preventDefault();
            const requestId = document.getElementById('approveRequestId')?.value || '';
            showToast(`Cost request ${requestId} approved successfully!`);
            closeModal('approveModal');
            approveForm.reset();
        });
    }

    const rejectForm = document.getElementById('rejectCostForm');
    if (rejectForm) {
        rejectForm.addEventListener('submit', e => {
            e.preventDefault();
            const requestId = document.getElementById('rejectRequestId')?.value || '';
            showToast(`Cost request ${requestId} rejected!`);
            closeModal('rejectModal');
            rejectForm.reset();
        });
    }

    const addServiceForm = document.getElementById('addServiceForm');
    if (addServiceForm) {
        addServiceForm.addEventListener('submit', e => {
            e.preventDefault();

            const formData = new FormData(addServiceForm);
            const newRecord = {
                id: formData.get('equipmentId').replace(/\s+/g, '').toUpperCase(),
                equipment: formData.get('equipmentId'),
                insuranceExpiry: formData.get('insuranceExpiry'),
                nextServiceDue: formData.get('nextServiceDue'),
                serviceType: formData.get('serviceType'),
                notes: formData.get('notes') || 'No additional notes'
            };

            serviceScheduleData.push(newRecord);
            updateServiceScheduleTable();

            showToast('Service record added successfully!');
            closeModal('addServiceModal');
            addServiceForm.reset();
        });
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
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
    sidebar?.classList.toggle('open');
}

function setDefaultDates() {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());

    document.querySelectorAll('input[type="date"]').forEach(input => {
        if (input.name === 'nextServiceDue') {
            input.value = nextWeek.toISOString().split('T')[0];
        } else if (input.name === 'insuranceExpiry') {
            input.value = nextMonth.toISOString().split('T')[0];
        }
    });
}

function setupMobileMenu() {
    if (window.innerWidth > 768) return;
    if (document.querySelector('.menu-btn')) return;

    const menuBtn = document.createElement('button');
    menuBtn.innerHTML = '☰';
    menuBtn.className = 'menu-btn';
    menuBtn.setAttribute('aria-label', 'Toggle navigation');
    menuBtn.addEventListener('click', toggleSidebar);

    document.body.prepend(menuBtn);
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    await DashboardInit.init(['Maintenance Manager'], { updateUserDisplay: true });

    await loadCostApprovals();
    initializeForms();
    updateServiceScheduleTable();
    setDefaultDates();
    setupMobileMenu();
});
