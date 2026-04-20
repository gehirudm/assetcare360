// Toast notification utility
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;

    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);

    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Modal management
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

const activityLogState = {
    loaded: false,
    loading: false
};

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// Load user profile data
async function loadUserProfile() {
    try {
        const response = await API.get('/auth/profile');

        if (response.status === 'success' && response.data) {
            populateProfile(response.data);
        } else {
            throw new Error(response.message || 'Failed to load profile');
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showToast('Failed to load profile data', 'error');
        // Redirect to login if not authenticated
        setTimeout(() => {
            window.location.href = '/auth/login.html';
        }, 2000);
    }
}

// Populate profile fields with user data
function populateProfile(userData) {
    // Split full_name into first and last names
    const nameParts = (userData.full_name || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Header user info
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const headerUserRole = document.getElementById('headerUserRole');
    const headerUserEmployeeId = document.getElementById('headerUserEmployeeId');

    if (userAvatar) {
        userAvatar.textContent = firstName.charAt(0).toUpperCase();
    }
    if (userName) {
        userName.textContent = userData.full_name;
    }
    if (headerUserRole) {
        headerUserRole.textContent = userData.role || 'User';
    }
    if (headerUserEmployeeId) {
        headerUserEmployeeId.textContent = userData.employee_id || 'N/A';
    }

    const dashboardBreadcrumb = document.getElementById('profileDashboardBreadcrumb');
    if (dashboardBreadcrumb) {
        dashboardBreadcrumb.href = getDashboardPathForUser(userData);
    }

    // Profile summary card
    const profileAvatarLarge = document.getElementById('profileAvatarLarge');
    const profileName = document.getElementById('profileFullName');
    const profileRole = document.getElementById('profileRole');
    const profileEmployeeId = document.getElementById('profileEmployeeId');
    const accountStatus = document.getElementById('profileStatus');

    if (profileAvatarLarge) {
        profileAvatarLarge.textContent = firstName.charAt(0).toUpperCase();
    }
    if (profileName) {
        profileName.textContent = userData.full_name;
    }
    if (profileRole) {
        profileRole.textContent = userData.role;
    }
    if (profileEmployeeId) {
        profileEmployeeId.textContent = `Employee ID: ${userData.employee_id}`;
    }
    if (accountStatus) {
        const status = userData.is_active ? 'Active' : 'Inactive';
        accountStatus.textContent = status;
        accountStatus.className = `status-badge status-${status.toLowerCase()}`;
    }

    // Personal Information
    const fullNameDisplay = document.getElementById('detailFullName');
    const employeeIdDisplay = document.getElementById('detailEmployeeId');
    const emailDisplay = document.getElementById('detailEmail');
    const phoneDisplay = document.getElementById('detailPhone');
    const roleDisplay = document.getElementById('detailRole');
    const createdAtDisplay = document.getElementById('detailCreatedAt');

    if (fullNameDisplay) fullNameDisplay.textContent = userData.full_name || 'N/A';
    if (employeeIdDisplay) employeeIdDisplay.textContent = userData.employee_id || 'N/A';
    if (emailDisplay) emailDisplay.textContent = userData.email || 'N/A';
    if (phoneDisplay) phoneDisplay.textContent = userData.phone || 'N/A';
    if (roleDisplay) roleDisplay.textContent = userData.role || 'N/A';
    if (createdAtDisplay && userData.created_at) {
        createdAtDisplay.textContent = Utils.formatDate(userData.created_at);
    }

    // Security Information
    const lastLoginTime = document.getElementById('lastLoginTime');
    if (lastLoginTime && userData.last_login) {
        lastLoginTime.textContent = Utils.formatDateTime(userData.last_login);
    }

    // Force password change alert
    if (userData.force_password_change) {
        const alert = document.getElementById('forcePasswordChangeAlert');
        if (alert) {
            alert.style.display = 'flex';
        }
    }

    // Store user data for editing
    window.currentUserData = userData;
}

// Open edit profile modal with current data
function openEditProfileModal() {
    const userData = window.currentUserData;
    if (!userData) {
        showToast('User data not loaded', 'error');
        return;
    }

    // Populate form fields
    document.getElementById('editFullName').value = userData.full_name || '';
    document.getElementById('editEmail').value = userData.email || '';
    document.getElementById('editPhone').value = userData.phone || '';

    openModal('editProfileModal');
}

// Save profile changes
async function saveProfileChanges() {
    const fullName = document.getElementById('editFullName').value.trim();
    const phone = document.getElementById('editPhone').value.trim();

    // Validation
    if (!fullName) {
        showToast('Full name is required', 'warning');
        return;
    }

    try {
        const response = await API.put('/auth/profile', {
            full_name: fullName,
            phone: phone
        });

        if (response.status === 'success') {
            showToast('Profile updated successfully', 'success');
            closeModal('editProfileModal');
            // Reload profile data
            await loadUserProfile();
        } else {
            throw new Error(response.message || 'Failed to update profile');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showToast(error.message || 'Failed to update profile', 'error');
    }
}

// Open change password modal
function openChangePasswordModal() {
    // Clear form fields
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';

    openModal('changePasswordModal');
}

// Change password
async function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
        showToast('All password fields are required', 'warning');
        return;
    }

    if (newPassword !== confirmPassword) {
        showToast('New passwords do not match', 'warning');
        return;
    }

    if (newPassword.length < 8) {
        showToast('New password must be at least 8 characters long', 'warning');
        return;
    }

    try {
        const response = await API.post('/auth/change-password', {
            current_password: currentPassword,
            new_password: newPassword,
            confirm_password: confirmPassword
        });

        if (response.status === 'success') {
            showToast('Password changed successfully', 'success');
            closeModal('changePasswordModal');
            // Clear form
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            throw new Error(response.message || 'Failed to change password');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        showToast(error.message || 'Failed to change password', 'error');
    }
}

// Logout functionality
function logout() {
    Auth.logout();
}

function getDashboardPathForUser(userData) {
    if (!userData || !userData.role) {
        return '/auth/login.html';
    }

    const roleKey = String(userData.role).toUpperCase().replace(/ /g, '_');
    return CONFIG.ROUTES.DASHBOARD[roleKey] || '/auth/login.html';
}

// Go back to dashboard based on user role
function goBackToDashboard() {
    const userData = window.currentUserData;
    window.location.href = getDashboardPathForUser(userData);
}

// =========================================
// Passkey Management Functions
// =========================================

// Check if browser supports passkeys
function checkPasskeySupport() {
    const isSupported = Passkey.isSupported();
    const notSupportedEl = document.getElementById('passkeyNotSupported');
    const addBtn = document.getElementById('addPasskeyBtn');
    const descriptionEl = document.getElementById('passkeyDescription');

    if (!isSupported) {
        if (notSupportedEl) notSupportedEl.style.display = 'flex';
        if (addBtn) addBtn.style.display = 'none';
        if (descriptionEl) descriptionEl.style.display = 'none';
        return false;
    }
    return true;
}

// Load user's passkeys
async function loadPasskeys() {
    const passkeyList = document.getElementById('passkeyList');
    const noPasskeys = document.getElementById('noPasskeys');

    if (!Passkey.isSupported()) {
        if (passkeyList) passkeyList.innerHTML = '';
        return;
    }

    try {
        const response = await API.get('/auth/passkey');

        if (response.status === 'success') {
            const passkeys = response.data || [];

            if (passkeys.length === 0) {
                if (passkeyList) passkeyList.innerHTML = '';
                if (noPasskeys) noPasskeys.style.display = 'block';
            } else {
                if (noPasskeys) noPasskeys.style.display = 'none';
                renderPasskeyList(passkeys);
            }
        } else {
            throw new Error(response.message || 'Failed to load passkeys');
        }
    } catch (error) {
        console.error('Error loading passkeys:', error);
        if (passkeyList) {
            passkeyList.innerHTML = '<p class="error-message">Failed to load passkeys</p>';
        }
    }
}

// Render passkey list
function renderPasskeyList(passkeys) {
    const passkeyList = document.getElementById('passkeyList');
    if (!passkeyList) return;

    passkeyList.innerHTML = passkeys.map(passkey => `
        <div class="passkey-item" data-id="${passkey.id}">
            <div class="passkey-icon">
                <i class="fas fa-fingerprint"></i>
            </div>
            <div class="passkey-info">
                <h4>${escapeHtml(passkey.name)}</h4>
                <p>Created: ${Utils.formatDate(passkey.created_at)}${passkey.last_used_at ? ' • Last used: ' + Utils.formatDate(passkey.last_used_at) : ''}</p>
            </div>
            <button class="btn btn-icon btn-danger" onclick="deletePasskey(${passkey.id}, '${escapeHtml(passkey.name)}')" title="Delete passkey">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

// Helper to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderActivityLogLoading() {
    const activityLogContainer = document.getElementById('activityLogContainer');
    if (!activityLogContainer) return;

    activityLogContainer.innerHTML = `
        <div class="loading-message">
            <i class="fas fa-spinner fa-spin"></i> Loading login activity...
        </div>
    `;
}

function renderActivityLogError(message) {
    const activityLogContainer = document.getElementById('activityLogContainer');
    if (!activityLogContainer) return;

    activityLogContainer.innerHTML = `
        <div class="activity-log-empty">
            <i class="fas fa-exclamation-circle"></i>
            <p>${escapeHtml(message || 'Failed to load login activity')}</p>
        </div>
    `;
}

function getLoginMethodLabel(activity) {
    const loginMethod = (activity.login_method || '').toLowerCase();
    if (loginMethod === 'passkey') {
        return 'Passkey';
    }

    return 'Password';
}

function summarizeUserAgent(userAgent) {
    if (!userAgent) {
        return 'Unknown device';
    }

    let browser = 'Browser';
    if (userAgent.includes('Edg/')) {
        browser = 'Edge';
    } else if (userAgent.includes('Chrome/')) {
        browser = 'Chrome';
    } else if (userAgent.includes('Firefox/')) {
        browser = 'Firefox';
    } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) {
        browser = 'Safari';
    }

    let os = 'Device';
    if (userAgent.includes('Windows')) {
        os = 'Windows';
    } else if (userAgent.includes('Mac OS X') || userAgent.includes('Macintosh')) {
        os = 'macOS';
    } else if (userAgent.includes('Android')) {
        os = 'Android';
    } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
        os = 'iOS';
    } else if (userAgent.includes('Linux')) {
        os = 'Linux';
    }

    return `${browser} on ${os}`;
}

function formatRelativeTime(dateString) {
    if (!dateString) {
        return 'Unknown time';
    }

    const date = new Date(dateString);
    const diffMs = Date.now() - date.getTime();

    if (Number.isNaN(diffMs) || diffMs < 0) {
        return 'Just now';
    }

    const minutes = Math.floor(diffMs / (1000 * 60));
    if (minutes < 1) {
        return 'Just now';
    }

    if (minutes < 60) {
        return `${minutes} min ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours} hr ago`;
    }

    const days = Math.floor(hours / 24);
    if (days < 30) {
        return `${days} day${days === 1 ? '' : 's'} ago`;
    }

    return Utils.formatDate(dateString);
}

function renderActivityLogItems(activities) {
    const activityLogContainer = document.getElementById('activityLogContainer');
    if (!activityLogContainer) return;

    if (!activities || activities.length === 0) {
        activityLogContainer.innerHTML = `
            <div class="activity-log-empty">
                <i class="fas fa-sign-in-alt"></i>
                <p>No login activity found yet.</p>
            </div>
        `;
        return;
    }

    const items = activities.map((activity) => {
        const methodLabel = getLoginMethodLabel(activity);
        const loginLabel = `${methodLabel} login successful`;
        const timestamp = Utils.formatDateTime(activity.created_at);
        const relativeTime = formatRelativeTime(activity.created_at);
        const ipAddress = activity.ip_address || 'Unknown IP';
        const device = summarizeUserAgent(activity.user_agent);

        return `
            <article class="activity-log-item">
                <div class="activity-log-icon">
                    <i class="fas fa-sign-in-alt"></i>
                </div>
                <div class="activity-log-content">
                    <div class="activity-log-top-row">
                        <h4>${escapeHtml(loginLabel)}</h4>
                        <span class="activity-log-time">${escapeHtml(relativeTime)}</span>
                    </div>
                    <div class="activity-log-meta">
                        <span><i class="far fa-clock"></i> ${escapeHtml(timestamp)}</span>
                        <span><i class="fas fa-network-wired"></i> ${escapeHtml(ipAddress)}</span>
                        <span><i class="fas fa-laptop"></i> ${escapeHtml(device)}</span>
                    </div>
                </div>
            </article>
        `;
    }).join('');

    activityLogContainer.innerHTML = `<div class="activity-log-list">${items}</div>`;
}

async function loadLoginActivities(force = false) {
    if (activityLogState.loading) {
        return;
    }

    if (activityLogState.loaded && !force) {
        return;
    }

    activityLogState.loading = true;
    renderActivityLogLoading();

    try {
        const response = await API.get('/auth/login-activities?limit=20');

        if (response.status !== 'success') {
            throw new Error(response.message || 'Failed to load login activity');
        }

        const activities = response.data && Array.isArray(response.data.activities)
            ? response.data.activities
            : [];

        renderActivityLogItems(activities);
        activityLogState.loaded = true;
    } catch (error) {
        console.error('Error loading login activity:', error);
        renderActivityLogError(error.message || 'Failed to load login activity');
    } finally {
        activityLogState.loading = false;
    }
}

function refreshActivityLog() {
    activityLogState.loaded = false;
    loadLoginActivities(true);
}

// Register a new passkey
async function registerPasskey() {
    if (!Passkey.isSupported()) {
        showToast('Passkeys are not supported in this browser', 'error');
        return;
    }

    const addBtn = document.getElementById('addPasskeyBtn');
    if (addBtn) {
        addBtn.disabled = true;
        addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
    }

    try {
        // Get registration options from server
        const optionsResponse = await API.get('/auth/passkey/register-options');

        if (optionsResponse.status !== 'success') {
            throw new Error(optionsResponse.message || 'Failed to get registration options');
        }

        // Create credential using WebAuthn
        const credential = await Passkey.register(optionsResponse.data);

        // Get passkey name from user
        const passkeyName = prompt('Enter a name for this passkey:', 'My Passkey') || 'My Passkey';

        // Send credential to server
        const registerResponse = await API.post('/auth/passkey/register', {
            response: credential,
            name: passkeyName
        });

        if (registerResponse.status === 'success') {
            showToast('Passkey registered successfully!', 'success');
            await loadPasskeys();
        } else {
            throw new Error(registerResponse.message || 'Failed to register passkey');
        }

    } catch (error) {
        console.error('Passkey registration error:', error);
        showToast(Passkey.getErrorMessage(error), 'error');
    } finally {
        if (addBtn) {
            addBtn.disabled = false;
            addBtn.innerHTML = '<i class="fas fa-plus"></i> Add Passkey';
        }
    }
}

// Delete a passkey
async function deletePasskey(id, name) {
    if (!confirm(`Are you sure you want to delete the passkey "${name}"? You won't be able to sign in with it anymore.`)) {
        return;
    }

    try {
        const response = await API.delete(`/auth/passkey/${id}`);

        if (response.status === 'success') {
            showToast('Passkey deleted successfully', 'success');
            await loadPasskeys();
        } else {
            throw new Error(response.message || 'Failed to delete passkey');
        }
    } catch (error) {
        console.error('Error deleting passkey:', error);
        showToast(error.message || 'Failed to delete passkey', 'error');
    }
}

// Initialize page on load
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication first
    const user = await Auth.checkAuth();

    if (!user) {
        window.location.href = '/auth/login.html';
        return;
    }

    // Load full profile data
    await loadUserProfile();

    // Check passkey support and load passkeys
    checkPasskeySupport();
    loadPasskeys();

    // Add form submit handlers
    const editProfileForm = document.getElementById('editProfileForm');
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveProfileChanges();
        });
    }

    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            changePassword();
        });
    }

    // Add tab switching
    const tabs = document.querySelectorAll('.profile-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            const tabName = this.getAttribute('data-tab');

            // Remove active class from all tabs and contents
            document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            // Add active class to selected tab and content
            this.classList.add('active');
            document.getElementById(tabName).classList.add('active');

            if (tabName === 'activity') {
                loadLoginActivities();
            }
        });
    });
});

