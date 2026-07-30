'use client';

import { useEffect, useRef } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup, Polyline, useMap, ZoomControl,
} from 'react-leaflet';
import L from 'leaflet';
import { TruckIcon, CityIcon } from '@/components/map/marker-icons';
import { MARKER_COLORS } from '@/lib/map-data';

interface DriverMapProps {
  currentPosition: [number, number];
  destination: [number, number];
  destinationName: string;
  routeWaypoints: [number, number][];
  isRerouted: boolean;
  speed: number;
}

function FitRouteBounds({ route, position, destination }: {
  route: [number, number][];
  position: [number, number];
  destination: [number, number];
}) {
  const map = useMap();
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current) return;
    const allPoints = [...route, position, destination];
    if (allPoints.length < 2) return;
    const bounds = L.latLngBounds(allPoints.map((p) => L.latLng(p[0], p[1])));
    map.fitBounds(bounds, { padding: [40, 40] });
    doneRef.current = true;
  }, [map, route, position, destination]);

  return null;
}

function RecenterOnPosition({ position }: { position: [number, number] }) {
  const map = useMap();
  const lastRef = useRef<string>('');

  useEffect(() => {
    const key = `${position[0].toFixed(3)},${position[1].toFixed(3)}`;
    if (key === lastRef.current) return;
    lastRef.current = key;
    map.panTo(position, { animate: true, duration: 0.5 });
  }, [map, position]);

  return null;
}

export default function DriverMap({
  currentPosition, destination, destinationName, routeWaypoints, isRerouted, speed,
}: DriverMapProps) {
  const truckIcon = L.divIcon({
    html: TruckIcon(MARKER_COLORS.safe, false),
    className: 'truck-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  const destIcon = L.divIcon({
    html: CityIcon('#ef4444', 'hospital'),
    className: 'city-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  const hasRoute = routeWaypoints.length >= 2;

  return (
    <MapContainer
      center={currentPosition}
      zoom={7}
      zoomControl={false}
      className="h-full w-full"
      style={{ background: '#e8edf2' }}
    >
      <ZoomControl position="bottomright" />
      <FitRouteBounds
        route={routeWaypoints}
        position={currentPosition}
        destination={destination}
      />
      <RecenterOnPosition position={currentPosition} />

      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />

      {/* Old route (faded) when rerouted */}
      {isRerouted && hasRoute && (
        <Polyline
          positions={routeWaypoints}
          pathOptions={{
            color: '#94a3b8',
            weight: 3,
            opacity: 0.3,
            dashArray: '8 6',
          }}
        />
      )}

      {/* Active route polyline */}
      {hasRoute && (
        <Polyline
          positions={routeWaypoints}
          pathOptions={{
            color: isRerouted ? '#6366f1' : '#3b82f6',
            weight: isRerouted ? 6 : 5,
            opacity: 0.9,
            dashArray: isRerouted ? '16 8' : undefined,
            className: isRerouted ? 'rerouted-route' : undefined,
          }}
        />
      )}

      {/* Destination marker */}
      <Marker position={destination} icon={destIcon} zIndexOffset={500}>
        <Popup>
          <div style={{ fontFamily: 'system-ui, sans-serif', minWidth: '140px' }}>
            <div style={{ fontWeight: 700, fontSize: '14px' }}>Destination</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              {destinationName}
            </div>
          </div>
        </Popup>
      </Marker>

      {/* Truck marker */}
      <Marker position={currentPosition} icon={truckIcon} zIndexOffset={1000}>
        <Popup>
          <div style={{ minWidth: '160px', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px', color: MARKER_COLORS.safe }}>
              Your Truck
            </div>
            <div style={{ fontSize: '12px', lineHeight: '1.8' }}>
              <div><strong>Speed:</strong> {speed} km/h</div>
              <div><strong>Position:</strong> {currentPosition[0].toFixed(4)}°, {currentPosition[1].toFixed(4)}°</div>
            </div>
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}
