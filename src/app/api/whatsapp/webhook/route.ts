import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { LiveKitAPI, SessionDescription } from "livekit-server-sdk";
import { getTruckByPhone } from "@/lib/fleetServer";
import { buildStatusReply, buildUnknownDriverReply } from "@/lib/whatsappReply";
import { sendWhatsAppText } from "@/lib/metaWhatsApp";

/**
 * Inbound side of the demo's WhatsApp bot: a driver texting "Hi" (or
 * anything) opens Meta's 24h free-form window and lands here, and this
 * replies with that driver's live status — no pre-approved template needed,
 * since a reply inside that window is exempt from the template requirement
 * that blocks proactive sends (see send/route.ts).
 *
 * Needs a public HTTPS URL — Meta calls this directly, so localhost alone
 * won't receive anything. Tunnel the dev server (ngrok/cloudflared) or point
 * this at the deployed Vercel URL when testing live, and register that URL
 * plus WHATSAPP_WEBHOOK_VERIFY_TOKEN (.env.local) under Meta App Dashboard >
 * WhatsApp > Configuration.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

function hasValidSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret || !signatureHeader) return false;

  const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signatureHeader);
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

interface InboundMessage {
  from: string;
  type: string;
}

interface InboundCall {
  id: string;
  event: string;
  session?: { sdp_type?: string; sdp?: string };
}

/**
 * Completes the WebRTC handshake for a business-initiated WhatsApp call
 * (see liveKitCall.ts, which starts it via dialWhatsAppCall). Meta sends
 * this "connect" event with its SDP answer once the driver picks up;
 * connectWhatsAppCall must be called promptly — LiveKit's docs warn that a
 * delay here causes silence and disconnection.
 */
async function handleCallEvent(call: InboundCall) {
  if (call.event !== "connect" || !call.session?.sdp) return;

  const api = new LiveKitAPI();
  const sdp = new SessionDescription({ type: call.session.sdp_type ?? "answer", sdp: call.session.sdp });
  try {
    await api.connector.connectWhatsAppCall(call.id, sdp);
    console.log(`[WhatsApp call] connected callId=${call.id}`);
  } catch (err) {
    console.error(`[WhatsApp call] connectWhatsAppCall failed for callId=${call.id}:`, err);
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!hasValidSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const value = payload?.entry?.[0]?.changes?.[0]?.value;
  const message: InboundMessage | undefined = value?.messages?.[0];
  const call: InboundCall | undefined = value?.calls?.[0];

  if (call) {
    await handleCallEvent(call);
    return NextResponse.json({ ok: true });
  }

  // Delivery/read status callbacks land on this same webhook — nothing to
  // reply to, just acknowledge so Meta doesn't retry.
  if (!message) {
    return NextResponse.json({ ok: true });
  }

  const truck = getTruckByPhone(message.from);
  const reply = truck ? buildStatusReply(truck) : buildUnknownDriverReply();

  const result = await sendWhatsAppText(message.from, reply);
  console.log(`[WhatsApp webhook] from=${message.from} matched=${truck?.driverName ?? "none"} sendOk=${result.ok}`, result.ok ? "" : result.body);

  return NextResponse.json({ ok: true });
}
