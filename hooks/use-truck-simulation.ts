'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ROUTES, TRUCK_INIT_DATA, type TruckState, type RouteDefinition } from '@/lib/map-data';

function interpolateAlongRoute(waypoints: [number, number][], progress: number): [number, number] {
  if (waypoints.length < 2) return waypoints[0] || [22.5, 80.0];
  const totalSegments = waypoints.length - 1;
  const segmentProgress = progress * totalSegments;
  const segIdx = Math.min(Math.floor(segmentProgress), totalSegments - 1);
  const segFraction = segmentProgress - segIdx;
  const [lat1, lng1] = waypoints[segIdx];
  const [lat2, lng2] = waypoints[segIdx + 1];
  return [
    lat1 + (lat2 - lat1) * segFraction,
    lng1 + (lng2 - lng1) * segFraction,
  ];
}

function getRouteProgressPoints(waypoints: [number, number][], progress: number): [number, number][] {
  const totalSegments = waypoints.length - 1;
  const segmentProgress = progress * totalSegments;
  const segIdx = Math.min(Math.floor(segmentProgress), totalSegments - 1);
  const segFraction = segmentProgress - segIdx;
  const [lat1, lng1] = waypoints[segIdx];
  const [lat2, lng2] = waypoints[segIdx + 1];
  const currentPos: [number, number] = [
    lat1 + (lat2 - lat1) * segFraction,
    lng1 + (lng2 - lng1) * segFraction,
  ];
  return [...waypoints.slice(0, segIdx + 1), currentPos];
}

function calcETA(progress: number, speed: number): string {
  if (progress >= 1) return 'Arrived';
  const remaining = (1 - progress) * 100;
  const hours = remaining / speed;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

function calcStatus(temp: number, min: number, max: number): 'safe' | 'warning' | 'critical' {
  if (temp > max + 1.5 || temp < min - 1.5) return 'critical';
  if (temp > max || temp < min) return 'warning';
  return 'safe';
}

function createInitialTrucks(): TruckState[] {
  return TRUCK_INIT_DATA.map((data, i) => {
    const route = ROUTES[i % ROUTES.length];
    const progress = Math.random() * 0.8 + 0.05;
    const position = interpolateAlongRoute(route.waypoints, progress);
    const safeMin = 2;
    const safeMax = 8;
    const temp = data.tempBase + (Math.random() - 0.5) * 1.5;
    const speed = 45 + Math.random() * 30;
    return {
      id: `truck-${i}`,
      shipmentId: data.shipmentId,
      vehicleNumber: data.vehicleNumber,
      driverName: data.driverName,
      routeId: route.id,
      fromCity: route.from,
      toCity: route.to,
      position,
      speed: Math.round(speed),
      temperature: Math.round(temp * 10) / 10,
      safeTempMin: safeMin,
      safeTempMax: safeMax,
      eta: calcETA(progress, speed),
      status: calcStatus(temp, safeMin, safeMax),
      progress,
      routeProgress: getRouteProgressPoints(route.waypoints, progress),
    };
  });
}

export function useTruckSimulation(intervalMs = 2000) {
  const [trucks, setTrucks] = useState<TruckState[]>([]);
  const [isRunning, setIsRunning] = useState(true);
  const routesRef = useRef<RouteDefinition[]>(ROUTES);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setTrucks(createInitialTrucks());
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      if (!mountedRef.current) return;
      setTrucks(prev =>
        prev.map(truck => {
          const route = routesRef.current.find(r => r.id === truck.routeId);
          if (!route) return truck;
          let newProgress = truck.progress + (truck.speed / 3600) * (intervalMs / 1000) * 0.05;
          if (newProgress >= 1) {
            const nextRoute = routesRef.current[Math.floor(Math.random() * routesRef.current.length)];
            newProgress = 0.02;
            const temp = 3.5 + Math.random() * 3;
            const speed = 45 + Math.random() * 30;
            return {
              ...truck,
              routeId: nextRoute.id,
              fromCity: nextRoute.from,
              toCity: nextRoute.to,
              progress: newProgress,
              position: interpolateAlongRoute(nextRoute.waypoints, newProgress),
              speed: Math.round(speed),
              temperature: Math.round(temp * 10) / 10,
              status: calcStatus(temp, truck.safeTempMin, truck.safeTempMax),
              eta: calcETA(newProgress, speed),
              routeProgress: getRouteProgressPoints(nextRoute.waypoints, newProgress),
            };
          }
          const tempDrift = truck.temperature + (Math.random() - 0.5) * 0.4;
          const temp = Math.max(2.5, Math.min(9.5, Math.round(tempDrift * 10) / 10));
          const speedDrift = truck.speed + Math.round((Math.random() - 0.5) * 6);
          const speed = Math.max(30, Math.min(85, speedDrift));
          const position = interpolateAlongRoute(route.waypoints, newProgress);
          return {
            ...truck,
            progress: newProgress,
            position,
            speed,
            temperature: temp,
            status: calcStatus(temp, truck.safeTempMin, truck.safeTempMax),
            eta: calcETA(newProgress, speed),
            routeProgress: getRouteProgressPoints(route.waypoints, newProgress),
          };
        })
      );
    }, intervalMs);
    return () => clearInterval(interval);
  }, [isRunning, intervalMs]);

  const toggleRunning = useCallback(() => setIsRunning(prev => !prev), []);
  const resetTrucks = useCallback(() => setTrucks(createInitialTrucks()), []);

  return { trucks, isRunning, toggleRunning, resetTrucks };
}
