import type { LatLng } from "@/mock/data";
import { fetchRoadRoute as fetchOsrmRoute } from "@/lib/osrm";

export type RouteSource = "mock" | "osrm" | "ors-hgv";

/**
 * Truck-aware routing via our server-side ORS proxy (src/app/api/route),
 * which respects HGV weight/height/width restrictions from OSM data — not
 * just a road-following path like OSRM. Falls back to OSRM if the ORS call
 * fails for any reason (key issue, quota, network), so the map keeps working.
 */
export async function fetchTruckRoute(
  waypoints: LatLng[],
): Promise<{ route: LatLng[]; source: RouteSource } | null> {
  try {
    const res = await fetch("/api/route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ waypoints }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.route?.length) {
        return { route: data.route as LatLng[], source: "ors-hgv" };
      }
    }
  } catch {
    // fall through to OSRM
  }

  const osrmRoute = await fetchOsrmRoute(waypoints);
  if (osrmRoute) return { route: osrmRoute, source: "osrm" };

  return null;
}
