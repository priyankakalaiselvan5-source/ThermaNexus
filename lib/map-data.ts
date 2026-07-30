export interface CityLocation {
  name: string;
  lat: number;
  lng: number;
  type: 'warehouse' | 'hospital' | 'hub' | 'distribution';
  state: string;
}

export interface RouteDefinition {
  id: string;
  from: string;
  to: string;
  waypoints: [number, number][];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface TruckState {
  id: string;
  shipmentId: string;
  vehicleNumber: string;
  driverName: string;
  routeId: string;
  fromCity: string;
  toCity: string;
  position: [number, number];
  speed: number;
  temperature: number;
  safeTempMin: number;
  safeTempMax: number;
  eta: string;
  status: 'safe' | 'warning' | 'critical';
  progress: number;
  routeProgress: [number, number][];
  rerouted?: boolean;
  acceptedAction?: string;
}

export const INDIA_CENTER: [number, number] = [22.5, 80.0];
export const INDIA_ZOOM = 5;

export const CITIES: CityLocation[] = [
  { name: 'Delhi', lat: 28.6139, lng: 77.209, type: 'hub', state: 'Delhi' },
  { name: 'Mumbai', lat: 19.076, lng: 72.877, type: 'hub', state: 'Maharashtra' },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707, type: 'hub', state: 'Tamil Nadu' },
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946, type: 'hub', state: 'Karnataka' },
  { name: 'Hyderabad', lat: 17.385, lng: 78.4867, type: 'hub', state: 'Telangana' },
  { name: 'Kolkata', lat: 22.5726, lng: 88.363, type: 'hub', state: 'West Bengal' },
  { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714, type: 'hub', state: 'Gujarat' },
  { name: 'Pune', lat: 18.5204, lng: 73.8567, type: 'distribution', state: 'Maharashtra' },
  { name: 'Jaipur', lat: 26.9124, lng: 75.7873, type: 'distribution', state: 'Rajasthan' },
  { name: 'Lucknow', lat: 26.8467, lng: 80.946, type: 'distribution', state: 'Uttar Pradesh' },
  { name: 'Kochi', lat: 9.9312, lng: 76.2673, type: 'distribution', state: 'Kerala' },
  { name: 'Guwahati', lat: 26.1445, lng: 91.7362, type: 'distribution', state: 'Assam' },
  { name: 'Bhubaneswar', lat: 20.296, lng: 85.8245, type: 'distribution', state: 'Odisha' },
  { name: 'Nagpur', lat: 21.1458, lng: 79.0882, type: 'distribution', state: 'Maharashtra' },
  { name: 'Chandigarh', lat: 30.7333, lng: 76.7794, type: 'distribution', state: 'Chandigarh' },
];

export const CITY_MAP: Record<string, CityLocation> = CITIES.reduce((acc, c) => {
  acc[c.name] = c;
  return acc;
}, {} as Record<string, CityLocation>);

function wp(from: string, to: string, midpoints: [number, number][]): [number, number][] {
  const f = CITY_MAP[from];
  const t = CITY_MAP[to];
  if (!f || !t) return [];
  return [[f.lat, f.lng], ...midpoints, [t.lat, t.lng]];
}

export const ROUTES: RouteDefinition[] = [
  { id: 'R001', from: 'Mumbai', to: 'Delhi', priority: 'high', waypoints: wp('Mumbai', 'Delhi', [[22.5, 76.0]]) },
  { id: 'R002', from: 'Delhi', to: 'Kolkata', priority: 'high', waypoints: wp('Delhi', 'Kolkata', [[25.0, 83.0]]) },
  { id: 'R003', from: 'Chennai', to: 'Bengaluru', priority: 'medium', waypoints: wp('Chennai', 'Bengaluru', [[12.5, 79.0]]) },
  { id: 'R004', from: 'Mumbai', to: 'Pune', priority: 'low', waypoints: wp('Mumbai', 'Pune', [[18.8, 73.3]]) },
  { id: 'R005', from: 'Hyderabad', to: 'Chennai', priority: 'medium', waypoints: wp('Hyderabad', 'Chennai', [[15.5, 79.5]]) },
  { id: 'R006', from: 'Kolkata', to: 'Bhubaneswar', priority: 'medium', waypoints: wp('Kolkata', 'Bhubaneswar', [[21.5, 87.0]]) },
  { id: 'R007', from: 'Ahmedabad', to: 'Mumbai', priority: 'high', waypoints: wp('Ahmedabad', 'Mumbai', [[21.0, 72.7]]) },
  { id: 'R008', from: 'Delhi', to: 'Jaipur', priority: 'low', waypoints: wp('Delhi', 'Jaipur', [[27.8, 76.5]]) },
  { id: 'R009', from: 'Delhi', to: 'Lucknow', priority: 'medium', waypoints: wp('Delhi', 'Lucknow', [[27.8, 79.5]]) },
  { id: 'R010', from: 'Bengaluru', to: 'Kochi', priority: 'medium', waypoints: wp('Bengaluru', 'Kochi', [[11.5, 77.0]]) },
  { id: 'R011', from: 'Kolkata', to: 'Guwahati', priority: 'high', waypoints: wp('Kolkata', 'Guwahati', [[24.5, 90.0]]) },
  { id: 'R012', from: 'Nagpur', to: 'Hyderabad', priority: 'medium', waypoints: wp('Nagpur', 'Hyderabad', [[19.3, 78.8]]) },
  { id: 'R013', from: 'Chandigarh', to: 'Delhi', priority: 'low', waypoints: wp('Chandigarh', 'Delhi', [[29.7, 77.0]]) },
  { id: 'R014', from: 'Mumbai', to: 'Nagpur', priority: 'medium', waypoints: wp('Mumbai', 'Nagpur', [[20.1, 75.9]]) },
  { id: 'R015', from: 'Pune', to: 'Bengaluru', priority: 'high', waypoints: wp('Pune', 'Bengaluru', [[15.8, 75.7]]) },
  { id: 'R016', from: 'Chennai', to: 'Kochi', priority: 'medium', waypoints: wp('Chennai', 'Kochi', [[11.5, 78.3]]) },
  { id: 'R017', from: 'Ahmedabad', to: 'Jaipur', priority: 'medium', waypoints: wp('Ahmedabad', 'Jaipur', [[25.0, 74.2]]) },
  { id: 'R018', from: 'Lucknow', to: 'Kolkata', priority: 'high', waypoints: wp('Lucknow', 'Kolkata', [[24.7, 84.6]]) },
];

export const TRUCK_INIT_DATA = [
  { shipmentId: 'TNX-SHP-2025-001', vehicleNumber: 'MH04SC1234', driverName: 'Vikram Singh', tempBase: 4.2 },
  { shipmentId: 'TNX-SHP-2025-002', vehicleNumber: 'DL01GH5678', driverName: 'Priya Sharma', tempBase: 3.8 },
  { shipmentId: 'TNX-SHP-2025-003', vehicleNumber: 'KA05MN9012', driverName: 'Arjun Reddy', tempBase: 5.1 },
  { shipmentId: 'TNX-SHP-2025-004', vehicleNumber: 'TN22AB3456', driverName: 'Mohammed Khan', tempBase: 7.8 },
  { shipmentId: 'TNX-SHP-2025-005', vehicleNumber: 'GJ01XY7890', driverName: 'Sneha Patel', tempBase: 4.0 },
  { shipmentId: 'TNX-SHP-2025-006', vehicleNumber: 'UP16CD4567', driverName: 'Rajesh Kumar', tempBase: 4.5 },
  { shipmentId: 'TNX-SHP-2025-007', vehicleNumber: 'RJ14EF0123', driverName: 'Anita Verma', tempBase: 6.2 },
  { shipmentId: 'TNX-SHP-2025-008', vehicleNumber: 'WB02GH4567', driverName: 'Sourav Das', tempBase: 3.5 },
  { shipmentId: 'TNX-SHP-2025-009', vehicleNumber: 'KL07IJ8901', driverName: 'Thomas Joseph', tempBase: 4.8 },
  { shipmentId: 'TNX-SHP-2025-010', vehicleNumber: 'AS01KL2345', driverName: 'Bhola Gogoi', tempBase: 8.5 },
];

export const ROUTE_COLORS: Record<string, string> = {
  low: '#64748b',
  medium: '#6366f1',
  high: '#f59e0b',
  critical: '#ef4444',
};

export const MARKER_COLORS = {
  safe: '#22c55e',
  warning: '#f59e0b',
  critical: '#ef4444',
  warehouse: '#3b82f6',
  hospital: '#a855f7',
  distribution: '#1e293b',
};
