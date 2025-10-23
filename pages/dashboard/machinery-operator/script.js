// ==================== INITIALIZATION ====================

let currentUser = null;

// ==================== HELPER FUNCTIONS ====================

/**
 * Map status to display values
 */
function getStatusInfo(status) {
    const statusMap = {
        'Open': { label: 'Pending', class: 'status-pending', text: 'Pending' },
        'In Progress': { label: 'In Progress', class: 'status-in-progress', text: 'In Progress' },
        'Resolved': { label: 'Resolved', class: 'status-resolved', text: 'Resolved' },
        'Closed': { label: 'Closed', class: 'status-resolved', text: 'Resolved' }
    };
    return statusMap[status] || { label: status, class: 'status-pending', text: status };
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
        'In Progress': 'Being investigated',
        'Resolved': 'Completed and resolved',
        'Closed': 'Ticket closed'
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
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--stone-400);">Loading fault reports...</div>';
        
        // Fetch fault tickets from API
        const response = await API.get('/fault-tickets');
        
        if (response.status === 'success' && response.data && response.data.tickets) {
            const faults = response.data.tickets;
            
            if (faults.length === 0) {
                container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--stone-400);">No fault reports found</div>';
                return;
            }
            
            container.innerHTML = faults.map(fault => {
                const statusInfo = getStatusInfo(fault.status);
                const imageCount = fault.images ? fault.images.length : 0;
                const isPending = fault.status === 'Open';
                
                // Build action buttons based on status
                let actionButtons = `
                    <button class="btn btn-secondary btn-small" onclick="viewFaultDetails(${fault.id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                `;
                
                // Add edit/delete dropdown for pending tickets
                if (isPending) {
                    actionButtons += `
                        <div style="position: relative; display: inline-block;">
                            <button class="btn btn-secondary btn-small" onclick="toggleTicketMenu(${fault.id}, event)" id="ticket-menu-btn-${fault.id}">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div class="dropdown-menu" id="ticket-menu-${fault.id}" style="display: none; position: absolute; right: 0; top: 100%; margin-top: 4px; background: white; border: 1px solid var(--stone-200); border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); min-width: 150px; z-index: 1000;">
                                <button onclick="editFaultTicket(${fault.id}); closeTicketMenu(${fault.id})" style="width: 100%; padding: 10px 16px; border: none; background: none; text-align: left; cursor: pointer; display: flex; align-items: center; gap: 8px; color: var(--text-700);" onmouseover="this.style.background='var(--stone-50)'" onmouseout="this.style.background='none'">
                                    <i class="fas fa-edit" style="width: 16px;"></i> Edit
                                </button>
                                <button onclick="deleteFaultTicket(${fault.id})" style="width: 100%; padding: 10px 16px; border: none; background: none; text-align: left; cursor: pointer; display: flex; align-items: center; gap: 8px; color: var(--danger);" onmouseover="this.style.background='var(--red-50)'" onmouseout="this.style.background='none'">
                                    <i class="fas fa-trash" style="width: 16px;"></i> Delete
                                </button>
                            </div>
                        </div>
                    `;
                }
                
                return `
                    <div class="item-card" data-status="${fault.status.toLowerCase().replace(' ', '-')}">
                        <div class="item-details">
                            <strong>TKT-${String(fault.id).padStart(3, '0')}</strong>
                            <div class="item-meta">Machine: ${fault.machine_name || 'Unknown'} | Submitted: ${formatDate(fault.created_at)}</div>
                            <div class="item-description">${fault.description}</div>
                            <div class="item-meta">Priority: ${fault.priority} | Photos: ${imageCount} attached | Location: ${fault.location}</div>
                        </div>
                        <div class="item-actions">
                            <span class="status-text ${statusInfo.class}">${statusInfo.label}</span>
                            <div style="display: flex; gap: 8px; align-items: center;">
                                ${actionButtons}
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
                <span class="status-text ${update.statusClass}">${update.statusLabel}</span>
                <button class="btn btn-secondary btn-small" onclick="viewUpdateDetails('${update.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
            </div>
        </div>
    `).join('');
}

async function loadTickets() {
    const container = document.getElementById('ticketsContainer');
    
    try {
        // Show loading state
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--stone-400);">Loading tickets...</div>';
        
        // Fetch fault tickets from API
        const response = await API.get('/fault-tickets');
        
        if (response.status === 'success' && response.data && response.data.tickets) {
            const tickets = response.data.tickets;
            
            if (tickets.length === 0) {
                container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--stone-400);">No tickets found</div>';
                return;
            }
            
            container.innerHTML = tickets.map(ticket => {
                const statusInfo = getStatusInfo(ticket.status);
                const updateText = getUpdateText(ticket.status);
                const isPending = ticket.status === 'Open';
                
                // Build action buttons based on status
                let actionButtons = `
                    <button class="btn btn-secondary btn-small" onclick="viewFaultDetails(${ticket.id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                `;
                
                return `
                    <div class="item-card" data-status="${ticket.status.toLowerCase().replace(' ', '-')}">
                        <div class="item-details">
                            <strong>TKT-${String(ticket.id).padStart(3, '0')}</strong>
                            <div class="item-meta">Machine: ${ticket.machine_name || 'Unknown'} | Submitted: ${formatDate(ticket.created_at)}</div>
                            <div class="item-description">${ticket.description}</div>
                            <div class="item-meta">Last Update: ${updateText}</div>
                        </div>
                        <div class="item-actions" style="display: flex; gap: 8px; align-items: center;">
                            <span class="status-text ${statusInfo.class}">${statusInfo.label}</span>
                            ${actionButtons}
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--stone-400);">Failed to load tickets</div>';
        }
    } catch (error) {
        console.error('Error loading tickets:', error);
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--red-500);">Error loading tickets. Please try again.</div>';
    }
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
                    option.textContent = `${machine.machine_name} - ${machine.model_number} (${machine.location})`;
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
        
        // Clear errors when closing report fault modal
        if (modalId === 'reportFaultModal') {
            const errorDiv = document.getElementById('faultFormErrors');
            if (errorDiv) {
                errorDiv.style.display = 'none';
                errorDiv.innerHTML = '';
            }
        }
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

    // Photo upload handler
    const photoInput = document.getElementById('faultPhotos');
    if (photoInput) {
        photoInput.addEventListener('change', handlePhotoSelection);
    }

    // Condition Update Form
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
        
        // Create FormData for multipart/form-data
        const formData = new FormData();
        formData.append('machine_id', document.getElementById('faultMachine').value);
        formData.append('description', document.getElementById('faultDescription').value);
        formData.append('priority', document.getElementById('faultPriority').value);
        
        // Append photos
        selectedPhotos.forEach((photo, index) => {
            formData.append('photos[]', photo);
        });
        
        // Show loading state
        const submitBtn = document.querySelector('#reportFaultForm button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        
        // Submit to API
        const response = await API.postFormData('/fault-tickets', formData);
        
        if (response.status === 'success') {
            showToast('Fault report submitted successfully! Supervisor will review shortly.', 'success');
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
    filterItems('updatesContainer', status, 'condition updates', buttonElement || event?.target);
}

function filterTickets(status, buttonElement) {
    filterItems('ticketsContainer', status, 'tickets', buttonElement || event?.target);
}

function filterItems(containerId, status, label, buttonElement) {
    const cards = document.querySelectorAll(`#${containerId} .item-card`);
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
                    <img src="http://localhost:8000/api/uploads/fault-tickets/${img.image_url}" alt="${img.original_filename}">
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

        // Build images section
        let imagesHtml = '';
        if (fault.images && fault.images.length > 0) {
            imagesHtml = `
                <div class="form-section">
                    <h5><i class="fas fa-images"></i> Attached Images (${fault.images.length})</h5>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; margin-top: 12px;">
                        ${fault.images.map(img => `
                            <div style="position: relative; aspect-ratio: 1; border-radius: 8px; overflow: hidden; border: 1px solid var(--stone-200);">
                                <img src="http://localhost:8000/api/uploads/fault-tickets/${img.image_url}" 
                                     alt="${img.original_filename}"
                                     style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;"
                                     onclick="window.open('http://localhost:8000/api/uploads/fault-tickets/${img.image_url}', '_blank')"
                                     onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'display:flex;align-items:center;justify-content:center;height:100%;background:var(--stone-100);color:var(--stone-500);\\'>Image not available</div>'">
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        const detailsModal = document.createElement('div');
        detailsModal.className = 'modal active';
        detailsModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-exclamation-triangle"></i> Fault Report #${fault.id}</h2>
                    <button class="btn-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div style="padding: 30px;">
                    <div class="form-section">
                        <h5><i class="fas fa-info-circle"></i> Fault Information</h5>
                        <div style="margin-bottom: 8px;"><strong>Ticket ID:</strong> #${fault.id}</div>
                        <div style="margin-bottom: 8px;"><strong>Machine:</strong> ${fault.machine_name || 'Unknown'}</div>
                        <div style="margin-bottom: 8px;"><strong>Location:</strong> ${fault.location || 'Not specified'}</div>
                        <div style="margin-bottom: 8px;"><strong>Submitted:</strong> ${formatDate(fault.created_at)}</div>
                        <div style="margin-bottom: 8px;"><strong>Priority:</strong> <span class="priority-badge priority-${fault.priority?.toLowerCase()}">${fault.priority || 'Medium'}</span></div>
                        <div style="margin-bottom: 8px;"><strong>Reported By:</strong> ${fault.reported_by_name || 'N/A'}</div>
                    </div>
                    <div class="form-section">
                        <h5><i class="fas fa-file-alt"></i> Description</h5>
                        <div style="padding: 12px; background: var(--stone-50); border-radius: 8px; border: 1px solid var(--stone-200);">
                            ${fault.description || 'No description provided'}
                        </div>
                    </div>
                    ${imagesHtml}
                    <div class="form-section">
                        <h5><i class="fas fa-tasks"></i> Status</h5>
                        <div style="margin-bottom: 8px;"><strong>Current Status:</strong> <span class="status-text ${statusInfo.class}">${statusInfo.text}</span></div>
                        <div style="margin-bottom: 8px;"><strong>Last Update:</strong> ${updateText}</div>
                        ${fault.updated_at !== fault.created_at ? `<div style="margin-bottom: 8px;"><strong>Updated On:</strong> ${formatDate(fault.updated_at)}</div>` : ''}
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
    } catch (error) {
        // Remove loading modal if exists
        const loading = document.getElementById('loadingModal');
        if (loading) loading.remove();
        
        console.error('Error loading fault details:', error);
        showToast('Failed to load fault details. Please try again.', 'error');
    }
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
                    <div style="margin-bottom: 8px;"><strong>Status:</strong> <span class="status-text ${update.statusClass}">${update.status}</span></div>
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
