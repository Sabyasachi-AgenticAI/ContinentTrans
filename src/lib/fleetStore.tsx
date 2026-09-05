"use client";

import { createContext, useContext, useEffect, useReducer, type ReactNode } from "react";
import { DEFAULT_TRUCKS, DEFAULT_FUEL_PROXIMITY_KM, type TruckEntry } from "@/mock/data";

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
    // Per-truck, defaults OFF — no fleet-wide switch. See TruckEntry's
    // whatsappAlertsEnabled doc comment for why.
    whatsappAlertsEnabled: false,
    fuelProximityKm: DEFAULT_FUEL_PROXIMITY_KM,
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
      return state.map((t) => (t.id === action.id ? { ...t, ...action.patch } : t));
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
        const parsed: TruckEntry[] = JSON.parse(saved);
        const migrated = parsed.map((t) => ({ ...t, alertPoints: t.alertPoints ?? [] }));
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
  }, [trucks]);

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
