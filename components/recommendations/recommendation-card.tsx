'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  PRIORITY_STYLES, TIER_STYLES, STATUS_STYLES, ACTION_TYPE_LABELS,
  type Recommendation,
} from '@/lib/recommendation-engine';
import {
  Zap, CheckCircle2, XCircle, Clock, Gauge, TrendingUp,
  ShieldCheck, AlertTriangle, Thermometer, Navigation,
} from 'lucide-react';

interface RecommendationCardProps {
  recommendation: Recommendation;
  onAccept: (id: string) => void;
  onIgnore: (id: string) => void;
  compact?: boolean;
}

export function RecommendationCard({ recommendation: rec, onAccept, onIgnore, compact }: RecommendationCardProps) {
  const tierStyle = TIER_STYLES[rec.tier];
  const priorityStyle = PRIORITY_STYLES[rec.priority];
  const statusStyle = STATUS_STYLES[rec.status];
  const isPending = rec.status === 'pending';
  const isCritical = rec.tier === 'critical';

  return (
    <Card className={cn(
      'border-l-4 transition-all',
      tierStyle.border,
      isCritical && isPending && 'animate-pulse',
    )} style={{
      borderLeftColor: rec.tier === 'critical' ? 'hsl(0 84% 60%)' : rec.tier === 'warning' ? 'hsl(38 92% 50%)' : 'hsl(142 71% 45%)',
    }}>
      <CardContent className={cn(compact ? 'p-3' : 'p-4')}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', tierStyle.bg, tierStyle.text)}>
              {rec.tier === 'safe' ? <ShieldCheck className="h-4 w-4" /> : rec.tier === 'warning' ? <AlertTriangle className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
            </div>
            <div>
              <p className={cn('font-bold text-foreground', compact ? 'text-xs' : 'text-sm')}>{rec.title}</p>
              <p className="text-[10px] text-muted-foreground">{rec.shipmentNumber} · {rec.vehicleNumber}</p>
            </div>
          </div>
          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold', priorityStyle.bg, priorityStyle.text)}>
            {priorityStyle.label}
          </span>
        </div>

        <p className={cn('mt-3 text-muted-foreground', compact ? 'text-[11px]' : 'text-xs')}>{rec.reason}</p>

        {!compact && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-border p-2">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Gauge className="h-3 w-3" /> Confidence
              </div>
              <p className="mt-0.5 font-bold text-primary">{rec.confidenceScore}%</p>
            </div>
            <div className="rounded-lg border border-border p-2">
              <div className="flex items-center gap-1 text-muted-foreground">
                <TrendingUp className="h-3 w-3" /> Expected Benefit
              </div>
              <p className="mt-0.5 text-[11px] font-medium text-foreground">{rec.expectedBenefit}</p>
            </div>
          </div>
        )}

        {!compact && (
          <div className={cn('mt-3 flex items-start gap-2 rounded-lg p-2.5', tierStyle.bg)}>
            <Navigation className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', tierStyle.text)} />
            <div>
              <p className={cn('text-[10px] font-semibold', tierStyle.text)}>Recommended Action · {ACTION_TYPE_LABELS[rec.actionType]}</p>
              <p className="text-xs text-foreground">{rec.recommendedAction}</p>
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', statusStyle.bg, statusStyle.text)}>
              {statusStyle.label}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-2.5 w-2.5" /> {new Date(rec.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {isPending ? (
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant={isCritical ? 'destructive' : 'default'} className="h-7 gap-1 text-xs" onClick={() => onAccept(rec.id)}>
                <CheckCircle2 className="h-3 w-3" /> Accept
              </Button>
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => onIgnore(rec.id)}>
                <XCircle className="h-3 w-3" /> Ignore
              </Button>
            </div>
          ) : rec.status === 'accepted' && (
            <Badge variant="outline" className="gap-1 text-xs text-primary">
              <CheckCircle2 className="h-3 w-3" /> Action active
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
