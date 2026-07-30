'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  RISK_LEVEL_STYLES, ROUTE_STATUS_STYLES, HAZARD_LABELS,
  type RiskAnalysisSummary, type ShipmentTelemetry,
} from '@/lib/risk-simulation';
import {
  BrainCircuit, Thermometer, Clock, Navigation, Gauge,
  TrendingUp, TrendingDown, Minus, ShieldCheck, Activity, Zap,
} from 'lucide-react';

interface RiskAnalysisPanelProps {
  analysis: RiskAnalysisSummary;
  telemetry: ShipmentTelemetry;
}

export function RiskAnalysisPanel({ analysis, telemetry }: RiskAnalysisPanelProps) {
  const riskStyle = RISK_LEVEL_STYLES[analysis.currentRiskLevel];
  const routeStyle = ROUTE_STATUS_STYLES[analysis.routeStatus];

  const TrendIcon = analysis.temperatureTrend === 'rising' ? TrendingUp
    : analysis.temperatureTrend === 'falling' ? TrendingDown : Minus;
  const trendColor = analysis.temperatureTrend === 'rising' ? 'text-critical'
    : analysis.temperatureTrend === 'falling' ? 'text-success' : 'text-muted-foreground';

  const isMedical = telemetry.cargoPriority === 'medical_priority';

  return (
    <Card className={cn('border-2', riskStyle.border)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BrainCircuit className="h-4 w-4 text-primary" /> AI Risk Analysis
          </CardTitle>
          <span className={cn('rounded-full border px-3 py-0.5 text-xs font-bold', riskStyle.bg, riskStyle.text, riskStyle.border)}>
            {riskStyle.label}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground">{analysis.shipmentId}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border p-3">
            <p className="text-[10px] text-muted-foreground">Risk Type</p>
            <p className="mt-0.5 text-xs font-semibold text-foreground">
              {analysis.riskType ? HAZARD_LABELS[analysis.riskType] : 'None Active'}
            </p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-[10px] text-muted-foreground">Severity</p>
            <p className="mt-0.5 text-xs font-semibold capitalize text-foreground">{analysis.severity}</p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Gauge className="h-2.5 w-2.5" /> Confidence</p>
            <p className="mt-0.5 text-sm font-bold text-primary">{analysis.confidence}%</p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> Est. Delay</p>
            <p className="mt-0.5 text-sm font-bold text-foreground">
              {analysis.estimatedDelayMin > 0 ? `+${analysis.estimatedDelayMin}m` : '0m'}
            </p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Thermometer className="h-2.5 w-2.5" /> Temp Trend</p>
            <p className={cn('mt-0.5 flex items-center gap-1 text-sm font-bold', trendColor)}>
              <TrendIcon className="h-3 w-3" /> {analysis.temperatureTrendValue}°C
            </p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Navigation className="h-2.5 w-2.5" /> Route Status</p>
            <span className={cn('mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold', routeStyle.bg, routeStyle.text)}>
              {routeStyle.label}
            </span>
          </div>
        </div>

        <div className={cn('rounded-xl p-3', riskStyle.bg)}>
          <div className="flex items-center gap-2">
            <Zap className={cn('h-4 w-4', riskStyle.text)} />
            <p className={cn('text-xs font-semibold', riskStyle.text)}>AI Recommendation</p>
          </div>
          <p className="mt-1 text-xs text-foreground">{analysis.aiRecommendation}</p>
        </div>

        {isMedical && (
          <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-2.5">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <p className="text-xs font-medium text-primary">
              Medical Priority Cargo: Safety + Speed optimized over distance
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Activity className="h-3 w-3" />
          <span>Analysis updated in real-time · Engine v2.1</span>
        </div>
      </CardContent>
    </Card>
  );
}
