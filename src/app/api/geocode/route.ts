import { NextResponse } from "next/server";

/**
 * Server-side proxy to Nominatim (OpenStreetMap's geocoder). Server-side
 * specifically so we can set the identifying User-Agent their usage policy
 * requires — browsers don't let client code set that header. Triggered only
 * by an explicit "Locate" click (see src/lib/enrichTruck.ts), not on every
 * keystroke — Nominatim's fair-use policy is for light, human-paced use
 * like this, not bulk/automated geocoding.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  if (!q) {
    return NextResponse.json({ error: "q is required" }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const res = await fetch(url, {
    headers: {
      "User-Agent": "TRAK-ContinentTrans-Dev/1.0 (local fleet dashboard prototype)",
    },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Nominatim request failed" }, { status: res.status });
  }

  const results = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  if (results.length === 0) {
    return NextResponse.json({ error: "No match found" }, { status: 404 });
  }

  const { lat, lon, display_name } = results[0];
  return NextResponse.json({ lat: Number(lat), lng: Number(lon), displayName: display_name });
}
