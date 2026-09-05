import { NextResponse } from "next/server";

/**
 * Server-side proxy to OpenRouteService's truck-aware `driving-hgv` profile.
 * Keeps ORS_API_KEY out of the browser entirely — the client posts
 * waypoints here, we call ORS with the key attached server-side, and hand
 * back just the route geometry.
 */
export async function POST(request: Request) {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ORS_API_KEY not configured" }, { status: 500 });
  }

  const { waypoints } = (await request.json()) as { waypoints?: [number, number][] };
  if (!waypoints || waypoints.length < 2) {
    return NextResponse.json({ error: "Need at least 2 waypoints" }, { status: 400 });
  }

  const coordinates = waypoints.map(([lat, lng]) => [lng, lat]);

  const res = await fetch("https://api.openrouteservice.org/v2/directions/driving-hgv/geojson", {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ coordinates }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return NextResponse.json({ error: "ORS request failed", detail }, { status: res.status });
  }

  const data = await res.json();
  const geometry: [number, number][] | undefined = data?.features?.[0]?.geometry?.coordinates;
  if (!geometry) {
    return NextResponse.json({ error: "No route returned" }, { status: 502 });
  }

  const route = geometry.map(([lng, lat]) => [lat, lng]);
  return NextResponse.json({ route });
}
