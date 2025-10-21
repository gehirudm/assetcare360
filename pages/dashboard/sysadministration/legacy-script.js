// Check authentication and authorization on page load
(async function checkAccess() {
    await DashboardInit.init('Admin', {
        updateUserDisplay: true,
        onSuccess: (user) => {
            console.log('Admin dashboard access granted:', user.full_name);
        },
        onError: (error) => {
            console.error('Access denied:', error);
        }
    });
})();

// Navigation functionality
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
        
        this.classList.add('active');
        
        const sectionId = this.getAttribute('data-section');
        document.getElementById(sectionId).classList.add('active');
    });
});

// Navigate to specific section programmatically
function navigateToSection(sectionId) {
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
    
    const navItem = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }
    
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
    }
}

// Modal functionality
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        // Clear any form errors when opening modal
        const form = modal.querySelector('form');
        if (form && typeof Utils !== 'undefined' && Utils.clearFormErrors) {
            Utils.clearFormErrors(form);
        }
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// Toast notification (legacy - uses inline showToast, but Utils.showToast exists too)
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    
    // Change color based on type
    if (type === 'error') {
        toast.style.background = 'var(--danger)';
    } else if (type === 'warning') {
        toast.style.background = 'var(--warn)';
        toast.style.color = '#000';
    } else {
        toast.style.background = 'var(--kelly-green)';
        toast.style.color = '#fff';
    }
    
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Permission Management Functions
function editPermission(module) {
    showToast(`Opening permission editor for ${module}`);
}

// User Management Functions
function viewUserDetails(empId) {
    const title = document.getElementById('detailsTitle');
    const content = document.getElementById('detailsContent');
    
    const userDetails = {
        'EMP-001': {
            name: 'John Smith',
            empId: 'EMP-001',
            email: 'john.smith@company.com',
            phone: '+94 77 123 4567',
            role: 'Supervisor',
            department: 'Maintenance',
            status: 'Active',
            lastLogin: 'Today at 9:30 AM',
            created: 'Jan 15, 2025',
            loginCount: 245,
            permissions: ['Create Tickets', 'Approve Tickets', 'View Reports', 'Manage Team']
        }
    };
    
    const user = userDetails[empId] || userDetails['EMP-001'];
    
    title.textContent = `User Details - ${user.name}`;
    content.innerHTML = `
        <div class="form-section">
            <h5>👤 Personal Information</h5>
            <div class="form-grid">
                <div><strong>Full Name:</strong> ${user.name}</div>
                <div><strong>Employee ID:</strong> ${user.empId}</div>
                <div><strong>Email:</strong> ${user.email}</div>
                <div><strong>Phone:</strong> ${user.phone}</div>
            </div>
        </div>
        <div class="form-section">
            <h5>🏢 Work Information</h5>
            <div class="form-grid">
                <div><strong>Role:</strong> ${user.role}</div>
                <div><strong>Department:</strong> ${user.department}</div>
                <div><strong>Status:</strong> <span class="status-badge status-active">${user.status}</span></div>
                <div><strong>Account Created:</strong> ${user.created}</div>
            </div>
        </div>
        <div class="form-section">
            <h5>📊 Activity Statistics</h5>
            <div class="form-grid">
                <div><strong>Last Login:</strong> ${user.lastLogin}</div>
                <div><strong>Total Logins:</strong> ${user.loginCount}</div>
            </div>
        </div>
        <div class="form-section">
            <h5>🔐 Permissions</h5>
            <div>${user.permissions.map(p => `• ${p}`).join('<br>')}</div>
        </div>
    `;
    
    openModal('detailsModal');
}

function editUser(empId) {
    showToast(`Opening edit form for user ${empId}`);
    // In real implementation, would populate and open edit modal
}

function resetPassword(empId) {
    if (confirm(`Reset password for user ${empId}?`)) {
        showToast(`Password reset email sent to user ${empId}`);
    }
}

function suspendUser(empId) {
    if (confirm(`Are you sure you want to suspend user ${empId}?`)) {
        showToast(`User ${empId} has been suspended`, 'warning');
        // Update UI to reflect suspension
    }
}

function activateUser(empId) {
    if (confirm(`Activate user ${empId}?`)) {
        showToast(`User ${empId} has been activated`);
    }
}

function deleteUser(empId) {
    if (confirm(`WARNING: Permanently delete user ${empId}? This action cannot be undone!`)) {
        showToast(`User ${empId} has been deleted`, 'error');
    }
}

function exportUsers() {
    showToast('Exporting user list to CSV...');
    // In real implementation, would trigger CSV download
}

// Service Configuration Functions
function editServiceInterval(intervalId) {
    showToast(`Opening edit form for service interval ${intervalId}`);
}

function deleteServiceInterval(intervalId) {
    if (confirm(`Delete service interval ${intervalId}?`)) {
        showToast(`Service interval ${intervalId} deleted`, 'warning');
    }
}

function scheduleService(assetId) {
    showToast(`Opening service scheduling for ${assetId}`);
}

function viewVehicleDetails(vehicleId) {
    showToast(`Opening vehicle details for ${vehicleId}`);
}

function viewMachineDetails(machineId) {
    showToast(`Opening machine details for ${machineId}`);
}

// Petty Cash Functions
function editPettyCashLimit(role) {
    showToast(`Opening petty cash limit editor for ${role}`);
}

function viewPettyCashHistory(empId) {
    showToast(`Opening petty cash history for ${empId}`);
}

function adjustLimit(empId) {
    showToast(`Opening limit adjustment for ${empId}`);
}

// Template Functions
function previewTemplate(templateId) {
    showToast(`Previewing template ${templateId}`);
}

function editTemplate(templateId) {
    showToast(`Opening template editor for ${templateId}`);
}

function testTemplate(templateId) {
    if (confirm(`Send test notification using template ${templateId}?`)) {
        showToast(`Test notification sent successfully`);
    }
}

// Log Functions
function exportLogs() {
    showToast('Exporting system logs to CSV...');
}

function confirmClearLogs() {
    if (confirm('Clear logs older than 90 days? This action cannot be undone.')) {
        showToast('Old logs have been cleared', 'warning');
    }
}

// Activity Tracking Functions
function viewUserSession(empId) {
    showToast(`Viewing active session for ${empId}`);
}

function forceLogout(empId) {
    if (confirm(`Force logout for user ${empId}?`)) {
        showToast(`User ${empId} has been logged out`, 'warning');
    }
}

function viewFullActivityLog(empId) {
    showToast(`Opening full activity log for ${empId}`);
}

function generateActivityReport(empId) {
    showToast(`Generating activity report for ${empId}...`);
}

function sendInactivityReminder(empId) {
    showToast(`Inactivity reminder sent to ${empId}`);
}

// Search and Filter Functions
function initializeSearchAndFilter() {
    // User search
    const userSearch = document.getElementById('userSearch');
    const roleFilter = document.getElementById('roleFilter');
    const statusFilter = document.getElementById('statusFilter');
    
    if (userSearch) {
        userSearch.addEventListener('input', filterUsers);
    }
    if (roleFilter) {
        roleFilter.addEventListener('change', filterUsers);
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', filterUsers);
    }
}

function filterUsers() {
    const searchValue = document.getElementById('userSearch')?.value.toLowerCase() || '';
    const roleValue = document.getElementById('roleFilter')?.value || '';
    const statusValue = document.getElementById('statusFilter')?.value || '';
    
    const items = document.querySelectorAll('#userList .user-item');
    
    items.forEach(item => {
        const itemText = item.textContent.toLowerCase();
        const itemRole = item.getAttribute('data-role');
        const itemStatus = item.getAttribute('data-status');
        
        const matchesSearch = searchValue === '' || itemText.includes(searchValue);
        const matchesRole = roleValue === '' || itemRole === roleValue;
        const matchesStatus = statusValue === '' || itemStatus === statusValue;
        
        if (matchesSearch && matchesRole && matchesStatus) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Form submission handlers
function initializeForms() {
    // Reset Password Form
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            showToast('Password reset successfully. User has been notified.');
            closeModal('resetPasswordModal');
            this.reset();
        });
    }

    // Add Service Interval Form
    const addServiceIntervalForm = document.getElementById('addServiceIntervalForm');
    if (addServiceIntervalForm) {
        addServiceIntervalForm.addEventListener('submit', function(e) {
            e.preventDefault();
            showToast('Service interval added successfully');
            closeModal('addServiceIntervalModal');
            this.reset();
        });
    }

    // Set Petty Cash Limit Form
    const setPettyCashLimitForm = document.getElementById('setPettyCashLimitForm');
    if (setPettyCashLimitForm) {
        setPettyCashLimitForm.addEventListener('submit', function(e) {
            e.preventDefault();
            showToast('Petty cash limits updated successfully');
            closeModal('setPettyCashLimitModal');
            this.reset();
        });
    }

    // Create Template Form
    const createTemplateForm = document.getElementById('createTemplateForm');
    if (createTemplateForm) {
        createTemplateForm.addEventListener('submit', function(e) {
            e.preventDefault();
            showToast('Notification template created successfully');
            closeModal('createTemplateModal');
            this.reset();
        });
    }

    // Create Role Form
    const createRoleForm = document.getElementById('createRoleForm');
    if (createRoleForm) {
        createRoleForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const roleName = this.querySelector('input[placeholder*="Fleet Manager"]').value;
            showToast(`New role "${roleName}" created successfully`);
            closeModal('createRoleModal');
            this.reset();
        });
    }
}

// Logout function is now in dashboard-init.js and available globally

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
    sidebar.classList.toggle('open');
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Legacy initialization for non-user sections
    initializeForms();
    initializeSearchAndFilter();
    
    // Set today's date as default for date inputs
    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(input => {
        if (!input.value) {
            input.value = today;
        }
    });

    // Generate temporary password on modal open
    const createUserBtn = document.querySelector('button[onclick*="createUserModal"]');
    if (createUserBtn) {
        document.getElementById('createUserModal')?.addEventListener('click', function(e) {
            if (e.target === this || e.target.classList.contains('close')) return;
            
            const tempPasswordField = this.querySelector('input[placeholder="Auto-generated"]');
            if (tempPasswordField && !tempPasswordField.value) {
                tempPasswordField.value = generateTempPassword();
            }
        });
    }

    // Character counter for SMS template
    const smsTextarea = document.querySelector('#createTemplateModal textarea[maxlength="160"]');
    if (smsTextarea) {
        smsTextarea.addEventListener('input', function() {
            const charCount = this.value.length;
            const counter = this.nextElementSibling;
            if (counter && counter.tagName === 'SMALL') {
                counter.textContent = `Character count: ${charCount}/160`;
            }
        });
    }

    // Add mobile menu button for responsive design
    if (window.innerWidth <= 768) {
        const menuBtn = document.createElement('button');
        menuBtn.innerHTML = '☰';
        menuBtn.className = 'menu-btn';
        menuBtn.style.cssText = `
            position: fixed;
            top: 80px;
            left: 20px;
            z-index: 1000;
            background: var(--royal-blue);
            color: white;
            border: none;
            padding: 10px;
            border-radius: 5px;
            font-size: 18px;
            cursor: pointer;
            box-shadow: var(--shadow);
        `;
        menuBtn.onclick = toggleSidebar;
        document.body.prepend(menuBtn);
    }
});

// Helper function to generate temporary password
function generateTempPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// Auto-refresh active users every 30 seconds (in real implementation)
setInterval(function() {
    // In real implementation, would fetch updated user activity
    console.log('Refreshing active user data...');
}, 30000);
