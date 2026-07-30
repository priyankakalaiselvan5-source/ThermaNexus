'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { PageHeader, StatusBadge, EmptyState } from '@/components/ui/page-components';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Package, QrCode, CheckCircle2, XCircle, Thermometer, MapPin,
  Clock, Truck, FileText, Download, Loader2, ShieldCheck, ArrowRight,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  fetchShipmentData, generateShipmentReportPdf, recordDownload,
} from '@/lib/hospital-documents';
import { buildQrPayload, encodeQrPayload, receiveShipment } from '@/lib/qr-verification';
import type { Shipment, Telemetry } from '@/types';

export default function IncomingShipmentsPage() {
  const { profile } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [telemetryMap, setTelemetryMap] = useState<Record<string, Telemetry[]>>({});
  const [vehicleMap, setVehicleMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Shipment | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: ships } = await supabase
        .from('shipments')
        .select('*')
        .in('status', ['pending', 'dispatched', 'in_transit', 'emergency'])
        .order('created_at', { ascending: false })
        .limit(30);
      if (!ships || ships.length === 0) {
        setLoading(false);
        return;
      }
      const shipIds = ships.map(s => s.id);
      const vehicleIds = ships.map(s => s.vehicle_id).filter(Boolean) as string[];

      const [teleRes, vehicleRes] = await Promise.all([
        supabase.from('shipment_telemetry').select('*').in('shipment_id', shipIds).order('recorded_at', { ascending: true }),
        vehicleIds.length > 0 ? supabase.from('vehicles').select('id,registration_number').in('id', vehicleIds) : Promise.resolve({ data: [] }),
      ]);

      const tMap: Record<string, Telemetry[]> = {};
      (teleRes.data || []).forEach((t: Telemetry) => {
        if (!tMap[t.shipment_id]) tMap[t.shipment_id] = [];
        tMap[t.shipment_id].push(t);
      });
      setTelemetryMap(tMap);

      const vMap: Record<string, string> = {};
      (vehicleRes.data || []).forEach((v: any) => { vMap[v.id] = v.registration_number; });
      setVehicleMap(vMap);

      setShipments(ships as Shipment[]);
      setLoading(false);
    }
    load();
  }, []);

  async function acceptShipment(ship: Shipment) {
    try {
      const receiverName = profile?.name || 'Hospital User';
      const result = await receiveShipment(ship.id, receiverName, (profile as any)?.hospital_id || undefined);
      if (!result.success) throw new Error(result.error || 'Failed to receive shipment');

      toast.success(`Shipment ${ship.shipment_number} accepted successfully — delivery certificate generated`);
      setShipments(prev => prev.filter(s => s.id !== ship.id));
      setSelected(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept shipment');
    }
  }

  function rejectShipment(ship: Shipment) {
    toast.error(`Shipment ${ship.shipment_number} rejected`);
    setSelected(null);
  }

  async function handleDownloadReport(ship: Shipment) {
    setGenerating(ship.id);
    try {
      const data = await fetchShipmentData(ship.id);
      if (!data) {
        toast.error('Could not load shipment data');
        return;
      }
      await generateShipmentReportPdf(data);
      const fileName = `ThermaNexus_Report_${ship.shipment_number}.pdf`;
      await recordDownload(ship.id, fileName, 'report', profile?.name || 'Hospital User');
      toast.success(`Report downloaded: ${fileName}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate report');
    } finally {
      setGenerating(null);
    }
  }

  function getQrValue(ship: Shipment): string {
    const payload = buildQrPayload(ship, vehicleMap[ship.vehicle_id || ''], ship.qr_code || undefined);
    return encodeQrPayload(payload);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incoming Shipments"
        description="Track and verify shipments en route to your hospital"
        icon={Package}
        action={
          <Link href="/hospital/verify">
            <Button className="gap-2 gradient-primary text-white">
              <QrCode className="h-4 w-4" /> Scan QR
            </Button>
          </Link>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Package className="h-8 w-8 animate-pulse text-primary" />
        </div>
      ) : shipments.length === 0 ? (
        <EmptyState icon={Package} title="No incoming shipments" description="All shipments have been delivered." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shipment ID</TableHead>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>ETA</TableHead>
                  <TableHead>Temp</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipments.map((s) => {
                  const tele = telemetryMap[s.id] || [];
                  const lastTemp = tele.length > 0 ? Number(tele[tele.length - 1].temperature) : null;
                  return (
                    <TableRow
                      key={s.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelected(s)}
                    >
                      <TableCell className="font-medium">{s.shipment_number}</TableCell>
                      <TableCell>{s.medicine_name}</TableCell>
                      <TableCell className="text-muted-foreground">{s.batch_number || 'N/A'}</TableCell>
                      <TableCell>{s.quantity} {s.unit}</TableCell>
                      <TableCell>{s.origin_city || 'N/A'}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-xs">
                          <Clock className="h-3 w-3" /> {s.eta ? new Date(s.eta).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {lastTemp !== null ? (
                          <span className={cn('flex items-center gap-1 text-xs', lastTemp <= s.safe_temp_max ? 'text-success' : 'text-critical')}>
                            <Thermometer className="h-3 w-3" /> {lastTemp}°C
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell><StatusBadge status={s.risk_level} /></TableCell>
                      <TableCell><StatusBadge status={s.status} /></TableCell>
                      <TableCell className="text-right">
                        <Link href={`/hospital/verify?shipment=${encodeURIComponent(s.shipment_number)}`}>
                          <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                            <QrCode className="h-3.5 w-3.5" /> Verify
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-md overflow-y-auto bg-background border-l border-border">
            <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">{selected.shipment_number}</h3>
                <p className="text-xs text-muted-foreground">{selected.medicine_name}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Close</Button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Batch</p><p className="font-medium">{selected.batch_number || 'N/A'}</p></div>
                <div><p className="text-xs text-muted-foreground">Quantity</p><p className="font-medium">{selected.quantity} {selected.unit}</p></div>
                <div><p className="text-xs text-muted-foreground">Source</p><p className="font-medium">{selected.origin_city || 'N/A'}</p></div>
                <div><p className="text-xs text-muted-foreground">Destination</p><p className="font-medium">{selected.destination_city || 'N/A'}</p></div>
                <div><p className="text-xs text-muted-foreground">ETA</p><p className="font-medium">{selected.eta ? new Date(selected.eta).toLocaleString('en-IN') : 'N/A'}</p></div>
                <div><p className="text-xs text-muted-foreground">Safe Range</p><p className="font-medium">{selected.safe_temp_min}–{selected.safe_temp_max}°C</p></div>
              </div>

              {/* Real QR Code */}
              <div className="flex flex-col items-center gap-3 rounded-xl border border-border p-4">
                <div className="rounded-xl bg-white p-3">
                  <QRCodeSVG value={getQrValue(selected)} size={160} level="M" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-foreground">Shipment QR Code</p>
                  <p className="text-[10px] text-muted-foreground">Scan to verify shipment authenticity</p>
                </div>
                <Link href={`/hospital/verify?shipment=${encodeURIComponent(selected.shipment_number)}`} className="w-full">
                  <Button className="w-full gap-2 gradient-primary text-white">
                    <ShieldCheck className="h-4 w-4" /> Open Verification Page
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              {(() => {
                const tele = telemetryMap[selected.id] || [];
                const lastTemp = tele.length > 0 ? Number(tele[tele.length - 1].temperature) : null;
                const isSafe = lastTemp !== null && lastTemp <= selected.safe_temp_max && lastTemp >= selected.safe_temp_min;
                return (
                  <div className={cn(
                    'rounded-xl border p-4',
                    isSafe ? 'border-success/30 bg-success/5' : lastTemp === null ? 'border-border bg-secondary/30' : 'border-critical/30 bg-critical/5'
                  )}>
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <Thermometer className="h-4 w-4" /> Cold-Chain Status: {isSafe ? 'SAFE' : lastTemp === null ? 'NO DATA' : 'BREACH'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {lastTemp !== null ? `Current temperature: ${lastTemp}°C | Safe range: ${selected.safe_temp_min}–${selected.safe_temp_max}°C` : 'No telemetry recorded yet'}
                    </p>
                  </div>
                );
              })()}

              <div className="space-y-2">
                <p className="text-sm font-semibold">Shipment Actions</p>
                <Button className="w-full gap-2 gradient-primary text-white" onClick={() => acceptShipment(selected)}>
                  <CheckCircle2 className="h-4 w-4" /> Accept Shipment
                </Button>
                <Button className="w-full gap-2" variant="outline" onClick={() => rejectShipment(selected)}>
                  <XCircle className="h-4 w-4 text-critical" /> Reject Shipment
                </Button>
                <Button
                  className="w-full gap-2"
                  variant="outline"
                  disabled={generating === selected.id}
                  onClick={() => handleDownloadReport(selected)}
                >
                  {generating === selected.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {generating === selected.id ? 'Generating...' : 'Download Report (PDF)'}
                </Button>
                <Link href="/hospital/certificates" className="block">
                  <Button className="w-full gap-2" variant="ghost">
                    <FileText className="h-4 w-4" /> View Temperature Certificate
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
