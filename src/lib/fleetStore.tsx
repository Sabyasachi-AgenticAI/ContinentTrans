"use client";

import { createContext, useContext, useEffect, useReducer, useRef, type ReactNode } from "react";
import { DEFAULT_TRUCKS, DEFAULT_DRIVER_LANGUAGE, defaultAlertRules, type TruckEntry } from "@/mock/data";

// Bumped to v2 when seed trucks stopped shipping pre-located — anyone with
// v1 cached (already-enriched seed data) gets the new clean defaults
// instead of stale state under the old key.
const STORAGE_KEY = "trak-fleet-v2";

type Action =
  | { type: "SET_ALL"; trucks: TruckEntry[] }
  | { type: "APPEND"; trucks: TruckEntry[] }
  | { type: "ADD_BLANK" }
  | { type: "UPDATE"; id: string; patch: Partial<TruckEntry> }
  | { type: "DELETE"; id: string }
  | { type: "TOGGLE_SHOW"; id: string };

function blankTruck(): TruckEntry {
  return {
    id: crypto.randomUUID(),
    driverName: "",
    phone: "",
    truckType: "",
    truckPlate: "",
    sourceLabel: "",
    destinationLabel: "",
    notes: "",
    status: "idle",
    showOnMap: true,
    // Per-truck, every rule defaults OFF — no fleet-wide switch. See
    // TruckEntry's alertRules doc comment for why.
    alertRules: defaultAlertRules(),
    language: DEFAULT_DRIVER_LANGUAGE,
    voiceLanguage: DEFAULT_DRIVER_LANGUAGE,
    startProgress: 0,
    fuelStops: [],
    serviceStops: [],
    parkingStops: [],
    alertPoints: [],
    enrichStatus: "idle",
  };
}

function reducer(state: TruckEntry[], action: Action): TruckEntry[] {
  switch (action.type) {
    case "SET_ALL":
      return action.trucks;
    case "APPEND":
      return [...state, ...action.trucks];
    case "ADD_BLANK":
      return [...state, blankTruck()];
    case "UPDATE":
      return state.map((t) => {
        if (t.id !== action.id) return t;
        // Stamped automatically, not by the caller — a truck's gps_silent
        // rule measures how long it's actually been silent, which only
        // means something if this is set the moment status last changed.
        const statusSince =
          action.patch.status && action.patch.status !== t.status ? Date.now() : t.statusSince;
        return { ...t, ...action.patch, statusSince };
      });
    case "DELETE":
      return state.filter((t) => t.id !== action.id);
    case "TOGGLE_SHOW":
      return state.map((t) => (t.id === action.id ? { ...t, showOnMap: !t.showOnMap } : t));
    default:
      return state;
  }
}

interface FleetContextValue {
  trucks: TruckEntry[];
  appendTrucks: (trucks: TruckEntry[]) => void;
  addBlankTruck: () => void;
  updateTruck: (id: string, patch: Partial<TruckEntry>) => void;
  deleteTruck: (id: string) => void;
  toggleShowOnMap: (id: string) => void;
}

const FleetContext = createContext<FleetContextValue | null>(null);

export function FleetProvider({ children }: { children: ReactNode }) {
  const [trucks, dispatch] = useReducer(reducer, DEFAULT_TRUCKS);

  // Hydrate from localStorage once on mount — kept out of the reducer's
  // initial state so this still renders the same DEFAULT_TRUCKS on the
  // server and the client's first paint (avoids a hydration mismatch).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        // Backfills fields added after some browsers already had trucks
        // persisted (e.g. alertPoints) — without this, an old saved truck
        // crashes any code that iterates a field it predates.
        // Old shape, from before alertRules replaced a single
        // whatsappAlertsEnabled+fuelProximityKm pair — read only to carry a
        // saved truck's existing fuel-alert setting forward into the new
        // near_fuel_stop rule instead of silently resetting it.
        type LegacyTruck = TruckEntry & { whatsappAlertsEnabled?: boolean; fuelProximityKm?: number };
        const parsed: LegacyTruck[] = JSON.parse(saved);
        const migrated = parsed.map((t) => ({
          ...t,
          alertPoints: t.alertPoints ?? [],
          language: t.language ?? DEFAULT_DRIVER_LANGUAGE,
          voiceLanguage: t.voiceLanguage ?? DEFAULT_DRIVER_LANGUAGE,
          // Merged over a fresh defaultAlertRules() rather than used as-is —
          // a truck saved under an *earlier* alertRules shape (e.g. before
          // route_deviation existed) has the object but not that key, which
          // would crash any code reading truck.alertRules.route_deviation.
          alertRules: (() => {
            const rules = defaultAlertRules();
            if (t.whatsappAlertsEnabled !== undefined) {
              rules.near_fuel_stop = {
                enabled: t.whatsappAlertsEnabled,
                threshold: t.fuelProximityKm ?? rules.near_fuel_stop.threshold,
              };
            }
            return { ...rules, ...t.alertRules };
          })(),
        }));
        dispatch({ type: "SET_ALL", trucks: migrated });
      }
    } catch {
      // corrupt or inaccessible storage — fall back to the default fleet
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trucks));
    } catch {
      // storage full or unavailable (e.g. private browsing) — fleet still
      // works for this session, just won't survive a reload
    }
    // Mirrors the fleet server-side too — the WhatsApp webhook runs as its
    // own request, with no access to this browser's localStorage, so it
    // looks drivers up against this copy instead. Fire-and-forget: a failed
    // sync just means the bot answers with slightly stale data, not
    // something worth surfacing in the fleet UI.
    fetch("/api/fleet/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trucks),
    }).catch(() => {});
  }, [trucks]);

  // Picks up server-side changes — currently just the voice agent appending
  // a call outcome to a truck's Notes after a GPS-idle call (see
  // /api/fleet/call-outcome). The agent is its own process reaching the
  // dashboard only over HTTP, so a short poll is the only way this side
  // notices; a ref (not `trucks` in the closure) keeps each tick comparing
  // against the latest state instead of whatever it was when this effect
  // first ran.
  const trucksRef = useRef(trucks);
  useEffect(() => {
    trucksRef.current = trucks;
  }, [trucks]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetch("/api/fleet/state")
        .then((res) => res.json())
        .then((data: { trucks?: TruckEntry[] }) => {
          for (const serverTruck of data.trucks ?? []) {
            const localTruck = trucksRef.current.find((t) => t.id === serverTruck.id);
            if (localTruck && serverTruck.notes !== localTruck.notes) {
              dispatch({ type: "UPDATE", id: serverTruck.id, patch: { notes: serverTruck.notes } });
            }
          }
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const value: FleetContextValue = {
    trucks,
    appendTrucks: (t) => dispatch({ type: "APPEND", trucks: t }),
    addBlankTruck: () => dispatch({ type: "ADD_BLANK" }),
    updateTruck: (id, patch) => dispatch({ type: "UPDATE", id, patch }),
    deleteTruck: (id) => dispatch({ type: "DELETE", id }),
    toggleShowOnMap: (id) => dispatch({ type: "TOGGLE_SHOW", id }),
  };

  return <FleetContext.Provider value={value}>{children}</FleetContext.Provider>;
}

export function useFleet(): FleetContextValue {
  const ctx = useContext(FleetContext);
  if (!ctx) throw new Error("useFleet must be used within a FleetProvider");
  return ctx;
}
