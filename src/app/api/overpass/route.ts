import { NextResponse } from "next/server";

/**
 * Server-side proxy to the free, keyless OpenStreetMap Overpass API — real
 * community-sourced data for towing/garage ("maintenance") and truck
 * parking, standing in for TRAVIS's parking feed until we have partner
 * credentials for that (see src/lib/travis.ts). Coverage is genuinely
 * incomplete in places — that's inherent to OSM, not a bug here — so
 * results are always labeled as OSM-sourced in the UI.
 */

interface OverpassElement {
  id: number;
  lat?: number;
  lon?: number;
  /** Present on way/relation results instead of top-level lat/lon. */
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function formatAddress(tags: Record<string, string> = {}): string | undefined {
  const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
  const city = [tags["addr:postcode"], tags["addr:city"]].filter(Boolean).join(" ");
  const parts = [street, city].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : undefined;
}

function buildQuery(kind: string, lat: string, lng: string): string {
  if (kind === "parking") {
    // hgv=yes/designated is the OSM tag for truck-permitted parking;
    // highway=rest_area covers the many EU motorway rest stops that also
    // function as informal truck parking without that specific tag.
    // `nwr` (not just `node`) + `out center` matters here — many real rest
    // areas/parking lots are mapped as way polygons, not point nodes, and
    // a node-only query silently misses most of them.
    return `[out:json][timeout:15];(
      nwr["amenity"="parking"]["hgv"~"yes|designated"](around:20000,${lat},${lng});
      nwr["highway"="rest_area"](around:20000,${lat},${lng});
    );out center 8;`;
  }
  // maintenance: shop=car_repair is the canonical OSM tag; amenity=car_repair
  // shows up too in some regional tagging conventions.
  return `[out:json][timeout:15];(
    nwr["shop"="car_repair"](around:15000,${lat},${lng});
    nwr["amenity"="car_repair"](around:15000,${lat},${lng});
  );out center 5;`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const kind = searchParams.get("kind") === "parking" ? "parking" : "maintenance";
  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  const query = buildQuery(kind, lat, lng);

  let res: Response;
  try {
    res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      // Overpass's Apache frontend 406s requests with no User-Agent at all
      // (Node's fetch sends none by default, unlike curl/browsers).
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "TRAK-ContinentTrans-Dev/1.0 (local fleet dashboard prototype)",
      },
    });
  } catch {
    // Overpass's public instance is fair-use and occasionally slow/down —
    // fail soft with an empty list rather than breaking the whole Locate flow.
    return NextResponse.json({ results: [] });
  }

  if (!res.ok) {
    return NextResponse.json({ results: [] });
  }

  const body = (await res.json()) as { elements?: OverpassElement[] };
  const results = (body.elements ?? [])
    .map((el) => {
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      if (lat === undefined || lng === undefined) return null;
      return {
        id: el.id,
        name: el.tags?.name || (kind === "parking" ? "Truck parking (OSM)" : "Vehicle repair (OSM)"),
        lat,
        lng,
        phone: el.tags?.phone || el.tags?.["contact:phone"] || undefined,
        address: formatAddress(el.tags),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return NextResponse.json({ results });
}
