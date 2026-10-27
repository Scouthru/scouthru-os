import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The site opens on the marketplace. The old home page lives at /about.
  async redirects() {
    return [{ source: "/", destination: "/marketplace", permanent: false }];
  },
};

export default nextConfig;
