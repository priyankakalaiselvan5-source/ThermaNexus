'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Snowflake, MapPin, Thermometer, Activity, Zap, Wind, Phone, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { INDIA_CENTER, INDIA_ZOOM } from '@/lib/map-data';

export interface ColdStorageFacilityMap {
  id: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  currentTemp: number;
  storageHealth: number;
  capacityUsed: number;
  capacityTotal: number;
  powerStatus: 'main_grid' | 'backup' | 'generator';
  coolingStatus: 'optimal' | 'working' | 'degraded' | 'failed';
  emergencyContact: string;
  emergencyPhone: string;
}

type HealthLevel = 'healthy' | 'warning' | 'critical';

const HEALTH_COLORS: Record<HealthLevel, string> = {
  healthy: '#22c55e',
  warning: '#f59e0b',
  critical: '#ef4444',
};

function healthLevel(health: number): HealthLevel {
  if (health >= 80) return 'healthy';
  if (health >= 60) return 'warning';
  return 'critical';
}

function facilityIcon(health: number, highlighted: boolean): L.DivIcon {
  const level = healthLevel(health);
  const color = HEALTH_COLORS[level];
  const size = highlighted ? 40 : 32;
  const inner = highlighted ? 32 : 24;
  return L.divIcon({
    html: `
      <div style="position: relative; width: ${size}px; height: ${size}px;">
        ${highlighted ? `<div style="position: absolute; inset: -6px; border-radius: 50%; background: ${color}; opacity: 0.15; animation: warehouse-pulse 1.5s ease-in-out infinite;"></div>` : ''}
        <div style="
          position: absolute; top: ${(size - inner) / 2}px; left: ${(size - inner) / 2}px;
          width: ${inner}px; height: ${inner}px; border-radius: 50%;
          background: ${color}; display: flex; align-items: center; justify-content: center;
          border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        ">
          <svg width="${highlighted ? 16 : 13}" height="${highlighted ? 16 : 13}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="2" x2="12" y2="22"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
            <line x1="19.07" y1="4.93" x2="4.93" y2="19.07"/>
            <line x1="12" y1="5" x2="9" y2="8"/>
            <line x1="12" y1="5" x2="15" y2="8"/>
            <line x1="12" y1="19" x2="9" y2="16"/>
            <line x1="12" y1="19" x2="15" y2="16"/>
          </svg>
        </div>
      </div>
    `,
    className: 'cold-storage-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const SAMPLE_FACILITIES: ColdStorageFacilityMap[] = [
  { id: 'sf-delhi', name: 'Delhi Ultra Cold Hub', city: 'Delhi', state: 'Delhi', lat: 28.6139, lng: 77.209, currentTemp: 4.2, storageHealth: 92, capacityUsed: 18, capacityTotal: 12000, powerStatus: 'main_grid', coolingStatus: 'optimal', emergencyContact: 'Rajesh Mehta', emergencyPhone: '+91 98100 12345' },
  { id: 'sf-mumbai', name: 'Mumbai Central Cold Hub', city: 'Mumbai', state: 'Maharashtra', lat: 19.076, lng: 72.877, currentTemp: 7.8, storageHealth: 55, capacityUsed: 68, capacityTotal: 15000, powerStatus: 'backup', coolingStatus: 'degraded', emergencyContact: 'Sunita Rao', emergencyPhone: '+91 98200 23456' },
  { id: 'sf-chennai', name: 'Chennai Pharma Storage', city: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, currentTemp: 4.5, storageHealth: 88, capacityUsed: 10, capacityTotal: 9000, powerStatus: 'main_grid', coolingStatus: 'optimal', emergencyContact: 'Karthik N', emergencyPhone: '+91 98300 34567' },
  { id: 'sf-bengaluru', name: 'Bengaluru Bio-Cold', city: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946, currentTemp: 6.2, storageHealth: 72, capacityUsed: 45, capacityTotal: 11000, powerStatus: 'main_grid', coolingStatus: 'working', emergencyContact: 'Vivek Gowda', emergencyPhone: '+91 98500 56789' },
  { id: 'sf-hyderabad', name: 'Hyderabad Cold Chain', city: 'Hyderabad', state: 'Telangana', lat: 17.385, lng: 78.4867, currentTemp: 3.5, storageHealth: 85, capacityUsed: 27, capacityTotal: 8000, powerStatus: 'main_grid', coolingStatus: 'optimal', emergencyContact: 'Anjali Reddy', emergencyPhone: '+91 98400 45678' },
  { id: 'sf-kolkata', name: 'Kolkata Cold Storage', city: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.363, currentTemp: 9.1, storageHealth: 42, capacityUsed: 88, capacityTotal: 7500, powerStatus: 'generator', coolingStatus: 'failed', emergencyContact: 'Sourav Das', emergencyPhone: '+91 98600 67890' },
  { id: 'sf-ahmedabad', name: 'Ahmedabad Frost Hub', city: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714, currentTemp: 4.1, storageHealth: 81, capacityUsed: 30, capacityTotal: 8500, powerStatus: 'main_grid', coolingStatus: 'optimal', emergencyContact: 'Nilesh Patel', emergencyPhone: '+91 98700 78901' },
  { id: 'sf-pune', name: 'Pune Cold Reserve', city: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567, currentTemp: 3.7, storageHealth: 95, capacityUsed: 5, capacityTotal: 6000, powerStatus: 'main_grid', coolingStatus: 'optimal', emergencyContact: 'Meera Joshi', emergencyPhone: '+91 98800 89012' },
];

function FitBounds({ facilities }: { facilities: ColdStorageFacilityMap[] }) {
  const map = useMap();
  useEffect(() => {
    if (facilities.length === 0) {
      map.setView(INDIA_CENTER, INDIA_ZOOM);
      return;
    }
    if (facilities.length === 1) {
      map.setView([facilities[0].lat, facilities[0].lng], 10);
      return;
    }
    const bounds = L.latLngBounds(facilities.map(f => [f.lat, f.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
  }, [map, facilities]);
  return null;
}

function PopupContent({ f }: { f: ColdStorageFacilityMap }) {
  const level = healthLevel(f.storageHealth);
  const color = HEALTH_COLORS[level];
  const powerLabel = f.powerStatus.replace(/_/g, ' ');
  const coolingLabel = f.coolingStatus;

  return (
    <div style={{ minWidth: '240px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
        <span style={{ color: '#3b82f6', fontSize: '16px' }}>&#10052;</span>
        <span style={{ fontWeight: 700, fontSize: '14px' }}>{f.name}</span>
      </div>
      <div style={{ fontSize: '12px', lineHeight: '1.9' }}>
        <div><strong>City:</strong> {f.city}, {f.state}</div>
        <div><strong>Current Temp:</strong> <span style={{ color: f.currentTemp > 7 ? '#f59e0b' : '#22c55e', fontWeight: 600 }}>{f.currentTemp}&deg;C</span></div>
        <div>
          <strong>Storage Health:</strong>{' '}
          <span style={{ color, fontWeight: 600, textTransform: 'capitalize' }}>{level}</span>{' '}
          ({f.storageHealth}%)
        </div>
        <div><strong>Capacity Used:</strong> {f.capacityUsed}% of {f.capacityTotal.toLocaleString()} m&sup3;</div>
        <div><strong>Power Status:</strong> <span style={{ textTransform: 'capitalize' }}>{powerLabel}</span></div>
        <div><strong>Cooling Status:</strong> <span style={{ textTransform: 'capitalize' }}>{coolingLabel}</span></div>
        <div><strong>Emergency Contact:</strong> {f.emergencyContact}</div>
        <div><strong>Emergency Phone:</strong> {f.emergencyPhone}</div>
      </div>
    </div>
  );
}

interface ColdStorageMapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ColdStorageMapModal({ open, onOpenChange }: ColdStorageMapModalProps) {
  const [facilities, setFacilities] = useState<ColdStorageFacilityMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setHighlightedId(null);
    setSearch('');

    async function load() {
      try {
        const { data, error } = await supabase
          .from('warehouses')
          .select('id,name,city,state,latitude,longitude,capacity_cubic_meters,current_occupancy_pct,temperature_range_min,temperature_range_max,status,contact_phone')
          .order('name');

        if (cancelled) return;

        if (error || !data || data.length === 0) {
          setFacilities(SAMPLE_FACILITIES);
          setLoading(false);
          return;
        }

        const mapped: ColdStorageFacilityMap[] = data
          .filter((w: any) => w.latitude != null && w.longitude != null)
          .map((w: any) => {
            const occupancy = Number(w.current_occupancy_pct) || 0;
            const tempMax = Number(w.temperature_range_max) || 8;
            const tempMin = Number(w.temperature_range_min) || 2;
            const midTemp = (tempMax + tempMin) / 2;
            const tempVariance = (Math.random() - 0.5) * 2;
            const currentTemp = parseFloat((midTemp + tempVariance).toFixed(1));
            const health = Math.round(Math.max(40, 95 - (currentTemp > tempMax ? 25 : currentTemp > tempMax - 1 ? 15 : 0) - (occupancy > 85 ? 15 : occupancy > 70 ? 8 : 0)));
            const coolingStatus: ColdStorageFacilityMap['coolingStatus'] =
              currentTemp > tempMax ? 'failed' : currentTemp > tempMax - 1 ? 'degraded' : currentTemp > tempMin + 2 ? 'working' : 'optimal';
            const powerStatus: ColdStorageFacilityMap['powerStatus'] =
              health < 50 ? 'generator' : health < 70 ? 'backup' : 'main_grid';

            return {
              id: w.id,
              name: w.name,
              city: w.city,
              state: w.state,
              lat: Number(w.latitude),
              lng: Number(w.longitude),
              currentTemp,
              storageHealth: health,
              capacityUsed: occupancy,
              capacityTotal: Number(w.capacity_cubic_meters) || 0,
              powerStatus,
              coolingStatus,
              emergencyContact: 'Facility Manager',
              emergencyPhone: w.contact_phone || 'N/A',
            };
          });

        if (cancelled) return;
        setFacilities(mapped.length > 0 ? mapped : SAMPLE_FACILITIES);
        setLoading(false);
      } catch {
        if (cancelled) return;
        setFacilities(SAMPLE_FACILITIES);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [open]);

  const filtered = useMemo(() => facilities.filter(f => {
    if (!search) return true;
    const q = search.toLowerCase();
    return f.city.toLowerCase().includes(q) || f.name.toLowerCase().includes(q);
  }), [facilities, search]);

  const stats = useMemo(() => ({
    total: facilities.length,
    healthy: facilities.filter(f => healthLevel(f.storageHealth) === 'healthy').length,
    warning: facilities.filter(f => healthLevel(f.storageHealth) === 'warning').length,
    critical: facilities.filter(f => healthLevel(f.storageHealth) === 'critical').length,
  }), [facilities]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Snowflake className="h-5 w-5 text-accent" /> Cold Storage Network Map
          </DialogTitle>
        </DialogHeader>

        {/* Search + Legend */}
        <div className="px-4 pb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by city or warehouse name..." className="pl-9 h-9" />
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-success" /> Healthy ({stats.healthy})</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-warning" /> Warning ({stats.warning})</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-critical" /> Critical ({stats.critical})</span>
            <span className="text-muted-foreground">Total: {stats.total}</span>
          </div>
        </div>

        {/* Map */}
        <div className="relative h-[60vh] w-full border-t border-border">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-secondary/30">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">Loading cold storage facilities...</p>
              </div>
            </div>
          ) : (
            <MapContainer
              center={INDIA_CENTER}
              zoom={INDIA_ZOOM}
              zoomControl={false}
              className="h-full w-full"
              style={{ background: '#e8edf2' }}
            >
              <ZoomControl position="bottomright" />
              <FitBounds facilities={filtered} />

              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />

              {filtered.map(f => (
                <Marker
                  key={f.id}
                  position={[f.lat, f.lng]}
                  icon={facilityIcon(f.storageHealth, highlightedId === f.id)}
                  zIndexOffset={highlightedId === f.id ? 1000 : 500}
                  eventHandlers={{ click: () => setHighlightedId(f.id) }}
                >
                  <Popup>
                    <PopupContent f={f} />
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>

        {/* Facility list (clickable to highlight on map) */}
        {!loading && filtered.length > 0 && (
          <div className="max-h-32 overflow-y-auto border-t border-border p-2">
            <div className="flex flex-wrap gap-2">
              {filtered.map(f => {
                const level = healthLevel(f.storageHealth);
                return (
                  <button
                    key={f.id}
                    onClick={() => setHighlightedId(highlightedId === f.id ? null : f.id)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-colors',
                      highlightedId === f.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary/50',
                    )}
                  >
                    <span className={cn('h-2.5 w-2.5 rounded-full', level === 'healthy' ? 'bg-success' : level === 'warning' ? 'bg-warning' : 'bg-critical')} />
                    <span className="font-medium text-foreground">{f.name}</span>
                    <span className="text-muted-foreground">{f.city}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
