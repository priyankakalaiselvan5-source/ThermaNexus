'use client';

import { useState } from 'react';
import { PageHeader, StatusBadge } from '@/components/ui/page-components';
import { KPICard } from '@/components/ui/kpi-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRecommendationEngine } from '@/hooks/use-recommendation-engine';
import { useNotifications } from '@/hooks/use-notifications';
import { EmergencyPanel } from '@/components/layout/emergency-panel';
import { RecommendationCard } from '@/components/recommendations/recommendation-card';
import { RecommendationCenter } from '@/components/recommendations/recommendation-center';
import { DecisionHistory } from '@/components/recommendations/decision-history';
import { useData } from '@/hooks/use-data';
import {
  LayoutDashboard, Package, Truck, ShieldCheck, AlertTriangle, Clock,
  Building2, Snowflake, Users, Activity, Siren, Leaf, TrendingUp,
  Navigation, Bell, ArrowRight, MapPin,
  Wrench, Zap, CheckCircle2, BrainCircuit,
} from 'lucide-react';
import {
  LineChart, Line, Area, AreaChart, Bar, BarChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadialBarChart, RadialBar,
} from 'recharts';
import { cn } from '@/lib/utils';
import { formatNumber, timeAgo } from '@/lib/format';
import type { EmergencyEvent } from '@/types';
import { Truck as TruckIcon } from 'lucide-react';

interface SosAlert extends EmergencyEvent {
  shipment?: { shipment_number: string; medicine_name: string } | null;
  driver?: { name: string } | null;
  vehicle?: { registration_number: string } | null;
}

const CHART_COLORS = ['hsl(246 80% 62%)', 'hsl(175 60% 44%)', 'hsl(142 71% 45%)', 'hsl(38 92% 50%)', 'hsl(0 84% 60%)', 'hsl(243 75% 51%)'];

const FALLBACK_TEMP_TREND = [
  { time: '00:00', temp: 4.2, target: 5 },
  { time: '03:00', temp: 4.5, target: 5 },
  { time: '06:00', temp: 4.8, target: 5 },
  { time: '09:00', temp: 5.2, target: 5 },
  { time: '12:00', temp: 6.1, target: 5 },
  { time: '15:00', temp: 7.3, target: 5 },
  { time: '18:00', temp: 8.1, target: 5 },
  { time: '21:00', temp: 7.8, target: 5 },
];

const FALLBACK_DELIVERY_DATA = [
  { day: 'Mon', safe: 45, delayed: 5, failed: 2 },
  { day: 'Tue', safe: 52, delayed: 3, failed: 1 },
  { day: 'Wed', safe: 48, delayed: 7, failed: 3 },
  { day: 'Thu', safe: 55, delayed: 4, failed: 1 },
  { day: 'Fri', safe: 60, delayed: 6, failed: 2 },
  { day: 'Sat', safe: 42, delayed: 3, failed: 0 },
  { day: 'Sun', safe: 38, delayed: 2, failed: 1 },
];

function KpiSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-card p-4">
      <div className="h-4 w-24 rounded bg-muted" />
      <div className="mt-3 h-8 w-16 rounded bg-muted" />
      <div className="mt-2 h-3 w-20 rounded bg-muted" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-card p-6">
      <div className="h-5 w-40 rounded bg-muted" />
      <div className="mt-4 h-[200px] rounded bg-muted" />
    </div>
  );
}

export default function DashboardPage() {
  const { shipments, stats, charts, loading, usingMock, emergencies } = useData();
  const [selectedRecId, setSelectedRecId] = useState<string | null>(null);

  const {
    recommendations, decisionHistory, timelineEvents,
    pendingCount, criticalCount,
    acceptRecommendation, ignoreRecommendation,
  } = useRecommendationEngine();

  const { alerts: liveAlerts, unreadCount } = useNotifications();

  const sosAlerts = emergencies.filter(e => e.status === 'active').slice(0, 10) as SosAlert[];

  const riskDistribution = [
    { name: 'Safe', value: shipments.filter(s => s.risk_level === 'low').length, color: 'hsl(142 71% 45%)' },
    { name: 'Moderate', value: shipments.filter(s => s.risk_level === 'moderate').length, color: 'hsl(246 80% 62%)' },
    { name: 'High', value: shipments.filter(s => s.risk_level === 'high').length, color: 'hsl(38 92% 50%)' },
    { name: 'Critical', value: shipments.filter(s => s.risk_level === 'critical').length, color: 'hsl(0 84% 60%)' },
  ];
  const riskTotal = riskDistribution.reduce((a, b) => a + b.value, 0);
  const riskPct = riskDistribution.map(r => ({
    ...r,
    value: riskTotal > 0 ? Math.round((r.value / riskTotal) * 100) : 0,
  }));

  const vehiclesActive = stats.vehiclesActive;
  const vehiclesTotal = stats.fleet || 1;
  const fleetActivePct = Math.round((vehiclesActive / vehiclesTotal) * 100);
  const fleetUtilization = [
    { name: 'Active', value: fleetActivePct, fill: 'hsl(246 80% 62%)' },
    { name: 'Idle', value: 100 - fleetActivePct, fill: 'hsl(240 18% 91%)' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Command Center"
        description="Real-time healthcare logistics overview"
        icon={LayoutDashboard}
        action={
          <div className="flex items-center gap-2">
            {usingMock && (
              <Badge variant="outline" className="gap-1.5 border-warning/40 text-warning">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" /> Demo Data
              </Badge>
            )}
            <Badge variant="outline" className="gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
              Live
            </Badge>
            <Button variant="outline" size="sm" className="gap-2">
              <TrendingUp className="h-4 w-4" /> Export
            </Button>
          </div>
        }
      />

      {sosAlerts.length > 0 && (
        <Card className="border-2 border-critical/40 bg-critical/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-critical">
              <Siren className="h-5 w-5 animate-pulse" />
              Active SOS Emergencies ({sosAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sosAlerts.map((sos) => (
              <div key={sos.id} className="rounded-xl border border-critical/20 bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold capitalize text-critical">
                    {(sos.event_type || 'emergency').replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(sos.detected_at).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
                  <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2">
                    <Navigation className="h-3.5 w-3.5 text-primary" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Driver</p>
                      <p className="text-xs font-medium">{sos.driver?.name || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2">
                    <TruckIcon className="h-3.5 w-3.5 text-primary" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Vehicle</p>
                      <p className="text-xs font-medium">{sos.vehicle?.registration_number || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2">
                    <Package className="h-3.5 w-3.5 text-primary" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Shipment</p>
                      <p className="text-xs font-medium">{sos.shipment?.shipment_number || 'N/A'}</p>
                    </div>
                  </div>
                  {sos.latitude && sos.longitude && (
                    <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      <div>
                        <p className="text-[10px] text-muted-foreground">GPS Location</p>
                        <p className="text-xs font-medium">{Number(sos.latitude).toFixed(4)}, {Number(sos.longitude).toFixed(4)}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Time</p>
                      <p className="text-xs font-medium">{new Date(sos.detected_at).toLocaleTimeString('en-IN')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2">
                    <Siren className="h-3.5 w-3.5 text-primary" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Type</p>
                      <p className="text-xs font-medium capitalize">{(sos.event_type || '').replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                </div>
                {sos.description && (
                  <p className="mt-2 text-xs text-muted-foreground">{sos.description}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <EmergencyPanel />

      {loading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => <KpiSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          <KPICard label="Active Shipments" value={stats.active} icon={Navigation} variant="accent" trend={8} trendLabel="in transit now" sparkline={[5, 7, 6, 8, 9, 8, 7]} />
          <KPICard label="Critical Alerts" value={liveAlerts.filter(a => a.level === 'critical' && !a.isResolved).length} icon={AlertTriangle} variant="critical" trend={-5} trendLabel="need attention" sparkline={[5, 3, 4, 2, 3, 2, 2]} />
          <KPICard label="Vehicles Active" value={stats.vehiclesActive} icon={Truck} variant="primary" sparkline={[3, 5, 6, 5, 7, 8, 7]} />
          <KPICard label="Deliveries Completed" value={stats.deliveriesCompleted} icon={CheckCircle2} variant="success" trend={12} trendLabel="total delivered" sparkline={[20, 25, 28, 30, 32, 35, 38]} />
          <KPICard label="Avg Shipment Health" value={stats.avgHealth} suffix="%" icon={Activity} variant={stats.avgHealth >= 70 ? 'success' : 'warning'} decimals={0} sparkline={[60, 65, 70, 72, 75, 73, stats.avgHealth]} />
          <KPICard label="Total Shipments" value={stats.total} icon={Package} variant="default" trend={12} trendLabel="vs last week" sparkline={[30, 35, 40, 38, 45, 50, 48]} />
          <KPICard label="Safe Deliveries" value={stats.safe} icon={ShieldCheck} variant="success" trend={15} trendLabel="within safe range" sparkline={[20, 25, 28, 30, 32, 35, 38]} />
          <KPICard label="Delayed" value={stats.delayed} icon={Clock} variant="warning" trend={-2} trendLabel="pending dispatch" sparkline={[8, 6, 7, 5, 4, 3, 2]} />
          <KPICard label="Critical Shipments" value={stats.critical} icon={Siren} variant="critical" />
          <KPICard label="Nearby Hospitals" value={stats.hospitals} icon={Building2} variant="default" />
          <KPICard label="Cold Storage" value={stats.coldStorage} icon={Snowflake} variant="primary" />
          <KPICard label="Drivers" value={stats.drivers} icon={Users} variant="default" />
          <KPICard label="Carbon Savings" value={stats.carbonSavings} suffix=" kg" icon={Leaf} variant="success" trend={18} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {loading ? <ChartSkeleton /> : (
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Temperature Trends</CardTitle>
              <p className="text-xs text-muted-foreground">Average shipment temperature · last 24h</p>
            </div>
            <Badge variant="outline" className="text-warning">Above target</Badge>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={charts.tempTrend.length > 0 ? charts.tempTrend : FALLBACK_TEMP_TREND}>
                <defs>
                  <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(246 80% 62%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(246 80% 62%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 18% 91%)" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} domain={[0, 10]} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid hsl(240 18% 91%)', fontSize: '12px' }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="temp" stroke="hsl(246 80% 62%)" strokeWidth={2.5} fill="url(#tempGrad)" name="Temperature (°C)" />
                <Line type="monotone" dataKey="target" stroke="hsl(38 92% 50%)" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Target" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        )}

        {loading ? <ChartSkeleton /> : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Risk Distribution</CardTitle>
            <p className="text-xs text-muted-foreground">All active shipments</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={riskPct} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {riskPct.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(240 18% 91%)', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 space-y-1.5">
              {riskPct.map((r) => (
                <div key={r.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                    <span className="text-muted-foreground">{r.name}</span>
                  </div>
                  <span className="font-semibold">{r.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {loading ? <ChartSkeleton /> : (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Delivery Performance</CardTitle>
            <p className="text-xs text-muted-foreground">Weekly summary</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={charts.deliveryData.length > 0 ? charts.deliveryData : FALLBACK_DELIVERY_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 18% 91%)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(240 18% 91%)', fontSize: '12px' }} cursor={{ fill: 'hsl(240 18% 91% / 0.3)' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="safe" stackId="a" fill="hsl(142 71% 45%)" radius={[0, 0, 0, 0]} name="Safe" />
                <Bar dataKey="delayed" stackId="a" fill="hsl(38 92% 50%)" radius={[0, 0, 0, 0]} name="Delayed" />
                <Bar dataKey="failed" stackId="a" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        )}

        {loading ? <ChartSkeleton /> : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fleet Utilization</CardTitle>
            <p className="text-xs text-muted-foreground">Current fleet status</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={180}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="55%" outerRadius="90%" data={fleetUtilization} startAngle={90} endAngle={-270}>
                  <RadialBar background dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute text-center">
                <p className="text-3xl font-bold text-foreground">{fleetActivePct}%</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-primary/5 p-3">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">In Use</span>
                </div>
                <p className="mt-1 text-lg font-bold">{stats.vehiclesActive}</p>
              </div>
              <div className="rounded-xl bg-muted p-3">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Available</span>
                </div>
                <p className="mt-1 text-lg font-bold">{Math.max(0, stats.fleet - stats.vehiclesActive)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <BrainCircuit className="h-4 w-4 text-primary" /> AI Recommendations
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Rule-based engine · {pendingCount} pending · {criticalCount} critical
              </p>
            </div>
            <Badge className="gradient-primary text-white gap-1">
              <Zap className="h-3 w-3" /> Engine v2.1
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success/10">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <p className="mt-3 text-sm font-semibold text-foreground">All shipments nominal</p>
                <p className="text-xs text-muted-foreground">Engine evaluating telemetry continuously</p>
              </div>
            ) : (
              recommendations.slice(0, 6).map(rec => (
                <RecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  onAccept={acceptRecommendation}
                  onIgnore={ignoreRecommendation}
                  compact
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4 text-primary" /> Live Alerts
              {liveAlerts.filter(a => !a.isRead).length > 0 && (
                <span className="rounded-full bg-critical/10 px-2 py-0.5 text-[10px] font-bold text-critical">
                  {liveAlerts.filter(a => !a.isRead).length} new
                </span>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground">AI-powered system alerts</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {liveAlerts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No active alerts</p>
            ) : (
              liveAlerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="flex items-start gap-2.5 rounded-lg border border-border/50 p-2.5 hover:bg-muted/30">
                  <div className={cn(
                    'mt-0.5 h-2 w-2 shrink-0 rounded-full',
                    alert.level === 'critical' ? 'bg-critical' :
                    alert.level === 'warning' ? 'bg-warning' : 'bg-primary'
                  )} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">{alert.title}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{alert.description}</p>
                    <p className="mt-0.5 text-[10px] text-primary">AI: {alert.aiConfidence}%</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {timelineEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" /> Shipment Timeline
            </CardTitle>
            <p className="text-xs text-muted-foreground">Recent AI-triggered events</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {timelineEvents.slice(0, 8).map(event => (
                <div key={event.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-foreground">{event.message}</p>
                    <p className="text-[10px] text-muted-foreground">{event.shipmentId}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(event.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Recent Shipments</CardTitle>
            <p className="text-xs text-muted-foreground">Latest logistics activity</p>
          </div>
          <Button variant="ghost" size="sm" className="gap-1 text-primary">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="pb-2 text-left font-medium">Shipment</th>
                  <th className="pb-2 text-left font-medium">Medicine</th>
                  <th className="pb-2 text-left font-medium">Route</th>
                  <th className="pb-2 text-left font-medium">Risk</th>
                  <th className="pb-2 text-left font-medium">Status</th>
                  <th className="pb-2 text-right font-medium">ETA</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : shipments.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No shipments yet</td></tr>
                ) : (
                  shipments.slice(0, 6).map((s) => (
                    <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                      <td className="py-3 font-medium text-foreground">{s.shipment_number}</td>
                      <td className="py-3 text-muted-foreground">{s.medicine_name}</td>
                      <td className="py-3 text-muted-foreground">
                        <span className="flex items-center gap-1 text-xs">
                          <MapPin className="h-3 w-3" /> {s.origin_city || '—'} → {s.destination_city || '—'}
                        </span>
                      </td>
                      <td className="py-3"><StatusBadge status={s.risk_level} /></td>
                      <td className="py-3"><StatusBadge status={s.status} /></td>
                      <td className="py-3 text-right text-xs text-muted-foreground">
                        {s.remaining_safe_hours ? `${s.remaining_safe_hours}h` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <RecommendationCenter
          recommendations={recommendations}
          onAccept={acceptRecommendation}
          onIgnore={ignoreRecommendation}
          onSelect={(rec) => setSelectedRecId(rec.id)}
          selectedId={selectedRecId || undefined}
        />
        <DecisionHistory history={decisionHistory} maxItems={15} />
      </div>

      {selectedRecId && recommendations.find(r => r.id === selectedRecId) && (
        <Card className="border-2 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <BrainCircuit className="h-4 w-4 text-primary" /> Active Recommendation Detail
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setSelectedRecId(null)}>Close</Button>
          </CardHeader>
          <CardContent>
            <RecommendationCard
              recommendation={recommendations.find(r => r.id === selectedRecId)!}
              onAccept={acceptRecommendation}
              onIgnore={ignoreRecommendation}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
