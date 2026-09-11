import { NextResponse } from "next/server";
import { appendTruckNote } from "@/lib/fleetServer";

/**
 * Called by the voice agent (/voice-agent/agent.py) after a GPS-idle call
 * ends, with whatever reason the driver gave. Appends it to that truck's
 * Notes field on the server-side fleet mirror; the browser picks it up via
 * a short poll (see fleetStore.tsx) since the agent has no other way to
 * reach the dashboard's own state.
 */
export async function POST(request: Request) {
  const { phone, note } = (await request.json()) as { phone?: string; note?: string };
  if (!phone || !note) {
    return NextResponse.json({ error: "phone and note are required" }, { status: 400 });
  }

  const truck = appendTruckNote(phone, note);
  if (!truck) {
    return NextResponse.json({ error: "no truck matches that phone number" }, { status: 404 });
  }

  console.log(`[Voice call outcome] ${truck.driverName}: ${note}`);
  return NextResponse.json({ ok: true });
}
