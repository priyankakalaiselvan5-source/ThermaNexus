'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { PageHeader, StatusBadge, EmptyState } from '@/components/ui/page-components';
import { Card, CardContent } from '@/components/ui/card';
import { History, Package, MapPin, Thermometer, CheckCircle2 } from 'lucide-react';

export default function DriverHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('shipments')
        .select('*')
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false })
        .limit(20);
      if (data) setHistory(data);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Delivery History"
        description="Your completed deliveries"
        icon={History}
      />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-border bg-muted/30" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <EmptyState icon={History} title="No delivery history" description="Your completed deliveries will appear here." />
      ) : (
        <div className="space-y-3">
          {history.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{s.shipment_number}</p>
                      <p className="text-sm text-muted-foreground">{s.medicine_name}</p>
                    </div>
                  </div>
                  <StatusBadge status="delivered" label="Delivered" />
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> {s.origin_city} → {s.destination_city}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5" /> {s.quantity} {s.unit}
                  </span>
                  {s.delivered_at && (
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {new Date(s.delivered_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
