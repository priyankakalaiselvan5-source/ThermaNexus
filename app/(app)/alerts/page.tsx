'use client';

import { useState } from 'react';
import { PageHeader, StatusBadge } from '@/components/ui/page-components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotifications, type AlertLevel } from '@/hooks/use-notifications';
import {
  BellRing, Search, AlertTriangle, CheckCircle2, Clock,
  BrainCircuit, Shield, Info, Filter, Bell, BellOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const LEVEL_CONFIG: Record<AlertLevel, { label: string; bg: string; text: string; border: string; icon: any }> = {
  critical: { label: 'Critical', bg: 'bg-critical/10', text: 'text-critical', border: 'border-l-critical', icon: AlertTriangle },
  warning: { label: 'Warning', bg: 'bg-warning/10', text: 'text-warning', border: 'border-l-warning', icon: Shield },
  information: { label: 'Information', bg: 'bg-primary/10', text: 'text-primary', border: 'border-l-primary', icon: Info },
};

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export default function AlertsPage() {
  const { alerts, markAlertRead, resolveAlert } = useNotifications();
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState<'all' | AlertLevel>('all');
  const [showResolved, setShowResolved] = useState(false);

  const filtered = alerts.filter(a => {
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !a.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (level !== 'all' && a.level !== level) return false;
    if (!showResolved && a.isResolved) return false;
    return true;
  });

  const stats = {
    total: alerts.length,
    unread: alerts.filter(a => !a.isRead).length,
    critical: alerts.filter(a => a.level === 'critical' && !a.isResolved).length,
    resolved: alerts.filter(a => a.isResolved).length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alert Center"
        description="Real-time system alerts with AI confidence and recommended actions"
        icon={BellRing}
        action={
          <Button variant="outline" size="sm" onClick={() => setShowResolved(!showResolved)} className="gap-2">
            {showResolved ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            {showResolved ? 'Hide Resolved' : 'Show Resolved'}
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Total Alerts', value: stats.total, icon: Bell, color: 'text-primary bg-primary/10' },
          { label: 'Unread', value: stats.unread, icon: BellRing, color: 'text-warning bg-warning/10' },
          { label: 'Critical Active', value: stats.critical, icon: AlertTriangle, color: 'text-critical bg-critical/10' },
          { label: 'Resolved', value: stats.resolved, icon: CheckCircle2, color: 'text-success bg-success/10' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', s.color)}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search alerts..." className="pl-9" />
            </div>
            <Tabs value={level} onValueChange={(v) => setLevel(v as any)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="critical" className="gap-1"><AlertTriangle className="h-3 w-3" /> Critical</TabsTrigger>
                <TabsTrigger value="warning" className="gap-1"><Shield className="h-3 w-3" /> Warning</TabsTrigger>
                <TabsTrigger value="information" className="gap-1"><Info className="h-3 w-3" /> Info</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center">
            <BellRing className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground">No alerts found</p>
          </CardContent></Card>
        ) : filtered.map(alert => {
          const cfg = LEVEL_CONFIG[alert.level];
          const Icon = cfg.icon;
          return (
            <Card key={alert.id} className={cn(
              'border-l-4 transition-all hover:shadow-premium',
              cfg.border,
              !alert.isRead && 'border-primary/20',
              alert.isResolved && 'opacity-60',
            )}>
              <CardContent className="flex items-start gap-3 p-4">
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', cfg.bg, cfg.text)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{alert.title}</p>
                    <Badge variant="outline" className={cn('gap-1 text-xs', cfg.text)}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.bg)} /> {cfg.label}
                    </Badge>
                    <Badge variant="outline" className="capitalize text-xs">{alert.category}</Badge>
                    {alert.isResolved && <Badge variant="outline" className="gap-1 text-success"><CheckCircle2 className="h-3 w-3" /> Resolved</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{alert.description}</p>
                  <div className="mt-2 flex items-start gap-2 rounded-lg bg-primary/5 p-2">
                    <BrainCircuit className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <div>
                      <p className="text-xs text-foreground">{alert.recommendedAction}</p>
                      <p className="mt-1 text-[10px] text-primary">AI Confidence: {alert.aiConfidence}%</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatTimeAgo(alert.timestamp)}</span>
                    <span>Shipment: {alert.shipmentId}</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  {!alert.isRead && (
                    <Button size="sm" variant="ghost" onClick={() => markAlertRead(alert.id)} className="text-xs">Mark read</Button>
                  )}
                  {!alert.isResolved && (
                    <Button size="sm" variant="outline" onClick={() => resolveAlert(alert.id)} className="gap-1 text-xs">
                      <CheckCircle2 className="h-3 w-3" /> Resolve
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
