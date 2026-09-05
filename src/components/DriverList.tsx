"use client";

import Link from "next/link";
import type { Trip, Driver } from "@/mock/data";

const STATUS_LABEL: Record<Trip["status"], string> = {
  in_transit: "In transit",
  gps_silent: "GPS silent",
  idle: "Idle",
};

// Instrument-cluster warning lights, not status pills: steady when normal,
// pulsing only when something actually needs a dispatcher's attention.
const STATUS_DOT: Record<Trip["status"], string> = {
  in_transit: "bg-brand-gold",
  gps_silent: "bg-brand-red led-pulse",
  idle: "bg-ink-muted",
};

interface DriverListProps {
  trips: Trip[];
  driverById: Record<string, Driver>;
}

export default function DriverList({ trips, driverById }: DriverListProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 p-4">
      {trips.map((trip) => {
        const driver = driverById[trip.driverId];
        return (
          <Link
            key={trip.id}
            href={`/driver/${driver.id}`}
            className="flex flex-col gap-1.5 rounded-md border border-hairline bg-surface-raised px-4 py-3 hover:border-brand-gold/50 transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-sm font-medium uppercase tracking-wide text-ink truncate">
                {driver.name}
              </span>
              <span className="flex items-center gap-1.5 shrink-0">
                <span className={`h-2 w-2 rounded-full ${STATUS_DOT[trip.status]}`} />
                <span className="text-[11px] text-ink-muted">{STATUS_LABEL[trip.status]}</span>
              </span>
            </div>
            <div className="font-mono text-xs text-ink-muted">
              {driver.truckPlate} · {driver.phone}
            </div>
            <div className="text-xs text-ink-muted">
              {trip.sourceLabel} → {trip.destinationLabel}
            </div>
            {trip.alert && (
              <div className="text-[11px] text-brand-red mt-0.5">{trip.alert.message}</div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
