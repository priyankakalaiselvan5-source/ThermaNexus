'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BrainCircuit, ShieldCheck, Activity, Gauge, TrendingUp, AlertTriangle, CheckCircle2, Snowflake } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AIVerificationResult } from '@/lib/qr-verification';

interface AIVerificationProps {
  result: AIVerificationResult;
}

export function AIVerification({ result }: AIVerificationProps) {
  const healthColor =
    result.healthScore >= 85 ? 'text-success' :
    result.healthScore >= 60 ? 'text-warning' : 'text-critical';
  const healthBg =
    result.healthScore >= 85 ? 'bg-success/10 border-success/30' :
    result.healthScore >= 60 ? 'bg-warning/10 border-warning/30' : 'bg-critical/10 border-critical/30';
  const chainColor =
    result.coldChainStatus === 'safe' ? 'text-success' :
    result.coldChainStatus === 'warning' ? 'text-warning' : 'text-critical';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-primary" /> AI Verification
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Health Score */}
          <div className={cn('rounded-xl border-2 p-4 flex items-center gap-4', healthBg)}>
            <div className="relative h-16 w-16 shrink-0">
              <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-border" />
                <circle
                  cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3"
                  strokeDasharray={`${result.healthScore * 0.94} 94`}
                  strokeLinecap="round"
                  className={healthColor}
                />
              </svg>
              <span className={cn('absolute inset-0 flex items-center justify-center text-sm font-bold', healthColor)}>
                {result.healthScore}%
              </span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Shipment Health Score</p>
              <p className={cn('text-lg font-bold', healthColor)}>{result.healthScore >= 85 ? 'Excellent' : result.healthScore >= 60 ? 'Fair' : 'Poor'}</p>
            </div>
          </div>

          {/* AI Confidence */}
          <div className="rounded-xl border border-border p-4 flex items-center gap-4">
            <Gauge className={cn('h-10 w-10', result.aiConfidence >= 70 ? 'text-success' : 'text-warning')} />
            <div>
              <p className="text-xs text-muted-foreground">AI Confidence</p>
              <p className="text-lg font-bold">{result.aiConfidence}%</p>
            </div>
          </div>

          {/* Cold Chain Status */}
          <div className="rounded-xl border border-border p-4 flex items-center gap-4">
            <Snowflake className={cn('h-10 w-10', chainColor)} />
            <div>
              <p className="text-xs text-muted-foreground">Cold Chain Status</p>
              <p className={cn('text-lg font-bold capitalize', chainColor)}>{result.coldChainStatus}</p>
            </div>
          </div>

          {/* Overall Result */}
          <div className={cn('rounded-xl border-2 p-4 flex items-center gap-4', healthBg)}>
            {result.healthScore >= 85 ? <CheckCircle2 className={cn('h-10 w-10', healthColor)} /> : <AlertTriangle className={cn('h-10 w-10', healthColor)} />}
            <div>
              <p className="text-xs text-muted-foreground">AI Result</p>
              <p className={cn('text-lg font-bold', healthColor)}>{result.overallResult}</p>
            </div>
          </div>
        </div>

        {/* Analysis breakdown */}
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">AI Analysis Breakdown:</p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <AnalysisItem icon={Activity} label="Temperature Stability" value={`${result.tempStability}%`} good={result.tempStability >= 80} />
            <AnalysisItem icon={TrendingUp} label="Travel Delay" value={result.travelDelay} good={!result.travelDelay.toLowerCase().includes('delay')} />
            <AnalysisItem icon={ShieldCheck} label="Route Deviation" value={result.routeDeviation ? 'Detected' : 'None'} good={!result.routeDeviation} />
            <AnalysisItem icon={Gauge} label="Vehicle Delay" value={result.vehicleDelay} good={!result.vehicleDelay.toLowerCase().includes('delay')} />
          </div>
        </div>

        {/* Recommendation */}
        <div className={cn('mt-4 rounded-xl border p-4', healthBg)}>
          <div className="flex items-center gap-2">
            <BrainCircuit className={cn('h-5 w-5', healthColor)} />
            <p className={cn('text-sm font-bold', healthColor)}>AI Recommendation</p>
          </div>
          <p className="mt-1 text-sm text-foreground">{result.recommendation}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AnalysisItem({ icon: Icon, label, value, good }: { icon: any; label: string; value: string; good: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <span className={cn('text-xs font-medium', good ? 'text-success' : 'text-warning')}>{value}</span>
    </div>
  );
}
