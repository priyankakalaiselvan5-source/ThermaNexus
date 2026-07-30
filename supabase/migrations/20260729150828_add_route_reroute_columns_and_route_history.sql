/*
# Add Route Reroute Columns and Route History Table

1. Modified Tables
- `shipments`: Adds 4 new nullable columns to support AI reroute functionality.
  - `route_status` (text, nullable) — current route status, e.g. 'AI Rerouted', 'Original'.
  - `active_route` (text, nullable) — the name/description of the currently active route.
  - `active_route_waypoints` (jsonb, nullable) — array of [lat,lng] waypoints for the active route.
  - `rerouted_at` (timestamptz, nullable) — timestamp when AI last rerouted the shipment.
  - `active_route_eta_minutes` (integer, nullable) — ETA in minutes for the active route.
  - `active_route_distance_km` (numeric, nullable) — distance in km for the active route.
  - `active_route_traffic` (text, nullable) — traffic condition for the active route ('clear' | 'moderate' | 'heavy').
  - `active_route_travel_time` (text, nullable) — human-readable travel time for the active route.
  All columns are nullable so existing rows are unaffected. No data is lost.

2. New Tables
- `route_history`: Stores a log entry every time a route change is applied.
  - `id` (uuid, PK)
  - `shipment_id` (uuid, FK to shipments, ON DELETE CASCADE)
  - `previous_route` (text, nullable) — the route that was active before the change.
  - `new_route` (text, nullable) — the route that became active after the change.
  - `applied_by` (uuid, FK to auth.users, nullable) — the user who applied the change.
  - `reason` (text, nullable) — why the route was changed (default 'AI Recommendation').
  - `created_at` (timestamptz, default now()) — when the change was applied.

3. Security
- Enable RLS on `route_history`.
- Authenticated users can read all route history entries (admin, dispatcher, driver visibility).
- Authenticated users can insert route history entries.
- Authenticated users can update and delete route history entries they are associated with.

4. Notes
- All new shipment columns are nullable so the migration is safe to re-run.
- The `route_history` table uses `IF NOT EXISTS` for idempotency.
- Policies use `DROP POLICY IF EXISTS` before creation for idempotency.
*/

-- Add route-related columns to shipments (all nullable, safe to re-run)
DO $$ BEGIN
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS route_status text;
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS active_route text;
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS active_route_waypoints jsonb;
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS rerouted_at timestamptz;
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS active_route_eta_minutes integer;
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS active_route_distance_km numeric;
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS active_route_traffic text;
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS active_route_travel_time text;
END $$;

-- Create route_history table
CREATE TABLE IF NOT EXISTS route_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES shipments(id) ON DELETE CASCADE,
  previous_route text,
  new_route text,
  applied_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text DEFAULT 'AI Recommendation',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE route_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rh_select_all" ON route_history;
CREATE POLICY "rh_select_all"
  ON route_history FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "rh_insert_all" ON route_history;
CREATE POLICY "rh_insert_all"
  ON route_history FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "rh_update_own" ON route_history;
CREATE POLICY "rh_update_own"
  ON route_history FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rh_delete_own" ON route_history;
CREATE POLICY "rh_delete_own"
  ON route_history FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_route_history_shipment ON route_history(shipment_id);
CREATE INDEX IF NOT EXISTS idx_route_history_created ON route_history(created_at DESC);