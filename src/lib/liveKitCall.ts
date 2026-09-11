import { LiveKitAPI, RoomAgentDispatch } from "livekit-server-sdk";
import type { TruckEntry } from "@/mock/data";

const WHATSAPP_CLOUD_API_VERSION = "21.0";

/**
 * Places a real outbound WhatsApp call via LiveKit's WhatsApp Connector
 * (LiveKit Cloud only — see docs.livekit.io/telephony/connectors/whatsapp).
 * Dispatches the "trak-gps-idle-agent" worker (see /voice-agent/agent.py) into
 * the call's room, passing this truck's context as job metadata so the agent
 * knows the driver's name, plate, and language without any other lookup.
 *
 * Demo-scoped to gps_silent only, per the current build — other callWorthy
 * events (route_deviation, sos) aren't wired to this yet.
 */
export async function dialGpsIdleCall(truck: TruckEntry, idleMinutes: number) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) {
    return { ok: false as const, error: "WhatsApp credentials not configured" };
  }

  const toDigits = truck.phone.replace(/[^\d]/g, "");
  const roomName = `trak-gps-idle-${truck.id}-${Date.now()}`;

  const api = new LiveKitAPI(); // reads LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET from env

  try {
    const res = await api.connector.dialWhatsAppCall({
      whatsappPhoneNumberId: phoneNumberId,
      whatsappToPhoneNumber: toDigits,
      whatsappApiKey: accessToken,
      whatsappCloudApiVersion: WHATSAPP_CLOUD_API_VERSION,
      roomName,
      participantIdentity: toDigits,
      participantName: truck.driverName,
      agents: [
        new RoomAgentDispatch({
          agentName: "trak-gps-idle-agent",
          metadata: JSON.stringify({
            truckId: truck.id,
            phone: truck.phone,
            driverName: truck.driverName,
            truckPlate: truck.truckPlate,
            sourceLabel: truck.sourceLabel,
            destinationLabel: truck.destinationLabel,
            language: truck.voiceLanguage,
            idleMinutes: Math.round(idleMinutes),
          }),
        }),
      ],
    });
    return { ok: true as const, callId: res.whatsappCallId, roomName: res.roomName };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
  }
}
