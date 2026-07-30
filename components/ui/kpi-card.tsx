'use client';

import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { AnimatedCounter } from './animated-counter';

interface KPICardProps {
  label: string;
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  variant?: 'default' | 'success' | 'warning' | 'critical' | 'primary' | 'accent';
  sparkline?: number[];
}

const VARIANTS = {
  default: 'bg-card text-foreground border-border',
  success: 'bg-success/5 border-success/20',
  warning: 'bg-warning/5 border-warning/20',
  critical: 'bg-critical/5 border-critical/20',
  primary: 'bg-primary/5 border-primary/20',
  accent: 'bg-accent/5 border-accent/20',
};

const ICON_COLORS = {
  default: 'bg-muted text-muted-foreground',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  critical: 'bg-critical/10 text-critical',
  primary: 'bg-primary/10 text-primary',
  accent: 'bg-accent/10 text-accent',
};

export function KPICard({
  label, value, decimals = 0, prefix, suffix, icon: Icon, trend, trendLabel,
  variant = 'default', sparkline,
}: KPICardProps) {
  return (
    <div className={cn(
      'group relative overflow-hidden rounded-2xl border p-4 transition-all hover:shadow-premium-lg animate-fade-in',
      VARIANTS[variant]
    )}>
      <div className="flex items-start justify-between">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110', ICON_COLORS[variant])}>
          <Icon className="h-5 w-5" />
        </div>
        {trend !== undefined && (
          <div className={cn(
            'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
            trend >= 0 ? 'bg-success/10 text-success' : 'bg-critical/10 text-critical'
          )}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold tracking-tight text-foreground">
          <AnimatedCounter value={value} decimals={decimals} prefix={prefix} suffix={suffix} />
        </p>
        <p className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</p>
        {trendLabel && <p className="mt-1 text-[10px] text-muted-foreground/70">{trendLabel}</p>}
      </div>
      {sparkline && sparkline.length > 1 && (
        <div className="mt-2 flex h-8 items-end gap-0.5">
          {sparkline.map((v, i) => (
            <div
              key={i}
              className={cn(
                'flex-1 rounded-sm transition-all',
                variant === 'success' ? 'bg-success/30' :
                variant === 'warning' ? 'bg-warning/30' :
                variant === 'critical' ? 'bg-critical/30' :
                variant === 'primary' ? 'bg-primary/30' :
                variant === 'accent' ? 'bg-accent/30' : 'bg-muted-foreground/20'
              )}
              style={{ height: `${(v / Math.max(...sparkline)) * 100}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
