import { NextResponse } from "next/server";
import { setServerFleet } from "@/lib/fleetServer";
import type { TruckEntry } from "@/mock/data";

/**
 * Demo-only bridge: pushes the browser's current fleet list into the
 * server-side mirror (fleetServer.ts) so the WhatsApp webhook can look
 * drivers up by phone. Called from fleetStore.tsx on every fleet change.
 * No auth, in-memory only — fine for a local demo, not for production.
 */
export async function POST(request: Request) {
  const trucks = (await request.json()) as TruckEntry[];
  setServerFleet(trucks);
  return NextResponse.json({ ok: true, count: trucks.length });
}
