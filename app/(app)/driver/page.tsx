'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { PageHeader, StatusBadge } from '@/components/ui/page-components';
import { KPICard } from '@/components/ui/kpi-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { toast } from 'sonner';
import {
  Truck, Package, CheckCircle2, Clock, Thermometer, Battery,
  MapPin, Wifi, Siren, QrCode, Navigation, Fuel, Gauge,
  DoorOpen, Droplets, Zap, Activity, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const DRIVER_SHIPMENT = {
  id: 'TNX-SHP-2025-003',
  medicine: 'Oxford-AstraZeneca Vaccine',
  pickup: 'Mumbai Cold Hub, Mumbai',
  destination: 'AIIMS Delhi, New Delhi',
  eta: '4h 22m',
  temp: 4.2,
  humidity: 45,
  door: 'Closed',
  battery: 78,
  speed: 62,
  fuel: 68,
  safeTempMin: 2,
  safeTempMax: 8,
};

const DRIVER_ALERTS = [
  { type: 'High Temperature', message: 'Temperature approaching 8°C limit', severity: 'warning', time: '5 min ago' },
  { type: 'Traffic Delay', message: 'NH48 congestion ahead - 15 min delay', severity: 'medium', time: '20 min ago' },
];

export default function DriverDashboard() {
  const { profile } = useAuth();
  const [shipments, setShipments] = useState<any[]>([]);
  const [sosActive, setSosActive] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('shipments')
        .select('*')
        .eq('status', 'in_transit')
        .order('created_at', { ascending: false })
        .limit(5);
      if (data) setShipments(data);
    }
    load();
  }, []);

  function triggerSOS() {
    setSosActive(true);
    toast.error('SOS triggered! Admin and dispatcher notified. Sharing GPS, temperature, and vehicle data.', {
      duration: 6000,
    });
    setTimeout(() => setSosActive(false), 5000);
  }

  return (
    <div className="space-y-4 pb-24">
      <PageHeader
        title="Driver Dashboard"
        description={`Welcome back, ${profile?.name?.split(' ')[0] || 'Driver'}`}
        icon={Truck}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPICard label="Today's Deliveries" value={3} icon={Package} variant="primary" />
        <KPICard label="Completed" value={2} icon={CheckCircle2} variant="success" />
        <KPICard label="Pending" value={1} icon={Clock} variant="warning" />
        <KPICard label="Deliveries" value={2} icon={CheckCircle2} variant="accent" />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPICard label="Current Temp" value={DRIVER_SHIPMENT.temp} decimals={1} suffix="°C" icon={Thermometer} variant="success" />
        <KPICard label="Battery" value={DRIVER_SHIPMENT.battery} suffix="%" icon={Battery} variant="primary" />
        <KPICard label="GPS Signal" value={98} suffix="%" icon={MapPin} variant="success" />
        <KPICard label="Network" value={4} suffix="G" icon={Wifi} variant="accent" />
      </div>

      <Card className="border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-success" /> Live Shipment
            </CardTitle>
            <p className="text-xs text-muted-foreground">Currently in transit</p>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary">In Transit</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl bg-secondary/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Shipment ID</p>
                <p className="font-bold text-foreground">{DRIVER_SHIPMENT.id}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Medicine</p>
                <p className="text-sm font-semibold">{DRIVER_SHIPMENT.medicine}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Pickup</span>
              </div>
              <p className="mt-1 text-sm font-medium">{DRIVER_SHIPMENT.pickup}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Destination</span>
              </div>
              <p className="mt-1 text-sm font-medium">{DRIVER_SHIPMENT.destination}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-primary/5 p-3 text-center">
              <Clock className="mx-auto h-5 w-5 text-primary" />
              <p className="mt-1 text-xs text-muted-foreground">ETA</p>
              <p className="text-sm font-bold">{DRIVER_SHIPMENT.eta}</p>
            </div>
            <div className="rounded-xl bg-success/5 p-3 text-center">
              <Thermometer className="mx-auto h-5 w-5 text-success" />
              <p className="mt-1 text-xs text-muted-foreground">Temp</p>
              <p className="text-sm font-bold">{DRIVER_SHIPMENT.temp}°C</p>
            </div>
            <div className="rounded-xl bg-accent/5 p-3 text-center">
              <Droplets className="mx-auto h-5 w-5 text-accent" />
              <p className="mt-1 text-xs text-muted-foreground">Humidity</p>
              <p className="text-sm font-bold">{DRIVER_SHIPMENT.humidity}%</p>
            </div>
            <div className="rounded-xl bg-primary/5 p-3 text-center">
              <Battery className="mx-auto h-5 w-5 text-primary" />
              <p className="mt-1 text-xs text-muted-foreground">Battery</p>
              <p className="text-sm font-bold">{DRIVER_SHIPMENT.battery}%</p>
            </div>
            <div className="rounded-xl bg-accent/5 p-3 text-center">
              <Gauge className="mx-auto h-5 w-5 text-accent" />
              <p className="mt-1 text-xs text-muted-foreground">Speed</p>
              <p className="text-sm font-bold">{DRIVER_SHIPMENT.speed} km/h</p>
            </div>
            <div className="rounded-xl bg-warning/5 p-3 text-center">
              <Fuel className="mx-auto h-5 w-5 text-warning" />
              <p className="mt-1 text-xs text-muted-foreground">Fuel</p>
              <p className="text-sm font-bold">{DRIVER_SHIPMENT.fuel}%</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <div className="flex items-center gap-2">
              <DoorOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Door Status</span>
            </div>
            <Badge variant="outline" className="bg-success/10 text-success">Closed</Badge>
          </div>

          <div className="flex gap-3">
            <Link href="/driver/navigation" className="flex-1">
              <Button className="w-full gap-2 gradient-primary text-white" size="lg">
                <Navigation className="h-5 w-5" /> Start Navigation
              </Button>
            </Link>
            <Link href="/driver/qr-scanner" className="flex-1">
              <Button variant="outline" size="lg" className="w-full gap-2">
                <QrCode className="h-5 w-5" /> Scan QR
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" /> Active Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {DRIVER_ALERTS.map((alert, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-border p-3">
              <div className={cn(
                'mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg',
                alert.severity === 'warning' ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'
              )}>
                <Zap className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{alert.type}</p>
                <p className="text-xs text-muted-foreground">{alert.message}</p>
                <p className="mt-1 text-[10px] text-muted-foreground/70">{alert.time}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <button
        onClick={triggerSOS}
        className={cn(
          'fixed bottom-6 right-6 z-40 flex h-16 w-16 items-center justify-center rounded-full shadow-premium-lg transition-all hover:scale-110 lg:bottom-8 lg:right-8',
          sosActive ? 'animate-pulse bg-destructive' : 'bg-critical'
        )}
        title="Emergency SOS"
      >
        <Siren className="h-7 w-7 text-white" />
        {!sosActive && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="absolute h-full w-full animate-ping rounded-full bg-critical opacity-75" />
          </span>
        )}
      </button>
    </div>
  );
}
