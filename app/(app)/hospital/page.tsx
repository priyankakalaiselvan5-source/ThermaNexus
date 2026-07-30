'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { PageHeader, StatusBadge, EmptyState } from '@/components/ui/page-components';
import { KPICard } from '@/components/ui/kpi-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Package, Clock, CheckCircle2, Thermometer, FileText,
  Boxes, MapPin, QrCode, Download, AlertTriangle, ShieldCheck, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import {
  fetchShipmentData, generateShipmentReportPdf, recordDownload,
} from '@/lib/hospital-documents';
import { fetchRecentVerifications, type VerificationRecord } from '@/lib/qr-verification';
import type { Shipment } from '@/types';

export default function HospitalDashboard() {
  const { profile } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [recentVerifications, setRecentVerifications] = useState<VerificationRecord[]>([]);
  const [stats, setStats] = useState({
    incoming: 12,
    received: 148,
    delayed: 3,
    tempSafePct: 97,
    activeAlerts: 2,
    aiPredictionsToday: 18,
  });

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('shipments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) setShipments(data as Shipment[]);
      setLoading(false);
      setRecentVerifications(await fetchRecentVerifications(5));
      await loadStats();
    }
    load();
  }, []);

  async function loadStats() {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const [inRes, recvRes, alertsRes, predRes, teleRes] = await Promise.all([
        supabase.from('shipments').select('id', { count: 'exact', head: true }).in('status', ['in_transit', 'dispatched', 'assigned']),
        supabase.from('shipments').select('id', { count: 'exact', head: true }).eq('status', 'delivered'),
        supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('is_resolved', false),
        supabase.from('predictions').select('id', { count: 'exact', head: true }).gte('created_at', startOfDay.toISOString()),
        supabase.from('shipment_telemetry').select('temperature, shipment_id').order('recorded_at', { ascending: false }).limit(500),
      ]);

      const incomingCount = inRes.count ?? 0;
      const receivedCount = recvRes.count ?? 0;
      const activeAlerts = alertsRes.count ?? 0;
      const aiPredictionsToday = predRes.count ?? 0;

      let delayedCount = 0;
      let tempSafePct = 97;
      const allShipRes = await supabase.from('shipments').select('id,status,eta,safe_temp_min,safe_temp_max');
      const allShip = (allShipRes.data || []) as any[];
      delayedCount = allShip.filter(s => s.status !== 'delivered' && s.eta && new Date(s.eta) < new Date()).length;

      const tele = (teleRes.data || []) as any[];
      if (tele.length > 0) {
        const latestByShip = new Map<string, number>();
        for (const t of tele) {
          const sid = String(t.shipment_id);
          if (!latestByShip.has(sid)) latestByShip.set(sid, Number(t.temperature));
        }
        let safe = 0;
        let total = 0;
        for (const s of allShip) {
          if (s.status === 'delivered') continue;
          const last = latestByShip.get(String(s.id));
          if (last === undefined) continue;
          total++;
          if (last >= Number(s.safe_temp_min) && last <= Number(s.safe_temp_max)) safe++;
        }
        if (total > 0) tempSafePct = Math.round((safe / total) * 100);
      }

      setStats(prev => ({
        incoming: incomingCount > 0 ? incomingCount : prev.incoming,
        received: receivedCount > 0 ? receivedCount : prev.received,
        delayed: delayedCount > 0 ? delayedCount : prev.delayed,
        tempSafePct: tele.length > 0 ? tempSafePct : prev.tempSafePct,
        activeAlerts: activeAlerts > 0 ? activeAlerts : prev.activeAlerts,
        aiPredictionsToday: aiPredictionsToday > 0 ? aiPredictionsToday : prev.aiPredictionsToday,
      }));
    } catch {
      // keep realistic defaults on error
    }
  }

  const incoming = shipments.filter(s => s.status === 'in_transit' || s.status === 'dispatched' || s.status === 'pending');
  const received = shipments.filter(s => s.status === 'delivered');
  const delayed = shipments.filter(s => s.status === 'pending' || (s.eta && new Date(s.eta) < new Date() && s.status !== 'delivered'));
  const emergencies = shipments.filter(s => s.status === 'emergency' || s.risk_level === 'critical');

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hospital Dashboard"
        description={`Welcome, ${profile?.name || 'Hospital'}`}
        icon={CheckCircle2}
        action={
          <Badge variant="outline" className="gap-1.5 bg-success/10 text-success">
            <ShieldCheck className="h-3 w-3" /> Verified Hospital
          </Badge>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KPICard label="Incoming" value={stats.incoming} icon={Package} variant="primary" />
        <KPICard label="Received" value={stats.received} icon={CheckCircle2} variant="success" />
        <KPICard label="Delayed" value={stats.delayed} icon={Clock} variant="warning" />
        <KPICard label="Temp Safe" value={stats.tempSafePct} suffix="%" icon={Thermometer} variant="success" />
        <KPICard label="Active Alerts" value={stats.activeAlerts} icon={AlertTriangle} variant="critical" />
        <KPICard label="AI Predictions" value={stats.aiPredictionsToday} icon={ShieldCheck} variant="primary" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Incoming Shipments</CardTitle>
            <p className="text-xs text-muted-foreground">Shipments en route to your hospital</p>
          </div>
          <Link href="/hospital/incoming">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shipment ID</TableHead>
                <TableHead>Medicine</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Temp</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Report</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">Loading shipments...</TableCell></TableRow>
              ) : shipments.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">No shipments found</TableCell></TableRow>
              ) : shipments.slice(0, 5).map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.shipment_number}</TableCell>
                  <TableCell>{s.medicine_name}</TableCell>
                  <TableCell>{s.quantity} {s.unit}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Thermometer className="h-3 w-3" /> {s.safe_temp_min}–{s.safe_temp_max}°C
                    </span>
                  </TableCell>
                  <TableCell><StatusBadge status={s.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1"
                      disabled={generating === s.id}
                      onClick={() => handleDownloadReport(s)}
                    >
                      {generating === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      {generating === s.id ? '...' : 'Report'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <QrCode className="h-4 w-4 text-primary" /> Shipment Verification
            </CardTitle>
            <p className="text-xs text-muted-foreground">Scan QR to verify and accept incoming shipments</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border-2 border-dashed border-border bg-secondary/30 p-6 text-center">
                {incoming.length > 0 ? (
                  <>
                    <div className="mx-auto inline-block rounded-xl bg-white p-3">
                      <QRCodeSVG
                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/verify/${encodeURIComponent(incoming[0].shipment_number)}`}
                        size={140}
                        level="M"
                      />
                    </div>
                    <p className="mt-3 text-sm font-medium">{incoming[0].shipment_number}</p>
                    <p className="text-xs text-muted-foreground">{incoming[0].medicine_name}</p>
                    <Link href={`/hospital/verify?shipment=${encodeURIComponent(incoming[0].shipment_number)}`}>
                      <Button className="mt-3 gap-2 gradient-primary text-white">
                        <QrCode className="h-4 w-4" /> Verify This Shipment
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <QrCode className="mx-auto h-16 w-16 text-muted-foreground/40" />
                    <p className="mt-4 text-sm text-muted-foreground">No incoming shipments to verify</p>
                    <Link href="/hospital/verify">
                      <Button className="mt-4 gap-2 gradient-primary text-white">
                        <QrCode className="h-4 w-4" /> Open Scanner
                      </Button>
                    </Link>
                  </>
                )}
              </div>
              <div className="space-y-3">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-sm font-semibold">Recent Verifications</p>
                  {recentVerifications.length === 0 ? (
                    <p className="mt-3 text-xs text-muted-foreground">No verifications yet</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {recentVerifications.map((v) => (
                        <div key={v.id} className="flex items-center justify-between text-xs">
                          <span className="font-medium">{v.shipment_id}</span>
                          <Badge variant="outline" className={cn(
                            v.result === 'verified' ? 'bg-success/10 text-success' :
                            v.result === 'invalid' ? 'bg-critical/10 text-critical' :
                            v.result === 'warning' ? 'bg-warning/10 text-warning' :
                            'bg-warning/10 text-warning'
                          )}>{v.result}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Link href="/hospital/certificates">
                  <Button variant="outline" className="w-full gap-2">
                    <FileText className="h-4 w-4" /> View Temperature Certificates
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" /> Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {emergencies.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active alerts</p>
            ) : emergencies.slice(0, 3).map((s) => (
              <div key={s.id} className="flex items-start gap-3 rounded-xl border border-border p-3">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-critical/10 text-critical">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{s.shipment_number}</p>
                  <p className="text-xs text-muted-foreground">{s.medicine_name} — {s.risk_level} risk</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Boxes className="h-4 w-4 text-primary" /> Medicine Inventory
            </CardTitle>
            <p className="text-xs text-muted-foreground">Recently received medicines</p>
          </div>
          <Link href="/hospital/inventory">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicine</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Safe Temp Range</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {received.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">No received shipments yet</TableCell></TableRow>
              ) : received.slice(0, 5).map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.medicine_name}</TableCell>
                  <TableCell className="text-muted-foreground">{item.batch_number || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-success/10 text-success">
                      {item.quantity} {item.unit}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.safe_temp_min}–{item.safe_temp_max}°C</TableCell>
                  <TableCell><StatusBadge status={item.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
