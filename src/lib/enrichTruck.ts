import type { TruckEntry, FuelStop, ServicePoint, ParkingSpot, LatLng } from "@/mock/data";
import { fetchTruckRoute } from "@/lib/routing";
import { interpolateAlongRoute, routeDistanceKm } from "@/lib/geo";
import { fetchNearbyFuelPrices } from "@/lib/fuelPrices";

const ASSUMED_CONSUMPTION_L_PER_KM = 0.3; // 30 L/100km — a stated, roughly-realistic assumption for a loaded HGV, not a manufacturer figure
const FALLBACK_DIESEL_PRICE_EUR = 1.65; // used only if the live price lookup fails

async function geocode(label: string): Promise<LatLng | null> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(label)}`);
  if (!res.ok) return null;
  const data = await res.json();
  return [data.lat, data.lng];
}

interface OverpassResult {
  id: number;
  name: string;
  lat: number;
  lng: number;
  phone?: string;
}

async function fetchOverpass(kind: "maintenance" | "parking", lat: number, lng: number): Promise<OverpassResult[]> {
  try {
    const res = await fetch(`/api/overpass?kind=${kind}&lat=${lat}&lng=${lng}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.results ?? [];
  } catch {
    return [];
  }
}

/**
 * Runs the full geocode -> route -> real POIs -> cost pipeline for one
 * truck, calling `onUpdate` with incremental patches so the UI can show
 * progress rather than a single opaque wait.
 */
export async function enrichTruck(
  truck: TruckEntry,
  onUpdate: (patch: Partial<TruckEntry>) => void,
): Promise<void> {
  onUpdate({ enrichStatus: "loading", enrichError: undefined });

  const [sourceCoord, destCoord] = await Promise.all([
    geocode(truck.sourceLabel),
    geocode(truck.destinationLabel),
  ]);

  if (!sourceCoord || !destCoord) {
    onUpdate({
      enrichStatus: "error",
      enrichError: !sourceCoord
        ? `Couldn't find "${truck.sourceLabel}"`
        : `Couldn't find "${truck.destinationLabel}"`,
    });
    return;
  }

  const routeResult = await fetchTruckRoute([sourceCoord, destCoord]);
  if (!routeResult) {
    onUpdate({ enrichStatus: "error", enrichError: "Routing failed for this source/destination" });
    return;
  }

  const distanceKm = Math.round(routeDistanceKm(routeResult.route));

  // Sample 3 points spread along the path (not every point) — each one
  // becomes a real Overpass lookup, so this bounds how many calls one
  // "Locate" click spends. Overpass's public instance rate-limits bursts of
  // parallel requests more aggressively than the same requests spaced out —
  // firing all 6 maintenance+parking calls via Promise.all reliably tripped
  // it in testing, even though each call works fine on its own. Sequenced
  // instead: slower (a few seconds more per Locate), but reliable.
  const sampleFractions = [0.25, 0.5, 0.75];
  const samples = sampleFractions.map((t) => interpolateAlongRoute(routeResult.route, t).position);

  const midpointFuelPromise = fetchNearbyFuelPrices(samples[1][0], samples[1][1]);

  const maintenanceResults: OverpassResult[][] = [];
  const parkingResults: OverpassResult[][] = [];
  for (const [lat, lng] of samples) {
    maintenanceResults.push(await fetchOverpass("maintenance", lat, lng));
    parkingResults.push(await fetchOverpass("parking", lat, lng));
  }

  const midpointFuel = await midpointFuelPromise;

  const serviceStops: ServicePoint[] = maintenanceResults
    .flat()
    .slice(0, 4)
    .map((r) => ({
      id: `svc-osm-${r.id}`,
      name: r.name,
      type: "garage",
      phone: r.phone,
      position: [r.lat, r.lng],
      source: "osm",
    }));

  const parkingStops: ParkingSpot[] = parkingResults
    .flat()
    .slice(0, 4)
    .map((r) => ({
      id: `park-osm-${r.id}`,
      name: r.name,
      position: [r.lat, r.lng],
      source: "osm",
    }));

  // Fuel markers just need positions along the route — each one lazily
  // fetches its own live price when its popup opens (see TripLayer's
  // FuelStopMarker), so no separate price fetch is needed here per marker.
  const fuelStops: FuelStop[] = samples.map((p, i) => ({
    id: `fuel-sample-${truck.id}-${i}`,
    name: `Fuel check — km ${Math.round((distanceKm * sampleFractions[i]))}`,
    brand: "Live",
    position: p,
  }));

  const dieselPrice =
    midpointFuel?.stations.find((s) => s.fuel_type === "diesel")?.price ?? FALLBACK_DIESEL_PRICE_EUR;
  const estimatedFuelCostEur = Math.round(distanceKm * ASSUMED_CONSUMPTION_L_PER_KM * dieselPrice);

  onUpdate({
    enrichStatus: "done",
    sourceCoord,
    destCoord,
    route: [sourceCoord, destCoord],
    distanceKm,
    fuelStops,
    serviceStops,
    parkingStops,
    estimatedFuelCostEur,
  });
}
