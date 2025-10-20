// ==================== INITIALIZATION ====================

let currentUser = null;

document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Check authentication and authorization using DashboardInit
        // Note: 'Machinary Operator' matches the database ENUM (contains typo)
        const user = await DashboardInit.init(['Machinary Operator', 'Admin'], {
            updateUserDisplay: true,
            onSuccess: async (user) => {
                // Store current user
                currentUser = user;
                
                // Update specific user info elements for this dashboard
                const userNameElement = document.getElementById('userName');
                
                if (userNameElement) {
                    userNameElement.textContent = user.full_name || user.name || 'Machine Operator';
                }
                
                // Load initial data
                loadDashboardData();
                loadAssignedMachines();
                loadFaultReports();
                loadConditionUpdates();
                loadTickets();
                loadNotifications();
                
                // Setup event listeners
                setupNavigation();
                setupFormHandlers();
                setupMobileMenu();
            }
        });
    } catch (error) {
        console.error('Initialization error:', error);
        // DashboardInit will handle redirects automatically
    }
});

// ==================== NAVIGATION ====================

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(this.getAttribute('data-section')).classList.add('active');
        });
    });
}

function navigateTo(sectionId) {
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
    const navItem = document.querySelector(`[data-section="${sectionId}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
    }
}

// ==================== DATA LOADING ====================

function loadDashboardData() {
    // This would typically fetch from API
    // For now, using static data as in original
    console.log('Dashboard data loaded');
}

function loadAssignedMachines() {
    const machines = [
        {
            id: 'EXC-045',
            name: 'Excavator #045',
            type: 'Hydraulic Excavator',
            location: 'Site A - Zone 3',
            hours: '1,847 / 2,000',
            serviceInfo: 'Service due in 153 hours',
            status: 'Operational',
            statusClass: 'status-approved'
        },
        {
            id: 'TRK-203',
            name: 'Truck #203',
            type: 'Heavy Duty Truck',
            location: 'Maintenance Bay 2',
            hours: '2,340 / 2,500',
            serviceInfo: 'Under repair - TKT-003',
            status: 'Maintenance',
            statusClass: 'status-pending'
        },
        {
            id: 'LOD-128',
            name: 'Loader #128',
            type: 'Front End Loader',
            location: 'Site B - Zone 1',
            hours: '890 / 2,000',
            serviceInfo: 'All systems operational',
            status: 'Operational',
            statusClass: 'status-approved'
        }
    ];

    const container = document.getElementById('assignedMachines');
    container.innerHTML = machines.map(machine => `
        <div class="item-card">
            <div class="item-details">
                <strong>${machine.name}</strong>
                <div class="item-meta">Type: ${machine.type} | Location: ${machine.location}</div>
                <div class="item-description">Hours: ${machine.hours} | ${machine.serviceInfo}</div>
            </div>
            <div class="item-actions">
                <span class="status-badge ${machine.statusClass}">${machine.status}</span>
                <button class="btn btn-secondary btn-small" onclick="viewMachine('${machine.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
            </div>
        </div>
    `).join('');
}

function loadFaultReports() {
    const faults = [
        {
            id: 'TKT-003',
            machine: 'Truck #203',
            submitted: 'Aug 22, 10:30 AM',
            description: 'Engine making unusual noise, loss of power',
            priority: 'High',
            photos: 2,
            status: 'pending',
            statusLabel: 'Pending',
            statusClass: 'status-pending'
        },
        {
            id: 'TKT-001',
            machine: 'Excavator #045',
            submitted: 'Aug 20, 02:15 PM',
            description: 'Hydraulic fluid leak from main cylinder',
            priority: 'Medium',
            photos: 3,
            status: 'in-progress',
            statusLabel: 'In Progress',
            statusClass: 'status-in-progress'
        },
        {
            id: 'TKT-002',
            machine: 'Loader #128',
            submitted: 'Aug 18, 11:00 AM',
            description: 'Brake pedal feels soft, reduced stopping power',
            priority: 'High',
            photos: 1,
            status: 'resolved',
            statusLabel: 'Resolved',
            statusClass: 'status-resolved'
        }
    ];

    const container = document.getElementById('faultsContainer');
    container.innerHTML = faults.map(fault => `
        <div class="item-card" data-status="${fault.status}">
            <div class="item-details">
                <strong>${fault.id}</strong>
                <div class="item-meta">Machine: ${fault.machine} | Submitted: ${fault.submitted}</div>
                <div class="item-description">${fault.description}</div>
                <div class="item-meta">Priority: ${fault.priority} | Photos: ${fault.photos} attached</div>
            </div>
            <div class="item-actions">
                <span class="status-badge ${fault.statusClass}">${fault.statusLabel}</span>
                <button class="btn btn-secondary btn-small" onclick="viewFaultDetails('${fault.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
            </div>
        </div>
    `).join('');
}

function loadConditionUpdates() {
    const updates = [
        {
            id: 'UPD-005',
            machine: 'Excavator #045',
            submitted: 'Aug 22, 05:00 PM',
            hours: '1,847',
            condition: 'Good - All systems functioning normally',
            status: 'approved',
            statusLabel: 'Reviewed',
            statusClass: 'status-approved'
        },
        {
            id: 'UPD-004',
            machine: 'Loader #128',
            submitted: 'Aug 22, 12:30 PM',
            hours: '890',
            condition: 'Excellent - No issues detected',
            status: 'pending',
            statusLabel: 'Pending',
            statusClass: 'status-pending'
        }
    ];

    const container = document.getElementById('updatesContainer');
    container.innerHTML = updates.map(update => `
        <div class="item-card" data-status="${update.status}">
            <div class="item-details">
                <strong>${update.id}</strong>
                <div class="item-meta">Machine: ${update.machine} | Submitted: ${update.submitted}</div>
                <div class="item-description">Hours: ${update.hours} | ${update.condition}</div>
            </div>
            <div class="item-actions">
                <span class="status-badge ${update.statusClass}">${update.statusLabel}</span>
                <button class="btn btn-secondary btn-small" onclick="viewUpdateDetails('${update.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
            </div>
        </div>
    `).join('');
}

function loadTickets() {
    const tickets = [
        {
            id: 'TKT-003',
            machine: 'Truck #203',
            submitted: 'Aug 22, 10:30 AM',
            description: 'Engine making unusual noise, loss of power',
            update: 'Awaiting supervisor review',
            status: 'pending',
            statusLabel: 'Pending',
            statusClass: 'status-pending'
        },
        {
            id: 'TKT-001',
            machine: 'Excavator #045',
            submitted: 'Aug 20, 02:15 PM',
            description: 'Hydraulic fluid leak from main cylinder',
            update: 'Parts ordered, repair in progress',
            status: 'in-progress',
            statusLabel: 'In Progress',
            statusClass: 'status-in-progress'
        },
        {
            id: 'TKT-002',
            machine: 'Loader #128',
            submitted: 'Aug 18, 11:00 AM',
            description: 'Brake pedal feels soft',
            update: 'Completed Aug 21, 3:30 PM',
            status: 'resolved',
            statusLabel: 'Resolved',
            statusClass: 'status-resolved'
        }
    ];

    const container = document.getElementById('ticketsContainer');
    container.innerHTML = tickets.map(ticket => `
        <div class="item-card" data-status="${ticket.status}">
            <div class="item-details">
                <strong>${ticket.id}</strong>
                <div class="item-meta">Machine: ${ticket.machine} | Submitted: ${ticket.submitted}</div>
                <div class="item-description">${ticket.description}</div>
                <div class="item-meta">Last Update: ${ticket.update}</div>
            </div>
            <div class="item-actions">
                <span class="status-badge ${ticket.statusClass}">${ticket.statusLabel}</span>
                <button class="btn btn-secondary btn-small" onclick="viewTicketTimeline('${ticket.id}')">
                    <i class="fas fa-history"></i> Timeline
                </button>
            </div>
        </div>
    `).join('');
}

function loadNotifications() {
    const notifications = [
        {
            icon: 'fa-check-circle',
            iconColor: 'var(--ok)',
            title: 'Ticket Approved',
            description: 'TKT-001 approved by Supervisor John - Technical Officer Mike assigned',
            time: 'Aug 22, 8:45 AM'
        },
        {
            icon: 'fa-wrench',
            iconColor: 'var(--royal-blue)',
            title: 'Repair Update',
            description: 'TKT-001 - Parts ordered, repair scheduled for tomorrow',
            time: 'Aug 22, 9:00 AM'
        },
        {
            icon: 'fa-check-circle',
            iconColor: 'var(--ok)',
            title: 'Condition Update Approved',
            description: 'UPD-005 for Excavator #045 reviewed and approved by Supervisor John',
            time: 'Aug 22, 5:15 PM'
        },
        {
            icon: 'fa-clock',
            iconColor: 'var(--warn)',
            title: 'Service Reminder',
            description: 'Excavator #045 service due in 2 days (153 hours remaining)',
            time: 'Aug 22, 6:00 AM'
        },
        {
            icon: 'fa-thumbs-up',
            iconColor: 'var(--kelly-green)',
            title: 'Ticket Resolved',
            description: 'TKT-002 completed successfully - Loader #128 back in service',
            time: 'Aug 21, 3:30 PM'
        }
    ];

    const container = document.getElementById('notificationsContainer');
    container.innerHTML = notifications.map(notif => `
        <div class="item-card">
            <div class="item-details">
                <strong>
                    <i class="fas ${notif.icon}" style="color: ${notif.iconColor};"></i> 
                    ${notif.title}
                </strong>
                <div class="item-description">${notif.description}</div>
                <div class="item-meta">${notif.time}</div>
            </div>
        </div>
    `).join('');
}

// ==================== MODAL FUNCTIONS ====================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// Close modal on outside click
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

// ==================== FORM HANDLERS ====================

function setupFormHandlers() {
    // Fault Report Form
    const faultForm = document.getElementById('reportFaultForm');
    if (faultForm) {
        faultForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleFaultSubmission();
        });
    }

    // Condition Update Form
    const updateForm = document.getElementById('conditionUpdateForm');
    if (updateForm) {
        updateForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleConditionUpdateSubmission();
        });
    }
}

function handleFaultSubmission() {
    const formData = {
        machine: document.getElementById('faultMachine').value,
        category: document.getElementById('faultCategory').value,
        description: document.getElementById('faultDescription').value,
        priority: document.getElementById('faultPriority').value,
        location: document.getElementById('faultLocation').value,
        hours: document.getElementById('faultHours').value
    };

    // Here you would typically send to API
    console.log('Fault report submitted:', formData);
    
    showToast('Fault report submitted successfully! Supervisor will review shortly.', 'success');
    closeModal('reportFaultModal');
    document.getElementById('reportFaultForm').reset();
    
    // Reload fault reports
    setTimeout(() => {
        loadFaultReports();
    }, 500);
}

function handleConditionUpdateSubmission() {
    const formData = {
        machine: document.getElementById('updateMachine').value,
        hours: document.getElementById('updateHours').value,
        condition: document.getElementById('updateCondition').value,
        engine: document.getElementById('updateEngine').value,
        hydraulic: document.getElementById('updateHydraulic').value,
        observations: document.getElementById('updateObservations').value,
        recommendations: document.getElementById('updateRecommendations').value
    };

    // Here you would typically send to API
    console.log('Condition update submitted:', formData);
    
    showToast('Condition update submitted successfully! Supervisor will review.', 'success');
    closeModal('conditionUpdateModal');
    document.getElementById('conditionUpdateForm').reset();
    
    // Reload condition updates
    setTimeout(() => {
        loadConditionUpdates();
    }, 500);
}

// ==================== FILTER FUNCTIONS ====================

function filterFaults(status) {
    filterItems('faultsContainer', status, 'fault reports');
}

function filterUpdates(status) {
    filterItems('updatesContainer', status, 'condition updates');
}

function filterTickets(status) {
    filterItems('ticketsContainer', status, 'tickets');
}

function filterItems(containerId, status, label) {
    const cards = document.querySelectorAll(`#${containerId} .item-card`);
    let count = 0;
    
    cards.forEach(card => {
        if (status === 'all' || card.getAttribute('data-status') === status) {
            card.style.display = 'flex';
            count++;
        } else {
            card.style.display = 'none';
        }
    });
    
    // Update active button
    const filterButtons = event.target.parentElement.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    showToast(`Showing ${count} ${label}`, 'success');
}

// ==================== VIEW DETAIL FUNCTIONS ====================

function viewMachine(id) {
    const machines = {
        'EXC-045': {
            name: 'Excavator #045',
            type: 'Hydraulic Excavator',
            hours: '1,847 / 2,000',
            lastService: 'July 15, 2024',
            location: 'Site A - Zone 3',
            status: 'Operational',
            fuelLevel: '75%',
            condition: 'Good - Minor hydraulic noise'
        },
        'TRK-203': {
            name: 'Truck #203',
            type: 'Heavy Duty Truck',
            hours: '2,340 / 2,500',
            lastService: 'August 10, 2024',
            location: 'Maintenance Bay 2',
            status: 'Under Repair',
            fuelLevel: '45%',
            condition: 'Under maintenance - TKT-003'
        },
        'LOD-128': {
            name: 'Loader #128',
            type: 'Front End Loader',
            hours: '890 / 2,000',
            lastService: 'June 20, 2024',
            location: 'Site B - Zone 1',
            status: 'Operational',
            fuelLevel: '90%',
            condition: 'Excellent - No issues'
        }
    };

    const machine = machines[id];
    if (!machine) return;

    const detailsModal = document.createElement('div');
    detailsModal.className = 'modal active';
    detailsModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-cog"></i> ${machine.name} Details</h2>
                <button class="btn-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div style="padding: 30px;">
                <div class="form-section">
                    <h5><i class="fas fa-wrench"></i> Machine Information</h5>
                    <div style="margin-bottom: 8px;"><strong>Machine ID:</strong> ${id}</div>
                    <div style="margin-bottom: 8px;"><strong>Type:</strong> ${machine.type}</div>
                    <div style="margin-bottom: 8px;"><strong>Status:</strong> <span class="status-badge ${machine.status === 'Operational' ? 'status-approved' : 'status-pending'}">${machine.status}</span></div>
                    <div style="margin-bottom: 8px;"><strong>Location:</strong> ${machine.location}</div>
                </div>
                <div class="form-section">
                    <h5><i class="fas fa-chart-bar"></i> Operating Hours</h5>
                    <div style="margin-bottom: 8px;"><strong>Current Hours:</strong> ${machine.hours}</div>
                    <div style="margin-bottom: 8px;"><strong>Last Service:</strong> ${machine.lastService}</div>
                    <div style="margin-bottom: 8px;"><strong>Service Status:</strong> ${id === 'EXC-045' ? 'Due in 153 hours' : 'Up to date'}</div>
                </div>
                <div class="form-section">
                    <h5><i class="fas fa-info-circle"></i> Current Condition</h5>
                    <div style="margin-bottom: 8px;"><strong>Overall Condition:</strong> ${machine.condition}</div>
                    <div style="margin-bottom: 8px;"><strong>Fuel Level:</strong> ${machine.fuelLevel}</div>
                </div>
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--stone-200); display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="btn btn-primary" onclick="this.closest('.modal').remove(); openModal('reportFaultModal');">
                        <i class="fas fa-exclamation-triangle"></i> Report Fault
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(detailsModal);
}

function viewFaultDetails(id) {
    const faultData = {
        'TKT-003': {
            machine: 'Truck #203',
            submitted: 'Aug 22, 10:30 AM',
            priority: 'High',
            category: 'Engine System',
            description: 'Engine making unusual noise, loss of power during operation',
            status: 'Pending',
            statusClass: 'status-pending',
            lastUpdate: 'Awaiting supervisor review'
        },
        'TKT-001': {
            machine: 'Excavator #045',
            submitted: 'Aug 20, 02:15 PM',
            priority: 'Medium',
            category: 'Hydraulic System',
            description: 'Hydraulic fluid leak from main cylinder',
            status: 'In Progress',
            statusClass: 'status-in-progress',
            lastUpdate: 'Parts ordered, repair in progress'
        },
        'TKT-002': {
            machine: 'Loader #128',
            submitted: 'Aug 18, 11:00 AM',
            priority: 'High',
            category: 'Brake System',
            description: 'Brake pedal feels soft, reduced stopping power',
            status: 'Resolved',
            statusClass: 'status-resolved',
            lastUpdate: 'Completed Aug 21, 3:30 PM'
        }
    };

    const fault = faultData[id];
    if (!fault) return;

    const detailsModal = document.createElement('div');
    detailsModal.className = 'modal active';
    detailsModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-exclamation-triangle"></i> Fault Report - ${id}</h2>
                <button class="btn-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div style="padding: 30px;">
                <div class="form-section">
                    <h5><i class="fas fa-info-circle"></i> Fault Information</h5>
                    <div style="margin-bottom: 8px;"><strong>Ticket ID:</strong> ${id}</div>
                    <div style="margin-bottom: 8px;"><strong>Machine:</strong> ${fault.machine}</div>
                    <div style="margin-bottom: 8px;"><strong>Submitted:</strong> ${fault.submitted}</div>
                    <div style="margin-bottom: 8px;"><strong>Priority:</strong> ${fault.priority}</div>
                    <div style="margin-bottom: 8px;"><strong>Category:</strong> ${fault.category}</div>
                </div>
                <div class="form-section">
                    <h5><i class="fas fa-file-alt"></i> Description</h5>
                    <div>${fault.description}</div>
                </div>
                <div class="form-section">
                    <h5><i class="fas fa-tasks"></i> Status</h5>
                    <div style="margin-bottom: 8px;"><strong>Current Status:</strong> <span class="status-badge ${fault.statusClass}">${fault.status}</span></div>
                    <div style="margin-bottom: 8px;"><strong>Last Update:</strong> ${fault.lastUpdate}</div>
                </div>
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--stone-200); display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(detailsModal);
}

function viewUpdateDetails(id) {
    const updateData = {
        'UPD-005': {
            machine: 'Excavator #045',
            submitted: 'Aug 22, 05:00 PM',
            hours: '1,847',
            condition: 'Good',
            enginePerf: 'Normal operation',
            hydraulicSys: 'Minor issues observed',
            observations: 'Slight hydraulic noise when extending boom. Fluid levels normal. Performance not significantly affected.',
            recommendations: 'Monitor hydraulic system. Consider inspection during next scheduled maintenance.',
            reviewedBy: 'Supervisor John',
            status: 'Reviewed',
            statusClass: 'status-approved',
            reviewNotes: 'Observations noted. Will schedule detailed hydraulic inspection.'
        },
        'UPD-004': {
            machine: 'Loader #128',
            submitted: 'Aug 22, 12:30 PM',
            hours: '890',
            condition: 'Excellent',
            enginePerf: 'Normal operation',
            hydraulicSys: 'Normal operation',
            observations: 'All systems functioning properly. No unusual sounds or vibrations. Smooth operation throughout the shift.',
            recommendations: 'Continue regular maintenance schedule. No immediate concerns.',
            reviewedBy: 'Supervisor Mike',
            status: 'Pending Review',
            statusClass: 'status-pending',
            reviewNotes: ''
        }
    };

    const update = updateData[id];
    if (!update) return;

    const detailsModal = document.createElement('div');
    detailsModal.className = 'modal active';
    detailsModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-clipboard-check"></i> Condition Update - ${id}</h2>
                <button class="btn-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div style="padding: 30px;">
                <div class="form-section">
                    <h5><i class="fas fa-cog"></i> Machine Information</h5>
                    <div style="margin-bottom: 8px;"><strong>Update ID:</strong> ${id}</div>
                    <div style="margin-bottom: 8px;"><strong>Machine:</strong> ${update.machine}</div>
                    <div style="margin-bottom: 8px;"><strong>Submitted:</strong> ${update.submitted}</div>
                    <div style="margin-bottom: 8px;"><strong>Current Hours:</strong> ${update.hours}</div>
                </div>
                <div class="form-section">
                    <h5><i class="fas fa-chart-bar"></i> Condition Assessment</h5>
                    <div style="margin-bottom: 8px;"><strong>Overall Condition:</strong> ${update.condition}</div>
                    <div style="margin-bottom: 8px;"><strong>Engine Performance:</strong> ${update.enginePerf}</div>
                    <div style="margin-bottom: 8px;"><strong>Hydraulic System:</strong> ${update.hydraulicSys}</div>
                </div>
                <div class="form-section">
                    <h5><i class="fas fa-clipboard-list"></i> Detailed Observations</h5>
                    <div>${update.observations}</div>
                </div>
                <div class="form-section">
                    <h5><i class="fas fa-tools"></i> Maintenance Recommendations</h5>
                    <div>${update.recommendations}</div>
                </div>
                <div class="form-section">
                    <h5><i class="fas fa-check-circle"></i> Review Status</h5>
                    <div style="margin-bottom: 8px;"><strong>Status:</strong> <span class="status-badge ${update.statusClass}">${update.status}</span></div>
                    <div style="margin-bottom: 8px;"><strong>Reviewed By:</strong> ${update.reviewedBy}</div>
                    ${update.reviewNotes ? `<div style="margin-bottom: 8px;"><strong>Review Notes:</strong> ${update.reviewNotes}</div>` : ''}
                </div>
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--stone-200); display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(detailsModal);
}

function viewTicketTimeline(id) {
    const timelines = {
        'TKT-001': [
            { step: 1, title: 'Fault Reported', actor: 'Machine Operator', date: 'Aug 20, 2:15 PM', desc: 'Hydraulic fluid leak from main cylinder' },
            { step: 2, title: 'Supervisor Approved', actor: 'Supervisor John', date: 'Aug 20, 3:30 PM', desc: 'Approved for technical officer assignment' },
            { step: 3, title: 'TO Assigned', actor: 'Supervisor John', date: 'Aug 20, 4:00 PM', desc: 'Assigned to Technical Officer Mike' },
            { step: 4, title: 'Investigation Started', actor: 'Technical Officer Mike', date: 'Aug 21, 9:00 AM', desc: 'Initial assessment completed' },
            { step: 5, title: 'Parts Ordered', actor: 'Technical Officer Mike', date: 'Aug 22, 9:00 AM', desc: 'Hydraulic seals ordered, repair in progress' }
        ],
        'TKT-002': [
            { step: 1, title: 'Fault Reported', actor: 'Machine Operator', date: 'Aug 18, 11:00 AM', desc: 'Brake pedal feels soft' },
            { step: 2, title: 'Supervisor Approved', actor: 'Supervisor Mike', date: 'Aug 18, 2:00 PM', desc: 'High priority - safety concern' },
            { step: 3, title: 'TO Assigned', actor: 'Supervisor Mike', date: 'Aug 18, 2:30 PM', desc: 'Assigned to Technical Officer Sarah' },
            { step: 4, title: 'Repair Started', actor: 'Technical Officer Sarah', date: 'Aug 19, 8:00 AM', desc: 'Brake system inspection begun' },
            { step: 5, title: 'Repair Completed', actor: 'Technical Officer Sarah', date: 'Aug 21, 2:00 PM', desc: 'Brake fluid replaced, system bled' },
            { step: 6, title: 'Validation Completed', actor: 'Supervisor Mike', date: 'Aug 21, 3:30 PM', desc: 'Repair validated, machine returned to service' }
        ],
        'TKT-003': [
            { step: 1, title: 'Fault Reported', actor: 'Machine Operator', date: 'Aug 22, 10:30 AM', desc: 'Engine making unusual noise, loss of power' }
        ]
    };

    const timeline = timelines[id] || [];
    let timelineHtml = '';
    
    timeline.forEach((entry, index) => {
        const isLast = index === timeline.length - 1;
        timelineHtml += `
            <div style="display: flex; margin-bottom: 20px;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--royal-blue); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; flex-shrink: 0;">
                    ${entry.step}
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: var(--text-700);">${entry.title}</div>
                    <div style="color: var(--muted); font-size: 13px; margin-bottom: 5px;">${entry.date} - ${entry.actor}</div>
                    <div style="color: var(--text-700); font-size: 14px;">${entry.desc}</div>
                    ${!isLast ? '<div style="width: 2px; height: 20px; background: #e5e7eb; margin-left: 19px; margin-top: 10px;"></div>' : ''}
                </div>
            </div>
        `;
    });

    const detailsModal = document.createElement('div');
    detailsModal.className = 'modal active';
    detailsModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-history"></i> Ticket Timeline - ${id}</h2>
                <button class="btn-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div style="padding: 30px;">
                ${timelineHtml}
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--stone-200); display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(detailsModal);
}

// ==================== TOAST NOTIFICATIONS ====================

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// ==================== LOGOUT ====================

function logout() {
    createConfirmationDialog(
        'Confirm Logout',
        'Are you sure you want to logout? Any unsaved changes will be lost.',
        () => {
            Auth.logout();
        },
        'warning'
    );
}

// ==================== CONFIRMATION DIALOG ====================

function createConfirmationDialog(title, message, onConfirm, type = 'danger') {
    const modal = document.createElement('div');
    modal.className = 'modal confirmation-modal';
    modal.id = 'confirmationModal';
    
    modal.innerHTML = `
        <div class="modal-content confirmation-content">
            <div class="confirmation-header ${type}">
                <i class="fas fa-${type === 'danger' ? 'exclamation-triangle' : type === 'warning' ? 'exclamation-circle' : 'question-circle'}"></i>
                <h4>${title}</h4>
            </div>
            <div class="confirmation-body">
                <p>${message}</p>
            </div>
            <div class="confirmation-actions">
                <button class="btn btn-secondary" onclick="closeConfirmation()">
                    <i class="fas fa-times"></i> Cancel
                </button>
                <button class="btn btn-${type}" onclick="confirmAction()">
                    <i class="fas fa-check"></i> Confirm
                </button>
            </div>
        </div>
    `;
    
    // Store the confirmation action
    window.pendingConfirmAction = onConfirm;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeConfirmation() {
    const modal = document.getElementById('confirmationModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
    window.pendingConfirmAction = null;
}

async function confirmAction() {
    if (window.pendingConfirmAction) {
        await window.pendingConfirmAction();
        closeConfirmation();
    }
}

// ==================== MOBILE MENU ====================

function setupMobileMenu() {
    if (window.innerWidth <= 768) {
        const menuBtn = document.createElement('button');
        menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
        menuBtn.style.cssText = `
            position: fixed; 
            top: 80px; 
            left: 20px; 
            z-index: 1000; 
            background: var(--royal-blue); 
            color: white; 
            border: none; 
            padding: 12px 16px; 
            border-radius: 8px; 
            font-size: 20px; 
            cursor: pointer; 
            box-shadow: var(--shadow);
        `;
        menuBtn.onclick = () => document.querySelector('.sidebar').classList.toggle('open');
        document.body.prepend(menuBtn);
    }
}

// Handle window resize for mobile menu
window.addEventListener('resize', function() {
    const existingBtn = document.querySelector('button[style*="position: fixed"]');
    if (window.innerWidth > 768 && existingBtn) {
        existingBtn.remove();
    } else if (window.innerWidth <= 768 && !existingBtn) {
        setupMobileMenu();
    }
});
