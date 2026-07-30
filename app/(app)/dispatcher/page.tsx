'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { PageHeader, StatusBadge, EmptyState } from '@/components/ui/page-components';
import { KPICard } from '@/components/ui/kpi-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Users, Package, AlertTriangle, CheckCircle2, Siren, Truck,
  Navigation, MapPin, Clock, Star, Activity, Zap, Loader2, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { TruckState } from '@/lib/map-data';

const LeafletMap = dynamic(
  () => import('@/components/map/leaflet-map').then(m => m.default),
  { ssr: false, loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-secondary/30">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading live map...</p>
      </div>
    </div>
  )}
);

interface Driver {
  id: string;
  name: string;
  status: string;
  city: string | null;
  rating: number;
  phone: string | null;
}

interface Shipment {
  id: string;
  shipment_number: string;
  medicine_name: string;
  status: string;
  origin_city: string | null;
  destination_city: string | null;
  risk_level: string | null;
  driver_id: string | null;
  vehicle_id: string | null;
  eta: string | null;
  safe_temp_min: number | null;
  safe_temp_max: number | null;
}

interface Vehicle {
  id: string;
  registration_number: string;
  status: string;
}

interface TruckPositionRow {
  id: string;
  shipment_id: string;
  driver_id: string | null;
  vehicle_id: string | null;
  lat: number;
  lng: number;
  destination_lat: number;
  destination_lng: number;
  destination_name: string;
  route_waypoints: any;
  speed_kmh: number;
  eta_minutes: number;
  distance_remaining_km: number;
  traffic_status: string;
  is_rerouted: boolean;
  progress: number;
  updated_at: string;
}

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

function formatETA(eta: string | null): string {
  if (!eta) return 'N/A';
  try {
    const date = new Date(eta);
    const now = new Date();
    const diffMin = Math.round((date.getTime() - now.getTime()) / 60000);
    if (diffMin < 0) return 'Delayed';
    if (diffMin < 60) return `${diffMin}m`;
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return `${h}h ${m}m`;
  } catch {
    return 'N/A';
  }
}

export default function DispatcherDashboard() {
  const { profile } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [truckPositions, setTruckPositions] = useState<TruckPositionRow[]>([]);
  const [dbTrucks, setDbTrucks] = useState<TruckState[]>([]);
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningShipment, setAssigningShipment] = useState<Shipment | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [assigning, setAssigning] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);

  // Load shipments, drivers, vehicles
  const loadDashboardData = useCallback(async () => {
    try {
      const [shipRes, driverRes, vehicleRes, alertRes] = await Promise.all([
        supabase.from('shipments').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('drivers').select('id, name, status, city, rating, phone').order('name'),
        supabase.from('vehicles').select('id, registration_number, status').order('registration_number'),
        supabase.from('alerts').select('*').order('created_at', { ascending: false }).limit(5),
      ]);

      if (shipRes.data) setShipments(shipRes.data as Shipment[]);
      if (driverRes.data) setDrivers(driverRes.data as Driver[]);
      if (vehicleRes.data) setVehicles(vehicleRes.data as Vehicle[]);
      if (alertRes.data) setRecentAlerts(alertRes.data);
    } catch (err) {
      // silently fail - dashboard still shows with empty data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();

    // Realtime subscriptions for shipments and alerts
    const sub = supabase
      .channel('dispatcher-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments' }, () => loadDashboardData())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, (payload) => {
        setRecentAlerts(prev => [payload.new, ...prev].slice(0, 5));
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [loadDashboardData]);

  // Fetch truck positions every 3 seconds
  useEffect(() => {
    async function fetchTruckPositions() {
      try {
        const { data, error } = await supabase
          .from('truck_positions')
          .select('*')
          .order('updated_at', { ascending: false });

        if (error) throw error;
        if (!data || data.length === 0) {
          setTruckPositions([]);
          return;
        }

        setTruckPositions(data as TruckPositionRow[]);
      } catch {
        setTruckPositions([]);
      }
    }

    fetchTruckPositions();
    const interval = setInterval(fetchTruckPositions, 3000);

    const sub = supabase
      .channel('dispatcher-truck-positions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'truck_positions' }, () => fetchTruckPositions())
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(sub);
    };
  }, []);

  // Convert DB truck positions + shipments into TruckState for LeafletMap
  useEffect(() => {
    if (truckPositions.length === 0) {
      setDbTrucks([]);
      return;
    }

    const trucks: TruckState[] = truckPositions.map((tp) => {
      const shipment = shipments.find(s => s.id === tp.shipment_id);
      const driver = drivers.find(d => d.id === tp.driver_id);
      const vehicle = vehicles.find(v => v.id === tp.vehicle_id);

      const shipmentId = shipment?.shipment_number || tp.shipment_id.substring(0, 8);
      const vehicleNumber = vehicle?.registration_number || 'N/A';
      const driverName = driver?.name || 'Unassigned';

      const originCity = shipment?.origin_city || 'Unknown';
      const destCity = shipment?.destination_city || tp.destination_name || 'Unknown';

      const safeMin = shipment?.safe_temp_min ? Number(shipment.safe_temp_min) : 2;
      const safeMax = shipment?.safe_temp_max ? Number(shipment.safe_temp_max) : 8;
      const temp = safeMin + (safeMax - safeMin) / 2 + (Math.random() - 0.5) * 1.5;
      const status = calcStatus(temp, safeMin, safeMax);

      const position: [number, number] = [Number(tp.lat), Number(tp.lng)];
      const destPos: [number, number] = [Number(tp.destination_lat), Number(tp.destination_lng)];

      let routeProgress: [number, number][] = [position, destPos];
      try {
        if (tp.route_waypoints && Array.isArray(tp.route_waypoints) && tp.route_waypoints.length >= 2) {
          routeProgress = tp.route_waypoints as [number, number][];
        }
      } catch {
        // keep default
      }

      const etaStr = tp.eta_minutes > 0
        ? `${Math.floor(tp.eta_minutes / 60)}h ${tp.eta_minutes % 60}m`
        : formatETA(shipment?.eta || null);

      return {
        id: tp.id,
        shipmentId,
        vehicleNumber,
        driverName,
        routeId: `db-${tp.shipment_id.substring(0, 8)}`,
        fromCity: originCity,
        toCity: destCity,
        position,
        speed: tp.speed_kmh,
        temperature: Math.round(temp * 10) / 10,
        safeTempMin: safeMin,
        safeTempMax: safeMax,
        eta: etaStr,
        status,
        progress: Number(tp.progress),
        routeProgress,
        rerouted: tp.is_rerouted,
      } as TruckState;
    });

    setDbTrucks(trucks);
  }, [truckPositions, shipments, drivers, vehicles]);

  // Stats
  const stats = {
    active: shipments.filter(s => s.status === 'in_transit').length,
    delayed: shipments.filter(s => s.status === 'delayed' || s.status === 'pending').length,
    completed: shipments.filter(s => s.status === 'delivered').length,
    emergency: shipments.filter(s => s.status === 'emergency').length,
  };

  const activeDrivers = drivers.filter(d => d.status === 'on_duty' || d.status === 'emergency').length;
  const availableDrivers = drivers.filter(d => d.status === 'available').length;

  // Pending shipments for assignment
  const pendingShipments = shipments.filter(s =>
    s.status === 'pending' || s.status === 'packed' || s.status === 'assigned'
  );

  // In-transit shipments for reassignment
  const inTransitShipments = shipments.filter(s =>
    s.status === 'in_transit' || s.status === 'dispatched'
  );

  function openAssignDialog(shipment: Shipment) {
    setAssigningShipment(shipment);
    setSelectedDriverId('');
    setAssignDialogOpen(true);
  }

  async function handleAssign() {
    if (!assigningShipment || !selectedDriverId) {
      toast.error('Please select a driver');
      return;
    }

    setAssigning(true);
    try {
      const shipment = assigningShipment;
      const isReassign = shipment.driver_id !== null;
      const previousDriverId = shipment.driver_id;

      // Find an available vehicle for this driver
      const availableVehicle = vehicles.find(v => v.status === 'available');
      const vehicleId = availableVehicle?.id || null;

      // Update shipment
      const { error: shipError } = await supabase
        .from('shipments')
        .update({
          driver_id: selectedDriverId,
          vehicle_id: vehicleId,
          status: 'assigned',
          dispatched_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', shipment.id);

      if (shipError) throw shipError;

      // Update driver status
      const { error: driverError } = await supabase
        .from('drivers')
        .update({ status: 'on_duty' })
        .eq('id', selectedDriverId);

      if (driverError) throw driverError;

      // Update vehicle status if assigned
      if (vehicleId) {
        await supabase.from('vehicles').update({ status: 'in_use' }).eq('id', vehicleId);
      }

      // If reassigning, free the previous driver
      if (isReassign && previousDriverId) {
        await supabase.from('drivers').update({ status: 'available' }).eq('id', previousDriverId);
      }

      // Save assignment history
      await supabase.from('assignment_history').insert({
        shipment_id: shipment.id,
        driver_id: selectedDriverId,
        vehicle_id: vehicleId,
        action: isReassign ? 'reassigned' : 'assigned',
        previous_driver_id: previousDriverId,
        assigned_by: profile?.id || null,
        notes: isReassign ? `Reassigned from previous driver to ${drivers.find(d => d.id === selectedDriverId)?.name}` : `Assigned to ${drivers.find(d => d.id === selectedDriverId)?.name}`,
      });

      // Create timeline event
      await supabase.from('shipment_timeline').insert({
        shipment_id: shipment.id,
        event_type: isReassign ? 'reassigned' : 'assigned',
        title: isReassign ? 'Shipment Reassigned' : 'Shipment Assigned',
        description: `${isReassign ? 'Reassigned' : 'Assigned'} to ${drivers.find(d => d.id === selectedDriverId)?.name || 'driver'}`,
        created_by: profile?.id || null,
      });

      // Create alert notification
      await supabase.from('alerts').insert({
        shipment_id: shipment.id,
        category: 'information',
        alert_type: isReassign ? 'shipment_reassigned' : 'shipment_assigned',
        severity: 'low',
        title: `${isReassign ? 'Shipment Reassigned' : 'Shipment Assigned'}: ${shipment.shipment_number}`,
        message: `${shipment.shipment_number} (${shipment.medicine_name}) has been ${isReassign ? 'reassigned' : 'assigned'} to ${drivers.find(d => d.id === selectedDriverId)?.name || 'a driver'}.`,
        is_read: false,
        is_resolved: false,
        driver_id: selectedDriverId,
        vehicle_id: vehicleId,
      });

      // Create or update truck position
      const originCoords = CITY_COORDS[shipment.origin_city || ''] || [22.5, 80.0];
      const destCoords = CITY_COORDS[shipment.destination_city || ''] || [22.5, 80.0];

      const { data: existingPos } = await supabase
        .from('truck_positions')
        .select('id')
        .eq('shipment_id', shipment.id)
        .maybeSingle();

      if (existingPos) {
        await supabase.from('truck_positions')
          .update({
            driver_id: selectedDriverId,
            vehicle_id: vehicleId,
            lat: originCoords[0],
            lng: originCoords[1],
            destination_lat: destCoords[0],
            destination_lng: destCoords[1],
            destination_name: shipment.destination_city || 'Unknown',
            speed_kmh: 55,
            eta_minutes: 180,
            progress: 0.05,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingPos.id);
      } else {
        await supabase.from('truck_positions').insert({
          shipment_id: shipment.id,
          driver_id: selectedDriverId,
          vehicle_id: vehicleId,
          lat: originCoords[0],
          lng: originCoords[1],
          destination_lat: destCoords[0],
          destination_lng: destCoords[1],
          destination_name: shipment.destination_city || 'Unknown',
          route_waypoints: JSON.stringify([originCoords, destCoords]),
          speed_kmh: 55,
          eta_minutes: 180,
          distance_remaining_km: 200,
          traffic_status: 'clear',
          progress: 0.05,
        });
      }

      toast.success(`${isReassign ? 'Shipment reassigned' : 'Shipment assigned'} successfully`);
      setAssignDialogOpen(false);
      setAssigningShipment(null);
      setSelectedDriverId('');

      // Refresh dashboard immediately
      await loadDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign shipment');
    } finally {
      setAssigning(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dispatcher Dashboard" description="Loading..." icon={Navigation} />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dispatcher Dashboard"
        description="Monitor and manage all active shipments"
        icon={Navigation}
        action={
          <Badge variant="outline" className="gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> Live
          </Badge>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KPICard label="Active Drivers" value={activeDrivers} icon={Users} variant="primary" />
        <KPICard label="Available Drivers" value={availableDrivers} icon={CheckCircle2} variant="success" />
        <KPICard label="Active Shipments" value={stats.active} icon={Package} variant="accent" />
        <KPICard label="Delayed" value={stats.delayed} icon={Clock} variant="warning" />
        <KPICard label="Emergency" value={stats.emergency} icon={Siren} variant="critical" />
        <KPICard label="Completed Today" value={stats.completed} icon={CheckCircle2} variant="success" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Live Delivery Map</CardTitle>
            <p className="text-xs text-muted-foreground">Real-time shipment truck locations (updates every 3s)</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative h-[350px]">
              {dbTrucks.length > 0 ? (
                <LeafletMap
                  trucks={dbTrucks}
                  showRoutes={true}
                  showCities={true}
                  showTrucks={true}
                  showWarehouses={false}
                  selectedTruckId={selectedTruckId}
                  onSelectTruck={setSelectedTruckId}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-secondary/30">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Truck className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No active truck positions</p>
                    <p className="text-xs text-muted-foreground/70">Truck locations will appear when shipments are assigned</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Driver Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[350px] overflow-y-auto">
            {drivers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No drivers found</p>
            ) : drivers.map((d) => (
              <div key={d.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="gradient-primary text-xs font-bold text-white">
                    {d.name.split(' ').map((n) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{d.city || 'No city'}</p>
                </div>
                <StatusBadge status={d.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Truck telemetry cards for active shipments */}
      {dbTrucks.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {dbTrucks.slice(0, 4).map((truck) => (
            <Card key={truck.id} className={cn(
              'border-l-4',
              truck.status === 'critical' ? 'border-l-critical' :
              truck.status === 'warning' ? 'border-l-warning' : 'border-l-success'
            )}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">{truck.shipmentId}</p>
                  <Badge variant="outline" className={cn(
                    'text-xs capitalize',
                    truck.status === 'critical' ? 'bg-critical/10 text-critical' :
                    truck.status === 'warning' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                  )}>
                    {truck.status}
                  </Badge>
                </div>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <p className="flex items-center gap-1.5"><Truck className="h-3 w-3" /> {truck.vehicleNumber} · {truck.driverName}</p>
                  <p className="flex items-center gap-1.5"><Navigation className="h-3 w-3" /> {truck.fromCity} → {truck.toCity}</p>
                  <p className="flex items-center gap-1.5"><Zap className="h-3 w-3" /> {truck.speed} km/h · ETA {truck.eta}</p>
                  <p className="flex items-center gap-1.5">
                    <Activity className="h-3 w-3" /> {truck.temperature}°C (Safe: {truck.safeTempMin}-{truck.safeTempMax}°C)
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shipment Assignment</CardTitle>
          <p className="text-xs text-muted-foreground">Assign drivers to pending shipments and reassign active ones</p>
        </CardHeader>
        <CardContent className="p-0">
          {pendingShipments.length === 0 && inTransitShipments.length === 0 ? (
            <EmptyState icon={Package} title="No shipments to assign" description="All shipments have been assigned to drivers." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shipment</TableHead>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingShipments.map((s) => {
                  const driver = drivers.find(d => d.id === s.driver_id);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.shipment_number}</TableCell>
                      <TableCell>{s.medicine_name}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-xs">
                          <MapPin className="h-3 w-3 text-muted-foreground" /> {s.origin_city || 'N/A'} → {s.destination_city || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell><StatusBadge status={s.risk_level || 'low'} /></TableCell>
                      <TableCell className="text-muted-foreground">{driver?.name || 'Unassigned'}</TableCell>
                      <TableCell><StatusBadge status={s.status} /></TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => openAssignDialog(s)}>Assign</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {inTransitShipments.slice(0, 5).map((s) => {
                  const driver = drivers.find(d => d.id === s.driver_id);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.shipment_number}</TableCell>
                      <TableCell>{s.medicine_name}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-xs">
                          <MapPin className="h-3 w-3 text-muted-foreground" /> {s.origin_city || 'N/A'} → {s.destination_city || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell><StatusBadge status={s.risk_level || 'low'} /></TableCell>
                      <TableCell>{driver?.name || 'Unassigned'}</TableCell>
                      <TableCell><StatusBadge status={s.status} /></TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => openAssignDialog(s)}>Reassign</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Recent Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No recent notifications</p>
            ) : recentAlerts.map((n, i) => {
              const isCritical = n.severity === 'critical' || n.severity === 'high';
              const isWarning = n.severity === 'warning' || n.severity === 'medium';
              return (
                <div key={n.id || i} className="flex items-start gap-3 rounded-xl border border-border p-3">
                  <div className={cn(
                    'mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg',
                    isCritical ? 'bg-critical/10 text-critical' :
                    isWarning ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                  )}>
                    <Zap className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{n.title || n.alert_type || 'Alert'}</p>
                    <p className="text-xs text-muted-foreground">{n.message || ''}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground/70">
                      {n.created_at ? new Date(n.created_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4 text-warning" /> Driver Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {drivers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No drivers found</p>
            ) : (
              [...drivers]
                .sort((a, b) => Number(b.rating) - Number(a.rating))
                .slice(0, 5)
                .map((d) => (
                  <div key={d.id} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="gradient-primary text-[10px] font-bold text-white">
                        {d.name.split(' ').map((n) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{d.name}</p>
                      <div className="mt-1 flex items-center gap-1">
                        <Star className="h-3 w-3 fill-warning text-warning" />
                        <span className="text-xs font-semibold">{Number(d.rating).toFixed(1)}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">{d.status.replace('_', ' ')}</Badge>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assignment Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {assigningShipment?.driver_id ? 'Reassign Shipment' : 'Assign Shipment'}
            </DialogTitle>
            <DialogDescription>
              {assigningShipment?.shipment_number} — {assigningShipment?.medicine_name}
              {' '}({assigningShipment?.origin_city} → {assigningShipment?.destination_city})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-sm font-medium">Select a driver:</p>
            <div className="max-h-[300px] space-y-2 overflow-y-auto">
              {drivers.filter(d => d.status === 'available' || d.id === assigningShipment?.driver_id).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No available drivers. All drivers are currently on duty.
                </p>
              ) : (
                drivers
                  .filter(d => d.status === 'available' || d.id === assigningShipment?.driver_id)
                  .map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDriverId(d.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors',
                        selectedDriverId === d.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                      )}
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="gradient-primary text-xs font-bold text-white">
                          {d.name.split(' ').map((n) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.city || 'No city'} · {d.phone || 'No phone'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="h-3 w-3 fill-warning text-warning" />
                        <span className="text-xs font-semibold">{Number(d.rating).toFixed(1)}</span>
                      </div>
                      {d.id === assigningShipment?.driver_id && (
                        <Badge variant="outline" className="text-xs">Current</Badge>
                      )}
                    </button>
                  ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)} disabled={assigning}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={assigning || !selectedDriverId}
              className="gradient-primary text-white gap-2"
            >
              {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {assigning ? 'Assigning...' : assigningShipment?.driver_id ? 'Reassign' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
