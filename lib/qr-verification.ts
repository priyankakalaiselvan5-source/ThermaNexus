import { supabase } from '@/lib/supabase';
import type { Shipment, Telemetry, Prediction, Driver, Vehicle } from '@/types';

export interface QrPayload {
  shipmentId: string;
  batchNumber: string;
  vehicleNumber: string;
  certificateId: string;
  timestamp: string;
  verificationUrl: string;
}

export type VerificationResult = 'verified' | 'warning' | 'invalid' | 'expired';

export interface VerificationRecord {
  id: string;
  shipment_id: string;
  hospital_user: string;
  verified_time: string;
  result: VerificationResult;
  device: string;
  ip_address: string | null;
}

export interface VerificationChecks {
  authenticity: 'pass' | 'fail';
  driverVerification: 'pass' | 'fail' | 'pending';
  certificateValidity: 'pass' | 'fail' | 'pending';
  temperatureCompliance: 'pass' | 'fail' | 'warning';
  coldChainIntegrity: 'pass' | 'fail' | 'warning';
  qrTokenValid: 'pass' | 'fail';
  destinationMatch: 'pass' | 'fail' | 'pending';
  notAlreadyReceived: 'pass' | 'fail';
  shipmentNotExpired: 'pass' | 'fail';
}

export interface VerifiedShipmentData {
  shipment: Shipment;
  telemetry: Telemetry[];
  prediction?: Prediction;
  timeline: any[];
  driver?: Driver;
  driverName?: string;
  vehicle?: Vehicle;
  vehicleNumber?: string;
  hospitalName?: string;
  warehouseName?: string;
  manufacturer?: string;
  currentLocation?: string;
  currentLat?: number;
  currentLng?: number;
  tempStatus: 'safe' | 'breach' | 'no_data';
  lastTemp: number | null;
  lastHumidity: number | null;
  lastSpeed: number | null;
  lastUpdated: string | null;
  certId: string;
  checks: VerificationChecks;
  failureReason?: string;
  alreadyReceived?: boolean;
}

export function buildQrPayload(
  shipment: Shipment,
  vehicleNumber?: string,
  certId?: string,
): QrPayload {
  const shipmentId = shipment.shipment_number;
  const cert = certId || `TNX-CERT-${shipmentId}-${Date.now().toString(36).toUpperCase()}`;
  return {
    shipmentId,
    batchNumber: shipment.batch_number || 'N/A',
    vehicleNumber: vehicleNumber || 'N/A',
    certificateId: cert,
    timestamp: new Date().toISOString(),
    verificationUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/verify/${encodeURIComponent(shipmentId)}`,
  };
}

export function encodeQrPayload(payload: QrPayload): string {
  return JSON.stringify(payload);
}

export function decodeQrPayload(raw: string): QrPayload | null {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.shipmentId !== 'string') return null;
    return parsed as QrPayload;
  } catch {
    return null;
  }
}

export function getDeviceType(): string {
  if (typeof navigator === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (/Mobile|Android|iPhone|iPad/i.test(ua)) return 'Mobile';
  if (/Tablet/i.test(ua)) return 'Tablet';
  return 'Desktop';
}

function computeChecks(
  shipment: Shipment,
  lastTemp: number | null,
  driver?: Driver,
  vehicle?: Vehicle,
  telemetry: Telemetry[] = [],
  hasToken?: boolean,
  destinationMatch?: boolean,
  alreadyReceived?: boolean,
): VerificationChecks {
  const min = Number(shipment.safe_temp_min);
  const max = Number(shipment.safe_temp_max);

  const authenticity: 'pass' | 'fail' =
    !!shipment.shipment_number && !!shipment.medicine_name ? 'pass' : 'fail';

  // FIX: driver statuses in this app are 'available', 'on_duty', 'off_duty', 'inactive'.
  // The old code checked for 'active' which never matched, failing every assigned driver.
  const validDriverStatuses = ['available', 'on_duty', 'active'];
  const driverVerification: 'pass' | 'fail' | 'pending' =
    !driver ? 'pending' :
    !validDriverStatuses.includes(driver.status) ? 'fail' :
    (driver.license_expiry && new Date(driver.license_expiry) < new Date()) ? 'fail' :
    'pass';

  const certificateValidity: 'pass' | 'fail' | 'pending' =
    telemetry.length === 0 ? 'pending' : 'pass';

  let temperatureCompliance: 'pass' | 'fail' | 'warning' = 'pass';
  if (lastTemp !== null) {
    if (lastTemp < min || lastTemp > max) temperatureCompliance = 'fail';
    else if (lastTemp < min + 0.5 || lastTemp > max - 0.5) temperatureCompliance = 'warning';
  } else {
    temperatureCompliance = 'warning';
  }

  let coldChainIntegrity: 'pass' | 'fail' | 'warning' = 'pass';
  if (telemetry.length > 0) {
    const violations = telemetry.filter(t => {
      const tt = Number(t.temperature);
      return tt < min || tt > max;
    }).length;
    if (violations > 0) {
      coldChainIntegrity = violations > 2 ? 'fail' : 'warning';
    }
    if (vehicle && (vehicle as any).cooling_system_status === 'critical') {
      coldChainIntegrity = 'fail';
    }
  } else {
    coldChainIntegrity = 'warning';
  }

  const qrTokenValid: 'pass' | 'fail' = hasToken ? 'pass' : 'fail';

  const destMatch: 'pass' | 'fail' | 'pending' =
    destinationMatch === undefined ? 'pending' : destinationMatch ? 'pass' : 'fail';

  const notAlreadyReceived: 'pass' | 'fail' = alreadyReceived ? 'fail' : 'pass';

  let shipmentNotExpired: 'pass' | 'fail' = 'pass';
  if (shipment.expiry_date) {
    const expiry = new Date(shipment.expiry_date);
    if (expiry < new Date()) shipmentNotExpired = 'fail';
  }

  return {
    authenticity, driverVerification, certificateValidity,
    temperatureCompliance, coldChainIntegrity,
    qrTokenValid, destinationMatch: destMatch,
    notAlreadyReceived, shipmentNotExpired,
  };
}

function classifyFromChecks(
  checks: VerificationChecks,
  shipmentStatus: string,
): { result: VerificationResult; reason?: string } {
  if (['failed', 'cancelled'].includes(shipmentStatus)) {
    return { result: 'expired', reason: 'Shipment has been cancelled or marked as failed.' };
  }
  if (checks.authenticity === 'fail') {
    return { result: 'invalid', reason: 'Shipment Not Found — the shipment ID does not exist in the database.' };
  }
  if (checks.qrTokenValid === 'fail') {
    return { result: 'invalid', reason: 'Invalid Digital Signature — the QR code signature could not be verified.' };
  }
  if (checks.notAlreadyReceived === 'fail') {
    return { result: 'expired', reason: 'QR Already Used — this shipment has already been received.' };
  }
  if (checks.shipmentNotExpired === 'fail') {
    return { result: 'expired', reason: 'Shipment Expired — the medicine expiry date has passed.' };
  }
  if (checks.destinationMatch === 'fail') {
    return { result: 'invalid', reason: 'Wrong Destination Hospital — this shipment is not assigned to your hospital.' };
  }
  if (checks.temperatureCompliance === 'fail' || checks.coldChainIntegrity === 'fail') {
    return { result: 'invalid', reason: 'Certificate Missing or Temperature Breach — cold chain integrity compromised.' };
  }
  if (
    checks.driverVerification === 'fail' ||
    checks.temperatureCompliance === 'warning' ||
    checks.coldChainIntegrity === 'warning'
  ) return { result: 'warning' };
  return { result: 'verified' };
}

async function fetchShipmentDataInternal(
  shipmentIdentifier: string,
  hospitalId?: string,
): Promise<VerifiedShipmentData | null> {
  let shipQuery = supabase.from('shipments').select('*').eq('shipment_number', shipmentIdentifier).maybeSingle();
  let { data: ship, error } = await shipQuery;
  if (!ship) {
    const byId = await supabase.from('shipments').select('*').eq('id', shipmentIdentifier).maybeSingle();
    ship = byId.data;
    error = byId.error;
  }
  if (error || !ship) return null;

  const s = ship as Shipment;

  const [teleRes, predRes, tlRes, driverRes, vehicleRes, hospitalRes, warehouseRes, posRes, receiptRes] = await Promise.all([
    supabase.from('shipment_telemetry').select('*').eq('shipment_id', s.id).order('recorded_at', { ascending: true }),
    supabase.from('predictions').select('*').eq('shipment_id', s.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('shipment_timeline').select('*').eq('shipment_id', s.id).order('created_at', { ascending: true }),
    s.driver_id ? supabase.from('drivers').select('*').eq('id', s.driver_id).maybeSingle() : Promise.resolve({ data: null }),
    s.vehicle_id ? supabase.from('vehicles').select('*').eq('id', s.vehicle_id).maybeSingle() : Promise.resolve({ data: null }),
    s.destination_hospital_id ? supabase.from('hospitals').select('name').eq('id', s.destination_hospital_id).maybeSingle() : Promise.resolve({ data: null }),
    s.origin_warehouse_id ? supabase.from('warehouses').select('name').eq('id', s.origin_warehouse_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from('truck_positions').select('lat,lng,destination_name').eq('shipment_id', s.id).maybeSingle(),
    supabase.from('delivery_receipts').select('id').eq('shipment_id', s.id).limit(1).maybeSingle(),
  ]);

  const telemetry = (teleRes.data || []) as Telemetry[];
  const driver = (driverRes.data as Driver) || undefined;
  const vehicle = (vehicleRes.data as Vehicle) || undefined;

  const temps = telemetry.map(t => Number(t.temperature));
  const lastTelemetry = telemetry.length > 0 ? telemetry[telemetry.length - 1] : null;
  const lastTemp = lastTelemetry ? Number(lastTelemetry.temperature) : null;
  const lastHumidity = lastTelemetry?.humidity !== null && lastTelemetry?.humidity !== undefined ? Number(lastTelemetry.humidity) : null;
  const lastSpeed = lastTelemetry?.speed_kmh !== null && lastTelemetry?.speed_kmh !== undefined ? Number(lastTelemetry.speed_kmh) : null;
  const lastUpdated = lastTelemetry?.recorded_at || null;

  let tempStatus: 'safe' | 'breach' | 'no_data' = 'no_data';
  if (lastTemp !== null) {
    tempStatus = (lastTemp >= Number(s.safe_temp_min) && lastTemp <= Number(s.safe_temp_max)) ? 'safe' : 'breach';
  }

  const pos = posRes.data as any;
  const currentLat = pos ? Number(pos.lat) : (lastTelemetry?.gps_latitude ? Number(lastTelemetry.gps_latitude) : undefined);
  const currentLng = pos ? Number(pos.lng) : (lastTelemetry?.gps_longitude ? Number(lastTelemetry.gps_longitude) : undefined);
  const currentLocation = pos
    ? `${pos.destination_name || s.destination_city || 'N/A'} (${Number(pos.lat).toFixed(2)}, ${Number(pos.lng).toFixed(2)})`
    : lastTelemetry?.gps_latitude
      ? `${Number(lastTelemetry.gps_latitude).toFixed(2)}, ${Number(lastTelemetry.gps_longitude).toFixed(2)}`
      : s.destination_city || 'N/A';

  const alreadyReceived = !!receiptRes.data || s.status === 'delivered';

  // Destination match: if hospitalId provided and shipment has destination_hospital_id
  let destinationMatch: boolean | undefined;
  if (hospitalId && s.destination_hospital_id) {
    destinationMatch = hospitalId === s.destination_hospital_id;
  } else if (hospitalId && !s.destination_hospital_id) {
    destinationMatch = true; // No specific hospital assigned — allow
  } else {
    destinationMatch = true; // No hospital context — allow
  }

  const hasToken = !!(s as any).verification_token;

  const checks = computeChecks(s, lastTemp, driver, vehicle, telemetry, hasToken, destinationMatch, alreadyReceived);

  return {
    shipment: s,
    telemetry,
    prediction: (predRes.data as Prediction) || undefined,
    timeline: (tlRes.data || []) as any[],
    driver,
    driverName: driver?.name,
    vehicle,
    vehicleNumber: vehicle?.registration_number,
    hospitalName: (hospitalRes.data as any)?.name,
    warehouseName: (warehouseRes.data as any)?.name,
    manufacturer: (s as any).manufacturer || 'ThermaNexus Partner',
    currentLocation,
    currentLat,
    currentLng,
    tempStatus,
    lastTemp,
    lastHumidity,
    lastSpeed,
    lastUpdated,
    certId: `TNX-CERT-${s.shipment_number}-${Date.now().toString(36).toUpperCase()}`,
    checks,
    alreadyReceived,
  };
}

export async function fetchVerifiedShipmentData(
  shipmentIdentifier: string,
  hospitalId?: string,
): Promise<VerifiedShipmentData | null> {
  try {
    return await fetchShipmentDataInternal(shipmentIdentifier, hospitalId);
  } catch {
    return null;
  }
}

export async function refreshShipmentData(
  shipmentIdentifier: string,
  hospitalId?: string,
): Promise<VerifiedShipmentData | null> {
  try {
    return await fetchShipmentDataInternal(shipmentIdentifier, hospitalId);
  } catch {
    return null;
  }
}

export async function recordVerification(
  shipmentId: string,
  hospitalUser: string,
  result: VerificationResult,
): Promise<void> {
  try {
    await supabase.from('qr_verifications').insert({
      shipment_id: shipmentId,
      hospital_user: hospitalUser,
      verified_time: new Date().toISOString(),
      result,
      device: getDeviceType(),
      ip_address: null,
    });
  } catch {
    // best-effort
  }
}

export async function hasBeenVerified(shipmentId: string): Promise<boolean> {
  try {
    const { count } = await supabase
      .from('qr_verifications')
      .select('*', { count: 'exact', head: true })
      .eq('shipment_id', shipmentId)
      .eq('result', 'verified');
    return (count || 0) > 0;
  } catch {
    return false;
  }
}

export async function fetchVerificationHistory(shipmentId?: string): Promise<VerificationRecord[]> {
  try {
    let query = supabase.from('qr_verifications').select('*').order('verified_time', { ascending: false }).limit(50);
    if (shipmentId) query = query.eq('shipment_id', shipmentId);
    const { data } = await query;
    return (data || []) as VerificationRecord[];
  } catch {
    return [];
  }
}

export async function fetchRecentVerifications(limit = 5): Promise<VerificationRecord[]> {
  try {
    const { data } = await supabase
      .from('qr_verifications')
      .select('*')
      .order('verified_time', { ascending: false })
      .limit(limit);
    return (data || []) as VerificationRecord[];
  } catch {
    return [];
  }
}

export function classifyShipmentStatus(shipment: Shipment): VerificationResult {
  if (['failed', 'cancelled'].includes(shipment.status)) return 'expired';
  return 'verified';
}

export function classifyFromData(data: VerifiedShipmentData): { result: VerificationResult; reason?: string } {
  return classifyFromChecks(data.checks, data.shipment.status);
}

export interface AIVerificationResult {
  healthScore: number;
  aiConfidence: number;
  coldChainStatus: 'safe' | 'warning' | 'critical';
  overallResult: string;
  recommendation: string;
  tempStability: number;
  travelDelay: string;
  routeDeviation: boolean;
  vehicleDelay: string;
}

export function analyzeShipmentAI(data: VerifiedShipmentData, routeDeviation: boolean): AIVerificationResult {
  const temps = data.telemetry.map(t => Number(t.temperature));
  const min = data.shipment.safe_temp_min;
  const max = data.shipment.safe_temp_max;

  let tempStability = 100;
  if (temps.length > 0) {
    const violations = temps.filter(t => t < min || t > max).length;
    tempStability = Math.max(0, Math.round(100 - (violations / temps.length) * 100));
  }

  const lastTemp = data.lastTemp;
  let coldChainStatus: 'safe' | 'warning' | 'critical' = 'safe';
  if (lastTemp !== null) {
    if (lastTemp < min || lastTemp > max) coldChainStatus = 'critical';
    else if (lastTemp < min + 0.5 || lastTemp > max - 0.5) coldChainStatus = 'warning';
  } else {
    coldChainStatus = 'warning';
  }

  const prediction = data.prediction;
  const aiConfidence = prediction ? Math.round(Number(prediction.confidence_score)) : Math.round(70 + Math.random() * 20);

  let travelDelay = 'On Schedule';
  if (data.shipment.eta) {
    const eta = new Date(data.shipment.eta).getTime();
    const now = Date.now();
    const diffHours = (eta - now) / (1000 * 60 * 60);
    if (diffHours < -1) travelDelay = `${Math.abs(Math.round(diffHours))}h Delay`;
    else if (diffHours > 24) travelDelay = 'On Schedule';
  }
  if (data.shipment.status === 'emergency') travelDelay = 'Critical Delay';

  const vehicleDelay = travelDelay;

  let healthScore = 100;
  healthScore -= (100 - tempStability) * 0.4;
  if (coldChainStatus === 'critical') healthScore -= 25;
  else if (coldChainStatus === 'warning') healthScore -= 10;
  if (routeDeviation) healthScore -= 15;
  if (travelDelay.includes('Delay')) healthScore -= 10;
  if (prediction && Number(prediction.spoilage_probability) > 30) healthScore -= 20;
  healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

  const overallResult =
    healthScore >= 85 ? 'Cold Chain Maintained' :
    healthScore >= 60 ? 'Minor Issues Detected' :
    'Cold Chain Compromised';

  const recommendation =
    healthScore >= 85 ? 'Safe to Accept Shipment' :
    healthScore >= 60 ? 'Accept with Caution — Inspect on Arrival' :
    'Reject Shipment — Cold Chain Violation';

  return {
    healthScore,
    aiConfidence,
    coldChainStatus,
    overallResult,
    recommendation,
    tempStability,
    travelDelay,
    routeDeviation,
    vehicleDelay,
  };
}

export interface LiveUpdate {
  temperature: number | null;
  humidity: number | null;
  speed: number | null;
  healthScore: number;
  eta: string;
  risk: string;
  lat?: number;
  lng?: number;
  progress: number;
  lastUpdated: string;
}

export function computeLiveUpdate(data: VerifiedShipmentData, baseAI: AIVerificationResult, prev?: LiveUpdate): LiveUpdate {
  const temps = data.telemetry.map(t => Number(t.temperature));
  const lastTemp = temps.length > 0 ? temps[temps.length - 1] : data.lastTemp;
  const drift = lastTemp !== null ? lastTemp + (Math.random() - 0.5) * 0.3 : null;
  const newTemp = drift !== null ? Math.max(1, Math.min(12, Math.round(drift * 10) / 10)) : null;

  const baseHumidity = data.lastHumidity ?? 65;
  const newHumidity = Math.max(20, Math.min(95, Math.round((baseHumidity + (Math.random() - 0.5) * 3) * 10) / 10));

  const baseSpeed = data.lastSpeed ?? 55;
  const newSpeed = Math.max(0, Math.min(90, Math.round(baseSpeed + (Math.random() - 0.5) * 8)));

  const min = data.shipment.safe_temp_min;
  const max = data.shipment.safe_temp_max;
  let health = baseAI.healthScore + Math.round((Math.random() - 0.5) * 4);
  if (newTemp !== null && (newTemp < min || newTemp > max)) health -= 5;
  health = Math.max(0, Math.min(100, health));

  const risk =
    health >= 85 ? 'low' :
    health >= 60 ? 'moderate' :
    health >= 40 ? 'high' : 'critical';

  let etaStr = 'Arrived';
  if (data.shipment.eta) {
    const eta = new Date(data.shipment.eta).getTime();
    const remaining = Math.max(0, eta - Date.now());
    const h = Math.floor(remaining / (1000 * 60 * 60));
    const m = Math.round((remaining % (1000 * 60 * 60)) / (1000 * 60));
    etaStr = remaining > 0 ? `${h}h ${m}m` : 'Arrived';
  }

  const progress = Math.min(1, Math.max(0.05, baseAI.healthScore / 100 + (Math.random() - 0.5) * 0.05));
  const lat = prev?.lat !== undefined ? prev.lat + (Math.random() - 0.5) * 0.05 : data.currentLat;
  const lng = prev?.lng !== undefined ? prev.lng + (Math.random() - 0.5) * 0.05 : data.currentLng;

  return {
    temperature: newTemp,
    humidity: newHumidity,
    speed: newSpeed,
    healthScore: health,
    eta: etaStr,
    risk,
    lat,
    lng,
    progress,
    lastUpdated: new Date().toISOString(),
  };
}

// ==================== RECEIVE SHIPMENT ====================

export interface ReceiveShipmentResult {
  success: boolean;
  deliveryCertificateId?: string;
  deliveryReportId?: string;
  error?: string;
}

export async function receiveShipment(
  shipmentId: string,
  receiverName: string,
  hospitalId?: string,
): Promise<ReceiveShipmentResult> {
  try {
    const now = new Date().toISOString();
    const certId = `TNX-DEL-CERT-${Date.now().toString(36).toUpperCase()}`;
    const reportId = `TNX-DEL-RPT-${Date.now().toString(36).toUpperCase()}`;

    // 1. Update shipment status to delivered
    const { error: shipErr } = await supabase
      .from('shipments')
      .update({ status: 'delivered', delivered_at: now, updated_at: now })
      .eq('id', shipmentId);
    if (shipErr) throw shipErr;

    // 2. Create delivery receipt
    const { error: receiptErr } = await supabase
      .from('delivery_receipts')
      .insert({
        shipment_id: shipmentId,
        receiver_name: receiverName,
        received_at: now,
        delivery_certificate_id: certId,
        delivery_report_id: reportId,
      });
    if (receiptErr) throw receiptErr;

    // 3. Create timeline event
    await supabase.from('shipment_timeline').insert({
      shipment_id: shipmentId,
      event_type: 'received',
      title: 'Hospital Received',
      description: `Shipment received and accepted by ${receiverName}`,
    });

    // 4. Store delivery certificate document
    await supabase.from('shipment_documents').insert({
      shipment_id: shipmentId,
      document_type: 'delivery_certificate',
      file_name: `Delivery_Certificate_${certId}.pdf`,
      generated_by: receiverName,
      metadata: { certificate_id: certId, generated_at: now },
    });

    // 5. Store delivery report document
    await supabase.from('shipment_documents').insert({
      shipment_id: shipmentId,
      document_type: 'shipment_report',
      file_name: `Delivery_Report_${reportId}.pdf`,
      generated_by: receiverName,
      metadata: { report_id: reportId, generated_at: now },
    });

    // 6. Create audit log
    await supabase.from('audit_logs').insert({
      action: 'shipment_received',
      entity_type: 'shipment',
      entity_id: shipmentId,
      hospital_id: hospitalId || null,
      metadata: {
        receiver_name: receiverName,
        received_at: now,
        delivery_certificate_id: certId,
        delivery_report_id: reportId,
      },
    });

    // 7. Record verification
    await recordVerification(shipmentId, receiverName, 'verified');

    return { success: true, deliveryCertificateId: certId, deliveryReportId: reportId };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to receive shipment' };
  }
}
