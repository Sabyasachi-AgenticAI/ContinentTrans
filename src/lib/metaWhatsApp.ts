const GRAPH_VERSION = "v21.0";

function digitsOnly(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

function credentials(): { phoneNumberId: string; accessToken: string } | null {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) return null;
  return { phoneNumberId, accessToken };
}

async function callGraphApi(payload: Record<string, unknown>): Promise<{ ok: boolean; body: unknown }> {
  const creds = credentials();
  if (!creds) return { ok: false, body: { error: "WhatsApp credentials not configured" } };

  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${creds.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, body: await res.json() };
}

/**
 * Free-form text — only deliverable inside the 24h window opened by the
 * recipient's own last inbound message (see webhook/route.ts, which is the
 * only caller: replying to a driver who just messaged in).
 */
export function sendWhatsAppText(to: string, body: string) {
  return callGraphApi({
    messaging_product: "whatsapp",
    to: digitsOnly(to),
    type: "text",
    text: { body },
  });
}

/**
 * Business-initiated — must be a template pre-approved in Meta Business
 * Manager. `params` fill the template's {{1}}, {{2}}... body variables, in
 * order — omit (or pass none) for a template with no variables, like the
 * hello_world sample.
 */
export function sendWhatsAppTemplate(to: string, templateName: string, languageCode: string, params: string[] = []) {
  return callGraphApi({
    messaging_product: "whatsapp",
    to: digitsOnly(to),
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(params.length > 0
        ? { components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }] }
        : {}),
    },
  });
}
