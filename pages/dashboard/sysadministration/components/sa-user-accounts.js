class SAUserAccounts extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.currentUsers = [];
        this.currentRoleFilter = 'all';
        this._boundDocumentClick = this.handleDocumentClick.bind(this);

        this.render();
        this.bindEvents();
        this.setupModalFormListeners();
        this.loadUsers();

        // Backward-compatible bridge for any helper that still expects this global.
        window.userManagement = this;
    }

    disconnectedCallback() {
        document.removeEventListener('click', this._boundDocumentClick);

        if (window.userManagement === this) {
            delete window.userManagement;
        }
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">User Management</h1>
                <p class="page-subtitle">Manage user accounts and access</p>
            </div>

            <div style="margin-bottom: 20px;">
                <button class="btn btn-primary" type="button" data-action="open-create-user">
                    <i class="fas fa-user-plus"></i> Create New User
                </button>
            </div>

            <div class="filter-controls" id="userFilterTabs">
                <button class="filter-btn active" type="button" data-role-filter="all">All Users</button>
                <button class="filter-btn" type="button" data-role-filter="Admin">Admin</button>
                <button class="filter-btn" type="button" data-role-filter="Maintenance Manager">Maintenance Manager</button>
                <button class="filter-btn" type="button" data-role-filter="Inventory Manager">Inventory Manager</button>
                <button class="filter-btn" type="button" data-role-filter="Technical Officer">Technical Officer</button>
                <button class="filter-btn" type="button" data-role-filter="Supervisor">Supervisor</button>
                <button class="filter-btn" type="button" data-role-filter="Machinary Operator">Machinary Operator</button>
                <button class="filter-btn" type="button" data-role-filter="Driver">Driver</button>
                <button class="filter-btn" type="button" data-role-filter="Auction Officer">Auction Officer</button>
            </div>

            <div class="search-bar">
                <input type="text" class="search-input" placeholder="Search by name, email, or employee ID..." id="userSearch">
                <select class="filter-select" id="statusFilter">
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-users"></i> User Accounts</span>
                    <span id="userCount" class="status-text status-normal">0 users</span>
                </div>
                <div id="userList" class="inventory-list">
                    <p style="text-align: center; padding: 20px; color: var(--muted);">Loading users...</p>
                </div>
                <div id="noUsersMessage" style="display: none; text-align: center; color: var(--muted); padding: 20px;">
                    No users found for this filter
                </div>
            </div>
        `;
    }

    setupModalFormListeners() {
        const createUserForm = document.getElementById('createUserForm');
        if (createUserForm && createUserForm.dataset.saBound !== '1') {
            createUserForm.addEventListener('submit', (event) => this.handleCreateUser(event));
            createUserForm.dataset.saBound = '1';

            const createRoleSelect = createUserForm.querySelector('[name="role"]');
            if (createRoleSelect) {
                createRoleSelect.addEventListener('change', () => {
                    this.toggleTechnicalExpertiseField('createUserForm', 'createTechnicalExpertiseGroup');
                });
                this.toggleTechnicalExpertiseField('createUserForm', 'createTechnicalExpertiseGroup');
            }
        }

        const editUserForm = document.getElementById('editUserForm');
        if (editUserForm && editUserForm.dataset.saBound !== '1') {
            editUserForm.addEventListener('submit', (event) => this.handleUpdateUser(event));
            editUserForm.dataset.saBound = '1';

            const editRoleSelect = editUserForm.querySelector('[name="role"]');
            if (editRoleSelect) {
                editRoleSelect.addEventListener('change', () => {
                    this.toggleTechnicalExpertiseField('editUserForm', 'editTechnicalExpertiseGroup');
                });
            }
        }
    }

    bindEvents() {
        document.addEventListener('click', this._boundDocumentClick);

        this.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (!button) {
                return;
            }

            if (button.dataset.action === 'open-create-user') {
                this.openModal('createUserModal');
                return;
            }

            if (button.dataset.roleFilter) {
                this.currentRoleFilter = button.dataset.roleFilter;
                this.setActiveRoleFilter(button);
                this.applyFilters();
                return;
            }

            const action = button.dataset.action;
            const userId = button.dataset.userId ? Number(button.dataset.userId) : null;

            if (action === 'toggle-user-dropdown') {
                event.stopPropagation();
                this.toggleDropdown(button.dataset.userId);
                return;
            }

            if (!action || !userId) {
                return;
            }

            this.closeAllDropdowns();

            if (action === 'view-user') {
                this.viewUserDetails(userId);
                return;
            }

            if (action === 'edit-user') {
                this.editUser(userId);
                return;
            }

            if (action === 'reset-password') {
                this.resetPassword(userId);
                return;
            }

            if (action === 'suspend-user') {
                this.suspendUser(userId);
                return;
            }

            if (action === 'activate-user') {
                this.activateUser(userId);
                return;
            }

            if (action === 'delete-user') {
                this.deleteUser(userId);
            }
        });

        this.querySelector('#userSearch')?.addEventListener('input', () => {
            this.applyFilters();
        });

        this.querySelector('#statusFilter')?.addEventListener('change', () => {
            this.applyFilters();
        });
    }

    handleDocumentClick(event) {
        if (!this.contains(event.target)) {
            this.closeAllDropdowns();
        }
    }

    openModal(modalId) {
        if (typeof window.openModal === 'function') {
            window.openModal(modalId);
            return;
        }

        const modal = document.getElementById(modalId);
        if (!modal) {
            return;
        }

        modal.classList.add('active');
        modal.style.display = 'flex';
    }

    closeModal(modalId) {
        if (typeof window.closeModal === 'function') {
            window.closeModal(modalId);
            return;
        }

        const modal = document.getElementById(modalId);
        if (!modal) {
            return;
        }

        modal.classList.remove('active');
        modal.style.display = 'none';
    }

    toggleTechnicalExpertiseField(formId, groupId) {
        const form = document.getElementById(formId);
        const expertiseGroup = document.getElementById(groupId);

        if (!form || !expertiseGroup) {
            return;
        }

        const roleSelect = form.querySelector('[name="role"]');
        const expertiseSelect = form.querySelector('[name="technical_expertise"]');
        const isTechnicalOfficer = roleSelect?.value === 'Technical Officer';

        expertiseGroup.style.display = isTechnicalOfficer ? 'block' : 'none';

        if (expertiseSelect) {
            if (isTechnicalOfficer) {
                expertiseSelect.setAttribute('required', 'required');
                if (!expertiseSelect.value) {
                    expertiseSelect.value = 'General';
                }
            } else {
                expertiseSelect.removeAttribute('required');
                expertiseSelect.value = 'General';
            }
        }
    }

    async loadUsers(filters = {}) {
        try {
            const params = new URLSearchParams();
            if (filters.search) params.append('search', filters.search);
            if (filters.role) params.append('role', filters.role);
            if (filters.status) {
                params.append('is_active', filters.status === 'active' ? '1' : '0');
            }

            const endpoint = params.toString() ? `/users?${params.toString()}` : '/users';
            const response = await API.get(endpoint);

            if (response.status === 'success' && response.data) {
                this.currentUsers = response.data.users || [];
                this.renderUsers(this.currentUsers);
            } else {
                Utils.showToast('Failed to load users', 'error');
            }
        } catch (error) {
            console.error('Error loading users:', error);
            Utils.showToast('Error loading users. Please try again.', 'error');
        }
    }

    renderUsers(users) {
        const userList = this.querySelector('#userList');
        const userCount = this.querySelector('#userCount');

        if (!userList) {
            return;
        }

        if (users.length === 0) {
            userList.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 20px;">No users found</p>';
            if (userCount) {
                userCount.textContent = '0 users';
            }
            return;
        }

        if (userCount) {
            userCount.textContent = `${users.length} user${users.length !== 1 ? 's' : ''}`;
        }

        userList.innerHTML = users.map((user) => `
            <div class="user-item inventory-item" data-role="${user.role}" data-status="${user.is_active ? 'active' : 'inactive'}">
                <div class="item-details">
                    <strong><i class="fas fa-user"></i> ${user.full_name}</strong>
                    <div class="item-meta">
                        <i class="fas fa-id-badge"></i> ${user.employee_id} |
                        <i class="fas fa-user-tag"></i> ${user.role}
                        ${user.role === 'Technical Officer' ? `| <i class="fas fa-wrench"></i> ${user.technical_expertise || 'General'}` : ''}
                    </div>
                    <div class="item-description">
                        <span class="status-text ${user.is_active ? 'status-active' : 'status-inactive'}">${user.is_active ? 'Active' : 'Inactive'}</span> |
                        <i class="fas fa-envelope"></i> ${user.email}
                    </div>
                </div>
                <div class="item-actions">
                    <div class="action-buttons">
                        <button class="btn btn-small btn-primary" type="button" data-action="view-user" data-user-id="${user.id}">
                            <i class="fas fa-eye"></i> VIEW
                        </button>
                        <div class="dropdown-container">
                            <button class="btn btn-small btn-secondary dropdown-trigger" type="button" data-action="toggle-user-dropdown" data-user-id="${user.id}">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div class="dropdown-menu" id="dropdown-user-${user.id}">
                                <button class="dropdown-item" type="button" data-action="edit-user" data-user-id="${user.id}">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                                <button class="dropdown-item" type="button" data-action="reset-password" data-user-id="${user.id}">
                                    <i class="fas fa-key"></i> Reset Password
                                </button>
                                ${user.is_active
                                    ? `<button class="dropdown-item" type="button" data-action="suspend-user" data-user-id="${user.id}"><i class="fas fa-ban"></i> Suspend</button>`
                                    : `<button class="dropdown-item" type="button" data-action="activate-user" data-user-id="${user.id}"><i class="fas fa-check-circle"></i> Activate</button>`
                                }
                                <button class="dropdown-item danger" type="button" data-action="delete-user" data-user-id="${user.id}">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        this.applyFilters();
    }

    async handleCreateUser(event) {
        event.preventDefault();

        const form = event.target;
        const formData = new FormData(form);
        Utils.clearFormErrors(form);

        const userData = {
            full_name: formData.get('full_name'),
            employee_id: formData.get('employee_id'),
            email: formData.get('email'),
            phone: formData.get('phone_number'),
            role: formData.get('role'),
            technical_expertise: formData.get('role') === 'Technical Officer'
                ? (formData.get('technical_expertise') || 'General')
                : null,
            password: formData.get('password'),
            force_password_change: true,
        };

        try {
            const response = await API.post('/users', userData);

            if (response.status === 'success') {
                const tempPassword = response.temporary_password || userData.password;
                Utils.showToast(`User ${userData.full_name} created successfully! Temporary password: ${tempPassword}`, 'success');
                this.closeModal('createUserModal');
                form.reset();
                this.toggleTechnicalExpertiseField('createUserForm', 'createTechnicalExpertiseGroup');
                this.loadUsers();
            } else if (response.errors && typeof response.errors === 'object') {
                Utils.showFormErrors(form, response.errors);
                Utils.showToast(response.message || 'Please fix the errors below', 'error');
            } else {
                Utils.showToast(response.message || 'Failed to create user', 'error');
            }
        } catch (error) {
            console.error('Error creating user:', error);
            Utils.showToast('Error creating user. Please try again.', 'error');
        }
    }

    async viewUserDetails(userId) {
        try {
            const response = await API.get(`/users/${userId}`);
            if (response.status !== 'success' || !response.data) {
                Utils.showToast('Failed to load user details', 'error');
                return;
            }

            const user = response.data;
            const title = document.getElementById('detailsTitle');
            const content = document.getElementById('detailsContent');
            if (!title || !content) {
                return;
            }

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
                        <div><strong>Technical Expertise:</strong> ${user.role === 'Technical Officer' ? (user.technical_expertise || 'General') : 'N/A'}</div>
                        <div><strong>Status:</strong> <span class="status-text ${user.is_active ? 'status-active' : 'status-inactive'}">${user.is_active ? 'Active' : 'Inactive'}</span></div>
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
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" class="btn btn-secondary" data-action="close-user-details">Close</button>
                </div>
            `;

            content.querySelector('[data-action="close-user-details"]')?.addEventListener('click', () => {
                this.closeModal('detailsModal');
            });

            this.openModal('detailsModal');
        } catch (error) {
            console.error('Error loading user details:', error);
            Utils.showToast('Error loading user details. Please try again.', 'error');
        }
    }

    async editUser(userId) {
        try {
            const response = await API.get(`/users/${userId}`);
            if (response.status !== 'success' || !response.data) {
                Utils.showToast('Failed to load user for editing', 'error');
                return;
            }

            const user = response.data;
            const form = document.getElementById('editUserForm');
            if (!form) {
                Utils.showToast('Edit form is unavailable', 'error');
                return;
            }

            form.querySelector('[name="user_id"]').value = user.id;
            form.querySelector('[name="full_name"]').value = user.full_name;
            form.querySelector('[name="employee_id"]').value = user.employee_id;
            form.querySelector('[name="email"]').value = user.email;
            form.querySelector('[name="phone_number"]').value = user.phone || '';
            form.querySelector('[name="role"]').value = user.role;

            const expertiseField = form.querySelector('[name="technical_expertise"]');
            if (expertiseField) {
                expertiseField.value = user.technical_expertise || 'General';
            }

            this.toggleTechnicalExpertiseField('editUserForm', 'editTechnicalExpertiseGroup');
            this.openModal('editUserModal');
        } catch (error) {
            console.error('Error loading user:', error);
            Utils.showToast('Error loading user for editing. Please try again.', 'error');
        }
    }

    async handleUpdateUser(event) {
        event.preventDefault();

        const form = event.target;
        const formData = new FormData(form);
        const userId = formData.get('user_id');
        Utils.clearFormErrors(form);

        const userData = {
            full_name: formData.get('full_name'),
            employee_id: formData.get('employee_id'),
            email: formData.get('email'),
            phone: formData.get('phone_number'),
            role: formData.get('role'),
            technical_expertise: formData.get('role') === 'Technical Officer'
                ? (formData.get('technical_expertise') || 'General')
                : null,
        };

        try {
            const response = await API.put(`/users/${userId}`, userData);

            if (response.status === 'success') {
                Utils.showToast('User updated successfully!', 'success');
                this.closeModal('editUserModal');
                this.loadUsers();
            } else if (response.errors && typeof response.errors === 'object') {
                Utils.showFormErrors(form, response.errors);
                Utils.showToast(response.message || 'Please fix the errors below', 'error');
            } else {
                Utils.showToast(response.message || 'Failed to update user', 'error');
            }
        } catch (error) {
            console.error('Error updating user:', error);
            Utils.showToast('Error updating user. Please try again.', 'error');
        }
    }

    async resetPassword(userId) {
        if (!window.confirm('Are you sure you want to reset this user\'s password?')) {
            return;
        }

        try {
            const response = await API.post(`/users/${userId}/reset-password`);
            if (response.status === 'success') {
                const tempPassword = response.data?.temporary_password || 'Check email';
                Utils.showToast(`Password reset successfully! Temporary password: ${tempPassword}. User will be required to change password on next login.`, 'success');
            } else {
                Utils.showToast(response.message || 'Failed to reset password', 'error');
            }
        } catch (error) {
            console.error('Error resetting password:', error);
            Utils.showToast('Error resetting password. Please try again.', 'error');
        }
    }

    async suspendUser(userId) {
        if (!window.confirm('Are you sure you want to suspend this user? They will not be able to log in.')) {
            return;
        }

        try {
            const response = await API.post(`/users/${userId}/deactivate`);
            if (response.status === 'success') {
                Utils.showToast('User suspended successfully!', 'warning');
                this.loadUsers();
            } else {
                Utils.showToast(response.message || 'Failed to suspend user', 'error');
            }
        } catch (error) {
            console.error('Error suspending user:', error);
            Utils.showToast('Error suspending user. Please try again.', 'error');
        }
    }

    async activateUser(userId) {
        if (!window.confirm('Are you sure you want to activate this user?')) {
            return;
        }

        try {
            const response = await API.post(`/users/${userId}/activate`);
            if (response.status === 'success') {
                Utils.showToast('User activated successfully!', 'success');
                this.loadUsers();
            } else {
                Utils.showToast(response.message || 'Failed to activate user', 'error');
            }
        } catch (error) {
            console.error('Error activating user:', error);
            Utils.showToast('Error activating user. Please try again.', 'error');
        }
    }

    async deleteUser(userId) {
        const confirmMessage = document.getElementById('deleteConfirmMessage');
        const confirmButton = document.getElementById('deleteConfirmButton');

        if (!confirmMessage || !confirmButton) {
            return;
        }

        confirmMessage.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: var(--danger);"></i>
            </div>
            <strong style="color: var(--danger); font-size: 18px; display: block; margin-bottom: 15px;">Warning: This action cannot be undone!</strong>
            Are you sure you want to delete this user?<br>
            This will permanently remove the user account and all associated data.
        `;

        const newConfirmButton = confirmButton.cloneNode(true);
        confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);

        newConfirmButton.addEventListener('click', async () => {
            this.closeModal('deleteConfirmModal');
            await this.performDeleteUser(userId);
        });

        this.openModal('deleteConfirmModal');
    }

    async performDeleteUser(userId) {
        try {
            const response = await API.delete(`/users/${userId}`);
            if (response.status === 'success') {
                Utils.showToast('User deleted successfully!', 'error');
                this.loadUsers();
            } else {
                Utils.showToast(response.message || 'Failed to delete user', 'error');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            Utils.showToast('Error deleting user. Please try again.', 'error');
        }
    }

    setActiveRoleFilter(activeButton) {
        this.querySelectorAll('#userFilterTabs .filter-btn').forEach((button) => {
            button.classList.remove('active');
        });

        activeButton.classList.add('active');
    }

    refreshFilters() {
        this.applyFilters();
    }

    applyFilters() {
        const users = this.querySelectorAll('#userList .user-item');
        const noUsersMessage = this.querySelector('#noUsersMessage');
        const userCount = this.querySelector('#userCount');
        const userListDiv = this.querySelector('#userList');
        const searchValue = (this.querySelector('#userSearch')?.value || '').toLowerCase();
        const statusFilter = this.querySelector('#statusFilter')?.value || '';

        let visibleCount = 0;

        users.forEach((user) => {
            const userRole = user.getAttribute('data-role');
            const userStatus = user.getAttribute('data-status');
            const roleMatch = this.currentRoleFilter === 'all' || userRole === this.currentRoleFilter;
            const statusMatch = !statusFilter || userStatus === statusFilter;
            const searchMatch = !searchValue || user.textContent.toLowerCase().includes(searchValue);
            const visible = roleMatch && statusMatch && searchMatch;

            user.style.display = visible ? '' : 'none';
            if (visible) {
                visibleCount += 1;
            }
        });

        if (userListDiv) {
            userListDiv.style.display = visibleCount === 0 ? 'none' : 'block';
        }

        if (noUsersMessage) {
            noUsersMessage.style.display = visibleCount === 0 ? 'block' : 'none';
        }

        if (userCount) {
            userCount.textContent = `${visibleCount} user${visibleCount !== 1 ? 's' : ''}`;
        }
    }

    toggleDropdown(userId) {
        const dropdown = this.querySelector(`#dropdown-user-${userId}`);
        if (!dropdown) {
            return;
        }

        const isOpen = dropdown.style.display === 'block';
        this.closeAllDropdowns();
        dropdown.style.display = isOpen ? 'none' : 'block';
    }

    closeAllDropdowns() {
        this.querySelectorAll('.dropdown-menu').forEach((dropdown) => {
            dropdown.style.display = 'none';
        });
    }
}

customElements.define('sa-user-accounts', SAUserAccounts);
