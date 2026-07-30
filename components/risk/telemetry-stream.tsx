'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  WEATHER_ICONS, type ShipmentTelemetry, type WeatherCondition,
} from '@/lib/risk-simulation';
import {
  Thermometer, Droplets, Fuel, Battery, Gauge, MapPin,
  Sun, CloudRain, Droplets as Flood, Flame, Wind, CloudFog,
  Truck, Package, Navigation,
} from 'lucide-react';

const WEATHER_ICON_MAP: Record<string, any> = {
  Sun, CloudRain, Flood, Flame, Wind, CloudFog,
};

interface TelemetryRowProps {
  telemetry: ShipmentTelemetry;
  selected: boolean;
  onClick: () => void;
}

function WeatherBadge({ weather }: { weather: WeatherCondition }) {
  const Icon = WEATHER_ICON_MAP[WEATHER_ICONS[weather]] || Sun;
  const styles: Record<string, string> = {
    clear: 'bg-success/10 text-success',
    rain: 'bg-primary/10 text-primary',
    flood: 'bg-critical/10 text-critical',
    heatwave: 'bg-warning/10 text-warning',
    wind: 'bg-accent/10 text-accent',
    fog: 'bg-muted text-muted-foreground',
  };
  return (
    <span className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize', styles[weather])}>
      <Icon className="h-2.5 w-2.5" /> {weather}
    </span>
  );
}

export function TelemetryStream({ telemetry, selected, onClick }: TelemetryRowProps) {
  const tempSafe = telemetry.temperature >= telemetry.safeTempMin && telemetry.temperature <= telemetry.safeTempMax;
  const tempWarning = !tempSafe && telemetry.temperature > telemetry.safeTempMin - 1 && telemetry.temperature < telemetry.safeTempMax + 1;
  const tempColor = tempSafe ? 'text-success' : tempWarning ? 'text-warning' : 'text-critical';

  const fuelLow = telemetry.fuelLevel < 20;
  const coolingLow = telemetry.coolingEfficiency < 60;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full rounded-xl border p-3 text-left transition-all',
        selected ? 'border-primary bg-primary/5 shadow-glow' : 'border-border hover:bg-muted/30',
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-bold text-foreground">{telemetry.shipmentId}</span>
        </div>
        <WeatherBadge weather={telemetry.weather} />
      </div>

      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
        <Package className="h-2.5 w-2.5" /> {telemetry.cargoType}
      </div>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <MapPin className="h-2.5 w-2.5" /> {telemetry.routeFrom} → {telemetry.routeTo}
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 text-[10px]">
        <div>
          <span className="flex items-center gap-0.5 text-muted-foreground"><Thermometer className="h-2.5 w-2.5" /></span>
          <span className={cn('font-bold', tempColor)}>{telemetry.temperature}°C</span>
        </div>
        <div>
          <span className="flex items-center gap-0.5 text-muted-foreground"><Gauge className="h-2.5 w-2.5" /></span>
          <span className="font-bold text-foreground">{telemetry.speed}</span>
        </div>
        <div>
          <span className="flex items-center gap-0.5 text-muted-foreground"><Fuel className="h-2.5 w-2.5" /></span>
          <span className={cn('font-bold', fuelLow ? 'text-critical' : 'text-foreground')}>{telemetry.fuelLevel}%</span>
        </div>
        <div>
          <span className="flex items-center gap-0.5 text-muted-foreground"><Sun className="h-2.5 w-2.5" /></span>
          <span className={cn('font-bold', coolingLow ? 'text-critical' : 'text-foreground')}>{telemetry.coolingEfficiency}%</span>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Navigation className="h-2.5 w-2.5" /> ETA {Math.floor(telemetry.etaMinutes / 60)}h {telemetry.etaMinutes % 60}m
        </div>
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full', tempSafe ? 'bg-success' : tempWarning ? 'bg-warning' : 'bg-critical')}
            style={{ width: `${telemetry.progress * 100}%` }}
          />
        </div>
      </div>
    </button>
  );
}
