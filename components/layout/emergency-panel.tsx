'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/use-notifications';
import { Siren, Snowflake, Clock, Navigation, Phone, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EmergencyPanel() {
  const { emergency, transferToColdStorage, dismissEmergency } = useNotifications();
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!emergency) {
      setCountdown(0);
      return;
    }
    setCountdown(emergency.breachCountdownSec);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [emergency]);

  if (!emergency) return null;

  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;
  const isUrgent = countdown < 300;
  const wh = emergency.recommendedWarehouse;

  return (
    <Card className={cn(
      'border-2 overflow-hidden',
      isUrgent ? 'border-critical animate-pulse' : 'border-critical/50',
    )}>
      <div className="bg-critical/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-critical/10">
              <Siren className="h-5 w-5 text-critical animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground flex items-center gap-2">
                Emergency Mode Active
                <span className="rounded-full bg-critical px-2 py-0.5 text-[10px] font-bold text-white">CRITICAL</span>
              </p>
              <p className="text-xs text-muted-foreground">{emergency.shipmentId} — {emergency.reason}</p>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={dismissEmergency} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <CardContent className="p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-critical/20 bg-critical/5 p-4">
            <div className="flex items-center gap-2 text-critical">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-semibold">Predicted Temperature Breach</span>
            </div>
            <p className={cn(
              'mt-2 font-bold tabular-nums',
              isUrgent ? 'text-3xl text-critical animate-pulse' : 'text-3xl text-foreground',
            )}>
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isUrgent ? 'IMMEDIATE action required' : 'Time remaining before cargo spoilage'}
            </p>
          </div>

          {wh && (
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
              <div className="flex items-center gap-2 text-accent">
                <Snowflake className="h-4 w-4" />
                <span className="text-xs font-semibold">Recommended Cold Storage</span>
              </div>
              <p className="mt-2 text-sm font-bold text-foreground">{wh.name}</p>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5"><Navigation className="h-3 w-3" /> {emergency.warehouseDistanceKm} km away · ETA {emergency.warehouseEtaMin} min</p>
                <p className="flex items-center gap-1.5"><Snowflake className="h-3 w-3" /> Temp: {wh.currentTemp}°C · {wh.availablePct}% available</p>
                <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {wh.phone}</p>
              </div>
            </div>
          )}
        </div>

        {wh && (
          <div className="mt-4">
            <Button
              className="w-full gap-2 gradient-primary text-white"
              size="lg"
              onClick={transferToColdStorage}
            >
              <Snowflake className="h-5 w-5" /> Transfer to Cold Storage
            </Button>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              Initiates cargo transfer protocol and dispatches backup vehicle to {wh.name}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
