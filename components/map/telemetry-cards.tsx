'use client';

import { KPICard } from '@/components/ui/kpi-card';
import { Package, Truck, CheckCircle2, Clock, Thermometer, Navigation } from 'lucide-react';
import type { TruckState } from '@/lib/map-data';

interface TelemetryCardsProps {
  trucks: TruckState[];
}

export function TelemetryCards({ trucks }: TelemetryCardsProps) {
  const activeShipments = trucks.filter(t => t.progress < 1).length;
  const vehiclesOnRoute = trucks.filter(t => t.speed > 0 && t.progress < 1).length;
  const completedToday = trucks.filter(t => t.progress >= 1).length + 12;
  const delayed = trucks.filter(t => t.status === 'critical' || t.status === 'warning').length;
  const avgTemp = trucks.length > 0
    ? Math.round((trucks.reduce((sum, t) => sum + t.temperature, 0) / trucks.length) * 10) / 10
    : 0;

  const validETAs = trucks.filter(t => t.eta !== 'Arrived');
  const avgETAMinutes = validETAs.length > 0
    ? validETAs.reduce((sum, t) => {
        const match = t.eta.match(/(\d+)h\s*(\d+)?/);
        if (match) {
          return sum + parseInt(match[1]) * 60 + (match[2] ? parseInt(match[2]) : 0);
        }
        return sum;
      }, 0) / validETAs.length
    : 0;
  const avgETAHours = Math.floor(avgETAMinutes / 60);
  const avgETAMins = Math.round(avgETAMinutes % 60);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      <KPICard label="Active Shipments" value={activeShipments} icon={Package} variant="primary" />
      <KPICard label="Vehicles on Route" value={vehiclesOnRoute} icon={Truck} variant="accent" />
      <KPICard label="Completed Today" value={completedToday} icon={CheckCircle2} variant="success" />
      <KPICard label="Delayed" value={delayed} icon={Clock} variant="warning" />
      <KPICard label="Avg Temperature" value={avgTemp} decimals={1} suffix="°C" icon={Thermometer} variant="success" />
      <KPICard label="Avg ETA" value={avgETAHours} suffix={`h ${avgETAMins}m`} icon={Navigation} variant="primary" />
    </div>
  );
}
