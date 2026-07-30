'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { PageHeader, StatusBadge, EmptyState } from '@/components/ui/page-components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, CheckCircle2, Loader2, Package } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea,
} from 'recharts';
import { toast } from 'sonner';
import {
  fetchShipmentData, generateTemperatureCertificatePdf, recordDownload, fetchDownloadHistory,
  type DownloadHistoryRow,
} from '@/lib/hospital-documents';
import type { Shipment, Telemetry } from '@/types';

interface CertRow {
  shipment: Shipment;
  telemetry: Telemetry[];
  status: string;
  verified: string;
}

export default function HospitalCertificatesPage() {
  const { profile } = useAuth();
  const [certs, setCerts] = useState<CertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [history, setHistory] = useState<DownloadHistoryRow[]>([]);
  const [selectedShip, setSelectedShip] = useState<Shipment | null>(null);
  const [selectedTelemetry, setSelectedTelemetry] = useState<Telemetry[]>([]);

  useEffect(() => {
    async function load() {
      const { data: ships } = await supabase
        .from('shipments')
        .select('*')
        .in('status', ['delivered', 'in_transit', 'dispatched'])
        .order('created_at', { ascending: false })
        .limit(20);
      if (!ships || ships.length === 0) {
        setLoading(false);
        return;
      }
      const shipIds = ships.map(s => s.id);
      const { data: tele } = await supabase
        .from('shipment_telemetry')
        .select('*')
        .in('shipment_id', shipIds)
        .order('recorded_at', { ascending: true });

      const teleMap: Record<string, Telemetry[]> = {};
      (tele || []).forEach((t: Telemetry) => {
        if (!teleMap[t.shipment_id]) teleMap[t.shipment_id] = [];
        teleMap[t.shipment_id].push(t);
      });

      const certRows: CertRow[] = ships.map(s => {
        const t = teleMap[s.id] || [];
        const temps = t.map(x => Number(x.temperature));
        const hasViolation = temps.some(v => v < Number(s.safe_temp_min) || v > Number(s.safe_temp_max));
        return {
          shipment: s as Shipment,
          telemetry: t,
          status: t.length === 0 ? 'pending' : hasViolation ? 'warning' : 'active',
          verified: t.length === 0 ? 'pending' : hasViolation ? 'pending' : 'verified',
        };
      });
      setCerts(certRows);
      if (certRows.length > 0) {
        setSelectedShip(certRows[0].shipment);
        setSelectedTelemetry(certRows[0].telemetry);
      }
      setLoading(false);
      setHistory(await fetchDownloadHistory(profile?.name));
    }
    load();
  }, [profile?.name]);

  async function handleDownloadCert(ship: Shipment) {
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
      setHistory(await fetchDownloadHistory(profile?.name));
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate certificate');
    } finally {
      setGenerating(null);
    }
  }

  const tempGraph = selectedTelemetry.slice(-12).map(t => ({
    time: new Date(t.recorded_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    temp: Number(t.temperature),
  }));

  const temps = selectedTelemetry.map(t => Number(t.temperature));
  const minTemp = temps.length > 0 ? Math.min(...temps).toFixed(1) : '—';
  const maxTemp = temps.length > 0 ? Math.max(...temps).toFixed(1) : '—';
  const avgTemp = temps.length > 0 ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(2) : '—';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Temperature Certificates"
        description="Generate and download compliance certificates for received shipments"
        icon={FileText}
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Package className="h-8 w-8 animate-pulse text-primary" />
        </div>
      ) : certs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No certificates available"
          description="Certificates will appear here once shipments are delivered."
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {certs.map((cert) => (
              <Card key={cert.shipment.id} className="cursor-pointer hover:shadow-premium-lg transition-shadow" onClick={() => { setSelectedShip(cert.shipment); setSelectedTelemetry(cert.telemetry); }}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{cert.shipment.shipment_number}</CardTitle>
                      <p className="text-xs text-muted-foreground">{cert.shipment.medicine_name}</p>
                    </div>
                    <StatusBadge status={cert.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-xs text-muted-foreground">Batch</p><p className="font-medium">{cert.shipment.batch_number || 'N/A'}</p></div>
                    <div><p className="text-xs text-muted-foreground">Issued</p><p className="font-medium">{new Date(cert.shipment.created_at).toLocaleDateString('en-IN')}</p></div>
                    <div><p className="text-xs text-muted-foreground">Verification</p><Badge variant="outline" className={cert.verified === 'verified' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}>{cert.verified}</Badge></div>
                    <div><p className="text-xs text-muted-foreground">Readings</p><p className="font-medium">{cert.telemetry.length}</p></div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    disabled={generating === cert.shipment.id}
                    onClick={(e) => { e.stopPropagation(); handleDownloadCert(cert.shipment); }}
                  >
                    {generating === cert.shipment.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    {generating === cert.shipment.id ? 'Generating...' : 'Download PDF'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedShip && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Certificate Preview — {selectedShip.shipment_number}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                  <div><p className="text-xs text-muted-foreground">Shipment ID</p><p className="font-medium">{selectedShip.shipment_number}</p></div>
                  <div><p className="text-xs text-muted-foreground">Batch</p><p className="font-medium">{selectedShip.batch_number || 'N/A'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Product</p><p className="font-medium">{selectedShip.medicine_name}</p></div>
                  <div><p className="text-xs text-muted-foreground">Source</p><p className="font-medium">{selectedShip.origin_city || 'N/A'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Destination</p><p className="font-medium">{selectedShip.destination_city || 'N/A'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Max Temp</p><p className="font-medium text-success">{maxTemp}°C</p></div>
                  <div><p className="text-xs text-muted-foreground">Min Temp</p><p className="font-medium text-success">{minTemp}°C</p></div>
                  <div><p className="text-xs text-muted-foreground">Avg Temp</p><p className="font-medium">{avgTemp}°C</p></div>
                </div>

                {tempGraph.length > 0 ? (
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={tempGraph}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} domain={[2, 8]} />
                        <Tooltip />
                        <ReferenceArea y1={2} y2={8} fill="success" fillOpacity={0.05} />
                        <Line type="monotone" dataKey="temp" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No temperature data available for preview</p>
                )}

                <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 p-3">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <div>
                    <p className="text-sm font-semibold text-success">
                      Cold-Chain Status: {selectedTelemetry.length === 0 ? 'No Data' : temps.some(t => t < Number(selectedShip.safe_temp_min) || t > Number(selectedShip.safe_temp_max)) ? 'BREACH' : 'SAFE'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedTelemetry.length > 0 ? `Average temp: ${avgTemp}°C · ${selectedTelemetry.length} readings` : 'No telemetry recorded'}
                    </p>
                  </div>
                </div>

                <Button
                  className="w-full gap-2 gradient-primary text-white"
                  disabled={generating === selectedShip.id}
                  onClick={() => handleDownloadCert(selectedShip)}
                >
                  {generating === selectedShip.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {generating === selectedShip.id ? 'Generating...' : 'Download Full Certificate (PDF)'}
                </Button>
              </CardContent>
            </Card>
          )}

          {history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Download History</CardTitle>
                <p className="text-xs text-muted-foreground">Recently generated certificates</p>
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
