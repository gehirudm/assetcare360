// ==================== INITIALIZATION ====================

let currentUser = null;
let machineWeeklyChecksMap = new Map();

// ==================== HELPER FUNCTIONS ====================

/**
 * Map status to display values
 */
function getStatusInfo(status) {
    const statusMap = {
        'Open': { label: 'Pending', class: 'status-pending', text: 'Pending' },
        'Assigned': { label: 'Assigned', class: 'status-assigned', text: 'Assigned' },
        'Waiting for Spare Parts': { label: 'Awaiting Parts', class: 'status-in-progress', text: 'Awaiting Parts' },
        'Parts Approved': { label: 'Parts Approved', class: 'status-assigned', text: 'Parts Approved' },
        'In Progress': { label: 'In Progress', class: 'status-in-progress', text: 'In Progress' },
        'Resolved': { label: 'Finished', class: 'status-resolved', text: 'Finished' },
        'Closed': { label: 'Finished', class: 'status-resolved', text: 'Finished' },
        'Pending': { label: 'Pending', class: 'status-pending', text: 'Pending' }
    };
    return statusMap[status] || { label: status, class: 'status-pending', text: status };
}

/**
 * Get status CSS class based on status
 */
function getStatusClass(status) {
    const statusInfo = getStatusInfo(status);
    return statusInfo.class;
}

/**
 * Format date to readable string
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

/**
 * Get update text based on status
 */
function getUpdateText(status) {
    const updateMap = {
        'Open': 'Awaiting supervisor review',
        'Assigned': 'Technician assigned to this ticket',
        'Waiting for Spare Parts': 'Waiting for spare parts to be approved',
        'Parts Approved': 'Spare parts approved, repair to begin soon',
        'In Progress': 'Being investigated and repaired',
        'Resolved': 'Work completed and ticket resolved ',
        'Closed': 'Ticket closed '
    };
    return updateMap[status] || 'No updates';
}

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
                
                // Refresh weekly check reports every 30 seconds to see status updates
                setInterval(() => {
                    loadConditionUpdates();
                    loadDashboardData();
                }, 30000); // 30 seconds
                
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

async function loadDashboardData() {
    try {
        // Fetch weekly check summary
        const response = await API.get('/machine-weekly-checks?status=pending');
        
        if (response.status === 'success' && response.data) {
            const pendingCount = response.data.count || 0;
            
            // Update summary card
            const summaryCard = document.querySelector('.summary-card[onclick="navigateTo(\'condition-updates\')"] .summary-number');
            if (summaryCard) {
                summaryCard.textContent = pendingCount;
            }
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
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
            serviceInfo: 'Under repair - MBD-003',
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
                <span class="status-text ${machine.statusClass}">${machine.status}</span>
                <button class="btn btn-secondary btn-small" onclick="viewMachine('${machine.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
            </div>
        </div>
    `).join('');
}

async function loadFaultReports() {
    const container = document.getElementById('faultsContainer');
    
    try {
        // Show loading state
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--stone-400);">Loading machine breakdown reports...</div>';
        
        // Fetch machine breakdown reports from API
        const response = await API.get('/machine-breakdowns');
        
        if (response.status === 'success' && response.data && response.data.reports) {
            // Show all machine breakdown reports
            const faults = response.data.reports;
            
            if (faults.length === 0) {
                container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--stone-400);">No fault reports found. Submit a new fault report to get started.</div>';
                return;
            }
            
            container.innerHTML = faults.map(fault => {
                const statusInfo = getStatusInfo(fault.status);
                const imageCount = fault.images ? fault.images.length : 0;
                const isPending = fault.status === 'Pending';
                
                // Status color matching driver style
                let statusColor;
                switch(fault.status) {
                    case 'Resolved':
                        statusColor = '#10b981';
                        break;
                    case 'Assigned':
                        statusColor = '#2563eb';
                        break;
                    case 'In Progress':
                        statusColor = '#8b5cf6';
                        break;
                    case 'Waiting for Spare Parts':
                    case 'Parts Approved':
                        statusColor = '#f59e0b';
                        break;
                    default:
                        statusColor = '#f39c12';
                        break;
                }
                
                // Severity color
                const severityColor = fault.severity === 'Critical' ? '#e74c3c' : 
                                     fault.severity === 'High' ? '#e67e22' : 
                                     fault.severity === 'Medium' ? '#f39c12' : '#27ae60';
                
                const severityIcon = fault.severity === 'Critical' ? 'fa-exclamation-circle' : 
                                    fault.severity === 'High' ? 'fa-exclamation-triangle' : 'fa-info-circle';
                
                // Format date
                const dateStr = formatDate(fault.breakdown_date);
                
                // Description
                const description = fault.description || '';
                const additionalInfo = description.substring(0, 80) + (description.length > 80 ? '...' : '');
                
                // Build technician info if assigned (only show when not Pending)
                let technicianInfo = '';
                if (fault.status !== 'Pending' && fault.assignments && fault.assignments.length > 0) {
                    const techNames = fault.assignments.map(a => a.technician_name).join(', ');
                    technicianInfo = `<div style="margin-top: 5px; color: #2563eb; font-size: 12px; font-weight: 500;">
                        <i class="fas fa-user-cog"></i> Assigned to: ${techNames}
                    </div>`;
                }
                
                // Resolved by info
                let resolvedByInfo = '';
                if (fault.status === 'Resolved' && fault.assignments && fault.assignments.length > 0) {
                    resolvedByInfo = `<div style="margin-top: 5px; color: #10b981; font-size: 12px; font-weight: 500;">
                        <i class="fas fa-user-check"></i> Resolved by: ${fault.assignments.map(a => a.technician_name).join(', ')}
                    </div>`;
                }
                
                return `
                    <div class="inventory-item" data-status="${fault.status.toLowerCase().replace(' ', '-')}">
                        <div class="item-details">
                            <strong><i class="fas ${severityIcon}"></i> ${fault.breakdown_id}</strong>
                            <div class="item-meta">
                                <i class="fas fa-clock"></i> ${dateStr}
                            </div>
                            <div class="item-description">
                                ${fault.status === 'Resolved' 
                                    ? '<span style="background: #10b981; color: white; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;"><i class="fas fa-check-circle"></i> FINISHED</span>'
                                    : '<span style="color: ' + statusColor + '; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">' + fault.status.toUpperCase() + '</span>'} | 
                                <span style="color: ${severityColor}; font-weight: 500;">${(fault.severity || 'Medium').toUpperCase()}</span> | 
                                <span style="color: #555; font-weight: 500;">${fault.breakdown_type || 'General Fault'}</span>
                                <br>
                                <span style="color: #6b7280;"><i class="fas fa-cogs"></i> ${fault.machine_model || fault.machine_name || 'Machine #' + fault.machine_id}</span>
                                <br>
                                ${additionalInfo}
                                ${technicianInfo}
                                ${resolvedByInfo}
                            </div>
                        </div>
                        <div class="item-actions">
                            <div class="action-buttons">
                                <button class="btn btn-primary btn-small" onclick="viewMachineBreakdownDetails(${fault.id})">
                                    <i class="fas fa-eye"></i> VIEW
                                </button>
                                ${isPending ? `
                                <div class="dropdown-container">
                                    <button class="btn btn-small btn-secondary dropdown-trigger" onclick="toggleDropdown(event, 'fault-dropdown-${fault.id}')">
                                        <i class="fas fa-ellipsis-v"></i>
                                    </button>
                                    <div class="dropdown-menu" id="dropdown-fault-dropdown-${fault.id}">
                                        <button class="dropdown-item" onclick="editMachineBreakdown(${fault.id})">
                                            <i class="fas fa-edit"></i> Edit
                                        </button>
                                        <button class="dropdown-item danger" onclick="deleteMachineBreakdown(${fault.id})">
                                            <i class="fas fa-trash"></i> Delete
                                        </button>
                                    </div>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--stone-400);">Failed to load fault reports</div>';
        }
    } catch (error) {
        console.error('Error loading fault reports:', error);
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--red-500);">Error loading fault reports. Please try again.</div>';
    }
}

async function loadConditionUpdates() {
    const container = document.getElementById('updatesContainer');
    
    try {
        // Show loading state
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--stone-400);">Loading weekly check reports...</div>';
        
        // Fetch machine weekly checks from API
        const response = await API.get('/machine-weekly-checks');
        
        if (response.status === 'success' && response.data && response.data.checks) {
            const checks = response.data.checks;
            machineWeeklyChecksMap.clear();
            
            if (checks.length === 0) {
                container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--stone-400);">No weekly check reports found</div>';
                return;
            }
            
            container.innerHTML = checks.map(check => {
                machineWeeklyChecksMap.set(check.check_id, check);
                // Format date
                const submittedDate = check.submitted_date ? new Date(check.submitted_date).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : 'N/A';
                
                // Determine status info
                let statusLabel = 'Pending';
                let statusClass = 'status-pending';
                if (check.status === 'approved') {
                    statusLabel = 'Approved';
                    statusClass = 'status-approved';
                } else if (check.status === 'rejected') {
                    statusLabel = 'Rejected';
                    statusClass = 'status-rejected';
                }
                
                // Format condition
                const conditionLabel = check.overall_condition ? 
                    check.overall_condition.charAt(0).toUpperCase() + check.overall_condition.slice(1) : 
                    'N/A';
                
                return `
                    <div class="inventory-item" data-status="${check.status}">
                        <div class="item-details">
                            <strong><i class="fas fa-clipboard-check"></i> ${check.check_id}</strong>
                            <div class="item-meta">
                                <i class="fas fa-cogs"></i> ${check.machine_name || 'Machine ID: ' + check.machine_id} | 
                                <i class="fas fa-calendar"></i> ${submittedDate}
                            </div>
                            <div class="item-description">
                                <span class="status-text ${statusClass}">${statusLabel}</span> | 
                                Condition: ${conditionLabel}
                            </div>
                        </div>
                        <div class="item-actions">
                            <div class="action-buttons">
                                <button class="btn btn-primary btn-small" onclick="viewUpdateDetails('${check.check_id}')">
                                    <i class="fas fa-eye"></i> VIEW
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--stone-400);">No weekly check reports found</div>';
        }
    } catch (error) {
        console.error('Error loading weekly check reports:', error);
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: #e74c3c;">Error loading weekly check reports</div>';
    }
}

async function loadTickets() {
    const container = document.getElementById('ticketsContainer');
    
    try {
        // Show loading state
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--stone-400);">Loading breakdown reports...</div>';
        
        // Fetch machine breakdown reports from API
        const response = await API.get('/machine-breakdowns');
        
        console.log('=== DEBUG: Machinery Operator Machine Breakdowns ===');
        console.log('Current user:', currentUser);
        console.log('API Response:', response);
        
        if (response.status === 'success' && response.data && response.data.reports) {
            // Filter to only show breakdowns reported by the current user
            const breakdowns = response.data.reports.filter(bd => {
                const matches = currentUser && (bd.operator_id == currentUser.id || bd.operator_name === currentUser.full_name);
                console.log(`Breakdown ${bd.breakdown_id}: operator_id=${bd.operator_id} vs currentUser.id=${currentUser?.id}, operator_name="${bd.operator_name}" vs "${currentUser?.full_name}" => ${matches ? 'MATCH' : 'NO MATCH'}`);
                return matches;
            });
            
            console.log('Filtered breakdowns for current operator:', breakdowns.length);
            
            if (breakdowns.length === 0) {
                container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--stone-400);">No breakdown reports found</div>';
                return;
            }
            
            container.innerHTML = breakdowns.map(breakdown => {
                // Determine the actual status to display (use ticket status if available, otherwise breakdown status)
                const actualStatus = breakdown.ticket_status || breakdown.status;
                const statusInfo = getStatusInfo(actualStatus);
                const updateText = getUpdateText(actualStatus);
                
                return `
                    <div class="inventory-item" data-status="${actualStatus.toLowerCase().replace(' ', '-')}">
                        <div class="item-details">
                            <strong><i class="fas fa-wrench"></i> ${breakdown.breakdown_id}</strong>
                            <div class="item-meta">
                                <i class="fas fa-cogs"></i> ${breakdown.machine_model || 'Machine #' + breakdown.machine_id} | 
                                <i class="fas fa-tools"></i> ${breakdown.breakdown_type || 'General Fault'}
                            </div>
                            <div class="item-description">
                                ${breakdown.description || 'No description'}
                            </div>
                            <div class="item-meta" style="margin-top: 8px;">
                                ${(actualStatus === 'Resolved' || actualStatus === 'Closed') 
                                    ? '<span style="background: #10b981; color: white; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;"><i class="fas fa-check-circle"></i> FINISHED</span>'
                                    : '<span class="status-text ' + statusInfo.class + '">' + statusInfo.label + '</span>'} | 
                                <span class="status-text status-${breakdown.severity?.toLowerCase() || 'medium'}">${breakdown.severity?.toUpperCase() || 'MEDIUM'}</span> | 
                                <i class="fas fa-calendar"></i> ${formatDate(breakdown.breakdown_date)}
                            </div>
                            ${breakdown.fault_ticket_number ? `<div class="item-meta" style="margin-top: 4px; color: #6b7280;"><i class="fas fa-ticket-alt"></i> Ticket: ${breakdown.fault_ticket_number}</div>` : ''}
                            ${breakdown.assignments && breakdown.assignments.length > 0 ? `<div class="item-meta" style="margin-top: 4px;"><i class="fas fa-user-cog" style="color: #2563eb;"></i> <span style="color: #2563eb; font-weight: 600;">Assigned to: ${breakdown.assignments.map(a => a.technician_name).join(', ')}</span></div>` : ''}
                            ${actualStatus !== 'Pending' && actualStatus !== 'Open' ? `<div class="item-meta" style="margin-top: 4px; color: #059669; font-weight: 500;">${updateText}</div>` : ''}
                        </div>
                        <div class="item-actions">
                            <div class="action-buttons">
                                <button class="btn btn-primary btn-small" onclick="viewMachineBreakdownDetails(${breakdown.id})">
                                    <i class="fas fa-eye"></i> VIEW
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--stone-400);">Failed to load breakdown reports</div>';
        }
    } catch (error) {
        console.error('Error loading machine breakdowns:', error);
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--red-500);">Error loading breakdown reports. Please try again.</div>';
    }
}

async function viewMachineBreakdownDetails(id) {
    try {
        // Fetch breakdown details from API
        const response = await API.get(`/machine-breakdowns/${id}`);
        
        if (response.status === 'success' && response.data) {
            const breakdown = response.data;
            
            // Remove any existing modal
            const existingModal = document.getElementById('machineBreakdownModal');
            if (existingModal) existingModal.remove();
            
            // Build work updates HTML - only show for finished/resolved tickets
            // Check both breakdown status and ticket_status (from fault_tickets)
            let workUpdatesHtml = '';
            const isFinished = breakdown.status === 'Resolved' || breakdown.status === 'Finished' || breakdown.status === 'Completed' ||
                               breakdown.ticket_status === 'Resolved' || breakdown.ticket_status === 'Finished' || breakdown.ticket_status === 'Completed';
            
            if (isFinished && breakdown.work_updates && breakdown.work_updates.length > 0) {
                workUpdatesHtml = `
                    <div class="form-section">
                        <h5><i class="fas fa-check-circle" style="color: #27ae60;"></i> Work Completed - Finishing Details</h5>
                        ${breakdown.work_updates.map(update => `
                        <div style="padding: 15px; background: #e8f5e9; border-radius: 6px; border-left: 4px solid #27ae60; margin-bottom: 10px;">
                            <p style="margin: 0 0 8px 0; font-weight: 600; color: #27ae60;">
                                <i class="fas fa-user-cog"></i> ${update.technician_name || 'Technical Officer'}
                            </p>
                            <p style="margin: 0 0 8px 0; color: #333;">
                                <strong>Work Description:</strong> ${update.machine_description || 'N/A'}
                            </p>
                            <p style="margin: 0 0 8px 0; color: #333;">
                                <strong>Parts Used:</strong> ${update.parts_used || 'None'}
                            </p>
                            <p style="margin: 0 0 8px 0; color: #333;">
                                <strong>Time Spent:</strong> ${update.time_spent ? update.time_spent + ' hours' : 'N/A'}
                            </p>
                            <p style="margin: 0 0 8px 0; color: #333;">
                                <strong>Status:</strong> ${update.work_status || 'N/A'}
                            </p>
                            <p style="margin: 0; color: #666; font-size: 0.9em;">
                                <i class="fas fa-calendar-check"></i> Updated: ${formatDate(update.created_at)}
                            </p>
                        </div>
                        `).join('')}
                    </div>
                `;
            } else if (isFinished && breakdown.resolution_notes) {
                workUpdatesHtml = `
                    <div class="form-section">
                        <h5><i class="fas fa-check-circle" style="color: #27ae60;"></i> Resolution Notes</h5>
                        <div style="padding: 15px; background: #e8f5e9; border-radius: 6px; border-left: 4px solid #27ae60;">
                            <p style="margin: 0;">${breakdown.resolution_notes}</p>
                        </div>
                    </div>
                `;
            }
            
            // Build assignments HTML
            let assignmentsHtml = '';
            if (breakdown.assignments && breakdown.assignments.length > 0) {
                assignmentsHtml = `
                    <div class="form-section">
                        <h5><i class="fas fa-user-cog"></i> Assigned Technicians</h5>
                        ${breakdown.assignments.map(a => `
                            <p><strong>${a.technician_name || 'Technician'}</strong> - Assigned: ${formatDate(a.assigned_date)}</p>
                        `).join('')}
                    </div>
                `;
            }
            
            // Create modal
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.id = 'machineBreakdownModal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-info-circle"></i> Machine Breakdown Details</h2>
                        <button class="btn-close" onclick="closeModal('machineBreakdownModal')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="form-section">
                        <h5><i class="fas fa-info-circle"></i> Breakdown Information</h5>
                        <p><strong>Breakdown ID:</strong> ${breakdown.breakdown_id || 'N/A'}</p>
                        <p><strong>Date:</strong> ${formatDate(breakdown.breakdown_date)}</p>
                        <p><strong>Status:</strong> ${breakdown.status || 'Pending'}</p>
                        <p><strong>Severity:</strong> ${breakdown.severity || 'N/A'}</p>
                        <p><strong>Breakdown Type:</strong> ${breakdown.breakdown_type || 'General Fault'}</p>
                    </div>
                    
                    <div class="form-section">
                        <h5><i class="fas fa-cogs"></i> Machine Information</h5>
                        <p><strong>Machine:</strong> ${breakdown.machine_model || breakdown.machine_name || 'Machine #' + breakdown.machine_id}</p>
                        ${breakdown.serial_number ? '<p><strong>Serial Number:</strong> ' + breakdown.serial_number + '</p>' : ''}
                        <p><strong>Operator:</strong> ${breakdown.operator_name || 'N/A'}</p>
                    </div>
                    
                    <div class="form-section">
                        <h5><i class="fas fa-file-alt"></i> Description</h5>
                        <p>${breakdown.description || 'No description provided'}</p>
                    </div>
                    
                    ${breakdown.fault_ticket_number ? `
                    <div class="form-section">
                        <h5><i class="fas fa-ticket-alt"></i> Fault Ticket</h5>
                        <p><strong>Ticket Number:</strong> ${breakdown.fault_ticket_number}</p>
                    </div>
                    ` : ''}
                    
                    ${assignmentsHtml}
                    
                    ${workUpdatesHtml}
                    
                    <button class="btn btn-secondary" onclick="closeModal('machineBreakdownModal')">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            `;
            
            // Add modal to page and show it
            document.body.appendChild(modal);
            
            // Show modal with animation
            requestAnimationFrame(() => {
                modal.classList.add('active');
            });
            
        } else {
            showToast('Failed to load breakdown details', 'error');
        }
    } catch (error) {
        console.error('Error loading breakdown details:', error);
        showToast('Error loading breakdown details', 'error');
    }
}

function createDetailsModal(title, content) {
    // Remove any existing details modal first
    const existingModals = document.querySelectorAll('[id^="detailsModal_"]');
    existingModals.forEach(m => m.remove());
    
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
    
    // Add to body
    document.body.appendChild(modal);
    
    // Force reflow before adding active class for animation
    modal.offsetHeight;
    
    // Add active class to show modal
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
    
    return modal;
}

function getSeverityClass(severity) {
    const severityMap = {
        'Low': 'status-ok',
        'Medium': 'status-warning',
        'High': 'status-danger',
        'Critical': 'status-danger'
    };
    return severityMap[severity] || 'status-warning';
}

function loadNotifications() {
    const notifications = [
        {
            icon: 'fa-check-circle',
            iconColor: 'var(--ok)',
            title: 'Ticket Approved',
            description: 'MBD-001 approved by Supervisor John - Technical Officer Mike assigned',
            time: 'Aug 22, 8:45 AM'
        },
        {
            icon: 'fa-wrench',
            iconColor: 'var(--royal-blue)',
            title: 'Repair Update',
            description: 'MBD-001 - Parts ordered, repair scheduled for tomorrow',
            time: 'Aug 22, 9:00 AM'
        },
        {
            icon: 'fa-check-circle',
            iconColor: 'var(--ok)',
            title: 'Weekly Check Report Approved',
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
            description: 'MBD-002 completed successfully - Loader #128 back in service',
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

async function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        
        // Load machines when opening report fault modal
        if (modalId === 'reportFaultModal') {
            // Clear any previous errors
            const errorDiv = document.getElementById('faultFormErrors');
            if (errorDiv) {
                errorDiv.style.display = 'none';
                errorDiv.innerHTML = '';
            }
            
            // Load machines dropdown
            await loadMachinesForFaultReport();
        }
    }
}

async function loadMachinesForFaultReport() {
    try {
        const machineSelect = document.getElementById('faultMachine');
        if (!machineSelect) return;
        
        // Show loading state
        machineSelect.innerHTML = '<option value="">Loading machines...</option>';
        machineSelect.disabled = true;
        
        // Fetch machines from API
        const response = await API.get('/machines');
        
        if (response.status === 'success' && response.data) {
            const machines = response.data.machines || [];
            
            // Populate dropdown
            machineSelect.innerHTML = '<option value="">Select Machine</option>';
            
            // Filter only active machines
            const activeMachines = machines.filter(m => m.status === 'Active');
            
            if (activeMachines.length === 0) {
                machineSelect.innerHTML = '<option value="">No active machines available</option>';
            } else {
                activeMachines.forEach(machine => {
                    const option = document.createElement('option');
                    option.value = machine.id;
                    option.textContent = `${machine.machine_id || 'ID-' + machine.id} - ${machine.machine_name}`;
                    machineSelect.appendChild(option);
                });
            }
        } else {
            machineSelect.innerHTML = '<option value="">Error loading machines</option>';
            console.error('Failed to load machines:', response.message);
        }
        
        machineSelect.disabled = false;
    } catch (error) {
        console.error('Error loading machines:', error);
        const machineSelect = document.getElementById('faultMachine');
        if (machineSelect) {
            machineSelect.innerHTML = '<option value="">Error loading machines</option>';
            machineSelect.disabled = false;
        }
        showToast('Failed to load machines. Please try again.', 'error');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        
        // Clear errors when closing report fault modal
        if (modalId === 'reportFaultModal') {
            const errorDiv = document.getElementById('faultFormErrors');
            if (errorDiv) {
                errorDiv.style.display = 'none';
                errorDiv.innerHTML = '';
            }
        }
        
        // Remove dynamically created modals
        if (modalId.startsWith('detailsModal_') || modalId === 'machineBreakdownModal') {
            setTimeout(() => modal.remove(), 300);
        }
    }
}

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

    // Photo upload handler
    const photoInput = document.getElementById('faultPhotos');
    if (photoInput) {
        photoInput.addEventListener('change', handlePhotoSelection);
    }

    // Weekly Check Report Form
    const updateForm = document.getElementById('conditionUpdateForm');
    if (updateForm) {
        updateForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleConditionUpdateSubmission();
        });
    }

    // Edit Fault Form
    const editFaultForm = document.getElementById('editFaultForm');
    if (editFaultForm) {
        editFaultForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleEditFaultSubmission();
        });
    }

    // Edit photo upload handler
    const editPhotoInput = document.getElementById('editPhotos');
    if (editPhotoInput) {
        editPhotoInput.addEventListener('change', handleEditPhotoSelection);
    }
    
    // Populate machine dropdown when modal opens
    const conditionModal = document.getElementById('conditionUpdateModal');
    if (conditionModal) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    if (conditionModal.classList.contains('active')) {
                        populateMachineDropdown();
                    }
                }
            });
        });
        observer.observe(conditionModal, { attributes: true });
    }
}

// Populate machine dropdown with actual machines from database
async function populateMachineDropdown() {
    const select = document.getElementById('updateMachine');
    if (!select) return;
    
    try {
        // Fetch machines from the inventory API
        const response = await API.get('/machines');
        
        if (response && response.status === 'success' && response.data && response.data.machines) {
            const machines = response.data.machines;
            
            // Keep the default option and add machines
            select.innerHTML = '<option value="">Select Machine</option>';
            
            // Filter only active machines
            const activeMachines = machines.filter(m => m.status === 'Active');
            
            if (activeMachines.length === 0) {
                select.innerHTML = '<option value="">No active machines available</option>';
                return;
            }
            
            activeMachines.forEach(machine => {
                const option = document.createElement('option');
                option.value = machine.id; // Use database ID as value
                
                // Display format: Machine ID - Machine Name
                const displayText = `${machine.machine_id || `ID-${machine.id}`} - ${machine.machine_name || 'Unnamed'}`;
                
                option.textContent = displayText;
                option.dataset.machineId = machine.machine_id; // Store machine_id for reference
                select.appendChild(option);
            });
        } else {
            // Fallback if API structure is different
            console.error('Unexpected API response structure:', response);
            select.innerHTML = '<option value="">Error loading machines</option>';
        }
    } catch (error) {
        console.error('Error loading machines:', error);
        // Fallback to show error
        select.innerHTML = '<option value="">Error loading machines. Please try again.</option>';
        showToast('Failed to load machines. Please refresh the page.', 'error');
    }
}

// ==================== PHOTO HANDLING ====================

let selectedPhotos = [];

function handlePhotoSelection(event) {
    const files = Array.from(event.target.files);
    
    // Validate file count
    if (selectedPhotos.length + files.length > 5) {
        showToast('Maximum 5 photos allowed', 'error');
        event.target.value = '';
        return;
    }
    
    // Validate file types and sizes
    const validFiles = [];
    for (const file of files) {
        // Check file type
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            showToast(`Invalid file type: ${file.name}. Only JPEG, PNG, and WebP are allowed.`, 'error');
            continue;
        }
        
        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            showToast(`File too large: ${file.name}. Maximum size is 5MB.`, 'error');
            continue;
        }
        
        validFiles.push(file);
    }
    
    // Add valid files to selected photos
    selectedPhotos.push(...validFiles);
    
    // Update preview
    updatePhotoPreview();
    
    // Clear input
    event.target.value = '';
}

function updatePhotoPreview() {
    const container = document.getElementById('photoPreviewContainer');
    container.innerHTML = '';
    
    selectedPhotos.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewItem = document.createElement('div');
            previewItem.className = 'photo-preview-item';
            previewItem.innerHTML = `
                <img src="${e.target.result}" alt="${file.name}">
                <button type="button" class="remove-photo" onclick="removePhoto(${index})">
                    <i class="fas fa-times"></i>
                </button>
                <div class="photo-name" title="${file.name}">${file.name}</div>
            `;
            container.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    });
}

function removePhoto(index) {
    selectedPhotos.splice(index, 1);
    updatePhotoPreview();
    showToast('Photo removed', 'success');
}

async function handleFaultSubmission() {
    try {
        // Hide previous errors
        const errorDiv = document.getElementById('faultFormErrors');
        errorDiv.style.display = 'none';
        errorDiv.innerHTML = '';
        
        const machineId = document.getElementById('faultMachine').value;
        const description = document.getElementById('faultDescription').value;
        const priority = document.getElementById('faultPriority').value;
        
        // Show loading state
        const submitBtn = document.querySelector('#reportFaultForm button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        
        // Step 1: Create machine breakdown report
        const breakdownData = {
            machine_id: parseInt(machineId),
            operator_id: currentUser?.id,
            breakdown_date: new Date().toISOString(),
            breakdown_type: 'General Fault',
            severity: priority === 'Urgent' ? 'Critical' : priority === 'High' ? 'High' : priority === 'Normal' ? 'Medium' : 'Low',
            description: description,
            status: 'Pending'
        };
        
        console.log('Creating machine breakdown:', breakdownData);
        const response = await API.post('/machine-breakdowns', breakdownData);
        
        if (response.status === 'success' && response.data) {
            const breakdownId = response.data.breakdown_id;
            console.log('Machine breakdown created:', breakdownId);
            
            // Step 2: Create fault ticket linked to the breakdown for supervisor assignment
            const ticketFormData = new FormData();
            ticketFormData.append('machine_id', machineId);
            ticketFormData.append('description', description);
            ticketFormData.append('priority', priority);
            ticketFormData.append('breakdown_report_id', breakdownId);
            ticketFormData.append('breakdown_type', 'machine_breakdown');
            
            // Append photos
            selectedPhotos.forEach((photo, index) => {
                ticketFormData.append('photos[]', photo);
            });
            
            console.log('Creating fault ticket for breakdown:', breakdownId);
            const ticketResponse = await API.postFormData('/fault-tickets', ticketFormData);
            
            if (ticketResponse.status === 'success') {
                showToast('Machine breakdown reported successfully! Supervisor will review and assign a technician.', 'success');
            } else {
                showToast('Breakdown created but ticket creation failed. Supervisor can still assign this breakdown.', 'warning');
            }
            
            closeModal('reportFaultModal');
            document.getElementById('reportFaultForm').reset();
            selectedPhotos = [];
            updatePhotoPreview();
            
            // Reload fault reports
            setTimeout(() => {
                loadFaultReports();
            }, 500);
        } else {
            // Handle validation errors
            if (response.errors) {
                // Extract actual error messages from nested structure
                const errors = response.errors.errors || response.errors;
                
                // Display errors in error div
                const errorDiv = document.getElementById('faultFormErrors');
                errorDiv.style.display = 'block';
                errorDiv.innerHTML = '';
                
                // Create error list
                const errorList = document.createElement('ul');
                errorList.style.margin = '0';
                errorList.style.paddingLeft = '20px';
                
                Object.keys(errors).forEach(field => {
                    const li = document.createElement('li');
                    li.textContent = errors[field];
                    errorList.appendChild(li);
                });
                
                errorDiv.appendChild(errorList);
                
                // Scroll to top of modal to show errors
                const modal = document.querySelector('#reportFaultModal .modal-content');
                if (modal) {
                    modal.scrollTop = 0;
                }
            } else {
                showToast(response.message || 'Failed to submit fault report', 'error');
            }
        }
        
        // Restore button
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        
    } catch (error) {
        console.error('Error submitting fault report:', error);
        showToast(error.message || 'Failed to submit fault report', 'error');
        
        // Restore button
        const submitBtn = document.querySelector('#reportFaultForm button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Fault Report';
    }
}

async function handleConditionUpdateSubmission() {
    try {
        const machineId = document.getElementById('updateMachine').value;
        const condition = document.getElementById('updateCondition').value;
        const engine = document.getElementById('updateEngine').value;
        const hydraulic = document.getElementById('updateHydraulic').value;
        const observations = document.getElementById('updateObservations').value;
        const recommendations = document.getElementById('updateRecommendations').value;
        
        if (!machineId || !condition || !engine || !hydraulic || !observations) {
            showToast('Please fill in all required fields', 'error');
            return;
        }
        
        // Calculate week dates (ending today)
        const today = new Date();
        const weekEndDate = today.toISOString().split('T')[0];
        const weekStartDate = new Date(today);
        weekStartDate.setDate(weekStartDate.getDate() - 6);
        const weekStart = weekStartDate.toISOString().split('T')[0];
        
        // Prepare data for API
        const checkData = {
            machine_id: parseInt(machineId),
            operator_id: currentUser?.id || null,
            week_start_date: weekStart,
            week_end_date: weekEndDate,
            overall_condition: condition.toLowerCase(),
            engine_status: engine === 'Normal operation' ? 1 : 0,
            hydraulics: hydraulic === 'Normal operation' ? 1 : 0,
            electrical_system: 1, // Default to working
            safety_equipment: 1, // Default to working
            controls: 1, // Default to working
            lubrication: 1, // Default to working
            cooling_system: 1, // Default to working
            filters: 1, // Default to working
            notes: observations,
            issues_found: engine !== 'Normal operation' || hydraulic !== 'Normal operation' ? 
                `Engine: ${engine}, Hydraulic: ${hydraulic}. ${recommendations}` : 
                recommendations || null
        };
        
        console.log('Submitting weekly check report:', checkData);
        
        // Submit to API
        const response = await API.post('/machine-weekly-checks', checkData);
        
        if (response && response.status === 'success') {
            showToast('Weekly check report submitted successfully! Supervisor will review.', 'success');
            closeModal('conditionUpdateModal');
            document.getElementById('conditionUpdateForm').reset();
            
            // Reload weekly check reports
            setTimeout(() => {
                loadConditionUpdates();
                loadDashboardData();
            }, 500);
        } else {
            showToast(`Failed to submit report: ${response?.message || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        console.error('Error submitting weekly check report:', error);
        showToast(`Error submitting report: ${error.message}`, 'error');
    }
}

// ==================== EDIT FAULT TICKET FUNCTIONS ====================

let editSelectedPhotos = [];
let imagesToDelete = [];

function handleEditPhotoSelection(event) {
    const files = Array.from(event.target.files);
    const existingImageCount = document.querySelectorAll('#existingImages .image-preview').length;
    
    // Validate total file count (existing + new)
    if (existingImageCount + editSelectedPhotos.length + files.length > 5) {
        showToast('Maximum 5 photos allowed in total', 'error');
        event.target.value = '';
        return;
    }
    
    // Validate file types and sizes
    const validFiles = [];
    for (const file of files) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            showToast(`Invalid file type: ${file.name}. Only JPEG, PNG, and WebP are allowed.`, 'error');
            continue;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            showToast(`File too large: ${file.name}. Maximum size is 5MB.`, 'error');
            continue;
        }
        
        validFiles.push(file);
    }
    
    editSelectedPhotos.push(...validFiles);
    updateEditPhotoPreview();
    event.target.value = '';
}

function updateEditPhotoPreview() {
    const container = document.getElementById('editPhotoPreviews');
    container.innerHTML = '';
    
    editSelectedPhotos.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewItem = document.createElement('div');
            previewItem.className = 'photo-preview-item';
            previewItem.innerHTML = `
                <img src="${e.target.result}" alt="${file.name}">
                <button type="button" class="remove-photo" onclick="removeEditPhoto(${index})">
                    <i class="fas fa-times"></i>
                </button>
                <div class="photo-name">${file.name}</div>
            `;
            container.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    });
}

function removeEditPhoto(index) {
    editSelectedPhotos.splice(index, 1);
    updateEditPhotoPreview();
    showToast('Photo removed', 'success');
}

function removeExistingImage(imageId, buttonElement) {
    createConfirmationDialog(
        'Remove Image',
        'Remove this image? It will be deleted when you save the fault ticket.',
        () => {
            imagesToDelete.push(imageId);
            buttonElement.closest('.photo-preview-item').remove();
            showToast('Image will be removed when you save', 'info');
        },
        'warning'
    );
}

async function handleEditFaultSubmission() {
    try {
        const ticketId = document.getElementById('editTicketId').value;
        
        // Create FormData for multipart/form-data
        const formData = new FormData();
        formData.append('description', document.getElementById('editDescription').value);
        formData.append('priority', document.getElementById('editPrioritySelect').value);
        
        // Append new photos
        editSelectedPhotos.forEach((photo) => {
            formData.append('photos[]', photo);
        });
        
        // Append images to delete
        imagesToDelete.forEach((imageId) => {
            formData.append('delete_images[]', imageId);
        });
        
        // Show loading state
        const submitBtn = document.querySelector('#editFaultForm button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
        
        // Submit to API
        const response = await API.putFormData(`/fault-tickets/${ticketId}`, formData);
        
        if (response.status === 'success') {
            showToast('Fault ticket updated successfully!', 'success');
            closeModal('editFaultModal');
            
            // Reset edit form state
            editSelectedPhotos = [];
            imagesToDelete = [];
            
            // Reload fault reports and tickets
            setTimeout(() => {
                loadFaultReports();
                loadTickets();
            }, 500);
        } else {
            showToast(response.message || 'Failed to update fault ticket', 'error');
        }
        
        // Restore button
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        
    } catch (error) {
        console.error('Error updating fault ticket:', error);
        showToast('Failed to update fault ticket. Please try again.', 'error');
        
        // Restore button
        const submitBtn = document.querySelector('#editFaultForm button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Fault Report';
    }
}

// ==================== FILTER FUNCTIONS ====================

function filterFaults(status, buttonElement) {
    filterItems('faultsContainer', status, 'fault reports', buttonElement || event?.target);
}

function filterUpdates(status, buttonElement) {
    filterItems('updatesContainer', status, 'weekly check reports', buttonElement || event?.target);
}

function filterTickets(status, buttonElement) {
    filterItems('ticketsContainer', status, 'tickets', buttonElement || event?.target);
}

function filterItems(containerId, status, label, buttonElement) {
    // Support both .item-card and .inventory-item classes
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const cards = container.querySelectorAll('.item-card, .inventory-item');
    let count = 0;
    
    cards.forEach(card => {
        const cardStatus = card.getAttribute('data-status');
        
        // Show all if 'all' is selected, otherwise match status
        if (status === 'all' || cardStatus === status) {
            card.style.display = 'flex';
            count++;
        } else {
            card.style.display = 'none';
        }
    });
    
    // Update active button
    if (buttonElement) {
        const filterButtons = buttonElement.parentElement.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => btn.classList.remove('active'));
        buttonElement.classList.add('active');
    }
    
    showToast(`Showing ${count} ${label}`, 'success');
}

// ==================== DROPDOWN MENU FUNCTIONS ====================

function toggleDropdown(event, dropdownId) {
    event.stopPropagation();
    const menu = document.getElementById(`dropdown-${dropdownId}`);
    
    // Close all other menus
    document.querySelectorAll('.dropdown-menu').forEach(m => {
        if (m.id !== `dropdown-${dropdownId}`) {
            m.classList.remove('active');
            m.style.display = 'none';
        }
    });
    
    // Toggle current menu
    if (menu) {
        const isVisible = menu.classList.contains('active') || menu.style.display === 'block';
        if (isVisible) {
            menu.classList.remove('active');
            menu.style.display = 'none';
        } else {
            menu.classList.add('active');
            menu.style.display = 'block';
        }
    }
}

function toggleTicketMenu(ticketId, event) {
    event.stopPropagation();
    const menu = document.getElementById(`ticket-menu-${ticketId}`);
    
    // Close all other menus
    document.querySelectorAll('.dropdown-menu').forEach(m => {
        if (m.id !== `ticket-menu-${ticketId}`) {
            m.style.display = 'none';
        }
    });
    
    // Toggle current menu
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

function closeTicketMenu(ticketId) {
    const menu = document.getElementById(`ticket-menu-${ticketId}`);
    if (menu) menu.style.display = 'none';
}

// Close dropdowns when clicking outside
document.addEventListener('click', function() {
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.style.display = 'none';
    });
});

// ==================== EDIT/DELETE TICKET FUNCTIONS ====================

async function editFaultTicket(ticketId) {
    try {
        // Fetch ticket details
        const response = await API.get(`/fault-tickets/${ticketId}`);
        
        if (response.status !== 'success') {
            showToast('Failed to load ticket details', 'error');
            return;
        }
        
        const ticket = response.data;
        
        // Check if ticket is still pending
        if (ticket.status !== 'Open') {
            showToast('Only pending tickets can be edited', 'error');
            return;
        }
        
        // Populate edit form
        document.getElementById('editTicketId').value = ticket.id;
        
        // Display machine name (can't be changed)
        const editMachineSelect = document.getElementById('editMachineSelect');
        editMachineSelect.innerHTML = `<option value="${ticket.machine_id}" selected>${ticket.machine_name || 'Unknown Machine'}</option>`;
        editMachineSelect.disabled = true;
        
        document.getElementById('editPrioritySelect').value = ticket.priority;
        document.getElementById('editDescription').value = ticket.description;
        
        // Display existing images
        const existingImagesContainer = document.getElementById('existingImages');
        existingImagesContainer.innerHTML = '';
        
        if (ticket.images && ticket.images.length > 0) {
            ticket.images.forEach(img => {
                const imgDiv = document.createElement('div');
                imgDiv.className = 'photo-preview-item';
                imgDiv.innerHTML = `
                    <img src="${CONFIG.API_BASE_URL}/uploads/fault-tickets/${img.image_url}" alt="${img.original_filename}">
                    <button type="button" class="remove-photo" onclick="removeExistingImage(${img.id}, this)" data-image-id="${img.id}">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="photo-name">${img.original_filename}</div>
                `;
                existingImagesContainer.appendChild(imgDiv);
            });
        }
        
        // Clear new photos
        document.getElementById('editPhotos').value = '';
        document.getElementById('editPhotoPreviews').innerHTML = '';
        
        // Open modal
        openModal('editFaultModal');
        
    } catch (error) {
        console.error('Error loading ticket for edit:', error);
        showToast('Failed to load ticket details', 'error');
    }
}

async function deleteFaultTicket(ticketId) {
    // Close the dropdown menu first
    closeTicketMenu(ticketId);
    
    createConfirmationDialog(
        'Delete Fault Ticket',
        'Are you sure you want to delete this fault ticket? This action cannot be undone and all associated images will be permanently removed.',
        async () => {
            try {
                const response = await API.delete(`/fault-tickets/${ticketId}`);
                
                if (response.status === 'success') {
                    showToast('Fault ticket deleted successfully', 'success');
                    // Reload tickets
                    loadTickets();
                    loadFaultReports();
                } else {
                    showToast(response.message || 'Failed to delete ticket', 'error');
                }
            } catch (error) {
                console.error('Error deleting ticket:', error);
                showToast('Failed to delete ticket. Please try again.', 'error');
            }
        },
        'danger'
    );
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
            condition: 'Under maintenance - MBD-003'
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
                    <div style="margin-bottom: 8px;"><strong>Status:</strong> <span class="status-text ${machine.status === 'Operational' ? 'status-approved' : 'status-pending'}">${machine.status}</span></div>
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

async function viewFaultDetails(id) {
    try {
        // Show loading indicator
        const loadingModal = document.createElement('div');
        loadingModal.className = 'modal active';
        loadingModal.id = 'loadingModal';
        loadingModal.innerHTML = `
            <div class="modal-content" style="text-align: center; padding: 40px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 32px; color: var(--stone-600);"></i>
                <p style="margin-top: 16px;">Loading fault details...</p>
            </div>
        `;
        document.body.appendChild(loadingModal);
        
        // Fetch fault ticket details
        const response = await API.get(`/fault-tickets/${id}`);
        
        // Remove loading modal
        const loading = document.getElementById('loadingModal');
        if (loading) loading.remove();

        if (response.status !== 'success') {
            showToast(response.message || 'Failed to load fault details', 'error');
            return;
        }

        const fault = response.data;
        const statusInfo = getStatusInfo(fault.status);
        const updateText = getUpdateText(fault.status);

        // Build assigned technicians section (only show when NOT Open/Pending)
        let assignedTechniciansHtml = '';
        if (fault.status !== 'Open' && fault.assignments && fault.assignments.length > 0) {
            assignedTechniciansHtml = `
                <div class="form-section">
                    <h5><i class="fas fa-user-check"></i> Assigned Technicians (${fault.assignments.length})</h5>
                    <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 12px;">
                        ${fault.assignments.map(assignment => `
                            <div style="padding: 12px; background: var(--stone-50); border-radius: 8px; border: 1px solid var(--stone-200);">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                    <i class="fas fa-user" style="color: var(--royal-blue);"></i>
                                    <strong>${assignment.technician_name || 'N/A'}</strong>
                                    ${assignment.technician_employee_id ? `<span style="color: var(--muted); font-size: 0.9em;">(${assignment.technician_employee_id})</span>` : ''}
                                </div>
                                ${assignment.technician_email ? `
                                    <div style="font-size: 0.9em; color: var(--text-600); margin-left: 24px;">
                                        <i class="fas fa-envelope" style="width: 16px;"></i> ${assignment.technician_email}
                                    </div>
                                ` : ''}
                                ${assignment.technician_phone ? `
                                    <div style="font-size: 0.9em; color: var(--text-600); margin-left: 24px;">
                                        <i class="fas fa-phone" style="width: 16px;"></i> ${assignment.technician_phone}
                                    </div>
                                ` : ''}
                                ${assignment.assigned_by_name ? `
                                    <div style="font-size: 0.85em; color: var(--muted); margin-top: 8px; margin-left: 24px;">
                                        Assigned by: ${assignment.assigned_by_name}
                                    </div>
                                ` : ''}
                                ${assignment.expected_completion_date ? `
                                    <div style="font-size: 0.85em; color: var(--muted); margin-top: 4px; margin-left: 24px;">
                                        Expected Completion: ${new Date(assignment.expected_completion_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Build images section
        let imagesHtml = '';
        if (fault.images && fault.images.length > 0) {
            imagesHtml = `
                <div class="form-section">
                    <h5><i class="fas fa-images"></i> Attached Images (${fault.images.length})</h5>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; margin-top: 12px;">
                        ${fault.images.map(img => `
                            <div style="position: relative; aspect-ratio: 1; border-radius: 8px; overflow: hidden; border: 1px solid var(--stone-200);">
                                <img src="${CONFIG.API_BASE_URL}/uploads/fault-tickets/${img.image_url}" 
                                     alt="${img.original_filename}"
                                     style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;"
                                     onclick="window.open('${CONFIG.API_BASE_URL}/uploads/fault-tickets/${img.image_url}', '_blank')"
                                     onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'display:flex;align-items:center;justify-content:center;height:100%;background:var(--stone-100);color:var(--stone-500);\\'>Image not available</div>'">
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        const modal = createDetailsModal(`Fault Report ${fault.ticket_id || ('MBD-' + String(fault.id).padStart(3, '0'))}`, `
            <div class="form-section">
                <h5><i class="fas fa-info-circle"></i> Fault Information</h5>
                <p><strong>Ticket ID:</strong> ${fault.ticket_id || ('MBD-' + String(fault.id).padStart(3, '0'))}</p>
                <p><strong>Machine:</strong> ${fault.machine_name || 'Unknown'}</p>
                <p><strong>Location:</strong> ${fault.location || 'Not specified'}</p>
                <p><strong>Submitted:</strong> ${formatDate(fault.created_at)}</p>
                <p><strong>Priority:</strong> <span class="priority-badge priority-${fault.priority?.toLowerCase()}">${fault.priority || 'Medium'}</span></p>
                <p><strong>Reported By:</strong> ${fault.reported_by_name || 'N/A'}</p>
                <p><strong>Current Status:</strong> ${(fault.status === 'Resolved' || fault.status === 'Closed') 
                    ? '<span style=\"background: #10b981; color: white; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;\"><i class=\"fas fa-check-circle\"></i> FINISHED</span>'
                    : '<span class=\"status-text ' + statusInfo.class + '\">' + statusInfo.text + '</span>'}</p>
            </div>
            
            <div class="form-section">
                <h5><i class="fas fa-file-alt"></i> Description</h5>
                <p style="white-space: pre-wrap; border-left: none; padding: 12px; background: var(--background); border-radius: 6px;">${fault.description || 'No description provided'}</p>
            </div>
            
            ${(fault.status === 'Resolved' || fault.status === 'Closed') && fault.resolution_notes ? `
            <div class="form-section">
                <h5 style="color: #10b981;"><i class="fas fa-clipboard-check"></i> Resolution Notes</h5>
                <p style="white-space: pre-wrap; border-left: 3px solid #10b981; padding: 12px; background: #f0fdf4; border-radius: 6px;">${fault.resolution_notes}</p>
            </div>
            ` : ''}
            
            ${assignedTechniciansHtml}
            ${imagesHtml}
            
            <div class="form-section">
                <h5><i class="fas fa-clock"></i> Timeline</h5>
                <p><strong>Last Update:</strong> ${updateText}</p>
                ${fault.updated_at !== fault.created_at ? `<p><strong>Updated On:</strong> ${formatDate(fault.updated_at)}</p>` : ''}
            </div>
        `);
        
        document.body.appendChild(modal);
        modal.classList.add('active');
    } catch (error) {
        // Remove loading modal if exists
        const loading = document.getElementById('loadingModal');
        if (loading) loading.remove();
        
        console.error('Error loading fault details:', error);
        showToast('Failed to load fault details. Please try again.', 'error');
    }
}

async function viewUpdateDetails(checkId) {
    try {
        // Use cached data if available, otherwise fetch from API
        let check = machineWeeklyChecksMap.get(checkId);
        
        if (!check) {
            const response = await API.get(`/machine-weekly-checks?id=${checkId}`);
            
            if (!response || response.status !== 'success' || !response.data || !response.data.check) {
                showToast('Failed to load weekly check report details', 'error');
                return;
            }
            
            check = response.data.check;
        }
        
        // Format dates
        const submittedDate = check.submitted_date ? new Date(check.submitted_date).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) : 'N/A';
        
        const weekStart = check.week_start_date ? new Date(check.week_start_date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }) : 'N/A';
        
        const weekEnd = check.week_end_date ? new Date(check.week_end_date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }) : 'N/A';
        
        const reviewedDate = check.reviewed_date ? new Date(check.reviewed_date).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) : null;
        
        // Format condition
        const condition = check.overall_condition ? 
            check.overall_condition.charAt(0).toUpperCase() + check.overall_condition.slice(1) : 
            'N/A';
        
        // Determine status info
        let statusLabel = 'Pending Review';
        let statusClass = 'status-pending';
        if (check.status === 'approved') {
            statusLabel = 'Approved';
            statusClass = 'status-approved';
        } else if (check.status === 'rejected') {
            statusLabel = 'Rejected';
            statusClass = 'status-rejected';
        }
        
        // Format system statuses
        const engineStatus = check.engine_status === 1 || check.engine_status === true ? 'Normal operation' : 'Issues observed';
        const hydraulicStatus = check.hydraulics === 1 || check.hydraulics === true ? 'Normal operation' : 'Issues observed';
        const electricalStatus = check.electrical_system === 1 || check.electrical_system === true ? 'Normal operation' : 'Issues observed';
        const safetyStatus = check.safety_equipment === 1 || check.safety_equipment === true ? 'Normal operation' : 'Issues observed';
        const controlsStatus = check.controls === 1 || check.controls === true ? 'Normal operation' : 'Issues observed';
        const lubricationStatus = check.lubrication === 1 || check.lubrication === true ? 'Normal operation' : 'Issues observed';
        const coolingStatus = check.cooling_system === 1 || check.cooling_system === true ? 'Normal operation' : 'Issues observed';
        const filtersStatus = check.filters === 1 || check.filters === true ? 'Normal operation' : 'Issues observed';
        
        const modal = createDetailsModal(`Weekly Check Report - ${checkId}`, `
            <div class="form-section">
                <h5><i class="fas fa-info-circle"></i> Basic Information</h5>
                <p><strong>Check ID:</strong> ${check.check_id}</p>
                <p><strong>Machine:</strong> ${check.machine_name || 'Machine ID: ' + check.machine_id}</p>
                <p><strong>Week Period:</strong> ${weekStart} - ${weekEnd}</p>
                <p><strong>Submitted:</strong> ${submittedDate}</p>
                <p><strong>Status:</strong> <span class="status-text ${statusClass}">${statusLabel}</span></p>
            </div>
            
            <div class="form-section">
                <h5><i class="fas fa-chart-bar"></i> Overall Condition</h5>
                <p><strong>Overall Assessment:</strong> ${condition}</p>
            </div>
            
            <div class="form-section">
                <h5><i class="fas fa-cogs"></i> System Status</h5>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <p><strong>Engine:</strong> ${engineStatus}</p>
                    <p><strong>Hydraulic System:</strong> ${hydraulicStatus}</p>
                    <p><strong>Electrical System:</strong> ${electricalStatus}</p>
                    <p><strong>Safety Equipment:</strong> ${safetyStatus}</p>
                    <p><strong>Controls:</strong> ${controlsStatus}</p>
                    <p><strong>Lubrication:</strong> ${lubricationStatus}</p>
                    <p><strong>Cooling System:</strong> ${coolingStatus}</p>
                    <p><strong>Filters:</strong> ${filtersStatus}</p>
                </div>
            </div>
            
            ${check.notes ? `
            <div class="form-section">
                <h5><i class="fas fa-clipboard-list"></i> Observations</h5>
                <p style="white-space: pre-wrap; border-left: none; padding: 12px; background: var(--background); border-radius: 6px;">${check.notes}</p>
            </div>
            ` : ''}
            
            ${check.issues_found ? `
            <div class="form-section">
                <h5><i class="fas fa-exclamation-triangle"></i> Issues Found</h5>
                <p style="white-space: pre-wrap; border-left: none; padding: 12px; background: var(--background); border-radius: 6px;">${check.issues_found}</p>
            </div>
            ` : ''}
            
            ${check.status !== 'pending' ? `
            <div class="form-section">
                <h5><i class="fas fa-check-circle"></i> Review Details</h5>
                ${check.reviewed_by_name ? `<p><strong>Reviewed By:</strong> ${check.reviewed_by_name}</p>` : ''}
                ${reviewedDate ? `<p><strong>Review Date:</strong> ${reviewedDate}</p>` : ''}
                ${check.rejection_reason ? `<p><strong>Rejection Reason:</strong></p><p style="white-space: pre-wrap; border-left: 3px solid #e74c3c; padding: 12px; background: var(--background); border-radius: 6px;">${check.rejection_reason}</p>` : ''}
            </div>
            ` : ''}
        `);
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        modal.style.display = 'flex';
        
        // Add active class with slight delay to ensure transition works
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);
        
    } catch (error) {
        console.error('Error viewing weekly check report:', error);
        showToast('Error loading report details', 'error');
    }
}

function viewTicketTimeline(id) {
    const timelines = {
        'MBD-001': [
            { step: 1, title: 'Fault Reported', actor: 'Machine Operator', date: 'Aug 20, 2:15 PM', desc: 'Hydraulic fluid leak from main cylinder' },
            { step: 2, title: 'Supervisor Approved', actor: 'Supervisor John', date: 'Aug 20, 3:30 PM', desc: 'Approved for technical officer assignment' },
            { step: 3, title: 'TO Assigned', actor: 'Supervisor John', date: 'Aug 20, 4:00 PM', desc: 'Assigned to Technical Officer Mike' },
            { step: 4, title: 'Investigation Started', actor: 'Technical Officer Mike', date: 'Aug 21, 9:00 AM', desc: 'Initial assessment completed' },
            { step: 5, title: 'Parts Ordered', actor: 'Technical Officer Mike', date: 'Aug 22, 9:00 AM', desc: 'Hydraulic seals ordered, repair in progress' }
        ],
        'MBD-002': [
            { step: 1, title: 'Fault Reported', actor: 'Machine Operator', date: 'Aug 18, 11:00 AM', desc: 'Brake pedal feels soft' },
            { step: 2, title: 'Supervisor Approved', actor: 'Supervisor Mike', date: 'Aug 18, 2:00 PM', desc: 'High priority - safety concern' },
            { step: 3, title: 'TO Assigned', actor: 'Supervisor Mike', date: 'Aug 18, 2:30 PM', desc: 'Assigned to Technical Officer Sarah' },
            { step: 4, title: 'Repair Started', actor: 'Technical Officer Sarah', date: 'Aug 19, 8:00 AM', desc: 'Brake system inspection begun' },
            { step: 5, title: 'Repair Completed', actor: 'Technical Officer Sarah', date: 'Aug 21, 2:00 PM', desc: 'Brake fluid replaced, system bled' },
            { step: 6, title: 'Validation Completed', actor: 'Supervisor Mike', date: 'Aug 21, 3:30 PM', desc: 'Repair validated, machine returned to service' }
        ],
        'MBD-003': [
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
    
    // Close on outside click
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeConfirmation();
        }
    };
    
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

// ==================== MACHINE BREAKDOWN FUNCTIONS ====================

async function editMachineBreakdown(id) {
    console.log('Edit machine breakdown:', id);
    showToast('Edit machine breakdown feature coming soon', 'info');
}

async function deleteMachineBreakdown(id) {
    console.log('Delete machine breakdown:', id);
    showToast('Delete machine breakdown feature coming soon', 'info');
}
