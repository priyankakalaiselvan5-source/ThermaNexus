'use client';

import dynamic from 'next/dynamic';
import { useDriverNavigation } from '@/hooks/use-driver-navigation';
import { PageHeader } from '@/components/ui/page-components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Navigation, MapPin, Truck, Clock, Gauge, Fuel,
  AlertTriangle, Loader2, Package, BrainCircuit, Route as RouteIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DriverMap = dynamic(
  () => import('@/components/map/driver-map').then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-secondary/30">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading navigation map...</p>
        </div>
      </div>
    ),
  },
);

const TRAFFIC_CONFIG = {
  clear: { label: 'Clear', color: 'text-success', bg: 'bg-success/10', icon: null },
  moderate: { label: 'Moderate', color: 'text-warning', bg: 'bg-warning/10', icon: AlertTriangle },
  heavy: { label: 'Heavy', color: 'text-critical', bg: 'bg-critical/10', icon: AlertTriangle },
};

export default function DriverNavigationPage() {
  const nav = useDriverNavigation();

  if (nav.loading) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="GPS Navigation"
          description="Route to destination hospital"
          icon={Navigation}
        />
        <Card>
          <CardContent className="flex items-center justify-center gap-3 py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading your active shipment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (nav.error) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="GPS Navigation"
          description="Route to destination hospital"
          icon={Navigation}
        />
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium">{nav.error}</p>
            <p className="text-xs text-muted-foreground">
              You need an active shipment assigned to you to use navigation.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const traffic = TRAFFIC_CONFIG[nav.trafficStatus];

  return (
    <div className="space-y-4">
      <PageHeader
        title="GPS Navigation"
        description="Route to destination hospital"
        icon={Navigation}
        action={
          <div className="flex items-center gap-2">
            {nav.isRerouted && (
              <Badge className="gap-1.5 bg-indigo-500 text-white">
                <BrainCircuit className="h-3 w-3" /> Route Updated by AI
              </Badge>
            )}
            <Badge variant="outline" className="gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
              Live
            </Badge>
          </div>
        }
      />

      {/* AI Reroute banner */}
      {nav.routeUpdatedByAI && (
        <Card className="border-2 border-indigo-500/40 bg-indigo-500/5">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
              <BrainCircuit className="h-5 w-5 text-indigo-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-indigo-500">Route Updated by AI</p>
              <p className="text-xs text-muted-foreground">
                {nav.rerouteReason || 'AI has optimized your route for faster delivery. New route is now active.'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => window.location.reload()}
            >
              Acknowledge
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Map */}
        <Card className="lg:col-span-2 overflow-hidden">
          <CardContent className="p-0">
            <div className="relative h-[400px] lg:h-[500px]">
              <DriverMap
                currentPosition={nav.currentPosition}
                destination={nav.destination}
                destinationName={nav.destinationName}
                routeWaypoints={nav.routeWaypoints}
                isRerouted={nav.isRerouted}
                speed={nav.speed}
              />
              {/* Overlay badges on map */}
              <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-2">
                <Badge className="gradient-primary text-white">
                  <Truck className="mr-1 h-3 w-3" /> In Transit
                </Badge>
                <Badge variant="outline" className="bg-card">
                  <Clock className="mr-1 h-3 w-3" /> ETA: {nav.etaMinutes > 0 ? `${Math.floor(nav.etaMinutes / 60)}h ${nav.etaMinutes % 60}m` : '—'}
                </Badge>
                {nav.isRerouted && (
                  <Badge className="bg-indigo-500 text-white">
                    <BrainCircuit className="mr-1 h-3 w-3" /> AI Rerouted
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Route info panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Route Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Shipment */}
              <div className="rounded-xl bg-primary/5 p-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Shipment</span>
                </div>
                <p className="mt-1 text-sm font-medium">{nav.shipmentNumber}</p>
                <p className="text-xs text-muted-foreground">{nav.medicineName}</p>
              </div>

              {/* Current location */}
              <div className="rounded-xl bg-secondary/50 p-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-success" />
                  <span className="text-xs text-muted-foreground">Current Location</span>
                </div>
                <p className="mt-1 text-sm font-medium">
                  {nav.currentPosition[0].toFixed(4)}° N, {nav.currentPosition[1].toFixed(4)}° E
                </p>
                <p className="text-xs text-muted-foreground">Near {nav.originCity}</p>
              </div>

              {/* Destination */}
              <div className="rounded-xl bg-primary/5 p-3">
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Destination</span>
                </div>
                <p className="mt-1 text-sm font-medium">{nav.destinationName}</p>
                <p className="text-xs text-muted-foreground">{nav.destinationCity}</p>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border p-3 text-center">
                  <Gauge className="mx-auto h-5 w-5 text-accent" />
                  <p className="mt-1 text-xs text-muted-foreground">Speed</p>
                  <p className="font-bold">{nav.speed} km/h</p>
                </div>
                <div className="rounded-xl border border-border p-3 text-center">
                  <Clock className="mx-auto h-5 w-5 text-primary" />
                  <p className="mt-1 text-xs text-muted-foreground">ETA</p>
                  <p className="font-bold">{nav.etaMinutes > 0 ? `${Math.floor(nav.etaMinutes / 60)}h ${nav.etaMinutes % 60}m` : '—'}</p>
                </div>
                <div className="rounded-xl border border-border p-3 text-center">
                  <RouteIcon className="mx-auto h-5 w-5 text-success" />
                  <p className="mt-1 text-xs text-muted-foreground">Distance</p>
                  <p className="font-bold">{nav.distanceRemainingKm > 0 ? `${nav.distanceRemainingKm} km` : '—'}</p>
                </div>
                <div className="rounded-xl border border-border p-3 text-center">
                  <Fuel className="mx-auto h-5 w-5 text-warning" />
                  <p className="mt-1 text-xs text-muted-foreground">Progress</p>
                  <p className="font-bold">{Math.round(nav.progress * 100)}%</p>
                </div>
              </div>

              {/* Traffic status */}
              <div className={cn('rounded-xl p-3', traffic.bg)}>
                <div className="flex items-center gap-2">
                  {traffic.icon && <traffic.icon className={cn('h-4 w-4', traffic.color)} />}
                  <span className="text-xs font-semibold text-muted-foreground">Traffic Status</span>
                </div>
                <p className={cn('mt-1 text-sm font-bold', traffic.color)}>{traffic.label}</p>
                {nav.trafficStatus === 'heavy' && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Heavy congestion detected on route. AI may suggest an alternate route.
                  </p>
                )}
                {nav.trafficStatus === 'moderate' && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Some traffic ahead. Expect minor delays.
                  </p>
                )}
                {nav.trafficStatus === 'clear' && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Road conditions are clear. Smooth driving.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Button className="w-full gap-2 gradient-primary text-white" size="lg">
            <Navigation className="h-5 w-5" /> Open Turn-by-Turn Navigation
          </Button>
        </div>
      </div>
    </div>
  );
}
