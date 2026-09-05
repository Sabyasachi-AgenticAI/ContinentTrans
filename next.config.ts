import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // react-leaflet's MapContainer doesn't clean up Leaflet's internal
  // `_leaflet_id` marker on its DOM node when React 19 Strict Mode
  // double-mounts components in dev, causing a spurious
  // "Map container is being reused by another instance" crash.
  // Disabling Strict Mode is the standard workaround; it's a dev-only
  // diagnostic and doesn't change production behavior.
  reactStrictMode: false,
};

export default nextConfig;
