import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BantayAsenso",
    short_name: "BantayAsenso",
    description: "Scan road-work signs, see DPWH project status, and report hazards.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
    screenshots: [
      {
        src: "/screenshots/desktop-wide.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
        label: "BantayAsenso Desktop Dashboard",
      },
      {
        src: "/screenshots/mobile-home.png",
        sizes: "780x1688",
        type: "image/png",
        form_factor: "narrow",
        label: "BantayAsenso Mobile Home Screen",
      },
      {
        src: "/screenshots/mobile-map.png",
        sizes: "780x1688",
        type: "image/png",
        form_factor: "narrow",
        label: "BantayAsenso Interactive Map",
      },
    ],
  };
}
