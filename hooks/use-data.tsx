'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import {
  MOCK_SHIPMENTS, MOCK_VEHICLES, MOCK_DRIVERS, MOCK_HOSPITALS,
  MOCK_WAREHOUSES, MOCK_COLD_STORAGE, MOCK_ALERTS, MOCK_EMERGENCIES,
} from '@/lib/mock-data';
import type { Shipment, Vehicle, Driver, Hospital, Warehouse, ColdStorageFacility, Alert, EmergencyEvent } from '@/types';

export interface DashboardStats {
  total: number;
  active: number;
  safe: number;
  critical: number;
  delayed: number;
  hospitals: number;
  coldStorage: number;
  fleet: number;
  drivers: number;
  vehiclesActive: number;
  deliveriesCompleted: number;
  avgHealth: number;
  carbonSavings: number;
  warehouses: number;
  admins: number;
  activeAlerts: number;
  emergencies: number;
}

export interface DashboardCharts {
  tempTrend: { time: string; temp: number; target: number }[];
  deliveryData: { day: string; safe: number; delayed: number; failed: number }[];
}

interface DataContextValue {
  shipments: Shipment[];
  vehicles: Vehicle[];
  drivers: Driver[];
  hospitals: Hospital[];
  warehouses: Warehouse[];
  coldStorage: ColdStorageFacility[];
  alerts: Alert[];
  emergencies: EmergencyEvent[];
  stats: DashboardStats;
  charts: DashboardCharts;
  loading: boolean;
  usingMock: boolean;
  refresh: () => void;
  createVehicle: (payload: Partial<Vehicle>) => Promise<Vehicle | null>;
  updateVehicle: (id: string, payload: Partial<Vehicle>) => Promise<Vehicle | null>;
  deleteVehicle: (id: string) => Promise<boolean>;
  createShipment: (payload: Partial<Shipment>) => Promise<Shipment | null>;
  updateShipment: (id: string, payload: Partial<Shipment>) => Promise<Shipment | null>;
  deleteShipment: (id: string) => Promise<boolean>;
  createHospital: (payload: Partial<Hospital>) => Promise<Hospital | null>;
  createAlert: (payload: Partial<Alert>) => Promise<Alert | null>;
  resolveAlert: (id: string) => Promise<boolean>;
}

const DataContext = createContext<DataContextValue | null>(null);

const EMPTY_STATS: DashboardStats = {
  total: 0, active: 0, safe: 0, critical: 0, delayed: 0,
  hospitals: 0, coldStorage: 0, fleet: 0, drivers: 0,
  vehiclesActive: 0, deliveriesCompleted: 0, avgHealth: 0, carbonSavings: 0,
  warehouses: 0, admins: 0, activeAlerts: 0, emergencies: 0,
};

function computeStats(
  shipments: Shipment[], vehicles: Vehicle[], drivers: Driver[],
  hospitals: Hospital[], coldStorage: ColdStorageFacility[],
  warehouses: Warehouse[], alerts: Alert[], emergencies: EmergencyEvent[],
  adminCount: number,
): DashboardStats {
  const delivered = shipments.filter(s => s.status === 'delivered').length;
  const healthScores = shipments
    .filter(s => typeof s.risk_score === 'number')
    .map(s => 100 - s.risk_score);
  const avgHealth = healthScores.length > 0
    ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
    : 0;
  return {
    total: shipments.length,
    active: shipments.filter(s => s.status === 'in_transit' || s.status === 'dispatched' || s.status === 'assigned').length,
    safe: shipments.filter(s => s.risk_level === 'low').length,
    critical: shipments.filter(s => s.risk_level === 'critical').length,
    delayed: shipments.filter(s => s.status === 'pending' || (s.eta && new Date(s.eta) < new Date() && s.status !== 'delivered' && s.status !== 'cancelled')).length,
    hospitals: hospitals.length,
    coldStorage: coldStorage.length,
    fleet: vehicles.length,
    drivers: drivers.length,
    vehiclesActive: vehicles.filter(v => v.status === 'in_use').length,
    deliveriesCompleted: delivered,
    avgHealth,
    carbonSavings: delivered * 18,
    warehouses: warehouses.length,
    admins: adminCount,
    activeAlerts: alerts.filter(a => !a.is_resolved).length,
    emergencies: emergencies.filter(e => e.status === 'active').length,
  };
}

function buildDeliveryData(shipments: Shipment[]): { day: string; safe: number; delayed: number; failed: number }[] {
  const days: { day: string; safe: number; delayed: number; failed: number }[] = [];
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ day: dayLabels[d.getDay()], safe: 0, delayed: 0, failed: 0 });
  }
  for (const s of shipments) {
    const created = new Date(s.created_at);
    const dayIdx = days.length - 1 - Math.floor((Date.now() - created.getTime()) / 86400000);
    if (dayIdx < 0 || dayIdx >= days.length) continue;
    if (s.status === 'delivered') days[dayIdx].safe++;
    else if (s.status === 'cancelled' || s.status === 'failed') days[dayIdx].failed++;
    else if (s.status === 'pending' || (s.eta && new Date(s.eta) < new Date() && s.status !== 'delivered')) days[dayIdx].delayed++;
  }
  return days;
}

function safeVehicle(v: any): Vehicle {
  return {
    ...v,
    battery_level: typeof v.battery_level === 'string' ? Number(v.battery_level) : (v.battery_level ?? 100),
    min_temp_capacity: typeof v.min_temp_capacity === 'string' ? Number(v.min_temp_capacity) : (v.min_temp_capacity ?? -20),
    max_temp_capacity: typeof v.max_temp_capacity === 'string' ? Number(v.max_temp_capacity) : (v.max_temp_capacity ?? 8),
    capacity_kg: typeof v.capacity_kg === 'string' ? Number(v.capacity_kg) : (v.capacity_kg ?? null),
    cooling_system: v.cooling_system ?? 'single_zone',
    type: v.type ?? 'refrigerated_truck',
    status: v.status ?? 'available',
  } as Vehicle;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [coldStorage, setColdStorage] = useState<ColdStorageFacility[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyEvent[]>([]);
  const [adminCount, setAdminCount] = useState(0);
  const [charts, setCharts] = useState<DashboardCharts>({ tempTrend: [], deliveryData: [] });
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const loadedRef = useRef(false);

  const loadAll = useCallback(async () => {
    try {
      const [shipRes, vehRes, drvRes, hospRes, whRes, csRes, alertRes, emRes, adminRes, teleRes] = await Promise.all([
        supabase.from('shipments').select('*').order('created_at', { ascending: false }),
        supabase.from('vehicles').select('*').order('created_at', { ascending: false }),
        supabase.from('drivers').select('*').order('created_at', { ascending: false }),
        supabase.from('hospitals').select('*').order('name'),
        supabase.from('warehouses').select('*').order('name'),
        supabase.from('cold_storage_facilities').select('*').order('name'),
        supabase.from('alerts').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('emergency_events').select('*').order('detected_at', { ascending: false }).limit(20),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'administrator'),
        supabase.from('shipment_telemetry').select('temperature, recorded_at').order('recorded_at', { ascending: false }).limit(200),
      ]);

      const hasError = [shipRes, vehRes, drvRes, hospRes, whRes, csRes, alertRes, emRes].some(r => r.error);
      const shipData = shipRes.data as Shipment[] | null;
      const vehData = vehRes.data as Vehicle[] | null;

      const totalRecords =
        (shipData?.length || 0) + (vehData?.length || 0) + (drvRes.data?.length || 0) +
        (hospRes.data?.length || 0) + (csRes.data?.length || 0);

      if (hasError || totalRecords === 0) {
        setUsingMock(true);
        setShipments(MOCK_SHIPMENTS);
        setVehicles(MOCK_VEHICLES);
        setDrivers(MOCK_DRIVERS);
        setHospitals(MOCK_HOSPITALS);
        setWarehouses(MOCK_WAREHOUSES);
        setColdStorage(MOCK_COLD_STORAGE);
        setAlerts(MOCK_ALERTS);
        setEmergencies(MOCK_EMERGENCIES);
        setAdminCount(1);
      } else {
        setUsingMock(false);
        setShipments(shipData || []);
        setVehicles((vehData || []).map(safeVehicle));
        setDrivers((drvRes.data as Driver[]) || []);
        setHospitals((hospRes.data as Hospital[]) || []);
        setWarehouses((whRes.data as Warehouse[]) || []);
        setColdStorage((csRes.data as ColdStorageFacility[]) || []);
        setAlerts((alertRes.data as Alert[]) || []);
        setEmergencies((emRes.data as EmergencyEvent[]) || []);
        setAdminCount(adminRes.count ?? 0);
      }

      // Build chart data from telemetry
      const teleRows = (teleRes.data || []) as { temperature: string | number; recorded_at: string }[];
      if (teleRows.length > 0) {
        const byHour = new Map<string, number[]>();
        for (const t of teleRows) {
          const d = new Date(t.recorded_at);
          const hh = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
          const bucket = `${hh.split(':')[0]}:00`;
          const temps = byHour.get(bucket) || [];
          temps.push(Number(t.temperature));
          byHour.set(bucket, temps);
        }
        const tempTrend = Array.from(byHour.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-8)
          .map(([time, temps]) => ({
            time,
            temp: Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10,
            target: 5,
          }));
        setCharts({ tempTrend, deliveryData: buildDeliveryData(shipData || []) });
      } else {
        setCharts({ tempTrend: [], deliveryData: buildDeliveryData(shipData || []) });
      }
    } catch {
      setUsingMock(true);
      setShipments(MOCK_SHIPMENTS);
      setVehicles(MOCK_VEHICLES);
      setDrivers(MOCK_DRIVERS);
      setHospitals(MOCK_HOSPITALS);
      setWarehouses(MOCK_WAREHOUSES);
      setColdStorage(MOCK_COLD_STORAGE);
      setAlerts(MOCK_ALERTS);
      setEmergencies(MOCK_EMERGENCIES);
      setAdminCount(1);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadAll();

    const sub = supabase
      .channel('central-data-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hospitals' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'warehouses' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cold_storage_facilities' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_events' }, () => loadAll())
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [loadAll]);

  const stats = computeStats(shipments, vehicles, drivers, hospitals, coldStorage, warehouses, alerts, emergencies, adminCount);

  const refresh = useCallback(() => { loadAll(); }, [loadAll]);

  const createVehicle = useCallback(async (payload: Partial<Vehicle>): Promise<Vehicle | null> => {
    try {
      const { data, error } = await supabase.from('vehicles').insert(payload).select().single();
      if (error || !data) {
        const mock: Vehicle = {
          id: crypto.randomUUID(),
          registration_number: payload.registration_number || 'UNKNOWN',
          type: payload.type || 'refrigerated_truck',
          capacity_kg: payload.capacity_kg ?? null,
          cooling_system: payload.cooling_system || 'single_zone',
          driver_id: payload.driver_id ?? null,
          current_location: payload.current_location ?? null,
          status: payload.status || 'available',
          make: payload.make ?? null,
          model: payload.model ?? null,
          year: payload.year ?? null,
          min_temp_capacity: payload.min_temp_capacity ?? -20,
          max_temp_capacity: payload.max_temp_capacity ?? 8,
          battery_level: (payload as any).battery_level ?? 100,
          gps_enabled: (payload as any).gps_enabled ?? true,
          iot_sensors_enabled: (payload as any).iot_sensors_enabled ?? true,
          last_maintenance_date: payload.last_maintenance_date ?? null,
          organization_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Vehicle;
        setVehicles(prev => [mock, ...prev]);
        setUsingMock(true);
        return mock;
      }
      const safe = safeVehicle(data);
      setVehicles(prev => [safe, ...prev]);
      return safe;
    } catch {
      return null;
    }
  }, []);

  const updateVehicle = useCallback(async (id: string, payload: Partial<Vehicle>): Promise<Vehicle | null> => {
    const { data, error } = await supabase.from('vehicles').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) return null;
    const safe = safeVehicle(data);
    setVehicles(prev => prev.map(v => v.id === id ? safe : v));
    return safe;
  }, []);

  const deleteVehicle = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) return false;
    setVehicles(prev => prev.filter(v => v.id !== id));
    return true;
  }, []);

  const createShipment = useCallback(async (payload: Partial<Shipment>): Promise<Shipment | null> => {
    const { data, error } = await supabase.from('shipments').insert(payload).select().single();
    if (error) return null;
    const s = data as Shipment;
    setShipments(prev => [s, ...prev]);
    return s;
  }, []);

  const updateShipment = useCallback(async (id: string, payload: Partial<Shipment>): Promise<Shipment | null> => {
    const { data, error } = await supabase.from('shipments').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) return null;
    const s = data as Shipment;
    setShipments(prev => prev.map(sh => sh.id === id ? s : sh));
    return s;
  }, []);

  const deleteShipment = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('shipments').delete().eq('id', id);
    if (error) return false;
    setShipments(prev => prev.filter(s => s.id !== id));
    return true;
  }, []);

  const createHospital = useCallback(async (payload: Partial<Hospital>): Promise<Hospital | null> => {
    const { data, error } = await supabase.from('hospitals').insert(payload).select().single();
    if (error) return null;
    const h = data as Hospital;
    setHospitals(prev => [h, ...prev]);
    return h;
  }, []);

  const createAlert = useCallback(async (payload: Partial<Alert>): Promise<Alert | null> => {
    const { data, error } = await supabase.from('alerts').insert(payload).select().single();
    if (error) return null;
    const a = data as Alert;
    setAlerts(prev => [a, ...prev]);
    return a;
  }, []);

  const resolveAlert = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('alerts').update({ is_resolved: true, is_read: true }).eq('id', id);
    if (error) return false;
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_resolved: true, is_read: true } : a));
    return true;
  }, []);

  return (
    <DataContext.Provider value={{
      shipments, vehicles, drivers, hospitals, warehouses, coldStorage,
      alerts, emergencies, stats, charts, loading, usingMock, refresh,
      createVehicle, updateVehicle, deleteVehicle,
      createShipment, updateShipment, deleteShipment,
      createHospital, createAlert, resolveAlert,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error('useData must be used within a DataProvider');
  }
  return ctx;
}
