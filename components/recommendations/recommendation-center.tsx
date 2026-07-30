'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  TIER_STYLES, STATUS_STYLES,
  type Recommendation,
} from '@/lib/recommendation-engine';
import { RecommendationCard } from '@/components/recommendations/recommendation-card';
import {
  BrainCircuit, Zap, AlertTriangle, ShieldCheck, ChevronRight,
  MapPin, Truck,
} from 'lucide-react';

interface RecommendationCenterProps {
  recommendations: Recommendation[];
  onAccept: (id: string) => void;
  onIgnore: (id: string) => void;
  onSelect: (rec: Recommendation) => void;
  selectedId?: string;
}

type FilterType = 'all' | 'critical' | 'warning' | 'pending' | 'accepted';

const FILTERS: { label: string; value: FilterType }[] = [
  { label: 'All', value: 'all' },
  { label: 'Critical', value: 'critical' },
  { label: 'Warning', value: 'warning' },
  { label: 'Pending', value: 'pending' },
  { label: 'Accepted', value: 'accepted' },
];

export function RecommendationCenter({ recommendations, onAccept, onIgnore, onSelect, selectedId }: RecommendationCenterProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  const filtered = recommendations.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'pending') return r.status === 'pending';
    if (filter === 'accepted') return r.status === 'accepted';
    return r.tier === filter;
  });

  const stats = {
    total: recommendations.length,
    pending: recommendations.filter(r => r.status === 'pending').length,
    critical: recommendations.filter(r => r.tier === 'critical' && r.status === 'pending').length,
    accepted: recommendations.filter(r => r.status === 'accepted').length,
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm">
            <BrainCircuit className="h-4 w-4 text-primary" /> AI Recommendation Center
          </CardTitle>
          <p className="text-xs text-muted-foreground">{stats.pending} pending · {stats.critical} critical</p>
        </div>
        <Badge className="gradient-primary text-white gap-1">
          <Zap className="h-3 w-3" /> Engine v2.1
        </Badge>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-all',
                filter === f.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted/30'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="max-h-[500px] space-y-2 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success/10">
                <ShieldCheck className="h-6 w-6 text-success" />
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">All Clear</p>
              <p className="text-xs text-muted-foreground">No recommendations in this category</p>
            </div>
          ) : (
            filtered.map(rec => {
              const tierStyle = TIER_STYLES[rec.tier];
              const statusStyle = STATUS_STYLES[rec.status];
              return (
                <button
                  key={rec.id}
                  onClick={() => onSelect(rec)}
                  className={cn(
                    'w-full rounded-xl border p-3 text-left transition-all',
                    selectedId === rec.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30',
                    rec.tier === 'critical' && rec.status === 'pending' && 'border-l-4',
                  )}
                  style={rec.tier === 'critical' && rec.status === 'pending' ? { borderLeftColor: 'hsl(0 84% 60%)' } : undefined}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', tierStyle.bg, tierStyle.text)}>
                        {rec.tier === 'safe' ? <ShieldCheck className="h-3.5 w-3.5" /> : rec.tier === 'warning' ? <AlertTriangle className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">{rec.shipmentNumber}</p>
                        <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Truck className="h-2.5 w-2.5" /> {rec.vehicleNumber} · <MapPin className="h-2.5 w-2.5" /> {rec.currentCity}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={cn('rounded-full border px-2 py-0.5 text-[9px] font-bold', tierStyle.bg, tierStyle.text)}>
                        {tierStyle.label}
                      </span>
                      <span className={cn('rounded-full border px-1.5 py-0.5 text-[9px] font-semibold', statusStyle.bg, statusStyle.text)}>
                        {statusStyle.label}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-[11px] text-muted-foreground">{rec.recommendedAction}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-primary">{rec.confidenceScore}% confidence</span>
                    <span className="flex items-center gap-0.5 text-[10px] text-primary">
                      Details <ChevronRight className="h-2.5 w-2.5" />
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
