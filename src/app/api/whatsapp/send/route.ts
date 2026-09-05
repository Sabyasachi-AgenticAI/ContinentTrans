import { NextResponse } from "next/server";

/**
 * Server-side sender using Meta's WhatsApp Cloud API — credentials stay
 * server-side only. Proof-of-concept: sends Meta's default "hello_world"
 * sample template (auto-approved on every WhatsApp Business app, no setup
 * needed) since there's no custom-approved template for a real fuel-stop
 * message yet. That template's text is fixed generic Meta test copy — it
 * cannot contain the driver's name or the station name. This proves the
 * send mechanism works; swap in a real template name once one is approved
 * via Meta Business Manager, and pass real params through then.
 *
 * Uses the "OrderMeAgent" WhatsApp app's credentials (see .env.local) —
 * only the send-message call is used here; the webhook that app already
 * has configured for its own inbound flow is untouched.
 */
export async function POST(request: Request) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) {
    return NextResponse.json({ error: "WhatsApp credentials not configured" }, { status: 500 });
  }

  const { to } = (await request.json()) as { to?: string };
  if (!to) {
    return NextResponse.json({ error: "to (phone number) is required" }, { status: 400 });
  }

  // Meta wants digits only, country code first, no "+".
  const toDigits = to.replace(/[^\d]/g, "");

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toDigits,
      type: "template",
      template: { name: "hello_world", language: { code: "en_US" } },
    }),
  });

  const body = await res.json();
  if (!res.ok) {
    return NextResponse.json({ error: "WhatsApp send failed", detail: body }, { status: res.status });
  }

  return NextResponse.json({ ok: true, messageId: body?.messages?.[0]?.id });
}
