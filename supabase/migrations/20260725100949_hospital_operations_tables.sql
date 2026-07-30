/*
# Hospital Operations Dashboard Tables

## Overview
Adds tables for QR shipment verification, document management, certificates, audit logs, and hospital staff roles.

## New Tables
1. `hospital_staff` — links auth users to a hospital with a hospital-specific role
2. `hospital_verifications` — QR-code shipment verification records
3. `hospital_documents` — document metadata (files in Supabase Storage)
4. `hospital_certificates` — generated certificates for received shipments
5. `audit_logs` — audit trail for important hospital actions

## Helper Function
`user_hospital_id()` — returns the current user's hospital_id from hospital_staff

## Storage Buckets
- `hospital-documents` (private)
- `hospital-certificates` (private)

## RLS
All tables use RLS scoped to the user's hospital via user_hospital_id().
hospital_staff insert/delete restricted to hospital_admin role.

## Realtime
All new tables added to supabase_realtime.
*/

-- ============================================================
-- 1. hospital_staff (created first — helper function depends on it)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hospital_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  hospital_role text NOT NULL DEFAULT 'staff',
  is_active boolean NOT NULL DEFAULT true,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hospital_staff ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_hs_user_hospital ON public.hospital_staff(user_id, hospital_id);
CREATE INDEX IF NOT EXISTS idx_hs_hospital ON public.hospital_staff(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hs_role ON public.hospital_staff(hospital_role);

-- ============================================================
-- Helper function: get the current user's hospital_id
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_hospital_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT hospital_id FROM public.hospital_staff
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;
$$;

-- hospital_staff policies (defined after function exists)
DROP POLICY IF EXISTS "hs_select_own" ON public.hospital_staff;
CREATE POLICY "hs_select_own" ON public.hospital_staff FOR SELECT
  TO authenticated USING (
    hospital_id = public.user_hospital_id()
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "hs_insert_own" ON public.hospital_staff;
CREATE POLICY "hs_insert_own" ON public.hospital_staff FOR INSERT
  TO authenticated WITH CHECK (
    hospital_id = public.user_hospital_id()
    AND EXISTS (
      SELECT 1 FROM public.hospital_staff hs2
      WHERE hs2.user_id = auth.uid()
      AND hs2.hospital_id = public.user_hospital_id()
      AND hs2.hospital_role = 'hospital_admin'
      AND hs2.is_active = true
    )
  );

DROP POLICY IF EXISTS "hs_update_own" ON public.hospital_staff;
CREATE POLICY "hs_update_own" ON public.hospital_staff FOR UPDATE
  TO authenticated USING (hospital_id = public.user_hospital_id())
  WITH CHECK (hospital_id = public.user_hospital_id());

DROP POLICY IF EXISTS "hs_delete_own" ON public.hospital_staff;
CREATE POLICY "hs_delete_own" ON public.hospital_staff FOR DELETE
  TO authenticated USING (
    hospital_id = public.user_hospital_id()
    AND EXISTS (
      SELECT 1 FROM public.hospital_staff hs2
      WHERE hs2.user_id = auth.uid()
      AND hs2.hospital_id = public.user_hospital_id()
      AND hs2.hospital_role = 'hospital_admin'
      AND hs2.is_active = true
    )
  );

-- ============================================================
-- 2. hospital_verifications
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hospital_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verification_token text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'verified',
  action_reason text,
  temperature_breach boolean DEFAULT false,
  cold_chain_status text DEFAULT 'safe',
  verified_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.hospital_verifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_hv_shipment ON public.hospital_verifications(shipment_id);
CREATE INDEX IF NOT EXISTS idx_hv_hospital ON public.hospital_verifications(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hv_token ON public.hospital_verifications(verification_token);
CREATE INDEX IF NOT EXISTS idx_hv_verified_by ON public.hospital_verifications(verified_by);

DROP POLICY IF EXISTS "hv_select_own" ON public.hospital_verifications;
CREATE POLICY "hv_select_own" ON public.hospital_verifications FOR SELECT
  TO authenticated USING (hospital_id = public.user_hospital_id());

DROP POLICY IF EXISTS "hv_insert_own" ON public.hospital_verifications;
CREATE POLICY "hv_insert_own" ON public.hospital_verifications FOR INSERT
  TO authenticated WITH CHECK (hospital_id = public.user_hospital_id());

DROP POLICY IF EXISTS "hv_update_own" ON public.hospital_verifications;
CREATE POLICY "hv_update_own" ON public.hospital_verifications FOR UPDATE
  TO authenticated USING (hospital_id = public.user_hospital_id())
  WITH CHECK (hospital_id = public.user_hospital_id());

DROP POLICY IF EXISTS "hv_delete_own" ON public.hospital_verifications;
CREATE POLICY "hv_delete_own" ON public.hospital_verifications FOR DELETE
  TO authenticated USING (hospital_id = public.user_hospital_id());

-- ============================================================
-- 3. hospital_documents
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hospital_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  shipment_id uuid REFERENCES public.shipments(id) ON DELETE SET NULL,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  document_type text NOT NULL DEFAULT 'other',
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint DEFAULT 0,
  file_type text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hospital_documents ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_hd_hospital ON public.hospital_documents(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hd_shipment ON public.hospital_documents(shipment_id);
CREATE INDEX IF NOT EXISTS idx_hd_type ON public.hospital_documents(document_type);

DROP POLICY IF EXISTS "hd_select_own" ON public.hospital_documents;
CREATE POLICY "hd_select_own" ON public.hospital_documents FOR SELECT
  TO authenticated USING (hospital_id = public.user_hospital_id());

DROP POLICY IF EXISTS "hd_insert_own" ON public.hospital_documents;
CREATE POLICY "hd_insert_own" ON public.hospital_documents FOR INSERT
  TO authenticated WITH CHECK (hospital_id = public.user_hospital_id());

DROP POLICY IF EXISTS "hd_update_own" ON public.hospital_documents;
CREATE POLICY "hd_update_own" ON public.hospital_documents FOR UPDATE
  TO authenticated USING (hospital_id = public.user_hospital_id())
  WITH CHECK (hospital_id = public.user_hospital_id());

DROP POLICY IF EXISTS "hd_delete_own" ON public.hospital_documents;
CREATE POLICY "hd_delete_own" ON public.hospital_documents FOR DELETE
  TO authenticated USING (hospital_id = public.user_hospital_id());

-- ============================================================
-- 4. hospital_certificates
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hospital_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id text UNIQUE NOT NULL,
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  certificate_type text NOT NULL DEFAULT 'cold_chain_compliance',
  issued_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active',
  verification_status text NOT NULL DEFAULT 'verified',
  file_path text,
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.hospital_certificates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_hc_hospital ON public.hospital_certificates(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hc_shipment ON public.hospital_certificates(shipment_id);
CREATE INDEX IF NOT EXISTS idx_hc_cert_id ON public.hospital_certificates(certificate_id);

DROP POLICY IF EXISTS "hc_select_own" ON public.hospital_certificates;
CREATE POLICY "hc_select_own" ON public.hospital_certificates FOR SELECT
  TO authenticated USING (hospital_id = public.user_hospital_id());

DROP POLICY IF EXISTS "hc_insert_own" ON public.hospital_certificates;
CREATE POLICY "hc_insert_own" ON public.hospital_certificates FOR INSERT
  TO authenticated WITH CHECK (hospital_id = public.user_hospital_id());

DROP POLICY IF EXISTS "hc_update_own" ON public.hospital_certificates;
CREATE POLICY "hc_update_own" ON public.hospital_certificates FOR UPDATE
  TO authenticated USING (hospital_id = public.user_hospital_id())
  WITH CHECK (hospital_id = public.user_hospital_id());

DROP POLICY IF EXISTS "hc_delete_own" ON public.hospital_certificates;
CREATE POLICY "hc_delete_own" ON public.hospital_certificates FOR DELETE
  TO authenticated USING (hospital_id = public.user_hospital_id());

-- ============================================================
-- 5. audit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  hospital_id uuid REFERENCES public.hospitals(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_al_hospital ON public.audit_logs(hospital_id);
CREATE INDEX IF NOT EXISTS idx_al_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_al_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_al_created ON public.audit_logs(created_at DESC);

DROP POLICY IF EXISTS "al_select_own" ON public.audit_logs;
CREATE POLICY "al_select_own" ON public.audit_logs FOR SELECT
  TO authenticated USING (hospital_id = public.user_hospital_id());

DROP POLICY IF EXISTS "al_insert_own" ON public.audit_logs;
CREATE POLICY "al_insert_own" ON public.audit_logs FOR INSERT
  TO authenticated WITH CHECK (hospital_id = public.user_hospital_id());

-- ============================================================
-- Add verification_token column to shipments if not exists
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shipments' AND column_name = 'verification_token'
  ) THEN
    ALTER TABLE public.shipments ADD COLUMN verification_token text UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_shipments_verification_token ON public.shipments(verification_token);
  END IF;
END $$;

-- ============================================================
-- Storage Buckets
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('hospital-documents', 'hospital-documents', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('hospital-certificates', 'hospital-certificates', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for hospital-documents bucket
DROP POLICY IF EXISTS "hd_storage_select" ON storage.objects;
CREATE POLICY "hd_storage_select" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'hospital-documents');

DROP POLICY IF EXISTS "hd_storage_insert" ON storage.objects;
CREATE POLICY "hd_storage_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'hospital-documents');

DROP POLICY IF EXISTS "hd_storage_update" ON storage.objects;
CREATE POLICY "hd_storage_update" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'hospital-documents')
  WITH CHECK (bucket_id = 'hospital-documents');

DROP POLICY IF EXISTS "hd_storage_delete" ON storage.objects;
CREATE POLICY "hd_storage_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'hospital-documents');

-- Storage RLS for hospital-certificates bucket
DROP POLICY IF EXISTS "hc_storage_select" ON storage.objects;
CREATE POLICY "hc_storage_select" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'hospital-certificates');

DROP POLICY IF EXISTS "hc_storage_insert" ON storage.objects;
CREATE POLICY "hc_storage_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'hospital-certificates');

DROP POLICY IF EXISTS "hc_storage_update" ON storage.objects;
CREATE POLICY "hc_storage_update" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'hospital-certificates')
  WITH CHECK (bucket_id = 'hospital-certificates');

DROP POLICY IF EXISTS "hc_storage_delete" ON storage.objects;
CREATE POLICY "hc_storage_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'hospital-certificates');

-- ============================================================
-- Realtime
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.hospital_staff;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hospital_verifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hospital_documents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hospital_certificates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
