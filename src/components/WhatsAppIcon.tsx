// The standard WhatsApp glyph — used here purely to identify the channel
// (same nominative use as a "Share to WhatsApp" button), not as any kind of
// partnership claim. Kept as an inline SVG so it renders crisply at the tiny
// sizes used next to a checkbox label, unlike the 📲 emoji it replaces.
export default function WhatsAppIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="none">
      <circle cx="16" cy="16" r="16" fill="#25D366" />
      <path
        fill="#fff"
        d="M23.47 8.52A9.76 9.76 0 0 0 16.06 5.5c-5.42 0-9.83 4.4-9.83 9.82a9.8 9.8 0 0 0 1.31 4.9L6.5 25.5l5.42-1.02a9.86 9.86 0 0 0 4.13.9h.01c5.42 0 9.83-4.4 9.83-9.82 0-2.62-1.02-5.09-2.42-6.94ZM16.06 23.72h-.01a8.18 8.18 0 0 1-4.17-1.14l-.3-.18-3.1.82.83-3.02-.2-.31a8.15 8.15 0 0 1-1.25-4.35c0-4.51 3.68-8.18 8.2-8.18a8.13 8.13 0 0 1 5.79 2.4 8.1 8.1 0 0 1 2.4 5.79c0 4.51-3.68 8.17-8.19 8.17Zm4.48-6.12c-.25-.12-1.45-.72-1.68-.8-.22-.08-.39-.12-.55.13-.16.24-.63.8-.78.96-.14.16-.28.18-.53.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.22-1.46-1.37-1.7-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.24.24-.41s.04-.31-.02-.43c-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.42.06-.64.31-.22.24-.85.83-.85 2.03s.87 2.36 1 2.52c.12.16 1.71 2.62 4.16 3.67.58.25 1.03.4 1.39.51.58.19 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.05.14-1.16-.06-.1-.22-.16-.46-.28Z"
      />
    </svg>
  );
}
