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
const AC_HEADER_STYLE_ID = 'ac-header-profile-dropdown-styles';

const AC_HEADER_SHARED_STYLES = `
ac-header {
    overflow: visible;
}

ac-header .header-user {
    display: flex;
    align-items: center;
}

ac-header .profile-dropdown {
    position: relative;
}

ac-header .profile-trigger {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px 4px 4px;
    border-radius: 50px;
    cursor: pointer;
    transition: background 0.2s ease;
    user-select: none;
}

ac-header .profile-trigger:hover {
    background: rgba(255, 255, 255, 0.12);
}

ac-header .profile-chevron {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.7);
    transition: transform 0.25s ease;
    margin-left: 2px;
}

ac-header .profile-dropdown.open .profile-chevron {
    transform: rotate(180deg);
}

ac-header .user-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    font-weight: bold;
    color: white;
    flex-shrink: 0;
}

ac-header .profile-menu-header .user-avatar {
    width: 60px;
    height: 60px;
    font-size: 1.6rem;
    border: 2px solid rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.25);
    margin: 0 auto 10px;
}

ac-header .profile-menu {
    display: none;
    position: absolute;
    top: calc(100% + 12px);
    right: 0;
    width: 256px;
    background: #fff;
    border-radius: 14px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
    overflow: hidden;
    z-index: 2100;
    animation: acHeaderDropdownIn 0.18s ease-out;
}

ac-header .profile-dropdown.open .profile-menu {
    display: block;
}

@keyframes acHeaderDropdownIn {
    from {
        opacity: 0;
        transform: translateY(-6px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

ac-header .profile-menu-header {
    background: var(--gradient-blue, linear-gradient(135deg, #4e73df, #2a59a0));
    padding: 20px;
    text-align: center;
}

ac-header .profile-menu-name {
    font-size: 1rem;
    font-weight: 700;
    color: #fff;
    margin-bottom: 4px;
}

ac-header .profile-menu-meta {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    flex-wrap: wrap;
}

ac-header .profile-menu-sep {
    color: rgba(255, 255, 255, 0.5);
}

ac-header .profile-menu-body {
    padding: 6px 0;
}

ac-header .profile-menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 12px 18px;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-700, #374151);
    background: none;
    border: none;
    text-decoration: none;
    cursor: pointer;
    transition: background 0.15s ease;
    text-align: left;
    font-family: inherit;
}

ac-header .profile-menu-item i {
    width: 18px;
    text-align: center;
    color: var(--muted, #6b7280);
    font-size: 0.95rem;
}

ac-header .profile-menu-item:hover {
    background: var(--stone-100, #f3f4f6);
    color: var(--text-900, #111827);
}

ac-header .profile-menu-item:hover i {
    color: var(--royal-blue, #2563eb);
}

ac-header .profile-menu-logout {
    color: var(--danger, #ef4444);
}

ac-header .profile-menu-logout i {
    color: var(--danger, #ef4444);
}

ac-header .profile-menu-logout:hover {
    background: #fff5f5;
    color: var(--danger, #ef4444);
}

ac-header .profile-menu-logout:hover i {
    color: var(--danger, #ef4444);
}

ac-header .profile-menu-divider {
    height: 1px;
    background: var(--stone-200, #e5e7eb);
    margin: 4px 0;
}
`;

class ACHeader extends HTMLElement {
    static get observedAttributes() {
        return ['title', 'icon'];
    }

    constructor() {
        super();
        this._currentUser = null;
        this._documentListenersBound = false;
        this._onDocumentClick = null;
        this._onDocumentKeydown = null;
    }

    connectedCallback() {
        this._ensureSharedStyles();
        this.classList.add('header');
        this.render();
        this._setupDropdown();
        this._hydrateUserFromSession();
    }

    disconnectedCallback() {
        if (!this._documentListenersBound) {
            return;
        }

        if (this._onDocumentClick) {
            document.removeEventListener('click', this._onDocumentClick);
        }

        if (this._onDocumentKeydown) {
            document.removeEventListener('keydown', this._onDocumentKeydown);
        }

        this._documentListenersBound = false;
    }

    attributeChangedCallback() {
        if (this.isConnected) {
            this.render();
            this._setupDropdown();
            if (this._currentUser) {
                this._renderUser(this._currentUser);
            }
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
        if (!user || typeof user !== 'object') {
            return;
        }

        this._currentUser = user;
        this._renderUser(user);
    }

    _renderUser(user) {
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

    _getStoredUser() {
        try {
            if (window.Auth && typeof window.Auth.getCurrentUser === 'function') {
                const authUser = window.Auth.getCurrentUser();
                if (authUser && typeof authUser === 'object') {
                    return authUser;
                }
            }
        } catch (error) {
            console.warn('ac-header: failed to read Auth user data:', error);
        }

        try {
            const storageKey = window.CONFIG?.STORAGE_KEYS?.USER_DATA || 'user_data';
            const raw = localStorage.getItem(storageKey);
            if (!raw) return null;

            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch (error) {
            console.warn('ac-header: failed to read stored user data:', error);
            return null;
        }
    }

    async _hydrateUserFromSession() {
        const storedUser = this._getStoredUser();
        if (storedUser) {
            this.updateUser(storedUser);
            return;
        }

        if (!window.Auth || typeof window.Auth.checkAuth !== 'function') {
            return;
        }

        try {
            const liveUser = await window.Auth.checkAuth();
            if (liveUser) {
                this.updateUser(liveUser);
            }
        } catch (error) {
            console.warn('ac-header: unable to hydrate profile from auth check:', error);
        }
    }

    _ensureSharedStyles() {
        if (document.getElementById(AC_HEADER_STYLE_ID)) {
            return;
        }

        const style = document.createElement('style');
        style.id = AC_HEADER_STYLE_ID;
        style.textContent = AC_HEADER_SHARED_STYLES;
        document.head.appendChild(style);
    }

    _setupDropdown() {
        const dropdown = this.querySelector('#profileDropdown');
        const trigger  = this.querySelector('#profileTrigger');
        if (!trigger || !dropdown) return;

        trigger.onclick = e => {
            e.stopPropagation();
            const open = dropdown.classList.toggle('open');
            trigger.setAttribute('aria-expanded', String(open));
        };

        if (this._documentListenersBound) {
            return;
        }

        this._onDocumentClick = e => {
            const activeDropdown = this.querySelector('#profileDropdown');
            const activeTrigger = this.querySelector('#profileTrigger');
            if (!activeDropdown || !activeTrigger) return;

            if (!activeDropdown.contains(e.target)) {
                activeDropdown.classList.remove('open');
                activeTrigger.setAttribute('aria-expanded', 'false');
            }
        };

        this._onDocumentKeydown = e => {
            const activeDropdown = this.querySelector('#profileDropdown');
            const activeTrigger = this.querySelector('#profileTrigger');
            if (!activeDropdown || !activeTrigger) return;

            if (e.key === 'Escape') {
                activeDropdown.classList.remove('open');
                activeTrigger.setAttribute('aria-expanded', 'false');
            }
        };

        document.addEventListener('click', this._onDocumentClick);
        document.addEventListener('keydown', this._onDocumentKeydown);
        this._documentListenersBound = true;
    }
}

customElements.define('ac-header', ACHeader);

