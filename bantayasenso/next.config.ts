import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["maplibre-gl", "@supabase/supabase-js", "@supabase/auth-js"],
  // Report photos synced from the backend live in Supabase Storage; without this, next/image throws and the page fails.
  images: { remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }] },
  // Welcome used to live at /welcome before the VeriSite screens moved under /verisite.
  async redirects() {
    return [{ source: "/welcome", destination: "/verisite/welcome", permanent: false }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
