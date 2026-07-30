export type UserRole = 'administrator' | 'dispatcher' | 'driver' | 'hospital' | 'pharmacy' | 'cold_storage_operator';

export type ShipmentStatus = 'pending' | 'packed' | 'loaded' | 'dispatched' | 'in_transit' | 'delivered' | 'failed' | 'emergency';
export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertCategory = 'critical' | 'temperature' | 'weather' | 'fleet' | 'driver' | 'hospital' | 'system';
export type DriverStatus = 'available' | 'on_duty' | 'off_duty' | 'emergency';
export type VehicleStatus = 'available' | 'in_use' | 'maintenance' | 'breakdown';
export type EmergencyStatus = 'active' | 'responding' | 'resolved';

export interface Organization {
  id: string;
  name: string;
  type: string;
  country: string;
  state: string | null;
  city: string | null;
  address: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  logo_url: string | null;
  created_at: string;
}

export interface Hospital {
  id: string;
  name: string;
  city: string;
  state: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  contact_phone: string | null;
  contact_email: string | null;
  beds: number;
  emergency_available: boolean;
  cold_storage_capacity: number;
  status: string;
  created_at: string;
}

export interface Warehouse {
  id: string;
  name: string;
  city: string;
  state: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  capacity_cubic_meters: number;
  current_occupancy_pct: number;
  temperature_range_min: number;
  temperature_range_max: number;
  status: string;
  contact_phone: string | null;
  created_at: string;
}

export interface ColdStorageFacility {
  id: string;
  name: string;
  city: string;
  state: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  temperature_range_min: number;
  temperature_range_max: number;
  capacity_liters: number;
  available_capacity_pct: number;
  certification: string;
  status: string;
  contact_phone: string | null;
  created_at: string;
}

export interface Driver {
  id: string;
  name: string;
  employee_id: string | null;
  phone: string | null;
  email: string | null;
  license_number: string | null;
  license_expiry: string | null;
  city: string | null;
  state: string | null;
  status: string;
  rating: number;
  total_deliveries: number;
  safe_deliveries: number;
  avatar_url: string | null;
  organization_id: string | null;
  experience_years: number | null;
  vehicle_assigned: string | null;
  created_at: string;
}

export interface Vehicle {
  id: string;
  registration_number: string;
  type: string;
  make: string | null;
  model: string | null;
  year: number | null;
  cooling_system: string;
  max_temp_capacity: number;
  min_temp_capacity: number;
  gps_enabled: boolean;
  iot_sensors_enabled: boolean;
  battery_level: number;
  status: string;
  driver_id: string | null;
  organization_id: string | null;
  last_maintenance_date: string | null;
  current_location: string | null;
  capacity_kg: number | null;
  created_at: string;
}

export interface Shipment {
  id: string;
  shipment_number: string;
  medicine_name: string;
  medicine_type: string;
  batch_number: string | null;
  quantity: number;
  unit: string;
  safe_temp_min: number;
  safe_temp_max: number;
  expiry_date: string | null;
  origin_city: string | null;
  origin_state: string | null;
  destination_city: string | null;
  destination_state: string | null;
  destination_hospital_id: string | null;
  origin_warehouse_id: string | null;
  driver_id: string | null;
  vehicle_id: string | null;
  status: string;
  risk_level: string;
  risk_score: number;
  remaining_safe_hours: number | null;
  eta: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  qr_code: string | null;
  rfid_tag: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  route_status?: string | null;
  active_route?: string | null;
  active_route_waypoints?: number[][] | null;
  rerouted_at?: string | null;
  active_route_eta_minutes?: number | null;
  active_route_distance_km?: number | null;
  active_route_traffic?: string | null;
  active_route_travel_time?: string | null;
}

export interface RouteHistoryEntry {
  id: string;
  shipment_id: string;
  previous_route: string | null;
  new_route: string | null;
  applied_by: string | null;
  reason: string | null;
  created_at: string;
}

export interface Telemetry {
  id: string;
  shipment_id: string;
  temperature: number;
  humidity: number | null;
  pressure: number | null;
  battery_level: number | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  speed_kmh: number | null;
  door_status: string;
  gps_signal_strength: string;
  cooling_system_status: string;
  recorded_at: string;
}

export interface Prediction {
  id: string;
  shipment_id: string;
  spoilage_probability: number;
  remaining_safe_hours: number | null;
  confidence_score: number;
  prediction_text: string | null;
  failure_cause: string | null;
  recommended_action: string | null;
  temperature_stability: string;
  cooling_health: number;
  compressor_health: number;
  battery_health: number;
  sensor_health: number;
  fan_health: number;
  cooling_efficiency: number;
  estimated_failure_time: string | null;
  model_version: string;
  created_at: string;
}

export interface EmergencyEvent {
  id: string;
  shipment_id: string | null;
  event_type: string;
  severity: string;
  description: string | null;
  detected_at: string;
  resolved_at: string | null;
  status: string;
  rescue_cold_storage_id: string | null;
  rescue_hospital_id: string | null;
  rescue_driver_id: string | null;
  response_notes: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface Alert {
  id: string;
  shipment_id: string | null;
  category: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string | null;
  is_read: boolean;
  is_resolved: boolean;
  action_taken: string | null;
  ai_recommendation: string | null;
  vehicle_id: string | null;
  driver_id: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: string;
  roles?: UserRole[];
  children?: NavItem[];
}

export interface AIDecisionHistoryRecord {
  id: string;
  recommendation_id: string;
  shipment_id: string;
  shipment_number: string;
  prediction: string;
  risk_detected: string;
  recommendation_generated: string;
  operator_action: 'accepted' | 'ignored';
  final_outcome: string;
  confidence_score: number;
  created_at: string;
}
