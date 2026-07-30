'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { PageHeader, StatusBadge } from '@/components/ui/page-components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useNotifications } from '@/hooks/use-notifications';
import { WAREHOUSES } from '@/lib/warehouse-data';

const ColdStorageMapModal = dynamic(() => import('@/components/map/cold-storage-map-modal'), { ssr: false });
import { useTruckSimulation } from '@/hooks/use-truck-simulation';
import { haversineKm, etaMinutes } from '@/lib/warehouse-data';
import {
  Snowflake, Search, MapPin, Phone, Activity, Thermometer,
  Award, Droplet, Navigation, AlertTriangle, Package, Zap,
  Battery, DoorOpen, Wind, ShieldCheck, Cpu, TrendingUp, TrendingDown,
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { cn } from '@/lib/utils';

// Simulate real-time monitoring per warehouse
function useWarehouseMonitor(id: string) {
  const [data, setData] = useState(() => generateSnapshot(id, 0));
  const [history, setHistory] = useState<{ time: string; temp: number; humidity: number }[]>(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = generateSnapshot(id, i);
      return {
        time: `${String(new Date(Date.now() - (11 - i) * 5 * 60000).getHours()).padStart(2, '0')}:${String(new Date(Date.now() - (11 - i) * 5 * 60000).getMinutes()).padStart(2, '0')}`,
        temp: d.temperature,
        humidity: d.humidity,
      };
    });
  });
  const tickRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current++;
      const snap = generateSnapshot(id, tickRef.current);
      setData(snap);
      setHistory(prev => {
        const now = new Date();
        const label = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        return [...prev.slice(-23), { time: label, temp: snap.temperature, humidity: snap.humidity }];
      });
    }, 8000);
    return () => clearInterval(interval);
  }, [id]);

  return { data, history };
}

function generateSnapshot(id: string, tick: number) {
  // Deterministic-ish seed per warehouse id
  const seed = id.charCodeAt(3) + id.charCodeAt(4) + tick;
  const base = 3.5 + (seed % 3) * 0.4;
  const temp = parseFloat((base + Math.sin(tick * 0.6) * 0.3 + (Math.random() * 0.2 - 0.1)).toFixed(1));
  const humidity = Math.round(55 + (seed % 20) + Math.sin(tick * 0.4) * 3);
  const battery = Math.min(100, Math.max(60, 92 - (tick % 20)));
  const capacity = Math.round(60 + (seed % 30));
  const alerts: string[] = [];
  if (temp > 7) alerts.push('Temperature approaching upper limit');
  if (humidity > 72) alerts.push('Humidity elevated — check seals');
  if (battery < 70) alerts.push('Battery backup low — schedule service');
  return {
    temperature: temp,
    humidity,
    battery,
    capacity,
    cooling: temp < 6 ? 'optimal' : temp < 7.5 ? 'working' : 'degraded',
    power: 'main_grid',
    door: Math.random() > 0.95 ? 'open' : 'closed',
    health: Math.round(Math.max(50, 95 - (temp > 7 ? 15 : 0) - (humidity > 70 ? 10 : 0))),
    alerts,
  };
}

function MonitorBadge({ value, good, warn }: { value: string; good: string; warn?: string }) {
  const isGood = value === good;
  const isWarn = warn && value === warn;
  return (
    <Badge variant="outline" className={cn(
      'text-xs capitalize',
      isGood ? 'border-success/30 text-success bg-success/5' : isWarn ? 'border-warning/30 text-warning bg-warning/5' : 'border-critical/30 text-critical bg-critical/5'
    )}>
      {value.replace(/_/g, ' ')}
    </Badge>
  );
}

function WarehouseMonitorCard({ w, isRecommended, isHighlighted, onHighlight }: {
  w: typeof WAREHOUSES[0] & { distanceKm: number | null; etaMin: number | null };
  isRecommended: boolean;
  isHighlighted: boolean;
  onHighlight: () => void;
}) {
  const { data, history } = useWarehouseMonitor(w.id);

  return (
    <Card className={cn(
      'overflow-hidden transition-all hover:shadow-premium-lg',
      isRecommended && 'border-accent border-2 ring-2 ring-accent/20',
      isHighlighted && 'ring-2 ring-primary/40',
    )}>
      <div className={cn('h-2', isRecommended ? 'bg-accent' : 'gradient-accent')} />
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl', isRecommended ? 'bg-accent text-white animate-pulse' : 'bg-accent/10 text-accent')}>
              <Snowflake className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{w.name}</p>
              <p className="text-xs text-muted-foreground">{w.city}, {w.state}</p>
            </div>
          </div>
          {isRecommended ? (
            <Badge className="gap-1 bg-accent text-white text-[10px]"><Snowflake className="h-3 w-3" /> Recommended</Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] border-success/30 text-success">Operational</Badge>
          )}
        </div>

        {/* Live Monitoring Grid */}
        <div className="grid grid-cols-4 gap-2">
          <div className="col-span-2 rounded-xl bg-secondary/50 p-3">
            <div className="flex items-center gap-1.5"><Thermometer className="h-3.5 w-3.5 text-accent" /><span className="text-[10px] text-muted-foreground">Temperature</span></div>
            <p className={cn('mt-1 text-lg font-bold tabular-nums', data.temperature > 7 ? 'text-warning' : 'text-success')}>{data.temperature}°C</p>
            <p className="text-[10px] text-muted-foreground">Safe: 2–8°C</p>
          </div>
          <div className="rounded-xl bg-secondary/50 p-3">
            <div className="flex items-center gap-1.5"><Droplet className="h-3 w-3 text-primary" /></div>
            <p className="mt-1 text-sm font-bold tabular-nums">{data.humidity}%</p>
            <p className="text-[10px] text-muted-foreground">Humidity</p>
          </div>
          <div className="rounded-xl bg-secondary/50 p-3">
            <div className="flex items-center gap-1.5"><Activity className="h-3 w-3 text-success" /></div>
            <p className="mt-1 text-sm font-bold">{data.capacity}%</p>
            <p className="text-[10px] text-muted-foreground">Used</p>
          </div>
        </div>

        {/* Status Row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border p-2.5">
            <div className="flex items-center gap-1.5 mb-1"><Wind className="h-3.5 w-3.5 text-accent" /><span className="text-[10px] text-muted-foreground">Cooling</span></div>
            <MonitorBadge value={data.cooling} good="optimal" warn="working" />
          </div>
          <div className="rounded-xl border border-border p-2.5">
            <div className="flex items-center gap-1.5 mb-1"><Zap className="h-3.5 w-3.5 text-primary" /><span className="text-[10px] text-muted-foreground">Power</span></div>
            <MonitorBadge value={data.power} good="main_grid" warn="backup" />
          </div>
          <div className="rounded-xl border border-border p-2.5">
            <div className="flex items-center gap-1.5 mb-1"><Battery className="h-3.5 w-3.5 text-warning" /><span className="text-[10px] text-muted-foreground">Battery</span></div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className={cn('h-full rounded-full', data.battery > 70 ? 'bg-success' : data.battery > 40 ? 'bg-warning' : 'bg-critical')} style={{ width: `${data.battery}%` }} />
              </div>
              <span className="text-xs font-semibold tabular-nums">{data.battery}%</span>
            </div>
          </div>
          <div className="rounded-xl border border-border p-2.5">
            <div className="flex items-center gap-1.5 mb-1"><DoorOpen className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-[10px] text-muted-foreground">Door</span></div>
            <MonitorBadge value={data.door} good="closed" warn="open" />
          </div>
        </div>

        {/* Storage Health */}
        <div className="rounded-xl border border-border p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-success" /><span className="text-xs font-semibold">Storage Health</span></div>
            <span className={cn('text-sm font-bold', data.health >= 80 ? 'text-success' : data.health >= 60 ? 'text-warning' : 'text-critical')}>{data.health}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className={cn('h-full rounded-full transition-all', data.health >= 80 ? 'bg-success' : data.health >= 60 ? 'bg-warning' : 'bg-critical')} style={{ width: `${data.health}%` }} />
          </div>
        </div>

        {/* Capacity Used */}
        <div className="rounded-xl border border-border p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5"><Package className="h-3.5 w-3.5 text-primary" /><span className="text-xs font-semibold">Capacity Used</span></div>
            <span className="text-xs text-muted-foreground">{data.capacity}% of {w.capacityCubicM.toLocaleString()} m³</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className={cn('h-full rounded-full', data.capacity > 85 ? 'bg-critical' : data.capacity > 65 ? 'bg-warning' : 'bg-success')} style={{ width: `${data.capacity}%` }} />
          </div>
        </div>

        {/* Alerts */}
        {data.alerts.length > 0 && (
          <div className="space-y-1.5">
            {data.alerts.map((a, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg bg-warning/5 border border-warning/20 px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
                <p className="text-xs text-warning">{a}</p>
              </div>
            ))}
          </div>
        )}

        {/* Mini Temp Chart */}
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">Temperature trend (last 24 readings)</p>
          <ResponsiveContainer width="100%" height={60}>
            <LineChart data={history} margin={{ top: 2, right: 2, left: -30, bottom: 0 }}>
              <XAxis dataKey="time" tick={false} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 8, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '10px', padding: '4px 8px' }} formatter={(v: any) => [`${v}°C`, 'Temp']} />
              <ReferenceLine y={8} stroke="hsl(0 84% 60%)" strokeDasharray="3 3" strokeWidth={1} />
              <Line type="monotone" dataKey="temp" stroke={data.temperature > 7 ? 'hsl(38 92% 50%)' : 'hsl(175 60% 44%)'} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Contact + Distance */}
        <div className="space-y-1.5 border-t border-border pt-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {w.lat.toFixed(4)}, {w.lng.toFixed(4)}</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Phone className="h-3 w-3" /> {w.phone}</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Award className="h-3 w-3 text-warning" /> Manager: {w.contact}</div>
          {w.distanceKm !== null && (
            <div className="flex items-center gap-2 text-xs text-primary font-medium"><Navigation className="h-3 w-3" /> {w.distanceKm} km · ~{w.etaMin} min from critical shipment</div>
          )}
        </div>

        <Button size="sm" variant={isRecommended ? 'default' : 'outline'} className={cn('w-full gap-2', isRecommended && 'gradient-primary text-white')} onClick={onHighlight}>
          {isRecommended ? <><Snowflake className="h-3.5 w-3.5" /> Reserve Cargo Space</> : <><MapPin className="h-3.5 w-3.5" /> Highlight Facility</>}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ColdStoragePage() {
  const { emergency, nearestWarehouse } = useNotifications();
  const { trucks } = useTruckSimulation(5000);
  const [search, setSearch] = useState('');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);

  const criticalTruck = trucks.find(t => t.status === 'critical');

  const warehousesWithDistance = WAREHOUSES.map(wh => {
    let distanceKm: number | null = null;
    let etaMin: number | null = null;
    if (criticalTruck) {
      distanceKm = Math.round(haversineKm(criticalTruck.position[0], criticalTruck.position[1], wh.lat, wh.lng));
      etaMin = etaMinutes(distanceKm);
    }
    return { ...wh, distanceKm, etaMin };
  });

  const filtered = warehousesWithDistance.filter(w =>
    !search || w.name.toLowerCase().includes(search.toLowerCase()) || w.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cold Storage Network"
        description="Real-time monitoring of ultra-cold warehouse facilities"
        icon={Snowflake}
        action={
          <Button size="sm" className="gradient-primary text-white gap-2" onClick={() => setMapOpen(true)}>
            <MapPin className="h-4 w-4" /> View Map
          </Button>
        }
      />

      <ColdStorageMapModal open={mapOpen} onOpenChange={setMapOpen} />

      {emergency && nearestWarehouse && (
        <Card className="border-critical/30 border-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-critical/10">
                <AlertTriangle className="h-6 w-6 text-critical" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">AI Warehouse Recommendation Active</p>
                <p className="text-xs text-muted-foreground">
                  Shipment {emergency.shipmentId} requires immediate transfer to <strong className="text-accent">{nearestWarehouse.warehouse.name}</strong> —
                  {' '}{nearestWarehouse.distanceKm} km away, ETA {nearestWarehouse.etaMin} min.
                </p>
              </div>
              <Button size="sm" className="gradient-primary text-white gap-2" onClick={() => setHighlightedId(nearestWarehouse.warehouse.id)}>
                <MapPin className="h-4 w-4" /> Highlight on Map
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or city..." className="pl-9" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map(w => (
          <WarehouseMonitorCard
            key={w.id}
            w={w}
            isRecommended={emergency?.recommendedWarehouse?.id === w.id}
            isHighlighted={highlightedId === w.id}
            onHighlight={() => setHighlightedId(highlightedId === w.id ? null : w.id)}
          />
        ))}
      </div>
    </div>
  );
}
