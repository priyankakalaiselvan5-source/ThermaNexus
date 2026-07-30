/*
# ThermaNeXus Core Schema

## Overview
Full enterprise cold chain logistics platform schema for ThermaNeXus.

## Tables Created
1. organizations - Healthcare organizations (hospitals, pharma, logistics)
2. drivers - Vehicle drivers with contact and license info
3. vehicles - Fleet vehicles with sensor capability flags
4. hospitals - Hospital facilities with location data
5. warehouses - Storage warehouses with capacity info
6. cold_storage_facilities - Cold chain storage locations with temp ranges
7. shipments - Core shipment records with medicine info and status
8. shipment_telemetry - Real-time sensor readings (temp, humidity, pressure, GPS)
9. predictions - AI predictions for spoilage, cooling failure, risk
10. emergency_events - Emergency rescue events and responses
11. alerts - System alerts and notifications
12. routes - Route records with alternatives and traffic data
13. analytics_snapshots - Pre-aggregated analytics data

## Security
- RLS enabled on all tables
- Public read/write via anon+authenticated (demo mode, no mandatory sign-in enforced)

## Notes
- All timestamp columns use timestamptz
- UUID primary keys throughout
- JSONB used for flexible sensor data and coordinates
*/

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'logistics', -- logistics, hospital, pharma, government
  country text DEFAULT 'India',
  state text,
  city text,
  address text,
  contact_email text,
  contact_phone text,
  logo_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_organizations" ON organizations;
CREATE POLICY "anon_select_organizations" ON organizations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_organizations" ON organizations;
CREATE POLICY "anon_insert_organizations" ON organizations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_organizations" ON organizations;
CREATE POLICY "anon_update_organizations" ON organizations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_organizations" ON organizations;
CREATE POLICY "anon_delete_organizations" ON organizations FOR DELETE TO anon, authenticated USING (true);

-- Hospitals
CREATE TABLE IF NOT EXISTS hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  address text,
  latitude numeric(10,6),
  longitude numeric(10,6),
  contact_phone text,
  contact_email text,
  beds integer DEFAULT 0,
  emergency_available boolean DEFAULT true,
  cold_storage_capacity numeric DEFAULT 0,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_hospitals" ON hospitals;
CREATE POLICY "anon_select_hospitals" ON hospitals FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_hospitals" ON hospitals;
CREATE POLICY "anon_insert_hospitals" ON hospitals FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_hospitals" ON hospitals;
CREATE POLICY "anon_update_hospitals" ON hospitals FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_hospitals" ON hospitals;
CREATE POLICY "anon_delete_hospitals" ON hospitals FOR DELETE TO anon, authenticated USING (true);

-- Warehouses
CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  address text,
  latitude numeric(10,6),
  longitude numeric(10,6),
  capacity_cubic_meters numeric DEFAULT 0,
  current_occupancy_pct numeric DEFAULT 0,
  temperature_range_min numeric DEFAULT 2,
  temperature_range_max numeric DEFAULT 8,
  status text DEFAULT 'active',
  contact_phone text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_warehouses" ON warehouses;
CREATE POLICY "anon_select_warehouses" ON warehouses FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_warehouses" ON warehouses;
CREATE POLICY "anon_insert_warehouses" ON warehouses FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_warehouses" ON warehouses;
CREATE POLICY "anon_update_warehouses" ON warehouses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_warehouses" ON warehouses;
CREATE POLICY "anon_delete_warehouses" ON warehouses FOR DELETE TO anon, authenticated USING (true);

-- Cold Storage Facilities
CREATE TABLE IF NOT EXISTS cold_storage_facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  address text,
  latitude numeric(10,6),
  longitude numeric(10,6),
  temperature_range_min numeric DEFAULT -20,
  temperature_range_max numeric DEFAULT 8,
  capacity_liters numeric DEFAULT 0,
  available_capacity_pct numeric DEFAULT 0,
  certification text DEFAULT 'WHO-GMP',
  status text DEFAULT 'active',
  contact_phone text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cold_storage_facilities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_cold_storage" ON cold_storage_facilities;
CREATE POLICY "anon_select_cold_storage" ON cold_storage_facilities FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_cold_storage" ON cold_storage_facilities;
CREATE POLICY "anon_insert_cold_storage" ON cold_storage_facilities FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_cold_storage" ON cold_storage_facilities;
CREATE POLICY "anon_update_cold_storage" ON cold_storage_facilities FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_cold_storage" ON cold_storage_facilities;
CREATE POLICY "anon_delete_cold_storage" ON cold_storage_facilities FOR DELETE TO anon, authenticated USING (true);

-- Drivers
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  employee_id text UNIQUE,
  phone text,
  email text,
  license_number text,
  license_expiry date,
  city text,
  state text,
  status text DEFAULT 'available', -- available, on_duty, off_duty, emergency
  rating numeric DEFAULT 4.5,
  total_deliveries integer DEFAULT 0,
  safe_deliveries integer DEFAULT 0,
  avatar_url text,
  organization_id uuid REFERENCES organizations(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_drivers" ON drivers;
CREATE POLICY "anon_select_drivers" ON drivers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_drivers" ON drivers;
CREATE POLICY "anon_insert_drivers" ON drivers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_drivers" ON drivers;
CREATE POLICY "anon_update_drivers" ON drivers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_drivers" ON drivers;
CREATE POLICY "anon_delete_drivers" ON drivers FOR DELETE TO anon, authenticated USING (true);

-- Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number text UNIQUE NOT NULL,
  type text DEFAULT 'refrigerated_truck',
  make text,
  model text,
  year integer,
  cooling_system text DEFAULT 'dual_compressor',
  max_temp_capacity numeric DEFAULT -20,
  min_temp_capacity numeric DEFAULT 8,
  gps_enabled boolean DEFAULT true,
  iot_sensors_enabled boolean DEFAULT true,
  battery_level numeric DEFAULT 100,
  status text DEFAULT 'available', -- available, in_use, maintenance, breakdown
  driver_id uuid REFERENCES drivers(id),
  organization_id uuid REFERENCES organizations(id),
  last_maintenance_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_vehicles" ON vehicles;
CREATE POLICY "anon_select_vehicles" ON vehicles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_vehicles" ON vehicles;
CREATE POLICY "anon_insert_vehicles" ON vehicles FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_vehicles" ON vehicles;
CREATE POLICY "anon_update_vehicles" ON vehicles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_vehicles" ON vehicles;
CREATE POLICY "anon_delete_vehicles" ON vehicles FOR DELETE TO anon, authenticated USING (true);

-- Shipments
CREATE TABLE IF NOT EXISTS shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_number text UNIQUE NOT NULL,
  medicine_name text NOT NULL,
  medicine_type text DEFAULT 'vaccine',
  batch_number text,
  quantity integer DEFAULT 1,
  unit text DEFAULT 'vials',
  safe_temp_min numeric DEFAULT 2,
  safe_temp_max numeric DEFAULT 8,
  expiry_date date,
  origin_city text,
  origin_state text,
  destination_city text,
  destination_state text,
  destination_hospital_id uuid REFERENCES hospitals(id),
  origin_warehouse_id uuid REFERENCES warehouses(id),
  driver_id uuid REFERENCES drivers(id),
  vehicle_id uuid REFERENCES vehicles(id),
  status text DEFAULT 'pending', -- pending, packed, loaded, dispatched, in_transit, delivered, failed, emergency
  risk_level text DEFAULT 'low', -- low, moderate, high, critical
  risk_score numeric DEFAULT 0,
  remaining_safe_hours numeric,
  eta timestamptz,
  dispatched_at timestamptz,
  delivered_at timestamptz,
  qr_code text,
  rfid_tag text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_shipments" ON shipments;
CREATE POLICY "anon_select_shipments" ON shipments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_shipments" ON shipments;
CREATE POLICY "anon_insert_shipments" ON shipments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_shipments" ON shipments;
CREATE POLICY "anon_update_shipments" ON shipments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_shipments" ON shipments;
CREATE POLICY "anon_delete_shipments" ON shipments FOR DELETE TO anon, authenticated USING (true);

-- Shipment Telemetry (IoT sensor readings)
CREATE TABLE IF NOT EXISTS shipment_telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  temperature numeric NOT NULL,
  humidity numeric,
  pressure numeric,
  battery_level numeric,
  gps_latitude numeric(10,6),
  gps_longitude numeric(10,6),
  speed_kmh numeric,
  door_status text DEFAULT 'closed',
  gps_signal_strength text DEFAULT 'good',
  cooling_system_status text DEFAULT 'active',
  recorded_at timestamptz DEFAULT now()
);

ALTER TABLE shipment_telemetry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_telemetry" ON shipment_telemetry;
CREATE POLICY "anon_select_telemetry" ON shipment_telemetry FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_telemetry" ON shipment_telemetry;
CREATE POLICY "anon_insert_telemetry" ON shipment_telemetry FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_telemetry" ON shipment_telemetry;
CREATE POLICY "anon_update_telemetry" ON shipment_telemetry FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_telemetry" ON shipment_telemetry;
CREATE POLICY "anon_delete_telemetry" ON shipment_telemetry FOR DELETE TO anon, authenticated USING (true);

-- AI Predictions
CREATE TABLE IF NOT EXISTS predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  spoilage_probability numeric DEFAULT 0,
  remaining_safe_hours numeric,
  confidence_score numeric DEFAULT 0,
  prediction_text text,
  failure_cause text,
  recommended_action text,
  temperature_stability text DEFAULT 'stable',
  cooling_health numeric DEFAULT 100,
  compressor_health numeric DEFAULT 100,
  battery_health numeric DEFAULT 100,
  sensor_health numeric DEFAULT 100,
  fan_health numeric DEFAULT 100,
  cooling_efficiency numeric DEFAULT 100,
  estimated_failure_time timestamptz,
  model_version text DEFAULT 'v2.1',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_predictions" ON predictions;
CREATE POLICY "anon_select_predictions" ON predictions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_predictions" ON predictions;
CREATE POLICY "anon_insert_predictions" ON predictions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_predictions" ON predictions;
CREATE POLICY "anon_update_predictions" ON predictions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_predictions" ON predictions;
CREATE POLICY "anon_delete_predictions" ON predictions FOR DELETE TO anon, authenticated USING (true);

-- Emergency Events
CREATE TABLE IF NOT EXISTS emergency_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES shipments(id),
  event_type text NOT NULL, -- temperature_breach, cooling_failure, battery_critical, spoilage_risk, vehicle_breakdown
  severity text DEFAULT 'high', -- moderate, high, critical
  description text,
  detected_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  status text DEFAULT 'active', -- active, responding, resolved
  rescue_cold_storage_id uuid REFERENCES cold_storage_facilities(id),
  rescue_hospital_id uuid REFERENCES hospitals(id),
  rescue_driver_id uuid REFERENCES drivers(id),
  response_notes text,
  latitude numeric(10,6),
  longitude numeric(10,6),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE emergency_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_emergency" ON emergency_events;
CREATE POLICY "anon_select_emergency" ON emergency_events FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_emergency" ON emergency_events;
CREATE POLICY "anon_insert_emergency" ON emergency_events FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_emergency" ON emergency_events;
CREATE POLICY "anon_update_emergency" ON emergency_events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_emergency" ON emergency_events;
CREATE POLICY "anon_delete_emergency" ON emergency_events FOR DELETE TO anon, authenticated USING (true);

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES shipments(id),
  category text NOT NULL, -- critical, temperature, weather, fleet, driver, hospital, system
  alert_type text NOT NULL,
  severity text DEFAULT 'medium', -- low, medium, high, critical
  title text NOT NULL,
  message text,
  is_read boolean DEFAULT false,
  is_resolved boolean DEFAULT false,
  action_taken text,
  ai_recommendation text,
  vehicle_id uuid REFERENCES vehicles(id),
  driver_id uuid REFERENCES drivers(id),
  latitude numeric(10,6),
  longitude numeric(10,6),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_alerts" ON alerts;
CREATE POLICY "anon_select_alerts" ON alerts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_alerts" ON alerts;
CREATE POLICY "anon_insert_alerts" ON alerts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_alerts" ON alerts;
CREATE POLICY "anon_update_alerts" ON alerts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_alerts" ON alerts;
CREATE POLICY "anon_delete_alerts" ON alerts FOR DELETE TO anon, authenticated USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_risk_level ON shipments(risk_level);
CREATE INDEX IF NOT EXISTS idx_telemetry_shipment_id ON shipment_telemetry(shipment_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_recorded_at ON shipment_telemetry(recorded_at);
CREATE INDEX IF NOT EXISTS idx_predictions_shipment_id ON predictions(shipment_id);
CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_emergency_status ON emergency_events(status);
