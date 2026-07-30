'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { PageHeader, StatusBadge } from '@/components/ui/page-components';
import { KPICard } from '@/components/ui/kpi-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import {
  BrainCircuit, Activity, ShieldCheck, AlertTriangle, Thermometer,
  Clock, Siren, TrendingUp, TrendingDown, Cpu, Zap, Wrench,
  Battery, Wind, Gauge, Package, Sparkles, Navigation, MapPin,
  ArrowRight, CheckCircle2, Car,
} from 'lucide-react';
import {
  RadialBarChart, RadialBar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, ReferenceLine,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { Shipment, Prediction } from '@/types';

const COOLING_TREND = [
  { time: '00:00', efficiency: 98, temp: 4.2 },
  { time: '03:00', efficiency: 96, temp: 4.5 },
  { time: '06:00', efficiency: 94, temp: 4.8 },
  { time: '09:00', efficiency: 88, temp: 5.2 },
  { time: '12:00', efficiency: 82, temp: 6.1 },
  { time: '15:00', efficiency: 72, temp: 7.3 },
  { time: '18:00', efficiency: 58, temp: 8.1 },
  { time: '21:00', efficiency: 45, temp: 7.8 },
];

const FAILURE_TIMELINE = [
  { component: 'Compressor', probability: 78, eta: '4h' },
  { component: 'Battery', probability: 65, eta: '8h' },
  { component: 'Fan', probability: 42, eta: '18h' },
  { component: 'Sensor', probability: 28, eta: '24h' },
];

const TEMP_TREND_DATA = [
  { time: '1h ago', temp: 3.8 },
  { time: '45m', temp: 4.2 },
  { time: '30m', temp: 5.1 },
  { time: '15m', temp: 6.3 },
  { time: '10m', temp: 7.1 },
  { time: '5m', temp: 7.8 },
  { time: 'Now', temp: 8.2 },
];

function HealthDial({ value, size = 120 }: { value: number; size?: number }) {
  const data = [{ value, fill: value >= 70 ? '#22c55e' : value >= 40 ? '#f59e0b' : '#ef4444' }];
  return (
    <RadialBarChart
      width={size}
      height={size}
      innerRadius={size * 0.35}
      outerRadius={size * 0.48}
      data={data}
      startAngle={220}
      endAngle={-40}
    >
      <RadialBar background dataKey="value" cornerRadius={8} />
      <text x={size / 2} y={size / 2 - 4} textAnchor="middle" className="fill-foreground" style={{ fontSize: size * 0.22, fontWeight: 700 }}>
        {value}%
      </text>
      <text x={size / 2} y={size / 2 + size * 0.14} textAnchor="middle" style={{ fontSize: size * 0.1, fill: 'hsl(220 9% 46%)' }}>
        Health
      </text>
    </RadialBarChart>
  );
}

export default function PredictionsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [applyingRoute, setApplyingRoute] = useState(false);
  const { profile } = useAuth();

  useEffect(() => {
    async function load() {
      const [s, p] = await Promise.all([
        supabase.from('shipments').select('*').order('risk_score', { ascending: false }),
        supabase.from('predictions').select('*').order('created_at', { ascending: false }),
      ]);
      if (s.data) {
        setShipments(s.data);
        if (s.data.length > 0) setSelectedId(s.data[0].id);
      }
      if (p.data) {
        const map: Record<string, Prediction> = {};
        p.data.forEach((pred: Prediction) => {
          if (!map[pred.shipment_id]) map[pred.shipment_id] = pred;
        });
        setPredictions(map);
      }
      setLoading(false);
    }
    load();
  }, []);

  const selected = shipments.find(s => s.id === selectedId);
  const prediction = selectedId ? predictions[selectedId] : undefined;

  const overviewStats = {
    health: 72,
    highRisk: shipments.filter(s => s.risk_level === 'high' || s.risk_level === 'critical').length,
    safe: shipments.filter(s => s.risk_level === 'low').length,
    avgTemp: 5.4,
    accuracy: 94.2,
    cooling: 76,
    safeTime: 18,
    emergency: shipments.filter(s => s.risk_level === 'critical').length,
  };

  function getHealthColor(value: number) {
    if (value >= 80) return 'hsl(142 71% 45%)';
    if (value >= 60) return 'hsl(38 92% 50%)';
    if (value >= 40) return 'hsl(20 90% 55%)';
    return 'hsl(0 84% 60%)';
  }

  const healthValue = selected
    ? Math.max(0, Math.min(100, 100 - (selected.risk_score || 30)))
    : (prediction?.spoilage_probability ? 100 - prediction.spoilage_probability : 71);

  const trafficDelay = selected?.risk_score && selected.risk_score > 50 ? 'Heavy (+2h 15m)' : 'Moderate (+35m)';
  const tempTrend = TEMP_TREND_DATA[TEMP_TREND_DATA.length - 1].temp > TEMP_TREND_DATA[0].temp ? 'Rising' : 'Stable';
  const batteryPct = prediction?.battery_health ?? 68;
  const safeTimeHours = prediction?.remaining_safe_hours ?? 3.5;

  const reasons = prediction?.failure_cause
    ? prediction.failure_cause.split('. ')
    : ['Heavy traffic detected near NH48.', 'Temperature increasing continuously for 3 hours.', 'Compressor efficiency dropping below 50%.'];

  const altRoute = 'Take NH44 via Mathura Bypass (avoid NH28 flooding). ETA: 1h 48min — 57min faster than current route.';

  const aiRouteData = {
    name: 'NH44 via Mathura Bypass',
    travelTime: '1h 48m',
    distance: '312 km',
    traffic: 'Low',
    etaMinutes: 108,
    distanceKm: 312,
  };

  const currentRouteData = {
    name: selected?.active_route || 'NH48 (Blocked)',
    travelTime: selected?.active_route_travel_time || '6h 45m',
    distance: selected?.active_route_distance_km ? `${selected.active_route_distance_km} km` : '298 km',
    traffic: selected?.active_route_traffic || 'Heavy + Flooding',
  };

  const handleApplyRoute = useCallback(async () => {
    if (!selected || applyingRoute) return;
    setApplyingRoute(true);

    const previousRoute = selected.active_route || 'NH48 (Blocked)';
    const newRoute = aiRouteData.name;
    const now = new Date().toISOString();

    try {
      const { error: updateError } = await supabase
        .from('shipments')
        .update({
          route_status: 'AI Rerouted',
          active_route: newRoute,
          active_route_travel_time: aiRouteData.travelTime,
          active_route_distance_km: aiRouteData.distanceKm,
          active_route_traffic: aiRouteData.traffic.toLowerCase(),
          active_route_eta_minutes: aiRouteData.etaMinutes,
          rerouted_at: now,
          updated_at: now,
        })
        .eq('id', selected.id);

      if (updateError) throw updateError;

      const { error: historyError } = await supabase
        .from('route_history')
        .insert({
          shipment_id: selected.id,
          previous_route: previousRoute,
          new_route: newRoute,
          applied_by: profile?.id || null,
          reason: 'AI Recommendation',
        });

      if (historyError) throw historyError;

      const { data: tpData } = await supabase
        .from('truck_positions')
        .select('id')
        .eq('shipment_id', selected.id)
        .maybeSingle();

      if (tpData) {
        await supabase
          .from('truck_positions')
          .update({
            is_rerouted: true,
            reroute_reason: 'AI Recommendation',
            eta_minutes: aiRouteData.etaMinutes,
            distance_remaining_km: aiRouteData.distanceKm,
            traffic_status: 'clear',
            updated_at: now,
          })
          .eq('id', tpData.id);
      }

      setShipments(prev => prev.map(s =>
        s.id === selected.id
          ? {
            ...s,
            route_status: 'AI Rerouted',
            active_route: newRoute,
            active_route_travel_time: aiRouteData.travelTime,
            active_route_distance_km: aiRouteData.distanceKm,
            active_route_traffic: aiRouteData.traffic.toLowerCase(),
            active_route_eta_minutes: aiRouteData.etaMinutes,
            rerouted_at: now,
          }
          : s
      ));

      toast.success('AI route successfully applied.');
    } catch (err) {
      console.error('Failed to apply route change:', err);
      toast.error('Failed to apply route change. Previous route remains active.');
    } finally {
      setApplyingRoute(false);
    }
  }, [selected, applyingRoute, profile?.id]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Prediction Center"
        description="Explainable AI-powered risk predictions"
        icon={BrainCircuit}
        action={
          <Badge className="gradient-primary text-white gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Model v2.1 · 94.2% accuracy
          </Badge>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPICard label="Overall Health" value={overviewStats.health} suffix="%" icon={Activity} variant={overviewStats.health > 70 ? 'success' : 'warning'} />
        <KPICard label="High Risk" value={overviewStats.highRisk} icon={AlertTriangle} variant="critical" />
        <KPICard label="Safe Shipments" value={overviewStats.safe} icon={ShieldCheck} variant="success" />
        <KPICard label="Avg Temperature" value={overviewStats.avgTemp} decimals={1} suffix="°C" icon={Thermometer} variant="default" />
        <KPICard label="AI Accuracy" value={overviewStats.accuracy} decimals={1} suffix="%" icon={BrainCircuit} variant="primary" />
        <KPICard label="Cooling Health" value={overviewStats.cooling} suffix="%" icon={Cpu} variant="warning" />
        <KPICard label="Safe Time Avg" value={overviewStats.safeTime} suffix="h" icon={Clock} variant="accent" />
        <KPICard label="Emergency Cases" value={overviewStats.emergency} icon={Siren} variant="critical" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Shipment Predictions</CardTitle>
            <p className="text-xs text-muted-foreground">Sorted by risk score · click to view</p>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : shipments.map((s) => {
              const pred = predictions[s.id];
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
                    <div>
                      <p className="text-sm font-semibold text-foreground">{s.shipment_number}</p>
                      <p className="text-xs text-muted-foreground">{s.medicine_name}</p>
                    </div>
                    <StatusBadge status={s.risk_level} />
                  </div>
                  {pred && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Spoilage</p>
                        <p className={cn('text-sm font-bold', pred.spoilage_probability > 70 ? 'text-critical' : pred.spoilage_probability > 40 ? 'text-warning' : 'text-success')}>
                          {pred.spoilage_probability.toFixed(0)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Safe Hours</p>
                        <p className="text-sm font-bold text-foreground">{pred.remaining_safe_hours?.toFixed(0) || '—'}h</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Confidence</p>
                        <p className="text-sm font-bold text-primary">{pred.confidence_score.toFixed(0)}%</p>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          {/* Shipment Health Score Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-primary" /> Shipment Health Score
                {selected && <Badge variant="outline" className="ml-auto">{selected.shipment_number}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="flex-shrink-0">
                  <HealthDial value={healthValue} size={130} />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border p-3">
                      <p className="text-[10px] text-muted-foreground">Risk Level</p>
                      <div className="mt-1">
                        <StatusBadge status={selected?.risk_level || 'medium'} />
                      </div>
                    </div>
                    <div className="rounded-xl border border-border p-3">
                      <p className="text-[10px] text-muted-foreground">Confidence</p>
                      <p className="mt-1 text-base font-bold text-primary">{prediction?.confidence_score?.toFixed(0) ?? 87}%</p>
                    </div>
                    <div className="rounded-xl border border-warning/20 bg-warning/5 p-3">
                      <p className="text-[10px] text-muted-foreground">Time Before Temp Violation</p>
                      <p className="mt-1 text-base font-bold text-warning">{safeTimeHours.toFixed(1)}h</p>
                    </div>
                    <div className="rounded-xl border border-border p-3">
                      <p className="text-[10px] text-muted-foreground">Traffic Delay</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{trafficDelay}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Temp Trend + Battery */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Thermometer className="h-4 w-4 text-primary" /> Temperature Trend
                  <Badge variant="outline" className={cn('ml-auto text-xs', tempTrend === 'Rising' ? 'text-critical border-critical/30' : 'text-success border-success/30')}>
                    {tempTrend === 'Rising' ? <TrendingUp className="h-3 w-3 inline mr-1" /> : <Activity className="h-3 w-3 inline mr-1" />}
                    {tempTrend}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={TEMP_TREND_DATA}>
                    <XAxis dataKey="time" tick={{ fontSize: 9, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} domain={[2, 10]} />
                    <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px' }} />
                    <ReferenceLine y={8} stroke="hsl(0 84% 60%)" strokeDasharray="4 4" label={{ value: 'Max', fontSize: 9, fill: 'hsl(0 84% 60%)' }} />
                    <Line type="monotone" dataKey="temp" stroke={tempTrend === 'Rising' ? 'hsl(0 84% 60%)' : 'hsl(142 71% 45%)'} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Battery className="h-4 w-4 text-primary" /> Battery Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative flex h-14 w-7 items-center justify-center rounded-sm border-2 border-border">
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-1.5 w-3 rounded-sm bg-border" />
                    <div
                      className={cn('w-full rounded-sm transition-all absolute bottom-0', batteryPct > 50 ? 'bg-success' : batteryPct > 20 ? 'bg-warning' : 'bg-critical')}
                      style={{ height: `${batteryPct}%` }}
                    />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{batteryPct.toFixed(0)}%</p>
                    <p className={cn('text-xs', batteryPct > 50 ? 'text-success' : batteryPct > 20 ? 'text-warning' : 'text-critical')}>
                      {batteryPct > 50 ? 'Healthy' : batteryPct > 20 ? 'Low Battery' : 'Critical — Charge Now'}
                    </p>
                  </div>
                </div>
                {prediction && (
                  <div className="space-y-2">
                    {[
                      { label: 'Cooling Health', value: prediction.cooling_health, icon: Cpu },
                      { label: 'Compressor', value: prediction.compressor_health, icon: Wrench },
                      { label: 'Sensor', value: prediction.sensor_health, icon: Gauge },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-semibold">{item.value.toFixed(0)}%</span>
                        </div>
                        <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full" style={{ width: `${item.value}%`, background: getHealthColor(item.value) }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Recommendation + Reasons + Alt Route */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BrainCircuit className="h-4 w-4 text-primary" /> AI Recommendation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-primary">Recommended Action</p>
                </div>
                <p className="text-sm text-foreground">
                  {prediction?.recommended_action || 'Switch to Route B immediately. Divert to Delhi Ultra Cold Bank for cooling maintenance. Notify receiving hospital of 2h delay.'}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Reasons Behind Prediction</p>
                <div className="space-y-2">
                  {reasons.map((r, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-warning/10">
                        <AlertTriangle className="h-2.5 w-2.5 text-warning" />
                      </div>
                      <p className="text-xs text-foreground">{r}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border-2 border-primary p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Navigation className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">Suggested Alternate Route</p>
                  <Badge className="ml-auto gradient-primary text-white text-[10px]">AI Selected</Badge>
                </div>
                <p className="text-sm text-foreground">{altRoute}</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-secondary/50 p-2 text-center">
                    <p className="text-muted-foreground">Distance</p>
                    <p className="font-semibold">312 km</p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-2 text-center">
                    <p className="text-muted-foreground">ETA</p>
                    <p className="font-semibold text-success">1h 48m</p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-2 text-center">
                    <p className="text-muted-foreground">Traffic</p>
                    <p className="font-semibold text-success">Low</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="mt-3 w-full gap-2 gradient-primary text-white"
                  onClick={handleApplyRoute}
                  disabled={applyingRoute || !selected}
                >
                  <Navigation className="h-4 w-4" /> {applyingRoute ? 'Applying...' : 'Apply Route Change'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cooling System Efficiency Trend</CardTitle>
            <p className="text-xs text-muted-foreground">Critical shipment · last 24h</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={COOLING_TREND}>
                <defs>
                  <linearGradient id="effGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(175 60% 44%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(175 60% 44%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 18% 91%)" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(240 18% 91%)', fontSize: '12px' }} />
                <ReferenceLine y={60} stroke="hsl(38 92% 50%)" strokeDasharray="5 5" label={{ value: 'Warning', fontSize: 10, fill: 'hsl(38 92% 50%)' }} />
                <Area type="monotone" dataKey="efficiency" stroke="hsl(175 60% 44%)" strokeWidth={2.5} fill="url(#effGrad)" name="Efficiency (%)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Component Failure Probability</CardTitle>
            <p className="text-xs text-muted-foreground">AI-predicted failure timeline</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {FAILURE_TIMELINE.map((f) => (
                <div key={f.component}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{f.component}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">ETA: {f.eta}</span>
                      <span className={cn('text-sm font-bold', f.probability > 60 ? 'text-critical' : f.probability > 30 ? 'text-warning' : 'text-success')}>{f.probability}%</span>
                    </div>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div className={cn('h-full rounded-full transition-all', f.probability > 60 ? 'bg-critical' : f.probability > 30 ? 'bg-warning' : 'bg-success')} style={{ width: `${f.probability}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-xl bg-primary/5 p-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold text-primary">AI Insight</p>
              </div>
              <p className="mt-1 text-xs text-foreground">
                Compressor failure probability at 78% indicates sustained thermal stress. The system has been running at reduced efficiency for 6+ hours. Battery depletion is accelerating due to increased compressor cycling. Immediate maintenance intervention recommended.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="h-4 w-4 text-primary" /> Route Intelligence
          </CardTitle>
          <p className="text-xs text-muted-foreground">AI-optimized routing recommendations</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border-2 border-primary p-4">
              <div className="flex items-center gap-2">
                <Badge className="gradient-primary text-white">AI Selected</Badge>
                <span className="text-sm font-semibold">{selected?.route_status === 'AI Rerouted' ? 'Active Route' : 'Alternative Route'}</span>
              </div>
              <div className="mt-3 space-y-2 text-sm">
                {[['Travel Time', selected?.active_route_travel_time || '4h 12m'], ['Distance', selected?.active_route_distance_km ? `${selected.active_route_distance_km} km` : '312 km'], ['Fuel Cost', '₹2,450'], ['Toll', '₹320'], ['Traffic', selected?.active_route_traffic ? selected.active_route_traffic.charAt(0).toUpperCase() + selected.active_route_traffic.slice(1) : 'Low'], ['Weather', 'Clear']].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{k}</span>
                    <span className={cn('font-semibold', (v === 'Low' || v === 'Clear' || v === 'low' || v === 'clear') && 'text-success')}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Current Route</Badge>
                <span className="text-sm font-semibold">{currentRouteData.name}</span>
              </div>
              <div className="mt-3 space-y-2 text-sm">
                {[['Travel Time', currentRouteData.travelTime, 'warning'], ['Distance', currentRouteData.distance, ''], ['Fuel Cost', '₹2,340', ''], ['Toll', '₹280', ''], ['Traffic', currentRouteData.traffic, 'critical'], ['Weather', 'Heavy Rain', 'critical']].map(([k, v, cls]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{k}</span>
                    <span className={cn('font-semibold', cls === 'warning' && 'text-warning', cls === 'critical' && 'text-critical')}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
