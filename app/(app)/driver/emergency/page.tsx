'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { PageHeader } from '@/components/ui/page-components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Siren, Phone, MapPin, Thermometer, Truck, Package,
  AlertTriangle, CheckCircle2, Loader2, Navigation,
  BrainCircuit, ShieldAlert, Fuel, Wrench, Construction, Activity, Snowflake,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  generateSosRecommendation,
  EMERGENCY_TYPE_LABELS,
  type EmergencyType,
  type SosRecommendation,
} from '@/lib/sos-recommendations';
import { WAREHOUSES, haversineKm } from '@/lib/warehouse-data';

interface ActiveShipment {
  id: string;
  shipment_number: string;
  medicine_name: string;
  medicine_type: string | null;
  status: string;
  destination_city: string | null;
  origin_city: string | null;
  driver_id: string | null;
  vehicle_id: string | null;
  safe_temp_min: number | null;
  safe_temp_max: number | null;
  risk_level: string | null;
  vehicle?: { registration_number: string } | null;
  driver?: { name: string } | null;
}

const ACTIVE_STATUSES = [
  'assigned', 'in_transit', 'delayed', 'rerouted',
  'dispatched', 'loaded', 'packed', 'emergency',
];

export default function DriverEmergencyPage() {
  const { profile } = useAuth();
  const [sosActive, setSosActive] = useState(false);
  const [sosSent, setSosSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [shipments, setShipments] = useState<ActiveShipment[]>([]);
  const [loadingShipments, setLoadingShipments] = useState(true);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [emergencyType, setEmergencyType] = useState<EmergencyType>('vehicle_breakdown');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [aiRecommendation, setAiRecommendation] = useState<SosRecommendation | null>(null);

  useEffect(() => {
    async function loadShipments() {
      if (!profile?.id) {
        setLoadingShipments(false);
        return;
      }
      try {
        // Step 1: Resolve the driver record from drivers table via user_id
        const { data: driver, error: driverError } = await supabase
          .from('drivers')
          .select('id, name')
          .eq('user_id', profile.id)
          .maybeSingle();

        if (driverError || !driver) {
          setLoadingShipments(false);
          return;
        }

        // Step 2: Query shipments by the driver's UUID (drivers.id, not auth user id)
        const { data, error } = await supabase
          .from('shipments')
          .select(`
            id, shipment_number, medicine_name, medicine_type, status,
            destination_city, origin_city, driver_id, vehicle_id,
            safe_temp_min, safe_temp_max, risk_level
          `)
          .eq('driver_id', driver.id)
          .in('status', ACTIVE_STATUSES)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        if (!data || data.length === 0) {
          setLoadingShipments(false);
          return;
        }

        // Step 3: Fetch vehicle info
        const vehicleIds = data.map(s => s.vehicle_id).filter(Boolean) as string[];
        let vehicleMap: Record<string, { registration_number: string }> = {};
        if (vehicleIds.length > 0) {
          const { data: vehicles } = await supabase
            .from('vehicles')
            .select('id, registration_number')
            .in('id', vehicleIds);
          if (vehicles) {
            vehicleMap = vehicles.reduce((acc, v) => {
              acc[v.id] = { registration_number: v.registration_number };
              return acc;
            }, {} as Record<string, { registration_number: string }>);
          }
        }

        const enriched: ActiveShipment[] = data.map(s => ({
          ...s,
          vehicle: s.vehicle_id ? vehicleMap[s.vehicle_id] || null : null,
          driver: { name: driver.name },
        }));

        setShipments(enriched);
        if (enriched.length > 0) setSelectedShipmentId(enriched[0].id);
      } catch (err: any) {
        toast.error('Failed to load shipments');
      } finally {
        setLoadingShipments(false);
      }
    }
    loadShipments();
  }, [profile?.id]);

  function requestGPS() {
    if (!navigator.geolocation) {
      setGpsError('GPS not supported on this device');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsError(null);
      },
      (err) => {
        setGpsError(`GPS error: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  useEffect(() => {
    requestGPS();
  }, []);

  const selectedShipment = shipments.find(s => s.id === selectedShipmentId) || null;

  function findNearestWarehouse(): { name: string; city: string; distanceKm: number } | null {
    if (!gpsCoords) return null;
    let nearest: { name: string; city: string; distanceKm: number } | null = null;
    for (const wh of WAREHOUSES) {
      const dist = haversineKm(gpsCoords.lat, gpsCoords.lng, wh.lat, wh.lng);
      if (!nearest || dist < nearest.distanceKm) {
        nearest = { name: wh.name, city: wh.city, distanceKm: Math.round(dist) };
      }
    }
    return nearest;
  }

  async function triggerSOS() {
    if (!selectedShipment) {
      toast.error('No active shipment selected for SOS');
      return;
    }
    if (!profile?.id) {
      toast.error('You must be logged in to trigger SOS');
      return;
    }

    setSending(true);
    setSosActive(true);

    try {
      const now = new Date().toISOString();
      const lat = gpsCoords?.lat ?? null;
      const lng = gpsCoords?.lng ?? null;
      const typeLabel = EMERGENCY_TYPE_LABELS[emergencyType];

      const description = `SOS triggered by driver ${selectedShipment.driver?.name || profile.name}. Type: ${typeLabel}. Shipment: ${selectedShipment.shipment_number}. Vehicle: ${selectedShipment.vehicle?.registration_number || 'N/A'}. Destination: ${selectedShipment.destination_city || 'N/A'}.${gpsCoords ? ` GPS: ${gpsCoords.lat.toFixed(4)}, ${gpsCoords.lng.toFixed(4)}` : ''}`;

      // 1. Save emergency event to emergency_events table (auditing)
      const { error: emergencyError } = await supabase
        .from('emergency_events')
        .insert({
          shipment_id: selectedShipment.id,
          event_type: emergencyType,
          severity: 'critical',
          description,
          detected_at: now,
          status: 'active',
          latitude: lat,
          longitude: lng,
          driver_id: selectedShipment.driver_id,
          vehicle_id: selectedShipment.vehicle_id,
        });

      if (emergencyError) throw emergencyError;

      // 2. Create alert/notification for admin (realtime)
      const { error: alertError } = await supabase
        .from('alerts')
        .insert({
          shipment_id: selectedShipment.id,
          category: 'critical',
          alert_type: 'sos_emergency',
          severity: 'critical',
          title: `SOS: ${selectedShipment.shipment_number} — ${typeLabel}`,
          message: description,
          is_read: false,
          is_resolved: false,
          vehicle_id: selectedShipment.vehicle_id,
          driver_id: selectedShipment.driver_id,
          latitude: lat,
          longitude: lng,
        });

      if (alertError) throw alertError;

      // 3. Update shipment status to "emergency"
      const { error: shipError } = await supabase
        .from('shipments')
        .update({ status: 'emergency', updated_at: now })
        .eq('id', selectedShipment.id);

      if (shipError) throw shipError;

      // 4. Add emergency event to shipment timeline
      const { error: timelineError } = await supabase
        .from('shipment_timeline')
        .insert({
          shipment_id: selectedShipment.id,
          event_type: 'sos_emergency',
          title: `SOS: ${typeLabel}`,
          description,
          location: gpsCoords ? `${gpsCoords.lat.toFixed(4)}, ${gpsCoords.lng.toFixed(4)}` : null,
          latitude: lat,
          longitude: lng,
          created_by: profile.id,
        });

      if (timelineError) throw timelineError;

      // 5. Generate AI recommendation
      const nearestWh = findNearestWarehouse();
      const rec = generateSosRecommendation(emergencyType, nearestWh);
      setAiRecommendation(rec);

      // 6. Save AI recommendation as an alert for admin
      await supabase
        .from('alerts')
        .insert({
          shipment_id: selectedShipment.id,
          category: 'ai_recommendation',
          alert_type: 'ai_sos_recommendation',
          severity: rec.priority,
          title: `AI: ${rec.title}`,
          message: `${rec.reason} ${rec.recommendedAction}${nearestWh ? ` Nearest cold storage: ${nearestWh.name}, ${nearestWh.city} (${nearestWh.distanceKm} km).` : ''}`,
          is_read: false,
          is_resolved: false,
          vehicle_id: selectedShipment.vehicle_id,
          driver_id: selectedShipment.driver_id,
        });

      setSosSent(true);
      toast.error('SOS SENT! Admin has been notified with your live data.', { duration: 6000 });
    } catch (err: any) {
      toast.error(`SOS failed: ${err.message || 'Unknown error'}`);
      setSosActive(false);
    } finally {
      setSending(false);
      setTimeout(() => setSosActive(false), 5000);
    }
  }

  const sharedData = selectedShipment ? [
    { label: 'Driver Name', value: selectedShipment.driver?.name || profile?.name || 'N/A', icon: Navigation },
    { label: 'Vehicle Number', value: selectedShipment.vehicle?.registration_number || 'N/A', icon: Truck },
    { label: 'Shipment ID', value: selectedShipment.shipment_number, icon: Package },
    { label: 'GPS Location', value: gpsCoords ? `${gpsCoords.lat.toFixed(4)}° N, ${gpsCoords.lng.toFixed(4)}° E` : 'Acquiring...', icon: MapPin },
    { label: 'Destination', value: selectedShipment.destination_city || 'N/A', icon: MapPin },
    { label: 'Shipment Type', value: selectedShipment.medicine_name || 'N/A', icon: Package },
    { label: 'Current Temp', value: selectedShipment.safe_temp_min != null && selectedShipment.safe_temp_max != null ? `${selectedShipment.safe_temp_min}–${selectedShipment.safe_temp_max}°C (safe range)` : 'N/A', icon: Thermometer },
    { label: 'Risk Level', value: (selectedShipment.risk_level || 'N/A').charAt(0).toUpperCase() + (selectedShipment.risk_level || '').slice(1), icon: ShieldAlert },
    { label: 'Time', value: new Date().toLocaleString('en-IN'), icon: AlertTriangle },
    { label: 'Emergency Type', value: EMERGENCY_TYPE_LABELS[emergencyType], icon: Siren },
  ] : [];

  const EMERGENCY_ICONS: Record<EmergencyType, typeof Siren> = {
    vehicle_breakdown: Wrench,
    cooling_failure: Thermometer,
    accident: AlertTriangle,
    medical_emergency: Activity,
    road_block: Construction,
    fuel_emergency: Fuel,
    shipment_damage: Package,
    refrigeration_failure: Snowflake,
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Emergency"
        description="Trigger SOS for immediate assistance"
        icon={Siren}
      />

      {loadingShipments ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-3 py-12">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading active shipments...</p>
          </CardContent>
        </Card>
      ) : shipments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <Package className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium">No active shipment assigned.</p>
            <p className="text-xs text-muted-foreground">
              You need an active shipment assigned to you to trigger SOS.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Shipment info card */}
          {selectedShipment && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" /> Active Shipment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="rounded-xl bg-primary/5 p-3">
                    <div className="flex items-center gap-2">
                      <Package className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] text-muted-foreground">Shipment ID</span>
                    </div>
                    <p className="mt-1 text-sm font-medium">{selectedShipment.shipment_number}</p>
                  </div>
                  <div className="rounded-xl bg-primary/5 p-3">
                    <div className="flex items-center gap-2">
                      <Truck className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] text-muted-foreground">Vehicle Number</span>
                    </div>
                    <p className="mt-1 text-sm font-medium">{selectedShipment.vehicle?.registration_number || 'N/A'}</p>
                  </div>
                  <div className="rounded-xl bg-primary/5 p-3">
                    <div className="flex items-center gap-2">
                      <Navigation className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] text-muted-foreground">Driver Name</span>
                    </div>
                    <p className="mt-1 text-sm font-medium">{selectedShipment.driver?.name || 'N/A'}</p>
                  </div>
                  <div className="rounded-xl bg-primary/5 p-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] text-muted-foreground">GPS Location</span>
                    </div>
                    <p className="mt-1 text-sm font-medium">
                      {gpsCoords ? `${gpsCoords.lat.toFixed(4)}°, ${gpsCoords.lng.toFixed(4)}°` : 'Acquiring...'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-primary/5 p-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] text-muted-foreground">Destination</span>
                    </div>
                    <p className="mt-1 text-sm font-medium">{selectedShipment.destination_city || 'N/A'}</p>
                  </div>
                  <div className="rounded-xl bg-primary/5 p-3">
                    <div className="flex items-center gap-2">
                      <Package className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] text-muted-foreground">Shipment Type</span>
                    </div>
                    <p className="mt-1 text-sm font-medium">{selectedShipment.medicine_name || 'N/A'}</p>
                  </div>
                  <div className="rounded-xl bg-primary/5 p-3">
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] text-muted-foreground">Current Temp</span>
                    </div>
                    <p className="mt-1 text-sm font-medium">
                      {selectedShipment.safe_temp_min != null && selectedShipment.safe_temp_max != null
                        ? `${selectedShipment.safe_temp_min}–${selectedShipment.safe_temp_max}°C`
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-primary/5 p-3">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] text-muted-foreground">Risk Level</span>
                    </div>
                    <p className="mt-1 text-sm font-medium capitalize">{selectedShipment.risk_level || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Shipment selector if multiple */}
          {shipments.length > 1 && (
            <Card>
              <CardContent className="p-4">
                <label className="text-xs font-medium text-muted-foreground">Select Shipment</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {shipments.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedShipmentId(s.id)}
                      className={cn(
                        'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                        selectedShipmentId === s.id
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:bg-muted/50',
                      )}
                    >
                      {s.shipment_number}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Emergency type selector */}
          <Card>
            <CardContent className="p-4">
              <label className="text-xs font-medium text-muted-foreground">Emergency Type</label>
              <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                {(Object.keys(EMERGENCY_TYPE_LABELS) as EmergencyType[]).map(t => {
                  const Icon = EMERGENCY_ICONS[t];
                  return (
                    <button
                      key={t}
                      onClick={() => setEmergencyType(t)}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                        emergencyType === t
                          ? 'border-critical bg-critical/10 text-critical'
                          : 'border-border text-muted-foreground hover:bg-muted/50',
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {EMERGENCY_TYPE_LABELS[t]}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* GPS status */}
          {gpsError && (
            <Card className="border-warning/30">
              <CardContent className="flex items-center gap-3 p-4">
                <MapPin className="h-4 w-4 text-warning" />
                <p className="text-xs text-muted-foreground flex-1">{gpsError}</p>
                <Button onClick={requestGPS} variant="outline" size="sm">Retry GPS</Button>
              </CardContent>
            </Card>
          )}

          {/* SOS Button */}
          <Card className={cn('border-2', sosActive ? 'border-critical animate-pulse' : 'border-critical/20')}>
            <CardContent className="p-8 text-center">
              <div className={cn(
                'mx-auto flex h-24 w-24 items-center justify-center rounded-full transition-all',
                sosActive ? 'bg-critical scale-110' : 'bg-critical/10',
              )}>
                {sending ? (
                  <Loader2 className="h-12 w-12 animate-spin text-white" />
                ) : (
                  <Siren className={cn('h-12 w-12', sosActive ? 'text-white' : 'text-critical')} />
                )}
              </div>
              <h2 className="mt-6 text-xl font-bold">Emergency SOS</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Press the button below to instantly notify admin with your live data.
              </p>
              <Button
                onClick={triggerSOS}
                disabled={sending || !selectedShipment}
                size="lg"
                className={cn(
                  'mt-6 gap-2 text-white',
                  sosActive ? 'bg-destructive animate-pulse' : 'bg-critical hover:bg-critical/90',
                )}
              >
                <Siren className="h-6 w-6" /> {sending ? 'SENDING SOS...' : 'SEND SOS NOW'}
              </Button>
            </CardContent>
          </Card>

          {/* SOS confirmation */}
          {sosSent && selectedShipment && (
            <Card className="border-success/20 bg-success/5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-5 w-5" /> SOS Sent Successfully
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">The following data has been shared with admin:</p>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {sharedData.map((d) => (
                    <div key={d.label} className="rounded-xl border border-border bg-card p-3">
                      <div className="flex items-center gap-2">
                        <d.icon className="h-4 w-4 text-primary" />
                        <span className="text-xs text-muted-foreground">{d.label}</span>
                      </div>
                      <p className="mt-1 text-sm font-medium">{d.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl bg-critical/5 p-3">
                  <p className="text-xs font-semibold text-critical">Shipment Status Updated</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Shipment {selectedShipment.shipment_number} status changed to "Emergency". Admin dashboard updated in real-time.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Recommendation */}
          {aiRecommendation && (
            <Card className="border-2 border-indigo-500/40 bg-indigo-500/5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-indigo-500">
                  <BrainCircuit className="h-5 w-5" /> AI Recommendation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-foreground">{aiRecommendation.title}</p>
                  <Badge className={cn(
                    'gap-1',
                    aiRecommendation.priority === 'critical' ? 'bg-critical text-white' : 'bg-warning text-white',
                  )}>
                    {aiRecommendation.priority === 'critical' ? 'Critical' : 'High Priority'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{aiRecommendation.reason}</p>
                <div className="rounded-xl bg-indigo-500/10 p-3">
                  <p className="text-[10px] font-semibold text-indigo-500">Recommended Action</p>
                  <p className="mt-1 text-xs text-foreground">{aiRecommendation.recommendedAction}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 rounded-lg border border-border p-2">
                    <span className="text-[10px] text-muted-foreground">Confidence</span>
                    <span className="text-sm font-bold text-primary">{aiRecommendation.confidenceScore}%</span>
                  </div>
                  {aiRecommendation.nearestWarehouse && (
                    <div className="flex items-center gap-2 rounded-lg border border-border p-2">
                      <MapPin className="h-3 w-3 text-primary" />
                      <span className="text-[10px] text-muted-foreground">Nearest Cold Storage:</span>
                      <span className="text-xs font-medium">{aiRecommendation.nearestWarehouse.name}, {aiRecommendation.nearestWarehouse.city} ({aiRecommendation.nearestWarehouse.distanceKm} km)</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Hotline */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Emergency Hotline</p>
                  <p className="text-xs text-muted-foreground">24/7 support line</p>
                </div>
                <Button variant="outline" size="sm">Call Now</Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
