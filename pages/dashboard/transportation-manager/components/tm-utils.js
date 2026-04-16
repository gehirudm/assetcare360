(function setupTransportationManagerUtils() {
    if (window.TMUtils) {
        return;
    }

    function formatDate(dateString) {
        if (!dateString) {
            return 'N/A';
        }

        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) {
            return 'N/A';
        }

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    function formatDateTime(dateString) {
        if (!dateString) {
            return '—';
        }
        return new Date(dateString).toLocaleString('en-LK', { 
            dateStyle: 'medium', 
            timeStyle: 'short' 
        });
    }

    function getStatusInfo(status) {
        const statusMap = {
            Pending: { label: 'Pending', class: 'status-pending', badge: 'badge-warn' },
            Accepted: { label: 'Accepted', class: 'status-accepted', badge: 'badge-ok' },
            Rejected: { label: 'Rejected', class: 'status-rejected', badge: 'badge-danger' },
            'In Progress': { label: 'In Progress', class: 'status-in-progress', badge: 'badge-blue' },
            Completed: { label: 'Completed', class: 'status-completed', badge: 'badge-ok' },
            Cancelled: { label: 'Cancelled', class: 'status-cancelled', badge: 'badge-danger' },
            Active: { label: 'Active', class: 'status-active', badge: 'badge-ok' },
            Inactive: { label: 'Inactive', class: 'status-inactive', badge: 'badge-danger' },
            'In Service': { label: 'In Service', class: 'status-service', badge: 'badge-warn' },
        };

        return statusMap[status] || { label: status || 'Unknown', class: 'status-unknown', badge: 'badge-muted' };
    }

    function emitToast(message, type) {
        document.dispatchEvent(new CustomEvent('tm-ui:toast', {
            detail: { message, type: type || 'success' },
        }));
    }

    function formatDistance(startOdometer, endOdometer) {
        if (startOdometer && endOdometer) {
            const distance = parseInt(endOdometer) - parseInt(startOdometer);
            return distance > 0 ? `${distance.toLocaleString()} km` : '—';
        }
        return '—';
    }

    function formatOdometer(value) {
        if (!value) return '—';
        return `${parseInt(value).toLocaleString()} km`;
    }

    function formatCurrency(value) {
        if (!value) return '—';
        return `Rs ${parseFloat(value).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
    }

    function formatVolume(value) {
        if (!value) return '—';
        return `${parseFloat(value).toFixed(2)} L`;
    }

    window.TMUtils = {
        formatDate,
        formatDateTime,
        getStatusInfo,
        emitToast,
        formatDistance,
        formatOdometer,
        formatCurrency,
        formatVolume,
    };
})();
