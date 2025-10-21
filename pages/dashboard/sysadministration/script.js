// User Management for System Administration Dashboard
// NO ES6 module imports - uses global CONFIG, API, Auth, Utils objects

// User Management Class
class UserManagement {
    constructor() {
        this.currentUsers = [];
        this.init();
    }

    init() {
        // Load users when DOM is ready
        document.addEventListener('DOMContentLoaded', () => {
            this.setupEventListeners();
            this.loadUsers();
        });
    }

    setupEventListeners() {
        // Create User Form
        const createUserForm = document.getElementById('createUserForm');
        if (createUserForm) {
            createUserForm.addEventListener('submit', (e) => this.handleCreateUser(e));
        }

        // Search and Filter
        const userSearch = document.getElementById('userSearch');
        if (userSearch) {
            userSearch.addEventListener('input', () => this.filterUsers());
        }

        const roleFilter = document.getElementById('roleFilter');
        if (roleFilter) {
            roleFilter.addEventListener('change', () => this.filterUsers());
        }

        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.filterUsers());
        }

        // Export button
        const exportBtn = document.getElementById('exportUsersBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportUsers());
        }
    }

    async loadUsers(filters = {}) {
        try {
            // Build query string
            const params = new URLSearchParams();
            if (filters.search) params.append('search', filters.search);
            if (filters.role) params.append('role', filters.role);
            if (filters.status) {
                // Convert status to is_active (active=1, inactive=0)
                params.append('is_active', filters.status === 'active' ? '1' : '0');
            }

            const queryString = params.toString();
            const endpoint = queryString ? `/users?${queryString}` : '/users';

            const response = await API.get(endpoint);
            
            // Backend returns: { status: 'success', data: { users: [...], pagination: {...} } }
            if (response.status === 'success' && response.data) {
                this.currentUsers = response.data.users || [];
                this.renderUsers(response.data.users || []);
            } else {
                Utils.showToast('Failed to load users', 'error');
            }
        } catch (error) {
            console.error('Error loading users:', error);
            Utils.showToast('Error loading users. Please try again.', 'error');
        }
    }

    renderUsers(users) {
        const userList = document.getElementById('userList');
        if (!userList) return;

        if (users.length === 0) {
            userList.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 20px;">No users found</p>';
            return;
        }

        userList.innerHTML = users.map(user => `
            <div class="user-item" data-role="${user.role}" data-status="${user.is_active ? 'active' : 'inactive'}">
                <div class="user-details">
                    <strong>${user.full_name}</strong>
                    <div class="user-meta">Employee ID: ${user.employee_id}</div>
                    <div class="user-meta">Email: ${user.email}</div>
                    <div class="user-meta">Role: ${user.role}</div>
                    <div class="user-meta">
                        Status: <span class="status-badge ${user.is_active ? 'status-active' : 'status-inactive'}">
                            ${user.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>
                <div class="user-actions">
                    <button class="btn btn-small btn-primary" onclick="userManagement.viewUserDetails(${user.id})">
                        👁️ View
                    </button>
                    <button class="btn btn-small btn-secondary" onclick="userManagement.editUser(${user.id})">
                        ✏️ Edit
                    </button>
                    <button class="btn btn-small btn-warning" onclick="userManagement.resetPassword(${user.id})">
                        🔑 Reset Password
                    </button>
                    ${user.is_active ? 
                        `<button class="btn btn-small btn-danger" onclick="userManagement.suspendUser(${user.id})">
                            ⛔ Suspend
                        </button>` :
                        `<button class="btn btn-small btn-success" onclick="userManagement.activateUser(${user.id})">
                            ✓ Activate
                        </button>`
                    }
                    <button class="btn btn-small btn-danger" onclick="userManagement.deleteUser(${user.id})">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    async handleCreateUser(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        
        // Clear any existing errors
        Utils.clearFormErrors(form);
        
        const userData = {
            full_name: formData.get('full_name'),
            employee_id: formData.get('employee_id'),
            email: formData.get('email'),
            phone: formData.get('phone_number'), // Form uses phone_number, backend expects phone
            role: formData.get('role'),
            password: formData.get('password'), // Temporary password
            force_password_change: true // Correct field name
        };

        try {
            const response = await API.post('/users', userData);
            
            // Backend returns: { status: 'success', message: '...', data: {...}, temporary_password: '...' }
            // OR: { status: 'error', message: '...', errors: { field: 'error message' } }
            if (response.status === 'success') {
                const tempPassword = response.temporary_password || userData.password;
                Utils.showToast(`User ${userData.full_name} created successfully! Temporary password: ${tempPassword}`, 'success');
                closeModal('createUserModal');
                form.reset();
                this.loadUsers(); // Reload user list
            } else {
                // Show validation errors if present
                if (response.errors && typeof response.errors === 'object') {
                    Utils.showFormErrors(form, response.errors);
                    Utils.showToast(response.message || 'Please fix the errors below', 'error');
                } else {
                    Utils.showToast(response.message || 'Failed to create user', 'error');
                }
            }
        } catch (error) {
            console.error('Error creating user:', error);
            Utils.showToast('Error creating user. Please try again.', 'error');
        }
    }

    async viewUserDetails(userId) {
        try {
            const response = await API.get(`/users/${userId}`);
            
            // Backend returns: { status: 'success', data: {...} }
            if (response.status === 'success' && response.data) {
                const user = response.data;
                const title = document.getElementById('detailsTitle');
                const content = document.getElementById('detailsContent');
                
                if (title && content) {
                    title.textContent = `User Details - ${user.full_name}`;
                    content.innerHTML = `
                        <div class="form-section">
                            <h5>👤 Personal Information</h5>
                            <div class="form-grid">
                                <div><strong>Full Name:</strong> ${user.full_name}</div>
                                <div><strong>Employee ID:</strong> ${user.employee_id}</div>
                                <div><strong>Email:</strong> ${user.email}</div>
                                <div><strong>Phone:</strong> ${user.phone || 'N/A'}</div>
                            </div>
                        </div>
                        <div class="form-section">
                            <h5>🏢 Work Information</h5>
                            <div class="form-grid">
                                <div><strong>Role:</strong> ${user.role}</div>
                                <div><strong>Status:</strong> <span class="status-badge ${user.is_active ? 'status-active' : 'status-inactive'}">
                                    ${user.is_active ? 'Active' : 'Inactive'}
                                </span></div>
                                <div><strong>Account Created:</strong> ${Utils.formatDate(user.created_at)}</div>
                                <div><strong>Last Updated:</strong> ${Utils.formatDate(user.updated_at)}</div>
                            </div>
                        </div>
                        <div class="form-section">
                            <h5>🔒 Security</h5>
                            <div class="form-grid">
                                <div><strong>Requires Password Change:</strong> ${user.require_password_change ? 'Yes' : 'No'}</div>
                                <div><strong>Account Status:</strong> ${user.is_active ? 'Active' : 'Suspended'}</div>
                            </div>
                        </div>
                    `;
                    
                    openModal('detailsModal');
                }
            } else {
                Utils.showToast('Failed to load user details', 'error');
            }
        } catch (error) {
            console.error('Error loading user details:', error);
            Utils.showToast('Error loading user details. Please try again.', 'error');
        }
    }

    async editUser(userId) {
        try {
            const response = await API.get(`/users/${userId}`);
            
            // Backend returns: { status: 'success', data: {...} }
            if (response.status === 'success' && response.data) {
                const user = response.data;
                
                // Create edit modal (if not exists)
                let editModal = document.getElementById('editUserModal');
                if (!editModal) {
                    editModal = this.createEditModal();
                    document.body.appendChild(editModal);
                }
                
                // Populate form with user data
                const form = document.getElementById('editUserForm');
                if (form) {
                    form.querySelector('[name="user_id"]').value = user.id;
                    form.querySelector('[name="full_name"]').value = user.full_name;
                    form.querySelector('[name="employee_id"]').value = user.employee_id;
                    form.querySelector('[name="email"]').value = user.email;
                    form.querySelector('[name="phone_number"]').value = user.phone || '';
                    form.querySelector('[name="role"]').value = user.role;
                    
                    openModal('editUserModal');
                }
            } else {
                Utils.showToast('Failed to load user for editing', 'error');
            }
        } catch (error) {
            console.error('Error loading user:', error);
            Utils.showToast('Error loading user for editing. Please try again.', 'error');
        }
    }

    createEditModal() {
        const modalHTML = `
            <div id="editUserModal" class="modal">
                <div class="modal-content">
                    <button class="close" onclick="closeModal('editUserModal')">&times;</button>
                    <h2 style="color: var(--tang-blue); margin-bottom: 20px;">✏️ Edit User</h2>
                    
                    <form id="editUserForm">
                        <input type="hidden" name="user_id" />
                        
                        <div class="form-group">
                            <label class="form-label">Full Name</label>
                            <input type="text" class="form-input" name="full_name" required />
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Employee ID</label>
                            <input type="text" class="form-input" name="employee_id" required />
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Email</label>
                            <input type="email" class="form-input" name="email" required />
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Phone Number</label>
                            <input type="tel" class="form-input" name="phone_number" />
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Role</label>
                            <select class="form-select" name="role" required>
                                <option value="Admin">Admin</option>
                                <option value="Supervisor">Supervisor</option>
                                <option value="Inventory Manager">Inventory Manager</option>
                                <option value="Machinary Operator">Machinary Operator</option>
                                <option value="Driver">Driver</option>
                            </select>
                        </div>
                        
                        <div style="text-align: right; margin-top: 20px;">
                            <button type="button" class="btn btn-secondary" onclick="closeModal('editUserModal')">
                                Cancel
                            </button>
                            <button type="submit" class="btn btn-primary">
                                💾 Update User
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        const temp = document.createElement('div');
        temp.innerHTML = modalHTML;
        const modal = temp.firstElementChild;
        
        // Add form submit handler
        const form = modal.querySelector('#editUserForm');
        form.addEventListener('submit', (e) => this.handleUpdateUser(e));
        
        return modal;
    }

    async handleUpdateUser(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const userId = formData.get('user_id');
        
        // Clear any existing errors
        Utils.clearFormErrors(form);
        
        const userData = {
            full_name: formData.get('full_name'),
            employee_id: formData.get('employee_id'),
            email: formData.get('email'),
            phone: formData.get('phone_number'), // Form uses phone_number, backend expects phone
            role: formData.get('role')
        };

        try {
            const response = await API.put(`/users/${userId}`, userData);
            
            // Backend returns: { status: 'success', message: '...', data: {...} }
            // OR: { status: 'error', message: '...', errors: { field: 'error message' } }
            if (response.status === 'success') {
                Utils.showToast('User updated successfully!', 'success');
                closeModal('editUserModal');
                this.loadUsers(); // Reload user list
            } else {
                // Show validation errors if present
                if (response.errors && typeof response.errors === 'object') {
                    Utils.showFormErrors(form, response.errors);
                    Utils.showToast(response.message || 'Please fix the errors below', 'error');
                } else {
                    Utils.showToast(response.message || 'Failed to update user', 'error');
                }
            }
        } catch (error) {
            console.error('Error updating user:', error);
            Utils.showToast('Error updating user. Please try again.', 'error');
        }
    }

    async resetPassword(userId) {
        if (!confirm('Are you sure you want to reset this user\'s password?')) {
            return;
        }

        try {
            const response = await API.post(`/users/${userId}/reset-password`);
            
            // Backend returns: { status: 'success', message: '...', data: { temporary_password: '...' } }
            if (response.status === 'success') {
                const tempPassword = response.data?.temporary_password || 'Check email';
                Utils.showToast(
                    `Password reset successfully! Temporary password: ${tempPassword}. User will be required to change password on next login.`,
                    'success'
                );
            } else {
                Utils.showToast(response.message || 'Failed to reset password', 'error');
            }
        } catch (error) {
            console.error('Error resetting password:', error);
            Utils.showToast('Error resetting password. Please try again.', 'error');
        }
    }

    async suspendUser(userId) {
        if (!confirm('Are you sure you want to suspend this user? They will not be able to log in.')) {
            return;
        }

        try {
            const response = await API.post(`/users/${userId}/deactivate`);
            
            // Backend returns: { status: 'success', message: '...' }
            if (response.status === 'success') {
                Utils.showToast('User suspended successfully!', 'warning');
                this.loadUsers(); // Reload user list
            } else {
                Utils.showToast(response.message || 'Failed to suspend user', 'error');
            }
        } catch (error) {
            console.error('Error suspending user:', error);
            Utils.showToast('Error suspending user. Please try again.', 'error');
        }
    }

    async activateUser(userId) {
        if (!confirm('Are you sure you want to activate this user?')) {
            return;
        }

        try {
            const response = await API.post(`/users/${userId}/activate`);
            
            // Backend returns: { status: 'success', message: '...' }
            if (response.status === 'success') {
                Utils.showToast('User activated successfully!', 'success');
                this.loadUsers(); // Reload user list
            } else {
                Utils.showToast(response.message || 'Failed to activate user', 'error');
            }
        } catch (error) {
            console.error('Error activating user:', error);
            Utils.showToast('Error activating user. Please try again.', 'error');
        }
    }

    async deleteUser(userId) {
        if (!confirm('WARNING: Are you sure you want to delete this user? This action cannot be undone!')) {
            return;
        }

        try {
            const response = await API.delete(`/users/${userId}`);
            
            // Backend returns: { status: 'success', message: '...' }
            if (response.status === 'success') {
                Utils.showToast('User deleted successfully!', 'error');
                this.loadUsers(); // Reload user list
            } else {
                Utils.showToast(response.message || 'Failed to delete user', 'error');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            Utils.showToast('Error deleting user. Please try again.', 'error');
        }
    }

    filterUsers() {
        const searchValue = document.getElementById('userSearch')?.value || '';
        const roleValue = document.getElementById('roleFilter')?.value || '';
        const statusValue = document.getElementById('statusFilter')?.value || '';

        const filters = {};
        if (searchValue) filters.search = searchValue;
        if (roleValue) filters.role = roleValue;
        if (statusValue) filters.status = statusValue;

        this.loadUsers(filters);
    }

    async exportUsers() {
        try {
            const response = await API.get('/users?format=csv');
            
            // Backend returns: { status: 'success', data: 'csv_content' }
            if (response.status === 'success' && response.data) {
                // Create download link
                const blob = new Blob([response.data], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                Utils.showToast('User list exported successfully!', 'success');
            } else {
                Utils.showToast(response.message || 'Failed to export users', 'error');
            }
        } catch (error) {
            console.error('Error exporting users:', error);
            Utils.showToast('Error exporting users. Please try again.', 'error');
        }
    }
}

// Initialize UserManagement when script loads
const userManagement = new UserManagement();

// ==================== TAB-BASED FILTERING ====================

// Global variable to track current role filter
let currentRoleFilter = 'all';

function filterUsersByRole(role) {
    const users = document.querySelectorAll('#userList .user-item');
    const noUsersMessage = document.getElementById('noUsersMessage');
    const userCount = document.getElementById('userCount');
    const userListDiv = document.getElementById('userList');
    const filterButtons = document.querySelectorAll('#userFilterTabs .filter-btn');
    let visibleCount = 0;

    // Update current role filter
    currentRoleFilter = role;

    // Update active button styling
    filterButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Filter users
    users.forEach(user => {
        const userRole = user.getAttribute('data-role');
        const userStatus = user.getAttribute('data-status');
        const statusFilter = document.getElementById('statusFilter')?.value || '';
        const searchValue = document.getElementById('userSearch')?.value.toLowerCase() || '';

        // Check role filter
        let roleMatch = (role === 'all' || userRole === role);

        // Check status filter
        let statusMatch = (!statusFilter || userStatus === statusFilter);

        // Check search filter
        let searchMatch = true;
        if (searchValue) {
            const userText = user.textContent.toLowerCase();
            searchMatch = userText.includes(searchValue);
        }

        // Show/hide based on all filters
        if (roleMatch && statusMatch && searchMatch) {
            user.style.display = '';
            visibleCount++;
        } else {
            user.style.display = 'none';
        }
    });

    // Show/hide no users message
    if (visibleCount === 0) {
        userListDiv.style.display = 'none';
        noUsersMessage.style.display = 'block';
    } else {
        userListDiv.style.display = 'block';
        noUsersMessage.style.display = 'none';
    }

    // Update user count
    if (userCount) {
        userCount.textContent = `${visibleCount} user${visibleCount !== 1 ? 's' : ''}`;
    }
}

// Search users (works with current tab filter)
function searchUsers() {
    applyAllFilters();
}

// Apply all filters together
function applyAllFilters() {
    const users = document.querySelectorAll('#userList .user-item');
    const noUsersMessage = document.getElementById('noUsersMessage');
    const userCount = document.getElementById('userCount');
    const userListDiv = document.getElementById('userList');
    let visibleCount = 0;

    const searchValue = document.getElementById('userSearch')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';

    users.forEach(user => {
        const userRole = user.getAttribute('data-role');
        const userStatus = user.getAttribute('data-status');

        // Check role filter (use current tab)
        let roleMatch = (currentRoleFilter === 'all' || userRole === currentRoleFilter);

        // Check status filter
        let statusMatch = (!statusFilter || userStatus === statusFilter);

        // Check search filter
        let searchMatch = true;
        if (searchValue) {
            const userText = user.textContent.toLowerCase();
            searchMatch = userText.includes(searchValue);
        }

        // Show/hide based on all filters
        if (roleMatch && statusMatch && searchMatch) {
            user.style.display = '';
            visibleCount++;
        } else {
            user.style.display = 'none';
        }
    });

    // Show/hide no users message
    if (visibleCount === 0) {
        userListDiv.style.display = 'none';
        noUsersMessage.style.display = 'block';
    } else {
        userListDiv.style.display = 'block';
        noUsersMessage.style.display = 'none';
    }

    // Update user count
    if (userCount) {
        userCount.textContent = `${visibleCount} user${visibleCount !== 1 ? 's' : ''}`;
    }
}

// Update user count after initial load
document.addEventListener('DOMContentLoaded', function() {
    // Wait for users to load, then update count
    setTimeout(() => {
        const users = document.querySelectorAll('#userList .user-item');
        const userCount = document.getElementById('userCount');
        if (userCount && users.length > 0) {
            userCount.textContent = `${users.length} user${users.length !== 1 ? 's' : ''}`;
        }
    }, 1000);
});
