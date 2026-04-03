let currentUser = null;
let tripLogs = [];
let fuelLogs = [];
let tripFilter = 'all';
let fuelFilter = 'all';
let tripSearch = '';
let fuelSearch = '';

document.addEventListener('DOMContentLoaded', async function () {
    try {
        showLoading(true);

        currentUser = await DashboardInit.init(['Transportation Manager', 'Admin'], {
            updateUserDisplay: true
        });

        if (!currentUser) {
            return;
        }

        initializeNavigation();
        initializeFiltersAndSearch();
        await Promise.all([loadTripLogs(), loadFuelLogs()]);
        updateSummaryCards();

        showLoading(false);
    } catch (error) {
        console.error('Transportation dashboard init failed:', error);
        Utils.showToast('Failed to initialize dashboard', 'error');
        showLoading(false);
    }
});

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.toggle('active', show);
    }
}

function initializeFiltersAndSearch() {
    const tripSearchInput = document.getElementById('tripSearchInput');
    const fuelSearchInput = document.getElementById('fuelSearchInput');

    if (tripSearchInput) {
        tripSearchInput.addEventListener('input', (e) => {
            tripSearch = String(e.target.value || '').trim().toLowerCase();
            renderTripLogs();
        });
    }

    if (fuelSearchInput) {
        fuelSearchInput.addEventListener('input', (e) => {
            fuelSearch = String(e.target.value || '').trim().toLowerCase();
            renderFuelLogs();
        });
    }
}

function setTripFilter(value, event) {
    tripFilter = value;
    const parent = document.getElementById('tripFilters');
    if (parent) {
        parent.querySelectorAll('.filter-btn').forEach((btn) => btn.classList.remove('active'));
    }
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
    renderTripLogs();
}

function setFuelFilter(value, event) {
    fuelFilter = value;
    const parent = document.getElementById('fuelFilters');
    if (parent) {
        parent.querySelectorAll('.filter-btn').forEach((btn) => btn.classList.remove('active'));
    }
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
    renderFuelLogs();
}

function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach((item) => {
        item.addEventListener('click', () => {
            navItems.forEach((n) => n.classList.remove('active'));
            item.classList.add('active');

            const sectionId = item.getAttribute('data-section');
            document.querySelectorAll('.content-section').forEach((section) => {
                section.classList.remove('active');
            });

            const section = document.getElementById(sectionId);
            if (section) {
                section.classList.add('active');
            }
        });
    });
}

document.addEventListener('click', (event) => {
    const modal = document.getElementById('detailsModal');
    if (modal && event.target === modal) {
        closeDetailModal();
    }
});

function navigateTo(sectionId) {
    const navItem = document.querySelector(`[data-section="${sectionId}"]`);
    if (navItem) {
        navItem.click();
    }
}

async function loadTripLogs() {
    try {
        const res = await API.get('/trips');
        tripLogs = (res && res.success && res.data && res.data.trips) ? res.data.trips : [];
        renderTripLogs();
    } catch (error) {
        console.error('Failed to load trip logs:', error);
        tripLogs = [];
        renderTripLogs();
    }
}

async function loadFuelLogs() {
    try {
        const res = await API.get('/fuel-logs?limit=200');
        fuelLogs = (res && res.success && res.data && res.data.fuel_logs) ? res.data.fuel_logs : [];
        renderFuelLogs();
    } catch (error) {
        console.error('Failed to load fuel logs:', error);
        fuelLogs = [];
        renderFuelLogs();
    }
}

function updateSummaryCards() {
    const totalTrips = tripLogs.length;
    const inProgress = tripLogs.filter((trip) => String(trip.status).toLowerCase() === 'in progress').length;
    const completed = tripLogs.filter((trip) => String(trip.status).toLowerCase() === 'completed').length;

    document.getElementById('summary-total-trips').textContent = totalTrips;
    document.getElementById('summary-in-progress').textContent = inProgress;
    document.getElementById('summary-completed').textContent = completed;
    document.getElementById('summary-fuel-logs').textContent = fuelLogs.length;

    renderRecentActivities();
    renderDashboardBoxes();
}

function renderDashboardBoxes() {
    const tripBox = document.getElementById('dashboardTripBox');
    const fuelBox = document.getElementById('dashboardFuelBox');

    if (tripBox) {
        const recentTrips = [...tripLogs]
            .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
            .slice(0, 5);

        if (!recentTrips.length) {
            tripBox.innerHTML = '<div class="empty-message">No recent trip logs found.</div>';
        } else {
            tripBox.innerHTML = recentTrips.map((trip) => `
                <div class="dashboard-list-item">
                    <div class="dashboard-list-title">${trip.trip_id || 'N/A'} • ${trip.origin || 'N/A'} -> ${trip.destination || 'N/A'}</div>
                    <div class="dashboard-list-meta">${trip.vehicle_registration || 'N/A'} • ${trip.status || 'Pending'} • ${formatDateTime(trip.updated_at || trip.created_at)}</div>
                </div>
            `).join('');
        }
    }

    if (fuelBox) {
        const recentFuel = [...fuelLogs]
            .sort((a, b) => new Date(b.log_datetime || b.created_at || 0).getTime() - new Date(a.log_datetime || a.created_at || 0).getTime())
            .slice(0, 5);

        if (!recentFuel.length) {
            fuelBox.innerHTML = '<div class="empty-message">No recent fuel logs found.</div>';
        } else {
            fuelBox.innerHTML = recentFuel.map((log) => `
                <div class="dashboard-list-item">
                    <div class="dashboard-list-title">${log.fuel_log_id || 'N/A'} • ${log.station_name || 'N/A'}</div>
                    <div class="dashboard-list-meta">${log.vehicle_registration || 'N/A'} • ${Number(log.total_cost || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} • ${formatDateTime(log.log_datetime || log.created_at)}</div>
                </div>
            `).join('');
        }
    }
}

function renderRecentActivities() {
    const container = document.getElementById('transportActivitiesList');
    if (!container) {
        return;
    }

    const tripEvents = tripLogs.map((trip) => ({
        type: 'trip',
        id: trip.trip_id || 'N/A',
        title: `Trip ${trip.trip_id || 'N/A'}: ${trip.origin || 'N/A'} -> ${trip.destination || 'N/A'}`,
        subtitle: `${trip.vehicle_registration || 'N/A'} • ${trip.status || 'Pending'}`,
        date: trip.updated_at || trip.created_at || null
    }));

    const fuelEvents = fuelLogs.map((log) => ({
        type: 'fuel',
        id: log.fuel_log_id || 'N/A',
        title: `Fuel ${log.fuel_log_id || 'N/A'} at ${log.station_name || 'N/A'}`,
        subtitle: `${log.vehicle_registration || 'N/A'} • ${Number(log.total_cost || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`,
        date: log.log_datetime || log.created_at || null
    }));

    const events = [...tripEvents, ...fuelEvents]
        .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
        .slice(0, 6);

    if (!events.length) {
        container.innerHTML = '<div class="empty-message">No recent transportation activities found.</div>';
        return;
    }

    container.innerHTML = events.map((event) => `
        <div class="activity-item">
            <div class="activity-main">
                <div class="activity-title"><i class="fas ${event.type === 'trip' ? 'fa-route' : 'fa-gas-pump'}"></i> ${event.title}</div>
                <div class="activity-meta">${event.subtitle} • ${formatDateTime(event.date)}</div>
            </div>
            <span class="status-pill ${event.type === 'trip' ? 'status-progress' : 'status-completed'}">${event.type.toUpperCase()}</span>
        </div>
    `).join('');
}

function renderTripLogs() {
    const tbody = document.getElementById('tripLogsBody');
    const empty = document.getElementById('tripLogsEmpty');

    if (!tbody || !empty) {
        return;
    }

    tbody.innerHTML = '';

    const filteredTrips = tripLogs.filter((trip) => {
        const status = String(trip.status || '').toLowerCase();
        const searchable = `${trip.trip_id || ''} ${trip.origin || ''} ${trip.destination || ''} ${trip.vehicle_registration || ''}`.toLowerCase();
        const statusMatch = tripFilter === 'all' || status === tripFilter;
        const searchMatch = !tripSearch || searchable.includes(tripSearch);
        return statusMatch && searchMatch;
    });

    if (!filteredTrips.length) {
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';

    filteredTrips.forEach((trip) => {
        const status = String(trip.status || 'Pending');
        const statusClass = getStatusClass(status);
        const tripId = trip.id || trip.trip_id;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${trip.trip_id || 'N/A'}</td>
            <td>${trip.origin || 'N/A'} → ${trip.destination || 'N/A'}</td>
            <td>${trip.vehicle_registration || 'N/A'}</td>
            <td><span class="status-pill ${statusClass}">${status}</span></td>
            <td>${formatNumber(trip.starting_odometer)}</td>
            <td>${trip.final_odometer ? formatNumber(trip.final_odometer) : 'N/A'}</td>
            <td>${formatDateTime(trip.updated_at || trip.created_at)}</td>
            <td class="actions-cell">
                <button class="btn btn-primary btn-small" type="button" onclick="viewTripDetails('${String(tripId || '').replace(/'/g, "&#39;")}')">
                    <i class="fas fa-eye"></i> VIEW
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });
}

function renderFuelLogs() {
    const tbody = document.getElementById('fuelLogsBody');
    const empty = document.getElementById('fuelLogsEmpty');

    if (!tbody || !empty) {
        return;
    }

    tbody.innerHTML = '';

    const filteredFuelLogs = fuelLogs.filter((log) => {
        const type = String(log.fuel_type || '').toLowerCase();
        const searchable = `${log.fuel_log_id || ''} ${log.vehicle_registration || ''} ${log.station_name || ''} ${log.fuel_type || ''}`.toLowerCase();
        const typeMatch = fuelFilter === 'all' || type === fuelFilter;
        const searchMatch = !fuelSearch || searchable.includes(fuelSearch);
        return typeMatch && searchMatch;
    });

    if (!filteredFuelLogs.length) {
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';

    filteredFuelLogs.forEach((log) => {
        const logId = log.id || log.fuel_log_id;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${log.fuel_log_id || 'N/A'}</td>
            <td>${log.vehicle_registration || 'N/A'}</td>
            <td>${formatDateTime(log.log_datetime || log.created_at)}</td>
            <td>${log.station_name || 'N/A'}</td>
            <td>${log.fuel_type || 'N/A'}</td>
            <td>${Number(log.fuel_volume || 0).toFixed(2)}</td>
            <td>${Number(log.total_cost || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
            <td>${formatNumber(log.odometer_reading)}</td>
            <td class="actions-cell">
                <button class="btn btn-primary btn-small" type="button" onclick="viewFuelLogDetails('${String(logId || '').replace(/'/g, "&#39;")}')">
                    <i class="fas fa-eye"></i> VIEW
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });
}

function getByIdOrCode(collection, idValue, keyA, keyB) {
    const idText = String(idValue);
    return collection.find((item) => String(item[keyA]) === idText || String(item[keyB]) === idText);
}

function createDetailItem(label, value) {
    return `
        <div class="detail-item">
            <div class="detail-label">${label}</div>
            <div class="detail-value">${value !== undefined && value !== null && value !== '' ? value : 'N/A'}</div>
        </div>
    `;
}

function openDetailModal(title, detailsHtml) {
    const modal = document.getElementById('detailsModal');
    const modalTitle = document.getElementById('detailModalTitle');
    const modalBody = document.getElementById('detailModalBody');

    if (!modal || !modalTitle || !modalBody) {
        return;
    }

    modalTitle.textContent = title;
    modalBody.innerHTML = `<div class="detail-grid">${detailsHtml}</div>`;
    modal.style.display = 'flex';
    requestAnimationFrame(() => {
        modal.classList.add('active');
    });
}

function closeDetailModal() {
    const modal = document.getElementById('detailsModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            if (!modal.classList.contains('active')) {
                modal.style.display = 'none';
            }
        }, 250);
    }
}

function viewTripDetails(idValue) {
    const trip = getByIdOrCode(tripLogs, idValue, 'id', 'trip_id');
    if (!trip) {
        Utils.showToast('Trip details not found', 'error');
        return;
    }

    const detailsHtml = [
        createDetailItem('Trip ID', trip.trip_id),
        createDetailItem('Driver', trip.driver_name || trip.driver_id),
        createDetailItem('Vehicle', trip.vehicle_registration),
        createDetailItem('Route', `${trip.origin || 'N/A'} → ${trip.destination || 'N/A'}`),
        createDetailItem('Purpose', trip.purpose),
        createDetailItem('Status', trip.status),
        createDetailItem('Start Odometer', formatNumber(trip.starting_odometer)),
        createDetailItem('Final Odometer', formatNumber(trip.final_odometer)),
        createDetailItem('Start Date', formatDateTime(trip.start_date || trip.created_at)),
        createDetailItem('End Date', formatDateTime(trip.end_date)),
        createDetailItem('Created At', formatDateTime(trip.created_at)),
        createDetailItem('Updated At', formatDateTime(trip.updated_at))
    ].join('');

    openDetailModal('Trip Log Details', detailsHtml);
}

function viewFuelLogDetails(idValue) {
    const log = getByIdOrCode(fuelLogs, idValue, 'id', 'fuel_log_id');
    if (!log) {
        Utils.showToast('Fuel log details not found', 'error');
        return;
    }

    const detailsHtml = [
        createDetailItem('Fuel Log ID', log.fuel_log_id),
        createDetailItem('Driver', log.driver_name || log.driver_id),
        createDetailItem('Vehicle', log.vehicle_registration),
        createDetailItem('Date Time', formatDateTime(log.log_datetime || log.created_at)),
        createDetailItem('Station Name', log.station_name),
        createDetailItem('Station Location', log.station_location),
        createDetailItem('Fuel Type', log.fuel_type),
        createDetailItem('Fuel Volume (L)', Number(log.fuel_volume || 0).toFixed(2)),
        createDetailItem('Price Per Unit', Number(log.price_per_unit || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })),
        createDetailItem('Total Cost', Number(log.total_cost || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })),
        createDetailItem('Odometer', formatNumber(log.odometer_reading)),
        createDetailItem('Payment Method', log.payment_method),
        createDetailItem('Receipt Number', log.receipt_number),
        createDetailItem('Notes', log.notes),
        createDetailItem('Created At', formatDateTime(log.created_at))
    ].join('');

    openDetailModal('Fuel Log Details', detailsHtml);
}

function getStatusClass(status) {
    const value = String(status).toLowerCase();

    if (value === 'in progress') {
        return 'status-progress';
    }

    if (value === 'completed') {
        return 'status-completed';
    }

    if (value === 'cancelled') {
        return 'status-cancelled';
    }

    return 'status-pending';
}

function formatDateTime(value) {
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

function formatNumber(value) {
    if (value === null || value === undefined || value === '') {
        return 'N/A';
    }

    const num = Number(value);
    if (!Number.isFinite(num)) {
        return String(value);
    }

    return num.toLocaleString('en-US');
}

async function refreshTransportData() {
    showLoading(true);
    await Promise.all([loadTripLogs(), loadFuelLogs()]);
    updateSummaryCards();
    showLoading(false);
    Utils.showToast('Transportation data refreshed', 'success');
}
