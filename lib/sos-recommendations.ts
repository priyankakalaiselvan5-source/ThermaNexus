/*
 * SOS AI Recommendation Engine
 * Generates context-aware recommendations based on emergency type.
 */

export type EmergencyType =
  | 'vehicle_breakdown'
  | 'cooling_failure'
  | 'accident'
  | 'medical_emergency'
  | 'road_block'
  | 'fuel_emergency'
  | 'shipment_damage'
  | 'refrigeration_failure';

export interface SosRecommendation {
  title: string;
  reason: string;
  recommendedAction: string;
  actionType: string;
  confidenceScore: number;
  priority: 'high' | 'critical';
  nearestWarehouse?: { name: string; city: string; distanceKm: number } | null;
}

const RECOMMENDATIONS: Record<EmergencyType, Omit<SosRecommendation, 'nearestWarehouse'>> = {
  vehicle_breakdown: {
    title: 'Dispatch Backup Vehicle',
    reason: 'Vehicle breakdown detected. Current shipment is immobilized and cargo integrity depends on rapid transfer to a backup refrigerated vehicle.',
    recommendedAction: 'Dispatch nearest available backup vehicle to the driver\'s GPS location. Transfer cargo with cold-chain continuity. Update ETA to destination hospital.',
    actionType: 'dispatch_backup',
    confidenceScore: 92,
    priority: 'critical',
  },
  cooling_failure: {
    title: 'Reroute to Nearest Cold Storage',
    reason: 'Cooling system failure detected. Cargo temperature rising. Immediate action needed to prevent spoilage of temperature-sensitive medicine.',
    recommendedAction: 'Reroute driver to the nearest cold storage warehouse. Transfer cargo to backup refrigerated vehicle. Notify destination hospital of revised ETA.',
    actionType: 'stop_cold_storage',
    confidenceScore: 95,
    priority: 'critical',
  },
  accident: {
    title: 'Reroute Nearby Shipments & Send Help',
    reason: 'Accident detected on route. Other nearby shipments may be affected by traffic congestion. Emergency services should be dispatched immediately.',
    recommendedAction: 'Dispatch emergency services to the accident location. Reroute other nearby shipments away from the affected area. Assess cargo damage and driver safety.',
    actionType: 'immediate_reroute',
    confidenceScore: 90,
    priority: 'critical',
  },
  medical_emergency: {
    title: 'Dispatch Medical Assistance',
    reason: 'Medical emergency reported by driver. Immediate medical attention required. Shipment may need reassignment to another driver.',
    recommendedAction: 'Dispatch medical assistance to the driver\'s GPS location. Reassign shipment to nearest available driver. Notify destination hospital of delay.',
    actionType: 'dispatch_backup',
    confidenceScore: 88,
    priority: 'critical',
  },
  road_block: {
    title: 'Calculate Alternate Route',
    reason: 'Road block detected on current route. Shipment will be delayed unless rerouted immediately.',
    recommendedAction: 'Calculate alternate route using OSRM to bypass the blocked road. Update ETA. Notify destination hospital of revised arrival time.',
    actionType: 'prepare_alt_route',
    confidenceScore: 85,
    priority: 'high',
  },
  fuel_emergency: {
    title: 'Dispatch Fuel Support',
    reason: 'Fuel emergency detected. Vehicle may stop soon, risking cargo temperature stability and delivery timeline.',
    recommendedAction: 'Dispatch fuel support to the driver\'s location. If unable, dispatch backup vehicle for cargo transfer. Monitor cargo temperature closely.',
    actionType: 'dispatch_backup',
    confidenceScore: 83,
    priority: 'high',
  },
  shipment_damage: {
    title: 'Assess Cargo & Notify Hospital',
    reason: 'Shipment damage reported. Cargo integrity may be compromised. Hospital should be prepared to inspect upon arrival.',
    recommendedAction: 'Assess extent of cargo damage at current location. Notify destination hospital to prepare for inspection. Document damage for insurance and compliance.',
    actionType: 'notify_hospital',
    confidenceScore: 87,
    priority: 'high',
  },
  refrigeration_failure: {
    title: 'Emergency Cold Storage Transfer',
    reason: 'Refrigeration system failure detected. Cargo temperature will rise rapidly. Immediate transfer to cold storage is critical to prevent total loss.',
    recommendedAction: 'Reroute to nearest cold storage warehouse immediately. Dispatch backup refrigerated vehicle for cargo transfer. Notify hospital of critical delay.',
    actionType: 'stop_cold_storage',
    confidenceScore: 96,
    priority: 'critical',
  },
};

export function generateSosRecommendation(
  type: EmergencyType,
  nearestWarehouse?: { name: string; city: string; distanceKm: number } | null,
): SosRecommendation {
  const base = RECOMMENDATIONS[type] || RECOMMENDATIONS.vehicle_breakdown;
  return {
    ...base,
    nearestWarehouse: nearestWarehouse || null,
  };
}

export const EMERGENCY_TYPE_LABELS: Record<EmergencyType, string> = {
  vehicle_breakdown: 'Vehicle Breakdown',
  cooling_failure: 'Cooling Failure',
  accident: 'Accident',
  medical_emergency: 'Medical Emergency',
  road_block: 'Road Block',
  fuel_emergency: 'Fuel Emergency',
  shipment_damage: 'Shipment Damage',
  refrigeration_failure: 'Refrigeration Failure',
};
