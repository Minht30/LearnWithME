import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Photos from phone cameras run 3–8 MB. Loosen from the 1 MB default.
      bodySizeLimit: "15mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
