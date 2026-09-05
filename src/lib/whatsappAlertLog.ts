const STORAGE_KEY = "trak-whatsapp-alerts-sent-v1";

function readLog(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

/**
 * Persists which (truck, fuel stop) proximity alerts have already fired, so
 * a page reload doesn't re-send the same WhatsApp message to the same
 * driver again — the in-memory dedup alone only survives one mount.
 */
export function hasAlerted(truckId: string, stopId: string): boolean {
  return readLog().has(`${truckId}:${stopId}`);
}

export function markAlerted(truckId: string, stopId: string): void {
  try {
    const log = readLog();
    log.add(`${truckId}:${stopId}`);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...log]));
  } catch {
    // storage unavailable — alert still sent this session, just won't be
    // remembered across a reload
  }
}
