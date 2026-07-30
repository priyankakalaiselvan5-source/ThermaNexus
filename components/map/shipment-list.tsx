'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Truck, Thermometer, Gauge, Clock, Navigation, MapPin } from 'lucide-react';
import type { TruckState } from '@/lib/map-data';

interface ShipmentListProps {
  trucks: TruckState[];
  selectedTruckId: string | null;
  onSelectTruck: (id: string | null) => void;
}

const STATUS_STYLES: Record<string, string> = {
  safe: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  critical: 'bg-critical/10 text-critical border-critical/20',
};

export function ShipmentList({ trucks, selectedTruckId, onSelectTruck }: ShipmentListProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Truck className="h-4 w-4 text-primary" /> Active Shipments
          <Badge variant="outline" className="ml-auto bg-primary/10 text-primary">{trucks.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <div className="scrollbar-thin max-h-[calc(100vh-280px)] overflow-y-auto px-3 pb-3">
          <div className="space-y-2">
            {trucks.map(truck => (
              <button
                key={truck.id}
                onClick={() => onSelectTruck(selectedTruckId === truck.id ? null : truck.id)}
                className={cn(
                  'w-full rounded-xl border p-3 text-left transition-all',
                  selectedTruckId === truck.id
                    ? 'border-primary bg-primary/5 shadow-glow'
                    : 'border-border hover:bg-muted/30'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">{truck.shipmentId}</span>
                  <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize', STATUS_STYLES[truck.status])}>
                    {truck.status}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{truck.fromCity} → {truck.toCity}</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1.5 text-[10px]">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Thermometer className="h-3 w-3" /> {truck.temperature}°C
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Gauge className="h-3 w-3" /> {truck.speed}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" /> {truck.eta}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="text-[10px] font-medium text-foreground">{truck.vehicleNumber}</span>
                  <span className="text-[10px] text-muted-foreground">· {truck.driverName}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      truck.status === 'safe' ? 'bg-success' :
                      truck.status === 'warning' ? 'bg-warning' : 'bg-critical'
                    )}
                    style={{ width: `${Math.min(truck.progress * 100, 100)}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
