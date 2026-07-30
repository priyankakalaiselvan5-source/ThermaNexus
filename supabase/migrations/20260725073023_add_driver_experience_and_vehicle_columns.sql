/*
# Add experience and vehicle_assigned columns to drivers table
*/

ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS experience_years integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vehicle_assigned text;
