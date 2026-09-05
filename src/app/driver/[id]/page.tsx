"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { getDriver, getTripForDriver, drivers } from "@/mock/data";

const FleetMap = dynamic(() => import("@/components/FleetMap"), { ssr: false });

const driverNameById = Object.fromEntries(drivers.map((d) => [d.id, d.name]));
const truckPlateById = Object.fromEntries(drivers.map((d) => [d.id, d.truckPlate]));
const truckModelById = Object.fromEntries(drivers.map((d) => [d.id, d.truckModel]));

export default function DriverDetailPage() {
  const params = useParams<{ id: string }>();
  const driver = getDriver(params.id);
  const trip = driver ? getTripForDriver(driver.id) : undefined;

  if (!driver || !trip) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 bg-void text-ink">
        <p className="text-ink-muted">Driver not found.</p>
        <Link href="/" className="text-brand-gold text-sm">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-void">
      <header className="border-b border-hairline bg-black px-4 py-3">
        <Link href="/" className="text-xs text-brand-gold">
          ← All drivers
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <Image
            src="/continent-trans-logo.jpg"
            alt="Continent Trans"
            width={400}
            height={400}
            className="h-8 w-28 object-cover"
          />
          <div>
            <h1 className="font-display text-lg font-semibold uppercase tracking-wide text-ink">
              {driver.name}
            </h1>
            <p className="font-mono text-xs text-ink-muted">
              {driver.truckPlate} · {driver.phone} · {trip.sourceLabel} → {trip.destinationLabel}
            </p>
          </div>
        </div>
      </header>

      {trip.alert && (
        <div className="px-4 py-2 border-b border-hairline bg-brand-red/10 text-brand-red text-xs font-medium">
          {trip.alert.message}
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        <main className="flex-1 min-h-0">
          <FleetMap
            trips={[trip]}
            driverNameById={driverNameById}
            truckPlateById={truckPlateById}
            truckModelById={truckModelById}
            focusTripId={trip.id}
          />
        </main>
        <aside className="w-80 shrink-0 border-l border-hairline bg-surface overflow-y-auto p-4 flex flex-col gap-4 text-sm">
          <div>
            <h2 className="font-display font-semibold uppercase tracking-wide text-ink mb-2 text-xs">
              Fuel stops on route
            </h2>
            <ul className="flex flex-col gap-2">
              {trip.fuelStops.map((f) => (
                <li key={f.id} className="rounded-md border border-hairline bg-surface-raised px-3 py-2">
                  <p className="font-medium text-ink">{f.name}</p>
                  <p className="text-xs text-ink-muted">{f.brand}</p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-display font-semibold uppercase tracking-wide text-ink mb-2 text-xs">
              Parking availability
            </h2>
            <ul className="flex flex-col gap-2">
              {trip.parkingStops.map((p) => (
                <li key={p.id} className="rounded-md border border-hairline bg-surface-raised px-3 py-2">
                  <p className="font-medium text-ink">{p.name}</p>
                  <p className="font-mono text-xs text-ink-muted">
                    {p.available === 0 ? (
                      <span className="text-brand-red">Full</span>
                    ) : (
                      `${p.available} / ${p.capacityTotal} free`
                    )}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-display font-semibold uppercase tracking-wide text-ink mb-2 text-xs">
              Towing &amp; garage nearby
            </h2>
            <ul className="flex flex-col gap-2">
              {trip.serviceStops.map((s) => (
                <li key={s.id} className="rounded-md border border-hairline bg-surface-raised px-3 py-2">
                  <p className="font-medium text-ink">{s.name}</p>
                  <p className="text-xs text-ink-muted capitalize">{s.type}</p>
                  <a href={`tel:${s.phone}`} className="text-xs text-brand-gold font-mono">
                    {s.phone}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            className="mt-2 rounded-md bg-brand-red text-ink text-sm font-display font-semibold uppercase tracking-wide py-2 hover:bg-brand-red/85 transition-colors"
          >
            🚨 SOS — Call nearest service (mock)
          </button>
        </aside>
      </div>
    </div>
  );
}
