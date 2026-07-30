'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { getOsrmRoute } from '@/lib/osrm';
import { CITIES, CITY_MAP, TRUCK_INIT_DATA, ROUTES } from '@/lib/map-data';

export interface DriverNavState {
  loading: boolean;
  shipmentId: string | null;
  shipmentNumber: string;
  medicineName: string;
  originCity: string;
  destinationCity: string;
  destinationName: string;
  currentPosition: [number, number];
  destination: [number, number];
  routeWaypoints: [number, number][];
  speed: number;
  etaMinutes: number;
  distanceRemainingKm: number;
  trafficStatus: 'clear' | 'moderate' | 'heavy';
  isRerouted: boolean;
  rerouteReason: string | null;
  progress: number;
  routeUpdatedByAI: boolean;
  error: string | null;
}

const initialState: DriverNavState = {
  loading: true,
  shipmentId: null,
  shipmentNumber: '',
  medicineName: '',
  originCity: '',
  destinationCity: '',
  destinationName: '',
  currentPosition: [0, 0],
  destination: [0, 0],
  routeWaypoints: [],
  speed: 0,
  etaMinutes: 0,
  distanceRemainingKm: 0,
  trafficStatus: 'clear',
  isRerouted: false,
  rerouteReason: null,
  progress: 0,
  routeUpdatedByAI: false,
  error: null,
};

function pickFallbackRoute(driverName: string | undefined) {
  const idx = TRUCK_INIT_DATA.findIndex(t =>
    t.driverName.toLowerCase() === (driverName || '').toLowerCase(),
  );
  const safeIdx = idx >= 0 ? idx : 0;
  const route = ROUTES[safeIdx % ROUTES.length];
  const truckInit = TRUCK_INIT_DATA[safeIdx];
  const destCity = CITY_MAP[route.to];
  const originCity = CITY_MAP[route.from];
  if (!destCity || !originCity) return null;
  return {
    shipmentId: `fallback-${safeIdx}`,
    shipmentNumber: truckInit.shipmentId,
    medicineName: 'Vaccine (Demo)',
    originCity: route.from,
    destinationCity: route.to,
    destinationName: `${route.to} Hospital`,
    origin: [originCity.lat, originCity.lng] as [number, number],
    destination: [destCity.lat, destCity.lng] as [number, number],
    route: route.waypoints,
    vehicleNumber: truckInit.vehicleNumber,
  };
}

export function useDriverNavigation() {
  const { profile } = useAuth();
  const [state, setState] = useState<DriverNavState>(initialState);
  const positionRef = useRef<[number, number]>([0, 0]);
  const routeRef = useRef<[number, number][]>([]);
  const progressRef = useRef<number>(0);
  const speedRef = useRef<number>(55);
  const animFrameRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const truckPosIdRef = useRef<string | null>(null);

  // Load the driver's active shipment from Supabase
  const loadShipment = useCallback(async () => {
    if (!profile?.id) return;

    const { data: shipment, error } = await supabase
      .from('shipments')
      .select('id, shipment_number, medicine_name, origin_city, destination_city, status')
      .eq('driver_id', profile.id)
      .in('status', ['dispatched', 'in_transit', 'loaded', 'packed', 'emergency'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !shipment) {
      const fallback = pickFallbackRoute(profile.name);
      if (!fallback) {
        setState((s) => ({ ...s, loading: false, error: 'No active shipment found' }));
        return;
      }
      const osrmRoute = await getOsrmRoute(fallback.origin, fallback.destination);
      const waypoints = osrmRoute?.coordinates || [fallback.origin, fallback.destination];
      routeRef.current = waypoints;
      positionRef.current = fallback.origin;
      progressRef.current = 0.02;
      speedRef.current = 55;
      setState((s) => ({
        ...s,
        loading: false,
        shipmentId: fallback.shipmentId,
        shipmentNumber: fallback.shipmentNumber,
        medicineName: fallback.medicineName,
        originCity: fallback.originCity,
        destinationCity: fallback.destinationCity,
        destinationName: fallback.destinationName,
        currentPosition: fallback.origin,
        destination: fallback.destination,
        routeWaypoints: waypoints,
        speed: 55,
        etaMinutes: osrmRoute?.durationMin || 0,
        distanceRemainingKm: osrmRoute?.distanceKm || 0,
        trafficStatus: 'clear',
        progress: 0.02,
      }));
      return;
    }

    const destCity = (shipment.destination_city || 'Delhi').trim();
    const originCityName = (shipment.origin_city || 'Mumbai').trim();
    const dest = CITY_MAP[destCity] || CITIES[0];
    const origin = CITY_MAP[originCityName] || CITIES[1];

    const osrmRoute = await getOsrmRoute([origin.lat, origin.lng], [dest.lat, dest.lng]);
    const waypoints = osrmRoute?.coordinates || [
      [origin.lat, origin.lng],
      [dest.lat, dest.lng],
    ];

    routeRef.current = waypoints;
    positionRef.current = [origin.lat, origin.lng];
    progressRef.current = 0.05;
    speedRef.current = 55;

    setState((s) => ({
      ...s,
      loading: false,
      shipmentId: shipment.id,
      shipmentNumber: shipment.shipment_number,
      medicineName: shipment.medicine_name,
      originCity: originCityName,
      destinationCity: destCity,
      destinationName: `${destCity} Hospital`,
      currentPosition: [origin.lat, origin.lng],
      destination: [dest.lat, dest.lng],
      routeWaypoints: waypoints,
      speed: 55,
      etaMinutes: osrmRoute?.durationMin || 0,
      distanceRemainingKm: osrmRoute?.distanceKm || 0,
      trafficStatus: 'clear',
      progress: 0.05,
    }));
  }, [profile?.id, profile?.name]);

  // Subscribe to truck_positions realtime updates (sync with admin)
  useEffect(() => {
    if (!profile?.id) return;

    if (!profile?.id) return;

    async function loadExistingPosition() {
      const driverId = profile!.id;
      const { data } = await supabase
        .from('truck_positions')
        .select('*')
        .eq('driver_id', driverId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        truckPosIdRef.current = data.id;
        const waypoints = (data.route_waypoints || []) as [number, number][];
        const newPos: [number, number] = [Number(data.lat), Number(data.lng)];
        positionRef.current = newPos;
        if (waypoints.length > 0) routeRef.current = waypoints;
        progressRef.current = Number(data.progress) || 0;
        speedRef.current = Number(data.speed_kmh) || 55;

        setState((s) => ({
          ...s,
          loading: false,
          currentPosition: newPos,
          routeWaypoints: waypoints,
          speed: Number(data.speed_kmh) || 55,
          etaMinutes: Number(data.eta_minutes) || 0,
          distanceRemainingKm: Number(data.distance_remaining_km) || 0,
          trafficStatus: (data.traffic_status as 'clear' | 'moderate' | 'heavy') || 'clear',
          isRerouted: data.is_rerouted || false,
          rerouteReason: data.reroute_reason,
          progress: Number(data.progress) || 0,
          routeUpdatedByAI: data.is_rerouted || false,
        }));
      } else {
        loadShipment();
      }
    }

    loadExistingPosition();

    const sub = supabase
      .channel('driver-nav-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'truck_positions',
        filter: `driver_id=eq.${profile.id}`,
      }, (payload) => {
        if (payload.eventType === 'DELETE') return;
        const data = payload.new as any;
        if (!data) return;

        truckPosIdRef.current = data.id;
        const waypoints = (data.route_waypoints || []) as [number, number][];
        const newPos: [number, number] = [Number(data.lat), Number(data.lng)];
        const wasRerouted = data.is_rerouted;

        positionRef.current = newPos;
        if (waypoints.length > 0) routeRef.current = waypoints;
        progressRef.current = Number(data.progress) || 0;
        speedRef.current = Number(data.speed_kmh) || 55;

        setState((s) => ({
          ...s,
          loading: false,
          currentPosition: newPos,
          routeWaypoints: waypoints.length > 0 ? waypoints : s.routeWaypoints,
          speed: Number(data.speed_kmh) || 55,
          etaMinutes: Number(data.eta_minutes) || 0,
          distanceRemainingKm: Number(data.distance_remaining_km) || 0,
          trafficStatus: (data.traffic_status as 'clear' | 'moderate' | 'heavy') || 'clear',
          isRerouted: wasRerouted || false,
          rerouteReason: data.reroute_reason,
          progress: Number(data.progress) || 0,
          routeUpdatedByAI: wasRerouted || false,
        }));
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [profile?.id, loadShipment]);

  // Smooth truck animation along the route
  useEffect(() => {
    if (state.loading || routeRef.current.length < 2) return;

    animFrameRef.current = setInterval(() => {
      const route = routeRef.current;
      if (route.length < 2) return;

      let newProgress = progressRef.current + (speedRef.current / 3600) * 0.15 * 0.05;
      if (newProgress >= 1) newProgress = 0.02;

      const totalSegs = route.length - 1;
      const segProgress = newProgress * totalSegs;
      const segIdx = Math.min(Math.floor(segProgress), totalSegs - 1);
      const segFrac = segProgress - segIdx;
      const [lat1, lng1] = route[segIdx];
      const [lat2, lng2] = route[segIdx + 1];
      const newPos: [number, number] = [
        lat1 + (lat2 - lat1) * segFrac,
        lng1 + (lng2 - lng1) * segFrac,
      ];

      positionRef.current = newPos;
      progressRef.current = newProgress;

      // Calculate remaining distance along route
      let remainingKm = 0;
      for (let i = segIdx; i < route.length - 1; i++) {
        const [aLat, aLng] = i === segIdx ? newPos : route[i];
        const [bLat, bLng] = route[i + 1];
        const dLat = (bLat - aLat) * 111;
        const dLng = (bLng - aLng) * 111 * Math.cos((aLat * Math.PI) / 180);
        remainingKm += Math.sqrt(dLat * dLat + dLng * dLng);
      }

      const etaMin = Math.round((remainingKm / Math.max(speedRef.current, 1)) * 60);

      setState((s) => ({
        ...s,
        currentPosition: newPos,
        progress: newProgress,
        distanceRemainingKm: Math.round(remainingKm * 10) / 10,
        etaMinutes: etaMin,
      }));

      // Persist position to Supabase every ~5 ticks (1s)
      if (Math.random() < 0.2 && profile?.id) {
        supabase
          .from('truck_positions')
          .upsert({
            id: truckPosIdRef.current || undefined,
            driver_id: profile.id,
            shipment_id: state.shipmentId,
            lat: newPos[0],
            lng: newPos[1],
            route_waypoints: route,
            speed_kmh: speedRef.current,
            eta_minutes: etaMin,
            distance_remaining_km: Math.round(remainingKm * 10) / 10,
            traffic_status: state.trafficStatus,
            is_rerouted: state.isRerouted,
            reroute_reason: state.rerouteReason,
            progress: newProgress,
            destination_lat: state.destination[0],
            destination_lng: state.destination[1],
            destination_name: state.destinationName,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' })
          .then(({ data: upData }) => {
            if (upData) {
              const row = upData as any;
              if (row?.id) truckPosIdRef.current = row.id;
            }
          });
      }
    }, 200);

    return () => {
      if (animFrameRef.current) clearInterval(animFrameRef.current);
    };
  }, [state.loading, state.shipmentId, state.destination, state.trafficStatus, state.isRerouted, state.rerouteReason, state.destinationName, profile?.id]);

  return state;
}
