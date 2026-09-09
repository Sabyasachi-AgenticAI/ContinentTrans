import type { TruckEntry, DriverLanguage } from "@/mock/data";

const STATUS_LABEL: Record<DriverLanguage, Record<TruckEntry["status"], string>> = {
  ro: {
    in_transit: "în cursă",
    gps_silent: "GPS inactiv",
    idle: "în așteptare",
  },
  en: {
    in_transit: "in transit",
    gps_silent: "GPS silent",
    idle: "idle",
  },
};

/**
 * Free-text status reply sent when a driver messages the bot — assembled
 * fresh from that truck's own live data (name, route, status, active
 * alerts), not a fixed template. No Meta template approval needed for this:
 * it only ever sends inside the 24h window the driver's own inbound message
 * just opened (see webhook/route.ts). Language is per-driver (`truck.language`,
 * set in Fleet Status), not fleet-wide.
 */
export function buildStatusReply(truck: TruckEntry): string {
  if (truck.language === "en") {
    const lines = [
      `Hi, ${truck.driverName}! 👋`,
      `Truck ${truck.truckPlate} — ${STATUS_LABEL.en[truck.status]}.`,
      `Route: ${truck.sourceLabel} → ${truck.destinationLabel}.`,
    ];
    if (truck.distanceKm) lines.push(`Total distance: ${truck.distanceKm} km.`);
    if (truck.alert) lines.push(`⚠️ Active alert: ${truck.alert.message}`);
    const notifyStops = [...truck.fuelStops, ...truck.alertPoints].filter((s) => s.notify);
    if (notifyStops.length > 0) {
      lines.push(`Flagged stops on route: ${notifyStops.map((s) => s.name).join(", ")}.`);
    }
    lines.push("Safe travels! Message anytime for an update.");
    return lines.join("\n");
  }

  const lines = [
    `Salut, ${truck.driverName}! 👋`,
    `Camion ${truck.truckPlate} — ${STATUS_LABEL.ro[truck.status]}.`,
    `Traseu: ${truck.sourceLabel} → ${truck.destinationLabel}.`,
  ];
  if (truck.distanceKm) lines.push(`Distanță totală: ${truck.distanceKm} km.`);
  if (truck.alert) lines.push(`⚠️ Alertă activă: ${truck.alert.message}`);
  const notifyStops = [...truck.fuelStops, ...truck.alertPoints].filter((s) => s.notify);
  if (notifyStops.length > 0) {
    lines.push(`Opriri semnalate pe traseu: ${notifyStops.map((s) => s.name).join(", ")}.`);
  }
  lines.push("Drum bun! Scrie oricând pentru un update.");
  return lines.join("\n");
}

/** Sent when the inbound number doesn't match any truck in the fleet — no driver to read a language preference from, so this stays bilingual. */
export function buildUnknownDriverReply(): string {
  return "Salut! Numărul tău nu este asociat niciunui camion activ în TRAK momentan — contactează dispecerul.\n\nHi! Your number isn't linked to an active TRAK truck right now — please contact dispatch.";
}
