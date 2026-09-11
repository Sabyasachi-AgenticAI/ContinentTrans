import type { TruckEntry } from "@/mock/data";

/**
 * Central registry for every WhatsApp message the app can send a driver.
 * One place to add a new alert type or change wording — callers (TripLayer's
 * proximity check today, more trigger points later) go through
 * `sendTruckAlert` below instead of building fetch bodies inline.
 *
 * Meta's Cloud API only allows free-form text inside the 24h window after a
 * driver messages in first; anything the app initiates (which every alert
 * here is) must use a template pre-approved in Meta Business Manager. Only
 * Meta's generic "hello_world" sample template is approved so far, so every
 * entry points at it for the actual send — `buildMessage` is the real copy
 * each event *will* send once its own template is submitted and approved;
 * swapping `metaTemplateName` to the approved name is the only change needed
 * at that point, everywhere this registry is used.
 */
export type WhatsAppEvent = "near_fuel_stop" | "near_parking" | "gps_silent" | "route_deviation" | "sos";

export interface WhatsAppEventContext {
  /** Name of the fuel stop / alert point the driver is approaching — only set for "near_fuel_stop". */
  stopName?: string;
}

interface WhatsAppTemplate {
  metaTemplateName: string;
  metaLanguageCode: string;
  buildMessage: (truck: TruckEntry, ctx: WhatsAppEventContext) => string;
  /**
   * Positional {{1}}, {{2}}... values for the *approved* Meta template —
   * English only, since only English templates have been submitted so far.
   * Independent of `buildMessage`, which mirrors this in the driver's own
   * `language` for the in-app toast/log even though delivery stays English
   * until a matching-language template is approved too. Unused while
   * metaTemplateName is still "hello_world" (that sample takes 0 params) —
   * see route.ts, which only forwards these once the name is a real template.
   */
  buildParams: (truck: TruckEntry, ctx: WhatsAppEventContext) => string[];
  /**
   * Marks the events serious enough to escalate to a voice call (LiveKit's
   * WhatsApp Calling connector, once that's set up) rather than staying a
   * text-only nudge — gps_silent and route_deviation per the actual
   * requirement; near_fuel_stop/near_parking are routine and stay text.
   * Not wired to anything yet; this just records the intended routing.
   */
  callWorthy: boolean;
}

export const WHATSAPP_TEMPLATES: Record<WhatsAppEvent, WhatsAppTemplate> = {
  near_fuel_stop: {
    // Approved — real text now goes out, not the hello_world sample.
    // Language code is "en" (plain English), not "en_US" — that's the exact
    // variant Meta approved this under (WhatsApp Manager > Message
    // templates), and the send fails with error 132001 if it doesn't match.
    metaTemplateName: "fuel_stop_alert",
    metaLanguageCode: "en",
    buildMessage: (truck, ctx) =>
      truck.language === "en"
        ? `Hi, ${truck.driverName}! You're approaching ${ctx.stopName ?? "a fuel stop"} on route ${truck.sourceLabel} → ${truck.destinationLabel}. Check your fuel level.`
        : `Bună, ${truck.driverName}! Te apropii de ${ctx.stopName ?? "un punct de oprire"} pe ruta ${truck.sourceLabel} → ${truck.destinationLabel}. Verifică nivelul de combustibil.`,
    buildParams: (truck, ctx) => [
      truck.driverName,
      ctx.stopName ?? "a fuel stop",
      truck.sourceLabel,
      truck.destinationLabel,
    ],
    callWorthy: false,
  },
  near_parking: {
    // Approved — real text now goes out, not the hello_world sample.
    // Language code "en", same reason as near_fuel_stop above. Approved
    // under category "Marketing" (not the "Utility" originally submitted),
    // which means Meta requires the recipient to have opted in for
    // marketing messages — worth resubmitting as Utility if that bites.
    metaTemplateName: "parking_stop_alert",
    metaLanguageCode: "en",
    buildMessage: (truck, ctx) =>
      truck.language === "en"
        ? `Hi, ${truck.driverName}! You're approaching ${ctx.stopName ?? "a parking spot"} on route ${truck.sourceLabel} → ${truck.destinationLabel}. Worth pulling in for a rest.`
        : `Bună, ${truck.driverName}! Te apropii de ${ctx.stopName ?? "o zonă de parcare"} pe ruta ${truck.sourceLabel} → ${truck.destinationLabel}. Merită să oprești pentru o pauză.`,
    buildParams: (truck, ctx) => [
      truck.driverName,
      ctx.stopName ?? "a parking spot",
      truck.sourceLabel,
      truck.destinationLabel,
    ],
    callWorthy: false,
  },
  gps_silent: {
    // gps_idle_alert exists but is still "In review" in WhatsApp Manager —
    // stays on hello_world until it shows Active there. Swap the name (and
    // use "en" for the language code, not "en_US" — see near_fuel_stop)
    // once it's approved.
    metaTemplateName: "hello_world",
    metaLanguageCode: "en_US",
    buildMessage: (truck) =>
      truck.language === "en"
        ? `${truck.driverName}, truck ${truck.truckPlate}'s GPS has gone quiet. Please confirm you're OK.`
        : `${truck.driverName}, GPS-ul camionului ${truck.truckPlate} nu a mai transmis poziția. Te rugăm confirmă că ești bine.`,
    buildParams: (truck) => [truck.driverName, truck.truckPlate],
    callWorthy: true,
  },
  route_deviation: {
    // No template submitted yet — same hello_world placeholder pattern as
    // gps_silent above until one's approved.
    metaTemplateName: "hello_world",
    metaLanguageCode: "en_US",
    buildMessage: (truck) =>
      truck.language === "en"
        ? `${truck.driverName}, truck ${truck.truckPlate} appears to have left the planned route (${truck.sourceLabel} → ${truck.destinationLabel}). Please confirm your status.`
        : `${truck.driverName}, camionul ${truck.truckPlate} pare să fi deviat de la ruta planificată (${truck.sourceLabel} → ${truck.destinationLabel}). Te rugăm confirmă starea ta.`,
    buildParams: (truck) => [truck.driverName, truck.truckPlate, truck.sourceLabel, truck.destinationLabel],
    callWorthy: true,
  },
  sos: {
    metaTemplateName: "hello_world",
    metaLanguageCode: "en_US",
    buildMessage: (truck) =>
      truck.language === "en"
        ? `URGENT: ${truck.driverName}, an SOS alert was triggered for truck ${truck.truckPlate}. Dispatch is contacting you now.`
        : `URGENT: ${truck.driverName}, a fost declanșată o alertă SOS pentru camionul ${truck.truckPlate}. Dispecerul te contactează imediat.`,
    buildParams: (truck) => [truck.driverName, truck.truckPlate],
    callWorthy: true,
  },
};

export function buildWhatsAppMessage(
  event: WhatsAppEvent,
  truck: TruckEntry,
  ctx: WhatsAppEventContext = {},
): string {
  return WHATSAPP_TEMPLATES[event].buildMessage(truck, ctx);
}

/**
 * Single call site for sending a driver alert — builds this event's message
 * from the truck's own data, sends it, and hands back both the outcome and
 * the composed text so the caller can show it in a toast/log, independent of
 * whether the underlying Meta send actually carried that text yet.
 */
export async function sendTruckAlert(
  event: WhatsAppEvent,
  truck: TruckEntry,
  ctx: WhatsAppEventContext = {},
): Promise<{ ok: boolean; message: string }> {
  const message = buildWhatsAppMessage(event, truck, ctx);
  const params = WHATSAPP_TEMPLATES[event].buildParams(truck, ctx);
  try {
    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: truck.phone, event, previewMessage: message, params }),
    });
    return { ok: res.ok, message };
  } catch {
    return { ok: false, message };
  }
}
