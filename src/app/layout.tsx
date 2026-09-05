import type { Metadata } from "next";
import { Oswald, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { FleetProvider } from "@/lib/fleetStore";

// Oswald: condensed gothic in the lineage of European highway signage —
// the actual typographic world these trucks drive through.
const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

// Plex Sans/Mono as a matched pair: sans for prose, mono for the
// manifest-style data — plates, coordinates, €/km — that fills this page.
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "TRAK — Continent Trans",
  description: "Live fleet tracking & dispatch dashboard (mock data)",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${oswald.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="h-full flex flex-col overflow-hidden font-sans">
        <FleetProvider>{children}</FleetProvider>
      </body>
    </html>
  );
}
