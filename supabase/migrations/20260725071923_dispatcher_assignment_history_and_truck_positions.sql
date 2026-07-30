/*
# Assignment history table + fix truck_positions FK + populate truck positions
*/

-- 1. Assignment history table
CREATE TABLE IF NOT EXISTS assignment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  action text NOT NULL,
  previous_driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE assignment_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ah_select_all" ON assignment_history;
CREATE POLICY "ah_select_all" ON assignment_history FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ah_insert_all" ON assignment_history;
CREATE POLICY "ah_insert_all" ON assignment_history FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ah_shipment ON assignment_history(shipment_id);

-- 2. Fix truck_positions driver_id FK (currently references auth.users, should reference drivers)
ALTER TABLE truck_positions DROP CONSTRAINT IF EXISTS truck_positions_driver_id_fkey;
ALTER TABLE truck_positions ADD CONSTRAINT truck_positions_driver_id_fkey
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL;

-- 3. Populate truck_positions for in_transit shipments
INSERT INTO truck_positions (shipment_id, driver_id, vehicle_id, lat, lng, destination_lat, destination_lng, destination_name, route_waypoints, speed_kmh, eta_minutes, distance_remaining_km, traffic_status, progress, updated_at)
SELECT
  s.id,
  s.driver_id,
  s.vehicle_id,
  COALESCE(orig.lat, 22.5), COALESCE(orig.lng, 80.0),
  COALESCE(dest.lat, 22.5), COALESCE(dest.lng, 80.0),
  COALESCE(s.destination_city, 'Unknown'),
  '[]'::jsonb,
  55,
  180,
  120,
  'clear',
  0.3,
  now()
FROM shipments s
LEFT JOIN LATERAL (
  SELECT lat, lng FROM (VALUES
    ('Mumbai', 19.076, 72.877), ('Delhi', 28.6139, 77.209), ('New Delhi', 28.6139, 77.209),
    ('Chennai', 13.0827, 80.2707), ('Bengaluru', 12.9716, 77.5946), ('Hyderabad', 17.385, 78.4867),
    ('Kolkata', 22.5726, 88.363), ('Ahmedabad', 23.0225, 72.5714), ('Pune', 18.5204, 73.8567),
    ('Jaipur', 26.9124, 75.7873), ('Lucknow', 26.8467, 80.946), ('Kochi', 9.9312, 76.2673),
    ('Guwahati', 26.1445, 91.7362), ('Bhubaneswar', 20.296, 85.8245), ('Nagpur', 21.1458, 79.0882),
    ('Chandigarh', 30.7333, 76.7794), ('Surat', 21.1702, 72.8311), ('Visakhapatnam', 17.6868, 83.2185),
    ('Coimbatore', 11.0168, 76.9558)
  ) AS city_data(name, lat, lng) WHERE city_data.name = s.origin_city
) orig ON true
LEFT JOIN LATERAL (
  SELECT lat, lng FROM (VALUES
    ('Mumbai', 19.076, 72.877), ('Delhi', 28.6139, 77.209), ('New Delhi', 28.6139, 77.209),
    ('Chennai', 13.0827, 80.2707), ('Bengaluru', 12.9716, 77.5946), ('Hyderabad', 17.385, 78.4867),
    ('Kolkata', 22.5726, 88.363), ('Ahmedabad', 23.0225, 72.5714), ('Pune', 18.5204, 73.8567),
    ('Jaipur', 26.9124, 75.7873), ('Lucknow', 26.8467, 80.946), ('Kochi', 9.9312, 76.2673),
    ('Guwahati', 26.1445, 91.7362), ('Bhubaneswar', 20.296, 85.8245), ('Nagpur', 21.1458, 79.0882),
    ('Chandigarh', 30.7333, 76.7794), ('Surat', 21.1702, 72.8311), ('Visakhapatnam', 17.6868, 83.2185),
    ('Coimbatore', 11.0168, 76.9558)
  ) AS city_data(name, lat, lng) WHERE city_data.name = s.destination_city
) dest ON true
WHERE s.status IN ('in_transit', 'dispatched', 'emergency', 'delayed')
ON CONFLICT DO NOTHING;

-- 4. Realtime for assignment_history only
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE assignment_history;
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;
