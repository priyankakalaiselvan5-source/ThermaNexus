'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceArea, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Thermometer, TrendingDown, TrendingUp, Activity, Snowflake } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Telemetry } from '@/types';

interface TemperatureChartProps {
  telemetry: Telemetry[];
  safeTempMin: number;
  safeTempMax: number;
  liveTemp?: number | null;
}

export function TemperatureChart({ telemetry, safeTempMin, safeTempMax, liveTemp }: TemperatureChartProps) {
  const data = telemetry.map(t => ({
    time: new Date(t.recorded_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    temp: Number(t.temperature),
  }));

  const temps = telemetry.map(t => Number(t.temperature));
  const minT = temps.length > 0 ? Math.min(...temps) : 0;
  const maxT = temps.length > 0 ? Math.max(...temps) : 0;
  const avgT = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 0;

  const violations = temps.filter(t => t < safeTempMin || t > safeTempMax).length;
  const coldChainStatus = temps.length === 0 ? 'NO DATA' : violations > 0 ? 'BROKEN' : 'MAINTAINED';
  const statusColor = coldChainStatus === 'MAINTAINED' ? 'text-success' : coldChainStatus === 'BROKEN' ? 'text-critical' : 'text-muted-foreground';
  const chainClass = coldChainStatus === 'MAINTAINED' ? 'Safe' : coldChainStatus === 'BROKEN' ? 'Critical' : 'No Data';

  if (telemetry.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-primary" /> Temperature History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-8 text-center">No temperature data recorded yet</p>
        </CardContent>
      </Card>
    );
  }

  const yMin = Math.floor(Math.min(minT, safeTempMin) - 2);
  const yMax = Math.ceil(Math.max(maxT, safeTempMax) + 2);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Thermometer className="h-4 w-4 text-primary" /> Temperature History
          {liveTemp !== null && liveTemp !== undefined && (
            <span className={cn('ml-auto text-sm font-bold', liveTemp >= safeTempMin && liveTemp <= safeTempMax ? 'text-success' : 'text-critical')}>
              {liveTemp.toFixed(1)}°C LIVE
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis domain={[yMin, yMax]} tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                formatter={(v: any) => [`${Number(v).toFixed(1)}°C`, 'Temperature']}
              />
              <ReferenceArea y1={safeTempMin} y2={safeTempMax} fill="#22c55e" fillOpacity={0.08} />
              <ReferenceLine y={safeTempMin} stroke="#22c55e" strokeDasharray="4 4" label={<span style={{ fontSize: 9, fill: '#22c55e' }}>Safe Min</span>} />
              <ReferenceLine y={safeTempMax} stroke="#ef4444" strokeDasharray="4 4" label={<span style={{ fontSize: 9, fill: '#ef4444' }}>Safe Max</span>} />
              <Line type="monotone" dataKey="temp" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatItem icon={TrendingDown} label="Min Temperature" value={`${minT.toFixed(1)}°C`} />
          <StatItem icon={TrendingUp} label="Max Temperature" value={`${maxT.toFixed(1)}°C`} />
          <StatItem icon={Activity} label="Avg Temperature" value={`${avgT.toFixed(1)}°C`} />
          <StatItem icon={Snowflake} label="Cold Chain Status" value={chainClass} valueClass={statusColor} />
        </div>
      </CardContent>
    </Card>
  );
}

function StatItem({ icon: Icon, label, value, valueClass }: { icon: any; label: string; value: string; valueClass?: string }) {
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
