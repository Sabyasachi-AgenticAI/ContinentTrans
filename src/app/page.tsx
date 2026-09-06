"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useFleet } from "@/lib/fleetStore";
import FleetEditor from "@/components/FleetEditor";
import NavRail from "@/components/NavRail";

const FleetMap = dynamic(() => import("@/components/FleetMap"), { ssr: false });

export default function Dashboard() {
  const { trucks } = useFleet();

  return (
    <div className="flex flex-1 min-h-0">
      <NavRail />

      <div className="flex flex-col flex-1 min-h-0 bg-void">
        {/* Branding hierarchy: Continent Trans (the client this dashboard
            serves) stays the visual hero. Flowgentic TRAK (the product) gets
            a small badge, not competing for the same space. Flowgentic AI
            GmbH (the maker) gets a quiet footer credit — see below the
            Fleet Status section. */}
        {/* Two equal flex-1 side columns keep the logo mathematically
            centered regardless of how "Live" vs "Flowgentic TRAK" differ in
            width — more robust than a grid-cols arbitrary value, which
            didn't compile here and silently collapsed to a single stacked
            column. */}
        <header className="relative flex items-center gap-3 bg-void pl-6 pr-3 py-2 sm:py-3 shrink-0">
          <div className="flex flex-1 items-center gap-2 justify-start">
            <span className="h-2 w-2 rounded-full bg-[#34d399] live-pulse" />
            <span className="font-display text-sm font-medium uppercase tracking-[0.2em] text-ink-muted">
              Live
            </span>
          </div>

          {/* Real logo file, wide crop — 1024x256, matching the wordmark's
              actual proportions instead of the old 400x400 square (which had
              dead black margins above/below the text, forcing a lossy
              zoom-crop to fill the header). */}
          <Image
            src="/continent-trans-logo-wide.jpg"
            alt="Continent Trans"
            width={1024}
            height={256}
            className="h-14 sm:h-16 md:h-20 w-auto shrink-0 object-contain"
            priority
          />

          <div className="flex flex-1 justify-end items-baseline gap-1 whitespace-nowrap font-display text-sm sm:text-base font-medium tracking-[0.04em] text-ink-muted">
            <span>Flowgentic</span>
            <span className="text-brand-gold">TRAK</span>
          </div>

          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-gold/70 to-transparent" />
        </header>

        {/* Map + Fleet Status side by side — the map gets whatever width is
            left rather than the full viewport, so it stays framed on Europe
            instead of stretching into a mostly-empty wide strip. */}
        <div className="flex flex-1 min-h-0">
          <main className="flex-1 min-h-0">
            <FleetMap trucks={trucks} />
          </main>

          <aside className="w-96 shrink-0 border-l border-hairline bg-void overflow-y-auto flex flex-col">
            <div className="flex items-center gap-2 px-4 pt-4 pb-1 shrink-0">
              <span className="h-3.5 w-0.5 bg-gradient-to-b from-brand-red to-brand-gold rounded-full" />
              <h2 className="font-display text-sm font-semibold uppercase tracking-[0.15em] text-ink">
                Fleet status
              </h2>
            </div>
            <FleetEditor />
          </aside>
        </div>

        {/* A flat black bar here just disappeared into the header/aside's own
            black — a gold hairline reads as a deliberate credit strip instead
            of a leftover dark stripe. */}
        <footer className="shrink-0 flex items-center justify-center gap-1.5 border-t border-brand-gold/40 bg-void px-4 py-2">
          <span className="font-display text-[11px] tracking-[0.05em] text-ink-muted">Powered by</span>
          <span className="font-display text-[11px] font-semibold tracking-[0.05em] text-ink">
            FlowgenticAI <span className="text-brand-gold">GmbH</span>
          </span>
        </footer>
      </div>
    </div>
  );
}
