export interface Profile {
  id: string;
  name: string;
  email: string;
  role: 'administrator' | 'driver' | 'dispatcher' | 'hospital';
  company: string;
  phone: string;
  avatar_url: string | null;
  created_at: string;
  designation?: string | null;
  address?: string | null;
  notification_preferences?: Record<string, boolean> | null;
  dark_mode?: boolean | null;
  language?: string | null;
}

export interface DashboardStats {
  total_shipments: number;
  active_shipments: number;
  delayed_shipments: number;
  delivered_shipments: number;
  critical_shipments: number;
  avg_temperature: number;
  avg_delivery_time: number;
  rescued_shipments: number;
}

export interface AIPredictionResult {
  risk_score: number;
  risk_level: 'safe' | 'medium' | 'critical';
  reason: string;
  recommendation: string;
  remaining_thermal_stability: number;
  confidence: number;
}

export interface RescueRecommendation {
  cold_storage_id: string;
  name: string;
  city: string;
  distance_km: number;
  travel_time_min: number;
  contact_number: string;
  latitude: number;
  longitude: number;
}
