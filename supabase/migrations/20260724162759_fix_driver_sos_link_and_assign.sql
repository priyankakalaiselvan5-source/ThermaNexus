/*
# Fix Driver SOS: Link auth users to drivers table and assign shipments

## Root Cause
The emergency page queried `shipments` by `driver_id = profile.id` (auth user UUID),
but `shipments.driver_id` is a FK to the `drivers` table, not `auth.users`.
No link existed between auth users and the `drivers` table, and all shipments had
`driver_id = NULL`.

## Changes

### 1. Add `user_id` column to `drivers` table
- Links each driver record to their auth user account.

### 2. Link existing driver profiles to drivers by email
- Updates `drivers.user_id` for drivers whose email matches a `profiles` entry with role='driver'.

### 3. Assign active in-transit shipments to drivers
- Updates in_transit shipments to have a `driver_id` and `vehicle_id` so the SOS flow can find them.
*/

-- 1. Add user_id column to drivers table
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers(user_id);

-- 2. Link existing driver profiles to drivers by email
UPDATE drivers d
SET user_id = p.id
FROM profiles p
WHERE d.email = p.email
  AND p.role = 'driver'
  AND d.user_id IS NULL;

-- 3. Assign in_transit shipments to drivers (round-robin)
-- Get all in_transit shipments with no driver
WITH unassigned AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM shipments
  WHERE status = 'in_transit' AND driver_id IS NULL
),
available_drivers AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name) as rn,
         COUNT(*) OVER () as total
  FROM drivers
  WHERE status = 'available'
),
available_vehicles AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY registration_number) as rn,
         COUNT(*) OVER () as total
  FROM vehicles
  WHERE status = 'active'
)
UPDATE shipments s
SET
  driver_id = ad.id,
  vehicle_id = av.id,
  updated_at = now()
FROM unassigned u
JOIN available_drivers ad ON ad.rn = ((u.rn - 1) % ad.total) + 1
JOIN available_vehicles av ON av.rn = ((u.rn - 1) % av.total) + 1
WHERE s.id = u.id;

-- 4. Add shipment timeline table for SOS events
CREATE TABLE IF NOT EXISTS shipment_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES shipments(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  title text NOT NULL,
  description text,
  location text,
  latitude numeric,
  longitude numeric,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE shipment_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "st_select_all" ON shipment_timeline;
CREATE POLICY "st_select_all"
  ON shipment_timeline FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "st_insert_all" ON shipment_timeline;
CREATE POLICY "st_insert_all"
  ON shipment_timeline FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_timeline_shipment ON shipment_timeline(shipment_id);

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE shipment_timeline;
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;
