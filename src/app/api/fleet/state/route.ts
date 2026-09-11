import { NextResponse } from "next/server";
import { getServerFleet } from "@/lib/fleetServer";

/**
 * Read-only view of the server-side fleet mirror, polled by the browser
 * (see fleetStore.tsx) to pick up changes made server-side — currently just
 * the voice agent appending a call outcome to a truck's Notes field via
 * /api/fleet/call-outcome. Demo-only, in-memory; see fleetServer.ts.
 */
export async function GET() {
  return NextResponse.json({ trucks: getServerFleet() });
}
