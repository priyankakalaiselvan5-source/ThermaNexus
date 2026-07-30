'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { PageHeader, StatusBadge, EmptyState } from '@/components/ui/page-components';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle2, Package, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchShipmentData, generateTemperatureCertificatePdf, recordDownload,
} from '@/lib/hospital-documents';

export default function HospitalReceivedPage() {
  const { profile } = useAuth();
  const [received, setReceived] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('shipments')
        .select('*')
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false })
        .limit(20);
      setReceived(data || []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleDownloadCertificate(ship: any) {
    setGenerating(ship.id);
    try {
      const data = await fetchShipmentData(ship.id);
      if (!data) {
        toast.error('Could not load shipment data');
        return;
      }
      await generateTemperatureCertificatePdf(data);
      const fileName = `Temperature_Certificate_${ship.shipment_number}.pdf`;
      await recordDownload(ship.id, fileName, 'temperature_certificate', profile?.name || 'Hospital User');
      toast.success(`Certificate downloaded: ${fileName}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate certificate');
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Received Medicines"
        description="Shipments that have been delivered and accepted"
        icon={CheckCircle2}
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Package className="h-8 w-8 animate-pulse text-primary" />
        </div>
      ) : received.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No received shipments"
          description="Accepted shipments will appear here."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {received.map((ship) => (
            <Card key={ship.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{ship.shipment_number}</p>
                    <p className="text-sm text-muted-foreground">{ship.medicine_name}</p>
                  </div>
                  <StatusBadge status={ship.status} />
                </div>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <p>Batch: {ship.batch_number || 'N/A'}</p>
                  <p>Quantity: {ship.quantity} {ship.unit}</p>
                  <p>From: {ship.origin_city || 'N/A'}</p>
                  <p>Delivered: {ship.delivered_at ? new Date(ship.delivered_at).toLocaleDateString('en-IN') : 'N/A'}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full gap-2"
                  disabled={generating === ship.id}
                  onClick={() => handleDownloadCertificate(ship)}
                >
                  {generating === ship.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  {generating === ship.id ? 'Generating...' : 'Certificate'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
