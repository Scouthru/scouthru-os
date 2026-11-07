import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The site is the marketplace: the old intro pages (home, /os, /demo) all open it instead.
  async redirects() {
    return ["/", "/about", "/os", "/demo"].map((source) => ({ source, destination: "/marketplace", permanent: false }));
  },
};

export default nextConfig;
