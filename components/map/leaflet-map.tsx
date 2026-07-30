'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import {
  CITIES, INDIA_CENTER, INDIA_ZOOM, ROUTES, ROUTE_COLORS, MARKER_COLORS,
  type TruckState,
} from '@/lib/map-data';
import { WAREHOUSES, type WarehouseData } from '@/lib/warehouse-data';
import { TruckIcon, CityIcon, WarehouseIcon } from '@/components/map/marker-icons';

interface LeafletMapProps {
  trucks: TruckState[];
  showRoutes: boolean;
  showCities: boolean;
  showTrucks: boolean;
  showWarehouses?: boolean;
  selectedTruckId: string | null;
  onSelectTruck: (id: string | null) => void;
  emergencyRoute?: [number, number][];
  highlightedWarehouseId?: string | null;
  emergencyTruckId?: string | null;
}

function FitIndiaBounds() {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds([6.0, 68.0], [37.0, 97.0]);
    map.fitBounds(bounds, { padding: [20, 20] });
  }, [map]);
  return null;
}

export default function LeafletMap({
  trucks, showRoutes, showCities, showTrucks, showWarehouses = true,
  selectedTruckId, onSelectTruck, emergencyRoute, highlightedWarehouseId, emergencyTruckId,
}: LeafletMapProps) {
  const truckIcon = (status: 'safe' | 'warning' | 'critical', isEmergency?: boolean) =>
    L.divIcon({
      html: TruckIcon(MARKER_COLORS[status], isEmergency),
      className: 'truck-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

  const cityIcon = (type: 'warehouse' | 'hospital' | 'hub' | 'distribution') => {
    const color =
      type === 'warehouse' ? MARKER_COLORS.warehouse :
      type === 'hospital' ? MARKER_COLORS.hospital :
      MARKER_COLORS.distribution;
    return L.divIcon({
      html: CityIcon(color, type),
      className: 'city-marker',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  };

  const warehouseIcon = (highlighted: boolean) =>
    L.divIcon({
      html: WarehouseIcon('#3b82f6', highlighted),
      className: 'warehouse-marker',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

  return (
    <MapContainer
      center={INDIA_CENTER}
      zoom={INDIA_ZOOM}
      zoomControl={false}
      className="h-full w-full"
      style={{ background: '#e8edf2' }}
    >
      <ZoomControl position="bottomright" />
      <FitIndiaBounds />

      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />

      {showRoutes && ROUTES.map((route) => (
        <Polyline
          key={route.id}
          positions={route.waypoints}
          pathOptions={{
            color: ROUTE_COLORS[route.priority],
            weight: route.priority === 'critical' || route.priority === 'high' ? 3 : 2,
            opacity: 0.6,
            dashArray: '10 6',
          }}
        />
      ))}

      {showTrucks && trucks.map((truck) => {
        const isSelected = selectedTruckId === truck.id;
        const routeColor = truck.rerouted ? '#6366f1' : MARKER_COLORS[truck.status];
        return [
          showRoutes ? (
            <Polyline
              key={`${truck.id}-route`}
              positions={truck.routeProgress}
              pathOptions={{
                color: routeColor,
                weight: truck.rerouted ? 6 : (isSelected ? 5 : 4),
                opacity: truck.rerouted ? 0.95 : (isSelected ? 1 : 0.85),
                dashArray: truck.rerouted ? '16 8' : undefined,
                className: truck.rerouted ? 'rerouted-route' : undefined,
              }}
              eventHandlers={{ click: () => onSelectTruck(truck.id) }}
            />
          ) : null,
            <Marker
            key={`${truck.id}-marker`}
            position={truck.position}
            icon={truckIcon(truck.status, emergencyTruckId === truck.id)}
            eventHandlers={{ click: () => onSelectTruck(truck.id) }}
            zIndexOffset={1000}
          >
            <Popup>
              <div style={{ minWidth: '200px', fontFamily: 'system-ui, sans-serif' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '8px', color: MARKER_COLORS[truck.status] }}>
                  {truck.shipmentId}
                </div>
                <div style={{ fontSize: '12px', lineHeight: '1.8' }}>
                  <div><strong>Vehicle:</strong> {truck.vehicleNumber}</div>
                  <div><strong>Driver:</strong> {truck.driverName}</div>
                  <div><strong>Route:</strong> {truck.fromCity} &rarr; {truck.toCity}</div>
                  <div><strong>Speed:</strong> {truck.speed} km/h</div>
                  <div><strong>Temp:</strong> {truck.temperature}&deg;C (Safe: {truck.safeTempMin}&ndash;{truck.safeTempMax}&deg;C)</div>
                  <div><strong>ETA:</strong> {truck.eta}</div>
                  <div><strong>Status:</strong> <span style={{ color: MARKER_COLORS[truck.status], textTransform: 'capitalize' }}>{truck.status}</span></div>
                </div>
              </div>
            </Popup>
          </Marker>,
        ];
      })}

      {/* Emergency route to nearest warehouse */}
      {emergencyRoute && emergencyRoute.length >= 2 && (
        <Polyline
          positions={emergencyRoute}
          pathOptions={{
            color: '#22c55e',
            weight: 5,
            opacity: 0.9,
            dashArray: '12 6',
            className: 'emergency-route',
          }}
        />
      )}

      {showWarehouses && WAREHOUSES.map((wh) => {
        const isHighlighted = highlightedWarehouseId === wh.id;
        return (
          <Marker
            key={wh.id}
            position={[wh.lat, wh.lng]}
            icon={warehouseIcon(isHighlighted)}
            zIndexOffset={500}
          >
            <Popup>
              <div style={{ minWidth: '220px', fontFamily: 'system-ui, sans-serif' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <span style={{ color: '#3b82f6', fontSize: '16px' }}>❄
                  </span>
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>{wh.name}</span>
                </div>
                <div style={{ fontSize: '12px', lineHeight: '1.8' }}>
                  <div><strong>City:</strong> {wh.city}, {wh.state}</div>
                  <div><strong>Capacity:</strong> {wh.capacityCubicM.toLocaleString()} m³</div>
                  <div><strong>Available:</strong> {wh.availablePct}% ({Math.round(wh.capacityCubicM * wh.availablePct / 100).toLocaleString()} m³)</div>
                  <div><strong>Current Temp:</strong> {wh.currentTemp}°C</div>
                  <div><strong>Contact:</strong> {wh.contact}</div>
                  <div><strong>Phone:</strong> {wh.phone}</div>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {showCities && CITIES.map((city) => (
        <Marker key={city.name} position={[city.lat, city.lng]} icon={cityIcon(city.type)}>
          <Popup>
            <div style={{ fontFamily: 'system-ui, sans-serif', minWidth: '120px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>{city.name}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{city.state}</div>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'capitalize', marginTop: '2px' }}>
                {city.type === 'hub' ? 'Distribution Hub' : city.type === 'warehouse' ? 'Warehouse' : city.type === 'hospital' ? 'Hospital' : 'Distribution Center'}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
