"use client";

import { useState } from "react";
import Link from "next/link";
import { useFleet } from "@/lib/fleetStore";
import { enrichTruck } from "@/lib/enrichTruck";
import type { TruckEntry, TruckStatus, DriverLanguage, AlertRuleKind } from "@/mock/data";
import ExcelUpload from "@/components/ExcelUpload";
import WhatsAppIcon from "@/components/WhatsAppIcon";

const STATUS_OPTIONS: TruckStatus[] = ["in_transit", "gps_silent", "idle"];

const RULE_OPTIONS: { key: AlertRuleKind; label: string; unit: string }[] = [
  { key: "near_fuel_stop", label: "Near fuel stop", unit: "km" },
  { key: "near_parking", label: "Near parking", unit: "km" },
  { key: "gps_silent", label: "GPS idle", unit: "min" },
];

const LANGUAGE_OPTIONS: DriverLanguage[] = ["ro", "en"];

const LANGUAGE_LABEL: Record<DriverLanguage, string> = {
  ro: "Română",
  en: "English",
};

const STATUS_LABEL: Record<TruckStatus, string> = {
  in_transit: "In transit",
  gps_silent: "GPS silent",
  idle: "Idle",
};

// Same instrument-cluster semantics as the map markers: green = running
// normally, pulsing red = needs attention, yellow = idle/parked.
const STATUS_DOT: Record<TruckStatus, string> = {
  in_transit: "bg-[#22c55e]",
  gps_silent: "bg-brand-red led-pulse",
  idle: "bg-[#eab308]",
};

const STATUS_BADGE: Record<TruckStatus, string> = {
  in_transit: "bg-[#22c55e]/15 text-[#22c55e]",
  gps_silent: "bg-brand-red/15 text-brand-red",
  idle: "bg-[#eab308]/15 text-[#eab308]",
};

function StatusBadge({ status }: { status: TruckStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-display text-[10px] font-medium uppercase tracking-wide ${STATUS_BADGE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

// At-a-glance counts, same idea as the reference dashboard's top strip —
// computed straight from live truck state, not a separate tracked figure.
function FleetSummaryStrip({ trucks }: { trucks: TruckEntry[] }) {
  const inTransit = trucks.filter((t) => t.status === "in_transit").length;
  const needsAttention = trucks.filter((t) => t.status === "gps_silent").length;
  const idle = trucks.filter((t) => t.status === "idle").length;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pt-3 text-xs text-ink-muted">
      <span className="flex items-center gap-1.5">
        <span className="font-semibold text-ink">{trucks.length}</span> fleet size
      </span>
      <span className="flex items-center gap-1.5">
        <span className="font-semibold text-[#22c55e]">{inTransit}</span> in transit
      </span>
      <span className={`flex items-center gap-1.5 ${needsAttention > 0 ? "text-brand-red" : ""}`}>
        <span className="font-semibold">{needsAttention}</span> need attention
      </span>
      <span className="flex items-center gap-1.5">
        <span className="font-semibold text-ink">{idle}</span> idle
      </span>
    </div>
  );
}

// Real signal (a truck's own status), not a fabricated timestamp/location —
// this project has stayed honest about real vs. simulated data throughout,
// and there's no real "last seen" tracking to report here yet.
function AlertBanner({ trucks }: { trucks: TruckEntry[] }) {
  const [dismissed, setDismissed] = useState(false);
  const flagged = trucks.filter((t) => t.status === "gps_silent");
  if (dismissed || flagged.length === 0) return null;

  return (
    <div className="mx-4 flex items-center justify-between gap-3 rounded-md border border-brand-red/40 bg-brand-red/10 px-3 py-2 text-xs text-brand-red">
      <span>
        ⚠ {flagged.length} truck{flagged.length > 1 ? "s" : ""} need attention — GPS silent:{" "}
        {flagged.map((t) => t.driverName || t.truckPlate || "Unnamed").join(", ")}
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss alert"
        className="shrink-0 text-brand-red/70 hover:text-brand-red"
      >
        ✕
      </button>
    </div>
  );
}

function Field({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-transparent border-b border-hairline focus:border-brand-gold outline-none text-sm py-0.5 placeholder:text-ink-muted/50"
    />
  );
}

// Collapsed by default — a one-line summary (name, plate, route, distance,
// status), same density as the reference roster — clicking it expands the
// full editable form in place instead of every truck's fields always being
// on screen at once.
function TruckCard({
  truck,
  expanded,
  onToggle,
}: {
  truck: TruckEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { updateTruck, deleteTruck, toggleShowOnMap } = useFleet();
  const patch = (p: Partial<TruckEntry>) => updateTruck(truck.id, p);

  const handleLocate = () => {
    if (!truck.sourceLabel || !truck.destinationLabel) return;
    enrichTruck(truck, (p) => updateTruck(truck.id, p));
  };

  return (
    <div className="rounded-lg border border-hairline bg-surface-raised overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface transition-colors"
      >
        <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[truck.status]}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink truncate">
            {truck.driverName || "Unnamed driver"}{" "}
            <span className="font-mono text-xs text-ink-muted">{truck.truckPlate}</span>
          </p>
          <p className="text-xs text-ink-muted truncate">
            {truck.sourceLabel || "No source"} → {truck.destinationLabel || "No destination"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline font-mono text-xs text-ink-muted">
            {truck.enrichStatus === "done" && truck.distanceKm !== undefined ? `${truck.distanceKm} km` : "—"}
          </span>
          <StatusBadge status={truck.status} />
          <span
            className={`text-ink-muted transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
            aria-hidden
          >
            ›
          </span>
        </div>
      </button>

      {expanded && (
        <div className="flex flex-col gap-2 px-4 pb-3 pt-2 border-t border-hairline">
          <div className="flex items-start justify-between gap-2">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 flex-1 min-w-0">
              <Field value={truck.driverName} onChange={(v) => patch({ driverName: v })} placeholder="Driver name" />
              <Field value={truck.phone} onChange={(v) => patch({ phone: v })} placeholder="Phone" />
              <Field value={truck.truckType} onChange={(v) => patch({ truckType: v })} placeholder="Truck type" />
              <Field value={truck.truckPlate} onChange={(v) => patch({ truckPlate: v })} placeholder="Plate" />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/driver/${truck.id}`}
                className="font-display text-[10px] font-medium uppercase tracking-wide text-brand-gold hover:underline whitespace-nowrap"
              >
                Open route ↗
              </Link>
              <button
                type="button"
                onClick={() => deleteTruck(truck.id)}
                aria-label="Delete truck"
                className="text-ink-muted hover:text-brand-red text-xs"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <Field value={truck.sourceLabel} onChange={(v) => patch({ sourceLabel: v })} placeholder="Source" />
            <Field
              value={truck.destinationLabel}
              onChange={(v) => patch({ destinationLabel: v })}
              placeholder="Destination"
            />
          </div>

          <Field value={truck.notes} onChange={(v) => patch({ notes: v })} placeholder="Notes" />

          <div className="flex items-center justify-between gap-2 flex-wrap mt-1">
            <div className="flex items-center gap-3">
              <select
                value={truck.status}
                onChange={(e) => patch({ status: e.target.value as TruckStatus })}
                className="bg-surface border border-hairline rounded text-xs px-1.5 py-1 text-ink"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                <input
                  type="checkbox"
                  checked={truck.showOnMap}
                  onChange={() => toggleShowOnMap(truck.id)}
                  className="accent-[var(--brand-gold)]"
                />
                Show on map
              </label>
            </div>

            <button
              type="button"
              onClick={handleLocate}
              disabled={!truck.sourceLabel || !truck.destinationLabel || truck.enrichStatus === "loading"}
              className="font-display text-[11px] font-medium uppercase tracking-wide px-2.5 py-1 rounded bg-brand-gold text-void disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-gold/90 transition-colors"
            >
              {truck.enrichStatus === "loading" ? "Locating…" : "Locate"}
            </button>
          </div>

          {/* Three independent triggers, each its own switch + threshold —
              no fleet-wide master switch and no single shared radius. Truck
              1 can run fuel-proximity only, truck 2 parking-proximity only,
              truck 3 GPS-idle only, each at its own number, deliberately,
              after an earlier version's single switch+radius turned out to
              be the wrong shape for this. */}
          <div className="flex flex-col gap-1.5 pt-1 border-t border-hairline">
            <div className="flex items-center gap-1.5 text-[11px] text-ink-muted">
              <WhatsAppIcon /> WhatsApp triggers
            </div>
            {RULE_OPTIONS.map(({ key, label, unit }) => {
              const rule = truck.alertRules[key];
              return (
                <label key={key} className="flex items-center gap-2 text-[11px] text-ink-muted">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(e) =>
                      patch({
                        alertRules: {
                          ...truck.alertRules,
                          [key]: { ...rule, enabled: e.target.checked },
                        },
                      })
                    }
                    className="accent-[var(--brand-gold)]"
                  />
                  <span className={`w-24 ${rule.enabled ? "text-ink" : ""}`}>{label}</span>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={rule.threshold}
                    onChange={(e) =>
                      patch({
                        alertRules: {
                          ...truck.alertRules,
                          [key]: { ...rule, threshold: Number(e.target.value) || 1 },
                        },
                      })
                    }
                    className="w-12 bg-surface border border-hairline rounded px-1 py-0.5 text-ink"
                  />
                  {unit}
                </label>
              );
            })}
          </div>

          {/* Per-driver, not fleet-wide — same reasoning as WhatsApp alerts
              above. "Message" governs the WhatsApp bot's text replies;
              "Voice" is set aside for a future voice agent and isn't
              consumed anywhere yet. */}
          <div className="flex items-center gap-3 pt-1 border-t border-hairline">
            <label className="flex items-center gap-1.5 text-[11px] text-ink-muted">
              Message
              <select
                value={truck.language}
                onChange={(e) => patch({ language: e.target.value as DriverLanguage })}
                className="bg-surface border border-hairline rounded text-xs px-1.5 py-1 text-ink"
              >
                {LANGUAGE_OPTIONS.map((lang) => (
                  <option key={lang} value={lang}>
                    {LANGUAGE_LABEL[lang]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-[11px] text-ink-muted">
              Voice
              <select
                value={truck.voiceLanguage}
                onChange={(e) => patch({ voiceLanguage: e.target.value as DriverLanguage })}
                className="bg-surface border border-hairline rounded text-xs px-1.5 py-1 text-ink"
              >
                {LANGUAGE_OPTIONS.map((lang) => (
                  <option key={lang} value={lang}>
                    {LANGUAGE_LABEL[lang]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {truck.enrichStatus === "error" && <p className="text-[11px] text-brand-red">{truck.enrichError}</p>}
          {truck.enrichStatus === "done" && (
            <p className="text-[11px] font-mono text-ink-muted">
              {truck.distanceKm} km
              {truck.estimatedFuelCostEur !== undefined ? ` · ~€${truck.estimatedFuelCostEur} est. fuel cost` : ""}
              {" · "}
              {truck.fuelStops.length} fuel · {truck.serviceStops.length} maintenance ·{" "}
              {truck.parkingStops.length} parking
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function FleetEditor() {
  const { trucks, addBlankTruck } = useFleet();
  // All three shown by default — this filters which trucks appear in this
  // list only; it's independent of each truck's own "Show on map" checkbox.
  const [visibleStatuses, setVisibleStatuses] = useState<Set<TruckStatus>>(
    () => new Set(STATUS_OPTIONS),
  );
  // Accordion — one truck's detail open at a time, collapsed by default.
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleStatus = (status: TruckStatus) =>
    setVisibleStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });

  const filteredTrucks = trucks.filter((t) => visibleStatuses.has(t.status));

  return (
    <div className="flex flex-col gap-3">
      <FleetSummaryStrip trucks={trucks} />
      <AlertBanner trucks={trucks} />

      <div className="flex items-center justify-between px-4">
        <ExcelUpload />
        <button
          type="button"
          onClick={addBlankTruck}
          className="font-display text-xs font-medium uppercase tracking-wide px-3 py-1.5 rounded border border-hairline text-ink-muted hover:text-ink hover:border-brand-gold/50 transition-colors"
        >
          + Add truck
        </button>
      </div>

      <div className="flex items-center gap-2 px-4 pt-2 pb-1 border-t border-hairline/60">
        <span className="font-display text-[10px] uppercase tracking-[0.15em] text-ink-muted/70 shrink-0">
          Filter
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => toggleStatus(status)}
              aria-pressed={visibleStatuses.has(status)}
              className={`flex items-center gap-1.5 font-display text-[10px] font-medium uppercase tracking-wide px-2 py-1 rounded-full border transition-colors ${
                visibleStatuses.has(status)
                  ? "border-brand-gold/50 bg-surface-raised text-ink"
                  : "border-hairline text-ink-muted/60 hover:text-ink-muted"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${STATUS_DOT[status].replace(" led-pulse", "")}`} />
              {STATUS_LABEL[status]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 px-4 pb-4">
        {filteredTrucks.length === 0 ? (
          <p className="text-xs text-ink-muted text-center py-8">No trucks match the selected filters.</p>
        ) : (
          filteredTrucks.map((truck) => (
            <TruckCard
              key={truck.id}
              truck={truck}
              expanded={expandedId === truck.id}
              onToggle={() => setExpandedId((prev) => (prev === truck.id ? null : truck.id))}
            />
          ))
        )}
      </div>
    </div>
  );
}
