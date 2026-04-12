// System Administration Dashboard Orchestration
// NO ES6 module imports - uses global CONFIG, API, Auth, Utils objects

document.addEventListener('DOMContentLoaded', function () {
    document.addEventListener('sa-ui:toast', (event) => {
        const detail = event.detail || {};
        if (!detail.message) {
            return;
        }

        showDashboardToast(detail.message, detail.type || 'success');
    });

    const overviewComponent = document.querySelector('sa-dashboard-overview');
    if (overviewComponent) {
        overviewComponent.addEventListener('sa-dashboard-overview:navigate', (event) => {
            const section = event.detail?.section;
            if (!section) {
                return;
            }

            const layout = document.querySelector('ac-layout');
            if (layout && typeof layout.navigateTo === 'function') {
                layout.navigateTo(section);
                return;
            }

            if (typeof window.navigateToSection === 'function') {
                window.navigateToSection(section);
            }
        });
    }
});

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        return;
    }

    modal.classList.add('active');
    modal.style.display = 'flex';

    setTimeout(() => {
        modal.style.opacity = '1';
    }, 10);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        return;
    }

    modal.style.opacity = '0';
    setTimeout(() => {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }, 300);
}

window.openModal = openModal;
window.closeModal = closeModal;

window.onclick = function (event) {
    if (!event.target.classList.contains('modal')) {
        return;
    }

    event.target.style.opacity = '0';
    setTimeout(() => {
        event.target.style.display = 'none';
        event.target.classList.remove('active');
    }, 300);
};

function showDashboardToast(message, type = 'success') {
    if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
        Utils.showToast(message, type);
        return;
    }

    console.warn('Toast utility unavailable:', message);
}

window.showDashboardToast = showDashboardToast;

async function viewUserDetails(employeeId) {
    const userManagement = window.userManagement;
    if (userManagement) {
        const matchingUser = Array.isArray(userManagement.currentUsers)
            ? userManagement.currentUsers.find((user) => user.employee_id === employeeId)
            : null;

        if (matchingUser && typeof userManagement.viewUserDetails === 'function') {
            await userManagement.viewUserDetails(matchingUser.id);
            return;
        }
    }

    const modal = document.getElementById('detailsModal');
    const title = document.getElementById('detailsTitle');
    const content = document.getElementById('detailsContent');
    if (!modal || !title || !content) {
        return;
    }

    title.textContent = `User Details - ${employeeId}`;
    content.innerHTML = `
        <div class="form-section">
            <h5>User details unavailable</h5>
            <div style="background: var(--light-bg); padding: 12px; border-radius: 8px;">
                Could not resolve employee ID <strong>${employeeId}</strong> from loaded user data.
                Please refresh users or open this record from the User Accounts list.
            </div>
        </div>
        <div style="text-align: right; margin-top: 20px;">
            <button type="button" class="btn btn-secondary" data-action="close-user-details">Close</button>
        </div>
    `;

    content.querySelector('[data-action="close-user-details"]')?.addEventListener('click', () => {
        closeModal('detailsModal');
    });

    modal.classList.add('active');
    modal.style.display = 'flex';
    showDashboardToast(`Unable to load profile details for ${employeeId}`, 'warning');
}

window.viewUserDetails = viewUserDetails;
