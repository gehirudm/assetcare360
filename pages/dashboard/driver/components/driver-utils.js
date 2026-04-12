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

        if (status === 'Pending') {
            return 'Pending';
        }

        return status;
    }

    function getTripFilterStatus(status) {
        const value = String(status || '').toLowerCase();
        if (value === 'pending' || value === 'ready') {
            return 'ready';
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
        return 'ready';
    }

    function getStatusColor(status) {
        const value = String(status || '').toLowerCase();
        if (value === 'approved' || value === 'resolved' || value === 'completed') {
            return '#27ae60';
        }
        if (value === 'rejected' || value === 'critical' || value === 'cancelled') {
            return '#e74c3c';
        }
        if (value === 'in progress' || value === 'in-progress' || value === 'assigned') {
            return '#2563eb';
        }
        return '#f39c12';
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
        apiPut,
        apiDelete,
        normalizeApiList,
        getTripDisplayStatus,
        getTripFilterStatus,
        getStatusColor,
        formatDate,
        formatDateTime,
        ensureTodayDefaults,
    };
})();
