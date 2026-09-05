import { NextResponse } from "next/server";

/**
 * Server-side proxy to nakordoni.eu's EU fuel price API (Explorer plan —
 * 1,000 calls/day). Keeps NAKORDONI_API_KEY out of the browser entirely.
 * Verified live against the real API on 2026-09-05:
 *   GET https://nakordoni.eu/api/v1/data/fuel?mode=nearest&lat=..&lon=..
 *   Authorization: Bearer <key>
 * Response envelope: { attribution, data: { data: [ {name, brand, address,
 * fuel_type, price, currency, lat, lng, distance_km, updated_at}, ... ] },
 * usage: { limit, used, reset } }
 */
export async function GET(request: Request) {
  const apiKey = process.env.NAKORDONI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "NAKORDONI_API_KEY not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  if (!lat || !lon) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  const url = new URL("https://nakordoni.eu/api/v1/data/fuel");
  url.searchParams.set("mode", "nearest");
  url.searchParams.set("lat", lat);
  url.searchParams.set("lon", lon);
  url.searchParams.set("radius_km", "30");
  url.searchParams.set("limit", "5");

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const detail = await res.text();
    return NextResponse.json({ error: "nakordoni request failed", detail }, { status: res.status });
  }

  const body = await res.json();
  const stations = body?.data?.data ?? [];
  return NextResponse.json({ attribution: body?.attribution ?? "Data by nakordoni.eu", stations });
}
