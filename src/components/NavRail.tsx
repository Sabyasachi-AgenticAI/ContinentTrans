"use client";

// Structural app-shell chrome, not wired to separate routes/pages yet — this
// is a single-view dashboard (map + fleet status together), so "Vehicles"
// and "Settings" don't have a distinct destination to switch to today.
// "Map" is marked active since that's what's on screen. Kept as real-looking
// nav rather than left out entirely, since this is where it'd live once
// there's more than one view.

function MapIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

function LoadsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3 3 7.5v9L12 21l9-4.5v-9L12 3Z" />
      <path d="M3 7.5 12 12l9-4.5" />
      <path d="M12 12v9" />
    </svg>
  );
}

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="1.5" y="7" width="13" height="9.5" rx="1" />
      <path d="M14.5 10h4l3.5 3.2v3.3h-3.5" />
      <circle cx="6" cy="18" r="1.75" />
      <circle cx="16.5" cy="18" r="1.75" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 7.04 4.3l.06.06A1.65 1.65 0 0 0 8.92 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" />
    </svg>
  );
}

function NavIcon({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <div className="group relative">
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        className={`relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
          active ? "bg-brand-gold/15 text-brand-gold" : "text-ink-muted hover:bg-surface-raised hover:text-ink"
        }`}
      >
        {active && (
          <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-brand-gold" aria-hidden />
        )}
        {icon}
      </button>

      {/* Styled hover label instead of the native title tooltip — matches
          the app's own type/color system instead of the OS default box. */}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-full top-1/2 z-[2000] ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-hairline bg-surface-raised px-2 py-1 font-display text-[11px] text-ink opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
      >
        {label}
      </span>
    </div>
  );
}

export default function NavRail() {
  return (
    <nav className="w-16 shrink-0 border-r border-hairline bg-void flex flex-col items-center gap-1 py-4">
      <NavIcon icon={<MapIcon className="h-5 w-5" />} label="Map" active />
      <NavIcon icon={<LoadsIcon className="h-5 w-5" />} label="Loads" />
      <NavIcon icon={<TruckIcon className="h-5 w-5" />} label="Vehicles" />
      <NavIcon icon={<SettingsIcon className="h-5 w-5" />} label="Settings" />
      <div className="flex-1" />
      <NavIcon icon={<UserIcon className="h-5 w-5" />} label="Account" />
    </nav>
  );
}
