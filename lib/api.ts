import { supabase } from '@/lib/supabase';
import type { Shipment, Telemetry, Prediction, Alert, Hospital, Warehouse, ColdStorageFacility, Driver, Vehicle, EmergencyEvent } from '@/types';
import type { DashboardStats, AIPredictionResult, RescueRecommendation } from '@/types/auth';

// ============ Shipments ============
export async function getShipments(filters?: { status?: string; risk?: string; search?: string }) {
  let q = supabase.from('shipments').select('*').order('created_at', { ascending: false });
  if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
  if (filters?.risk && filters.risk !== 'all') q = q.eq('risk_level', filters.risk);
  const { data, error } = await q;
  if (error) throw error;
  let result = data as Shipment[];
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    result = result.filter(r =>
      r.shipment_number.toLowerCase().includes(s) ||
      r.medicine_name.toLowerCase().includes(s) ||
      r.batch_number?.toLowerCase().includes(s)
    );
  }
  return result;
}

export async function getShipment(id: string) {
  const { data, error } = await supabase.from('shipments').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Shipment | null;
}

export async function createShipment(payload: Partial<Shipment>) {
  const { data, error } = await supabase.from('shipments').insert(payload).select().single();
  if (error) throw error;
  return data as Shipment;
}

export async function updateShipment(id: string, payload: Partial<Shipment>) {
  const { data, error } = await supabase.from('shipments').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw error;
  return data as Shipment;
}

export async function deleteShipment(id: string) {
  const { error } = await supabase.from('shipments').delete().eq('id', id);
  if (error) throw error;
}

// ============ Telemetry ============
export async function getTelemetry(shipmentId: string) {
  const { data, error } = await supabase
    .from('shipment_telemetry')
    .select('*')
    .eq('shipment_id', shipmentId)
    .order('recorded_at', { ascending: true });
  if (error) throw error;
  return data as Telemetry[];
}

export async function getLatestTelemetry(shipmentId: string) {
  const { data, error } = await supabase
    .from('shipment_telemetry')
    .select('*')
    .eq('shipment_id', shipmentId)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as Telemetry | null;
}

export async function getAllLatestTelemetry() {
  const { data, error } = await supabase
    .from('shipment_telemetry')
    .select('*')
    .order('recorded_at', { ascending: true });
  if (error) throw error;
  return data as Telemetry[];
}

export function exportTelemetryCSV(telemetry: Telemetry[]): string {
  const headers = ['Timestamp', 'Temperature (°C)', 'Humidity (%)', 'Pressure (hPa)', 'Battery (%)', 'Latitude', 'Longitude', 'Speed (km/h)', 'Door Status', 'GPS Signal', 'Cooling Status'];
  const rows = telemetry.map(t => [
    t.recorded_at,
    t.temperature.toFixed(2),
    t.humidity?.toFixed(0) ?? '',
    t.pressure?.toFixed(0) ?? '',
    t.battery_level?.toFixed(0) ?? '',
    t.gps_latitude ?? '',
    t.gps_longitude ?? '',
    t.speed_kmh?.toFixed(0) ?? '',
    t.door_status,
    t.gps_signal_strength,
    t.cooling_system_status,
  ].join(','));
  return [headers.join(','), ...rows].join('\n');
}

// ============ Predictions ============
export async function getPredictions() {
  const { data, error } = await supabase.from('predictions').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data as Prediction[];
}

export async function getPrediction(shipmentId: string) {
  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('shipment_id', shipmentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as Prediction | null;
}

export async function savePrediction(shipmentId: string, result: AIPredictionResult) {
  const riskLevelMap: Record<string, string> = { safe: 'low', medium: 'moderate', critical: 'critical' };
  const { data, error } = await supabase.from('predictions').insert({
    shipment_id: shipmentId,
    spoilage_probability: result.risk_score,
    remaining_safe_hours: result.remaining_thermal_stability,
    confidence_score: result.confidence,
    prediction_text: result.reason,
    failure_cause: result.reason,
    recommended_action: result.recommendation,
    temperature_stability: result.risk_level === 'safe' ? 'stable' : result.risk_level === 'medium' ? 'fluctuating' : 'unstable',
    cooling_health: 100 - result.risk_score,
    compressor_health: 100 - result.risk_score * 0.8,
    battery_health: 100 - result.risk_score * 0.6,
    sensor_health: 95,
    fan_health: 100 - result.risk_score * 0.4,
    cooling_efficiency: 100 - result.risk_score * 0.7,
    estimated_failure_time: result.remaining_thermal_stability > 0 ? new Date(Date.now() + result.remaining_thermal_stability * 3600000).toISOString() : null,
    model_version: 'gemini-2.5-flash',
  }).select().single();
  if (error) throw error;

  // Update shipment risk level
  await supabase.from('shipments').update({
    risk_level: riskLevelMap[result.risk_level] || 'moderate',
    risk_score: result.risk_score,
    remaining_safe_hours: result.remaining_thermal_stability,
    updated_at: new Date().toISOString(),
  }).eq('id', shipmentId);

  return data as Prediction;
}

// ============ Alerts ============
export async function getAlerts(unreadOnly = false) {
  let q = supabase.from('alerts').select('*').order('created_at', { ascending: false });
  if (unreadOnly) q = q.eq('is_read', false);
  const { data, error } = await q;
  if (error) throw error;
  return data as Alert[];
}

export async function markAlertRead(id: string) {
  const { error } = await supabase.from('alerts').update({ is_read: true }).eq('id', id);
  if (error) throw error;
}

export async function resolveAlert(id: string) {
  const { error } = await supabase.from('alerts').update({ is_resolved: true, is_read: true }).eq('id', id);
  if (error) throw error;
}

export async function createAlert(alert: Partial<Alert>) {
  const { data, error } = await supabase.from('alerts').insert(alert).select().single();
  if (error) throw error;
  return data as Alert;
}

// ============ Notifications ============
export async function getNotifications() {
  const { data, error } = await supabase.from('alerts').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data as Alert[];
}

export async function getUnreadCount() {
  const { count, error } = await supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('is_read', false);
  if (error) throw error;
  return count || 0;
}

// ============ Dashboard ============
export async function getDashboardStats(): Promise<DashboardStats> {
  const [shipRes, teleRes, deliveredRes] = await Promise.all([
    supabase.from('shipments').select('status, risk_level'),
    supabase.from('shipment_telemetry').select('temperature').order('recorded_at', { ascending: false }).limit(100),
    supabase.from('shipments').select('id').eq('status', 'delivered'),
  ]);

  const shipments = shipRes.data || [];
  const temps = teleRes.data || [];

  return {
    total_shipments: shipments.length,
    active_shipments: shipments.filter(s => s.status === 'in_transit').length,
    delayed_shipments: shipments.filter(s => s.status === 'pending').length,
    delivered_shipments: shipments.filter(s => s.status === 'delivered').length,
    critical_shipments: shipments.filter(s => s.risk_level === 'critical').length,
    avg_temperature: temps.length > 0 ? temps.reduce((sum, t) => sum + (t as any).temperature, 0) / temps.length : 0,
    avg_delivery_time: 6.5,
    rescued_shipments: 2,
  };
}

// ============ Cold Storage ============
export async function getColdStorage() {
  const { data, error } = await supabase.from('cold_storage_facilities').select('*').order('name');
  if (error) throw error;
  return data as ColdStorageFacility[];
}

export async function getNearestColdStorage(lat: number, lng: number): Promise<RescueRecommendation | null> {
  const { data, error } = await supabase.from('cold_storage_facilities').select('*').eq('status', 'active');
  if (error) throw error;
  const facilities = data as ColdStorageFacility[];
  if (facilities.length === 0) return null;

  let nearest = facilities[0];
  let minDist = Infinity;
  for (const f of facilities) {
    if (f.latitude && f.longitude) {
      const dist = Math.sqrt(Math.pow(f.latitude - lat, 2) + Math.pow(f.longitude - lng, 2)) * 111;
      if (dist < minDist) {
        minDist = dist;
        nearest = f;
      }
    }
  }

  return {
    cold_storage_id: nearest.id,
    name: nearest.name,
    city: nearest.city,
    distance_km: Math.round(minDist),
    travel_time_min: Math.round(minDist / 40 * 60),
    contact_number: nearest.contact_phone || '',
    latitude: nearest.latitude || 0,
    longitude: nearest.longitude || 0,
  };
}

// ============ Hospitals ============
export async function getHospitals() {
  const { data, error } = await supabase.from('hospitals').select('*').order('name');
  if (error) throw error;
  return data as Hospital[];
}

// ============ Warehouses ============
export async function getWarehouses() {
  const { data, error } = await supabase.from('warehouses').select('*').order('name');
  if (error) throw error;
  return data as Warehouse[];
}

// ============ Drivers ============
export async function getDrivers() {
  const { data, error } = await supabase.from('drivers').select('*').order('rating', { ascending: false });
  if (error) throw error;
  return data as Driver[];
}

// ============ Vehicles ============
export async function getVehicles() {
  const { data, error } = await supabase.from('vehicles').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data as Vehicle[];
}

// ============ Emergency ============
export async function getEmergencies() {
  const { data, error } = await supabase.from('emergency_events').select('*').order('detected_at', { ascending: false });
  if (error) throw error;
  return data as EmergencyEvent[];
}

export async function createEmergency(payload: Partial<EmergencyEvent>) {
  const { data, error } = await supabase.from('emergency_events').insert(payload).select().single();
  if (error) throw error;
  return data as EmergencyEvent;
}

// ============ AI Prediction ============
export async function requestAIPrediction(shipmentId: string): Promise<AIPredictionResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

  const response = await fetch(`${supabaseUrl}/functions/v1/ai-prediction`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ shipmentId }),
  });

  if (!response.ok) {
    throw new Error(`AI prediction failed: ${response.status}`);
  }

  const result = await response.json();
  if (result.error) throw new Error(result.error);

  // Save prediction to database
  await savePrediction(shipmentId, result);

  // Create alert if critical
  if (result.risk_level === 'critical') {
    await createAlert({
      shipment_id: shipmentId,
      category: 'critical',
      alert_type: 'ai_critical_risk',
      severity: 'critical',
      title: 'AI Risk Prediction: Critical',
      message: result.reason,
      ai_recommendation: result.recommendation,
      is_read: false,
      is_resolved: false,
    });
  }

  return result as AIPredictionResult;
}

// ============ Profiles ============
export async function getProfiles() {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data as any[];
}

export async function updateProfile(id: string, payload: any) {
  const { data, error } = await supabase.from('profiles').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteProfile(id: string) {
  const { error } = await supabase.from('profiles').delete().eq('id', id);
  if (error) throw error;
}
