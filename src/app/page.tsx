"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useFleet } from "@/lib/fleetStore";
import FleetEditor from "@/components/FleetEditor";

const FleetMap = dynamic(() => import("@/components/FleetMap"), { ssr: false });

export default function Dashboard() {
  const { trucks } = useFleet();

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-void">
      {/* Branding hierarchy: Continent Trans (the client this dashboard
          serves) stays the visual hero. Flowgentic TRAK (the product) gets
          a small badge, not competing for the same space. Flowgentic AI
          GmbH (the maker) gets a quiet footer credit — see below the
          Fleet Status section. */}
      <header className="relative flex flex-col items-center justify-center bg-black py-4 sm:py-6 shrink-0">
        <div className="absolute left-4 top-3 sm:left-6 sm:top-4 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-gold" />
          <span className="font-display text-[11px] font-medium uppercase tracking-[0.2em] text-ink-muted">
            Live
          </span>
        </div>
        <div className="absolute right-4 top-3 sm:right-6 sm:top-4 font-display text-[11px] font-medium uppercase tracking-[0.2em] text-ink-muted">
          Flowgentic <span className="text-brand-gold">TRAK</span>
        </div>
        {/* Real logo file, wide crop — 1024x256, matching the wordmark's
            actual proportions instead of the old 400x400 square (which had
            dead black margins above/below the text, forcing a lossy
            zoom-crop to fill the header). Same brand mark, just the
            higher-resolution file the client provided. */}
        <Image
          src="/continent-trans-logo-wide.jpg"
          alt="Continent Trans"
          width={1024}
          height={256}
          className="h-20 w-full max-w-xl sm:h-24 sm:max-w-2xl object-contain"
          priority
        />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-gold/70 to-transparent" />
      </header>

      {/* Map gets a fixed, dedicated viewport region — not something the page
          scrolls "past" — so its own scroll-to-zoom never fights page scroll. */}
      <div className="flex-1 min-h-0">
        <FleetMap trucks={trucks} />
      </div>

      <section className="shrink-0 h-80 overflow-y-auto border-t border-hairline bg-surface">
        <div className="flex items-center gap-2 px-4 pt-4 pb-1">
          <span className="h-3.5 w-0.5 bg-gradient-to-b from-brand-red to-brand-gold rounded-full" />
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.15em] text-ink">
            Fleet status
          </h2>
        </div>
        <FleetEditor />
      </section>

      <footer className="shrink-0 flex items-center justify-center gap-2 border-t border-hairline bg-black px-4 py-2">
        <span className="font-display text-[10px] uppercase tracking-[0.15em] text-ink-muted">
          Powered by
        </span>
        <Image
          src="/flowgentic-ai-logo.png"
          alt="Flowgentic AI GmbH"
          width={412}
          height={70}
          className="h-4 w-auto"
        />
      </footer>
    </div>
  );
}
