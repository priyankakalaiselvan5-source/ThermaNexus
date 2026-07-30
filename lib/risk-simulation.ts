export type HazardType =
  | 'traffic_congestion'
  | 'road_accident'
  | 'road_closure'
  | 'extreme_weather'
  | 'temperature_breach'
  | 'cooling_failure'
  | 'vehicle_breakdown'
  | 'low_fuel'
  | 'high_risk_zone'
  | 'hospital_priority';

export type WeatherCondition = 'clear' | 'rain' | 'flood' | 'heatwave' | 'wind' | 'fog';

export type CargoPriority = 'standard' | 'medical_priority';

export type RouteStatus = 'optimal' | 'rerouting' | 'rerouted' | 'blocked';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface ShipmentTelemetry {
  shipmentId: string;
  vehicleNumber: string;
  driverName: string;
  cargoType: string;
  cargoPriority: CargoPriority;
  routeFrom: string;
  routeTo: string;
  gpsLat: number;
  gpsLng: number;
  speed: number;
  temperature: number;
  safeTempMin: number;
  safeTempMax: number;
  humidity: number;
  fuelLevel: number;
  batteryLevel: number;
  coolingEfficiency: number;
  compressorHealth: number;
  weather: WeatherCondition;
  etaMinutes: number;
  distanceRemaining: number;
  progress: number;
}

export interface RiskEventResponse {
  id: string;
  shipmentId: string;
  hazardType: HazardType;
  timestamp: number;
  warningNotification: string;
  riskExplanation: string;
  confidenceScore: number;
  predictedDelayMin: number;
  predictedTempDelta: number;
  spoilageRiskPct: number;
  recommendedAction: string;
  rerouteStatus: RouteStatus;
  weather: WeatherCondition;
  riskLevel: RiskLevel;
  severity: Severity;
  location: string;
}

export interface RiskAnalysisSummary {
  shipmentId: string;
  currentRiskLevel: RiskLevel;
  riskType: HazardType | null;
  severity: Severity;
  confidence: number;
  estimatedDelayMin: number;
  temperatureTrend: 'rising' | 'stable' | 'falling';
  temperatureTrendValue: number;
  aiRecommendation: string;
  routeStatus: RouteStatus;
}

const SHIPMENTS: Omit<ShipmentTelemetry, 'gpsLat' | 'gpsLng' | 'speed' | 'temperature' | 'humidity' | 'fuelLevel' | 'batteryLevel' | 'coolingEfficiency' | 'compressorHealth' | 'weather' | 'etaMinutes' | 'distanceRemaining' | 'progress'>[] = [
  { shipmentId: 'TNX-SHP-2025-003', vehicleNumber: 'MH04SC1234', driverName: 'Vikram Singh', cargoType: 'Oxford-AstraZeneca Vaccine', cargoPriority: 'medical_priority', routeFrom: 'Mumbai', routeTo: 'Delhi', safeTempMin: 2, safeTempMax: 8 },
  { shipmentId: 'TNX-SHP-2025-007', vehicleNumber: 'KA05MN9012', driverName: 'Arjun Reddy', cargoType: 'Insulin Glargine', cargoPriority: 'medical_priority', routeFrom: 'Bengaluru', routeTo: 'Chennai', safeTempMin: 2, safeTempMax: 8 },
  { shipmentId: 'TNX-SHP-2025-009', vehicleNumber: 'TN22AB3456', driverName: 'Mohammed Khan', cargoType: 'Blood Plasma', cargoPriority: 'medical_priority', routeFrom: 'Kolkata', routeTo: 'Guwahati', safeTempMin: -25, safeTempMax: -15 },
  { shipmentId: 'TNX-SHP-2025-012', vehicleNumber: 'GJ01XY7890', driverName: 'Sneha Patel', cargoType: 'MMR Vaccine', cargoPriority: 'medical_priority', routeFrom: 'Ahmedabad', routeTo: 'Jaipur', safeTempMin: 2, safeTempMax: 8 },
  { shipmentId: 'TNX-SHP-2025-015', vehicleNumber: 'UP16CD4567', driverName: 'Rajesh Kumar', cargoType: 'Antibiotics (Amoxicillin)', cargoPriority: 'standard', routeFrom: 'Lucknow', routeTo: 'Kolkata', safeTempMin: 15, safeTempMax: 25 },
  { shipmentId: 'TNX-SHP-2025-018', vehicleNumber: 'DL01GH5678', driverName: 'Priya Sharma', cargoType: 'Chemotherapy Drug', cargoPriority: 'medical_priority', routeFrom: 'Delhi', routeTo: 'Chandigarh', safeTempMin: 2, safeTempMax: 8 },
];

const ROUTE_COORDS: Record<string, [number, number][]> = {
  'TNX-SHP-2025-003': [[19.076, 72.877], [22.5, 76.0], [28.6139, 77.209]],
  'TNX-SHP-2025-007': [[12.9716, 77.5946], [12.5, 79.0], [13.0827, 80.2707]],
  'TNX-SHP-2025-009': [[22.5726, 88.363], [24.5, 90.0], [26.1445, 91.7362]],
  'TNX-SHP-2025-012': [[23.0225, 72.5714], [25.0, 74.2], [26.9124, 75.7873]],
  'TNX-SHP-2025-015': [[26.8467, 80.946], [24.7, 84.6], [22.5726, 88.363]],
  'TNX-SHP-2025-018': [[28.6139, 77.209], [29.7, 77.0], [30.7333, 76.7794]],
};

const WEATHER_OPTIONS: WeatherCondition[] = ['clear', 'rain', 'flood', 'heatwave', 'wind', 'fog'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function createInitialTelemetry(): ShipmentTelemetry[] {
  return SHIPMENTS.map((s, i) => {
    const coords = ROUTE_COORDS[s.shipmentId] || [[22.5, 80.0]];
    const progress = randRange(0.15, 0.75);
    const segIdx = Math.min(Math.floor(progress * (coords.length - 1)), coords.length - 2);
    const segFrac = progress * (coords.length - 1) - segIdx;
    const lat = coords[segIdx][0] + (coords[segIdx + 1][0] - coords[segIdx][0]) * segFrac;
    const lng = coords[segIdx][1] + (coords[segIdx + 1][1] - coords[segIdx][1]) * segFrac;
    const baseTemp = s.cargoPriority === 'medical_priority' ? (s.safeTempMin + s.safeTempMax) / 2 : 20;
    return {
      ...s,
      gpsLat: lat,
      gpsLng: lng,
      speed: Math.round(randRange(40, 75)),
      temperature: Math.round((baseTemp + randRange(-1, 1.5)) * 10) / 10,
      humidity: Math.round(randRange(35, 55)),
      fuelLevel: Math.round(randRange(45, 85)),
      batteryLevel: Math.round(randRange(60, 95)),
      coolingEfficiency: Math.round(randRange(70, 98)),
      compressorHealth: Math.round(randRange(65, 95)),
      weather: i < 2 ? pick(['rain', 'fog', 'clear']) : 'clear',
      etaMinutes: Math.round(randRange(90, 420)),
      distanceRemaining: Math.round(randRange(80, 600)),
      progress,
    };
  });
}

function interpolatePosition(shipmentId: string, progress: number): [number, number] {
  const coords = ROUTE_COORDS[shipmentId] || [[22.5, 80.0]];
  if (coords.length < 2) return coords[0];
  const totalSeg = coords.length - 1;
  const segIdx = Math.min(Math.floor(progress * totalSeg), totalSeg - 1);
  const segFrac = progress * totalSeg - segIdx;
  return [
    coords[segIdx][0] + (coords[segIdx + 1][0] - coords[segIdx][0]) * segFrac,
    coords[segIdx][1] + (coords[segIdx + 1][1] - coords[segIdx][1]) * segFrac,
  ];
}

export function tickTelemetry(prev: ShipmentTelemetry[]): ShipmentTelemetry[] {
  return prev.map(t => {
    const newProgress = Math.min(t.progress + randRange(0.005, 0.015), 0.99);
    const [lat, lng] = interpolatePosition(t.shipmentId, newProgress);
    const tempDrift = t.temperature + randRange(-0.3, 0.4);
    const temp = Math.round(Math.max(t.safeTempMin - 3, Math.min(t.safeTempMax + 4, tempDrift)) * 10) / 10;
    const speedDrift = t.speed + Math.round(randRange(-5, 5));
    const speed = Math.max(0, Math.min(85, speedDrift));
    const fuelDrift = t.fuelLevel - randRange(0.2, 0.8);
    const fuel = Math.max(5, Math.round(fuelDrift));
    const coolingDrift = t.coolingEfficiency + randRange(-1.5, 0.5);
    const cooling = Math.max(30, Math.min(99, Math.round(coolingDrift)));
    const compDrift = t.compressorHealth + randRange(-1.0, 0.3);
    const compressor = Math.max(25, Math.min(98, Math.round(compDrift)));
    const etaDrift = t.etaMinutes - randRange(1, 4);
    const eta = Math.max(5, Math.round(etaDrift));
    return {
      ...t,
      gpsLat: lat,
      gpsLng: lng,
      speed,
      temperature: temp,
      humidity: Math.max(30, Math.min(65, Math.round(t.humidity + randRange(-2, 2)))),
      fuelLevel: fuel,
      batteryLevel: Math.max(20, Math.round(t.batteryLevel - randRange(0, 0.5))),
      coolingEfficiency: cooling,
      compressorHealth: compressor,
      etaMinutes: eta,
      distanceRemaining: Math.max(5, Math.round(t.distanceRemaining - randRange(2, 8))),
      progress: newProgress,
    };
  });
}

const HAZARD_TEMPLATES: Omit<RiskEventResponse, 'id' | 'shipmentId' | 'timestamp'>[] = [
  {
    hazardType: 'traffic_congestion',
    warningNotification: 'Heavy traffic congestion detected on route',
    riskExplanation: 'GPS speed dropped 40% below route average. Traffic feed shows 8km backup due to peak-hour congestion. Estimated 35-50 min additional delay.',
    confidenceScore: 87,
    predictedDelayMin: 42,
    predictedTempDelta: 0.0,
    spoilageRiskPct: 5,
    recommendedAction: 'Reroute via NH60 alternate corridor. Saves ~25 min. Minimal temperature impact expected.',
    rerouteStatus: 'rerouting',
    weather: 'clear',
    riskLevel: 'moderate',
    severity: 'medium',
    location: 'NH48, near Nashik junction',
  },
  {
    hazardType: 'road_accident',
    warningNotification: 'Road accident reported on route path',
    riskExplanation: 'Multi-vehicle collision reported 12km ahead on NH48. Lane closure expected for 2+ hours. Route is currently impassable.',
    confidenceScore: 94,
    predictedDelayMin: 120,
    predictedTempDelta: 0.5,
    spoilageRiskPct: 12,
    recommendedAction: 'Immediate reroute to NH52 via Dhule. Adds 45km but avoids accident zone.ETA revised +2h.',
    rerouteStatus: 'rerouted',
    weather: 'clear',
    riskLevel: 'high',
    severity: 'high',
    location: 'NH48, km 187, near Nashik',
  },
  {
    hazardType: 'extreme_weather',
    warningNotification: 'Heavy rainfall and localized flooding on route',
    riskExplanation: 'IMD weather alert: Heavy rainfall (85mm/hr) with waterlogging on NH48. Visibility reduced to 50m. Flood risk at 3 low-lying crossings.',
    confidenceScore: 91,
    predictedDelayMin: 65,
    predictedTempDelta: 0.0,
    spoilageRiskPct: 8,
    recommendedAction: 'Reroute via elevated NH52 corridor. Avoid flood-prone zones. Reduce speed to 35km/h. Monitor humidity impact on cooling.',
    rerouteStatus: 'rerouting',
    weather: 'flood',
    riskLevel: 'high',
    severity: 'high',
    location: 'NH48, Maharashtra sector 3',
  },
  {
    hazardType: 'temperature_breach',
    warningNotification: 'Temperature approaching upper safe threshold',
    riskExplanation: 'Cargo temperature trending upward at 0.3°C/15min. Current 7.3°C vs safe max 8.0°C. Projected breach in ~35 min if trend continues.',
    confidenceScore: 89,
    predictedDelayMin: 0,
    predictedTempDelta: 0.7,
    spoilageRiskPct: 22,
    recommendedAction: 'Activate supplemental cooling. Reduce HVAC load by limiting door opens. Reroute to nearest cold storage checkpoint for interim inspection.',
    rerouteStatus: 'optimal',
    weather: 'clear',
    riskLevel: 'high',
    severity: 'high',
    location: 'NH48, between Nashik and Dhule',
  },
  {
    hazardType: 'cooling_failure',
    warningNotification: 'CRITICAL: Refrigeration compressor failure detected',
    riskExplanation: 'Compressor health at 28%. Cooling efficiency dropped to 34%. Temperature rising at 0.8°C/10min. Cargo will exceed safe threshold in ~20 minutes.',
    confidenceScore: 96,
    predictedDelayMin: 0,
    predictedTempDelta: 3.5,
    spoilageRiskPct: 78,
    recommendedAction: 'EMERGENCY: Reroute immediately to nearest cold storage facility (18km). Dispatch backup refrigerated vehicle. Notify destination hospital of delay.',
    rerouteStatus: 'rerouted',
    weather: 'clear',
    riskLevel: 'critical',
    severity: 'critical',
    location: 'NH48, 18km from Nashik cold hub',
  },
  {
    hazardType: 'vehicle_breakdown',
    warningNotification: 'Vehicle stopped unexpectedly - possible breakdown',
    riskExplanation: 'GPS shows zero speed for 8 minutes. Engine diagnostic code P0301 (misfire). Battery at 22%. Vehicle immobilized on highway shoulder.',
    confidenceScore: 93,
    predictedDelayMin: 180,
    predictedTempDelta: 1.2,
    spoilageRiskPct: 35,
    recommendedAction: 'Dispatch backup vehicle from nearest depot (35km). Transfer cargo with cold-chain continuity. Send roadside assistance. ETA revised +3h.',
    rerouteStatus: 'blocked',
    weather: 'clear',
    riskLevel: 'critical',
    severity: 'critical',
    location: 'NH48, km 145, near Nashik bypass',
  },
  {
    hazardType: 'low_fuel',
    warningNotification: 'Insufficient fuel for remaining route distance',
    riskExplanation: 'Fuel at 12% with 185km remaining. At current consumption rate, fuel will deplete in ~95km. Vehicle will not reach destination.',
    confidenceScore: 85,
    predictedDelayMin: 20,
    predictedTempDelta: 0.0,
    spoilageRiskPct: 3,
    recommendedAction: 'Refuel at nearest station (12km, NH48 km 130). Estimated 15-min stop. No cargo risk expected if refuel completed within 30 min.',
    rerouteStatus: 'optimal',
    weather: 'clear',
    riskLevel: 'moderate',
    severity: 'medium',
    location: 'NH48, km 118',
  },
  {
    hazardType: 'high_risk_zone',
    warningNotification: 'Entering high-risk accident/crime zone',
    riskExplanation: 'Route passes through sector with 3.2x average accident rate and reported cargo theft incidents. Night transit increases risk multiplier.',
    confidenceScore: 78,
    predictedDelayMin: 0,
    predictedTempDelta: 0.0,
    spoilageRiskPct: 0,
    recommendedAction: 'Reroute around flagged zone via NH52 ring road. Adds 22km but avoids high-risk corridor. Maintain escort speed protocol.',
    rerouteStatus: 'rerouting',
    weather: 'clear',
    riskLevel: 'moderate',
    severity: 'medium',
    location: 'NH48, sector 7, industrial corridor',
  },
  {
    hazardType: 'hospital_priority',
    warningNotification: 'Hospital priority override: vaccine cargo optimization',
    riskExplanation: 'Cargo contains vaccines for scheduled immunization drive at destination hospital. Safety + speed prioritized over distance efficiency.',
    confidenceScore: 99,
    predictedDelayMin: 0,
    predictedTempDelta: 0.0,
    spoilageRiskPct: 0,
    recommendedAction: 'Optimize route for fastest safe delivery. Skip non-essential stops. Maintain strict 2-8°C. Pre-notify hospital for immediate cold storage intake.',
    rerouteStatus: 'optimal',
    weather: 'clear',
    riskLevel: 'low',
    severity: 'low',
    location: 'Route corridor NH48',
  },
  {
    hazardType: 'extreme_weather',
    warningNotification: 'Heatwave advisory - ambient temperature 43°C',
    riskExplanation: 'IMD heatwave alert: Ambient temp 43°C with high UV. Cooling system working at 92% capacity. Risk of accelerated temperature drift if system degrades.',
    confidenceScore: 82,
    predictedDelayMin: 10,
    predictedTempDelta: 0.4,
    spoilageRiskPct: 9,
    recommendedAction: 'Increase cooling power to maximum. Monitor compressor health closely. Consider night-time transit for remaining route to reduce thermal load.',
    rerouteStatus: 'optimal',
    weather: 'heatwave',
    riskLevel: 'moderate',
    severity: 'medium',
    location: 'Rajasthan highway sector',
  },
];

let hazardCounter = 0;

export function generateRiskEvent(shipment: ShipmentTelemetry): RiskEventResponse {
  const template = HAZARD_TEMPLATES[hazardCounter % HAZARD_TEMPLATES.length];
  hazardCounter++;
  return {
    ...template,
    id: `RISK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    shipmentId: shipment.shipmentId,
    timestamp: Date.now(),
    weather: shipment.weather !== 'clear' ? shipment.weather : template.weather,
    location: `${shipment.routeFrom} → ${shipment.routeTo}: ${template.location}`,
  };
}

export function analyzeRisk(
  telemetry: ShipmentTelemetry,
  activeEvent: RiskEventResponse | null,
): RiskAnalysisSummary {
  if (activeEvent) {
    const tempDelta = telemetry.temperature > telemetry.safeTempMax
      ? telemetry.temperature - telemetry.safeTempMax
      : telemetry.temperature < telemetry.safeTempMin
      ? telemetry.safeTempMin - telemetry.temperature
      : 0;
    return {
      shipmentId: telemetry.shipmentId,
      currentRiskLevel: activeEvent.riskLevel,
      riskType: activeEvent.hazardType,
      severity: activeEvent.severity,
      confidence: activeEvent.confidenceScore,
      estimatedDelayMin: activeEvent.predictedDelayMin,
      temperatureTrend: tempDelta > 0.5 ? 'rising' : tempDelta < -0.5 ? 'falling' : 'stable',
      temperatureTrendValue: Math.round(telemetry.temperature * 10) / 10,
      aiRecommendation: activeEvent.recommendedAction,
      routeStatus: activeEvent.rerouteStatus,
    };
  }
  const tempAbove = telemetry.temperature > telemetry.safeTempMax;
  const tempBelow = telemetry.temperature < telemetry.safeTempMin;
  const tempNearMax = telemetry.temperature > telemetry.safeTempMax - 1;
  const coolingLow = telemetry.coolingEfficiency < 60;
  const fuelLow = telemetry.fuelLevel < 20;
  let riskLevel: RiskLevel = 'low';
  let riskType: HazardType | null = null;
  let severity: Severity = 'low';
  let recommendation = 'All systems nominal. Continue on current route.';
  let routeStatus: RouteStatus = 'optimal';
  if (coolingLow || tempAbove || tempBelow) {
    riskLevel = coolingLow ? 'critical' : 'high';
    riskType = coolingLow ? 'cooling_failure' : 'temperature_breach';
    severity = coolingLow ? 'critical' : 'high';
    recommendation = coolingLow
      ? 'Cooling system degraded. Reroute to nearest cold storage checkpoint. Dispatch backup vehicle.'
      : 'Temperature outside safe range. Activate supplemental cooling and inspect HVAC system.';
    routeStatus = coolingLow ? 'rerouting' : 'optimal';
  } else if (tempNearMax) {
    riskLevel = 'moderate';
    riskType = 'temperature_breach';
    severity = 'medium';
    recommendation = 'Temperature approaching safe limit. Increase cooling capacity. Monitor trend closely.';
  } else if (fuelLow) {
    riskLevel = 'moderate';
    riskType = 'low_fuel';
    severity = 'medium';
    recommendation = 'Fuel below 20%. Refuel at nearest station to ensure route completion.';
  }
  const tempTrend: 'rising' | 'stable' | 'falling' =
    tempNearMax || tempAbove ? 'rising' : telemetry.coolingEfficiency > 85 ? 'stable' : 'stable';
  return {
    shipmentId: telemetry.shipmentId,
    currentRiskLevel: riskLevel,
    riskType,
    severity,
    confidence: riskLevel === 'low' ? 95 : 80 + Math.round(Math.random() * 15),
    estimatedDelayMin: 0,
    temperatureTrend: tempTrend,
    temperatureTrendValue: Math.round(telemetry.temperature * 10) / 10,
    aiRecommendation: recommendation,
    routeStatus,
  };
}

export const HAZARD_ICONS: Record<HazardType, string> = {
  traffic_congestion: 'CarFront',
  road_accident: 'CarFront',
  road_closure: 'Ban',
  extreme_weather: 'CloudRain',
  temperature_breach: 'Thermometer',
  cooling_failure: 'Snowflake',
  vehicle_breakdown: 'Wrench',
  low_fuel: 'Fuel',
  high_risk_zone: 'ShieldAlert',
  hospital_priority: 'Stethoscope',
};

export const WEATHER_ICONS: Record<WeatherCondition, string> = {
  clear: 'Sun',
  rain: 'CloudRain',
  flood: 'Droplets',
  heatwave: 'Flame',
  wind: 'Wind',
  fog: 'CloudFog',
};

export const RISK_LEVEL_STYLES: Record<RiskLevel, { bg: string; text: string; border: string; label: string }> = {
  low: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20', label: 'Low' },
  moderate: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20', label: 'Moderate' },
  high: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20', label: 'High' },
  critical: { bg: 'bg-critical/10', text: 'text-critical', border: 'border-critical/20', label: 'Critical' },
};

export const SEVERITY_STYLES: Record<Severity, { bg: string; text: string; border: string }> = {
  low: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20' },
  medium: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
  high: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20' },
  critical: { bg: 'bg-critical/10', text: 'text-critical', border: 'border-critical/20' },
};

export const ROUTE_STATUS_STYLES: Record<RouteStatus, { bg: string; text: string; label: string }> = {
  optimal: { bg: 'bg-success/10', text: 'text-success', label: 'Optimal' },
  rerouting: { bg: 'bg-warning/10', text: 'text-warning', label: 'Rerouting' },
  rerouted: { bg: 'bg-primary/10', text: 'text-primary', label: 'Rerouted' },
  blocked: { bg: 'bg-critical/10', text: 'text-critical', label: 'Blocked' },
};

export const HAZARD_LABELS: Record<HazardType, string> = {
  traffic_congestion: 'Traffic Congestion',
  road_accident: 'Road Accident',
  road_closure: 'Road Closure',
  extreme_weather: 'Extreme Weather',
  temperature_breach: 'Temperature Breach',
  cooling_failure: 'Cooling Failure',
  vehicle_breakdown: 'Vehicle Breakdown',
  low_fuel: 'Low Fuel',
  high_risk_zone: 'High-Risk Zone',
  hospital_priority: 'Hospital Priority',
};
