/*
 * OSRM routing utility — fetches road-following routes from the public OSRM API.
 * Used by the driver navigation to draw realistic route polylines on the Leaflet map.
 */

export interface OsrmRoute {
  coordinates: [number, number][];
  distanceKm: number;
  durationMin: number;
}

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

export async function getOsrmRoute(
  from: [number, number],
  to: [number, number],
): Promise<OsrmRoute | null> {
  try {
    const url = `${OSRM_BASE}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.routes || data.routes.length === 0) return null;

    const route = data.routes[0];
    const coordinates: [number, number][] = route.geometry.coordinates.map(
      (c: [number, number]) => [c[1], c[0]],
    );

    return {
      coordinates,
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
      durationMin: Math.round(route.duration / 60),
    };
  } catch {
    return null;
  }
}

export async function getOsrmRouteViaWaypoints(
  waypoints: [number, number][],
): Promise<OsrmRoute | null> {
  if (waypoints.length < 2) return null;
  try {
    const coordsStr = waypoints.map((wp) => `${wp[1]},${wp[0]}`).join(';');
    const url = `${OSRM_BASE}/${coordsStr}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.routes || data.routes.length === 0) return null;

    const route = data.routes[0];
    const coordinates: [number, number][] = route.geometry.coordinates.map(
      (c: [number, number]) => [c[1], c[0]],
    );

    return {
      coordinates,
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
      durationMin: Math.round(route.duration / 60),
    };
  } catch {
    return null;
  }
}
