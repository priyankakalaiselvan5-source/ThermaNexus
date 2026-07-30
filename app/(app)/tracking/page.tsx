'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PageHeader, StatusBadge } from '@/components/ui/page-components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Navigation, Thermometer, Droplets, Gauge, Battery, DoorClosed, DoorOpen,
  Signal, MapPin, Clock, Truck, RefreshCw, Activity, Eye, User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTemp, timeAgo } from '@/lib/format';
import type { Shipment, Telemetry } from '@/types';

export default function TrackingPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [telemetryMap, setTelemetryMap] = useState<Record<string, Telemetry[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    async function load() {
      const [shipRes, teleRes] = await Promise.all([
        supabase.from('shipments').select('*').eq('status', 'in_transit').order('created_at', { ascending: false }),
        supabase.from('shipment_telemetry').select('*').order('recorded_at', { ascending: true }),
      ]);
      if (shipRes.data) {
        setShipments(shipRes.data);
        if (shipRes.data.length > 0) setSelectedId(prev => prev ?? shipRes.data[0].id);
      }
      if (teleRes.data) {
        const byShip: Record<string, Telemetry[]> = {};
        teleRes.data.forEach((t: Telemetry) => {
          if (!byShip[t.shipment_id]) byShip[t.shipment_id] = [];
          byShip[t.shipment_id].push(t);
        });
        setTelemetryMap(byShip);
      }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(async () => {
      const { data } = await supabase.from('shipment_telemetry').select('*').order('recorded_at', { ascending: true });
      if (data) {
        const byShip: Record<string, Telemetry[]> = {};
        data.forEach((t: Telemetry) => {
          if (!byShip[t.shipment_id]) byShip[t.shipment_id] = [];
          byShip[t.shipment_id].push(t);
        });
        setTelemetryMap(byShip);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const selected = shipments.find(s => s.id === selectedId);
  const selectedTelemetry = selectedId ? telemetryMap[selectedId] || [] : [];
  const latest = selectedTelemetry[selectedTelemetry.length - 1];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Tracking"
        description="Real-time vehicle and sensor monitoring"
        icon={Navigation}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="gap-2"
            >
              <RefreshCw className={cn('h-4 w-4', autoRefresh && 'animate-spin')} />
              {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Active Vehicles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : shipments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active shipments</p>
            ) : (
              shipments.map((s) => {
                const tele = telemetryMap[s.id] || [];
                const last = tele[tele.length - 1];
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={cn(
                      'w-full rounded-xl border p-3 text-left transition-all',
                      selectedId === s.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">{s.shipment_number}</p>
                      <StatusBadge status={s.risk_level} />
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{s.medicine_name}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs">
                      {last && (
                        <>
                          <span className="flex items-center gap-1">
                            <Thermometer className="h-3 w-3 text-muted-foreground" />
                            {last.temperature.toFixed(1)}°C
                          </span>
                          <span className="flex items-center gap-1">
                            <Battery className="h-3 w-3 text-muted-foreground" />
                            {last.battery_level?.toFixed(0)}%
                          </span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-4">
          {selected && latest ? (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  { icon: Thermometer, label: 'Temperature', value: `${latest.temperature.toFixed(1)}°C`, status: latest.temperature > selected.safe_temp_max ? 'critical' : 'success' },
                  { icon: Droplets, label: 'Humidity', value: `${latest.humidity?.toFixed(0)}%`, status: 'default' },
                  { icon: Gauge, label: 'Pressure', value: `${latest.pressure?.toFixed(0)} hPa`, status: 'default' },
                  { icon: Battery, label: 'Battery', value: `${latest.battery_level?.toFixed(0) ?? '—'}%`, status: (latest.battery_level ?? 100) < 50 ? 'warning' : 'success' },
                  { icon: Navigation, label: 'Speed', value: `${latest.speed_kmh?.toFixed(0)} km/h`, status: 'default' },
                  { icon: latest.door_status === 'closed' ? DoorClosed : DoorOpen, label: 'Door', value: latest.door_status, status: latest.door_status === 'open' ? 'warning' : 'success' },
                  { icon: Signal, label: 'GPS Signal', value: latest.gps_signal_strength, status: latest.gps_signal_strength === 'weak' ? 'warning' : 'success' },
                  { icon: Clock, label: 'Safe Time Left', value: selected.remaining_safe_hours ? `${selected.remaining_safe_hours}h` : '—', status: 'default' },
                ].map((m, i) => (
                  <Card key={i} className={cn(
                    m.status === 'critical' ? 'border-critical/30' :
                    m.status === 'warning' ? 'border-warning/30' :
                    m.status === 'success' ? 'border-success/30' : ''
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <m.icon className={cn(
                          'h-5 w-5',
                          m.status === 'critical' ? 'text-critical' :
                          m.status === 'warning' ? 'text-warning' :
                          m.status === 'success' ? 'text-success' : 'text-muted-foreground'
                        )} />
                        {m.status === 'critical' && <span className="h-2 w-2 animate-pulse rounded-full bg-critical" />}
                      </div>
                      <p className="mt-2 text-lg font-bold text-foreground">{m.value}</p>
                      <p className="text-xs text-muted-foreground capitalize">{m.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">GPS Location</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-xl bg-secondary/50 p-6 text-center">
                      <MapPin className="mx-auto h-8 w-8 text-primary" />
                      <p className="mt-3 text-lg font-bold text-foreground">
                        {latest.gps_latitude?.toFixed(4)}, {latest.gps_longitude?.toFixed(4)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {selected.origin_city} → {selected.destination_city}
                      </p>
                      <Badge variant="outline" className="mt-3 gap-1.5">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> Live
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Shipment Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Shipment</span>
                      <span className="text-sm font-medium">{selected.shipment_number}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Medicine</span>
                      <span className="text-sm font-medium">{selected.medicine_name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Safe Range</span>
                      <span className="text-sm font-medium">{selected.safe_temp_min}° - {selected.safe_temp_max}°C</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Quantity</span>
                      <span className="text-sm font-medium">{selected.quantity} {selected.unit}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Risk Level</span>
                      <StatusBadge status={selected.risk_level} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Last Update</span>
                      <span className="text-sm font-medium">{timeAgo(latest.recorded_at)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cooling System Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-border p-4">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" />
                        <span className="text-xs text-muted-foreground">System Status</span>
                      </div>
                      <p className={cn(
                        'mt-2 text-sm font-bold capitalize',
                        latest.cooling_system_status === 'active' ? 'text-success' :
                        latest.cooling_system_status === 'degraded' ? 'text-warning' : 'text-critical'
                      )}>
                        {latest.cooling_system_status}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border p-4">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Vehicle</span>
                      </div>
                      <p className="mt-2 text-sm font-bold">In Transit</p>
                    </div>
                    <div className="rounded-xl border border-border p-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Driver</span>
                      </div>
                      <p className="mt-2 text-sm font-bold">Assigned</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex h-full min-h-[400px] items-center justify-center">
                <div className="text-center">
                  <Navigation className="mx-auto h-12 w-12 text-muted-foreground/30" />
                  <p className="mt-4 text-sm text-muted-foreground">
                    {loading ? 'Loading...' : 'Select a vehicle to view live tracking'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
