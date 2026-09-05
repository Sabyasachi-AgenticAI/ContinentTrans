"use client";

import { useEffect, useState } from "react";
import { Marker, Polyline, Popup, Tooltip } from "react-leaflet";
import L from "leaflet";
import type { TruckEntry, FuelStop, LatLng } from "@/mock/data";
import { interpolateAlongRoute, haversineKm } from "@/lib/geo";
import { fetchTruckRoute, type RouteSource } from "@/lib/routing";
import { fetchNearbyFuelPrices, type FuelPriceStation } from "@/lib/fuelPrices";
import { useFleet } from "@/lib/fleetStore";
import { hasAlerted, markAlerted } from "@/lib/whatsappAlertLog";

const DEMO_LOOP_SECONDS = 90;

// Same semantics as the instrument-cluster dots in FleetEditor: gold =
// running normally, red = needs attention, grey = parked/idle.
const STATUS_COLOR: Record<TruckEntry["status"], string> = {
  in_transit: "#c9a24b",
  gps_silent: "#c1272d",
  idle: "#6b7280",
};

// Manufacturer badges use short text codes + a brand-adjacent color, not the
// actual Scania/MAN/Mercedes-Benz trademarked logos — those are protected
// marks and not something to embed without rights to the artwork.
const BRAND_BADGE: Record<string, { code: string; color: string }> = {
  Scania: { code: "SCA", color: "#0f2d52" },
  "Mercedes Benz": { code: "MB", color: "#1a1a1a" },
  MAN: { code: "MAN", color: "#d20a11" },
};

function brandBadge(truckType: string) {
  const brand = Object.keys(BRAND_BADGE).find((b) => truckType.startsWith(b));
  return brand ? BRAND_BADGE[brand] : null;
}

// A truck emoji badge, not a rotating arrow — easier to spot at a glance on
// a crowded map than an abstract triangle, and doesn't need directional
// artwork we don't have. The small corner chip identifies the manufacturer.
function truckIcon(color: string, truckType: string) {
  const badge = brandBadge(truckType);
  const badgeHtml = badge
    ? `<span style="
        position:absolute; bottom:-3px; right:-5px;
        min-width:16px; height:14px; padding:0 2px;
        border-radius:7px; background:${badge.color}; color:white;
        font-size:7px; font-weight:700; letter-spacing:.2px;
        display:flex; align-items:center; justify-content:center;
        border:1.5px solid white; box-shadow:0 1px 2px rgba(0,0,0,.4);
      ">${badge.code}</span>`
    : "";

  return L.divIcon({
    className: "",
    html: `<div style="position:relative; width:28px; height:28px;">
      <div style="
          width:28px; height:28px;
          display:flex; align-items:center; justify-content:center;
          background:${color}; border:2px solid #f2f0ea; border-radius:50%;
          box-shadow:0 1px 6px rgba(0,0,0,.6);
          font-size:15px;
        ">🚛</div>
      ${badgeHtml}
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function poiIcon(emoji: string, bg: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
        width:20px;height:20px;border-radius:50%;
        background:${bg}; border:1px solid rgba(242,240,234,.35);
        display:flex;align-items:center;justify-content:center;
        font-size:11px; box-shadow:0 1px 4px rgba(0,0,0,.6);
      ">${emoji}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

const FUEL_ICON = poiIcon("⛽", "#facc15");
const GARAGE_ICON = poiIcon("🔧", "#38bdf8");
const TOWING_ICON = poiIcon("🚨", "#fb923c");
const PARKING_UNKNOWN_ICON = poiIcon("🅿️", "#6b7280");

// Distinct pin markers at the exact route endpoints — independent of where
// the animated truck currently sits along the route, so source/destination
// stay visible at a glance even mid-route or when the truck is idle.
function pinIcon(label: string, color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
        width:22px; height:22px; border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        background:${color}; border:2px solid #f2f0ea;
        box-shadow:0 1px 4px rgba(0,0,0,.6);
        display:flex; align-items:center; justify-content:center;
      ">
        <span style="
          transform:rotate(45deg); font-size:10px; font-weight:700; color:white;
        ">${label}</span>
      </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
  });
}

const SOURCE_ICON = pinIcon("S", "#16a34a");
const DEST_ICON = pinIcon("D", "#c1272d");

// Color reflects occupancy so a full lot is obvious before opening the
// popup — only meaningful for mock TRAVIS-shaped spots that carry live
// capacity numbers; real OSM-sourced spots render as neutral grey instead.
function parkingIcon(available?: number, capacityTotal?: number) {
  if (available === undefined || capacityTotal === undefined) return PARKING_UNKNOWN_ICON;
  const ratio = capacityTotal > 0 ? available / capacityTotal : 0;
  const bg = available === 0 ? "#dc2626" : ratio < 0.25 ? "#f59e0b" : "#16a34a";
  return poiIcon("🅿️", bg);
}

interface TripLayerProps {
  truck: TruckEntry;
  elapsed: number;
  showFuel: boolean;
  showService: boolean;
  showParking: boolean;
  /** Called once per fuel-stop-proximity event, for the toast in FleetMap. */
  onWhatsAppEvent?: (message: string, ok: boolean) => void;
}

export default function TripLayer({
  truck,
  elapsed,
  showFuel,
  showService,
  showParking,
  onWhatsAppEvent,
}: TripLayerProps) {
  // Falls back to the truck's stored route endpoints until/unless a real
  // route is fetched — ORS's truck-aware driving-hgv profile first, OSRM as
  // a fallback. Fetched once per truck on mount — same "once per route"
  // volume reasoning as geocoding.
  const [roadRoute, setRoadRoute] = useState<LatLng[] | null>(null);
  const [routeSource, setRouteSource] = useState<RouteSource>("mock");

  useEffect(() => {
    let cancelled = false;
    if (!truck.route) return;

    fetchTruckRoute(truck.route).then((result) => {
      if (cancelled || !result) return;
      setRoadRoute(result.route);
      setRouteSource(result.source);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [truck.id]);

  const route = roadRoute ?? truck.route ?? [];
  const color = STATUS_COLOR[truck.status];

  const loopT = (truck.startProgress + elapsed / DEMO_LOOP_SECONDS) % 1;
  const { position } =
    route.length === 0
      ? { position: [0, 0] as LatLng, bearing: 0 }
      : truck.status === "in_transit"
        ? interpolateAlongRoute(route, loopT)
        : interpolateAlongRoute(route, truck.status === "idle" ? 0 : truck.startProgress);

  // Proximity check against the truck's real phone number, on the demo's
  // simulated position — no live GPS feed exists yet, so this proves the
  // alert mechanism against the same animated movement already on the map,
  // not a real driver's real location. Gated on THIS TRUCK's own switch —
  // deliberately no fleet-wide master switch; each truck's alerting is
  // entirely its own setting — AND this specific stop being marked
  // "notify" (not every fuel stop within range should message the driver).
  useEffect(() => {
    if (!truck.whatsappAlertsEnabled) return;
    if (!truck.phone || truck.status !== "in_transit" || route.length === 0) return;
    for (const stop of truck.fuelStops) {
      if (!stop.notify) continue;
      if (hasAlerted(truck.id, stop.id)) continue;
      if (haversineKm(position, stop.position) > truck.fuelProximityKm) continue;

      markAlerted(truck.id, stop.id);
      fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: truck.phone }),
      })
        .then((res) => res.ok)
        .catch(() => false)
        .then((ok) => {
          onWhatsAppEvent?.(
            ok
              ? `📲 WhatsApp sent to ${truck.driverName} — approaching ${stop.name}`
              : `⚠️ WhatsApp send failed for ${truck.driverName} (near ${stop.name})`,
            ok,
          );
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, truck.whatsappAlertsEnabled, truck.fuelProximityKm]);

  if (!truck.route) return null;

  return (
    <>
      <Polyline positions={route} pathOptions={{ color, weight: 3, opacity: 0.6 }} />

      {truck.sourceCoord && (
        <Marker position={truck.sourceCoord} icon={SOURCE_ICON}>
          <Tooltip direction="top" offset={[0, -20]} opacity={0.9}>
            {truck.sourceLabel}
          </Tooltip>
        </Marker>
      )}
      {truck.destCoord && (
        <Marker position={truck.destCoord} icon={DEST_ICON}>
          <Tooltip direction="top" offset={[0, -20]} opacity={0.9}>
            {truck.destinationLabel}
          </Tooltip>
        </Marker>
      )}

      <Marker position={position} icon={truckIcon(color, truck.truckType)}>
        <Tooltip className="plate-tooltip" direction="top" offset={[0, -14]} permanent opacity={1}>
          {truck.truckPlate || truck.driverName || "Truck"}
        </Tooltip>
        <Popup>
          <div className="text-sm font-sans">
            <p className="font-display font-semibold uppercase tracking-wide">
              {truck.driverName} · <span className="font-mono">{truck.truckPlate}</span>
            </p>
            <p className="text-xs text-ink-muted">{truck.truckType}</p>
            <p className="mt-1">
              {truck.sourceLabel} → {truck.destinationLabel}
            </p>
            <p className="capitalize text-xs mt-1">status: {truck.status.replace("_", " ")}</p>
            <p className="text-[10px] text-ink-muted mt-1">
              route:{" "}
              {routeSource === "ors-hgv"
                ? "truck-aware route (OpenRouteService HGV)"
                : routeSource === "osrm"
                  ? "road route (OSRM, car profile)"
                  : "mock waypoints"}
            </p>
            {truck.notes && <p className="text-xs mt-1 text-ink-muted">{truck.notes}</p>}
            {truck.alert && <p className="text-xs mt-1 text-brand-red">{truck.alert.message}</p>}
          </div>
        </Popup>
      </Marker>

      {showFuel &&
        truck.fuelStops.map((f) => <FuelStopMarker key={f.id} stop={f} truckId={truck.id} />)}

      {showService &&
        truck.serviceStops.map((s) => (
          <Marker key={s.id} position={s.position} icon={s.type === "garage" ? GARAGE_ICON : TOWING_ICON}>
            <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
              <span className="font-semibold">{s.name}</span>
              {s.address ? ` — ${s.address}` : ""}
            </Tooltip>
            <Popup>
              <div className="text-sm font-sans">
                <p className="font-display font-semibold">{s.name}</p>
                <p className="text-xs capitalize text-ink-muted">{s.type}</p>
                {s.phone ? (
                  <a className="text-xs text-brand-gold font-mono" href={`tel:${s.phone}`}>
                    {s.phone}
                  </a>
                ) : (
                  <p className="text-xs text-ink-muted">No phone listed</p>
                )}
                {s.source === "osm" && (
                  <p className="text-[10px] text-ink-muted mt-1">OpenStreetMap data — may be incomplete</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

      {showParking &&
        truck.parkingStops.map((p) => (
          <Marker key={p.id} position={p.position} icon={parkingIcon(p.available, p.capacityTotal)}>
            <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
              <span className="font-semibold">{p.name}</span>
              {p.address ? ` — ${p.address}` : ""}
            </Tooltip>
            <Popup>
              <div className="text-sm font-sans">
                <p className="font-display font-semibold">{p.name}</p>
                {p.available !== undefined && p.capacityTotal !== undefined ? (
                  <p className="text-xs font-mono">
                    {p.available === 0 ? (
                      <span className="text-brand-red font-medium">Full</span>
                    ) : (
                      <span>
                        {p.available} / {p.capacityTotal} spots free
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-xs text-ink-muted">Real location — live availability not known</p>
                )}
                <p className="text-[10px] text-ink-muted mt-1 font-sans">
                  {p.source === "osm"
                    ? "OpenStreetMap data — may be incomplete"
                    : "mock data — real TRAVIS availability pending API credentials"}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
    </>
  );
}

const FUEL_TYPE_LABEL: Record<string, string> = {
  diesel: "Diesel",
  e5: "Petrol E5",
  e10: "Petrol E10",
  petrol: "Petrol 95",
  petrol98: "Petrol 98",
  lpg: "LPG",
};

// Fetches real prices only when the popup is actually opened, not on mount —
// quota-conscious against nakordoni.eu's 1,000 calls/day Explorer plan
// rather than spending it on every marker on every page load.
function FuelStopMarker({ stop, truckId }: { stop: FuelStop; truckId: string }) {
  const { trucks, updateTruck } = useFleet();
  const parentTruck = trucks.find((t) => t.id === truckId);
  const [stations, setStations] = useState<FuelPriceStation[] | null>(null);
  const [attribution, setAttribution] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  const toggleNotify = () => {
    const truck = trucks.find((t) => t.id === truckId);
    if (!truck) return;
    updateTruck(truckId, {
      fuelStops: truck.fuelStops.map((s) => (s.id === stop.id ? { ...s, notify: !s.notify } : s)),
    });
  };

  const loadPrices = () => {
    if (state !== "idle") return;
    setState("loading");
    fetchNearbyFuelPrices(stop.position[0], stop.position[1]).then((result) => {
      if (!result) {
        setState("error");
        return;
      }
      setStations(result.stations);
      setAttribution(result.attribution);
      setState("done");
    });
  };

  const nearest = stations && stations.length > 0 ? stations[0] : null;

  return (
    <Marker
      position={stop.position}
      icon={FUEL_ICON}
      eventHandlers={{ popupopen: loadPrices, mouseover: loadPrices }}
    >
      <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
        {nearest ? (
          <>
            <span className="font-semibold">{nearest.name}</span>
            {nearest.address ? ` — ${nearest.address}` : ""}
          </>
        ) : state === "loading" ? (
          "Finding nearest real station…"
        ) : (
          stop.name
        )}
      </Tooltip>
      <Popup>
        <div className="text-sm font-sans min-w-[180px]">
          <p className="font-display font-semibold">{stop.name}</p>
          <p className="text-xs text-ink-muted">{stop.brand} fuel station</p>

          <div className="mt-2 border-t border-hairline pt-2">
            {state === "loading" && <p className="text-xs text-ink-muted">Checking live prices…</p>}
            {state === "error" && (
              <p className="text-xs text-ink-muted">Live price lookup unavailable right now.</p>
            )}
            {state === "done" && stations && stations.length === 0 && (
              <p className="text-xs text-ink-muted">No reporting station within 30 km.</p>
            )}
            {state === "done" && stations && stations.length > 0 && (
              <>
                <p className="text-[11px] text-ink-muted mb-1">
                  Nearest real station: {stations[0].name} ({stations[0].distance_km} km)
                </p>
                <ul className="flex flex-col gap-0.5 font-mono text-xs">
                  {stations.map((s, i) => (
                    <li key={i} className="flex justify-between gap-3">
                      <span className="text-ink-muted">{FUEL_TYPE_LABEL[s.fuel_type] ?? s.fuel_type}</span>
                      <span>
                        {s.price.toFixed(3)} {s.currency}
                      </span>
                    </li>
                  ))}
                </ul>
                <a
                  href="https://nakordoni.eu"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-brand-gold mt-1.5 inline-block"
                >
                  {attribution}
                </a>
              </>
            )}
          </div>

          <div className="mt-2 border-t border-hairline pt-2">
            <label className="flex items-center gap-1.5 text-xs">
              <input type="checkbox" checked={!!stop.notify} onChange={toggleNotify} />
              🔔 Notify driver via WhatsApp here
            </label>
            {stop.notify && parentTruck && !parentTruck.whatsappAlertsEnabled && (
              <p className="text-[10px] text-ink-muted mt-1">
                This truck&apos;s WhatsApp alerts are off — turn it on in Fleet Status to actually send.
              </p>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
