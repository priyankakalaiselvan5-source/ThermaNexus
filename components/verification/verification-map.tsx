'use client';

import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Truck, Building2, CheckCircle2, AlertTriangle, Navigation } from 'lucide-react';
import { CITIES, CITY_MAP } from '@/lib/map-data';
import { cn } from '@/lib/utils';

interface VerificationMapProps {
  originCity?: string;
  destinationCity?: string;
  currentLat?: number;
  currentLng?: number;
  routeWaypoints?: [number, number][];
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestPointOnSegment(p: [number, number], a: [number, number], b: [number, number]): [number, number] {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return [ax + t * dx, ay + t * dy];
}

function distanceToRouteKm(point: [number, number], route: [number, number][]): number {
  let minDist = Infinity;
  for (let i = 0; i < route.length - 1; i++) {
    const nearest = nearestPointOnSegment(point, route[i], route[i + 1]);
    const d = haversineKm(point[0], point[1], nearest[0], nearest[1]);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

function makeIcon(html: string, size = 28) {
  return L.divIcon({ html, className: 'verify-marker', iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

export function VerificationMap({ originCity, destinationCity, currentLat, currentLng, routeWaypoints }: VerificationMapProps) {
  const { origin, dest, route, currentPos, deviation, deviationKm } = useMemo(() => {
    const o = originCity ? CITY_MAP[originCity] : null;
    const d = destinationCity ? CITY_MAP[destinationCity] : null;

    let wp: [number, number][] = routeWaypoints || [];
    if (wp.length === 0 && o && d) {
      wp = [[o.lat, o.lng], [d.lat, d.lng]];
    }

    const cp: [number, number] | null =
      currentLat !== undefined && currentLng !== undefined ? [currentLat, currentLng] : null;

    let dev = false;
    let devKm = 0;
    if (cp && wp.length >= 2) {
      devKm = distanceToRouteKm(cp, wp);
      dev = devKm > 50;
    }

    return { origin: o, dest: d, route: wp, currentPos: cp, deviation: dev, deviationKm: devKm };
  }, [originCity, destinationCity, currentLat, currentLng, routeWaypoints]);

  if (!origin && !dest) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> GPS Verification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-8 text-center">No GPS data available for this shipment</p>
        </CardContent>
      </Card>
    );
  }

  const center: [number, number] = currentPos || (origin ? [origin.lat, origin.lng] : dest ? [dest.lat, dest.lng] : [22.5, 80]);
  const hasRoute = route.length >= 2;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" /> GPS Verification
          {currentPos && (
            <span className={cn(
              'ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
              deviation ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
            )}>
              {deviation ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
              {deviation ? `Route Deviation (${deviationKm.toFixed(0)}km)` : 'Route On Track'}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full overflow-hidden rounded-xl border border-border">
          <MapContainer
            center={center}
            zoom={6}
            zoomControl={true}
            className="h-full w-full"
            style={{ background: '#e8edf2' }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
            {hasRoute && (
              <Polyline
                positions={route}
                pathOptions={{ color: '#3b82f6', weight: 3, opacity: 0.7, dashArray: '8 6' }}
              />
            )}
            {origin && (
              <Marker
                position={[origin.lat, origin.lng]}
                icon={makeIcon(`<div style="font-size:20px;">📦</div>`)}
              >
                <Popup>
                  <strong>Source: {origin.name}</strong><br />{origin.state}
                </Popup>
              </Marker>
            )}
            {dest && (
              <Marker
                position={[dest.lat, dest.lng]}
                icon={makeIcon(`<div style="font-size:20px;">🏥</div>`)}
              >
                <Popup>
                  <strong>Destination: {dest.name}</strong><br />{dest.state}
                </Popup>
              </Marker>
            )}
            {currentPos && (
              <Marker
                position={currentPos}
                icon={makeIcon(`<div style="font-size:20px;">🚛</div>`)}
                zIndexOffset={1000}
              >
                <Popup>
                  <strong>Current Vehicle Position</strong><br />
                  {currentPos[0].toFixed(4)}, {currentPos[1].toFixed(4)}<br />
                  {deviation ? `⚠ ${deviationKm.toFixed(0)}km off route` : '✓ On route'}
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <MapStat icon={Building2} label="Source" value={origin?.name || 'N/A'} />
          <MapStat icon={Building2} label="Destination" value={dest?.name || 'N/A'} />
          <MapStat icon={Truck} label="GPS Status" value={currentPos ? 'Active' : 'No Signal'} valueClass={currentPos ? 'text-success' : 'text-muted-foreground'} />
          <MapStat icon={Navigation} label="Route Status" value={deviation ? 'Deviation Detected' : hasRoute ? 'On Track' : 'No Route'} valueClass={deviation ? 'text-warning' : 'text-success'} />
        </div>
      </CardContent>
    </Card>
  );
}

function MapStat({ icon: Icon, label, value, valueClass }: { icon: any; label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className={cn('mt-1 text-sm font-medium', valueClass)}>{value}</p>
    </div>
  );
}
