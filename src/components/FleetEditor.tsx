"use client";

import { useFleet } from "@/lib/fleetStore";
import { enrichTruck } from "@/lib/enrichTruck";
import type { TruckEntry, TruckStatus } from "@/mock/data";
import ExcelUpload from "@/components/ExcelUpload";

const STATUS_OPTIONS: TruckStatus[] = ["in_transit", "gps_silent", "idle"];

// Same instrument-cluster semantics as the map markers: steady gold =
// running normally, pulsing red = needs attention, grey = idle.
const STATUS_DOT: Record<TruckStatus, string> = {
  in_transit: "bg-brand-gold",
  gps_silent: "bg-brand-red led-pulse",
  idle: "bg-ink-muted",
};

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

function TruckRow({ truck }: { truck: TruckEntry }) {
  const { updateTruck, deleteTruck, toggleShowOnMap } = useFleet();
  const patch = (p: Partial<TruckEntry>) => updateTruck(truck.id, p);

  const handleLocate = () => {
    if (!truck.sourceLabel || !truck.destinationLabel) return;
    enrichTruck(truck, (p) => updateTruck(truck.id, p));
  };

  return (
    <div className="rounded-lg border border-hairline bg-surface-raised px-4 py-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 flex-1 min-w-0">
          <Field value={truck.driverName} onChange={(v) => patch({ driverName: v })} placeholder="Driver name" />
          <Field value={truck.phone} onChange={(v) => patch({ phone: v })} placeholder="Phone" />
          <Field value={truck.truckType} onChange={(v) => patch({ truckType: v })} placeholder="Truck type" />
          <Field value={truck.truckPlate} onChange={(v) => patch({ truckPlate: v })} placeholder="Plate" />
        </div>
        <button
          type="button"
          onClick={() => deleteTruck(truck.id)}
          aria-label="Delete truck"
          className="text-ink-muted hover:text-brand-red text-xs shrink-0"
        >
          ✕
        </button>
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
          <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[truck.status]}`} />
          <select
            value={truck.status}
            onChange={(e) => patch({ status: e.target.value as TruckStatus })}
            className="bg-surface border border-hairline rounded text-xs px-1.5 py-1 text-ink"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
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

      {/* Per-truck, not fleet-wide — each truck's WhatsApp alerting is its
          own setting, deliberately, after an earlier version's single
          fleet-wide switch turned out to be the wrong shape for this. */}
      <div className="flex items-center gap-3 pt-1 border-t border-hairline">
        <label className="flex items-center gap-1.5 text-[11px] text-ink-muted">
          <input
            type="checkbox"
            checked={truck.whatsappAlertsEnabled}
            onChange={(e) => patch({ whatsappAlertsEnabled: e.target.checked })}
            className="accent-[var(--brand-gold)]"
          />
          📲 WhatsApp alerts
          <span className={truck.whatsappAlertsEnabled ? "text-brand-gold" : "text-ink-muted"}>
            {truck.whatsappAlertsEnabled ? "ON" : "OFF"}
          </span>
        </label>
        <label className="flex items-center gap-1 text-[11px] text-ink-muted">
          radius
          <input
            type="number"
            min={1}
            max={100}
            value={truck.fuelProximityKm}
            onChange={(e) => patch({ fuelProximityKm: Number(e.target.value) || 1 })}
            className="w-12 bg-surface border border-hairline rounded px-1 py-0.5 text-ink"
          />
          km
        </label>
      </div>

      {truck.enrichStatus === "error" && (
        <p className="text-[11px] text-brand-red">{truck.enrichError}</p>
      )}
      {truck.enrichStatus === "done" && (
        <p className="text-[11px] font-mono text-ink-muted">
          {truck.distanceKm} km
          {truck.estimatedFuelCostEur !== undefined ? ` · ~€${truck.estimatedFuelCostEur} est. fuel cost` : ""}
          {" · "}
          {truck.fuelStops.length} fuel · {truck.serviceStops.length} maintenance · {truck.parkingStops.length} parking
        </p>
      )}
    </div>
  );
}

export default function FleetEditor() {
  const { trucks, addBlankTruck } = useFleet();

  return (
    <div className="flex flex-col gap-3">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 px-4 pb-4">
        {trucks.map((truck) => (
          <TruckRow key={truck.id} truck={truck} />
        ))}
      </div>
    </div>
  );
}
