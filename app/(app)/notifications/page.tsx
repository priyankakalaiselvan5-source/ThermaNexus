'use client';

import { useState } from 'react';
import { PageHeader, StatusBadge } from '@/components/ui/page-components';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotifications, type NotificationType } from '@/hooks/use-notifications';
import {
  Bell, BellRing, Mail, Smartphone, MessageSquare, Send,
  CheckCircle2, Clock, AlertTriangle, Activity, Thermometer,
  CloudRain, TrafficCone, Snowflake, BrainCircuit, Package,
  CheckCheck, QrCode, ShieldCheck, Boxes, Truck, Building2,
  Warehouse, Navigation, Siren, User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPE_ICONS: Record<string, any> = {
  Thermometer,
  CloudRain,
  TrafficCone,
  Snowflake,
  BrainCircuit,
  Package,
  AlertTriangle,
  QrCode,
  ShieldCheck,
  Boxes,
  CheckCircle2,
  Truck,
  Building2,
  Warehouse,
  Navigation,
  Siren,
  User,
};

const TYPE_LABELS: Record<NotificationType, string> = {
  temperature_warning: 'Temperature',
  traffic_detected: 'Traffic',
  weather_alert: 'Weather',
  cooling_failure: 'Cooling',
  ai_reroute: 'AI Reroute',
  warehouse_recommendation: 'Warehouse',
  shipment_delivered: 'Delivered',
  shipment_created: 'Shipment',
  vehicle_added: 'Vehicle',
  driver_added: 'Driver',
  hospital_added: 'Hospital',
  warehouse_added: 'Warehouse',
  route_changed: 'Route',
  sos_triggered: 'SOS',
  delivery_completed: 'Delivery',
  shipment_verified: 'Verified',
  certificate_verified: 'Certificate',
  inventory_updated: 'Inventory',
  ai_recommendation_available: 'AI Rec',
  shipment_received: 'Received',
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

export default function NotificationsPage() {
  const { notifications, unreadCount, markNotificationRead, markAllRead } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'critical') return n.severity === 'critical';
    return true;
  });

  const stats = {
    total: notifications.length,
    unread: unreadCount,
    critical: notifications.filter(n => n.severity === 'critical').length,
    delivered: notifications.filter(n => n.type === 'shipment_delivered').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Real-time system notifications across all channels"
        icon={Bell}
        action={
          <Button variant="outline" size="sm" className="gap-2" onClick={markAllRead} disabled={unreadCount === 0}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Total', value: stats.total, icon: Bell, color: 'text-primary bg-primary/10' },
          { label: 'Unread', value: stats.unread, icon: BellRing, color: 'text-warning bg-warning/10' },
          { label: 'Critical', value: stats.critical, icon: AlertTriangle, color: 'text-critical bg-critical/10' },
          { label: 'Delivered', value: stats.delivered, icon: Package, color: 'text-success bg-success/10' },
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

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread {unreadCount > 0 && `(${unreadCount})`}</TabsTrigger>
          <TabsTrigger value="critical">Critical</TabsTrigger>
        </TabsList>
        <TabsContent value={filter} className="mt-4 space-y-2">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="mx-auto h-10 w-10 text-muted-foreground/30" />
                <p className="mt-3 text-sm text-muted-foreground">No notifications in this category</p>
              </CardContent>
            </Card>
          ) : filtered.map((n) => {
            const Icon = TYPE_ICONS[n.icon] || Bell;
            return (
              <Card key={n.id} className={cn(!n.read && 'border-primary/20', n.severity === 'critical' && 'border-l-4 border-l-critical')} >
                <CardContent
                  className="flex items-start gap-3 p-4 cursor-pointer"
                  onClick={() => markNotificationRead(n.id)}
                >
                  <div className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                    n.severity === 'critical' ? 'bg-critical/10 text-critical' :
                    n.severity === 'warning' ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{n.title}</p>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                    {n.data?.warehouseName && (
                      <div className="mt-2 flex items-center gap-2 rounded-lg bg-accent/5 p-2">
                        <Snowflake className="h-3.5 w-3.5 text-accent" />
                        <span className="text-xs text-foreground">{n.data.warehouseName} · {n.data.distanceKm} km · ETA {n.data.etaMin} min</span>
                      </div>
                    )}
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{TYPE_LABELS[n.type]}</Badge>
                      <StatusBadge status={n.severity === 'critical' ? 'critical' : n.severity === 'warning' ? 'high' : 'medium'} />
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" /> {formatTimeAgo(n.timestamp)}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">{n.shipmentId}</span>
                    </div>
                  </div>
                  {!n.read && (
                    <Button size="sm" variant="ghost" className="shrink-0 text-xs" onClick={(e) => { e.stopPropagation(); markNotificationRead(n.id); }}>
                      Mark read
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
