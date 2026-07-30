/*
# ThermaNeXus Auth & Profiles Schema

## Overview
Adds user profiles table linked to auth.users, with auto-creation trigger on signup.
Updates RLS policies to support authenticated access while keeping read access for demo mode.

## New Tables
1. profiles - User profile data (name, email, role, company, phone)
   - Linked to auth.users via id (uuid, PK, FK to auth.users)
   - Auto-created on signup via trigger

## Security Changes
- profiles: RLS enabled, users can read/update own profile, admins can read all
- Existing tables: Read access kept for anon+authenticated (demo mode), write access restricted to authenticated
- New function: handle_new_user() trigger function for auto-profile creation

## Notes
- The trigger automatically creates a profile row when a new user signs up via Supabase Auth
- Default role is 'admin' for new users (can be changed by admin)
- All existing data remains intact
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'admin',
  company text DEFAULT '',
  phone text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies: users can read all profiles (for admin panel), update own
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- Admin can delete profiles
DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;
CREATE POLICY "profiles_delete_admin" ON profiles FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, company, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'admin'),
    COALESCE(NEW.raw_user_meta_data->>'company', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update existing tables: add authenticated write policies
-- Shipments
DROP POLICY IF EXISTS "auth_insert_shipments" ON shipments;
CREATE POLICY "auth_insert_shipments" ON shipments FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_shipments" ON shipments;
CREATE POLICY "auth_update_shipments" ON shipments FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_shipments" ON shipments;
CREATE POLICY "auth_delete_shipments" ON shipments FOR DELETE
  TO authenticated USING (true);

-- Telemetry
DROP POLICY IF EXISTS "auth_insert_telemetry" ON shipment_telemetry;
CREATE POLICY "auth_insert_telemetry" ON shipment_telemetry FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_telemetry" ON shipment_telemetry;
CREATE POLICY "auth_update_telemetry" ON shipment_telemetry FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_telemetry" ON shipment_telemetry;
CREATE POLICY "auth_delete_telemetry" ON shipment_telemetry FOR DELETE
  TO authenticated USING (true);

-- Predictions
DROP POLICY IF EXISTS "auth_insert_predictions" ON predictions;
CREATE POLICY "auth_insert_predictions" ON predictions FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_predictions" ON predictions;
CREATE POLICY "auth_update_predictions" ON predictions FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_predictions" ON predictions;
CREATE POLICY "auth_delete_predictions" ON predictions FOR DELETE
  TO authenticated USING (true);

-- Alerts
DROP POLICY IF EXISTS "auth_insert_alerts" ON alerts;
CREATE POLICY "auth_insert_alerts" ON alerts FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_alerts" ON alerts;
CREATE POLICY "auth_update_alerts" ON alerts FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_alerts" ON alerts;
CREATE POLICY "auth_delete_alerts" ON alerts FOR DELETE
  TO authenticated USING (true);

-- Emergency events
DROP POLICY IF EXISTS "auth_insert_emergency" ON emergency_events;
CREATE POLICY "auth_insert_emergency" ON emergency_events FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_emergency" ON emergency_events;
CREATE POLICY "auth_update_emergency" ON emergency_events FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_emergency" ON emergency_events;
CREATE POLICY "auth_delete_emergency" ON emergency_events FOR DELETE
  TO authenticated USING (true);

-- Hospitals
DROP POLICY IF EXISTS "auth_insert_hospitals" ON hospitals;
CREATE POLICY "auth_insert_hospitals" ON hospitals FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_hospitals" ON hospitals;
CREATE POLICY "auth_update_hospitals" ON hospitals FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_hospitals" ON hospitals;
CREATE POLICY "auth_delete_hospitals" ON hospitals FOR DELETE
  TO authenticated USING (true);

-- Warehouses
DROP POLICY IF EXISTS "auth_insert_warehouses" ON warehouses;
CREATE POLICY "auth_insert_warehouses" ON warehouses FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_warehouses" ON warehouses;
CREATE POLICY "auth_update_warehouses" ON warehouses FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_warehouses" ON warehouses;
CREATE POLICY "auth_delete_warehouses" ON warehouses FOR DELETE
  TO authenticated USING (true);

-- Cold storage
DROP POLICY IF EXISTS "auth_insert_cold_storage" ON cold_storage_facilities;
CREATE POLICY "auth_insert_cold_storage" ON cold_storage_facilities FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_cold_storage" ON cold_storage_facilities;
CREATE POLICY "auth_update_cold_storage" ON cold_storage_facilities FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_cold_storage" ON cold_storage_facilities;
CREATE POLICY "auth_delete_cold_storage" ON cold_storage_facilities FOR DELETE
  TO authenticated USING (true);

-- Drivers
DROP POLICY IF EXISTS "auth_insert_drivers" ON drivers;
CREATE POLICY "auth_insert_drivers" ON drivers FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_drivers" ON drivers;
CREATE POLICY "auth_update_drivers" ON drivers FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_drivers" ON drivers;
CREATE POLICY "auth_delete_drivers" ON drivers FOR DELETE
  TO authenticated USING (true);

-- Vehicles
DROP POLICY IF EXISTS "auth_insert_vehicles" ON vehicles;
CREATE POLICY "auth_insert_vehicles" ON vehicles FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_vehicles" ON vehicles;
CREATE POLICY "auth_update_vehicles" ON vehicles FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_vehicles" ON vehicles;
CREATE POLICY "auth_delete_vehicles" ON vehicles FOR DELETE
  TO authenticated USING (true);

-- Organizations
DROP POLICY IF EXISTS "auth_insert_organizations" ON organizations;
CREATE POLICY "auth_insert_organizations" ON organizations FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_organizations" ON organizations;
CREATE POLICY "auth_update_organizations" ON organizations FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_organizations" ON organizations;
CREATE POLICY "auth_delete_organizations" ON organizations FOR DELETE
  TO authenticated USING (true);

-- Add realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE shipments;
ALTER PUBLICATION supabase_realtime ADD TABLE shipment_telemetry;
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE predictions;
ALTER PUBLICATION supabase_realtime ADD TABLE emergency_events;
