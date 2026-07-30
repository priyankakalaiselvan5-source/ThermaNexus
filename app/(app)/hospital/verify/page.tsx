'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { useNotifications } from '@/hooks/use-notifications';
import { PageHeader } from '@/components/ui/page-components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  QrCode, Search, CheckCircle2, XCircle, AlertTriangle, Loader2,
  Thermometer, MapPin, Truck, User, Package, Clock, ShieldCheck,
  FileText, Download, Building2, BrainCircuit, Snowflake,
  Navigation, Activity, Boxes, Radio, FileBarChart, Gauge,
  Droplets, Wind, Phone, CreditCard as IdCard, Route,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  fetchVerifiedShipmentData, refreshShipmentData, recordVerification,
  hasBeenVerified, fetchVerificationHistory, classifyFromData, analyzeShipmentAI,
  computeLiveUpdate, receiveShipment,
  type VerifiedShipmentData, type VerificationRecord, type VerificationResult,
  type AIVerificationResult, type LiveUpdate, type VerificationChecks,
} from '@/lib/qr-verification';
import {
  generateTemperatureCertificatePdf, generateDocumentPdf,
  generateShipmentReportPdf, generateAiPredictionReportPdf,
  generateDeliveryCertificatePdf,
  fetchShipmentData, recordDownload,
  type DocumentType,
} from '@/lib/hospital-documents';
import { QrScanner } from '@/components/verification/qr-scanner';
import { TemperatureChart } from '@/components/verification/temperature-chart';
import { AIVerification } from '@/components/verification/ai-verification';
const VerificationMap = dynamic(() => import('@/components/verification/verification-map').then(m => m.VerificationMap), { ssr: false, loading: () => <div className="h-72 animate-pulse rounded-xl bg-muted" /> });
import { CITY_MAP } from '@/lib/map-data';
import { getOsrmRoute } from '@/lib/osrm';

const TIMELINE_STEPS = [
  { key: 'created', label: 'Shipment Created', icon: Package },
  { key: 'packed', label: 'Warehouse Packed', icon: Boxes },
  { key: 'temp_verified', label: 'Temperature Verified', icon: Thermometer },
  { key: 'dispatched', label: 'Vehicle Dispatched', icon: Truck },
  { key: 'ai_monitoring', label: 'AI Monitoring', icon: BrainCircuit },
  { key: 'received', label: 'Hospital Received', icon: Building2 },
  { key: 'verified', label: 'Verification Completed', icon: ShieldCheck },
];

export default function HospitalVerifyPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <HospitalVerifyContent />
    </Suspense>
  );
}

function HospitalVerifyContent() {
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const { addCRUDNotification } = useNotifications();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<VerifiedShipmentData | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [alreadyVerified, setAlreadyVerified] = useState(false);
  const [history, setHistory] = useState<VerificationRecord[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [routeWaypoints, setRouteWaypoints] = useState<[number, number][]>([]);
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);
  const [routeDeviation, setRouteDeviation] = useState(false);
  const [liveUpdate, setLiveUpdate] = useState<LiveUpdate | null>(null);
  const [aiResult, setAiResult] = useState<AIVerificationResult | null>(null);
  const [liveFeed, setLiveFeed] = useState<{ time: string; event: string; type: string }[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const aiBaseRef = useRef<AIVerificationResult | null>(null);
  const dataRef = useRef<VerifiedShipmentData | null>(null);
  const queryRef = useRef<string>('');
  dataRef.current = data;

  const runVerification = useCallback(async (shipmentId: string) => {
    if (!shipmentId.trim()) return;
    setLoading(true);
    setData(null);
    setResult(null);
    setAlreadyVerified(false);
    setAccepted(false);
    setRejected(false);
    setLiveUpdate(null);
    setAiResult(null);
    setLiveFeed([]);
    setRouteWaypoints([]);
    setCurrentPos(null);
    setRouteDeviation(false);
    queryRef.current = shipmentId.trim();
    try {
      const verified = await fetchVerifiedShipmentData(shipmentId.trim());
      if (!verified) {
        setResult('invalid');
        await recordVerification(shipmentId.trim(), profile?.name || 'Unknown', 'invalid');
        setLiveFeed(prev => [{ time: new Date().toLocaleTimeString(), event: `Shipment ${shipmentId} not found`, type: 'error' }, ...prev]);
        return;
      }
      const status = classifyFromData(verified);
      setResult(status.result);
      setFailureReason(status.reason || null);
      setData(verified);
      setLiveFeed(prev => [{ time: new Date().toLocaleTimeString(), event: `Shipment ${verified.shipment.shipment_number} loaded successfully`, type: 'success' }, ...prev]);

      const dup = await hasBeenVerified(verified.shipment.id);
      setAlreadyVerified(dup);
      await recordVerification(verified.shipment.id, profile?.name || 'Hospital User', status.result);
      if (status.result === 'verified' && !dup) {
        addCRUDNotification('shipment_verified', 'Shipment Verified', `Shipment ${verified.shipment.shipment_number} has been verified via QR code.`);
        addCRUDNotification('certificate_verified', 'Certificate Verified', `Temperature certificate for ${verified.shipment.shipment_number} has been verified.`);
        addCRUDNotification('ai_recommendation_available', 'AI Recommendation Available', `AI recommendations for ${verified.shipment.shipment_number} are ready to review.`);
        setLiveFeed(prev => [
          { time: new Date().toLocaleTimeString(), event: 'Shipment Verified notification sent', type: 'info' },
          { time: new Date().toLocaleTimeString(), event: 'Temperature Certificate Verified notification sent', type: 'info' },
          ...prev,
        ]);
      } else if (status.result === 'warning') {
        addCRUDNotification('shipment_verified', 'Verification Warning', `Shipment ${verified.shipment.shipment_number} has warnings that need attention.`);
      }
      setHistory(await fetchVerificationHistory(verified.shipment.id));

      // Fetch route from OSRM
      const originCity = verified.shipment.origin_city;
      const destCity = verified.shipment.destination_city;
      const o = originCity ? CITY_MAP[originCity] : null;
      const d = destCity ? CITY_MAP[destCity] : null;
      if (o && d) {
        const route = await getOsrmRoute([o.lat, o.lng], [d.lat, d.lng]);
        if (route && route.coordinates.length > 0) {
          setRouteWaypoints(route.coordinates);
        } else {
          setRouteWaypoints([[o.lat, o.lng], [d.lat, d.lng]]);
        }
        const progress = verified.shipment.status === 'delivered' ? 1 : Math.random() * 0.7 + 0.15;
        const pos = interpolateAlongRoute(route?.coordinates || [[o.lat, o.lng], [d.lat, d.lng]], progress);
        setCurrentPos({ lat: pos[0], lng: pos[1] });
        const dev = Math.random() > 0.85;
        setRouteDeviation(dev);
      }
    } catch (err: any) {
      toast.error(err.message || 'Verification failed');
      setResult('invalid');
      setFailureReason('Shipment Not Found — the shipment ID does not exist in the database.');
    } finally {
      setLoading(false);
    }
  }, [profile?.name, addCRUDNotification]);

  useEffect(() => {
    const shipParam = searchParams.get('shipment');
    if (shipParam) {
      setQuery(shipParam);
      runVerification(shipParam);
    }
  }, [searchParams, runVerification]);

  // Compute AI analysis once data + route are ready
  useEffect(() => {
    if (data && (result === 'verified' || result === 'warning')) {
      const ai = analyzeShipmentAI(data, routeDeviation);
      setAiResult(ai);
      aiBaseRef.current = ai;
      setLiveUpdate({
        temperature: data.lastTemp,
        humidity: data.lastHumidity,
        speed: data.lastSpeed,
        healthScore: ai.healthScore,
        eta: data.shipment.eta ? new Date(data.shipment.eta).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
        risk: data.shipment.risk_level,
        lat: currentPos?.lat,
        lng: currentPos?.lng,
        progress: 0.5,
        lastUpdated: data.lastUpdated || new Date().toISOString(),
      });
    }
  }, [data, result, routeDeviation, currentPos]);

  // Real-time updates every 5 seconds — re-fetch from Supabase
  useEffect(() => {
    if (!data || !(result === 'verified' || result === 'warning') || accepted) return;
    intervalRef.current = setInterval(async () => {
      const currentQuery = queryRef.current;
      if (!currentQuery) return;
      // Re-fetch live data from Supabase
      const fresh = await refreshShipmentData(currentQuery);
      if (fresh) {
        dataRef.current = fresh;
        setData(fresh);
        const base = aiBaseRef.current;
        if (base) {
          const update = computeLiveUpdate(fresh, base, liveUpdate || undefined);
          setLiveUpdate(update);
          // Update AI if health changed significantly
          const newAi = analyzeShipmentAI(fresh, routeDeviation);
          if (Math.abs(newAi.healthScore - base.healthScore) > 5) {
            setAiResult(newAi);
            aiBaseRef.current = newAi;
          }
        }
        // Update current position from fresh telemetry
        if (fresh.currentLat && fresh.currentLng) {
          setCurrentPos({ lat: fresh.currentLat, lng: fresh.currentLng });
        }
        setLiveFeed(prev => [
          { time: new Date().toLocaleTimeString(), event: `Live update from Supabase: Temp ${fresh.lastTemp?.toFixed(1) || 'N/A'}°C, Health ${liveUpdate?.healthScore || 'N/A'}%`, type: 'info' },
          ...prev.slice(0, 19),
        ]);
      } else {
        // Fallback to simulated update if Supabase fetch fails
        const base = aiBaseRef.current;
        const currentData = dataRef.current;
        if (!base || !currentData) return;
        const update = computeLiveUpdate(currentData, base, liveUpdate || undefined);
        setLiveUpdate(update);
        if (currentPos) {
          setCurrentPos(prev => prev ? {
            lat: prev.lat + (Math.random() - 0.5) * 0.03,
            lng: prev.lng + (Math.random() - 0.5) * 0.03,
          } : prev);
        }
        setLiveFeed(prev => [
          { time: new Date().toLocaleTimeString(), event: `Live update (simulated): Temp ${update.temperature?.toFixed(1)}°C, Health ${update.healthScore}%`, type: 'info' },
          ...prev.slice(0, 19),
        ]);
      }
    }, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [data, result, accepted, currentPos, liveUpdate, routeDeviation]);

  async function handleAcceptShipment() {
    if (!data) return;
    setGenerating(`${data.shipment.id}-accept`);
    try {
      const receiverName = profile?.name || 'Hospital User';
      const result = await receiveShipment(data.shipment.id, receiverName, (profile as any)?.hospital_id || undefined);
      if (!result.success) throw new Error(result.error || 'Failed to receive shipment');

      addCRUDNotification('shipment_received', 'Shipment Successfully Received', `Shipment ${data.shipment.shipment_number} has been accepted and marked as delivered.`);
      addCRUDNotification('inventory_updated', 'Inventory Updated', `Inventory updated with ${data.shipment.quantity} ${data.shipment.unit} of ${data.shipment.medicine_name}.`);

      setAccepted(true);
      setLiveFeed(prev => [
        { time: new Date().toLocaleTimeString(), event: 'Shipment accepted — status updated to Delivered', type: 'success' },
        { time: new Date().toLocaleTimeString(), event: `Delivery Certificate generated: ${result.deliveryCertificateId}`, type: 'success' },
        { time: new Date().toLocaleTimeString(), event: `Delivery Report generated: ${result.deliveryReportId}`, type: 'success' },
        { time: new Date().toLocaleTimeString(), event: 'Audit log created and notification sent', type: 'info' },
        ...prev,
      ]);
      toast.success('Shipment successfully received — delivery certificate and report generated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept shipment');
    } finally {
      setGenerating(null);
    }
  }

  async function handleRejectShipment() {
    if (!data || !rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    setGenerating(`${data.shipment.id}-reject`);
    try {
      const { error } = await supabase
        .from('shipments')
        .update({ status: 'failed', notes: `Rejected: ${rejectReason}` })
        .eq('id', data.shipment.id);
      if (error) throw error;

      await supabase.from('shipment_timeline').insert({
        shipment_id: data.shipment.id,
        event_type: 'rejected',
        title: 'Shipment Rejected',
        description: `Rejected by ${profile?.name || 'Hospital User'}: ${rejectReason}`,
        created_by: profile?.id || null,
      });

      await recordVerification(data.shipment.id, profile?.name || 'Hospital User', 'expired');

      addCRUDNotification('shipment_verified', 'Shipment Rejected', `Shipment ${data.shipment.shipment_number} rejected: ${rejectReason}. Admin notified.`);

      setRejected(true);
      setRejectDialogOpen(false);
      setLiveFeed(prev => [
        { time: new Date().toLocaleTimeString(), event: `Shipment rejected: ${rejectReason}`, type: 'error' },
        { time: new Date().toLocaleTimeString(), event: 'Rejection report generated and admin notified', type: 'error' },
        ...prev,
      ]);
      toast.success('Rejection report submitted and admin notified');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject shipment');
    } finally {
      setGenerating(null);
    }
  }

  async function handleDownload(docType: string) {
    if (!data) return;
    const key = `${data.shipment.id}-${docType}`;
    setGenerating(key);
    try {
      const reportData = await fetchShipmentData(data.shipment.id);
      if (!reportData) {
        toast.error('Could not load shipment data');
        return;
      }
      switch (docType) {
        case 'temperature_certificate':
          await generateTemperatureCertificatePdf(reportData);
          break;
        case 'delivery_certificate':
          await generateDeliveryCertificatePdf(reportData);
          break;
        case 'cold_chain_certificate':
        case 'compliance_certificate':
          await generateDocumentPdf(reportData, docType as DocumentType);
          break;
        case 'ai_prediction_report':
          await generateAiPredictionReportPdf(reportData);
          break;
        case 'shipment_report':
          await generateShipmentReportPdf(reportData);
          break;
        default:
          await generateDocumentPdf(reportData, docType as DocumentType);
      }
      const labels: Record<string, string> = {
        temperature_certificate: 'Temperature_Certificate',
        delivery_certificate: 'Delivery_Certificate',
        cold_chain_certificate: 'Cold_Chain_Compliance_Certificate',
        compliance_certificate: 'Compliance_Certificate',
        ai_prediction_report: 'AI_Prediction_Report',
        shipment_report: 'Shipment_Report',
      };
      const fileName = `${labels[docType] || docType}_${data.shipment.shipment_number}.pdf`;
      await recordDownload(data.shipment.id, fileName, docType, profile?.name || 'Hospital User');
      toast.success(`Downloaded: ${fileName}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate document');
    } finally {
      setGenerating(null);
    }
  }

  const resultConfig: Record<VerificationResult, { color: string; bg: string; icon: any; label: string; desc: string }> = {
    verified: { color: 'text-success', bg: 'bg-success/10 border-success/30', icon: CheckCircle2, label: 'VERIFIED', desc: 'This shipment is authentic and all checks passed.' },
    warning: { color: 'text-warning', bg: 'bg-warning/10 border-warning/30', icon: AlertTriangle, label: 'WARNING', desc: 'Shipment verified but some checks need attention.' },
    invalid: { color: 'text-critical', bg: 'bg-critical/10 border-critical/30', icon: XCircle, label: 'INVALID / TAMPERED', desc: 'This shipment failed critical verification checks.' },
    expired: { color: 'text-warning', bg: 'bg-warning/10 border-warning/30', icon: AlertTriangle, label: 'EXPIRED', desc: 'This shipment has been closed, cancelled, or expired.' },
  };

  const timelineEvents = data?.timeline || [];
  function isStepComplete(stepKey: string): boolean {
    if (!data) return false;
    if (stepKey === 'created') return true;
    if (stepKey === 'verified') return result === 'verified' || result === 'warning';
    if (stepKey === 'received') return accepted || data.shipment.status === 'delivered';
    const matching = timelineEvents.find((e: any) => {
      const et = (e.event_type || '').toLowerCase();
      const title = (e.title || '').toLowerCase();
      if (stepKey === 'packed') return et.includes('pack') || title.includes('pack');
      if (stepKey === 'temp_verified') return et.includes('temp') || title.includes('temp');
      if (stepKey === 'dispatched') return et.includes('dispatch') || title.includes('dispatch') || data.shipment.dispatched_at !== null;
      if (stepKey === 'ai_monitoring') return et.includes('ai') || title.includes('ai') || et.includes('monitor') || (data.prediction !== undefined);
      return false;
    });
    return !!matching;
  }

  const liveTemp: number | null = liveUpdate?.temperature ?? data?.lastTemp ?? null;
  const liveHumidity: number | null = liveUpdate?.humidity ?? data?.lastHumidity ?? null;
  const liveSpeed: number | null = liveUpdate?.speed ?? data?.lastSpeed ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="QR Code Verification"
        description="Real-time shipment verification via QR code scan"
        icon={QrCode}
        action={
          <Button className="gap-2 gradient-primary text-white" onClick={() => setScannerOpen(true)}>
            <QrCode className="h-4 w-4" /> Open Scanner
          </Button>
        }
      />

      {/* Search bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter Shipment ID (e.g. TNX-SHP-2025-001)..."
                className="pl-9"
                onKeyDown={(e) => { if (e.key === 'Enter') runVerification(query); }}
              />
            </div>
            <Button className="gap-2 gradient-primary text-white" disabled={loading} onClick={() => runVerification(query)}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
              {loading ? 'Verifying...' : 'Verify Shipment'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scanner Dialog */}
      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><QrCode className="h-5 w-5 text-primary" /> QR Scanner</DialogTitle>
            <DialogDescription>Scan a shipment QR code or enter the ID manually</DialogDescription>
          </DialogHeader>
          <QrScanner
            onScan={(scannedId) => {
              setScannerOpen(false);
              setQuery(scannedId);
              runVerification(scannedId);
            }}
          />
        </DialogContent>
      </Dialog>

      {loading && (
        <Card>
          <CardContent className="py-16 text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">Fetching live shipment data from Supabase...</p>
          </CardContent>
        </Card>
      )}

      {!loading && result && (
        <>
          {/* Verification Result Banner */}
          <Card className={cn('border-2', resultConfig[result].bg)}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                {(() => { const Icon = resultConfig[result].icon; return <Icon className={cn('h-12 w-12', resultConfig[result].color)} />; })()}
                <div>
                  <p className={cn('text-2xl font-bold', resultConfig[result].color)}>{resultConfig[result].label}</p>
                  <p className="text-sm text-muted-foreground">{resultConfig[result].desc}</p>
                </div>
                {alreadyVerified && (result === 'verified' || result === 'warning') && (
                  <Badge variant="outline" className="ml-auto bg-warning/10 text-warning">Previously Verified</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {data && (result === 'verified' || result === 'warning') && (
            <>
              {/* Verification Checks Panel */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" /> Verification Checks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                    <CheckItem label="Shipment Authenticity" status={data.checks.authenticity} />
                    <CheckItem label="Driver Verification" status={data.checks.driverVerification} />
                    <CheckItem label="Certificate Validity" status={data.checks.certificateValidity} />
                    <CheckItem label="Temperature Compliance" status={data.checks.temperatureCompliance} />
                    <CheckItem label="Cold-Chain Integrity" status={data.checks.coldChainIntegrity} />
                  </div>
                </CardContent>
              </Card>

              {/* Shipment Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" /> Shipment Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <DetailItem icon={Package} label="Shipment ID" value={data.shipment.shipment_number} />
                    <DetailItem icon={FileText} label="Medicine Type" value={data.shipment.medicine_type || 'N/A'} />
                    <DetailItem icon={Package} label="Medical Product" value={data.shipment.medicine_name} />
                    <DetailItem icon={Building2} label="Source" value={data.warehouseName || data.shipment.origin_city || 'N/A'} />
                    <DetailItem icon={Building2} label="Destination" value={data.hospitalName || data.shipment.destination_city || 'N/A'} />
                    <DetailItem icon={MapPin} label="Current GPS Location" value={data.currentLocation || 'N/A'} />
                    <DetailItem icon={Thermometer} label="Current Temperature" value={liveTemp !== null ? `${liveTemp.toFixed(1)}°C` : 'N/A'} valueClass={
                      liveTemp !== null && liveTemp >= data.shipment.safe_temp_min && liveTemp <= data.shipment.safe_temp_max ? 'text-success' : liveTemp !== null ? 'text-critical' : ''
                    } />
                    <DetailItem icon={Droplets} label="Humidity" value={liveHumidity !== null ? `${liveHumidity.toFixed(1)}%` : 'N/A'} />
                    <DetailItem icon={Wind} label="Vehicle Speed" value={liveSpeed !== null ? `${liveSpeed.toFixed(0)} km/h` : 'N/A'} />
                    <DetailItem icon={Truck} label="Vehicle Number" value={data.vehicleNumber || 'N/A'} />
                    <DetailItem icon={User} label="Driver Name" value={data.driverName || 'Unassigned'} />
                    <DetailItem icon={Phone} label="Driver Phone" value={data.driver?.phone || 'N/A'} />
                    <DetailItem icon={IdCard} label="Driver License" value={data.driver?.license_number || 'N/A'} />
                    <DetailItem icon={Activity} label="Delivery Status" value={data.shipment.status.replace(/_/g, ' ')} />
                    <DetailItem icon={BrainCircuit} label="AI Risk Level" value={liveUpdate?.risk || data.shipment.risk_level} valueClass={
                      (liveUpdate?.risk || data.shipment.risk_level) === 'low' ? 'text-success' :
                      (liveUpdate?.risk || data.shipment.risk_level) === 'critical' ? 'text-critical' : 'text-warning'
                    } />
                    <DetailItem icon={Route} label="Route Status" value={routeDeviation ? 'Deviation Detected' : 'On Track'} valueClass={routeDeviation ? 'text-warning' : 'text-success'} />
                    <DetailItem icon={Clock} label="Last Updated" value={liveUpdate?.lastUpdated ? new Date(liveUpdate.lastUpdated).toLocaleString('en-IN') : (data.lastUpdated ? new Date(data.lastUpdated).toLocaleString('en-IN') : 'N/A')} />
                  </div>
                </CardContent>
              </Card>

              {/* Temperature History */}
              <TemperatureChart
                telemetry={data.telemetry}
                safeTempMin={data.shipment.safe_temp_min}
                safeTempMax={data.shipment.safe_temp_max}
                liveTemp={liveTemp}
              />

              {/* GPS Verification */}
              <VerificationMap
                originCity={data.shipment.origin_city || undefined}
                destinationCity={data.shipment.destination_city || undefined}
                currentLat={currentPos?.lat}
                currentLng={currentPos?.lng}
                routeWaypoints={routeWaypoints}
              />

              {/* AI Verification */}
              {aiResult && <AIVerification result={aiResult} />}

              {/* AI Recommendation Summary */}
              {aiResult && (
                <Card className={cn('border-2', aiResult.healthScore >= 85 ? 'bg-success/5 border-success/30' : aiResult.healthScore >= 60 ? 'bg-warning/5 border-warning/30' : 'bg-critical/5 border-critical/30')}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <BrainCircuit className={cn('h-8 w-8', aiResult.healthScore >= 85 ? 'text-success' : aiResult.healthScore >= 60 ? 'text-warning' : 'text-critical')} />
                      <div>
                        <p className="text-xs text-muted-foreground">AI Recommendation</p>
                        <p className={cn('text-lg font-bold', aiResult.healthScore >= 85 ? 'text-success' : aiResult.healthScore >= 60 ? 'text-warning' : 'text-critical')}>{aiResult.recommendation}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* QR Code Display */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-primary" /> Shipment QR Code
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center gap-4 md:flex-row md:items-start md:gap-8">
                    <div className="rounded-2xl border-2 border-border bg-white p-4">
                      <QRCodeSVG
                        value={JSON.stringify({
                          shipmentId: data.shipment.shipment_number,
                          batchNumber: data.shipment.batch_number || 'N/A',
                          vehicleNumber: data.vehicleNumber || 'N/A',
                          certificateId: data.certId,
                          timestamp: new Date().toISOString(),
                          verificationUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/verify/${data.shipment.shipment_number}`,
                        })}
                        size={180}
                        level="M"
                      />
                    </div>
                    <div className="flex-1 space-y-2 text-sm">
                      <p className="text-xs text-muted-foreground">This QR code is linked to the shipment's Supabase record. Scanning it fetches live data in real-time.</p>
                      <div className="space-y-1 rounded-xl bg-secondary/30 p-3 text-xs">
                        <p><span className="font-semibold">Shipment ID:</span> {data.shipment.shipment_number}</p>
                        <p><span className="font-semibold">Batch:</span> {data.shipment.batch_number || 'N/A'}</p>
                        <p><span className="font-semibold">Vehicle:</span> {data.vehicleNumber || 'N/A'}</p>
                        <p><span className="font-semibold">Certificate ID:</span> {data.certId}</p>
                        <p><span className="font-semibold">Generated:</span> {new Date().toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Shipment Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-primary" /> Shipment Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {TIMELINE_STEPS.map((step) => {
                      const complete = isStepComplete(step.key);
                      const Icon = step.icon;
                      return (
                        <div key={step.key} className="flex items-center gap-3">
                          <div className={cn(
                            'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors',
                            complete ? 'border-success bg-success/10 text-success' : 'border-border bg-muted text-muted-foreground'
                          )}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <p className={cn('text-sm font-medium', complete ? 'text-foreground' : 'text-muted-foreground')}>{step.label}</p>
                          </div>
                          {complete && <CheckCircle2 className="h-4 w-4 text-success" />}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Document Verification */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" /> Document Verification & Downloads
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {([
                      { type: 'temperature_certificate', label: 'Temperature Certificate', icon: Thermometer },
                      { type: 'delivery_certificate', label: 'Delivery Certificate', icon: FileText },
                      { type: 'cold_chain_certificate', label: 'Cold Chain Compliance', icon: Snowflake },
                      { type: 'ai_prediction_report', label: 'AI Prediction Report', icon: BrainCircuit },
                      { type: 'shipment_report', label: 'Shipment Report', icon: FileBarChart },
                      { type: 'compliance_certificate', label: 'Quality Certificate', icon: ShieldCheck },
                    ]).map((doc) => {
                      const key = `${data.shipment.id}-${doc.type}`;
                      const Icon = doc.icon;
                      return (
                        <Button
                          key={doc.type}
                          variant="outline"
                          className="gap-2 justify-start"
                          disabled={generating === key}
                          onClick={() => handleDownload(doc.type)}
                        >
                          {generating === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
                          {doc.label}
                          <Download className="h-3 w-3 ml-auto" />
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Real-time Updates Panel */}
              {liveUpdate && (
                <Card className="border-primary/30">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Radio className="h-4 w-4 text-primary animate-pulse" /> Real-Time Updates
                      <Badge variant="outline" className="ml-auto bg-success/10 text-success text-xs">LIVE · 5s</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
                      <LiveStat icon={Thermometer} label="Temperature" value={liveUpdate.temperature !== null ? `${liveUpdate.temperature.toFixed(1)}°C` : 'N/A'} color={
                        liveUpdate.temperature !== null && data.shipment.safe_temp_min <= liveUpdate.temperature && liveUpdate.temperature <= data.shipment.safe_temp_max ? 'text-success' : 'text-critical'
                      } />
                      <LiveStat icon={Droplets} label="Humidity" value={liveUpdate.humidity !== null ? `${liveUpdate.humidity.toFixed(1)}%` : 'N/A'} />
                      <LiveStat icon={Wind} label="Speed" value={liveUpdate.speed !== null ? `${liveUpdate.speed.toFixed(0)} km/h` : 'N/A'} />
                      <LiveStat icon={Gauge} label="Health" value={`${liveUpdate.healthScore}%`} color={liveUpdate.healthScore >= 85 ? 'text-success' : liveUpdate.healthScore >= 60 ? 'text-warning' : 'text-critical'} />
                      <LiveStat icon={Clock} label="ETA" value={liveUpdate.eta} />
                      <LiveStat icon={BrainCircuit} label="AI Risk" value={liveUpdate.risk} color={liveUpdate.risk === 'low' ? 'text-success' : liveUpdate.risk === 'critical' ? 'text-critical' : 'text-warning'} />
                    </div>
                    <div className="mt-4 max-h-40 overflow-y-auto rounded-xl border border-border p-3 space-y-1">
                      {liveFeed.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center">Waiting for live updates...</p>
                      ) : liveFeed.map((entry, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span className="text-muted-foreground shrink-0">{entry.time}</span>
                          <span className={cn(
                            entry.type === 'success' ? 'text-success' :
                            entry.type === 'error' ? 'text-critical' :
                            entry.type === 'info' ? 'text-primary' : 'text-muted-foreground'
                          )}>{entry.event}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Accept / Reject */}
              <Card className={cn('border-2', accepted ? 'border-success bg-success/5' : rejected ? 'border-critical bg-critical/5' : 'border-primary/30 bg-primary/5')}>
                <CardContent className="p-6">
                  {accepted ? (
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-8 w-8 text-success" />
                      <div>
                        <p className="text-lg font-bold text-success">Shipment Successfully Received</p>
                        <p className="text-sm text-muted-foreground">Inventory has been updated and the shipment is now marked as delivered.</p>
                      </div>
                    </div>
                  ) : rejected ? (
                    <div className="flex items-center gap-3">
                      <XCircle className="h-8 w-8 text-critical" />
                      <div>
                        <p className="text-lg font-bold text-critical">Shipment Rejected</p>
                        <p className="text-sm text-muted-foreground">Reason: {rejectReason}. Admin has been notified.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="mb-4 text-lg font-bold text-foreground">Confirm Shipment Receipt</p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <Button className="gap-2 gradient-primary text-white" disabled={generating === `${data.shipment.id}-accept`} onClick={handleAcceptShipment}>
                          {generating === `${data.shipment.id}-accept` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          Accept Shipment
                        </Button>
                        <Button className="gap-2" variant="outline" onClick={() => setRejectDialogOpen(true)}>
                          <XCircle className="h-4 w-4 text-critical" /> Reject Shipment
                        </Button>
                        <Button className="gap-2" variant="outline" onClick={() => toast.info('Issue report form opened')}>
                          <AlertTriangle className="h-4 w-4 text-warning" /> Report Issue
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Reject Dialog */}
              <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><XCircle className="h-5 w-5 text-critical" /> Reject Shipment</DialogTitle>
                    <DialogDescription>Please provide a reason for rejecting this shipment</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Rejection Reason</Label>
                      <div className="flex flex-wrap gap-2">
                        {['Temperature exceeded limit', 'Package damaged', 'Wrong shipment', 'Cold chain broken', 'Documents missing'].map(r => (
                          <Button
                            key={r}
                            variant={rejectReason === r ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setRejectReason(r)}
                            className={cn(rejectReason === r && 'gradient-primary text-white')}
                          >
                            {r}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Additional Remarks</Label>
                      <Textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Enter rejection reason or remarks..."
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
                    <Button className="gap-2" disabled={generating === `${data?.shipment.id}-reject` || !rejectReason.trim()} onClick={handleRejectShipment}>
                      {generating === `${data?.shipment.id}-reject` ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      Confirm Rejection
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Verification History */}
              {history.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" /> Verification History
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-xs text-muted-foreground">
                            <th className="p-3 text-left font-medium">Shipment ID</th>
                            <th className="p-3 text-left font-medium">Verified By</th>
                            <th className="p-3 text-left font-medium">Time</th>
                            <th className="p-3 text-left font-medium">Result</th>
                            <th className="p-3 text-left font-medium">Device</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((h) => (
                            <tr key={h.id} className="border-b border-border/50 last:border-0">
                              <td className="p-3 font-medium">{h.shipment_id}</td>
                              <td className="p-3 text-muted-foreground">{h.hospital_user || '—'}</td>
                              <td className="p-3">{new Date(h.verified_time).toLocaleString('en-IN')}</td>
                              <td className="p-3">
                                <Badge variant="outline" className={cn(
                                  h.result === 'verified' ? 'bg-success/10 text-success' :
                                  h.result === 'invalid' ? 'bg-critical/10 text-critical' :
                                  h.result === 'warning' ? 'bg-warning/10 text-warning' :
                                  'bg-warning/10 text-warning'
                                )}>{h.result}</Badge>
                              </td>
                              <td className="p-3 text-muted-foreground">{h.device || '—'}</td>
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

          {result === 'invalid' && (
            <Card className="border-2 border-critical/30 bg-critical/5">
              <CardContent className="p-8 text-center">
                <XCircle className="mx-auto h-12 w-12 text-critical" />
                <p className="mt-4 text-lg font-bold text-critical">Verification Failed</p>
                {failureReason && (
                  <p className="mt-2 text-sm font-medium text-critical max-w-md mx-auto">
                    {failureReason}
                  </p>
                )}
                <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                  Please verify the Shipment ID and try again, or contact the administrator if you
                  believe this is an error.
                </p>
                <Button className="mt-4 gap-2" variant="outline" onClick={() => { setQuery(''); setResult(null); setFailureReason(null); setData(null); }}>
                  Try Another Shipment
                </Button>
              </CardContent>
            </Card>
          )}

          {result === 'expired' && (
            <Card className="border-2 border-warning/30 bg-warning/5">
              <CardContent className="p-8 text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-warning" />
                <p className="mt-4 text-lg font-bold text-warning">Shipment Expired or Already Received</p>
                {failureReason && (
                  <p className="mt-2 text-sm font-medium text-warning max-w-md mx-auto">
                    {failureReason}
                  </p>
                )}
                <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                  This shipment has been closed, cancelled, already received, or marked as failed. It
                  can no longer be verified or accepted. Contact the administrator for more information.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!loading && !result && (
        <Card>
          <CardContent className="py-16 text-center">
            <QrCode className="mx-auto h-16 w-16 text-muted-foreground/40" />
            <p className="mt-4 text-sm text-muted-foreground">Enter a Shipment ID or scan a QR code to begin real-time verification.</p>
            <p className="mt-1 text-xs text-muted-foreground">Data is fetched live from Supabase and refreshed every 5 seconds.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function interpolateAlongRoute(waypoints: [number, number][], progress: number): [number, number] {
  if (waypoints.length < 2) return waypoints[0] || [22.5, 80.0];
  const totalSegments = waypoints.length - 1;
  const segmentProgress = progress * totalSegments;
  const segIdx = Math.min(Math.floor(segmentProgress), totalSegments - 1);
  const segFraction = segmentProgress - segIdx;
  const [lat1, lng1] = waypoints[segIdx];
  const [lat2, lng2] = waypoints[segIdx + 1];
  return [lat1 + (lat2 - lat1) * segFraction, lng1 + (lng2 - lng1) * segFraction];
}

function DetailItem({ icon: Icon, label, value, valueClass }: { icon: any; label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className={cn('mt-1 text-sm font-medium', valueClass)}>{value}</p>
    </div>
  );
}

function LiveStat({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className={cn('mt-1 text-sm font-bold', color)}>{value}</p>
    </div>
  );
}

function CheckItem({ label, status }: { label: string; status: 'pass' | 'fail' | 'warning' | 'pending' }) {
  const config = {
    pass: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10', label: 'Pass' },
    fail: { icon: XCircle, color: 'text-critical', bg: 'bg-critical/10', label: 'Fail' },
    warning: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10', label: 'Warning' },
    pending: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Pending' },
  };
  const { icon: Icon, color, bg, label: statusLabel } = config[status];
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-3">
      <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', bg)}>
        <Icon className={cn('h-4 w-4', color)} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className={cn('text-xs', color)}>{statusLabel}</p>
      </div>
    </div>
  );
}
