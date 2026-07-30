'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, QrCode, Keyboard, XCircle, ScanLine } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QrScannerProps {
  onScan: (result: string) => void;
  defaultMode?: 'camera' | 'manual';
}

function extractShipmentId(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.shipmentId === 'string') return parsed.shipmentId;
  } catch {}
  return raw.trim();
}

export function QrScanner({ onScan, defaultMode = 'camera' }: QrScannerProps) {
  const [mode, setMode] = useState<'camera' | 'manual'>(defaultMode);
  const [manualInput, setManualInput] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
      setScanning(true);

      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        try {
          detectorRef.current = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        } catch {
          detectorRef.current = null;
        }
      } else {
        detectorRef.current = null;
      }
    } catch {
      setError('Camera not available. Please use manual input.');
      setMode('manual');
    }
  }, []);

  useEffect(() => {
    if (mode === 'camera' && !cameraActive) startCamera();
    return () => stopCamera();
  }, [mode, startCamera, stopCamera, cameraActive]);

  useEffect(() => {
    if (!scanning || !cameraActive) return;
    const interval = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      if (detectorRef.current) {
        try {
          const barcodes = await detectorRef.current.detect(videoRef.current);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            clearInterval(interval);
            setScanning(false);
            stopCamera();
            onScanRef.current(extractShipmentId(barcodes[0].rawValue));
          }
        } catch {}
      }
    }, 400);
    return () => clearInterval(interval);
  }, [scanning, cameraActive, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  function handleManualSubmit() {
    const val = manualInput.trim();
    if (!val) return;
    stopCamera();
    onScanRef.current(extractShipmentId(val));
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={mode === 'camera' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('camera')}
          className={cn('gap-2', mode === 'camera' && 'gradient-primary text-white')}
        >
          <Camera className="h-4 w-4" /> Camera Scanner
        </Button>
        <Button
          variant={mode === 'manual' ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setMode('manual'); stopCamera(); }}
          className={cn('gap-2', mode === 'manual' && 'gradient-primary text-white')}
        >
          <Keyboard className="h-4 w-4" /> Manual Input
        </Button>
      </div>

      {mode === 'camera' && (
        <div className="space-y-3">
          {error ? (
            <div className="rounded-xl border border-critical/30 bg-critical/5 p-4 text-sm text-critical flex items-center gap-2">
              <XCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-xl border-2 border-border bg-black aspect-video">
              <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-32 w-32 border-2 border-white/80 rounded-2xl" />
              </div>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                <ScanLine className="h-3 w-3 animate-pulse" /> Point at QR code
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'manual' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Enter the Shipment ID shown on the QR code:</p>
          <div className="flex gap-2">
            <Input
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="TNX-SHP-2025-001"
              onKeyDown={(e) => { if (e.key === 'Enter') handleManualSubmit(); }}
              autoFocus
            />
            <Button className="gap-2 gradient-primary text-white shrink-0" onClick={handleManualSubmit}>
              <QrCode className="h-4 w-4" /> Verify
            </Button>
          </div>
          <div className="rounded-xl bg-secondary/30 p-3 text-xs text-muted-foreground">
            <p className="font-semibold mb-1">Sample Shipment IDs:</p>
            <div className="flex flex-col gap-0.5">
              {['TNX-SHP-2025-001', 'TNX-SHP-2025-002', 'TNX-SHP-2025-003'].map(id => (
                <button
                  key={id}
                  className="text-left hover:text-primary transition-colors"
                  onClick={() => setManualInput(id)}
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
