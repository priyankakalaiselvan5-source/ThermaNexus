import type { Shipment, Vehicle, Driver, Hospital, Warehouse, ColdStorageFacility, Alert, EmergencyEvent } from '@/types';

const now = new Date().toISOString();
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600000).toISOString();
const hoursAhead = (h: number) => new Date(Date.now() + h * 3600000).toISOString();

export const MOCK_SHIPMENTS: Shipment[] = [
  { id: 'm-sh1', shipment_number: 'SHP-2025-001', medicine_name: 'Insulin Vials', medicine_type: 'vaccine', batch_number: 'BCH-001', quantity: 500, unit: 'vials', safe_temp_min: 2, safe_temp_max: 8, expiry_date: '2026-03-01', origin_city: 'Mumbai', origin_state: 'MH', destination_city: 'Pune', destination_state: 'MH', destination_hospital_id: null, origin_warehouse_id: null, driver_id: 'm-drv1', vehicle_id: 'm-veh1', status: 'in_transit', risk_level: 'low', risk_score: 8, remaining_safe_hours: 14, eta: hoursAhead(4), dispatched_at: hoursAgo(2), delivered_at: null, qr_code: null, rfid_tag: null, notes: null, created_at: hoursAgo(3), updated_at: now },
  { id: 'm-sh2', shipment_number: 'SHP-2025-002', medicine_name: 'COVID Vaccine', medicine_type: 'vaccine', batch_number: 'BCH-002', quantity: 1200, unit: 'doses', safe_temp_min: -70, safe_temp_max: -60, expiry_date: '2026-06-01', origin_city: 'Delhi', origin_state: 'DL', destination_city: 'Jaipur', destination_state: 'RJ', destination_hospital_id: null, origin_warehouse_id: null, driver_id: 'm-drv2', vehicle_id: 'm-veh2', status: 'in_transit', risk_level: 'moderate', risk_score: 35, remaining_safe_hours: 8, eta: hoursAhead(6), dispatched_at: hoursAgo(1), delivered_at: null, qr_code: null, rfid_tag: null, notes: null, created_at: hoursAgo(2), updated_at: now },
  { id: 'm-sh3', shipment_number: 'SHP-2025-003', medicine_name: 'Heparin Injection', medicine_type: 'injectable', batch_number: 'BCH-003', quantity: 300, unit: 'units', safe_temp_min: 2, safe_temp_max: 8, expiry_date: '2026-01-01', origin_city: 'Bengaluru', origin_state: 'KA', destination_city: 'Chennai', destination_state: 'TN', destination_hospital_id: null, origin_warehouse_id: null, driver_id: 'm-drv3', vehicle_id: 'm-veh3', status: 'delivered', risk_level: 'low', risk_score: 5, remaining_safe_hours: null, eta: hoursAgo(1), dispatched_at: hoursAgo(8), delivered_at: hoursAgo(1), qr_code: null, rfid_tag: null, notes: null, created_at: hoursAgo(10), updated_at: now },
  { id: 'm-sh4', shipment_number: 'SHP-2025-004', medicine_name: 'Amoxicillin', medicine_type: 'antibiotic', batch_number: 'BCH-004', quantity: 1000, unit: 'tablets', safe_temp_min: 15, safe_temp_max: 25, expiry_date: '2027-01-01', origin_city: 'Kolkata', origin_state: 'WB', destination_city: 'Bhubaneswar', destination_state: 'OD', destination_hospital_id: null, origin_warehouse_id: null, driver_id: null, vehicle_id: null, status: 'pending', risk_level: 'low', risk_score: 12, remaining_safe_hours: 48, eta: null, dispatched_at: null, delivered_at: null, qr_code: null, rfid_tag: null, notes: null, created_at: hoursAgo(1), updated_at: now },
  { id: 'm-sh5', shipment_number: 'SHP-2025-005', medicine_name: 'Remdesivir', medicine_type: 'antiviral', batch_number: 'BCH-005', quantity: 200, unit: 'vials', safe_temp_min: 2, safe_temp_max: 8, expiry_date: '2026-09-01', origin_city: 'Hyderabad', origin_state: 'TS', destination_city: 'Vijayawada', destination_state: 'AP', destination_hospital_id: null, origin_warehouse_id: null, driver_id: 'm-drv4', vehicle_id: 'm-veh4', status: 'in_transit', risk_level: 'critical', risk_score: 78, remaining_safe_hours: 3, eta: hoursAhead(2), dispatched_at: hoursAgo(3), delivered_at: null, qr_code: null, rfid_tag: null, notes: 'Temperature excursion detected', created_at: hoursAgo(4), updated_at: now },
];

export const MOCK_VEHICLES: Vehicle[] = [
  { id: 'm-veh1', registration_number: 'MH04SC1234', type: 'refrigerated_truck', make: 'Tata', model: 'Ace EV', year: 2024, cooling_system: 'single_zone', max_temp_capacity: 8, min_temp_capacity: -20, gps_enabled: true, iot_sensors_enabled: true, battery_level: 85, status: 'in_use', driver_id: 'm-drv1', organization_id: null, last_maintenance_date: '2025-06-15', current_location: 'Mumbai', capacity_kg: 1200, created_at: now },
  { id: 'm-veh2', registration_number: 'DL02GH5678', type: 'refrigerated_truck', make: 'Ashok Leyland', model: 'Dost', year: 2023, cooling_system: 'dual_zone', max_temp_capacity: 8, min_temp_capacity: -25, gps_enabled: true, iot_sensors_enabled: true, battery_level: 72, status: 'in_use', driver_id: 'm-drv2', organization_id: null, last_maintenance_date: '2025-05-20', current_location: 'Delhi', capacity_kg: 1500, created_at: now },
  { id: 'm-veh3', registration_number: 'KA05MN9012', type: 'van', make: 'Mahindra', model: 'Bolero', year: 2024, cooling_system: 'multi_zone', max_temp_capacity: 8, min_temp_capacity: -20, gps_enabled: true, iot_sensors_enabled: true, battery_level: 91, status: 'available', driver_id: null, organization_id: null, last_maintenance_date: '2025-07-01', current_location: 'Bengaluru', capacity_kg: 800, created_at: now },
  { id: 'm-veh4', registration_number: 'WB04SC7890', type: 'mini_truck', make: 'Tata', model: 'Intra V30', year: 2022, cooling_system: 'single_zone', max_temp_capacity: 8, min_temp_capacity: -18, gps_enabled: true, iot_sensors_enabled: false, battery_level: 45, status: 'in_use', driver_id: 'm-drv4', organization_id: null, last_maintenance_date: '2025-04-10', current_location: 'Hyderabad', capacity_kg: 600, created_at: now },
  { id: 'm-veh5', registration_number: 'TS09SC6789', type: 'refrigerated_van', make: 'Force', model: 'Traveller', year: 2023, cooling_system: 'dual_zone', max_temp_capacity: 8, min_temp_capacity: -20, gps_enabled: true, iot_sensors_enabled: true, battery_level: 60, status: 'maintenance', driver_id: null, organization_id: null, last_maintenance_date: '2025-07-10', current_location: 'Hyderabad', capacity_kg: 1000, created_at: now },
];

export const MOCK_DRIVERS: Driver[] = [
  { id: 'm-drv1', name: 'Rajesh Kumar', employee_id: 'EMP-001', phone: '+91-9876543210', email: 'rajesh@therma.in', license_number: 'DL-042019', license_expiry: '2027-01-01', city: 'Mumbai', state: 'MH', status: 'on_duty', rating: 4.8, total_deliveries: 142, safe_deliveries: 138, avatar_url: null, organization_id: null, experience_years: 8, vehicle_assigned: 'm-veh1', created_at: now },
  { id: 'm-drv2', name: 'Amit Singh', employee_id: 'EMP-002', phone: '+91-9876543211', email: 'amit@therma.in', license_number: 'DL-042020', license_expiry: '2026-06-01', city: 'Delhi', state: 'DL', status: 'on_duty', rating: 4.6, total_deliveries: 98, safe_deliveries: 94, avatar_url: null, organization_id: null, experience_years: 5, vehicle_assigned: 'm-veh2', created_at: now },
  { id: 'm-drv3', name: 'Suresh Reddy', employee_id: 'EMP-003', phone: '+91-9876543212', email: 'suresh@therma.in', license_number: 'KA-042021', license_expiry: '2027-03-01', city: 'Bengaluru', state: 'KA', status: 'available', rating: 4.9, total_deliveries: 210, safe_deliveries: 205, avatar_url: null, organization_id: null, experience_years: 10, vehicle_assigned: 'm-veh3', created_at: now },
  { id: 'm-drv4', name: 'Vikram Patel', employee_id: 'EMP-004', phone: '+91-9876543213', email: 'vikram@therma.in', license_number: 'TS-042022', license_expiry: '2026-12-01', city: 'Hyderabad', state: 'TS', status: 'on_duty', rating: 4.3, total_deliveries: 76, safe_deliveries: 70, avatar_url: null, organization_id: null, experience_years: 4, vehicle_assigned: 'm-veh4', created_at: now },
];

export const MOCK_HOSPITALS: Hospital[] = Array.from({ length: 24 }, (_, i) => {
  const cities = ['Mumbai', 'Delhi', 'Bengaluru', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Jaipur'];
  return {
    id: `m-hosp${i + 1}`,
    name: `City Hospital ${i + 1}`,
    city: cities[i % cities.length],
    state: 'MH',
    address: null,
    latitude: null,
    longitude: null,
    contact_phone: null,
    contact_email: null,
    beds: 100 + i * 5,
    emergency_available: i % 3 !== 0,
    cold_storage_capacity: 500 + i * 20,
    status: 'active',
    created_at: now,
  };
});

export const MOCK_WAREHOUSES: Warehouse[] = Array.from({ length: 8 }, (_, i) => ({
  id: `m-wh${i + 1}`,
  name: `Regional Warehouse ${i + 1}`,
  city: ['Mumbai', 'Delhi', 'Bengaluru', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Jaipur'][i],
  state: 'MH',
  address: null,
  latitude: null,
  longitude: null,
  capacity_cubic_meters: 2000 + i * 200,
  current_occupancy_pct: 40 + (i * 7) % 50,
  temperature_range_min: -25,
  temperature_range_max: 8,
  status: 'active',
  contact_phone: null,
  created_at: now,
}));

export const MOCK_COLD_STORAGE: ColdStorageFacility[] = Array.from({ length: 15 }, (_, i) => ({
  id: `m-cs${i + 1}`,
  name: `Cold Storage Facility ${i + 1}`,
  city: ['Mumbai', 'Delhi', 'Bengaluru', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Jaipur'][i % 8],
  state: 'MH',
  address: null,
  latitude: null,
  longitude: null,
  temperature_range_min: -25,
  temperature_range_max: 8,
  capacity_liters: 5000 + i * 300,
  available_capacity_pct: 50 + (i * 5) % 40,
  certification: 'WHO-GDP',
  status: 'active',
  contact_phone: null,
  created_at: now,
}));

export const MOCK_ALERTS: Alert[] = [
  { id: 'm-al1', shipment_id: 'm-sh5', category: 'critical', alert_type: 'temperature_excursion', severity: 'critical', title: 'Temperature Excursion - SHP-2025-005', message: 'Remdesivir shipment exceeded safe temperature range', is_read: false, is_resolved: false, action_taken: null, ai_recommendation: 'Reroute to nearest cold storage', vehicle_id: 'm-veh4', driver_id: 'm-drv4', latitude: null, longitude: null, created_at: hoursAgo(1) },
  { id: 'm-al2', shipment_id: 'm-sh2', category: 'temperature', alert_type: 'temp_warning', severity: 'warning', title: 'Temperature Warning - SHP-2025-002', message: 'COVID Vaccine approaching upper temp limit', is_read: false, is_resolved: false, action_taken: null, ai_recommendation: 'Monitor closely', vehicle_id: 'm-veh2', driver_id: 'm-drv2', latitude: null, longitude: null, created_at: hoursAgo(2) },
  { id: 'm-al3', shipment_id: null, category: 'fleet', alert_type: 'maintenance_due', severity: 'warning', title: 'Vehicle Maintenance Due', message: 'WB04SC7890 scheduled for maintenance', is_read: false, is_resolved: false, action_taken: null, ai_recommendation: null, vehicle_id: 'm-veh5', driver_id: null, latitude: null, longitude: null, created_at: hoursAgo(5) },
];

export const MOCK_EMERGENCIES: EmergencyEvent[] = [
  { id: 'm-em1', shipment_id: 'm-sh5', event_type: 'temperature_breach', severity: 'critical', description: 'Cold chain broken - Remdesivir at risk', detected_at: hoursAgo(1), resolved_at: null, status: 'active', rescue_cold_storage_id: null, rescue_hospital_id: null, rescue_driver_id: null, response_notes: null, latitude: 17.385, longitude: 78.4867, created_at: hoursAgo(1) },
];
