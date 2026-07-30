'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  type DecisionHistoryEntry,
} from '@/lib/recommendation-engine';
import {
  History, CheckCircle2, XCircle, BrainCircuit, Clock,
} from 'lucide-react';

interface DecisionHistoryProps {
  history: DecisionHistoryEntry[];
  maxItems?: number;
}

export function DecisionHistory({ history, maxItems = 20 }: DecisionHistoryProps) {
  const items = history.slice(0, maxItems);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <History className="h-4 w-4 text-primary" /> AI Decision History
        </CardTitle>
        <p className="text-xs text-muted-foreground">Audit trail of predictions, actions & outcomes</p>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <BrainCircuit className="h-8 w-8 text-muted-foreground/30" />
            <p className="mt-3 text-xs text-muted-foreground">No decisions recorded yet</p>
            <p className="text-[10px] text-muted-foreground/70">Accept or ignore recommendations to build history</p>
          </div>
        ) : (
          <div className="max-h-[400px] space-y-2 overflow-y-auto pr-1">
            {items.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-border p-3 transition-colors hover:bg-muted/20">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-lg',
                      entry.operatorAction === 'accepted' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    )}>
                      {entry.operatorAction === 'accepted' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{entry.shipmentNumber}</p>
                      <p className="text-[10px] text-muted-foreground">{entry.prediction}</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" /> {new Date(entry.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="mt-2 space-y-1.5 text-[10px]">
                  <div className="flex gap-1.5">
                    <span className="shrink-0 font-semibold text-warning">Risk:</span>
                    <span className="text-muted-foreground">{entry.riskDetected}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <span className="shrink-0 font-semibold text-primary">Rec:</span>
                    <span className="text-muted-foreground">{entry.recommendationGenerated}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <span className="shrink-0 font-semibold text-success">Outcome:</span>
                    <span className="text-foreground">{entry.finalOutcome}</span>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <Badge variant="outline" className={cn(
                    'text-[9px]',
                    entry.operatorAction === 'accepted' ? 'border-primary/20 text-primary' : 'text-muted-foreground'
                  )}>
                    {entry.operatorAction === 'accepted' ? 'Accepted' : 'Ignored'}
                  </Badge>
                  <span className="text-[10px] font-semibold text-primary">{entry.confidenceScore}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
