'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, icon: Icon, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-11 w-11 items-center justify-center rounded-xl gradient-primary shadow-glow">
            <Icon className="h-5 w-5 text-white" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground lg:text-2xl">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const colors: Record<string, string> = {
    active: 'bg-success/10 text-success border-success/20',
    available: 'bg-success/10 text-success border-success/20',
    delivered: 'bg-success/10 text-success border-success/20',
    in_transit: 'bg-primary/10 text-primary border-primary/20',
    in_use: 'bg-primary/10 text-primary border-primary/20',
    on_duty: 'bg-primary/10 text-primary border-primary/20',
    dispatched: 'bg-primary/10 text-primary border-primary/20',
    pending: 'bg-muted text-muted-foreground border-border',
    packed: 'bg-muted text-muted-foreground border-border',
    loaded: 'bg-muted text-muted-foreground border-border',
    emergency: 'bg-critical/10 text-critical border-critical/20',
    breakdown: 'bg-critical/10 text-critical border-critical/20',
    critical: 'bg-critical/10 text-critical border-critical/20',
    failed: 'bg-destructive/10 text-destructive border-destructive/20',
    maintenance: 'bg-warning/10 text-warning border-warning/20',
    off_duty: 'bg-warning/10 text-warning border-warning/20',
    high: 'bg-warning/10 text-warning border-warning/20',
    moderate: 'bg-primary/10 text-primary border-primary/20',
    low: 'bg-success/10 text-success border-success/20',
    medium: 'bg-primary/10 text-primary border-primary/20',
    responding: 'bg-warning/10 text-warning border-warning/20',
    resolved: 'bg-success/10 text-success border-success/20',
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize',
      colors[status] || 'bg-muted text-muted-foreground border-border'
    )}>
      <span className={cn(
        'h-1.5 w-1.5 rounded-full',
        colors[status]?.includes('success') ? 'bg-success' :
        colors[status]?.includes('critical') || colors[status]?.includes('destructive') ? 'bg-critical' :
        colors[status]?.includes('warning') ? 'bg-warning' :
        colors[status]?.includes('primary') ? 'bg-primary' : 'bg-muted-foreground'
      )} />
      {label || status.replace(/_/g, ' ')}
    </span>
  );
}

export function LoadingCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-border bg-card p-6 animate-pulse', className)}>
      <div className="h-4 w-24 rounded bg-muted" />
      <div className="mt-3 h-8 w-32 rounded bg-muted" />
      <div className="mt-2 h-3 w-20 rounded bg-muted/70" />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="mt-4 text-sm font-semibold text-foreground">{title}</p>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
