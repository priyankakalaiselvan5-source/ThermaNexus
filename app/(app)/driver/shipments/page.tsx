'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { PageHeader, StatusBadge, EmptyState } from '@/components/ui/page-components';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Truck, MapPin, Clock, Thermometer, QrCode } from 'lucide-react';
import Link from 'next/link';

export default function DriverShipmentsPage() {
  const { profile } = useAuth();
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('shipments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) setShipments(data);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Shipments"
        description="Your assigned deliveries"
        icon={Package}
      />

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl border border-border bg-muted/30" />
          ))}
        </div>
      ) : shipments.length === 0 ? (
        <EmptyState icon={Package} title="No shipments assigned" description="You will see your assigned deliveries here." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {shipments.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-foreground">{s.shipment_number}</p>
                    <p className="text-sm text-muted-foreground">{s.medicine_name}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{s.origin_city || 'N/A'}</span>
                    <span className="text-muted-foreground/40">→</span>
                    <span className="font-medium">{s.destination_city || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Thermometer className="h-3.5 w-3.5" /> {s.safe_temp_min}–{s.safe_temp_max}°C
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Package className="h-3.5 w-3.5" /> {s.quantity} {s.unit}
                    </span>
                  </div>
                </div>
                <Link href={{ pathname: '/driver/qr-scanner', query: { shipment: s.id } }} className="mt-3 block">
                  <Button variant="outline" size="sm" className="w-full gap-2">
                    <QrCode className="h-3.5 w-3.5" /> View QR Code
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
