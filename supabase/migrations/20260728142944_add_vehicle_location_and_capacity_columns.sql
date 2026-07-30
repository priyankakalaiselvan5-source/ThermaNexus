/*
# Add current_location and capacity_kg columns to vehicles table

1. Modified Tables
- `vehicles`
  - `current_location` (text, nullable) — where the vehicle is currently located (city/area)
  - `capacity_kg` (numeric, nullable) — cargo capacity in kilograms

2. Security
- No RLS policy changes. Existing policies already allow anon + authenticated CRUD.

3. Important Notes
- Both columns are nullable so existing rows are unaffected.
- The Fleet Management form already sends these fields; this migration makes the inserts succeed instead of failing with "column does not exist".
*/

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS current_location text,
  ADD COLUMN IF NOT EXISTS capacity_kg numeric;
