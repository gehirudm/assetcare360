// Modal markup is provided by one-modal-per-component scripts loaded in index.html.

// Machine types with their specific components (Litro Gas company equipment)
const MACHINE_TYPES = {
    'LPG Cylinder Filling Machine': ['Filling Valve', 'Pressure Gauge', 'Flow Meter', 'Control Panel', 'Safety Relief Valve', 'Weighing System', 'Conveyor Belt'],
    'Gas Cylinder Testing Machine': ['Hydraulic Pump', 'Pressure Gauge', 'Control Panel', 'Safety Valve', 'Test Chamber', 'Pressure Regulator'],
    'Cylinder Painting Machine': ['Spray Gun', 'Air Compressor', 'Paint Tank', 'Control Panel', 'Conveyor System', 'Ventilation System'],
    'Valve Crimping Machine': ['Hydraulic Press', 'Control Panel', 'Valve Holder', 'Safety Guard', 'Pressure Gauge'],
    'Gas Leak Detector': ['Sensor Unit', 'Display Panel', 'Alarm System', 'Battery', 'Calibration Unit'],
    'Cylinder Washing Machine': ['Water Pump', 'Heating Element', 'Control Panel', 'Drainage System', 'Conveyor Belt', 'Drying Unit'],
    'LPG Storage Tank': ['Pressure Gauge', 'Safety Relief Valve', 'Level Indicator', 'Temperature Sensor', 'Emergency Shut-off Valve'],
    'Gas Compressor': ['Motor', 'Compressor Unit', 'Cooling System', 'Control Panel', 'Pressure Switch', 'Oil Filter', 'Air Filter'],
    'Forklift': ['Engine', 'Hydraulic System', 'Control Panel', 'Cooling System', 'Forks', 'Mast', 'Steering System', 'Brakes'],
    'Delivery Truck': ['Engine', 'Transmission', 'Braking System', 'Suspension', 'Electrical System', 'Cooling System', 'Cargo Space'],
    'Cylinder Carousel System': ['Motor', 'Control Panel', 'Rotating Platform', 'Safety Sensors', 'Drive Belt', 'Emergency Stop'],
    'Vaporizer': ['Heat Exchanger', 'Control Panel', 'Pressure Regulator', 'Safety Valve', 'Temperature Sensor']
};

const LOCATIONS = ['LOCATION 1', 'LOCATION 2', 'LOCATION 3', 'LOCATION 4'];

// Vehicle types with their specific components (Litro Gas company vehicles)
const VEHICLE_TYPES = {
    'LPG Distribution Truck': ['Engine', 'Transmission', 'Braking System', 'Suspension', 'LPG Tank', 'Pressure Regulator', 'Safety Valve', 'Loading System'],
    'Cylinder Delivery Van': ['Engine', 'Transmission', 'Braking System', 'Suspension', 'Cargo Space', 'Loading Ramp', 'Safety Straps'],
    'Forklift': ['Engine', 'Hydraulic System', 'Control Panel', 'Cooling System', 'Forks', 'Mast', 'Steering System', 'Brakes'],
    'Tanker Lorry': ['Engine', 'Transmission', 'Braking System', 'Tank Body', 'Pump System', 'Safety Valve', 'Emergency Shut-off', 'Discharge System'],
    'Staff Car': ['Engine', 'Transmission', 'Braking System', 'Suspension', 'Electrical System', 'Air Conditioning', 'Safety Features'],
    'Pickup Truck': ['Engine', 'Transmission', 'Braking System', 'Suspension', 'Cargo Bed', 'Towing System'],
    'Three-Wheeler': ['Engine', 'Transmission', 'Braking System', 'Cargo Space', 'Suspension'],
    'Motorcycle': ['Engine', 'Transmission', 'Braking System', 'Suspension', 'Electrical System']
};

function getMachineFromComponent(id) {
    const machinesModel = document.querySelector('inventory-machines');
    const machines = Array.isArray(machinesModel?.machines) ? machinesModel.machines : [];
    return machines.find(machine => Number(machine.id) === Number(id)) || null;
}

function getVehicleFromComponent(id) {
    const vehiclesModel = document.querySelector('inventory-vehicles');
    const vehicles = Array.isArray(vehiclesModel?.vehicles) ? vehiclesModel.vehicles : [];
    return vehicles.find(vehicle => Number(vehicle.id) === Number(id)) || null;
}

function normalizeVehicleRecord(vehicle) {
    if (!vehicle || typeof vehicle !== 'object') {
        return null;
    }

    const normalizedMileage = Number(vehicle.current_mileage);
    const fallbackMileage = Number(vehicle.mileage);

    return {
        ...vehicle,
        number_plate: vehicle.number_plate || vehicle.registration_number || '',
        current_mileage: Number.isFinite(normalizedMileage)
            ? normalizedMileage
            : (Number.isFinite(fallbackMileage) ? fallbackMileage : 0)
    };
}

async function fetchMachineRecord(id) {
    const localRecord = getMachineFromComponent(id);
    if (localRecord) {
        return localRecord;
    }

    try {
        const response = await API.get(`/machines/${id}`);
        if (response.status === 'success' && response.data) {
            return response.data.machine || response.data;
        }
    } catch (error) {
        console.warn('Failed to fetch machine by id, falling back to list endpoint:', error);
    }

    try {
        const response = await API.get('/machines');
        if (response.status === 'success') {
            const records = Array.isArray(response.data?.machines) ? response.data.machines : [];
            return records.find(machine => Number(machine.id) === Number(id)) || null;
        }
    } catch (error) {
        console.warn('Failed to fetch machine list:', error);
    }

    return null;
}

async function fetchVehicleRecord(id) {
    const localRecord = normalizeVehicleRecord(getVehicleFromComponent(id));
    if (localRecord) {
        return localRecord;
    }

    try {
        const response = await API.get(`/vehicles/${id}`);
        if (response.status === 'success' && response.data) {
            return normalizeVehicleRecord(response.data.vehicle || response.data);
        }
    } catch (error) {
        console.warn('Failed to fetch vehicle by id, falling back to list endpoint:', error);
    }

    try {
        const response = await API.get('/vehicles');
        if (response.status === 'success') {
            const records = Array.isArray(response.data?.vehicles) ? response.data.vehicles : [];
            const match = records.find(vehicle => Number(vehicle.id) === Number(id)) || null;
            return normalizeVehicleRecord(match);
        }
    } catch (error) {
        console.warn('Failed to fetch vehicle list:', error);
    }

    return null;
}

function getStatusClass(status) {
    switch (status) {
        case 'Active': return 'status-in-stock';
        case 'Under Maintenance': return 'status-low-stock';
        case 'Inactive': return 'status-out-of-stock';
        case 'Decommissioned': return 'status-rejected';
        case 'For Auction': return 'status-auction';
        default: return 'status-normal';
    }
}
// ==================== SPARE PARTS CATALOG FUNCTIONS ====================

// Define spare part names for each category
const SPARE_PART_NAMES = {
    vehicles: [
        'Brake Pads',
        'Oil Filter',
        'Air Filter',
        'Fuel Filter',
        'Battery',
        'Tyres',
        'Engine Oil',
        'Transmission Fluid',
        'Spark Plugs',
        'Alternator',
        'Radiator',
        'Water Pump',
        'Timing Belt',
        'Clutch Kit',
        'Suspension Parts',
        'Headlights',
        'Wiper Blades'
    ],
    machines: [
        'Hydraulic Pump',
        'Hydraulic Fluid',
        'Pressure Valve',
        'Gas Cylinder',
        'Pressure Regulator',
        'Safety Valve',
        'Compressor Belt',
        'Compressor Oil',
        'Seals and Gaskets',
        'Hoses',
        'Filters',
        'Bearings',
        'Motor Components',
        'Control Panel Parts',
        'Sensors',
        'Electrical Components',
        'Pneumatic Parts'
    ]
};

// Spare-part modal behavior has been decomposed into one-modal-per-component scripts:
// add-part-modal, edit-part-modal, delete-modal, reorder-modal, add-stock-modal.
// Machine and vehicle modal workflows were decomposed into dedicated scripts:
// machine-form-modal, machine-details-modal, vehicle-form-modal, vehicle-details-modal, vehicle-mileage-modal.
