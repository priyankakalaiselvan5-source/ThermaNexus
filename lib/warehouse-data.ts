export interface WarehouseData {
  id: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  capacityCubicM: number;
  availablePct: number;
  currentTemp: number;
  contact: string;
  phone: string;
}

export const WAREHOUSES: WarehouseData[] = [
  { id: 'wh-delhi', name: 'Delhi Ultra Cold Hub', city: 'Delhi', state: 'Delhi', lat: 28.6139, lng: 77.209, capacityCubicM: 12000, availablePct: 82, currentTemp: 4.2, contact: 'Rajesh Mehta', phone: '+91 98100 12345' },
  { id: 'wh-mumbai', name: 'Mumbai Cold Logistics', city: 'Mumbai', state: 'Maharashtra', lat: 19.076, lng: 72.877, capacityCubicM: 15000, availablePct: 65, currentTemp: 3.8, contact: 'Sunita Rao', phone: '+91 98200 23456' },
  { id: 'wh-chennai', name: 'Chennai Pharma Storage', city: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, capacityCubicM: 9000, availablePct: 90, currentTemp: 4.5, contact: 'Karthik N', phone: '+91 98300 34567' },
  { id: 'wh-hyderabad', name: 'Hyderabad Cold Chain', city: 'Hyderabad', state: 'Telangana', lat: 17.385, lng: 78.4867, capacityCubicM: 8000, availablePct: 73, currentTemp: 3.5, contact: 'Anjali Reddy', phone: '+91 98400 45678' },
  { id: 'wh-bengaluru', name: 'Bengaluru Bio-Cold', city: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946, capacityCubicM: 11000, availablePct: 55, currentTemp: 4.0, contact: 'Vivek Gowda', phone: '+91 98500 56789' },
  { id: 'wh-kolkata', name: 'Kolkata Cold Storage', city: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.363, capacityCubicM: 7500, availablePct: 88, currentTemp: 3.9, contact: 'Sourav Das', phone: '+91 98600 67890' },
  { id: 'wh-ahmedabad', name: 'Ahmedabad Frost Hub', city: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714, capacityCubicM: 8500, availablePct: 70, currentTemp: 4.1, contact: 'Nilesh Patel', phone: '+91 98700 78901' },
  { id: 'wh-pune', name: 'Pune Cold Reserve', city: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567, capacityCubicM: 6000, availablePct: 95, currentTemp: 3.7, contact: 'Meera Joshi', phone: '+91 98800 89012' },
  { id: 'wh-lucknow', name: 'Lucknow Chill Center', city: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.946, capacityCubicM: 5000, availablePct: 78, currentTemp: 4.3, contact: 'Aman Verma', phone: '+91 98900 90123' },
  { id: 'wh-guwahati', name: 'Guwahati Cold Depot', city: 'Guwahati', state: 'Assam', lat: 26.1445, lng: 91.7362, capacityCubicM: 4000, availablePct: 85, currentTemp: 4.4, contact: 'Bhola Gogoi', phone: '+91 99000 01234' },
];

const EARTH_R = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function etaMinutes(distanceKm: number, avgSpeedKmh = 55): number {
  return Math.round((distanceKm / avgSpeedKmh) * 60);
}

export interface NearestWarehouseResult {
  warehouse: WarehouseData;
  distanceKm: number;
  etaMin: number;
  routePath: [number, number][];
}

export function findNearestWarehouse(
  truckLat: number,
  truckLng: number,
): NearestWarehouseResult | null {
  if (WAREHOUSES.length === 0) return null;
  let best: NearestWarehouseResult | null = null;
  for (const wh of WAREHOUSES) {
    const dist = haversineKm(truckLat, truckLng, wh.lat, wh.lng);
    if (!best || dist < best.distanceKm) {
      best = {
        warehouse: wh,
        distanceKm: Math.round(dist),
        etaMin: etaMinutes(dist),
        routePath: [[truckLat, truckLng], [wh.lat, wh.lng]],
      };
    }
  }
  return best;
}
