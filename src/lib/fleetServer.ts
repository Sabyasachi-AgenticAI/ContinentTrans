import { DEFAULT_TRUCKS, type TruckEntry } from "@/mock/data";

/**
 * Server-side mirror of the fleet list, so the WhatsApp webhook (a separate
 * server-side request, not the browser) can look a driver up by phone
 * number. The fleet otherwise lives only in the browser's localStorage (see
 * fleetStore.tsx) — the client pushes its current list here via
 * /api/fleet/sync on every change, so editing a phone number in Fleet Status
 * reaches the bot after one sync.
 *
 * In-memory only, module-level — resets on server restart and isn't shared
 * across serverless instances. Fine for a single `npm run dev` demo process;
 * a real deployment needs an actual store (e.g. a small DB table) since
 * Vercel's serverless functions don't share memory between invocations.
 */
let fleet: TruckEntry[] = DEFAULT_TRUCKS;

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

export function setServerFleet(trucks: TruckEntry[]): void {
  fleet = trucks;
}

export function getTruckByPhone(phone: string): TruckEntry | undefined {
  const target = normalizePhone(phone);
  if (!target) return undefined;
  return fleet.find((t) => t.phone && normalizePhone(t.phone) === target);
}

export function getServerFleet(): TruckEntry[] {
  return fleet;
}

/**
 * Appends a call outcome (e.g. the reason a driver gave the GPS-idle voice
 * agent) to that truck's Notes field, timestamped. The browser picks this up
 * via a short poll (see fleetStore.tsx) since this mirror is the only place
 * a server-side process — the agent, calling in over HTTP — can reach; it
 * has no way to touch the browser's own state directly.
 */
export function appendTruckNote(phone: string, note: string): TruckEntry | undefined {
  const target = normalizePhone(phone);
  if (!target) return undefined;
  const truck = fleet.find((t) => t.phone && normalizePhone(t.phone) === target);
  if (!truck) return undefined;

  const stamp = new Date().toLocaleString("ro-RO", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
  const line = `[${stamp}] ${note}`;
  truck.notes = truck.notes ? `${truck.notes}\n${line}` : line;
  return truck;
}
