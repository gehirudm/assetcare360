/**
 * <ac-header> — Unified dashboard header (light DOM)
 *
 * Attributes:
 *   title        — Dashboard display name, e.g. "Supervisor Dashboard"
 *   icon         — Font Awesome class suffix, e.g. "fa-user-tie"
 *
 * Usage:
 *   <ac-header title="Supervisor Dashboard" icon="fa-user-tie"></ac-header>
 *
 * Public methods:
 *   updateUser(user)  — populate avatar initials, full name, employee ID, role
 *                       Called automatically by DashboardInit.updateUserInfo()
 */
class ACHeader extends HTMLElement {
    static get observedAttributes() {
        return ['title', 'icon'];
    }

    connectedCallback() {
        this.classList.add('header');
        this.render();
        this._setupDropdown();
    }

    attributeChangedCallback() {
        if (this.isConnected) {
            this.render();
            this._setupDropdown();
        }
    }

    get title()  { return this.getAttribute('title') || 'Dashboard'; }
    get icon()   { return this.getAttribute('icon')  || 'fa-chart-line'; }

    render() {
        this.innerHTML = `
        <div class="header-left">
            <div class="brand-logo">
                <span class="brand-name">AssetCare<span class="brand-highlight">360</span></span>
            </div>
            <div class="header-divider"></div>
            <h1 class="header-title">
                <i class="fas ${this.icon}"></i> ${this.title}
            </h1>
        </div>
        <div class="header-user">
            <div class="profile-dropdown" id="profileDropdown">
                <div class="profile-trigger" id="profileTrigger" role="button" aria-haspopup="true" aria-expanded="false">
                    <div class="user-avatar" id="userAvatar">U</div>
                    <i class="fas fa-chevron-down profile-chevron"></i>
                </div>
                <div class="profile-menu" id="profileMenu" role="menu">
                    <div class="profile-menu-header">
                        <div class="user-avatar" id="profileMenuAvatar">U</div>
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
     * Populate user-facing fields. Called by DashboardInit.updateUserInfo(user).
     * @param {{ full_name?: string, employee_id?: string, role?: string }} user
     */
    updateUser(user) {
        const initials = (user.full_name || user.role || 'U')
            .split(' ')
            .map(w => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

        const set = (id, val) => {
            const el = this.querySelector(`#${id}`);
            if (el) el.textContent = val;
        };

        set('userAvatar',      initials);
        set('profileMenuAvatar', initials);
        set('userName',        user.full_name || user.role || 'User');
        set('userEmployeeId',  user.employee_id || '');
        set('userRole',        user.role || '');
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

customElements.define('ac-header', ACHeader);
