'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  HAZARD_LABELS, SEVERITY_STYLES, ROUTE_STATUS_STYLES,
  type RiskEventResponse,
} from '@/lib/risk-simulation';
import {
  AlertTriangle, MapPin, Clock, Thermometer, TrendingUp,
  Gauge, Navigation, X, BrainCircuit, Zap,
} from 'lucide-react';

interface RiskEventCardProps {
  event: RiskEventResponse;
  onDismiss: (eventId: string, shipmentId: string) => void;
}

export function RiskEventCard({ event, onDismiss }: RiskEventCardProps) {
  const sevStyle = SEVERITY_STYLES[event.severity];
  const routeStyle = ROUTE_STATUS_STYLES[event.rerouteStatus];

  return (
    <Card className={cn(
      'border-l-4 transition-all',
      sevStyle.border,
      event.severity === 'critical' && 'animate-pulse',
    )} style={{ borderLeftColor: event.severity === 'critical' ? 'hsl(0 84% 60%)' : event.severity === 'high' ? 'hsl(38 92% 50%)' : event.severity === 'medium' ? 'hsl(246 80% 62%)' : 'hsl(142 71% 45%)' }}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', sevStyle.bg, sevStyle.text)}>
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{HAZARD_LABELS[event.hazardType]}</p>
              <p className="text-[10px] text-muted-foreground">{event.shipmentId}</p>
            </div>
          </div>
          <button onClick={() => onDismiss(event.id, event.shipmentId)} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className={cn('mt-3 rounded-lg p-2.5', sevStyle.bg)}>
          <p className={cn('text-xs font-semibold', sevStyle.text)}>{event.warningNotification}</p>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">{event.riskExplanation}</p>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-border p-2">
            <div className="flex items-center gap-1 text-muted-foreground">
              <BrainCircuit className="h-3 w-3" /> Confidence
            </div>
            <p className="mt-0.5 font-bold text-foreground">{event.confidenceScore}%</p>
          </div>
          <div className="rounded-lg border border-border p-2">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" /> Est. Delay
            </div>
            <p className="mt-0.5 font-bold text-foreground">{event.predictedDelayMin > 0 ? `+${event.predictedDelayMin}m` : 'None'}</p>
          </div>
          <div className="rounded-lg border border-border p-2">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Thermometer className="h-3 w-3" /> Temp Delta
            </div>
            <p className={cn('mt-0.5 font-bold', event.predictedTempDelta > 1 ? 'text-critical' : event.predictedTempDelta > 0 ? 'text-warning' : 'text-success')}>
              {event.predictedTempDelta > 0 ? '+' : ''}{event.predictedTempDelta}°C
            </p>
          </div>
          <div className="rounded-lg border border-border p-2">
            <div className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="h-3 w-3" /> Spoilage Risk
            </div>
            <p className={cn('mt-0.5 font-bold', event.spoilageRiskPct > 50 ? 'text-critical' : event.spoilageRiskPct > 20 ? 'text-warning' : 'text-success')}>
              {event.spoilageRiskPct}%
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-lg bg-primary/5 p-2.5">
          <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <div>
            <p className="text-[10px] font-semibold text-primary">AI Recommended Action</p>
            <p className="text-xs text-foreground">{event.recommendedAction}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', sevStyle.bg, sevStyle.text, sevStyle.border)}>
              {event.severity}
            </span>
            <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', routeStyle.bg, routeStyle.text)}>
              <Navigation className="mr-1 inline h-2.5 w-2.5" />{routeStyle.label}
            </span>
          </div>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <MapPin className="h-2.5 w-2.5" /> {event.location}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
