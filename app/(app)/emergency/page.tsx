'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { PageHeader, StatusBadge } from '@/components/ui/page-components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import {
  Siren, AlertTriangle, Thermometer, Battery, Wrench, Activity,
  MapPin, Building2, Snowflake, Truck, User, Phone, Navigation,
  Clock, CheckCircle2, Zap, ShieldAlert, Radio, Stethoscope, X,
  WifiOff, FlameKindling,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { timeAgo } from '@/lib/format';
import { toast } from 'sonner';
import type { EmergencyEvent, Shipment, ColdStorageFacility, Hospital, Driver } from '@/types';

export default function EmergencyPage() {
  const [emergencies, setEmergencies] = useState<EmergencyEvent[]>([]);
  const [shipments, setShipments] = useState<Record<string, Shipment>>({});
  const [coldStorage, setColdStorage] = useState<ColdStorageFacility[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EmergencyEvent | null>(null);
  const [sosActive, setSosActive] = useState(false);
  const [sosPopup, setSosPopup] = useState(false);
  const [sosShipmentId, setSosShipmentId] = useState<string | null>(null);
  const [timelineOverride, setTimelineOverride] = useState<null | { triggeredAt: string }>(null);
  const flashRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const [e, s, c, h, d] = await Promise.all([
        supabase.from('emergency_events').select('*').order('detected_at', { ascending: false }),
        supabase.from('shipments').select('*'),
        supabase.from('cold_storage_facilities').select('*').limit(3),
        supabase.from('hospitals').select('*').limit(3),
        supabase.from('drivers').select('*').eq('status', 'available').limit(3),
      ]);
      if (e.data) {
        setEmergencies(e.data);
        if (e.data.length > 0) setSelected(e.data[0]);
      }
      if (s.data) {
        const map: Record<string, Shipment> = {};
        s.data.forEach((ship: Shipment) => (map[ship.id] = ship));
        setShipments(map);
      }
      if (c.data) setColdStorage(c.data);
      if (h.data) setHospitals(h.data);
      if (d.data) setDrivers(d.data);
      setLoading(false);
    }
    load();
  }, []);

  const stats = {
    active: emergencies.filter(e => e.status === 'active' || e.status === 'responding').length,
    responding: emergencies.filter(e => e.status === 'responding').length,
    resolved: emergencies.filter(e => e.status === 'resolved').length,
    critical: emergencies.filter(e => e.severity === 'critical').length,
  };

  const selectedShipment = selected ? shipments[selected.shipment_id || ''] : undefined;

  function triggerSOS() {
    const shipIds = Object.keys(shipments);
    const targetId = shipIds[0] || null;
    setSosShipmentId(targetId);
    setSosActive(true);
    setSosPopup(true);
    setTimelineOverride({ triggeredAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) });
    toast.error('SOS TRIGGERED — Emergency protocol activated!', { duration: 6000 });

    if (targetId && shipments[targetId]) {
      const ship = shipments[targetId];
      toast.warning(`Nearest hospital notified: ${hospitals[0]?.name || 'AIIMS Delhi'}`, { duration: 4000 });
      toast.info(`Cold storage reserved: ${coldStorage[0]?.name || 'Delhi Ultra Cold Bank'}`, { duration: 4000 });
    }
  }

  function dismissSOS() {
    setSosActive(false);
    setSosPopup(false);
  }

  const tlTime = timelineOverride?.triggeredAt || '';
  const isSosShipment = (e: EmergencyEvent) => sosActive && e.shipment_id === sosShipmentId;

  return (
    <div className="space-y-6">
      {/* Flashing SOS Banner */}
      {sosActive && (
        <div
          ref={flashRef}
          className="relative overflow-hidden rounded-2xl border-2 border-critical bg-critical/10 p-4 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-critical/20">
                <Siren className="h-6 w-6 text-critical animate-bounce" />
              </div>
              <div>
                <p className="text-base font-bold text-critical">EMERGENCY SOS ACTIVATED</p>
                <p className="text-xs text-critical/80">All rescue protocols initiated · Nearest hospital & cold storage notified</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={dismissSOS} className="text-critical hover:bg-critical/10">
              <X className="h-4 w-4" /> Dismiss
            </Button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg bg-critical/10 px-3 py-2 text-center text-critical font-medium">Hospital Notified</div>
            <div className="rounded-lg bg-critical/10 px-3 py-2 text-center text-critical font-medium">Cold Storage Reserved</div>
            <div className="rounded-lg bg-critical/10 px-3 py-2 text-center text-critical font-medium">Alternate Route Generated</div>
          </div>
        </div>
      )}

      <PageHeader
        title="Emergency Rescue Center"
        description="Automated SOS workflows and rescue coordination"
        icon={Siren}
        action={
          <Button
            variant="destructive"
            size="sm"
            className={cn('gap-2', sosActive && 'animate-pulse ring-2 ring-critical ring-offset-2')}
            onClick={triggerSOS}
          >
            <Siren className="h-4 w-4" /> {sosActive ? 'SOS ACTIVE' : 'Trigger SOS'}
          </Button>
        }
      />

      {/* SOS Popup Modal */}
      {sosPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-md animate-fade-in rounded-2xl border-2 border-critical bg-card p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-critical/10 animate-pulse">
                <Siren className="h-7 w-7 text-critical" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-critical">SOS Emergency Alert</h3>
                <p className="text-xs text-muted-foreground">All rescue protocols activated</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2 rounded-xl bg-critical/5 border border-critical/20 p-3">
                <AlertTriangle className="h-4 w-4 text-critical mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-critical">Critical Alert Generated</p>
                  <p className="text-xs text-muted-foreground">Shipment highlighted in red across all dashboards</p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-xl bg-muted/50 p-3">
                <Stethoscope className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Nearest Hospital</p>
                  <p className="text-xs text-muted-foreground">{hospitals[0]?.name || 'AIIMS Delhi'} · {hospitals[0]?.city || 'Delhi'} · 12 km away</p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-xl bg-muted/50 p-3">
                <Snowflake className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Nearest Cold Storage</p>
                  <p className="text-xs text-muted-foreground">{coldStorage[0]?.name || 'Delhi Ultra Cold Bank'} · 18 km · Space reserved</p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-xl bg-primary/5 border border-primary/20 p-3">
                <Navigation className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-primary">Alternate Route Generated</p>
                  <p className="text-xs text-muted-foreground">NH44 via Mathura Bypass — ETA 1h 48min (57min faster)</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button className="flex-1 gradient-primary text-white" onClick={dismissSOS}>
                Acknowledge & Close
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="border-critical/20 bg-critical/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-critical/10">
                <ShieldAlert className="h-4 w-4 text-critical" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  <AnimatedCounter value={stats.active + (sosActive ? 1 : 0)} />
                </p>
                <p className="text-xs text-muted-foreground">Active emergencies</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-warning/20 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10">
                <Radio className="h-4 w-4 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  <AnimatedCounter value={stats.responding} />
                </p>
                <p className="text-xs text-muted-foreground">Responding</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-success/20 bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10">
                <CheckCircle2 className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  <AnimatedCounter value={stats.resolved} />
                </p>
                <p className="text-xs text-muted-foreground">Resolved today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-critical/20 bg-critical/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-critical/10">
                <AlertTriangle className="h-4 w-4 text-critical" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  <AnimatedCounter value={stats.critical + (sosActive ? 1 : 0)} />
                </p>
                <p className="text-xs text-muted-foreground">Critical priority</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Emergency Cases</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : emergencies.length === 0 && !sosActive ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No emergencies</p>
            ) : (
              <>
                {sosActive && (
                  <button
                    onClick={() => setSelected(null)}
                    className="w-full rounded-xl border-2 border-critical bg-critical/5 p-3 text-left animate-pulse"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-critical">SOS TRIGGERED</span>
                      <Badge variant="destructive" className="text-[10px]">CRITICAL</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Manual SOS — rescue protocol active</p>
                    <div className="mt-2 text-[10px] text-muted-foreground">Just now</div>
                  </button>
                )}
                {emergencies.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setSelected(e)}
                    className={cn(
                      'w-full rounded-xl border p-3 text-left transition-all',
                      isSosShipment(e) ? 'border-critical bg-critical/10 ring-2 ring-critical' : selected?.id === e.id ? 'border-critical bg-critical/5' : 'border-border hover:bg-muted/30'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold capitalize text-foreground">
                        {e.event_type.replace(/_/g, ' ')}
                        {isSosShipment(e) && <span className="ml-2 text-critical font-bold">[SOS]</span>}
                      </span>
                      <StatusBadge status={e.severity} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{e.description}</p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {timeAgo(e.detected_at)}</span>
                      <StatusBadge status={e.status} />
                    </div>
                  </button>
                ))}
              </>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          {selected ? (
            <>
              <Card className={cn(
                'border-2',
                isSosShipment(selected) ? 'border-critical' : selected.severity === 'critical' ? 'border-critical/30' : 'border-warning/30'
              )}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Siren className={cn(
                          'h-5 w-5',
                          isSosShipment(selected) ? 'text-critical animate-bounce' : selected.severity === 'critical' ? 'text-critical' : 'text-warning'
                        )} />
                        Emergency Rescue Protocol
                        {isSosShipment(selected) && <Badge variant="destructive" className="ml-2 animate-pulse">SOS ACTIVE</Badge>}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">Detected {timeAgo(selected.detected_at)}</p>
                    </div>
                    <StatusBadge status={selected.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl bg-secondary/50 p-3">
                    <p className="text-xs font-semibold text-muted-foreground">Description</p>
                    <p className="mt-1 text-sm text-foreground">{selected.description}</p>
                  </div>

                  {selectedShipment && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className={cn('rounded-xl border p-3', isSosShipment(selected) && 'border-critical/30 bg-critical/5')}>
                        <p className="text-xs text-muted-foreground">Shipment</p>
                        <p className="mt-1 text-sm font-semibold">{selectedShipment.shipment_number}</p>
                        <p className="text-xs text-muted-foreground">{selectedShipment.medicine_name}</p>
                      </div>
                      <div className="rounded-xl border border-border p-3">
                        <p className="text-xs text-muted-foreground">Route</p>
                        <p className="mt-1 text-sm font-semibold">
                          {selectedShipment.origin_city} → {selectedShipment.destination_city}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border p-3">
                        <p className="text-xs text-muted-foreground">Safe Temperature</p>
                        <p className="mt-1 text-sm font-semibold">
                          {selectedShipment.safe_temp_min}° - {selectedShipment.safe_temp_max}°C
                        </p>
                      </div>
                      <div className="rounded-xl border border-border p-3">
                        <p className="text-xs text-muted-foreground">Remaining Safe Time</p>
                        <p className="mt-1 text-sm font-semibold text-warning">
                          {selectedShipment.remaining_safe_hours?.toFixed(0)} hours
                        </p>
                      </div>
                    </div>
                  )}

                  {selected.response_notes && (
                    <div className="rounded-xl bg-primary/5 p-3">
                      <p className="text-xs font-semibold text-primary">Response Notes</p>
                      <p className="mt-1 text-xs text-foreground">{selected.response_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Navigation className="h-4 w-4 text-primary" /> Rescue Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
                      <div className="flex items-center gap-2">
                        <Snowflake className="h-4 w-4 text-accent" />
                        <p className="text-xs font-semibold text-accent">Nearest Cold Storage</p>
                      </div>
                      {coldStorage[0] && (
                        <>
                          <p className="mt-2 text-sm font-semibold text-foreground">{coldStorage[0].name}</p>
                          <p className="text-xs text-muted-foreground">{coldStorage[0].city}, {coldStorage[0].state}</p>
                          <div className="mt-2 space-y-1 text-xs">
                            <p className="flex items-center gap-1"><MapPin className="h-3 w-3" /> 18 km away</p>
                            <p className="flex items-center gap-1"><Clock className="h-3 w-3" /> ~22 min drive</p>
                            <p className="flex items-center gap-1"><Activity className="h-3 w-3" /> {coldStorage[0].available_capacity_pct}% available</p>
                          </div>
                          <Button size="sm" className="mt-3 w-full" variant="outline">Reserve Now</Button>
                        </>
                      )}
                    </div>

                    <div className="rounded-xl border border-critical/30 bg-critical/5 p-4">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-critical" />
                        <p className="text-xs font-semibold text-critical">Nearest Hospital</p>
                      </div>
                      {hospitals[0] && (
                        <>
                          <p className="mt-2 text-sm font-semibold text-foreground">{hospitals[0].name}</p>
                          <p className="text-xs text-muted-foreground">{hospitals[0].city}, {hospitals[0].state}</p>
                          <div className="mt-2 space-y-1 text-xs">
                            <p className="flex items-center gap-1"><MapPin className="h-3 w-3" /> 12 km away</p>
                            <p className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {hospitals[0].beds} beds</p>
                            <p className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" /> Emergency ready</p>
                          </div>
                          <Button size="sm" className="mt-3 w-full" variant="outline">Notify Hospital</Button>
                        </>
                      )}
                    </div>

                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        <p className="text-xs font-semibold text-primary">Backup Driver</p>
                      </div>
                      {drivers[0] && (
                        <>
                          <p className="mt-2 text-sm font-semibold text-foreground">{drivers[0].name}</p>
                          <p className="text-xs text-muted-foreground">{drivers[0].city}, {drivers[0].state}</p>
                          <div className="mt-2 space-y-1 text-xs">
                            <p className="flex items-center gap-1"><Activity className="h-3 w-3" /> {drivers[0].status}</p>
                            <p className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" /> Rating: {drivers[0].rating}</p>
                            <p className="flex items-center gap-1"><Truck className="h-3 w-3" /> {drivers[0].total_deliveries} deliveries</p>
                          </div>
                          <Button size="sm" className="mt-3 w-full" variant="outline">Assign Driver</Button>
                        </>
                      )}
                    </div>
                  </div>

                  {sosActive && (
                    <div className="mt-4 rounded-xl border-2 border-primary p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Navigation className="h-4 w-4 text-primary" />
                        <p className="text-sm font-semibold">Alternate Rescue Route</p>
                        <Badge className="ml-auto gradient-primary text-white text-[10px]">AI Generated</Badge>
                      </div>
                      <p className="text-sm text-foreground">NH44 via Mathura Bypass → avoid NH28 (flooding). ETA: 1h 48min — 57min faster. Cold storage and hospital on this route.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">SOS Workflow</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { step: 'Emergency detected', done: true, icon: AlertTriangle, time: tlTime || '12:34 PM' },
                      { step: 'AI analysis completed', done: true, icon: Zap, time: tlTime || '12:34 PM' },
                      { step: 'Cold storage identified', done: true, icon: Snowflake, time: tlTime || '12:35 PM' },
                      { step: 'Hospital notified', done: sosActive || selected.status !== 'active', icon: Building2, time: sosActive ? tlTime : (selected.status !== 'active' ? '12:36 PM' : 'Pending') },
                      { step: 'Rescue route generated', done: sosActive || selected.status === 'responding' || selected.status === 'resolved', icon: Navigation, time: sosActive ? tlTime : (selected.status === 'responding' ? '12:37 PM' : 'Pending') },
                      { step: 'Driver dispatched', done: selected.status === 'resolved', icon: Truck, time: selected.status === 'resolved' ? '12:40 PM' : 'Pending' },
                      { step: 'Shipment secured', done: selected.status === 'resolved', icon: CheckCircle2, time: selected.status === 'resolved' ? '1:05 PM' : 'Pending' },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                          s.done ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                        )}>
                          <s.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className={cn('text-sm font-medium', s.done ? 'text-foreground' : 'text-muted-foreground')}>{s.step}</p>
                        </div>
                        <span className={cn('text-xs', s.done ? 'text-muted-foreground' : 'text-muted-foreground/50')}>{s.time}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex h-full min-h-[400px] items-center justify-center">
                <div className="text-center">
                  <Siren className="mx-auto h-12 w-12 text-muted-foreground/30" />
                  <p className="mt-4 text-sm text-muted-foreground">
                    {sosActive ? 'Manual SOS triggered — select a shipment to view rescue details' : 'Select an emergency to view rescue details'}
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
