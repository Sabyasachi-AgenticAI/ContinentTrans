"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import type { TruckEntry, LatLng, AlertPointKind } from "@/mock/data";
import TripLayer from "@/components/TripLayer";
import { useFleet } from "@/lib/fleetStore";

const TICK_MS = 1000;

// Keeps the map framed on Europe — covers Iberia to the Urals, North Africa
// coast to Scandinavia — since every Continent Trans lane runs within it.
const EUROPE_BOUNDS: [LatLng, LatLng] = [
  [34, -15],
  [72, 45],
];

type MapTheme = "original" | "black";

interface LayerVisibility {
  fuel: boolean;
  service: boolean;
  parking: boolean;
}

const LAYER_TOGGLES: { key: keyof LayerVisibility; label: string; emoji: string }[] = [
  { key: "fuel", label: "Fuel", emoji: "⛽" },
  { key: "service", label: "Maintenance", emoji: "🔧" },
  { key: "parking", label: "Parking", emoji: "🅿️" },
];

// Captures the next map click while "add mode" is armed — must live inside
// the MapContainer to reach Leaflet's click event via react-leaflet's hook.
function AddPointCapture({ active, onCapture }: { active: boolean; onCapture: (pos: LatLng) => void }) {
  useMapEvents({
    click(e) {
      if (!active) return;
      onCapture([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

interface FleetMapProps {
  trucks: TruckEntry[];
  /** If set, only this truck's route/POIs are shown (used on the driver detail page). */
  focusTruckId?: string;
}

export default function FleetMap({ trucks, focusTruckId }: FleetMapProps) {
  const { updateTruck } = useFleet();

  // Only trucks that have actually been located (route populated by
  // enrichTruck) AND are toggled visible get drawn — a truck with just a
  // driver name and no source/destination yet has nothing to show.
  const visibleTrucks = useMemo(
    () =>
      trucks.filter(
        (t) => t.showOnMap && t.route && t.route.length >= 2 && (!focusTruckId || t.id === focusTruckId),
      ),
    [trucks, focusTruckId],
  );

  const [elapsed, setElapsed] = useState(0);
  // Both themes run on the same OpenStreetMap tile source — proven reliable
  // all session — with "black" applied as a CSS filter rather than switching
  // to a different tile provider (a dark CARTO provider we tried started
  // demanding an API key mid-session; not something to depend on here).
  const [theme, setTheme] = useState<MapTheme>("original");
  const [layers, setLayers] = useState<LayerVisibility>({ fuel: true, service: true, parking: true });
  const toggleLayer = (key: keyof LayerVisibility) =>
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));

  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);
  const handleWhatsAppEvent = (message: string, ok: boolean) => {
    setToast({ message, ok });
    setTimeout(() => setToast(null), 6000);
  };

  // "Add alert point" — only offered on a single-truck view (driver detail
  // page): the fleet overview shows several trucks at once, and a map click
  // there would have no unambiguous truck to attach the new point to.
  const [addMode, setAddMode] = useState(false);
  const [pendingPoint, setPendingPoint] = useState<LatLng | null>(null);
  const [pointName, setPointName] = useState("");
  const [pointKind, setPointKind] = useState<AlertPointKind>("fuel");

  const handleCapture = (pos: LatLng) => {
    setPendingPoint(pos);
    setAddMode(false);
  };

  const confirmPendingPoint = () => {
    if (!focusTruckId || !pendingPoint) return;
    const truck = trucks.find((t) => t.id === focusTruckId);
    if (!truck) return;
    updateTruck(focusTruckId, {
      alertPoints: [
        ...truck.alertPoints,
        {
          id: `alert-${crypto.randomUUID()}`,
          name: pointName.trim() || (pointKind === "fuel" ? "Custom fuel stop" : "Custom parking point"),
          kind: pointKind,
          position: pendingPoint,
          notify: true,
        },
      ],
    });
    setPendingPoint(null);
    setPointName("");
    setPointKind("fuel");
  };

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed((Date.now() - start) / 1000);
    }, TICK_MS);
    return () => clearInterval(interval);
  }, []);

  const center: LatLng = visibleTrucks[0]?.route?.[0] ?? [47.0, 20.0];

  return (
    // react-leaflet's MapContainer only applies `className` once, at map
    // creation — it doesn't react to prop changes after that, since the
    // underlying Leaflet map instance persists across re-renders. So the
    // theme class has to live on this ordinary (fully reactive) wrapper div
    // instead, where the CSS descendant selector still reaches the tile pane.
    <div
      className={`relative h-full w-full ${theme === "black" ? "theme-black" : ""} ${addMode ? "cursor-crosshair" : ""}`}
    >
      <div className="absolute top-3 right-3 z-[1000] flex gap-1 rounded-md border border-hairline bg-surface-raised p-1 shadow-lg">
        {(["original", "black"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTheme(t)}
            className={`font-display text-[11px] font-medium uppercase tracking-wide px-2.5 py-1 rounded transition-colors ${
              theme === t ? "bg-brand-gold text-void" : "text-ink-muted hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Only on the single-truck (driver detail) view — see addMode's doc
          comment for why the fleet overview doesn't offer this. */}
      {focusTruckId && (
        <div className="absolute bottom-3 right-3 z-[1000]">
          <button
            type="button"
            onClick={() => setAddMode((v) => !v)}
            className={`font-display text-[11px] font-medium uppercase tracking-wide px-2.5 py-1.5 rounded-md border shadow-lg transition-colors ${
              addMode
                ? "bg-brand-gold text-void border-brand-gold"
                : "border-hairline bg-surface-raised text-ink-muted hover:text-ink"
            }`}
          >
            {addMode ? "Click the map to place…" : "+ Add alert point"}
          </button>
        </div>
      )}

      {/* POI layer toggles, opposite side from the map-theme control so the
          two don't compete for the same corner. */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-1 rounded-md border border-hairline bg-surface-raised p-1.5 shadow-lg">
        {LAYER_TOGGLES.map(({ key, label, emoji }) => (
          <button
            key={key}
            type="button"
            onClick={() => toggleLayer(key)}
            aria-pressed={layers[key]}
            className={`flex items-center gap-1.5 font-display text-[11px] font-medium uppercase tracking-wide px-2 py-1 rounded transition-colors ${
              layers[key] ? "bg-brand-gold text-void" : "text-ink-muted hover:text-ink"
            }`}
          >
            <span aria-hidden>{emoji}</span>
            {label}
          </button>
        ))}
      </div>

      <MapContainer
        {...(focusTruckId
          ? { center, zoom: 6 }
          : { bounds: EUROPE_BOUNDS, boundsOptions: { padding: [16, 16] as [number, number] } })}
        minZoom={4}
        maxBounds={EUROPE_BOUNDS}
        maxBoundsViscosity={1.0}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <AddPointCapture active={addMode && !!focusTruckId} onCapture={handleCapture} />
        {visibleTrucks.map((truck) => (
          <TripLayer
            key={truck.id}
            truck={truck}
            elapsed={elapsed}
            showFuel={layers.fuel}
            showService={layers.service}
            showParking={layers.parking}
            onWhatsAppEvent={handleWhatsAppEvent}
          />
        ))}
      </MapContainer>

      {pendingPoint && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] flex flex-col gap-2 rounded-md border border-hairline bg-surface-raised p-3 shadow-lg w-64">
          <p className="font-display text-[11px] font-medium uppercase tracking-wide text-ink-muted">
            New alert point
          </p>
          <input
            value={pointName}
            onChange={(e) => setPointName(e.target.value)}
            placeholder={pointKind === "fuel" ? "Custom fuel stop" : "Custom parking point"}
            autoFocus
            className="w-full bg-transparent border-b border-hairline focus:border-brand-gold outline-none text-sm py-0.5 placeholder:text-ink-muted/50"
          />
          <div className="flex gap-1">
            {(["fuel", "parking"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setPointKind(k)}
                className={`flex-1 font-display text-[11px] font-medium uppercase tracking-wide px-2 py-1 rounded transition-colors ${
                  pointKind === k ? "bg-brand-gold text-void" : "border border-hairline text-ink-muted hover:text-ink"
                }`}
              >
                {k === "fuel" ? "⛽ Fuel" : "🅿️ Parking"}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-ink-muted">
            🔔 Will notify the driver via WhatsApp when in range — same as any other alert point.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setPendingPoint(null)}
              className="font-display text-[11px] font-medium uppercase tracking-wide px-2.5 py-1 rounded border border-hairline text-ink-muted hover:text-ink transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmPendingPoint}
              className="font-display text-[11px] font-medium uppercase tracking-wide px-2.5 py-1 rounded bg-brand-gold text-void hover:bg-brand-gold/90 transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] rounded-md border px-3 py-2 text-xs font-mono shadow-lg ${
            toast.ok
              ? "border-brand-gold/50 bg-surface-raised text-ink"
              : "border-brand-red/50 bg-surface-raised text-brand-red"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
