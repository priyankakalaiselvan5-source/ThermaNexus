/*
# Driver Navigation Realtime Sync

1. New Tables
- `truck_positions`: Stores live truck position, route, speed, ETA, reroute status.
  - `id` (uuid, PK)
  - `shipment_id` (uuid, FK to shipments)
  - `driver_id` (uuid, FK to auth.users)
  - `vehicle_id` (uuid, nullable)
  - `lat` (numeric, current latitude)
  - `lng` (numeric, current longitude)
  - `destination_lat` (numeric, destination latitude)
  - `destination_lng` (numeric, destination longitude)
  - `destination_name` (text, destination city/hospital name)
  - `route_waypoints` (jsonb, array of [lat,lng] pairs for the route polyline)
  - `speed_kmh` (integer, current speed)
  - `eta_minutes` (integer, estimated time to arrival)
  - `distance_remaining_km` (numeric, distance to destination)
  - `traffic_status` (text, 'clear' | 'moderate' | 'heavy')
  - `is_rerouted` (boolean, true when AI has rerouted)
  - `reroute_reason` (text, nullable, reason for reroute)
  - `progress` (numeric, 0-1 route progress)
  - `updated_at` (timestamptz)

2. Security
- Enable RLS on `truck_positions`.
- Authenticated users can read all positions (admin, dispatcher, driver all need visibility).
- Drivers can update only their own position row.
- Drivers can insert their own position row.

3. Realtime
- Add `truck_positions` to the `supabase_realtime` publication for instant sync.
*/

CREATE TABLE IF NOT EXISTS truck_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES shipments(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id uuid,
  lat numeric NOT NULL DEFAULT 0,
  lng numeric NOT NULL DEFAULT 0,
  destination_lat numeric NOT NULL DEFAULT 0,
  destination_lng numeric NOT NULL DEFAULT 0,
  destination_name text NOT NULL DEFAULT '',
  route_waypoints jsonb NOT NULL DEFAULT '[]',
  speed_kmh integer NOT NULL DEFAULT 0,
  eta_minutes integer NOT NULL DEFAULT 0,
  distance_remaining_km numeric NOT NULL DEFAULT 0,
  traffic_status text NOT NULL DEFAULT 'clear',
  is_rerouted boolean NOT NULL DEFAULT false,
  reroute_reason text,
  progress numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE truck_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tp_select_all" ON truck_positions;
CREATE POLICY "tp_select_all"
  ON truck_positions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "tp_insert_own" ON truck_positions;
CREATE POLICY "tp_insert_own"
  ON truck_positions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = driver_id);

DROP POLICY IF EXISTS "tp_update_own" ON truck_positions;
CREATE POLICY "tp_update_own"
  ON truck_positions FOR UPDATE
  TO authenticated USING (auth.uid() = driver_id) WITH CHECK (auth.uid() = driver_id);

DROP POLICY IF EXISTS "tp_delete_own" ON truck_positions;
CREATE POLICY "tp_delete_own"
  ON truck_positions FOR DELETE
  TO authenticated USING (auth.uid() = driver_id);

CREATE INDEX IF NOT EXISTS idx_truck_positions_driver ON truck_positions(driver_id);
CREATE INDEX IF NOT EXISTS idx_truck_positions_shipment ON truck_positions(shipment_id);

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE truck_positions;
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;
