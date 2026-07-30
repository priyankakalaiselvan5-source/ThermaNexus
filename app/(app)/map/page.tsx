'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/page-components';
import { Badge } from '@/components/ui/badge';
import { MapLegend } from '@/components/map/map-legend';
import { TelemetryCards } from '@/components/map/telemetry-cards';
import { ShipmentList } from '@/components/map/shipment-list';
import { MapControls } from '@/components/map/map-controls';
import { useTruckSimulation } from '@/hooks/use-truck-simulation';
import { useNotifications } from '@/hooks/use-notifications';
import { Map as MapIcon, Snowflake, Siren } from 'lucide-react';
import { cn } from '@/lib/utils';

const LeafletMap = dynamic(
  () => import('@/components/map/leaflet-map').then(m => m.default),
  { ssr: false, loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-secondary/30">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary shadow-glow animate-pulse">
          <MapIcon className="h-6 w-6 text-white" />
        </div>
        <p className="text-sm text-muted-foreground">Loading India Logistics Map...</p>
      </div>
    </div>
  )}
);

export default function MapPage() {
  const { trucks, isRunning, toggleRunning, resetTrucks } = useTruckSimulation(2000);
  const { emergency, nearestWarehouse } = useNotifications();

  const [showRoutes, setShowRoutes] = useState(true);
  const [showCities, setShowCities] = useState(true);
  const [showTrucks, setShowTrucks] = useState(true);
  const [showWarehouses, setShowWarehouses] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [dbEmergencyTruckId, setDbEmergencyTruckId] = useState<string | null>(null);

  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const toggleFullscreen = useCallback(() => setFullscreen(prev => !prev), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && fullscreen) setFullscreen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  useEffect(() => {
    async function loadDbEmergencies() {
      const { data } = await supabase
        .from('emergency_events')
        .select('shipment_id')
        .eq('status', 'active')
        .not('shipment_id', 'is', null);
      if (data && data.length > 0) {
        const emergencyShipmentIds = data.map(d => d.shipment_id);
        const truck = trucks.find(t => emergencyShipmentIds.includes(t.shipmentId));
        if (truck) setDbEmergencyTruckId(truck.id);
        else setDbEmergencyTruckId(null);
      } else {
        setDbEmergencyTruckId(null);
      }
    }

    loadDbEmergencies();

    const sub = supabase
      .channel('map-emergency-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'emergency_events' }, () => loadDbEmergencies())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'emergency_events' }, () => loadDbEmergencies())
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [trucks]);

  return (
    <div className={cn('flex flex-col gap-4', fullscreen && 'fixed inset-0 z-50 bg-background p-4')}>
      {!fullscreen && (
        <PageHeader
          title="India Logistics Control Map"
          description="Real-time nationwide shipment tracking command center"
          icon={MapIcon}
          action={
            <div className="flex items-center gap-2">
              {emergency && (
                <Badge variant="outline" className="gap-1.5 border-critical/30 text-critical">
                  <Siren className="h-3 w-3 animate-pulse" /> Emergency
                </Badge>
              )}
              {nearestWarehouse && (
                <Badge variant="outline" className="gap-1.5 border-accent/30 text-accent">
                  <Snowflake className="h-3 w-3" /> {nearestWarehouse.warehouse.city}
                </Badge>
              )}
              <Badge variant="outline" className="gap-1.5">
                <span className={cn('h-1.5 w-1.5 rounded-full', isRunning ? 'animate-pulse bg-success' : 'bg-warning')} />
                {isRunning ? 'Live' : 'Paused'}
              </Badge>
            </div>
          }
        />
      )}

      <TelemetryCards trucks={trucks} />

      <div className={cn(
        'grid gap-4',
        fullscreen ? 'grid-cols-1 lg:grid-cols-[1fr_320px]' : 'lg:grid-cols-[1fr_320px]'
      )}>
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
          <MapControls
            showRoutes={showRoutes}
            showCities={showCities}
            showTrucks={showTrucks}
            showWarehouses={showWarehouses}
            fullscreen={fullscreen}
            isRunning={isRunning}
            onToggleRoutes={() => setShowRoutes(prev => !prev)}
            onToggleCities={() => setShowCities(prev => !prev)}
            onToggleTrucks={() => setShowTrucks(prev => !prev)}
            onToggleWarehouses={() => setShowWarehouses(prev => !prev)}
            onToggleFullscreen={toggleFullscreen}
            onToggleRunning={toggleRunning}
            onReset={resetTrucks}
            autoRefresh={autoRefresh}
            onToggleAutoRefresh={() => setAutoRefresh(prev => !prev)}
            lastRefresh={lastRefresh}
          />
          <div className={cn('relative w-full', fullscreen ? 'h-[calc(100vh-100px)]' : 'h-[500px] lg:h-[600px]')}>
            <LeafletMap
              trucks={trucks}
              showRoutes={showRoutes}
              showCities={showCities}
              showTrucks={showTrucks}
              showWarehouses={showWarehouses}
              selectedTruckId={selectedTruckId}
              onSelectTruck={setSelectedTruckId}
              emergencyRoute={emergency?.emergencyRoute}
              highlightedWarehouseId={emergency?.recommendedWarehouse?.id || null}
              emergencyTruckId={emergency?.truckId || dbEmergencyTruckId || null}
            />
          </div>
        </div>

        <div className={cn('space-y-4', fullscreen && 'overflow-y-auto')}>
          <ShipmentList
            trucks={trucks}
            selectedTruckId={selectedTruckId}
            onSelectTruck={setSelectedTruckId}
          />
          {!fullscreen && <MapLegend />}
        </div>
      </div>

      {!fullscreen && (
        <div className="lg:hidden">
          <MapLegend />
        </div>
      )}
    </div>
  );
}
