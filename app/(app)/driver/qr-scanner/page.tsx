'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { PageHeader } from '@/components/ui/page-components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  QrCode, Package, MapPin, Thermometer, CheckCircle2, Truck,
  ArrowRight, User, Loader2, AlertCircle, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ScanState = 'idle' | 'scanning' | 'verified' | 'picked_up' | 'delivered';

interface ShipmentData {
  id: string;
  shipment_number: string;
  medicine_name: string;
  status: string;
  destination_city: string | null;
  driver_id: string | null;
  vehicle_id: string | null;
}

interface DriverInfo {
  name: string;
}

interface VehicleInfo {
  registration_number: string;
}

interface ShipmentWithDetails extends ShipmentData {
  driver?: DriverInfo | null;
  vehicle?: VehicleInfo | null;
}

export default function DriverQrScannerPage() {
  return (
    <Suspense fallback={
      <Card>
        <CardContent className="flex items-center justify-center gap-3 py-16">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading QR Scanner...</p>
        </CardContent>
      </Card>
    }>
      <QrScannerContent />
    </Suspense>
  );
}

function QrScannerContent() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [scanned, setScanned] = useState(false);
  const [shipments, setShipments] = useState<ShipmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);

  async function loadShipments() {
    setLoading(true);
    setError(null);
    try {
      const queryShipmentId = searchParams.get('shipment');
      const { data, error: queryError } = await supabase
        .from('shipments')
        .select(`
          id, shipment_number, medicine_name, status,
          destination_city, driver_id, vehicle_id
        `)
        .in('status', ['pending', 'packed', 'loaded', 'dispatched', 'in_transit'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (queryError) throw queryError;
      if (!data || data.length === 0) {
        setShipments([]);
        setLoading(false);
        return;
      }

      const driverIds = data.map(s => s.driver_id).filter(Boolean) as string[];
      const vehicleIds = data.map(s => s.vehicle_id).filter(Boolean) as string[];

      const [driversRes, vehiclesRes] = await Promise.all([
        driverIds.length > 0
          ? supabase.from('drivers').select('id, name').in('id', driverIds)
          : Promise.resolve({ data: [] as any[], error: null }),
        vehicleIds.length > 0
          ? supabase.from('vehicles').select('id, registration_number').in('id', vehicleIds)
          : Promise.resolve({ data: [] as any[], error: null }),
      ]);

      if (driversRes.error) throw driversRes.error;
      if (vehiclesRes.error) throw vehiclesRes.error;

      const driverMap = new Map((driversRes.data || []).map(d => [d.id, d]));
      const vehicleMap = new Map((vehiclesRes.data || []).map(v => [v.id, v]));

      const enriched: ShipmentWithDetails[] = data.map(s => ({
        ...s,
        driver: s.driver_id ? driverMap.get(s.driver_id) || null : null,
        vehicle: s.vehicle_id ? vehicleMap.get(s.vehicle_id) || null : null,
      }));

      setShipments(enriched);
      if (enriched.length > 0) {
        const queryId = queryShipmentId && enriched.find(s => s.id === queryShipmentId)
          ? queryShipmentId
          : enriched[0].id;
        setSelectedShipmentId(queryId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load shipments');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadShipments();
  }, []);

  const selectedShipment = useMemo(
    () => shipments.find(s => s.id === selectedShipmentId) || null,
    [shipments, selectedShipmentId],
  );

  const qrValue = useMemo(() => {
    if (!selectedShipment) return '';
    const payload = {
      shipmentId: selectedShipment.shipment_number,
      vehicleNumber: selectedShipment.vehicle?.registration_number || 'N/A',
      driverName: selectedShipment.driver?.name || profile?.name || 'N/A',
      destination: selectedShipment.destination_city || 'N/A',
      status: selectedShipment.status,
    };
    return JSON.stringify(payload);
  }, [selectedShipment, profile]);

  function startScan() {
    if (!selectedShipment) {
      toast.error('No shipment selected to scan');
      return;
    }
    setScanState('scanning');
    setTimeout(() => {
      setScanState('verified');
      setScanned(true);
      toast.success(`QR scanned! Shipment ${selectedShipment.shipment_number} verified.`);
    }, 2000);
  }

  async function confirmPickup() {
    if (!selectedShipment) return;
    setScanState('picked_up');
    try {
      const { error: updateError } = await supabase
        .from('shipments')
        .update({ status: 'in_transit', dispatched_at: new Date().toISOString() })
        .eq('id', selectedShipment.id);
      if (updateError) throw updateError;
      toast.success('Pickup confirmed! Status changed to "In Transit".');
      await loadShipments();
    } catch (err: any) {
      toast.error('Failed to update shipment status');
    }
  }

  async function completeDelivery() {
    if (!selectedShipment) return;
    setScanState('delivered');
    try {
      const { error: updateError } = await supabase
        .from('shipments')
        .update({ status: 'delivered', delivered_at: new Date().toISOString() })
        .eq('id', selectedShipment.id);
      if (updateError) throw updateError;
      toast.success('Delivery completed! Shipment marked as "Delivered".');
      await loadShipments();
    } catch (err: any) {
      toast.error('Failed to update shipment status');
    }
  }

  function resetScanner() {
    setScanState('idle');
    setScanned(false);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="QR Scanner"
        description="Scan shipment QR codes for pickup and delivery"
        icon={QrCode}
      />

      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center gap-3 py-16">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading shipments...</p>
          </CardContent>
        </Card>
      )}

      {error && !loading && (
        <Card className="border-critical/30">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <AlertCircle className="h-8 w-8 text-critical" />
            <p className="text-sm font-medium text-critical">Failed to load shipments</p>
            <p className="text-xs text-muted-foreground">{error}</p>
            <Button onClick={loadShipments} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" /> Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && shipments.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <Package className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium">No active shipments available</p>
            <p className="text-xs text-muted-foreground">Shipments pending pickup will appear here.</p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && shipments.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* QR Code Display + Scanner */}
          <Card>
            <CardContent className="p-6">
              {/* Shipment selector */}
              {shipments.length > 1 && (
                <div className="mb-4">
                  <label className="text-xs font-medium text-muted-foreground">Select Shipment</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {shipments.map(s => (
                      <button
                        key={s.id}
                        onClick={() => { setSelectedShipmentId(s.id); resetScanner(); }}
                        className={cn(
                          'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                          selectedShipmentId === s.id
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:bg-muted/50',
                        )}
                      >
                        {s.shipment_number}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* QR Code */}
              <div className={cn(
                'relative mx-auto flex aspect-square max-w-sm items-center justify-center rounded-3xl border-2 border-dashed transition-colors',
                scanState === 'scanning' ? 'border-primary bg-primary/5' : 'border-border bg-secondary/30',
              )}>
                {scanState === 'scanning' ? (
                  <div className="text-center">
                    <Loader2 className="mx-auto h-16 w-16 animate-spin text-primary" />
                    <p className="mt-4 text-sm font-medium text-primary">Scanning...</p>
                  </div>
                ) : scanned ? (
                  <div className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10">
                      <CheckCircle2 className="h-8 w-8 text-success" />
                    </div>
                    <p className="mt-4 text-sm font-semibold">Shipment Verified</p>
                    <p className="text-xs text-muted-foreground">{selectedShipment?.shipment_number}</p>
                  </div>
                ) : selectedShipment && qrValue ? (
                  <div className="flex flex-col items-center gap-3 p-4">
                    <QRCodeSVG
                      value={qrValue}
                      size={200}
                      level="M"
                      includeMargin={true}
                      className="rounded-lg"
                    />
                    <p className="text-xs text-muted-foreground">Shipment QR Code</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <QrCode className="mx-auto h-20 w-20 text-muted-foreground/40" />
                    <p className="mt-4 text-sm text-muted-foreground">No shipment selected</p>
                  </div>
                )}

                {scanState === 'scanning' && (
                  <div className="absolute inset-x-8 top-8 bottom-8 overflow-hidden rounded-2xl">
                    <div className="absolute inset-x-0 h-0.5 gradient-primary animate-pulse" style={{ top: '50%' }} />
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-3">
                {scanState === 'idle' && (
                  <Button onClick={startScan} className="w-full gap-2 gradient-primary text-white" size="lg">
                    <QrCode className="h-5 w-5" /> Start Pickup Scan
                  </Button>
                )}
                {scanState === 'verified' && (
                  <Button onClick={confirmPickup} className="w-full gap-2 gradient-primary text-white" size="lg">
                    <CheckCircle2 className="h-5 w-5" /> Confirm Pickup
                  </Button>
                )}
                {scanState === 'picked_up' && (
                  <Button onClick={startScan} variant="outline" className="w-full gap-2" size="lg">
                    <QrCode className="h-5 w-5" /> Scan at Hospital for Delivery
                  </Button>
                )}
                {scanState === 'delivered' && (
                  <Button onClick={resetScanner} variant="outline" className="w-full" size="lg">
                    Scan Another Shipment
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Shipment Details */}
          <div className="space-y-4">
            {selectedShipment ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Shipment Details</CardTitle>
                  <Badge variant="outline" className="bg-primary/10 text-primary w-fit">
                    {selectedShipment.shipment_number}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-xl bg-secondary/50 p-3">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Medicine</span>
                    </div>
                    <p className="mt-1 font-medium">{selectedShipment.medicine_name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border p-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <p className="mt-1 text-xs text-muted-foreground">Driver</p>
                      <p className="text-sm font-medium">{selectedShipment.driver?.name || profile?.name || 'N/A'}</p>
                    </div>
                    <div className="rounded-xl border border-border p-3">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <p className="mt-1 text-xs text-muted-foreground">Vehicle</p>
                      <p className="text-sm font-medium">{selectedShipment.vehicle?.registration_number || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <MapPin className="h-4 w-4 text-primary" />
                    <p className="mt-1 text-xs text-muted-foreground">Destination</p>
                    <p className="text-sm font-medium">{selectedShipment.destination_city || 'N/A'}</p>
                  </div>
                  <div className="rounded-xl bg-primary/5 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Current Status</span>
                      <Badge variant="outline" className="capitalize">{selectedShipment.status.replace(/_/g, ' ')}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm font-semibold">Pickup & Delivery Process</p>
                  <div className="mt-4 space-y-3">
                    {[
                      { icon: QrCode, label: 'Start Pickup', desc: 'Scan QR code on shipment' },
                      { icon: CheckCircle2, label: 'Verify Shipment', desc: 'Confirm medicine and details' },
                      { icon: Truck, label: 'Pickup Confirmed', desc: 'Status changes to "In Transit"' },
                      { icon: MapPin, label: 'Arrive at Hospital', desc: 'Scan QR for delivery verification' },
                      { icon: CheckCircle2, label: 'Complete Delivery', desc: 'Shipment marked as "Delivered"' },
                    ].map((step, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <step.icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{step.label}</p>
                          <p className="text-xs text-muted-foreground">{step.desc}</p>
                        </div>
                        {i < 4 && <ArrowRight className="hidden h-4 w-4 text-muted-foreground/40 md:block" />}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {scanState === 'picked_up' && (
              <Card className="border-primary/20">
                <CardContent className="p-6 text-center">
                  <Truck className="mx-auto h-10 w-10 text-primary" />
                  <p className="mt-3 font-semibold">Shipment In Transit</p>
                  <p className="text-sm text-muted-foreground">Scan QR at hospital to complete delivery</p>
                  <Button onClick={completeDelivery} className="mt-4 w-full gap-2 gradient-primary text-white" size="lg">
                    <CheckCircle2 className="h-5 w-5" /> Complete Delivery
                  </Button>
                </CardContent>
              </Card>
            )}

            {scanState === 'delivered' && (
              <Card className="border-success/20 bg-success/5">
                <CardContent className="p-6 text-center">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
                  <p className="mt-3 font-semibold text-success">Delivery Completed!</p>
                  <p className="text-sm text-muted-foreground">
                    Shipment {selectedShipment?.shipment_number} marked as delivered
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
