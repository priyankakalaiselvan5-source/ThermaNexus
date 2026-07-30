'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  createInitialTelemetry, tickTelemetry, generateRiskEvent, analyzeRisk,
  type ShipmentTelemetry, type RiskEventResponse, type RiskAnalysisSummary,
} from '@/lib/risk-simulation';

export function useRiskSimulation(telemetryIntervalMs = 2000, eventIntervalMs = 8000) {
  const [telemetry, setTelemetry] = useState<ShipmentTelemetry[]>([]);
  const [events, setEvents] = useState<RiskEventResponse[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, RiskAnalysisSummary>>({});
  const [activeEventsByShipment, setActiveEventsByShipment] = useState<Record<string, RiskEventResponse>>({});
  const [isRunning, setIsRunning] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const initial = createInitialTelemetry();
    setTelemetry(initial);
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      if (!mountedRef.current) return;
      setTelemetry(prev => tickTelemetry(prev));
    }, telemetryIntervalMs);
    return () => clearInterval(interval);
  }, [isRunning, telemetryIntervalMs]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      if (!mountedRef.current || telemetry.length === 0) return;
      const shipment = telemetry[Math.floor(Math.random() * telemetry.length)];
      const event = generateRiskEvent(shipment);
      setEvents(prev => [event, ...prev].slice(0, 50));
      setActiveEventsByShipment(prev => ({ ...prev, [shipment.shipmentId]: event }));
    }, eventIntervalMs);
    return () => clearInterval(interval);
  }, [isRunning, eventIntervalMs, telemetry]);

  useEffect(() => {
    if (telemetry.length === 0) return;
    const newAnalyses: Record<string, RiskAnalysisSummary> = {};
    for (const t of telemetry) {
      const activeEvent = activeEventsByShipment[t.shipmentId];
      newAnalyses[t.shipmentId] = analyzeRisk(t, activeEvent || null);
    }
    setAnalyses(newAnalyses);
  }, [telemetry, activeEventsByShipment]);

  const dismissEvent = useCallback((eventId: string, shipmentId: string) => {
    setEvents(prev => prev.filter(e => e.id !== eventId));
    setActiveEventsByShipment(prev => {
      const next = { ...prev };
      if (next[shipmentId]?.id === eventId) delete next[shipmentId];
      return next;
    });
  }, []);

  const clearAllEvents = useCallback(() => {
    setEvents([]);
    setActiveEventsByShipment({});
  }, []);

  const toggleRunning = useCallback(() => setIsRunning(prev => !prev), []);

  return {
    telemetry,
    events,
    analyses,
    activeEventsByShipment,
    isRunning,
    toggleRunning,
    dismissEvent,
    clearAllEvents,
  };
}
