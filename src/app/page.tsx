"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { drivers, trips } from "@/mock/data";
import DriverList from "@/components/DriverList";

const FleetMap = dynamic(() => import("@/components/FleetMap"), { ssr: false });

const driverById = Object.fromEntries(drivers.map((d) => [d.id, d]));
const driverNameById = Object.fromEntries(drivers.map((d) => [d.id, d.name]));
const truckPlateById = Object.fromEntries(drivers.map((d) => [d.id, d.truckPlate]));
const truckModelById = Object.fromEntries(drivers.map((d) => [d.id, d.truckModel]));

export default function Dashboard() {
  return (
    <div className="flex flex-col flex-1 min-h-0 bg-void">
      {/* Header bg is pure #000 — the exact black the logo file's own canvas
          uses — so the image blends with zero visible edge, rather than the
          slightly-off bg-void tone it had before. */}
      <header className="relative flex flex-col items-center justify-center bg-black py-3 sm:py-4 shrink-0">
        <div className="absolute left-4 top-3 sm:left-6 sm:top-4 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-gold" />
          <span className="font-display text-[11px] font-medium uppercase tracking-[0.2em] text-ink-muted">
            Live
          </span>
        </div>
        {/* The source file is a 400x400 square canvas with a lot of black
            padding around a compact text band — scaling the whole square up
            just grows that padding, and cropping it wider than ~400px wide
            upscales real pixels into visible blur (a hard limit of this
            being a low-res source file — a higher-res original would let
            this go bigger without softening). Capped near native width. */}
        <Image
          src="/continent-trans-logo.jpg"
          alt="Continent Trans"
          width={400}
          height={400}
          className="h-24 w-full max-w-md sm:h-28 sm:max-w-lg object-cover"
          priority
        />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-gold/70 to-transparent" />
      </header>

      {/* Map gets a fixed, dedicated viewport region — not something the page
          scrolls "past" — so its own scroll-to-zoom never fights page scroll. */}
      <div className="flex-1 min-h-0">
        <FleetMap
          trips={trips}
          driverNameById={driverNameById}
          truckPlateById={truckPlateById}
          truckModelById={truckModelById}
        />
      </div>

      <section className="shrink-0 h-48 overflow-y-auto border-t border-hairline bg-surface">
        <div className="flex items-center gap-2 px-4 pt-4 pb-1">
          <span className="h-3.5 w-0.5 bg-gradient-to-b from-brand-red to-brand-gold rounded-full" />
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.15em] text-ink">
            Fleet status
          </h2>
        </div>
        <DriverList trips={trips} driverById={driverById} />
      </section>
    </div>
  );
}
