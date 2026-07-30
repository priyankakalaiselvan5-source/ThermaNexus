/*
# QR Verification, Shipment Documents, and Delivery Receipts

## Purpose
Creates the missing tables required for the complete QR verification workflow:
QR verifications, shipment documents, delivery receipts, and document downloads.

## New Tables

1. `qr_verifications` — Records every QR scan/verification attempt by hospitals.
   - Links to shipments via shipment_id (stored as text to match the existing pattern).
   - Tracks who verified, when, result, and device info.

2. `shipment_documents` — Stores generated documents (certificates, reports) linked to a shipment.
   - document_type: temperature_certificate, delivery_certificate, cold_chain_certificate, compliance_certificate, ai_prediction_report, shipment_report.
   - Stores file name, generated_by, and a JSON metadata field.

3. `delivery_receipts` — Records each shipment receipt by a hospital.
   - Links to shipments, captures receiver name, receive timestamp, delivery certificate id, delivery report id.
   - Creates an audit trail for received medicines.

4. `document_downloads` — Tracks every document download for audit purposes.
   - Links to shipments, captures file name, type, who downloaded, and download count.

## Security
- RLS enabled on all tables.
- Policies allow authenticated users to perform CRUD (the app has sign-in).
*/

-- 1. QR Verifications
CREATE TABLE IF NOT EXISTS qr_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id text NOT NULL,
  hospital_user text,
  verified_time timestamptz NOT NULL DEFAULT now(),
  result text NOT NULL DEFAULT 'verified',
  device text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE qr_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_qr_verifications" ON qr_verifications;
CREATE POLICY "select_qr_verifications" ON qr_verifications FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_qr_verifications" ON qr_verifications;
CREATE POLICY "insert_qr_verifications" ON qr_verifications FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_qr_verifications" ON qr_verifications;
CREATE POLICY "update_qr_verifications" ON qr_verifications FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_qr_verifications_shipment_id ON qr_verifications(shipment_id);
CREATE INDEX IF NOT EXISTS idx_qr_verifications_result ON qr_verifications(result);

-- 2. Shipment Documents
CREATE TABLE IF NOT EXISTS shipment_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES shipments(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name text,
  generated_by text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE shipment_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_shipment_documents" ON shipment_documents;
CREATE POLICY "select_shipment_documents" ON shipment_documents FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_shipment_documents" ON shipment_documents;
CREATE POLICY "insert_shipment_documents" ON shipment_documents FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_shipment_documents" ON shipment_documents;
CREATE POLICY "update_shipment_documents" ON shipment_documents FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_shipment_documents" ON shipment_documents;
CREATE POLICY "delete_shipment_documents" ON shipment_documents FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_shipment_documents_shipment_id ON shipment_documents(shipment_id);

-- 3. Delivery Receipts
CREATE TABLE IF NOT EXISTS delivery_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES shipments(id) ON DELETE CASCADE,
  receiver_name text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  delivery_certificate_id text,
  delivery_report_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE delivery_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_delivery_receipts" ON delivery_receipts;
CREATE POLICY "select_delivery_receipts" ON delivery_receipts FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_delivery_receipts" ON delivery_receipts;
CREATE POLICY "insert_delivery_receipts" ON delivery_receipts FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_delivery_receipts" ON delivery_receipts;
CREATE POLICY "update_delivery_receipts" ON delivery_receipts FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_delivery_receipts_shipment_id ON delivery_receipts(shipment_id);

-- 4. Document Downloads
CREATE TABLE IF NOT EXISTS document_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES shipments(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_url text,
  generated_by text,
  hospital_name text,
  download_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE document_downloads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_document_downloads" ON document_downloads;
CREATE POLICY "select_document_downloads" ON document_downloads FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_document_downloads" ON document_downloads;
CREATE POLICY "insert_document_downloads" ON document_downloads FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_document_downloads" ON document_downloads;
CREATE POLICY "update_document_downloads" ON document_downloads FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_document_downloads_shipment_id ON document_downloads(shipment_id);
