import type { LatLng } from "@/mock/data";

/**
 * Fetches a real, road-following route between two points from OSRM's public
 * demo server (no API key required). This is a free, rate-limited demo
 * instance meant for light/dev use, not production traffic — fine here since
 * we only call it once per trip, on load, same reasoning as geocoding.
 *
 * Returns null on any failure so callers can fall back to the mock polyline.
 */
export async function fetchRoadRoute(
  waypoints: LatLng[],
): Promise<LatLng[] | null> {
  if (waypoints.length < 2) return null;
  const coords = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const geometry = data?.routes?.[0]?.geometry?.coordinates as
      | [number, number][]
      | undefined;
    if (!geometry || geometry.length === 0) return null;
    // GeoJSON is [lng, lat]; Leaflet wants [lat, lng].
    return geometry.map(([lng, lat]) => [lat, lng] as LatLng);
  } catch {
    return null;
  }
}
