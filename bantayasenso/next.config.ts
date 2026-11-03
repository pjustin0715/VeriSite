import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["maplibre-gl", "@supabase/supabase-js", "@supabase/auth-js"],
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
