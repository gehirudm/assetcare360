// Navigation functionality
function navigateTo(sectionId) {
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));

    // Find and activate the corresponding nav item
    const navItem = document.querySelector(`[data-section="${sectionId}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }

    // Show the corresponding section
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
    }
}

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function () {
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));

        this.classList.add('active');

        const sectionId = this.getAttribute('data-section');
        document.getElementById(sectionId).classList.add('active');
    });
});

// Modal functionality
function openModal(modalId, data = null) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = '';
        modal.classList.add('active');

        // Pre-populate data if provided
        if (data && modalId === 'breakdownModal') {
            const vehicleInput = modal.querySelector('input[readonly]');
            if (vehicleInput) {
                vehicleInput.value = data;
            }
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
        document.body.style.overflow = '';
        // Remove dynamically created modals
        if (modalId.startsWith('detailsModal_') || modalId.startsWith('dynamic')) {
            setTimeout(() => modal.remove(), 300);
        }
    }
}

// Dropdown menu toggle
function toggleDropdown(event, dropdownId) {
    event.stopPropagation();
    const dropdown = document.getElementById('dropdown-' + dropdownId);
    const allDropdowns = document.querySelectorAll('.dropdown-menu');

    // Close all other dropdowns
    allDropdowns.forEach(d => {
        if (d !== dropdown) {
            d.classList.remove('show');
        }
    });

    // Toggle current dropdown
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Close dropdowns when clicking outside
document.addEventListener('click', function (e) {
    if (!e.target.closest('.dropdown-container')) {
        document.querySelectorAll('.dropdown-menu').forEach(dropdown => {
            dropdown.classList.remove('show');
        });
    }
});

// Toast notification
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.display = 'block';

    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Vehicle actions
function reportBreakdown(vehicleId) {
    openModal('breakdownModal', vehicleId);
}

function vehicleCheck(vehicleId) {
    openModal('dailyCheckModal', vehicleId);
}

// Trip workflow functions
function startTripConfirm(tripId) {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateString = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    if (confirm(`Start trip ${tripId} now?\nStart Time: ${timeString}\nDate: ${dateString}`)) {
        startTripInProgress(tripId, timeString);
    }
}

function startTripInProgress(tripId, startTime) {
    const tripElement = document.getElementById(`trip-${tripId}`);
    const statusElement = document.getElementById(`trip-${tripId}-status`);
    const badgeElement = document.getElementById(`trip-${tripId}-badge`);
    const actionsElement = document.getElementById(`trip-${tripId}-actions`);
    const distanceElement = document.getElementById(`trip-${tripId}-distance`);

    // Update data-status for filtering
    tripElement.setAttribute('data-status', 'in-progress');

    // Update status text
    statusElement.textContent = `Status: In Progress | Started: ${startTime}`;

    // Update distance display
    distanceElement.textContent = `Distance: In Progress | Started: ${startTime}`;

    // Update badge
    badgeElement.className = 'status-badge status-processing';
    badgeElement.textContent = 'In Progress';

    // Update button
    actionsElement.innerHTML = `
        <span class="status-badge status-processing" id="trip-${tripId}-badge">In Progress</span>
        <button class="btn btn-success btn-small" onclick="completeTripConfirm('${tripId}', '${startTime}')">Done</button>
    `;

    // Update trip item styling
    tripElement.className = 'inventory-item';

    showToast(`Trip ${tripId} started at ${startTime}!`);

    // Store start time in data attribute
    tripElement.setAttribute('data-start-time', startTime);

    // Update global trip data
    if (window.allTripsData && window.allTripsData[tripId]) {
        window.allTripsData[tripId].startTime = startTime;
        window.allTripsData[tripId].status = 'In Progress';
    }
}

function completeTripConfirm(tripId, startTime) {
    const now = new Date();
    const endTimeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    if (confirm(`Complete trip ${tripId}?\nStart Time: ${startTime}\nEnd Time: ${endTimeString}`)) {
        completeTripFinished(tripId, startTime, endTimeString);
    }
}

function completeTripFinished(tripId, startTime, endTime) {
    const tripElement = document.getElementById(`trip-${tripId}`);
    const statusElement = document.getElementById(`trip-${tripId}-status`);
    const badgeElement = document.getElementById(`trip-${tripId}-badge`);
    const actionsElement = document.getElementById(`trip-${tripId}-actions`);
    const distanceElement = document.getElementById(`trip-${tripId}-distance`);

    // Calculate duration (simplified - for display purposes)
    const duration = 'Completed';

    // Update data-status for filtering
    tripElement.setAttribute('data-status', 'completed');

    // Update status text
    statusElement.textContent = `Start: ${startTime} | End: ${endTime}`;

    // Update distance display
    distanceElement.textContent = `Distance: Completed | Duration: ${startTime} - ${endTime}`;

    // Update badge
    badgeElement.className = 'status-badge status-complete';
    badgeElement.textContent = 'Completed';

    // Update button
    actionsElement.innerHTML = `
        <span class="status-badge status-complete" id="trip-${tripId}-badge">Completed</span>
        <button class="btn btn-secondary btn-small" onclick="viewTripDetails('${tripId}')">View Details</button>
    `;

    // Update trip item styling
    tripElement.className = 'inventory-item';

    showToast(`Trip ${tripId} completed successfully!`);

    // Update global trip data
    if (window.allTripsData && window.allTripsData[tripId]) {
        window.allTripsData[tripId].endTime = endTime;
        window.allTripsData[tripId].status = 'Completed';
    }
}

function startTrip(tripId) {
    // Legacy function - redirects to new function
    startTripConfirm(tripId);
}

function viewTripDetails(tripId) {
    // Initialize global trip data if not exists
    if (!window.allTripsData) {
        window.allTripsData = {
            'TRP-001': {
                id: 'TRP-001',
                route: 'Colombo → Kandy',
                date: 'Aug 25, 2024',
                distance: '125 km',
                duration: '3h 15m',
                startTime: '08:30 AM',
                endTime: '11:45 AM',
                status: 'Completed',
                odometer: '45105',
                cargo: 'General goods'
            },
            'TRP-002': {
                id: 'TRP-002',
                route: 'Kandy → Galle',
                date: 'Aug 25, 2024',
                distance: '95 km',
                duration: '3h 30m',
                startTime: '01:00 PM',
                endTime: '04:30 PM',
                status: 'Completed',
                odometer: '45230',
                cargo: 'Construction materials'
            },
            'TRP-003': {
                id: 'TRP-003',
                route: 'Galle → Colombo',
                date: 'Aug 25, 2024',
                distance: '0 km',
                duration: '2h 30m (Estimated)',
                startTime: 'Not started',
                endTime: 'Not completed',
                status: 'Ready',
                odometer: '45230',
                cargo: 'Electronics'
            }
        };
    }

    const trip = window.allTripsData[tripId];

    if (!trip) {
        showToast(`Trip data for ${tripId} not found`);
        return;
    }

    // Create modal with trip details
    const modal = createDetailsModal('Trip Details', `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div>
                <strong>Trip ID:</strong>
                <p>${trip.id}</p>
            </div>
            <div>
                <strong>Status:</strong>
                <p><span class="status-text status-${trip.status === 'Completed' ? 'completed' : 'pending'}">${trip.status}</span></p>
            </div>
            <div>
                <strong>Route:</strong>
                <p>${trip.route}</p>
            </div>
            <div>
                <strong>Date:</strong>
                <p>${trip.date}</p>
            </div>
            <div>
                <strong>Distance:</strong>
                <p>${trip.distance}</p>
            </div>
            <div>
                <strong>Duration:</strong>
                <p>${trip.duration}</p>
            </div>
            <div>
                <strong>Start Time:</strong>
                <p>${trip.startTime}</p>
            </div>
            <div>
                <strong>End Time:</strong>
                <p>${trip.endTime}</p>
            </div>
            <div>
                <strong>Odometer:</strong>
                <p>${trip.odometer} km</p>
            </div>
            <div>
                <strong>Cargo:</strong>
                <p>${trip.cargo}</p>
            </div>
        </div>
    `);

    document.body.appendChild(modal);
    setTimeout(() => openModal(modal.id), 10);
}

function createDetailsModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'detailsModal_' + Date.now();

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${title}</h2>
                <button class="btn-close" onclick="closeModal('${modal.id}')">&times;</button>
            </div>
            <div class="form-section">
                ${content}
            </div>
            <button class="btn btn-secondary" onclick="closeModal('${modal.id}')"><i class="fas fa-times"></i> Close</button>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Trigger animation
    setTimeout(() => {
        modal.style.display = 'flex';
    }, 10);

    return modal;
}

async function viewCheckDetails(checkId) {
    // Try from local cache first, then fetch from API
    let check = window.allChecksData ? window.allChecksData[checkId] : null;

    if (!check) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/vehicle-checks/${checkId}?id=${checkId}`);
            const result = await response.json();

            if (result.success && result.data) {
                const d = result.data;
                const weekStart = new Date(d.week_start_date);
                const weekEnd = new Date(d.week_end_date);
                const formatDate = (date) => {
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return `${months[date.getMonth()]} ${date.getDate()}`;
                };

                let statusText = d.status === 'approved' ? 'APPROVED' : d.status === 'rejected' ? 'REJECTED' : 'PENDING REVIEW';

                check = {
                    id: d.check_id,
                    vehicle: d.vehicle_registration,
                    weekRange: `Week of ${formatDate(weekStart)} - ${formatDate(weekEnd)}`,
                    odometer: `${d.odometer_reading.toLocaleString()} km`,
                    status: statusText,
                    notes: d.notes || 'Submitted - Awaiting supervisor review.',
                    rejection: d.rejection_reason
                };
            }
        } catch (error) {
            console.error('Error fetching check details:', error);
        }
    }

    if (!check) {
        showToast(`Check ${checkId} not found`);
        return;
    }

    // Populate modal
    document.getElementById('detail-check-id').textContent = check.id;
    document.getElementById('detail-check-vehicle').textContent = check.vehicle;
    document.getElementById('detail-check-submitted').textContent = check.submitted || check.weekRange || 'N/A';
    document.getElementById('detail-check-odometer').textContent = check.odometer || 'N/A';
    document.getElementById('detail-check-notes').textContent = check.notes || 'Submitted - Awaiting supervisor review.';

    // Update status badge
    const statusBadge = document.getElementById('detail-check-status');
    statusBadge.textContent = check.status;

    if (check.status === 'APPROVED' || check.status === 'Approved') {
        statusBadge.style.backgroundColor = '#27ae60';
    } else if (check.status === 'REJECTED' || check.status === 'Rejected') {
        statusBadge.style.backgroundColor = '#e74c3c';
    } else {
        statusBadge.style.backgroundColor = '#f39c12';
    }

    // Show/hide rejection section
    const rejectionSection = document.getElementById('detail-check-rejection-section');
    if (check.rejection) {
        rejectionSection.style.display = 'block';
        document.getElementById('detail-check-rejection').textContent = check.rejection;
    } else {
        rejectionSection.style.display = 'none';
    }

    // Open modal
    openModal('checkDetailsModal');
}

function trackBreakdown(breakdownId) {
    // Get the breakdown element to check its type
    const breakdownElement = document.getElementById(`breakdown-${breakdownId}`);
    if (!breakdownElement) {
        showToast(`Breakdown ${breakdownId} not found`);
        return;
    }

    const breakdownType = breakdownElement.getAttribute('data-type');

    // If it's a regular breakdown, show technician tracking
    if (breakdownType === 'breakdown') {
        openModal('technicianTrackingModal');
    }
    // If it's an in-route breakdown, show nearby garages
    else if (breakdownType === 'in-route') {
        openModal('nearbyGaragesModal');
    }
}

function completeBreakdown(breakdownId) {
    document.getElementById('completeBreakdownId').value = breakdownId;
    document.getElementById('breakdownIdDisplay').value = breakdownId;
    openModal('completeBreakdownModal');
}

document.getElementById('completeBreakdownForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const breakdownId = document.getElementById('completeBreakdownId').value;
    const budget = document.getElementById('repairBudget').value;
    const garage = document.getElementById('garageName').value;
    const notes = document.getElementById('completionNotes').value;
    const invoice = document.getElementById('invoiceNumber').value;

    // Find the breakdown item and move it to resolved
    const breakdownItem = document.getElementById(`breakdown-${breakdownId}`);
    if (breakdownItem) {
        // Update status to resolved
        breakdownItem.setAttribute('data-status', 'resolved');

        // Update status badge
        const statusBadge = breakdownItem.querySelector('.status-badge');
        statusBadge.className = 'status-badge status-resolved';
        statusBadge.textContent = 'Resolved';

        // Remove the Complete button
        const completeBtn = breakdownItem.querySelector('button[onclick*="completeBreakdown"]');
        if (completeBtn) {
            completeBtn.remove();
        }

        // Add budget info to the meta
        const ticketMeta = breakdownItem.querySelector('.ticket-meta:last-child');
        if (ticketMeta) {
            ticketMeta.innerHTML = `Location: Matara Road | Trip: TRP-002 | Repair Cost: LKR ${parseFloat(budget).toLocaleString()}${garage ? ' | Garage: ' + garage : ''}`;
        }
    }

    showToast(`Breakdown ${breakdownId} marked as resolved! Budget: LKR ${parseFloat(budget).toLocaleString()}`);
    closeModal('completeBreakdownModal');
    this.reset();
});

function viewFuelDetails(fuelId) {
    // Sample fuel log data
    const fuelData = {
        'BR-001': {
            id: 'BR-001',
            status: 'Assigned',
            date: 'Aug 24, 2024',
            time: '10:15 AM',
            vehicle: 'LKA-1234',
            location: 'Galle Road, Near Hikkaduwa',
            trip: 'TRP-002',
            issue: 'Engine overheating',
            description: 'Engine temperature gauge showing red. Steam visible from hood. Unusual smell detected. Engine making knocking sounds.',
            priority: 'High',
            technician: 'T. Perera',
            techContact: '+94 77 123 4567',
            techETA: '20 minutes',
            estimatedCost: 'LKR 15,000 - 25,000'
        },
        'BR-002': {
            id: 'BR-002',
            status: 'In Progress',
            date: 'Aug 25, 2024',
            time: '09:30 AM',
            vehicle: 'LKA-1234',
            location: 'Matara Road',
            trip: 'TRP-002',
            issue: 'Tire damage',
            description: 'Front right tire punctured. Visible nail in tire. Unable to continue journey safely.',
            priority: 'Medium',
            technician: 'K. Silva',
            techContact: '+94 71 987 6543',
            techETA: 'On site',
            estimatedCost: 'LKR 5,000 - 8,000'
        },
        'BR-003': {
            id: 'BR-003',
            status: 'Completed',
            date: 'Aug 23, 2024',
            time: '02:45 PM',
            vehicle: 'LKA-1234',
            location: 'Colombo-Kandy Road',
            trip: 'TRP-001',
            issue: 'Electrical problem',
            description: 'Dashboard lights flickering. Battery warning light on. Alternator suspected.',
            priority: 'High',
            technician: 'R. Fernando',
            techContact: '+94 76 555 1234',
            techETA: 'Completed',
            actualCost: 'LKR 18,500',
            resolution: 'Alternator replaced. Battery tested and found to be good. All electrical systems now functioning normally.'
        }
    };

    const breakdown = breakdownData[breakdownId];
    if (!breakdown) {
        showToast(`Breakdown ${breakdownId} not found`, 'error');
        return;
    }

    // Build status badge
    let statusClass = 'status-pending';
    if (breakdown.status === 'In Progress') statusClass = 'status-in-progress';
    if (breakdown.status === 'Completed') statusClass = 'status-completed';
    if (breakdown.status === 'Assigned') statusClass = 'status-assigned';

    // Build priority badge
    let priorityClass = 'priority-medium';
    if (breakdown.priority === 'High') priorityClass = 'priority-high';
    if (breakdown.priority === 'Low') priorityClass = 'priority-low';

    const content = `
        <div style="display: grid; gap: 20px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                <div>
                    <div style="color: #6c757d; font-size: 0.875rem; margin-bottom: 5px;">Breakdown ID</div>
                    <div style="font-weight: 600; font-size: 1.1rem;">${breakdown.id}</div>
                </div>
                <div>
                    <div style="color: #6c757d; font-size: 0.875rem; margin-bottom: 5px;">Status</div>
                    <div><span class="status-text ${statusClass}">${breakdown.status}</span></div>
                </div>
                <div>
                    <div style="color: #6c757d; font-size: 0.875rem; margin-bottom: 5px;">Date</div>
                    <div style="font-weight: 500;">${breakdown.date}</div>
                </div>
                <div>
                    <div style="color: #6c757d; font-size: 0.875rem; margin-bottom: 5px;">Time</div>
                    <div style="font-weight: 500;">${breakdown.time}</div>
                </div>
            </div>
            
            <div style="padding: 20px; background: #f8f9fa; border-radius: 8px;">
                <h4 style="margin: 0 0 15px 0; color: #2563eb;"><i class="fas fa-exclamation-circle"></i> Issue Details</h4>
                <div style="display: grid; gap: 12px;">
                    <div>
                        <div style="color: #6c757d; font-size: 0.875rem; margin-bottom: 5px;">Vehicle</div>
                        <div style="font-weight: 500;">${breakdown.vehicle}</div>
                    </div>
                    <div>
                        <div style="color: #6c757d; font-size: 0.875rem; margin-bottom: 5px;">Location</div>
                        <div style="font-weight: 500;">${breakdown.location}</div>
                    </div>
                    <div>
                        <div style="color: #6c757d; font-size: 0.875rem; margin-bottom: 5px;">Related Trip</div>
                        <div style="font-weight: 500;">${breakdown.trip}</div>
                    </div>
                    <div>
                        <div style="color: #6c757d; font-size: 0.875rem; margin-bottom: 5px;">Issue Type</div>
                        <div style="font-weight: 600; color: #dc3545;">${breakdown.issue}</div>
                    </div>
                    <div>
                        <div style="color: #6c757d; font-size: 0.875rem; margin-bottom: 5px;">Priority</div>
                        <div><span class="status-text ${priorityClass}">${breakdown.priority}</span></div>
                    </div>
                    <div>
                        <div style="color: #6c757d; font-size: 0.875rem; margin-bottom: 5px;">Description</div>
                        <div style="padding: 10px; background: white; border-radius: 6px; border-left: 3px solid #dc3545;">${breakdown.description}</div>
                    </div>
                </div>
            </div>
            
            <div style="padding: 20px; background: #f8f9fa; border-radius: 8px;">
                <h4 style="margin: 0 0 15px 0; color: #2563eb;"><i class="fas fa-user-cog"></i> Technician Information</h4>
                <div style="display: grid; gap: 12px;">
                    <div>
                        <div style="color: #6c757d; font-size: 0.875rem; margin-bottom: 5px;">Assigned Technician</div>
                        <div style="font-weight: 600;">${breakdown.technician}</div>
                    </div>
                    <div>
                        <div style="color: #6c757d; font-size: 0.875rem; margin-bottom: 5px;">Contact Number</div>
                        <div style="font-weight: 500;"><i class="fas fa-phone"></i> ${breakdown.techContact}</div>
                    </div>
                    <div>
                        <div style="color: #6c757d; font-size: 0.875rem; margin-bottom: 5px;">ETA</div>
                        <div style="font-weight: 500; color: ${breakdown.techETA === 'On site' ? '#28a745' : '#ff9800'};"><i class="fas fa-clock"></i> ${breakdown.techETA}</div>
                    </div>
                </div>
            </div>
            
            <div style="padding: 20px; background: #f8f9fa; border-radius: 8px;">
                <h4 style="margin: 0 0 15px 0; color: #2563eb;"><i class="fas fa-dollar-sign"></i> Cost Information</h4>
                <div style="display: grid; gap: 12px;">
                    ${breakdown.actualCost ? `
                        <div>
                            <div style="color: #6c757d; font-size: 0.875rem; margin-bottom: 5px;">Actual Cost</div>
                            <div style="font-weight: 600; font-size: 1.1rem; color: #28a745;">${breakdown.actualCost}</div>
                        </div>
                    ` : `
                        <div>
                            <div style="color: #6c757d; font-size: 0.875rem; margin-bottom: 5px;">Estimated Cost</div>
                            <div style="font-weight: 600; font-size: 1.1rem; color: #ff9800;">${breakdown.estimatedCost}</div>
                        </div>
                    `}
                </div>
            </div>
            
            ${breakdown.resolution ? `
                <div style="padding: 20px; background: #d4edda; border-radius: 8px; border-left: 4px solid #28a745;">
                    <h4 style="margin: 0 0 10px 0; color: #155724;"><i class="fas fa-check-circle"></i> Resolution</h4>
                    <div style="color: #155724;">${breakdown.resolution}</div>
                </div>
            ` : ''}
        </div>
    `;

    createDetailsModal(`<i class="fas fa-tools"></i> Breakdown Details - ${breakdownId}`, content);
}

function viewFuelDetails(fuelId) {
    // Sample fuel log data
    const fuelData = {
        'FL-001': {
            id: 'FL-001',
            date: 'Aug 25, 2024',
            time: '08:30 AM',
            vehicle: 'LKA-1234',
            station: 'Shell - Galle Road',
            location: 'Colombo 03',
            fuelType: 'Diesel',
            quantity: '45 liters',
            pricePerLiter: 'LKR 280',
            totalCost: 'LKR 12,600',
            odometerBefore: '45,010 km',
            odometerAfter: '45,230 km',
            distanceCovered: '220 km',
            fuelEfficiency: '4.89 km/L',
            paymentMethod: 'Company Card',
            receiptNumber: 'SH-2024-08-1234',
            attendant: 'Kasun Perera',
            notes: 'Regular refuel during Colombo-Kandy route. Tank filled to 95% capacity.',
            trip: 'TRP-001'
        },
        'FL-002': {
            id: 'FL-002',
            date: 'Aug 23, 2024',
            time: '02:15 PM',
            vehicle: 'LKA-1234',
            station: 'Caltex - Kandy Road',
            location: 'Peradeniya',
            fuelType: 'Diesel',
            quantity: '38 liters',
            pricePerLiter: 'LKR 280',
            totalCost: 'LKR 10,640',
            odometerBefore: '44,670 km',
            odometerAfter: '44,890 km',
            distanceCovered: '220 km',
            fuelEfficiency: '5.79 km/L',
            paymentMethod: 'Company Card',
            receiptNumber: 'CX-2024-08-5678',
            attendant: 'Nimal Silva',
            notes: 'Midway refuel. Better efficiency on highway routes.',
            trip: 'TRP-002'
        }
    };

    const fuel = fuelData[fuelId];
    if (!fuel) {
        showToast(`Fuel log ${fuelId} not found`, 'error');
        return;
    }

    // Calculate efficiency color
    const efficiency = parseFloat(fuel.fuelEfficiency);
    let efficiencyColor = '#28a745'; // Good
    if (efficiency < 4) efficiencyColor = '#dc3545'; // Poor
    else if (efficiency < 5) efficiencyColor = '#ff9800'; // Average

    const content = `
        <div style="display: grid; gap: 20px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                <div>
                    <div style="color: #6c757d; font-size: 0.875rem; margin-bottom: 5px;">Log ID</div>
                    <div style="font-weight: 600; font-size: 1.1rem;">${fuel.id}</div>
                </div>
                <div>
                    <div style="color: #6c757d; font-size: 0.875rem; margin-bottom: 5px;">Vehicle</div>
                    <div style="font-weight: 600; font-size: 1.1rem;">${fuel.vehicle}</div>
                </div>
                <div>
                    <div style="color: #6c757d; font-size: 0.875rem; margin-bottom: 5px;">Date</div>
                    <div style="font-weight: 500;">${fuel.date}</div>
                </div>
                <div>
                    <div style="color: #6c757d; font-size: 0.875rem; margin-bottom: 5px;">Time</div>
                    <div style="font-weight: 500;">${fuel.time}</div>
                </div>
            </div>
            
            <div style="padding: 20px; background: #f8f9fa; border-radius: 8px;">
                <h4 style="margin: 0 0 15px 0; color: #2563eb;"><i class="fas fa-gas-pump"></i> Refuel Details</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div>
                        <div style="color: #6c757d; font-size: 0.875rem; margin-bottom: 5px;">Fuel Station</div>
                        <div style="font-weight: 600;">${fuel.station}</div>
                    </div>
                    <div>
                        <div style="color: #6c757d; font-size: 0.875rem; margin-bottom: 5px;">Location</div>
                        <div style="font-weight: 500;">${fuel.location}</div>
                    </div>
                    <div>
                        <div style="color: #6c757d; font-size: 0.875rem; margin-bottom: 5px;">Fuel Type</div>
                        <div style="font-weight: 600; color: #2563eb;">${fuel.fuelType}</div>
                    </div>
                    <div>
                        <div style="color: #6c757d; font-size: 0.875rem; margin-bottom: 5px;">Quantity</div>
                        <div style="font-weight: 600; font-size: 1.1rem; color: #28a745;">${fuel.quantity}</div>
                    </div>
                    <div>
                        <div style="color: #6c757d; font-size: 0.875rem; margin-bottom: 5px;">Price per Liter</div>
                        <div style="font-weight: 500;">${fuel.pricePerLiter}</div>
                    </div>
                    <div>
                        <div style="color: #6c757d; font-size: 0.875rem; margin-bottom: 5px;">Total Cost</div>
                        <div style="font-weight: 600; font-size: 1.1rem; color: #dc3545;">${fuel.totalCost}</div>
                    </div>
                </div>
            </div>
            
            <div style="padding: 20px; background: #f8f9fa; border-radius: 8px;">
                <h4 style="margin: 0 0 15px 0; color: #2563eb;"><i class="fas fa-tachometer-alt"></i> Odometer & Efficiency</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div>
                        <div style="color: #6c757d; font-size: 0.875rem; margin-bottom: 5px;">Odometer (Before)</div>
                        <div style="font-weight: 500;">${fuel.odometerBefore}</div>
                    </div>
                    <div>
                        <div style="color: #6c757d; font-size: 0.875rem; margin-bottom: 5px;">Odometer (After)</div>
                        <div style="font-weight: 500;">${fuel.odometerAfter}</div>
                    </div>
                    <div>
                        <div style="color: #6c757d; font-size: 0.875rem; margin-bottom: 5px;">Distance Covered</div>
                        <div style="font-weight: 600; color: #2563eb;">${fuel.distanceCovered}</div>
                    </div>
                    <div>
                        <div style="color: #6c757d; font-size: 0.875rem; margin-bottom: 5px;">Fuel Efficiency</div>
                        <div style="font-weight: 700; font-size: 1.2rem; color: ${efficiencyColor};">
                            <i class="fas fa-chart-line"></i> ${fuel.fuelEfficiency}
                        </div>
                    </div>
                </div>
            </div>
            
            <div style="padding: 20px; background: #f8f9fa; border-radius: 8px;">
                <h4 style="margin: 0 0 15px 0; color: #2563eb;"><i class="fas fa-receipt"></i> Payment & Receipt</h4>
                <div style="display: grid; gap: 12px;">
                    <div>
                        <div style="color: #6c757d; font-size: 0.875rem; margin-bottom: 5px;">Payment Method</div>
                        <div style="font-weight: 600;">${fuel.paymentMethod}</div>
                    </div>
                    <div>
                        <div style="color: #6c757d; font-size: 0.875rem; margin-bottom: 5px;">Receipt Number</div>
                        <div style="font-weight: 500; font-family: monospace;">${fuel.receiptNumber}</div>
                    </div>
                    <div>
                        <div style="color: #6c757d; font-size: 0.875rem; margin-bottom: 5px;">Attendant</div>
                        <div style="font-weight: 500;">${fuel.attendant}</div>
                    </div>
                    <div>
                        <div style="color: #6c757d; font-size: 0.875rem; margin-bottom: 5px;">Related Trip</div>
                        <div style="font-weight: 600; color: #2563eb;">${fuel.trip}</div>
                    </div>
                </div>
            </div>
            
            ${fuel.notes ? `
                <div style="padding: 20px; background: #e7f3ff; border-radius: 8px; border-left: 4px solid #2563eb;">
                    <h4 style="margin: 0 0 10px 0; color: #1e40af;"><i class="fas fa-sticky-note"></i> Notes</h4>
                    <div style="color: #1e40af;">${fuel.notes}</div>
                </div>
            ` : ''}
        </div>
    `;

    createDetailsModal(`<i class="fas fa-gas-pump"></i> Fuel Log Details - ${fuelId}`, content);
}

function viewTicketDetails(ticketId) {
    // Sample data for tickets (in a real app, this would come from a database)
    const ticketData = {
        'TT-001': {
            id: 'TT-001',
            date: 'Aug 25, 2024',
            vehicle: 'LKA-1234',
            trip: 'TRP-001',
            origin: 'Colombo',
            destination: 'Kandy',
            departure: 'Aug 25, 08:00 AM',
            distance: '125 km',
            cargo: 'Spare parts crates',
            weight: '350 kg',
            items: '8 crates',
            type: 'Industrial Parts',
            instructions: 'Handle with care. Keep crates upright during transport. Fragile components inside.',
            recipientName: 'Mr. Sunil Fernando',
            recipientContact: '+94 81 234 5678',
            recipientCompany: 'Kandy Industrial Supplies',
            address: 'No. 45, Peradeniya Road, Kandy',
            deliveryStatus: 'Completed and verified',
            deliveryTime: 'Aug 25, 11:15 AM',
            receivedBy: 'Mr. Sunil Fernando',
            signature: '✓ Signed & Verified'
        },
        'TT-002': {
            id: 'TT-002',
            date: 'Aug 25, 2024',
            vehicle: 'LKA-1234',
            trip: 'TRP-002',
            origin: 'Kandy',
            destination: 'Galle',
            departure: 'Aug 25, 01:00 PM',
            distance: '95 km',
            cargo: 'Machinery components',
            weight: '500 kg',
            items: '12 packages',
            type: 'Heavy Equipment',
            instructions: 'Secure properly. Do not stack. Temperature sensitive - keep cool.',
            recipientName: 'Ms. Nadeeka Silva',
            recipientContact: '+94 91 345 6789',
            recipientCompany: 'Southern Engineering Works',
            address: 'No. 78, Matara Road, Galle',
            deliveryStatus: 'In transit',
            deliveryTime: 'Expected: Aug 25, 04:30 PM',
            receivedBy: 'Pending delivery',
            signature: '⏳ Awaiting signature'
        }
    };

    const ticket = ticketData[ticketId];
    if (!ticket) {
        showToast('Ticket not found');
        return;
    }

    // Populate modal with ticket data
    document.getElementById('ticket-id').textContent = ticket.id;
    document.getElementById('ticket-date').textContent = ticket.date;
    document.getElementById('ticket-vehicle').textContent = ticket.vehicle;
    document.getElementById('ticket-trip').textContent = ticket.trip;
    document.getElementById('ticket-origin').textContent = ticket.origin;
    document.getElementById('ticket-destination').textContent = ticket.destination;
    document.getElementById('ticket-departure').textContent = ticket.departure;
    document.getElementById('ticket-distance').textContent = ticket.distance;
    document.getElementById('ticket-cargo').textContent = ticket.cargo;
    document.getElementById('ticket-weight').textContent = ticket.weight;
    document.getElementById('ticket-items').textContent = ticket.items;
    document.getElementById('ticket-type').textContent = ticket.type;
    document.getElementById('ticket-instructions').textContent = ticket.instructions;
    document.getElementById('ticket-recipient-name').textContent = ticket.recipientName;
    document.getElementById('ticket-recipient-contact').textContent = ticket.recipientContact;
    document.getElementById('ticket-recipient-company').textContent = ticket.recipientCompany;
    document.getElementById('ticket-address').textContent = ticket.address;
    document.getElementById('ticket-delivery-status').textContent = ticket.deliveryStatus;
    document.getElementById('ticket-delivery-time').textContent = ticket.deliveryTime;
    document.getElementById('ticket-received-by').textContent = ticket.receivedBy;
    document.getElementById('ticket-signature').textContent = ticket.signature;

    // Update signature color based on status
    const signatureElement = document.getElementById('ticket-signature');
    if (ticket.signature.includes('✓')) {
        signatureElement.style.color = 'var(--success)';
    } else {
        signatureElement.style.color = 'var(--warning)';
    }

    // Open the modal
    openModal('ticketDetailsModal');
}

function trackTicket(ticketId) {
    showToast(`Tracking status for ${ticketId}`);
}

function getDirections(garage) {
    showToast(`Opening directions to ${garage}...`);
}

function callGarage(phone) {
    showToast(`Calling ${phone}...`);
}

// Photo upload handling
function handlePhotoUpload(input, listId) {
    const fileList = document.getElementById(listId);
    fileList.innerHTML = '';

    Array.from(input.files).forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #f8f9fa; border-radius: 6px; margin-bottom: 5px;';
        fileItem.innerHTML = `
            <span style="font-size: 14px;">${file.name}</span>
            <button type="button" onclick="removePhoto(this, ${index})" style="background: var(--danger); color: white; border: none; border-radius: 4px; padding: 4px 8px; font-size: 12px; cursor: pointer;">Remove</button>
        `;
        fileList.appendChild(fileItem);
    });
}

function removePhoto(button, index) {
    button.parentElement.remove();
}

// Trip dropdown actions
function printTrip(tripId) {
    showToast(`Preparing to print trip ${tripId}...`);
    // Would typically open a print dialog or generate PDF
    console.log(`Print trip: ${tripId}`);
}

function exportTrip(tripId) {
    showToast(`Exporting trip ${tripId} data...`);
    // Would typically download trip data as CSV/PDF
    console.log(`Export trip: ${tripId}`);
}

function cancelTrip(tripId) {
    if (confirm(`Are you sure you want to cancel trip ${tripId}?`)) {
        const tripElement = document.getElementById(`trip-${tripId}`);
        if (tripElement) {
            tripElement.remove();
            showToast(`Trip ${tripId} has been cancelled.`);
        }
    }
}

// Vehicle check actions
function openWeeklyCheckModal() {
    const now = new Date();
    const dayOfWeek = now.getDay();

    // Clear resubmit state
    window.resubmittingCheckId = null;

    // Reset modal title to normal
    const modalTitle = document.querySelector('#dailyCheckModal .modal-header h2');
    if (modalTitle) {
        modalTitle.innerHTML = '<i class="fas fa-clipboard-check"></i> Submit Weekly Vehicle Check';
    }

    // Hide rejection banner if present
    const rejectionBanner = document.getElementById('rejectionReasonBanner');
    if (rejectionBanner) rejectionBanner.style.display = 'none';

    // Reset form
    const form = document.getElementById('dailyCheckForm');
    if (form) form.reset();

    // Set default week ending date to this Sunday
    const thisSunday = new Date(now);
    if (dayOfWeek !== 0) {
        const daysUntilSunday = 7 - dayOfWeek;
        thisSunday.setDate(now.getDate() + daysUntilSunday);
    }

    const dateInput = document.getElementById('weekEndingDate');
    if (dateInput) {
        dateInput.value = thisSunday.toISOString().split('T')[0];
    }

    openModal('dailyCheckModal');
}

async function updateWeeklyCheckStatus() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday

    // Calculate this week's Sunday
    const thisSunday = new Date(now);
    if (dayOfWeek === 0) {
        thisSunday.setHours(0, 0, 0, 0);
    } else {
        const daysUntilSunday = 7 - dayOfWeek;
        thisSunday.setDate(now.getDate() + daysUntilSunday);
        thisSunday.setHours(0, 0, 0, 0);
    }

    const statusSpan = document.getElementById('weeklyCheckStatus');
    const checkBtn = document.getElementById('weeklyCheckBtn');
    if (!checkBtn) return;

    try {
        const weekEndDate = thisSunday.toISOString().split('T')[0];
        const response = await fetch(`${CONFIG.API_BASE_URL}/vehicle-checks?vehicle_registration=LKA-1234`);
        const result = await response.json();

        const existingCheck = result.success && result.data.find(check =>
            check.week_end_date === weekEndDate && check.status !== 'rejected'
        );

        // Allow daily submissions - removed Sunday-only restriction
        if (existingCheck) {
            if (statusSpan) statusSpan.style.display = 'inline';
            checkBtn.innerHTML = '<i class="fas fa-check-circle"></i> Week Check Submitted';
            checkBtn.classList.remove('btn-primary');
            checkBtn.classList.add('btn-secondary');
            checkBtn.disabled = true;
            checkBtn.style.opacity = '0.7';
            checkBtn.style.cursor = 'not-allowed';
        } else {
            // Button is always enabled for submission (any day of the week)
            if (statusSpan) statusSpan.style.display = 'none';
            checkBtn.innerHTML = '<i class="fas fa-clipboard-check"></i> Submit Weekly Vehicle Check';
            checkBtn.classList.remove('btn-secondary');
            checkBtn.classList.add('btn-primary');
            checkBtn.disabled = false;
            checkBtn.style.opacity = '1';
            checkBtn.style.cursor = 'pointer';
        }
    } catch (error) {
        console.error('Error checking weekly check status:', error);
    }
}

function printCheck(checkId) {
    showToast(`Preparing to print check ${checkId}...`);
    console.log(`Print check: ${checkId}`);
}

function exportCheck(checkId) {
    showToast(`Exporting check ${checkId} data...`);
    console.log(`Export check: ${checkId}`);
}

async function resubmitCheck(checkId) {
    try {
        // Fetch the rejected check details from API
        const response = await fetch(`${CONFIG.API_BASE_URL}/vehicle-checks/${checkId}?id=${checkId}`);
        const result = await response.json();

        if (!result.success || !result.data) {
            showToast('Could not load check details', 'error');
            return;
        }

        const check = result.data;

        // Store the resubmit reference so the form knows it's a resubmission
        window.resubmittingCheckId = checkId;

        // Pre-fill the form with the rejected check's week data
        const odometerInput = document.getElementById('weeklyCheckOdometer');
        const weekEndInput = document.getElementById('weekEndingDate');

        if (odometerInput) odometerInput.value = check.odometer_reading;
        if (weekEndInput) weekEndInput.value = check.week_end_date;

        // Uncheck all checkboxes so driver must re-inspect
        const form = document.getElementById('dailyCheckForm');
        ['engineOil', 'brakes', 'lights', 'tires', 'coolant', 'wipers'].forEach(name => {
            if (form.elements[name]) form.elements[name].checked = false;
        });

        // Update modal title to indicate resubmission
        const modalTitle = document.querySelector('#dailyCheckModal .modal-header h2');
        if (modalTitle) {
            modalTitle.innerHTML = '<i class="fas fa-redo"></i> Resubmit Weekly Vehicle Check';
        }

        // Show rejection reason banner in the form
        let rejectionBanner = document.getElementById('rejectionReasonBanner');
        if (!rejectionBanner) {
            rejectionBanner = document.createElement('div');
            rejectionBanner.id = 'rejectionReasonBanner';
            const firstSection = document.querySelector('#dailyCheckForm .form-section');
            firstSection.parentNode.insertBefore(rejectionBanner, firstSection);
        }
        rejectionBanner.style.display = 'block';
        rejectionBanner.innerHTML = `
            <div style="margin-bottom: 15px; padding: 12px 16px; background: #fdecea; border-left: 4px solid #e74c3c; border-radius: 4px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                    <i class="fas fa-exclamation-triangle" style="color: #e74c3c;"></i>
                    <strong style="color: #c0392b;">Rejected — Reason:</strong>
                </div>
                <p style="margin: 0; color: #555; font-size: 14px;">${check.rejection_reason || 'No reason provided'}</p>
                <small style="color: #888; margin-top: 6px; display: block;">Please re-inspect all items and resubmit.</small>
            </div>
        `;

        openModal('dailyCheckModal');
    } catch (error) {
        console.error('Error loading check for resubmission:', error);
        showToast('Failed to load check details', 'error');
    }
}

// Breakdown actions
function printBreakdown(breakdownId) {
    showToast(`Preparing to print breakdown report ${breakdownId}...`);
    console.log(`Print breakdown: ${breakdownId}`);
}

function exportBreakdown(breakdownId) {
    showToast(`Exporting breakdown ${breakdownId} data...`);
    console.log(`Export breakdown: ${breakdownId}`);
}

function contactTechnician(breakdownId) {
    showToast(`Contacting technician for ${breakdownId}...`);
    console.log(`Contact technician: ${breakdownId}`);
}

// Fuel log actions
function editFuelLog(fuelId) {
    showToast(`Opening edit form for fuel log ${fuelId}...`);
    console.log(`Edit fuel log: ${fuelId}`);
}

function printFuelLog(fuelId) {
    showToast(`Preparing to print fuel log ${fuelId}...`);
    console.log(`Print fuel log: ${fuelId}`);
}

function deleteFuelLog(fuelId) {
    if (confirm(`Are you sure you want to delete fuel log ${fuelId}?`)) {
        showToast(`Fuel log ${fuelId} has been deleted.`);
        console.log(`Delete fuel log: ${fuelId}`);
    }
}

// Transport ticket actions
function printTicket(ticketId) {
    showToast(`Preparing to print ticket ${ticketId}...`);
    console.log(`Print ticket: ${ticketId}`);
}

function exportTicket(ticketId) {
    showToast(`Exporting ticket ${ticketId} data...`);
    console.log(`Export ticket: ${ticketId}`);
}

function updateDeliveryStatus(ticketId) {
    showToast(`Updating delivery status for ${ticketId}...`);
    console.log(`Update delivery status: ${ticketId}`);
}

// ==================== FILTER FUNCTIONS ====================
let currentTripFilter = 'all';
let currentCheckFilter = 'all';
let currentBreakdownFilter = 'all';

function filterTripsByStatus(status) {
    document.querySelectorAll('.filter-controls .filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    currentTripFilter = status;
    applyTripFilters();
}

function applyTripFilters() {
    const trips = document.querySelectorAll('.inventory-item[data-status], .trip-item[data-status]');
    let visibleCount = 0;

    trips.forEach(trip => {
        const tripStatus = trip.getAttribute('data-status');
        const matchesFilter = currentTripFilter === 'all' || tripStatus === currentTripFilter;

        if (matchesFilter) {
            trip.style.display = 'flex';
            visibleCount++;
        } else {
            trip.style.display = 'none';
        }
    });
}

function filterChecksByStatus(status) {
    document.querySelectorAll('#vehicle-check .filter-controls .filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    currentCheckFilter = status;
    applyCheckFilters();
}

function applyCheckFilters() {
    const checks = document.querySelectorAll('#vehicle-check .inventory-item[data-status], #vehicle-check .ticket-item[data-status]');
    let visibleCount = 0;

    checks.forEach(check => {
        const checkStatus = check.getAttribute('data-status');
        const matchesFilter = currentCheckFilter === 'all' || checkStatus === currentCheckFilter;

        if (matchesFilter) {
            check.style.display = 'flex';
            visibleCount++;
        } else {
            check.style.display = 'none';
        }
    });
}

let currentBreakdownTypeFilter = 'all';
let currentBreakdownStatusFilter = 'all';

function filterBreakdownsByType(type) {
    document.querySelectorAll('#breakdown .filter-controls:first-child .filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    currentBreakdownTypeFilter = type;
    applyBreakdownFilters();
}

function filterBreakdownsByStatus(status) {
    document.querySelectorAll('#breakdown .filter-controls:last-child .filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    currentBreakdownStatusFilter = status;
    applyBreakdownFilters();
}

function applyBreakdownFilters() {
    const breakdowns = document.querySelectorAll('#breakdown .inventory-item, #breakdown .ticket-item');
    let visibleCount = 0;

    breakdowns.forEach(breakdown => {
        const breakdownType = breakdown.getAttribute('data-type');
        const breakdownStatus = breakdown.getAttribute('data-status');

        const matchesTypeFilter = currentBreakdownTypeFilter === 'all' || breakdownType === currentBreakdownTypeFilter;
        const matchesStatusFilter = currentBreakdownStatusFilter === 'all' || breakdownStatus === currentBreakdownStatusFilter;

        if (matchesTypeFilter && matchesStatusFilter) {
            breakdown.style.display = 'flex';
            visibleCount++;
        } else {
            breakdown.style.display = 'none';
        }
    });
}

// Global cache for breakdown data
let breakdownDataCache = {
    reports: [],
    routeBreakdowns: []
};

// Load breakdown reports from API
async function loadBreakdownReports() {
    try {
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);

        if (!token) {
            console.warn('No auth token found, skipping breakdown reports load');
            return;
        }

        console.log('Loading breakdown reports...');

        // Fetch both breakdown reports and route breakdowns
        const [reportsResponse, routeResponse] = await Promise.all([
            fetch(`${CONFIG.API_BASE_URL}/breakdown-reports`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }),
            fetch(`${CONFIG.API_BASE_URL}/route-breakdowns`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
        ]);

        if (!reportsResponse.ok || !routeResponse.ok) {
            throw new Error('Failed to load breakdown data');
        }

        const reportsData = await reportsResponse.json();
        const routeData = await routeResponse.json();

        console.log('Breakdown reports loaded:', reportsData.data.count, 'reports');
        console.log('Route breakdowns loaded:', routeData.data.count, 'breakdowns');

        if (reportsData.status === 'success' && routeData.status === 'success') {
            // Cache the data for view buttons
            breakdownDataCache.reports = reportsData.data.reports;
            breakdownDataCache.routeBreakdowns = routeData.data.breakdowns;

            displayBreakdowns(reportsData.data.reports, routeData.data.breakdowns);
        }
    } catch (error) {
        console.error('Error loading breakdowns:', error);
        showToast('Failed to load breakdown reports', 'error');
    }
}

// Display breakdowns in the list
function displayBreakdowns(reports, routeBreakdowns) {
    const container = document.querySelector('#breakdown .card');

    // Clear existing items except header
    const header = container.querySelector('.card-header');
    container.innerHTML = '';
    container.appendChild(header);

    // Combine both types
    const allBreakdowns = [];

    // Add regular breakdown reports
    reports.forEach(report => {
        // Use fault ticket status if available, otherwise use breakdown status
        // This ensures driver sees the actual work status, not just the breakdown report status
        const actualStatus = report.ticket_status || report.status;

        allBreakdowns.push({
            type: 'breakdown',
            id: report.id,
            breakdown_id: report.breakdown_id,
            status: actualStatus,
            severity: report.severity,
            date: new Date(report.breakdown_date),
            dateStr: new Date(report.breakdown_date).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
            }),
            data: report,
            assigned_technicians: report.assigned_technicians || []
        });
    });

    // Add route breakdowns
    routeBreakdowns.forEach(breakdown => {
        // Use fault ticket status if available, otherwise use breakdown status
        // This ensures driver sees the actual work status, not just the breakdown report status
        const actualStatus = breakdown.ticket_status || breakdown.status;

        allBreakdowns.push({
            type: 'route',
            id: breakdown.id,
            breakdown_id: breakdown.route_breakdown_id,
            status: actualStatus,
            severity: breakdown.severity,
            date: new Date(breakdown.breakdown_datetime),
            dateStr: new Date(breakdown.breakdown_datetime).toLocaleString('en-US', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            }),
            data: breakdown,
            assigned_technicians: breakdown.assigned_technicians || []
        });
    });

    // Sort by date (newest first) - show all breakdowns
    allBreakdowns.sort((a, b) => b.date - a.date);

    console.log('Displaying breakdowns:', allBreakdowns.length, 'total');

    // Display all breakdowns
    allBreakdowns.forEach(item => {
        // Define status colors and classes for all possible statuses
        let statusColor, statusClass, dataStatus;

        switch (item.status) {
            case 'Resolved':
                statusColor = '#10b981';
                statusClass = 'status-completed';
                dataStatus = 'resolved';
                break;
            case 'Assigned':
                statusColor = '#2563eb';
                statusClass = 'status-assigned';
                dataStatus = 'assigned';
                break;
            case 'In Progress':
                statusColor = '#8b5cf6';
                statusClass = 'status-in-progress';
                dataStatus = 'in-progress';
                break;
            case 'Waiting for Spare Parts':
            case 'Parts Approved':
                statusColor = '#f59e0b';
                statusClass = 'status-waiting';
                dataStatus = 'waiting';
                break;
            case 'Pending':
            default:
                statusColor = '#f39c12';
                statusClass = 'status-pending';
                dataStatus = 'pending';
                break;
        }

        const severityIcon = item.severity === 'critical' ? 'fa-exclamation-circle' :
            item.severity === 'high' ? 'fa-exclamation-triangle' : 'fa-info-circle';

        const severityColor = item.severity === 'critical' ? '#e74c3c' :
            item.severity === 'high' ? '#e67e22' :
                item.severity === 'medium' ? '#f39c12' : '#27ae60';

        const iconType = item.type === 'route' ? 'fa-map-marker-alt' : severityIcon;
        const viewFunction = item.type === 'route' ?
            `viewRouteBreakdownDetails('${item.breakdown_id}', ${item.id})` :
            `viewBreakdownDetails('${item.breakdown_id}', ${item.id})`;

        // Get description or location
        let additionalInfo = '';
        if (item.type === 'route') {
            const location = item.data.breakdown_location || '';
            additionalInfo = `<i class="fas fa-map-marker-alt"></i> ${location.substring(0, 60)}${location.length > 60 ? '...' : ''}`;
        } else {
            const description = item.data.description || '';
            additionalInfo = description.substring(0, 80) + (description.length > 80 ? '...' : '');
        }

        const breakdownType = item.type === 'route' ? item.data.breakdown_type : item.data.breakdown_type;

        // Build technician info if assigned (only show when not Pending)
        let technicianInfo = '';
        if (item.status !== 'Pending' && item.assigned_technicians && item.assigned_technicians.length > 0) {
            const techNames = item.assigned_technicians.map(t => t.technician_name || t.name).join(', ');
            technicianInfo = `<div style="margin-top: 5px; color: #2563eb; font-size: 12px; font-weight: 500;">
                <i class="fas fa-user-cog"></i> Assigned to: ${techNames}
            </div>`;
        }

        // Edit and delete functions based on type
        const editFunction = item.type === 'route' ?
            `editRouteBreakdown(${item.id})` :
            `editBreakdown(${item.id})`;
        const deleteFunction = item.type === 'route' ?
            `deleteRouteBreakdown(${item.id}, '${item.breakdown_id}')` :
            `deleteBreakdown(${item.id}, '${item.breakdown_id}')`;

        const itemHTML = `
            <div class="inventory-item" data-type="${item.type}" data-status="${dataStatus}" id="breakdown-${item.breakdown_id}">
                <div class="item-details">
                    <strong><i class="fas ${iconType}"></i> ${item.breakdown_id}</strong>
                    <div class="item-meta">
                        <i class="fas fa-clock"></i> ${item.dateStr}
                    </div>
                    <div class="item-description">
                        ${item.status === 'Resolved'
                ? '<span style="background: #10b981; color: white; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;"><i class="fas fa-check-circle"></i> FINISHED</span>'
                : '<span style="color: ' + statusColor + '; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">' + item.status.toUpperCase() + '</span>'} | 
                        <span style="color: ${severityColor}; font-weight: 500;">${item.severity.toUpperCase()}</span> | 
                        <span style="color: #555; font-weight: 500;">${breakdownType}</span>
                        <br>
                        ${additionalInfo}
                        ${technicianInfo}
                        ${item.status === 'Resolved' && item.assigned_technicians && item.assigned_technicians.length > 0 ? `<div style="margin-top: 5px; color: #10b981; font-size: 12px; font-weight: 500;"><i class="fas fa-user-check"></i> Resolved by: ${item.assigned_technicians.map(t => t.technician_name || t.name).join(', ')}</div>` : ''}
                    </div>
                </div>
                <div class="item-actions">
                    <div class="action-buttons">
                        <button class="btn btn-small btn-primary" onclick="${viewFunction}">
                            <i class="fas fa-eye"></i> VIEW
                        </button>
                        <div class="dropdown-container">
                            <button class="btn btn-small btn-secondary dropdown-trigger" onclick="toggleDropdown(event, 'breakdown-dropdown-${item.id}-${item.type}')">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div class="dropdown-menu" id="dropdown-breakdown-dropdown-${item.id}-${item.type}">
                                <button class="dropdown-item" onclick="${editFunction}">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                                <button class="dropdown-item danger" onclick="${deleteFunction}">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', itemHTML);
    });

    if (allBreakdowns.length === 0) {
        container.insertAdjacentHTML('beforeend', `
            <div style="padding: 40px; text-align: center; color: var(--muted);">
                <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 15px; opacity: 0.3;"></i>
                <p>No breakdown reports found</p>
            </div>
        `);
    }
}

// Edit breakdown report
function editBreakdown(id) {
    console.log('Editing breakdown:', id);
    const breakdown = breakdownDataCache.reports.find(r => r.id == id);

    if (!breakdown) {
        showToast('Breakdown not found', 'error');
        return;
    }

    // Populate the edit form with existing data
    document.getElementById('breakdownSeverity').value = breakdown.severity;
    document.getElementById('breakdownType').value = breakdown.breakdown_type;
    document.getElementById('breakdownDescription').value = breakdown.description;

    // Store the ID for update
    window.editingBreakdownId = id;

    // Change form mode to edit
    const modal = document.getElementById('breakdownModal');
    const modalTitle = modal.querySelector('.modal-header h2');
    modalTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Breakdown Report';

    const submitBtn = modal.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Update Breakdown Report';

    openModal('breakdownModal');
}

// Delete breakdown report
async function deleteBreakdown(id, breakdownId) {
    if (!confirm(`Are you sure you want to delete breakdown ${breakdownId}?`)) {
        return;
    }

    try {
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        if (!token) {
            showToast('Authentication required', 'error');
            return;
        }

        const response = await fetch(`${CONFIG.API_BASE_URL}/breakdown-reports/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (response.ok && result.status === 'success') {
            showToast('Breakdown deleted successfully!');
            await loadBreakdownReports();
        } else {
            showToast(result.message || 'Failed to delete breakdown', 'error');
        }
    } catch (error) {
        console.error('Error deleting breakdown:', error);
        showToast('Failed to delete breakdown', 'error');
    }
}

// Edit route breakdown report
function editRouteBreakdown(id) {
    console.log('Editing route breakdown:', id);
    const breakdown = breakdownDataCache.routeBreakdowns.find(r => r.id == id);

    if (!breakdown) {
        showToast('Route breakdown not found', 'error');
        return;
    }

    // Populate the edit form with existing data
    document.getElementById('routeBreakdownSeverity').value = breakdown.severity;
    document.getElementById('routeBreakdownType').value = breakdown.breakdown_type;
    document.getElementById('routeBreakdownLocation').value = breakdown.breakdown_location;
    document.getElementById('routeBreakdownDescription').value = breakdown.description;

    // Format datetime for input
    const datetime = new Date(breakdown.breakdown_datetime);
    datetime.setMinutes(datetime.getMinutes() - datetime.getTimezoneOffset());
    document.getElementById('routeBreakdownDatetime').value = datetime.toISOString().slice(0, 16);

    // Store the ID for update
    window.editingRouteBreakdownId = id;

    // Change form mode to edit
    const modal = document.getElementById('breakdownInRouteModal');
    const modalTitle = modal.querySelector('.modal-header h2');
    modalTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Route Breakdown Report';

    const submitBtn = modal.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Update Route Breakdown Report';

    openModal('breakdownInRouteModal');
}

// Delete route breakdown report
async function deleteRouteBreakdown(id, breakdownId) {
    if (!confirm(`Are you sure you want to delete route breakdown ${breakdownId}?`)) {
        return;
    }

    try {
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        if (!token) {
            showToast('Authentication required', 'error');
            return;
        }

        const response = await fetch(`${CONFIG.API_BASE_URL}/route-breakdowns/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (response.ok && result.status === 'success') {
            showToast('Route breakdown deleted successfully!');
            await loadBreakdownReports();
        } else {
            showToast(result.message || 'Failed to delete route breakdown', 'error');
        }
    } catch (error) {
        console.error('Error deleting route breakdown:', error);
        showToast('Failed to delete route breakdown', 'error');
    }
}

// Open new breakdown modal (reset edit mode)
function openNewBreakdownModal() {
    window.editingBreakdownId = null;
    document.getElementById('breakdownForm').reset();

    const modal = document.getElementById('breakdownModal');
    const modalTitle = modal.querySelector('.modal-header h2');
    modalTitle.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Report Vehicle Breakdown';

    const submitBtn = modal.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Submit Breakdown Report';

    openModal('breakdownModal');
}

// Open new route breakdown modal (reset edit mode)
function openNewRouteBreakdownModal() {
    window.editingRouteBreakdownId = null;
    document.getElementById('breakdownInRouteForm').reset();

    const modal = document.getElementById('breakdownInRouteModal');
    const modalTitle = modal.querySelector('.modal-header h2');
    modalTitle.innerHTML = '<i class="fas fa-road"></i> Report Breakdown In-Route';

    const submitBtn = modal.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Submit Breakdown Report';

    openModal('breakdownInRouteModal');
}

function getSeverityColor(severity) {
    switch (severity.toLowerCase()) {
        case 'critical': return '#e74c3c';
        case 'high': return '#e67e22';
        case 'medium': return '#f39c12';
        case 'low': return '#27ae60';
        default: return '#95a5a6';
    }
}

async function viewBreakdownDetails(breakdownId, id) {
    console.log('=== VIEW BUTTON CLICKED ===');
    console.log('Breakdown ID:', breakdownId, 'Database ID:', id);

    // Fetch fresh data from API to get work_updates
    let breakdown;
    try {
        const response = await API.get(`/breakdown-reports/${id}`);
        if (response.status === 'success' && response.data && response.data.report) {
            breakdown = response.data.report;
        } else {
            // Fallback to cached data
            breakdown = breakdownDataCache.reports.find(r => r.id == id);
        }
    } catch (error) {
        console.error('Error fetching breakdown details:', error);
        // Fallback to cached data
        breakdown = breakdownDataCache.reports.find(r => r.id == id);
    }

    if (!breakdown) {
        console.error('Breakdown not found');
        showToast('Breakdown details not found', 'error');
        return;
    }

    console.log('Found breakdown data:', breakdown);

    const statusColor = breakdown.status === 'Resolved' ? '#27ae60' : breakdown.status === 'Assigned' ? '#2563eb' : breakdown.status === 'In Progress' ? '#3498db' : '#f39c12';
    const severityColor = breakdown.severity === 'critical' ? '#e74c3c' : breakdown.severity === 'high' ? '#e67e22' : breakdown.severity === 'medium' ? '#f39c12' : '#27ae60';
    const date = new Date(breakdown.breakdown_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Build assigned technicians section - only show when NOT Pending
    let assignedTechniciansHtml = '';
    if (breakdown.status !== 'Pending' && breakdown.assigned_technicians && breakdown.assigned_technicians.length > 0) {
        assignedTechniciansHtml = `
            <div class="form-section">
                <h5><i class="fas fa-user-cog"></i> Assigned Technicians</h5>
                <div style="display: grid; gap: 10px;">
                    ${breakdown.assigned_technicians.map(tech => `
                        <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                            <strong>Technician:</strong>
                            <span>${tech.technician_name || tech.name || 'N/A'}</span>
                        </div>
                        ${tech.technician_phone || tech.phone ? `
                            <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                                <strong>Contact:</strong>
                                <span>${tech.technician_phone || tech.phone}</span>
                            </div>
                        ` : ''}
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Remove any existing dynamic breakdown detail modal
    const existingModal = document.getElementById('dynamicBreakdownDetailModal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'dynamicBreakdownDetailModal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-exclamation-triangle"></i> Breakdown Report Details</h2>
                <button class="btn-close" onclick="closeModal('dynamicBreakdownDetailModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="form-section">
                <h5><i class="fas fa-id-card"></i> Breakdown Information</h5>
                <div style="display: grid; gap: 10px;">
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                        <strong>Breakdown ID:</strong>
                        <span>${breakdown.breakdown_id || breakdownId}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                        <strong>Status:</strong>
                        <span style="padding: 4px 12px; border-radius: 12px; font-size: 0.85em; color: white; background: ${statusColor};">${breakdown.status || 'Pending'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                        <strong>Date:</strong>
                        <span>${date}</span>
                    </div>
                </div>
            </div>

            <div class="form-section">
                <h5><i class="fas fa-truck"></i> Vehicle Information</h5>
                <div style="display: grid; gap: 10px;">
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                        <strong>Vehicle:</strong>
                        <span>${breakdown.number_plate || 'Unknown'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                        <strong>Breakdown Type:</strong>
                        <span>${breakdown.breakdown_type || 'Not specified'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                        <strong>Severity:</strong>
                        <span style="padding: 4px 12px; border-radius: 12px; font-size: 0.85em; color: white; background: ${severityColor}; text-transform: uppercase;">${breakdown.severity || 'N/A'}</span>
                    </div>
                </div>
            </div>
            
            <div class="form-section">
                <h5><i class="fas fa-file-alt"></i> Description</h5>
                <div style="padding: 15px; background: #f8f9fa; border-radius: 6px; min-height: 50px;">
                    <p style="margin: 0; color: var(--text-700);">${breakdown.description || 'No description provided'}</p>
                </div>
            </div>
            
            ${assignedTechniciansHtml}
            
            ${(breakdown.status === 'Resolved' || breakdown.status === 'Finished' || breakdown.status === 'Completed') && breakdown.work_updates && breakdown.work_updates.length > 0 ? `
            <div class="form-section">
                <h5><i class="fas fa-check-circle" style="color: #27ae60;"></i> Work Completed - Finishing Details</h5>
                ${breakdown.work_updates.map(update => `
                <div style="padding: 15px; background: #e8f5e9; border-radius: 6px; border-left: 4px solid #27ae60; margin-bottom: 10px;">
                    <p style="margin: 0 0 8px 0; font-weight: 600; color: #27ae60;">
                        <i class="fas fa-user-cog"></i> ${update.technician_name || 'Technical Officer'}
                    </p>
                    <p style="margin: 0 0 8px 0; color: var(--text-700);">
                        <strong>Work Description:</strong> ${update.machine_description || 'N/A'}
                    </p>
                    <p style="margin: 0 0 8px 0; color: var(--text-700);">
                        <strong>Parts Used:</strong> ${update.parts_used || 'None'}
                    </p>
                    <p style="margin: 0 0 8px 0; color: var(--text-700);">
                        <strong>Time Spent:</strong> ${update.time_spent ? update.time_spent + ' hours' : 'N/A'}
                    </p>
                    <p style="margin: 0 0 8px 0; color: var(--text-700);">
                        <strong>Status:</strong> <span class="status-text ${update.work_status === 'Completed' ? 'status-ok' : 'status-warning'}">${update.work_status}</span>
                    </p>
                    <p style="margin: 0; color: #666; font-size: 0.9em;">
                        <i class="fas fa-calendar-check"></i> Updated: ${new Date(update.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
                `).join('')}
            </div>
            ` : ((breakdown.status === 'Resolved' || breakdown.status === 'Finished' || breakdown.status === 'Completed') && breakdown.resolution_notes ? `
            <div class="form-section">
                <h5><i class="fas fa-check-circle" style="color: #27ae60;"></i> Work Completed - Finishing Details</h5>
                <div style="padding: 15px; background: #e8f5e9; border-radius: 6px; border-left: 4px solid #27ae60;">
                    <p style="margin: 0 0 10px 0; color: var(--text-700);">${breakdown.resolution_notes}</p>
                    ${breakdown.resolved_at ? `
                    <p style="margin: 0; color: #666; font-size: 0.9em;">
                        <i class="fas fa-calendar-check"></i> Resolved on: ${new Date(breakdown.resolved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    ` : ''}
                </div>
            </div>
            ` : '')}
            
            <button class="btn btn-secondary" onclick="closeModal('dynamicBreakdownDetailModal')">
                <i class="fas fa-times"></i> Close
            </button>
            </button>
        </div>
    `;

    document.body.appendChild(modal);
}

async function viewRouteBreakdownDetails(breakdownId, id) {
    console.log('=== VIEW ROUTE BREAKDOWN CLICKED ===');
    console.log('Breakdown ID:', breakdownId, 'Database ID:', id);

    // Fetch fresh data from API to get work_updates
    let breakdown;
    try {
        const response = await API.get(`/route-breakdowns/${id}`);
        if (response.status === 'success' && response.data && response.data.breakdown) {
            breakdown = response.data.breakdown;
        } else {
            // Fallback to cached data
            breakdown = breakdownDataCache.routeBreakdowns.find(r => r.id == id);
        }
    } catch (error) {
        console.error('Error fetching route breakdown details:', error);
        // Fallback to cached data
        breakdown = breakdownDataCache.routeBreakdowns.find(r => r.id == id);
    }

    if (!breakdown) {
        console.error('Route breakdown not found');
        showToast('Breakdown details not found', 'error');
        return;
    }

    console.log('Found breakdown data:', breakdown);

    const statusColor = breakdown.status === 'Resolved' ? '#27ae60' : breakdown.status === 'Assigned' ? '#2563eb' : breakdown.status === 'In Progress' ? '#3498db' : '#f39c12';
    const severityColor = breakdown.severity === 'critical' ? '#e74c3c' : breakdown.severity === 'high' ? '#e67e22' : breakdown.severity === 'medium' ? '#f39c12' : '#27ae60';
    const datetime = new Date(breakdown.breakdown_datetime).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    // Build assigned technicians section - only show when NOT Pending
    let assignedTechniciansHtml = '';
    if (breakdown.status !== 'Pending' && breakdown.assigned_technicians && breakdown.assigned_technicians.length > 0) {
        assignedTechniciansHtml = `
            <div class="form-section">
                <h5><i class="fas fa-user-cog"></i> Assigned Technicians</h5>
                <div style="display: grid; gap: 10px;">
                    ${breakdown.assigned_technicians.map(tech => `
                        <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                            <strong>Technician:</strong>
                            <span>${tech.technician_name || tech.name || 'N/A'}</span>
                        </div>
                        ${tech.technician_phone || tech.phone ? `
                            <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                                <strong>Contact:</strong>
                                <span>${tech.technician_phone || tech.phone}</span>
                            </div>
                        ` : ''}
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Remove any existing dynamic route detail modal
    const existingModal = document.getElementById('dynamicRouteDetailModal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'dynamicRouteDetailModal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-road"></i> Route Breakdown Details</h2>
                <button class="btn-close" onclick="closeModal('dynamicRouteDetailModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="form-section">
                <h5><i class="fas fa-id-card"></i> Breakdown Information</h5>
                <div style="display: grid; gap: 10px;">
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                        <strong>Breakdown ID:</strong>
                        <span>${breakdown.route_breakdown_id || breakdownId}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                        <strong>Status:</strong>
                        <span style="padding: 4px 12px; border-radius: 12px; font-size: 0.85em; color: white; background: ${statusColor};">${breakdown.status || 'Pending'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                        <strong>Date & Time:</strong>
                        <span>${datetime}</span>
                    </div>
                </div>
            </div>

            <div class="form-section">
                <h5><i class="fas fa-truck"></i> Vehicle Information</h5>
                <div style="display: grid; gap: 10px;">
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                        <strong>Vehicle:</strong>
                        <span>${breakdown.number_plate || 'Unknown'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                        <strong>Breakdown Type:</strong>
                        <span>${breakdown.breakdown_type || 'Not specified'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                        <strong>Severity:</strong>
                        <span style="padding: 4px 12px; border-radius: 12px; font-size: 0.85em; color: white; background: ${severityColor}; text-transform: uppercase;">${breakdown.severity || 'N/A'}</span>
                    </div>
                </div>
            </div>
            
            <div class="form-section">
                <h5><i class="fas fa-map-marker-alt"></i> Location</h5>
                <div style="padding: 15px; background: #f8f9fa; border-radius: 6px; min-height: 50px;">
                    <p style="margin: 0; color: var(--text-700); font-weight: 600;">${breakdown.breakdown_location || 'Location not provided'}</p>
                </div>
            </div>
            
            <div class="form-section">
                <h5><i class="fas fa-file-alt"></i> Description</h5>
                <div style="padding: 15px; background: #f8f9fa; border-radius: 6px; min-height: 50px;">
                    <p style="margin: 0; color: var(--text-700);">${breakdown.description || 'No description provided'}</p>
                </div>
            </div>
            
            ${assignedTechniciansHtml}
            
            ${(breakdown.status === 'Resolved' || breakdown.status === 'Finished' || breakdown.status === 'Completed') && breakdown.work_updates && breakdown.work_updates.length > 0 ? `
            <div class="form-section">
                <h5><i class="fas fa-check-circle" style="color: #27ae60;"></i> Work Completed - Finishing Details</h5>
                ${breakdown.work_updates.map(update => `
                <div style="padding: 15px; background: #e8f5e9; border-radius: 6px; border-left: 4px solid #27ae60; margin-bottom: 10px;">
                    <p style="margin: 0 0 8px 0; font-weight: 600; color: #27ae60;">
                        <i class="fas fa-user-cog"></i> ${update.technician_name || 'Technical Officer'}
                    </p>
                    <p style="margin: 0 0 8px 0; color: var(--text-700);">
                        <strong>Work Description:</strong> ${update.machine_description || 'N/A'}
                    </p>
                    <p style="margin: 0 0 8px 0; color: var(--text-700);">
                        <strong>Parts Used:</strong> ${update.parts_used || 'None'}
                    </p>
                    <p style="margin: 0 0 8px 0; color: var(--text-700);">
                        <strong>Time Spent:</strong> ${update.time_spent ? update.time_spent + ' hours' : 'N/A'}
                    </p>
                    <p style="margin: 0 0 8px 0; color: var(--text-700);">
                        <strong>Status:</strong> <span class="status-text ${update.work_status === 'Completed' ? 'status-ok' : 'status-warning'}">${update.work_status}</span>
                    </p>
                    <p style="margin: 0; color: #666; font-size: 0.9em;">
                        <i class="fas fa-calendar-check"></i> Updated: ${new Date(update.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
                `).join('')}
            </div>
            ` : ((breakdown.status === 'Resolved' || breakdown.status === 'Finished' || breakdown.status === 'Completed') && breakdown.resolution_notes ? `
            <div class="form-section">
                <h5><i class="fas fa-check-circle" style="color: #27ae60;"></i> Work Completed - Finishing Details</h5>
                <div style="padding: 15px; background: #e8f5e9; border-radius: 6px; border-left: 4px solid #27ae60;">
                    <p style="margin: 0 0 10px 0; color: var(--text-700);">${breakdown.resolution_notes}</p>
                    ${breakdown.resolved_at ? `
                    <p style="margin: 0; color: #666; font-size: 0.9em;">
                        <i class="fas fa-calendar-check"></i> Resolved on: ${new Date(breakdown.resolved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    ` : ''}
                </div>
            </div>
            ` : '')}
            
            <button class="btn btn-secondary" onclick="closeModal('dynamicRouteDetailModal')">
                <i class="fas fa-times"></i> Close
            </button>
        </div>
    `;

    document.body.appendChild(modal);
}

// Global trip counter
let tripCounter = 1; // Will be updated from database

// Initialize trip data (will be loaded from API)
window.allTripsData = {};

// Load trips from database
async function loadTrips() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/trips`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load trips');
        }

        const result = await response.json();

        if (result.success && result.data.trips) {
            window.allTripsData = {};
            const tripsList = document.getElementById('tripsList');
            tripsList.innerHTML = ''; // Clear existing trips

            // Process each trip
            result.data.trips.forEach(trip => {
                // Store in allTripsData
                const route = `${trip.origin} → ${trip.destination}`;
                const date = new Date(trip.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                window.allTripsData[trip.trip_id] = {
                    id: trip.trip_id,
                    route: route,
                    date: date,
                    startTime: trip.start_time || 'Not started',
                    endTime: trip.end_time || 'Not completed',
                    status: trip.status,
                    odometer: trip.starting_odometer,
                    finalOdometer: trip.final_odometer,
                    cargo: trip.cargo_description,
                    notes: trip.completion_notes
                };

                // Add trip to DOM
                addTripToDOM(trip);
            });

            // Update trip counter based on highest trip ID
            if (result.data.trips.length > 0) {
                const lastTrip = result.data.trips[result.data.trips.length - 1];
                const lastNumber = parseInt(lastTrip.trip_id.replace('TRP-', ''));
                tripCounter = lastNumber + 1;
            }

            // Update Start New Trip button state
            updateStartTripButton();
        } else {
            console.error('Failed to load trips:', result.message);
        }
    } catch (error) {
        console.error('Error loading trips:', error);
        showToast('Failed to load trips', 'error');
    }
}

// Refresh trips - reload from database
function refreshTrips() {
    loadTrips();
}

// Add trip to DOM
function addTripToDOM(trip) {
    const tripsList = document.getElementById('tripsList');
    const date = new Date(trip.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const route = `${trip.origin} → ${trip.destination}`;

    // Determine status color and display text
    let statusColor = '#95a5a6';
    let statusText = trip.status;
    let dataStatus = trip.status.toLowerCase().replace(' ', '-');

    if (trip.status === 'Pending') {
        statusColor = '#f39c12';
        dataStatus = 'ready';
    } else if (trip.status === 'In Progress') {
        statusColor = '#3498db';
        dataStatus = 'in-progress';
    } else if (trip.status === 'Completed') {
        statusColor = '#27ae60';
        dataStatus = 'completed';
    } else if (trip.status === 'Cancelled') {
        statusColor = '#e74c3c';
        dataStatus = 'cancelled';
    }

    // Determine action buttons based on status
    let actionButtons = '';
    if (trip.status === 'Pending') {
        actionButtons = `
            <button class="btn btn-small btn-success" onclick="startTrip('${trip.trip_id}')">
                <i class="fas fa-play"></i> START
            </button>
            <button class="btn btn-small btn-primary" onclick="viewTripDetails('${trip.trip_id}')">
                <i class="fas fa-eye"></i> VIEW
            </button>
            <button class="btn btn-small btn-secondary" onclick="editTrip('${trip.trip_id}')">
                <i class="fas fa-edit"></i> EDIT
            </button>
        `;
    } else if (trip.status === 'In Progress') {
        actionButtons = `
            <button class="btn btn-small btn-danger" onclick="endTrip('${trip.trip_id}')">
                <i class="fas fa-flag-checkered"></i> END
            </button>
            <button class="btn btn-small btn-primary" onclick="viewTripDetails('${trip.trip_id}')">
                <i class="fas fa-eye"></i> VIEW
            </button>
        `;
    } else {
        actionButtons = `
            <button class="btn btn-small btn-primary" onclick="viewTripDetails('${trip.trip_id}')">
                <i class="fas fa-eye"></i> VIEW
            </button>
        `;
    }

    // Determine which odometer reading to display
    const odometerDisplay = trip.status === 'Completed' && trip.final_odometer
        ? trip.final_odometer
        : trip.starting_odometer;

    const tripHTML = `
        <div class="inventory-item" data-id="${trip.trip_id}" data-status="${dataStatus}">
            <div class="item-details">
                <strong><i class="fas fa-route"></i> ${trip.trip_id}</strong>
                <div class="item-meta">
                    <i class="fas fa-map-marker-alt"></i> ${route} | 
                    <i class="fas fa-calendar"></i> ${date}
                </div>
                <div class="item-description">
                    <span class="status-text" style="color: ${statusColor};">${statusText}</span> | 
                    <i class="fas fa-tachometer-alt"></i> ${odometerDisplay} km
                </div>
            </div>
            <div class="item-actions">
                <div class="action-buttons">
                    ${actionButtons}
                </div>
            </div>
        </div>
    `;

    tripsList.insertAdjacentHTML('beforeend', tripHTML);
}

// Form submissions
function initializeForms() {
    // Start Trip Form
    document.getElementById('startTripForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        // Check if there's already an active trip
        if (checkActiveTrips()) {
            alert('You already have an active trip. Please complete it before starting a new one.');
            return;
        }

        // Get form values
        const origin = document.getElementById('tripOrigin').value;
        const destination = document.getElementById('tripDestination').value;
        const odometer = document.getElementById('tripOdometer').value;
        const cargo = document.getElementById('tripCargo').value;
        const vehicleRegistration = document.getElementById('tripVehicle').value;

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/trips`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    origin: origin,
                    destination: destination,
                    vehicle_registration: vehicleRegistration,
                    starting_odometer: odometer,
                    cargo_description: cargo,
                    driver_id: 1 // This would come from session/auth
                })
            });

            const result = await response.json();

            if (result.success && result.data.trip) {
                const trip = result.data.trip;
                const date = new Date(trip.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                // Store trip data
                window.allTripsData[trip.trip_id] = {
                    id: trip.trip_id,
                    route: `${origin} → ${destination}`,
                    date: date,
                    startTime: 'Not started',
                    endTime: 'Not completed',
                    status: 'Pending',
                    odometer: odometer,
                    cargo: cargo
                };

                // Add the new trip to the DOM
                addTripToDOM(trip);

                // Update button state (disable as new trip is now pending)
                updateStartTripButton();

                showToast(`Trip ${trip.trip_id} created successfully and added to ready list!`);
                closeModal('startTripModal');
                this.reset();
            } else {
                showToast(result.message || 'Failed to create trip', 'error');
            }
        } catch (error) {
            console.error('Error creating trip:', error);
            showToast('Failed to create trip', 'error');
        }
    });

    // Edit Trip Form
    document.getElementById('editTripForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        const tripId = document.getElementById('editTripId').value;
        const origin = document.getElementById('editTripOrigin').value;
        const destination = document.getElementById('editTripDestination').value;
        const odometer = document.getElementById('editTripOdometer').value;
        const cargo = document.getElementById('editTripCargo').value;

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/trips/${tripId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    origin: origin,
                    destination: destination,
                    starting_odometer: odometer,
                    cargo_description: cargo
                })
            });

            const result = await response.json();

            if (result.success && result.data.trip) {
                // Update trip element in the list
                const tripElement = document.querySelector(`[data-id="${tripId}"]`);
                if (tripElement) {
                    const itemDetails = tripElement.querySelector('.item-details');
                    const routeText = itemDetails.querySelector('.item-meta');
                    const odometerText = itemDetails.querySelector('.item-description');

                    routeText.innerHTML = `
                        <i class="fas fa-map-marker-alt"></i> ${origin} → ${destination} | 
                        <i class="fas fa-calendar"></i> ${window.allTripsData[tripId].date}
                    `;

                    odometerText.innerHTML = `
                        <span class="status-text" style="color: #f39c12;">Pending</span> | 
                        <i class="fas fa-tachometer-alt"></i> ${odometer} km
                    `;
                }

                // Update trip data
                if (window.allTripsData && window.allTripsData[tripId]) {
                    window.allTripsData[tripId].route = `${origin} → ${destination}`;
                    window.allTripsData[tripId].odometer = odometer;
                    window.allTripsData[tripId].cargo = cargo;
                }

                showToast(`Trip ${tripId} updated successfully!`);
                closeModal('editTripModal');
                this.reset();
            } else {
                showToast(result.message || 'Failed to update trip', 'error');
            }
        } catch (error) {
            console.error('Error updating trip:', error);
            showToast('Failed to update trip', 'error');
        }
    });

    // Weekly Check Form
    document.getElementById('dailyCheckForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        const requiredChecks = ['engineOil', 'brakes', 'lights', 'tires', 'coolant', 'wipers'];
        for (const k of requiredChecks) {
            if (!this.elements[k].checked) {
                alert('All checklist items must be checked before submission.');
                return;
            }
        }

        // Get form data
        const odometer = document.getElementById('weeklyCheckOdometer').value;
        const weekEndingDate = document.getElementById('weekEndingDate').value;

        try {
            // Submit to API
            const response = await fetch(`${CONFIG.API_BASE_URL}/vehicle-checks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    vehicle_registration: 'LKA-1234',
                    driver_id: 1, // This should come from session
                    odometer_reading: parseInt(odometer),
                    week_end_date: weekEndingDate,
                    engine_oil: true,
                    brakes: true,
                    lights: true,
                    tires: true,
                    coolant: true,
                    wipers: true
                })
            });

            const result = await response.json();

            if (result.success && result.data) {
                // If resubmitting, remove the old rejected check from the list
                if (window.resubmittingCheckId) {
                    const oldCheckEl = document.getElementById(`check-${window.resubmittingCheckId}`);
                    if (oldCheckEl) oldCheckEl.remove();
                    window.resubmittingCheckId = null;
                }

                // Add the new check to the list
                addCheckToList(result.data);

                // Hide rejection banner
                const rejectionBanner = document.getElementById('rejectionReasonBanner');
                if (rejectionBanner) rejectionBanner.style.display = 'none';

                // Reset modal title
                const modalTitle = document.querySelector('#dailyCheckModal .modal-header h2');
                if (modalTitle) {
                    modalTitle.innerHTML = '<i class="fas fa-clipboard-check"></i> Submit Weekly Vehicle Check';
                }

                // Update button status
                await updateWeeklyCheckStatus();

                showToast('Weekly vehicle check submitted! Awaiting supervisor approval.');
                closeModal('dailyCheckModal');
                this.reset();
            } else {
                showToast(result.message || 'Failed to submit vehicle check', 'error');
            }
        } catch (error) {
            console.error('Error submitting vehicle check:', error);
            showToast('Failed to submit vehicle check', 'error');
        }
    });

    // Fuel & Mileage Form
    document.getElementById('fuelMileageForm').addEventListener('submit', function (e) {
        e.preventDefault();
        showToast('Fuel and mileage data logged successfully!');
        closeModal('fuelMileageModal');
        this.reset();
    });

    // Transport Ticket Form
    document.getElementById('transportTicketForm').addEventListener('submit', function (e) {
        e.preventDefault();
        showToast('Transport ticket created successfully!');
        closeModal('transportTicketModal');
        this.reset();
    });

    // End Trip Form
    document.getElementById('endTripForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        const tripId = document.getElementById('endTripId').value;
        const finalOdometer = document.getElementById('endTripOdometer').value;
        const notes = document.getElementById('endTripNotes').value;

        // Validate odometer reading
        const tripData = window.allTripsData?.[tripId];
        if (tripData && parseInt(finalOdometer) <= parseInt(tripData.odometer)) {
            alert('Final odometer reading must be greater than starting odometer!');
            return;
        }

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/trips/${tripId}/end`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    final_odometer: finalOdometer,
                    completion_notes: notes
                })
            });

            const result = await response.json();

            if (result.success && result.data.trip) {
                // Update trip in the list
                const tripElement = document.querySelector(`[data-id="${tripId}"]`);
                if (tripElement) {
                    // Update status and odometer display
                    const descriptionDiv = tripElement.querySelector('.item-description');
                    descriptionDiv.innerHTML = `
                        <span class="status-text" style="color: #27ae60;">Completed</span> | 
                        <i class="fas fa-tachometer-alt"></i> ${finalOdometer} km
                    `;

                    // Update action buttons to only show VIEW
                    const actionsDiv = tripElement.querySelector('.item-actions .action-buttons');
                    actionsDiv.innerHTML = `
                        <button class="btn btn-small btn-primary" onclick="viewTripDetails('${tripId}')">
                            <i class="fas fa-eye"></i> VIEW
                        </button>
                    `;

                    // Update data attribute
                    tripElement.setAttribute('data-status', 'completed');
                }

                // Update trip data
                if (window.allTripsData && window.allTripsData[tripId]) {
                    window.allTripsData[tripId].endTime = new Date(result.data.trip.end_time).toLocaleTimeString();
                    window.allTripsData[tripId].status = 'Completed';
                    window.allTripsData[tripId].finalOdometer = finalOdometer;
                    window.allTripsData[tripId].notes = notes;
                }

                // Re-enable Start New Trip button now that trip is completed
                updateStartTripButton();

                const distance = parseInt(finalOdometer) - parseInt(tripData?.odometer || 0);
                showToast(`Trip ${tripId} completed! Distance traveled: ${distance} km`);
                closeModal('endTripModal');
                this.reset();
            } else {
                showToast(result.message || 'Failed to end trip', 'error');
            }
        } catch (error) {
            console.error('Error ending trip:', error);
            showToast('Failed to end trip', 'error');
        }
    });
}

// Check if there are any active trips (Pending or In Progress)
function checkActiveTrips() {
    const tripsList = document.getElementById('tripsList');
    const trips = tripsList.querySelectorAll('[data-status="ready"], [data-status="in-progress"]');
    console.log('Active trips check:', trips.length, 'trips found');
    return trips.length > 0;
}

// Update Start New Trip button state
function updateStartTripButton() {
    const hasActiveTrips = checkActiveTrips();
    const startBtn = document.getElementById('startNewTripBtn');
    const warningDiv = document.getElementById('activeTripWarning');

    console.log('Updating button state - hasActiveTrips:', hasActiveTrips);
    console.log('Button element found:', !!startBtn);

    if (!startBtn) {
        console.error('Start button not found!');
        return;
    }

    if (hasActiveTrips) {
        startBtn.disabled = true;
        startBtn.style.opacity = '0.5';
        startBtn.style.cursor = 'not-allowed';
        if (warningDiv) warningDiv.style.display = 'block';
        console.log('Button DISABLED - active trips exist');
    } else {
        startBtn.disabled = false;
        startBtn.style.opacity = '1';
        startBtn.style.cursor = 'pointer';
        startBtn.removeAttribute('disabled');
        if (warningDiv) warningDiv.style.display = 'none';
        console.log('Button ENABLED - no active trips');
    }
}

// Start Trip Function
async function startTrip(tripId) {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/trips/${tripId}/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (result.success && result.data.trip) {
            const tripElement = document.querySelector(`[data-id="${tripId}"]`);
            if (!tripElement) return;

            // Update status
            const statusSpan = tripElement.querySelector('.status-text');
            statusSpan.textContent = 'In Progress';
            statusSpan.style.color = '#3498db';

            // Update action buttons - replace START with END
            const actionsDiv = tripElement.querySelector('.item-actions .action-buttons');
            actionsDiv.innerHTML = `
                <button class="btn btn-small btn-danger" onclick="endTrip('${tripId}')">
                    <i class="fas fa-flag-checkered"></i> END
                </button>
                <button class="btn btn-small btn-primary" onclick="viewTripDetails('${tripId}')">
                    <i class="fas fa-eye"></i> VIEW
                </button>
            `;

            // Update data attribute
            tripElement.setAttribute('data-status', 'in-progress');

            // Update trip data
            if (window.allTripsData && window.allTripsData[tripId]) {
                window.allTripsData[tripId].startTime = new Date(result.data.trip.start_time).toLocaleTimeString();
                window.allTripsData[tripId].status = 'In Progress';
            }

            // Update button state (still disabled as trip is in progress)
            updateStartTripButton();

            showToast(`Trip ${tripId} started! Safe driving!`);
        } else {
            showToast(result.message || 'Failed to start trip', 'error');
        }
    } catch (error) {
        console.error('Error starting trip:', error);
        showToast('Failed to start trip', 'error');
    }
}

// End Trip Function - opens modal
function endTrip(tripId) {
    document.getElementById('endTripId').value = tripId;

    // Get current odometer from trip data
    const tripData = window.allTripsData?.[tripId];
    if (tripData && tripData.odometer) {
        document.getElementById('endTripOdometer').min = parseInt(tripData.odometer);
        document.getElementById('endTripOdometer').placeholder = `Must be greater than ${tripData.odometer} km`;
    }

    openModal('endTripModal');
}

// View Trip Details Function
function viewTripDetails(tripId) {
    const tripData = window.allTripsData?.[tripId];
    if (!tripData) {
        showToast('Trip data not found!', 'error');
        return;
    }

    // Calculate distance if trip is completed
    const distanceTraveled = tripData.finalOdometer ?
        parseInt(tripData.finalOdometer) - parseInt(tripData.odometer) : null;

    // Build trip details HTML with card-based layout matching vehicle check details
    const statusColor = getStatusColor(tripData.status);
    const detailsHTML = `
        <div class="form-section">
            <h5><i class="fas fa-id-card"></i> Trip Information</h5>
            <div style="display: grid; gap: 10px;">
                <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                    <strong>Trip ID:</strong>
                    <span>${tripData.id}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                    <strong>Route:</strong>
                    <span>${tripData.route}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                    <strong>Date:</strong>
                    <span>${tripData.date}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                    <strong>Status:</strong>
                    <span class="status-badge" style="background-color: ${statusColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.85em;">${tripData.status}</span>
                </div>
            </div>
        </div>
        
        <div class="form-section">
            <h5><i class="fas fa-tachometer-alt"></i> Odometer Readings</h5>
            <div style="display: grid; gap: 10px;">
                <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                    <strong>Starting Odometer:</strong>
                    <span>${tripData.odometer} km</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                    <strong>Final Odometer:</strong>
                    <span>${tripData.finalOdometer ? tripData.finalOdometer + ' km' : '<em>Not completed yet</em>'}</span>
                </div>
                ${distanceTraveled ? `
                <div style="display: flex; justify-content: space-between; padding: 10px; background: #e8f5e8; border-radius: 6px;">
                    <strong>Distance Traveled:</strong>
                    <span style="font-weight: 600; color: #27ae60;">${distanceTraveled} km</span>
                </div>` : ''}
            </div>
        </div>
        
        <div class="form-section">
            <h5><i class="fas fa-clock"></i> Time Information</h5>
            <div style="display: grid; gap: 10px;">
                <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                    <strong>Start Time:</strong>
                    <span>${tripData.startTime}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                    <strong>End Time:</strong>
                    <span>${tripData.endTime}</span>
                </div>
                ${distanceTraveled && tripData.startTime !== 'Not started' && tripData.endTime !== 'Not completed' ? `
                <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                    <strong>Duration:</strong>
                    <span>${calculateDuration(tripData.startTime, tripData.endTime)}</span>
                </div>` : ''}
            </div>
        </div>
        
        <div class="form-section">
            <h5><i class="fas fa-box"></i> Cargo Information</h5>
            <div style="padding: 15px; background: #f8f9fa; border-radius: 6px; min-height: 50px;">
                <p style="margin: 0; color: var(--text-700);">${tripData.cargo || '<em>No cargo details provided</em>'}</p>
            </div>
        </div>
        
        ${tripData.notes ? `
        <div class="form-section">
            <h5><i class="fas fa-sticky-note"></i> Completion Notes</h5>
            <div style="padding: 15px; background: #f8f9fa; border-radius: 6px; min-height: 50px;">
                <p style="margin: 0; color: var(--text-700);">${tripData.notes}</p>
            </div>
        </div>` : ''}
    `;

    // Populate modal content
    document.getElementById('tripDetailsContent').innerHTML = detailsHTML;
    openModal('viewTripModal');
}

// Helper function to calculate duration (simple version)
function calculateDuration(startTime, endTime) {
    if (startTime === 'Not started' || endTime === 'Not completed') {
        return 'N/A';
    }
    // This is a simplified version - in production you'd parse actual time values
    return 'See trip logs for exact duration';
}

// Helper function to get status color
function getStatusColor(status) {
    switch (status) {
        case 'Ready':
        case 'Pending':
            return '#f39c12'; // Yellow
        case 'In Progress':
            return '#3498db'; // Blue
        case 'Completed':
            return '#27ae60'; // Green
        default:
            return '#95a5a6'; // Gray
    }
}

// Edit Trip Function (Placeholder)
function editTrip(tripId) {
    const tripData = window.allTripsData?.[tripId];
    if (!tripData) {
        showToast('Trip data not found!', 'error');
        return;
    }

    // Only allow editing for pending/ready trips
    if (tripData.status !== 'Ready' && tripData.status !== 'Pending') {
        showToast('Only pending trips can be edited!', 'error');
        return;
    }

    // Populate edit form with existing data
    document.getElementById('editTripId').value = tripId;

    // Parse route to get origin and destination
    const routeParts = tripData.route.split(' → ');
    document.getElementById('editTripOrigin').value = routeParts[0] || '';
    document.getElementById('editTripDestination').value = routeParts[1] || '';
    document.getElementById('editTripOdometer').value = tripData.odometer;
    document.getElementById('editTripCargo').value = tripData.cargo || '';

    openModal('editTripModal');
}

// Confirm Cancel Trip
function confirmCancelTrip(tripId) {
    if (confirm('Are you sure you want to cancel this trip? This action cannot be undone.')) {
        cancelTrip(tripId);
    }
}

// Cancel Trip Function
async function cancelTrip(tripId) {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/trips/${tripId}/cancel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (result.success) {
            const tripElement = document.querySelector(`[data-id="${tripId}"]`);
            if (!tripElement) {
                showToast('Trip not found!', 'error');
                return;
            }

            // Remove trip from DOM
            tripElement.remove();

            // Remove from trip data
            if (window.allTripsData && window.allTripsData[tripId]) {
                delete window.allTripsData[tripId];
            }

            // Update button state (re-enable if no active trips)
            updateStartTripButton();

            closeModal('editTripModal');
            showToast(`Trip ${tripId} has been cancelled successfully!`);
        } else {
            showToast(result.message || 'Failed to cancel trip', 'error');
        }
    } catch (error) {
        console.error('Error cancelling trip:', error);
        showToast('Failed to cancel trip', 'error');
    }
}

// Close modal when clicking outside
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        const activeModal = document.querySelector('.modal.active');
        if (activeModal) {
            activeModal.classList.remove('active');
        }
    }
});

// Mobile sidebar toggle
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('open');
}

// Drag and drop for photo upload
function setupDragAndDrop() {
    const uploadAreas = document.querySelectorAll('.photo-upload');

    uploadAreas.forEach(area => {
        area.addEventListener('dragover', function (e) {
            e.preventDefault();
            this.classList.add('dragover');
        });

        area.addEventListener('dragleave', function (e) {
            e.preventDefault();
            this.classList.remove('dragover');
        });

        area.addEventListener('drop', function (e) {
            e.preventDefault();
            this.classList.remove('dragover');

            const files = e.dataTransfer.files;
            const input = this.querySelector('input[type="file"]');
            input.files = files;

            const listId = input.getAttribute('onchange').match(/'([^']+)'/)[1];
            handlePhotoUpload(input, listId);
        });
    });
}

// Load vehicle checks from database
async function loadVehicleChecks() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/vehicle-checks?vehicle_registration=LKA-1234`);
        const result = await response.json();

        if (result.success && result.data) {
            // Clear existing check list
            const checkCard = document.querySelector('#vehicle-check .card');
            if (checkCard) {
                const cardHeader = checkCard.querySelector('.card-header');
                const existingChecks = checkCard.querySelectorAll('.inventory-item');
                existingChecks.forEach(item => item.remove());

                // Add checks from database (already sorted newest first)
                result.data.forEach(check => {
                    addCheckToList(check, false);
                });
            }
        }
    } catch (error) {
        console.error('Error loading vehicle checks:', error);
    }
}

// Add a check to the list (insertAtTop=true for new submissions, false for loading from DB)
function addCheckToList(check, insertAtTop = true) {
    const checkCard = document.querySelector('#vehicle-check .card');
    const cardHeader = checkCard.querySelector('.card-header');

    const weekStart = new Date(check.week_start_date);
    const weekEnd = new Date(check.week_end_date);
    const formatDate = (date) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[date.getMonth()]} ${date.getDate()}`;
    };
    const weekRange = `Week of ${formatDate(weekStart)} - ${formatDate(weekEnd)}`;

    let statusText, statusColor, statusIcon;
    if (check.status === 'approved') {
        statusText = 'APPROVED';
        statusColor = '#27ae60';
        statusIcon = 'fa-check-circle';
    } else if (check.status === 'rejected') {
        statusText = 'REJECTED';
        statusColor = '#e74c3c';
        statusIcon = 'fa-times-circle';
    } else {
        statusText = 'PENDING REVIEW';
        statusColor = '#f39c12';
        statusIcon = 'fa-clock';
    }

    const newCheck = document.createElement('div');
    newCheck.className = 'inventory-item';
    newCheck.setAttribute('data-status', check.status);
    newCheck.id = `check-${check.check_id}`;
    newCheck.innerHTML = `
        <div class="item-details">
            <strong><i class="fas ${statusIcon}"></i> ${check.check_id}</strong>
            <div class="item-meta">
                <i class="fas fa-car"></i> Vehicle: ${check.vehicle_registration} | 
                <i class="fas fa-calendar-week"></i> ${weekRange}
            </div>
            <div class="item-description">
                <span class="status-text" style="color: ${statusColor};">${statusText}</span> | 
                <i class="fas fa-tachometer-alt"></i> Odometer: ${check.odometer_reading.toLocaleString()} km
            </div>
        </div>
        <div class="item-actions">
            <div class="action-buttons">
                <button class="btn btn-small btn-primary" onclick="viewCheckDetails('${check.check_id}')">
                    <i class="fas fa-eye"></i> VIEW
                </button>
                ${check.status === 'rejected' ? `<button class="btn btn-small" style="background:#e74c3c;color:#fff;" onclick="resubmitCheck('${check.check_id}')">
                    <i class="fas fa-redo"></i> RESUBMIT
                </button>` : ''}
                <div class="dropdown-container">
                    <button class="btn btn-small btn-secondary dropdown-trigger" onclick="toggleDropdown(event, 'check-${check.check_id}')">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div class="dropdown-menu" id="dropdown-check-${check.check_id}">
                        <button class="dropdown-item" onclick="printCheck('${check.check_id}')"><i class="fas fa-print"></i> Print Check</button>
                        <button class="dropdown-item" onclick="exportCheck('${check.check_id}')"><i class="fas fa-download"></i> Export</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (insertAtTop) {
        cardHeader.insertAdjacentElement('afterend', newCheck);
    } else {
        checkCard.appendChild(newCheck);
    }

    if (!window.allChecksData) window.allChecksData = {};
    window.allChecksData[check.check_id] = {
        id: check.check_id,
        vehicle: check.vehicle_registration,
        weekRange: weekRange,
        odometer: `${check.odometer_reading.toLocaleString()} km`,
        status: statusText,
        notes: check.notes || 'Submitted - Awaiting supervisor review.',
        rejection: check.rejection_reason
    };
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    initializeForms();
    setupDragAndDrop();

    // Ensure button starts enabled
    const startBtn = document.getElementById('startNewTripBtn');
    if (startBtn) {
        startBtn.disabled = false;
        startBtn.style.opacity = '1';
        startBtn.style.cursor = 'pointer';
    }

    // Load data from database
    loadTrips();
    loadVehicleChecks();
    loadBreakdownReports();

    // Check weekly vehicle check status
    updateWeeklyCheckStatus();

    // Refresh vehicle checks every 30 seconds to see status updates
    setInterval(() => {
        loadVehicleChecks();
        updateWeeklyCheckStatus();
    }, 30000); // 30 seconds

    // Initialize user display
    const userName = "John Driver"; // This would come from session/auth
    const userRole = "Driver";
    const employeeId = "DRV-12345"; // This would come from session/auth

    // Update user name
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = userName;
    }

    // Update user role
    const userRoleElement = document.getElementById('userRole');
    if (userRoleElement) {
        userRoleElement.textContent = userRole;
    }

    // Update employee ID
    const userEmployeeIdElement = document.getElementById('userEmployeeId');
    if (userEmployeeIdElement) {
        userEmployeeIdElement.textContent = `ID: ${employeeId}`;
    }

    // Update avatar with first letter
    const userAvatarElement = document.getElementById('userAvatar');
    if (userAvatarElement && userName) {
        userAvatarElement.textContent = userName.charAt(0).toUpperCase();
    }

    // Set today's date as default for date inputs
    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(input => {
        if (!input.value) {
            input.value = today;
        }
    });

    // Set current datetime for datetime-local inputs
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const datetimeString = now.toISOString().slice(0, 16);
    document.querySelectorAll('input[type="datetime-local"]').forEach(input => {
        if (!input.value) {
            input.value = datetimeString;
        }
    });

    // Breakdown Form Submission
    const breakdownForm = document.getElementById('breakdownForm');
    if (breakdownForm) {
        console.log('Breakdown form found, attaching event listener');
        breakdownForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            console.log('Breakdown form submitted');

            const severity = document.getElementById('breakdownSeverity').value;
            const breakdown_type = document.getElementById('breakdownType').value;
            const description = document.getElementById('breakdownDescription').value;

            console.log('Form values:', { severity, breakdown_type, description });

            if (!severity || !breakdown_type || !description) {
                showToast('Please fill in all required fields', 'error');
                return;
            }

            const formData = {
                vehicle_id: 1,
                severity: severity,
                breakdown_type: breakdown_type,
                description: description,
                breakdown_date: new Date().toISOString().split('T')[0]
            };

            try {
                const token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
                console.log('Token found:', token ? 'Yes' : 'No');

                if (!token) {
                    showToast('Authentication required. Please login again.', 'error');
                    return;
                }

                // Check if editing or creating
                const isEditing = window.editingBreakdownId ? true : false;
                const url = isEditing
                    ? `${CONFIG.API_BASE_URL}/breakdown-reports/${window.editingBreakdownId}`
                    : `${CONFIG.API_BASE_URL}/breakdown-reports`;
                const method = isEditing ? 'PUT' : 'POST';

                console.log(isEditing ? 'Updating' : 'Submitting', 'breakdown report:', formData);
                console.log('API URL:', url, 'Method:', method);

                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(formData)
                });

                console.log('Response status:', response.status);
                const result = await response.json();
                console.log('Response data:', result);

                if (response.ok && result.status === 'success') {
                    showToast(isEditing ? 'Breakdown report updated successfully!' : 'Breakdown report submitted successfully!');
                    closeModal('breakdownModal');
                    this.reset();
                    document.getElementById('breakdownPhotoList').innerHTML = '';

                    // Reset edit mode
                    window.editingBreakdownId = null;
                    const modal = document.getElementById('breakdownModal');
                    const modalTitle = modal.querySelector('.modal-header h2');
                    modalTitle.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Report Vehicle Breakdown';
                    const submitBtn = modal.querySelector('button[type="submit"]');
                    submitBtn.textContent = 'Submit Breakdown Report';

                    // Reload the breakdown list to show the new entry
                    await loadBreakdownReports();
                } else {
                    showToast(result.message || 'Failed to submit breakdown report', 'error');
                }
            } catch (error) {
                console.error('Error submitting breakdown report:', error);
                showToast('Failed to submit breakdown report. Please try again.', 'error');
            }
        });
    } else {
        console.warn('Breakdown form not found!');
    }

    // Breakdown in Route Form Submission
    const breakdownInRouteForm = document.getElementById('breakdownInRouteForm');
    if (breakdownInRouteForm) {
        console.log('Route breakdown form found, attaching event listener');
        breakdownInRouteForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            console.log('Route breakdown form submitted');

            const severity = document.getElementById('routeBreakdownSeverity').value;
            const breakdown_type = document.getElementById('routeBreakdownType').value;
            const breakdown_location = document.getElementById('routeBreakdownLocation').value;
            const breakdown_datetime = document.getElementById('routeBreakdownDatetime').value;
            const description = document.getElementById('routeBreakdownDescription').value;

            if (!severity || !breakdown_type || !breakdown_location || !breakdown_datetime || !description) {
                showToast('Please fill in all required fields', 'error');
                return;
            }

            const formData = {
                vehicle_id: 1,
                severity: severity,
                breakdown_type: breakdown_type,
                breakdown_location: breakdown_location,
                breakdown_datetime: breakdown_datetime,
                description: description
            };

            try {
                const token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
                if (!token) {
                    showToast('Authentication required. Please login again.', 'error');
                    return;
                }

                // Check if editing or creating
                const isEditing = window.editingRouteBreakdownId ? true : false;
                const url = isEditing
                    ? `${CONFIG.API_BASE_URL}/route-breakdowns/${window.editingRouteBreakdownId}`
                    : `${CONFIG.API_BASE_URL}/route-breakdowns`;
                const method = isEditing ? 'PUT' : 'POST';

                console.log(isEditing ? 'Updating' : 'Submitting', 'route breakdown report:', formData);
                console.log('API URL:', url, 'Method:', method);

                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(formData)
                });

                console.log('Response status:', response.status);
                const result = await response.json();
                console.log('Response data:', result);

                if (response.ok && result.status === 'success') {
                    showToast(isEditing ? 'Route breakdown report updated successfully!' : 'Route breakdown report submitted successfully!');
                    closeModal('breakdownInRouteModal');
                    this.reset();
                    document.getElementById('breakdownInRoutePhotoList').innerHTML = '';

                    // Reset edit mode
                    window.editingRouteBreakdownId = null;
                    const modal = document.getElementById('breakdownInRouteModal');
                    const modalTitle = modal.querySelector('.modal-header h2');
                    modalTitle.innerHTML = '<i class="fas fa-road"></i> Report Breakdown In-Route';
                    const submitBtn = modal.querySelector('button[type="submit"]');
                    submitBtn.textContent = 'Submit Breakdown Report';

                    // Reload the breakdown list to show the new entry
                    await loadBreakdownReports();
                } else {
                    showToast(result.message || 'Failed to submit route breakdown report', 'error');
                }
            } catch (error) {
                console.error('Error submitting route breakdown report:', error);
                showToast('Failed to submit route breakdown report. Please try again.', 'error');
            }
        });
    } else {
        console.warn('Route breakdown form not found!');
    }

    // Add mobile menu button for responsive design
    if (window.innerWidth <= 768) {
        const menuBtn = document.createElement('button');
        menuBtn.innerHTML = '☰';
        menuBtn.className = 'menu-btn';
        menuBtn.style.cssText = `
            position: fixed;
            top: 80px;
            left: 20px;
            z-index: 1000;
            background: var(--royal-blue);
            color: white;
            border: none;
            padding: 10px;
            border-radius: 5px;
            font-size: 18px;
            cursor: pointer;
            box-shadow: var(--shadow);
        `;
        menuBtn.onclick = toggleSidebar;
        document.body.prepend(menuBtn);
    }
});
