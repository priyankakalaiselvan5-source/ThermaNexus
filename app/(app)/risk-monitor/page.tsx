'use client';

import { useState } from 'react';
import { PageHeader, StatusBadge } from '@/components/ui/page-components';
import { KPICard } from '@/components/ui/kpi-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRiskSimulation } from '@/hooks/use-risk-simulation';
import { RiskEventCard } from '@/components/risk/risk-event-card';
import { RiskAnalysisPanel } from '@/components/risk/risk-analysis-panel';
import { TelemetryStream } from '@/components/risk/telemetry-stream';
import {
  BrainCircuit, ShieldAlert, Activity, Thermometer, Truck,
  AlertTriangle, Play, Pause, Trash2, Radio, Zap, TrendingUp,
} from 'lucide-react';

export default function RiskMonitorPage() {
  const {
    telemetry, events, analyses, activeEventsByShipment,
    isRunning, toggleRunning, dismissEvent, clearAllEvents,
  } = useRiskSimulation(2000, 8000);

  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);

  const selectedTelemetry = telemetry.find(t => t.shipmentId === selectedShipmentId) || telemetry[0];
  const selectedAnalysis = selectedTelemetry ? analyses[selectedTelemetry.shipmentId] : null;

  const stats = {
    activeHazards: Object.keys(activeEventsByShipment).length,
    critical: events.filter(e => e.severity === 'critical').length,
    high: events.filter(e => e.severity === 'high').length,
    avgConfidence: events.length > 0
      ? Math.round(events.reduce((sum, e) => sum + e.confidenceScore, 0) / events.length)
      : 0,
    monitoredShipments: telemetry.length,
    avgTemp: telemetry.length > 0
      ? Math.round((telemetry.reduce((sum, t) => sum + t.temperature, 0) / telemetry.length) * 10) / 10
      : 0,
    medicalPriority: telemetry.filter(t => t.cargoPriority === 'medical_priority').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Risk & Safety Monitor"
        description="Autonomous logistics fleet safety engine · real-time hazard detection"
        icon={BrainCircuit}
        action={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5">
              <span className={cn('h-1.5 w-1.5 rounded-full', isRunning ? 'animate-pulse bg-success' : 'bg-warning')} />
              {isRunning ? 'Engine Active' : 'Paused'}
            </Badge>
            <Button
              size="sm"
              variant={isRunning ? 'outline' : 'default'}
              onClick={toggleRunning}
              className="gap-1.5"
            >
              {isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {isRunning ? 'Pause' : 'Resume'}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KPICard label="Active Hazards" value={stats.activeHazards} icon={ShieldAlert} variant="critical" />
        <KPICard label="Critical Events" value={stats.critical} icon={AlertTriangle} variant="critical" />
        <KPICard label="High Severity" value={stats.high} icon={Zap} variant="warning" />
        <KPICard label="Monitored" value={stats.monitoredShipments} icon={Truck} variant="primary" />
        <KPICard label="Avg Confidence" value={stats.avgConfidence} suffix="%" icon={Activity} variant="accent" />
        <KPICard label="Avg Temp" value={stats.avgTemp} decimals={1} suffix="°C" icon={Thermometer} variant="success" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr_340px]">
        {/* Left: Telemetry stream */}
        <div className="space-y-4">
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Radio className="h-4 w-4 text-primary animate-pulse" /> Telemetry Stream
                <Badge variant="outline" className="ml-auto bg-primary/10 text-primary">{telemetry.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-0 pb-3">
              <div className="scrollbar-thin max-h-[calc(100vh-320px)] space-y-2 overflow-y-auto px-3">
                {telemetry.map(t => (
                  <TelemetryStream
                    key={t.shipmentId}
                    telemetry={t}
                    selected={selectedShipmentId === t.shipmentId}
                    onClick={() => setSelectedShipmentId(t.shipmentId)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center: Risk events feed */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-critical" /> Hazard Event Feed
                </CardTitle>
                <p className="text-xs text-muted-foreground">Structured AI risk responses</p>
              </div>
              {events.length > 0 && (
                <Button size="sm" variant="ghost" onClick={clearAllEvents} className="gap-1 text-xs">
                  <Trash2 className="h-3 w-3" /> Clear
                </Button>
              )}
            </CardHeader>
          </Card>

          <div className="scrollbar-thin max-h-[calc(100vh-240px)] space-y-3 overflow-y-auto pr-1">
            {events.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10">
                    <ShieldAlert className="h-7 w-7 text-success" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-foreground">All Clear</p>
                  <p className="text-xs text-muted-foreground">No active hazards detected. Engine monitoring continuously.</p>
                </CardContent>
              </Card>
            ) : (
              events.map(event => (
                <RiskEventCard key={event.id} event={event} onDismiss={dismissEvent} />
              ))
            )}
          </div>
        </div>

        {/* Right: AI analysis panel */}
        <div className="space-y-4">
          {selectedTelemetry && selectedAnalysis ? (
            <RiskAnalysisPanel analysis={selectedAnalysis} telemetry={selectedTelemetry} />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <BrainCircuit className="h-10 w-10 text-muted-foreground/30" />
                <p className="mt-3 text-sm text-muted-foreground">Select a shipment to view AI analysis</p>
              </CardContent>
            </Card>
          )}

          {selectedTelemetry && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Cargo & Route Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vehicle</span>
                  <span className="font-semibold">{selectedTelemetry.vehicleNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Driver</span>
                  <span className="font-semibold">{selectedTelemetry.driverName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cargo</span>
                  <span className="font-semibold">{selectedTelemetry.cargoType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Priority</span>
                  <Badge variant="outline" className={
                    selectedTelemetry.cargoPriority === 'medical_priority'
                      ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }>
                    {selectedTelemetry.cargoPriority === 'medical_priority' ? 'Medical Priority' : 'Standard'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Safe Range</span>
                  <span className="font-semibold">{selectedTelemetry.safeTempMin}–{selectedTelemetry.safeTempMax}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Distance Left</span>
                  <span className="font-semibold">{selectedTelemetry.distanceRemaining} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Battery</span>
                  <span className="font-semibold">{selectedTelemetry.batteryLevel}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Compressor</span>
                  <span className={cn(
                    'font-semibold',
                    selectedTelemetry.compressorHealth < 50 ? 'text-critical' :
                    selectedTelemetry.compressorHealth < 70 ? 'text-warning' : 'text-success'
                  )}>{selectedTelemetry.compressorHealth}%</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
