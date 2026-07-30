'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Warehouse, Building2, Boxes, CircleDot, Route } from 'lucide-react';

export function MapLegend() {
  const markers = [
    { label: 'Safe Shipment', color: '#22c55e' },
    { label: 'Warning Shipment', color: '#f59e0b' },
    { label: 'Critical Shipment', color: '#ef4444' },
    { label: 'Warehouse', color: '#3b82f6' },
    { label: 'Hospital', color: '#a855f7' },
    { label: 'Distribution Hub', color: '#1e293b' },
  ];

  const routes = [
    { label: 'Low Priority Route', color: '#64748b' },
    { label: 'Medium Priority Route', color: '#6366f1' },
    { label: 'High Priority Route', color: '#f59e0b' },
    { label: 'Critical Priority Route', color: '#ef4444' },
  ];

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Route className="h-4 w-4 text-primary" /> Map Legend
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Markers</p>
          <div className="space-y-2">
            {markers.map(m => (
              <div key={m.label} className="flex items-center gap-2.5">
                <span
                  className="h-3.5 w-3.5 rounded-full ring-2 ring-white shadow-sm"
                  style={{ background: m.color }}
                />
                <span className="text-xs text-foreground">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Routes</p>
          <div className="space-y-2">
            {routes.map(r => (
              <div key={r.label} className="flex items-center gap-2.5">
                <span className="flex w-7 items-center justify-center">
                  <span className="h-0.5 w-7 rounded-full" style={{ background: r.color }} />
                </span>
                <span className="text-xs text-foreground">{r.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-border pt-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Facility Types</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-[#a855f7]" /> Hospital</div>
            <div className="flex items-center gap-1.5"><Warehouse className="h-3.5 w-3.5 text-[#3b82f6]" /> Warehouse</div>
            <div className="flex items-center gap-1.5"><Boxes className="h-3.5 w-3.5 text-[#1e293b]" /> Hub</div>
            <div className="flex items-center gap-1.5"><CircleDot className="h-3.5 w-3.5 text-[#1e293b]" /> Center</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
