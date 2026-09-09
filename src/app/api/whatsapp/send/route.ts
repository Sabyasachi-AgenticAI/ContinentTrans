import { NextResponse } from "next/server";
import { WHATSAPP_TEMPLATES, type WhatsAppEvent } from "@/lib/whatsappTemplates";
import { sendWhatsAppTemplate } from "@/lib/metaWhatsApp";

/**
 * Proactive (business-initiated) sender — which Meta template to use is
 * looked up centrally from `WHATSAPP_TEMPLATES` (src/lib/whatsappTemplates.ts)
 * by event type. Most events still map to Meta's default "hello_world"
 * sample template (auto-approved on every WhatsApp Business app, no setup
 * needed) since their own custom template hasn't been approved yet — that
 * sample's text is fixed generic Meta test copy, it cannot carry the
 * driver's name or the stop name. `previewMessage` (the real per-driver copy
 * from the registry, built client-side) is always logged so the intended
 * wording is visible even before an event's template is approved. `params`
 * (also built client-side, from the same registry) only gets forwarded to
 * Meta once metaTemplateName is a real approved template — hello_world takes
 * zero variables, so sending params against it would just make Meta reject
 * the request.
 *
 * For the live demo, see webhook/route.ts instead — a driver's own "Hi"
 * opens a 24h free-form window, avoiding the template-approval wait
 * entirely. This route stays here for when proactive (driver hasn't
 * messaged first) alerts are needed again.
 */
export async function POST(request: Request) {
  const { to, event, previewMessage, params } = (await request.json()) as {
    to?: string;
    event?: WhatsAppEvent;
    previewMessage?: string;
    params?: string[];
  };
  if (!to) {
    return NextResponse.json({ error: "to (phone number) is required" }, { status: 400 });
  }

  const template = (event && WHATSAPP_TEMPLATES[event]) || WHATSAPP_TEMPLATES.near_fuel_stop;

  if (previewMessage) {
    console.log(`[WhatsApp] ${event ?? "unknown"} -> ${to}: ${previewMessage}`);
  }

  const effectiveParams = template.metaTemplateName === "hello_world" ? [] : (params ?? []);
  const { ok, body } = await sendWhatsAppTemplate(
    to,
    template.metaTemplateName,
    template.metaLanguageCode,
    effectiveParams,
  );
  if (!ok) {
    console.error(`[WhatsApp] send failed for ${event ?? "unknown"} -> ${to}:`, JSON.stringify(body));
    return NextResponse.json({ error: "WhatsApp send failed", detail: body }, { status: 502 });
  }

  const messages = (body as { messages?: { id: string }[] })?.messages;
  return NextResponse.json({ ok: true, messageId: messages?.[0]?.id });
}
