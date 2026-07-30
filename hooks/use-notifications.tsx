'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useTruckSimulation } from '@/hooks/use-truck-simulation';
import { findNearestWarehouse, type WarehouseData, type NearestWarehouseResult } from '@/lib/warehouse-data';
import { TRUCK_INIT_DATA } from '@/lib/map-data';
import {
  Thermometer, CloudRain, TrafficCone, Snowflake, BrainCircuit,
  Package, Truck, AlertTriangle, Siren, Navigation,
} from 'lucide-react';

export type NotificationType =
  | 'temperature_warning'
  | 'traffic_detected'
  | 'weather_alert'
  | 'cooling_failure'
  | 'ai_reroute'
  | 'warehouse_recommendation'
  | 'shipment_delivered'
  | 'shipment_created'
  | 'vehicle_added'
  | 'driver_added'
  | 'hospital_added'
  | 'warehouse_added'
  | 'route_changed'
  | 'sos_triggered'
  | 'delivery_completed'
  | 'shipment_verified'
  | 'certificate_verified'
  | 'inventory_updated'
  | 'ai_recommendation_available'
  | 'shipment_received';

export type AlertLevel = 'critical' | 'warning' | 'information';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  shipmentId: string;
  severity: AlertLevel;
  timestamp: number;
  read: boolean;
  icon: string;
  data?: {
    temperature?: number;
    safeMax?: number;
    warehouseName?: string;
    warehouseId?: string;
    distanceKm?: number;
    etaMin?: number;
    action?: string;
  };
}

export interface AppAlert {
  id: string;
  shipmentId: string;
  title: string;
  description: string;
  aiConfidence: number;
  recommendedAction: string;
  timestamp: number;
  level: AlertLevel;
  category: string;
  isRead: boolean;
  isResolved: boolean;
}

export interface EmergencyState {
  active: boolean;
  shipmentId: string;
  truckId: string;
  truckPosition: [number, number];
  breachCountdownSec: number;
  recommendedWarehouse: WarehouseData | null;
  warehouseDistanceKm: number;
  warehouseEtaMin: number;
  emergencyRoute: [number, number][];
  reason: string;
}

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  alerts: AppAlert[];
  emergency: EmergencyState | null;
  nearestWarehouse: NearestWarehouseResult | null;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  markAlertRead: (id: string) => void;
  resolveAlert: (id: string) => void;
  transferToColdStorage: () => void;
  dismissEmergency: () => void;
  addCRUDNotification: (type: NotificationType, title: string, message: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter++;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

const NOTIF_TYPE_CONFIG: Record<NotificationType, { icon: string; severity: AlertLevel }> = {
  temperature_warning: { icon: 'Thermometer', severity: 'warning' },
  traffic_detected: { icon: 'TrafficCone', severity: 'information' },
  weather_alert: { icon: 'CloudRain', severity: 'warning' },
  cooling_failure: { icon: 'AlertTriangle', severity: 'critical' },
  ai_reroute: { icon: 'BrainCircuit', severity: 'information' },
  warehouse_recommendation: { icon: 'Snowflake', severity: 'critical' },
  shipment_delivered: { icon: 'Package', severity: 'information' },
  shipment_created: { icon: 'Package', severity: 'information' },
  vehicle_added: { icon: 'Truck', severity: 'information' },
  driver_added: { icon: 'User', severity: 'information' },
  hospital_added: { icon: 'Building2', severity: 'information' },
  warehouse_added: { icon: 'Warehouse', severity: 'information' },
  route_changed: { icon: 'Navigation', severity: 'warning' },
  sos_triggered: { icon: 'Siren', severity: 'critical' },
  delivery_completed: { icon: 'CheckCircle2', severity: 'information' },
  shipment_verified: { icon: 'QrCode', severity: 'information' },
  certificate_verified: { icon: 'ShieldCheck', severity: 'information' },
  inventory_updated: { icon: 'Boxes', severity: 'information' },
  ai_recommendation_available: { icon: 'BrainCircuit', severity: 'information' },
  shipment_received: { icon: 'Package', severity: 'information' },
};

function levelToSeverity(level: AlertLevel): 'critical' | 'high' | 'medium' | 'low' {
  if (level === 'critical') return 'critical';
  if (level === 'warning') return 'high';
  return 'medium';
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { trucks } = useTruckSimulation(3000);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [alerts, setAlerts] = useState<AppAlert[]>([]);
  const [emergency, setEmergency] = useState<EmergencyState | null>(null);
  const [nearestWarehouse, setNearestWarehouse] = useState<NearestWarehouseResult | null>(null);

  const prevStatusRef = useRef<Record<string, 'safe' | 'warning' | 'critical'>>({});
  const prevDeliveredRef = useRef<Record<string, boolean>>({});
  const emergencyTruckRef = useRef<string | null>(null);

  const addNotification = useCallback((n: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const full: AppNotification = {
      ...n,
      id: nextId('notif'),
      timestamp: Date.now(),
      read: false,
    };
    setNotifications(prev => [full, ...prev].slice(0, 100));
    return full;
  }, []);

  const addAlert = useCallback((a: Omit<AppAlert, 'id' | 'timestamp' | 'isRead' | 'isResolved'>) => {
    const full: AppAlert = {
      ...a,
      id: nextId('alert'),
      timestamp: Date.now(),
      isRead: false,
      isResolved: false,
    };
    setAlerts(prev => [full, ...prev].slice(0, 80));
    return full;
  }, []);

  useEffect(() => {
    if (trucks.length === 0) return;

    for (const truck of trucks) {
      const prevStatus = prevStatusRef.current[truck.id];
      const status = truck.status;

      if (prevStatus && prevStatus !== status) {
        const truckData = TRUCK_INIT_DATA.find(t => t.shipmentId === truck.shipmentId);

        if (status === 'critical') {
          addNotification({
            type: 'cooling_failure',
            title: `Cooling Failure — ${truck.shipmentId}`,
            message: `Vehicle ${truck.vehicleNumber}: refrigeration critical. Temp ${truck.temperature}°C exceeds safe max ${truck.safeTempMax}°C.`,
            shipmentId: truck.shipmentId,
            severity: 'critical',
            icon: 'AlertTriangle',
            data: { temperature: truck.temperature, safeMax: truck.safeTempMax },
          });

          const wh = findNearestWarehouse(truck.position[0], truck.position[1]);
          if (wh) {
            addNotification({
              type: 'warehouse_recommendation',
              title: `Warehouse Recommended — ${wh.warehouse.name}`,
              message: `Nearest cold storage ${wh.distanceKm} km away, ETA ${wh.etaMin} min. Transfer cargo immediately.`,
              shipmentId: truck.shipmentId,
              severity: 'critical',
              icon: 'Snowflake',
              data: {
                warehouseName: wh.warehouse.name,
                warehouseId: wh.warehouse.id,
                distanceKm: wh.distanceKm,
                etaMin: wh.etaMin,
              },
            });

            addAlert({
              shipmentId: truck.shipmentId,
              title: 'Critical: Temperature breach imminent',
              description: `Truck ${truck.vehicleNumber} at ${truck.temperature}°C (safe max ${truck.safeTempMax}°C). Nearest cold storage: ${wh.warehouse.name}, ${wh.distanceKm} km, ETA ${wh.etaMin} min.`,
              aiConfidence: 92 + Math.floor(Math.random() * 6),
              recommendedAction: `Immediate reroute to ${wh.warehouse.name}. Initiate cargo transfer. Contact ${wh.warehouse.contact} at ${wh.warehouse.phone}.`,
              level: 'critical',
              category: 'temperature',
            });

            if (!emergencyTruckRef.current) {
              emergencyTruckRef.current = truck.id;
              const countdown = Math.round((truck.temperature - truck.safeTempMax) * 180 + 600);
              setEmergency({
                active: true,
                shipmentId: truck.shipmentId,
                truckId: truck.id,
                truckPosition: truck.position,
                breachCountdownSec: Math.max(300, countdown),
                recommendedWarehouse: wh.warehouse,
                warehouseDistanceKm: wh.distanceKm,
                warehouseEtaMin: wh.etaMin,
                emergencyRoute: wh.routePath,
                reason: `Temperature ${truck.temperature}°C exceeds safe max ${truck.safeTempMax}°C. Predicted spoilage in ${Math.round(Math.max(300, countdown) / 60)} min.`,
              });
              setNearestWarehouse(wh);

              toast.error(`Emergency: ${truck.shipmentId} — cooling failure detected. Rerouting to ${wh.warehouse.name}.`, {
                duration: 6000,
              });
            }
          }
        } else if (status === 'warning' && prevStatus === 'safe') {
          addNotification({
            type: 'temperature_warning',
            title: `Temperature Warning — ${truck.shipmentId}`,
            message: `Vehicle ${truck.vehicleNumber}: temp ${truck.temperature}°C approaching safe limit of ${truck.safeTempMax}°C.`,
            shipmentId: truck.shipmentId,
            severity: 'warning',
            icon: 'Thermometer',
            data: { temperature: truck.temperature, safeMax: truck.safeTempMax },
          });
          addAlert({
            shipmentId: truck.shipmentId,
            title: 'Temperature approaching safe limit',
            description: `Truck ${truck.vehicleNumber} at ${truck.temperature}°C (limit ${truck.safeTempMax}°C). Thermal margin narrowing.`,
            aiConfidence: 80 + Math.floor(Math.random() * 12),
            recommendedAction: 'Reduce speed. Inspect HVAC. Monitor temperature every 1 min.',
            level: 'warning',
            category: 'temperature',
          });
          toast.warning(`Temperature warning on ${truck.shipmentId}: ${truck.temperature}°C approaching limit.`, { duration: 4000 });
        } else if (status === 'safe' && prevStatus === 'critical') {
          if (emergencyTruckRef.current === truck.id) {
            emergencyTruckRef.current = null;
            setEmergency(null);
          }
          addNotification({
            type: 'shipment_delivered',
            title: `Safe Status Restored — ${truck.shipmentId}`,
            message: `Temperature ${truck.temperature}°C back within safe range. Emergency resolved.`,
            shipmentId: truck.shipmentId,
            severity: 'information',
            icon: 'Package',
          });
          toast.success(`${truck.shipmentId}: temperature stabilized at ${truck.temperature}°C.`, { duration: 3000 });
        }
      }

      if (truck.progress >= 1 && !prevDeliveredRef.current[truck.id]) {
        prevDeliveredRef.current[truck.id] = true;
        addNotification({
          type: 'shipment_delivered',
          title: `Shipment Delivered — ${truck.shipmentId}`,
          message: `Vehicle ${truck.vehicleNumber} arrived at ${truck.toCity}. Delivery completed successfully.`,
          shipmentId: truck.shipmentId,
          severity: 'information',
          icon: 'Package',
        });
        toast.success(`${truck.shipmentId} delivered to ${truck.toCity}.`, { duration: 3000 });
      } else if (truck.progress < 0.2) {
        prevDeliveredRef.current[truck.id] = false;
      }

      if (Math.random() < 0.08 && status !== 'critical') {
        const r = Math.random();
        if (r < 0.4) {
          addNotification({
            type: 'traffic_detected',
            title: `Traffic Detected on route`,
            message: `Heavy traffic ahead for ${truck.vehicleNumber} on ${truck.fromCity}→${truck.toCity} corridor. Speed reduced to ${truck.speed} km/h.`,
            shipmentId: truck.shipmentId,
            severity: 'information',
            icon: 'TrafficCone',
          });
        } else if (r < 0.7) {
          addNotification({
            type: 'weather_alert',
            title: `Weather Alert — route ${truck.fromCity}→${truck.toCity}`,
            message: `Adverse weather conditions detected. Expect delays of 15-20 min.`,
            shipmentId: truck.shipmentId,
            severity: 'warning',
            icon: 'CloudRain',
          });
        } else {
          addNotification({
            type: 'ai_reroute',
            title: `AI Reroute Suggestion — ${truck.shipmentId}`,
            message: `AI engine recommends alternate route to save 18 min on ${truck.fromCity}→${truck.toCity} corridor.`,
            shipmentId: truck.shipmentId,
            severity: 'information',
            icon: 'BrainCircuit',
          });
        }
      }

      prevStatusRef.current[truck.id] = status;
    }
  }, [trucks, addNotification, addAlert]);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const markAlertRead = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
  }, []);

  const resolveAlert = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true, isResolved: true } : a));
  }, []);

  const transferToColdStorage = useCallback(() => {
    if (!emergency) return;
    addNotification({
      type: 'warehouse_recommendation',
      title: `Transfer Initiated — ${emergency.recommendedWarehouse?.name || 'Cold Storage'}`,
      message: `Cargo transfer protocol activated for ${emergency.shipmentId}. Backup vehicle dispatched to ${emergency.recommendedWarehouse?.name || 'warehouse'}.`,
      shipmentId: emergency.shipmentId,
      severity: 'critical',
      icon: 'Snowflake',
      data: { action: 'transfer_initiated' },
    });
    toast.success(`Transfer initiated to ${emergency.recommendedWarehouse?.name}. Backup vehicle dispatched.`, { duration: 5000 });
    emergencyTruckRef.current = null;
    setEmergency(null);
  }, [emergency, addNotification]);

  const dismissEmergency = useCallback(() => {
    emergencyTruckRef.current = null;
    setEmergency(null);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      alerts,
      emergency,
      nearestWarehouse,
      markNotificationRead,
      markAllRead,
      markAlertRead,
      resolveAlert,
      transferToColdStorage,
      dismissEmergency,
      addCRUDNotification: (type: NotificationType, title: string, message: string) => {
        addNotification({ type, title, message, shipmentId: '', severity: NOTIF_TYPE_CONFIG[type]?.severity ?? 'information', icon: NOTIF_TYPE_CONFIG[type]?.icon ?? 'Package' });
      },
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
