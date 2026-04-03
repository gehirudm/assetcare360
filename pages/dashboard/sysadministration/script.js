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
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupEventListeners();
                this.loadUsers();
            });
        } else {
            // DOM already loaded
            this.setupEventListeners();
            this.loadUsers();
        }
    }

    setupEventListeners() {
        // Create User Form
        const createUserForm = document.getElementById('createUserForm');
        if (createUserForm) {
            createUserForm.addEventListener('submit', (e) => this.handleCreateUser(e));

            const roleSelect = createUserForm.querySelector('[name="role"]');
            if (roleSelect) {
                roleSelect.addEventListener('change', (e) => this.handleRoleChangeForCreateForm(e.target.value));
            }

            createUserForm.addEventListener('reset', () => {
                const employeeIdInput = createUserForm.querySelector('[name="employee_id"]');
                if (employeeIdInput) {
                    employeeIdInput.value = '';
                    employeeIdInput.placeholder = 'Select role to generate employee ID';
                }
            });
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
        const userCount = document.getElementById('userCount');
        
        if (!userList) return;

        if (users.length === 0) {
            userList.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 20px;">No users found</p>';
            if (userCount) userCount.textContent = '0 users';
            return;
        }

        // Update user count
        if (userCount) {
            userCount.textContent = `${users.length} user${users.length !== 1 ? 's' : ''}`;
        }

        userList.innerHTML = users.map(user => `
            <div class="user-item inventory-item" data-role="${user.role}" data-status="${user.is_active ? 'active' : 'inactive'}">
                <div class="item-details">
                    <strong><i class="fas fa-user"></i> ${user.full_name}</strong>
                    <div class="item-meta">
                        <i class="fas fa-id-badge"></i> ${user.employee_id} | 
                        <i class="fas fa-user-tag"></i> ${user.role}
                    </div>
                    <div class="item-description">
                        <span class="status-text ${user.is_active ? 'status-active' : 'status-inactive'}">${user.is_active ? 'Active' : 'Inactive'}</span> | 
                        <i class="fas fa-envelope"></i> ${user.email}
                    </div>
                </div>
                <div class="item-actions">
                    <div class="action-buttons">
                        <button class="btn btn-small btn-primary" onclick="userManagement.viewUserDetails(${user.id})">
                            <i class="fas fa-eye"></i> VIEW
                        </button>
                        <div class="dropdown-container">
                            <button class="btn btn-small btn-secondary dropdown-trigger" onclick="toggleUserDropdown(event, 'user-${user.id}')">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div class="dropdown-menu" id="dropdown-user-${user.id}">
                                <button class="dropdown-item" onclick="userManagement.editUser(${user.id}); closeDropdown('user-${user.id}')">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                                <button class="dropdown-item" onclick="userManagement.resetPassword(${user.id}); closeDropdown('user-${user.id}')">
                                    <i class="fas fa-key"></i> Reset Password
                                </button>
                                ${user.is_active ? 
                                    `<button class="dropdown-item" onclick="userManagement.suspendUser(${user.id}); closeDropdown('user-${user.id}')">
                                        <i class="fas fa-ban"></i> Suspend
                                    </button>` :
                                    `<button class="dropdown-item" onclick="userManagement.activateUser(${user.id}); closeDropdown('user-${user.id}')">
                                        <i class="fas fa-check-circle"></i> Activate
                                    </button>`
                                }
                                <button class="dropdown-item danger" onclick="userManagement.deleteUser(${user.id}); closeDropdown('user-${user.id}')">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    </div>
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

        if (!userData.role) {
            Utils.showToast('Please select a role first', 'error');
            return;
        }

        if (!userData.employee_id) {
            Utils.showToast('Employee ID could not be generated. Please re-select the role.', 'error');
            return;
        }

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

    async handleRoleChangeForCreateForm(role) {
        const createUserForm = document.getElementById('createUserForm');
        if (!createUserForm) {
            return;
        }

        const employeeIdInput = createUserForm.querySelector('[name="employee_id"]');
        if (!employeeIdInput) {
            return;
        }

        if (!role) {
            employeeIdInput.value = '';
            employeeIdInput.placeholder = 'Select role to generate employee ID';
            return;
        }

        employeeIdInput.value = '';
        employeeIdInput.placeholder = 'Generating employee ID...';

        try {
            const response = await API.get(`/users/next-employee-id?role=${encodeURIComponent(role)}`);

            if (response.status === 'success' && response.data && response.data.next_employee_id) {
                employeeIdInput.value = response.data.next_employee_id;
                employeeIdInput.placeholder = 'Employee ID generated';
            } else {
                employeeIdInput.value = '';
                employeeIdInput.placeholder = 'Could not generate employee ID';
                Utils.showToast(response.message || 'Failed to generate employee ID', 'error');
            }
        } catch (error) {
            console.error('Error generating employee ID:', error);
            employeeIdInput.value = '';
            employeeIdInput.placeholder = 'Could not generate employee ID';
            Utils.showToast('Error generating employee ID. Please try again.', 'error');
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
                            <h5>Personal Information</h5>
                            <div class="form-grid">
                                <div><strong>Full Name:</strong> ${user.full_name}</div>
                                <div><strong>Employee ID:</strong> ${user.employee_id}</div>
                                <div><strong>Email:</strong> ${user.email}</div>
                                <div><strong>Phone:</strong> ${user.phone || 'N/A'}</div>
                            </div>
                        </div>
                        <div class="form-section">
                            <h5>Work Information</h5>
                            <div class="form-grid">
                                <div><strong>Role:</strong> ${user.role}</div>
                                <div><strong>Status:</strong> <span class="status-text ${user.is_active ? 'status-active' : 'status-inactive'}">
                                    ${user.is_active ? 'Active' : 'Inactive'}
                                </span></div>
                                <div><strong>Account Created:</strong> ${Utils.formatDate(user.created_at)}</div>
                                <div><strong>Last Updated:</strong> ${Utils.formatDate(user.updated_at)}</div>
                            </div>
                        </div>
                        <div class="form-section">
                            <h5>Security</h5>
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
                    <div class="modal-header">
                        <h2><i class="fas fa-user-edit"></i> Edit User</h2>
                        <button class="btn-close" onclick="closeModal('editUserModal')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
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
                                <option value="Maintenance Manager">Maintenance Manager</option>
                                <option value="Inventory Manager">Inventory Manager</option>
                                <option value="Transportation Manager">Transportation Manager</option>
                                <option value="Technical Officer">Technical Officer</option>
                                <option value="Machinary Operator">Machinary Operator</option>
                                <option value="Driver">Driver</option>
                                <option value="Auction Officer">Auction Officer</option>
                            </select>
                        </div>
                        
                        <div style="text-align: right; margin-top: 20px;">
                            <button type="button" class="btn btn-secondary" onclick="closeModal('editUserModal')">
                                Cancel
                            </button>
                            <button type="submit" class="btn btn-primary">
                                Update User
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
        // Show custom confirmation modal
        const confirmMessage = document.getElementById('deleteConfirmMessage');
        const confirmButton = document.getElementById('deleteConfirmButton');
        
        if (confirmMessage && confirmButton) {
            confirmMessage.innerHTML = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: var(--danger);"></i>
                </div>
                <strong style="color: var(--danger); font-size: 18px; display: block; margin-bottom: 15px;">Warning: This action cannot be undone!</strong>
                Are you sure you want to delete this user?<br>
                This will permanently remove the user account and all associated data.
            `;
            
            // Remove any existing event listeners and add new one
            const newConfirmButton = confirmButton.cloneNode(true);
            confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);
            
            newConfirmButton.onclick = async () => {
                closeModal('deleteConfirmModal');
                await this.performDeleteUser(userId);
            };
            
            openModal('deleteConfirmModal');
        }
    }

    async performDeleteUser(userId) {
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
}

// Initialize UserManagement when script loads
const userManagement = new UserManagement();

// ==================== USER MENU DROPDOWN FUNCTIONS ====================

function toggleUserMenu(userId, event) {
    event.stopPropagation();
    const menu = document.getElementById(`user-menu-${userId}`);
    const button = document.getElementById(`user-menu-btn-${userId}`);
    const userItem = button ? button.closest('.user-item') : null;
    
    // Close all other menus and remove active class from all items
    document.querySelectorAll('.dropdown-menu').forEach(m => {
        if (m.id !== `user-menu-${userId}`) {
            m.style.display = 'none';
            // Remove active class from parent user-item
            const parentItem = m.closest('.user-item');
            if (parentItem) {
                parentItem.classList.remove('dropdown-active');
            }
        }
    });
    
    // Toggle current menu
    const isVisible = menu.style.display === 'block';
    menu.style.display = isVisible ? 'none' : 'block';
    
    // Toggle active class on parent user-item
    if (userItem) {
        if (isVisible) {
            userItem.classList.remove('dropdown-active');
        } else {
            userItem.classList.add('dropdown-active');
        }
    }
}

function closeUserMenu(userId) {
    const menu = document.getElementById(`user-menu-${userId}`);
    if (menu) {
        menu.style.display = 'none';
        // Remove active class from parent user-item
        const userItem = menu.closest('.user-item');
        if (userItem) {
            userItem.classList.remove('dropdown-active');
        }
    }
}

// Close dropdowns when clicking outside
document.addEventListener('click', function() {
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.style.display = 'none';
        // Remove active class from parent items
        const userItem = menu.closest('.user-item, .inventory-item');
        if (userItem) {
            userItem.classList.remove('dropdown-active');
        }
    });
});

// New dropdown functions for inventory-item structure
function toggleUserDropdown(event, dropdownId) {
    event.stopPropagation();
    const fullId = `dropdown-${dropdownId}`;
    const menu = document.getElementById(fullId);
    
    // Close all other dropdowns
    document.querySelectorAll('.dropdown-menu').forEach(m => {
        if (m.id !== fullId) {
            m.style.display = 'none';
        }
    });
    
    // Toggle current dropdown
    if (menu) {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }
}

function closeDropdown(dropdownId) {
    const menu = document.getElementById(`dropdown-${dropdownId}`);
    if (menu) {
        menu.style.display = 'none';
    }
}

// ==================== TAB-BASED FILTERING ====================

// Global variable to track current role filter
let currentRoleFilter = 'all';

function filterUsersByRole(role, evt) {
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
    const clickEvent = evt || window.event;
    if (clickEvent && clickEvent.target) {
        clickEvent.target.classList.add('active');
    }

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

// ==================== SYSTEM LOGS FILTERING ====================

let currentLogTypeFilter = 'all';
let systemLogsData = [];

function initializeSystemLogs() {
    const activeSection = document.querySelector('.content-section.active');
    if (activeSection && activeSection.id === 'system-logs') {
        loadSystemLogs();
    }

    const systemLogsNav = document.querySelector('.nav-item[data-section="system-logs"]');
    if (systemLogsNav) {
        systemLogsNav.addEventListener('click', () => {
            loadSystemLogs();
        });
    }
}

async function loadSystemLogs() {
    const activeSection = document.querySelector('.content-section.active');
    const isSystemLogsActive = activeSection && activeSection.id === 'system-logs';

    const logsListDiv = document.getElementById('logsList');
    if (logsListDiv && isSystemLogsActive) {
        logsListDiv.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Loading system logs...</p>';
    }

    const period = document.getElementById('logDateFilter')?.value || 'today';

    try {
        const response = await API.get(`/logs?period=${encodeURIComponent(period)}&limit=200`);

        if (response.status === 'success' && response.data && Array.isArray(response.data.logs)) {
            systemLogsData = response.data.logs;
            renderSystemLogs();
        } else {
            systemLogsData = [];
            renderSystemLogs();
            if (isSystemLogsActive) {
                Utils.showToast(response.message || 'Failed to load system logs', 'error');
            }
        }
    } catch (error) {
        console.error('Error loading system logs:', error);
        systemLogsData = [];
        renderSystemLogs();
        if (isSystemLogsActive) {
            Utils.showToast('Error loading system logs. Please try again.', 'error');
        }
    }
}

function inferLogType(log) {
    const action = String(log.action || '').toLowerCase();
    const category = String(log.category || '').toLowerCase();
    const responseCode = Number(log.response_code || 0);

    if (responseCode >= 400) {
        return 'error';
    }
    if (action.includes('login') || category.includes('authentication')) {
        return 'login';
    }
    if (action.includes('permission') || action.includes('role')) {
        return 'permission';
    }
    if (category.includes('user management') || action.includes('user')) {
        return 'user';
    }
    if (category.includes('system administration') || category.includes('system configuration') || action.includes('config') || action.includes('configuration')) {
        return 'config';
    }

    return 'all';
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatLogTimestamp(value) {
    if (!value) {
        return 'N/A';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function renderSystemLogs() {
    const logsListDiv = document.getElementById('logsList');
    const noLogsMessage = document.getElementById('noLogsMessage');
    const logCount = document.getElementById('logCount');
    const searchValue = (document.getElementById('logSearch')?.value || '').toLowerCase();

    if (!logsListDiv || !noLogsMessage || !logCount) {
        return;
    }

    const visibleLogs = systemLogsData.filter((log) => {
        const logType = inferLogType(log);
        const matchesType = currentLogTypeFilter === 'all' || logType === currentLogTypeFilter;

        const searchableText = `${log.action || ''} ${log.category || ''} ${log.endpoint || ''} ${log.employee_id || ''} ${log.user_name || ''}`.toLowerCase();
        const matchesSearch = !searchValue || searchableText.includes(searchValue);

        return matchesType && matchesSearch;
    });

    if (!visibleLogs.length) {
        logsListDiv.style.display = 'none';
        noLogsMessage.style.display = 'block';
        logCount.textContent = '0 logs';
        return;
    }

    logsListDiv.style.display = 'block';
    noLogsMessage.style.display = 'none';

    logsListDiv.innerHTML = visibleLogs.map((log) => {
        const type = inferLogType(log);
        const responseCode = Number(log.response_code || 0);
        const severityClass = responseCode >= 500 ? 'error' : (responseCode >= 400 ? 'warning' : '');
        const isLoginEvent = type === 'login' || String(log.endpoint || '').includes('/auth/login');
        const loginStatus = responseCode >= 400 ? 'Failed' : 'Success';
        const userLabel = log.user_name
            ? `${escapeHtml(log.user_name)}${log.employee_id ? ` (${escapeHtml(log.employee_id)})` : ''}`
            : (log.employee_id ? escapeHtml(log.employee_id) : 'System');

        let requestBodyEmployeeId = '';
        if (log.request_body) {
            try {
                const body = JSON.parse(log.request_body);
                requestBodyEmployeeId = body.employee_id || '';
            } catch (e) {
                requestBodyEmployeeId = '';
            }
        }

        const loginActor = userLabel !== 'System' ? userLabel : (requestBodyEmployeeId ? escapeHtml(requestBodyEmployeeId) : 'Unknown User');

        return `
            <div class="log-entry ${severityClass}" data-type="${escapeHtml(type)}" data-module="${escapeHtml(log.category || 'General')}">
                <div class="log-timestamp">${escapeHtml(formatLogTimestamp(log.created_at))}</div>
                <div><strong>Event:</strong> ${escapeHtml(log.action || 'API Request')}</div>
                <div><strong>User:</strong> ${isLoginEvent ? loginActor : userLabel}</div>
                ${isLoginEvent ? `<div><strong>Login Status:</strong> ${escapeHtml(loginStatus)}</div>` : ''}
                <div><strong>Details:</strong> ${escapeHtml((log.method || 'GET') + ' ' + (log.endpoint || 'N/A') + (log.response_code ? ` [${log.response_code}]` : ''))}</div>
                <div><strong>IP Address:</strong> ${escapeHtml(log.ip_address || 'N/A')}</div>
                <div><strong>Response Code:</strong> ${escapeHtml(log.response_code || 'N/A')}</div>
                <div><strong>Module:</strong> ${escapeHtml(log.category || 'General')}</div>
            </div>
        `;
    }).join('');

    logCount.textContent = `${visibleLogs.length} log${visibleLogs.length !== 1 ? 's' : ''}`;
}

function filterLogsByType(type) {
    currentLogTypeFilter = type;

    const filterButtons = document.querySelectorAll('#logFilterTabs .filter-btn');
    filterButtons.forEach(btn => {
        btn.classList.remove('active');
    });

    filterButtons.forEach(btn => {
        if ((btn.getAttribute('onclick') || '').includes(`filterLogsByType('${type}')`)) {
            btn.classList.add('active');
        }
    });

    renderSystemLogs();
}

// Search logs (works with current tab filter)
function searchLogs() {
    renderSystemLogs();
}

// Apply all log filters together
function applyLogFilters() {
    loadSystemLogs();
}

document.addEventListener('DOMContentLoaded', function() {
    initializeSystemLogs();
});

// ==================== ACTIVITY TRACKING FILTERING ====================

let currentActivityRoleFilter = 'all';
let activityUsersData = [];
let activityLogsByEmployee = {};

function initializeActivityTracking() {
    const activityNav = document.querySelector('.nav-item[data-section="activity-tracking"]');
    if (activityNav) {
        activityNav.addEventListener('click', () => {
            loadUserActivityTracking();
        });
    }

    const searchInput = document.getElementById('activityUserSearch');
    if (searchInput) {
        searchInput.addEventListener('input', () => renderActivityTracking());
    }

    const dateFilter = document.getElementById('activityDateFilter');
    if (dateFilter) {
        dateFilter.addEventListener('change', () => loadUserActivityTracking());
    }
}

async function loadUserActivityTracking() {
    const period = document.getElementById('activityDateFilter')?.value || 'today';

    try {
        const [usersRes, logsRes] = await Promise.all([
            API.get('/users?limit=200'),
            API.get(`/logs?period=${encodeURIComponent(period)}&limit=1000`)
        ]);

        const users = (usersRes.status === 'success' && usersRes.data && Array.isArray(usersRes.data.users)) ? usersRes.data.users : [];
        const logs = (logsRes.status === 'success' && logsRes.data && Array.isArray(logsRes.data.logs)) ? logsRes.data.logs : [];

        const usersByEmployeeId = {};
        users.forEach((u) => {
            if (u.employee_id) {
                usersByEmployeeId[u.employee_id] = u;
            }
        });

        activityLogsByEmployee = {};
        logs.forEach((log) => {
            const employeeId = log.employee_id || 'UNKNOWN';
            if (!activityLogsByEmployee[employeeId]) {
                activityLogsByEmployee[employeeId] = [];
            }
            activityLogsByEmployee[employeeId].push(log);
        });

        activityUsersData = Object.entries(activityLogsByEmployee).map(([employeeId, userLogs]) => {
            userLogs.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

            const latest = userLogs[0] || {};
            const linkedUser = usersByEmployeeId[employeeId] || {};
            const role = latest.user_role || linkedUser.role || 'Unknown';
            const fullName = latest.user_name || linkedUser.full_name || 'Unknown User';

            const loginAttempts = userLogs.filter((l) => String(l.endpoint || '').includes('/auth/login'));
            const successfulLogins = loginAttempts.filter((l) => Number(l.response_code || 0) < 400).length;
            const failedLogins = loginAttempts.filter((l) => Number(l.response_code || 0) >= 400).length;

            return {
                employee_id: employeeId,
                full_name: fullName,
                role,
                request_count: userLogs.length,
                successful_logins: successfulLogins,
                failed_logins: failedLogins,
                last_activity_at: latest.created_at || null,
                last_ip: latest.ip_address || 'N/A',
                last_action: latest.action || 'N/A',
                logs: userLogs
            };
        }).sort((a, b) => new Date(b.last_activity_at || 0).getTime() - new Date(a.last_activity_at || 0).getTime());

        renderActivityTracking();
    } catch (error) {
        console.error('Failed to load activity tracking:', error);
        activityUsersData = [];
        activityLogsByEmployee = {};
        renderActivityTracking();
        Utils.showToast('Failed to load user activity data', 'error');
    }
}

function isUserActive(lastActivityAt) {
    if (!lastActivityAt) {
        return false;
    }
    const last = new Date(lastActivityAt).getTime();
    if (Number.isNaN(last)) {
        return false;
    }
    return (Date.now() - last) <= (30 * 60 * 1000);
}

function formatRelativeDuration(lastActivityAt) {
    if (!lastActivityAt) {
        return 'N/A';
    }
    const diffMs = Date.now() - new Date(lastActivityAt).getTime();
    if (diffMs < 0 || Number.isNaN(diffMs)) {
        return formatLogTimestamp(lastActivityAt);
    }

    const mins = Math.floor(diffMs / (1000 * 60));
    if (mins < 60) {
        return `${mins}m ago`;
    }
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}h ${remMins}m ago`;
}

function filterActiveUsersByRole(role, evt) {
    const filterButtons = document.querySelectorAll('#activityFilterTabs .filter-btn');
    currentActivityRoleFilter = role;

    filterButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    const clickEvent = evt || window.event;
    if (clickEvent && clickEvent.target) {
        clickEvent.target.classList.add('active');
    }

    renderActivityTracking();
}

function getFilteredActivityUsers() {
    const searchValue = (document.getElementById('activityUserSearch')?.value || '').toLowerCase();

    return activityUsersData.filter((user) => {
        const roleMatch = currentActivityRoleFilter === 'all' || user.role === currentActivityRoleFilter;
        const searchSpace = `${user.full_name} ${user.employee_id} ${user.role}`.toLowerCase();
        const searchMatch = !searchValue || searchSpace.includes(searchValue);
        return roleMatch && searchMatch;
    });
}

function renderActivityTracking() {
    const activeUsersList = document.getElementById('activeUsersList');
    const activeUserCount = document.getElementById('activeUserCount');
    const detailsList = document.getElementById('activityDetailsList');
    const inactivityList = document.getElementById('inactivityReportList');
    const uniqueLoginsEl = document.getElementById('activityUniqueLogins');
    const totalActionsEl = document.getElementById('activityTotalActions');
    const failedLoginsEl = document.getElementById('activityFailedLogins');

    const filteredUsers = getFilteredActivityUsers();

    if (uniqueLoginsEl) {
        uniqueLoginsEl.textContent = String(activityUsersData.filter((u) => u.successful_logins > 0).length);
    }
    if (totalActionsEl) {
        totalActionsEl.textContent = String(activityUsersData.reduce((sum, u) => sum + (u.request_count || 0), 0));
    }
    if (failedLoginsEl) {
        failedLoginsEl.textContent = String(activityUsersData.reduce((sum, u) => sum + (u.failed_logins || 0), 0));
    }

    if (activeUsersList) {
        if (!filteredUsers.length) {
            activeUsersList.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--muted); padding: 20px;">No activity records found.</td></tr>';
        } else {
            activeUsersList.innerHTML = filteredUsers.map((user) => {
                const active = isUserActive(user.last_activity_at);
                const statusLabel = active ? 'Active Now' : 'Recently Active';
                const statusClass = active ? 'status-active' : 'status-pending';

                return `
                    <tr data-role="${escapeHtml(user.role)}">
                        <td>${escapeHtml(user.full_name)} (${escapeHtml(user.employee_id)})</td>
                        <td><span class="status-text status-normal">${escapeHtml(user.role)}</span></td>
                        <td>${escapeHtml(formatLogTimestamp(user.last_activity_at))} (${escapeHtml(formatRelativeDuration(user.last_activity_at))})</td>
                        <td>${escapeHtml(user.last_ip)}</td>
                        <td>${escapeHtml(user.last_action)} <span class="status-text ${statusClass}">${statusLabel}</span></td>
                        <td>
                            <button class="btn btn-secondary btn-small" onclick="viewUserSession('${escapeHtml(user.employee_id)}')">View Session</button>
                            <button class="btn btn-primary btn-small" onclick="generateActivityReport('${escapeHtml(user.employee_id)}')">Generate Report</button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }

    if (activeUserCount) {
        const activeCount = filteredUsers.filter((user) => isUserActive(user.last_activity_at)).length;
        activeUserCount.textContent = `${activeCount} active`;
    }

    if (detailsList) {
        if (!filteredUsers.length) {
            detailsList.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 20px;">No detailed activity available.</p>';
        } else {
            detailsList.innerHTML = filteredUsers.slice(0, 8).map((user) => {
                const topLogs = (user.logs || []).slice(0, 4)
                    .map((log) => `• ${escapeHtml(formatLogTimestamp(log.created_at))} - ${escapeHtml(log.action || 'Action')} (${escapeHtml(log.endpoint || 'N/A')})`)
                    .join('<br>');

                return `
                    <div class="user-item">
                        <div class="user-details">
                            <strong>${escapeHtml(user.full_name)} (${escapeHtml(user.employee_id)})</strong>
                            <div class="user-meta">Role: ${escapeHtml(user.role)} | Total Actions: ${escapeHtml(user.request_count)}</div>
                            <div class="user-meta" style="margin-top: 5px;">
                                <strong>Activity Timeline:</strong><br>${topLogs || 'No recent actions'}
                            </div>
                        </div>
                        <div class="user-actions">
                            <button class="btn btn-secondary btn-small" onclick="viewFullActivityLog('${escapeHtml(user.employee_id)}')">Full Log</button>
                            <button class="btn btn-primary btn-small" onclick="generateActivityReport('${escapeHtml(user.employee_id)}')">Generate Report</button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    if (inactivityList) {
        const inactiveUsers = filteredUsers.filter((user) => !isUserActive(user.last_activity_at)).slice(0, 5);
        if (!inactiveUsers.length) {
            inactivityList.innerHTML = '<div class="notification-item success"><span class="notification-icon"><i class="fas fa-check-circle"></i></span><div><strong>No Inactivity Alerts:</strong> All filtered users are active recently.</div></div>';
        } else {
            inactivityList.innerHTML = inactiveUsers.map((user) => `
                <div class="notification-item warning">
                    <span class="notification-icon"><i class="fas fa-clock"></i></span>
                    <div>
                        <strong>Low Activity:</strong> ${escapeHtml(user.full_name)} (${escapeHtml(user.employee_id)}) - Last action ${escapeHtml(formatRelativeDuration(user.last_activity_at))}
                        <div style="margin-top: 5px;">
                            <button class="btn btn-secondary btn-small" onclick="viewFullActivityLog('${escapeHtml(user.employee_id)}')">View Activity</button>
                            <button class="btn btn-warning btn-small" onclick="sendInactivityReminder('${escapeHtml(user.employee_id)}')">Send Reminder</button>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    initializeActivityTracking();
});

// ==================== EXPORT LOGS FUNCTIONALITY ====================

function exportLogs() {
    try {
        // Get all visible log entries
        const logs = document.querySelectorAll('#logsList .log-entry');
        const visibleLogs = Array.from(logs).filter(log => log.style.display !== 'none');

        if (visibleLogs.length === 0) {
            alert('No logs to export. Please adjust your filters.');
            return;
        }

        // Create CSV header
        let csvContent = 'Timestamp,Event,User,Details,Module\n';

        // Extract data from each log entry
        visibleLogs.forEach(log => {
            const timestamp = log.querySelector('.log-timestamp')?.textContent.trim() || '';
            const logText = log.textContent;
            
            // Extract event, user, details, and module using regex
            const eventMatch = logText.match(/Event:\s*([^\n]+)/);
            const userMatch = logText.match(/User:\s*([^\n]+)/);
            const detailsMatch = logText.match(/Details:\s*([^\n]+)/);
            const moduleMatch = logText.match(/Module:\s*([^\n]+)/);

            const event = eventMatch ? eventMatch[1].trim() : '';
            const user = userMatch ? userMatch[1].trim() : '';
            const details = detailsMatch ? detailsMatch[1].trim() : '';
            const module = moduleMatch ? moduleMatch[1].trim() : '';

            // Escape commas and quotes in CSV
            const escapeCSV = (str) => {
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };

            csvContent += `${escapeCSV(timestamp)},${escapeCSV(event)},${escapeCSV(user)},${escapeCSV(details)},${escapeCSV(module)}\n`;
        });

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Generate filename with current date
        const dateStr = new Date().toISOString().split('T')[0];
        const filterType = currentLogTypeFilter === 'all' ? 'all' : currentLogTypeFilter;
        link.download = `system_logs_${filterType}_${dateStr}.csv`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        // Show success message (if Utils is available)
        if (typeof Utils !== 'undefined' && Utils.showToast) {
            Utils.showToast(`${visibleLogs.length} log entries exported successfully!`, 'success');
        } else {
            alert(`${visibleLogs.length} log entries exported successfully!`);
        }
    } catch (error) {
        console.error('Error exporting logs:', error);
        if (typeof Utils !== 'undefined' && Utils.showToast) {
            Utils.showToast('Error exporting logs. Please try again.', 'error');
        } else {
            alert('Error exporting logs. Please try again.');
        }
    }
}

// ==================== CLEAR LOGS FUNCTIONALITY ====================

function confirmClearLogs() {
    if (confirm('Are you sure you want to clear old logs? This action cannot be undone.')) {
        clearOldLogs();
    }
}

function clearOldLogs() {
    // This would typically make an API call to clear logs from the database
    // For now, we'll show a placeholder message
    if (typeof Utils !== 'undefined' && Utils.showToast) {
        Utils.showToast('Clear logs functionality will be implemented with backend integration.', 'info');
    } else {
        alert('Clear logs functionality will be implemented with backend integration.');
    }
    
    // Example of what the API call might look like:
    /*
    try {
        const response = await API.delete('/logs/old');
        if (response.status === 'success') {
            Utils.showToast('Old logs cleared successfully!', 'success');
            // Reload logs
            location.reload();
        }
    } catch (error) {
        console.error('Error clearing logs:', error);
        Utils.showToast('Error clearing logs. Please try again.', 'error');
    }
    */
}

// ==================== MODAL MANAGEMENT ====================

function openModal(modalId) {
    console.log(`Opening modal: ${modalId}`);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
        // Add animation
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 10);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }, 300);
    }
}

// Close modal when clicking outside of it
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.opacity = '0';
        setTimeout(() => {
            event.target.style.display = 'none';
            event.target.classList.remove('active');
        }, 300);
    }
}

// ==================== PERMISSIONS & ROLES ====================

function editPermission(module) {
    console.log(`Editing permission for module: ${module}`);
    
    // Open details modal with permission editing form
    const modal = document.getElementById('detailsModal');
    const title = document.getElementById('detailsTitle');
    const content = document.getElementById('detailsContent');
    
    title.textContent = `Edit Permissions: ${module.replace(/-/g, ' ').toUpperCase()}`;
    
    content.innerHTML = `
        <form id="editPermissionForm">
            <div class="form-section">
                <h5>Select Roles with Access</h5>
                ${['Admin', 'Maintenance Manager', 'Inventory Manager', 'Transportation Manager', 'Technical Officer', 'Supervisor', 'Machinary Operator', 'Driver', 'Auction Officer'].map(role => `
                    <div class="form-check">
                        <input type="checkbox" id="perm-${role.toLowerCase().replace(/\s+/g, '-')}" ${['Admin', 'Supervisor'].includes(role) ? 'checked' : ''}>
                        <label for="perm-${role.toLowerCase().replace(/\s+/g, '-')}">${role}</label>
                    </div>
                `).join('')}
            </div>
            <div class="form-section">
                <h5>Access Level</h5>
                <div class="form-group">
                    <label class="form-label">Permission Type</label>
                    <select class="form-select" required>
                        <option value="full">Full Access (View, Create, Edit, Delete)</option>
                        <option value="edit">View & Edit Only</option>
                        <option value="view">View Only</option>
                        <option value="none">No Access</option>
                    </select>
                </div>
            </div>
            <div style="text-align: right; margin-top: 20px;">
                <button type="button" class="btn btn-secondary" onclick="closeModal('detailsModal')">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Changes</button>
            </div>
        </form>
    `;
    
    modal.classList.add('active'); modal.style.display = 'flex';
    setTimeout(() => { modal.style.opacity = '1'; }, 10);
    
    // Handle form submission
    document.getElementById('editPermissionForm').onsubmit = function(e) {
        e.preventDefault();
        if (typeof Utils !== 'undefined' && Utils.showToast) {
            Utils.showToast(`Permissions updated for ${module}!`, 'success');
        } else {
            alert(`Permissions updated for ${module}!`);
        }
        closeModal('detailsModal');
    };
}

// ==================== SERVICE INTERVAL CONFIGURATION ====================

function editServiceInterval(intervalId) {
    console.log(`Editing service interval: ${intervalId}`);
    
    // Sample data (would come from API in real implementation)
    const intervalData = {
        'SI-001': { type: 'light-vehicle', service: 'Oil Change', km: 5000, months: 6 },
        'SI-002': { type: 'heavy-vehicle', service: 'Major Service', km: 10000, months: 12 },
        'SI-003': { type: 'excavator', service: 'Hydraulic System Check', km: 500, months: 3 },
        'SI-004': { type: 'loader', service: 'Engine Service', km: 1000, months: 4 }
    };
    
    const data = intervalData[intervalId] || { type: '', service: '', km: '', months: '' };
    
    const modal = document.getElementById('detailsModal');
    const title = document.getElementById('detailsTitle');
    const content = document.getElementById('detailsContent');
    
    title.textContent = `Edit Service Interval: ${intervalId}`;
    
    content.innerHTML = `
        <form id="editServiceIntervalForm">
            <div class="form-section">
                <h5>Service Configuration</h5>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Vehicle/Machine Type</label>
                        <select class="form-select" required>
                            <option value="">Select Type</option>
                            <option value="light-vehicle" ${data.type === 'light-vehicle' ? 'selected' : ''}>Light Vehicle</option>
                            <option value="heavy-vehicle" ${data.type === 'heavy-vehicle' ? 'selected' : ''}>Heavy Vehicle</option>
                            <option value="excavator" ${data.type === 'excavator' ? 'selected' : ''}>Excavator</option>
                            <option value="loader" ${data.type === 'loader' ? 'selected' : ''}>Loader</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Service Type</label>
                        <input type="text" class="form-input" value="${data.service}" required>
                    </div>
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Distance Interval (km/hours)</label>
                        <input type="number" class="form-input" value="${data.km}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Time Interval (months)</label>
                        <input type="number" class="form-input" value="${data.months}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Status</label>
                    <select class="form-select" required>
                        <option value="active" selected>Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>
            <div style="text-align: right; margin-top: 20px;">
                <button type="button" class="btn btn-secondary" onclick="closeModal('detailsModal')">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Changes</button>
            </div>
        </form>
    `;
    
    modal.classList.add('active'); modal.style.display = 'flex';
    setTimeout(() => { modal.style.opacity = '1'; }, 10);
    
    document.getElementById('editServiceIntervalForm').onsubmit = function(e) {
        e.preventDefault();
        if (typeof Utils !== 'undefined' && Utils.showToast) {
            Utils.showToast(`Service Interval ${intervalId} updated successfully!`, 'success');
        } else {
            alert(`Service Interval ${intervalId} updated successfully!`);
        }
        closeModal('detailsModal');
    };
}

function deleteServiceInterval(intervalId) {
    if (confirm(`Delete Service Interval\n\nAre you sure you want to delete service interval ${intervalId}?\n\nThis action cannot be undone.`)) {
        console.log(`Deleting service interval: ${intervalId}`);
        
        // Here you would make an API call to delete the interval
        // Example: await API.delete(`/service-intervals/${intervalId}`)
        
        // Find and remove the row from the table
        const rows = document.querySelectorAll('.table tbody tr');
        rows.forEach(row => {
            const deleteButton = row.querySelector(`button[onclick*="deleteServiceInterval('${intervalId}')"]`);
            if (deleteButton) {
                // Fade out animation
                row.style.transition = 'opacity 0.3s';
                row.style.opacity = '0';
                setTimeout(() => {
                    row.remove();
                }, 300);
            }
        });
        
        // Show success message
        if (typeof Utils !== 'undefined' && Utils.showToast) {
            Utils.showToast(`Service Interval ${intervalId} deleted successfully!`, 'success');
        } else {
            alert(`Service Interval ${intervalId} deleted successfully!`);
        }
    }
}

function scheduleService(assetId) {
    console.log(`Scheduling service for: ${assetId}`);
    if (typeof Utils !== 'undefined' && Utils.showToast) {
        Utils.showToast(`Schedule Service for ${assetId} - Feature coming soon!`, 'info');
    } else {
        alert(`Schedule Service for ${assetId} - Feature coming soon!`);
    }
}

function viewVehicleDetails(vehicleId) {
    console.log(`Viewing vehicle details: ${vehicleId}`);
    if (typeof Utils !== 'undefined' && Utils.showToast) {
        Utils.showToast(`View Vehicle Details ${vehicleId} - Feature coming soon!`, 'info');
    } else {
        alert(`View Vehicle Details ${vehicleId} - Feature coming soon!`);
    }
}

function viewMachineDetails(machineId) {
    console.log(`Viewing machine details: ${machineId}`);
    if (typeof Utils !== 'undefined' && Utils.showToast) {
        Utils.showToast(`View Machine Details ${machineId} - Feature coming soon!`, 'info');
    } else {
        alert(`View Machine Details ${machineId} - Feature coming soon!`);
    }
}

// ==================== PETTY CASH CONFIGURATION ====================

function editPettyCashLimit(role) {
    console.log(`Editing petty cash limit for role: ${role}`);
    
    // Sample data
    const limitsData = {
        'supervisor': { daily: 500, monthly: 5000, approval: 200 },
        'technical-officer': { daily: 200, monthly: 2000, approval: 100 },
        'maintenance-manager': { daily: 1000, monthly: 10000, approval: 500 }
    };
    
    const data = limitsData[role] || { daily: 0, monthly: 0, approval: 0 };
    
    const modal = document.getElementById('detailsModal');
    const title = document.getElementById('detailsTitle');
    const content = document.getElementById('detailsContent');
    
    title.textContent = `Edit Petty Cash Limit: ${role.replace(/-/g, ' ').toUpperCase()}`;
    
    content.innerHTML = `
        <form id="editPettyCashForm">
            <div class="form-section">
                <h5>Allowance Configuration</h5>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Daily Limit ($)</label>
                        <input type="number" class="form-input" value="${data.daily}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Monthly Limit ($)</label>
                        <input type="number" class="form-input" value="${data.monthly}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Approval Required Above ($)</label>
                    <input type="number" class="form-input" value="${data.approval}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Notes</label>
                    <textarea class="form-textarea" placeholder="Any special conditions or notes"></textarea>
                </div>
            </div>
            <div style="text-align: right; margin-top: 20px;">
                <button type="button" class="btn btn-secondary" onclick="closeModal('detailsModal')">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Changes</button>
            </div>
        </form>
    `;
    
    modal.classList.add('active'); modal.style.display = 'flex';
    setTimeout(() => { modal.style.opacity = '1'; }, 10);
    
    document.getElementById('editPettyCashForm').onsubmit = function(e) {
        e.preventDefault();
        if (typeof Utils !== 'undefined' && Utils.showToast) {
            Utils.showToast(`Petty cash limits updated for ${role}!`, 'success');
        } else {
            alert(`Petty cash limits updated for ${role}!`);
        }
        closeModal('detailsModal');
    };
}

function viewPettyCashHistory(employeeId) {
    console.log(`Viewing petty cash history for: ${employeeId}`);
    
    const modal = document.getElementById('detailsModal');
    const title = document.getElementById('detailsTitle');
    const content = document.getElementById('detailsContent');
    
    title.textContent = `Petty Cash History: ${employeeId}`;
    
    content.innerHTML = `
        <div class="form-section">
            <h5>Transaction History</h5>
            <table class="table" style="margin-top: 15px;">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Purpose</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Oct 18, 2025</td>
                        <td>$150</td>
                        <td>Vehicle parts procurement</td>
                        <td><span class="status-text status-completed">Approved</span></td>
                    </tr>
                    <tr>
                        <td>Oct 15, 2025</td>
                        <td>$85</td>
                        <td>Tool maintenance</td>
                        <td><span class="status-text status-completed">Approved</span></td>
                    </tr>
                    <tr>
                        <td>Oct 12, 2025</td>
                        <td>$220</td>
                        <td>Emergency repairs</td>
                        <td><span class="status-text status-pending">Pending</span></td>
                    </tr>
                    <tr>
                        <td>Oct 10, 2025</td>
                        <td>$95</td>
                        <td>Fuel expenses</td>
                        <td><span class="status-text status-completed">Approved</span></td>
                    </tr>
                </tbody>
            </table>
            <div style="margin-top: 20px; padding: 15px; background: var(--light-bg); border-radius: 8px;">
                <strong>Summary:</strong><br>
                Total Spent This Month: $550<br>
                Remaining Limit: $1,450<br>
                Pending Approvals: $220
            </div>
        </div>
        <div style="text-align: right; margin-top: 20px;">
            <button type="button" class="btn btn-primary" onclick="closeModal('detailsModal')">Close</button>
        </div>
    `;
    
    modal.classList.add('active'); modal.style.display = 'flex';
    setTimeout(() => { modal.style.opacity = '1'; }, 10);
}

function adjustLimit(employeeId) {
    console.log(`Adjusting limit for: ${employeeId}`);
    
    const modal = document.getElementById('detailsModal');
    const title = document.getElementById('detailsTitle');
    const content = document.getElementById('detailsContent');
    
    title.textContent = `Adjust Petty Cash Limit: ${employeeId}`;
    
    content.innerHTML = `
        <form id="adjustLimitForm">
            <div class="form-section">
                <h5>Individual Limit Adjustment</h5>
                <div class="form-group">
                    <label class="form-label">Current Monthly Limit</label>
                    <input type="text" class="form-input" value="$2,000" readonly disabled>
                </div>
                <div class="form-group">
                    <label class="form-label">New Monthly Limit ($)</label>
                    <input type="number" class="form-input" placeholder="e.g., 3000" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Adjustment Reason</label>
                    <select class="form-select" required>
                        <option value="">Select Reason</option>
                        <option value="project">Special Project</option>
                        <option value="promotion">Role Change/Promotion</option>
                        <option value="temporary">Temporary Increase</option>
                        <option value="permanent">Permanent Adjustment</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Valid Until (for temporary adjustments)</label>
                    <input type="date" class="form-input">
                </div>
                <div class="form-group">
                    <label class="form-label">Justification Notes</label>
                    <textarea class="form-textarea" placeholder="Provide detailed justification for this adjustment" required></textarea>
                </div>
            </div>
            <div style="text-align: right; margin-top: 20px;">
                <button type="button" class="btn btn-secondary" onclick="closeModal('detailsModal')">Cancel</button>
                <button type="submit" class="btn btn-primary">Adjust Limit</button>
            </div>
        </form>
    `;
    
    modal.classList.add('active'); modal.style.display = 'flex';
    setTimeout(() => { modal.style.opacity = '1'; }, 10);
    
    document.getElementById('adjustLimitForm').onsubmit = function(e) {
        e.preventDefault();
        if (typeof Utils !== 'undefined' && Utils.showToast) {
            Utils.showToast(`Limit adjusted successfully for ${employeeId}!`, 'success');
        } else {
            alert(`Limit adjusted successfully for ${employeeId}!`);
        }
        closeModal('detailsModal');
    };
}

// ==================== NOTIFICATION TEMPLATES ====================

function previewTemplate(templateId) {
    console.log(`Previewing template: ${templateId}`);
    
    // Sample template data
    const templates = {
        'TPL-001': {
            name: 'Breakdown Alert Notification',
            type: 'Email',
            subject: 'Urgent: Breakdown Reported - {vehicle_id}',
            body: 'Dear {recipient_name},\n\nA breakdown has been reported for vehicle {vehicle_id}.\n\nLocation: {location}\nPriority: {priority}\nReported Time: {timestamp}\n\nPlease take immediate action.\n\nTicket ID: {ticket_id}\n\nBest regards,\nAssetCare360 System'
        },
        'TPL-002': {
            name: 'Service Reminder Notification',
            type: 'Email',
            subject: 'Service Due: {vehicle_id} - {service_type}',
            body: 'Dear {recipient_name},\n\nThis is a reminder that vehicle {vehicle_id} is due for {service_type}.\n\nLast Service Date: {last_service_date}\nOdometer Reading: {current_odometer} km\n\nPlease schedule the service at your earliest convenience.\n\nBest regards,\nAssetCare360 System'
        },
        'TPL-003': {
            name: 'Parts Approval Request',
            type: 'Email',
            subject: 'Parts Request Pending Approval - {request_id}',
            body: 'Dear {recipient_name},\n\nA parts request requires your approval.\n\nRequest ID: {request_id}\nRequested By: {requester_name}\nParts List:\n{parts_list}\n\nTotal Cost: ${total_cost}\n\nPlease review and approve/reject this request.\n\nBest regards,\nAssetCare360 System'
        },
        'TPL-004': {
            name: 'Auction Notice',
            type: 'Email',
            subject: 'New Auction Listing - {item_description}',
            body: 'Dear {recipient_name},\n\nA new item has been listed for auction.\n\nItem: {item_description}\nAuction Date: {auction_date}\nStarting Bid: ${starting_bid}\n\nPlease visit the auction portal to place your bid.\n\nBest regards,\nAssetCare360 System'
        },
        'TPL-SMS-001': {
            name: 'Breakdown Alert SMS',
            type: 'SMS',
            body: 'ALERT: Breakdown reported for {vehicle_id} at {location}. Priority: {priority}. Ticket: {ticket_id}'
        },
        'TPL-SMS-002': {
            name: 'Service Reminder SMS',
            type: 'SMS',
            body: 'Reminder: {vehicle_id} service due. Last service: {last_service_date}. Schedule now.'
        }
    };
    
    const template = templates[templateId] || { name: 'Unknown Template', type: 'Email', subject: '', body: '' };
    
    const modal = document.getElementById('detailsModal');
    const title = document.getElementById('detailsTitle');
    const content = document.getElementById('detailsContent');
    
    title.textContent = `Preview Template: ${template.name}`;
    
    content.innerHTML = `
        <div class="form-section">
            <h5>Template Preview</h5>
            <div style="background: var(--light-bg); padding: 20px; border-radius: 8px; margin-top: 15px;">
                <div style="margin-bottom: 15px;">
                    <strong>Template ID:</strong> ${templateId}<br>
                    <strong>Type:</strong> <span class="status-text status-normal">${template.type}</span>
                </div>
                ${template.type === 'Email' ? `
                    <div style="margin-bottom: 15px; padding: 10px; background: white; border-left: 4px solid var(--tang-blue);">
                        <strong>Subject:</strong><br>
                        <span style="font-size: 16px;">${template.subject}</span>
                    </div>
                ` : ''}
                <div style="padding: 15px; background: white; border-radius: 5px; white-space: pre-wrap; font-family: monospace; font-size: 13px;">
${template.body}
                </div>
                <div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-radius: 5px; font-size: 12px;">
                    <strong>Variables:</strong> {vehicle_id}, {location}, {priority}, {ticket_id}, {recipient_name}, {timestamp}, etc.
                </div>
            </div>
        </div>
        <div style="text-align: right; margin-top: 20px;">
            <button type="button" class="btn btn-secondary" onclick="closeModal('detailsModal')">Close</button>
            <button type="button" class="btn btn-primary" onclick="editTemplate('${templateId}'); closeModal('detailsModal');">Edit Template</button>
        </div>
    `;
    
    modal.classList.add('active'); modal.style.display = 'flex';
    setTimeout(() => { modal.style.opacity = '1'; }, 10);
}

function editTemplate(templateId) {
    console.log(`Editing template: ${templateId}`);
    
    // Sample template data
    const templates = {
        'TPL-001': {
            name: 'Breakdown Alert Notification',
            type: 'email',
            category: 'breakdown',
            subject: 'Urgent: Breakdown Reported - {vehicle_id}',
            body: 'Dear {recipient_name},\n\nA breakdown has been reported for vehicle {vehicle_id}.\n\nLocation: {location}\nPriority: {priority}\nReported Time: {timestamp}\n\nPlease take immediate action.\n\nTicket ID: {ticket_id}\n\nBest regards,\nAssetCare360 System'
        },
        'TPL-002': {
            name: 'Service Reminder Notification',
            type: 'email',
            category: 'maintenance',
            subject: 'Service Due: {vehicle_id} - {service_type}',
            body: 'Dear {recipient_name},\n\nThis is a reminder that vehicle {vehicle_id} is due for {service_type}.\n\nLast Service Date: {last_service_date}\nOdometer Reading: {current_odometer} km\n\nPlease schedule the service at your earliest convenience.\n\nBest regards,\nAssetCare360 System'
        },
        'TPL-SMS-001': {
            name: 'Breakdown Alert SMS',
            type: 'sms',
            category: 'breakdown',
            body: 'ALERT: Breakdown reported for {vehicle_id} at {location}. Priority: {priority}. Ticket: {ticket_id}'
        }
    };
    
    const template = templates[templateId] || { name: '', type: 'email', category: '', subject: '', body: '' };
    
    const modal = document.getElementById('detailsModal');
    const title = document.getElementById('detailsTitle');
    const content = document.getElementById('detailsContent');
    
    title.textContent = `Edit Template: ${templateId}`;
    
    content.innerHTML = `
        <form id="editTemplateForm">
            <div class="form-section">
                <h5>Template Information</h5>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Template Name</label>
                        <input type="text" class="form-input" value="${template.name}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Template Type</label>
                        <select class="form-select" required>
                            <option value="email" ${template.type === 'email' ? 'selected' : ''}>Email</option>
                            <option value="sms" ${template.type === 'sms' ? 'selected' : ''}>SMS</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Category</label>
                    <select class="form-select" required>
                        <option value="breakdown" ${template.category === 'breakdown' ? 'selected' : ''}>Breakdown Management</option>
                        <option value="maintenance" ${template.category === 'maintenance' ? 'selected' : ''}>Maintenance</option>
                        <option value="inventory" ${template.category === 'inventory' ? 'selected' : ''}>Inventory</option>
                        <option value="auction" ${template.category === 'auction' ? 'selected' : ''}>Auction Management</option>
                        <option value="general" ${template.category === 'general' ? 'selected' : ''}>General</option>
                    </select>
                </div>
            </div>

            ${template.type === 'email' ? `
            <div class="form-section">
                <h5>Email Content</h5>
                <div class="form-group">
                    <label class="form-label">Subject Line</label>
                    <input type="text" class="form-input" value="${template.subject || ''}" placeholder="Use variables like {vehicle_id}, {ticket_id}">
                </div>
                <div class="form-group">
                    <label class="form-label">Message Body</label>
                    <textarea class="form-textarea" rows="8" placeholder="Enter message template">${template.body}</textarea>
                </div>
            </div>
            ` : `
            <div class="form-section">
                <h5>SMS Content</h5>
                <div class="form-group">
                    <label class="form-label">Message (160 characters max)</label>
                    <textarea class="form-textarea" rows="3" maxlength="160">${template.body}</textarea>
                    <small style="color: var(--muted);">Character count: ${template.body.length}/160</small>
                </div>
            </div>
            `}

            <div class="form-group">
                <label class="form-label">Status</label>
                <select class="form-select" required>
                    <option value="active" selected>Active</option>
                    <option value="inactive">Inactive</option>
                </select>
            </div>

            <div style="text-align: right; margin-top: 20px;">
                <button type="button" class="btn btn-secondary" onclick="closeModal('detailsModal')">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Changes</button>
            </div>
        </form>
    `;
    
    modal.classList.add('active'); modal.style.display = 'flex';
    setTimeout(() => { modal.style.opacity = '1'; }, 10);
    
    document.getElementById('editTemplateForm').onsubmit = function(e) {
        e.preventDefault();
        if (typeof Utils !== 'undefined' && Utils.showToast) {
            Utils.showToast(`Template ${templateId} updated successfully!`, 'success');
        } else {
            alert(`Template ${templateId} updated successfully!`);
        }
        closeModal('detailsModal');
    };
}

function testTemplate(templateId) {
    console.log(`Testing template: ${templateId}`);
    
    const modal = document.getElementById('detailsModal');
    const title = document.getElementById('detailsTitle');
    const content = document.getElementById('detailsContent');
    
    title.textContent = `Test Template: ${templateId}`;
    
    content.innerHTML = `
        <form id="testTemplateForm">
            <div class="form-section">
                <h5>Send Test Notification</h5>
                <p style="color: var(--muted); margin-bottom: 15px;">
                    Send a test notification using this template to verify it's working correctly.
                </p>
                <div class="form-group">
                    <label class="form-label">Recipient Email/Phone</label>
                    <input type="text" class="form-input" placeholder="Enter test recipient" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Test Data (JSON format)</label>
                    <textarea class="form-textarea" rows="6" placeholder='{\n  "vehicle_id": "VEH-001",\n  "location": "Main Depot",\n  "priority": "High",\n  "ticket_id": "MBD-123"\n}'>{
  "vehicle_id": "VEH-001",
  "location": "Main Depot",
  "priority": "High",
  "ticket_id": "MBD-123",
  "recipient_name": "Test User"
}</textarea>
                    <small style="color: var(--muted);">Variables will be replaced with these values</small>
                </div>
            </div>
            <div style="text-align: right; margin-top: 20px;">
                <button type="button" class="btn btn-secondary" onclick="closeModal('detailsModal')">Cancel</button>
                <button type="submit" class="btn btn-warning">Send Test</button>
            </div>
        </form>
    `;
    
    modal.classList.add('active'); modal.style.display = 'flex';
    setTimeout(() => { modal.style.opacity = '1'; }, 10);
    
    document.getElementById('testTemplateForm').onsubmit = function(e) {
        e.preventDefault();
        if (typeof Utils !== 'undefined' && Utils.showToast) {
            Utils.showToast(`Test notification sent successfully using template ${templateId}!`, 'success');
        } else {
            alert(`Test notification sent successfully using template ${templateId}!`);
        }
        closeModal('detailsModal');
    };
}

// ==================== USER ACTIVITY TRACKING ====================

function viewUserSession(employeeId) {
    const user = getUserActivityById(employeeId);
    const userLogs = user ? (user.logs || []).slice(0, 10) : [];

    const modal = document.getElementById('detailsModal');
    const title = document.getElementById('detailsTitle');
    const content = document.getElementById('detailsContent');

    title.textContent = `Active Session Details: ${employeeId}`;

    if (!user) {
        content.innerHTML = `
            <div class="form-section">
                <p style="color: var(--danger);">No activity data found for ${escapeHtml(employeeId)}.</p>
            </div>
            <div style="text-align: right; margin-top: 20px;">
                <button type="button" class="btn btn-secondary" onclick="closeModal('detailsModal')">Close</button>
            </div>
        `;

        modal.classList.add('active'); modal.style.display = 'flex';
        setTimeout(() => { modal.style.opacity = '1'; }, 10);
        return;
    }

    const sessionRows = userLogs.map((log) => `
        <tr>
            <td>${escapeHtml(formatLogTimestamp(log.created_at))}</td>
            <td>${escapeHtml(log.action || 'Action')}</td>
            <td>${escapeHtml(log.category || 'General')}</td>
        </tr>
    `).join('');

    content.innerHTML = `
        <div class="form-section">
            <h5>User Information</h5>
            <div style="background: var(--light-bg); padding: 15px; border-radius: 8px; margin-top: 10px;">
                <strong>Employee ID:</strong> ${escapeHtml(user.employee_id)}<br>
                <strong>Name:</strong> ${escapeHtml(user.full_name)}<br>
                <strong>Role:</strong> <span class="status-text status-normal">${escapeHtml(user.role)}</span>
            </div>
        </div>

        <div class="form-section">
            <h5>Session Details</h5>
            <div style="background: var(--light-bg); padding: 15px; border-radius: 8px; margin-top: 10px;">
                <strong>Last Activity:</strong> ${escapeHtml(formatLogTimestamp(user.last_activity_at))} (${escapeHtml(formatRelativeDuration(user.last_activity_at))})<br>
                <strong>IP Address:</strong> ${escapeHtml(user.last_ip)}<br>
                <strong>Total Requests:</strong> ${escapeHtml(user.request_count)}<br>
                <strong>Successful Logins:</strong> ${escapeHtml(user.successful_logins)}<br>
                <strong>Failed Logins:</strong> ${escapeHtml(user.failed_logins)}
            </div>
        </div>

        <div class="form-section">
            <h5>Recent Activity</h5>
            <table class="table" style="margin-top: 10px;">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Action</th>
                        <th>Module</th>
                    </tr>
                </thead>
                <tbody>
                    ${sessionRows || '<tr><td colspan="3" style="text-align:center; color: var(--muted);">No recent activity</td></tr>'}
                </tbody>
            </table>
        </div>

        <div style="text-align: right; margin-top: 20px;">
            <button type="button" class="btn btn-secondary" onclick="closeModal('detailsModal')">Close</button>
            <button type="button" class="btn btn-danger" onclick="forceLogout('${employeeId}'); closeModal('detailsModal');">Force Logout</button>
        </div>
    `;
    
    modal.classList.add('active'); modal.style.display = 'flex';
    setTimeout(() => { modal.style.opacity = '1'; }, 10);
}

function forceLogout(employeeId) {
    if (confirm(`Force Logout\n\nAre you sure you want to force logout ${employeeId}?\n\nThis will immediately terminate their active session and they will need to log in again.\n\nThis action should only be used in emergencies or security concerns.`)) {
        console.log(`Forcing logout for: ${employeeId}`);
        
        // Here you would make an API call to terminate the session
        if (typeof Utils !== 'undefined' && Utils.showToast) {
            Utils.showToast(`${employeeId} has been logged out successfully!`, 'success');
        } else {
            alert(`${employeeId} has been logged out successfully!`);
        }
        
        // Optionally refresh the active users table
        // location.reload(); // or update the table dynamically
    }
}

function viewFullActivityLog(employeeId) {
    const user = getUserActivityById(employeeId);
    const userLogs = user ? (user.logs || []) : [];

    const modal = document.getElementById('detailsModal');
    const title = document.getElementById('detailsTitle');
    const content = document.getElementById('detailsContent');

    title.textContent = `Complete Activity Log: ${employeeId}`;

    if (!user) {
        content.innerHTML = `
            <div class="form-section">
                <p style="color: var(--danger);">No activity data found for ${escapeHtml(employeeId)}.</p>
            </div>
            <div style="text-align: right; margin-top: 20px;">
                <button type="button" class="btn btn-secondary" onclick="closeModal('detailsModal')">Close</button>
            </div>
        `;

        modal.classList.add('active'); modal.style.display = 'flex';
        setTimeout(() => { modal.style.opacity = '1'; }, 10);
        return;
    }

    const fullRows = userLogs.map((log) => `
        <tr>
            <td>${escapeHtml(formatLogTimestamp(log.created_at))}</td>
            <td>${escapeHtml(log.action || 'Action')}</td>
            <td>${escapeHtml(log.category || 'General')}</td>
            <td>${escapeHtml(log.endpoint || 'N/A')} (${escapeHtml(log.method || 'GET')})</td>
        </tr>
    `).join('');

    content.innerHTML = `
        <div class="form-section">
            <h5>User Activity History</h5>
            <div style="margin-bottom: 15px;">
                <strong>Employee:</strong> ${escapeHtml(user.full_name)} (${escapeHtml(user.employee_id)})<br>
                <strong>Role:</strong> ${escapeHtml(user.role)}<br>
                <strong>Total Actions:</strong> ${escapeHtml(user.request_count)}
            </div>

            <div style="max-height: 400px; overflow-y: auto;">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Date & Time</th>
                            <th>Action</th>
                            <th>Module</th>
                            <th>Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${fullRows || '<tr><td colspan="4" style="text-align:center; color: var(--muted);">No activity records available</td></tr>'}
                    </tbody>
                </table>
            </div>

            <div style="margin-top: 15px; padding: 15px; background: var(--light-bg); border-radius: 8px;">
                <strong>Activity Summary:</strong><br>
                Total Actions: ${escapeHtml(user.request_count)}<br>
                Successful Logins: ${escapeHtml(user.successful_logins)}<br>
                Failed Logins: ${escapeHtml(user.failed_logins)}<br>
                Last Activity: ${escapeHtml(formatRelativeDuration(user.last_activity_at))}
            </div>
        </div>

        <div style="text-align: right; margin-top: 20px;">
            <button type="button" class="btn btn-secondary" onclick="closeModal('detailsModal')">Close</button>
            <button type="button" class="btn btn-primary" onclick="exportUserActivity('${escapeHtml(employeeId)}')">Export to CSV</button>
        </div>
    `;
    
    modal.classList.add('active'); modal.style.display = 'flex';
    setTimeout(() => { modal.style.opacity = '1'; }, 10);
}

function exportUserActivity(employeeId) {
    const user = getUserActivityById(employeeId);
    if (!user) {
        if (typeof Utils !== 'undefined' && Utils.showToast) {
            Utils.showToast('No activity data available to export', 'warning');
        }
        return;
    }

    const rows = (user.logs || []).map((log) => ({
        timestamp: formatLogTimestamp(log.created_at),
        action: log.action || 'Action',
        category: log.category || 'General',
        endpoint: log.endpoint || 'N/A',
        method: log.method || 'GET',
        ip: log.ip_address || 'N/A',
        response_code: log.response_code || 'N/A'
    }));

    const headers = ['Timestamp', 'Action', 'Category', 'Endpoint', 'Method', 'IP Address', 'Response Code'];
    const csvLines = [headers.join(',')];

    rows.forEach((row) => {
        const values = [
            row.timestamp,
            row.action,
            row.category,
            row.endpoint,
            row.method,
            row.ip,
            String(row.response_code)
        ].map((value) => {
            const normalized = String(value).replace(/\"/g, '""');
            return /[",\n]/.test(normalized) ? `"${normalized}"` : normalized;
        });

        csvLines.push(values.join(','));
    });

    const csvContent = csvLines.join('\n');
    const datePart = new Date().toISOString().split('T')[0];
    const filename = `activity_${employeeId}_${datePart}.csv`;
    downloadCsv(csvContent, filename);
    if (typeof Utils !== 'undefined' && Utils.showToast) {
        Utils.showToast(`Activity exported for ${employeeId}`, 'success');
    }
}

function generateActivityReport(employeeId) {
    exportUserActivity(employeeId);
}

function sendInactivityReminder(employeeId) {
    const user = getUserActivityById(employeeId);
    if (!user) {
        if (typeof Utils !== 'undefined' && Utils.showToast) {
            Utils.showToast('Unable to send reminder. User not found.', 'error');
        }
        return;
    }

    const message = `Reminder simulated for ${user.full_name} (${employeeId}) due to inactivity.`;
    if (typeof Utils !== 'undefined' && Utils.showToast) {
        Utils.showToast(message, 'info');
    }
}

function getUserActivityById(employeeId) {
    return activityUsersData.find((user) => user.employee_id === employeeId) || null;
}

function downloadCsv(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}
