export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('en-IN').format(n);
}

export function formatPercent(n: number | null | undefined, decimals = 1): string {
  if (n === null || n === undefined) return '—';
  return `${n.toFixed(decimals)}%`;
}

export function formatTemp(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return `${n.toFixed(1)}°C`;
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(date: string | null | undefined): string {
  if (!date) return '—';
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}

export function getRiskColor(level: string): string {
  switch (level) {
    case 'critical': return 'text-critical bg-critical/10 border-critical/20';
    case 'high': return 'text-warning bg-warning/10 border-warning/20';
    case 'moderate': return 'text-primary bg-primary/10 border-primary/20';
    case 'low': return 'text-success bg-success/10 border-success/20';
    default: return 'text-muted-foreground bg-muted';
  }
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'text-critical bg-critical/10 border-critical/20';
    case 'high': return 'text-warning bg-warning/10 border-warning/20';
    case 'medium': return 'text-primary bg-primary/10 border-primary/20';
    case 'low': return 'text-success bg-success/10 border-success/20';
    default: return 'text-muted-foreground bg-muted';
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'delivered': case 'active': case 'available': return 'text-success bg-success/10 border-success/20';
    case 'in_transit': case 'in_use': case 'on_duty': case 'dispatched': return 'text-primary bg-primary/10 border-primary/20';
    case 'pending': case 'packed': case 'loaded': return 'text-muted-foreground bg-muted';
    case 'emergency': case 'breakdown': return 'text-critical bg-critical/10 border-critical/20';
    case 'maintenance': case 'off_duty': return 'text-warning bg-warning/10 border-warning/20';
    case 'failed': return 'text-destructive bg-destructive/10 border-destructive/20';
    default: return 'text-muted-foreground bg-muted';
  }
}
