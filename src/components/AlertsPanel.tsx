"use client";

import Link from "next/link";
import type { Trip, Driver } from "@/mock/data";

const ALERT_STYLE: Record<string, string> = {
  gps_silent: "border-red-300 bg-red-50 text-red-800",
  near_fuel_stop: "border-amber-300 bg-amber-50 text-amber-800",
  sos: "border-red-400 bg-red-100 text-red-900",
};

interface AlertsPanelProps {
  trips: Trip[];
  driverById: Record<string, Driver>;
}

export default function AlertsPanel({ trips, driverById }: AlertsPanelProps) {
  const alertTrips = trips.filter((t) => t.alert);

  if (alertTrips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-zinc-200 bg-white">
      {alertTrips.map((trip) => (
        <Link
          key={trip.id}
          href={`/driver/${trip.driverId}`}
          className={`rounded-md border px-3 py-1.5 text-xs font-medium ${ALERT_STYLE[trip.alert!.type]}`}
        >
          {driverById[trip.driverId].name}: {trip.alert!.message}
        </Link>
      ))}
    </div>
  );
}
