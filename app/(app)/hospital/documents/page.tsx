'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { PageHeader, EmptyState } from '@/components/ui/page-components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, FileText, Download, Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchShipmentData, generateDocumentPdf, recordDownload, fetchDownloadHistory,
  type DocumentType, DOCUMENT_TYPE_LABELS, type DownloadHistoryRow,
} from '@/lib/hospital-documents';
import type { Shipment } from '@/types';

const DOC_TYPES: DocumentType[] = [
  'invoice', 'delivery_challan', 'packing_list', 'temperature_log',
  'compliance_certificate', 'quality_certificate', 'cold_chain_certificate',
];

const DOC_ICONS: Record<DocumentType, string> = {
  invoice: 'FileText',
  delivery_challan: 'FileText',
  packing_list: 'Package',
  temperature_log: 'Thermometer',
  compliance_certificate: 'ShieldCheck',
  quality_certificate: 'Award',
  cold_chain_certificate: 'Snowflake',
};

export default function HospitalDocumentsPage() {
  const { profile } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [history, setHistory] = useState<DownloadHistoryRow[]>([]);
  const [selectedShip, setSelectedShip] = useState<Shipment | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('shipments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) {
        setShipments(data as Shipment[]);
        if (data.length > 0) setSelectedShip(data[0] as Shipment);
      }
      setLoading(false);
      setHistory(await fetchDownloadHistory(profile?.name));
    }
    load();
  }, [profile?.name]);

  async function handleDownload(docType: DocumentType) {
    if (!selectedShip) {
      toast.error('Select a shipment first');
      return;
    }
    const key = `${selectedShip.id}-${docType}`;
    setGenerating(key);
    try {
      const data = await fetchShipmentData(selectedShip.id);
      if (!data) {
        toast.error('Could not load shipment data');
        return;
      }
      await generateDocumentPdf(data, docType);
      const fileName = `${DOCUMENT_TYPE_LABELS[docType].replace(/\s+/g, '_')}_${selectedShip.shipment_number}.pdf`;
      await recordDownload(selectedShip.id, fileName, docType, profile?.name || 'Hospital User');
      toast.success(`Downloaded: ${fileName}`);
      setHistory(await fetchDownloadHistory(profile?.name));
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate document');
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Generate and download hospital documents for any shipment"
        icon={FolderOpen}
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Package className="h-8 w-8 animate-pulse text-primary" />
        </div>
      ) : shipments.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No shipments" description="Documents will appear once shipments exist." />
      ) : (
        <>
          {/* Shipment selector */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <p className="text-sm font-medium text-muted-foreground">Select Shipment:</p>
                <select
                  value={selectedShip?.id || ''}
                  onChange={(e) => setSelectedShip(shipments.find(s => s.id === e.target.value) || null)}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  {shipments.map(s => (
                    <option key={s.id} value={s.id}>{s.shipment_number} — {s.medicine_name}</option>
                  ))}
                </select>
                {selectedShip && (
                  <Badge variant="outline" className="bg-primary/10 text-primary capitalize">
                    {selectedShip.status.replace(/_/g, ' ')}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {DOC_TYPES.map((docType) => {
              const key = `${selectedShip?.id || ''}-${docType}`;
              const isGenerating = generating === key;
              return (
                <Card key={docType}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{DOCUMENT_TYPE_LABELS[docType]}</p>
                          <p className="text-xs text-muted-foreground">Auto-generated PDF</p>
                        </div>
                      </div>
                    </div>
                    {selectedShip && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        For: <span className="font-medium text-foreground">{selectedShip.shipment_number}</span>
                      </p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full gap-2"
                      disabled={isGenerating || !selectedShip}
                      onClick={() => handleDownload(docType)}
                    >
                      {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      {isGenerating ? 'Generating...' : 'Download'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Download History</CardTitle>
                <p className="text-xs text-muted-foreground">Recently generated documents</p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="p-3 text-left font-medium">File Name</th>
                        <th className="p-3 text-left font-medium">Generated By</th>
                        <th className="p-3 text-left font-medium">Date</th>
                        <th className="p-3 text-left font-medium">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h) => (
                        <tr key={h.id} className="border-b border-border/50 last:border-0">
                          <td className="p-3 font-medium">{h.file_name}</td>
                          <td className="p-3 text-muted-foreground">{h.generated_by || '—'}</td>
                          <td className="p-3">{new Date(h.created_at).toLocaleString('en-IN')}</td>
                          <td className="p-3"><Badge variant="outline" className="capitalize">{h.file_type.replace(/_/g, ' ')}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
