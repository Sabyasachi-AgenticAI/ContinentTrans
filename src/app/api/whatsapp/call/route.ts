import { NextResponse } from "next/server";
import { dialGpsIdleCall } from "@/lib/liveKitCall";
import type { TruckEntry } from "@/mock/data";

/**
 * Proactive voice call — demo-scoped to the gps_silent trigger only. Places
 * a real WhatsApp call via LiveKit's Connector (see liveKitCall.ts); the
 * agent that actually joins and speaks lives in /voice-agent (a separate,
 * always-running process — can't live in this serverless route).
 */
export async function POST(request: Request) {
  const { truck, idleMinutes } = (await request.json()) as { truck?: TruckEntry; idleMinutes?: number };
  if (!truck?.phone) {
    return NextResponse.json({ error: "truck.phone is required" }, { status: 400 });
  }

  const result = await dialGpsIdleCall(truck, idleMinutes ?? 0);
  if (!result.ok) {
    console.error(`[WhatsApp call] dial failed for ${truck.driverName}:`, result.error);
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  console.log(`[WhatsApp call] dialed ${truck.driverName} -> callId=${result.callId} room=${result.roomName}`);
  return NextResponse.json({ ok: true, callId: result.callId, roomName: result.roomName });
}
