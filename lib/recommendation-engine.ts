import type { TruckState } from '@/lib/map-data';

export type RecommendationTier = 'safe' | 'warning' | 'critical';
export type RecommendationPriority = 'low' | 'medium' | 'high' | 'critical';
export type RecommendationStatus = 'pending' | 'accepted' | 'ignored' | 'completed';
export type PayloadPriority = 'vaccines' | 'blood' | 'organs' | 'medicines' | 'standard';

export interface TelemetryInput {
  shipmentId: string;
  shipmentNumber: string;
  vehicleNumber: string;
  driverName: string;
  temperature: number;
  humidity: number;
  vehicleSpeed: number;
  trafficCondition: 'clear' | 'moderate' | 'heavy' | 'standstill';
  weatherCondition: 'clear' | 'rain' | 'fog' | 'heatwave' | 'storm' | 'flood';
  etaMinutes: number;
  distanceRemaining: number;
  refrigerationStatus: 'normal' | 'degraded' | 'failed';
  payloadPriority: PayloadPriority;
  routeRiskScore: number;
  safeTempMin: number;
  safeTempMax: number;
  currentCity: string;
  originCity: string;
  destinationCity: string;
  progress: number;
}

export interface Recommendation {
  id: string;
  shipmentId: string;
  shipmentNumber: string;
  vehicleNumber: string;
  currentCity: string;
  originCity: string;
  destinationCity: string;
  tier: RecommendationTier;
  priority: RecommendationPriority;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  title: string;
  reason: string;
  expectedBenefit: string;
  confidenceScore: number;
  recommendedAction: string;
  actionType: 'continue' | 'reduce_speed' | 'inspect_hvac' | 'monitor' | 'prepare_alt_route' | 'immediate_reroute' | 'dispatch_backup' | 'stop_cold_storage' | 'notify_hospital';
  status: RecommendationStatus;
  timestamp: number;
  acceptedAt: number | null;
  completedAt: number | null;
  payloadPriority: PayloadPriority;
}

export interface DecisionHistoryEntry {
  id: string;
  recommendationId: string;
  shipmentId: string;
  shipmentNumber: string;
  prediction: string;
  riskDetected: string;
  recommendationGenerated: string;
  operatorAction: 'accepted' | 'ignored';
  finalOutcome: string;
  confidenceScore: number;
  timestamp: number;
}

interface EvaluationFactors {
  tempAboveMax: boolean;
  tempApproachingLimit: boolean;
  hvacDegraded: boolean;
  hvacFailed: boolean;
  highHumidity: boolean;
  trafficDelay: boolean;
  medicalPriority: boolean;
  medicalDelayed: boolean;
  highRouteRisk: boolean;
  lowFuel: boolean;
}

const PAYLOAD_MAP: Record<string, PayloadPriority> = {
  'TNX-SHP-2025-001': 'vaccines',
  'TNX-SHP-2025-002': 'medicines',
  'TNX-SHP-2025-003': 'medicines',
  'TNX-SHP-2025-004': 'blood',
  'TNX-SHP-2025-005': 'vaccines',
  'TNX-SHP-2025-006': 'medicines',
  'TNX-SHP-2025-007': 'organs',
  'TNX-SHP-2025-008': 'medicines',
  'TNX-SHP-2025-009': 'vaccines',
  'TNX-SHP-2025-010': 'blood',
};

const WEATHER_MAP: Record<string, TelemetryInput['weatherCondition']> = {
  clear: 'clear',
  rain: 'rain',
  fog: 'fog',
  heatwave: 'heatwave',
  wind: 'clear',
  flood: 'flood',
};

function inferTraffic(speed: number): TelemetryInput['trafficCondition'] {
  if (speed < 15) return 'standstill';
  if (speed < 35) return 'heavy';
  if (speed < 55) return 'moderate';
  return 'clear';
}

function inferWeather(status: 'safe' | 'warning' | 'critical', temp: number): TelemetryInput['weatherCondition'] {
  if (temp > 7) return 'heatwave';
  if (status === 'critical') return 'storm';
  if (status === 'warning') return 'rain';
  return 'clear';
}

function inferRefrigeration(status: 'safe' | 'warning' | 'critical', temp: number, safeMax: number): TelemetryInput['refrigerationStatus'] {
  if (status === 'critical' || temp > safeMax + 2) return 'failed';
  if (temp > safeMax - 0.5 || status === 'warning') return 'degraded';
  return 'normal';
}

function inferRouteRisk(temperature: number, safeMax: number, speed: number, routeRiskScore: number): number {
  let score = routeRiskScore;
  if (temperature > safeMax) score += 30;
  else if (temperature > safeMax - 1) score += 15;
  if (speed < 35) score += 10;
  return Math.min(100, score);
}

let recCounter = 0;
function genId(): string {
  recCounter++;
  return `REC-${Date.now()}-${recCounter}`;
}

export function truckToTelemetry(truck: TruckState): TelemetryInput {
  const payloadPriority = PAYLOAD_MAP[truck.shipmentId] || 'standard';
  const baseRouteRisk = 20 + Math.random() * 20;
  const traffic = inferTraffic(truck.speed);
  const weather = inferWeather(truck.status, truck.temperature);
  const refrigeration = inferRefrigeration(truck.status, truck.temperature, truck.safeTempMax);
  const routeRiskScore = inferRouteRisk(truck.temperature, truck.safeTempMax, truck.speed, baseRouteRisk);
  const etaMinutes = Math.round((1 - truck.progress) * 100 * 4);
  const humidity = Math.round(40 + Math.random() * 20);

  return {
    shipmentId: truck.id,
    shipmentNumber: truck.shipmentId,
    vehicleNumber: truck.vehicleNumber,
    driverName: truck.driverName,
    temperature: truck.temperature,
    humidity,
    vehicleSpeed: truck.speed,
    trafficCondition: traffic,
    weatherCondition: weather,
    etaMinutes,
    distanceRemaining: Math.round((1 - truck.progress) * 500),
    refrigerationStatus: refrigeration,
    payloadPriority,
    routeRiskScore: Math.round(routeRiskScore),
    safeTempMin: truck.safeTempMin,
    safeTempMax: truck.safeTempMax,
    currentCity: truck.fromCity,
    originCity: truck.fromCity,
    destinationCity: truck.toCity,
    progress: truck.progress,
  };
}

function evaluateFactors(input: TelemetryInput): EvaluationFactors {
  const tempAboveMax = input.temperature > input.safeTempMax;
  const trafficDelay = input.trafficCondition === 'heavy' || input.trafficCondition === 'standstill';
  const medicalPriority = input.payloadPriority === 'vaccines' || input.payloadPriority === 'blood' || input.payloadPriority === 'organs';
  return {
    tempAboveMax,
    tempApproachingLimit: input.temperature > input.safeTempMax - 1.5 && !tempAboveMax,
    hvacDegraded: input.refrigerationStatus === 'degraded',
    hvacFailed: input.refrigerationStatus === 'failed',
    highHumidity: input.humidity > 60,
    trafficDelay,
    medicalPriority,
    medicalDelayed: medicalPriority && trafficDelay,
    highRouteRisk: input.routeRiskScore > 60,
    lowFuel: false,
  };
}

function determineTier(factors: EvaluationFactors): RecommendationTier {
  if (
    factors.tempAboveMax ||
    factors.hvacFailed ||
    factors.medicalDelayed
  ) return 'critical';
  if (
    factors.tempApproachingLimit ||
    factors.hvacDegraded ||
    factors.highHumidity ||
    factors.trafficDelay ||
    factors.highRouteRisk
  ) return 'warning';
  return 'safe';
}

function tierToPriority(tier: RecommendationTier, factors: EvaluationFactors): RecommendationPriority {
  if (tier === 'critical') {
    if (factors.hvacFailed || factors.medicalDelayed) return 'critical';
    return 'high';
  }
  if (tier === 'warning') {
    if (factors.tempApproachingLimit || factors.highRouteRisk) return 'high';
    return 'medium';
  }
  return 'low';
}

function tierToRiskLevel(tier: RecommendationTier): 'low' | 'moderate' | 'high' | 'critical' {
  if (tier === 'critical') return 'critical';
  if (tier === 'warning') return 'high';
  return 'low';
}

function buildRecommendation(
  input: TelemetryInput,
  tier: RecommendationTier,
  factors: EvaluationFactors,
): Omit<Recommendation, 'id' | 'timestamp' | 'status' | 'acceptedAt' | 'completedAt'> {
  const priority = tierToPriority(tier, factors);
  const riskLevel = tierToRiskLevel(tier);
  const payloadLabel = input.payloadPriority.charAt(0).toUpperCase() + input.payloadPriority.slice(1);

  if (tier === 'critical') {
    if (factors.hvacFailed) {
      return {
        shipmentId: input.shipmentId,
        shipmentNumber: input.shipmentNumber,
        vehicleNumber: input.vehicleNumber,
        currentCity: input.currentCity,
        originCity: input.originCity,
        destinationCity: input.destinationCity,
        tier,
        priority,
        riskLevel,
        title: `Critical: Cooling failure on ${input.shipmentNumber}`,
        reason: `Refrigeration system failure detected. Temperature at ${input.temperature}°C exceeds safe limit of ${input.safeTempMax}°C. ${payloadLabel} cargo at immediate spoilage risk.`,
        expectedBenefit: `Prevents total cargo loss. Stopping at cold storage preserves remaining thermal window. Estimated savings: ₹4.2L in payload value.`,
        confidenceScore: 90 + Math.floor(Math.random() * 8),
        recommendedAction: `Immediate reroute to nearest cold storage facility. Dispatch backup refrigerated vehicle. Notify destination hospital of revised ETA.`,
        actionType: 'stop_cold_storage',
        payloadPriority: input.payloadPriority,
      };
    }
    if (factors.medicalDelayed) {
      return {
        shipmentId: input.shipmentId,
        shipmentNumber: input.shipmentNumber,
        vehicleNumber: input.vehicleNumber,
        currentCity: input.currentCity,
        originCity: input.originCity,
        destinationCity: input.destinationCity,
        tier,
        priority,
        riskLevel,
        title: `Critical: ${payloadLabel} shipment delayed >10 min`,
        reason: `Medical-priority cargo (${payloadLabel}) experiencing traffic delay. Current ETA exceeds schedule by ${input.etaMinutes} min. Patient safety window at risk.`,
        expectedBenefit: `Alternate route recovers ~25 min. Ensures ${payloadLabel.toLowerCase()} delivery within hospital's acceptance window.`,
        confidenceScore: 88 + Math.floor(Math.random() * 8),
        recommendedAction: `Immediate reroute via alternate corridor. Notify hospital of updated ETA. Prioritize speed over distance efficiency.`,
        actionType: 'immediate_reroute',
        payloadPriority: input.payloadPriority,
      };
    }
    return {
      shipmentId: input.shipmentId,
      shipmentNumber: input.shipmentNumber,
      vehicleNumber: input.vehicleNumber,
      currentCity: input.currentCity,
      originCity: input.originCity,
      destinationCity: input.destinationCity,
      tier,
      priority,
      riskLevel,
      title: `Critical: Temperature breach on ${input.shipmentNumber}`,
      reason: `Cargo temperature at ${input.temperature}°C exceeds safe maximum of ${input.safeTempMax}°C. Spoilage risk critical for ${payloadLabel} payload.`,
      expectedBenefit: `Immediate action prevents cargo loss worth ₹3.8L. Reroute + backup vehicle ensures cold-chain continuity.`,
      confidenceScore: 92 + Math.floor(Math.random() * 6),
      recommendedAction: `Immediate reroute to nearest cold storage. Dispatch backup vehicle. Notify destination hospital.`,
      actionType: 'immediate_reroute',
      payloadPriority: input.payloadPriority,
    };
  }

  if (tier === 'warning') {
    if (factors.tempApproachingLimit) {
      return {
        shipmentId: input.shipmentId,
        shipmentNumber: input.shipmentNumber,
        vehicleNumber: input.vehicleNumber,
        currentCity: input.currentCity,
        originCity: input.originCity,
        destinationCity: input.destinationCity,
        tier,
        priority,
        riskLevel,
        title: `Warning: Temperature approaching limit on ${input.shipmentNumber}`,
        reason: `Cargo temperature at ${input.temperature}°C approaching safe limit of ${input.safeTempMax}°C (within 1.5°C margin). ${factors.hvacDegraded ? 'HVAC efficiency degraded.' : ''} ${factors.highHumidity ? `Humidity at ${input.humidity}% adds thermal load.` : ''}`,
        expectedBenefit: `Proactive cooling prevents breach. Monitoring every 1 min catches drift early, avoiding costly reroute.`,
        confidenceScore: 82 + Math.floor(Math.random() * 10),
        recommendedAction: `Reduce vehicle speed to lower thermal load. Inspect HVAC unit. Monitor temperature every 1 min. Prepare alternate route in case of breach.`,
        actionType: 'inspect_hvac',
        payloadPriority: input.payloadPriority,
      };
    }
    if (factors.trafficDelay) {
      return {
        shipmentId: input.shipmentId,
        shipmentNumber: input.shipmentNumber,
        vehicleNumber: input.vehicleNumber,
        currentCity: input.currentCity,
        originCity: input.originCity,
        destinationCity: input.destinationCity,
        tier,
        priority,
        riskLevel,
        title: `Warning: Traffic delay on ${input.shipmentNumber}`,
        reason: `${input.trafficCondition === 'standstill' ? 'Standstill' : 'Heavy'} traffic detected. Current speed ${input.vehicleSpeed} km/h. Estimated delay exceeds 15 min threshold.`,
        expectedBenefit: `Alternate route saves ~20 min. Reduces cold-chain exposure time and maintains delivery schedule.`,
        confidenceScore: 78 + Math.floor(Math.random() * 12),
        recommendedAction: `Reduce speed to conserve fuel. Monitor traffic feed every 1 min. Prepare alternate route via next available corridor.`,
        actionType: 'prepare_alt_route',
        payloadPriority: input.payloadPriority,
      };
    }
    if (factors.highRouteRisk) {
      return {
        shipmentId: input.shipmentId,
        shipmentNumber: input.shipmentNumber,
        vehicleNumber: input.vehicleNumber,
        currentCity: input.currentCity,
        originCity: input.originCity,
        destinationCity: input.destinationCity,
        tier,
        priority,
        riskLevel,
        title: `Warning: High route risk on ${input.shipmentNumber}`,
        reason: `Route risk score at ${input.routeRiskScore}/100. Elevated accident and theft risk in current corridor. ${input.weatherCondition !== 'clear' ? `Weather: ${input.weatherCondition}.` : ''}`,
        expectedBenefit: `Rerouting avoids high-risk zone, improving safety margin by ~40%.`,
        confidenceScore: 75 + Math.floor(Math.random() * 15),
        recommendedAction: `Prepare alternate route around flagged zone. Monitor conditions. Maintain escort speed protocol.`,
        actionType: 'prepare_alt_route',
        payloadPriority: input.payloadPriority,
      };
    }
    return {
      shipmentId: input.shipmentId,
      shipmentNumber: input.shipmentNumber,
      vehicleNumber: input.vehicleNumber,
      currentCity: input.currentCity,
      originCity: input.originCity,
      destinationCity: input.destinationCity,
      tier,
      priority,
      riskLevel,
      title: `Warning: Environmental stress on ${input.shipmentNumber}`,
      reason: `High humidity at ${input.humidity}% detected. HVAC under increased load. Temperature stable but margin narrowing.`,
      expectedBenefit: `Proactive monitoring prevents cascade into temperature breach.`,
      confidenceScore: 74 + Math.floor(Math.random() * 12),
      recommendedAction: `Monitor temperature every 1 min. Reduce speed to lower thermal load. Prepare alternate route.`,
      actionType: 'monitor',
      payloadPriority: input.payloadPriority,
    };
  }

  return {
    shipmentId: input.shipmentId,
    shipmentNumber: input.shipmentNumber,
    vehicleNumber: input.vehicleNumber,
    currentCity: input.currentCity,
    originCity: input.originCity,
    destinationCity: input.destinationCity,
    tier,
    priority,
    riskLevel,
    title: `Safe: ${input.shipmentNumber} operating nominally`,
    reason: `Temperature ${input.temperature}°C within safe range (${input.safeTempMin}–${input.safeTempMax}°C). HVAC normal. ETA on schedule (${input.etaMinutes} min). Traffic clear.`,
    expectedBenefit: `No action needed. Continued monitoring ensures early detection of any deviation.`,
    confidenceScore: 94 + Math.floor(Math.random() * 5),
    recommendedAction: `Continue current route. Maintain standard monitoring interval.`,
    actionType: 'continue',
    payloadPriority: input.payloadPriority,
  };
}

export class RecommendationEngine {
  evaluate(input: TelemetryInput): Recommendation {
    const factors = evaluateFactors(input);
    const tier = determineTier(factors);
    const base = buildRecommendation(input, tier, factors);
    return {
      ...base,
      id: genId(),
      timestamp: Date.now(),
      status: 'pending',
      acceptedAt: null,
      completedAt: null,
    };
  }

  evaluateBatch(inputs: TelemetryInput[]): Recommendation[] {
    return inputs.map(input => this.evaluate(input));
  }

  shouldGenerateRecommendation(current: Recommendation | undefined, newRec: Recommendation): boolean {
    if (!current) return newRec.tier !== 'safe';
    if (current.status === 'accepted' || current.status === 'completed') {
      return newRec.tier === 'critical' && current.tier !== 'critical';
    }
    return newRec.tier !== current.tier || (newRec.tier === current.tier && Date.now() - current.timestamp > 30000);
  }
}

export function createDecisionHistoryEntry(
  rec: Recommendation,
  operatorAction: 'accepted' | 'ignored',
): DecisionHistoryEntry {
  const outcomes: Record<string, string> = {
    continue: 'Route maintained. Shipment on schedule.',
    reduce_speed: 'Speed reduced. Thermal load decreased. Temperature stabilized.',
    inspect_hvac: 'HVAC inspected. Cooling efficiency restored to 92%.',
    monitor: 'Monitoring intensified. No further deviation detected.',
    prepare_alt_route: 'Alternate route prepared. Ready for deployment if needed.',
    immediate_reroute: 'Rerouted via alternate corridor. ETA recovered by 22 min.',
    dispatch_backup: 'Backup vehicle dispatched. Cargo transfer successful.',
    stop_cold_storage: 'Stopped at cold storage. Cargo preserved. Backup vehicle en route.',
    notify_hospital: 'Hospital notified. Revised ETA accepted. Receiving team on standby.',
  };

  return {
    id: `DH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    recommendationId: rec.id,
    shipmentId: rec.shipmentId,
    shipmentNumber: rec.shipmentNumber,
    prediction: rec.title,
    riskDetected: rec.reason,
    recommendationGenerated: rec.recommendedAction,
    operatorAction,
    finalOutcome: operatorAction === 'accepted'
      ? outcomes[rec.actionType] || 'Action completed successfully.'
      : 'Recommendation ignored. Monitoring continues.',
    confidenceScore: rec.confidenceScore,
    timestamp: Date.now(),
  };
}

export const TIER_STYLES: Record<RecommendationTier, { bg: string; text: string; border: string; dot: string; label: string }> = {
  safe: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20', dot: 'bg-success', label: 'Safe' },
  warning: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20', dot: 'bg-warning', label: 'Warning' },
  critical: { bg: 'bg-critical/10', text: 'text-critical', border: 'border-critical/20', dot: 'bg-critical', label: 'Critical' },
};

export const PRIORITY_STYLES: Record<RecommendationPriority, { bg: string; text: string; label: string }> = {
  low: { bg: 'bg-success/10', text: 'text-success', label: 'Low' },
  medium: { bg: 'bg-primary/10', text: 'text-primary', label: 'Medium' },
  high: { bg: 'bg-warning/10', text: 'text-warning', label: 'High' },
  critical: { bg: 'bg-critical/10', text: 'text-critical', label: 'Critical' },
};

export const STATUS_STYLES: Record<RecommendationStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-warning/10', text: 'text-warning', label: 'Pending' },
  accepted: { bg: 'bg-primary/10', text: 'text-primary', label: 'Accepted' },
  ignored: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Ignored' },
  completed: { bg: 'bg-success/10', text: 'text-success', label: 'Completed' },
};

export const ACTION_TYPE_LABELS: Record<Recommendation['actionType'], string> = {
  continue: 'Continue Route',
  reduce_speed: 'Reduce Speed',
  inspect_hvac: 'Inspect HVAC',
  monitor: 'Monitor',
  prepare_alt_route: 'Prepare Alt Route',
  immediate_reroute: 'Immediate Reroute',
  dispatch_backup: 'Dispatch Backup',
  stop_cold_storage: 'Stop at Cold Storage',
  notify_hospital: 'Notify Hospital',
};
