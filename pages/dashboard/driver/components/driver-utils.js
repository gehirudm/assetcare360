(function setupDriverUtils() {
    if (window.DriverUtils) {
        return;
    }

    const store = {
        currentUser: null,
        trips: new Map(),
        checks: new Map(),
        breakdowns: {
            reports: [],
            routeBreakdowns: [],
        },
    };

    function emit(name, detail = {}) {
        document.dispatchEvent(new CustomEvent(name, { detail }));
    }

    function on(name, handler) {
        document.addEventListener(name, handler);
    }

    function showToast(message, type = 'success') {
        emit('driver-ui:toast', { message, type });
    }

    function navigateTo(section) {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo(section);
        }
    }

    function openModal(id, payload = {}) {
        emit('driver:modal-open', { id, payload });
    }

    function closeModal(id) {
        emit('driver:modal-close', { id });
    }

    function setModalState(modal, isActive) {
        if (!modal) {
            return;
        }

        modal.classList.toggle('active', isActive);
        modal.style.display = isActive ? '' : 'none';
    }

    async function apiRequest(method, path, body) {
        if (window.API && typeof window.API.request === 'function') {
            const options = { method };
            if (body !== undefined) {
                options.body = JSON.stringify(body);
            }

            return window.API.request(path, options);
        }

        if (window.API && typeof window.API[method.toLowerCase()] === 'function') {
            if (body === undefined) {
                return window.API[method.toLowerCase()](path);
            }
            return window.API[method.toLowerCase()](path, body);
        }

        const response = await fetch(`${CONFIG.API_BASE_URL}${path}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        });

        return response.json();
    }

    async function apiGet(path) {
        return apiRequest('GET', path);
    }

    async function apiPost(path, body) {
        return apiRequest('POST', path, body);
    }

    async function apiPostFormData(path, formData) {
        const token = localStorage.getItem('auth_token');
        const url = `${CONFIG.API_BASE_URL}${path}`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                },
                body: formData,
            });
            return await response.json();
        } catch (error) {
            console.error('API FormData request failed:', error);
            throw error;
        }
    }

    async function apiPut(path, body) {
        return apiRequest('PUT', path, body);
    }

    async function apiDelete(path) {
        return apiRequest('DELETE', path);
    }

    function normalizeApiList(response, key) {
        if (!response) {
            return [];
        }

        if (Array.isArray(response)) {
            return response;
        }

        if (Array.isArray(response.data)) {
            return response.data;
        }

        if (response.data && Array.isArray(response.data[key])) {
            return response.data[key];
        }

        return [];
    }

    function getTripDisplayStatus(status) {
        if (!status) {
            return 'Pending';
        }

        return status;
    }

    function getTripFilterStatus(status) {
        const value = String(status || '').toLowerCase();
        if (value === 'pending') {
            return 'pending';
        }
        if (value === 'accepted') {
            return 'accepted';
        }
        if (value === 'rejected') {
            return 'rejected';
        }
        if (value === 'in progress' || value === 'in-progress') {
            return 'in-progress';
        }
        if (value === 'completed') {
            return 'completed';
        }
        if (value === 'cancelled') {
            return 'cancelled';
        }
        return 'pending';
    }

    function getStatusColor(status) {
        const value = String(status || '').toLowerCase();
        if (value === 'approved' || value === 'resolved' || value === 'completed') {
            return '#27ae60';
        }
        if (value === 'accepted') {
            return '#27ae60';
        }
        if (value === 'rejected' || value === 'critical' || value === 'cancelled') {
            return '#e74c3c';
        }
        if (value === 'in progress' || value === 'in-progress' || value === 'assigned' || value === 'insurance claimed') {
            return '#2563eb';
        }
        if (value === 'pending') {
            return '#f39c12';
        }
        return '#f39c12';
    }

    function getTicketStatusInfo(status) {
        const statusMap = {
            Open: { label: 'Pending', class: 'status-pending', text: 'Pending' },
            Pending: { label: 'Pending', class: 'status-pending', text: 'Pending' },
            Assigned: { label: 'Assigned', class: 'status-assigned', text: 'Assigned' },
            'Waiting for Budget Approval': { label: 'Awaiting Approval', class: 'status-in-progress', text: 'Awaiting Approval' },
            'Waiting for Spare Parts': { label: 'Awaiting Parts', class: 'status-in-progress', text: 'Awaiting Parts' },
            'Parts Approved': { label: 'Parts Approved', class: 'status-in-progress', text: 'Parts Approved' },
            'Parts Rejected': { label: 'Parts Rejected', class: 'status-rejected', text: 'Parts Rejected' },
            'Insurance Claimed': { label: 'Insurance Claimed', class: 'status-in-progress', text: 'Insurance Claimed' },
            'In Progress': { label: 'In Progress', class: 'status-in-progress', text: 'In Progress' },
            Resolved: { label: 'Resolved', class: 'status-resolved', text: 'Resolved' },
            Closed: { label: 'Closed', class: 'status-closed', text: 'Closed' },
        };

        return statusMap[status] || { label: status || 'Pending', class: 'status-pending', text: status || 'Pending' };
    }

    function getTicketUpdateText(status) {
        const updateMap = {
            Open: 'Awaiting supervisor review',
            Pending: 'Awaiting supervisor review',
            Assigned: 'Technician assigned to this ticket',
            'Waiting for Budget Approval': 'Budget report submitted and awaiting approval',
            'Waiting for Spare Parts': 'Waiting for spare parts to be approved',
            'Parts Approved': 'Spare parts approved, repair to begin soon',
            'Parts Rejected': 'Spare parts request was rejected and needs revision',
            'Insurance Claimed': 'Supervisor submitted this ticket to insurance claim workflow',
            'In Progress': 'Being investigated and repaired',
            Resolved: 'Work completed and ticket resolved',
            Closed: 'Ticket closed',
        };

        return updateMap[status] || 'No updates';
    }

    function normalizeTicketFilterStatus(status) {
        const value = String(status || '').toLowerCase();

        if (value === 'open' || value === 'pending') {
            return 'open';
        }

        if (value === 'assigned' || value === 'insurance claimed' || value.includes('progress') || value.includes('spare') || value.includes('parts') || value.includes('budget')) {
            return 'in-progress';
        }

        if (value === 'resolved' || value === 'finished' || value === 'completed') {
            return 'resolved';
        }

        if (value === 'closed') {
            return 'closed';
        }

        return value || 'open';
    }

    function formatDate(dateInput) {
        if (!dateInput) {
            return 'N/A';
        }

        const date = new Date(dateInput);
        if (Number.isNaN(date.getTime())) {
            return 'N/A';
        }

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    }

    function formatDateTime(dateInput) {
        if (!dateInput) {
            return 'N/A';
        }

        const date = new Date(dateInput);
        if (Number.isNaN(date.getTime())) {
            return 'N/A';
        }

        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatQuantity(value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) {
            return '0';
        }

        const fixed = numeric.toFixed(3);
        return fixed.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
    }

    function normalizeCargoItems(entity) {
        if (!entity || typeof entity !== 'object') {
            return [];
        }

        return Array.isArray(entity.cargo_items)
            ? entity.cargo_items
            : [];
    }

    function hasDangerousCargo(entity) {
        if (!entity || typeof entity !== 'object') {
            return false;
        }

        if (entity.has_dangerous_cargo === true || Number(entity.has_dangerous_cargo) === 1) {
            return true;
        }

        const items = normalizeCargoItems(entity);
        if (!items.length) {
            return false;
        }

        return items.some((item) => Number(item?.is_dangerous) === 1);
    }

    function buildCargoSummary(entity) {
        if (!entity || typeof entity !== 'object') {
            return '';
        }

        if (typeof entity.cargo_summary === 'string' && entity.cargo_summary.trim()) {
            return entity.cargo_summary.trim();
        }

        const items = normalizeCargoItems(entity);
        if (items.length) {
            return items.map((item) => {
                const name = String(item?.name || item?.cargo_item_id || 'Cargo Item').trim();
                const quantity = formatQuantity(item?.quantity);
                const unit = String(item?.unit || 'units').trim();
                const dangerSuffix = Number(item?.is_dangerous) === 1 ? ' [Dangerous]' : '';
                return `${name} (${quantity} ${unit})${dangerSuffix}`;
            }).join(', ');
        }

        if (typeof entity.cargo_description === 'string' && entity.cargo_description.trim()) {
            return entity.cargo_description.trim();
        }

        if (typeof entity.cargo === 'string' && entity.cargo.trim()) {
            return entity.cargo.trim();
        }

        return '';
    }

    function ensureTodayDefaults(root = document) {
        const today = new Date().toISOString().split('T')[0];
        root.querySelectorAll('input[type="date"]').forEach((input) => {
            if (!input.value) {
                input.value = today;
            }
        });

        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        const dateTimeValue = now.toISOString().slice(0, 16);
        root.querySelectorAll('input[type="datetime-local"]').forEach((input) => {
            if (!input.value) {
                input.value = dateTimeValue;
            }
        });
    }

    function closeOverflowMenus(root = document) {
        if (!root || typeof root.querySelectorAll !== 'function') {
            return;
        }

        root.querySelectorAll('.dropdown-menu.show').forEach((menu) => {
            menu.classList.remove('show');
        });
    }

    function toggleOverflowMenu(triggerEl, root = document) {
        const container = triggerEl?.closest('.dropdown-container');
        const menu = container?.querySelector('.dropdown-menu');

        if (!menu) {
            return;
        }

        const shouldOpen = !menu.classList.contains('show');
        closeOverflowMenus(root);

        if (shouldOpen) {
            menu.classList.add('show');
        }
    }

    function registerOverflowAutoClose(root) {
        const handler = (event) => {
            if (!root || root.contains(event.target)) {
                return;
            }

            closeOverflowMenus(root);
        };

        document.addEventListener('click', handler);

        return () => {
            document.removeEventListener('click', handler);
        };
    }

    window.DriverUtils = {
        store,
        emit,
        on,
        showToast,
        navigateTo,
        openModal,
        closeModal,
        setModalState,
        apiGet,
        apiPost,
        apiPostFormData,
        apiPut,
        apiDelete,
        normalizeApiList,
        getTripDisplayStatus,
        getTripFilterStatus,
        getStatusColor,
        getTicketStatusInfo,
        getTicketUpdateText,
        normalizeTicketFilterStatus,
        formatDate,
        formatDateTime,
        escapeHtml,
        formatQuantity,
        normalizeCargoItems,
        hasDangerousCargo,
        buildCargoSummary,
        ensureTodayDefaults,
        closeOverflowMenus,
        toggleOverflowMenu,
        registerOverflowAutoClose,
    };
})();
