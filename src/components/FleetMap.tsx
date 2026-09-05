"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import type { TruckEntry, LatLng } from "@/mock/data";
import TripLayer from "@/components/TripLayer";

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

interface FleetMapProps {
  trucks: TruckEntry[];
  /** If set, only this truck's route/POIs are shown (used on the driver detail page). */
  focusTruckId?: string;
}

export default function FleetMap({ trucks, focusTruckId }: FleetMapProps) {
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
    <div className={`relative h-full w-full ${theme === "black" ? "theme-black" : ""}`}>
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
        center={center}
        zoom={focusTruckId ? 6 : 5}
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
        {visibleTrucks.map((truck) => (
          <TripLayer
            key={truck.id}
            truck={truck}
            elapsed={elapsed}
            showFuel={layers.fuel}
            showService={layers.service}
            showParking={layers.parking}
          />
        ))}
      </MapContainer>
    </div>
  );
}
