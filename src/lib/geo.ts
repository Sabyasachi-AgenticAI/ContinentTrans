import type { LatLng } from "@/mock/data";

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Position along a polyline at fraction t in [0, 1], plus the heading
 * (bearing in degrees) toward the next waypoint — used to rotate the truck marker.
 */
export function interpolateAlongRoute(
  route: LatLng[],
  t: number,
): { position: LatLng; bearing: number } {
  if (route.length === 0) return { position: [0, 0], bearing: 0 };
  if (route.length === 1) return { position: route[0], bearing: 0 };

  const clamped = Math.min(1, Math.max(0, t));

  const segmentLengths = route.slice(1).map((point, i) => haversineKm(route[i], point));
  const totalLength = segmentLengths.reduce((sum, len) => sum + len, 0);
  const targetDistance = clamped * totalLength;

  let covered = 0;
  for (let i = 0; i < segmentLengths.length; i++) {
    const segLen = segmentLengths[i];
    if (covered + segLen >= targetDistance || i === segmentLengths.length - 1) {
      const segT = segLen === 0 ? 0 : (targetDistance - covered) / segLen;
      const [lat1, lng1] = route[i];
      const [lat2, lng2] = route[i + 1];
      const position: LatLng = [
        lat1 + (lat2 - lat1) * segT,
        lng1 + (lng2 - lng1) * segT,
      ];
      const bearing = bearingBetween(route[i], route[i + 1]);
      return { position, bearing };
    }
    covered += segLen;
  }

  return { position: route[route.length - 1], bearing: 0 };
}

/** Total length of a polyline, summing each segment's great-circle distance. */
export function routeDistanceKm(route: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    total += haversineKm(route[i - 1], route[i]);
  }
  return total;
}

/**
 * Shortest distance (km) from a position to the nearest point on any segment
 * of a route polyline — how far "off route" a truck currently is. Segments
 * are projected onto a local planar approximation (longitude scaled by
 * cos(latitude)) rather than true geodesic math, consistent with the
 * haversine-everywhere approach already used in this file — accurate enough
 * for a deviation threshold measured in km, not for surveying.
 */
export function distanceFromRouteKm(position: LatLng, route: LatLng[]): number {
  if (route.length === 0) return Infinity;
  if (route.length === 1) return haversineKm(position, route[0]);

  const latRad = (position[0] * Math.PI) / 180;
  const kmPerDegLat = 111.32;
  const kmPerDegLng = 111.32 * Math.cos(latRad);
  const toXY = (p: LatLng): [number, number] => [p[1] * kmPerDegLng, p[0] * kmPerDegLat];
  const [px, py] = toXY(position);

  let min = Infinity;
  for (let i = 0; i < route.length - 1; i++) {
    const [ax, ay] = toXY(route[i]);
    const [bx, by] = toXY(route[i + 1]);
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    const cx = ax + t * dx;
    const cy = ay + t * dy;
    const dist = Math.hypot(px - cx, py - cy);
    if (dist < min) min = dist;
  }
  return min;
}

function bearingBetween(a: LatLng, b: LatLng): number {
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
