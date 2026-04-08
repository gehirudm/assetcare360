class SAUserAccounts extends HTMLElement {
    connectedCallback() {
        this.render();
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">User Management</h1>
                <p class="page-subtitle">Manage user accounts and access</p>
            </div>

            <div style="margin-bottom: 20px;">
                <button class="btn btn-primary" onclick="openModal('createUserModal')">
                    <i class="fas fa-user-plus"></i> Create New User
                </button>
            </div>

            <div class="filter-controls" id="userFilterTabs">
                <button class="filter-btn active" onclick="filterUsersByRole('all')">All Users</button>
                <button class="filter-btn" onclick="filterUsersByRole('Admin')">Admin</button>
                <button class="filter-btn" onclick="filterUsersByRole('Maintenance Manager')">Maintenance Manager</button>
                <button class="filter-btn" onclick="filterUsersByRole('Inventory Manager')">Inventory Manager</button>
                <button class="filter-btn" onclick="filterUsersByRole('Technical Officer')">Technical Officer</button>
                <button class="filter-btn" onclick="filterUsersByRole('Supervisor')">Supervisor</button>
                <button class="filter-btn" onclick="filterUsersByRole('Machinary Operator')">Machinary Operator</button>
                <button class="filter-btn" onclick="filterUsersByRole('Driver')">Driver</button>
                <button class="filter-btn" onclick="filterUsersByRole('Auction Officer')">Auction Officer</button>
            </div>

            <div class="search-bar">
                <input type="text" class="search-input" placeholder="Search by name, email, or employee ID..." id="userSearch" onkeyup="searchUsers()">
                <select class="filter-select" id="statusFilter" onchange="applyAllFilters()">
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
}

customElements.define('sa-user-accounts', SAUserAccounts);
