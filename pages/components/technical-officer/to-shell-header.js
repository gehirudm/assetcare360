/**
 * to-shell-header.js
 * Defines the <to-shell-header> web component.
 *
 * Renders the Technical Officer dashboard header (branding + profile dropdown)
 * into light DOM so document.getElementById() lookups from dashboard-init.js
 * and page scripts work without any shadow-DOM piercing.
 *
 * Usage:
 *   <to-shell-header></to-shell-header>
 *
 * Public methods:
 *   updateUser(user)  — populate avatar, name, role, employee ID
 */

class TOShellHeader extends HTMLElement {
    connectedCallback() {
        this.classList.add('header');
        this.render();
        this._setupDropdown();
    }

    render() {
        this.innerHTML = `
        <div class="header-left">
            <div class="brand-logo">
                <span class="brand-name">AssetCare<span class="brand-highlight">360</span></span>
            </div>
            <div class="header-divider"></div>
            <h1 class="header-title">
                <i class="fas fa-user-cog"></i> Technical Officer Dashboard
            </h1>
        </div>
        <div class="header-user">
            <div class="profile-dropdown" id="profileDropdown">
                <div class="profile-trigger" id="profileTrigger" role="button" aria-haspopup="true" aria-expanded="false">
                    <div class="user-avatar" id="userAvatar">T</div>
                    <i class="fas fa-chevron-down profile-chevron"></i>
                </div>
                <div class="profile-menu" id="profileMenu" role="menu">
                    <div class="profile-menu-header">
                        <div class="user-avatar" id="profileMenuAvatar">T</div>
                        <div class="profile-menu-name" id="userName">Loading...</div>
                        <div class="profile-menu-meta">
                            <span id="userEmployeeId"></span>
                            <span class="profile-menu-sep">&bull;</span>
                            <span id="userRole"></span>
                        </div>
                    </div>
                    <div class="profile-menu-body">
                        <a class="profile-menu-item" href="/profile/index.html" role="menuitem">
                            <i class="fas fa-user-circle"></i>
                            <span>View Profile</span>
                        </a>
                        <div class="profile-menu-divider"></div>
                        <button class="profile-menu-item profile-menu-logout" onclick="logout()" role="menuitem">
                            <i class="fas fa-sign-out-alt"></i>
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    }

    /**
     * Populate all user-facing fields in the header.
     * Call this after auth resolves, instead of querying the DOM externally.
     */
    updateUser(user) {
        const initials = (user.full_name || user.role || 'U')
            .split(' ')
            .map(w => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

        const avatar    = this.querySelector('#userAvatar');
        const menuAvatar = this.querySelector('#profileMenuAvatar');
        const name      = this.querySelector('#userName');
        const empId     = this.querySelector('#userEmployeeId');
        const role      = this.querySelector('#userRole');

        if (avatar)     avatar.textContent     = initials;
        if (menuAvatar) menuAvatar.textContent  = initials;
        if (name)       name.textContent        = user.full_name || user.role || 'User';
        if (empId)      empId.textContent       = user.employee_id || '';
        if (role)       role.textContent        = user.role || '';
    }

    _setupDropdown() {
        const dropdown = this.querySelector('#profileDropdown');
        const trigger  = this.querySelector('#profileTrigger');
        if (!trigger || !dropdown) return;

        trigger.addEventListener('click', e => {
            e.stopPropagation();
            const open = dropdown.classList.toggle('open');
            trigger.setAttribute('aria-expanded', String(open));
        });

        document.addEventListener('click', e => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove('open');
                trigger.setAttribute('aria-expanded', 'false');
            }
        });

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                dropdown.classList.remove('open');
                trigger.setAttribute('aria-expanded', 'false');
            }
        });
    }
}

customElements.define('to-shell-header', TOShellHeader);
