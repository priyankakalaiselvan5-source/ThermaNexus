'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { PageHeader, StatusBadge } from '@/components/ui/page-components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Package, Search, Download, ArrowUpDown, MapPin, Clock,
  Thermometer, QrCode, Eye, ChevronLeft, ChevronRight, Truck, User,
  Calendar, AlertTriangle, BrainCircuit, Navigation, FileText, Activity,
  Loader2, Plus, X, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateTime, formatDate } from '@/lib/format';
import { exportTelemetryCSV } from '@/lib/api';
import { generateShipmentReportPdf } from '@/lib/shipment-report';
import { toast } from 'sonner';
import { useNotifications } from '@/hooks/use-notifications';
import type { Shipment, Telemetry, Prediction } from '@/types';
import type { TruckState } from '@/lib/map-data';

const LeafletMap = dynamic(
  () => import('@/components/map/leaflet-map').then(m => m.default),
  { ssr: false, loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-secondary/30">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )}
);

const CITY_COORDS: Record<string, [number, number]> = {
  'Mumbai': [19.076, 72.877], 'Delhi': [28.6139, 77.209], 'New Delhi': [28.6139, 77.209],
  'Chennai': [13.0827, 80.2707], 'Bengaluru': [12.9716, 77.5946], 'Hyderabad': [17.385, 78.4867],
  'Kolkata': [22.5726, 88.363], 'Ahmedabad': [23.0225, 72.5714], 'Pune': [18.5204, 73.8567],
  'Jaipur': [26.9124, 75.7873], 'Lucknow': [26.8467, 80.946], 'Kochi': [9.9312, 76.2673],
  'Guwahati': [26.1445, 91.7362], 'Bhubaneswar': [20.296, 85.8245], 'Nagpur': [21.1458, 79.0882],
  'Chandigarh': [30.7333, 76.7794], 'Surat': [21.1702, 72.8311], 'Visakhapatnam': [17.6868, 83.2185],
  'Coimbatore': [11.0168, 76.9558],
};

function calcStatus(temp: number, min: number, max: number): 'safe' | 'warning' | 'critical' {
  if (temp > max + 1.5 || temp < min - 1.5) return 'critical';
  if (temp > max || temp < min) return 'warning';
  return 'safe';
}

interface DriverOption { id: string; name: string; }
interface VehicleOption { id: string; registration_number: string; }

export default function ShipmentsPage() {
  const { profile } = useAuth();
  const { addCRUDNotification } = useNotifications();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [telemetry, setTelemetry] = useState<Record<string, Telemetry[]>>({});
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [sortField, setSortField] = useState<'created_at' | 'risk_score' | 'remaining_safe_hours'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Shipment | null>(null);
  const pageSize = 10;

  // Tracking dialog
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [trackingShipment, setTrackingShipment] = useState<Shipment | null>(null);
  const [trackingTrucks, setTrackingTrucks] = useState<TruckState[]>([]);
  const [trackingTimeline, setTrackingTimeline] = useState<any[]>([]);
  const [trackingPrediction, setTrackingPrediction] = useState<Prediction | undefined>();
  const [trackingAlerts, setTrackingAlerts] = useState<any[]>([]);
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Add shipment dialog
  const [addOpen, setAddOpen] = useState(false);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [saving, setSaving] = useState(false);
  function genShipmentId() {
    const y = new Date().getFullYear();
    const rand = Math.floor(100 + Math.random() * 900);
    return `TNX-SHP-${y}-${rand}`;
  }

  const [newShip, setNewShip] = useState({
    shipment_number: genShipmentId(),
    medicine_name: '',
    medicine_type: 'vaccine',
    batch_number: '',
    quantity: '100',
    unit: 'vials',
    safe_temp_min: '2',
    safe_temp_max: '8',
    origin_city: '',
    origin_state: '',
    destination_city: '',
    destination_state: '',
    driver_id: '',
    vehicle_id: '',
    risk_level: 'low',
    notes: '',
    dispatched_at: '',
    eta: '',
  });

  // Report generating
  const [reportGenerating, setReportGenerating] = useState(false);

  const loadShipments = useCallback(async () => {
    const [shipRes, teleRes, predRes] = await Promise.all([
      supabase.from('shipments').select('*').order('created_at', { ascending: false }),
      supabase.from('shipment_telemetry').select('*').order('recorded_at', { ascending: true }),
      supabase.from('predictions').select('*').order('created_at', { ascending: false }),
    ]);
    if (shipRes.data) setShipments(shipRes.data as Shipment[]);
    if (teleRes.data) {
      const byShip: Record<string, Telemetry[]> = {};
      teleRes.data.forEach((t: Telemetry) => {
        if (!byShip[t.shipment_id]) byShip[t.shipment_id] = [];
        byShip[t.shipment_id].push(t);
      });
      setTelemetry(byShip);
    }
    if (predRes.data) {
      const byShip: Record<string, Prediction> = {};
      predRes.data.forEach((p: Prediction) => {
        if (!byShip[p.shipment_id]) byShip[p.shipment_id] = p;
      });
      setPredictions(byShip);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadShipments();

    const sub = supabase
      .channel('shipments-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments' }, () => loadShipments())
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [loadShipments]);

  // Load drivers and vehicles for add shipment dialog
  useEffect(() => {
    if (addOpen) {
      supabase.from('drivers').select('id, name, status').order('name').then(({ data }) => {
        if (data) setDrivers(data.filter((d: any) => d.status === 'available' || d.status === 'on_duty'));
      });
      supabase.from('vehicles').select('id, registration_number, status').order('registration_number').then(({ data }) => {
        if (data) setVehicles(data.filter((v: any) => v.status === 'available'));
      });
    }
  }, [addOpen]);

  const filtered = useMemo(() => {
    let result = shipments;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.shipment_number.toLowerCase().includes(q) ||
        s.medicine_name.toLowerCase().includes(q) ||
        s.batch_number?.toLowerCase().includes(q) ||
        s.origin_city?.toLowerCase().includes(q) ||
        s.destination_city?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') result = result.filter(s => s.status === statusFilter);
    if (riskFilter !== 'all') result = result.filter(s => s.risk_level === riskFilter);
    result = [...result].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'risk_score') return (a.risk_score - b.risk_score) * dir;
      if (sortField === 'remaining_safe_hours') return ((a.remaining_safe_hours || 999) - (b.remaining_safe_hours || 999)) * dir;
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
    });
    return result;
  }, [shipments, search, statusFilter, riskFilter, sortField, sortDir]);

  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const selectedTelemetry = selected ? telemetry[selected.id] || [] : [];
  const selectedPrediction = selected ? predictions[selected.id] : undefined;

  function handleExportCSV() {
    if (selected && selectedTelemetry.length > 0) {
      const csv = exportTelemetryCSV(selectedTelemetry);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selected.shipment_number}_telemetry.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Telemetry CSV exported');
    } else {
      const allTelemetry = Object.values(telemetry).flat();
      if (allTelemetry.length === 0) {
        toast.error('No telemetry data to export');
        return;
      }
      const csv = exportTelemetryCSV(allTelemetry);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'all_telemetry.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('All telemetry CSV exported');
    }
  }

  // --- Tracking ---
  async function openTracking(ship: Shipment) {
    setTrackingShipment(ship);
    setTrackingOpen(true);
    setTrackingLoading(true);
    setSelected(ship);

    // Fetch timeline, prediction, alerts, truck position
    const [tlRes, predRes, alertRes, posRes, driverRes, vehicleRes] = await Promise.all([
      supabase.from('shipment_timeline').select('*').eq('shipment_id', ship.id).order('created_at', { ascending: true }),
      supabase.from('predictions').select('*').eq('shipment_id', ship.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('alerts').select('*').eq('shipment_id', ship.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('truck_positions').select('*').eq('shipment_id', ship.id).maybeSingle(),
      ship.driver_id ? supabase.from('drivers').select('name').eq('id', ship.driver_id).maybeSingle() : Promise.resolve({ data: null }),
      ship.vehicle_id ? supabase.from('vehicles').select('registration_number').eq('id', ship.vehicle_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);

    setTrackingTimeline(tlRes.data || []);
    setTrackingPrediction(predRes.data as Prediction || undefined);
    setTrackingAlerts(alertRes.data || []);

    // Build truck state for map
    const pos = posRes.data as any;
    const driverName = (driverRes.data as any)?.name;
    const vehicleNumber = (vehicleRes.data as any)?.registration_number;
    const tele = telemetry[ship.id] || [];
    const latestTele = tele[tele.length - 1];

    const originCoords = CITY_COORDS[ship.origin_city || ''] || [22.5, 80.0];
    const destCoords = CITY_COORDS[ship.destination_city || ''] || [22.5, 80.0];

    if (pos) {
      const safeMin = ship.safe_temp_min;
      const safeMax = ship.safe_temp_max;
      const temp = latestTele?.temperature ?? (safeMin + (safeMax - safeMin) / 2);
      const status = calcStatus(temp, safeMin, safeMax);
      let routeProgress: [number, number][] = [[Number(pos.lat), Number(pos.lng)], [Number(pos.destination_lat), Number(pos.destination_lng)]];
      try {
        if (pos.route_waypoints && Array.isArray(pos.route_waypoints) && pos.route_waypoints.length >= 2) {
          routeProgress = pos.route_waypoints;
        }
      } catch { /* keep default */ }
      const etaStr = pos.eta_minutes > 0
        ? `${Math.floor(pos.eta_minutes / 60)}h ${pos.eta_minutes % 60}m`
        : ship.eta ? formatDateTime(ship.eta) : 'N/A';

      const truck: TruckState = {
        id: pos.id,
        shipmentId: ship.shipment_number,
        vehicleNumber: vehicleNumber || 'N/A',
        driverName: driverName || 'Unassigned',
        routeId: `track-${ship.id.substring(0, 8)}`,
        fromCity: ship.origin_city || 'Unknown',
        toCity: ship.destination_city || pos.destination_name || 'Unknown',
        position: [Number(pos.lat), Number(pos.lng)],
        speed: pos.speed_kmh,
        temperature: Math.round(temp * 10) / 10,
        safeTempMin: safeMin,
        safeTempMax: safeMax,
        eta: etaStr,
        status,
        progress: Number(pos.progress),
        routeProgress,
        rerouted: pos.is_rerouted,
      };
      setTrackingTrucks([truck]);
    } else {
      // Simulated fallback
      const safeMin = ship.safe_temp_min;
      const safeMax = ship.safe_temp_max;
      const temp = latestTele?.temperature ?? (safeMin + (safeMax - safeMin) / 2);
      const status = calcStatus(temp, safeMin, safeMax);
      const progress = 0.4;
      const lat = originCoords[0] + (destCoords[0] - originCoords[0]) * progress;
      const lng = originCoords[1] + (destCoords[1] - originCoords[1]) * progress;

      const truck: TruckState = {
        id: `sim-${ship.id.substring(0, 8)}`,
        shipmentId: ship.shipment_number,
        vehicleNumber: vehicleNumber || 'N/A',
        driverName: driverName || 'Unassigned',
        routeId: `sim-${ship.id.substring(0, 8)}`,
        fromCity: ship.origin_city || 'Unknown',
        toCity: ship.destination_city || 'Unknown',
        position: [lat, lng],
        speed: latestTele?.speed_kmh ?? 55,
        temperature: Math.round(temp * 10) / 10,
        safeTempMin: safeMin,
        safeTempMax: safeMax,
        eta: ship.eta ? formatDateTime(ship.eta) : 'N/A',
        status,
        progress,
        routeProgress: [originCoords, [lat, lng], destCoords],
      };
      setTrackingTrucks([truck]);
    }

    setTrackingLoading(false);

    // Poll truck position every 3 seconds
    const interval = setInterval(async () => {
      const { data: newPos } = await supabase.from('truck_positions').select('*').eq('shipment_id', ship.id).maybeSingle();
      if (newPos) {
        setTrackingTrucks(prev => prev.map(t => {
          const lat = Number(newPos.lat);
          const lng = Number(newPos.lng);
          let routeProgress: [number, number][] = [t.position, [Number(newPos.destination_lat), Number(newPos.destination_lng)]];
          try {
            if (newPos.route_waypoints && Array.isArray(newPos.route_waypoints) && newPos.route_waypoints.length >= 2) {
              routeProgress = newPos.route_waypoints;
            }
          } catch { /* keep */ }
          return {
            ...t,
            position: [lat, lng],
            speed: newPos.speed_kmh,
            progress: Number(newPos.progress),
            eta: newPos.eta_minutes > 0 ? `${Math.floor(newPos.eta_minutes / 60)}h ${newPos.eta_minutes % 60}m` : t.eta,
            routeProgress,
          };
        }));
      }
    }, 3000);

    // Store interval for cleanup
    (window as any).__trackingInterval = interval;
  }

  function closeTracking() {
    setTrackingOpen(false);
    setTrackingShipment(null);
    setTrackingTrucks([]);
    if ((window as any).__trackingInterval) {
      clearInterval((window as any).__trackingInterval);
      delete (window as any).__trackingInterval;
    }
  }

  // --- Report ---
  async function handleGenerateReport(ship: Shipment) {
    setReportGenerating(true);
    try {
      const [tlRes, predRes, driverRes, vehicleRes, dhRes] = await Promise.all([
        supabase.from('shipment_timeline').select('*').eq('shipment_id', ship.id).order('created_at', { ascending: true }),
        supabase.from('predictions').select('*').eq('shipment_id', ship.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        ship.driver_id ? supabase.from('drivers').select('name').eq('id', ship.driver_id).maybeSingle() : Promise.resolve({ data: null }),
        ship.vehicle_id ? supabase.from('vehicles').select('registration_number').eq('id', ship.vehicle_id).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from('ai_decision_history').select('*').eq('shipment_id', ship.id).order('created_at', { ascending: false }),
      ]);

      await generateShipmentReportPdf({
        shipment: ship,
        telemetry: telemetry[ship.id] || [],
        prediction: predRes.data as Prediction || undefined,
        timeline: (tlRes.data || []) as any[],
        decisionHistory: (dhRes.data || []) as any[],
        driverName: (driverRes.data as any)?.name,
        vehicleNumber: (vehicleRes.data as any)?.registration_number,
      });

      toast.success(`Report downloaded: ThermaNexus_Report_${ship.shipment_number}.pdf`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate report');
    } finally {
      setReportGenerating(false);
    }
  }

  // --- Add Shipment ---
  async function handleAddShipment() {
    if (!newShip.shipment_number.trim()) {
      toast.error('Shipment ID is required');
      return;
    }
    if (!newShip.medicine_name.trim()) {
      toast.error('Medicine name is required');
      return;
    }
    if (!newShip.origin_city.trim() || !newShip.destination_city.trim()) {
      toast.error('Source and destination cities are required');
      return;
    }
    if (parseFloat(newShip.safe_temp_min) >= parseFloat(newShip.safe_temp_max)) {
      toast.error('Safe temp min must be less than max');
      return;
    }

    setSaving(true);
    try {
      const insertData: any = {
        shipment_number: newShip.shipment_number,
        medicine_name: newShip.medicine_name,
        medicine_type: newShip.medicine_type,
        batch_number: newShip.batch_number || null,
        quantity: parseInt(newShip.quantity) || 1,
        unit: newShip.unit,
        safe_temp_min: parseFloat(newShip.safe_temp_min) || 2,
        safe_temp_max: parseFloat(newShip.safe_temp_max) || 8,
        dispatched_at: newShip.dispatched_at ? new Date(newShip.dispatched_at).toISOString() : null,
        eta: newShip.eta ? new Date(newShip.eta).toISOString() : null,
        origin_city: newShip.origin_city || null,
        origin_state: newShip.origin_state || null,
        destination_city: newShip.destination_city || null,
        destination_state: newShip.destination_state || null,
        driver_id: newShip.driver_id || null,
        vehicle_id: newShip.vehicle_id || null,
        risk_level: newShip.risk_level,
        risk_score: newShip.risk_level === 'critical' ? 80 : newShip.risk_level === 'high' ? 60 : newShip.risk_level === 'moderate' ? 40 : 20,
        status: 'pending',
        notes: newShip.notes || null,
        qr_code: `${typeof window !== 'undefined' ? window.location.origin : ''}/verify/${encodeURIComponent(newShip.shipment_number)}`,
        rfid_tag: `TNX-RFID-${Date.now().toString(36).toUpperCase()}`,
        verification_token: `TNX-SIG-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      };

      const { error } = await supabase.from('shipments').insert(insertData);

      if (error) throw error;

      // Update driver and vehicle status if assigned
      if (newShip.driver_id) {
        await supabase.from('drivers').update({ status: 'on_duty' }).eq('id', newShip.driver_id);
      }
      if (newShip.vehicle_id) {
        await supabase.from('vehicles').update({ status: 'in_use' }).eq('id', newShip.vehicle_id);
      }

      // Create timeline event
      const { data: newShipData } = await supabase
        .from('shipments').select('id').eq('shipment_number', newShip.shipment_number).maybeSingle();

      if (newShipData) {
        await supabase.from('shipment_timeline').insert({
          shipment_id: newShipData.id,
          event_type: 'created',
          title: 'Shipment Created',
          description: `Shipment ${newShip.shipment_number} created for ${newShip.medicine_name}`,
          created_by: profile?.id || null,
        });

        // Create truck position if driver assigned
        if (newShip.driver_id) {
          const originCoords = CITY_COORDS[newShip.origin_city] || [22.5, 80.0];
          const destCoords = CITY_COORDS[newShip.destination_city] || [22.5, 80.0];
          await supabase.from('truck_positions').insert({
            shipment_id: newShipData.id,
            driver_id: newShip.driver_id,
            vehicle_id: newShip.vehicle_id || null,
            lat: originCoords[0],
            lng: originCoords[1],
            destination_lat: destCoords[0],
            destination_lng: destCoords[1],
            destination_name: newShip.destination_city || 'Unknown',
            route_waypoints: JSON.stringify([originCoords, destCoords]),
            speed_kmh: 0,
            eta_minutes: 180,
            distance_remaining_km: 200,
            traffic_status: 'clear',
            progress: 0,
          });
        }
      }

      // Create alert notification
      await supabase.from('alerts').insert({
        category: 'information',
        alert_type: 'shipment_created',
        severity: 'low',
        title: `New Shipment Created: ${newShip.shipment_number}`,
        message: `${newShip.medicine_name} (${newShip.quantity} ${newShip.unit}) from ${newShip.origin_city || 'N/A'} to ${newShip.destination_city || 'N/A'}`,
        is_read: false,
        is_resolved: false,
      });

      toast.success('Shipment created successfully');
      addCRUDNotification('shipment_created', 'Shipment Created', `${insertData.shipment_number} has been created and is ready for dispatch.`);
      setAddOpen(false);
      setNewShip({
        shipment_number: genShipmentId(), medicine_name: '', medicine_type: 'vaccine', batch_number: '',
        quantity: '100', unit: 'vials', safe_temp_min: '2', safe_temp_max: '8',
        origin_city: '', origin_state: '', destination_city: '', destination_state: '',
        driver_id: '', vehicle_id: '', risk_level: 'low', notes: '',
        dispatched_at: '', eta: '',
      });

      // Refresh table
      await loadShipments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create shipment');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shipment Management"
        description="Track and manage all medicine shipments"
        icon={Package}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV}><Download className="h-4 w-4" /> Export CSV</Button>
            <Button size="sm" className="gradient-primary text-white gap-2" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> New Shipment</Button>
          </div>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Search by ID, medicine, batch, city..." className="pl-9" />
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="dispatched">Dispatched</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
              <Select value={riskFilter} onValueChange={(v) => { setRiskFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Risk" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}>
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="cursor-pointer p-3 text-left font-medium" onClick={() => { setSortField('created_at'); }}>Shipment</th>
                    <th className="p-3 text-left font-medium">Medicine</th>
                    <th className="p-3 text-left font-medium">Route</th>
                    <th className="cursor-pointer p-3 text-left font-medium" onClick={() => { setSortField('risk_score'); }}>Risk</th>
                    <th className="p-3 text-left font-medium">Status</th>
                    <th className="cursor-pointer p-3 text-right font-medium" onClick={() => { setSortField('remaining_safe_hours'); }}>Safe Hrs</th>
                    <th className="p-3 text-center font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">Loading shipments...</td></tr>
                  ) : paged.length === 0 ? (
                    <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No shipments found</td></tr>
                  ) : paged.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => setSelected(s)}
                      className={cn(
                        'cursor-pointer border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors',
                        selected?.id === s.id && 'bg-primary/5'
                      )}
                    >
                      <td className="p-3">
                        <p className="font-medium text-foreground">{s.shipment_number}</p>
                        <p className="text-xs text-muted-foreground">{s.batch_number}</p>
                      </td>
                      <td className="p-3">
                        <p className="text-foreground">{s.medicine_name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{s.medicine_type}</p>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{s.origin_city} → {s.destination_city}</span>
                        </div>
                      </td>
                      <td className="p-3"><StatusBadge status={s.risk_level} /></td>
                      <td className="p-3"><StatusBadge status={s.status} /></td>
                      <td className="p-3 text-right">
                        {s.remaining_safe_hours ? <span className="font-semibold">{s.remaining_safe_hours}h</span> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="p-3 text-center">
                        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelected(s); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border p-3">
                <p className="text-xs text-muted-foreground">
                  Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-2 text-xs">{page + 1} / {totalPages}</span>
                  <Button size="icon" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          {selected ? (
            <>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Shipment Details</CardTitle>
                  <p className="text-xs text-muted-foreground">{selected.shipment_number}</p>
                </div>
                <StatusBadge status={selected.status} />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="rounded-xl bg-secondary/50 p-3">
                    <p className="text-xs text-muted-foreground">Medicine</p>
                    <p className="font-semibold text-foreground">{selected.medicine_name}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="capitalize">{selected.medicine_type}</Badge>
                      <span>Batch: {selected.batch_number}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-border p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Thermometer className="h-3 w-3" /> Safe Temp
                      </div>
                      <p className="mt-1 font-semibold text-sm">{selected.safe_temp_min}° to {selected.safe_temp_max}°C</p>
                    </div>
                    <div className="rounded-xl border border-border p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Package className="h-3 w-3" /> Quantity
                      </div>
                      <p className="mt-1 font-semibold text-sm">{selected.quantity} {selected.unit}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> Route
                    </div>
                    <p className="mt-1 text-sm font-medium">{selected.origin_city} → {selected.destination_city}</p>
                    <p className="text-xs text-muted-foreground">{selected.origin_state} to {selected.destination_state}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-border p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><QrCode className="h-3 w-3" /> QR Code</div>
                      <p className="mt-1 font-mono text-xs">{selected.qr_code}</p>
                    </div>
                    <div className="rounded-xl border border-border p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Activity className="h-3 w-3" /> RFID</div>
                      <p className="mt-1 font-mono text-xs">{selected.rfid_tag}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-border p-3">
                      <p className="text-xs text-muted-foreground">Dispatched</p>
                      <p className="mt-1 text-xs font-medium">{formatDateTime(selected.dispatched_at)}</p>
                    </div>
                    <div className="rounded-xl border border-border p-3">
                      <p className="text-xs text-muted-foreground">Expiry</p>
                      <p className="mt-1 text-xs font-medium">{formatDate(selected.expiry_date)}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-xs text-muted-foreground">Risk Assessment</p>
                    <div className="mt-2 flex items-center gap-2">
                      <StatusBadge status={selected.risk_level} />
                      <span className="text-xs text-muted-foreground">Score: {selected.risk_score}</span>
                    </div>
                    {selected.remaining_safe_hours && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-warning">
                        <Clock className="h-3 w-3" /> {selected.remaining_safe_hours}h remaining safe time
                      </div>
                    )}
                  </div>
                </div>

                {selectedTelemetry.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Latest Telemetry</p>
                    {(() => {
                      const latest = selectedTelemetry[selectedTelemetry.length - 1];
                      return (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-lg bg-secondary/50 p-2">
                            <p className="text-[10px] text-muted-foreground">Temperature</p>
                            <p className="text-sm font-semibold">{latest.temperature.toFixed(1)}°C</p>
                          </div>
                          <div className="rounded-lg bg-secondary/50 p-2">
                            <p className="text-[10px] text-muted-foreground">Humidity</p>
                            <p className="text-sm font-semibold">{latest.humidity?.toFixed(0)}%</p>
                          </div>
                          <div className="rounded-lg bg-secondary/50 p-2">
                            <p className="text-[10px] text-muted-foreground">Battery</p>
                            <p className="text-sm font-semibold">{latest.battery_level?.toFixed(0)}%</p>
                          </div>
                          <div className="rounded-lg bg-secondary/50 p-2">
                            <p className="text-[10px] text-muted-foreground">Speed</p>
                            <p className="text-sm font-semibold">{latest.speed_kmh?.toFixed(0)} km/h</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {selectedPrediction && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                    <div className="flex items-center gap-2">
                      <BrainCircuit className="h-4 w-4 text-primary" />
                      <p className="text-xs font-semibold text-primary">AI Prediction</p>
                    </div>
                    <p className="mt-2 text-xs text-foreground">{selectedPrediction.prediction_text}</p>
                    {selectedPrediction.recommended_action && (
                      <div className="mt-2 rounded-lg bg-card p-2">
                        <p className="text-[10px] text-muted-foreground">Recommended action</p>
                        <p className="text-xs text-foreground">{selectedPrediction.recommended_action}</p>
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Spoilage risk:</span>
                      <span className="font-semibold text-foreground">{selectedPrediction.spoilage_probability.toFixed(0)}%</span>
                      <span className="text-muted-foreground">Confidence:</span>
                      <span className="font-semibold text-foreground">{selectedPrediction.confidence_score.toFixed(0)}%</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => openTracking(selected)}>
                    <Navigation className="h-3.5 w-3.5" /> Track
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => handleGenerateReport(selected)} disabled={reportGenerating}>
                    {reportGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                    Report
                  </Button>
                  {selected.risk_level === 'critical' && (
                    <Button size="sm" variant="destructive" className="flex-1 gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Rescue</Button>
                  )}
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex h-full items-center justify-center p-12">
              <div className="text-center">
                <Package className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <p className="mt-4 text-sm text-muted-foreground">Select a shipment to view details</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Tracking Dialog */}
      <Dialog open={trackingOpen} onOpenChange={(v) => { if (!v) closeTracking(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-primary" />
              Live Tracking — {trackingShipment?.shipment_number}
            </DialogTitle>
            <DialogDescription>
              {trackingShipment?.medicine_name} · {trackingShipment?.origin_city} → {trackingShipment?.destination_city}
            </DialogDescription>
          </DialogHeader>

          {trackingLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Live Map */}
              <div className="h-[300px] overflow-hidden rounded-xl border border-border">
                {trackingTrucks.length > 0 ? (
                  <LeafletMap
                    trucks={trackingTrucks}
                    showRoutes={true}
                    showCities={false}
                    showTrucks={true}
                    showWarehouses={false}
                    selectedTruckId={trackingTrucks[0]?.id || null}
                    onSelectTruck={() => {}}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No live position data available
                  </div>
                )}
              </div>

              {/* Telemetry + ETA */}
              {trackingTrucks[0] && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="rounded-xl border border-border p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Thermometer className="h-3 w-3" /> Temperature</div>
                    <p className="mt-1 text-lg font-bold">{trackingTrucks[0].temperature}°C</p>
                    <p className="text-[10px] text-muted-foreground">Safe: {trackingTrucks[0].safeTempMin}-{trackingTrucks[0].safeTempMax}°C</p>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Zap className="h-3 w-3" /> Speed</div>
                    <p className="mt-1 text-lg font-bold">{trackingTrucks[0].speed} km/h</p>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> ETA</div>
                    <p className="mt-1 text-lg font-bold">{trackingTrucks[0].eta}</p>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Activity className="h-3 w-3" /> Status</div>
                    <div className="mt-1"><StatusBadge status={trackingTrucks[0].status} /></div>
                  </div>
                </div>
              )}

              {/* AI Prediction */}
              {trackingPrediction && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-primary">AI Prediction</p>
                  </div>
                  <p className="mt-2 text-sm text-foreground">{trackingPrediction.prediction_text}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                    <span className="text-muted-foreground">Spoilage: <span className="font-semibold">{Number(trackingPrediction.spoilage_probability).toFixed(0)}%</span></span>
                    <span className="text-muted-foreground">Confidence: <span className="font-semibold">{Number(trackingPrediction.confidence_score).toFixed(0)}%</span></span>
                    {trackingPrediction.estimated_failure_time && (
                      <span className="text-muted-foreground">Est. failure: <span className="font-semibold">{new Date(trackingPrediction.estimated_failure_time).toLocaleString('en-IN')}</span></span>
                    )}
                  </div>
                </div>
              )}

              {/* AI Recommendation */}
              {trackingPrediction?.recommended_action && (
                <div className="rounded-xl border border-accent/20 bg-accent/5 p-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-accent" />
                    <p className="text-sm font-semibold text-accent">AI Recommendation</p>
                  </div>
                  <p className="mt-2 text-sm text-foreground">{trackingPrediction.recommended_action}</p>
                </div>
              )}

              {/* Shipment Timeline */}
              <div>
                <p className="text-sm font-semibold mb-2">Shipment Timeline</p>
                {trackingTimeline.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No timeline events recorded</p>
                ) : (
                  <div className="space-y-2">
                    {trackingTimeline.map((evt, i) => (
                      <div key={evt.id || i} className="flex items-start gap-3 rounded-lg border border-border p-2">
                        <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Activity className="h-3 w-3" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{evt.title || evt.event_type}</p>
                          {evt.description && <p className="text-xs text-muted-foreground">{evt.description}</p>}
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5">{new Date(evt.created_at).toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Alerts */}
              {trackingAlerts.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Recent Alerts</p>
                  <div className="space-y-2">
                    {trackingAlerts.map((a, i) => (
                      <div key={a.id || i} className="flex items-start gap-3 rounded-lg border border-border p-2">
                        <div className={cn(
                          'mt-0.5 flex h-6 w-6 items-center justify-center rounded-full',
                          a.severity === 'critical' ? 'bg-critical/10 text-critical' :
                          a.severity === 'high' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                        )}>
                          <AlertTriangle className="h-3 w-3" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{a.title}</p>
                          {a.message && <p className="text-xs text-muted-foreground">{a.message}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeTracking}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Shipment Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              New Shipment
            </DialogTitle>
            <DialogDescription>Create a new medicine shipment</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Shipment ID (auto-generated)</Label>
                <div className="flex gap-2">
                  <Input value={newShip.shipment_number} readOnly className="bg-muted/50 font-mono text-sm" />
                  <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => setNewShip({ ...newShip, shipment_number: genShipmentId() })}>Regenerate</Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Medicine Name *</Label>
                <Input value={newShip.medicine_name} onChange={(e) => setNewShip({ ...newShip, medicine_name: e.target.value })} placeholder="COVID-19 Vaccine" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Shipment Type</Label>
                <Select value={newShip.medicine_type} onValueChange={(v) => setNewShip({ ...newShip, medicine_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vaccine">Vaccine</SelectItem>
                    <SelectItem value="insulin">Insulin</SelectItem>
                    <SelectItem value="biologics">Biologics</SelectItem>
                    <SelectItem value="blood">Blood Products</SelectItem>
                    <SelectItem value="medicines">Medicines</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Batch Number</Label>
                <Input value={newShip.batch_number} onChange={(e) => setNewShip({ ...newShip, batch_number: e.target.value })} placeholder="BTX-001" />
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={newShip.risk_level} onValueChange={(v) => setNewShip({ ...newShip, risk_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input type="number" value={newShip.quantity} onChange={(e) => setNewShip({ ...newShip, quantity: e.target.value })} placeholder="100" />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Select value={newShip.unit} onValueChange={(v) => setNewShip({ ...newShip, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vials">Vials</SelectItem>
                    <SelectItem value="boxes">Boxes</SelectItem>
                    <SelectItem value="packs">Packs</SelectItem>
                    <SelectItem value="units">Units</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Safe Temp Min (°C)</Label>
                <Input type="number" value={newShip.safe_temp_min} onChange={(e) => setNewShip({ ...newShip, safe_temp_min: e.target.value })} placeholder="2" />
              </div>
              <div className="space-y-1.5">
                <Label>Safe Temp Max (°C)</Label>
                <Input type="number" value={newShip.safe_temp_max} onChange={(e) => setNewShip({ ...newShip, safe_temp_max: e.target.value })} placeholder="8" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Source City</Label>
                <Input value={newShip.origin_city} onChange={(e) => setNewShip({ ...newShip, origin_city: e.target.value })} placeholder="Mumbai" />
              </div>
              <div className="space-y-1.5">
                <Label>Source State</Label>
                <Input value={newShip.origin_state} onChange={(e) => setNewShip({ ...newShip, origin_state: e.target.value })} placeholder="Maharashtra" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Destination City</Label>
                <Input value={newShip.destination_city} onChange={(e) => setNewShip({ ...newShip, destination_city: e.target.value })} placeholder="Delhi" />
              </div>
              <div className="space-y-1.5">
                <Label>Destination State</Label>
                <Input value={newShip.destination_state} onChange={(e) => setNewShip({ ...newShip, destination_state: e.target.value })} placeholder="Delhi" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Driver</Label>
                <Select value={newShip.driver_id} onValueChange={(v) => setNewShip({ ...newShip, driver_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                  <SelectContent>
                    {drivers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Vehicle</Label>
                <Select value={newShip.vehicle_id} onValueChange={(v) => setNewShip({ ...newShip, vehicle_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.registration_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Departure Time</Label>
                <Input type="datetime-local" value={newShip.dispatched_at} onChange={(e) => setNewShip({ ...newShip, dispatched_at: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Expected Arrival</Label>
                <Input type="datetime-local" value={newShip.eta} onChange={(e) => setNewShip({ ...newShip, eta: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={newShip.notes} onChange={(e) => setNewShip({ ...newShip, notes: e.target.value })} placeholder="Additional notes..." rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddShipment} disabled={saving} className="gradient-primary text-white gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
              {saving ? 'Creating...' : 'Create Shipment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
