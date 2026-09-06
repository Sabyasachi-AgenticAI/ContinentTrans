"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useFleet } from "@/lib/fleetStore";
import FleetEditor from "@/components/FleetEditor";
import NavRail from "@/components/NavRail";

const FleetMap = dynamic(() => import("@/components/FleetMap"), { ssr: false });

function ChevronIcon({ direction, className }: { direction: "left" | "right"; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={direction === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
    </svg>
  );
}

export default function Dashboard() {
  const { trucks } = useFleet();
  // Defaults open on desktop, closed on phones — a 384px sidebar plus the
  // 64px nav rail left the map with zero (sometimes negative) width on a
  // narrow screen, which crashed Leaflet outright ("Invalid LatLng object:
  // (NaN, NaN)") instead of just looking cramped. Checked after mount, not
  // in the initializer, since `window` doesn't exist during SSR.
  const [statusOpen, setStatusOpen] = useState(true);
  useEffect(() => {
    if (window.innerWidth < 768) setStatusOpen(false);
  }, []);

  return (
    <div className="flex flex-1 min-h-0">
      <NavRail />

      <div className="flex flex-col flex-1 min-h-0 bg-void">
        {/* Branding hierarchy: Continent Trans (the client this dashboard
            serves) stays the visual hero. Flowgentic TRAK (the product) gets
            a small badge, not competing for the same space. Flowgentic AI
            GmbH (the maker) gets a quiet footer credit — see below the
            Fleet Status section. */}
        {/* The logo is the header's only in-flow content, centered by
            `justify-center` alone — mathematically exact regardless of
            viewport width. "Live" and "Flowgentic TRAK" are pulled out of
            flow entirely (absolute, pinned to their own edge) so neither
            can compete for space with the other and drag the logo
            off-center — which is exactly what a two-column flex-1 layout
            did here once one side got a `whitespace-nowrap` and the other
            didn't: the unprotected side shrank first, unevenly. Absolute
            positioning has no built-in collision avoidance, though — below
            `sm` there just isn't room for both badges beside the logo
            without overlapping it, so they're hidden on phones and the logo
            stands alone. */}
        <header className="relative flex items-center justify-center bg-void px-6 py-2 sm:py-3 shrink-0">
          <div className="hidden sm:flex absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 items-center gap-2">
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
            className="h-14 sm:h-16 md:h-20 w-auto object-contain"
            priority
          />

          <div className="hidden sm:flex absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 items-baseline gap-1 whitespace-nowrap font-display text-sm sm:text-base font-medium tracking-[0.04em] text-ink-muted">
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

          {statusOpen ? (
            <aside className="fixed inset-0 z-40 sm:static sm:inset-auto sm:z-auto sm:w-96 shrink-0 border-l border-hairline bg-void overflow-y-auto flex flex-col">
              <div className="flex items-center gap-2 px-4 pt-4 pb-1 shrink-0">
                <span className="h-3.5 w-0.5 bg-gradient-to-b from-brand-red to-brand-gold rounded-full" />
                <h2 className="font-display text-sm font-semibold uppercase tracking-[0.15em] text-ink flex-1">
                  Fleet status
                </h2>
                <button
                  type="button"
                  onClick={() => setStatusOpen(false)}
                  aria-label="Collapse fleet status"
                  className="text-ink-muted hover:text-ink transition-colors"
                >
                  <ChevronIcon direction="right" className="h-4 w-4" />
                </button>
              </div>
              <FleetEditor />
            </aside>
          ) : (
            <button
              type="button"
              onClick={() => setStatusOpen(true)}
              aria-label="Expand fleet status"
              className="w-8 shrink-0 border-l border-hairline bg-void flex flex-col items-center gap-3 pt-4 text-ink-muted hover:text-ink hover:bg-surface-raised transition-colors"
            >
              <ChevronIcon direction="left" className="h-4 w-4" />
              <span className="[writing-mode:vertical-rl] font-display text-[10px] font-medium uppercase tracking-[0.15em]">
                Fleet status
              </span>
            </button>
          )}
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
